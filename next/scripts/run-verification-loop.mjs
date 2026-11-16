#!/usr/bin/env node
/**
 * run-verification-loop.mjs - PI-006, the proposal-only verification loop.
 *
 * WHAT THIS IS
 * ------------
 * The claim registry landed with PI-005: 362 claims, 429 evidence rows, state
 * derived rather than stored. A registry nobody re-checks decays into a
 * timestamped record of what somebody once believed, so this is the loop that
 * keeps it honest. It selects by reader consequence and expiry, reads the
 * source a record already cites, composes a field-level patch through a guard
 * that cannot manufacture a visit, a review, an experience or a check date,
 * verifies each proposed change against the source independently of whoever
 * proposed it, runs a deterministic gate, and escalates anything unresolved.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not the write stage. It writes nothing to any content record, ever,
 * and there is no flag that makes it. PI-006 says to start without writing,
 * compare against human decisions, and only then permit narrowly defined
 * factual updates; decision D5 gates that scope and has not been taken. So
 * there is no kill switch here, because a kill switch on a component that
 * cannot write is theatre. What stands in its place is the thing a write stage
 * would actually need in order to be trusted: a deterministic gate that
 * measures, every run, on the real corpus, that nothing moved.
 *
 * WHAT PROPOSAL-ONLY MEANS, GIVEN THAT
 * ------------------------------------
 * The whole loop is built, end to end, in a mode that cannot touch published
 * content. It reads the corpus, finds claims that are expired, unsourced or
 * contradicted, reads the source each one cites in precedence order, and emits
 * a PROPOSAL: one field-level change carrying the claim, the current value,
 * the proposed value, the URL read, when it was read, what kind of publisher
 * that is, and where that kind sits in precedence for this class of claim. A
 * person reviews it (scripts/review-proposals.mjs), and accepting one prepares
 * a patch file (scripts/apply-proposals.mjs) that a person applies themselves.
 *
 * That means D5 is no longer a decision about whether to build any of this. It
 * is a decision about one thing only: whether an agent may run the last
 * command, the one a person runs today with `git apply`. Everything before it
 * exists, runs nightly and is useful now.
 *
 * WHERE IT RUNS
 * -------------
 * This repository's own GitHub Actions (.github/workflows/claim-verification.yml).
 * Not the OpenClaw stack, which is frozen pending the Agency cutover and
 * admits no new agents, crons or integrations.
 *
 * WHAT LEAVES THE PROCESS
 * -----------------------
 * One HTTP GET per cited source URL. No mail, no posting, no write to any
 * external system, and the fetcher refuses any URL the corpus does not already
 * cite, so a bug that invents one fails loudly instead of making a request.
 *
 * Usage:
 *   node scripts/run-verification-loop.mjs                     report to stdout
 *   node scripts/run-verification-loop.mjs --limit 40
 *   node scripts/run-verification-loop.mjs --offline            no network at all
 *   node scripts/run-verification-loop.mjs --json out.json --md out.md
 *   node scripts/run-verification-loop.mjs --today 2026-09-13
 *   node scripts/run-verification-loop.mjs \
 *     --proposals ops/reports/verification/proposals.json \
 *     --proposals-md ops/reports/verification/proposals.md
 *
 * Test-harness overrides (production callers pass none):
 *   --next-dir --fixtures --concurrency --timeout-ms --max-attempts
 *
 * Exit: 0 when the loop ran and its deterministic gate held. 1 when the gate
 * failed or the loop threw. Never 1 merely because the corpus carries debt:
 * a report that exits non-zero over inherited backlog is a report somebody
 * turns off, and the whole safeguard goes with it.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCorpus } from './verification-loop/corpus.mjs';
import { contentManifest, runChecks } from './verification-loop/checks.mjs';
import { createFetcher, createFixtureFetcher } from './verification-loop/fetch-source.mjs';
import { allCitedUrls, runLoop } from './verification-loop/loop.mjs';
import { buildProposals, renderProposalsMarkdown } from './verification-loop/proposal.mjs';
import { renderMarkdown, writeReport } from './verification-loop/report.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const getInt = (flag, fallback) => {
  const value = Number(getArg(flag, null));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/**
 * Read the fixture bundle: a self-contained corpus plus the canned responses
 * its citations resolve to, plus the drafts a model-backed researcher would
 * have proposed.
 */
async function loadFixtures(dir) {
  const responses = JSON.parse(await readFile(path.join(dir, 'responses.json'), 'utf8'));
  let drafts = {};
  try {
    drafts = JSON.parse(await readFile(path.join(dir, 'drafts.json'), 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { responses, drafts };
}

export async function main(argv = args) {
  const nextDir = path.resolve(getArg('--next-dir', NEXT));
  const fixtures = getArg('--fixtures', null);
  const offline = argv.includes('--offline');
  const today = getArg('--today', new Date().toISOString().slice(0, 10));
  const limit = getInt('--limit', 25);

  const corpus = await loadCorpus({ nextDir });
  const allowedUrls = allCitedUrls(corpus);

  let fetchSource;
  let draftsForClaim = null;
  let mode = 'proposal-only';

  if (fixtures) {
    const bundle = await loadFixtures(path.resolve(fixtures));
    fetchSource = createFixtureFetcher(bundle.responses, { now: () => new Date(`${today}T00:00:00Z`) });
    draftsForClaim = (entry, artifact) =>
      (bundle.drafts[entry.claim.claimId] ?? []).map((draft) => ({
        ...draft,
        sources: draft.sources ?? [
          { url: artifact.url, digest: artifact.digest, fetchedAt: artifact.fetchedAt },
        ],
      }));
    mode = 'proposal-only (fixtures)';
  } else if (offline) {
    // Structural pass. Every source reads as unreachable, which keeps the
    // adjudicator honest: it may not reach a verdict it did not read a page
    // for, so an offline run produces a backlog profile and a queue of
    // citations to repoint, and no claims about any claim.
    fetchSource = async (url) => ({
      url,
      finalUrl: null,
      status: null,
      reachability: 'error',
      fetchedAt: `${today}T00:00:00.000Z`,
      bytes: 0,
      digest: null,
      contentType: null,
      text: '',
      attempts: 0,
      note: 'offline run: no request was made',
    });
    mode = 'proposal-only (offline)';
  } else {
    fetchSource = createFetcher({
      allowedUrls,
      timeoutMs: getInt('--timeout-ms', 15_000),
      maxAttempts: getInt('--max-attempts', 2),
    });
  }

  const manifestBefore = await contentManifest(nextDir);
  const run = await runLoop({
    corpus,
    now: today,
    limit,
    concurrency: getInt('--concurrency', 3),
    fetchSource,
    draftsForClaim,
    mode,
  });
  const manifestAfter = await contentManifest(nextDir);

  // The proposals are derived from the completed run rather than composed
  // during it, so the loop cannot be tempted to act on one mid-flight. They
  // hang off the run because the gate below has to see them: an unauditable
  // proposal is a gate failure, not a review problem to be discovered later by
  // somebody reading it.
  run.proposals = buildProposals({ run, precedence: corpus.precedence });
  run.proposalSummary = {
    total: run.proposals.length,
    decidable: run.proposals.filter((item) => item.acceptability?.acceptable).length,
    note:
      'a proposal is a field-level change with an answer attached. An escalation is a question ' +
      'with no answer attached. Both reach the same person; only a proposal can be applied.',
  };

  const checks = runChecks({ run, manifestBefore, manifestAfter, allowedUrls });
  run.checks = checks;

  const jsonOut = getArg('--json', null);
  const mdOut = getArg('--md', null);
  const proposalsOut = getArg('--proposals', null);
  const proposalsMdOut = getArg('--proposals-md', null);
  if (jsonOut) {
    await writeReport(path.resolve(nextDir, '..', jsonOut), `${JSON.stringify(run, null, 2)}\n`);
  }
  if (mdOut) {
    await writeReport(path.resolve(nextDir, '..', mdOut), renderMarkdown(run, checks));
  }
  if (proposalsOut) {
    await writeReport(
      path.resolve(nextDir, '..', proposalsOut),
      `${JSON.stringify({ schema: 'pi-006-proposals/1', ticket: 'PI-006', asAt: run.asAt, mode: run.mode, proposals: run.proposals }, null, 2)}\n`
    );
  }
  if (proposalsMdOut) {
    await writeReport(
      path.resolve(nextDir, '..', proposalsMdOut),
      renderProposalsMarkdown(run.proposals, { asAt: run.asAt, mode: run.mode })
    );
  }
  if (!jsonOut && !mdOut && !proposalsOut && !proposalsMdOut) {
    process.stdout.write(renderMarkdown(run, checks));
  }

  const failed = checks.filter((check) => !check.pass);
  if (failed.length > 0) {
    process.stderr.write(
      `\nverification loop gate FAILED: ${failed.map((check) => check.id).join(', ')}\n`
    );
  }
  return { run, checks, failed };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('run-verification-loop.mjs')) {
  main()
    .then(({ failed }) => {
      process.exitCode = failed.length > 0 ? 1 : 0;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
