/**
 * fetch-source.mjs - the only component in the loop that touches the network.
 *
 * WHAT IT MAY DO
 * --------------
 * One thing: an HTTP GET of a URL that a record in this repository already
 * cites. Nothing else leaves the process. There is no POST path, no webhook,
 * no mail, no write to any external system, and the URL allow-set is built
 * from the corpus before the first request, so a URL the loop invented cannot
 * be requested even by a caller that tries.
 *
 * This mirrors scripts/check-event-source-freshness.py, which has been doing
 * the same job report-only since August: GET, read a bounded prefix of the
 * body, and treat a 200 as the beginning of the question rather than the
 * answer. That script's central observation is the reason this file exists at
 * all - tourism and ticketing pages routinely keep a 200 shell alive after the
 * thing they describe has been withdrawn. It uses Python's urllib; this uses
 * the fetch built into Node 22, which is the same "already in the repo"
 * position and adds no dependency.
 *
 * REACHABILITY IS NOT A VERDICT
 * -----------------------------
 * Roughly 30% of the corpus cannot be checked from its recorded source: 45 of
 * 331 URLs are dead and 54 more refuse automated clients. A checker that files
 * those as failures produces a report where the real findings are 30% signal,
 * and nobody reads it twice. So this module answers only "could I see the
 * page", in four values, and never "is the claim true":
 *
 *   ok         a response with a body worth reading
 *   blocked    the server answered, and refused this client. 401/403/405/429/
 *              451, or a 200 that is visibly an interstitial. The source may
 *              be perfectly healthy; we simply are not allowed to look, which
 *              is a fact about us, not about the claim.
 *   dead       404, 410, or a name that does not resolve. Worth a human,
 *              because a citation pointing at nothing is its own defect.
 *   error      anything else: timeout, reset, TLS, a body we could not decode.
 *              Retryable, and after bounded retries, simply unknown.
 *
 * The adjudicator downstream may only reach `confirmed` or `contradicted` from
 * `ok`. Every other reachability lands in the source-health section of the
 * report, not the findings.
 */

import { createHash } from 'node:crypto';

/** Read at most this much of a body. Matches the Python checker's 500 kB. */
const MAX_BYTES = 500_000;

export const USER_AGENT =
  'PeninsulaInsiderVerificationLoop/1.0 (report-only source check; +https://peninsulainsider.com.au)';

/** Statuses that mean "we are not allowed to look", not "the page is gone". */
const BLOCKED_STATUS = new Set([401, 402, 403, 405, 406, 429, 451]);
const DEAD_STATUS = new Set([404, 410]);

/**
 * Bodies that returned 200 but are a wall rather than the page. Kept short and
 * specific: a loose pattern here would silently reclassify real findings as
 * "blocked" and hide them.
 */
const INTERSTITIAL = [
  /just a moment\s*\.{0,3}\s*<\/title>/i,
  /<title>\s*attention required!?\s*\|\s*cloudflare/i,
  /\bcf-browser-verification\b/i,
  /\benable javascript and cookies to continue\b/i,
  /\bchecking your browser before accessing\b/i,
  /\brequest unsuccessful\. incapsula\b/i,
  /\bpardon our interruption\b/i,
  /\bare you a robot\b/i,
];

/** DNS and connection failures that mean the citation points at nothing. */
const DEAD_CAUSES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_INVALID_URL',
]);

export function digestOf(text) {
  return createHash('sha256').update(text ?? '', 'utf8').digest('hex').slice(0, 16);
}

function causeCode(error) {
  return error?.cause?.code ?? error?.code ?? null;
}

/**
 * One artifact per URL. This is the immutable evidence reference the rest of
 * the loop reasons over: the critic re-reads `text` itself rather than
 * trusting anything the researcher said about it, and `digest` is what a
 * proposed change cites, so a later reviewer can tell whether the page a
 * decision was taken on is the page that is there now.
 */
function artifact(url, fields) {
  return {
    url,
    finalUrl: null,
    status: null,
    reachability: 'error',
    fetchedAt: null,
    bytes: 0,
    digest: null,
    contentType: null,
    text: '',
    attempts: 0,
    note: null,
    ...fields,
  };
}

/**
 * Build the fetcher.
 *
 * `allowedUrls` is mandatory and is the structural half of the outbound
 * constraint: the loop assembles it from URLs already written into the corpus,
 * and this function refuses anything else. A bug that invents a URL fails
 * loudly here rather than quietly making a request.
 */
export function createFetcher({
  allowedUrls,
  timeoutMs = 15_000,
  maxAttempts = 2,
  backoffMs = 750,
  now = () => new Date(),
  impl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!(allowedUrls instanceof Set)) {
    throw new TypeError('createFetcher requires an allowedUrls Set built from the corpus');
  }

  return async function fetchSource(url) {
    if (!allowedUrls.has(url)) {
      throw new Error(`refusing to fetch a URL the corpus does not cite: ${url}`);
    }

    let attempts = 0;
    let last = null;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const response = await impl(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
          signal: AbortSignal.timeout(timeoutMs),
        });

        const buffer = await response.arrayBuffer();
        const slice = Buffer.from(buffer).subarray(0, MAX_BYTES);
        const text = slice.toString('utf8');
        const base = {
          finalUrl: response.url || url,
          status: response.status,
          fetchedAt: now().toISOString(),
          bytes: slice.byteLength,
          digest: digestOf(text),
          contentType: response.headers.get('content-type'),
          text,
          attempts,
        };

        if (DEAD_STATUS.has(response.status)) {
          return artifact(url, { ...base, reachability: 'dead', note: `HTTP ${response.status}` });
        }
        if (BLOCKED_STATUS.has(response.status)) {
          return artifact(url, { ...base, reachability: 'blocked', note: `HTTP ${response.status}` });
        }
        if (response.status >= 500) {
          last = artifact(url, { ...base, reachability: 'error', note: `HTTP ${response.status}` });
          if (attempts < maxAttempts) {
            await sleep(backoffMs * attempts);
            continue;
          }
          return last;
        }
        if (!response.ok) {
          return artifact(url, { ...base, reachability: 'error', note: `HTTP ${response.status}` });
        }
        const wall = INTERSTITIAL.find((pattern) => pattern.test(text));
        if (wall) {
          return artifact(url, {
            ...base,
            reachability: 'blocked',
            note: 'interstitial served in place of the page',
          });
        }
        return artifact(url, { ...base, reachability: 'ok' });
      } catch (error) {
        const code = causeCode(error);
        const dead = DEAD_CAUSES.has(String(code));
        last = artifact(url, {
          fetchedAt: now().toISOString(),
          reachability: dead ? 'dead' : 'error',
          attempts,
          note: `${error?.name ?? 'Error'}: ${String(code ?? error?.message ?? error).slice(0, 120)}`,
        });
        if (dead || attempts >= maxAttempts) return last;
        await sleep(backoffMs * attempts);
      }
    }

    return last ?? artifact(url, { note: 'no attempt was made' });
  };
}

/**
 * The offline fetcher. Tests and `--offline` runs use it, and it takes the
 * same allow-set so a fixture cannot exercise a path production could not.
 * A URL present in the map but with no entry is a deliberate miss, reported as
 * dead, which is how a fixture seeds a broken citation.
 */
export function createFixtureFetcher(responses, { now = () => new Date('2026-09-13T00:00:00Z') } = {}) {
  return async function fetchFixture(url) {
    const hit = responses[url];
    const stamp = now().toISOString();
    if (!hit) {
      return artifact(url, {
        status: 404,
        reachability: 'dead',
        fetchedAt: stamp,
        attempts: 1,
        note: 'HTTP 404',
      });
    }
    const text = hit.body ?? '';
    return artifact(url, {
      finalUrl: hit.finalUrl ?? url,
      status: hit.status ?? 200,
      reachability: hit.reachability ?? 'ok',
      fetchedAt: stamp,
      bytes: Buffer.byteLength(text, 'utf8'),
      digest: digestOf(text),
      contentType: hit.contentType ?? 'text/html; charset=utf-8',
      text,
      attempts: 1,
      note: hit.note ?? null,
    });
  };
}

/**
 * Run a bounded number of fetches at a time. Politeness, not throughput: this
 * reads other people's servers and has all day to do it.
 */
export async function mapWithConcurrency(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return out;
}
