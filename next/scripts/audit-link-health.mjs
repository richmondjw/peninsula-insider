#!/usr/bin/env node
/**
 * audit-link-health.mjs - the source-link gate (PI-007).
 *
 * Forty-five of the corpus's outbound source URLs were dead when PI-007 sized
 * the queue, and nothing on this site could see it. A record's verification
 * date is only meaningful if the source behind it can still be read; when the
 * source 404s, or its domain stops resolving, the date becomes unfalsifiable
 * and the claim it stamps is unsupported without ever having been edited. That
 * is exactly the failure this programme exists to stop: a confident published
 * claim nobody can check.
 *
 * THE ONE RULE THAT SHAPES EVERYTHING BELOW
 *
 * A CI gate may never fail because a remote server had a bad night. Link
 * checking is the classic time-driven gate: it goes red at 3am with no code
 * change, everyone learns to ignore it, and the next real failure is ignored
 * too. So this script makes NO network request, on any code path, ever.
 *
 *   scripts/probe-link-health.mjs   touches the network. Writes the record.
 *                                   Run by a human or a scheduled job. Never
 *                                   by a build, never by CI.
 *   this script                     reads the record and the content tree.
 *                                   No network, and no write to the record.
 *   this script --assert            compares the no-network metrics to a
 *                                   committed ratchet baseline.
 *
 * Every asserted metric is therefore a property of the files on disk. Run it
 * on any date, on any machine, offline, and the same tree yields the same
 * numbers. A remote site going down overnight changes nothing until a human
 * probes it and commits the result.
 *
 * WHY THE PROBER IS A SEPARATE PROGRAM (2026-09-14)
 *
 * It used to live here, behind a `--probe` flag. That made the gate and the
 * writer of the gate's own input one command a single flag apart - and when
 * the gate failed, the remedy it printed was to run that flag. The record
 * also sat in ops/reports/, the directory this repo treats as regenerable
 * build output and routinely reverts wholesale.
 *
 * On 2026-09-14 five evidence rows citing URLs nobody had ever fetched passed
 * a local build. Reverting the "build artefacts" - which is where the record
 * was filed - and re-running is what exposed them. A gate whose input can be
 * manufactured by the same act that runs it is not a gate; it is a mirror.
 *
 * So the two halves are now two programs and two files:
 *
 *   ops/records/link-health/probe-ledger.json   the RECORD. Written only by
 *       the prober. Never by a build. Lives outside ops/reports/ precisely so
 *       that "revert the build artefacts" cannot touch it.
 *   ops/reports/content/link-health.json        the REPORT. Derived. Any
 *       build may rewrite it freely; nothing asserts against it.
 *
 * This script cannot write the record. It does not import the prober, it
 * holds no write path to the record file, and it verifies before exiting that
 * the record's bytes are identical to the bytes it read. If the record moved
 * under it, the run fails rather than reporting a verdict it cannot stand
 * behind.
 *
 * WHAT IT ASSERTS
 *
 *   unrecordedSourceUrl
 *       A source URL cited by a content record with no probe row. This is the
 *       metric that makes the gate ratchet forward rather than merely hold:
 *       adding a new citation without probing it fails the build. Nobody can
 *       quietly introduce an unchecked source. (Reported under its old name,
 *       unledgeredSourceUrl, in the baseline too - both spellings are read, so
 *       an in-flight branch's baseline still applies.)
 *
 *   deadSourceUrlCited
 *       A URL the record says is dead, still cited by a content record that
 *       has not disposed of it. Disposal is explicit: the citing record
 *       carries sourceStatus "unsourced" or "disputed", so the registry and
 *       the blind-spot reporting can see the gap rather than the claim quietly
 *       disappearing. Ratchets down as the queue is worked.
 *
 *   staleRedirectCited
 *       The record knows where a moved URL went and the content still points
 *       at the old one. Cheap to fix, so it ratchets to zero fast.
 *
 * WHAT A PROBE ROW MEANS
 *
 * One row per distinct URL: the verdict, the HTTP code seen, the date probed,
 * who probed it, and a human note. A verdict is never inferred at read time -
 * it is what a probe saw, written down, and reviewable in a diff. A row
 * missing `probedOn` or `probedBy` is not the record of a probe and is
 * refused, because a hand-typed `{"url": "...", "verdict": "ok"}` is otherwise
 * indistinguishable from a fetch.
 *
 * Verdicts:
 *   ok          2xx or 3xx carrying a real page.
 *   blocked     The host refuses automation (400/401/403/406/429/503, or a
 *               2xx carrying a bot challenge - Cloudflare answers a robot
 *               with HTTP 202 and a captcha, which naive checkers score as
 *               healthy). NOT dead. The council is this site's most-cited
 *               publisher and refuses most automated reads; a checker that
 *               marked those dead would delete a third of the corpus's
 *               provenance over a robots policy.
 *   parked      HTTP 200 from a registrar holding page, an expired site
 *               builder, or a domain-for-sale lander. Worse than a 404: the
 *               link looks healthy to every status-code checker and sends a
 *               reader nowhere. Counted dead, because it is.
 *   moved       Dead at this URL, alive at `replacement`.
 *   dead        Nothing at this URL and no equivalent found. The claim it
 *               supported is unsourced until an editor finds one.
 *   tls-fault   Reachable, but the certificate does not match the hostname.
 *   unknown     Probed and inconclusive. Never asserted on.
 *
 * WHAT IT CANNOT CATCH
 *
 * A URL that resolves to a page which no longer carries the claim. HTTP 200 is
 * not evidence of support. That is the PI-005 registry's job, not a link
 * checker's, and pretending otherwise would be the same overconfidence in a
 * new costume.
 *
 * Usage:
 *   node scripts/audit-link-health.mjs [--json out.json] [--assert]
 *                                      [--baseline path] [--update-baseline]
 *                                      [--record path] [--content-dir path]
 */

import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  collectCitations,
  readProbeRecord,
  digestOfFile,
  ProbeRecordError,
} from './link-health/corpus.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);

/**
 * The gate does not probe. Not with a flag, not with an environment variable,
 * not by accident in a build script someone edits in a hurry. Refusing the
 * flag loudly is better than ignoring it: a CI line that reads
 * `audit-link-health.mjs --probe` and quietly does nothing of the sort would
 * be its own kind of lie.
 */
const NETWORK_FLAGS = ['--probe', '--probe-only', '--concurrency'];
const offered = args.filter((a) => NETWORK_FLAGS.includes(a));
if (offered.length) {
  console.error(`FAIL: ${offered.join(', ')} is not accepted here.`);
  console.error('');
  console.error('  This script is the gate. It makes no network request and cannot write');
  console.error('  the probe record - that is what makes it safe to run in CI, and what');
  console.error('  stops a build entering its own citations into the record it is judged');
  console.error('  against.');
  console.error('');
  console.error('  Probing is a separate, deliberate act:');
  console.error('    cd next && npm run probe:link-health -- --unrecorded');
  process.exit(2);
}

const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
export const DEFAULT_RECORD = path.join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json');
// `--ledger` is the pre-split spelling, kept so an in-flight branch or a
// scheduled job that predates the rename still resolves.
const RECORD = path.resolve(getArg('--record', getArg('--ledger', DEFAULT_RECORD)));
const BASELINE = path.resolve(
  getArg('--baseline', path.join(REPO, 'ops', 'baselines', 'link-health-baseline.json'))
);
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');

const multi = (flag, fallback) => {
  const found = [];
  args.forEach((a, i) => {
    if (a === flag && args[i + 1] && !args[i + 1].startsWith('--')) found.push(path.resolve(args[i + 1]));
  });
  return found.length ? found : fallback;
};
const CONTENT_DIRS = multi('--content-dir', [path.join(NEXT, 'src', 'content')]);

/**
 * `unledgeredSourceUrl` is the name this metric shipped under. Both spellings
 * are accepted from a baseline so that renaming the concept cannot silently
 * drop a ceiling of 0 and let an unprobed citation through - the exact failure
 * this file exists to prevent, reintroduced by a rename.
 */
const UNRECORDED = 'unrecordedSourceUrl';
const UNRECORDED_LEGACY = 'unledgeredSourceUrl';

const ASSERTED_METRICS = new Set([UNRECORDED, 'deadSourceUrlCited', 'staleRedirectCited']);

/**
 * Verdicts that mean this citation no longer supports anything. `parked` is
 * here because a registrar holding page is a worse failure than a 404, not a
 * lesser one: it answers 200 to every checker while sending the reader to an
 * advertisement.
 */
const DEAD_VERDICTS = new Set(['dead', 'parked']);

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

/** Exit, but only after proving the record is exactly what we read. */
async function finish(code, recordDigest) {
  const now = await digestOfFile(RECORD);
  if (now !== recordDigest) {
    console.error('');
    console.error('  FAIL: the probe record changed while this gate was running.');
    console.error(`    ${rel(RECORD)}`);
    console.error('');
    console.error('  A gate may not validate against an artefact its own run produced.');
    console.error('  Nothing in a build is allowed to write this file; find what did.');
    process.exit(1);
  }
  process.exit(code);
}

async function main() {
  const { citations, records } = await collectCitations(CONTENT_DIRS, rel);
  const citedUrls = [...new Set(citations.map((c) => c.url))].sort();

  let record;
  try {
    record = await readProbeRecord(RECORD);
  } catch (error) {
    if (!(error instanceof ProbeRecordError)) throw error;
    // Fail closed, and say which file. The old implementation swallowed this
    // and continued with zero rows, which is technically a failure but sends
    // the reader hunting through 1,400 citations instead of at one file.
    console.error(`FAIL: ${error.message}`);
    console.error('');
    console.error('  The probe record is this gate\'s ground truth. Without it there is');
    console.error('  nothing to check citations against, and "no rows" must never read as');
    console.error('  "everything is fine".');
    console.error('');
    console.error('    cd next && npm run probe:link-health');
    process.exit(1);
  }

  const recordDigest = record.digest;
  const ledger = new Map(record.rows.map((row) => [row.url, row]));

  /** A record may declare its own claim unsourced, which disposes of a dead link. */
  const disposed = (file) => {
    const data = records.get(file);
    if (!data) return false;
    return data.sourceStatus === 'unsourced' || data.sourceStatus === 'disputed';
  };

  const unrecorded = [];
  const deadCited = [];
  const staleRedirect = [];
  const blockedCited = [];

  for (const citation of citations) {
    const row = ledger.get(citation.url);
    if (!row) {
      unrecorded.push({ ...citation });
      continue;
    }
    if (DEAD_VERDICTS.has(row.verdict) && !disposed(citation.file)) {
      deadCited.push({ ...citation, verdict: row.verdict, note: row.note ?? null });
    }
    if (row.verdict === 'moved' && row.replacement && row.replacement !== citation.url) {
      staleRedirect.push({ ...citation, replacement: row.replacement });
    }
    if (row.verdict === 'blocked') blockedCited.push({ ...citation });
  }

  const verdictCounts = {};
  for (const row of record.rows) verdictCounts[row.verdict] = (verdictCounts[row.verdict] ?? 0) + 1;

  /**
   * Staleness is REPORTED and never asserted. A row going stale is the
   * calendar moving, not a change anyone made, and a gate that failed on it
   * would fail a build no commit could fix.
   */
  const probeDates = record.rows.map((r) => r.probedOn).sort();
  const staleness = {
    oldestProbe: probeDates[0] ?? null,
    newestProbe: probeDates[probeDates.length - 1] ?? null,
    distinctProbeDates: new Set(probeDates).size,
    note: 'Reported only. Never asserted: the calendar is not a code change.',
  };

  const totals = {
    [UNRECORDED]: new Set(unrecorded.map((u) => u.url)).size,
    deadSourceUrlCited: deadCited.length,
    staleRedirectCited: staleRedirect.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    assertedMetrics: [...ASSERTED_METRICS],
    probeRecord: rel(RECORD),
    citations: citations.length,
    distinctUrls: citedUrls.length,
    verdictCounts,
    staleness,
    malformedRecordRows: record.malformed.length,
    totals,
    [UNRECORDED]: unrecorded,
    deadSourceUrlCited: deadCited,
    staleRedirectCited: staleRedirect,
    blockedSourceUrlCited: blockedCited,
  };

  console.log('Source-link health');
  console.log('');
  console.log(`  probe record ...................... ${rel(RECORD)}`);
  console.log(`  citations ......................... ${report.citations}`);
  console.log(`  distinct source URLs .............. ${report.distinctUrls}`);
  console.log(
    `  probe verdicts .................... ${Object.entries(verdictCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join('  ')}`
  );
  console.log(
    `  probes dated ...................... ${staleness.oldestProbe ?? 'n/a'} .. ${staleness.newestProbe ?? 'n/a'}   [reported only]`
  );
  console.log('');
  console.log(`    URLs cited with no probe row .... ${totals[UNRECORDED]}   [gated]`);
  console.log(`    dead URL still cited ............ ${totals.deadSourceUrlCited}   [gated, ratchets down]`);
  console.log(`    moved URL not yet followed ...... ${totals.staleRedirectCited}   [gated, ratchets down]`);
  console.log(`    blocked host cited (not a fault)  ${blockedCited.length}   [reported only]`);
  if (record.malformed.length) {
    console.log(
      `    rows refused, no probedOn/probedBy ${record.malformed.length}   [a row is not a probe unless it says who probed it, and when]`
    );
  }
  console.log('');
  for (const u of unrecorded.slice(0, 40)) console.log(`    UNRECORDED  ${u.file}  ${u.field}  ${u.url}`);
  for (const d of deadCited.slice(0, 60)) console.log(`    DEAD        ${d.file}  ${d.field}  ${d.url}`);
  for (const s of staleRedirect.slice(0, 40)) {
    console.log(`    MOVED       ${s.file}  ${s.field}  ${s.url} -> ${s.replacement}`);
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n  report -> ${rel(out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        { updatedAt: report.generatedAt, assertedMetrics: [...ASSERTED_METRICS], ceilings: totals },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return finish(0, recordDigest);
  }

  if (!ASSERT) return finish(0, recordDigest);

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing baseline must not read as "no regression".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:link-health -- --update-baseline');
    return finish(1, recordDigest);
  }

  const ceilings = { ...(baseline.ceilings ?? {}) };
  if (ceilings[UNRECORDED_LEGACY] !== undefined && ceilings[UNRECORDED] === undefined) {
    ceilings[UNRECORDED] = ceilings[UNRECORDED_LEGACY];
  }
  delete ceilings[UNRECORDED_LEGACY];

  const failures = [];
  for (const [metric, ceiling] of Object.entries(ceilings)) {
    if (!ASSERTED_METRICS.has(metric)) continue;
    const actual = totals[metric];
    if (typeof actual === 'number' && actual > ceiling) {
      failures.push({ metric, actual, ceiling });
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: source-link regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f.metric}: ${f.actual} > baseline ${f.ceiling}`);

    if (failures.some((f) => f.metric === UNRECORDED)) {
      const example = unrecorded[0]?.url ?? 'https://the-url-above';
      console.error('');
      console.error('  A citation above has never been probed. The probe record is a record of');
      console.error('  what someone actually fetched, so this build cannot add to it - that is');
      console.error('  the point. Probe the URL yourself and commit the result:');
      console.error('');
      console.error(`    cd next`);
      console.error(`    npm run probe:link-health -- --url ${example}`);
      console.error(`    git add ${rel(RECORD)} && git commit`);
      console.error('');
      console.error('  Or probe every unprobed citation in one pass:');
      console.error('    cd next && npm run probe:link-health -- --unrecorded');
      console.error('');
      console.error('  If the probe comes back dead, fix or dispose of the citation. Do not');
      console.error('  re-seed the baseline to make the number fit.');
    }
    if (failures.some((f) => f.metric !== UNRECORDED)) {
      console.error('');
      console.error('  For dead and moved URLs: fix the citation, or dispose of it explicitly');
      console.error('  (sourceStatus: unsourced / disputed on the citing record). Re-seed the');
      console.error('  baseline only as a deliberate, reviewed act:');
      console.error('    cd next && npm run audit:link-health -- --update-baseline');
    }
    return finish(1, recordDigest);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
  return finish(0, recordDigest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
