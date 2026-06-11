/**
 * /data/places.json — machine-readable place-hub export for AI agents.
 * Static, generated at build time from the places collection.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../../lib/editorial';
import {
  SITE_URL,
  DATA_LICENSE_NOTE,
  isPublicEntry,
  compact,
  jsonResponse,
} from '../../lib/agent-data';

export const prerender = true;

export const GET: APIRoute = async () => {
  const places = (await getCollection('places')).filter(isPublicEntry);

  const items = places
    .map((p) =>
      compact({
        slug: routeSlug(p),
        name: p.data.name,
        kind: p.data.kind,
        zone: p.data.zone,
        region: p.data.regionSlug,
        url: `${SITE_URL}/places/${routeSlug(p)}/`,
        coordinates: p.data.coordinates,
        factualLede: p.data.factualLede,
        intro: p.data.intro,
        signature: p.data.signature,
        bestFor: p.data.bestFor,
        notFor: p.data.notFor,
        bestSeason: p.data.bestSeason,
        worstTime: p.data.worstTime,
        stayDuration: p.data.stayDuration,
        driveTime: p.data.driveTime,
        tldr: p.data.tldr,
      })
    )
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

  return jsonResponse({
    publisher: 'Peninsula Insider',
    site: SITE_URL,
    license: DATA_LICENSE_NOTE,
    generatedAt: new Date().toISOString(),
    count: items.length,
    places: items,
  });
};
