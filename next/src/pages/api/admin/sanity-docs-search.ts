/**
 * GET /api/admin/sanity-docs-search?q=…&type=…
 *
 * Lightweight Sanity doc search for the "Bind to a Sanity doc…" modal.
 * Matches `title` / `name` / `slug.current` (case-insensitive contains).
 * Optional `?type=<sanity _type>` filter. Returns up to 20 hits.
 *
 * Admin-only.
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

// Known PI document types the bind flow can target. Mirrors the registered
// schema in studio-peninsula-insider/schemaTypes/index.ts.
const SEARCHABLE_TYPES = [
  'article',
  'venue',
  'place',
  'event',
  'itinerary',
  'tour',
  'tourOperator',
  'tourPackage',
  'experience',
  'author',
  'homepageCover',
  'pageHero',
  'megaRail',
  'siteSettings',
];

export const GET: APIRoute = async ({ request, url }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const client = getSanityWriteClient();
  if (!client) return internalError('SANITY_ADMIN_WRITE_TOKEN not configured');

  const q = (url.searchParams.get('q') || '').trim();
  const type = (url.searchParams.get('type') || '').trim();

  if (type && !SEARCHABLE_TYPES.includes(type)) {
    return badRequest(`Unknown type "${type}"`);
  }

  const typeFilter = type ? `_type == $type` : `_type in $types`;
  const groq = `
    *[${typeFilter} && !(_id in path("drafts.**")) && (
      lower(coalesce(title, name, slug.current, _id)) match $q
      || _id match $q
    )] | order(_updatedAt desc)[0...20]{
      _id,
      _type,
      "title": coalesce(title, name, slug.current, _id),
      "slug": slug.current
    }
  `;
  try {
    const docs = await client.fetch(groq, {
      type,
      types: SEARCHABLE_TYPES,
      q: q ? `*${q.toLowerCase()}*` : '*',
    });
    return jsonResponse({ ok: true, data: { docs } });
  } catch (err) {
    return internalError((err as Error).message || 'Search failed');
  }
};
