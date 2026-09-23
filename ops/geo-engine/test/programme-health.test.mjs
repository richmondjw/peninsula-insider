import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../scripts/programme-health.py', import.meta.url));

test('programme monitor accepts only a fresh Jev run with a terminal receipt', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'pi-geo-health-'));
  const state = path.join(root, 'state');
  const run = path.join(root, 'sample-run');
  mkdirSync(state); mkdirSync(run);
  const put = (name, value) => writeFileSync(path.join(state, name), JSON.stringify(value));
  try {
    put('latest-run.json', {runId: 'sample-run', completedAt: new Date().toISOString(), errors: []});
    writeFileSync(path.join(run, 'summary.json'), JSON.stringify({system: {
      decisionProvider: 'jev', decisionProbe: {ok: true}, errors: []
    }}));
    writeFileSync(path.join(state, 'latest-report.txt'), 'report');
    put('step-latest.json', {runId: 'sample-run', terminal: true, engine: 'ok', release_status: 'no_changes'});
    const check = () => spawnSync('python3', [script, state], {encoding: 'utf8'});
    assert.equal(check().status, 0);
    put('step-latest.json', {runId: 'sample-run', terminal: false, engine: 'running', release_status: 'pending_validation'});
    assert.equal(check().status, 1);
    put('step-latest.json', {runId: 'sample-run', terminal: true, engine: 'ok', release_status: 'no_changes'});
    put('latest-run.json', {runId: 'sample-run', completedAt: '2026-01-01T00:00:00Z', errors: []});
    assert.equal(check().status, 1);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
