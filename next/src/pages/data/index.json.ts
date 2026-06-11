/**
 * /data/index.json — entity registry for AI agents.
 * One row per published entity (venues, places, experiences, itineraries,
 * articles, events) with its type, slug, name, and canonical URL, plus
 * pointers to the richer per-collection exports. Static, build-time.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug, isUpcoming } from '../../lib/editorial';
import {
  SITE_URL,
  DATA_LICENSE_NOTE,
  venueUrl,
  isPublicVenue,
  isPublicEntry,
  jsonResponse,
} from '../../lib/agent-data';

export const prerender = true;

type Row = { type: string; slug: string; name: string; url: string };

export const GET: APIRoute = async () => {
  const [venues, places, experiences, itineraries, articles, events] = await Promise.all([
    getCollection('venues'),
    getCollection('places'),
    getCollection('experiences'),
    getCollection('itineraries'),
    getCollection('articles', ({ data }: any) => data.status === 'published'),
    getCollection('events'),
  ]);

  const rows: Row[] = [
    ...venues.filter(isPublicVenue).map((v) => ({
      type: `venue:${v.data.type}`,
      slug: routeSlug(v),
      name: v.data.name,
      url: venueUrl(v),
    })),
    ...places.filter(isPublicEntry).map((p) => ({
      type: 'place',
      slug: routeSlug(p),
      name: p.data.name,
      url: `${SITE_URL}/places/${routeSlug(p)}/`,
    })),
    ...experiences.filter(isPublicEntry).map((x) => ({
      type: `experience:${x.data.type ?? 'experience'}`,
      slug: routeSlug(x),
      name: x.data.name ?? x.data.title,
      url: `${SITE_URL}/explore/${routeSlug(x)}/`,
    })),
    ...itineraries.filter(isPublicEntry).map((i) => ({
      type: 'itinerary',
      slug: routeSlug(i),
      name: i.data.title,
      url: `${SITE_URL}/plans/${routeSlug(i)}/`,
    })),
    ...articles.filter(isPublicEntry).map((a) => ({
      type: 'article',
      slug: routeSlug(a),
      name: a.data.title,
      url: `${SITE_URL}/journal/${routeSlug(a)}/`,
    })),
    ...events
      .filter(isPublicEntry)
      .filter((e) => {
        if (['weekly', 'monthly', 'ongoing'].includes(e.data.recurrence ?? '')) return true;
        return isUpcoming(e.data.endDate ?? e.data.startDate);
      })
      .map((e) => ({
        type: 'event',
        slug: routeSlug(e),
        name: e.data.title,
        url: `${SITE_URL}/whats-on/${routeSlug(e)}/`,
      })),
  ].sort((a, b) => a.type.localeCompare(b.type) || a.slug.localeCompare(b.slug));

  return jsonResponse({
    publisher: 'Peninsula Insider',
    site: SITE_URL,
    license: DATA_LICENSE_NOTE,
    generatedAt: new Date().toISOString(),
    exports: {
      venues: `${SITE_URL}/data/venues.json`,
      places: `${SITE_URL}/data/places.json`,
      events: `${SITE_URL}/data/events.json`,
      llms: `${SITE_URL}/llms.txt`,
      llmsFull: `${SITE_URL}/llms-full.txt`,
      sitemap: `${SITE_URL}/sitemap.xml`,
      feed: `${SITE_URL}/feed.xml`,
    },
    count: rows.length,
    entities: rows,
  });
};
