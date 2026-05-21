/**
 * GET /api/admin/sanity-image-health
 *
 * Admin-only diagnostics for the inline image replacement path. Returns no
 * secrets; only whether the required pieces are present and reachable.
 */
import type { APIRoute } from 'astro';
import {
  forbidden,
  jsonResponse,
  resolveCmsAccess,
  unauthorized,
} from '../../../lib/cms/server';
import { getSanityWriteClient } from '../../../lib/sanity/write-client';

export const prerender = false;
export async function getStaticPaths() {
  return [];
}

const ENTITY_FLAGS = [
  'SANITY_VENUES_ENABLED',
  'SANITY_PLACES_ENABLED',
  'SANITY_ARTICLES_ENABLED',
  'SANITY_EVENTS_ENABLED',
  'SANITY_ITINERARIES_ENABLED',
  'SANITY_TOURS_ENABLED',
  'SANITY_TOUR_OPERATORS_ENABLED',
  'SANITY_TOUR_PACKAGES_ENABLED',
  'SANITY_EXPERIENCES_ENABLED',
  'SANITY_PAGE_LEVEL_ENABLED',
] as const;

export const GET: APIRoute = async ({ request }) => {
  const access = await resolveCmsAccess(request.headers.get('cookie'));
  if (!access.ok) {
    if (access.reason === 'not-editor') return forbidden(`Not an editor (${access.reason})`);
    return unauthorized(`Unauthorized (${access.reason ?? 'unknown'})`);
  }

  const sanityClient = getSanityWriteClient();
  let sanityWriteOk = false;
  let sanityWriteError: string | null = null;
  if (sanityClient) {
    try {
      await sanityClient.fetch('*[_type == "sanity.imageAsset"][0]._id');
      sanityWriteOk = true;
    } catch (err) {
      sanityWriteError = (err as Error).message;
    }
  }

  let imageBindingsOk = false;
  let imageBindingsError: string | null = null;
  if (access.client) {
    const { error } = await access.client.from('image_bindings').select('id').limit(1);
    imageBindingsOk = !error;
    imageBindingsError = error?.message ?? null;
  }

  const entityFlags = Object.fromEntries(
    ENTITY_FLAGS.map((key) => [key, process.env[key] === 'true']),
  );

  return jsonResponse({
    ok: true,
    data: {
      hybridMode: process.env.PI_ADMIN_HYBRID === '1',
      sanityReadEnabled: process.env.SANITY_READ_ENABLED === 'true',
      entityFlags,
      sanityWriteTokenConfigured: Boolean(process.env.SANITY_ADMIN_WRITE_TOKEN),
      sanityWriteOk,
      sanityWriteError,
      imageBindingsOk,
      imageBindingsError,
      revalidateTokenConfigured: Boolean(process.env.VERCEL_REVALIDATE_TOKEN),
    },
  });
};
