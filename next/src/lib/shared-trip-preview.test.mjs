import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSharedTrip, sharedTripGroups } from './shared-trip-preview.ts';
const kinds = ['venue', 'experience'];
test('preserves two ordered day titles and groups orphan stops without dropping them', () => {
  const trip = parseSharedTrip('?i=venue:a:d1|experience:b:d2|venue:c:unknown&d=d1:Sorrento%2520Saturday|d2:Sunday', kinds);
  assert.deepEqual(sharedTripGroups(trip).map(g => [g.label, g.items.map(i => i.slug)]), [['Sorrento Saturday', ['a']], ['Sunday', ['b']], ['Unscheduled', ['c']]]);
});
test('rejects malformed kinds/slugs and bounds long labels and payloads', () => {
  assert.equal(parseSharedTrip('?i=invalid:a|venue:../../private|venue:a:d:extra', kinds), null);
  assert.equal(parseSharedTrip('?i=' + 'a'.repeat(16001), kinds), null);
  const trip = parseSharedTrip('?i=venue:a:d&d=d:' + 'x'.repeat(200) + '|d:duplicate', kinds);
  assert.equal(trip.days[0].label.length, 120);
  assert.equal(trip.days.length, 1);
});
