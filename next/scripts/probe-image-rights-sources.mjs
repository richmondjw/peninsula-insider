#!/usr/bin/env node
/**
 * probe-image-rights-sources.mjs - go and read the pages LICENSES.md cites.
 *
 * WHY THIS EXISTS AS A SEPARATE COMMAND
 * -------------------------------------
 * LICENSES.md says a photograph is CC-BY-SA-4.0 by a named person at a named
 * URL. That is a citation, and a citation nobody has fetched is exactly what
 * audit-link-health.mjs refuses: five of them were deleted from another
 * branch's work for being asserted rather than read. So before any of this
 * gets written onto a record, somebody fetches the source and writes down what
 * it said.
 *
 * THIS COMMAND TOUCHES THE NETWORK AND MUST NEVER RUN IN CI
 * --------------------------------------------------------
 * It is the same split audit-link-health.mjs documents at length: a gate that
 * fails because a remote server had a bad night is a gate everybody learns to
 * ignore, and the next real failure is ignored with it. So the network half is
 * this command, run by a person, and its output is a committed ledger. Every
 * other script in this ticket reads the ledger and touches nothing.
 *
 * Nothing in `npm run build` invokes this file.
 *
 * HOW IT ASKS
 * -----------
 * Every Wikimedia Commons citation is answered by ONE batched API request, not
 * by fetching twenty-two file pages. The first version did fetch them, four at
 * a time, and Wikimedia rate-limited it: eleven files came back with no
 * licence, which is indistinguishable from eleven files whose licence could
 * not be established. A throttled probe is worse than no probe because its
 * silence reads as a finding. Anything that is not a Commons file page gets a
 * plain HTTP GET and only reachability is claimed for it.
 *
 * WHAT IT RECORDS
 * ---------------
 * One row per distinct original URL in LICENSES.md:
 *
 *   verdict        ok, moved, blocked, dead or unknown
 *   sourceLicence  the licence the source names now, verbatim
 *   sourceCreator  the author the source names now, verbatim
 *   licenceAgrees  matches, differs or not-comparable
 *   creatorAgrees  exact, contains or not-established
 *   probedOn       the date this ran
 *
 * `licenceAgrees: differs` is the finding worth the whole exercise: the file
 * wrote down one grant and the source names another. `not-comparable` is not a
 * pass. It means nothing was established, and the report prints it as such.
 *
 * Usage:
 *   node scripts/probe-image-rights-sources.mjs [--ledger path]
 *                                               [--licences path]
 *                                               [--probed-on YYYY-MM-DD]
 *
 * `--probed-on` exists so a re-run can restate the date a person actually did
 * the reading. Left out, it uses today, which is a record of when the command
 * ran rather than an input to any assertion. Nothing in the build reads it.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { parseLicences } from './media-rights/licences.mjs';
import {
  commonsApiUrl,
  commonsTitle,
  compareCreator,
  compareLicence,
  readCommonsResponse,
  verdictForStatus,
} from './media-rights/sources.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const LICENCES = path.resolve(getArg('--licences', path.join(NEXT, 'public', 'images', 'sourced', 'LICENSES.md')));
const LEDGER = path.resolve(
  getArg('--ledger', path.join(REPO, 'ops', 'reports', 'media', 'image-rights-source-ledger.json'))
);
const PROBED_ON = getArg('--probed-on', new Date().toISOString().slice(0, 10));

/**
 * Wikimedia asks automated clients to identify themselves and say where to
 * complain. Sending a browser string to an API is how a polite request becomes
 * an anonymous one, and an anonymous one is the one that gets throttled.
 */
const UA =
  'PeninsulaInsiderRightsProbe/1.0 (https://peninsulainsider.com.au; hello@peninsulainsider.com.au) PI-013';

const BATCH = 25;

async function fetchStatus(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(20000),
    });
    return { status: response.status, finalUrl: response.url, error: null };
  } catch (error) {
    return { status: null, finalUrl: null, error: String(error.message ?? error) };
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    if (!response.ok) return { status: response.status, body: null, error: text.slice(0, 200) };
    try {
      return { status: response.status, body: JSON.parse(text), error: null };
    } catch {
      // A rate-limit notice arrives as plain text with a 200. Parsing it as an
      // empty result would report every file in the batch as unestablished.
      return { status: response.status, body: null, error: text.slice(0, 200) };
    }
  } catch (error) {
    return { status: null, body: null, error: String(error.message ?? error) };
  }
}

function blankRow(url, citedBy) {
  return {
    sourceUrl: url,
    citedBy: citedBy.map((entry) => entry.filename).sort(),
    fileLicence: [...new Set(citedBy.map((entry) => entry.permission))].filter(Boolean),
    fileCreator: [...new Set(citedBy.map((entry) => entry.creator))].filter(Boolean),
    verdict: 'unknown',
    http: null,
    sourceLicence: null,
    sourceCreator: null,
    licenceAgrees: 'not-comparable',
    creatorAgrees: 'not-established',
    note: null,
    probedOn: PROBED_ON,
  };
}

/**
 * Fold what the source said into a row.
 *
 * A URL two entries disagree about takes the worst of the two answers, because
 * one of them is wrong and a ledger row must not look settled when it is not.
 */
function applyReading(row, read) {
  row.sourceLicence = read.licence;
  row.sourceCreator = read.artist;

  const licences = row.fileLicence.map((value) => compareLicence(value, read.licence));
  row.licenceAgrees = licences.includes('differs')
    ? 'differs'
    : licences.length > 0 && licences.every((v) => v === 'matches')
      ? 'matches'
      : 'not-comparable';

  const creators = row.fileCreator.map((value) => compareCreator(value, read.artist));
  row.creatorAgrees = creators.includes('exact')
    ? 'exact'
    : creators.includes('contains')
      ? 'contains'
      : 'not-established';
  return row;
}

async function main() {
  const { entries } = parseLicences(await readFile(LICENCES, 'utf8'));

  const byUrl = new Map();
  for (const entry of entries) {
    if (!entry.sourceUrl) continue;
    if (!byUrl.has(entry.sourceUrl)) byUrl.set(entry.sourceUrl, []);
    byUrl.get(entry.sourceUrl).push(entry);
  }

  const urls = [...byUrl.keys()].sort();
  const rows = new Map(urls.map((url) => [url, blankRow(url, byUrl.get(url))]));

  // -- Commons, in one batch ---------------------------------------------
  const commons = urls.map((url) => ({ url, title: commonsTitle(url) })).filter((item) => item.title !== null);

  for (let i = 0; i < commons.length; i += BATCH) {
    const slice = commons.slice(i, i + BATCH);
    const titles = slice.map((item) => item.title);
    const api = await fetchJson(commonsApiUrl(titles));
    if (api.body === null) {
      for (const item of slice) {
        rows.get(item.url).note = `Commons API did not answer: ${api.error ?? api.status}`;
      }
      continue;
    }
    const read = readCommonsResponse(api.body, titles);
    for (const item of slice) {
      const row = rows.get(item.url);
      const seen = read.get(item.title);
      if (!seen) {
        row.note = 'the Commons API answered and said nothing about this file';
        continue;
      }
      if (!seen.found) {
        row.verdict = 'dead';
        row.note = 'Commons reports no such file';
        continue;
      }
      row.verdict = 'ok';
      row.http = 200;
      row.note = 'read from the Commons imageinfo API, which is the record the file page renders';
      applyReading(row, seen);
    }
  }

  // -- everything else, one plain GET each --------------------------------
  for (const url of urls) {
    if (commonsTitle(url) !== null) continue;
    const page = await fetchStatus(url);
    const row = rows.get(url);
    row.http = page.status;
    row.verdict = verdictForStatus(page.status);
    row.note = page.error
      ? `fetch failed: ${page.error}`
      : 'not a Wikimedia Commons file page, so only reachability was established';
  }

  const list = [...rows.values()].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
  for (const row of list) {
    process.stderr.write(`${row.verdict.padEnd(8)} ${row.licenceAgrees.padEnd(15)} ${row.sourceUrl}\n`);
  }

  const count = (key, value) => list.filter((row) => row[key] === value).length;
  const ledger = {
    probedOn: PROBED_ON,
    licencesFile: path.relative(REPO, LICENCES).split(path.sep).join('/'),
    what: 'One row per distinct original URL in LICENSES.md, as this probe read it on the date above.',
    caveat:
      'A matching licence means the source names that grant today. It is not a check that the file in ' +
      'public/images/sourced is the file at that URL, and it is not permission to publish.',
    totals: {
      urls: list.length,
      ok: count('verdict', 'ok'),
      moved: count('verdict', 'moved'),
      blocked: count('verdict', 'blocked'),
      dead: count('verdict', 'dead'),
      unknown: count('verdict', 'unknown'),
      licenceMatches: count('licenceAgrees', 'matches'),
      licenceDiffers: count('licenceAgrees', 'differs'),
      licenceNotComparable: count('licenceAgrees', 'not-comparable'),
      creatorExact: count('creatorAgrees', 'exact'),
      creatorContains: count('creatorAgrees', 'contains'),
      creatorNotEstablished: count('creatorAgrees', 'not-established'),
    },
    rows: list,
  };

  await mkdir(path.dirname(LEDGER), { recursive: true });
  await writeFile(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  process.stderr.write(`\nwrote ${path.relative(REPO, LEDGER)}\n`);
  process.stderr.write(`${JSON.stringify(ledger.totals, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
