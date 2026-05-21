/**
 * Prefix an internal path with the site's base URL so links work
 * when the build is served from a subdirectory (e.g. /V2/).
 * Set ASTRO_BASE=/V2/ at build time; without it, paths stay root-relative.
 */
export function baseHref(path: string): string {
  const raw = import.meta.env.BASE_URL || '/';
  const base = raw.endsWith('/') ? raw : raw + '/';
  if (path === '/' || path === '') return base;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${clean}`;
}

export const formatLabel: Record<string, string> = {
  'editors-letter': 'Editor\'s Letter',
  'long-lunch-list': 'Long Lunch List',
  'cellar-door-dispatch': 'Cellar Door Dispatch',
  'stay-notes': 'Stay Notes',
  'slow-peninsula': 'Slow Peninsula',
  'insider-edit': 'Insider Edit',
  interview: 'Interview',
  investigation: 'Investigation',
  service: 'Service',
  'weekend-picker': 'Weekend Picker',
  'hub-guide': 'Hub Guide',
  'trail-guide': 'Trail Guide',
  'venue-guide': 'Venue Guide',
};

// Event taxonomy labels  -  keep in lock-step with events collection schema.
export const eventCategoryLabel: Record<string, string> = {
  'food-wine': 'Food & Wine',
  market: 'Markets',
  festival: 'Festivals',
  'cellar-door': 'Cellar Doors',
  community: 'Community',
  arts: 'Arts',
  wellness: 'Wellness',
  'live-music': 'Live Music',
  'racing-sport': 'Racing & Sport',
  'family-programs': 'Kids & Family',
  exhibition: 'Exhibitions',
  civic: 'Civic',
  nature: 'Nature & Walks',
  'writers-ideas': 'Writers & Ideas',
};

export const eventLensLabel: Record<string, string> = {
  'weekend-pick': 'Weekend Pick',
  'date-idea': 'Date Idea',
  'family-saturday': 'Family Saturday',
  'rainy-day': 'Rainy Day',
  'worth-the-drive': 'Worth The Drive',
  free: 'Free',
  'school-holidays': 'School Holidays',
  'walk-in': 'Walk-In',
  ticketed: 'Ticketed',
  'locals-know': 'Locals Know',
};

export const kidsGradeCopy: Record<string, { label: string; blurb: string }> = {
  A: {
    label: 'Kids Grade A',
    blurb: 'Bring a pram, bring a toddler, bring a teen  -  everyone will be happy.',
  },
  B: {
    label: 'Kids Grade B',
    blurb: 'One age range event  -  good if you\'ve got 5-to-10s, risky otherwise.',
  },
  C: {
    label: 'Kids Grade C',
    blurb: 'Marketed as family but it\'s really for adults with tolerant kids.',
  },
  'not-for-kids': {
    label: 'Adults only',
    blurb: 'Leave them at home. This is not the outing.',
  },
};

export const weatherCopy: Record<string, string> = {
  'all-weather': 'All weather',
  'sunny-only': 'Sunny only',
  'rainy-day-rescue': 'Rainy-day rescue',
  'weather-proof': 'Weather-proof',
  mixed: 'Weather flexible',
};

export function isUpcoming(date: Date, now: Date = new Date()) {
  // Treat start-of-day comparisons so anything dated “today” still counts.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() >= today.getTime();
}

export function eventDateLabel(start: Date, end?: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const short = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
  if (!end || end.getTime() === start.getTime()) return fmt(start);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${short(start)} – ${sameYear ? fmt(end) : fmt(end)}`;
}

export function eventWeekendOf(date: Date) {
  // Returns the Saturday of the week this date falls in.
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function melbourneDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Given a dispatch's publishedAt, return the Saturday/Sunday weekend it covers,
 * using the upcoming Saturday in the dispatch's publication week. Bounds are
 * Melbourne-midnight windows suitable for filtering events, with a human label
 * like "2–3 May" (or "30 April – 1 May" when the weekend straddles months).
 *
 * The display title remains editorial; this helper keeps homepage and What's On
 * modules aligned to the same weekend window.
 */
export function dispatchWeekend(publishedAt: Date) {
  const day = 24 * 60 * 60 * 1000;
  const sat = eventWeekendOf(publishedAt);
  const sun = new Date(sat.getTime() + day);
  const start = new Date(`${melbourneDateKey(sat)}T00:00:00+10:00`);
  const end = new Date(`${melbourneDateKey(sun)}T23:59:59+10:00`);
  const monthLong = (d: Date) =>
    d.toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' });
  const dayNum = (d: Date) => d.getUTCDate();
  const label = monthLong(sat) === monthLong(sun)
    ? `${dayNum(sat)}–${dayNum(sun)} ${monthLong(sat)}`
    : `${dayNum(sat)} ${monthLong(sat)} – ${dayNum(sun)} ${monthLong(sun)}`;
  return { start, end, sat, sun, label };
}

export const typeLabel: Record<string, string> = {
  restaurant: 'Restaurant',
  winery: 'Winery',
  cafe: 'Café',
  bakery: 'Bakery',
  pub: 'Pub',
  brewery: 'Brewery',
  distillery: 'Distillery',
  producer: 'Producer',
  market: 'Market',
  hotel: 'Hotel',
  villa: 'Villa',
  cottage: 'Cottage',
  glamping: 'Glamping',
  'farm-stay': 'Farm Stay',
  spa: 'Spa',
};

export const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
export const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];
export const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'winery'];
export const activityTypes = ['beach', 'activity'];

export function titleize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function placeLabel(place: any) {
  return titleize(String(place?.id ?? place ?? ''));
}

export function venueHrefPrefix(type: string) {
  if (stayTypes.includes(type)) return baseHref('/stay');
  if (wineTypes.includes(type)) return baseHref('/wine');
  return baseHref('/eat');
}

export function routeSlug(entry: any) {
  return entry.slug ?? entry.id ?? entry?.data?.slug ?? entry?.data?.id;
}

/**
 * Places that have a matching `/images/sourced/place-{slug}-01.webp`.
 * Used as the middle rung of the hero fallback chain so any venue,
 * experience, or article in one of these places at least inherits
 * a location-appropriate visual when its own hero is a placeholder.
 * Keep in sync with what actually ships in `public/images/sourced/`.
 */
export const placesWithHero = new Set<string>([
  'balnarring', 'cape-schanck', 'dromana', 'flinders', 'main-ridge',
  'merricks', 'moorooduc', 'mornington', 'mount-martha', 'point-nepean',
  'portsea', 'red-hill', 'rosebud', 'rye', 'safety-beach', 'sorrento',
]);

/**
 * Available `category-{type}-NN.webp` variants in `public/images/sourced/`.
 * Keep in sync with what actually ships. Order doesn't matter; the resolver
 * picks deterministically by slug-hash so adjacent grid cards differ.
 *
 * `distillery` borrows brewery variants where we don't have native imagery.
 *
 * Stay-related types (hotel/cottage/villa/glamping/farm-stay) intentionally
 * use thematic Peninsula `article-*` scenes (vineyard rows, bay water) rather
 * than the original `category-*` files, which were stock images of tropical
 * resorts/overwater bungalows/sports cars that didn't read as Peninsula. The
 * editor's directive: better to show a thematic close-up than fake a venue.
 */
const categoryVariantsByType: Record<string, string[]> = {
  pub: [
    'explore-mornington-foreshore-01.webp', 'explore-portsea-front-beach-01.webp',
    'explore-sorrento-ocean-baths-01.webp', 'explore-rye-ocean-beach-01.webp',
    'explore-dromana-beach-01.webp', 'explore-balnarring-beach-01.webp',
    'explore-mount-martha-beach-01.webp', 'explore-gunnamatta-01.webp',
    'explore-cape-schanck-lighthouse-01.webp',
    'category-pub-01.webp', 'category-pub-02.webp', 'category-pub-03.webp',
  ],
  cafe: [
    'journal-late-afternoon-walks-01.webp', 'article-dog-friendly-01.webp',
    'article-kids-peninsula-01.webp', 'article-peninsula-pantry-01.webp',
    'explore-mornington-foreshore-01.webp', 'explore-farnsworth-track-01.webp',
    'explore-balnarring-beach-01.webp', 'explore-two-bays-walk-01.webp',
    'category-cafe-01.webp', 'category-cafe-02.webp',
    'category-cafe-03.webp', 'category-cafe-04.webp',
  ],
  bakery: [
    'article-red-hill-saturday-01.webp', 'article-peninsula-pantry-01.webp',
    'article-picnic-01.webp', 'journal-late-afternoon-walks-01.webp',
    'category-bakery-01.webp', 'category-bakery-02.webp',
  ],
  brewery: [
    'article-beach-swimming-01.webp', 'article-long-lunch-01.webp',
    'explore-arthurs-seat-lookout-01.webp', 'explore-cape-schanck-boardwalk-01.webp',
    'explore-two-bays-walk-01.webp', 'explore-gunnamatta-01.webp',
    'category-brewery-01.webp', 'category-brewery-02.webp',
  ],
  distillery: [
    'article-cellar-door-01.webp', 'article-chardonnay-case-01.webp',
    'explore-mornington-foreshore-01.webp',
    'category-brewery-01.webp', 'category-brewery-02.webp',
  ],
  market: [
    'article-picnic-01.webp', 'article-red-hill-saturday-01.webp',
    'article-peninsula-pantry-01.webp', 'explore-mprg-01.webp',
    'category-market-01.webp', 'category-market-02.webp',
  ],
  producer: [
    'article-seafood-01.webp', 'article-peninsula-pantry-01.webp',
    'article-picnic-01.webp', 'article-producer-trail-01.webp',
    'explore-two-bays-walk-01.webp', 'explore-farnsworth-track-01.webp',
    'category-producer-01.webp', 'category-producer-02.webp',
    'category-producer-03.webp', 'category-producer-04.webp',
  ],
  restaurant: [
    'place-mornington-01.webp', 'place-red-hill-01.webp', 'place-merricks-01.webp',
    'place-sorrento-01.webp', 'place-flinders-01.webp', 'place-dromana-01.webp',
    'place-cape-schanck-01.webp', 'place-rosebud-01.webp', 'place-safety-beach-01.webp',
    'place-rye-01.webp', 'place-mount-martha-01.webp', 'place-moorooduc-01.webp',
    'place-balnarring-01.webp', 'place-main-ridge-01.webp', 'place-portsea-01.webp',
    'article-long-lunch-01.webp', 'article-hatted-restaurants-01.webp',
    'article-italian-dinners-01.webp', 'article-sunset-01.webp',
    'article-couples-weekend-01.webp', 'article-vineyard-villa-01.webp',
    'venue-italian-dining-01.webp',
    'category-restaurant-01.webp', 'category-restaurant-02.webp',
    'category-restaurant-03.webp', 'category-restaurant-04.webp',
    'category-restaurant-06.webp',
  ],
  winery: [
    'place-red-hill-01.webp', 'place-merricks-01.webp', 'place-main-ridge-01.webp',
    'place-mornington-01.webp', 'place-dromana-01.webp', 'place-balnarring-01.webp',
    'place-moorooduc-01.webp', 'place-flinders-01.webp',
    'article-cellar-door-01.webp', 'article-vineyard-villa-01.webp',
    'article-chardonnay-case-01.webp', 'article-sunset-01.webp',
    'category-winery-01.webp', 'category-winery-02.webp', 'category-winery-03.webp',
    'category-winery-04.webp', 'category-winery-06.webp', 'category-winery-08.webp',
  ],
  hotel: [
    'article-sorrento-weekend-01.webp', 'article-couples-weekend-01.webp',
    'place-sorrento-01.webp', 'place-portsea-01.webp', 'place-flinders-01.webp',
  ],
  cottage: [
    'article-vineyard-villa-01.webp', 'article-couples-weekend-01.webp',
    'article-sunset-01.webp', 'journal-late-afternoon-walks-01.webp',
    'explore-greens-bush-01.webp', 'explore-farnsworth-track-01.webp',
  ],
  villa: [
    'article-vineyard-villa-01.webp', 'article-couples-weekend-01.webp',
    'article-sunset-01.webp', 'journal-late-afternoon-walks-01.webp',
    'explore-greens-bush-01.webp', 'explore-sorrento-ocean-baths-01.webp',
  ],
  glamping: [
    'explore-greens-bush-01.webp', 'explore-farnsworth-track-01.webp',
    'explore-two-bays-walk-01.webp',
  ],
  'farm-stay': [
    'article-vineyard-villa-01.webp', 'article-picnic-01.webp', 'explore-greens-bush-01.webp',
  ],
  spa: [
    'spa-treatment-room-rose-01.webp', 'spa-wellness-stones-01.webp',
    'spa-peninsula-hot-springs-hilltop-01.webp',
  ],
};

/**
 * Images that look wrong on Peninsula content (mislabeled stock — tropical
 * resort, sports car, gym, etc.). Treated like placeholders so the resolver
 * routes around them via the place/article fallback chain.
 */
const BLOCKED_IMAGES = new Set<string>([
  'category-cottage-01.webp',
  'category-hotel-02.webp',
  'category-glamping-01.webp',
  'spa-coastal-pool-01.webp',
]);

const CATEGORY_FALLBACK_RE = /\/category-[a-z-]+-\d+\.[a-z]+$/;

/**
 * Matches generic location/explore shots used as stand-ins when no dedicated
 * venue photo exists: place-{name}-NN.webp and explore-{name}-NN.webp.
 */
const GENERIC_LOCATION_RE = /\/(?:place|explore)-[a-z-]+-\d+\.[a-z]+$/;

/**
 * Returns true only when the venue/experience/etc. has a genuinely
 * dedicated hero image — not a borrowed place shot, explore image,
 * category fallback, or explicit placeholder.
 *
 * Use this in card components to decide whether to show the real photo
 * or a CMS-editable placeholder slot.
 */
export function hasOwnHeroImage(data: any): boolean {
  const src = String(data?.heroImage?.src ?? '');
  if (!src) return false;
  const filename = src.split('/').pop() ?? '';
  return !(
    src.includes('placeholder')
    || CATEGORY_FALLBACK_RE.test(src)
    || GENERIC_LOCATION_RE.test(src)
    || src.includes('home-cover')
    || BLOCKED_IMAGES.has(filename)
  );
}

function hashSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Resolve a usable hero image src. The source content often contains
 * placeholder paths (legacy `/images/placeholder-foo.jpg`) or shared
 * `category-{type}-NN.webp` fallbacks that, when assigned in bulk, made
 * every pub/cafe/winery render the same image on grid pages. This walks
 * a fallback chain that ends with a deterministic spread:
 *   1. The content's own heroImage.src, if it's a real per-venue image
 *      (not legacy placeholder, not a shared category fallback).
 *   2. A candidate pool of [place-{place}-01.webp (when available)] +
 *      all category variants for this type, picked deterministically by
 *      slug-hash so the same venue always renders the same image but
 *      adjacent venues of the same type get different ones.
 *   3. `home-cover.webp` as the ultimate backstop.
 */
export function resolveHeroSrc(data: any): string {
  const src = String(data?.heroImage?.src ?? '');
  const type = String(data?.type ?? '');
  const place = String(data?.place?.id ?? data?.place ?? '');
  const slug = String(data?.slug ?? data?.id ?? data?.name ?? '');

  const filename = src.split('/').pop() ?? '';
  const isFallback = !src
    || src.includes('placeholder')
    || CATEGORY_FALLBACK_RE.test(src)
    || BLOCKED_IMAGES.has(filename);
  if (!isFallback) return src;

  const candidates: string[] = [];
  if (place && placesWithHero.has(place)) {
    candidates.push(`place-${place}-01.webp`);
  }
  candidates.push(...(categoryVariantsByType[type] ?? []));

  if (candidates.length === 0) {
    return baseHref('/images/sourced/home-cover.webp');
  }
  const idx = hashSlug(slug || place || type) % candidates.length;
  return baseHref(`/images/sourced/${candidates[idx]}`);
}

/**
 * Return the inline `background-image` style string for a hero block.
 * Using a single helper keeps template call-sites short and makes the
 * fallback chain a one-line dependency everywhere it's needed.
 */
export function heroBackgroundStyle(data: any): string {
  return `background-image: url(${resolveHeroSrc(data)}); background-size: cover; background-position: center;`;
}

/**
 * Format a hero-image credit string for display under the hero.
 *
 * Convention: when the photo is taken by James and Emma, set the
 * heroImage `credit` field to the literal string "jem". This template
 * then renders the byline as "Photograph by jem" instead of the default
 * "Photo · {credit}" prefix used for everyone else.
 *
 * Opt in by setting `credit: "jem"` on a venue, place, or article
 * heroImage. Anything else passes through unchanged.
 */
export function formatHeroCredit(credit: string | undefined | null): string {
  if (!credit) return '';
  if (credit.trim().toLowerCase() === 'jem') return 'Photograph by jem';
  return `Photo · ${credit}`;
}

/**
 * Return the current Southern-Hemisphere season from a Date.
 * Used for seasonal hooks on index pages.
 */
export function currentSeason(date: Date = new Date()): 'summer' | 'autumn' | 'winter' | 'spring' {
  const m = date.getMonth(); // 0..11
  if (m === 11 || m <= 1) return 'summer';    // Dec, Jan, Feb
  if (m >= 2 && m <= 4) return 'autumn';      // Mar, Apr, May
  if (m >= 5 && m <= 7) return 'winter';      // Jun, Jul, Aug
  return 'spring';                             // Sep, Oct, Nov
}

export const seasonBlurb: Record<'summer' | 'autumn' | 'winter' | 'spring', { label: string; line: string }> = {
  summer: {
    label: 'The summer issue',
    line: 'Back beaches at 5pm, bay swims at dawn, and long lunches that stretch until the light goes long.',
  },
  autumn: {
    label: 'The autumn issue',
    line: 'Vintage on the ridge, pinot lunches in low sun, and cellar doors with a fire going in the corner.',
  },
  winter: {
    label: 'The winter issue',
    line: 'Thermal springs, pub dinners, long-lunch fireplaces, and walks the crowds have finally left alone.',
  },
  spring: {
    label: 'The spring issue',
    line: 'New menus, fresh vintage releases, wildflower walks, and the most generous midweek bookings of the year.',
  },
};

/**
 * Score a venue by how "local favourite" it feels  -  weighted by the
 * audience.locals tag and a soft authority floor.
 */
export function isLocalFavourite(venue: any): boolean {
  const audience: string[] = venue?.data?.tags?.audience ?? [];
  return audience.includes('locals');
}

/**
 * Is this venue a good first-time entry point? Tagged for first-timers,
 * or carries the kind of friendly format a first visit needs.
 */
export function isFirstTimer(venue: any): boolean {
  const audience: string[] = venue?.data?.tags?.audience ?? [];
  if (audience.includes('first-timers')) return true;
  // Otherwise: cellar doors, cafes, and markets tend to work as first moves.
  const type = venue?.data?.type;
  return ['cafe', 'market', 'bakery'].includes(type);
}

/**
 * Filter venues whose season tag includes the given season.
 */
export function inSeason(venue: any, season: string): boolean {
  const seasons: string[] = venue?.data?.tags?.season ?? [];
  return seasons.includes(season) || seasons.includes('all-year');
}

/**
 * Filter experiences whose seasonBest includes the given season.
 */
export function experienceInSeason(experience: any, season: string): boolean {
  const seasons: string[] = experience?.data?.seasonBest ?? [];
  if (seasons.length === 0) return true;
  return seasons.includes(season) || seasons.includes('all-year');
}

