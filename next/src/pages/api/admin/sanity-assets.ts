/**
 * GET /api/admin/sanity-assets?page=0&q=…
 *
 * Lists Sanity image assets (the media library). Paginated 24 per page.
 * Optional `?q=` filter matches against `originalFilename`.
 *
 * Admin-only. Returns 401 for non-editors. The Sanity write token is read
 * from `SANITY_ADMIN_WRITE_TOKEN` server-side.
 */
import type { APIRoute } from 'astro';
import {
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

const PAGE_SIZE = 24;

export const GET: APIRoute = async ({ request, url }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const sort = (url.searchParams.get('sort') || 'recent').trim();
  const orientation = (url.searchParams.get('orientation') || 'any').trim();
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  // Filter assets by filename when a query is provided. Use `lower(...)` so
  // the match is case-insensitive — Sanity assets carry the originalFilename
  // exactly as uploaded, which is often Mixed Case.
  const conds: string[] = [`_type=="sanity.imageAsset"`];
  if (q) conds.push(`lower(originalFilename) match $q`);
  // Aspect ratio bands: landscape > 1.15, portrait < 0.85, square between.
  if (orientation === 'landscape') conds.push(`metadata.dimensions.aspectRatio > 1.15`);
  else if (orientation === 'portrait') conds.push(`metadata.dimensions.aspectRatio < 0.85`);
  else if (orientation === 'square')
    conds.push(`metadata.dimensions.aspectRatio >= 0.85 && metadata.dimensions.aspectRatio <= 1.15`);

  const filter = `*[${conds.join(' && ')}]`;
  const orderBy = sort === 'name' ? 'lower(originalFilename) asc' : '_createdAt desc';
  const query = `${filter} | order(${orderBy})[$start...$end]{
    _id,
    url,
    originalFilename,
    "dimensions": metadata.dimensions,
    "tags": opt.media.tags[]->name.current,
    _createdAt
  }`;

  try {
    const assets = await client.fetch(query, {
      start,
      end,
      q: q ? `*${q}*` : '',
    });
    return jsonResponse({ ok: true, data: { assets, page, pageSize: PAGE_SIZE } });
  } catch (err) {
    return internalError((err as Error).message || 'Failed to list assets');
  }
};
