/**
 * POST /api/admin/sanity-asset-upload
 *
 * Multipart upload. Editors who can't find what they need in the existing
 * media library can drop a fresh image straight into Sanity from the
 * right-click overlay. The asset is uploaded server-side so the write
 * token never leaves the server.
 *
 * Response: { _id, url, originalFilename, dimensions }.
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

export const prerender = false;
export async function getStaticPaths() {
  return [];
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export const POST: APIRoute = async ({ request }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest('Body must be multipart/form-data');
  }

  const fileEntry = form.get('file');
  if (!(fileEntry instanceof File)) return badRequest('Missing "file" field');
  const file = fileEntry as File;

  if (!ACCEPTED_TYPES.has(file.type)) {
    return badRequest(`Unsupported MIME type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    return badRequest(`File too large (${file.size} bytes); max is ${MAX_BYTES}`);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await client.assets.upload('image', buffer, {
      filename: file.name,
      contentType: file.type,
    });
    return jsonResponse({
      ok: true,
      data: {
        _id: uploaded._id,
        url: uploaded.url,
        originalFilename: uploaded.originalFilename ?? file.name,
        dimensions: uploaded.metadata?.dimensions ?? null,
      },
    });
  } catch (err) {
    return internalError((err as Error).message || 'Asset upload failed');
  }
};
