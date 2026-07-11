#!/usr/bin/env node
// qa-regression.mjs — T-1001 (2026-07-11) v5 Wave 3 QA / launch regression harness.
//
// Re-runs the 01-inventory density measurements against the current integration
// build (next/dist) and performs launch-gate checks:
//   1. Density metrics for the audited surfaces (adapted from
//      workspace/peninsula-insider-redesign/01-inventory/density-metrics.mjs,
//      same counting rules so BEFORE/AFTER is apples-to-apples).
//   2. Link integrity: every internal href in every built page resolves to a
//      built file OR a known redirect source in ops/cloudflare-redirects.csv.
//   3. Per-page invariants: exactly one <h1>, exactly one rel=canonical.
//   4. House style: em-dash occurrences in visible copy (site-wide count,
//      audited v5 surfaces called out).
//   5. IA drift: pages referencing /explore/plans/ vs /plans/.
//
// Usage (from next/):  node scripts/qa-regression.mjs [--json out.json]
// Read-only on dist/. Exit code 1 if any broken links or invariant failures.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const NEXT_ROOT = resolve(HERE, '..');
const DIST = join(NEXT_ROOT, 'dist');
const REPO_ROOT = resolve(NEXT_ROOT, '..');
const REDIRECTS_CSV = join(REPO_ROOT, 'ops', 'cloudflare-redirects.csv');
const BEFORE_CSV = 'C:/Users/James/.openclaw/workspace/peninsula-insider-redesign/01-inventory/density-metrics.csv';

// Audited surfaces. BEFORE key maps the v4 route where the URL moved (Plans).
const PAGES = [
  { route: '/', name: 'Homepage', before: '/' },
  { route: '/eat/', name: 'Eat & Drink hub', before: '/eat/' },
  { route: '/stay/', name: 'Stay hub', before: '/stay/' },
  { route: '/wine/', name: 'Wine hub', before: '/wine/' },
  { route: '/explore/', name: 'Explore hub', before: '/explore/' },
  { route: '/whats-on/', name: "What's On hub", before: '/whats-on/' },
  { route: '/journal/', name: 'Journal hub', before: '/journal/' },
  { route: '/plans/', name: 'Plans hub (was /explore/plans/)', before: '/explore/plans/' },
  { route: '/map/', name: 'Map tool', before: '/map/' },
];

// ---------------------------------------------------------------- helpers ---
function stripBlocks(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
}
const count = (re, s) => (s.match(re) || []).length;

function densityFor(html) {
  const bytes = Buffer.byteLength(html);
  const ldTypes = new Set();
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const collect = (o) => {
        if (Array.isArray(o)) return o.forEach(collect);
        if (o && typeof o === 'object') {
          if (o['@type']) (Array.isArray(o['@type']) ? o['@type'] : [o['@type']]).forEach((t) => ldTypes.add(t));
          Object.values(o).forEach(collect);
        }
      };
      collect(JSON.parse(m[1]));
    } catch { ldTypes.add('parse-error'); }
  }
  const body = stripBlocks(html);
  const text = body.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  const words = (text.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length;
  return {
    words,
    h1: count(/<h1[\s>]/gi, body),
    h2: count(/<h2[\s>]/gi, body),
    h3: count(/<h3[\s>]/gi, body),
    links: count(/<a\s/gi, body),
    sections: count(/<section[\s>]/gi, body),
    cards: count(/class="[^"]*\bcard\b[^"]*"|class="[^"]*-card\b[^"]*"|class="[^"]*\bcard-[^"]*"/gi, body)
         + count(/<article[\s>]/gi, body),
    ctas: count(/<button[\s>]/gi, body)
        + count(/<a\s[^>]*class="[^"]*\b(btn|button|cta|pill-link|action)\b[^"]*"/gi, body),
    breadcrumbs: /breadcrumb/i.test(html) ? 'yes' : 'no',
    jsonld: [...ldTypes].join('; '),
    bytes,
  };
}

function* walkHtml(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkHtml(full);
    else if (e.name.endsWith('.html')) yield full;
  }
}

function routeOf(file) {
  let rel = file.slice(DIST.length).split('\\').join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  return rel;
}

// -------------------------------------------------------- redirect sources --
const redirectExact = new Set();
const redirectWildcards = [];
if (existsSync(REDIRECTS_CSV)) {
  for (const line of readFileSync(REDIRECTS_CSV, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('source_url')) continue;
    const src = t.split(',')[0].trim();
    if (!src.startsWith('/')) continue;
    if (src.endsWith('*')) redirectWildcards.push(src.slice(0, -1));
    else redirectExact.add(src);
  }
}
const isRedirectSource = (p) =>
  redirectExact.has(p) || redirectExact.has(p.replace(/\/$/, '')) || redirectExact.has(p + '/')
  || redirectWildcards.some((w) => p.startsWith(w));

// ------------------------------------------------------------ href resolve --
function normalizeHref(href) {
  let h = href.trim().replace(/&amp;/g, '&');
  if (/^(mailto:|tel:|javascript:|data:|sms:)/i.test(h)) return null;
  if (/^https?:\/\//i.test(h)) {
    const m = h.match(/^https?:\/\/(www\.)?peninsulainsider\.com\.au(\/.*)?$/i);
    if (!m) return null; // external
    h = m[2] || '/';
  }
  if (h.startsWith('//')) return null; // protocol-relative external
  if (!h.startsWith('/')) return null; // relative hrefs: none expected; skip
  h = h.split('#')[0].split('?')[0];
  if (!h) return null;
  try { h = decodeURI(h); } catch { /* keep raw */ }
  return h;
}

function resolvesInDist(p) {
  const fsPath = join(DIST, p.replace(/^\//, '').split('/').join('\\'));
  if (p.endsWith('/')) return existsSync(join(fsPath, 'index.html'));
  if (/\.[a-z0-9]{2,5}$/i.test(posix.basename(p))) return existsSync(fsPath); // asset / .html / .xml
  // extensionless without trailing slash: accept dir index or exact file
  return existsSync(join(fsPath, 'index.html')) || existsSync(fsPath + '.html');
}

// ------------------------------------------------------------------- sweep --
if (!existsSync(DIST)) { console.error(`qa-regression: dist not found at ${DIST}`); process.exit(1); }

const pages = [...walkHtml(DIST)];
const brokenByHref = new Map(); // href -> { count, redirect:false, examples[] }
const invariantFails = [];      // { route, h1, canonical }
const emDashPages = [];         // { route, count }
let refsExplorePlans = 0, refsPlans = 0;
let totalInternalHrefs = 0, redirectCoveredHrefs = 0;

for (const file of pages) {
  const route = routeOf(file);
  const html = readFileSync(file, 'utf8');
  const body = stripBlocks(html);

  // invariants (skip the /access/ gate artefact and redirect stubs which are
  // meta-refresh shells, not content pages)
  const isStub = /http-equiv="refresh"/i.test(html) || /class="redirect-stub"|Redirecting to/i.test(body) === true && body.length < 4000;
  const h1s = count(/<h1[\s>]/gi, body);
  const canonicals = count(/<link[^>]+rel=["']canonical["'][^>]*>/gi, html);
  if (!isStub && (h1s !== 1 || canonicals !== 1)) invariantFails.push({ route, h1: h1s, canonical: canonicals });

  // em-dash in visible copy
  const visible = body.replace(/<[^>]+>/g, ' ');
  const em = count(/—|&mdash;|&#8212;/g, visible);
  if (em > 0) emDashPages.push({ route, count: em });

  // plans drift (count each page once per family)
  if (/href="(https?:\/\/(www\.)?peninsulainsider\.com\.au)?\/explore\/plans\//i.test(html)) refsExplorePlans++;
  if (/href="(https?:\/\/(www\.)?peninsulainsider\.com\.au)?\/plans\//i.test(html)) refsPlans++;

  // link integrity (whole document incl. header/footer chrome)
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]*)"/gi)) {
    const p = normalizeHref(m[1]);
    if (!p) continue;
    totalInternalHrefs++;
    if (resolvesInDist(p)) continue;
    if (isRedirectSource(p)) { redirectCoveredHrefs++; continue; }
    const rec = brokenByHref.get(p) || { count: 0, examples: [] };
    rec.count++;
    if (rec.examples.length < 3 && !rec.examples.includes(route)) rec.examples.push(route);
    brokenByHref.set(p, rec);
  }
}

// ------------------------------------------------------- density AFTER/BEFORE
const before = new Map();
if (existsSync(BEFORE_CSV)) {
  const lines = readFileSync(BEFORE_CSV, 'utf8').trim().split(/\r?\n/).slice(1);
  for (const l of lines) {
    // naive CSV split is safe here except the quoted jsonld col; take leading cols
    const cols = l.split(',');
    before.set(cols[0], { words: +cols[2], h1: +cols[3], h2: +cols[4], h3: +cols[5], links: +cols[6], cards: +cols[8], ctas: +cols[9] });
  }
}

const density = [];
for (const { route, name, before: bkey } of PAGES) {
  const file = join(DIST, route.replace(/^\//, '').split('/').join('\\'), 'index.html');
  if (!existsSync(file)) { density.push({ route, name, missing: true }); continue; }
  const after = densityFor(readFileSync(file, 'utf8'));
  density.push({ route, name, before: before.get(bkey) || null, after });
}

// ------------------------------------------------------------------ output --
const pct = (b, a) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : 'n/a');
console.log(`qa-regression against ${DIST}`);
console.log(`pages scanned: ${pages.length}`);
console.log('');
console.log('DENSITY (BEFORE 2026-07-05 audit -> AFTER current dist)');
console.log('route | words B->A | links B->A | cards B->A | h1 | h2 | h3');
for (const d of density) {
  if (d.missing) { console.log(`${d.route} | MISSING IN DIST`); continue; }
  const b = d.before || {};
  console.log(`${d.route} | ${b.words ?? '?'} -> ${d.after.words} (${pct(b.words, d.after.words)}) | ${b.links ?? '?'} -> ${d.after.links} (${pct(b.links, d.after.links)}) | ${b.cards ?? '?'} -> ${d.after.cards} (${pct(b.cards, d.after.cards)}) | ${d.after.h1} | ${d.after.h2} | ${d.after.h3}`);
}
console.log('');
console.log(`LINK INTEGRITY: ${totalInternalHrefs} internal hrefs checked; ${redirectCoveredHrefs} covered by cloudflare-redirects.csv; ${brokenByHref.size} distinct broken targets, ${[...brokenByHref.values()].reduce((s, r) => s + r.count, 0)} total broken references`);
const topBroken = [...brokenByHref.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
for (const [href, rec] of topBroken) console.log(`  ${rec.count.toString().padStart(5)}  ${href}  (e.g. ${rec.examples.join(', ')})`);
console.log('');
console.log(`INVARIANTS (exactly one h1 + one canonical): ${invariantFails.length} failing pages`);
for (const f of invariantFails.slice(0, 20)) console.log(`  ${f.route}  h1=${f.h1} canonical=${f.canonical}`);
console.log('');
const emTotal = emDashPages.reduce((s, p) => s + p.count, 0);
const auditedEm = emDashPages.filter((p) => PAGES.some((pg) => pg.route === p.route));
console.log(`EM-DASH in visible copy: ${emDashPages.length} pages, ${emTotal} occurrences site-wide; on audited v5 surfaces: ${auditedEm.length ? auditedEm.map((p) => `${p.route} x${p.count}`).join(', ') : 'none'}`);
for (const p of emDashPages.sort((a, b) => b.count - a.count).slice(0, 10)) console.log(`  ${p.count.toString().padStart(4)}  ${p.route}`);
console.log('');
console.log(`PLANS URL DRIFT: pages with href to /explore/plans/... = ${refsExplorePlans}; pages with href to /plans/... = ${refsPlans}`);

const jsonIdx = process.argv.indexOf('--json');
if (jsonIdx !== -1 && process.argv[jsonIdx + 1]) {
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify({
    pages: pages.length, density, totalInternalHrefs, redirectCoveredHrefs,
    broken: Object.fromEntries([...brokenByHref.entries()].map(([k, v]) => [k, v])),
    invariantFails, emDashPages, refsExplorePlans, refsPlans,
  }, null, 2));
}

const fail = brokenByHref.size > 0 || invariantFails.length > 0;
process.exit(fail ? 1 : 0);
