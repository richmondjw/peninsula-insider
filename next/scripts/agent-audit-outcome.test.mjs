import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAudit, validDeployment } from './agent-audit-outcome.mjs';
import { runReadiness, executeStage, STAGE_TIMEOUTS } from './run-live-agent-readiness.mjs';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const before = { sourceSha: 'a'.repeat(40), runId: '100', generatedAt: '2026-11-17T00:00:00Z' };
const after = { sourceSha: 'b'.repeat(40), runId: '101', generatedAt: '2026-11-17T00:10:00Z' };
function report(changed = false, extra = []) {
  const details = changed ? [
    { message: 'directory snapshot', category: 'release-consistency' },
    { message: 'deployment changed', category: 'deployment-change' },
  ] : [];
  details.push(...extra);
  return { complete: true, deploymentBefore: before, deploymentAfter: changed ? after : before,
    failures: details.map(item => item.message), failureDetails: details, transport: { attempts: [{ status: 200 }] } };
}
const preflight = (deployment = before, failures = []) => ({ status: failures.length ? 2 : 0, report: { deployment, failures } });
const welcome = value => ({ status: value.failures.length ? 1 : 0, report: value });
function harness(results, expectedSha = '') {
  const calls = [];
  return { calls, result: runReadiness({ expectedSha, runStage: async (...args) => {
    calls.push(args); assert.ok(results.length, 'must not run an unplanned retry'); return results.shift();
  } }) };
}

test('stable complete evidence passes; a verified change is inconclusive', () => {
  assert.equal(classifyAudit(report()), 'passed');
  assert.equal(classifyAudit(report(true)), 'deployment-change-inconclusive');
  const rebuilt = report(true); rebuilt.deploymentAfter = { ...after, sourceSha: before.sourceSha };
  assert.equal(classifyAudit(rebuilt), 'deployment-change-inconclusive');
});
test('unchanged provenance does not permit retry of snapshot mismatches', () => {
  const value = report(true); value.deploymentAfter = before;
  assert.equal(classifyAudit(value), 'gate-failure');
});
for (const message of ['conditional 200', 'feed date stale', 'private route exposed', 'directory schema invalid', 'HTTP 503', 'unexpected source']) {
  test(`deployment change cannot hide ${message}`, async () => {
    const value = report(true, [{ message, category: 'gate-failure' }]);
    assert.equal(classifyAudit(value), 'deployment-change-with-other-failures');
    const h = harness([preflight(), welcome(value)]);
    assert.equal((await h.result).passed, false); assert.equal(h.calls.length, 2);
  });
}
test('recovered transport errors remain disqualifying for a fresh crawl', () => {
  for (const receipt of [{ status: 429 }, { status: 503 }, { error: 'network' }]) {
    const value = report(true); value.transport.attempts.push(receipt);
    assert.equal(classifyAudit(value), 'deployment-change-with-other-failures');
  }
});
test('partial, malformed and untagged evidence fails closed', () => {
  assert.equal(classifyAudit({ ...report(true), complete: false }), 'incomplete');
  for (const deployment of [null, {}, { ...before, sourceSha: 'short' }, { ...before, runId: '' }, { ...before, generatedAt: 'bad' }]) {
    assert.equal(validDeployment(deployment), false);
    assert.equal(classifyAudit({ ...report(true), deploymentAfter: deployment }), 'invalid-provenance');
  }
  assert.equal(classifyAudit({ ...report(true), failureDetails: [] }), 'invalid-evidence');
  assert.equal(classifyAudit({ ...report(true), failures: ['other', 'deployment changed'] }), 'invalid-evidence');
});
test('passing first audit runs only one full attempt', async () => {
  const h = harness([preflight(), welcome(report())]);
  assert.equal((await h.result).outcome, 'passed'); assert.equal(h.calls.length, 2);
});
test('missing or malformed transport evidence cannot pass or authorize retry', async () => {
  for (const transport of [undefined, null, {}, { attempts: null }, { attempts: {} },
    { attempts: 'missing' }, { attempts: [] }, { attempts: [null] }, { attempts: ['receipt'] }]) {
    for (const changed of [false, true]) {
      const value = { ...report(changed), transport };
      assert.equal(classifyAudit(value), 'invalid-evidence');
      const h = harness([preflight(), welcome(value)]);
      assert.equal((await h.result).passed, false);
      assert.equal(h.calls.length, 2);
    }
  }
});
test('verified change runs one fresh preflight and full audit, preserving original failure', async () => {
  const stable = { ...report(), deploymentBefore: after, deploymentAfter: after };
  const h = harness([preflight(), welcome(report(true)), preflight(after), welcome(stable)]);
  const result = await h.result;
  assert.equal(result.outcome, 'passed-after-deployment-change'); assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].welcome.report.failures.length, 2);
  assert.deepEqual(h.calls, [['provenance', 1, ''], ['welcome', 1, before.sourceSha], ['provenance', 2, ''], ['welcome', 2, after.sourceSha]]);
});
test('second deployment change cannot trigger a third attempt', async () => {
  const h = harness([preflight(), welcome(report(true)), preflight(), welcome(report(true))]);
  assert.equal((await h.result).passed, false); assert.equal(h.calls.length, 4);
});
test('stable successor with any failed gate remains failed', async () => {
  const failure = report(false, [{ message: 'conditional 200', category: 'gate-failure' }]);
  const h = harness([preflight(), welcome(report(true)), preflight(), welcome(failure)]);
  assert.equal((await h.result).outcome, 'gate-failure'); assert.equal(h.calls.length, 4);
});
test('expected workflow source is never advanced to accept a newer deployment', async () => {
  const h = harness([preflight(), welcome(report(true)), preflight(after)], before.sourceSha);
  assert.equal((await h.result).passed, false);
  assert.deepEqual(h.calls[2], ['provenance', 2, before.sourceSha]); assert.equal(h.calls.length, 3);
});
test('preflight failures are terminal, including stale date', async () => {
  const h = harness([preflight(before, ['stale date'])]);
  assert.equal((await h.result).passed, false); assert.equal(h.calls.length, 1);
});
test('source change between preflight and crawl cannot pass', async () => {
  const stable = { ...report(), deploymentBefore: after, deploymentAfter: after };
  const h = harness([preflight(), welcome(stable)]);
  assert.equal((await h.result).outcome, 'preflight-deployment-mismatch');
});
test('same-source rebuild between preflight and crawl cannot pass', async () => {
  const rebuilt = { ...before, runId: '102' };
  const stable = { ...report(), deploymentBefore: rebuilt, deploymentAfter: rebuilt };
  const h = harness([preflight(), welcome(stable)]);
  assert.equal((await h.result).outcome, 'preflight-deployment-mismatch');
});
test('timeout, missing reports and contradictory exit status cannot retry or pass', async () => {
  for (const value of [{ status: null, report: report(true) }, { status: 1, report: null }, { status: 1, report: report() }]) {
    const h = harness([preflight(), value]);
    assert.equal((await h.result).passed, false); assert.equal(h.calls.length, 2);
  }
});
test('worst-case child deadlines leave artifact/setup margin in 35 minute job', () => {
  assert.equal(2 * (STAGE_TIMEOUTS.provenance + STAGE_TIMEOUTS.welcome), 1_980_000);
  assert.ok(35 * 60_000 - 1_980_000 >= 120_000);
});

for (const [mode, expectedOutcome, attemptCount] of [
  ['stable', 'passed', 1], ['changed', 'passed-after-deployment-change', 2],
  ['conditional', 'deployment-change-with-other-failures', 1],
  ['schema', 'deployment-change-with-other-failures', 1],
  ['preflight-change', 'provenance-or-semantic-failure', 1],
  ['unchanged', 'gate-failure', 1], ['stale', 'provenance-or-semantic-failure', 1],
]) test(`actual child audits with synthetic HTTP: ${mode}`, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'pi-readiness-fixture-'));
  const previous = { options: process.env.NODE_OPTIONS, mode: process.env.PI_AUDIT_FIXTURE };
  process.env.NODE_OPTIONS = `--import=${new URL('./fixtures/agent-audit-fetch.mjs', import.meta.url).href}`;
  process.env.PI_AUDIT_FIXTURE = mode;
  try {
    const result = await runReadiness({ runStage: (stage, attempt, expectedSha) =>
      executeStage({ stage, attempt, expectedSha, directory, base: 'https://fixture.invalid' }) });
    assert.equal(result.outcome, expectedOutcome, JSON.stringify(result));
    assert.equal(result.attempts.length, attemptCount);
    const files = readdirSync(directory);
    assert.ok(files.includes('attempt-1-provenance.log'));
    if (!['stale', 'preflight-change'].includes(mode)) assert.ok(files.includes('attempt-1-welcome-execution.json'));
    if (mode === 'changed') {
      const first = JSON.parse(readFileSync(join(directory, 'attempt-1-welcome.json')));
      const second = JSON.parse(readFileSync(join(directory, 'attempt-2-welcome.json')));
      assert.equal(first.outcome, 'deployment-change-inconclusive');
      assert.equal(first.failures.filter(message => message.includes('source/snapshot mismatch')).length, 12);
      assert.equal(second.outcome, 'passed'); assert.equal(second.failures.length, 0);
      assert.equal(second.metrics.coveredPages, 20);
      assert.ok(files.includes('attempt-2-provenance.json'));
    }
  } finally {
    for (const [key, value] of [['NODE_OPTIONS', previous.options], ['PI_AUDIT_FIXTURE', previous.mode]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
