#!/usr/bin/env node
/**
 * audit-claim-support.mjs - PI-005 Stage 3. The gate that makes the claim
 * registry cost something.
 *
 * Stages 0 to 2 built a registry and three hand-sourced pilots into it, and
 * nothing in the build read any of it. A registry nothing enforces is a
 * filing cabinet: it records that a fact is unsupported and then ships the
 * fact anyway. PI-005's acceptance is explicit - "unsupported facts cannot
 * pass required publication checks" - and this is that check.
 *
 * -------------------------------------------------------------------------
 * WHAT IS ASSERTED, AND WHY IT IS NOT THE OBVIOUS THING
 * -------------------------------------------------------------------------
 *
 * The obvious gate counts claims whose derived state is `unsupported` today
 * and fails when that number grows. It is forbidden here, and the reason is
 * the single hardest constraint on this build:
 *
 *     NOTHING TIME-DRIVEN MAY BE ASSERTED.
 *
 * A claim's derived state is a function of its evidence AND the calendar
 * (src/lib/claim-state.mjs). Evidence expires: `trading-status` at 90 days,
 * `conditions` at 7. So a gate on derived state crosses its own threshold on
 * a morning nobody chose, with no commit in between, and then blocks every
 * deploy after it for a reason no deploy can clear. On the corpus as it
 * stands that is not hypothetical - 62 of 74 `booking` claims and 94 of 113
 * `event-status` claims are already expired, and they expired by sitting
 * still. audit-event-safeguards.mjs states the same rule for the same reason,
 * and verification-loop.test.mjs restates it for the loop.
 *
 * So what is asserted is the half that a commit can move and the calendar
 * cannot: whether a claim has standing supporting evidence attached AT ALL.
 *
 *     unbacked = a claim with no evidence row that (a) supports it and
 *                (b) has not been superseded
 *
 * Expiry is deliberately ignored in that definition. Superseding is not,
 * because `supersededBy` is a stored pointer written by a commit, never by
 * the clock. Run this script on any date, on any machine, against a given
 * tree and it returns the same numbers.
 *
 * The ratchet is per claim class, because the claim class is the unit the
 * precedence table defines and the unit the blind-spot reporting already
 * uses. A class listed in the baseline may not grow its unbacked count; a
 * class NOT listed fails on its first unbacked claim. That second half is the
 * behaviour that matters: the failure this gate exists to prevent is a new
 * batch of asserted facts landing with nothing behind them, and a new batch
 * is exactly what produces a class with no baseline entry.
 *
 * Seeded from the real corpus, so it can never be satisfied by making the
 * corpus worse and never blocks a deploy over debt it inherited. Tighten the
 * baseline as each class is sourced.
 *
 * -------------------------------------------------------------------------
 * THE CEILINGS, AND WHAT EACH ONE IS FOR
 * -------------------------------------------------------------------------
 *
 * A ceiling is a statement about how much unsupported assertion a class is
 * carrying today, not a target. Two of them are doing different jobs and the
 * difference is the whole point of the mechanism:
 *
 *   trading-status  1. It was 0 - thirty-five claims, every one backed -
 *                   because PR #417 delisted a trading restaurant for a day
 *                   on a four-month-old desk judgement, and the ceiling
 *                   existed so that the next status claim landing with
 *                   nothing behind it would fail the build.
 *
 *                   On 2026-09-14 one landed, and it is the reason the
 *                   ceiling was raised rather than the reason it should not
 *                   have been: venues/red-hill-market/trading-status,
 *                   register item A25. The corpus sends readers to a market
 *                   whose own operator publishes that it is temporarily
 *                   closed and no longer at that ground, across seventeen
 *                   articles and both market guide pages. Four evidence rows
 *                   are attached and all four DISPUTE it. None supports it,
 *                   because no source could be found that does.
 *
 *                   Zero was not available honestly. It was reachable only by
 *                   declining to file the finding, or by softening the claim
 *                   statement until the evidence appeared to back it, and
 *                   both of those are the failure this registry exists to
 *                   stop. What the 1 still buys is what the address ceiling
 *                   buys: the SECOND unbacked trading-status claim fails the
 *                   build, and this one is named by claimId in the report.
 *
 *                   This is now the ceiling most likely to be wrong soonest.
 *                   It returns to 0 the moment the A25 decision is taken -
 *                   see ops/reports/content/2026-09-14-red-hill-market-
 *                   identity.md - and tightening it needs no re-seed.
 *
 *   accessibility  29. Inherited debt on the events tier. Nobody has been
 *                   through it. The ceiling exists so that debt does not
 *                   block a deploy and does not grow.
 *
 *   address         3. New class, 2026-09-14, and the ceiling is itemised
 *   coordinates     1. rather than inherited: every claim in both classes was
 *                   filed with an evidence row attached, and the four that
 *                   count as unbacked are unbacked because the row DISPUTES
 *                   the record. A contradiction is not support and this gate
 *                   is right to say so, but it is a different fact from "no
 *                   source was found", and the report keeps the two apart in
 *                   the unevidenced column: both classes read 0 there.
 *
 *                   Zero was available for both and would have been a lie. It
 *                   was reachable only by declining to file the four findings,
 *                   which is the failure the registry exists to stop. What the
 *                   non-zero ceiling still buys is that the classes are now
 *                   LISTED: the fourth unbacked address claim and the second
 *                   unbacked coordinates claim fail the build, and the four
 *                   already here are named in the JSON report by claimId.
 *
 *                   Each is a record edit away from resolution, so this is the
 *                   ceiling in the table most likely to be wrong soon. Tighten
 *                   it as each dispute is settled - and note that settling one
 *                   does NOT require re-seeding: a class may sit below its
 *                   ceiling, and the test file explains at length why demanding
 *                   equality would turn every improvement into a red build.
 *
 * -------------------------------------------------------------------------
 * WHAT IS HARD-FAILED
 * -------------------------------------------------------------------------
 *
 * Structural integrity has no baseline and no ratchet, because these are not
 * debt - they are a broken registry, and a broken registry cannot be read to
 * decide anything. Each one is deterministic and each one is currently zero:
 *
 *   - an evidence row pointing at a claim that does not exist
 *   - a claim whose claimClass the precedence table does not define
 *   - an evidence row whose publisher.kind the table does not list
 *   - claimId or evidenceId disagreeing with its own file path
 *   - a duplicate claimId or evidenceId
 *   - a dangling supersedes / supersededBy pointer
 *   - a claim whose own subject is missing from its assertedBy
 *
 * -------------------------------------------------------------------------
 * WHAT IS REPORTED AND NEVER ASSERTED
 * -------------------------------------------------------------------------
 *
 *   - derived state as at --today. Time-driven, so it is printed and written
 *     to the JSON report and no exit code depends on it.
 *   - expired evidence rows. Same reason.
 *   - expiresAt drift against the CURRENT precedence table. This one is not
 *     time-driven, and it is still not asserted, on purpose: content.config.ts
 *     says a stored expiresAt is "a property of this row at the moment it was
 *     taken: a later edit to the precedence table must not silently move a
 *     promise an existing row has already made". A gate that failed on drift
 *     would force exactly the rewrite that comment forbids. Reporting it says
 *     the same thing without holding a deploy hostage to it.
 *   - blind spots: classes the table defines with no evidenced claim at all.
 *     Silence there would read as a clean bill of health when it is an
 *     absence of looking.
 *
 * Usage:
 *   node scripts/audit-claim-support.mjs [--json out.json] [--assert]
 *                                        [--baseline path]
 *                                        [--update-baseline]
 *                                        [--today YYYY-MM-DD]
 *                                        [--project-root path]
 *
 * --project-root points at the Astro project whose src/content/claims,
 * src/content/evidence and src/data/source-precedence.json are audited. Only
 * the test harness passes it; production callers audit the real corpus.
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeExpiresAt,
  deriveClaimState,
  indexEvidenceByClaim,
  isExpired,
  toIsoDay,
} from '../src/lib/claim-state.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');
const DEFAULT_BASELINE = path.join(REPO, 'ops', 'reports', 'claims', 'claim-support-baseline.json');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const PROJECT_ROOT = path.resolve(getArg('--project-root', NEXT));
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(getArg('--baseline', DEFAULT_BASELINE));
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');
/**
 * Only ever reaches the REPORTED section. Nothing derived from this value is
 * compared against the baseline or can change an exit code.
 */
const TODAY = getArg('--today', new Date().toISOString().slice(0, 10));

const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

/** Recursively list .json files under a directory. A missing directory reads empty. */
async function listJson(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(entry.parentPath ?? entry.path ?? dir, entry.name))
    .sort();
}

/** The id a file at `file` must declare: its path under `root`, without .json. */
function idForPath(root, file) {
  return path
    .relative(root, file)
    .split(path.sep)
    .join('/')
    .replace(/\.json$/i, '');
}

const sameSubject = (a, b) =>
  Boolean(a) && Boolean(b) && a.type === b.type && a.slug === b.slug && (a.field ?? null) === (b.field ?? null);

/**
 * Read the registry. Fails closed: an unreadable or unparseable registry must
 * never read as "nothing is unsupported".
 */
export async function loadRegistry(projectRoot) {
  const claimsRoot = path.join(projectRoot, 'src', 'content', 'claims');
  const evidenceRoot = path.join(projectRoot, 'src', 'content', 'evidence');
  const precedencePath = path.join(projectRoot, 'src', 'data', 'source-precedence.json');

  const precedence = JSON.parse(await readFile(precedencePath, 'utf8'));

  const read = async (root) => {
    const rows = [];
    for (const file of await listJson(root)) {
      let parsed;
      try {
        parsed = JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        throw new Error(`cannot parse ${rel(file)} - ${error.message}`);
      }
      rows.push({ ...parsed, _file: file, _pathId: idForPath(root, file) });
    }
    return rows;
  };

  return { precedence, claims: await read(claimsRoot), evidence: await read(evidenceRoot) };
}

/**
 * Structural integrity. Every check here is a broken join or a broken
 * identity, never debt, so none of them is ratcheted.
 */
export function structuralFailures({ precedence, claims, evidence }) {
  const failures = [];
  const claimIds = new Set(claims.map((c) => c.claimId));
  const evidenceIds = new Set(evidence.map((e) => e.evidenceId));
  const definedClasses = new Set(Object.keys(precedence?.classes ?? {}));
  const definedKinds = new Set(precedence?.publisherKinds ?? []);

  const seenClaim = new Set();
  for (const claim of claims) {
    if (claim.claimId !== claim._pathId) {
      failures.push(`${rel(claim._file)}: claimId '${claim.claimId}' does not match its path '${claim._pathId}'`);
    }
    if (seenClaim.has(claim.claimId)) failures.push(`duplicate claimId '${claim.claimId}'`);
    seenClaim.add(claim.claimId);
    if (!definedClasses.has(claim.claimClass)) {
      failures.push(`${claim.claimId}: claimClass '${claim.claimClass}' is not defined in source-precedence.json`);
    }
    if (!(claim.assertedBy ?? []).some((entry) => sameSubject(entry, claim.subject))) {
      failures.push(`${claim.claimId}: its own subject is missing from assertedBy`);
    }
    if (claim.supersedes && !claimIds.has(claim.supersedes)) {
      failures.push(`${claim.claimId}: supersedes '${claim.supersedes}', which does not exist`);
    }
  }

  const seenEvidence = new Set();
  for (const row of evidence) {
    if (row.evidenceId !== row._pathId) {
      failures.push(`${rel(row._file)}: evidenceId '${row.evidenceId}' does not match its path '${row._pathId}'`);
    }
    if (seenEvidence.has(row.evidenceId)) failures.push(`duplicate evidenceId '${row.evidenceId}'`);
    seenEvidence.add(row.evidenceId);
    if (!claimIds.has(row.claim)) {
      failures.push(`${row.evidenceId}: attached to claim '${row.claim}', which does not exist`);
    }
    if (!definedKinds.has(row.publisher?.kind)) {
      failures.push(`${row.evidenceId}: publisher.kind '${row.publisher?.kind}' is not listed in source-precedence.json`);
    }
    if (row.supersededBy && !evidenceIds.has(row.supersededBy)) {
      failures.push(`${row.evidenceId}: supersededBy '${row.supersededBy}', which does not exist`);
    }
  }

  return failures.sort();
}

/**
 * The asserted metric, per claim class.
 *
 * A claim is `unbacked` when no evidence row supports it and still stands.
 * Standing means not superseded - a stored pointer, written by a commit.
 * EXPIRY IS NOT CONSULTED. That is what makes this safe to assert: the
 * calendar cannot move a number here, only an edit can.
 */
export function supportByClass({ precedence, claims, evidence }) {
  const byClaim = indexEvidenceByClaim(evidence);
  const classes = new Map();
  for (const name of Object.keys(precedence?.classes ?? {})) {
    classes.set(name, { claimClass: name, claims: 0, unbacked: 0, unevidenced: 0, disputed: 0, unbackedIds: [] });
  }

  for (const claim of claims) {
    if (!classes.has(claim.claimClass)) {
      classes.set(claim.claimClass, {
        claimClass: claim.claimClass,
        claims: 0,
        unbacked: 0,
        unevidenced: 0,
        disputed: 0,
        unbackedIds: [],
      });
    }
    const bucket = classes.get(claim.claimClass);
    bucket.claims += 1;

    const rows = byClaim.get(claim.claimId) ?? [];
    const standing = rows.filter((row) => !row.supersededBy);
    const supports = standing.filter((row) => (row.stance ?? 'supports') === 'supports');
    const disputes = standing.filter((row) => row.stance === 'disputes');

    if (rows.length === 0) bucket.unevidenced += 1;
    if (disputes.length > 0) bucket.disputed += 1;
    if (supports.length === 0) {
      bucket.unbacked += 1;
      bucket.unbackedIds.push(claim.claimId);
    }
  }

  return [...classes.values()]
    .map((row) => ({ ...row, unbackedIds: row.unbackedIds.sort() }))
    .sort((a, b) => b.unbacked - a.unbacked || a.claimClass.localeCompare(b.claimClass));
}

/**
 * Everything that moves with the calendar. Reported, never asserted. Kept in
 * its own function so there is no path by which `today` can reach the ratchet.
 */
export function timeDependentReport({ precedence, claims, evidence }, today) {
  const byClaim = indexEvidenceByClaim(evidence);
  const states = { supported: 0, unsupported: 0, disputed: 0, retired: 0 };
  const byClassState = {};

  for (const claim of claims) {
    const state = deriveClaimState(claim, byClaim.get(claim.claimId) ?? [], {
      now: today,
      precedence,
    });
    states[state] = (states[state] ?? 0) + 1;
    byClassState[claim.claimClass] ??= { supported: 0, unsupported: 0, disputed: 0, retired: 0 };
    byClassState[claim.claimClass][state] += 1;
  }

  const expired = evidence.filter((row) => !row.supersededBy && isExpired(row, today)).length;

  // Not time-driven, and still not asserted - see the header.
  const expiryDrift = [];
  const classOf = new Map(claims.map((claim) => [claim.claimId, claim.claimClass]));
  for (const row of evidence) {
    const claimClass = classOf.get(row.claim);
    if (!claimClass || !precedence?.classes?.[claimClass]) continue;
    let want;
    try {
      want = toIsoDay(computeExpiresAt(row.retrievedAt, claimClass, precedence));
    } catch {
      continue;
    }
    const have = toIsoDay(row.expiresAt);
    if (want !== have) expiryDrift.push({ evidenceId: row.evidenceId, stored: have, table: want });
  }

  // A class the table defines with no claim carrying any evidence at all.
  const evidencedClasses = new Set();
  for (const claim of claims) {
    if ((byClaim.get(claim.claimId) ?? []).length > 0) evidencedClasses.add(claim.claimClass);
  }
  const blindSpots = Object.keys(precedence?.classes ?? {})
    .filter((name) => !evidencedClasses.has(name))
    .sort();

  return {
    today,
    states,
    byClassState,
    expiredEvidenceRows: expired,
    expiryDrift: expiryDrift.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    blindSpots,
  };
}

async function main() {
  let registry;
  try {
    registry = await loadRegistry(PROJECT_ROOT);
  } catch (error) {
    // Fail closed. An unreadable registry must never read as "all supported".
    console.error(`  FAIL: cannot read the claim registry - ${error.message}`);
    process.exit(1);
  }

  const structural = structuralFailures(registry);
  const support = supportByClass(registry);
  const timed = timeDependentReport(registry, TODAY);
  const ceilings = Object.fromEntries(
    support.filter((row) => row.unbacked > 0).map((row) => [row.claimClass, row.unbacked])
  );

  const totals = {
    claims: registry.claims.length,
    evidenceRows: registry.evidence.length,
    classesDefined: Object.keys(registry.precedence?.classes ?? {}).length,
    unbackedClaims: support.reduce((sum, row) => sum + row.unbacked, 0),
    unevidencedClaims: support.reduce((sum, row) => sum + row.unevidenced, 0),
    structuralFailures: structural.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: rel(PROJECT_ROOT),
    totals,
    structural,
    support,
    // Everything below this line is reported and never asserted.
    reportedOnly: timed,
  };

  console.log(`Claim support - ${totals.claims} claims, ${totals.evidenceRows} evidence rows`);
  console.log('');
  console.log('  gated, per claim class (no evidence standing in support)');
  console.log('    class                  claims   unbacked   unevidenced   disputed');
  for (const row of support) {
    console.log(
      `    ${row.claimClass.padEnd(20)} ${String(row.claims).padStart(6)} ${String(row.unbacked).padStart(10)} ${String(
        row.unevidenced
      ).padStart(13)} ${String(row.disputed).padStart(10)}`
    );
  }
  console.log('');
  console.log(`    unbacked claims ............ ${totals.unbackedClaims}   [gated, per class]`);
  console.log(`    of those, no evidence ...... ${totals.unevidencedClaims}`);
  console.log('');
  console.log(`  reported only, never gated (as at ${TODAY})`);
  console.log(
    `    derived state .............. ${timed.states.supported} supported, ${timed.states.unsupported} unsupported, ${timed.states.disputed} disputed, ${timed.states.retired} retired`
  );
  console.log(`    expired evidence rows ...... ${timed.expiredEvidenceRows}`);
  console.log(`    expiresAt drift ............ ${timed.expiryDrift.length}`);
  console.log(
    `    blind-spot classes ......... ${timed.blindSpots.length}${
      timed.blindSpots.length ? `  (${timed.blindSpots.join(', ')})` : ''
    }`
  );
  console.log('');

  if (structural.length) {
    console.error('  FAIL: the claim registry is structurally broken');
    for (const failure of structural) console.error(`    ${failure}`);
    console.error('');
    console.error('  These are broken joins and broken identities, not debt. There is no baseline');
    console.error('  to re-seed: fix the files.');
    if (JSON_OUT) await writeJson(JSON_OUT, report);
    process.exit(1);
  }

  if (JSON_OUT) await writeJson(JSON_OUT, report);

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          note:
            'Ratchet baseline for PI-005 claim support, seeded from the real registry. A claim class listed here may not grow the number of claims with no standing supporting evidence; a class NOT listed here fails on its first unbacked claim. Expiry is deliberately excluded from the measure - a gate that moved with the calendar would fail a build no commit could fix. Tighten as each class is sourced.',
          totals: {
            claims: totals.claims,
            evidenceRows: totals.evidenceRows,
            unbackedClaims: totals.unbackedClaims,
          },
          ceilings,
        },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing or corrupt baseline must not read as "all backed".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:claim-support -- --update-baseline');
    process.exit(1);
  }

  const allowed = baseline.ceilings ?? {};
  const failures = [];
  for (const row of support) {
    const ceiling = allowed[row.claimClass] ?? 0;
    if (row.unbacked > ceiling) {
      failures.push(
        ceiling === 0
          ? `${row.claimClass}: ${row.unbacked} claim(s) with no supporting evidence, and the class is new to the baseline - ${row.unbackedIds
              .slice(0, 6)
              .join(', ')}${row.unbackedIds.length > 6 ? ', ...' : ''}`
          : `${row.claimClass}: ${row.unbacked} > baseline ${ceiling}`
      );
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: this build asserts facts the claim registry cannot support');
    for (const failure of failures) console.error(`    ${failure}`);
    console.error('');
    console.error('  Attach an evidence row under next/src/content/evidence/<claim path>/ citing a');
    console.error('  source you actually read, or retire the claim. Deleting the claim to clear the');
    console.error('  gate puts the corpus back where it started: asserting the fact with nothing');
    console.error('  behind it and no record that anyone noticed.');
    console.error('  Re-seed deliberately with: npm run audit:claim-support -- --update-baseline');
    process.exit(1);
  }
  console.log('  PASS: no new unsupported claims against the ratchet baseline.');
}

async function writeJson(target, report) {
  const out = path.resolve(target);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  report -> ${rel(out)}`);
}

// Only run the CLI when invoked as a script. The test harness imports the
// pure functions above and must not trigger a process.exit.
if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
