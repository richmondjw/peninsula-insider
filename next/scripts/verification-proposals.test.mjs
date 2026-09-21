/**
 * Tests for the PI-006 proposal and editorial approval loop.
 *
 * WHAT THESE ASSERT, AND WHAT THEY DELIBERATELY DO NOT
 * ----------------------------------------------------
 * Every test here asserts a RULE. None asserts today's corpus, today's date,
 * or today's precedence table.
 *
 * That is not a style preference, it is a scar. Three tests were removed from
 * this repository the day before this file was written, each breaking the same
 * rule a different way: one pinned to a literal date, one demanded the corpus
 * contain a particular record, and one asserted that random draws never
 * collide. All three were measuring the world rather than the code, and all
 * three failed on a day nobody chose, for a reason no commit could clear.
 *
 * So the precedence tests read the table and assert that the proposal reports
 * what the table says, whatever it says. If somebody reorders it tomorrow
 * these still pass, and they still catch a module that reorders it quietly.
 * The date tests pin a fixed date on both runs and assert the two agree, which
 * is an assertion about determinism rather than about the calendar.
 *
 * THE ONE THAT MATTERS MOST
 * -------------------------
 * "the whole loop, driven to the point of applying an accepted proposal,
 * changes no byte of the content tree" is the negative test. It does not check
 * that nothing was attempted. It drives the tool all the way through a
 * proposal it is willing to prepare, confirms a patch came out, and then
 * hashes every content and data file to prove the records are untouched. A
 * test that only proved the tool did nothing would pass just as well against a
 * tool that was broken.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  acceptability,
  auditGaps,
  buildProposals,
  precedencePosition,
  precedenceSummary,
  proposalId,
  publisherLabel,
} from './verification-loop/proposal.mjs';
import {
  agreementProfile,
  buildDecision,
  latestDecision,
  parseLedger,
  serialiseDecision,
} from './verification-loop/decisions.mjs';
import {
  currentValueHolds,
  planEdit,
  renderPatch,
  segmentsOf,
  styleOf,
  unifiedDiff,
  valueAt,
  withValueAt,
} from './verification-loop/apply.mjs';
import { appendReport } from './verification-loop/report.mjs';
import { contentManifest, manifestDiff, runChecks } from './verification-loop/checks.mjs';
import { recordPathFor } from './apply-proposals.mjs';

const run = promisify(execFile);
const NEXT = path.dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
const LOOP = path.join(NEXT, 'scripts', 'run-verification-loop.mjs');
const REVIEW = path.join(NEXT, 'scripts', 'review-proposals.mjs');
const APPLY = path.join(NEXT, 'scripts', 'apply-proposals.mjs');
const FIXTURES = path.join(NEXT, 'scripts', 'verification-loop', 'fixtures', 'seeded-failures');
const PRECEDENCE_FILE = path.join(NEXT, 'src', 'data', 'source-precedence.json');

/** A fixed date on every run. See the header: the calendar is not under test. */
const TODAY = '2026-09-13';
const DECIDED_AT = '2026-09-13T09:00:00.000Z';

/** A scratch tree whose reports directory the guarded writer will accept. */
async function scratch() {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi006-proposals-'));
  const reports = path.join(dir, 'ops', 'reports', 'verification');
  await mkdir(reports, { recursive: true });
  return { dir, reports, proposals: path.join(reports, 'proposals.json'), ledger: path.join(reports, 'decisions.jsonl'), patches: path.join(reports, 'patches') };
}

/** Run the loop over the seeded fixture corpus, emitting proposals. */
async function fixtureProposals({ today = TODAY } = {}) {
  const space = await scratch();
  await run(process.execPath, [
    LOOP,
    '--next-dir', FIXTURES,
    '--fixtures', FIXTURES,
    '--today', today,
    '--limit', '50',
    '--json', path.join(space.reports, 'run.json'),
    '--proposals', space.proposals,
    '--proposals-md', path.join(space.reports, 'proposals.md'),
  ]);
  const bundle = JSON.parse(await readFile(space.proposals, 'utf8'));
  const runReport = JSON.parse(await readFile(path.join(space.reports, 'run.json'), 'utf8'));
  return { space, bundle, proposals: bundle.proposals, run: runReport };
}

let cached = null;
const fixture = async () => (cached ??= await fixtureProposals());

const precedence = async () => JSON.parse(await readFile(PRECEDENCE_FILE, 'utf8'));

/** The first proposal the loop is willing to carry to a decision. */
const decidable = (proposals) => proposals.find((item) => item.acceptability?.acceptable);

/* ------------------------------------------------------------------ */
/* The proposal answers the seven questions                            */
/* ------------------------------------------------------------------ */

test('a proposal records what was actually read, not just what is proposed', async () => {
  const { proposals } = await fixture();
  assert.ok(proposals.length > 0, 'the seeded corpus should compose at least one change');

  for (const proposal of proposals) {
    // The seven a reviewer cannot decide without.
    assert.ok(proposal.claim.claimId, 'claim');
    assert.ok(
      Object.prototype.hasOwnProperty.call(proposal.change, 'currentValue'),
      'current value must be present as a key even when it is false or null'
    );
    assert.notEqual(proposal.change.proposedValue, undefined, 'proposed value');
    assert.match(proposal.read.sourceUrl, /^https?:\/\//, 'source URL');
    assert.match(proposal.read.fetchedAt, /^\d{4}-\d{2}-\d{2}T/, 'date fetched');
    assert.ok(proposal.read.publisherKind, 'publisher kind');
    assert.notEqual(proposal.read.precedence.rank, undefined, 'precedence rank');
    // And the thing that makes it auditable rather than merely cited.
    assert.ok(proposal.read.sourceDigest, 'the digest of the page that was read');
    assert.deepEqual(auditGaps(proposal), []);
  }
});

test('every field an audit needs is named individually when it goes missing', async () => {
  const { proposals } = await fixture();
  const good = proposals[0];
  const cases = [
    ['read.sourceUrl', (copy) => { copy.read.sourceUrl = null; }],
    ['read.fetchedAt', (copy) => { copy.read.fetchedAt = ''; }],
    ['read.sourceDigest', (copy) => { copy.read.sourceDigest = null; }],
    ['read.publisherKind', (copy) => { copy.read.publisherKind = ''; }],
    ['claim.claimId', (copy) => { copy.claim.claimId = null; }],
    ['change.currentValue', (copy) => { delete copy.change.currentValue; }],
  ];
  for (const [field, break_] of cases) {
    const copy = structuredClone(good);
    break_(copy);
    assert.deepEqual(auditGaps(copy), [field], field);
    assert.equal(acceptability(copy).acceptable, false, field);
    assert.equal(acceptability(copy).code, 'unauditable', field);
  }
});

test('the deterministic gate fails a run carrying a proposal that cannot be audited', async () => {
  const { run: report } = await fixture();
  const before = new Map();
  const gutted = structuredClone(report);
  gutted.proposals[0].read.sourceUrl = null;

  const checks = runChecks({
    run: gutted,
    manifestBefore: before,
    manifestAfter: before,
    allowedUrls: new Set(),
  });
  const check = checks.find((row) => row.id === 'every-proposal-is-auditable');
  assert.equal(check.pass, false);
  assert.deepEqual(check.detail.offending, [gutted.proposals[0].proposalId]);

  // And it holds on the real run.
  assert.equal(
    report.checks.find((row) => row.id === 'every-proposal-is-auditable').pass,
    true
  );
  assert.equal(report.checks.find((row) => row.id === 'no-proposal-applies-itself').pass, true);
  assert.equal(
    report.checks.find((row) => row.id === 'every-proposal-states-its-precedence').pass,
    true
  );
});

/* ------------------------------------------------------------------ */
/* Precedence is reported, never corrected                             */
/* ------------------------------------------------------------------ */

test('the reported rank is the table position, for every class and every kind', async () => {
  const table = await precedence();
  for (const [claimClass, entry] of Object.entries(table.classes)) {
    const order = entry.precedence;
    for (const [index, kind] of order.entries()) {
      const position = precedencePosition(table, claimClass, kind);
      assert.equal(position.rank, index + 1, `${claimClass}/${kind}`);
      assert.equal(position.of, order.length, `${claimClass}/${kind}`);
      assert.equal(position.listed, true);
      // The order is passed through, not re-sorted. This is the assertion that
      // catches a module quietly "improving" the table.
      assert.deepEqual(position.order, order, claimClass);
      assert.deepEqual(position.outrankedBy, order.slice(0, index));
      assert.deepEqual(position.outranks, order.slice(index + 1));
    }
  }
});

test('a proposal states what its source outranks, so the ordering is visible rather than inherited', async () => {
  const table = await precedence();
  for (const [claimClass, entry] of Object.entries(table.classes)) {
    for (const kind of entry.precedence) {
      const position = precedencePosition(table, claimClass, kind);
      const summary = precedenceSummary(position);
      assert.match(summary, new RegExp(`${kind} ranks ${position.rank} of ${position.of}`));
      if (position.outranks.length > 0) {
        // Named in reader words, because "partner" and "a commercial partner
        // of ours" are the same fact and only one of them makes a reviewer
        // stop and think.
        assert.ok(
          summary.includes(publisherLabel(position.outranks[0])),
          `${claimClass}/${kind} should name what it is believed before`
        );
      }
      if (position.outrankedBy.length > 0) {
        assert.ok(
          summary.includes(publisherLabel(position.outrankedBy[0])),
          `${claimClass}/${kind} should name what it is believed after`
        );
      }
    }
  }
});

test('a publisher kind the table does not list for a class reads as a gap, not as last place', async () => {
  const table = await precedence();
  const position = precedencePosition(table, 'event-status', 'carrier-pigeon');
  assert.equal(position.listed, false);
  assert.equal(position.rank, null);
  assert.match(precedenceSummary(position), /no recorded standing/);
});

/* ------------------------------------------------------------------ */
/* What the loop will not carry to a person                            */
/* ------------------------------------------------------------------ */

test('a change the critic rejected is never offered as a decision', async () => {
  const { proposals } = await fixture();
  for (const proposal of proposals) {
    if (proposal.critic.verdict !== 'rejected') continue;
    assert.equal(proposal.acceptability.acceptable, false);
    assert.equal(proposal.acceptability.code, 'critic-rejected');
    // And the reason says what a person may still do, because a refusal that
    // leaves somebody with no route is a refusal they route around.
    assert.match(proposal.acceptability.why, /by hand/);
  }
});

test('a check date cannot become a decidable proposal even if one is injected directly', async () => {
  const { proposals } = await fixture();
  const base = decidable(proposals);
  assert.ok(base, 'the fixture should produce something decidable to mutate');

  for (const field of ['lastCheckedDate', 'lastVerified', 'images[0].reviewedAt', 'retrievedAt']) {
    const forged = structuredClone(base);
    forged.change.field = field;
    forged.change.proposedValue = '2026-09-13';
    const verdict = acceptability(forged);
    assert.equal(verdict.acceptable, false, field);
    assert.equal(verdict.code, 'no-check-date', field);
  }
});

test('a licence, a permission and an editorial verdict cannot become decidable proposals either', async () => {
  const { proposals } = await fixture();
  const base = decidable(proposals);
  for (const field of ['images[0].permission', 'licence', 'byline', 'rating']) {
    const forged = structuredClone(base);
    forged.change.field = field;
    forged.change.proposedValue = 'anything at all';
    const verdict = acceptability(forged);
    assert.equal(verdict.acceptable, false, field);
    assert.equal(verdict.code, 'no-rights-or-voice', field);
  }
});

test('a proposal id is stable across runs and moves when the page moves', async () => {
  // Determinism, not the calendar: two runs pinned to DIFFERENT dates over the
  // same corpus and the same canned pages must produce the same ids, because a
  // decision taken yesterday has to still point at the thing it was about.
  const first = await fixtureProposals({ today: '2026-09-13' });
  const second = await fixtureProposals({ today: '2026-11-02' });
  assert.deepEqual(
    first.proposals.map((item) => item.proposalId),
    second.proposals.map((item) => item.proposalId)
  );
  await rm(first.space.dir, { recursive: true, force: true });
  await rm(second.space.dir, { recursive: true, force: true });

  // And the digest is part of the id, so a source that changed cannot inherit
  // an approval given for what it used to say.
  const args = { claimId: 'a/b/c', field: 'cancelled', proposedValue: true };
  assert.notEqual(
    proposalId({ ...args, sourceDigest: 'one' }),
    proposalId({ ...args, sourceDigest: 'two' })
  );
  assert.equal(proposalId({ ...args, sourceDigest: 'one' }), proposalId({ ...args, sourceDigest: 'one' }));
});

/* ------------------------------------------------------------------ */
/* The decision ledger                                                 */
/* ------------------------------------------------------------------ */

test('a decision has to name who took it', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  assert.throws(
    () => buildDecision({ proposal, action: 'accept', by: '   ', readUrl: 'https://x.test', at: DECIDED_AT }),
    /name who took it/
  );
});

test('accepting has to name the page the person opened, and rejecting has to give a reason', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  assert.throws(
    () => buildDecision({ proposal, action: 'accept', by: 'Jane', at: DECIDED_AT }),
    /--read/
  );
  assert.throws(
    () => buildDecision({ proposal, action: 'reject', by: 'Jane', at: DECIDED_AT }),
    /--note/
  );
  const accepted = buildDecision({
    proposal,
    action: 'accept',
    by: 'Jane',
    readUrl: 'https://x.test',
    at: DECIDED_AT,
  });
  assert.equal(accepted.applied, false);
  assert.equal(accepted.sourceDigest, proposal.read.sourceDigest);
  assert.equal(accepted.precedenceRank, proposal.read.precedence.rank);
});

test('the ledger is append-only: the last decision stands and the earlier ones are still counted', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  const one = buildDecision({ proposal, action: 'accept', by: 'Jane', readUrl: 'https://x.test', at: DECIDED_AT });
  const two = buildDecision({ proposal, action: 'reject', by: 'Jane', note: 'thought again', at: DECIDED_AT });
  const text = serialiseDecision(one) + serialiseDecision(two);
  const { decisions, malformed } = parseLedger(text);

  assert.equal(malformed.length, 0);
  assert.equal(decisions.length, 2);
  assert.equal(latestDecision(decisions, proposal.proposalId).action, 'reject');

  const profile = agreementProfile(decisions);
  assert.equal(profile.decisionsRecorded, 2);
  assert.equal(profile.proposalsDecided, 1);
  assert.equal(profile.reversals, 1);
});

test('a line the ledger cannot read is kept as a failure rather than dropped', () => {
  const { decisions, malformed } = parseLedger('{"proposalId":"p-1"}\nnot json at all\n\n');
  assert.equal(decisions.length, 1);
  assert.equal(malformed.length, 1);
  assert.equal(malformed[0].line, 2);
});

test('the ledger writer refuses any path outside a reports directory', async () => {
  await assert.rejects(
    () => appendReport(path.join(NEXT, 'src', 'content', 'events', 'anything.json'), '{}\n'),
    /refusing to write outside a reports directory/
  );
});

/* ------------------------------------------------------------------ */
/* The apply stage                                                     */
/* ------------------------------------------------------------------ */

test('a patch is never prepared from a proposal alone', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  const plan = planEdit({
    proposal,
    decision: null,
    recordPath: 'next/src/content/events/x.json',
    recordText: '{}\n',
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, 'undecided');
});

test('a rejected proposal, an unattributed acceptance and a moved source are all refused', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  const recordPath = 'next/src/content/events/x.json';
  const recordText = `${JSON.stringify({ slug: 'x' }, null, 2)}\n`;

  const rejected = buildDecision({ proposal, action: 'reject', by: 'Jane', note: 'no', at: DECIDED_AT });
  assert.equal(planEdit({ proposal, decision: rejected, recordPath, recordText }).code, 'rejected-by-editor');

  const accepted = buildDecision({ proposal, action: 'accept', by: 'Jane', readUrl: 'https://x.test', at: DECIDED_AT });
  assert.equal(
    planEdit({ proposal, decision: { ...accepted, readUrl: null }, recordPath, recordText }).code,
    'unattributed-acceptance'
  );
  assert.equal(
    planEdit({ proposal, decision: { ...accepted, sourceDigest: 'something-else' }, recordPath, recordText }).code,
    'source-moved'
  );
});

test('a record that has moved since the proposal was composed is refused rather than reverted', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  const accepted = buildDecision({ proposal, action: 'accept', by: 'Jane', readUrl: 'https://x.test', at: DECIDED_AT });
  const segments = segmentsOf(proposal.change.field);

  // Somebody has already set the field to something else.
  const moved = withValueAt({ slug: 'x' }, segments, 'a value nobody proposed');
  const plan = planEdit({
    proposal,
    decision: accepted,
    recordPath: 'next/src/content/events/x.json',
    recordText: `${JSON.stringify(moved, null, 2)}\n`,
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, 'record-moved');

  // And the record already carrying the proposed value is a no-op, not an edit.
  const already = withValueAt({ slug: 'x' }, segments, proposal.change.proposedValue);
  assert.equal(
    planEdit({
      proposal,
      decision: accepted,
      recordPath: 'next/src/content/events/x.json',
      recordText: `${JSON.stringify(already, null, 2)}\n`,
    }).code,
    'already-applied'
  );
});

test('an absent field is compatible with a recorded current value of false or null, and nothing else', () => {
  assert.equal(currentValueHolds(undefined, false), true);
  assert.equal(currentValueHolds(undefined, null), true);
  assert.equal(currentValueHolds(undefined, 'open'), false);
  assert.equal(currentValueHolds(undefined, true), false);
  assert.equal(currentValueHolds('open', 'open'), true);
  assert.equal(currentValueHolds('open', 'closed'), false);
});

test('prose records are not patched from a field path', async () => {
  const { proposals } = await fixture();
  const proposal = decidable(proposals);
  const accepted = buildDecision({ proposal, action: 'accept', by: 'Jane', readUrl: 'https://x.test', at: DECIDED_AT });
  const plan = planEdit({
    proposal,
    decision: accepted,
    recordPath: 'next/src/content/quick-notes/a-note.md',
    recordText: '---\ntitle: A note\n---\n\nBody.\n',
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.code, 'unsupported-record');
});

test('field paths address arrays as arrays', () => {
  assert.deepEqual(segmentsOf('images[0].permission'), ['images', 0, 'permission']);
  assert.deepEqual(segmentsOf('cancelled'), ['cancelled']);
  const data = { images: [{ src: 'a' }, { src: 'b' }] };
  assert.equal(valueAt(data, segmentsOf('images[1].src')), 'b');
  const next = withValueAt(data, segmentsOf('images[1].src'), 'c');
  assert.equal(next.images[1].src, 'c');
  assert.equal(data.images[1].src, 'b', 'the original must not be mutated');
  assert.ok(Array.isArray(next.images));
});

test('the diff keeps the file formatting, so only the change shows', () => {
  const crlf = '{\r\n  "a": 1,\r\n  "b": 2\r\n}\r\n';
  const style = styleOf(crlf);
  assert.equal(style.eol, '\r\n');
  assert.equal(style.indent, '  ');
  assert.equal(style.trailingNewline, true);

  const diff = unifiedDiff('{\n  "a": 1,\n  "b": 2\n}\n', '{\n  "a": 1,\n  "b": 3\n}\n', { path: 'x.json' });
  const changed = diff.split('\n').filter((line) => /^[+-][^+-]/.test(line));
  assert.equal(changed.length, 2, 'one line out, one line in');
  assert.ok(diff.includes('-  "b": 2'));
  assert.ok(diff.includes('+  "b": 3'));
});

test('the patch the loop writes is one git itself accepts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi006-gitapply-'));
  try {
    await run('git', ['init', '-q'], { cwd: dir });
    const relative = 'record.json';
    const before = `${JSON.stringify({ slug: 'x', cancelled: false }, null, 2)}\n`;
    const after = `${JSON.stringify({ slug: 'x', cancelled: true }, null, 2)}\n`;
    await writeFile(path.join(dir, relative), before, 'utf8');

    const patch = renderPatch({
      proposal: {
        proposalId: 'p-test',
        claim: { claimId: 'a/b/c', claimClass: 'event-status', classLabel: 'Running, cancelled or postponed' },
        change: { field: 'cancelled', currentValue: false, proposedValue: true },
        read: {
          sourceUrl: 'https://x.test',
          fetchedAt: '2026-09-13T00:00:00.000Z',
          sourceDigest: 'abc',
          publisherKind: 'organiser',
          publisherLabel: 'The people running the event',
          precedenceSummary: 'organiser ranks 1 of 13 for event-status',
        },
        critic: { verdict: 'escalate', why: 'consequential' },
      },
      decision: { by: 'Jane', decidedAt: DECIDED_AT, readUrl: 'https://x.test', note: null },
      plan: { diff: unifiedDiff(before, after, { path: relative }) },
    });
    await writeFile(path.join(dir, 'change.patch'), patch, 'utf8');

    await run('git', ['apply', '--check', 'change.patch'], { cwd: dir });
    await run('git', ['apply', 'change.patch'], { cwd: dir });
    assert.equal(await readFile(path.join(dir, relative), 'utf8'), after);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a claim subject resolves to the record it is about', () => {
  assert.equal(
    recordPathFor({ subject: 'events/sorrento-lantern' }),
    'next/src/content/events/sorrento-lantern.json'
  );
  assert.equal(
    recordPathFor({ subject: 'quick-notes/2026-09-10-a-note' }),
    'next/src/content/quick-notes/2026-09-10-a-note.md'
  );
  assert.equal(
    recordPathFor({ subject: 'data-facts/tides/portsea' }),
    'next/src/data/facts/tides.json'
  );
  assert.equal(recordPathFor({ subject: 'nonsense' }), null);
});

/* ------------------------------------------------------------------ */
/* The negative test: nothing writes, all the way to the end           */
/* ------------------------------------------------------------------ */

test('the whole loop, driven to the point of applying an accepted proposal, changes no byte of the content tree', async () => {
  const { space, proposals } = await fixtureProposals();
  const proposal = decidable(proposals);
  assert.ok(proposal, 'the fixture must offer a proposal the loop would like to apply');

  // Both trees: the fixture corpus the proposal is about, and the real one.
  const fixturesBefore = await contentManifest(FIXTURES);
  const realBefore = await contentManifest(NEXT);

  await run(process.execPath, [
    REVIEW,
    '--proposals', space.proposals,
    '--ledger', space.ledger,
    '--accept', proposal.proposalId,
    '--by', 'A Test Editor',
    '--read', proposal.read.sourceUrl,
    '--at', DECIDED_AT,
  ]);

  const applied = await run(process.execPath, [
    APPLY,
    '--proposals', space.proposals,
    '--ledger', space.ledger,
    '--out', space.patches,
    '--next-dir', path.relative(path.resolve(NEXT, '..'), FIXTURES).replace(/\\/g, '/'),
  ]);

  // The tool got all the way to a patch. This is what makes the test a test:
  // a suite that only proved nothing happened would pass against a broken
  // tool as happily as against a correct one.
  assert.match(applied.stdout, /^prepared /m);
  const patch = await readFile(path.join(space.patches, `${proposal.proposalId}.patch`), 'utf8');
  assert.match(patch, /^--- a\//m);
  assert.match(patch, /Nothing has applied this/);
  assert.match(patch, /Accepted by {4}A Test Editor/);

  // And the records are untouched, byte for byte.
  assert.deepEqual(manifestDiff(fixturesBefore, await contentManifest(FIXTURES)), []);
  assert.deepEqual(manifestDiff(realBefore, await contentManifest(NEXT)), []);

  await rm(space.dir, { recursive: true, force: true });
});

test('review refuses to record an acceptance of a change the critic threw out', async () => {
  const { space, proposals } = await fixtureProposals();
  const blocked = proposals.find((item) => !item.acceptability?.acceptable);
  assert.ok(blocked, 'the seeded corpus should include a change the critic rejected');

  await assert.rejects(
    () =>
      run(process.execPath, [
        REVIEW,
        '--proposals', space.proposals,
        '--ledger', space.ledger,
        '--accept', blocked.proposalId,
        '--by', 'A Test Editor',
        '--read', 'https://x.test',
        '--at', DECIDED_AT,
      ]),
    (error) => {
      assert.match(error.stderr, /refusing to record an acceptance/);
      return true;
    }
  );

  // Nothing was written, so nothing downstream can find an acceptance to act on.
  await assert.rejects(() => readFile(space.ledger, 'utf8'), { code: 'ENOENT' });
  await rm(space.dir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */
/* The impossibility is structural                                     */
/* ------------------------------------------------------------------ */

test('report.mjs is the only module in the loop that names a filesystem write', async () => {
  const dir = path.join(NEXT, 'scripts', 'verification-loop');
  const modules = [
    'apply.mjs',
    'checks.mjs',
    'compose.mjs',
    'corpus.mjs',
    'critic.mjs',
    'decisions.mjs',
    'detect.mjs',
    'fetch-source.mjs',
    'loop.mjs',
    'proposal.mjs',
    'select.mjs',
  ];
  // Matched as identifiers so a sentence in a comment about writing cannot
  // fail the test, and a real call cannot pass it.
  const writes = /\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|truncate|copyFile|rename|unlink|rmdir|mkdtemp)\s*\(/;
  for (const name of modules) {
    const source = await readFile(path.join(dir, name), 'utf8');
    assert.equal(writes.test(source), false, `${name} must not call a filesystem write`);
  }
  assert.equal(writes.test(await readFile(path.join(dir, 'report.mjs'), 'utf8')), true);
});

test('apply.mjs imports nothing from node:fs, so it has no destination to be given', async () => {
  const source = await readFile(path.join(NEXT, 'scripts', 'verification-loop', 'apply.mjs'), 'utf8');
  assert.equal(/from '(?:node:)?fs/.test(source), false);
  assert.equal(/require\(['"](?:node:)?fs/.test(source), false);
});

test('the two commands write only through the guarded writer', async () => {
  for (const file of [REVIEW, APPLY]) {
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)].map(
      ([, names, from]) => ({ names: names.split(',').map((n) => n.trim()), from })
    );
    const fsImport = imports.find((entry) => /^node:fs/.test(entry.from));
    assert.deepEqual(
      fsImport?.names ?? [],
      ['readFile'],
      `${path.basename(file)} may read from node:fs and nothing more`
    );
    const writers = imports.find((entry) => entry.from.endsWith('report.mjs'));
    for (const name of writers?.names ?? []) {
      assert.ok(
        ['writeReport', 'appendReport'].includes(name),
        `${path.basename(file)} imports an unexpected writer: ${name}`
      );
    }
  }
});
