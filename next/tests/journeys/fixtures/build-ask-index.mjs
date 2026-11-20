#!/usr/bin/env node
/**
 * Writes tests/journeys/fixtures/ask-index.json, the small Ask PI index the
 * journey harness serves at /ask/index.json. Fixed content, so the browser
 * tests do not change when the guides do. Re-run after changing tokens() in
 * src/lib/ask-guide.mjs:
 *
 *   node tests/journeys/fixtures/build-ask-index.mjs
 */
import { writeFileSync } from 'node:fs';
import { tokens } from '../../../src/lib/ask-guide.mjs';

const kw = (...parts) => [...new Set(tokens(parts.filter(Boolean).join(' ')))].join(' ');
const page = (u, k, t, ty, p, pn, s, best, im) => ({
  u, k, t, s, ...(ty ? { ty } : {}), ...(p ? { p, pn } : {}), ...(best ? { f: [['Best for', best]] } : {}), ...(im ? { im } : {}), h: 'fixture00000', kw: kw(t, ty, pn, s, best),
});
// A picture that exists in every build, standing in for a page's own photograph.
const PICTURE = { s: '/images/pi/pi-portrait-320.webp', c: 'Fixture credit' };

const records = [
  page('/eat/tedesca-osteria/', 'eat', 'Tedesca Osteria', 'Restaurant', 'red-hill', 'Red Hill', 'A single-set-menu osteria inside a restored Red Hill farmhouse.', 'Long lunches · Couples'),
  page('/eat/red-gum-bbq/', 'eat', 'Red Gum BBQ', 'Restaurant', 'red-hill', 'Red Hill', 'Low-and-slow barbecue at picnic tables in an airy warehouse.', 'Family outings · Big groups'),
  page('/eat/flinders-general-store/', 'eat', 'Flinders General Store', 'Café', 'flinders', 'Flinders', 'The village general store on the main street of Flinders.', 'Morning stop · Brunch'),
  page('/stay/lindenderry/', 'stay', 'Lindenderry at Red Hill', 'Hotel', 'red-hill', 'Red Hill', 'A country-house hotel among the vines at Red Hill.', 'Couples', PICTURE),
  page('/explore/coppins-track/', 'do', 'Coppins Track', 'Walk', 'sorrento', 'Sorrento', 'Coppins Track runs from Sorrento Ocean Beach to Diamond Bay.', null),
  // Enough of Sorrento for PI to put half a day in order and swap a stop. The
  // summaries are fixture text, not a description of the real places.
  page('/eat/bistro-elba/', 'eat', 'Bistro Elba', 'Restaurant', 'sorrento', 'Sorrento', 'Fixture summary for a restaurant page.', 'Couples'),
  page('/eat/the-baths-sorrento/', 'eat', 'The Baths Sorrento', 'Restaurant', 'sorrento', 'Sorrento', 'Fixture summary for a second restaurant page.', null),
  // A second town a plan can be built in, for "Somewhere else".
  page('/explore/red-hill-truffles/', 'do', 'Red Hill Truffles', 'Attraction', 'red-hill', 'Red Hill', 'Fixture summary for a things-to-do page.', null),
  page('/explore/sorrento-back-beach/', 'do', 'Sorrento Back Beach', 'Beach', 'sorrento', 'Sorrento', 'Fixture summary for a beach page.', null),
  page('/explore/places/red-hill/', 'place', 'Red Hill', null, null, null, 'The ridge at the centre of the Peninsula wine country.', null),
];

const index = {
  schemaVersion: '1.0',
  generatedAt: '2026-11-20T03:00:00.000Z',
  catalogueSnapshot: 'fixture',
  snapshotId: 'fixture',
  timezone: 'Australia/Melbourne',
  semantics: 'Journey-test fixture.',
  count: records.length,
  places: [{ slug: 'flinders', name: 'Flinders' }, { slug: 'red-hill', name: 'Red Hill' }, { slug: 'sorrento', name: 'Sorrento' }],
  topics: { dogs: { u: '/dog-friendly/', t: 'The practical guide to doing the Peninsula properly with the dog' } },
  records,
};

writeFileSync(new URL('./ask-index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n');
console.log(`ask-index.json: ${records.length} records`);
