#!/usr/bin/env node
/**
 * apply-proposals.mjs - the apply command, which writes a patch and not a
 * record.
 *
 * WHAT IT DOES
 * ------------
 * Reads the proposals file and the decision ledger, takes every proposal with
 * a standing acceptance, reads the record each one is about, and writes one
 * patch file per accepted proposal into ops/reports/verification/patches/. It
 * then prints the `git apply` line for each. That is the last thing in the
 * loop, and a person does the step after it.
 *
 * WHY IT DOES NOT GO ONE STEP FURTHER
 * -----------------------------------
 * /how-we-check/ tells readers, in these words, that the nightly program
 * "cannot change anything. It has no power to edit a page, and there is no
 * setting that gives it one. Every edit is made by a person who has looked at
 * the thing themselves." A page about verification that carried an unverified
 * claim about itself would be the worst defect this codebase could ship, so
 * that sentence is treated as a constraint on the code rather than as copy to
 * be revised later.
 *
 * It is also the honest reading of PI-006's own sequencing: start without
 * writing, compare against human decisions, and only then permit narrowly
 * defined factual updates, with decision D5 gating that scope. D5 has not been
 * taken. What has changed is what D5 is now a decision ABOUT. It is no longer
 * "should we build an agent that can edit published facts". Everything up to
 * the edit exists, runs nightly, and produces a reviewable, auditable, ready
 * to apply patch. D5 is now a decision about one command.
 *
 * THE WRITE PATH, PRECISELY
 * -------------------------
 * This file imports exactly one writer, `writeReport`, which refuses any path
 * outside a reports tree. It imports `readFile` to read the record, and
 * nothing else from node:fs. scripts/verification-proposals.test.mjs asserts
 * that property by reading these sources, and asserts the stronger one by
 * running this command over an accepted proposal and hashing the whole content
 * tree before and after.
 *
 * Usage:
 *   npm run verify:apply
 *   npm run verify:apply -- --proposal <id>
 *
 * Overrides for the harness (a person passes none):
 *   --proposals <file>  --ledger <file>  --out <dir>  --next-dir <dir>
 *
 * Exit: 0 when every accepted proposal produced a patch, or there were none.
 * 1 when one was accepted and could not be prepared, because a refusal at this
 * point means a recorded human decision cannot be carried out and somebody has
 * to know.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { planEdit, renderPatch } from './verification-loop/apply.mjs';
import { latestDecisions, parseLedger } from './verification-loop/decisions.mjs';
import { writeReport } from './verification-loop/report.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

export const DEFAULT_PROPOSALS = 'ops/reports/verification/proposals.json';
export const DEFAULT_LEDGER = 'ops/reports/verification/decisions.jsonl';
export const DEFAULT_PATCH_DIR = 'ops/reports/verification/patches';

/**
 * Where a claim's record lives, relative to the repository root.
 *
 * Derived from the claim subject rather than looked up, because the loop
 * already resolves subjects that way and two resolutions of the same thing
 * drift. `data-facts` subjects name `<file>/<entity-key>`, so the record is
 * the file and the entity key is part of the field path rather than the path
 * to the file.
 */
export function recordPathFor(claim, { nextDir = 'next' } = {}) {
  const type = claim?.subject?.split('/')?.[0] ?? null;
  const slug = claim?.subject?.split('/')?.slice(1).join('/') ?? null;
  if (!type || !slug) return null;
  if (type === 'data-facts') {
    return `${nextDir}/src/data/facts/${slug.split('/')[0]}.json`;
  }
  const markdown = new Set(['quick-notes', 'species']);
  const ext = markdown.has(type) ? 'md' : 'json';
  return `${nextDir}/src/content/${type}/${slug}.${ext}`;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function readOr(file, fallback) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const proposalsFile = path.resolve(REPO, args.proposals ?? DEFAULT_PROPOSALS);
  const ledgerFile = path.resolve(REPO, args.ledger ?? DEFAULT_LEDGER);
  const patchDir = path.resolve(REPO, args.out ?? DEFAULT_PATCH_DIR);
  const nextName = typeof args['next-dir'] === 'string' ? args['next-dir'] : 'next';

  const bundleText = await readOr(proposalsFile, null);
  if (bundleText === null) {
    process.stderr.write(
      `no proposals file at ${proposalsFile}. Run the loop first:\n  npm run verify:proposals\n`
    );
    return { ok: false, prepared: [], refused: [] };
  }
  const bundle = JSON.parse(bundleText);
  const proposals = Array.isArray(bundle?.proposals) ? bundle.proposals : [];
  const { decisions } = parseLedger(await readOr(ledgerFile, ''));
  const standing = latestDecisions(decisions);

  const wanted = typeof args.proposal === 'string' ? args.proposal : null;
  const queue = proposals.filter((proposal) => {
    if (wanted && proposal.proposalId !== wanted) return false;
    return standing.get(proposal.proposalId)?.action === 'accept';
  });

  const prepared = [];
  const refused = [];

  for (const proposal of queue) {
    const decision = standing.get(proposal.proposalId);
    const recordPath = recordPathFor(proposal.claim, { nextDir: nextName });
    if (!recordPath) {
      refused.push({ proposalId: proposal.proposalId, code: 'unresolved-subject', why: 'the claim subject does not resolve to a record' });
      continue;
    }
    const recordText = await readOr(path.resolve(REPO, recordPath), null);
    if (recordText === null) {
      refused.push({ proposalId: proposal.proposalId, code: 'missing-record', why: `${recordPath} is not on disk` });
      continue;
    }

    const plan = planEdit({ proposal, decision, recordPath, recordText });
    if (!plan.ok) {
      refused.push({ proposalId: proposal.proposalId, code: plan.code, why: plan.why });
      continue;
    }

    const target = path.join(patchDir, `${proposal.proposalId}.patch`);
    await writeReport(target, renderPatch({ proposal, decision, plan }));
    prepared.push({ proposalId: proposal.proposalId, patch: path.relative(REPO, target), record: recordPath });
  }

  const lines = [];
  if (prepared.length === 0 && refused.length === 0) {
    lines.push('No accepted proposal is waiting to be prepared.');
    lines.push('Review the queue with: npm run verify:review -- --list');
  }
  for (const item of prepared) {
    lines.push(`prepared ${item.proposalId}`);
    lines.push(`  record ${item.record}`);
    lines.push(`  patch  ${item.patch}`);
    lines.push(`  apply  git apply ${item.patch}`);
  }
  if (prepared.length > 0) {
    lines.push('');
    lines.push(
      'Nothing has been applied. Read each patch, then run the git apply line yourself. The ' +
        'loop has no path that edits a content record and no flag that grants one.'
    );
  }
  for (const item of refused) {
    lines.push(`refused ${item.proposalId} (${item.code}): ${item.why}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);

  return { ok: refused.length === 0, prepared, refused };
}

if (process.argv[1]?.endsWith('apply-proposals.mjs')) {
  main()
    .then((result) => {
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
