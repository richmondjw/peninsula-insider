/**
 * event-occurrence tests (PI-008). Run from repo root or next/:
 *
 *   node --test next/src/lib/event-occurrence.test.mjs
 *
 * WHAT THIS GUARDS. Every case the ticket's acceptance criteria name has a
 * fixture record in scripts/fixtures/event-occurrence/, and every fixture is
 * asserted here against a PINNED instant. Nothing below reads the wall clock,
 * so no test in this file can start failing because a date went past: the same
 * discipline scripts/audit-event-safeguards.mjs was written to enforce.
 *
 * The fixtures are real records, readable on their own, and the audit test
 * (scripts/audit-event-safeguards.test.mjs) runs the safeguard gate over the
 * same directory. One corpus, two consumers, so a fixture cannot drift away
 * from the thing it is supposed to describe.
 *
 * The hard case, and the reason the model exists at all: a Sunday reader is
 * allowed to look back over the whole weekend, and Friday's occurrence must
 * say it has ended rather than quietly keep offering a booking link. Day
 * granularity could not express that. See "this weekend" below.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  bookingAvailability,
  dayIsoOf,
  isCancelledRecord,
  isoOffsetFor,
  occurrenceBounds,
  occurrenceExceptionQueue,
  occurrenceModelEnabled,
  recordDisposition,
  resolveOccurrence,
  schemaEventStatus,
  wallClockToInstant,
} from './event-occurrence.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '..', '..', 'scripts', 'fixtures', 'event-occurrence');

const load = (name) => JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8'));
const at = (iso) => new Date(iso);
const minutes = (a, b) => Math.round((b.getTime() - a.getTime()) / 60000);
const kinds = (data) => occurrenceExceptionQueue(data).map((q) => q.kind);

// ───────────────────────────────────────────────────────────────────────────
// The fixture corpus itself
// ───────────────────────────────────────────────────────────────────────────

test('every fixture carries the fields the events schema requires', () => {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 11, `expected the full acceptance corpus, found ${files.length}`);
  for (const file of files) {
    const data = JSON.parse(readFileSync(path.join(FIXTURES, file), 'utf8'));
    for (const required of ['slug', 'title', 'summary', 'category', 'startDate', 'publishedAt']) {
      assert.ok(data[required], `${file} is missing the required field ${required}`);
    }
    assert.equal(data.slug, file.replace(/\.json$/, ''), `${file} slug must match its filename`);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 1 + 2. Melbourne daylight saving, in both directions
// ───────────────────────────────────────────────────────────────────────────

test('spring forward: 01:30 to 03:30 is ONE hour, not two', () => {
  // On the first Sunday in October the Melbourne clock jumps 02:00 to 03:00.
  // Arithmetic on wall clocks, and the hardcoded +10:00 the JSON-LD used to
  // stamp, both report two hours for a session that ran for one.
  const data = load('dst-spring-forward-dark-sky-vigil');
  const b = occurrenceBounds(data, '2026-10-04');
  assert.equal(minutes(b.startsAt, b.endsAt), 60);
  assert.equal(b.startsAt.toISOString(), '2026-10-03T15:30:00.000Z');
  assert.equal(b.endsAt.toISOString(), '2026-10-03T16:30:00.000Z');
  // The two ends of one session sit in different offsets. A single stamped
  // offset cannot describe this event correctly at all.
  assert.equal(isoOffsetFor(b.startsAt), '+10:00');
  assert.equal(isoOffsetFor(b.endsAt), '+11:00');
});

test('spring forward: a wall clock inside the missing hour lands after the gap', () => {
  // 02:30 on 4 October 2026 does not exist in Melbourne. Resolving it an hour
  // EARLIER than the record says would start an event before it was scheduled;
  // resolving it forward is the only reading that cannot mislead.
  assert.equal(wallClockToInstant(2026, 10, 4, 2, 30).toISOString(), '2026-10-03T16:30:00.000Z');
  assert.equal(isoOffsetFor(wallClockToInstant(2026, 10, 4, 2, 30)), '+11:00');
});

test('autumn back: the same 01:30 to 03:30 session is THREE hours', () => {
  // On the first Sunday in April the clock repeats 02:00 to 03:00.
  const data = load('dst-autumn-back-dark-sky-vigil');
  const b = occurrenceBounds(data, '2026-04-05');
  assert.equal(minutes(b.startsAt, b.endsAt), 180);
  assert.equal(b.startsAt.toISOString(), '2026-04-04T14:30:00.000Z');
  assert.equal(b.endsAt.toISOString(), '2026-04-04T17:30:00.000Z');
  assert.equal(isoOffsetFor(b.startsAt), '+11:00');
  assert.equal(isoOffsetFor(b.endsAt), '+10:00');
});

test('autumn back: an ambiguous wall clock resolves to the first of the two readings', () => {
  // 02:30 happens twice on 5 April 2026. A reader who saw 02:30 on a clock saw
  // the first one, so that is the instant the record names.
  assert.equal(wallClockToInstant(2026, 4, 5, 2, 30).toISOString(), '2026-04-04T15:30:00.000Z');
});

test('the naive plus-ten-hours reading gets both transition days wrong', () => {
  // The comparison the site shipped with, spelled out. If someone replaces the
  // Intl resolution with arithmetic again, these are the cases that catch it.
  const naive = (dayIso, clock) => new Date(`${dayIso}T${clock}:00+10:00`);
  const spring = occurrenceBounds(load('dst-spring-forward-dark-sky-vigil'), '2026-10-04');
  assert.notEqual(spring.endsAt.getTime(), naive('2026-10-04', '03:30').getTime());
  const autumn = occurrenceBounds(load('dst-autumn-back-dark-sky-vigil'), '2026-04-05');
  assert.notEqual(autumn.startsAt.getTime(), naive('2026-04-05', '01:30').getTime());
});

// ───────────────────────────────────────────────────────────────────────────
// 3. Cross-midnight
// ───────────────────────────────────────────────────────────────────────────

test('cross-midnight: an end time before the start time finishes on the next day', () => {
  const data = load('cross-midnight-long-table-supper');
  const b = occurrenceBounds(data, '2026-07-11');
  assert.equal(b.crossesMidnight, true);
  assert.equal(minutes(b.startsAt, b.endsAt), 240);
  assert.equal(dayIsoOf(b.startsAt), '2026-07-11');
  assert.equal(dayIsoOf(b.endsAt), '2026-07-12');
});

test('cross-midnight: still running at half past eleven, past by two in the morning', () => {
  const data = load('cross-midnight-long-table-supper');
  const late = resolveOccurrence(data, '2026-07-11', at('2026-07-11T13:30:00Z')); // 23:30 Melbourne
  assert.equal(late.phase, 'running');
  assert.equal(late.bookable, true);

  const afterMidnight = resolveOccurrence(data, '2026-07-11', at('2026-07-11T14:30:00Z')); // 00:30
  assert.equal(afterMidnight.phase, 'running');

  const closed = resolveOccurrence(data, '2026-07-11', at('2026-07-11T16:00:00Z')); // 02:00
  assert.equal(closed.phase, 'past');
  assert.equal(closed.bookable, false);
  assert.equal(closed.label, 'Ended');
});

test('cross-midnight: the occurrence is listed under the day it starts', () => {
  // Not under the day it ends. A supper club that runs to 1am is a Saturday
  // night out, not a Sunday morning one.
  const data = load('cross-midnight-long-table-supper');
  const occ = resolveOccurrence(data, '2026-07-11', at('2026-07-11T09:00:00Z'));
  assert.equal(occ.dayIso, '2026-07-11');
  assert.equal(occ.phase, 'upcoming');
});

// ───────────────────────────────────────────────────────────────────────────
// 4. Cancellation
// ───────────────────────────────────────────────────────────────────────────

test('cancellation: withdrawn and unbookable, and the structured data says so forever', () => {
  const data = load('cancelled-winter-solstice-market');
  const before = at('2026-06-10T00:00:00Z');
  const d = recordDisposition(data, before);
  assert.equal(d.status, 'cancelled');
  assert.equal(d.promotable, false);
  assert.equal(isCancelledRecord(data), true);

  const occ = resolveOccurrence(data, '2026-06-20', before);
  assert.equal(occ.bookable, false);
  assert.equal(occ.label, 'Cancelled');

  // EventCancelled survives the date passing: that it did not happen is still
  // the answer a reader arriving from an old link needs.
  assert.equal(schemaEventStatus('cancelled', { past: false }), 'https://schema.org/EventCancelled');
  assert.equal(schemaEventStatus('cancelled', { past: true }), 'https://schema.org/EventCancelled');
  // A plain finished event emits no status at all, which is what keeps
  // lint-seo-architecture.mjs's stale-event-scheduled assertion green.
  assert.equal(schemaEventStatus('scheduled', { past: true }), null);
});

test('cancellation and postponement are different answers, not one flag', () => {
  const cancelled = load('cancelled-winter-solstice-market');
  const postponed = load('postponed-coastal-arts-weekend');
  assert.equal(isCancelledRecord(cancelled), true);
  assert.equal(isCancelledRecord(postponed), false);
  assert.equal(recordDisposition(cancelled, at('2026-06-01T00:00:00Z')).status, 'cancelled');
  assert.equal(recordDisposition(postponed, at('2026-10-01T00:00:00Z')).status, 'postponed');
});

// ───────────────────────────────────────────────────────────────────────────
// 5 + 6. Postponement, with and without a new date
// ───────────────────────────────────────────────────────────────────────────

test('postponed with no new date: nothing to list it under, and a human is asked', () => {
  const data = load('postponed-coastal-arts-weekend');
  const d = recordDisposition(data, at('2026-10-01T00:00:00Z'));
  assert.equal(d.status, 'postponed');
  // The record is NOT cancelled and NOT expired. It simply has no date, so it
  // cannot appear on a dated surface. Advertising it under 14 November would
  // send readers to a studio trail that is not running.
  assert.equal(d.listable, false);
  assert.equal(d.promotable, false);
  assert.equal(d.label, 'Postponed');
  assert.equal(schemaEventStatus(d.status), 'https://schema.org/EventPostponed');
  assert.ok(kinds(data).includes('postponed-without-new-date'));
});

test('postponed WITH a new date is rescheduled: listable, and no question for anyone', () => {
  const data = load('rescheduled-pier-to-pub-swim');
  const d = recordDisposition(data, at('2026-11-01T00:00:00Z'));
  assert.equal(d.status, 'rescheduled');
  assert.equal(d.listable, true);
  assert.equal(d.rescheduledTo, '2026-11-21');
  assert.equal(schemaEventStatus(d.status), 'https://schema.org/EventRescheduled');
  // Nothing queued: the record answers its own question.
  assert.deepEqual(kinds(data), []);
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Sold out
// ───────────────────────────────────────────────────────────────────────────

test('sold out: the event is still on, the booking is not', () => {
  const data = load('sold-out-cellar-door-long-lunch');
  const before = at('2026-10-01T00:00:00Z');
  const d = recordDisposition(data, before);

  // The distinction the schema could not previously express. Before this
  // field the only way to say "you cannot get in" was to cancel the record,
  // which told readers something untrue about an event that went ahead.
  assert.equal(d.status, 'scheduled');
  assert.equal(isCancelledRecord(data), false);
  assert.equal(d.listable, true);
  assert.equal(d.promotable, false);

  const occ = resolveOccurrence(data, '2026-10-17', before);
  assert.equal(occ.phase, 'upcoming');
  assert.equal(occ.soldOut, true);
  assert.equal(occ.bookable, false);
  assert.equal(occ.label, 'Sold out');

  assert.equal(bookingAvailability('sold-out'), 'https://schema.org/SoldOut');
  assert.equal(bookingAvailability('waitlist'), 'https://schema.org/LimitedAvailability');
  assert.equal(bookingAvailability('open'), 'https://schema.org/InStock');
  assert.equal(bookingAvailability('unknown'), null);
});

// ───────────────────────────────────────────────────────────────────────────
// 8. A late source update
// ───────────────────────────────────────────────────────────────────────────

test('late source update: unchecked is not the same as wrong', () => {
  const data = load('late-source-update-bay-fireworks');
  const d = recordDisposition(data, at('2026-09-11T00:00:00Z'));

  // The organiser changed the page nine days after we signed the record off.
  // We do not know it is wrong, so it keeps its listing; we do know it is
  // unchecked, so it loses its promotion and a human is asked to look.
  assert.equal(d.unverified, true);
  assert.equal(d.listable, true);
  assert.equal(d.promotable, false);
  assert.ok(kinds(data).includes('source-newer-than-verification'));
});

test('late source update is decided by two stored fields, never by the clock', () => {
  // Move "now" four years and the answer does not budge. This is the property
  // that lets the safeguard gate assert on it without wiring the calendar into
  // npm run build.
  const data = load('late-source-update-bay-fireworks');
  for (const now of ['2026-09-11T00:00:00Z', '2027-01-01T00:00:00Z', '2030-06-01T00:00:00Z']) {
    assert.equal(recordDisposition(data, at(now)).unverified, true, `changed at ${now}`);
  }
  const reverified = { ...data, lastVerifiedAt: '2026-09-11T09:00:00+10:00' };
  assert.equal(recordDisposition(reverified, at('2026-09-11T00:00:00Z')).unverified, false);
  assert.deepEqual(kinds(reverified), []);
});

// ───────────────────────────────────────────────────────────────────────────
// 9. A recurring exception
// ───────────────────────────────────────────────────────────────────────────

test('recurring exception: one week is cancelled and the series is not', () => {
  const data = load('recurring-exception-thursday-street-market');
  const now = at('2026-09-14T00:00:00Z');

  // The whole point. Before occurrence-level exceptions, the only way to take
  // one Thursday off the site was to cancel the market, which took every other
  // Thursday with it.
  assert.equal(isCancelledRecord(data), false);
  assert.equal(recordDisposition(data, now).status, 'scheduled');

  const skipped = resolveOccurrence(data, '2026-09-17', now);
  assert.equal(skipped.status, 'cancelled');
  assert.equal(skipped.bookable, false);
  assert.equal(skipped.label, 'Cancelled this time');
  assert.match(skipped.note, /resurfaced/);

  const normal = resolveOccurrence(data, '2026-09-24', now);
  assert.equal(normal.status, 'scheduled');
  assert.equal(normal.bookable, true);
  assert.equal(normal.label, null);
});

test('recurring exception: a moved occurrence still runs, and says where', () => {
  const data = load('recurring-exception-thursday-street-market');
  const moved = resolveOccurrence(data, '2026-10-01', at('2026-09-14T00:00:00Z'));
  assert.equal(moved.status, 'scheduled');
  assert.equal(moved.bookable, true);
  assert.equal(moved.label, 'Moved to Hastings Foreshore Reserve');
});

test('recurring exception: one sold-out occurrence does not close the series', () => {
  const data = load('recurring-exception-thursday-street-market');
  const now = at('2026-09-14T00:00:00Z');
  const soldOut = resolveOccurrence(data, '2026-10-08', now);
  assert.equal(soldOut.soldOut, true);
  assert.equal(soldOut.bookable, false);
  assert.equal(soldOut.label, 'Sold out');
  // The following Thursday is unaffected.
  assert.equal(resolveOccurrence(data, '2026-10-15', now).bookable, true);
});

// ───────────────────────────────────────────────────────────────────────────
// 10. Expiry, independent of the occurrence
// ───────────────────────────────────────────────────────────────────────────

test('expiry: a listing can die a month before the event it describes', () => {
  const data = load('expiring-summer-programme-listing');

  // The two instants are deliberately far apart: the programme runs through
  // December, the source only confirms it to the end of October. Collapsing
  // expiry into "has the last date passed" cannot express this at all.
  const live = recordDisposition(data, at('2026-10-30T00:00:00Z'));
  assert.equal(live.expired, false);
  assert.equal(live.listable, true);

  const dead = recordDisposition(data, at('2026-11-02T00:00:00Z'));
  assert.equal(dead.expired, true);
  assert.equal(dead.listable, false);
  assert.equal(dead.promotable, false);
  // Still not cancelled, still not postponed. Expiry is its own axis.
  assert.equal(dead.status, 'scheduled');
  assert.equal(isCancelledRecord(data), false);
});

test('expiry is an exact instant, on Melbourne time', () => {
  const data = load('expiring-summer-programme-listing');
  // 2026-10-31T13:00Z is midnight on 1 November in Melbourne (AEDT, +11).
  assert.equal(recordDisposition(data, at('2026-10-31T12:59:00Z')).expired, false);
  assert.equal(recordDisposition(data, at('2026-10-31T13:00:00Z')).expired, true);
});

// ───────────────────────────────────────────────────────────────────────────
// 11. "This weekend" cannot silently show an expired occurrence
// ───────────────────────────────────────────────────────────────────────────

test('this weekend: Friday night is bookable on Friday evening', () => {
  const data = load('weekend-friday-night-supper-club');
  // 19:00 Melbourne on Friday 18 September, an hour into the seating.
  const occ = resolveOccurrence(data, '2026-09-18', at('2026-09-18T09:00:00Z'));
  assert.equal(occ.phase, 'running');
  assert.equal(occ.bookable, true);
  assert.equal(occ.label, null);
});

test('this weekend: the SAME occurrence is over for a Sunday reader', () => {
  const data = load('weekend-friday-night-supper-club');
  // 10:00 Melbourne on Sunday 20 September. The hub's selection window is
  // Friday to Sunday, so the reader may still SEE Friday. They must not be
  // offered a booking for it, and the row has to say why it is there.
  const sunday = at('2026-09-20T00:00:00Z');
  const occ = resolveOccurrence(data, '2026-09-18', sunday);
  assert.equal(occ.phase, 'past');
  assert.equal(occ.bookable, false);
  assert.equal(occ.label, 'Ended');
  // The record itself has not expired and is not cancelled. It is the
  // OCCURRENCE that is over, which is exactly the distinction day-granular
  // filtering could not make.
  const d = recordDisposition(data, sunday);
  assert.equal(d.expired, false);
  assert.equal(d.status, 'scheduled');
});

test('this weekend: the boundary is the end time, not the end of the day', () => {
  const data = load('weekend-friday-night-supper-club');
  // 21:59 Melbourne, one minute before the seating closes, then 22:01.
  assert.equal(resolveOccurrence(data, '2026-09-18', at('2026-09-18T11:59:00Z')).bookable, true);
  assert.equal(resolveOccurrence(data, '2026-09-18', at('2026-09-18T12:01:00Z')).bookable, false);
});

test('an occurrence with no end time keeps the previous end-of-day reading', () => {
  // Deliberate. Where the record states no end time the model does NOT invent
  // a duration to cut the listing short; it keeps the behaviour every surface
  // already had and reports the record as unbounded so the corpus can be
  // improved one verified end time at a time. audit-event-safeguards.mjs
  // ratchets that count downward.
  const data = { startTime: '10:00' };
  const b = occurrenceBounds(data, '2026-07-11');
  assert.equal(b.bounded, false);
  assert.equal(dayIsoOf(b.endsAt), '2026-07-11');
  assert.equal(resolveOccurrence(data, '2026-07-11', at('2026-07-11T08:00:00Z')).phase, 'running');
  assert.equal(resolveOccurrence(data, '2026-07-11', at('2026-07-11T14:30:00Z')).phase, 'past');
});

test('a multi-day run is not over until its last day is', () => {
  // Caught by comparing two real builds of the site: a range row is pushed once,
  // on its first active day, with a "runs to" label. Measuring its phase over
  // that opening day alone marked every festival and exhibition still running
  // as "Ended" from midnight on the day it opened.
  const festival = {
    startDate: '2026-10-16',
    endDate: '2026-10-18',
    startTime: '11:00',
    endTime: '17:00',
  };
  const span = { endDayIso: '2026-10-18' };
  // Saturday lunchtime, one day into a three-day run.
  const midRun = resolveOccurrence(festival, '2026-10-16', at('2026-10-17T01:00:00Z'), span);
  assert.equal(midRun.phase, 'running');
  assert.equal(midRun.bookable, true);
  assert.equal(midRun.label, null);
  // Without the span it reads as finished, which is the defect.
  assert.equal(resolveOccurrence(festival, '2026-10-16', at('2026-10-17T01:00:00Z')).phase, 'past');
  // And it really does end when the last day's end time passes.
  assert.equal(resolveOccurrence(festival, '2026-10-16', at('2026-10-18T05:59:00Z'), span).phase, 'running');
  assert.equal(resolveOccurrence(festival, '2026-10-16', at('2026-10-18T06:01:00Z'), span).phase, 'past');
});

test('an ambiguous midnight crossing is queued, not guessed', () => {
  const ambiguous = { startDate: '2026-07-11', startTime: '14:00', endTime: '11:00' };
  assert.ok(kinds(ambiguous).includes('ambiguous-midnight-crossing'));
  // Saying which it is settles the question and clears the queue entry.
  assert.deepEqual(kinds({ ...ambiguous, endsNextDay: true }), []);
  assert.equal(occurrenceBounds({ ...ambiguous, endsNextDay: false }, '2026-07-11').crossesMidnight, false);
});

// ───────────────────────────────────────────────────────────────────────────
// The flag and its interlock
// ───────────────────────────────────────────────────────────────────────────

test('the flag: off is the rollback, on is the override, unset is the interlock', () => {
  const healthy = { ok: true, generatedAt: '2026-09-13T00:00:00Z' };
  const now = at('2026-09-13T06:00:00Z');

  assert.equal(occurrenceModelEnabled({ flag: 'off', health: healthy, now }).enabled, false);
  assert.equal(occurrenceModelEnabled({ flag: 'on', health: null, now }).enabled, true);
  assert.equal(occurrenceModelEnabled({ flag: undefined, health: healthy, now }).enabled, true);
});

test('the flag: the previous renderer comes back on its own when the expiry job fails', () => {
  const now = at('2026-09-13T06:00:00Z');
  const cases = [
    [null, 'expiry-state-missing'],
    [{ ok: false, generatedAt: '2026-09-13T00:00:00Z' }, 'expiry-job-failed'],
    [{ ok: true }, 'expiry-state-undated'],
    [{ ok: true, generatedAt: '2026-09-01T00:00:00Z' }, 'expiry-state-stale-294h'],
  ];
  for (const [health, reason] of cases) {
    const verdict = occurrenceModelEnabled({ flag: undefined, health, now });
    assert.equal(verdict.enabled, false, `expected fallback for ${reason}`);
    assert.equal(verdict.reason, reason);
  }
  // Seven days of silence is the threshold; six is still trusted.
  const sixDays = { ok: true, generatedAt: '2026-09-07T07:00:00Z' };
  assert.equal(occurrenceModelEnabled({ flag: undefined, health: sixDays, now }).enabled, true);
});

// ───────────────────────────────────────────────────────────────────────────
// House rules the model itself has to keep
// ───────────────────────────────────────────────────────────────────────────

test('the module derives no season and stamps no fixed offset', () => {
  const source = readFileSync(path.join(HERE, 'event-occurrence.mjs'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  // src/lib/season.ts is the single source of truth for a season, and
  // season.test.mjs fails if anyone derives one from getMonth() again.
  assert.ok(!/getMonth\s*\(/.test(code), 'no raw getMonth() in the occurrence model');
  // The hardcoded +10:00 is the bug this module was written to remove.
  assert.ok(!/\+10:00/.test(code), 'no hardcoded Melbourne offset in the occurrence model');
});

test('the exception queue never consults the clock', () => {
  // occurrenceExceptionQueue takes no `now` at all, by design: a gate that can
  // fail on a day with no content change is a gate people learn to ignore.
  assert.equal(occurrenceExceptionQueue.length, 1);
  const data = load('postponed-coastal-arts-weekend');
  assert.deepEqual(kinds(data), occurrenceExceptionQueue(data).map((q) => q.kind));
});
