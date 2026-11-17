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
test('linked guides cannot imply individual-suite availability', () => {
 for (const path of ['villas', 'resorts', 'coastal-stays']) {
  const page=read(`pages/stay/${path}.astro`);
  assert.match(page, /[Gg]roup[- ]booking(?:s)?(?:[- ]only| only)/);
  assert.doesNotMatch(page, /whether individual stays are available|dates allow an individual suite|whether your dates require a group booking/);
 }
});
