#!/usr/bin/env node
/**
 * probe-link-health.mjs - the only thing in this repository that may write the
 * source-link probe record.
 *
 * It touches the network. It is therefore never run by `npm run build` and
 * never run by any CI workflow, and scripts/audit-link-health.test.mjs asserts
 * both of those as rules rather than as habits.
 *
 * WHY IT IS ITS OWN PROGRAM
 *
 * Probing used to be a flag on the gate: `audit-link-health.mjs --probe`. The
 * gate and the writer of the gate's input were one command a single flag
 * apart, in one process, and the remedy the gate printed on failure was to run
 * that flag. The record sat in ops/reports/ - the directory this repo treats
 * as regenerable build output and reverts wholesale.
 *
 * On 2026-09-14 five evidence rows citing URLs nobody had ever fetched passed
 * a local build. Reverting the "build artefacts" and re-running is what
 * exposed them. Separating the two is what stops it recurring.
 *
 * WHAT A PROBE IS FOR
 *
 * Recording what a fetch actually saw, so a later offline gate can judge a
 * citation without dialling out. It is not a fixer. It cannot decide what to
 * do about a dead URL - choosing a replacement is an editorial act that
 * requires someone to fetch the candidate and read it. That work happens in
 * ops/reports/content/link-health-dispositions.json and
 * scripts/apply-link-dispositions.mjs.
 *
 * A probe never turns a bad citation into a good one. It only makes the truth
 * about that citation available offline. Probing a dead URL records it dead,
 * and the gate then fails on `deadSourceUrlCited` instead of
 * `unrecordedSourceUrl`. There is no flag that makes a citation acceptable.
 *
 * Usage:
 *   node scripts/probe-link-health.mjs                  every cited URL
 *   node scripts/probe-link-health.mjs --unrecorded     only URLs with no row
 *   node scripts/probe-link-health.mjs --url https://x  one URL (repeatable)
 *   node scripts/probe-link-health.mjs --match council  URLs containing a string
 *
 *   [--concurrency N] [--record path] [--content-dir path] [--dry-run]
 */

import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { collectCitations, readProbeRecord, ProbeRecordError } from './link-health/corpus.mjs';
import { probeUrls } from './link-health/probe.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const multi = (flag) => {
  const found = [];
  args.forEach((a, i) => {
    if (a === flag && args[i + 1] && !args[i + 1].startsWith('--')) found.push(args[i + 1]);
  });
  return found;
};

const RECORD = path.resolve(
  getArg('--record', getArg('--ledger', path.join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json')))
);
const CONTENT_DIRS = (() => {
  const dirs = multi('--content-dir').map((d) => path.resolve(d));
  return dirs.length ? dirs : [path.join(NEXT, 'src', 'content')];
})();
const CONCURRENCY = Number(getArg('--concurrency', '6')) || 6;
const ONLY_UNRECORDED = args.includes('--unrecorded');
const EXPLICIT_URLS = multi('--url');
const MATCH = getArg('--match', null);
const DRY_RUN = args.includes('--dry-run');

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

const RECORD_NOTE =
  'Probe results for source URLs cited by the corpus. Written ONLY by ' +
  'next/scripts/probe-link-health.mjs, by a human or a scheduled job, never by a build. ' +
  'Read offline by next/scripts/audit-link-health.mjs. A verdict is what a probe saw, not an inference. ' +
  'This file is a RECORD, not a report: it does not live under ops/reports/ because nothing here is ' +
  'reproducible from the tree, and reverting it destroys evidence rather than regenerating it.';

async function main() {
  const { citations } = await collectCitations(CONTENT_DIRS, rel);
  const citedUrls = [...new Set(citations.map((c) => c.url))].sort();

  let existing = [];
  let head = {};
  try {
    const record = await readProbeRecord(RECORD);
    existing = record.rows;
    head = record.raw ?? {};
  } catch (error) {
    if (!(error instanceof ProbeRecordError)) throw error;
    // A first run has no record yet. That is the one case where starting from
    // nothing is correct, and it is reported rather than assumed.
    console.log(`No readable probe record at ${rel(RECORD)} - starting a new one.`);
    console.log(`  (${error.message})`);
  }
  const recorded = new Set(existing.map((row) => row.url));

  let target = citedUrls;
  if (EXPLICIT_URLS.length) {
    target = EXPLICIT_URLS;
    const uncited = EXPLICIT_URLS.filter((u) => !citedUrls.includes(u));
    if (uncited.length) {
      // Not an error: probing a candidate replacement before rewriting a
      // citation is exactly the right order of work.
      console.log('Probing URL(s) the corpus does not cite yet:');
      for (const u of uncited) console.log(`    ${u}`);
    }
  } else if (ONLY_UNRECORDED) {
    target = citedUrls.filter((u) => !recorded.has(u));
  } else if (MATCH) {
    target = citedUrls.filter((u) => u.includes(MATCH));
  }

  if (!target.length) {
    console.log('Nothing to probe: every selected URL already has a probe row.');
    return;
  }

  console.log(`Probing ${target.length} URL(s) at concurrency ${CONCURRENCY}. This touches the network.`);
  const rows = await probeUrls(target, existing, {
    concurrency: CONCURRENCY,
    onProgress: (done, total) => {
      if (done % 25 === 0) console.log(`    probed ${done}/${total}`);
    },
  });

  const byUrl = new Map(rows.map((row) => [row.url, row]));
  const counts = {};
  for (const url of target) {
    const verdict = byUrl.get(url)?.verdict ?? 'unknown';
    counts[verdict] = (counts[verdict] ?? 0) + 1;
  }

  if (!DRY_RUN) {
    await mkdir(path.dirname(RECORD), { recursive: true });
    await writeFile(
      RECORD,
      `${JSON.stringify({ note: RECORD_NOTE, updatedAt: new Date().toISOString(), links: rows }, null, 2)}\n`
    );
  }

  console.log('');
  console.log(`  ${DRY_RUN ? 'would write' : 'probe record ->'} ${rel(RECORD)}`);
  console.log(
    `  verdicts this run ................. ${Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join('  ')}`
  );

  const bad = target.filter((u) => ['dead', 'parked'].includes(byUrl.get(u)?.verdict));
  if (bad.length) {
    console.log('');
    console.log('  These came back dead. Recording that does NOT make them citable - the');
    console.log('  gate will now fail on deadSourceUrlCited instead. Fix the citation, or');
    console.log('  dispose of it explicitly (sourceStatus: unsourced / disputed):');
    for (const u of bad.slice(0, 40)) console.log(`    ${byUrl.get(u).verdict.padEnd(7)} ${u}`);
  }

  if (!DRY_RUN) {
    console.log('');
    console.log('  A probe only counts once it is reviewable. Commit it:');
    console.log(`    git add ${rel(RECORD)} && git commit`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
