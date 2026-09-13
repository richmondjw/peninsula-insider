import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => new URL(path, import.meta.url);

async function text(path) {
  return readFile(source(path), 'utf8');
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
  // la-baracca-tgallant carries the closure on `operatingStatus` and has no
  // `status` at all, so `status` defaults to active. A predicate that reads
  // only `status` published it as a live restaurant, with a booking link,
  // for four months after an editor confirmed it had shut.
  const baracca = JSON.parse(await text('../src/content/venues/la-baracca-tgallant.json'));
  assert.equal(baracca.operatingStatus, 'permanently-closed');
  assert.equal(baracca.status, undefined);

  const editorial = await text('../src/lib/editorial.ts');
  assert.match(editorial, /status === 'permanently_closed'/);
  assert.match(editorial, /operatingStatus === 'permanently-closed'/);

  // The detail template keeps the page and marks it closed, rather than
  // dropping the URL.
  const template = await text('../src/components/VenueDetailTemplate.astro');
  assert.match(template, /isPermanentlyClosed\(data\)/);
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
