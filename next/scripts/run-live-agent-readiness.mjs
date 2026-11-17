import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyAudit, validDeployment, sameDeployment } from './agent-audit-outcome.mjs';

export const STAGE_TIMEOUTS = { provenance: 70_000, welcome: 920_000 };

export async function runReadiness({ runStage, expectedSha = '' }) {
  const attempts = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const receipt = { attempt };
    attempts.push(receipt);
    receipt.provenance = await runStage('provenance', attempt, expectedSha);
    const preflight = receipt.provenance.report;
    if (receipt.provenance.status !== 0 || !validDeployment(preflight?.deployment) ||
        !Array.isArray(preflight.failures) || preflight.failures.length ||
        (expectedSha && preflight.deployment.sourceSha !== expectedSha)) {
      return { outcome: 'provenance-or-semantic-failure', passed: false, attempts };
    }
    // Bind this fresh full crawl to the source verified by its own preflight.
    receipt.welcome = await runStage('welcome', attempt, preflight.deployment.sourceSha);
    receipt.outcome = classifyAudit(receipt.welcome.report);
    if (!sameDeployment(receipt.welcome.report?.deploymentBefore, preflight.deployment)) {
      receipt.outcome = 'preflight-deployment-mismatch';
    }
    if (receipt.welcome.status === 0 && receipt.outcome === 'passed') {
      return { outcome: attempt === 1 ? 'passed' : 'passed-after-deployment-change', passed: true, attempts };
    }
    if (attempt === 2 || receipt.welcome.status !== 1 || receipt.outcome !== 'deployment-change-inconclusive') {
      return { outcome: receipt.outcome === 'passed' ? 'execution-failure' : receipt.outcome, passed: false, attempts };
    }
  }
}

export function executeStage({ stage, attempt, expectedSha, base, directory }) {
  const prefix = join(directory, `attempt-${attempt}-${stage}`);
  const script = stage === 'provenance' ? 'audit-live-agent-readiness.mjs' : 'audit-agent-welcome.mjs';
  const args = [fileURLToPath(new URL(script, import.meta.url)), '--base', base,
    '--expected-sha', expectedSha, '--report', `${prefix}.json`];
  if (stage === 'provenance') args.push('--attempts', '1');
  const child = spawnSync(process.execPath, args, {
    encoding: 'utf8', timeout: STAGE_TIMEOUTS[stage], killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
  });
  writeFileSync(`${prefix}.log`, (child.stdout || '') + (child.stderr || ''));
  const execution = { status: child.status, signal: child.signal, error: child.error?.message ?? null };
  writeFileSync(`${prefix}-execution.json`, JSON.stringify(execution, null, 2) + '\n');
  let report = null;
  try { report = JSON.parse(readFileSync(`${prefix}.json`, 'utf8')); } catch { /* Missing/partial evidence fails closed. */ }
  return { ...execution, report };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const directory = resolve('ops/reports/seo/live-agent-readiness');
  mkdirSync(directory, { recursive: true });
  let result;
  try {
    result = await runReadiness({ expectedSha: process.env.EXPECTED_SHA || '',
      runStage: (stage, attempt, expectedSha) => executeStage({ stage, attempt, expectedSha,
        base: 'https://peninsulainsider.com.au', directory }) });
  } catch (error) { result = { outcome: 'execution-failure', passed: false, error: error.message }; }
  writeFileSync(join(directory, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
  writeFileSync(join(directory, 'category.txt'), result.outcome + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [`Live readiness: **${result.outcome}**`, '',
      ...(result.attempts || []).map(receipt => `- Attempt ${receipt.attempt}: ${receipt.outcome || 'provenance-or-semantic-failure'}; ${receipt.welcome?.report?.failures?.length ?? receipt.provenance?.report?.failures?.length ?? 'unknown'} failed checks retained.`),
      '', 'A deployment-change attempt is inconclusive, not accepted. Only a complete stable attempt can pass. Original JSON reports, transport receipts and execution logs remain in the artifact.', ''];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
  console.log(`Live readiness: ${result.outcome}; original attempt reports and execution logs retained.`);
  process.exitCode = result.passed ? 0 : 1;
}
