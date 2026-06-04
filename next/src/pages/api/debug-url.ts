import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return new Response(
    JSON.stringify(
      {
        requestUrl: request.url,
        urlOrigin: url.origin,
        urlProtocol: url.protocol,
        urlHost: url.host,
        headers,
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
