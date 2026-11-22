import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('status publication reaches a dedicated branch without touching the checkout or main', () => {
  const result = spawnSync('python3', [fileURLToPath(new URL('./publish_status_test.py', import.meta.url))], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
});
