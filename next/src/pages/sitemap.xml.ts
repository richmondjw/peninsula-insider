import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../lib/editorial';

// SEOMIG rebuild 2026-07-11 (seo-migration-plan.md §4.1).
// Inclusion contract - a URL enters the sitemap iff ALL of:
//   1. It returns 200 with a SELF-referencing canonical (no redirect stubs,
//      no consolidation losers whose canonical now points at a cluster winner).
//   2. It is indexable (no noindex; not under the §4.3 policy exclusions).
//   3. It owns a unique search intent (duplicate-cluster losers awaiting
//      redirect stay out even while their pages are still live).
//   4. It is content-complete (expired one-off events drop out at build).
//   5. It is not internal (/admin/, /account/, /ops/, /access/, /me/, /dev/,
//      studio, tool pages) - those never enter.
// Output is deduplicated by <loc> before serialising (fixes the historical
// double listing of /journal/free-things-to-do-mornington-peninsula/).

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

const notExcluded = (e: { data: { sitemapExclude?: boolean } }) => !e.data.sitemapExclude;

// Journal slugs whose /journal/<slug>/ route is overridden by a hand-coded
// redirect stub (pages/journal/<slug>.astro -> Redirect component or inline
// stub markup) or is a hand-coded noindex page. The articles collection may
// still contain a published entry for these slugs, so the collection loop
// must not emit them - the built page is a noindex stub, and §4.1 rule 1
// bans stubs from the sitemap. Derived from pages/journal/*.astro 2026-07-11.
const JOURNAL_STUB_OR_NOINDEX_SLUGS = new Set([
  'best-fishing-spots-mornington-peninsula',
  'best-golf-courses-mornington-peninsula',
  'best-spas-mornington-peninsula',
  'king-george-whiting-port-phillip-bay',
  'mornington-peninsula-beach-guide',
  'mornington-peninsula-boat-hire',
  'mornington-peninsula-boat-ramps',
  'mornington-peninsula-fishing-charters',
  'mornington-peninsula-golf-guide',
  'mornington-peninsula-itinerary', // hand-coded page, noindex (rule 2)
  'mornington-peninsula-winery-tour', // hand-coded stub -> /tour/wine-tours/
  'snapper-mornington-peninsula',
  'snapper-season-port-phillip-bay',
  'squid-fishing-mornington-peninsula',
  'the-dog-friendly-peninsula',
  'the-family-day-out',
  'the-peninsula-beach-swimming-guide',
  'the-peninsula-with-kids',
  'the-rainy-day-peninsula-without-a-booking',
  'things-to-do-mornington-peninsula',
  'where-to-stay-mornington-peninsula',
]);

export const GET: APIRoute = async () => {
  const [
    venues,
    experiences,
    places,
    regions,
    articles,
    itineraries,
    events,
    tours,
    tourOperators,
    tourPackages,
    species,
    fishingLocations,
    fishingCharters,
    boatRamps,
    boatHire,
  ] = await Promise.all([
    getCollection('venues'),
    getCollection('experiences'),
    getCollection('places'),
    getCollection('regions'),
    getCollection('articles', ({ data }) => data.status === 'published'),
    getCollection('itineraries'),
    getCollection('events'),
    getCollection('tours'),
    getCollection('tourOperators'),
    getCollection('tourPackages'),
    getCollection('species', ({ data }) => data.status === 'published'),
    getCollection('fishingLocations', ({ data }) => data.status === 'published'),
    getCollection('fishingCharters', ({ data }) => data.status === 'published'),
    getCollection('boatRamps', ({ data }) => data.status === 'published'),
    getCollection('boatHire', ({ data }) => data.status === 'published'),
  ]);

  // /eat/<winery>/ pages carry canonical -> /wine/<slug>/ (see
  // pages/eat/[slug].astro) - they fail §4.1 rule 1 (self-canonical), so
  // wineries are emitted under /wine/ only. This removes the 41-page
  // duplicate winery tree from the sitemap (SEO plan §3.3).
  const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'brewery', 'distillery', 'providore'];
  const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
  const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];

  const eatVenues = venues.filter((v) => eatTypes.includes(v.data.type) && notExcluded(v));
  const stayVenues = venues.filter((v) => stayTypes.includes(v.data.type) && notExcluded(v));
  const wineVenues = venues.filter((v) => wineTypes.includes(v.data.type) && notExcluded(v));

  const entries: string[] = [];

  // ---------------------------------------------------------------------
  // TIER 1 - CROWN: homepage, pillar hubs, town pages, protect-list URLs
  // ---------------------------------------------------------------------
  entries.push(url('/', 1.0, 'weekly'));

  // Section index pages. /spa/ and /walks/ are intentionally omitted:
  // /spa/ redirects to /explore/spas-and-wellness/ and /walks/ now
  // canonicalises to /explore/best-walks/ (SEO plan §3.6 #12) - losers
  // never enter. /golf/ removed 2026-05-05 (noindex stub -> /explore/golf/).
  // /events/ hub removed 2026-07-11: the /events/* signature-event tree is a
  // consolidation loser awaiting the §3.4 migration into /whats-on/*.
  const TOP_HUBS = new Set(['dog-friendly', 'whats-on', 'corporate-events', 'fishing', 'ask']);
  for (const section of ['eat', 'stay', 'wine', 'explore', 'explore/plans', 'journal', 'explore/places', 'whats-on', 'dog-friendly', 'weddings', 'corporate-events', 'fishing', 'boating']) {
    entries.push(url(`/${section}`, TOP_HUBS.has(section) ? 1.0 : 0.9, 'weekly'));
  }
  // NOTE (found during SEOMIG, out of lease to fix here): the built
  // /explore/plans/ hub carries canonical -> /plans/ while /plans/ is still a
  // redirect stub back into /explore/plans/ (pages/explore/plans/index.astro
  // line ~181). That canonical should stay self until the §3.5 tree flip.
  for (const hub of ['tour', 'awards', 'guides']) {
    entries.push(url(`/${hub}`, 0.8, 'weekly'));
  }
  entries.push(url('/explore/golf', 1.0, 'weekly'));
  for (const subhub of ['fishing/species', 'fishing/locations', 'fishing/charters', 'boating/ramps', 'boating/hire']) {
    entries.push(url(`/${subhub}`, 0.8, 'weekly'));
  }
  for (const pillar of ['fishing/seasons/snapper-run-oct-dec', 'fishing/charters/first-charter-guide', 'boating/tides-safety', 'tour/fishing-tours']) {
    entries.push(url(`/${pillar}`, 0.7, 'monthly'));
  }
  // Concierge surfaces. /map/ is a destination surface with static
  // explanatory content and keeps indexability (§4.3); /search/ never enters.
  entries.push(url('/ask', 1.0, 'weekly'));
  entries.push(url('/map', 0.7, 'weekly'));
  entries.push(url('/partners/apply', 0.5, 'monthly'));

  // Trust / editorial-standards pages. /methodology/, /our-approach/ and
  // /ethics/ removed 2026-07-11 - they are redirect stubs into
  // /editorial-approach/ (§4.1 rule 1). Utility/legal singles added.
  for (const page of ['about', 'editorial-approach', 'corrections', 'accessibility', 'contact']) {
    entries.push(url(`/${page}`, 0.4, 'monthly'));
  }
  for (const page of ['site-index', 'privacy', 'terms', 'careers', 'submit', 'pass']) {
    entries.push(url(`/${page}`, 0.3, 'monthly'));
  }
  entries.push(url('/dispatch', 0.6, 'monthly'));
  entries.push(url('/partners', 0.5, 'monthly'));

  // Best-of pages (cluster canonicals only - §3.1/§3.2/§3.6 losers such as
  // /wine/cellar-doors/, /wine/best-wineries-mornington-peninsula/,
  // /stay/where-to-stay-mornington-peninsula/, /explore/where-to-base-yourself/,
  // /walks/, /stay/couples/, /explore/free/ and the section dog-friendly
  // pages now canonicalise elsewhere or await redirect, and never enter).
  entries.push(url('/eat/best-restaurants', 0.9, 'weekly'));
  entries.push(url('/wine/best-cellar-doors', 0.9, 'weekly'));
  entries.push(url('/explore/best-walks', 0.8, 'weekly'));
  entries.push(url('/stay/best-accommodation', 0.8, 'weekly'));

  // SEO journal landing pages (hand-coded article pages that do not live in
  // the articles collection). winery-tour and itinerary removed 2026-07-11
  // (stub / noindex - see JOURNAL_STUB_OR_NOINDEX_SLUGS). Dog-friendly
  // spokes added per §3.7 (hand-coded, previously missing).
  const seoJournalPages = [
    '/journal/mornington-peninsula-in-autumn',
    '/journal/mornington-peninsula-in-winter',
    '/journal/mornington-peninsula-with-kids',
    '/journal/dog-friendly-mornington-peninsula',
    '/journal/mornington-peninsula-day-trip',
    '/journal/mornington-peninsula-hot-springs-guide',
    '/journal/free-things-to-do-mornington-peninsula',
    '/journal/best-brunch-mornington-peninsula',
    '/journal/mornington-peninsula-wedding-venues',
    '/journal/best-towns-to-base-yourself-with-a-dog-mornington-peninsula',
    '/journal/what-to-do-on-the-peninsula-with-a-dog-when-its-wet-or-busy',
  ];
  for (const page of seoJournalPages) {
    entries.push(url(page, 0.8, 'monthly'));
  }

  // ---------------------------------------------------------------------
  // TIER 2 - CORPUS: venue pages, category/best-of guides, journal, plans,
  // places, regions
  // ---------------------------------------------------------------------

  for (const venue of eatVenues) {
    entries.push(url(`/eat/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }
  for (const venue of stayVenues) {
    entries.push(url(`/stay/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }
  for (const venue of wineVenues) {
    entries.push(url(`/wine/${routeSlug(venue)}`, 0.8, 'weekly', dateStr(venue.data.publishedAt)));
  }

  // Hand-coded category / best-of pages (previously missing from the sitemap
  // entirely - part of the 381-page gap in §4.1). Consolidation losers are
  // deliberately absent: /eat/dog-friendly/, /stay/dog-friendly/,
  // /wine/dog-friendly/, /explore/dog-friendly/ (§3.7), /stay/couples/
  // (-> couples-retreats), /stay/where-to-stay-mornington-peninsula/ (§3.2),
  // /wine/cellar-doors/ + /wine/best-wineries-mornington-peninsula/ (§3.1),
  // /explore/free/ (§3.6 #3), /explore/where-to-base-yourself/ (§3.2).
  const eatCategoryPages = ['bakeries', 'breweries', 'brunch', 'cafes', 'cellar-door-lunch', 'date-night', 'distilleries', 'family-friendly', 'fine-dining', 'hatted-restaurants', 'long-lunch', 'markets', 'no-booking', 'paddock-to-plate', 'providores', 'pubs', 'red-hill-cheese', 'seafood', 'waterfront'];
  for (const page of eatCategoryPages) {
    entries.push(url(`/eat/${page}`, 0.7, 'weekly'));
  }
  const stayCategoryPages = ['boutique-hotels', 'cape-schanck', 'coastal-stays', 'cottages', 'couples-retreats', 'flinders', 'glamping', 'hot-springs-accommodation', 'luxury', 'mornington', 'red-hill', 'resorts', 'sorrento', 'villas', 'vineyard-stays', 'wellness-retreats', 'winery-accommodation'];
  for (const page of stayCategoryPages) {
    entries.push(url(`/stay/${page}`, 0.7, 'weekly'));
  }
  const wineCategoryPages = ['appointment-producers', 'balnarring', 'chardonnay', 'flinders', 'main-ridge', 'merricks', 'moorooduc-tuerong', 'pinot-noir', 'red-hill', 'wine-region'];
  for (const page of wineCategoryPages) {
    entries.push(url(`/wine/${page}`, 0.7, 'weekly'));
  }
  const exploreGuidePages = ['beaches', 'day-trips', 'family-friendly', 'getting-around', 'getting-here', 'hot-springs', 'map', 'markets', 'rainy-day', 'spas-and-wellness', 'things-to-do', 'walks', 'weekend-trips'];
  for (const page of exploreGuidePages) {
    entries.push(url(`/explore/${page}`, 0.7, 'weekly'));
  }

  // Experiences
  for (const experience of experiences.filter(notExcluded)) {
    entries.push(url(`/explore/${routeSlug(experience)}`, 0.7, 'weekly', dateStr(experience.data.publishedAt)));
  }

  // Places (town pages - Tier 1 protected set at template level)
  for (const place of places.filter(notExcluded)) {
    entries.push(url(`/explore/places/${routeSlug(place)}`, 0.8, 'weekly', dateStr(place.data.publishedAt)));
  }

  // Regions (previously missing)
  entries.push(url('/explore/regions', 0.6, 'monthly'));
  for (const region of regions.filter(notExcluded)) {
    entries.push(url(`/explore/regions/${region.data.slug}`, 0.6, 'monthly', dateStr(region.data.publishedAt)));
  }

  // Peninsula This Weekend rolling URL
  entries.push(url('/whats-on/this-weekend', 1.0, 'weekly'));

  // Journal articles. Exclusions:
  //  - sitemapExclude flag
  //  - PTW dispatches (redirect to /whats-on/this-weekend/archive/)
  //  - section === 'plans' (the /journal/ route 301s them to
  //    /explore/plans/<slug>/ - they are emitted there below)
  //  - JOURNAL_STUB_OR_NOINDEX_SLUGS (route overridden by a stub page)
  const isPtwSlug = (a: any) =>
    a.data.format === 'weekend-picker' && routeSlug(a).startsWith('peninsula-this-weekend');
  const indexableArticles = articles.filter(
    (a) =>
      notExcluded(a) &&
      !isPtwSlug(a) &&
      a.data.section !== 'plans' &&
      !JOURNAL_STUB_OR_NOINDEX_SLUGS.has(routeSlug(a)),
  );
  for (const article of indexableArticles) {
    entries.push(url(`/journal/${routeSlug(article)}`, 0.7, 'weekly', dateStr(article.data.publishedAt)));
  }
  // Hand-coded journal index surfaces (previously missing)
  entries.push(url('/journal/cellar-door', 0.5, 'weekly'));
  entries.push(url('/journal/local-secrets', 0.5, 'weekly'));

  // PTW archive entries
  for (const article of articles.filter(isPtwSlug)) {
    const archiveSlug = article.data.publishedAt.toISOString().split('T')[0];
    entries.push(
      url(`/whats-on/this-weekend/archive/${archiveSlug}`, 0.6, 'monthly', dateStr(article.data.publishedAt)),
    );
  }

  // Plans: itinerary collection + section==='plans' articles both render at
  // /explore/plans/<slug>/ (see pages/explore/plans/[slug].astro). The
  // articles half was previously missing while their /journal/ stubs were
  // wrongly listed. /explore/plans/build/ is a tool and never enters (rule 5).
  for (const itinerary of itineraries.filter(notExcluded)) {
    entries.push(url(`/explore/plans/${routeSlug(itinerary)}`, 0.7, 'weekly', dateStr(itinerary.data.publishedAt)));
  }
  for (const article of articles.filter((a) => notExcluded(a) && a.data.section === 'plans')) {
    entries.push(url(`/explore/plans/${routeSlug(article)}`, 0.7, 'weekly', dateStr(article.data.publishedAt)));
  }

  // ---------------------------------------------------------------------
  // TIER 3 - VERTICALS & FRESH: fishing, boating, tours, awards, events,
  // collections
  // ---------------------------------------------------------------------

  for (const sp of species.filter(notExcluded)) {
    entries.push(url(`/fishing/species/${routeSlug(sp)}`, 0.8, 'weekly', dateStr(sp.data.publishedAt)));
  }
  for (const loc of fishingLocations.filter(notExcluded)) {
    entries.push(url(`/fishing/locations/${routeSlug(loc)}`, 0.7, 'weekly', dateStr(loc.data.publishedAt)));
  }
  for (const ch of fishingCharters.filter(notExcluded)) {
    entries.push(url(`/fishing/charters/${routeSlug(ch)}`, 0.8, 'weekly', dateStr(ch.data.publishedAt)));
  }
  for (const r of boatRamps.filter(notExcluded)) {
    entries.push(url(`/boating/ramps/${routeSlug(r)}`, 0.7, 'weekly', dateStr(r.data.publishedAt)));
  }
  for (const h of boatHire.filter(notExcluded)) {
    entries.push(url(`/boating/hire/${routeSlug(h)}`, 0.7, 'weekly', dateStr(h.data.publishedAt)));
  }

  // Tours - a whole commercial section previously unpublished to search
  // (§4.1 Tier 3: 47 tour + 9 tour-package pages). Slug construction mirrors
  // pages/tour/[slug].astro et al (id ?? data.slug).
  const tourSlug = (e: any) => e.id ?? e.data.slug;
  entries.push(url('/tour/operators', 0.6, 'monthly'));
  for (const t of tours.filter(notExcluded)) {
    entries.push(url(`/tour/${tourSlug(t)}`, 0.6, 'weekly', dateStr(t.data.publishedAt)));
  }
  for (const op of tourOperators.filter(notExcluded)) {
    entries.push(url(`/tour/operators/${tourSlug(op)}`, 0.6, 'monthly', dateStr(op.data.publishedAt)));
  }
  entries.push(url('/tour-packages', 0.6, 'monthly'));
  for (const pkg of tourPackages.filter(notExcluded)) {
    entries.push(url(`/tour-packages/${tourSlug(pkg)}`, 0.6, 'monthly', dateStr(pkg.data.publishedAt)));
  }
  // Hand-coded tour category pages (fishing-tours already emitted above)
  for (const page of ['for-couples', 'for-families', 'full-day-tours', 'hot-springs-tours', 'private-tours', 'small-group-tours', 'wine-tours']) {
    entries.push(url(`/tour/${page}`, 0.6, 'monthly'));
  }

  // Awards - category pages mirror pages/awards/[slug].astro DEFAULT_CATEGORY_SLUGS
  for (const slug of ['restaurant-of-the-year', 'cellar-door-of-the-year', 'stay-of-the-year', 'walk-of-the-year', 'best-new-opening', 'best-family-day', 'locals-choice', 'worth-the-drive', 'editorial-discovery']) {
    entries.push(url(`/awards/${slug}`, 0.5, 'monthly'));
  }
  entries.push(url('/awards/nominate', 0.4, 'monthly'));

  // Insider's 30 collection
  entries.push(url('/insiders-30', 0.6, 'monthly'));
  entries.push(url('/insiders-30/2026', 0.6, 'monthly'));
  entries.push(url('/insiders-30/map', 0.5, 'monthly'));

  // Cross-cutting guide children (previously missing)
  entries.push(url('/weddings/winery-wedding-venues-mornington-peninsula', 0.6, 'monthly'));
  entries.push(url('/corporate-events/best-corporate-retreat-venues-mornington-peninsula', 0.6, 'monthly'));

  // Quick-note: ONE indexable index only (§4.3) - detail pages are dated
  // micro-notes with no query demand and never enter the sitemap.
  entries.push(url('/quick-note', 0.5, 'daily'));

  // What's On mood lanes (server-rendered list views, previously missing)
  for (const mood of ['after-dark', 'this-weekend', 'when-it-rains', 'worth-the-drive']) {
    entries.push(url(`/whats-on/by-mood/${mood}`, 0.5, 'weekly'));
  }

  // Event detail pages - current/future or recurring only (§4.1 rule 4:
  // expired one-off events stay live for history but leave the sitemap).
  const today = new Date();
  for (const event of events.filter(notExcluded)) {
    const recurrence = event.data.recurrence ?? 'one-off';
    const isRecurring = recurrence !== 'one-off';
    const endish = event.data.endDate ?? event.data.startDate;
    const stillCurrent = endish && endish.getTime() >= today.getTime() - 24 * 60 * 60 * 1000;
    if (!isRecurring && !stillCurrent) continue;
    entries.push(url(`/whats-on/${routeSlug(event)}`, 0.6, 'weekly', dateStr(event.data.publishedAt)));
  }

  // NOTE: /events/* signature pages, /picks/, /walks/*, /itinerary/, /plan/,
  // /search/, /saved/, /alerts/, /account/*, /me/*, /admin/, /ops/, /access/
  // and /explore/plans/build/ are deliberately absent (§4.1 rules 3 and 5;
  // redirect targets land at Cloudflare cutover - see ops/cloudflare-redirects.csv).

  // Dedupe by <loc>, first occurrence wins (highest tier emits first).
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const loc = e.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? e;
    if (seen.has(loc)) return false;
    seen.add(loc);
    return true;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${deduped.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
