/**
 * GET /api/admin/sanity-doc-fields?docId=…
 *
 * Inspects a Sanity document and returns image-typed field paths the
 * editor can bind against. Detection runs on the *fetched document* so
 * we pick up the actual shape — including arrays of images. A field
 * counts as image-typed when its value is:
 *
 *   - object with `_type == 'image'` + `asset._ref`
 *   - object with `_type == 'imageRef'` (the PI wrapper type)
 *   - array of either of the above (we emit one slot per populated index)
 *
 * Top-level + one-deep nested fields are walked.
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
import { getSanityWriteClient } from '../../../lib/sanity/write-client';

export const prerender = process.env.PI_ADMIN_HYBRID !== '1';
export async function getStaticPaths() {
  return [];
}

const DOC_ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;

interface ImageFieldOption {
  path: string;
  label: string;
}

function isImageValue(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  const t = obj._type;
  if (t === 'image' || t === 'imageRef') return true;
  const asset = obj.asset as Record<string, unknown> | undefined;
  if (asset && typeof asset === 'object' && typeof asset._ref === 'string' && asset._ref.startsWith('image-')) return true;
  return false;
}

function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function collectImageFields(doc: Record<string, unknown>, prefix = '', maxDepth = 2): ImageFieldOption[] {
  const out: ImageFieldOption[] = [];
  if (!doc || typeof doc !== 'object') return out;
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const label = humanise(key);
    if (isImageValue(value)) {
      out.push({ path, label });
      continue;
    }
    if (Array.isArray(value)) {
      const indexedImages = value
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => isImageValue(v));
      if (indexedImages.length > 0) {
        for (const { i } of indexedImages) {
          out.push({ path: `${path}[${i}]`, label: `${label} #${i + 1}` });
        }
      } else if (maxDepth > 0) {
        for (let i = 0; i < value.length; i++) {
          const v = value[i];
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push(
              ...collectImageFields(v as Record<string, unknown>, `${path}[${i}]`, maxDepth - 1),
            );
          }
        }
      }
      continue;
    }
    if (value && typeof value === 'object' && maxDepth > 0) {
      out.push(...collectImageFields(value as Record<string, unknown>, path, maxDepth - 1));
    }
  }
  return out;
}

export const GET: APIRoute = async ({ request, url }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  const docId = (url.searchParams.get('docId') || '').trim();
  if (!docId || !DOC_ID_RE.test(docId)) return badRequest('Invalid docId');

  try {
    const id = docId.startsWith('drafts.') ? docId.slice('drafts.'.length) : docId;
    const doc = await client.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id });
    if (!doc) return badRequest(`No document with _id "${id}"`);
    const fields = collectImageFields(doc);
    const seen = new Set<string>();
    const unique = fields.filter((f) => (seen.has(f.path) ? false : (seen.add(f.path), true)));
    return jsonResponse({ ok: true, data: { fields: unique, docType: doc._type ?? null } });
  } catch (err) {
    return internalError((err as Error).message || 'Field introspection failed');
  }
};
