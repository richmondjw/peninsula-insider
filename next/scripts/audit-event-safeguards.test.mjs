/**
 * Tests for the What's On safeguard gate.
 *
 * The gate runs inside `npm run build`, so a false failure blocks every deploy
 * and a false pass lets a defective event record reach readers. Both directions
 * are asserted here against fixture corpora rather than the live content.
 *
 * The time-travel cases are the reason this file exists. The first revision of
 * the gate asserted on metrics that climb with the calendar, so it would have
 * passed on the day it shipped and blocked the deploy pipeline four days later
 * with no content change at all.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-event-safeguards.mjs', import.meta.url));
const FIXTURES = fileURLToPath(new URL('./fixtures/event-occurrence', import.meta.url));

const BASE = {
  slug: 'a-market',
  title: 'A Market',
  summary: 'A market on the Peninsula.',
  category: 'market',
  status: 'published',
  recurrence: 'one-off',
  startDate: '2026-12-05',
  endDate: '2026-12-05',
  venueName: 'Somewhere Hall',
  lastCheckedDate: '2026-08-20',
  publishedAt: '2026-01-01',
};

/** Write an events fixture plus a zeroed baseline, and audit it. */
async function audit(records, { today = '2026-08-29', ceilings = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-safeguards-'));
  try {
    const events = join(dir, 'events');
    await mkdir(events, { recursive: true });
    for (const [name, record] of Object.entries(records)) {
      await writeFile(join(events, `${name}.json`), JSON.stringify(record, null, 2));
    }
    const baseline = join(dir, 'baseline.json');
    await writeFile(
      baseline,
      JSON.stringify({
        ceilings: {
          missingVerificationDate: 0,
          duplicateTitleGroups: 0,
          duplicateVenueDateGroups: 0,
          unresolvableRecurrence: 0,
          cancelledWithoutProvenance: 0,
          // PI-008 metrics. Zero by default so a new test has to opt out
          // deliberately rather than pass because nothing was measured.
          postponedWithoutProvenance: 0,
          occurrenceQueueEntries: 0,
          freeTextVerificationStatus: 0,
          unboundedOccurrence: 0,
          ...ceilings,
        },
      })
    );
    const args = [SCRIPT, '--assert', '--events-dir', events, '--baseline', baseline, '--today', today];
    try {
      const { stdout } = await run(process.execPath, args);
      return { code: 0, out: stdout };
    } catch (error) {
      return { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('a clean corpus passes the gate', async () => {
  const { code } = await audit({ a: BASE });
  assert.equal(code, 0);
});

test('two records with the same title are reported as duplicates', async () => {
  const { code, out } = await audit({
    a: BASE,
    b: { ...BASE, slug: 'a-market-2', title: 'A  MARKET' },
  });
  assert.equal(code, 1);
  assert.match(out, /duplicateTitleGroups: 1 > baseline 0/);
});

test('same venue and date with near-identical titles is a duplicate', async () => {
  const { code, out } = await audit({
    a: { ...BASE, title: 'Sunday Farmers Market' },
    b: { ...BASE, slug: 'b', title: 'Sunday Farmers Market Day' },
  });
  assert.equal(code, 1);
  assert.match(out, /duplicateVenueDateGroups: 1 > baseline 0/);
});

test('same venue and date with genuinely different events is not a duplicate', async () => {
  // A bathhouse runs several unrelated classes from one opening date. Flagging
  // these is how a gate teaches people to ignore it.
  const { code } = await audit({
    a: { ...BASE, title: 'Sound Healing Sessions' },
    b: { ...BASE, slug: 'b', title: 'Complimentary Morning Yoga' },
  });
  assert.equal(code, 0);
});

test('a live record with no lastCheckedDate fails the gate', async () => {
  const record = { ...BASE };
  delete record.lastCheckedDate;
  const { code, out } = await audit({ a: record });
  assert.equal(code, 1);
  assert.match(out, /missingVerificationDate: 1 > baseline 0/);
});

test('a monthly record that cannot state its cadence fails the gate', async () => {
  const { code, out } = await audit({
    a: { ...BASE, recurrence: 'monthly', recurrenceNote: 'Monthly' },
  });
  assert.equal(code, 1);
  assert.match(out, /unresolvableRecurrence: 1 > baseline 0/);
});

test('a monthly record with weekday and ordinal resolves', async () => {
  const { code } = await audit({
    a: { ...BASE, recurrence: 'monthly', recurrenceNote: 'Third Saturday of every month' },
  });
  assert.equal(code, 0);
});

test('a weekly record anchored only by its start date resolves', async () => {
  const { code } = await audit({ a: { ...BASE, recurrence: 'weekly' } });
  assert.equal(code, 0);
});

test('a cancelled record with no note and no source fails the gate', async () => {
  const { code, out } = await audit({
    a: { ...BASE, cancelled: true },
  });
  assert.equal(code, 1);
  assert.match(out, /cancelledWithoutProvenance: 1 > baseline 0/);
});

test('a cancelled record carrying its provenance passes', async () => {
  const { code } = await audit({
    a: {
      ...BASE,
      cancelled: true,
      cancellationNote: 'The organiser withdrew the event.',
      cancellationSourceUrl: 'https://example.com/notice',
    },
  });
  assert.equal(code, 0);
});

test('archived and editor-skipped records are outside the measured corpus', async () => {
  const stale = { ...BASE, lastCheckedDate: undefined };
  delete stale.lastCheckedDate;
  const { code } = await audit({
    a: BASE,
    b: { ...stale, slug: 'b', title: 'B', status: 'archived' },
    c: { ...stale, slug: 'c', title: 'C', skipThis: true },
  });
  assert.equal(code, 0);
});

test('verification age does not fail the gate, however far the clock moves', async () => {
  // The regression this file was written for. lastCheckedDate is 2026-08-20;
  // by 2030 it is years past the 90-day staleness line. That is real debt for
  // the freshness workflow to work through, but it must never block a deploy,
  // because no author action caused it and no author action inside this build
  // can clear it.
  for (const today of ['2026-09-02', '2026-12-01', '2027-08-29', '2030-01-01']) {
    const { code, out } = await audit({ a: BASE }, { today });
    assert.equal(code, 0, `gate failed at --today ${today}:\n${out}`);
  }
});

test('verification age is still reported even though it is not gated', async () => {
  const { code, out } = await audit({ a: BASE }, { today: '2027-08-29' });
  assert.equal(code, 0);
  assert.match(out, /stale \(> 90d\) \.+ 1 {3}\[report-only/);
});

// ───────────────────────────────────────────────────────────────────────────
// PI-008: the occurrence model
//
// The acceptance corpus in scripts/fixtures/event-occurrence/ is shared with
// src/lib/event-occurrence.test.mjs, which asserts what the model DOES with
// each record. These tests assert what the GATE says about the same records,
// so a fixture cannot drift away from the safeguard that is supposed to cover
// it. Every case below is decided by stored fields alone; the time-travel test
// at the end proves it.
// ───────────────────────────────────────────────────────────────────────────

/** Run the real gate over the committed acceptance fixtures. */
async function auditFixtures({ today = '2026-08-29', ceilings = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-fixtures-'));
  try {
    const baseline = join(dir, 'baseline.json');
    await writeFile(baseline, JSON.stringify({ ceilings }));
    const args = [SCRIPT, '--assert', '--events-dir', resolve(FIXTURES), '--baseline', baseline, '--today', today];
    try {
      const { stdout } = await run(process.execPath, args);
      return { code: 0, out: stdout };
    } catch (error) {
      return { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('the acceptance fixtures queue exactly the two records that need a human', async () => {
  // The corpus is designed so the gate reports the two records a machine
  // genuinely cannot decide, and nothing else. Every other fixture states its
  // own facts well enough to be resolved without asking anybody: the
  // cross-midnight record declares endsNextDay, the sold-out record cites its
  // source, the postponement with a new date needs no chasing.
  const { code, out } = await auditFixtures({ ceilings: { occurrenceQueueEntries: 2 } });
  assert.equal(code, 0, out);
  assert.doesNotMatch(out, /UNREADABLE/);
  assert.match(out, /cancelled w\/o provenance \.+ 0/);
  assert.match(out, /postponed w\/o provenance \.+ 0/);
  assert.match(out, /exception queue entries \.+ 2/);
  assert.match(out, /postponed-coastal-arts-weekend\.json \(postponed-without-new-date\)/);
  assert.match(out, /late-source-update-bay-fireworks\.json \(source-newer-than-verification\)/);

  // And the queue really is a gate: allow one and the second fails the build.
  const tightened = await auditFixtures({ ceilings: { occurrenceQueueEntries: 1 } });
  assert.equal(tightened.code, 1);
  assert.match(tightened.out, /occurrenceQueueEntries: 2 > baseline 1/);
});

test('a listing may expire long before the event it describes', async () => {
  // The case that made expiry its own field. expiresAt is NOT a contradiction
  // just because it precedes startDate; the gate must not report it as one, or
  // the only honest way to model a short-confirmed listing becomes a defect.
  const { code } = await audit({
    a: { ...BASE, startDate: '2026-12-01', endDate: '2026-12-31', expiresAt: '2026-10-31T13:00:00Z' },
  });
  assert.equal(code, 0);

  // Expiring before the record was published is the real contradiction.
  const impossible = await audit({
    a: { ...BASE, publishedAt: '2026-06-01', expiresAt: '2026-05-01T00:00:00Z' },
  });
  assert.equal(impossible.code, 1);
  assert.match(impossible.out, /expiry-before-publication/);
});

test('a postponed record with no note and no source fails the gate', async () => {
  const { code, out } = await audit({
    a: { ...BASE, postponed: true, rescheduledTo: '2027-01-09' },
  });
  assert.equal(code, 1);
  assert.match(out, /postponedWithoutProvenance: 1 > baseline 0/);
});

test('a postponed record carrying its provenance passes', async () => {
  const { code } = await audit({
    a: {
      ...BASE,
      postponed: true,
      rescheduledTo: '2027-01-09',
      postponementNote: 'Moved a month later after a permit delay.',
      postponementSourceUrl: 'https://example.com/notice',
    },
  });
  assert.equal(code, 0);
});

test('a postponement with no new date is a question for a human, not a guess', async () => {
  // The record is not cancelled and not expired. It has no date, so nothing
  // can list it and nothing may invent one for it. It goes on the queue.
  const { code, out } = await audit({
    a: {
      ...BASE,
      postponed: true,
      postponementNote: 'Postponed. No new date announced.',
      postponementSourceUrl: 'https://example.com/notice',
    },
  });
  assert.equal(code, 1);
  assert.match(out, /occurrenceQueueEntries: 1 > baseline 0/);
  assert.match(out, /postponed-without-new-date/);
});

test('sold out asserted with no evidence fails the gate', async () => {
  // Same burden as a cancellation: say who says so, or do not say it.
  const { code, out } = await audit({ a: { ...BASE, bookingStatus: 'sold-out' } });
  assert.equal(code, 1);
  assert.match(out, /booking-status-without-source/);

  const sourced = await audit({
    a: {
      ...BASE,
      bookingStatus: 'sold-out',
      bookingStatusSourceUrl: 'https://example.com/tickets',
    },
  });
  assert.equal(sourced.code, 0);
});

test('a source that changed after the last verification is queued', async () => {
  const { code, out } = await audit({
    a: {
      ...BASE,
      lastVerifiedAt: '2026-08-20T09:00:00+10:00',
      sourceUpdatedAt: '2026-08-27T14:00:00+10:00',
    },
  });
  assert.equal(code, 1);
  assert.match(out, /source-newer-than-verification/);
});

test('an ambiguous midnight crossing is queued until the record says which', async () => {
  const ambiguous = { ...BASE, startTime: '14:00', endTime: '11:00' };
  const { code, out } = await audit({ a: ambiguous }, { ceilings: { unboundedOccurrence: 1 } });
  assert.equal(code, 1);
  assert.match(out, /ambiguous-midnight-crossing/);

  const settled = await audit({ a: { ...ambiguous, endsNextDay: true } });
  assert.equal(settled.code, 0);
});

test('an occurrence exception pointing at nothing is queued', async () => {
  const { code, out } = await audit({
    a: {
      ...BASE,
      recurrence: 'weekly',
      occurrenceExceptions: [{ date: '2026-12-24', status: 'rescheduled' }],
    },
  });
  assert.equal(code, 1);
  assert.match(out, /exception-without-target/);

  const resolved = await audit({
    a: {
      ...BASE,
      recurrence: 'weekly',
      occurrenceExceptions: [
        { date: '2026-12-24', status: 'rescheduled', rescheduledTo: '2026-12-23' },
      ],
    },
  });
  assert.equal(resolved.code, 0);
});

test('free-text verificationStatus is counted, and the enum clears it', async () => {
  const prose = await audit({
    a: { ...BASE, verificationStatus: 'Verified against the organiser page on 20 August 2026' },
  });
  assert.equal(prose.code, 1);
  assert.match(prose.out, /freeTextVerificationStatus: 1 > baseline 0/);

  // The migration this ratchet is meant to drive: the prose keeps its evidence
  // in verificationNote and the machine-readable value goes in the enum.
  const migrated = await audit({
    a: {
      ...BASE,
      verification: 'verified',
      verificationStatus: 'Verified against the organiser page on 20 August 2026',
      verificationNote: 'Verified against the organiser page on 20 August 2026',
    },
  });
  assert.equal(migrated.code, 0);
});

test('a start time with no end time is reported, not silently given a duration', async () => {
  const { code, out } = await audit({ a: { ...BASE, startTime: '10:00' } });
  assert.equal(code, 1);
  assert.match(out, /unboundedOccurrence: 1 > baseline 0/);

  const bounded = await audit({ a: { ...BASE, startTime: '10:00', endTime: '14:00' } });
  assert.equal(bounded.code, 0);
});

test('none of the PI-008 metrics moves when the clock does', async () => {
  // The constraint every metric in ASSERTED_METRICS has to meet. These records
  // carry a postponement, a sold-out booking, a late source update and an
  // ambiguous end time; the verdict on all four is a property of the corpus,
  // so it must read the same in 2026 and in 2030.
  const corpus = {
    a: { ...BASE, postponed: true, postponementNote: 'No new date yet.' },
    b: { ...BASE, slug: 'b', title: 'B', bookingStatus: 'sold-out' },
    c: {
      ...BASE,
      slug: 'c',
      title: 'C',
      lastVerifiedAt: '2026-08-20T09:00:00+10:00',
      sourceUpdatedAt: '2026-08-27T14:00:00+10:00',
    },
    d: { ...BASE, slug: 'd', title: 'D', startTime: '14:00', endTime: '11:00' },
  };
  const ceilings = { occurrenceQueueEntries: 4, unboundedOccurrence: 1, duplicateVenueDateGroups: 2 };
  for (const today of ['2026-08-29', '2026-12-01', '2027-08-29', '2030-01-01']) {
    const { code, out } = await audit(corpus, { today, ceilings });
    assert.equal(code, 0, `gate failed at --today ${today}:\n${out}`);
    assert.match(out, /exception queue entries \.+ 4/, `queue depth changed at ${today}`);
  }
});

test('the gate fails closed when the baseline is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-safeguards-nobaseline-'));
  try {
    const events = join(dir, 'events');
    await mkdir(events, { recursive: true });
    await writeFile(join(events, 'a.json'), JSON.stringify(BASE));
    await assert.rejects(() =>
      run(process.execPath, [
        SCRIPT, '--assert',
        '--events-dir', events,
        '--baseline', join(dir, 'does-not-exist.json'),
      ])
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
