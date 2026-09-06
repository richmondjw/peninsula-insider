#!/usr/bin/env node
/**
 * audit-event-safeguards.mjs — the What's On safeguard gate.
 *
 * Five safeguards are meant to stand between the event corpus and a reader:
 * source last-verified expiry, duplicate records, recurring-event validity,
 * applicable dates/seasons, and cancellations. Three of them were already
 * enforced in code when this script was written (2026-08-29):
 *
 *   - recurring validity + applicable seasons : whats-on/_data.ts ruleFor()
 *     derives ONE occurrence rule per event and refuses to invent a cadence
 *     from a stale nextOccurrence.
 *   - cancellations : the `cancelled` flag plus isCancelledEvent() /
 *     loadLiveEvents() in whats-on/_data.ts withdraw a record from every
 *     "what is on" surface while keeping the URL and its EventCancelled
 *     JSON-LD alive.
 *
 * The other two had no enforcement at all. `lastCheckedDate` was a write-only
 * field — 56 live events carried it (or didn't) and nothing in the build, the
 * page render or CI ever read it, so 13 events were publishing with no
 * verification date and 31 with one over 90 days old. Nothing anywhere looked
 * for duplicate event records either. This script closes both.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/reports/events/event-safeguards-baseline.json and exits 1 on regression,
 * matching the contract audit-link-graph.mjs uses. A ratchet, not a hard
 * threshold: seeding the baseline with today's real numbers means the gate can
 * never be satisfied by making the corpus worse, but also never blocks a
 * deploy over debt it inherited. Tighten the baseline as the corpus is
 * re-verified.
 *
 * Usage:
 *   node scripts/audit-event-safeguards.mjs [--json out.json] [--assert]
 *                                           [--baseline path] [--update-baseline]
 *                                           [--today YYYY-MM-DD]
 *                                           [--events-dir path]
 *
 * --today pins "now" so the time-driven verification-age numbers can be tested
 * against a future date instead of only against the day the test happens to run.
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_EVENTS_DIR = path.join(REPO, 'next', 'src', 'content', 'events');
const DEFAULT_BASELINE = path.join(REPO, 'ops', 'reports', 'events', 'event-safeguards-baseline.json');

/** Past this age a verification date is not evidence of anything. */
const STALE_DAYS = 90;
const LIVE_STATUSES = new Set(['published', 'scheduled']);

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(getArg('--baseline', DEFAULT_BASELINE));
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');
const TODAY_OVERRIDE = getArg('--today', null);
// Fixture directory override. Only the test harness passes this; production
// callers audit the real corpus.
const EVENTS_DIR = path.resolve(getArg('--events-dir', DEFAULT_EVENTS_DIR));

/**
 * Which metrics the --assert ratchet is allowed to fail on.
 *
 * Only defects an author can introduce. `staleVerificationDate` is deliberately
 * NOT here: it counts records whose lastCheckedDate has aged past STALE_DAYS, so
 * it climbs on its own with the calendar. Asserting on it would wire the passage
 * of time into `npm run build` — this corpus would have crossed its own baseline
 * of 31 on 2026-09-02 and blocked every deploy from then on without a single
 * content change. Verification age is real debt, but it is surfaced by the daily
 * content-freshness workflow, where re-verifying the record is the fix. A deploy
 * gate is the wrong instrument for debt that accrues by doing nothing.
 */
const ASSERTED_METRICS = new Set([
  'missingVerificationDate',
  'duplicateTitleGroups',
  'duplicateVenueDateGroups',
  'unresolvableRecurrence',
  'cancelledWithoutProvenance',
]);

const normalise = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Mirrors isLiveEvent() in components/v5/home/home-data.ts, which is the
 * broadest admission test any surface applies (whats-on/_data.ts is stricter:
 * it admits `published` only). Measuring the broader set means a record that
 * reaches ANY surface is covered by this gate.
 *
 * A cancelled record is excluded for the same reason the surfaces exclude it:
 * it is deliberately withdrawn from "what is on", so it is not the corpus this
 * gate measures. Its own provenance is checked separately below.
 */
function isLive(data, file) {
  if (file.includes('archive')) return false;
  if (!LIVE_STATUSES.has(data.status ?? 'published')) return false;
  if (data.cancelled === true) return false;
  if (data.skipThis === true) return false;
  return true;
}

async function main() {
  const files = (await readdir(EVENTS_DIR, { recursive: true }))
    .filter((f) => f.endsWith('.json'));

  const live = [];
  const cancelled = [];
  for (const rel of files) {
    const abs = path.join(EVENTS_DIR, rel);
    let data;
    try {
      data = JSON.parse(await readFile(abs, 'utf8'));
    } catch (error) {
      console.error(`  UNREADABLE ${rel}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    if (data.cancelled === true) cancelled.push({ file: rel, data });
    if (isLive(data, rel)) live.push({ file: rel, data });
  }

  const today = new Date(
    TODAY_OVERRIDE ? TODAY_OVERRIDE : new Date().toISOString().slice(0, 10)
  );
  if (Number.isNaN(today.getTime())) {
    console.error(`  FAIL: --today ${TODAY_OVERRIDE} is not a valid YYYY-MM-DD date`);
    process.exit(2);
  }

  // ── 1. source last-verified expiry ────────────────────────────────────────
  const missingVerification = [];
  const staleVerification = [];
  for (const { file, data } of live) {
    const checked = parseDate(data.lastCheckedDate);
    if (!checked) {
      missingVerification.push(file);
      continue;
    }
    const ageDays = Math.round((today - checked) / 86400000);
    if (ageDays > STALE_DAYS) staleVerification.push({ file, lastCheckedDate: String(data.lastCheckedDate).slice(0, 10), ageDays });
  }
  staleVerification.sort((a, b) => b.ageDays - a.ageDays);

  // ── 2. duplicates ─────────────────────────────────────────────────────────
  // Two independent keys. Title alone misses re-imports that were retitled;
  // venue+date alone misses a series duplicated across two source feeds.
  const byTitle = new Map();
  const byVenueDate = new Map();
  const titleByFile = new Map(live.map(({ file, data }) => [file, data.title ?? '']));
  for (const { file, data } of live) {
    const title = normalise(data.title);
    if (title) {
      if (!byTitle.has(title)) byTitle.set(title, []);
      byTitle.get(title).push(file);
    }
    const venue = normalise(
      data.venueName ?? data.locationName ?? (typeof data.venue === 'object' ? data.venue?.name : data.venue)
    );
    const start = String(data.startDate ?? '').slice(0, 10);
    if (venue && start) {
      const key = `${venue}@${start}`;
      if (!byVenueDate.has(key)) byVenueDate.set(key, []);
      byVenueDate.get(key).push(file);
    }
  }
  const groupsOf = (map) =>
    [...map.entries()].filter(([, files]) => files.length > 1).map(([key, files]) => ({ key, files }));
  const duplicateTitles = groupsOf(byTitle);

  // Venue+date alone is not a duplicate signal. A gallery runs two exhibitions
  // from the same opening date and a bathhouse runs three classes from the same
  // day; the first version of this check reported all five as defects, which is
  // how a gate teaches people to ignore it. Require the titles to actually
  // resemble each other before calling it a duplicate.
  const TITLE_OVERLAP_MIN = 0.6;
  // Compare on what *distinguishes* the events. The venue is already the group
  // key and most titles repeat it, so leaving those tokens in scored "Sound
  // Healing Sessions" against "Yoga (Complimentary)" at 0.6 on the strength of
  // "peninsula hot springs" alone.
  const distinctiveTokens = (file, venueKey) => {
    const venueWords = new Set(venueKey.split(' ').filter(Boolean));
    return new Set(
      normalise(titleByFile.get(file))
        .split(' ')
        .filter((t) => t && !venueWords.has(t))
    );
  };
  const similar = (a, b, venueKey) => {
    const [x, y] = [distinctiveTokens(a, venueKey), distinctiveTokens(b, venueKey)];
    if (!x.size || !y.size) return false;
    let shared = 0;
    for (const t of x) if (y.has(t)) shared += 1;
    return shared / Math.min(x.size, y.size) >= TITLE_OVERLAP_MIN;
  };
  const duplicateVenueDates = groupsOf(byVenueDate)
    .map(({ key, files }) => {
      const venueKey = key.slice(0, key.lastIndexOf('@'));
      return {
        key,
        files: files.filter((f, i) => files.some((g, j) => i !== j && similar(f, g, venueKey))),
      };
    })
    .filter((g) => g.files.length > 1);

  // ── 3/4. recurring validity + applicable dates ────────────────────────────
  // Can the record state its own cadence? ruleFor() in whats-on/_data.ts needs
  // a weekday for a weekly series and a weekday + ordinal for a monthly one.
  // Without them it cannot derive a repeating rule and falls back to publishing
  // the single date recompute-occurrence.py guessed — day-of-month arithmetic
  // that is simply wrong for "last Saturday" or "full moon" cadences, and that
  // renders nowhere at all on the day that guess is not refreshed.
  //
  // Deliberately time-independent. An earlier revision skipped any record whose
  // nextOccurrence was still in the future, which meant the daily cron rolling
  // that date forward permanently masked the defect: the count read 0 today and
  // 3 the moment the clock moved. A safeguard that only reports a problem once
  // it is already live is not a safeguard. Judge the record, not the calendar.
  const DAY = /\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/i;
  const NTH = /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/i;
  const unresolvableRecurrence = [];
  for (const { file, data } of live) {
    const recur = data.recurrence ?? 'one-off';
    if (recur !== 'weekly' && recur !== 'monthly') continue;
    const note = [data.recurrenceNote, data.title, data.summary].filter(Boolean).join(' ');
    const start = parseDate(data.startDate);
    // Weekly: explicit prose, or the series start date as the weekday anchor.
    if (recur === 'weekly' && (DAY.test(data.recurrenceNote ?? '') || start)) continue;
    // Monthly: needs both the weekday and which one ("third Saturday").
    if (recur === 'monthly' && DAY.test(note) && NTH.test(note)) continue;
    unresolvableRecurrence.push({
      file,
      recurrence: recur,
      recurrenceNote: data.recurrenceNote ?? null,
      nextOccurrence: data.nextOccurrence ? String(data.nextOccurrence).slice(0, 10) : null,
    });
  }

  // ── 5. cancellations ──────────────────────────────────────────────────────
  // A cancelled record must carry the provenance that justifies the notice,
  // otherwise the page tells a reader an event is off without saying who says so.
  const cancelledWithoutProvenance = cancelled
    .filter(({ data }) => !data.cancellationSourceUrl && !data.cancellationNote)
    .map(({ file }) => file);

  const report = {
    generatedAt: new Date().toISOString(),
    asOf: today.toISOString().slice(0, 10),
    staleAfterDays: STALE_DAYS,
    assertedMetrics: [...ASSERTED_METRICS],
    totals: {
      liveEvents: live.length,
      cancelledEvents: cancelled.length,
      missingVerificationDate: missingVerification.length,
      staleVerificationDate: staleVerification.length,
      duplicateTitleGroups: duplicateTitles.length,
      duplicateVenueDateGroups: duplicateVenueDates.length,
      unresolvableRecurrence: unresolvableRecurrence.length,
      cancelledWithoutProvenance: cancelledWithoutProvenance.length,
    },
    missingVerificationDate: missingVerification.sort(),
    staleVerificationDate: staleVerification,
    duplicateTitleGroups: duplicateTitles,
    duplicateVenueDateGroups: duplicateVenueDates,
    unresolvableRecurrence,
    cancelledWithoutProvenance,
  };

  const t = report.totals;
  console.log(`Event safeguard audit — ${t.liveEvents} live events, ${t.cancelledEvents} cancelled`);
  console.log('');
  console.log(`  Source verification            (as of ${report.asOf})`);
  console.log(`    no lastCheckedDate .......... ${t.missingVerificationDate}   [gated]`);
  console.log(`    stale (> ${STALE_DAYS}d) ............... ${t.staleVerificationDate}   [report-only, ages with the calendar]`);
  console.log('  Duplicates');
  console.log(`    same normalised title ....... ${t.duplicateTitleGroups}   [gated]`);
  console.log(`    same venue + start date ..... ${t.duplicateVenueDateGroups}   [gated]`);
  console.log('  Recurrence & cancellation');
  console.log(`    unresolvable recurrence ..... ${t.unresolvableRecurrence}   [gated]`);
  console.log(`    cancelled w/o provenance .... ${t.cancelledWithoutProvenance}   [gated]`);
  console.log('');

  for (const g of [...duplicateTitles, ...duplicateVenueDates]) {
    console.log(`    DUPLICATE  ${g.key}`);
    for (const f of g.files) console.log(`               ${f}`);
  }
  for (const u of unresolvableRecurrence) {
    console.log(`    NO RULE    ${u.file} (${u.recurrence}) note=${JSON.stringify(u.recurrenceNote)}`);
  }
  for (const f of cancelledWithoutProvenance) {
    console.log(`    NO SOURCE  ${f} is cancelled with neither a note nor a source URL`);
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${path.relative(REPO, out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          staleAfterDays: STALE_DAYS,
          assertedMetrics: [...ASSERTED_METRICS],
          ceilings: t,
        },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${path.relative(REPO, BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing or corrupt baseline must not read as "no regression".
    console.error(`\n  FAIL: cannot read baseline ${path.relative(REPO, BASELINE)} — ${error.message}`);
    console.error('  Seed it with: npm run audit:event-safeguards -- --update-baseline');
    process.exit(1);
  }

  const failures = [];
  for (const [metric, ceiling] of Object.entries(baseline.ceilings ?? {})) {
    if (!ASSERTED_METRICS.has(metric)) continue;
    const actual = t[metric];
    if (typeof actual === 'number' && actual > ceiling) {
      failures.push(`${metric}: ${actual} > baseline ${ceiling}`);
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: event safeguard regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix the records, or re-seed deliberately with --update-baseline.');
    process.exit(1);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
