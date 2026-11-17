import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareAgentBaseline, isTransientTransportError, baselineOutput, BASELINE_POLICY, PUBLIC_CATALOG_URL } from './prepare-agent-baseline.mjs';

const records = [{ id: 'https://peninsulainsider.com.au/eat/example/', canonicalUrl: 'https://peninsulainsider.com.au/eat/example/',
  markdownUrl: 'https://peninsulainsider.com.au/eat/example/index.md', contentSha256: 'a'.repeat(64) }];
const catalog = { schemaVersion: '2.0', generatedAt: '2026-11-17T00:00:00Z', count: 1, records,
  snapshotId: createHash('sha256').update(JSON.stringify(records.map(r => [r.id, r.contentSha256]))).digest('hex') };
const body = JSON.stringify(catalog);
const networkError = code => Object.assign(new Error('sensitive URL, IP and token must not be logged'), { code });
const wrapped = error => new TypeError('fetch failed with private details', { cause: error });
const resetBody = () => new Response(new ReadableStream({
  pull(controller) {
    if (!this.sent) { this.sent = true; controller.enqueue(Buffer.from('{"partial":')); }
    else controller.error(wrapped(networkError('ECONNRESET')));
  },
}));

async function fixture(context) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-baseline-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, 'previous.json');
  await writeFile(output, 'stale candidate must never be consumed');
  return { directory, output };
}
function harness(output, sequence) {
  const calls = [], waits = [], logs = [];
  let clock = 0;
  return { calls, waits, logs, advance: ms => { clock += ms; }, options: {
    now: () => clock,
    wait: async ms => { assert.equal(existsSync(output), false); waits.push(ms); clock += ms; },
    log: line => logs.push(line),
    fetchImpl: async (url, options) => {
      assert.equal(existsSync(output), false, 'stale/partial output cannot be available during fetch');
      calls.push({ url, options });
      assert.ok(sequence.length, 'no unplanned request');
      const next = sequence.shift();
      if (next instanceof Error) throw next;
      return typeof next === 'function' ? next() : next;
    },
  } };
}

test('valid public catalogue replaces stale output only after validation', async context => {
  const { output, directory } = await fixture(context);
  const h = harness(output, [new Response(body)]);
  await prepareAgentBaseline(output, h.options);
  assert.equal(await readFile(output, 'utf8'), body);
  assert.deepEqual(await readdir(directory), ['previous.json']);
  assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []);
  assert.equal(h.calls[0].url, PUBLIC_CATALOG_URL);
  assert.equal(h.calls[0].options.redirect, 'error');
  assert.equal(h.calls[0].options.headers['User-Agent'], 'PI-release-baseline/1.0');
  assert.ok(h.calls[0].options.signal instanceof AbortSignal);
});

test('connection AggregateError ETIMEDOUT/ENETUNREACH recovers with a fresh request', async context => {
  const { output } = await fixture(context);
  const h = harness(output, [wrapped(new AggregateError([networkError('ETIMEDOUT'), networkError('ENETUNREACH')])), new Response(body)]);
  await prepareAgentBaseline(output, h.options);
  assert.equal(h.calls.length, 2); assert.deepEqual(h.waits, [1000]);
  assert.equal(await readFile(output, 'utf8'), body);
  assert.notEqual(h.calls[0].options.signal, h.calls[1].options.signal);
  assert.doesNotMatch(h.logs.join('\n'), /sensitive|private|token|ETIMEDOUT|ENETUNREACH/);
});

test('response-body reset discards partial bytes and retries from the trusted URL', async context => {
  const { output } = await fixture(context);
  const h = harness(output, [resetBody(), new Response(body)]);
  await prepareAgentBaseline(output, h.options);
  assert.equal(h.calls.length, 2); assert.deepEqual(h.waits, [1000]);
  assert.equal(await readFile(output, 'utf8'), body);
  assert.ok(h.calls.every(call => call.url === PUBLIC_CATALOG_URL));
});

test('body AbortError caused by our attempt timeout retries with a fresh 30s signal', async context => {
  const { output } = await fixture(context);
  const controllers = [];
  context.mock.method(AbortSignal, 'timeout', milliseconds => {
    assert.equal(milliseconds, 30000);
    const controller = new AbortController(); controllers.push(controller); return controller.signal;
  });
  const h = harness(output, [() => new Response(new ReadableStream({ pull(controller) {
    controllers[0].abort(new DOMException('private', 'TimeoutError'));
    controller.error(new DOMException('private body abort', 'AbortError'));
  } })), new Response(body)]);
  await prepareAgentBaseline(output, h.options);
  assert.equal(h.calls.length, 2); assert.equal(controllers[1].signal.aborted, false);
  assert.equal(await readFile(output, 'utf8'), body);
});

for (const kind of ['connection', 'body']) test(`${kind} exhaustion leaves no partial or stale output`, async context => {
  const { output, directory } = await fixture(context);
  const h = harness(output, Array.from({ length: 3 }, () => kind === 'body' ? resetBody() : wrapped(networkError('ECONNRESET'))));
  await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'TRANSPORT_EXHAUSTED' });
  assert.equal(h.calls.length, 3); assert.deepEqual(h.waits, [1000, 2000]);
  assert.equal(h.logs.length, 3); assert.deepEqual(await readdir(directory), []);
});

test('only recognized transport causes retry, including nested socket/timeout errors', () => {
  for (const error of [networkError('UND_ERR_SOCKET'), wrapped(networkError('EAI_AGAIN')), new DOMException('private', 'TimeoutError')]) assert.equal(isTransientTransportError(error), true);
  for (const error of [new TypeError('redirect count exceeded'), wrapped(networkError('EACCES')), wrapped(networkError('ENOTFOUND')),
    wrapped(networkError('CERT_HAS_EXPIRED')), Object.assign(wrapped(networkError('ECONNRESET')), { code: 'EACCES' }),
    wrapped(new AggregateError([networkError('ECONNRESET'), networkError('EACCES')])), new AggregateError([])]) assert.equal(isTransientTransportError(error), false);
  const cyclic = new Error(); cyclic.cause = cyclic;
  assert.equal(isTransientTransportError(cyclic), false);
});

test('unknown, redirect, TLS and access transport failures never retry', async context => {
  const { output } = await fixture(context);
  for (const error of [new TypeError('redirect count exceeded'), wrapped(networkError('EACCES')), wrapped(networkError('CERT_HAS_EXPIRED'))]) {
    await writeFile(output, 'stale');
    const h = harness(output, [error]);
    await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'TRANSPORT_REJECTED' });
    assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []); assert.equal(existsSync(output), false);
  }
});

test('all non-200 HTTP responses remain terminal, including access denials and 503', async context => {
  const { output } = await fixture(context);
  for (const status of [201, 204, 301, 302, 304, 400, 401, 403, 404, 408, 429, 500, 502, 503, 504]) {
    const h = harness(output, [new Response([204, 304].includes(status) ? null : 'private response', { status })]);
    await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'HTTP_OR_REDIRECT' });
    assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []); assert.equal(existsSync(output), false);
    assert.doesNotMatch(h.logs.join('\n'), /private response/);
  }
});

test('declared and streamed size excess fail without retry or output; exactly 10MB is allowed', async context => {
  const { output, directory } = await fixture(context);
  let cancelled = false;
  for (const response of [new Response(body, { headers: { 'content-length': String(BASELINE_POLICY.maxBytes + 1) } }),
    new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(BASELINE_POLICY.maxBytes)); controller.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } }))]) {
    const h = harness(output, [response]);
    await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'SIZE_LIMIT' });
    assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []); assert.deepEqual(await readdir(directory), []);
  }
  assert.equal(cancelled, true);
  const exact = body.padEnd(BASELINE_POLICY.maxBytes, ' ');
  await prepareAgentBaseline(output, harness(output, [new Response(exact)]).options);
  assert.equal((await readFile(output)).length, BASELINE_POLICY.maxBytes);
});

test('invalid JSON, schema, source identities and snapshot hashes are terminal', async context => {
  const { output, directory } = await fixture(context);
  for (const invalid of ['{', '{}', JSON.stringify({ ...catalog, count: 2 }), JSON.stringify({ ...catalog, snapshotId: 'b'.repeat(64) }),
    JSON.stringify({ ...catalog, records: [{ ...records[0], canonicalUrl: 'https://other.invalid/' }] })]) {
    const h = harness(output, [new Response(invalid)]);
    await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'INVALID_CATALOG' });
    assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []); assert.deepEqual(await readdir(directory), []);
  }
});

test('malformed UTF-8 cannot expand the accepted output beyond the 10MB bound', async context => {
  const { output, directory } = await fixture(context);
  const bytes = Buffer.concat([Buffer.from(body.slice(0, -1) + ',"extra":"'), Buffer.alloc(3_400_000, 0xff), Buffer.from('"}')]);
  assert.ok(bytes.length < BASELINE_POLICY.maxBytes);
  assert.ok(Buffer.byteLength(bytes.toString('utf8')) > BASELINE_POLICY.maxBytes);
  const h = harness(output, [new Response(bytes)]);
  await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'SIZE_LIMIT' });
  assert.equal(h.calls.length, 1); assert.deepEqual(h.waits, []);
  assert.deepEqual(await readdir(directory), []);
});

test('total fetch budget rejects late success and refuses another request after deadline', async context => {
  const { output } = await fixture(context);
  const h = harness(output, [() => { h.advance(BASELINE_POLICY.totalMs); return new Response(body); }]);
  await assert.rejects(prepareAgentBaseline(output, h.options), { code: 'TOTAL_DEADLINE' });
  assert.equal(existsSync(output), false);
  const late = harness(output, [() => { late.advance(BASELINE_POLICY.totalMs - 500); throw networkError('ECONNRESET'); }]);
  await assert.rejects(prepareAgentBaseline(output, late.options), { code: 'TOTAL_DEADLINE' });
  assert.equal(late.calls.length, 1); assert.deepEqual(late.waits, []);
  assert.deepEqual(BASELINE_POLICY, { attempts: 3, attemptMs: 30000, totalMs: 95000, maxBytes: 10000000 });
});

test('CLI defaults and invalid arguments cannot accidentally select the node executable as output', () => {
  assert.equal(baselineOutput([]), '.cache/agent-previous.json');
  assert.equal(baselineOutput(['--out', '/tmp/example.json']), '/tmp/example.json');
  for (const args of [['--out'], ['--out', '--wrong'], ['--url', 'https://other.invalid/'], ['--out', 'x', 'extra']]) assert.throws(() => baselineOutput(args), { code: 'ARGUMENTS' });
});

test('CLI fails nonzero with redacted diagnostics and no stale output', async context => {
  const { output, directory } = await fixture(context);
  const preload = join(directory, 'fixture.mjs');
  await writeFile(preload, `globalThis.fetch=async()=>{throw new TypeError('SECRET_URL_TOKEN',{cause:Object.assign(new Error('PRIVATE_IP'),{code:'EACCES'})});};`);
  const child = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href,
    fileURLToPath(new URL('./prepare-agent-baseline.mjs', import.meta.url)), '--out', output], { encoding: 'utf8' });
  assert.equal(child.status, 1); assert.equal(existsSync(output), false);
  assert.match(child.stderr, /TRANSPORT_REJECTED/);
  assert.doesNotMatch(child.stdout + child.stderr, /SECRET_URL_TOKEN|PRIVATE_IP|EACCES| at /);
});
