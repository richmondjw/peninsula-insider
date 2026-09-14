/**
 * apply.mjs - the apply stage, which does not apply anything.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * Given an accepted proposal and the current text of the record it is about,
 * it returns three strings: the file as it stands, the file as it would stand,
 * and a unified diff between them. That is the whole of it. Every function
 * here is pure: text in, text out, no filesystem, no clock, no network.
 *
 * WHY IT STOPS THERE
 * ------------------
 * Because /how-we-check/ tells readers, in these words, that the nightly
 * program "cannot change anything. It has no power to edit a page, and there
 * is no setting that gives it one. Every edit is made by a person who has
 * looked at the thing themselves."
 *
 * A module that wrote the file would make that sentence false, and a page
 * about verification carrying an unverified claim about itself is the worst
 * defect this codebase could ship. So the terminal artifact of the whole loop
 * is a patch file, and a person runs `git apply` on it. That is not a
 * placeholder for a write. It is the design, and it is the reason the loop is
 * useful before decision D5 rather than after it: the patch is real, readable
 * and applicable today, and D5 is a decision about who runs the last command
 * rather than about whether any of this gets built.
 *
 * THE IMPOSSIBILITY IS STRUCTURAL, NOT POLICY
 * -------------------------------------------
 * There is no flag in this file, and no branch anybody can take. The module
 * imports nothing from node:fs. It has no parameter that could carry a
 * destination. The only writer anywhere in the loop is report.mjs, which
 * refuses any path outside a reports tree, and scripts/verification-proposals.test.mjs
 * asserts that property by reading the sources rather than by trusting this
 * comment.
 *
 * FOUR THINGS ARE CHECKED BEFORE A PATCH IS EVEN COMPOSED
 * ------------------------------------------------------
 * The guard runs again, because a proposals file is an ordinary JSON file and
 * somebody can edit one. The critic's verdict is honoured, because the loop
 * will not launder a change its own second reading threw out. A decision has
 * to exist and be an acceptance, by a named person, naming what they read. And
 * the value on disk has to still be the value the proposal said it was: a
 * proposal composed a week ago against a record somebody has since corrected
 * is a proposal about a file that no longer exists, and applying it would
 * quietly revert their work.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import { refuse } from './compose.mjs';
import { acceptability } from './proposal.mjs';

/** A refusal is a value, not an exception, so a caller can report every one. */
function refusal(code, why) {
  return { ok: false, code, why };
}

/**
 * Split a field path into segments: `images[0].permission` becomes
 * ['images', 0, 'permission']. Numbers come back as numbers so an array index
 * addresses an array rather than growing a string key on it.
 */
export function segmentsOf(fieldPath) {
  const out = [];
  for (const part of String(fieldPath ?? '').split('.')) {
    if (part.length === 0) continue;
    const match = /^([^[\]]*)((?:\[\d+\])*)$/.exec(part);
    if (!match) return null;
    if (match[1].length > 0) out.push(match[1]);
    for (const index of match[2].matchAll(/\[(\d+)\]/g)) out.push(Number(index[1]));
  }
  return out.length > 0 ? out : null;
}

/** Read a field path out of a parsed record. `undefined` means not present. */
export function valueAt(data, segments) {
  let node = data;
  for (const segment of segments) {
    if (node === null || node === undefined) return undefined;
    node = node[segment];
  }
  return node;
}

/**
 * Return a copy of `data` with one field set. Structural copy along the path
 * only, so the caller's object is never mutated and a caller holding the
 * original still holds the original.
 */
export function withValueAt(data, segments, value) {
  if (segments.length === 0) return value;
  const [head, ...rest] = segments;
  const base =
    typeof head === 'number'
      ? Array.isArray(data)
        ? data.slice()
        : []
      : { ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}) };
  base[head] = withValueAt(
    data && typeof data === 'object' ? data[head] : undefined,
    rest,
    value
  );
  return base;
}

/** Deep equality over the JSON shapes a record can hold. */
export function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * A unified diff between two texts.
 *
 * A small LCS. Records here are tens of lines, so the quadratic table is
 * cheaper than a dependency, and a reviewer reading a patch about a beach
 * closure should not have to trust a transitive package to have rendered it
 * honestly.
 */
export function unifiedDiff(beforeText, afterText, { path, context = 3 } = {}) {
  const before = beforeText.split('\n');
  const after = afterText.split('\n');

  const lcs = Array.from({ length: before.length + 1 }, () => new Array(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  /** [op, text] with op in ' ', '-', '+'. */
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push([' ', before[i]]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push(['-', before[i]]);
      i += 1;
    } else {
      ops.push(['+', after[j]]);
      j += 1;
    }
  }
  while (i < before.length) ops.push(['-', before[i++]]);
  while (j < after.length) ops.push(['+', after[j++]]);

  const changed = ops.map((op) => op[0] !== ' ');
  if (!changed.some(Boolean)) return '';

  // Group changed lines into hunks with `context` unchanged lines either side.
  const keep = new Array(ops.length).fill(false);
  for (const [index, isChanged] of changed.entries()) {
    if (!isChanged) continue;
    for (let k = Math.max(0, index - context); k <= Math.min(ops.length - 1, index + context); k += 1) {
      keep[k] = true;
    }
  }

  const lines = [`--- a/${path}`, `+++ b/${path}`];
  let beforeLine = 1;
  let afterLine = 1;
  let cursor = 0;
  while (cursor < ops.length) {
    if (!keep[cursor]) {
      if (ops[cursor][0] !== '+') beforeLine += 1;
      if (ops[cursor][0] !== '-') afterLine += 1;
      cursor += 1;
      continue;
    }
    const startBefore = beforeLine;
    const startAfter = afterLine;
    const body = [];
    let countBefore = 0;
    let countAfter = 0;
    while (cursor < ops.length && keep[cursor]) {
      const [op, text] = ops[cursor];
      body.push(`${op}${text}`);
      if (op !== '+') {
        beforeLine += 1;
        countBefore += 1;
      }
      if (op !== '-') {
        afterLine += 1;
        countAfter += 1;
      }
      cursor += 1;
    }
    lines.push(`@@ -${startBefore},${countBefore} +${startAfter},${countAfter} @@`);
    lines.push(...body);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Plan the edit an accepted proposal describes.
 *
 * Returns `{ ok: true, path, before, after, diff }` or a refusal naming the
 * rule that stopped it. It never throws on a refusal, because a caller
 * processing a queue has to be able to report every one rather than stopping
 * at the first.
 *
 * `recordText` is the file exactly as it is on disk, read by the caller.
 * `decision` is the standing ledger line, or null.
 */
export function planEdit({ proposal, decision, recordPath, recordText }) {
  const standing = acceptability(proposal);
  if (!standing.acceptable) return refusal(standing.code, standing.why);

  // Belt and braces over the guard. acceptability already ran it; running it
  // again here means a future caller that builds a proposal by some other
  // route still cannot get a check date or a licence past this point.
  const guard = refuse({
    path: proposal?.change?.field,
    to: proposal?.change?.proposedValue,
    sources: [{ url: proposal?.read?.sourceUrl, digest: proposal?.read?.sourceDigest }],
  });
  if (guard) return refusal(guard.rule, guard.why);

  if (!decision) {
    return refusal(
      'undecided',
      'no decision is recorded for this proposal. A patch is prepared from an acceptance, ' +
        'never from a proposal on its own.'
    );
  }
  if (decision.action !== 'accept') {
    return refusal('rejected-by-editor', `this proposal was rejected by ${decision.by}`);
  }
  if (!decision.by || !decision.readUrl) {
    return refusal(
      'unattributed-acceptance',
      'the recorded acceptance does not name both who took it and what they read'
    );
  }
  if (decision.sourceDigest && proposal.read?.sourceDigest && decision.sourceDigest !== proposal.read.sourceDigest) {
    return refusal(
      'source-moved',
      'the page has changed since this decision was taken, so the acceptance no longer covers ' +
        'what the source says. Re-run the loop and review the new proposal.'
    );
  }

  if (!recordPath.endsWith('.json')) {
    return refusal(
      'unsupported-record',
      `${recordPath} is not a JSON record. Prose and frontmatter are edited by a person with ` +
        'their own judgement about the sentence, not by a patch composed from a field path.'
    );
  }

  const segments = segmentsOf(proposal.change?.field);
  if (!segments) return refusal('unreadable-field-path', `cannot read the field path ${proposal.change?.field}`);

  let data;
  try {
    data = JSON.parse(recordText);
  } catch (error) {
    return refusal('unparseable-record', `${recordPath} is not valid JSON: ${error.message}`);
  }

  const onDisk = valueAt(data, segments);
  const expected = proposal.change?.currentValue ?? null;
  if (!sameValue(onDisk ?? null, expected)) {
    return refusal(
      'record-moved',
      `${recordPath} no longer holds the value this proposal was composed against, so applying ` +
        'it would revert whatever changed it. Re-run the loop.'
    );
  }
  if (sameValue(onDisk ?? null, proposal.change?.proposedValue ?? null)) {
    return refusal('already-applied', 'the record already holds the proposed value');
  }

  const after = withValueAt(data, segments, proposal.change.proposedValue);
  const beforeText = recordText;
  const afterText = `${JSON.stringify(after, null, 2)}\n`;
  const diff = unifiedDiff(beforeText, afterText, { path: recordPath });
  if (diff.length === 0) {
    return refusal('no-op', 'the edit produces no change to the file');
  }

  return { ok: true, path: recordPath, before: beforeText, after: afterText, diff };
}

/**
 * The patch file a person applies.
 *
 * The header is not decoration. A patch that arrives without the claim it
 * came from, the page it was read from, the rank that page held and the name
 * of the person who accepted it is a diff somebody has to go and research
 * before they dare run it, and a reviewer who has to research a patch will
 * eventually stop reading and just run it.
 */
export function renderPatch({ proposal, decision, plan }) {
  const lines = [];
  const push = (text = '') => lines.push(text);

  push(`# PI-006 proposal ${proposal.proposalId}`);
  push('#');
  push(`# Claim          ${proposal.claim.claimId}`);
  push(`# Kind of fact   ${proposal.claim.classLabel} (${proposal.claim.claimClass})`);
  push(`# Field          ${proposal.change.field}`);
  push(`# Now            ${JSON.stringify(proposal.change.currentValue ?? null)}`);
  push(`# Proposed       ${JSON.stringify(proposal.change.proposedValue ?? null)}`);
  push(`# Read from      ${proposal.read.sourceUrl}`);
  push(`# Read on        ${proposal.read.fetchedAt}`);
  push(`# Page digest    ${proposal.read.sourceDigest}`);
  push(`# Publisher      ${proposal.read.publisherLabel} (${proposal.read.publisherKind})`);
  push(`# Precedence     ${proposal.read.precedenceSummary}`);
  push(`# Critic         ${proposal.critic.verdict}: ${proposal.critic.why}`);
  push(`# Accepted by    ${decision.by} on ${decision.decidedAt}`);
  push(`# They read      ${decision.readUrl}`);
  if (decision.note) push(`# Their note     ${decision.note}`);
  push('#');
  push('# Nothing has applied this. Read it, then apply it yourself:');
  push('#');
  push('#   git apply <this file>');
  push('#');
  push(lines.length > 0 ? '' : '');
  push(plan.diff.trimEnd());
  push('');

  return lines.join('\n');
}
