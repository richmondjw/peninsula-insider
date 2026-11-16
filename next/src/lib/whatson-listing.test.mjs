import test from 'node:test';
import assert from 'node:assert/strict';
import { listingDateLabel, resolveListingOccurrence } from './whatson-listing.mjs';
const day = value => new Date(`${value}T00:00:00Z`);
const weekend = { start: day('2026-09-25'), end: day('2026-09-27') };
const exhibition = { kind: 'range', start: day('2026-09-05'), end: day('2026-11-22') };

test('a September selection cannot claim a November exhibition ends on the selected Sunday', () => {
  const label = listingDateLabel(exhibition, weekend);
  assert.match(label, /On during your dates/);
  assert.match(label, /runs to Sun,? 22 Nov/);
  assert.doesNotMatch(label, /27 Sept?/);
  assert.match(listingDateLabel(exhibition, { start: weekend.start, end: weekend.start }), /22 Nov/);
});

test('range status uses its real beginning and closing date even after the selected dates', () => {
  const data = { startTime: '11:00', endTime: '16:00' };
  const state = resolveListingOccurrence(data, exhibition, '2026-09-25', new Date('2026-09-28T02:00:00Z'));
  assert.equal(state.phase, 'running');
  assert.equal(state.bookable, true);
  assert.equal(state.label, null);
  assert.equal(state.startsAt.toISOString(), '2026-09-05T01:00:00.000Z');
  // Closing is after Melbourne enters daylight saving.
  assert.equal(state.endsAt.toISOString(), '2026-11-22T05:00:00.000Z');
  assert.equal(resolveListingOccurrence(data, exhibition, '2026-09-25', new Date('2026-11-22T05:01:00Z')).phase, 'past');
});

test('one-day and recurring listings are distinguished without inventing series closing dates', () => {
  assert.equal(listingDateLabel({kind:'range',start:weekend.start,end:weekend.start},weekend),'One-day event');
  assert.equal(listingDateLabel({...exhibition,kind:'weekly'},weekend),'Recurring weekly');
  assert.equal(listingDateLabel({...exhibition,kind:'monthly'},weekend),'Recurring monthly');
  const state = resolveListingOccurrence({startTime:'11:00',endTime:'16:00'}, {...exhibition,kind:'weekly'}, '2026-09-25', new Date('2026-09-28T02:00:00Z'));
  assert.equal(state.phase, 'past', 'a weekly occurrence does not stay running for the whole series');
});

test('contained runs and year boundaries retain the real closing date', () => {
  assert.match(listingDateLabel({...exhibition,start:weekend.start,end:weekend.end},weekend), /^Multi-day event/);
  assert.match(listingDateLabel({...exhibition,end:day('2027-01-03')},weekend), /2027/);
});
