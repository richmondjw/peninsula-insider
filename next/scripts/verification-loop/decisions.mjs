/**
 * decisions.mjs - the editorial decision ledger.
 *
 * WHAT A DECISION IS HERE
 * ----------------------
 * A line of JSON saying that a named person looked at a named proposal, named
 * the page they read, and either accepted it or rejected it. That is the whole
 * record, and it is deliberately smaller than it could be: a decision is an
 * act, not a workflow, and every field that is not evidence of the act is a
 * field somebody will eventually fill in without meaning it.
 *
 * WHY IT IS APPEND-ONLY, AND WHY THAT IS NOT A PREFERENCE
 * ------------------------------------------------------
 * The same argument the claim registry already makes (PI-005: superseding is
 * additive, retirement is a state transition, never a deletion). A reviewer
 * who accepted something in September and changed their mind in October has
 * done two things, and a ledger that stores only the second one cannot answer
 * the question a write-scope decision actually turns on, which is how often
 * the loop and a person disagreed. Rewriting history here would delete exactly
 * the measurement PI-006 exists to produce. So `latestDecision` reads the last
 * line for a proposal, and every earlier line stays where it is.
 *
 * WHY ACCEPTANCE REQUIRES A URL
 * -----------------------------
 * /how-we-check/ tells readers that every edit is made by a person who has
 * looked at the thing themselves. `--read` is the smallest honest expression
 * of that sentence: a reviewer states which page they opened. It can be the
 * source the loop read, or a different one they went and found. What it cannot
 * be is absent, because then the ledger records an approval and no looking,
 * and the page on the site would be saying something the record does not
 * support.
 *
 * WHY THE PAGE DIGEST IS COPIED ONTO THE DECISION
 * -----------------------------------------------
 * So a decision can go stale in a way somebody can detect. A proposal id is
 * derived from the digest of the page it was read from, so a source that
 * changes produces a new proposal rather than inheriting the old approval.
 * Carrying the digest on the decision too means the apply stage can say WHY it
 * is refusing rather than merely failing to find a match.
 *
 * NOTHING HERE WRITES. Serialising a line is this module's job. Putting it on
 * disk is report.mjs's, and report.mjs refuses any path outside a reports
 * tree.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

export const DECISION_SCHEMA = 'pi-006-decision/1';

export const DECISION_ACTIONS = Object.freeze(['accept', 'reject']);

/**
 * Build one decision row, or throw with a message a person can act on.
 *
 * `at` is passed in rather than read from the clock so that a test can pin it
 * and so that a decision recorded from a queue processed later carries the
 * time it was taken rather than the time it was filed.
 */
export function buildDecision({ proposal, action, by, note = null, readUrl = null, at }) {
  if (!DECISION_ACTIONS.includes(action)) {
    throw new Error(`unknown decision: ${action}. Use accept or reject.`);
  }
  const who = typeof by === 'string' ? by.trim() : '';
  if (who.length === 0) {
    throw new Error(
      'a decision has to name who took it. Pass --by "<your name>": an unattributed approval ' +
        'is not a review, and the method page tells readers a person made the call.'
    );
  }
  if (!proposal?.proposalId) {
    throw new Error('a decision has to name the proposal it is about');
  }
  if (action === 'accept' && !readUrl) {
    throw new Error(
      'accepting a proposal requires --read "<url>": the page you opened yourself. The site ' +
        'tells readers that every edit is made by a person who looked at the thing, and this ' +
        'is where that is recorded.'
    );
  }
  if (action === 'reject' && !(typeof note === 'string' && note.trim().length > 0)) {
    throw new Error(
      'rejecting a proposal requires --note "<why>". A rejection with no reason teaches the ' +
        'loop nothing, and the reason is the measurement this stage exists to produce.'
    );
  }

  return {
    schema: DECISION_SCHEMA,
    ticket: 'PI-006',
    proposalId: proposal.proposalId,
    action,
    by: who,
    decidedAt: at,
    readUrl: readUrl ?? null,
    note: typeof note === 'string' && note.trim().length > 0 ? note.trim() : null,
    // Copied off the proposal so the ledger line stands alone. A decision that
    // needs the proposals file alongside it to mean anything is a decision
    // that stops meaning anything the first time that file is regenerated.
    claimId: proposal.claim?.claimId ?? null,
    field: proposal.change?.field ?? null,
    currentValue: proposal.change?.currentValue ?? null,
    proposedValue: proposal.change?.proposedValue ?? null,
    sourceUrl: proposal.read?.sourceUrl ?? null,
    sourceDigest: proposal.read?.sourceDigest ?? null,
    publisherKind: proposal.read?.publisherKind ?? null,
    precedenceRank: proposal.read?.precedence?.rank ?? null,
    precedenceOf: proposal.read?.precedence?.of ?? null,
    criticVerdict: proposal.critic?.verdict ?? null,
    // Said on the line itself, because a ledger read years from now should not
    // need this repository's history to say what it did and did not authorise.
    applied: false,
    appliedNote:
      'accepting a proposal records this decision. It does not edit a page. The edit is ' +
      'prepared as a patch file and applied by a person.',
  };
}

/** One decision, as the ledger stores it. */
export function serialiseDecision(decision) {
  return `${JSON.stringify(decision)}\n`;
}

/**
 * Read a ledger.
 *
 * A malformed line is kept as a parse failure rather than dropped. A ledger
 * that silently skips what it cannot read is a ledger that can lose a decision
 * without anybody finding out, and the whole point of the file is that it
 * cannot.
 */
export function parseLedger(text) {
  const decisions = [];
  const malformed = [];
  const lines = String(text ?? '').split('\n');
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      decisions.push({ ...JSON.parse(trimmed), _line: index + 1 });
    } catch {
      malformed.push({ line: index + 1, preview: trimmed.slice(0, 80) });
    }
  }
  return { decisions, malformed };
}

/**
 * The decision that stands for each proposal: the last one recorded.
 *
 * Order in the file is the order decisions were taken, so the last line wins
 * and every earlier one is still there to be counted.
 */
export function latestDecisions(decisions) {
  const latest = new Map();
  for (const decision of decisions ?? []) {
    if (!decision?.proposalId) continue;
    latest.set(decision.proposalId, decision);
  }
  return latest;
}

/** The standing decision on one proposal, or null if nobody has taken one. */
export function latestDecision(decisions, proposalId) {
  return latestDecisions(decisions).get(proposalId) ?? null;
}

/**
 * How often the loop and a person disagreed.
 *
 * This is the number PI-006 asks for by name: "compare against human
 * decisions, then permit narrowly defined factual updates". It is reported as
 * counts with no threshold and no verdict attached, because what rate is good
 * enough to grant write scope is the decision itself (D5) and this module has
 * no business pre-empting it.
 */
export function agreementProfile(decisions) {
  const rows = (decisions ?? []).filter((row) => DECISION_ACTIONS.includes(row?.action));
  const standing = [...latestDecisions(rows).values()];
  const accepted = standing.filter((row) => row.action === 'accept');
  const rejected = standing.filter((row) => row.action === 'reject');
  const byClass = {};
  for (const row of standing) {
    const key = row.claimId ? String(row.claimId).split('/').pop() : 'unknown';
    byClass[key] ??= { accepted: 0, rejected: 0 };
    byClass[key][row.action === 'accept' ? 'accepted' : 'rejected'] += 1;
  }
  return {
    decisionsRecorded: rows.length,
    proposalsDecided: standing.length,
    accepted: accepted.length,
    rejected: rejected.length,
    reversals: rows.length - standing.length,
    byClaimClass: byClass,
    note:
      'counts only. What rate of agreement would justify granting write scope is decision D5, ' +
      'and this file does not take it.',
  };
}
