/**
 * facets.ts - unified facet adapter for the v5 FilterBar / FilterSheet stack.
 *
 * One taxonomy, everywhere (future-ia.md section 4, P4). This module is an
 * ADAPTER: it derives a unified facet vocabulary from whatever frontmatter
 * already exists on each collection (venues, experiences, events,
 * itineraries, plans articles, tours, places). No content migration, no
 * schema change; all mapping tables live here.
 *
 * Contract (the Filter agent codes against exactly this surface):
 *   FacetKey, FacetOption, FACET_OPTIONS, getFacets(kind, data), CHIP_PRESETS
 *
 * URL param names match the build contract: mood, place, price, party, cat,
 * date. Values returned by getFacets are guaranteed to appear in
 * FACET_OPTIONS[key], so the FilterBar can render chips and match entries
 * without any per-collection knowledge.
 *
 * House rules: no em-dashes, no dollar amounts (price values are band
 * indexes '1'..'4' plus 'free'; labels use band glyphs only).
 */

import { eventIsUnqualifiedFree } from './event-access.mjs';

export type FacetKey = 'place' | 'cat' | 'mood' | 'price' | 'party' | 'date';

export interface FacetOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Places: the canonical 37 towns plus the 5 regions (future-ia section 4:
// "place (37 towns + 5 regions)"). Region membership mirrors
// src/content/regions/*.json; taxonomy-lint warns when a content file uses a
// place slug outside the 37.
// ---------------------------------------------------------------------------

const REGION_OPTIONS: FacetOption[] = [
  { value: 'mornington-bay-coast', label: 'Mornington & the Bay' },
  { value: 'red-hill-wine-country', label: 'Red Hill & Merricks' },
  { value: 'peninsula-tip', label: 'Sorrento & Portsea' },
  { value: 'ocean-coast', label: 'Flinders & the Ocean Coast' },
  { value: 'western-port', label: 'Western Port' },
];

const TOWN_OPTIONS: FacetOption[] = [
  { value: 'arthurs-seat', label: 'Arthurs Seat' },
  { value: 'balnarring', label: 'Balnarring' },
  { value: 'bittern', label: 'Bittern' },
  { value: 'blairgowrie', label: 'Blairgowrie' },
  { value: 'boneo', label: 'Boneo' },
  { value: 'cape-schanck', label: 'Cape Schanck' },
  { value: 'capel-sound', label: 'Capel Sound' },
  { value: 'crib-point', label: 'Crib Point' },
  { value: 'dromana', label: 'Dromana' },
  { value: 'fingal', label: 'Fingal' },
  { value: 'flinders', label: 'Flinders' },
  { value: 'hastings', label: 'Hastings' },
  { value: 'main-ridge', label: 'Main Ridge' },
  { value: 'mccrae', label: 'McCrae' },
  { value: 'merricks', label: 'Merricks' },
  { value: 'merricks-beach', label: 'Merricks Beach' },
  { value: 'merricks-north', label: 'Merricks North' },
  { value: 'moorooduc', label: 'Moorooduc' },
  { value: 'mornington', label: 'Mornington' },
  { value: 'mount-eliza', label: 'Mount Eliza' },
  { value: 'mount-martha', label: 'Mount Martha' },
  { value: 'point-leo', label: 'Point Leo' },
  { value: 'point-nepean', label: 'Point Nepean' },
  { value: 'portsea', label: 'Portsea' },
  { value: 'red-hill', label: 'Red Hill' },
  { value: 'red-hill-south', label: 'Red Hill South' },
  { value: 'rosebud', label: 'Rosebud' },
  { value: 'rye', label: 'Rye' },
  { value: 'safety-beach', label: 'Safety Beach' },
  { value: 'shoreham', label: 'Shoreham' },
  { value: 'somers', label: 'Somers' },
  { value: 'sorrento', label: 'Sorrento' },
  { value: 'st-andrews-beach', label: 'St Andrews Beach' },
  { value: 'stony-point', label: 'Stony Point' },
  { value: 'tootgarook', label: 'Tootgarook' },
  { value: 'tuerong', label: 'Tuerong' },
  { value: 'tyabb', label: 'Tyabb' },
];

/** Town slug to region slug, mirroring src/content/regions/*.json. */
export const PLACE_TO_REGION: Record<string, string> = {
  mornington: 'mornington-bay-coast',
  'mount-martha': 'mornington-bay-coast',
  'safety-beach': 'mornington-bay-coast',
  mccrae: 'mornington-bay-coast',
  dromana: 'mornington-bay-coast',
  rosebud: 'mornington-bay-coast',
  'capel-sound': 'mornington-bay-coast',
  'mount-eliza': 'mornington-bay-coast',
  'red-hill': 'red-hill-wine-country',
  'main-ridge': 'red-hill-wine-country',
  merricks: 'red-hill-wine-country',
  'merricks-beach': 'red-hill-wine-country',
  'merricks-north': 'red-hill-wine-country',
  balnarring: 'red-hill-wine-country',
  tuerong: 'red-hill-wine-country',
  moorooduc: 'red-hill-wine-country',
  'arthurs-seat': 'red-hill-wine-country',
  'red-hill-south': 'red-hill-wine-country',
  'point-leo': 'red-hill-wine-country',
  sorrento: 'peninsula-tip',
  portsea: 'peninsula-tip',
  blairgowrie: 'peninsula-tip',
  rye: 'peninsula-tip',
  tootgarook: 'peninsula-tip',
  'point-nepean': 'peninsula-tip',
  flinders: 'ocean-coast',
  'cape-schanck': 'ocean-coast',
  fingal: 'ocean-coast',
  boneo: 'ocean-coast',
  shoreham: 'ocean-coast',
  'st-andrews-beach': 'ocean-coast',
  hastings: 'western-port',
  bittern: 'western-port',
  'crib-point': 'western-port',
  somers: 'western-port',
  'stony-point': 'western-port',
  tyabb: 'western-port',
};

/** The canonical 37 town slugs (matches src/content/places). */
export const CANONICAL_PLACES: string[] = TOWN_OPTIONS.map((o) => o.value);

// ---------------------------------------------------------------------------
// FACET_OPTIONS - every value getFacets can emit, with display labels.
// ---------------------------------------------------------------------------

export const FACET_OPTIONS: Record<FacetKey, FacetOption[]> = {
  place: [...REGION_OPTIONS, ...TOWN_OPTIONS],

  cat: [
    // Eat & Drink
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'cafe', label: 'Cafes' },
    { value: 'bakery', label: 'Bakeries' },
    { value: 'pub', label: 'Pubs' },
    { value: 'brewery', label: 'Breweries' },
    { value: 'distillery', label: 'Distilleries' },
    { value: 'providore', label: 'Providores' },
    { value: 'market', label: 'Markets' },
    // Wine
    { value: 'winery', label: 'Wineries' },
    // Stay
    { value: 'hotel', label: 'Hotels' },
    { value: 'villa', label: 'Villas' },
    { value: 'cottage', label: 'Cottages' },
    { value: 'glamping', label: 'Glamping' },
    { value: 'farm-stay', label: 'Farm stays' },
    // Explore
    { value: 'spa', label: 'Springs & spa' },
    { value: 'walk', label: 'Walks' },
    { value: 'beach', label: 'Beaches' },
    { value: 'golf', label: 'Golf' },
    { value: 'gallery', label: 'Galleries' },
    { value: 'lookout', label: 'Lookouts' },
    { value: 'attraction', label: 'Attractions' },
    { value: 'park', label: 'Parks' },
    { value: 'tour', label: 'Tours' },
    { value: 'garden', label: 'Gardens' },
    // What's On / cross-surface
    { value: 'food-wine', label: 'Food & wine' },
    { value: 'festival', label: 'Festivals' },
    { value: 'live-music', label: 'Live music' },
    { value: 'arts', label: 'Arts & exhibitions' },
    { value: 'community', label: 'Community' },
    { value: 'nature', label: 'Nature' },
    { value: 'sport', label: 'Sport' },
    { value: 'words', label: 'Writers & ideas' },
    { value: 'family', label: 'Family programs' },
    { value: 'plan', label: 'Plans' },
  ],

  mood: [
    { value: 'long-lunch', label: 'Long lunch' },
    { value: 'date-night', label: 'Date night' },
    { value: 'quick', label: 'Quick & good' },
    { value: 'slow', label: 'Slow' },
    { value: 'scenic', label: 'Views' },
    { value: 'garden', label: 'Gardens' },
    { value: 'on-the-water', label: 'On the water' },
    { value: 'cosy', label: 'Fireside' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'rainy-day', label: 'Rainy day' },
    { value: 'worth-the-drive', label: 'Worth the drive' },
    // Wine-surface derived moods
    { value: 'tasting-first', label: 'Tasting first' },
    { value: 'lunch-attached', label: 'Lunch attached' },
    { value: 'small-quiet', label: 'Small & quiet' },
    { value: 'architecture', label: 'Architecture' },
  ],

  price: [
    { value: 'free', label: 'Free' },
    { value: '1', label: '$' },
    { value: '2', label: '$$' },
    { value: '3', label: '$$$' },
    { value: '4', label: '$$$$' },
  ],

  party: [
    { value: 'couples', label: 'Couples' },
    { value: 'family', label: 'Family' },
    { value: 'group', label: 'Group' },
    { value: 'solo', label: 'Solo' },
    { value: 'dog-friendly', label: 'Dog-friendly' },
  ],

  date: [
    { value: 'today', label: 'Today' },
    { value: 'this-weekend', label: 'This weekend' },
    { value: 'next-weekend', label: 'Next weekend' },
    { value: 'this-week', label: 'This week' },
    { value: 'this-month', label: 'This month' },
    { value: 'this-season', label: 'This season' },
    { value: 'one-day', label: 'One day' },
    { value: 'weekend', label: 'Weekend' },
    { value: 'seasonal', label: 'Seasonal' },
  ],
};

// Validity sets so getFacets can never emit a value outside FACET_OPTIONS.
const VALID: Record<FacetKey, Set<string>> = {
  place: new Set(FACET_OPTIONS.place.map((o) => o.value)),
  cat: new Set(FACET_OPTIONS.cat.map((o) => o.value)),
  mood: new Set(FACET_OPTIONS.mood.map((o) => o.value)),
  price: new Set(FACET_OPTIONS.price.map((o) => o.value)),
  party: new Set(FACET_OPTIONS.party.map((o) => o.value)),
  date: new Set(FACET_OPTIONS.date.map((o) => o.value)),
};

// ---------------------------------------------------------------------------
// CHIP_PRESETS - per-surface intent chips (3 to 5 per FilterBar spec; What's
// On carries date scopes). Labels match the page-redesign chip vocabularies.
// ---------------------------------------------------------------------------

export const CHIP_PRESETS: Record<
  string,
  { key: FacetKey; value: string; label: string }[]
> = {
  eat: [
    { key: 'mood', value: 'long-lunch', label: 'Long lunch' },
    { key: 'mood', value: 'date-night', label: 'Date night' },
    { key: 'party', value: 'family', label: 'With kids' },
    { key: 'mood', value: 'quick', label: 'Quick & good' },
    { key: 'cat', value: 'winery', label: 'Winery kitchens' },
  ],
  stay: [
    { key: 'party', value: 'couples', label: 'Couples' },
    { key: 'party', value: 'family', label: 'Family' },
    { key: 'party', value: 'group', label: 'Group' },
    { key: 'party', value: 'dog-friendly', label: 'Dog-friendly' },
    { key: 'mood', value: 'on-the-water', label: 'On the water' },
  ],
  wine: [
    { key: 'mood', value: 'tasting-first', label: 'Tasting first' },
    { key: 'mood', value: 'lunch-attached', label: 'Lunch attached' },
    { key: 'mood', value: 'small-quiet', label: 'Small & quiet' },
    { key: 'mood', value: 'architecture', label: 'Architecture' },
    { key: 'party', value: 'family', label: 'With kids' },
  ],
  explore: [
    { key: 'cat', value: 'walk', label: 'Walks' },
    { key: 'cat', value: 'beach', label: 'Beaches' },
    { key: 'cat', value: 'market', label: 'Markets' },
    { key: 'party', value: 'family', label: 'With kids' },
    { key: 'mood', value: 'rainy-day', label: 'Rainy day' },
    { key: 'cat', value: 'spa', label: 'Springs & spa' },
  ],
  plans: [
    { key: 'date', value: 'one-day', label: 'One day' },
    { key: 'date', value: 'weekend', label: 'Weekend' },
    { key: 'party', value: 'family', label: 'Family' },
    { key: 'party', value: 'couples', label: 'Couples' },
    { key: 'cat', value: 'food-wine', label: 'Food & wine' },
    { key: 'mood', value: 'rainy-day', label: 'Rainy day' },
    { key: 'date', value: 'this-season', label: 'This season' },
  ],
  whatson: [
    { key: 'date', value: 'this-weekend', label: 'This weekend' },
    { key: 'date', value: 'next-weekend', label: 'Next weekend' },
    { key: 'date', value: 'this-week', label: 'This week' },
    { key: 'date', value: 'this-month', label: 'This month' },
    { key: 'date', value: 'this-season', label: 'This season' },
  ],
};

// ---------------------------------------------------------------------------
// Mapping tables (legacy frontmatter value -> unified facet values)
// ---------------------------------------------------------------------------

/** venue/experience tags.mood -> unified mood values */
const MOOD_MAP: Record<string, string[]> = {
  'long-lunch': ['long-lunch'],
  anniversary: ['date-night'],
  romance: ['date-night'],
  'first-date': ['date-night'],
  'quick-bite': ['quick'],
  slow: ['slow'],
  view: ['scenic'],
  sunset: ['scenic'],
  rooftop: ['scenic'],
  garden: ['garden'],
  waterfront: ['on-the-water'],
  beach: ['on-the-water'],
  fireplace: ['cosy'],
  wellness: ['wellness'],
  'rainy-day': ['rainy-day'],
  'worth-the-drive': ['worth-the-drive'],
  'cellar-door': ['tasting-first'],
};

/** venue/experience tags.mood -> party values (audience data hiding in mood) */
const MOOD_TO_PARTY: Record<string, string> = {
  family: 'family',
  'big-group': 'group',
  solo: 'solo',
  romance: 'couples',
  'first-date': 'couples',
  anniversary: 'couples',
};

/** tags.audience / event audienceTags -> party values */
const AUDIENCE_TO_PARTY: Record<string, string> = {
  couples: 'couples',
  couple: 'couples',
  families: 'family',
  family: 'family',
  'all-ages': 'family',
  group: 'group',
  groups: 'group',
  friends: 'group',
  solo: 'solo',
};

/** event.category -> unified cat */
const EVENT_CATEGORY_TO_CAT: Record<string, string> = {
  'food-wine': 'food-wine',
  market: 'market',
  festival: 'festival',
  'cellar-door': 'winery',
  community: 'community',
  arts: 'arts',
  wellness: 'spa',
  'live-music': 'live-music',
  'racing-sport': 'sport',
  'family-programs': 'family',
  exhibition: 'arts',
  civic: 'community',
  nature: 'nature',
  'writers-ideas': 'words',
};

/** event.lens -> unified mood */
const LENS_TO_MOOD: Record<string, string> = {
  'date-idea': 'date-night',
  'rainy-day': 'rainy-day',
  'worth-the-drive': 'worth-the-drive',
};

/** experience.type -> unified cat (venue types already pass through) */
const EXPERIENCE_TYPE_TO_CAT: Record<string, string> = {
  walk: 'walk',
  beach: 'beach',
  wellness: 'spa',
  tour: 'tour',
  attraction: 'attraction',
  gallery: 'gallery',
  park: 'park',
  lookout: 'lookout',
  market: 'market',
  workshop: 'attraction',
  'golf-course': 'golf',
};

/** itinerary escapeTheme -> unified cat */
const ITINERARY_THEME_TO_CAT: Record<string, string> = {
  wine: 'food-wine',
  food: 'food-wine',
  'food+wine': 'food-wine',
  wellness: 'spa',
  coastal: 'beach',
  golf: 'golf',
  garden: 'garden',
  cultural: 'arts',
  producer: 'market',
  surfing: 'beach',
};

/** tour.experienceType -> unified cat */
const TOUR_TYPE_TO_CAT: Record<string, string> = {
  'food-wine': 'food-wine',
  'wildlife-nature': 'nature',
  'history-heritage': 'attraction',
  'kayak-paddle': 'tour',
  cycling: 'tour',
  'walking-hiking': 'walk',
  'scenic-sightseeing': 'tour',
  'cruise-sailing': 'tour',
  'art-culture': 'arts',
  'surf-water': 'beach',
  'private-charter': 'tour',
  wellness: 'spa',
};

/** priceBand glyphs -> price band index values */
const PRICE_BAND_TO_VALUE: Record<string, string> = {
  $: '1',
  $$: '2',
  $$$: '3',
  $$$$: '4',
};

/** event.priceTier -> price values (tiers straddle bands, so some map to two) */
const PRICE_TIER_TO_VALUES: Record<string, string[]> = {
  free: ['free'],
  'under-50': ['1'],
  '50-150': ['2', '3'],
  'over-150': ['4'],
};

/** plans-article tags that carry facet signal (free-text tag -> facet hits) */
const ARTICLE_TAG_HITS: Record<string, Partial<Record<FacetKey, string[]>>> = {
  'with-kids': { party: ['family'] },
  kids: { party: ['family'] },
  family: { party: ['family'] },
  families: { party: ['family'] },
  couples: { party: ['couples'] },
  romantic: { party: ['couples'], mood: ['date-night'] },
  'date-night': { party: ['couples'], mood: ['date-night'] },
  'dog-friendly': { party: ['dog-friendly'] },
  dogs: { party: ['dog-friendly'] },
  group: { party: ['group'] },
  wine: { cat: ['food-wine'] },
  food: { cat: ['food-wine'] },
  'food-wine': { cat: ['food-wine'] },
  wineries: { cat: ['food-wine'] },
  walk: { cat: ['walk'] },
  walks: { cat: ['walk'] },
  walking: { cat: ['walk'] },
  beach: { cat: ['beach'] },
  beaches: { cat: ['beach'] },
  market: { cat: ['market'] },
  markets: { cat: ['market'] },
  spa: { cat: ['spa'], mood: ['wellness'] },
  'hot-springs': { cat: ['spa'], mood: ['wellness'] },
  wellness: { cat: ['spa'], mood: ['wellness'] },
  golf: { cat: ['golf'] },
  rainy: { mood: ['rainy-day'] },
  'rainy-day': { mood: ['rainy-day'] },
  'long-lunch': { mood: ['long-lunch'] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Astro content refs arrive as strings in raw JSON and {collection,id} or
 *  {id}/{slug} objects after the content layer resolves them. */
function refId(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'string') return o.id;
    if (typeof o.slug === 'string') return o.slug;
  }
  return null;
}

function slugifyPlace(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  return v
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Southern-hemisphere season for a date. */
export function auSeason(d: Date): 'summer' | 'autumn' | 'winter' | 'spring' {
  const m = d.getMonth(); // 0-based
  if (m === 11 || m <= 1) return 'summer';
  if (m <= 4) return 'autumn';
  if (m <= 7) return 'winter';
  return 'spring';
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Date scope values for a dated entity (events). Cumulative: an event this
 * weekend is also this-week, this-month, this-season. Past events emit [].
 */
export function dateScopesFor(
  start: Date,
  end: Date | null,
  now: Date = new Date()
): string[] {
  const today = startOfDay(now);
  const s = startOfDay(start);
  const e = end ? startOfDay(end) : s;
  if (e < today) return [];

  const scopes: string[] = [];
  if (s <= today && today <= e) scopes.push('today');

  // Current/upcoming weekend: Saturday + Sunday. If today is Sunday, the
  // weekend in progress still counts.
  const dow = today.getDay(); // 0 Sun .. 6 Sat
  const sat = dow === 0 ? addDays(today, -1) : addDays(today, 6 - dow);
  const sun = addDays(sat, 1);
  if (rangesOverlap(s, e, sat, sun)) scopes.push('this-weekend');
  if (rangesOverlap(s, e, addDays(sat, 7), addDays(sun, 7))) scopes.push('next-weekend');

  if (rangesOverlap(s, e, today, addDays(today, 6))) scopes.push('this-week');

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (rangesOverlap(s, e, monthStart, monthEnd)) scopes.push('this-month');

  const season = auSeason(today);
  const overlapDays: Date[] = [s <= today ? today : s];
  // Sample the event span (start, end, today) for a same-season hit.
  overlapDays.push(e);
  if (overlapDays.some((d) => auSeason(d) === season && d >= today)) {
    scopes.push('this-season');
  }
  return scopes;
}

/** Searchable short editorial text for keyword-derived wine moods. */
function editorialText(data: Record<string, any>): string {
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) for (const x of v) push(x);
  };
  push(data.bestFor);
  push(data.knownFor);
  push(data.signature);
  push(data.whyWeGo);
  push(data.subtype);
  push(data.worthKnowing?.atmosphere);
  push(data.worthKnowing?.goodFor);
  return parts.join(' | ').toLowerCase();
}

type Facets = Partial<Record<FacetKey, string[]>>;

/** Add values to the output, filtered to the known vocabulary and deduped. */
function emit(out: Facets, key: FacetKey, ...values: (string | null | undefined)[]) {
  for (const v of values) {
    if (!v || !VALID[key].has(v)) continue;
    const arr = (out[key] ??= []);
    if (!arr.includes(v)) arr.push(v);
  }
}

function emitPlace(out: Facets, slug: string | null | undefined) {
  if (!slug) return;
  emit(out, 'place', slug);
  const region = PLACE_TO_REGION[slug];
  if (region) emit(out, 'place', region);
}

// ---------------------------------------------------------------------------
// Per-kind derivation
// ---------------------------------------------------------------------------

function facetsForVenueLike(data: Record<string, any>, out: Facets) {
  emitPlace(out, refId(data.place));

  const type = typeof data.type === 'string' ? data.type : null;
  if (type) emit(out, 'cat', EXPERIENCE_TYPE_TO_CAT[type] ?? type);

  const moods: string[] = Array.isArray(data.tags?.mood) ? data.tags.mood : [];
  for (const m of moods) {
    for (const mapped of MOOD_MAP[m] ?? []) emit(out, 'mood', mapped);
    emit(out, 'party', MOOD_TO_PARTY[m]);
  }

  const audiences: string[] = Array.isArray(data.tags?.audience) ? data.tags.audience : [];
  for (const a of audiences) emit(out, 'party', AUDIENCE_TO_PARTY[a]);

  if (data.dogFriendly === true || data.petFriendly === true) {
    emit(out, 'party', 'dog-friendly');
  }

  if (typeof data.priceBand === 'string') {
    emit(out, 'price', PRICE_BAND_TO_VALUE[data.priceBand]);
  }

  // Season signal -> this-season (relative to now, matching the plans chip).
  const seasons: string[] = Array.isArray(data.tags?.season)
    ? data.tags.season
    : Array.isArray(data.seasonBest)
      ? data.seasonBest
      : [];
  if (seasons.length) {
    const current = auSeason(new Date());
    if (seasons.includes('all-year') || seasons.includes(current)) {
      emit(out, 'date', 'this-season');
    }
  }

  // Wine-surface derived moods (wineries only; keyword tables, short
  // editorial fields only, so false positives stay rare).
  if (type === 'winery') {
    const text = editorialText(data);
    const lunchAttached =
      moods.includes('long-lunch') ||
      /kitchen|lunch|restaurant|dining|bistro|osteria|trattoria|menu|degustation/.test(text);
    if (lunchAttached) emit(out, 'mood', 'lunch-attached');
    else emit(out, 'mood', 'tasting-first');
    if (/small|quiet|intimate|appointment|low-key|family-run|boutique|unhurried/.test(text)) {
      emit(out, 'mood', 'small-quiet');
    }
    if (/architect|pavilion|sculptur|gallery|striking|brutalis|design-led/.test(text)) {
      emit(out, 'mood', 'architecture');
    }
  }
}

function facetsForEvent(data: Record<string, any>, out: Facets) {
  const placeSlug = refId(data.place) ?? slugifyPlace(data.suburb);
  emitPlace(out, placeSlug);

  if (typeof data.category === 'string') {
    emit(out, 'cat', EVENT_CATEGORY_TO_CAT[data.category]);
  }

  const lenses: string[] = Array.isArray(data.lens) ? data.lens : [];
  for (const l of lenses) {
    emit(out, 'mood', LENS_TO_MOOD[l]);
    if (l === 'family-saturday') emit(out, 'party', 'family');
  }
  if (data.worthTheDrive === true) emit(out, 'mood', 'worth-the-drive');

  const audiences: string[] = Array.isArray(data.audienceTags) ? data.audienceTags : [];
  for (const a of audiences) emit(out, 'party', AUDIENCE_TO_PARTY[a]);
  if (data.familyFriendly === true) emit(out, 'party', 'family');
  if (data.petFriendly === true) emit(out, 'party', 'dog-friendly');

  if (eventIsUnqualifiedFree(data)) {
    emit(out, 'price', 'free');
  } else if (typeof data.priceTier === 'string') {
    emit(out, 'price', ...(PRICE_TIER_TO_VALUES[data.priceTier] ?? []));
  }

  const start = toDate(data.nextOccurrence) ?? toDate(data.startDate);
  const end = toDate(data.endDate);
  if (start) emit(out, 'date', ...dateScopesFor(start, end));
}

function facetsForItinerary(data: Record<string, any>, out: Facets) {
  emitPlace(out, refId(data.anchorTown));
  const baseTowns: unknown[] = Array.isArray(data.baseTowns) ? data.baseTowns : [];
  for (const t of baseTowns) emitPlace(out, refId(t));

  emit(out, 'cat', 'plan');
  const themes: string[] = Array.isArray(data.theme) ? data.theme : [];
  for (const t of themes) emit(out, 'cat', ITINERARY_THEME_TO_CAT[t]);

  if (typeof data.audience === 'string') emit(out, 'party', AUDIENCE_TO_PARTY[data.audience]);

  const mood = typeof data.mood === 'string' ? data.mood : null;
  if (mood === 'slow') emit(out, 'mood', 'slow');
  if (mood === 'wellness') emit(out, 'mood', 'wellness');
  if (mood === 'quick') emit(out, 'mood', 'quick');
  if (mood === 'indulgent') emit(out, 'mood', 'long-lunch');

  const occasion = typeof data.occasion === 'string' ? data.occasion : 'none';
  if (['anniversary', 'proposal', 'honeymoon', 'valentines', 'babymoon'].includes(occasion)) {
    emit(out, 'mood', 'date-night');
    emit(out, 'party', 'couples');
  }

  const budget = typeof data.budget === 'string' ? data.budget : null;
  if (budget === 'budget') emit(out, 'price', '1');
  if (budget === 'mid') emit(out, 'price', '2');
  if (budget === 'luxe') emit(out, 'price', '4');

  // Duration -> plans date chips
  const nights = typeof data.lengthNights === 'number' ? data.lengthNights : null;
  const duration = typeof data.duration === 'string' ? data.duration : null;
  if (duration === 'half-day' || duration === 'day' || nights === 0) {
    emit(out, 'date', 'one-day');
  }
  if ((nights !== null && nights >= 1) || ['one-night', 'weekend', 'three-night', 'midweek', 'week'].includes(duration ?? '')) {
    emit(out, 'date', 'weekend');
  }

  const season = typeof data.season === 'string' ? data.season : 'year-round';
  if (season === 'rainy') emit(out, 'mood', 'rainy-day');
  if (season !== 'year-round' && season !== auSeason(new Date())) {
    if (['summer', 'autumn', 'winter', 'spring', 'christmas-period', 'easter-period', 'school-holidays', 'whale-season'].includes(season)) {
      emit(out, 'date', 'seasonal');
    }
  }
  if (season === 'year-round' || season === auSeason(new Date())) {
    emit(out, 'date', 'this-season');
  }
}

function facetsForArticle(data: Record<string, any>, out: Facets) {
  if (data.section === 'plans') emit(out, 'cat', 'plan');

  const shape = typeof data.planShape === 'string' ? data.planShape : null;
  if (shape === 'day-trip') emit(out, 'date', 'one-day');
  if (shape === 'one-night' || shape === 'two-night') emit(out, 'date', 'weekend');
  if (shape === 'seasonal') emit(out, 'date', 'seasonal');

  const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
  const current = auSeason(new Date());
  for (const raw of tags) {
    const tag = String(raw).toLowerCase();
    // Place tags (plans articles tag towns directly)
    if (CANONICAL_PLACES.includes(tag)) emitPlace(out, tag);
    // Season tags
    if (tag === 'all-year' || tag === current) emit(out, 'date', 'this-season');
    const hits = ARTICLE_TAG_HITS[tag];
    if (hits) {
      for (const [key, values] of Object.entries(hits) as [FacetKey, string[]][]) {
        emit(out, key, ...values);
      }
    }
  }
}

function facetsForTour(data: Record<string, any>, out: Facets) {
  emitPlace(out, typeof data.origin === 'string' ? data.origin : null);
  if (typeof data.experienceType === 'string') {
    emit(out, 'cat', TOUR_TYPE_TO_CAT[data.experienceType] ?? 'tour');
  } else {
    emit(out, 'cat', 'tour');
  }
  if (typeof data.audience === 'string') emit(out, 'party', AUDIENCE_TO_PARTY[data.audience]);
  const themes: string[] = Array.isArray(data.theme) ? data.theme : [];
  if (themes.includes('romantic')) {
    emit(out, 'mood', 'date-night');
    emit(out, 'party', 'couples');
  }
  if (themes.includes('relaxed')) emit(out, 'mood', 'slow');
  if (themes.includes('wellness')) emit(out, 'mood', 'wellness');
  if (themes.includes('family')) emit(out, 'party', 'family');
  const band = typeof data.budgetBand === 'string' ? data.budgetBand : null;
  if (band === 'budget') emit(out, 'price', '1');
  if (band === 'moderate' || band === 'mid-range') emit(out, 'price', '2');
  if (band === 'premium') emit(out, 'price', '3');
  if (band === 'luxury') emit(out, 'price', '4');
}

// ---------------------------------------------------------------------------
// getFacets - the adapter entry point
// ---------------------------------------------------------------------------

/**
 * Derive unified facets for one content entry.
 *
 * @param kind entity kind: 'venue' | 'experience' | 'event' | 'itinerary' |
 *             'article' | 'plan' | 'tour' | 'place' (plural forms and
 *             collection keys accepted; unknown kinds fall back to the
 *             venue-shaped derivation, which is safe on any object).
 * @param data the entry's frontmatter/data object (raw JSON or Astro
 *             entry.data). Missing fields are tolerated everywhere.
 */
export function getFacets(kind: string, data: any): Partial<Record<FacetKey, string[]>> {
  const out: Facets = {};
  if (!data || typeof data !== 'object') return out;

  const k = String(kind ?? '').toLowerCase().replace(/s$/, '');
  switch (k) {
    case 'venue':
    case 'experience':
      facetsForVenueLike(data, out);
      break;
    case 'event':
      facetsForEvent(data, out);
      break;
    case 'itinerary':
    case 'itinerarie': // 'itineraries' with trailing s stripped
    case 'plan':
      facetsForItinerary(data, out);
      break;
    case 'article':
      facetsForArticle(data, out);
      break;
    case 'tour':
      facetsForTour(data, out);
      break;
    case 'place':
      emitPlace(out, typeof data.slug === 'string' ? data.slug : null);
      break;
    default:
      facetsForVenueLike(data, out);
      break;
  }
  return out;
}
