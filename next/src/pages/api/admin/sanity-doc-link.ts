/**
 * GET /api/admin/sanity-doc-link
 *
 * Resolves an inline-edit Sanity source into a Studio edit intent URL.
 * Accepts either:
 *   - docId + fieldPath
 *   - entityType + entitySlug + fieldPath
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
import { entityTypeToSanityType, getSanityWriteClient } from '../../../lib/sanity/write-client';

export const prerender = process.env.PI_ADMIN_HYBRID !== '1';
export async function getStaticPaths() {
  return [];
}

const STUDIO_URL = 'https://peninsula-insider.sanity.studio';
const DOC_ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;
const FIELD_PATH_RE = /^[a-zA-Z_][a-zA-Z0-9_.[\]]*$/;

function buildStudioEditUrl(docId: string, docType: string, fieldPath: string): string {
  const id = docId.startsWith('drafts.') ? docId.slice('drafts.'.length) : docId;
  const segment = `id=${id};type=${docType};path=${fieldPath}`;
  return `${STUDIO_URL}/intent/edit/${encodeURIComponent(segment)}`;
}

export const GET: APIRoute = async ({ request, url }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  const fieldPath = (url.searchParams.get('fieldPath') || '').trim();
  if (!fieldPath || !FIELD_PATH_RE.test(fieldPath)) return badRequest('Invalid fieldPath');

  const docIdParam = (url.searchParams.get('docId') || '').trim();
  const entityType = (url.searchParams.get('entityType') || '').trim();
  const entitySlug = (url.searchParams.get('entitySlug') || '').trim();

  try {
    let doc: { _id: string; _type: string } | null = null;

    if (docIdParam) {
      if (!DOC_ID_RE.test(docIdParam)) return badRequest('Invalid docId');
      const id = docIdParam.startsWith('drafts.') ? docIdParam.slice('drafts.'.length) : docIdParam;
      doc = await client.fetch<{ _id: string; _type: string } | null>(
        `*[_id == $id][0]{_id,_type}`,
        { id },
      );
    } else {
      if (!entityType || !entitySlug) {
        return badRequest('Provide either docId, or entityType + entitySlug');
      }
      const sanityType = entityTypeToSanityType(entityType);
      if (!sanityType) return badRequest(`entityType "${entityType}" has no Sanity-document mapping`);
      doc = await client.fetch<{ _id: string; _type: string } | null>(
        `*[_type == $type && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id,_type}`,
        { type: sanityType, slug: entitySlug },
      );
    }

    if (!doc?._id || !doc._type) return badRequest('No matching Sanity document found');

    return jsonResponse({
      ok: true,
      data: {
        docId: doc._id,
        docType: doc._type,
        fieldPath,
        url: buildStudioEditUrl(doc._id, doc._type, fieldPath),
      },
    });
  } catch (err) {
    return internalError((err as Error).message || 'Failed to resolve Sanity document');
  }
};
