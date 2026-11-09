// Event hero resolution: every published event gets an image.
//
// Why this exists: on 2026-11-09 the auto-publisher (promote-candidates.mjs,
// outside this repo) wrote 41 events with no heroImage, and the lead "Three
// reasons to go" card on /whats-on/ rendered an empty panel. The intent that
// "every event either finds an image or gets one" lived only in docs, so no
// step performed it and no gate noticed. This module is that step; the gate is
// scripts/assert-event-heroes.mjs.
//
// Order, first match wins:
//   1. the event's own hero when its rights are recorded (never replaced; an
//      unrecorded stand-in such as a generic stock market photo is replaced);
//   2. the listed venue's own photograph, when it is recorded, verified and
//      depicts the venue itself (not a town stand-in). Visit Victoria Works are
//      skipped: their licence needs a where-used ledger row and a region caption,
//      which is an editorial step, not an automatic one;
//   3. a house illustration whose motif matches the title, then the summary;
//   4. the category's default illustration.
// Deterministic, no network, no model calls.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EVENT_DIR = path.join(NEXT, 'src/content/events');
const VENUE_DIR = path.join(NEXT, 'src/content/venues');
const LIBRARY = path.join(NEXT, 'src/data/event-illustrations.json');

const key = (s) => String(s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

async function jsonFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await jsonFiles(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

export async function loadContext() {
  const library = JSON.parse(await readFile(LIBRARY, 'utf8'));
  const venues = new Map();
  for (const file of await jsonFiles(VENUE_DIR)) {
    try {
      const v = JSON.parse(await readFile(file, 'utf8'));
      if (v.name) venues.set(key(v.name), v);
    } catch { /* unreadable venue records are validate:content's problem */ }
  }
  return { library, venues };
}

/** An image block that satisfies the event hero gate. */
export function heroIsComplete(hero) {
  return Boolean(hero?.src?.startsWith('/images/') && hero.alt && hero.credit
    && hero.rightsStatus === 'recorded' && hero.provenanceReview !== 'rejected');
}

function venuePhoto(event, venues) {
  const venue = venues.get(key(event.venueName));
  const h = venue?.heroImage;
  if (!heroIsComplete(h) || h.provenanceReview !== 'verified' || h.depictionStatus !== 'actual'
    || h.license === 'visit-victoria') return null;
  return {
    ...h,
    caption: `${venue.name}, the venue. Not a photograph of the event.`,
    depictionStatus: 'illustrative',
  };
}

// Stable choice among variants so a rebuild never reshuffles images.
function pick(list, slug) {
  let h = 0;
  for (const c of String(slug)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

function illustration(motif, slug, library) {
  const v = motif.variants ? pick(motif.variants, slug) : motif;
  const g = library.generated;
  return {
    src: v.src,
    alt: v.alt,
    credit: 'Illustration: Peninsula Insider',
    license: 'other-licensed',
    // Cards print the caption above the credit, so keep it to one short line.
    caption: 'Illustration, not a photograph of the event.',
    depicts: v.depicts,
    depictionStatus: 'illustrative',
    creator: g.creator,
    permission: motif.permission ?? g.permission,
    permittedUses: ['website'],
    rightsHolder: 'Peninsula Insider',
    rightsEstablishedOn: motif.rightsEstablishedOn ?? g.rightsEstablishedOn,
    rightsStatus: 'recorded',
    provenanceReview: 'verified',
    decorative: false,
  };
}

/** Returns { hero, via } for an event, or the event's own hero when it is already complete. */
export function resolveEventHero(event, { library, venues }) {
  if (heroIsComplete(event.heroImage)) return { hero: event.heroImage, via: 'own' };
  const photo = venuePhoto(event, venues);
  if (photo) return { hero: photo, via: 'venue-photo' };
  const motifs = library.motifs.map((m) => ({ ...m, re: new RegExp(m.pattern, 'i') }));
  for (const text of [event.title, event.summary]) {
    const m = motifs.find((x) => x.re.test(String(text ?? '')));
    if (m) return { hero: illustration(m, event.slug, library), via: `motif:${m.id}` };
  }
  const fallback = library.motifs.find((m) => m.id === library.categoryDefaults[event.category])
    ?? library.motifs.find((m) => m.id === 'festival');
  return { hero: illustration(fallback, event.slug, library), via: `category:${event.category}` };
}
