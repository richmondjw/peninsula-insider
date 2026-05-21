/**
 * DELETE /api/admin/image-binding/[id]
 *
 * Remove a single image binding. Admin-only. RLS also enforces editor-
 * gating on delete; this is the belt to that suspenders.
 */
import type { APIRoute } from 'astro';
import {
  badRequest,
  forbidden,
  internalError,
  jsonResponse,
  resolveCmsAccess,
  unauthorized,
} from '../../../../lib/cms/server';

export const prerender = false;
export async function getStaticPaths() {
  return [];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE: APIRoute = async ({ request, params }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok || !access.client) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const id = String(params.id ?? '');
  if (!UUID_RE.test(id)) return badRequest('Invalid binding id');

  const { error } = await access.client.from('image_bindings').delete().eq('id', id);
  if (error) return internalError(`Delete failed: ${error.message}`);
  return jsonResponse({ ok: true });
};
