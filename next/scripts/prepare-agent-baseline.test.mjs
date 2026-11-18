import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublicBaseline } from './prepare-agent-baseline.mjs';

const valid = JSON.stringify({ schemaVersion: '1.0', generatedAt: '2026-11-18T00:00:00Z', count: 0, records: [] });
const response = (status, body = valid) => ({ ok: status === 200, status, text: async () => body });

test('retries a temporary connection failure and retains the public catalogue', async () => {
  let attempts = 0;
  const waits = [];
  const body = await fetchPublicBaseline({
    fetchImpl: async () => ++attempts === 1 ? Promise.reject(new Error('ETIMEDOUT')) : response(200),
    sleep: async (ms) => waits.push(ms),
  });
  assert.equal(body, valid);
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [2000]);
});

test('retries a temporary server response but fails on a permanent response', async () => {
  let attempts = 0;
  await fetchPublicBaseline({ fetchImpl: async () => ++attempts === 1 ? response(503) : response(200), sleep: async () => {} });
  assert.equal(attempts, 2);
  attempts = 0;
  await assert.rejects(fetchPublicBaseline({ fetchImpl: async () => { attempts++; return response(404); }, sleep: async () => {} }), /unavailable: 404/);
  assert.equal(attempts, 1);
});

test('an invalid public catalogue cannot be retried into an accepted baseline', async () => {
  let attempts = 0;
  await assert.rejects(fetchPublicBaseline({ fetchImpl: async () => { attempts++; return response(200, '{}'); }, sleep: async () => {} }), /Invalid previous public catalogue/);
  assert.equal(attempts, 1);
});
