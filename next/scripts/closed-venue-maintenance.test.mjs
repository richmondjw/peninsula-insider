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
  assert.match(eatRoute, /venue\.data\.status !== 'permanently_closed'/);
  assert.match(eatHub, /v\.data\.status !== 'permanently_closed'/);
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
