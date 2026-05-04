// Diff two daily snapshots to surface improvements and regressions.
// Usage: node diff.mjs <prevDate> <currDate>
//        node diff.mjs 2026-05-01 2026-05-02

import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.mjs';

const [, , prevArg, currArg] = process.argv;
if (!prevArg || !currArg) {
  console.error('Usage: node diff.mjs <prevDate> <currDate>');
  process.exit(1);
}

const prev = JSON.parse(await fs.readFile(path.join(PATHS.dataDir, `${prevArg}.json`), 'utf8'));
const curr = JSON.parse(await fs.readFile(path.join(PATHS.dataDir, `${currArg}.json`), 'utf8'));

const num = (n) => n == null ? '—' : Number(n).toLocaleString('en-AU');
const pct = (n) => n == null ? '—' : `${(n * 100).toFixed(2)}%`;
const pos = (n) => n == null ? '—' : Number(n).toFixed(1);
const arrow = (d, invert = false) => {
  const v = invert ? -d : d;
  if (v > 0) return '↑';
  if (v < 0) return '↓';
  return '·';
};
const delta = (c, p, fmt = num, invert = false) => {
  if (c == null || p == null) return '—';
  const d = c - p;
  const sign = d > 0 ? '+' : '';
  return `${sign}${fmt(d)} ${arrow(d, invert)}`;
};

console.log(`\n=== SNAPSHOT DIFF: ${prevArg} → ${currArg} ===`);
console.log(`Property: ${curr.property}`);
console.log(`Window prev: ${prev.ranges.last7d.startDate} → ${prev.ranges.last7d.endDate}`);
console.log(`Window curr: ${curr.ranges.last7d.startDate} → ${curr.ranges.last7d.endDate}\n`);

// --- HEADLINE ---
console.log('--- HEADLINE METRICS ---');
const ranges = ['last7d', 'last28d'];
for (const r of ranges) {
  const c = curr.headline[r];
  const p = prev.headline[r];
  console.log(`\n  ${r}:  curr=${curr.ranges[r].startDate}→${curr.ranges[r].endDate}  prev=${prev.ranges[r].startDate}→${prev.ranges[r].endDate}`);
  console.log(`    Clicks      : ${num(c?.clicks).padStart(8)}  vs  ${num(p?.clicks).padStart(8)}  Δ ${delta(c?.clicks, p?.clicks)}`);
  console.log(`    Impressions : ${num(c?.impressions).padStart(8)}  vs  ${num(p?.impressions).padStart(8)}  Δ ${delta(c?.impressions, p?.impressions)}`);
  console.log(`    CTR         : ${pct(c?.ctr).padStart(8)}  vs  ${pct(p?.ctr).padStart(8)}  Δ ${delta(c?.ctr, p?.ctr, pct)}`);
  console.log(`    Avg pos     : ${pos(c?.position).padStart(8)}  vs  ${pos(p?.position).padStart(8)}  Δ ${delta(c?.position, p?.position, pos, true)}`);
}

// --- INDEXATION (priority URLs) ---
console.log('\n--- PRIORITY URL INDEXATION ---');
const movements = [];
for (const url of Object.keys(curr.inspections)) {
  const cv = curr.inspections[url]?.indexStatusResult?.verdict || curr.inspections[url]?.error || 'UNKNOWN';
  const cc = curr.inspections[url]?.indexStatusResult?.coverageState || '';
  const pv = prev.inspections[url]?.indexStatusResult?.verdict || prev.inspections[url]?.error || 'UNKNOWN';
  const pc = prev.inspections[url]?.indexStatusResult?.coverageState || '';
  const path = url.replace('https://peninsulainsider.com.au', '');
  let status = '·';
  if (pv !== 'PASS' && cv === 'PASS') status = 'GAINED';
  else if (pv === 'PASS' && cv !== 'PASS') status = 'LOST';
  else if (pc !== cc) status = 'changed';
  movements.push({ url, path, status, prev: `${pv}|${pc}`, curr: `${cv}|${cc}` });
}

const gained = movements.filter(m => m.status === 'GAINED');
const lost = movements.filter(m => m.status === 'LOST');
const changed = movements.filter(m => m.status === 'changed');
const indexedNow = movements.filter(m => m.curr.startsWith('PASS')).length;
const indexedPrev = movements.filter(m => m.prev.startsWith('PASS')).length;

console.log(`\n  Indexed: ${indexedNow}/${movements.length} (was ${indexedPrev}/${movements.length})  Δ +${indexedNow - indexedPrev}`);

if (gained.length) {
  console.log('\n  GAINED indexation:');
  for (const m of gained) console.log(`    + ${m.path}  (was: ${m.prev})`);
}
if (lost.length) {
  console.log('\n  LOST indexation:');
  for (const m of lost) console.log(`    - ${m.path}  (now: ${m.curr})`);
}
if (changed.length) {
  console.log('\n  Coverage state changes (verdict same):');
  for (const m of changed) console.log(`    ~ ${m.path}  ${m.prev}  →  ${m.curr}`);
}

// --- QUERY MOVERS (28d window) ---
console.log('\n--- TOP QUERY MOVERS (28d, by clicks delta) ---');
const queryMap = new Map();
for (const q of prev.queries) queryMap.set(q.keys[0], { prev: q, curr: null });
for (const q of curr.queries) {
  const e = queryMap.get(q.keys[0]) || { prev: null, curr: null };
  e.curr = q;
  queryMap.set(q.keys[0], e);
}
const queryDiffs = [...queryMap.entries()].map(([k, v]) => ({
  query: k,
  prevClicks: v.prev?.clicks ?? 0,
  currClicks: v.curr?.clicks ?? 0,
  prevImpr: v.prev?.impressions ?? 0,
  currImpr: v.curr?.impressions ?? 0,
  prevPos: v.prev?.position ?? null,
  currPos: v.curr?.position ?? null,
  isNew: !v.prev,
  dropped: !v.curr,
}));

const clickGainers = queryDiffs.filter(q => q.currClicks - q.prevClicks > 0).sort((a, b) => (b.currClicks - b.prevClicks) - (a.currClicks - a.prevClicks)).slice(0, 10);
const impGainers = queryDiffs.filter(q => q.currImpr - q.prevImpr >= 5).sort((a, b) => (b.currImpr - b.prevImpr) - (a.currImpr - a.prevImpr)).slice(0, 10);
const newQueries = queryDiffs.filter(q => q.isNew && q.currImpr >= 3).sort((a, b) => b.currImpr - a.currImpr).slice(0, 10);
const droppedQueries = queryDiffs.filter(q => q.dropped && q.prevImpr >= 5).sort((a, b) => b.prevImpr - a.prevImpr).slice(0, 5);
const posImprovers = queryDiffs.filter(q => q.prevPos != null && q.currPos != null && q.prevPos - q.currPos >= 3 && q.currImpr >= 3).sort((a, b) => (b.prevPos - b.currPos) - (a.prevPos - a.currPos)).slice(0, 10);

console.log('\n  Click gainers:');
if (clickGainers.length === 0) console.log('    (none)');
for (const q of clickGainers) console.log(`    +${q.currClicks - q.prevClicks}  ${q.query}  (now ${q.currClicks} clicks, ${q.currImpr} impr)`);

console.log('\n  Impression gainers (≥+5 impressions):');
if (impGainers.length === 0) console.log('    (none)');
for (const q of impGainers) console.log(`    +${q.currImpr - q.prevImpr}  ${q.query}  (now ${q.currImpr} impr, pos ${pos(q.currPos)})`);

console.log('\n  New queries (not in baseline, ≥3 impressions now):');
if (newQueries.length === 0) console.log('    (none)');
for (const q of newQueries) console.log(`    NEW  ${q.query}  (${q.currImpr} impr, pos ${pos(q.currPos)})`);

console.log('\n  Dropped queries (in baseline ≥5 impr, gone now):');
if (droppedQueries.length === 0) console.log('    (none)');
for (const q of droppedQueries) console.log(`    GONE  ${q.query}  (was ${q.prevImpr} impr)`);

console.log('\n  Position improvers (jumped ≥3 positions, ≥3 impr):');
if (posImprovers.length === 0) console.log('    (none)');
for (const q of posImprovers) console.log(`    ${pos(q.prevPos)}→${pos(q.currPos)}  ${q.query}  (${q.currImpr} impr)`);

// --- PAGE MOVERS ---
console.log('\n--- TOP PAGE MOVERS (28d, by clicks delta) ---');
const pageMap = new Map();
for (const p of prev.pages) pageMap.set(p.keys[0], { prev: p, curr: null });
for (const p of curr.pages) {
  const e = pageMap.get(p.keys[0]) || { prev: null, curr: null };
  e.curr = p;
  pageMap.set(p.keys[0], e);
}
const pageDiffs = [...pageMap.entries()].map(([k, v]) => ({
  page: k.replace('https://peninsulainsider.com.au', ''),
  prevClicks: v.prev?.clicks ?? 0,
  currClicks: v.curr?.clicks ?? 0,
  prevImpr: v.prev?.impressions ?? 0,
  currImpr: v.curr?.impressions ?? 0,
  prevPos: v.prev?.position ?? null,
  currPos: v.curr?.position ?? null,
  isNew: !v.prev,
}));

const pageClickGainers = pageDiffs.filter(p => p.currClicks - p.prevClicks > 0).sort((a, b) => (b.currClicks - b.prevClicks) - (a.currClicks - a.prevClicks)).slice(0, 10);
const newPages = pageDiffs.filter(p => p.isNew && p.currImpr >= 3).sort((a, b) => b.currImpr - a.currImpr).slice(0, 10);

console.log('\n  Click gainers:');
if (pageClickGainers.length === 0) console.log('    (none)');
for (const p of pageClickGainers) console.log(`    +${p.currClicks - p.prevClicks}  ${p.page}  (now ${p.currClicks} clicks, ${p.currImpr} impr)`);

console.log('\n  New pages appearing in search (≥3 impr):');
if (newPages.length === 0) console.log('    (none)');
for (const p of newPages) console.log(`    NEW  ${p.page}  (${p.currImpr} impr, pos ${pos(p.currPos)})`);

console.log(`\n  Pages tracked: ${curr.pages.length} (was ${prev.pages.length})  Δ ${curr.pages.length - prev.pages.length}`);
console.log(`  Queries tracked: ${curr.queries.length} (was ${prev.queries.length})  Δ ${curr.queries.length - prev.queries.length}`);
console.log('');
