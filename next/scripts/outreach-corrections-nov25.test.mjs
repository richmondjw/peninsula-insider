
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = (name) => JSON.parse(readFileSync(new URL('../src/content/' + name + '.json', import.meta.url), 'utf8'));

test('Moonah has one date-specific Brad Kennedy listing without a duplicate recurring result', () => {
  const old = fixture('events/acoustic-saturdays-peppers-moonah-links-2026');
  const brad = fixture('events/brad-kennedy-live-at-peppers-moonah-links-resort-2026-11-28');
  const sam = fixture('events/sam-o-connell-live-at-peppers-moonah-links-resort-2026-11-21');
  assert.equal(old.status, 'archived');
  assert.equal(old.nextOccurrence, undefined);
  assert.doesNotMatch(old.editorVerdict, /Sam|this Saturday/i);
  assert.equal(sam.startDate, '2026-11-21');
  assert.equal(sam.status, 'archived');
  assert.deepEqual([brad.startDate, brad.startTime, brad.endTime, brad.place, brad.bookingRequired], ['2026-11-28', '17:00', '20:00', 'fingal', 'No']);
  assert.equal(brad.verification, "verified", "required by the confirmed weekend selector");
  assert.equal(brad.lastCheckedDate, "2026-11-25");
  assert.equal(brad.primarySourceUrl, brad.officialEventUrl);
  assert.equal(brad.bookingUrl, undefined);
  assert.match(brad.officialEventUrl, /moonahlinks\.com\.au\/cms\/whats-on/);
});

test('Barmah public venue copy distinguishes tasting hours from lunch booking and removes unsupported claims', () => {
  const vineyard = fixture('venues/barmah-park-vineyard');
  const restaurant = fixture('venues/barmah-park');
  assert.match(vineyard.editorNote, /15.30 minutes/);
  assert.match(restaurant.editorNote, /30 minutes/);
  assert.match(vineyard.editorNote, /11am to 5pm, Wednesday to Sunday/);
  assert.doesNotMatch(JSON.stringify(vineyard), /canap|hatted|communal tasting table|Italian.variety/i);
  assert.match(vineyard.bookingUrl, /barmahparkwines\.com\.au\/experiences/);
});
