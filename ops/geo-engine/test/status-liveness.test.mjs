import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../scripts/status-liveness.py', import.meta.url));

test('published status must be fresh and healthy; silence is a failure', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pi-geo-liveness-'));
  const file = path.join(dir, 'status.json');
  const check = () => spawnSync('python3', [script, file], {encoding: 'utf8'});
  const put = (value) => writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  const fresh = () => new Date().toISOString();
  try {
    assert.equal(check().status, 1);
    assert.match(check().stdout, /no status has ever been published/);

    put({publishedAt: fresh(), runId: 'r1', engine: 'ok', health: {ok: true, label: 'r1 age=0.1h release=no_changes', problems: []}});
    assert.equal(check().status, 0);

    put({publishedAt: fresh(), runId: null, engine: 'degraded', error: 'Fresh GSC evidence unavailable (timeout)',
      health: {ok: false, label: 'r0', problems: ['audit age 49.0h exceeds 36h']}});
    assert.equal(check().status, 1);
    assert.match(check().stdout, /audit age 49\.0h/);

    put({publishedAt: '2026-09-23T00:00:00+00:00', runId: 'old', engine: 'ok', health: {ok: true, label: 'old', problems: []}});
    assert.equal(check().status, 1, 'a healthy status that stopped arriving is stale');
    assert.match(check().stdout, /old \(limit 36h\)/);

    put('{not json');
    assert.equal(check().status, 1);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
