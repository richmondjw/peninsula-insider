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
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-event-safeguards.mjs', import.meta.url));

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
