/**
 * Tests for the PI-005 Stage 3 claim-support gate.
 *
 * The gate runs inside `npm run build`, so a false failure blocks every deploy
 * and a false pass lets the site assert a fact the registry says nothing
 * stands behind. Both directions are asserted here.
 *
 * TWO RULES GOVERN THIS FILE.
 *
 * 1. Nothing here asserts today's corpus. An earlier test in this repo
 *    hardcoded the three claim classes that happened to carry no evidence the
 *    day it was written; the first pilot sourced all three, and a real
 *    improvement to the data turned into a failing build on main
 *    (commit dfa37b0, "assert the blind-spot contract, not the corpus"). Every
 *    expectation below is computed at runtime from src/data/source-precedence.json
 *    and from the evidence index, so the assertions hold whatever the corpus
 *    contains and get stronger, never redder, as it improves.
 *
 * 2. Nothing the gate asserts may move with the calendar. That is the whole
 *    design of the script and it is tested directly: the same tree audited
 *    with --today set a decade apart must produce byte-identical gated output
 *    and the same exit code.
 */

import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  loadRegistry,
  structuralFailures,
  supportByClass,
  timeDependentReport,
} from './audit-claim-support.mjs';
import { indexEvidenceByClaim } from '../src/lib/claim-state.mjs';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-claim-support.mjs', import.meta.url));
const NEXT = path.dirname(fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, ''));
const BASELINE = path.join(NEXT, '..', 'ops', 'baselines', 'claim-support-baseline.json');

/* ------------------------------------------------------------------ */
/* Fixture harness                                                      */
/* ------------------------------------------------------------------ */

const PRECEDENCE = {
  version: 1,
  defaultExpiryDays: 90,
  publisherKinds: ['venue-site', 'gov', 'unknown'],
  classes: {
    'opening-hours': { expiryDays: 90, precedence: ['venue-site', 'gov', 'unknown'] },
    'access-restriction': { expiryDays: 30, precedence: ['gov', 'venue-site', 'unknown'] },
  },
};

const claim = (id, claimClass, extra = {}) => {
  const [type, slug] = id.split('/');
  const subject = { type, slug, field: 'x' };
  return { claimId: id, claimClass, subject, statement: 'A sentence.', assertedBy: [subject], createdAt: '2020-01-01', ...extra };
};

const row = (id, claimId, extra = {}) => ({
  evidenceId: id,
  claim: claimId,
  stance: 'supports',
  publisher: { kind: 'venue-site' },
  url: 'https://example.test/',
  retrievedAt: '2020-01-01',
  expiresAt: '2020-04-01',
  ...extra,
});

/**
 * Build a fixture registry on disk and run the CLI over it.
 *
 *   claims / evidence  arrays of records; each is written at its own id path
 *   ceilings           the ratchet baseline, or null for no baseline file
 */
async function audit({ claims = [], evidence = [], ceilings = {}, baseline = true, today, assertMode = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi005-support-'));
  try {
    const root = path.join(dir, 'project');
    for (const record of claims) {
      const file = path.join(root, 'src', 'content', 'claims', `${record.claimId}.json`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(record, null, 2));
    }
    for (const record of evidence) {
      const file = path.join(root, 'src', 'content', 'evidence', `${record.evidenceId}.json`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(record, null, 2));
    }
    const precedenceFile = path.join(root, 'src', 'data', 'source-precedence.json');
    await mkdir(path.dirname(precedenceFile), { recursive: true });
    await writeFile(precedenceFile, JSON.stringify(PRECEDENCE, null, 2));

    const baselinePath = path.join(dir, 'baseline.json');
    if (baseline) await writeFile(baselinePath, JSON.stringify({ ceilings }, null, 2));

    const jsonOut = path.join(dir, 'report.json');
    const args = [SCRIPT, '--project-root', root, '--baseline', baselinePath, '--json', jsonOut];
    if (assertMode) args.push('--assert');
    if (today) args.push('--today', today);

    let code = 0;
    let out = '';
    try {
      const result = await run(process.execPath, args);
      out = result.stdout;
    } catch (error) {
      code = error.code ?? 1;
      out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    let report = null;
    try {
      report = JSON.parse(await readFile(jsonOut, 'utf8'));
    } catch {
      report = null;
    }
    return { code, out, report };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/* The rule the gate enforces                                           */
/* ------------------------------------------------------------------ */

test('a claim with no supporting evidence fails a class the baseline does not list', async () => {
  const { code, out } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    ceilings: {},
  });
  assert.equal(code, 1);
  assert.match(out, /opening-hours: 1 claim\(s\) with no supporting evidence/);
  assert.match(out, /new to the baseline/);
});

test('the same claim passes once a supporting evidence row is attached', async () => {
  const { code, out } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    evidence: [row('venues/a/opening-hours-operator-2026-01-01', 'venues/a/opening-hours')],
    ceilings: {},
  });
  assert.equal(code, 0);
  assert.match(out, /PASS: no new unsupported claims/);
});

test('a class may not grow past its ceiling, and may sit at it', async () => {
  const two = {
    claims: [claim('venues/a/opening-hours', 'opening-hours'), claim('venues/b/opening-hours', 'opening-hours')],
  };
  assert.equal((await audit({ ...two, ceilings: { 'opening-hours': 2 } })).code, 0);
  assert.equal((await audit({ ...two, ceilings: { 'opening-hours': 1 } })).code, 1);
});

test('a disputing row is not support, so a claim carrying only disputes stays unbacked', async () => {
  const { code, report } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    evidence: [
      row('venues/a/opening-hours-operator-2026-01-01', 'venues/a/opening-hours', { stance: 'disputes' }),
    ],
    ceilings: {},
  });
  assert.equal(code, 1);
  const bucket = report.support.find((entry) => entry.claimClass === 'opening-hours');
  assert.equal(bucket.unbacked, 1);
  assert.equal(bucket.disputed, 1);
  // Unevidenced and unbacked are different facts, and the report keeps them apart:
  // "nobody looked" is not "somebody looked and disagreed".
  assert.equal(bucket.unevidenced, 0);
});

test('superseded support does not back a claim, and superseding is a pointer rather than a date', async () => {
  const { code } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    evidence: [
      row('venues/a/opening-hours-old', 'venues/a/opening-hours', { supersededBy: 'venues/a/opening-hours-new' }),
      row('venues/a/opening-hours-new', 'venues/a/opening-hours', { stance: 'disputes' }),
    ],
    ceilings: {},
  });
  assert.equal(code, 1);
});

/* ------------------------------------------------------------------ */
/* The constraint: nothing asserted may move with the calendar          */
/* ------------------------------------------------------------------ */

test('the gated result is identical a decade apart, and long-expired evidence still backs its claim', async () => {
  const corpus = {
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    // Expired in 2020. If expiry reached the gate, this build would have started
    // failing on 2 April 2020 with no commit in between.
    evidence: [row('venues/a/opening-hours-operator-2020-01-01', 'venues/a/opening-hours')],
    ceilings: {},
  };

  const past = await audit({ ...corpus, today: '2020-01-02' });
  const future = await audit({ ...corpus, today: '2030-01-02' });

  assert.equal(past.code, 0, 'an expired row must not fail the gate');
  assert.equal(future.code, 0);
  assert.deepEqual(past.report.support, future.report.support);
  assert.deepEqual(past.report.totals, future.report.totals);

  // And the two runs genuinely saw different calendars: the reported half moved.
  assert.equal(past.report.reportedOnly.expiredEvidenceRows, 0);
  assert.equal(future.report.reportedOnly.expiredEvidenceRows, 1);
  assert.equal(past.report.reportedOnly.states.supported, 1);
  assert.equal(future.report.reportedOnly.states.unsupported, 1);
});

test('no gated field of the real registry changes when the run date changes', async () => {
  const registry = await loadRegistry(NEXT);
  const gated = supportByClass(registry);
  const early = timeDependentReport(registry, '2000-01-01');
  const late = timeDependentReport(registry, '2099-01-01');

  // The gated measure is computed without a date at all - it has no parameter
  // one could arrive through. This asserts the reported half really is the
  // half that moves, so the previous assertion is not vacuous.
  assert.deepEqual(gated, supportByClass(registry));
  assert.notDeepEqual(early.states, late.states);
  assert.ok(late.expiredEvidenceRows >= early.expiredEvidenceRows);
});

/* ------------------------------------------------------------------ */
/* Structural integrity: hard failure, no baseline to hide behind       */
/* ------------------------------------------------------------------ */

test('evidence attached to a claim that does not exist fails however generous the baseline', async () => {
  const { code, out } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    evidence: [row('venues/a/opening-hours-operator-2026-01-01', 'venues/ghost/opening-hours')],
    ceilings: { 'opening-hours': 999, 'access-restriction': 999 },
  });
  assert.equal(code, 1);
  assert.match(out, /structurally broken/);
  assert.match(out, /attached to claim 'venues\/ghost\/opening-hours', which does not exist/);
});

test('--update-baseline cannot launder a structural failure', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi005-structural-'));
  try {
    const root = path.join(dir, 'project');
    const bad = claim('venues/a/opening-hours', 'opening-hours');
    const file = path.join(root, 'src', 'content', 'claims', 'venues', 'a', 'somewhere-else.json');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(bad, null, 2));
    const precedenceFile = path.join(root, 'src', 'data', 'source-precedence.json');
    await mkdir(path.dirname(precedenceFile), { recursive: true });
    await writeFile(precedenceFile, JSON.stringify(PRECEDENCE, null, 2));

    const baselinePath = path.join(dir, 'baseline.json');
    let code = 0;
    let out = '';
    try {
      const result = await run(process.execPath, [
        SCRIPT, '--project-root', root, '--baseline', baselinePath, '--update-baseline',
      ]);
      out = result.stdout;
    } catch (error) {
      code = error.code ?? 1;
      out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    assert.equal(code, 1);
    assert.match(out, /does not match its path/);
    await assert.rejects(() => readFile(baselinePath, 'utf8'), 'no baseline may be written');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a claim class the precedence table does not define is a structural failure', async () => {
  const { code, out } = await audit({
    claims: [claim('venues/a/invented', 'invented')],
    ceilings: { invented: 999 },
  });
  assert.equal(code, 1);
  assert.match(out, /is not defined in source-precedence\.json/);
});

test('a missing baseline fails closed under --assert', async () => {
  const { code, out } = await audit({
    claims: [claim('venues/a/opening-hours', 'opening-hours')],
    evidence: [row('venues/a/opening-hours-operator-2026-01-01', 'venues/a/opening-hours')],
    baseline: false,
  });
  assert.equal(code, 1);
  assert.match(out, /cannot read baseline/);
});

/* ------------------------------------------------------------------ */
/* The real registry: contracts, computed at runtime                    */
/* ------------------------------------------------------------------ */

test('the real registry is structurally sound', async () => {
  const registry = await loadRegistry(NEXT);
  assert.deepEqual(structuralFailures(registry), []);
});

test('every class the gate reports is either defined by the table or present on disk', async () => {
  const registry = await loadRegistry(NEXT);
  const defined = new Set(Object.keys(registry.precedence.classes));
  const onDisk = new Set(registry.claims.map((entry) => entry.claimClass));
  const reported = new Set(supportByClass(registry).map((entry) => entry.claimClass));

  for (const name of defined) assert.ok(reported.has(name), `${name} is defined and must be reported`);
  for (const name of onDisk) assert.ok(reported.has(name), `${name} is on disk and must be reported`);
  for (const name of reported) {
    assert.ok(defined.has(name) || onDisk.has(name), `${name} is reported but exists nowhere`);
  }
});

test('the unbacked count is recomputed here and agrees with the gate', async () => {
  const registry = await loadRegistry(NEXT);
  const byClaim = indexEvidenceByClaim(registry.evidence);

  // Independent recomputation of the rule, from the evidence index, taking
  // nothing from the script under test but the corpus it read.
  const expected = new Map();
  for (const entry of registry.claims) {
    const standing = (byClaim.get(entry.claimId) ?? []).filter((r) => !r.supersededBy);
    const backed = standing.some((r) => (r.stance ?? 'supports') === 'supports');
    if (backed) continue;
    expected.set(entry.claimClass, (expected.get(entry.claimClass) ?? 0) + 1);
  }

  for (const bucket of supportByClass(registry)) {
    assert.equal(bucket.unbacked, expected.get(bucket.claimClass) ?? 0, bucket.claimClass);
    assert.equal(bucket.unbackedIds.length, bucket.unbacked, bucket.claimClass);
  }
});

test('the committed baseline covers the corpus, and carries no ceiling for a class that no longer exists', async () => {
  const registry = await loadRegistry(NEXT);
  const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  const ceilings = baseline.ceilings ?? {};
  const defined = new Set(Object.keys(registry.precedence.classes));

  for (const name of Object.keys(ceilings)) {
    assert.ok(defined.has(name), `${name} has a ceiling but the precedence table no longer defines it`);
  }
  // The committed baseline must already admit the committed corpus, or the
  // build is red for everyone on main.
  for (const bucket of supportByClass(registry)) {
    assert.ok(
      bucket.unbacked <= (ceilings[bucket.claimClass] ?? 0),
      `${bucket.claimClass}: ${bucket.unbacked} unbacked exceeds committed ceiling ${ceilings[bucket.claimClass] ?? 0}`
    );
  }
  // Deliberately NOT asserted: that each ceiling equals the current count.
  // A ceiling is a ceiling. Sourcing one accessibility claim would drop that
  // class below its ceiling, and a test demanding equality would turn that
  // improvement into a red build - the exact failure this file's header
  // records happening twice already. Tightening the baseline is a deliberate
  // act, not a precondition for making the data better.
});

test('blind spots name every unevidenced class and no evidenced one', async () => {
  const registry = await loadRegistry(NEXT);
  const byClaim = indexEvidenceByClaim(registry.evidence);

  // Same contract as verification-loop.test.mjs, restated for this report:
  // the assertion is about the rule, so sourcing a class improves the corpus
  // and leaves this test green.
  const evidenced = new Set();
  for (const entry of registry.claims) {
    if ((byClaim.get(entry.claimId) ?? []).length > 0) evidenced.add(entry.claimClass);
  }
  const named = new Set(timeDependentReport(registry, '2026-09-13').blindSpots);

  for (const name of named) assert.ok(!evidenced.has(name), `${name} has evidence and is not a blind spot`);
  for (const name of Object.keys(registry.precedence.classes)) {
    if (!evidenced.has(name)) assert.ok(named.has(name), `${name} has no evidence and must be named`);
  }
});

test('the gate runs over the real registry and passes against the committed baseline', async () => {
  const { stdout } = await run(process.execPath, [SCRIPT, '--assert']);
  assert.match(stdout, /PASS: no new unsupported claims/);
});
