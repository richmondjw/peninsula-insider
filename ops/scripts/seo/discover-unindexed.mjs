// Reverse-engineer the GSC "Page indexing" report by inspecting every known URL.
//
// Why: GSC's API does not expose the Page Indexing per-URL list. The only direct
// way to get "Discovered - currently not indexed" URLs is the UI export (limited
// to 1,000 rows). Inspecting every URL via urlInspection gives us the same data
// plus current verdicts, with a richer downstream workflow.
//
// URL universe = union of:
//   1. sitemap.xml on the live site
//   2. URLs returned by GSC Performance API (any page with impressions in last 90d)
//   3. (optionally) source paths from next/src/pages and content collections
//
// Quota: urlInspection allows ~2,000/day per property. We stay well below.
// Rate limiting: 600ms delay = ~100 req/min, comfortable under GSC's QPM limit.
//
// Usage:
//   node discover-unindexed.mjs                    # full run, all sources
//   node discover-unindexed.mjs --max=50           # cap inspections (testing)
//   node discover-unindexed.mjs --skip-known       # skip URLs already in latest pull as PASS

import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { PATHS, REPO_ROOT } from './config.mjs';

const ARGS = Object.fromEntries(
  process.argv.slice(2).flatMap(a => a.startsWith('--') ? [[...a.slice(2).split('=', 2), true].slice(0, 2)] : []),
);
const MAX = ARGS.max ? Number(ARGS.max) : Infinity;
const DELAY_MS = ARGS.delay ? Number(ARGS.delay) : 600;
const ORIGIN = 'https://peninsulainsider.com.au';

// ---------- helpers ----------
const isoDate = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const dateMinus = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return isoDate(d); };

async function getClient() {
  const secret = JSON.parse(await fs.readFile(PATHS.clientSecret, 'utf8'));
  const token = JSON.parse(await fs.readFile(PATHS.token, 'utf8'));
  const auth = new google.auth.OAuth2(secret.installed.client_id, secret.installed.client_secret);
  auth.setCredentials(token);
  auth.on('tokens', async (newTokens) => {
    await fs.writeFile(PATHS.token, JSON.stringify({ ...token, ...newTokens }, null, 2));
  });
  return auth;
}

async function fetchSitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
  return [...matches].map(m => m[1]);
}

async function fetchGscPages(sc, siteUrl) {
  const startDate = dateMinus(90);
  const endDate = dateMinus(2);
  const all = new Set();
  let startRow = 0;
  const rowLimit = 5000;
  while (true) {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions: ['page'], rowLimit, startRow },
    });
    const rows = res.data.rows || [];
    for (const r of rows) all.add(r.keys[0]);
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
    if (startRow > 25000) break;
  }
  return [...all];
}

function normaliseUrl(u) {
  // Force https + collapse to canonical-ish form (preserve trailing slash variation as Google does).
  let url = u.trim();
  if (!url) return null;
  if (url.startsWith('http://')) url = 'https://' + url.slice(7);
  if (url.startsWith('//')) url = 'https:' + url;
  if (!url.startsWith('http')) return null;
  // Strip query params and fragments — they aren't separately indexed
  try { const u2 = new URL(url); u2.search = ''; u2.hash = ''; return u2.toString(); } catch { return null; }
}

async function inspect(sc, siteUrl, inspectionUrl) {
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: { siteUrl, inspectionUrl },
    });
    return res.data.inspectionResult;
  } catch (err) {
    return { __error: err.message, __code: err.code };
  }
}

// ---------- main ----------
async function main() {
  const auth = await getClient();
  const property = JSON.parse(await fs.readFile(PATHS.property, 'utf8'));
  const sc = google.searchconsole({ version: 'v1', auth });

  console.log('Building URL universe...');
  const sitemapUrls = await fetchSitemapUrls();
  console.log(`  sitemap: ${sitemapUrls.length} URLs`);

  const gscPages = await fetchGscPages(sc, property.siteUrl);
  console.log(`  GSC perf (90d): ${gscPages.length} pages with impressions`);

  // Union, normalise, dedupe
  const universe = new Set();
  for (const u of [...sitemapUrls, ...gscPages]) {
    const n = normaliseUrl(u);
    if (n) universe.add(n);
  }
  let urls = [...universe].sort();
  console.log(`  union (deduped, https-normalised): ${urls.length} URLs\n`);

  if (Number.isFinite(MAX) && urls.length > MAX) {
    urls = urls.slice(0, MAX);
    console.log(`  capped to ${MAX} for this run\n`);
  }

  // Inspect each
  const results = {};
  let i = 0;
  console.log(`Inspecting ${urls.length} URLs (~${Math.round(urls.length * DELAY_MS / 1000 / 60)} min)...`);
  for (const url of urls) {
    i++;
    const r = await inspect(sc, property.siteUrl, url);
    results[url] = r;
    const v = r?.indexStatusResult?.verdict || (r?.__error ? 'ERROR' : 'UNK');
    const c = r?.indexStatusResult?.coverageState || (r?.__error || '');
    if (i % 25 === 0 || v !== 'PASS') {
      const tag = v === 'PASS' ? '✓' : v === 'ERROR' ? '!' : '·';
      console.log(`  [${String(i).padStart(3)}/${urls.length}] ${tag} ${v.padEnd(8)} ${c.padEnd(45).slice(0, 45)} ${url.replace(ORIGIN, '')}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // Categorise
  const byCategory = {};
  for (const [url, r] of Object.entries(results)) {
    const c = r?.indexStatusResult?.coverageState || (r?.__error ? `ERROR: ${r.__error}` : 'UNKNOWN');
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(url);
  }

  // Save raw + summary
  await fs.mkdir(PATHS.dataDir, { recursive: true });
  const stamp = isoDate(today);
  const rawPath = path.join(PATHS.dataDir, `discover-unindexed-${stamp}.json`);
  await fs.writeFile(rawPath, JSON.stringify({
    runDate: stamp,
    counts: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])),
    sources: { sitemap: sitemapUrls.length, gscPerf: gscPages.length, universe: urls.length },
    results,
  }, null, 2));
  console.log(`\nSaved raw: ${rawPath}`);

  console.log('\nSummary:');
  const sorted = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
  for (const [cat, urls] of sorted) {
    console.log(`  ${String(urls.length).padStart(4)}  ${cat}`);
  }

  // Markdown report
  const reportPath = path.join(PATHS.reportsDir, 'url-inventory.md');
  const lines = [];
  lines.push(`# URL inventory — ${stamp}`);
  lines.push('');
  lines.push(`Generated by \`ops/scripts/seo/discover-unindexed.mjs\`. Inspected ${urls.length} URLs (sitemap ∪ GSC performance, last 90d, https-normalised).`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Category | Count | What it means |');
  lines.push('|---|---:|---|');
  const meaning = {
    'Submitted and indexed': 'In the index. Healthy.',
    'Indexed, not submitted in sitemap': 'In the index, but not in our sitemap. Either add to sitemap or noindex.',
    'Discovered - currently not indexed': 'Google knows about it, has not crawled. Usually a quality / link-equity signal.',
    'Crawled - currently not indexed': 'Google fetched it, decided not to index. Quality signal.',
    'Alternate page with proper canonical tag': 'Duplicate of another URL with a different canonical. Usually fine.',
    'Page with redirect': 'URL 301s elsewhere. Usually fine.',
    'Excluded by ‘noindex’ tag': 'We told Google not to index. Intentional.',
    'URL is unknown to Google': 'Google has not seen this URL.',
  };
  for (const [cat, urls] of sorted) {
    lines.push(`| ${cat} | ${urls.length} | ${meaning[cat] || ''} |`);
  }
  lines.push('');
  for (const [cat, urls] of sorted) {
    lines.push(`## ${cat} (${urls.length})`);
    lines.push('');
    if (urls.length === 0) { lines.push('_(none)_'); lines.push(''); continue; }
    lines.push('```');
    for (const u of urls.slice().sort()) lines.push(u.replace(ORIGIN, ''));
    lines.push('```');
    lines.push('');
  }
  await fs.writeFile(reportPath, lines.join('\n'));
  console.log(`Wrote report: ${reportPath}`);
}

main().catch(err => { console.error('FAIL:', err.message || err); process.exit(1); });
