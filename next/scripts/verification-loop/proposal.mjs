/**
 * proposal.mjs - the reviewable artifact the loop actually produces.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE REPORT
 * ------------------------------------------
 * report.mjs writes a run report: what the loop looked at, what it refused,
 * what shape the backlog is in. That is a document about the loop. A person
 * deciding whether one recorded fact should change needs a different document
 * entirely, about one claim, and it has to answer a fixed set of questions
 * before it is worth anybody's minute:
 *
 *   what is the claim
 *   what does the record say now
 *   what is being proposed instead
 *   which URL was read
 *   when was it read
 *   what kind of publisher is that
 *   where does that kind sit in precedence FOR THIS CLASS of claim
 *
 * The last one is the one a report leaves out and a reviewer cannot do
 * without. "The venue's own website says it has closed" and "a commercial
 * partner of ours says a beach is open" are not the same evidence, and the
 * only thing that distinguishes them is a position in a table in
 * src/data/source-precedence.json. A proposal that cannot be audited back to a
 * fetched page, by a named publisher kind, at a stated rank, is worthless: it
 * is a machine's opinion wearing the clothes of a citation.
 *
 * THIS MODULE IMPLEMENTS THE TABLE. IT DOES NOT EDIT IT.
 * -----------------------------------------------------
 * Reading the table out loud has a consequence a reviewer will meet on the
 * first safety-relevant proposal they see, and it is stated here so nobody
 * discovers it by accident. For three classes of fact the table ranks a
 * commercial partner very highly, above a news report and above our own notes
 * from a visit. On a beach closure that ordering decides which source this
 * publication believes. Whether it should is on the register as a decision for
 * James (A29) and it is not this module's to take. What this module does is
 * refuse to let the ordering stay invisible: every proposal states the rank it
 * relied on, and names the kinds the read source outranks, so a reviewer sees
 * the ordering rather than inheriting it silently. Nothing here reorders,
 * reweights or special-cases the table.
 *
 * NOTHING HERE WRITES. A proposal is a value. Persisting one is report.mjs's
 * job, and report.mjs refuses any path outside a reports tree.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import { createHash } from 'node:crypto';

import { PUBLISHER_LABELS } from '../../src/lib/how-we-check.mjs';
import { refuse } from './compose.mjs';

export const PROPOSAL_SCHEMA = 'pi-006-proposal/1';

/** Critic verdicts a proposal may carry and still be worth a person's decision. */
const REVIEWABLE_VERDICTS = Object.freeze(['upheld', 'escalate']);

/** Reader words for a publisher kind, falling back to the raw token. */
export function publisherLabel(kind) {
  return PUBLISHER_LABELS[kind] ?? kind ?? 'unknown';
}

/**
 * Where a publisher kind sits in precedence for one class of claim.
 *
 * `rank` is 1-based because a reviewer reads "2 of 13", not "index 1". A kind
 * the table does not list for the class comes back with a null rank and
 * `listed: false` rather than being quietly sorted last: an unlisted kind is a
 * gap in the table, and a gap should read as a gap.
 */
export function precedencePosition(precedence, claimClass, publisherKind) {
  const entry = precedence?.classes?.[claimClass] ?? null;
  const order = Array.isArray(entry?.precedence) ? entry.precedence : [];
  const index = order.indexOf(publisherKind);
  const listed = index !== -1;
  return {
    claimClass,
    classLabel: entry?.label ?? claimClass,
    authority: entry?.authority ?? null,
    publisherKind: publisherKind ?? 'unknown',
    publisherLabel: publisherLabel(publisherKind),
    listed,
    rank: listed ? index + 1 : null,
    of: order.length,
    order,
    outranks: listed ? order.slice(index + 1) : [],
    outrankedBy: listed ? order.slice(0, index) : order,
  };
}

/**
 * The one-line version a reviewer in a hurry reads instead of the table.
 *
 * It names what the source beats, not only where it sits, because "2 of 13" is
 * a coordinate and "believed before a news report and our own notes from a
 * visit" is the thing somebody might object to.
 */
export function precedenceSummary(position) {
  if (!position.listed) {
    return (
      `${position.publisherKind} is not listed in the precedence order for ` +
      `${position.claimClass}, so this source has no recorded standing for this kind of fact`
    );
  }
  const beats = position.outranks.slice(0, 3).map(publisherLabel);
  const beaten = position.outrankedBy.slice(0, 3).map(publisherLabel);
  const parts = [
    `${position.publisherKind} ranks ${position.rank} of ${position.of} for ${position.claimClass}`,
  ];
  if (beaten.length > 0) parts.push(`believed after ${beaten.join(', ')}`);
  if (beats.length > 0) parts.push(`believed before ${beats.join(', ')}`);
  return parts.join('; ');
}

/**
 * A stable id for a proposal.
 *
 * Derived from the claim, the field, the value proposed and the digest of the
 * page it was read from, so the same proposal over an unchanged corpus and an
 * unchanged source carries the same id on every run, and a reviewer's decision
 * from yesterday still points at the thing they decided about. It deliberately
 * carries no date: an id that changed with the calendar would orphan every
 * recorded decision at midnight. It deliberately DOES carry the page digest,
 * so a source that changed under a standing decision produces a new id rather
 * than inheriting the old approval.
 */
export function proposalId({ claimId, field, proposedValue, sourceDigest }) {
  const material = [
    String(claimId ?? ''),
    String(field ?? ''),
    JSON.stringify(proposedValue ?? null),
    String(sourceDigest ?? ''),
  ].join(' ');
  return `p-${createHash('sha256').update(material).digest('hex').slice(0, 12)}`;
}

/**
 * Turn a completed run into proposals: one per composed, field-level change.
 *
 * Refused drafts do not become proposals. They never reached a patch, and
 * publishing them as things a person could accept would hand back exactly the
 * write the guard just declined. They stay in the run report, counted, under
 * "what the loop refused to do", which is where the evidence for a write-scope
 * decision belongs.
 *
 * Escalations are not proposals either, and the split is deliberate. An
 * escalation is a question with no proposed answer: the recorded hours and the
 * page disagree and the page may be the stale one. A proposal is a question
 * WITH an answer, which is a different act of review and needs the seven
 * fields above. Both reach the same person; only one of them can be applied.
 */
export function buildProposals({ run, precedence }) {
  const proposals = [];

  for (const item of run?.items ?? []) {
    for (const op of item.patch?.ops ?? []) {
      const source = op.sources?.[0] ?? {};
      const verdict = item.verdicts?.find((row) => row.path === op.path) ?? null;
      const position = precedencePosition(
        precedence,
        item.claimClass,
        item.source?.publisher ?? 'unknown'
      );
      const escalation = (run.escalations ?? []).find((row) => row.claimId === item.claimId);

      const proposal = {
        schema: PROPOSAL_SCHEMA,
        proposalId: proposalId({
          claimId: item.claimId,
          field: op.path,
          proposedValue: op.to,
          sourceDigest: source.digest ?? item.artifact?.digest ?? null,
        }),
        ticket: 'PI-006',
        mode: 'proposal-only',
        asAt: run.asAt ?? null,
        claim: {
          claimId: item.claimId,
          claimClass: item.claimClass,
          classLabel: position.classLabel,
          subject: item.subject,
          consequence: item.consequence,
          state: item.state,
        },
        change: {
          field: op.path,
          currentValue: op.from ?? null,
          proposedValue: op.to ?? null,
          reason: op.reason ?? null,
          consequential: op.consequential === true,
        },
        // Everything a reviewer needs to walk back to the page themselves. A
        // proposal missing any of these is unauditable, and auditGaps below is
        // what stops one reaching a decision.
        read: {
          sourceUrl: source.url ?? item.artifact?.url ?? null,
          finalUrl: item.artifact?.finalUrl ?? null,
          fetchedAt: source.fetchedAt ?? item.artifact?.fetchedAt ?? null,
          sourceDigest: source.digest ?? item.artifact?.digest ?? null,
          httpStatus: item.artifact?.status ?? null,
          reachability: item.artifact?.reachability ?? null,
          publisherKind: position.publisherKind,
          publisherLabel: position.publisherLabel,
          precedence: position,
          precedenceSummary: precedenceSummary(position),
        },
        quotes: op.quotes ?? [],
        critic: verdict
          ? { verdict: verdict.verdict, why: verdict.why }
          : { verdict: 'unreviewed', why: 'the critic returned no verdict for this field' },
        decision: {
          required: true,
          question:
            escalation?.question ??
            'The cited source supports this change. Accept it into the record, or reject it?',
          defaultIfNoAnswer:
            escalation?.defaultIfNoAnswer ?? 'no change is made and the record stands as it is',
        },
        // Stated on the artifact itself, so a proposal read in isolation years
        // from now still says what could and could not act on it.
        writes: {
          appliedAutomatically: false,
          why:
            'proposal-only: no module in the verification loop opens a content record for ' +
            'writing, accepting a proposal records a decision in a ledger, and applying one ' +
            'produces a patch file that a person applies themselves',
        },
      };

      proposal.acceptability = acceptability(proposal);
      proposals.push(proposal);
    }
  }

  return proposals.sort((a, b) => a.proposalId.localeCompare(b.proposalId));
}

/**
 * The fields without which a proposal cannot be audited back to a fetched
 * page. Returns the missing ones; empty means auditable.
 *
 * Checked mechanically rather than left to review, because a proposal that
 * reaches a reviewer already missing its source URL has wasted the only thing
 * the review stage has, which is somebody's attention.
 */
export function auditGaps(proposal) {
  const gaps = [];
  const need = [
    ['claim.claimId', proposal?.claim?.claimId],
    ['change.field', proposal?.change?.field],
    ['change.proposedValue', proposal?.change?.proposedValue],
    ['read.sourceUrl', proposal?.read?.sourceUrl],
    ['read.fetchedAt', proposal?.read?.fetchedAt],
    ['read.sourceDigest', proposal?.read?.sourceDigest],
    ['read.publisherKind', proposal?.read?.publisherKind],
  ];
  for (const [path, value] of need) {
    if (value === null || value === undefined || value === '') gaps.push(path);
  }
  // `currentValue` is exempt from the emptiness rule on purpose: false and
  // null are legitimate current values, and a record that does not carry the
  // field yet is a real case. It is still required to be PRESENT as a key,
  // which the builder guarantees.
  if (!Object.prototype.hasOwnProperty.call(proposal?.change ?? {}, 'currentValue')) {
    gaps.push('change.currentValue');
  }
  if (proposal?.read?.precedence?.rank === undefined) gaps.push('read.precedence.rank');
  return gaps;
}

/**
 * Whether this proposal is one a person may accept at all.
 *
 * Three separate reasons it may not be, and they are separate on purpose.
 *
 * THE CRITIC THREW IT OUT. `rejected` means a second reading of the same page
 * found it does not state what the change asserts. Letting a reviewer accept
 * that would launder an unsupported change through a tool whose whole value is
 * that it refuses unsupported changes. A person who disagrees with the critic
 * still has every power they had before: they edit the record by hand, with
 * their own name on it. What they may not do is borrow this tool's authority
 * for it.
 *
 * IT CANNOT BE AUDITED. A proposal missing its URL, its fetch date or its page
 * digest cannot be walked back to anything, so accepting it would be accepting
 * a sentence, not evidence.
 *
 * THE GUARD WOULD REFUSE IT. Re-run at this stage, deliberately, against the
 * same guard the composer used. A proposals file is an ordinary JSON file on
 * disk and somebody can edit one. If a check date or a licence appears in a
 * proposal by any route, the second reading catches it.
 */
export function acceptability(proposal) {
  const gaps = auditGaps(proposal);
  if (gaps.length > 0) {
    return {
      acceptable: false,
      code: 'unauditable',
      why: `this proposal cannot be traced back to a fetched page: missing ${gaps.join(', ')}`,
    };
  }

  const guard = refuse({
    path: proposal?.change?.field,
    to: proposal?.change?.proposedValue,
    sources: [{ url: proposal?.read?.sourceUrl, digest: proposal?.read?.sourceDigest }],
  });
  if (guard) {
    return { acceptable: false, code: guard.rule, why: guard.why };
  }

  const verdict = proposal?.critic?.verdict;
  if (!REVIEWABLE_VERDICTS.includes(verdict)) {
    return {
      acceptable: false,
      code: 'critic-rejected',
      why:
        verdict === 'rejected'
          ? 'reading the same page again, the critic found it does not support this change, so ' +
            'the loop will not carry it to a decision. Make the edit by hand if you disagree.'
          : 'the critic reached no verdict on this change, so there is nothing to decide on yet',
    };
  }

  return { acceptable: true, code: 'reviewable', why: 'cited, auditable and supported by the page' };
}

/**
 * The review surface, for a person with four minutes.
 *
 * One block per proposal, the seven questions answered in a fixed order, the
 * critic's verdict next to the proposal rather than under it, and the two
 * commands that act on it printed underneath. Nothing here is prose a reader
 * has to parse for meaning: a reviewer should be able to accept or reject
 * without scrolling.
 */
export function renderProposalsMarkdown(proposals, { asAt, mode, ledgerPath } = {}) {
  const lines = [];
  const push = (text = '') => lines.push(text);

  push('# PI-006 proposals awaiting an editorial decision');
  push();
  push(
    `${proposals.length} proposal${proposals.length === 1 ? '' : 's'}` +
      (asAt ? `, from the run as at ${asAt}` : '') +
      (mode ? ` (${mode})` : '') +
      '. Nothing applies these. The loop composed them, a critic read the source again and ' +
      'marked each one, and a person decides. Accepting a proposal records a decision in a ' +
      'ledger. It does not edit a page.'
  );
  push();

  if (proposals.length === 0) {
    push('_No proposal survived the guard this run._');
    push();
    return lines.join('\n');
  }

  push('## At a glance');
  push();
  push('| Proposal | Claim | Field | Now | Proposed | Source kind | Rank | Critic | Decidable |');
  push('|---|---|---|---|---|---|---|---|---|');
  for (const item of proposals) {
    push(
      `| \`${item.proposalId}\` | ${item.claim.subject} | ${item.change.field} | ` +
        `${fmt(item.change.currentValue)} | ${fmt(item.change.proposedValue)} | ` +
        `${item.read.publisherKind} | ${item.read.precedence.rank ?? 'unlisted'} of ` +
        `${item.read.precedence.of} | ${item.critic.verdict} | ` +
        `${item.acceptability?.acceptable ? 'yes' : 'no'} |`
    );
  }
  push();

  for (const item of proposals) {
    push(`## \`${item.proposalId}\` ${item.claim.subject}`);
    push();
    push('| | |');
    push('|---|---|');
    push(`| Claim | \`${item.claim.claimId}\` |`);
    push(`| Kind of fact | ${item.claim.classLabel} (\`${item.claim.claimClass}\`) |`);
    push(`| Reader consequence | ${item.claim.consequence} |`);
    push(`| Field | \`${item.change.field}\` |`);
    push(`| The record says now | ${fmt(item.change.currentValue)} |`);
    push(`| Proposed instead | ${fmt(item.change.proposedValue)} |`);
    push(`| Why | ${item.change.reason ?? ''} |`);
    push(`| Read from | ${item.read.sourceUrl} |`);
    push(`| Read on | ${item.read.fetchedAt} |`);
    push(`| Page digest | \`${item.read.sourceDigest}\` |`);
    push(`| Publisher | ${item.read.publisherLabel} (\`${item.read.publisherKind}\`) |`);
    push(
      `| Standing for this kind of fact | ${item.read.precedence.rank ?? 'unlisted'} of ` +
        `${item.read.precedence.of}. ${item.read.precedenceSummary} |`
    );
    push(`| Critic, reading the page again | **${item.critic.verdict}**: ${item.critic.why} |`);
    push(`| The decision | ${item.decision.question} |`);
    push(`| If nobody answers | ${item.decision.defaultIfNoAnswer} |`);
    push();
    if ((item.quotes ?? []).length > 0) {
      push('What the page says:');
      push();
      for (const quote of item.quotes.slice(0, 3)) push(`> ${quote}`);
      push();
    }
    if (!item.acceptability?.acceptable) {
      push(`**Not decidable here.** ${item.acceptability?.why}`);
      push();
      continue;
    }
    push('```');
    push(`npm run verify:review -- --accept ${item.proposalId} --by "<your name>" \\`);
    push(`  --read "${item.read.sourceUrl}"`);
    push(`npm run verify:review -- --reject ${item.proposalId} --by "<your name>" --note "<why>"`);
    push('```');
    push();
  }

  push('---');
  push();
  push(
    'Decisions are appended to `' +
      (ledgerPath ?? 'ops/reports/verification/decisions.jsonl') +
      '`. Accepting one does not change a page: it makes the proposal eligible for ' +
      '`npm run verify:apply`, which writes the edit out as a patch file for a person to read ' +
      'and apply. The loop has no path that edits a content record, and no flag that grants ' +
      'one.'
  );
  push();

  return lines.join('\n');
}

/** Render a value for a table cell without letting it break the table. */
function fmt(value) {
  if (value === null || value === undefined) return '_not set_';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const flat = text.replace(/\s+/g, ' ').replace(/\|/g, '\\|');
  return flat.length > 80 ? '`' + flat.slice(0, 77) + '...`' : '`' + flat + '`';
}
