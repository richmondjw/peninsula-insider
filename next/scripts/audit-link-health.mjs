#!/usr/bin/env node
/**
 * audit-link-health.mjs - the source-link gate (PI-007).
 *
 * Forty-five of the corpus's outbound source URLs were dead when PI-007 sized
 * the queue, and nothing on this site could see it. A record's verification
 * date is only meaningful if the source behind it can still be read; when the
 * source 404s, or its domain stops resolving, the date becomes unfalsifiable
 * and the claim it stamps is unsupported without ever having been edited. That
 * is exactly the failure this programme exists to stop: a confident published
 * claim nobody can check.
 *
 * THE ONE RULE THAT SHAPES EVERYTHING BELOW
 *
 * A CI gate may never fail because a remote server had a bad night. Link
 * checking is the classic time-driven gate: it goes red at 3am with no code
 * change, everyone learns to ignore it, and the next real failure is ignored
 * too. So this script separates the two halves absolutely.
 *
 *   --probe   touches the network. Writes the ledger. Never runs in CI.
 *   (default) reads the ledger and the content tree. No network at all.
 *   --assert  compares the no-network metrics to a committed baseline.
 *
 * Every asserted metric is therefore a property of the files on disk. Run it
 * on any date, on any machine, offline, and the same tree yields the same
 * numbers. A remote site going down overnight changes nothing until a human
 * runs --probe and commits the result.
 *
 * WHAT IT ASSERTS
 *
 *   unledgeredSourceUrl
 *       A source URL cited by a content record with no row in the ledger.
 *       This is the metric that makes the gate ratchet forward rather than
 *       merely hold: adding a new citation without probing it fails the
 *       build. Nobody can quietly introduce an unchecked source.
 *
 *   deadSourceUrlCited
 *       A URL the ledger records as dead, still cited by a record that has
 *       not disposed of it. Disposal is explicit: the citing record carries
 *       sourceStatus "unsourced" or "disputed", so the registry and the
 *       blind-spot reporting can see the gap rather than the claim quietly
 *       disappearing. Ratchets down as the queue is worked.
 *
 *   staleRedirectCited
 *       The ledger knows where a moved URL went and the record still points
 *       at the old one. Cheap to fix, so it ratchets to zero fast.
 *
 * WHAT THE LEDGER IS
 *
 * ops/reports/content/link-health-ledger.json. One row per distinct URL: the
 * verdict, the HTTP code seen, the date probed, and a human note. A verdict is
 * never inferred at read time - it is what a probe saw, written down, and
 * reviewable in a diff.
 *
 * Verdicts:
 *   ok          2xx or 3xx carrying a real page.
 *   blocked     The host refuses automation (400/401/403/406/429/503, or a
 *               2xx carrying a bot challenge - Cloudflare answers a robot
 *               with HTTP 202 and a captcha, which naive checkers score as
 *               healthy). NOT dead. The council is this site's most-cited
 *               publisher and refuses most automated reads; a checker that
 *               marked those dead would delete a third of the corpus's
 *               provenance over a robots policy.
 *   parked      HTTP 200 from a registrar holding page, an expired site
 *               builder, or a domain-for-sale lander. Worse than a 404: the
 *               link looks healthy to every status-code checker and sends a
 *               reader nowhere. Counted dead, because it is.
 *   moved       Dead at this URL, alive at `replacement`.
 *   dead        Nothing at this URL and no equivalent found. The claim it
 *               supported is unsourced until an editor finds one.
 *   tls-fault   Reachable, but the certificate does not match the hostname.
 *               The content is there; the URL as written cannot be fetched
 *               safely, so a reader following it sees a browser warning.
 *   unknown     Probed and inconclusive. Never asserted on.
 *
 * WHAT IT CANNOT CATCH
 *
 * A URL that resolves to a page which no longer carries the claim. HTTP 200 is
 * not evidence of support. That is the PI-005 registry's job, not a link
 * checker's, and pretending otherwise would be the same overconfidence in a
 * new costume.
 *
 * Usage:
 *   node scripts/audit-link-health.mjs [--json out.json] [--assert]
 *                                      [--baseline path] [--update-baseline]
 *                                      [--ledger path] [--content-dir path]
 *                                      [--probe] [--probe-only substring]
 *                                      [--concurrency N]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import YAML from 'yaml';

const execFileAsync = promisify(execFile);

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const LEDGER = path.resolve(
  getArg('--ledger', path.join(REPO, 'ops', 'reports', 'content', 'link-health-ledger.json'))
);
const BASELINE = path.resolve(
  getArg('--baseline', path.join(REPO, 'ops', 'reports', 'content', 'link-health-baseline.json'))
);
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');
const PROBE = args.includes('--probe');
const PROBE_ONLY = getArg('--probe-only', null);
const CONCURRENCY = Number(getArg('--concurrency', '6')) || 6;

const multi = (flag, fallback) => {
  const found = [];
  args.forEach((a, i) => {
    if (a === flag && args[i + 1] && !args[i + 1].startsWith('--')) found.push(path.resolve(args[i + 1]));
  });
  return found.length ? found : fallback;
};
const CONTENT_DIRS = multi('--content-dir', [path.join(NEXT, 'src', 'content')]);

const ASSERTED_METRICS = new Set([
  'unledgeredSourceUrl',
  'deadSourceUrlCited',
  'staleRedirectCited',
]);

/**
 * Verdicts that mean this citation no longer supports anything. `parked` is
 * here because a registrar holding page is a worse failure than a 404, not a
 * lesser one: it answers 200 to every checker while sending the reader to an
 * advertisement.
 */
const DEAD_VERDICTS = new Set(['dead', 'parked']);

/* ------------------------------------------------------------------ */
/* Which fields are a SOURCE                                           */
/* ------------------------------------------------------------------ */

/**
 * A source is a URL the corpus offers as evidence, or as the operator's own
 * canonical page. heroImage.credit is not a source; officialEventUrl is. The
 * list is deliberately explicit rather than "any http string": a gate that
 * fires on every outbound link in prose is a gate people disable.
 */
const SOURCE_FIELD_LEAVES = new Set([
  'url',
  'source',
  'sourceUrl',
  'sourceURL',
  'officialUrl',
  'officialEventUrl',
  'primarySourceUrl',
  'secondarySourceUrl',
  'website',
  'bookingUrl',
  'vfaCitationUrl',
  'citationUrl',
  'authorityUrl',
  'organiserUrl',
]);

const leafOf = (fieldPath) => fieldPath.split('.').pop().replace(/\[\d+\]$/, '');
const isSourceField = (fieldPath) => SOURCE_FIELD_LEAVES.has(leafOf(fieldPath));

/* ------------------------------------------------------------------ */
/* Walking the corpus                                                  */
/* ------------------------------------------------------------------ */

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
      out.push(...(await walk(abs)));
    } else if (['.json', '.md', '.mdx'].includes(path.extname(entry.name))) {
      out.push(abs);
    }
  }
  return out;
}

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

function normaliseUrl(raw) {
  const out = [];
  // Several records pack two or three URLs into one string with a pipe.
  for (const piece of String(raw).split(/[\s|,]+/)) {
    const candidate = piece.trim().replace(/[),.;]+$/, '');
    if (!/^https?:\/\//i.test(candidate)) continue;
    try {
      new URL(candidate);
    } catch {
      continue;
    }
    out.push(candidate);
  }
  return out;
}

function collect(node, filePath, prefix, sink) {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (!isSourceField(fieldPath)) continue;
      for (const url of normaliseUrl(value)) sink.push({ url, file: filePath, field: fieldPath });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') {
          if (!isSourceField(fieldPath)) return;
          for (const url of normaliseUrl(item)) {
            sink.push({ url, file: filePath, field: `${fieldPath}[${i}]` });
          }
        } else {
          collect(item, filePath, `${fieldPath}[${i}]`, sink);
        }
      });
    } else {
      collect(value, filePath, fieldPath, sink);
    }
  }
}

/** Every source citation in the corpus, with the record and field it sits in. */
async function collectCitations() {
  const citations = [];
  const records = new Map();
  for (const dir of CONTENT_DIRS) {
    for (const abs of await walk(dir)) {
      const relPath = rel(abs);
      let text;
      try {
        text = await readFile(abs, 'utf8');
      } catch {
        continue;
      }
      let data = null;
      if (path.extname(abs) === '.json') {
        try {
          data = JSON.parse(text);
        } catch {
          continue;
        }
      } else {
        const m = FRONTMATTER.exec(text);
        if (!m) continue;
        try {
          data = YAML.parse(m[1]);
        } catch {
          continue;
        }
      }
      if (!data || typeof data !== 'object') continue;
      records.set(relPath, data);
      collect(data, relPath, '', citations);
    }
  }
  return { citations, records };
}

/* ------------------------------------------------------------------ */
/* Probe (network). Never runs under --assert.                         */
/* ------------------------------------------------------------------ */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

/**
 * Codes a live host returns when it dislikes a robot rather than when the page
 * is gone. Treating these as dead is the single most damaging mistake a link
 * checker makes on this corpus - see the council note in the header.
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

const bodyTmp = (slot) =>
  path.join(tmpdir(), `pi-link-health-${process.pid}-${slot}.html`);

async function curlOnce(url, bodyPath, extra = []) {
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
    ...extra,
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

function verdictFor(direct) {
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

async function probe(urls, existing) {
  const ledger = new Map(existing.map((row) => [row.url, row]));
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
      const prior = ledger.get(url) || {};
      ledger.set(url, {
        ...prior,
        url,
        verdict: verdictFor(direct),
        httpCode: direct.code,
        pageTitle: direct.title || undefined,
        effectiveUrl: direct.effective && direct.effective !== url ? direct.effective : undefined,
        error: direct.error || undefined,
        probedOn: today,
        probedBy: 'audit-link-health.mjs --probe',
        // A human disposition (replacement, note, reviewedOn) survives a
        // re-probe. The machine owns the verdict; the editor owns the
        // judgement about what to do with it.
      });
      done += 1;
      if (done % 25 === 0) console.log(`    probed ${done}/${urls.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(CONCURRENCY, queue.length)) }, (_, slot) => worker(slot)));
  return [...ledger.values()].sort((a, b) => a.url.localeCompare(b.url));
}

/* ------------------------------------------------------------------ */

async function readLedger() {
  try {
    const parsed = JSON.parse(await readFile(LEDGER, 'utf8'));
    return Array.isArray(parsed.links) ? parsed.links : [];
  } catch {
    return [];
  }
}

async function main() {
  const { citations, records } = await collectCitations();
  const citedUrls = [...new Set(citations.map((c) => c.url))].sort();

  let ledgerRows = await readLedger();

  if (PROBE) {
    const target = PROBE_ONLY ? citedUrls.filter((u) => u.includes(PROBE_ONLY)) : citedUrls;
    console.log(`Probing ${target.length} URL(s) at concurrency ${CONCURRENCY}. This touches the network.`);
    ledgerRows = await probe(target, ledgerRows);
    await mkdir(path.dirname(LEDGER), { recursive: true });
    await writeFile(
      LEDGER,
      `${JSON.stringify(
        {
          note: 'Probe results for every source URL in the corpus. Written only by --probe; read offline by the gate. A verdict is what a probe saw, not an inference.',
          updatedAt: new Date().toISOString(),
          links: ledgerRows,
        },
        null,
        2
      )}\n`
    );
    console.log(`  ledger -> ${rel(LEDGER)}`);
  }

  const ledger = new Map(ledgerRows.map((row) => [row.url, row]));

  /** A record may declare its own claim unsourced, which disposes of a dead link. */
  const disposed = (file) => {
    const data = records.get(file);
    if (!data) return false;
    return data.sourceStatus === 'unsourced' || data.sourceStatus === 'disputed';
  };

  const unledgered = [];
  const deadCited = [];
  const staleRedirect = [];
  const blockedCited = [];

  for (const citation of citations) {
    const row = ledger.get(citation.url);
    if (!row) {
      unledgered.push({ ...citation });
      continue;
    }
    if (DEAD_VERDICTS.has(row.verdict) && !disposed(citation.file)) {
      deadCited.push({ ...citation, verdict: row.verdict, note: row.note ?? null });
    }
    if (row.verdict === 'moved' && row.replacement && row.replacement !== citation.url) {
      staleRedirect.push({ ...citation, replacement: row.replacement });
    }
    if (row.verdict === 'blocked') blockedCited.push({ ...citation });
  }

  const verdictCounts = {};
  for (const row of ledgerRows) verdictCounts[row.verdict] = (verdictCounts[row.verdict] ?? 0) + 1;

  const report = {
    generatedAt: new Date().toISOString(),
    assertedMetrics: [...ASSERTED_METRICS],
    ledger: rel(LEDGER),
    citations: citations.length,
    distinctUrls: citedUrls.length,
    verdictCounts,
    totals: {
      unledgeredSourceUrl: new Set(unledgered.map((u) => u.url)).size,
      deadSourceUrlCited: deadCited.length,
      staleRedirectCited: staleRedirect.length,
    },
    unledgeredSourceUrl: unledgered,
    deadSourceUrlCited: deadCited,
    staleRedirectCited: staleRedirect,
    blockedSourceUrlCited: blockedCited,
  };

  const t = report.totals;
  console.log('Source-link health');
  console.log('');
  console.log(`  citations ......................... ${report.citations}`);
  console.log(`  distinct source URLs .............. ${report.distinctUrls}`);
  console.log(
    `  ledger verdicts ................... ${Object.entries(verdictCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join('  ')}`
  );
  console.log('');
  console.log(`    URLs cited with no ledger row ... ${t.unledgeredSourceUrl}   [gated]`);
  console.log(`    dead URL still cited ............ ${t.deadSourceUrlCited}   [gated, ratchets down]`);
  console.log(`    moved URL not yet followed ...... ${t.staleRedirectCited}   [gated, ratchets down]`);
  console.log(`    blocked host cited (not a fault)  ${blockedCited.length}   [reported only]`);
  console.log('');
  for (const u of unledgered.slice(0, 40)) console.log(`    UNLEDGERED  ${u.file}  ${u.field}  ${u.url}`);
  for (const d of deadCited.slice(0, 60)) console.log(`    DEAD        ${d.file}  ${d.field}  ${d.url}`);
  for (const s of staleRedirect.slice(0, 40)) {
    console.log(`    MOVED       ${s.file}  ${s.field}  ${s.url} -> ${s.replacement}`);
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n  report -> ${rel(out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        { updatedAt: report.generatedAt, assertedMetrics: [...ASSERTED_METRICS], ceilings: t },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing baseline must not read as "no regression".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:link-health -- --update-baseline');
    process.exit(1);
  }

  const failures = [];
  for (const [metric, ceiling] of Object.entries(baseline.ceilings ?? {})) {
    if (!ASSERTED_METRICS.has(metric)) continue;
    const actual = t[metric];
    if (typeof actual === 'number' && actual > ceiling) {
      failures.push(`${metric}: ${actual} > baseline ${ceiling}`);
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: source-link regression against the ratchet baseline');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  A new citation must be probed before it ships:');
    console.error('    cd next && npm run audit:link-health -- --probe');
    console.error('  Then fix or dispose of what the probe found, or re-seed the');
    console.error('  baseline deliberately with --update-baseline.');
    process.exit(1);
  }
  console.log('  PASS: no regression against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
