// Daily pull from Google Search Console.
// Usage: `npm run pull` from ops/scripts/seo/
// Outputs:
//   - ops/data/seo/YYYY-MM-DD.json          (raw snapshot for archival/diffing)
//   - ops/reports/seo/daily-log.md          (appended human-readable digest)

import fs from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { PATHS, PRIORITY_URLS } from './config.mjs';

const isoDate = (d) => d.toISOString().slice(0, 10);
const TODAY = new Date();
const dateMinus = (n) => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
};

const VERBOSE = process.argv.includes('--verbose');
const log = (...args) => console.log(...args);
const vlog = (...args) => { if (VERBOSE) console.log(...args); };

async function getClient() {
  const secret = JSON.parse(await fs.readFile(PATHS.clientSecret, 'utf8'));
  const token = JSON.parse(await fs.readFile(PATHS.token, 'utf8'));
  const { client_id, client_secret } = secret.installed;
  const auth = new google.auth.OAuth2(client_id, client_secret);
  auth.setCredentials(token);
  auth.on('tokens', async (newTokens) => {
    const merged = { ...token, ...newTokens };
    await fs.writeFile(PATHS.token, JSON.stringify(merged, null, 2));
    vlog('  (refreshed access token)');
  });
  return auth;
}

async function loadProperty() {
  return JSON.parse(await fs.readFile(PATHS.property, 'utf8'));
}

async function sa(sc, siteUrl, body) {
  const res = await sc.searchanalytics.query({ siteUrl, requestBody: body });
  return res.data.rows || [];
}

async function inspect(sc, siteUrl, inspectionUrl) {
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: { siteUrl, inspectionUrl },
    });
    return res.data.inspectionResult;
  } catch (err) {
    return { error: err.message, code: err.code };
  }
}

function pct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}
function num(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-AU');
}
function pos(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1);
}
function delta(curr, prev, fmt = num, invert = false) {
  if (curr === null || prev === null || curr === undefined || prev === undefined) return fmt(curr);
  const diff = curr - prev;
  const sign = diff > 0 ? '+' : '';
  const arrow = (invert ? -diff : diff) > 0 ? '↑' : (invert ? -diff : diff) < 0 ? '↓' : '·';
  return `${fmt(curr)}  (${sign}${fmt(diff)} ${arrow})`;
}

async function main() {
  const auth = await getClient();
  const property = await loadProperty();
  const sc = google.searchconsole({ version: 'v1', auth });

  const runDate = isoDate(TODAY);
  const endDate = dateMinus(2);              // GSC has ~2-day reporting lag
  const startDate28 = dateMinus(29);
  const startDate7 = dateMinus(8);
  const startDatePrev7 = dateMinus(15);
  const endDatePrev7 = dateMinus(9);

  log(`\n  Run date:   ${runDate}`);
  log(`  Property:   ${property.siteUrl}`);
  log(`  Window:     ${startDate28} → ${endDate}  (28d)`);
  log(`              ${startDate7} → ${endDate}  (7d)  vs  ${startDatePrev7} → ${endDatePrev7}  (prev 7d)\n`);

  log('Pulling Search Analytics...');
  const [
    headline28,
    headline7,
    headlinePrev7,
    daily28,
    queries28,
    pages28,
    countries28,
    devices28,
  ] = await Promise.all([
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: [], rowLimit: 1 }),
    sa(sc, property.siteUrl, { startDate: startDate7, endDate, dimensions: [], rowLimit: 1 }),
    sa(sc, property.siteUrl, { startDate: startDatePrev7, endDate: endDatePrev7, dimensions: [], rowLimit: 1 }),
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: ['date'], rowLimit: 30 }),
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: ['query'], rowLimit: 100 }),
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: ['page'], rowLimit: 100 }),
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: ['country'], rowLimit: 25 }),
    sa(sc, property.siteUrl, { startDate: startDate28, endDate, dimensions: ['device'], rowLimit: 5 }),
  ]);
  log(`  ${queries28.length} queries · ${pages28.length} pages · ${daily28.length} days`);

  log('\nInspecting priority URLs...');
  const inspections = {};
  for (const url of PRIORITY_URLS) {
    const result = await inspect(sc, property.siteUrl, url);
    inspections[url] = result;
    const verdict = result?.indexStatusResult?.verdict || result?.error || 'UNKNOWN';
    const coverage = result?.indexStatusResult?.coverageState || '';
    log(`  ${verdict.padEnd(10)} ${coverage.padEnd(45)} ${url}`);
    // small delay to be polite to the API (URL inspection has stricter quota)
    await new Promise((r) => setTimeout(r, 200));
  }

  const snapshot = {
    runDate,
    runTimestamp: new Date().toISOString(),
    property: property.siteUrl,
    ranges: {
      last28d: { startDate: startDate28, endDate },
      last7d: { startDate: startDate7, endDate },
      prev7d: { startDate: startDatePrev7, endDate: endDatePrev7 },
    },
    headline: {
      last28d: headline28[0] || null,
      last7d: headline7[0] || null,
      prev7d: headlinePrev7[0] || null,
    },
    daily: daily28,
    queries: queries28,
    pages: pages28,
    countries: countries28,
    devices: devices28,
    inspections,
  };

  await fs.mkdir(PATHS.dataDir, { recursive: true });
  const rawPath = path.join(PATHS.dataDir, `${runDate}.json`);
  await fs.writeFile(rawPath, JSON.stringify(snapshot, null, 2));
  log(`\nSaved raw snapshot: ${rawPath}`);

  await fs.mkdir(PATHS.reportsDir, { recursive: true });
  const digest = renderDigest(snapshot);
  await appendDailyLog(digest);
  log(`Appended digest:    ${PATHS.dailyLog}`);

  log('\nDone.');
}

function renderDigest(s) {
  const h7 = s.headline.last7d;
  const hp = s.headline.prev7d;
  const h28 = s.headline.last28d;

  const indexedCount = Object.values(s.inspections).filter(
    (i) => i?.indexStatusResult?.verdict === 'PASS',
  ).length;
  const inspectedCount = Object.keys(s.inspections).length;

  const topQueriesByClicks = [...s.queries]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
  const topQueriesByImpressions = [...s.queries]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
  const opportunityQueries = [...s.queries]
    .filter((q) => q.impressions >= 20 && q.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
  const topPagesByClicks = [...s.pages]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
  const opportunityPages = [...s.pages]
    .filter((p) => p.impressions >= 30 && p.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const lines = [];
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`## ${s.runDate} — daily pull`);
  lines.push('');
  lines.push(`Property: \`${s.property}\``);
  lines.push(`Window (last 7d): ${s.ranges.last7d.startDate} → ${s.ranges.last7d.endDate}`);
  lines.push('');
  lines.push('### Headline (last 7d vs previous 7d)');
  lines.push('');
  lines.push('| Metric | Last 7d | Prev 7d | Δ | Last 28d |');
  lines.push('|---|---:|---:|---:|---:|');
  lines.push(`| Clicks | ${num(h7?.clicks)} | ${num(hp?.clicks)} | ${delta(h7?.clicks, hp?.clicks)} | ${num(h28?.clicks)} |`);
  lines.push(`| Impressions | ${num(h7?.impressions)} | ${num(hp?.impressions)} | ${delta(h7?.impressions, hp?.impressions)} | ${num(h28?.impressions)} |`);
  lines.push(`| CTR | ${pct(h7?.ctr)} | ${pct(hp?.ctr)} | ${delta(h7?.ctr, hp?.ctr, pct)} | ${pct(h28?.ctr)} |`);
  lines.push(`| Avg position | ${pos(h7?.position)} | ${pos(hp?.position)} | ${delta(h7?.position, hp?.position, pos, true)} | ${pos(h28?.position)} |`);
  lines.push('');
  lines.push(`### Indexation (priority URLs): ${indexedCount} / ${inspectedCount} indexed`);
  lines.push('');
  lines.push('| URL | Verdict | Coverage |');
  lines.push('|---|---|---|');
  for (const [url, r] of Object.entries(s.inspections)) {
    const v = r?.indexStatusResult?.verdict || (r?.error ? 'ERROR' : 'UNKNOWN');
    const c = r?.indexStatusResult?.coverageState || (r?.error || '—');
    lines.push(`| \`${url.replace('https://peninsulainsider.com.au', '')}\` | ${v} | ${c} |`);
  }
  lines.push('');
  lines.push('### Top 10 queries by clicks (last 28d)');
  lines.push('');
  lines.push('| # | Query | Clicks | Impr | CTR | Pos |');
  lines.push('|---:|---|---:|---:|---:|---:|');
  topQueriesByClicks.forEach((q, i) => {
    lines.push(`| ${i + 1} | ${q.keys[0]} | ${num(q.clicks)} | ${num(q.impressions)} | ${pct(q.ctr)} | ${pos(q.position)} |`);
  });
  lines.push('');
  lines.push('### Top 10 queries by impressions (last 28d)');
  lines.push('');
  lines.push('| # | Query | Impr | Clicks | CTR | Pos |');
  lines.push('|---:|---|---:|---:|---:|---:|');
  topQueriesByImpressions.forEach((q, i) => {
    lines.push(`| ${i + 1} | ${q.keys[0]} | ${num(q.impressions)} | ${num(q.clicks)} | ${pct(q.ctr)} | ${pos(q.position)} |`);
  });
  lines.push('');
  if (opportunityQueries.length) {
    lines.push('### CTR opportunity queries (≥20 impr, <2% CTR)');
    lines.push('');
    lines.push('| # | Query | Impr | CTR | Pos |');
    lines.push('|---:|---|---:|---:|---:|');
    opportunityQueries.forEach((q, i) => {
      lines.push(`| ${i + 1} | ${q.keys[0]} | ${num(q.impressions)} | ${pct(q.ctr)} | ${pos(q.position)} |`);
    });
    lines.push('');
  }
  lines.push('### Top 10 pages by clicks (last 28d)');
  lines.push('');
  lines.push('| # | Page | Clicks | Impr | CTR | Pos |');
  lines.push('|---:|---|---:|---:|---:|---:|');
  topPagesByClicks.forEach((p, i) => {
    const path = p.keys[0].replace('https://peninsulainsider.com.au', '');
    lines.push(`| ${i + 1} | \`${path}\` | ${num(p.clicks)} | ${num(p.impressions)} | ${pct(p.ctr)} | ${pos(p.position)} |`);
  });
  lines.push('');
  if (opportunityPages.length) {
    lines.push('### CTR opportunity pages (≥30 impr, <2% CTR)');
    lines.push('');
    lines.push('| # | Page | Impr | CTR | Pos |');
    lines.push('|---:|---|---:|---:|---:|');
    opportunityPages.forEach((p, i) => {
      const path = p.keys[0].replace('https://peninsulainsider.com.au', '');
      lines.push(`| ${i + 1} | \`${path}\` | ${num(p.impressions)} | ${pct(p.ctr)} | ${pos(p.position)} |`);
    });
    lines.push('');
  }
  lines.push('### Devices (last 28d)');
  lines.push('');
  lines.push('| Device | Clicks | Impr | CTR | Pos |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const d of s.devices) {
    lines.push(`| ${d.keys[0]} | ${num(d.clicks)} | ${num(d.impressions)} | ${pct(d.ctr)} | ${pos(d.position)} |`);
  }
  lines.push('');
  lines.push('### Top countries (last 28d)');
  lines.push('');
  lines.push('| Country | Clicks | Impr | CTR | Pos |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const c of s.countries.slice(0, 8)) {
    lines.push(`| ${c.keys[0]} | ${num(c.clicks)} | ${num(c.impressions)} | ${pct(c.ctr)} | ${pos(c.position)} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### Notes');
  lines.push('_Add interpretation, decisions, and actions taken below._');
  lines.push('');

  return lines.join('\n');
}

async function appendDailyLog(digest) {
  let header = '';
  try {
    await fs.access(PATHS.dailyLog);
  } catch {
    header = '# Peninsula Insider — SEO daily log\n\nAppended by `ops/scripts/seo/pull.mjs`. Newest entries at the bottom.\n';
  }
  await fs.appendFile(PATHS.dailyLog, header + digest, 'utf8');
}

main().catch((err) => {
  console.error('\nPull failed:', err.message || err);
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
