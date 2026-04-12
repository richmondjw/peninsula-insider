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
};

// Event taxonomy labels — keep in lock-step with events collection schema.
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
    blurb: 'Bring a pram, bring a toddler, bring a teen — everyone will be happy.',
  },
  B: {
    label: 'Kids Grade B',
    blurb: 'One age range event — good if you\'ve got 5-to-10s, risky otherwise.',
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
 * Resolve a usable hero image src. The source content often contains
 * placeholder paths (e.g. `/images/placeholder-foo.jpg`) that don't
 * exist on disk; templates used to skip those entirely, leaving blank
 * hero blocks. This walks a fallback chain instead:
 *   1. The content's own heroImage.src, if it isn't a placeholder
 *   2. `place-{place}-01.webp` when the place has a sourced image
 *   3. `home-cover.webp` as the ultimate backstop
 */
export function resolveHeroSrc(data: any): string {
  const src = data?.heroImage?.src;
  if (src && !src.includes('placeholder')) return src;
  const place = String(data?.place?.id ?? data?.place ?? '');
  if (place && placesWithHero.has(place)) {
    return baseHref(`/images/sourced/place-${place}-01.webp`);
  }
  return baseHref('/images/sourced/home-cover.webp');
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
 * Score a venue by how "local favourite" it feels — weighted by the
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

