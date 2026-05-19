/**
 * /api/admin/image-binding
 *
 * Editor-supplied bindings from "unmarked" page images (URL pattern +
 * filename basename) to a Sanity doc + field path. The admin overlay
 * uses these to inject `data-pi-edit` attrs on the fly so the existing
 * Replace-from-media-library flow lights up for any visible image —
 * no code change required.
 *
 *   GET    ?pageUrlPattern=...    list bindings for a URL pattern
 *   POST   { ... }                upsert a binding (admin-only)
 *
 * DELETE lives at /api/admin/image-binding/[id].
 */
import type { APIRoute } from 'astro';
import {
  badRequest,
  forbidden,
  internalError,
  jsonResponse,
  resolveCmsAccess,
  unauthorized,
} from '../../../lib/cms/server';

export const prerender = process.env.PI_ADMIN_HYBRID !== '1';
export async function getStaticPaths() {
  return [];
}

interface UpsertBody {
  pageUrlPattern?: string;
  imageBasename?: string;
  sanityDocId?: string;
  sanityDocType?: string;
  sanityFieldPath?: string;
}

const BASENAME_RE = /^[a-z0-9._-]{1,200}$/i;
const DOC_ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;
const FIELD_PATH_RE = /^[a-zA-Z_][a-zA-Z0-9_.[\]]*$/;

export const GET: APIRoute = async ({ request, url }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok || !access.client) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const pattern = (url.searchParams.get('pageUrlPattern') || '').trim();
  if (!pattern) return badRequest('Missing pageUrlPattern');

  const { data, error } = await access.client
    .from('image_bindings')
    .select('id, page_url_pattern, image_basename, sanity_doc_id, sanity_doc_type, sanity_field_path, created_at, updated_at')
    .eq('page_url_pattern', pattern);
  if (error) return internalError(`List failed: ${error.message}`);

  return jsonResponse({ ok: true, data: { bindings: data ?? [] } });
};

export const POST: APIRoute = async ({ request }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok || !access.client || !access.access) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return badRequest('Body must be JSON');
  }

  const pageUrlPattern = (body.pageUrlPattern || '').trim();
  const imageBasename = (body.imageBasename || '').trim().toLowerCase();
  const sanityDocId = (body.sanityDocId || '').trim();
  const sanityDocType = (body.sanityDocType || '').trim();
  const sanityFieldPath = (body.sanityFieldPath || '').trim();

  if (!pageUrlPattern) return badRequest('Missing pageUrlPattern');
  if (!imageBasename || !BASENAME_RE.test(imageBasename)) return badRequest('Invalid imageBasename');
  if (!sanityDocId || !DOC_ID_RE.test(sanityDocId)) return badRequest('Invalid sanityDocId');
  if (!sanityDocType) return badRequest('Missing sanityDocType');
  if (!sanityFieldPath || !FIELD_PATH_RE.test(sanityFieldPath)) return badRequest('Invalid sanityFieldPath');

  const userId = access.access.identity.userId;

  const { data, error } = await access.client
    .from('image_bindings')
    .upsert(
      {
        page_url_pattern: pageUrlPattern,
        image_basename: imageBasename,
        sanity_doc_id: sanityDocId,
        sanity_doc_type: sanityDocType,
        sanity_field_path: sanityFieldPath,
        created_by: userId,
      },
      { onConflict: 'page_url_pattern,image_basename' },
    )
    .select()
    .single();

  if (error) return internalError(`Upsert failed: ${error.message}`);
  return jsonResponse({ ok: true, data: { binding: data } });
};
