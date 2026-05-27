import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../lib/editorial';

const SITE_URL = 'https://peninsulainsider.com.au';
const TODAY = new Date().toISOString().split('T')[0];

function url(path: string, priority: number, changefreq: string, lastmod?: string): string {
  const loc = path === '/' ? path : (path.endsWith('/') ? path : path + '/');
  return `  <url>
    <loc>${SITE_URL}${loc}</loc>
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
  const [
    venues,
    experiences,
    places,
    articles,
    itineraries,
    events,
    species,
    fishingLocations,
    fishingCharters,
    boatRamps,
    boatHire,
  ] = await Promise.all([
    getCollection('venues'),
    getCollection('experiences'),
    getCollection('places'),
    getCollection('articles', ({ data }) => data.status === 'published'),
    getCollection('itineraries'),
    getCollection('events'),
    getCollection('species', ({ data }) => data.status === 'published'),
    getCollection('fishingLocations', ({ data }) => data.status === 'published'),
    getCollection('fishingCharters', ({ data }) => data.status === 'published'),
    getCollection('boatRamps', ({ data }) => data.status === 'published'),
    getCollection('boatHire', ({ data }) => data.status === 'published'),
  ]);

  const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'winery'];
  const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
  const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];

  const eatVenues = venues.filter((v) => eatTypes.includes(v.data.type) && !v.data.sitemapExclude);
  const stayVenues = venues.filter((v) => stayTypes.includes(v.data.type) && !v.data.sitemapExclude);
  const wineVenues = venues.filter((v) => wineTypes.includes(v.data.type) && !v.data.sitemapExclude);

  const entries: string[] = [];

  // Homepage
  entries.push(url('/', 1.0, 'weekly'));

  // Section index pages. /spa/ and /walks/ are intentionally omitted because
  // astro.config.mjs redirects them to canonical homes (/explore/spas-and-wellness/
  // and /explore/walks/); listing redirect URLs in the sitemap creates noise
  // for crawlers. /whats-on/ and /dog-friendly/ are real lanes and were
  // missing from this list previously.
  // /golf/ removed 2026-05-05 (post-deploy of experiment 2026-05-05-01) after
  // GSC live-test on the manual reindex submission revealed /golf/ is itself
  // a noindex redirect-stub pointing to /explore/golf/. Sitemap should advertise
  // the canonical destination, not the redirect. /explore/golf/ added below
  // alongside the other explicit hub entries.
  // Promoted to priority 1.0 (alongside the homepage) on 2026-05-05 because
  // GSC inspection showed dog-friendly, whats-on, corporate-events, and ask
  // had never been crawled despite being internally linked from 500+ pages.
  // The site-wide nav links were not winning crawl priority. Bumping these to
  // 1.0 alongside the canonical-home homepage signals "treat as top-tier hubs".
  // See ops/reports/seo/experiments.md experiment 2026-05-05-01.
  const TOP_HUBS = new Set(['dog-friendly', 'whats-on', 'corporate-events', 'fishing', 'ask']);
  // Note: /escape/ retired 2026-05-10 — section renamed to /plans/. /escape/* URLs
  // remain as redirect pages (noindex) so inbound links continue to resolve.
  for (const section of ['eat', 'stay', 'wine', 'explore', 'plans', 'journal', 'places', 'whats-on', 'dog-friendly', 'weddings', 'corporate-events', 'fishing', 'boating']) {
    entries.push(url(`/${section}`, TOP_HUBS.has(section) ? 1.0 : 0.9, 'weekly'));
  }
  // /explore/golf/ — the canonical golf hub. /golf/ is a noindex redirect stub
  // that points here, so sitemap-list this destination directly.
  entries.push(url('/explore/golf', 1.0, 'weekly'));
  // /fishing/ and /boating/ sub-hubs — emit unconditionally so crawlers find
  // them once Phase 1 ships, even before all leaf entities are populated.
  for (const subhub of ['fishing/species', 'fishing/locations', 'fishing/charters', 'boating/ramps', 'boating/hire']) {
    entries.push(url(`/${subhub}`, 0.8, 'weekly'));
  }
  // /fishing/ and /boating/ pillar pages — Article surfaces with their own
  // FAQPage and BreadcrumbList JSON-LD.
  for (const pillar of ['fishing/seasons/snapper-run-oct-dec', 'fishing/charters/first-charter-guide', 'boating/tides-safety', 'tour/fishing-tours']) {
    entries.push(url(`/${pillar}`, 0.7, 'monthly'));
  }
  // Concierge surfaces — chat front page + vendor intake. /ask bumped to 1.0
  // alongside other top hubs (see TOP_HUBS comment above).
  entries.push(url('/ask', 1.0, 'weekly'));
  entries.push(url('/partners/apply', 0.5, 'monthly'));

  // Best-of pages
  entries.push(url('/eat/best-restaurants', 0.9, 'weekly'));
  entries.push(url('/wine/best-cellar-doors', 0.9, 'weekly'));
  entries.push(url('/explore/best-walks', 0.8, 'weekly'));
  entries.push(url('/stay/best-accommodation', 0.8, 'weekly'));

  // SEO journal landing pages
  const seoJournalPages = [
    '/journal/mornington-peninsula-in-autumn',
    '/journal/mornington-peninsula-in-winter',
    '/journal/mornington-peninsula-with-kids',
    '/journal/dog-friendly-mornington-peninsula',
    '/journal/mornington-peninsula-day-trip',
    '/journal/mornington-peninsula-hot-springs-guide',
    '/journal/mornington-peninsula-winery-tour',
    '/journal/mornington-peninsula-itinerary',
    '/journal/free-things-to-do-mornington-peninsula',
    '/journal/best-brunch-mornington-peninsula',
    '/journal/mornington-peninsula-wedding-venues',
  ];
  for (const page of seoJournalPages) {
    entries.push(url(page, 0.8, 'monthly'));
  }

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
  for (const experience of experiences.filter((e) => !e.data.sitemapExclude)) {
    entries.push(url(`/explore/${routeSlug(experience)}`, 0.7, 'weekly', dateStr(experience.data.publishedAt)));
  }

  // Places
  for (const place of places.filter((p) => !p.data.sitemapExclude)) {
    entries.push(url(`/places/${routeSlug(place)}`, 0.8, 'weekly', dateStr(place.data.publishedAt)));
  }

  // Peninsula This Weekend rolling URL (Wave 2 Brief 2, 2026-05-10).
  // The dispatch lives at a stable URL so AI assistants and external
  // sources can link to "this weekend on the Peninsula" reliably. Each
  // past dispatch is preserved at /whats-on/this-weekend/archive/{date}/.
  // Priority 1.0 + changefreq=weekly because PTW is the highest-frequency
  // editorial dispatch and the canonical "what's happening now" surface.
  entries.push(url('/whats-on/this-weekend', 1.0, 'weekly'));

  // Journal articles. PTW dispatches (format=weekend-picker, slug starts
  // with peninsula-this-weekend) are excluded — the journal URL is now a
  // 301-equivalent redirect to /whats-on/this-weekend/archive/{date}/.
  // Listing the redirect URL would split crawl signal between the legacy
  // path and the canonical archive.
  const isPtwSlug = (a: any) =>
    a.data.format === 'weekend-picker' && routeSlug(a).startsWith('peninsula-this-weekend');
  for (const article of articles.filter((a) => !a.data.sitemapExclude && !isPtwSlug(a))) {
    entries.push(url(`/journal/${routeSlug(article)}`, 0.7, 'weekly', dateStr(article.data.publishedAt)));
  }
  // PTW archive entries — sitemap-list each dated archive URL so the
  // weekend dispatch corpus stays crawlable forever, with the rolling
  // /whats-on/this-weekend/ as the canonical "current" surface.
  for (const article of articles.filter(isPtwSlug)) {
    const archiveSlug = article.data.publishedAt.toISOString().split('T')[0];
    entries.push(
      url(`/whats-on/this-weekend/archive/${archiveSlug}`, 0.6, 'monthly', dateStr(article.data.publishedAt)),
    );
  }

  // Itineraries
  for (const itinerary of itineraries.filter((i) => !i.data.sitemapExclude)) {
    entries.push(url(`/plans/${routeSlug(itinerary)}`, 0.7, 'weekly', dateStr(itinerary.data.publishedAt)));
  }

  // /fishing/species/* — only published, non-excluded.
  for (const sp of species.filter((s) => !s.data.sitemapExclude)) {
    entries.push(url(`/fishing/species/${routeSlug(sp)}`, 0.8, 'weekly', dateStr(sp.data.publishedAt)));
  }
  // /fishing/locations/*
  for (const loc of fishingLocations.filter((l) => !l.data.sitemapExclude)) {
    entries.push(url(`/fishing/locations/${routeSlug(loc)}`, 0.7, 'weekly', dateStr(loc.data.publishedAt)));
  }
  // /fishing/charters/*
  for (const ch of fishingCharters.filter((c) => !c.data.sitemapExclude)) {
    entries.push(url(`/fishing/charters/${routeSlug(ch)}`, 0.8, 'weekly', dateStr(ch.data.publishedAt)));
  }
  // /boating/ramps/*
  for (const r of boatRamps.filter((rp) => !rp.data.sitemapExclude)) {
    entries.push(url(`/boating/ramps/${routeSlug(r)}`, 0.7, 'weekly', dateStr(r.data.publishedAt)));
  }
  // /boating/hire/*
  for (const h of boatHire.filter((bh) => !bh.data.sitemapExclude)) {
    entries.push(url(`/boating/hire/${routeSlug(h)}`, 0.7, 'weekly', dateStr(h.data.publishedAt)));
  }

  // Event detail pages — emit each /whats-on/{slug}/. Events are a primary
  // editorial lane (the dispatch differentiator) so they belong in the sitemap.
  // Past one-off events stay in the index (the [slug] route generates a static
  // page for every event), but skip them in the sitemap to avoid signalling
  // stale URLs; recurring events keep emitting because they remain valid.
  const today = new Date();
  for (const event of events.filter((e) => !e.data.sitemapExclude)) {
    const recurrence = event.data.recurrence ?? 'one-off';
    const isRecurring = recurrence !== 'one-off';
    const endish = event.data.endDate ?? event.data.startDate;
    const stillCurrent = endish && endish.getTime() >= today.getTime() - 24 * 60 * 60 * 1000;
    if (!isRecurring && !stillCurrent) continue;
    entries.push(url(`/whats-on/${routeSlug(event)}`, 0.6, 'weekly', dateStr(event.data.publishedAt)));
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
