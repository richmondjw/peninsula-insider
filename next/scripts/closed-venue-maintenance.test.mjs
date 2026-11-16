import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => new URL(path, import.meta.url);

async function text(path) {
  return readFile(source(path), 'utf8');
}

/** The two spellings the corpus uses to record a permanent closure. */
const isClosed = (venue) =>
  venue.status === 'permanently_closed' || venue.operatingStatus === 'permanently-closed';

/** Every venue record, parsed, with its filename. */
async function venueRecords() {
  const dir = source('../src/content/venues/');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.json'));
  return Promise.all(
    files.map(async (name) => ({
      name,
      data: JSON.parse(await readFile(new URL(name, dir), 'utf8')),
    })),
  );
}

test('Ouest France Bistro is permanently closed and excluded from public routes', async () => {
  const venue = JSON.parse(await text('../src/content/venues/ouest-france-bistro.json'));
  const eatRoute = await text('../src/pages/eat/[slug].astro');
  const eatHub = await text('../src/pages/eat/index.astro');

  assert.equal(venue.status, 'permanently_closed');
  assert.equal(venue.sitemapExclude, true);
  assert.equal(venue.bookingUrl, undefined);
  // The route's getStaticPaths keeps its own literal check: which detail
  // pages build is a separate decision from which listings show a venue.
  assert.match(eatRoute, /venue\.data\.status !== 'permanently_closed'/);
  assert.match(eatHub, /isListableVenue/);
});

test('permanent closure is read from both fields that record it', async () => {
  // The defect: la-baracca-tgallant carried its closure on `operatingStatus`
  // and had no `status` at all, so `status` defaulted to active. A predicate
  // reading only `status` published it as a live restaurant, with a booking
  // link, for four months after an editor confirmed it had shut.
  //
  // This used to assert that that one venue's two fields still held those
  // exact values, which made the test a snapshot of the corpus rather than of
  // the rule. When PI-007 A6 correctly lifted the closure - La Baracca is
  // trading - the assertion failed although nothing it was protecting had
  // changed. A venue reopening is not a regression.
  //
  // The rule is asserted instead, and it holds whether the number of closed
  // venues is one, none, or twenty.
  const editorial = await text('../src/lib/editorial.ts');
  assert.match(editorial, /status === 'permanently_closed'/);
  assert.match(editorial, /operatingStatus === 'permanently-closed'/);

  // The detail template keeps the page and marks it closed, rather than
  // dropping the URL.
  const template = await text('../src/components/VenueDetailTemplate.astro');
  assert.match(template, /isPermanentlyClosed\(data\)/);

  // And the corpus half of the same rule: whichever field records it, a closed
  // venue may not still be offering a booking. This is what actually reached
  // readers, and it is checked across every venue rather than one named one.
  const stillBookable = (await venueRecords())
    .filter(({ data }) => isClosed(data) && data.bookingUrl)
    .map(({ name }) => name);
  assert.deepEqual(
    stillBookable,
    [],
    `Permanently closed venues still carrying a bookingUrl: ${stillBookable.join(', ')}`,
  );
});

test('published Insider Picks do not recommend Ouest France Bistro', async () => {
  const picks = await Promise.all([
    text('../src/content/articles/insider-picks-2026-08-09.md'),
    text('../src/content/articles/insider-picks-2026-09-13.md'),
  ]);

  for (const pick of picks) {
    assert.doesNotMatch(pick, /Ouest France Bistro/i);
  }
});

test('active venue records do not link to Ouest France Bistro', async () => {
  const venue = JSON.parse(await text('../src/content/venues/peninsula-fresh-organics.json'));

  assert.doesNotMatch(JSON.stringify(venue.pairWith ?? []), /Ouest France Bistro/i);
});

test('closed venue pages suppress booking and contact actions', async () => {
  const template = await text('../src/components/VenueDetailTemplate.astro');

  assert.match(template, /\(data\.bookingUrl \|\| data\.phone\) && !isClosed/);
});
