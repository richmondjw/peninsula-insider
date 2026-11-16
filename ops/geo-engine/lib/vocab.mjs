// The Peninsula vocabulary, read from the editorial content collections rather
// than hard-coded, so it stays correct as the site grows. Nothing here invents
// a town, venue or event that the collections do not already contain.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, readJson } from './util.mjs';

const CONTENT = path.join(REPO_ROOT, 'next', 'src', 'content');

function loadCollection(name) {
  const dir = path.join(CONTENT, name);
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  } catch {
    return [];
  }
  const out = [];
  for (const file of files) {
    const doc = readJson(path.join(dir, file));
    if (doc && typeof doc === 'object') out.push({ ...doc, _slug: doc.slug ?? file.replace(/\.json$/, '') });
  }
  return out;
}

/** Audiences, seasons and activities the benchmark and gap engines combine. */
export const AUDIENCES = [
  { key: 'family', label: 'with kids', terms: ['kid', 'kids', 'family', 'families', 'children', 'playground'] },
  { key: 'dog', label: 'with a dog', terms: ['dog', 'dogs', 'dog-friendly', 'off-leash', 'puppy'] },
  { key: 'couple', label: 'for couples', terms: ['romantic', 'couple', 'couples', 'date night', 'anniversary'] },
  { key: 'group', label: 'with a group', terms: ['group', 'groups', 'hens', 'bucks', 'birthday', 'party'] },
  { key: 'accessible', label: 'with accessibility needs', terms: ['accessible', 'wheelchair', 'pram', 'step-free'] },
  { key: 'solo', label: 'on your own', terms: ['solo', 'alone', 'by yourself'] },
  { key: 'older', label: 'for older visitors', terms: ['seniors', 'grandparents', 'gentle', 'easy walk'] },
];

export const SEASONS = [
  { key: 'summer', label: 'in summer', months: [12, 1, 2] },
  { key: 'autumn', label: 'in autumn', months: [3, 4, 5] },
  { key: 'winter', label: 'in winter', months: [6, 7, 8] },
  { key: 'spring', label: 'in spring', months: [9, 10, 11] },
];

export const ACTIVITIES = [
  { key: 'eat', label: 'eat', terms: ['restaurant', 'dining', 'lunch', 'dinner', 'eat', 'bistro', 'pub'] },
  { key: 'cafe', label: 'find a cafe', terms: ['cafe', 'coffee', 'breakfast', 'brunch', 'bakery'] },
  { key: 'wine', label: 'taste wine', terms: ['winery', 'wineries', 'cellar door', 'vineyard', 'wine'] },
  { key: 'beer', label: 'drink beer', terms: ['brewery', 'beer', 'taproom', 'distillery', 'gin'] },
  { key: 'beach', label: 'go to the beach', terms: ['beach', 'swim', 'bay beach', 'surf', 'rock pool'] },
  { key: 'walk', label: 'go for a walk', terms: ['walk', 'walks', 'hike', 'trail', 'boardwalk'] },
  { key: 'stay', label: 'stay', terms: ['stay', 'accommodation', 'hotel', 'cottage', 'airbnb'] },
  { key: 'wellness', label: 'unwind', terms: ['hot springs', 'spa', 'thermal', 'wellness', 'massage'] },
  { key: 'event', label: 'find something on', terms: ['event', 'market', 'festival', "what's on", 'gig'] },
  { key: 'shop', label: 'shop', terms: ['shop', 'shopping', 'boutique', 'gallery', 'gift'] },
  { key: 'nature', label: 'see nature', terms: ['park', 'reserve', 'wildlife', 'garden', 'lookout'] },
  { key: 'activity', label: 'do something active', terms: ['golf', 'kayak', 'fishing', 'surf lesson', 'cycling', 'boat'] },
];

/** Question frames used to build the natural-language GEO benchmark. */
export const QUESTION_FRAMES = {
  things_to_do: 'What are the best things to do in {town}{qualifier}?',
  eat: 'Where should we eat in {town}{qualifier}?',
  cafe: 'What is the best cafe in {town}{qualifier}?',
  wine: 'What are good wineries near {town}{qualifier}?',
  beach: 'Which beach should we go to near {town}{qualifier}?',
  walk: 'What is a good walk near {town}{qualifier}?',
  stay: 'Where should we stay in {town}{qualifier}?',
  event: "What is on in {town}{qualifier}?",
  itinerary: 'How should we plan a day in {town}{qualifier}?',
  hidden: 'What are some lesser-known things to do in {town}{qualifier}?',
  practical: 'Is {town} worth visiting{qualifier}?',
  rainy: 'What can we do in {town} when it rains{qualifier}?',
};

let cache = null;

export function loadVocabulary({ force = false } = {}) {
  if (cache && !force) return cache;

  const places = loadCollection('places');
  const regions = loadCollection('regions');
  const venues = loadCollection('venues');
  const events = loadCollection('events');
  const experiences = loadCollection('experiences');
  const tours = loadCollection('tours');
  const itineraries = loadCollection('itineraries');

  const towns = places.map((p) => ({
    slug: p._slug,
    name: p.name ?? p._slug,
    kind: p.kind ?? 'town',
    zone: p.zone ?? null,
    region: p.regionSlug ?? null,
    coordinates: p.coordinates ?? null,
    hasFactualLede: Boolean(p.factualLede),
  }));

  const venueRecords = venues.map((v) => ({
    slug: v._slug,
    name: v.name ?? v._slug,
    type: v.type ?? 'venue',
    place: v.place ?? null,
    zone: v.zone ?? null,
    coordinates: v.coordinates ?? null,
    address: v.address ?? null,
    phone: v.phone ?? null,
    website: v.website ?? null,
    priceBand: v.priceBand ?? null,
    hasHours: Boolean(v?.visiting?.openingHours),
    hasSignature: Boolean(v.signature),
  }));

  const eventRecords = events.map((e) => ({
    slug: e._slug,
    id: e.eventId ?? null,
    title: e.title ?? e._slug,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? e.startDate ?? null,
    season: e.season ?? null,
    venueName: e.venueName ?? null,
    suburb: e.suburb ?? null,
    coordinates: e.coordinates ?? null,
    url: e.officialEventUrl ?? null,
  }));

  const townNames = new Map();
  for (const t of towns) {
    townNames.set(t.name.toLowerCase(), t);
    townNames.set(t.slug, t);
  }

  cache = {
    towns,
    townByName: townNames,
    regions: regions.map((r) => ({ slug: r._slug, name: r.name ?? r._slug })),
    venues: venueRecords,
    events: eventRecords,
    experiences: experiences.map((x) => ({ slug: x._slug, name: x.name ?? x.title ?? x._slug, place: x.place ?? null })),
    tours: tours.map((x) => ({ slug: x._slug, name: x.name ?? x.title ?? x._slug })),
    itineraries: itineraries.map((x) => ({ slug: x._slug, name: x.name ?? x.title ?? x._slug })),
    audiences: AUDIENCES,
    seasons: SEASONS,
    activities: ACTIVITIES,
    counts: {
      towns: towns.length, venues: venueRecords.length, events: eventRecords.length,
      experiences: experiences.length, tours: tours.length, regions: regions.length,
      itineraries: itineraries.length,
    },
  };
  return cache;
}

/** Local entity mentions found in free text, used for local-specificity scoring. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function mentionedTowns(text, vocab = loadVocabulary()) {
  const haystack = String(text).toLowerCase();
  const found = new Set();
  for (const town of vocab.towns) {
    const name = town.name.toLowerCase();
    if (name.length < 3) continue;
    // Word boundaries so short town names (Rye) match the place, not a substring.
    if (new RegExp(`\\b${escapeRe(name)}\\b`).test(haystack)) found.add(town.slug);
  }
  return [...found];
}

export function mentionedVenues(text, vocab = loadVocabulary()) {
  const lower = String(text).toLowerCase();
  const found = new Set();
  for (const venue of vocab.venues) {
    const name = venue.name.toLowerCase();
    if (name.length < 6) continue;
    if (lower.includes(name)) found.add(venue.slug);
  }
  return [...found];
}
