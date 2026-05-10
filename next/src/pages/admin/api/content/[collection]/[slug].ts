import type { APIRoute } from 'astro';
import { canAccessAdmin } from '../../../../../lib/admin';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  if (!canAccessAdmin(new URL(request.url), request.headers.get('cookie'))) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    collection: params.collection,
    slug: params.slug,
    message: 'Content API scaffold only. Wire file-backed reads/writes next.',
  }), {
    headers: { 'content-type': 'application/json' },
  });
};
