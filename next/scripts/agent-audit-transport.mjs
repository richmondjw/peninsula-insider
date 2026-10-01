import { createHash } from 'node:crypto';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function retryAfterMs(value, now = Date.now()) {
  if (value == null) return null;
  if (/^\d+$/.test(value.trim())) return Number(value) * 1000;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

// Operational audit transport only. Retries never become autonomous task credit.
export function createAuditTransport({ fetchImpl = fetch, wait = sleep,
  now = Date.now, spacingMs = 250, maxAttempts = 3, maxWaitMs = 30000,
  deadlineMs = 600000 } = {}) {
  const attempts = [];
  const started = now();
  let lastEnd = null;
  async function perform(url, { headers = {} } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (lastEnd !== null) await wait(Math.max(0, spacingMs - (now() - lastEnd)));
      if (now() - started >= deadlineMs) throw new Error('Live audit transport deadline exceeded');
      const at = now();
      const receipt = { url, attempt, startedAt: new Date(at).toISOString(),
        requestedEtag: headers['If-None-Match'] ?? null };
      let result;
      try {
        const response = await fetchImpl(url, { redirect: 'manual',
          signal: AbortSignal.timeout(Math.min(20000, Math.max(1, deadlineMs - (now() - started)))),
          headers: { 'user-agent': 'PI-agent-welcome-audit/2.1', ...headers } });
        // Headers remain evidence even if the response body fails to arrive.
        Object.assign(receipt, { status: response.status, etag: response.headers.get('etag'),
          retryAfter: response.headers.get('retry-after'), cacheControl: response.headers.get('cache-control'),
          contentType: response.headers.get('content-type'), vary: response.headers.get('vary'),
          date: response.headers.get('date'), age: response.headers.get('age'),
          lastModified: response.headers.get('last-modified'), contentEncoding: response.headers.get('content-encoding'),
          contentLength: response.headers.get('content-length'), cacheStatus: response.headers.get('x-cache'),
          servedBy: response.headers.get('x-served-by') });
        const body = await response.text();
        result = { status: response.status, body, headers: response.headers,
          bytes: Buffer.byteLength(body), bodySha256: createHash('sha256').update(body).digest('hex') };
        Object.assign(receipt, { bytes: result.bytes, bodySha256: result.bodySha256 });
      } catch (error) {
        receipt.error = error.message;
      }
      lastEnd = now();
      receipt.elapsedMs = lastEnd - at;
      attempts.push(receipt);
      const retryable = [429, 503].includes(receipt.status) || (receipt.error && receipt.status == null);
      if (!retryable) {
        if (receipt.error) throw new Error(`${url}: ${receipt.error}`);
        return { ...result, elapsedMs: receipt.elapsedMs };
      }
      const advised = retryAfterMs(receipt.retryAfter, now());
      const delay = Math.max(spacingMs, advised ?? 1000 * 2 ** (attempt - 1));
      if (attempt === maxAttempts || delay > maxWaitMs || now() - started + delay >= deadlineMs) {
        receipt.retryStopped = attempt === maxAttempts ? 'attempt-limit' : 'wait-or-deadline-limit';
        if (receipt.error) throw new Error(`${url}: ${receipt.error}`);
        return { ...result, elapsedMs: receipt.elapsedMs };
      }
      receipt.retryDelayMs = delay;
      await wait(delay);
    }
  }
  let queue = Promise.resolve();
  const request = (...args) => {
    const result = queue.then(() => perform(...args));
    queue = result.catch(() => {});
    return result;
  };
  return { request, attempts, policy: { concurrency: 1, spacingMs, maxAttempts, maxWaitMs, deadlineMs,
    retryStatuses: [429, 503], bytes: 'Decoded UTF-8 body bytes; excludes HTTP headers and compressed wire bytes' } };
}
