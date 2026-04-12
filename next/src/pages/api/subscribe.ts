import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'This endpoint has been retired. Newsletter signup is handled by Beehiiv embeds.',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
