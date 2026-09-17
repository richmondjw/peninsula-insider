import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluateCrawl, validateOrigin, serveBuild } from '../lib.mjs';

const report = results => ({ crawler: { version: '2.5.1' }, results, summary: { items: [] } });
test('empty, malformed, missing and capped crawl evidence cannot pass', () => {
  assert.throws(() => evaluateCrawl({}));
  assert.throws(() => evaluateCrawl(report([])));
  assert.equal(evaluateCrawl(report([{ url: 'https://peninsulainsider.com.au/', status: '200' }]), { expectedPaths: ['/eat/'] }).passed, false);
  assert.equal(evaluateCrawl(report([{ url: 'https://peninsulainsider.com.au/', status: '200' }]), { maxUrls: 1 }).passed, false);
});
test('HTTP failures and network status zero fail, successful evidence passes', () => {
  for (const status of ['404', '429', '500', '0', 'bogus']) assert.equal(evaluateCrawl(report([{ url: 'https://peninsulainsider.com.au/', status }])).passed, false);
  assert.equal(evaluateCrawl(report([{ url: 'https://peninsulainsider.com.au/', status: '200' }]), { expectedPaths: ['/'] }).passed, true);
  assert.equal(evaluateCrawl(report([{ url: 'https://peninsulainsider.com.au/', status: '301' }]), { expectedPaths: ['/'] }).passed, false);
});
test('runner origin limited to production and loopback', () => {
  const production = 'https://peninsulainsider.com.au';
  assert.equal(validateOrigin(production, production), production);
  assert.equal(validateOrigin('http://127.0.0.1:4000', production), 'http://127.0.0.1:4000');
  for (const origin of ['https://evil.test', 'http://169.254.169.254', 'https://user:secret@peninsulainsider.com.au', production + '/private']) assert.throws(() => validateOrigin(origin, production));
});
test('local server returns genuine 404 and never serves files outside dist', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi-seo-test-'));
  await writeFile(path.join(dir, 'index.html'), '<h1>Test</h1>');
  const server = await serveBuild(dir);
  try {
    assert.equal((await fetch(server.origin)).status, 200);
    assert.equal((await fetch(server.origin + '/missing/')).status, 404);
    assert.equal((await fetch(server.origin + '/%2e%2e%2fpackage.json')).status, 404);
  } finally { await server.close(); await rm(dir, { recursive: true, force: true }); }
});
