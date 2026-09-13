/**
 * checks.mjs - the deterministic gate over a completed run.
 *
 * The loop's own judgement is probabilistic: a regex can match a sidebar, an
 * identity score can be generous, a source can be honest and wrong. These
 * checks are not. Each one is a property that either holds or does not, and
 * every one of them is a property a write stage would have to keep. Running
 * them here, while nothing can be written, is how the write-scope decision
 * gets evidence rather than assurances.
 *
 * The first check is the important one. `no-content-write` hashes every
 * content and data file before the run and again after it, and fails if a
 * single byte moved. That is a stronger statement than "report-only is the
 * default": it is a measurement, taken on the real corpus, every run. A flag
 * can be flipped by accident. A manifest cannot.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { listFiles } from './corpus.mjs';

const EM_DASH = '\u2014';
const FIGURE = /(?:\$|AUD\s?|A\$)\s?\d/;

/**
 * sha256 of every content and data file, keyed by repo-relative path.
 *
 * Deliberately covers the whole of src/content and src/data rather than only
 * the records the run selected. A loop that wrote to a file it never selected
 * is exactly the failure worth catching, and a narrow manifest would miss it.
 */
export async function contentManifest(root) {
  const manifest = new Map();
  for (const dir of [path.join(root, 'src', 'content'), path.join(root, 'src', 'data')]) {
    for (const ext of ['.json', '.md', '.mdx', '.yaml', '.yml']) {
      for (const file of await listFiles(dir, ext)) {
        const bytes = await readFile(file);
        manifest.set(path.relative(root, file).replace(/\\/g, '/'), createHash('sha256').update(bytes).digest('hex'));
      }
    }
  }
  return manifest;
}

/** Paths whose bytes differ between two manifests. */
export function manifestDiff(before, after) {
  const changed = [];
  for (const [file, hash] of after) {
    if (!before.has(file)) changed.push({ file, change: 'added' });
    else if (before.get(file) !== hash) changed.push({ file, change: 'modified' });
  }
  for (const [file] of before) {
    if (!after.has(file)) changed.push({ file, change: 'removed' });
  }
  return changed.sort((a, b) => a.file.localeCompare(b.file));
}

/** Field-path leaves that would be a check date under any name. */
const DATE_LEAF = /(?:date|verified|checked|retrieved|discovered|reviewed)/i;

/**
 * Run the gate.
 *
 * `run` is the whole loop result. Returns one row per check; the caller
 * decides what a failure costs, and in report-only a failure exits non-zero
 * because it means the loop itself is broken, not that the corpus has debt.
 */
export function runChecks({ run, manifestBefore, manifestAfter, allowedUrls }) {
  const checks = [];
  const add = (id, pass, detail, why) => checks.push({ id, pass, detail, why });

  const changed = manifestDiff(manifestBefore, manifestAfter);
  add(
    'no-content-write',
    changed.length === 0,
    { changedFiles: changed.slice(0, 20), changed: changed.length },
    'the report-only loop must not alter a single byte of any content or data record'
  );

  const items = run.items ?? [];
  const allOps = items.flatMap((item) => item.patch?.ops ?? []);

  const dateOps = allOps.filter((op) => DATE_LEAF.test(String(op.path ?? '').split('.').pop() ?? ''));
  add(
    'no-check-date-refreshed',
    dateOps.length === 0,
    { offending: dateOps.map((op) => op.path) },
    'a successful fetch proves a page responded, never that a person read it and agreed, so no ' +
      'composed change may move a verification date'
  );

  const proposedRows = items.flatMap((item) => item.proposedEvidence ?? []);
  const autoStamped = proposedRows.filter((row) => row.recorded === true || row.requiresHuman === false);
  add(
    'no-evidence-row-recorded',
    autoStamped.length === 0,
    { offending: autoStamped.length },
    'a confirmation produces a PROPOSED evidence row for a person to accept; recording one ' +
      'automatically is the same check-date failure wearing a different field name'
  );

  const unsourced = allOps.filter((op) => !Array.isArray(op.sources) || op.sources.some((s) => !s?.digest));
  add(
    'every-change-cites-evidence',
    unsourced.length === 0,
    { offending: unsourced.map((op) => op.path) },
    'every proposed change must cite the fetched artifact it came from, by digest'
  );

  const escalations = run.escalations ?? [];
  const mute = escalations.filter((item) => !item.question || !item.defaultIfNoAnswer);
  add(
    'every-escalation-states-a-question',
    mute.length === 0,
    { offending: mute.length },
    'an escalation without a specific question and a default is a notification, and notifications ' +
      'are what a review queue dies of'
  );

  const fetched = items.flatMap((item) => item.attempts ?? []).map((a) => a.url);
  const strays = fetched.filter((url) => !allowedUrls.has(url));
  add(
    'outbound-limited-to-cited-sources',
    strays.length === 0,
    { offending: strays.slice(0, 10) },
    'the only outbound traffic permitted is a GET of a URL a record already cites'
  );

  const unread = items.filter(
    (item) =>
      ['confirmed', 'contradicted'].includes(item.adjudication?.outcome) &&
      item.artifact?.reachability !== 'ok'
  );
  add(
    'no-verdict-without-a-readable-source',
    unread.length === 0,
    { offending: unread.map((item) => item.claimId) },
    'unreachable and blocked are source-health facts, never verdicts about a claim'
  );

  const serialised = JSON.stringify(run);
  add(
    'no-figures-in-the-report',
    !FIGURE.test(serialised),
    {},
    'this publication carries no prices, and a rate finding must escalate without one riding along'
  );
  add(
    'no-em-dash-in-the-report',
    !serialised.includes(EM_DASH),
    {},
    'BRAND-PI hard rule'
  );

  return checks;
}
