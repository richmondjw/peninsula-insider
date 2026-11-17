import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { validateCatalog } from './generate-agent-formats.mjs';

export const PUBLIC_CATALOG_URL = 'https://peninsulainsider.com.au/agents/catalog.json';
export const BASELINE_POLICY = Object.freeze({ attempts: 3, attemptMs: 30_000, totalMs: 95_000, maxBytes: 10_000_000 });
const transientCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'EAI_AGAIN',
  'ECONNREFUSED', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);

// Redirects, TLS and access errors stay terminal, not every TypeError is transient.
// All leaves of an AggregateError must be recognized.
export function isTransientTransportError(error, seen = new Set()) {
  if (!error || typeof error !== 'object' || seen.has(error)) return false;
  const next = new Set(seen).add(error);
  if (typeof error.code === 'string' && !transientCodes.has(error.code)) return false;
  if (Array.isArray(error.errors)) return error.errors.length > 0 && error.errors.every(item => isTransientTransportError(item, next));
  if (error.cause) return isTransientTransportError(error.cause, next);
  return transientCodes.has(error.code) || error.name === 'TimeoutError';
}

function failure(code) {
  // Never include response bodies, remote error messages, addresses or stack causes.
  return Object.assign(new Error(`Public catalogue baseline failed: ${code}`), { code });
}

async function boundedBody(response) {
  const declared = response.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > BASELINE_POLICY.maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw failure('SIZE_LIMIT');
  }
  if (!response.body) throw failure('EMPTY_BODY');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > BASELINE_POLICY.maxBytes) throw failure('SIZE_LIMIT');
      chunks.push(value);
    }
    const body = Buffer.concat(chunks, bytes).toString('utf8');
    // Replacement characters can expand malformed UTF-8. Preserve the original
    // decoded-byte acceptance bound as well as the streaming allocation bound.
    if (Buffer.byteLength(body) > BASELINE_POLICY.maxBytes) throw failure('SIZE_LIMIT');
    return body;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}

export async function prepareAgentBaseline(output, { fetchImpl = fetch, wait = sleep, now = Date.now, log = console.log } = {}) {
  const target = resolve(output);
  // Always use the previous public deployment. Never read candidate output or
  // reuse an old target after this operation fails.
  await rm(target, { force: true });
  const started = now();
  let body;
  for (let attempt = 1; attempt <= BASELINE_POLICY.attempts; attempt++) {
    const remaining = BASELINE_POLICY.totalMs - (now() - started);
    if (remaining <= 0) throw failure('TOTAL_DEADLINE');
    let response;
    const signal = AbortSignal.timeout(Math.min(BASELINE_POLICY.attemptMs, remaining));
    try {
      response = await fetchImpl(PUBLIC_CATALOG_URL, { redirect: 'error',
        signal,
        headers: { 'User-Agent': 'PI-release-baseline/1.0' } });
      if (response.status !== 200 || response.redirected) {
        await response.body?.cancel().catch(() => {});
        throw failure('HTTP_OR_REDIRECT');
      }
      body = await boundedBody(response);
    } catch (error) {
      const transient = isTransientTransportError(error) ||
        (error?.name === 'AbortError' && signal.aborted && signal.reason?.name === 'TimeoutError');
      log(`Public catalogue baseline attempt ${attempt}/${BASELINE_POLICY.attempts}: ${transient ? 'transient transport failure' : 'terminal failure'}.`);
      if (!transient) throw failure(['SIZE_LIMIT', 'EMPTY_BODY', 'HTTP_OR_REDIRECT'].includes(error?.code) ? error.code : 'TRANSPORT_REJECTED');
      if (attempt === BASELINE_POLICY.attempts) throw failure('TRANSPORT_EXHAUSTED');
      const delayMs = 1000 * 2 ** (attempt - 1);
      if (now() - started + delayMs >= BASELINE_POLICY.totalMs) throw failure('TOTAL_DEADLINE');
      await wait(delayMs);
      continue;
    }
    // Successful transport does not make invalid data retryable.
    try { validateCatalog(JSON.parse(body)); } catch { throw failure('INVALID_CATALOG'); }
    if (now() - started >= BASELINE_POLICY.totalMs) throw failure('TOTAL_DEADLINE');
    break;
  }
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, body, { flag: 'wx' });
    await rename(temporary, target);
  } finally { await rm(temporary, { force: true }); }
  log('Retained validated previous public catalogue for release comparison.');
}

export function baselineOutput(argv) {
  if (argv.length === 0) return '.cache/agent-previous.json';
  if (argv.length === 2 && argv[0] === '--out' && argv[1] && !argv[1].startsWith('--')) return argv[1];
  throw failure('ARGUMENTS');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await prepareAgentBaseline(baselineOutput(process.argv.slice(2))); }
  catch (error) {
    const safeCode = ['TOTAL_DEADLINE', 'SIZE_LIMIT', 'EMPTY_BODY', 'HTTP_OR_REDIRECT', 'TRANSPORT_REJECTED',
      'TRANSPORT_EXHAUSTED', 'INVALID_CATALOG', 'ARGUMENTS'].includes(error.code) ? error.code : 'OUTPUT_IO';
    console.error(`Public catalogue baseline failed: ${safeCode}. No baseline accepted.`);
    process.exitCode = 1;
  }
}
