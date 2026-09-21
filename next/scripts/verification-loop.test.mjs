/**
 * Tests for the PI-006 report-only verification loop.
 *
 * PI-006's acceptance names five seeded failures: contradictory hours, changed
 * prices, cancelled events, unlicensed imagery and fabricated first-person
 * claims. Each one has a fixture in
 * scripts/verification-loop/fixtures/seeded-failures, and each has a test here
 * that proves the loop catches it. That is the actual deliverable of the
 * report-only stage, because it is the evidence the write-scope decision (D5)
 * will be taken on. A loop nobody has attacked is a loop nobody should trust
 * with a write.
 *
 * Two of the five are caught in different places, and the difference is the
 * design. Hours, rates and cancellations are things a page can contradict, so
 * the critic catches them by reading the page. A licence and a first-person
 * visit are things no page can establish, so the composer REFUSES to write
 * them, and the test asserts the refusal rather than a detection. A loop that
 * detected a missing licence and then filled one in would have failed in the
 * more dangerous direction.
 *
 * NOTHING HERE IS TIME-DRIVEN. Every run pins `--today`, and the fixtures carry
 * fixed dates. scripts/audit-event-safeguards.mjs explains why that matters:
 * a gate whose result changes with the calendar crosses its own threshold on a
 * day nobody chose, and blocks every deploy after it for a reason no deploy can
 * clear. These assertions hold on any day they are run.
 *
 * The check-date rule has a committed ancestor and this file does not
 * contradict it: seed-claim-registry.test.mjs asserts "expiry is computed from
 * the source date, never from the run date". Same principle, other end of the
 * pipe. There, a migration may not stamp today onto a row it inherited; here, a
 * fetch may not stamp today onto a record it merely reached.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { refuse, composePatch, FORBIDDEN_FIELDS } from './verification-loop/compose.mjs';
import { adjudicate, critique } from './verification-loop/critic.mjs';
import { createFetcher } from './verification-loop/fetch-source.mjs';
import { writeReport } from './verification-loop/report.mjs';
import { contentManifest, manifestDiff } from './verification-loop/checks.mjs';
import { selectWorklist } from './verification-loop/select.mjs';
import { loadCorpus } from './verification-loop/corpus.mjs';
import { scoreCorpus } from './verification-loop/select.mjs';

const run = promisify(execFile);
const NEXT = path.dirname(fileURLToPath(import.meta.url)).replace(/[\\/]scripts$/, '');
const SCRIPT = path.join(NEXT, 'scripts', 'run-verification-loop.mjs');
const FIXTURES = path.join(NEXT, 'scripts', 'verification-loop', 'fixtures', 'seeded-failures');
const TODAY = '2026-09-13';

/** Run the CLI over the seeded fixture corpus and return the JSON report. */
async function fixtureRun() {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi006-'));
  const out = path.join(dir, 'reports', 'run.json');
  await mkdir(path.dirname(out), { recursive: true });
  await run(process.execPath, [
    SCRIPT,
    '--next-dir', FIXTURES,
    '--fixtures', FIXTURES,
    '--today', TODAY,
    '--limit', '50',
    '--json', out,
  ]);
  const report = JSON.parse(await readFile(out, 'utf8'));
  await rm(dir, { recursive: true, force: true });
  return report;
}

let cached = null;
const report = async () => (cached ??= await fixtureRun());

const itemFor = (data, claimId) => data.items.find((item) => item.claimId === claimId);

/* ------------------------------------------------------------------ */
/* The five seeded failure classes                                      */
/* ------------------------------------------------------------------ */

test('seeded cancelled event: the loop reads the cancellation off the source and escalates it', async () => {
  const data = await report();
  const item = itemFor(data, 'events/sorrento-winter-lantern-festival/event-status');
  assert.equal(item.adjudication.outcome, 'contradicted');
  assert.equal(item.adjudication.confidence, 'high');
  assert.match(item.adjudication.quotes.join(' '), /cancelled/i);

  // The patch exists, and nothing applies it.
  const op = item.patch.ops.find((candidate) => candidate.path === 'cancelled');
  assert.ok(op, 'a cancelled:true op should be composed');
  assert.equal(op.to, true);
  assert.equal(op.applied, false);
  assert.ok(op.sources[0].digest, 'the op must cite the fetched artifact by digest');

  // Consequential, so a person decides rather than the loop.
  const verdict = item.verdicts.find((candidate) => candidate.path === 'cancelled');
  assert.equal(verdict.verdict, 'escalate');
  assert.ok(
    data.escalations.some((row) => row.subject === 'events/sorrento-winter-lantern-festival')
  );
});

test('seeded contradictory hours: recorded hours and the page disagree, and the loop says so', async () => {
  const data = await report();
  const item = itemFor(data, 'venues/the-old-pier-kitchen/opening-hours');
  assert.equal(item.adjudication.outcome, 'contradicted');
  assert.deepEqual(item.adjudication.detail.recorded, ['11:00-16:00']);
  assert.deepEqual(item.adjudication.detail.onPage, ['08:00-22:00']);

  // No patch. A page can tell you the two disagree; it cannot tell you which
  // is right, because the page may be the stale one.
  assert.equal(item.patch.ops.length, 0);
  const escalation = data.escalations.find((row) => row.subject === 'venues/the-old-pier-kitchen');
  assert.ok(escalation);
  assert.match(escalation.question, /Correct the record/);
});

test('seeded rate change: the loop reports that a rate moved and never what it moved to', async () => {
  const data = await report();
  const item = itemFor(data, 'venues/cape-schanck-boat-hire/rate-change');
  assert.equal(item.adjudication.outcome, 'contradicted');
  assert.match(item.adjudication.why, /a rate has moved/);

  // The seeded page carries two figures. Neither may appear anywhere in the
  // report, in any field, including a quote. This publication carries no
  // prices, and a committed report is a reader-facing surface.
  const serialised = JSON.stringify(data);
  assert.doesNotMatch(serialised, /(?:\$|AUD\s?|A\$)\s?\d/);
  assert.ok(!serialised.includes('140') || !serialised.includes('$140'));
  assert.equal(
    data.checks.find((check) => check.id === 'no-figures-in-the-report').pass,
    true
  );
});

test('seeded unlicensed imagery: the loop flags the assertion and refuses to invent the licence', async () => {
  const data = await report();

  // Detected: an image asserting it shows the venue, and listing the channels
  // it may run in, with no creator, source or permission recorded.
  const flagged = data.escalations.filter(
    (row) => row.kind === 'media' && row.subject === 'venues/the-lantern-room'
  );
  assert.equal(flagged.length, 2);
  assert.match(flagged.map((row) => row.why).join(' '), /no creator, source or permission/);
  assert.match(flagged.map((row) => row.why).join(' '), /no recorded permission/);

  // Refused: a researcher proposed reading the licence off the credit line.
  // A credit is display text and establishes nothing.
  const refusals = data.refusals.filter((row) => row.rule === 'no-rights-or-voice');
  assert.deepEqual(
    refusals.map((row) => row.field).sort(),
    ['images[0].creator', 'images[0].permission']
  );
  const ops = itemFor(data, 'venues/the-lantern-room/trading-status').patch.ops;
  assert.equal(ops.length, 0, 'no rights field may survive the guard');
});

test('seeded fabricated first-person claim: the composer refuses it and it never reaches a patch', async () => {
  const data = await report();
  const refusal = data.refusals.find((row) => row.rule === 'no-fabricated-experience');
  assert.ok(refusal, 'the guard must refuse a proposed first-person presence claim');
  assert.equal(refusal.field, 'dek');
  assert.match(refusal.why, /physically present/);

  const item = itemFor(data, 'quick-notes/2026-09-10-cellar-door-corridor-reopens/editorial');
  assert.equal(item.patch.ops.length, 0);

  // The refused sentence is summarised, never reprinted. A fabricated claim
  // quoted in full in a committed report is the claim, in the repository, one
  // copy-paste from publication.
  assert.ok(refusal.proposed.valuePreview.length <= 60);
});

/* ------------------------------------------------------------------ */
/* The check-date rule                                                  */
/* ------------------------------------------------------------------ */

test('a successful fetch never refreshes a check date', async () => {
  const data = await report();
  const item = itemFor(data, 'events/portsea-twilight-market/event-status');

  // The source was read and confirmed the record.
  assert.equal(item.artifact.reachability, 'ok');
  assert.equal(item.adjudication.outcome, 'confirmed');

  // A researcher proposed bumping lastCheckedDate on the strength of that
  // 200. The guard refused it, by name.
  const refusal = data.refusals.find((row) => row.field === 'lastCheckedDate');
  assert.ok(refusal);
  assert.equal(refusal.rule, 'no-check-date');
  assert.equal(item.patch.ops.length, 0);

  // Confirmation proposes an evidence row; it does not record one, and the
  // date it would carry is named as a consequence of acceptance rather than
  // written as a fact.
  assert.equal(item.proposedEvidence.length, 1);
  assert.equal(item.proposedEvidence[0].recorded, false);
  assert.equal(item.proposedEvidence[0].requiresHuman, true);
  assert.equal(item.proposedEvidence[0].retrievedAt, undefined);
  assert.equal(item.proposedEvidence[0].wouldCarryRetrievedAt, TODAY);

  for (const id of ['no-check-date-refreshed', 'no-evidence-row-recorded']) {
    assert.equal(data.checks.find((check) => check.id === id).pass, true, id);
  }
});

test('every check-date field name is refused, not just the one the fixture uses', () => {
  const dates = [
    'lastCheckedDate',
    'lastVerified',
    'lastReviewed',
    'verifiedAt',
    'checkedAt',
    'retrievedAt',
    'discoveredAt',
    'reviewedAt',
  ];
  for (const field of dates) {
    const refusal = refuse({ path: field, to: '2026-09-13', sources: [{ digest: 'x' }] });
    assert.ok(refusal, `${field} must be refused`);
    assert.equal(refusal.rule, 'no-check-date', field);
    assert.ok(FORBIDDEN_FIELDS.includes(field));
  }
  // And the same value on a nested path, so images[0].reviewedAt cannot slip
  // past a rule written against a bare field name.
  assert.equal(refuse({ path: 'images[0].reviewedAt', to: '2026-09-13' }).rule, 'no-check-date');
});

/* ------------------------------------------------------------------ */
/* The properties a write stage would have to keep                      */
/* ------------------------------------------------------------------ */

test('no content record is modified by anything the loop does', async () => {
  // Belt: the loop's own manifest check over the fixture corpus.
  const data = await report();
  const check = data.checks.find((row) => row.id === 'no-content-write');
  assert.equal(check.pass, true);
  assert.equal(check.detail.changed, 0);

  // Braces: an independent manifest of the REAL corpus, taken here rather than
  // by the code under test, across a full offline run over it.
  const before = await contentManifest(NEXT);
  const dir = await mkdtemp(path.join(tmpdir(), 'pi006-real-'));
  const out = path.join(dir, 'reports', 'offline.json');
  await mkdir(path.dirname(out), { recursive: true });
  await run(process.execPath, [
    SCRIPT, '--offline', '--today', TODAY, '--limit', '25', '--json', out,
  ]);
  const after = await contentManifest(NEXT);
  await rm(dir, { recursive: true, force: true });
  assert.deepEqual(manifestDiff(before, after), []);
});

test('the report writer refuses any path outside a reports directory', async () => {
  await assert.rejects(
    () => writeReport(path.join(NEXT, 'src', 'content', 'events', 'anything.json'), '{}'),
    /refusing to write outside a reports directory/
  );
});

test('the fetcher refuses a URL the corpus does not cite', async () => {
  const fetchSource = createFetcher({
    allowedUrls: new Set(['https://cited.example/one']),
    impl: async () => {
      throw new Error('the fetcher should never have got this far');
    },
  });
  await assert.rejects(
    () => fetchSource('https://not-cited.example/two'),
    /refusing to fetch a URL the corpus does not cite/
  );
});

test('unreachable, blocked and inconclusive are never verdicts about a claim', async () => {
  const data = await report();
  for (const [claimId, outcome] of [
    ['events/rye-pier-night-dive/event-status', 'unreachable'],
    ['events/flinders-folk-weekend/event-status', 'blocked'],
    ['events/balnarring-picnic-races/event-status', 'inconclusive'],
  ]) {
    const item = itemFor(data, claimId);
    assert.equal(item.adjudication.outcome, outcome, claimId);
    assert.equal(item.patch.ops.length, 0, claimId);
  }
  assert.equal(
    data.checks.find((check) => check.id === 'no-verdict-without-a-readable-source').pass,
    true
  );
});

test('the critic verifies against the source, not against the proposal', async () => {
  const data = await report();
  // The researcher proposed renaming the venue on the cancelled festival. The
  // organiser page never says it, so the critic threw it out even though the
  // guard had let it through.
  const item = itemFor(data, 'events/sorrento-winter-lantern-festival/event-status');
  const verdict = item.verdicts.find((row) => row.path === 'venueName');
  assert.equal(verdict.verdict, 'rejected');
  assert.match(verdict.why, /does not state what the proposed change asserts/);

  // And the report carries the rejection next to the proposal, so a reader
  // cannot mistake the patch table for a list of recommendations.
  const op = data.proposedOps.find((row) => row.path === 'venueName');
  assert.equal(op.verdict, 'rejected');
});

test('the critic sees the artifact and has no parameter a summary could arrive through', () => {
  const claim = { claimId: 'x/y/event-status', claimClass: 'event-status', subject: { slug: 'y' } };
  const record = { type: 'events', slug: 'y', data: { title: 'Tyabb Packing House Market' } };
  const artifact = {
    url: 'https://example.test/y',
    reachability: 'ok',
    digest: 'abc',
    contentType: 'text/html',
    text: '<p>The Tyabb Packing House Market is cancelled for 2026.</p>',
  };
  const adjudication = adjudicate({ claim, record, artifact });
  assert.equal(adjudication.outcome, 'contradicted');

  // A lie in the proposal cannot survive, because the critic never reads it.
  const patch = {
    ops: [
      {
        path: 'venueName',
        from: 'Old',
        to: 'A venue the page has never heard of',
        reason: 'the page says so',
        sources: [{ digest: 'abc' }],
      },
    ],
  };
  const verdicts = critique({ claim, record, patch, artifact });
  assert.equal(verdicts[0].verdict, 'rejected');
});

test('every escalation states a specific decision and what happens if nobody takes it', async () => {
  const data = await report();
  assert.ok(data.escalations.length > 0);
  for (const row of data.escalations) {
    assert.ok(row.question && row.question.length > 20, JSON.stringify(row));
    assert.ok(row.defaultIfNoAnswer && row.defaultIfNoAnswer.length > 10, JSON.stringify(row));
    assert.ok(row.why && row.why.length > 10, JSON.stringify(row));
  }
  assert.equal(
    data.checks.find((check) => check.id === 'every-escalation-states-a-question').pass,
    true
  );
});

test('the whole deterministic gate holds over the seeded corpus', async () => {
  const data = await report();
  const failed = data.checks.filter((check) => !check.pass);
  assert.deepEqual(failed.map((check) => check.id), []);
});

/* ------------------------------------------------------------------ */
/* Selection                                                            */
/* ------------------------------------------------------------------ */

test('selection is deterministic and spreads a batch across classes and hosts', async () => {
  const corpus = await loadCorpus({ nextDir: NEXT });
  const scored = scoreCorpus(corpus, TODAY);
  const first = selectWorklist(scored, { limit: 25 }).map((entry) => entry.claim.claimId);
  const second = selectWorklist(scoreCorpus(corpus, TODAY), { limit: 25 }).map(
    (entry) => entry.claim.claimId
  );
  assert.deepEqual(first, second, 'two runs over an unchanged corpus must pick the same batch');

  const classes = new Set(
    selectWorklist(scoreCorpus(corpus, TODAY), { limit: 25 }).map((entry) => entry.claim.claimClass)
  );
  assert.ok(classes.size >= 3, 'a batch of 25 drawn from this corpus should span several classes');
});

test('a claim whose subject no reader can reach stays out of the worklist', async () => {
  const corpus = await loadCorpus({ nextDir: NEXT });
  const scored = scoreCorpus(corpus, TODAY);
  const selected = new Set(selectWorklist(scored, { limit: 400 }).map((e) => e.claim.claimId));
  const unreachable = scored.filter((entry) => entry.exposure === 0);
  assert.ok(unreachable.length > 0, 'this corpus has lapsed and past-dated subjects');
  for (const entry of unreachable) {
    assert.equal(selected.has(entry.claim.claimId), false, entry.claim.claimId);
  }
});

/* ------------------------------------------------------------------ */
/* The gaps the loop must not paper over                                */
/* ------------------------------------------------------------------ */

test('a claim class with no evidence is reported as a blind spot, not as all-clear', async () => {
  const corpus = await loadCorpus({ nextDir: NEXT });
  const scored = scoreCorpus(corpus, TODAY);
  assert.ok(scored.length > 0);

  const dir = await mkdtemp(path.join(tmpdir(), 'pi006-blind-'));
  const out = path.join(dir, 'reports', 'offline.json');
  await mkdir(path.dirname(out), { recursive: true });
  await run(process.execPath, [
    SCRIPT, '--offline', '--today', TODAY, '--limit', '5', '--json', out,
  ]);
  const data = JSON.parse(await readFile(out, 'utf8'));
  await rm(dir, { recursive: true, force: true });

  // This asserts the contract, not the corpus. The first version hardcoded
  // the three classes that happened to be empty the day it was written, so
  // the first pilot to source one of them turned a real improvement into a
  // failing build. A test that breaks when the data gets better is measuring
  // the wrong thing.
  //
  // The contract: a class the precedence table defines, with no claim that
  // has evidence behind it, must be named. Silence there would read as a
  // clean bill of health when it is an absence of looking.
  const defined = Object.keys(corpus.precedence?.classes ?? {});
  const evidenced = new Set();
  for (const claim of corpus.claims) {
    if ((corpus.evidenceByClaim.get(claim.claimId) ?? []).length > 0) {
      evidenced.add(claim.claimClass);
    }
  }
  const named = new Set(data.blindSpots.map((row) => row.claimClass));

  // Nothing evidenced may be called a blind spot.
  for (const cls of named) {
    assert.ok(!evidenced.has(cls), `${cls} has evidence and must not be a blind spot`);
  }
  // Nothing unevidenced may be silently omitted.
  for (const cls of defined) {
    if (!evidenced.has(cls)) {
      assert.ok(named.has(cls), `${cls} has no evidence and must be named as a blind spot`);
    }
  }
  for (const row of data.blindSpots) assert.equal(row.evidence, 0);
});

test('the backlog is reported as a shape, and the worklist stays bounded under it', async () => {
  const data = await report();
  assert.ok(Object.keys(data.backlog.byAgeBand).length > 0);
  assert.ok(Object.keys(data.backlog.byConsequence).length > 0);
  assert.ok(data.worklist.selected <= data.worklist.limit);
});

/* ------------------------------------------------------------------ */
/* The guard, unit level                                                */
/* ------------------------------------------------------------------ */

test('the guard refuses an unsourced change even when the field is harmless', () => {
  const refusal = refuse({ path: 'summary', to: 'A perfectly ordinary sentence.' });
  assert.equal(refusal.rule, 'no-unsourced-change');
});

test('the guard refuses any composed value carrying a currency figure', () => {
  const refusal = refuse({
    path: 'summary',
    to: 'Entry is $25 on the door.',
    sources: [{ digest: 'x' }],
  });
  assert.equal(refusal.rule, 'no-figures');
});

test('the guard lets an evidenced, ordinary change through', () => {
  assert.equal(
    refuse({ path: 'summary', to: 'Doors open at six.', sources: [{ digest: 'x' }] }),
    null
  );
});

test('composePatch keeps the refusals rather than swallowing them', () => {
  const { ops, refusals } = composePatch({
    claim: { claimId: 'a/b/c' },
    drafts: [
      { path: 'summary', to: 'Doors open at six.', sources: [{ digest: 'x' }] },
      { path: 'lastVerified', to: '2026-09-13', sources: [{ digest: 'x' }] },
    ],
  });
  assert.equal(ops.length, 1);
  assert.equal(refusals.length, 1);
  assert.equal(refusals[0].claimId, 'a/b/c');
});
