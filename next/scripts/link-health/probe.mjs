/**
 * link-health/probe.mjs - the network half, and the ONLY network half.
 *
 * Nothing in the build imports this file. Nothing in CI imports this file.
 * It is reached from exactly one entry point, scripts/probe-link-health.mjs,
 * which a human or a scheduled job runs deliberately.
 *
 * Keeping it in its own module is not tidiness. audit-link-health.mjs used to
 * contain this code behind a `--probe` flag, which meant the gate and the
 * thing that writes the gate's input were one command a single flag apart -
 * and the remedy the gate printed when it failed was to run that flag. See
 * the header of audit-link-health.mjs for what that cost.
 */

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

/**
 * Codes a live host returns when it dislikes a robot rather than when the page
 * is gone. Treating these as dead is the single most damaging mistake a link
 * checker makes on this corpus - the council is the most-cited publisher on
 * the site and refuses most automated reads.
 */
const BOT_WALL_CODES = new Set(['400', '401', '403', '406', '429', '503']);

/**
 * Markers of a page that answers 200 and carries nothing. A status-code-only
 * checker calls every one of these healthy, which is how a reader ends up on a
 * domain-parking advertisement from a citation the site still calls a source.
 */
const PARKED_MARKERS = [
  'this website is for sale',
  'this domain is for sale',
  'buy this domain',
  'domain is parked',
  'squarespace - website expired',
  'connectyourdomain error',
  'website coming soon',
  'default web site page',
  'future home of something quite cool',
];

/** Markers of an anti-bot interstitial served with a 2xx status. */
const CHALLENGE_MARKERS = [
  'sgcaptcha',
  'cdn-cgi/challenge-platform',
  'just a moment...',
  'attention required!',
  'security checkpoint',
  'enable javascript and cookies to continue',
  'checking your browser before accessing',
  'px-captcha',
  'are you a human',
];

const bodyTmp = (slot) => path.join(tmpdir(), `pi-link-health-${process.pid}-${slot}.html`);

async function curlOnce(url, bodyPath) {
  const curlArgs = [
    '-sSL',
    '--compressed',
    '-o',
    bodyPath,
    '-A',
    UA,
    '-H',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '-H',
    'Accept-Language: en-AU,en;q=0.9',
    '--max-time',
    '30',
    '--connect-timeout',
    '15',
    '-w',
    '%{http_code}\t%{url_effective}',
    url,
  ];
  try {
    const { stdout } = await execFileAsync('curl', curlArgs, { maxBuffer: 8e6 });
    const [code, effective] = stdout.trim().split('\t');
    let body = '';
    try {
      body = (await readFile(bodyPath, 'utf8')).slice(0, 300000);
    } catch {
      /* a HEAD-like response, or a binary body. Absence is not an error. */
    }
    const title = (/<title[^>]*>([\s\S]{0,400}?)<\/title>/i.exec(body) || [, ''])[1]
      .replace(/\s+/g, ' ')
      .trim();
    return { code, effective, title, body, bytes: body.length, error: null };
  } catch (error) {
    return {
      code: '000',
      effective: '',
      title: '',
      body: '',
      bytes: 0,
      error: String(error.stderr || error.message).replace(/\s+/g, ' ').trim().slice(0, 200),
    };
  }
}

export function verdictFor(direct) {
  const haystack = `${direct.title} ${direct.body}`.toLowerCase();
  if (/^2/.test(direct.code) || /^3/.test(direct.code)) {
    if (CHALLENGE_MARKERS.some((m) => haystack.includes(m))) return 'blocked';
    if (PARKED_MARKERS.some((m) => haystack.includes(m))) return 'parked';
    // A NetRegistry-style redirector answers 200 with a two-word body. There
    // is no page here; there is a parked domain wearing a success code.
    if (direct.bytes > 0 && direct.bytes < 512 && /not found|no such|page unavailable/i.test(direct.body)) {
      return 'parked';
    }
    return 'ok';
  }
  if (BOT_WALL_CODES.has(direct.code)) return 'blocked';
  if (direct.code === '404' || direct.code === '410') return 'dead';
  if (direct.code === '000' && /SSL|certificate/i.test(direct.error || '')) return 'tls-fault';
  if (direct.code === '000') return 'dead';
  return 'unknown';
}

export const PROBED_BY = 'scripts/probe-link-health.mjs';

/**
 * Fetch every URL in `urls` and merge the results over `existing` rows.
 *
 * A human disposition (replacement, note, reviewedOn, disposition) survives a
 * re-probe. The machine owns the verdict; the editor owns the judgement about
 * what to do with it.
 */
export async function probeUrls(urls, existing, { concurrency = 6, onProgress } = {}) {
  const byUrl = new Map(existing.map((row) => [row.url, row]));
  const today = new Date().toISOString().slice(0, 10);
  const queue = [...urls];
  let done = 0;

  async function worker(slot) {
    const bodyPath = bodyTmp(slot);
    for (;;) {
      const url = queue.shift();
      if (!url) {
        await rm(bodyPath, { force: true });
        return;
      }
      const direct = await curlOnce(url, bodyPath);
      const prior = byUrl.get(url) || {};
      byUrl.set(url, {
        ...prior,
        url,
        verdict: verdictFor(direct),
        httpCode: direct.code,
        pageTitle: direct.title || undefined,
        effectiveUrl: direct.effective && direct.effective !== url ? direct.effective : undefined,
        error: direct.error || undefined,
        probedOn: today,
        probedBy: PROBED_BY,
      });
      done += 1;
      if (onProgress) onProgress(done, urls.length);
    }
  }

  const workers = Math.max(1, Math.min(concurrency, queue.length));
  await Promise.all(Array.from({ length: workers }, (_, slot) => worker(slot)));
  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}
