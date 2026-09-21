#!/usr/bin/env node
/**
 * expire-occurrences.mjs - the expiry job behind PI-008.
 *
 * Two outputs, and they do different jobs.
 *
 *   1. next/src/data/event-expiry-state.json - the HEARTBEAT the renderer
 *      reads. src/lib/features.ts resolves the occurrence-model flag against
 *      it: if this file is missing, says ok:false, or has gone quiet for a
 *      week, the site restores the previous renderer by itself and logs why.
 *      That is the "restore the previous renderer if the expiry job fails"
 *      requirement, wired as an interlock rather than a runbook step. It is
 *      committed, because a build with no freshness run behind it must still
 *      know whether the job is alive.
 *
 *   2. ops/reports/events/event-expiry-exceptions.json - the EXCEPTION QUEUE.
 *      Every record the model cannot decide on its own: a postponement with no
 *      new date, a source that changed after we last verified it, an ambiguous
 *      midnight crossing, an exception entry with nothing to point at. These
 *      are not failures of the job, they are questions for a human, and they
 *      are deliberately NOT resolved by guessing.
 *
 * This job NEVER writes to an event record, never moves a file and never
 * deletes one. Expiry is computed, reported and applied at render time from
 * fields the record already carries. The archiver (archive-expired-events.py)
 * remains the only thing that writes `status`, and it is unchanged.
 *
 * Usage:
 *   node scripts/expire-occurrences.mjs [--now ISO] [--events-dir path]
 *                                       [--state path] [--queue path]
 *                                       [--dry-run] [--quiet]
 *
 * --now pins the instant so the fixtures can be evaluated against a date other
 * than the day the test happens to run.
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  dayIsoOf,
  isCancelledRecord,
  occurrenceExceptionQueue,
  recordDisposition,
} from '../src/lib/event-occurrence.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');

const DEFAULT_EVENTS_DIR = path.join(NEXT, 'src', 'content', 'events');
const DEFAULT_STATE = path.join(NEXT, 'src', 'data', 'event-expiry-state.json');
const DEFAULT_QUEUE = path.join(REPO, 'ops', 'reports', 'events', 'event-expiry-exceptions.json');

/** The model version the renderer expects. Bump only on a breaking change. */
const MODEL = 'pi-008-occurrence-v1';

/** Statuses that put a record in front of a reader on some surface. */
const LIVE_STATUSES = new Set(['published', 'scheduled']);

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const NOW = getArg('--now', null) ? new Date(getArg('--now', null)) : new Date();
const EVENTS_DIR = path.resolve(getArg('--events-dir', DEFAULT_EVENTS_DIR));
const STATE_OUT = path.resolve(getArg('--state', DEFAULT_STATE));
const QUEUE_OUT = path.resolve(getArg('--queue', DEFAULT_QUEUE));
const DRY_RUN = args.includes('--dry-run');
const QUIET = args.includes('--quiet');

const say = (line) => {
  if (!QUIET) console.log(line);
};

async function writeJson(target, payload) {
  if (DRY_RUN) return;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  if (Number.isNaN(NOW.getTime())) {
    console.error(`  FAIL: --now ${getArg('--now', '')} is not a valid instant`);
    process.exit(2);
  }

  let files;
  try {
    files = (await readdir(EVENTS_DIR, { recursive: true })).filter((f) => f.endsWith('.json'));
  } catch (error) {
    // The job could not read the corpus at all. Say so in the heartbeat rather
    // than leaving yesterday's healthy record in place, so the renderer falls
    // back instead of trusting a model nothing has checked.
    await writeJson(STATE_OUT, {
      model: MODEL,
      generatedAt: new Date().toISOString(),
      ok: false,
      failure: `events directory unreadable: ${error.message}`,
    });
    console.error(`  FAIL: cannot read ${EVENTS_DIR} - ${error.message}`);
    process.exit(1);
  }

  const unreadable = [];
  const records = [];
  for (const rel of files.sort()) {
    try {
      records.push({ file: rel, data: JSON.parse(await readFile(path.join(EVENTS_DIR, rel), 'utf8')) });
    } catch (error) {
      unreadable.push({ file: rel, error: error.message });
    }
  }

  const queue = [];
  const totals = {
    records: records.length,
    live: 0,
    expired: 0,
    cancelled: 0,
    postponed: 0,
    rescheduled: 0,
    soldOut: 0,
    unverified: 0,
    withheldFromPromotion: 0,
    queued: 0,
  };

  for (const { file, data } of records) {
    const live = LIVE_STATUSES.has(data.status ?? 'published');
    if (live) totals.live += 1;

    const disposition = recordDisposition(data, NOW);
    if (disposition.expired) totals.expired += 1;
    if (isCancelledRecord(data)) totals.cancelled += 1;
    if (disposition.status === 'postponed') totals.postponed += 1;
    if (disposition.status === 'rescheduled') totals.rescheduled += 1;
    if (disposition.bookingStatus === 'sold-out' || disposition.bookingStatus === 'closed') {
      totals.soldOut += 1;
    }
    if (disposition.unverified) totals.unverified += 1;
    if (live && !disposition.promotable) totals.withheldFromPromotion += 1;

    // Only live records raise questions worth a human's time. An archived
    // record with an ambiguous end time is not blocking anything.
    if (!live) continue;
    for (const entry of occurrenceExceptionQueue(data)) {
      queue.push({
        file,
        slug: data.slug ?? path.basename(file, '.json'),
        title: data.title ?? null,
        kind: entry.kind,
        detail: entry.detail,
      });
    }
  }
  totals.queued = queue.length;

  const ok = unreadable.length === 0;
  const state = {
    model: MODEL,
    generatedAt: new Date().toISOString(),
    ok,
    asOf: dayIsoOf(NOW),
    totals,
    ...(ok ? {} : { failure: `${unreadable.length} unreadable record(s)` }),
  };

  await writeJson(STATE_OUT, state);
  await writeJson(QUEUE_OUT, {
    generatedAt: state.generatedAt,
    asOf: state.asOf,
    note: 'Records the occurrence model will not decide on its own. Each needs a human, not a guess.',
    total: queue.length,
    byKind: queue.reduce((acc, q) => ({ ...acc, [q.kind]: (acc[q.kind] ?? 0) + 1 }), {}),
    queue,
  });

  say(`Occurrence expiry pass - ${totals.records} records, ${totals.live} live${DRY_RUN ? ' (dry run)' : ''}`);
  say('');
  say(`  expired (expiresAt passed) ....... ${totals.expired}`);
  say(`  cancelled ........................ ${totals.cancelled}`);
  say(`  postponed, no new date ........... ${totals.postponed}`);
  say(`  rescheduled ...................... ${totals.rescheduled}`);
  say(`  sold out or bookings closed ...... ${totals.soldOut}`);
  say(`  unverified against newer source .. ${totals.unverified}`);
  say(`  withheld from promotion .......... ${totals.withheldFromPromotion}`);
  say('');
  say(`  exception queue .................. ${queue.length}`);
  for (const q of queue) say(`    ${q.kind.padEnd(32)} ${q.slug}: ${q.detail}`);
  say('');
  if (!DRY_RUN) {
    say(`  heartbeat -> ${path.relative(REPO, STATE_OUT)}`);
    say(`  queue     -> ${path.relative(REPO, QUEUE_OUT)}`);
  }

  if (!ok) {
    console.error('\n  FAIL: unreadable event records, heartbeat marked not-ok:');
    for (const u of unreadable) console.error(`    ${u.file}: ${u.error}`);
    process.exit(1);
  }
}

main().catch(async (error) => {
  // Any uncaught failure must still leave a truthful heartbeat behind, or the
  // renderer will keep trusting a model that stopped being maintained.
  try {
    await writeJson(STATE_OUT, {
      model: MODEL,
      generatedAt: new Date().toISOString(),
      ok: false,
      failure: String(error?.message ?? error),
    });
  } catch {
    /* the heartbeat is best-effort; the non-zero exit is the real signal */
  }
  console.error(error);
  process.exit(1);
});
