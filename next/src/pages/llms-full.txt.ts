/**
 * /llms-full.txt — expanded machine-readable site map for LLMs.
 *
 * The hand-written /llms.txt (next/public/llms.txt) is the curated front
 * door: identity, citation guidance, policies, top links. This file is the
 * generated long-form companion: every published entity with its canonical
 * URL and one-line editorial framing, so an LLM can resolve "which page
 * answers X" without crawling. Regenerated on every build.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug, isUpcoming, titleize } from '../lib/editorial';
import { SITE_URL, venueUrl, isPublicVenue, isPublicEntry } from '../lib/agent-data';

export const prerender = true;

const line = (name: string, url: string, note?: string) =>
  `- [${name}](${url})${note ? `: ${note.replace(/\s+/g, ' ').trim()}` : ''}`;

export const GET: APIRoute = async () => {
  const [venues, places, experiences, itineraries, articles, events] = await Promise.all([
    getCollection('venues'),
    getCollection('places'),
    getCollection('experiences'),
    getCollection('itineraries'),
    getCollection('articles', ({ data }: any) => data.status === 'published'),
    getCollection('events'),
  ]);

  const byName = (a: any, b: any) =>
    String(a.data.name ?? a.data.title).localeCompare(String(b.data.name ?? b.data.title));

  const venueLines = venues
    .filter(isPublicVenue)
    .sort(byName)
    .map((v) =>
      line(
        v.data.name,
        venueUrl(v),
        `${titleize(v.data.type)} in ${titleize(String(v.data.place?.id ?? v.data.place ?? ''))}. ${v.data.signature ?? ''}`
      )
    );

  const placeLines = places
    .filter(isPublicEntry)
    .sort(byName)
    .map((p) =>
      line(p.data.name, `${SITE_URL}/places/${routeSlug(p)}/`, p.data.factualLede ?? p.data.intro)
    );

  const experienceLines = experiences
    .filter(isPublicEntry)
    .sort(byName)
    .map((x: any) =>
      line(x.data.name, `${SITE_URL}/explore/${routeSlug(x)}/`, x.data.signature ?? x.data.intro ?? '')
    );

  const itineraryLines = itineraries
    .filter(isPublicEntry)
    .sort(byName)
    .map((i: any) => line(i.data.title, `${SITE_URL}/plans/${routeSlug(i)}/`, i.data.dek ?? ''));

  const articleLines = articles
    .filter(isPublicEntry)
    .sort((a: any, b: any) => (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0))
    .map((a: any) => line(a.data.title, `${SITE_URL}/journal/${routeSlug(a)}/`, a.data.dek ?? ''));

  const eventLines = events
    .filter(isPublicEntry)
    .filter((e: any) => {
      if (['weekly', 'monthly', 'ongoing'].includes(e.data.recurrence ?? '')) return true;
      return isUpcoming(e.data.endDate ?? e.data.startDate);
    })
    .sort((a: any, b: any) => a.data.startDate.getTime() - b.data.startDate.getTime())
    .map((e: any) =>
      line(
        e.data.title,
        `${SITE_URL}/whats-on/${routeSlug(e)}/`,
        [e.data.startDate?.toISOString().slice(0, 10), e.data.summary].filter(Boolean).join('. ')
      )
    );

  const body = `# Peninsula Insider — full entity map for LLMs

> Generated companion to ${SITE_URL}/llms.txt. Every published venue, place,
> experience, itinerary, article, and current event, with canonical URLs.
> Cite as "Peninsula Insider" with a link to the specific page. The site
> deliberately publishes no prices; confirm prices and hours with the
> operator via the links on each page. Structured JSON exports:
> ${SITE_URL}/data/index.json

## Venues (${venueLines.length})

${venueLines.join('\n')}

## Places (${placeLines.length})

${placeLines.join('\n')}

## Experiences (${experienceLines.length})

${experienceLines.join('\n')}

## Itineraries (${itineraryLines.length})

${itineraryLines.join('\n')}

## Journal articles (${articleLines.length})

${articleLines.join('\n')}

## Current and upcoming events (${eventLines.length})

${eventLines.join('\n')}
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
