#!/usr/bin/env node
/**
 * review-proposals.mjs - the editorial review command. Half of PI-006's
 * approval loop, and deliberately only half.
 *
 * REVIEW AND APPLY ARE TWO COMMANDS, NOT ONE WITH A FLAG
 * -----------------------------------------------------
 * A reviewer accepting a proposal is saying "this is right". A patch being
 * prepared and applied is a change to a file somebody has to be able to see,
 * read and revert. Collapsing those into one command means the moment of
 * judgement and the moment of change happen in the same keystroke, and the
 * only record that the judgement was separate is a comment. So: this command
 * appends a line to a ledger and touches nothing else. scripts/apply-proposals.mjs
 * reads that ledger and writes a patch file. Neither of them edits a record.
 *
 * WHAT IT REFUSES
 * ---------------
 * An acceptance with no name on it, an acceptance that does not say which page
 * the reviewer opened, a rejection with no reason, and any proposal the critic
 * threw out. The last one is the one worth explaining: the loop will not carry
 * a change its own second reading of the page rejected, because the entire
 * value of the critic is that it refuses unsupported changes, and a review
 * command that let a human tick one through would make the critic advisory. A
 * person who disagrees with the critic has lost nothing: they edit the record
 * by hand, with their own name in the history, which is exactly what
 * /how-we-check/ tells readers happens.
 *
 * Usage:
 *   npm run verify:review -- --list
 *   npm run verify:review -- --show <proposal-id>
 *   npm run verify:review -- --accept <id> --by "Name" --read "https://..."
 *   npm run verify:review -- --reject <id> --by "Name" --note "why"
 *   npm run verify:review -- --agreement
 *
 * Overrides for the harness (a person passes none):
 *   --proposals <file>  --ledger <file>  --at <iso timestamp>
 *
 * Exit: 0 when the command did what was asked. 1 when it refused, and the
 * refusal says which rule stopped it.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  agreementProfile,
  buildDecision,
  latestDecision,
  parseLedger,
  serialiseDecision,
} from './verification-loop/decisions.mjs';
import { appendReport } from './verification-loop/report.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

export const DEFAULT_PROPOSALS = 'ops/reports/verification/proposals.json';
export const DEFAULT_LEDGER = 'ops/reports/verification/decisions.jsonl';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function readJsonOr(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function readTextOr(file, fallback) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

/** Everything the command needs off disk, read once. */
export async function loadReviewState({ proposalsFile, ledgerFile }) {
  const bundle = await readJsonOr(proposalsFile, null);
  const proposals = Array.isArray(bundle?.proposals) ? bundle.proposals : [];
  const { decisions, malformed } = parseLedger(await readTextOr(ledgerFile, ''));
  return { bundle, proposals, decisions, malformed };
}

/** Resolve an id, tolerating the `p-` prefix being left off. */
export function findProposal(proposals, id) {
  const wanted = String(id ?? '').trim();
  return (
    proposals.find((item) => item.proposalId === wanted) ??
    proposals.find((item) => item.proposalId === `p-${wanted}`) ??
    null
  );
}

function describe(proposal, decision) {
  const lines = [];
  lines.push(`${proposal.proposalId}  ${proposal.claim.claimId}`);
  lines.push(`  field        ${proposal.change.field}`);
  lines.push(`  now          ${JSON.stringify(proposal.change.currentValue ?? null)}`);
  lines.push(`  proposed     ${JSON.stringify(proposal.change.proposedValue ?? null)}`);
  lines.push(`  why          ${proposal.change.reason ?? ''}`);
  lines.push(`  read from    ${proposal.read.sourceUrl}`);
  lines.push(`  read on      ${proposal.read.fetchedAt}`);
  lines.push(`  page digest  ${proposal.read.sourceDigest}`);
  lines.push(`  publisher    ${proposal.read.publisherLabel} (${proposal.read.publisherKind})`);
  lines.push(`  precedence   ${proposal.read.precedenceSummary}`);
  lines.push(`  critic       ${proposal.critic.verdict}: ${proposal.critic.why}`);
  lines.push(`  decision     ${proposal.decision.question}`);
  lines.push(`  if no answer ${proposal.decision.defaultIfNoAnswer}`);
  for (const quote of (proposal.quotes ?? []).slice(0, 2)) {
    lines.push(`  page says    ${quote}`);
  }
  if (decision) {
    lines.push(
      `  STANDING     ${decision.action} by ${decision.by} on ${decision.decidedAt}` +
        (decision.note ? ` (${decision.note})` : '')
    );
  }
  if (!proposal.acceptability?.acceptable) {
    lines.push(`  NOT DECIDABLE ${proposal.acceptability?.why}`);
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const proposalsFile = path.resolve(REPO, args.proposals ?? DEFAULT_PROPOSALS);
  const ledgerFile = path.resolve(REPO, args.ledger ?? DEFAULT_LEDGER);
  const at = typeof args.at === 'string' ? args.at : new Date().toISOString();

  const state = await loadReviewState({ proposalsFile, ledgerFile });

  if (state.malformed.length > 0) {
    process.stderr.write(
      `the decision ledger has ${state.malformed.length} unreadable line(s): ` +
        `${state.malformed.map((row) => row.line).join(', ')}. Fix them before deciding ` +
        'anything, because a ledger that cannot be read in full cannot be trusted in part.\n'
    );
    return { ok: false, code: 'ledger-unreadable' };
  }

  if (args.agreement) {
    process.stdout.write(`${JSON.stringify(agreementProfile(state.decisions), null, 2)}\n`);
    return { ok: true, code: 'agreement' };
  }

  if (state.bundle === null) {
    process.stderr.write(
      `no proposals file at ${proposalsFile}. Run the loop first:\n` +
        '  npm run verify:proposals\n'
    );
    return { ok: false, code: 'no-proposals' };
  }

  if (args.show) {
    const proposal = findProposal(state.proposals, args.show);
    if (!proposal) {
      process.stderr.write(`no proposal ${args.show} in ${proposalsFile}\n`);
      return { ok: false, code: 'unknown-proposal' };
    }
    process.stdout.write(
      `${describe(proposal, latestDecision(state.decisions, proposal.proposalId))}\n`
    );
    return { ok: true, code: 'shown' };
  }

  const action = args.accept ? 'accept' : args.reject ? 'reject' : null;
  if (!action) {
    // The default is the list, because the default should be the thing that
    // costs nothing and tells you where you are.
    const lines = [
      `${state.proposals.length} proposal(s) from ${state.bundle.asAt ?? 'an undated run'} ` +
        `(${state.bundle.mode ?? 'unknown mode'}). Nothing here has been applied.`,
      '',
    ];
    for (const proposal of state.proposals) {
      lines.push(describe(proposal, latestDecision(state.decisions, proposal.proposalId)));
      lines.push('');
    }
    lines.push(`Ledger: ${path.relative(REPO, ledgerFile)}`);
    lines.push(
      'Accepting one records a decision. It does not edit a page. Preparing the edit is a ' +
        'separate command: npm run verify:apply'
    );
    process.stdout.write(`${lines.join('\n')}\n`);
    return { ok: true, code: 'listed', proposals: state.proposals.length };
  }

  const proposal = findProposal(state.proposals, args[action]);
  if (!proposal) {
    process.stderr.write(`no proposal ${args[action]} in ${proposalsFile}\n`);
    return { ok: false, code: 'unknown-proposal' };
  }

  if (action === 'accept' && !proposal.acceptability?.acceptable) {
    process.stderr.write(
      `refusing to record an acceptance of ${proposal.proposalId}: ` +
        `${proposal.acceptability?.why}\n`
    );
    return { ok: false, code: proposal.acceptability?.code ?? 'not-acceptable' };
  }

  let decision;
  try {
    decision = buildDecision({
      proposal,
      action,
      by: typeof args.by === 'string' ? args.by : '',
      note: typeof args.note === 'string' ? args.note : null,
      readUrl: typeof args.read === 'string' ? args.read : null,
      at,
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return { ok: false, code: 'invalid-decision' };
  }

  const written = await appendReport(ledgerFile, serialiseDecision(decision));
  process.stdout.write(
    `recorded: ${decision.action} ${decision.proposalId} by ${decision.by}\n` +
      `  ledger  ${path.relative(REPO, written)}\n` +
      (decision.action === 'accept'
        ? '  next    npm run verify:apply -- --proposal ' +
          decision.proposalId +
          '\n          which writes a patch file. It does not edit the record.\n'
        : '  no change is made and the record stands as it is\n')
  );
  return { ok: true, code: 'recorded', decision };
}

if (process.argv[1]?.endsWith('review-proposals.mjs')) {
  main()
    .then((result) => {
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
