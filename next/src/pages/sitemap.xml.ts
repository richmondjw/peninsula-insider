import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../lib/editorial';

const SITE_URL = 'https://peninsulainsider.com.au';
const TODAY = new Date().toISOString().split('T')[0];

function url(path: string, priority: number, changefreq: string, lastmod?: string): string {
  return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod ?? TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

function dateStr(d?: Date): string | undefined {
  if (!d) return undefined;
  try {
    return d.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

export const GET: APIRoute = async () => {
  const [venues, experiences, places, articles, itineraries, events] = await Promise.all([
    getCollection('venues'),
    getCollection('experiences'),
    getCollection('places'),
    getCollection('articles', ({ data }) => data.status === 'published'),
    getCollection('itineraries'),
    getCollection('events'),
  ]);

  const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'winery'];
  const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
  const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];

  const eatVenues = venues.filter((v) => eatTypes.includes(v.data.type));
  const stayVenues = venues.filter((v) => stayTypes.includes(v.data.type));
  const wineVenues = venues.filter((v) => wineTypes.includes(v.data.type));

  const entries: string[] = [];

  // Homepage
  entries.push(url('/', 1.0, 'weekly'));

  // Section index pages
  for (const section of ['eat', 'stay', 'wine', 'explore', 'escape', 'whats-on', 'journal', 'places']) {
    entries.push(url(`/${section}`, 0.9, 'weekly'));
  }

  // Static pages
  for (const page of ['/about', '/contact', '/newsletter', '/site-index']) {
    entries.push(url(page, page === '/site-index' ? 0.5 : 0.4, 'monthly'));
  }

  // Best-of pages
  entries.push(url('/eat/best-restaurants', 0.9, 'weekly'));
  entries.push(url('/wine/best-cellar-doors', 0.9, 'weekly'));
  entries.push(url('/explore/best-walks', 0.8, 'weekly'));
  entries.push(url('/stay/best-accommodation', 0.8, 'weekly'));

  // Seasonal journal pages
  entries.push(url('/journal/mornington-peninsula-in-autumn', 0.8, 'monthly'));
  entries.push(url('/journal/mornington-peninsula-with-kids', 0.8, 'monthly'));
  entries.push(url('/journal/dog-friendly-mornington-peninsula', 0.8, 'monthly'));
  entries.push(url('/journal/mornington-peninsula-day-trip', 0.8, 'monthly'));

  // Eat venues
  for (const venue of eatVenues) {
    entries.push(url(`/eat/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }

  // Stay venues
  for (const venue of stayVenues) {
    entries.push(url(`/stay/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }

  // Wine venues
  for (const venue of wineVenues) {
    entries.push(url(`/wine/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }

  // Experiences
  for (const experience of experiences) {
    entries.push(url(`/explore/${routeSlug(experience)}`, 0.7, 'weekly', dateStr(experience.data.publishedAt)));
  }

  // Places
  for (const place of places) {
    entries.push(url(`/places/${routeSlug(place)}`, 0.8, 'weekly', dateStr(place.data.publishedAt)));
  }

  // Journal articles
  for (const article of articles) {
    entries.push(url(`/journal/${routeSlug(article)}`, 0.7, 'weekly', dateStr(article.data.publishedAt)));
  }

  // Events
  for (const event of events) {
    entries.push(url(`/whats-on/${routeSlug(event)}`, 0.6, 'daily', dateStr(event.data.publishedAt)));
  }

  // Itineraries
  for (const itinerary of itineraries) {
    entries.push(url(`/escape/${routeSlug(itinerary)}`, 0.7, 'weekly', dateStr(itinerary.data.publishedAt)));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
