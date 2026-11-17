import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const venue = JSON.parse(read('content/venues/cape-retreat.json'));
test('Cape Retreat clearly restricts booking to groups without coupling eligibility', () => {
 assert.match(venue.signature, /Group bookings only/);
 assert.match(venue.editorNote, /Rooms and suites cannot be booked individually/);
 assert.match(venue.ifOnlyOneThing, /individual rooms and suites are not available/);
 assert.deepEqual(venue.tags.audience, ['group']);
});
test('Cape-specific guide sections preserve group-only booking', () => {
 const blocks = [
  read('pages/stay/villas.astro').match(/\{ slug: 'cape-retreat'[^\n]+/)[0],
  read('pages/stay/coastal-stays.astro').match(/slug: 'cape-retreat',[\s\S]*?\}/)[0],
  read('pages/stay/resorts.astro').match(/<h3>The Cape Retreat<\/h3>[\s\S]*?<div class="resorts-section__actions">/)[0],
  read('pages/stay/resorts.astro').match(/\{ q: 'Does The Cape Retreat[^\n]+/)[0],
  read('pages/stay/index.astro').match(/'cape-retreat':[^\n]+/)[0],
 ];
 for (const block of blocks) {
  assert.match(block, /[Gg]roup[- ]booking(?:s)?(?:[- ]only| only)/);
  assert.doesNotMatch(block, /whether individual stays are available|dates allow an individual suite|whether your dates require a group booking/);
 }
});
