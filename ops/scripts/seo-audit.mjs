#!/usr/bin/env node
/**
 * Peninsula Insider — SEO Stage 0 content audit
 *
 * Walks the static build output at repo root, extracts per-page metadata,
 * builds an internal-link graph, and classifies each page against the
 * editorial cluster map defined in docs/seo-staged-plan-2026-04-15.md.
 *
 * Run from repo root:  node ops/scripts/seo-audit.mjs
 * Outputs:
 *   - docs/reports/seo-audit-pages-2026-04-15.csv
 *   - docs/reports/seo-audit-summary-2026-04-15.md
 */
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const TODAY = '2026-04-15';
const REPORT_DIR = join(ROOT, 'docs', 'reports');

// Skip these top-level dirs — not site content.
const SKIP = new Set([
  'next', 'docs', 'ops', 'reports', '.git', '.github', '.githooks', '.claude',
  '.approvals', 'node_modules', '_astro', 'pagefind', 'chunks', 'images',
  'assets', 'site-index', 'preview-hero',
]);

// Cluster classification rules — first-match-wins. Order matters.
// Patterns are regex against the URL path.
const CLUSTER_RULES = [
  { cluster: 'home', pattern: /^\/$/, intent: 'navigational' },
  { cluster: 'legal', pattern: /^\/(privacy|terms|about|contact|404)/, intent: 'transactional' },
  { cluster: 'journal', pattern: /^\/journal/, intent: 'editorial' },
  { cluster: 'whats-on', pattern: /^\/whats-on/, intent: 'events' },
  { cluster: 'stay', pattern: /^\/stay/, intent: 'commercial' },
  { cluster: 'eat', pattern: /^\/eat/, intent: 'commercial' },
  { cluster: 'wine', pattern: /^\/wine/, intent: 'commercial' },
  { cluster: 'explore', pattern: /^\/explore/, intent: 'planning' },
  { cluster: 'escape', pattern: /^\/escape/, intent: 'planning' },
  { cluster: 'golf', pattern: /^\/golf/, intent: 'commercial' },
  { cluster: 'spa', pattern: /^\/spa/, intent: 'commercial' },
  { cluster: 'places', pattern: /^\/places/, intent: 'geographic' },
  { cluster: 'newsletter', pattern: /^\/newsletter/, intent: 'transactional' },
  { cluster: 'search', pattern: /^\/search/, intent: 'navigational' },
  { cluster: 'other', pattern: /.*/, intent: 'unclassified' },
];

// Priority keywords from the external SEO feedback.
// Each has: cluster, keyword, target_page (may not exist yet).
const PRIORITY_KEYWORDS = [
  // Hot Springs — highest volume per feedback
  { kw: 'mornington peninsula hot springs', cluster: 'spa', target: '/spa/mornington-peninsula-hot-springs-guide', vol: 3500, diff: 19 },
  { kw: 'best time to visit mornington peninsula hot springs', cluster: 'spa', target: '/spa/best-time-to-visit-mornington-peninsula-hot-springs', vol: null, diff: null },
  { kw: 'mornington peninsula hot springs deals', cluster: 'spa', target: '/spa/mornington-peninsula-hot-springs-deals', vol: null, diff: null },
  { kw: 'best accommodation near mornington peninsula hot springs', cluster: 'stay', target: '/stay/best-accommodation-near-mornington-peninsula-hot-springs', vol: null, diff: null },
  { kw: 'mornington peninsula hot springs day trip from melbourne', cluster: 'spa', target: '/spa/mornington-peninsula-hot-springs-day-trip-from-melbourne', vol: null, diff: null },
  { kw: 'hot springs and winery itinerary', cluster: 'escape', target: '/escape/hot-springs-and-winery-itinerary', vol: null, diff: null },
  { kw: 'what to do after mornington peninsula hot springs', cluster: 'spa', target: '/spa/what-to-do-after-mornington-peninsula-hot-springs', vol: null, diff: null },

  // Things to do
  { kw: 'things to do mornington peninsula', cluster: 'explore', target: '/explore/things-to-do-mornington-peninsula', vol: 810, diff: 20 },
  { kw: 'things to do mornington peninsula in winter', cluster: 'journal', target: '/journal/mornington-peninsula-in-winter', vol: null, diff: null },
  { kw: 'things to do mornington peninsula for couples', cluster: 'explore', target: '/explore/things-to-do-mornington-peninsula-for-couples', vol: null, diff: null },
  { kw: 'free things to do mornington peninsula', cluster: 'journal', target: '/journal/free-things-to-do-mornington-peninsula', vol: null, diff: null },
  { kw: 'things to do mornington peninsula with kids', cluster: 'journal', target: '/journal/mornington-peninsula-with-kids', vol: null, diff: null },
  { kw: 'mornington peninsula day trip from melbourne', cluster: 'journal', target: '/journal/mornington-peninsula-day-trip', vol: null, diff: null },
  { kw: 'what to do mornington peninsula this weekend', cluster: 'whats-on', target: '/whats-on', vol: null, diff: null },
  { kw: 'best beaches mornington peninsula', cluster: 'explore', target: '/explore/best-beaches-mornington-peninsula', vol: null, diff: null },
  { kw: 'best walks mornington peninsula', cluster: 'explore', target: '/explore/best-walks', vol: null, diff: null },
  { kw: 'best lookouts mornington peninsula', cluster: 'explore', target: '/explore/best-lookouts-mornington-peninsula', vol: null, diff: null },
  { kw: 'best markets mornington peninsula', cluster: 'explore', target: '/explore/best-markets-mornington-peninsula', vol: null, diff: null },

  // Wineries
  { kw: 'best wineries mornington peninsula', cluster: 'wine', target: '/wine/best-wineries-mornington-peninsula', vol: 600, diff: 30 },
  { kw: 'mornington peninsula wineries', cluster: 'wine', target: '/wine/best-wineries-mornington-peninsula', vol: 570, diff: 27 },
  { kw: 'best winery lunch mornington peninsula', cluster: 'wine', target: '/wine/best-winery-lunch-mornington-peninsula', vol: null, diff: null },
  { kw: 'best winery restaurants mornington peninsula', cluster: 'wine', target: '/wine/best-winery-restaurants-mornington-peninsula', vol: null, diff: null },
  { kw: 'winery accommodation mornington peninsula', cluster: 'stay', target: '/stay/winery-accommodation-mornington-peninsula', vol: null, diff: null },
  { kw: 'best wineries red hill', cluster: 'wine', target: '/wine/best-wineries-red-hill', vol: null, diff: null },
  { kw: 'kid friendly wineries mornington peninsula', cluster: 'wine', target: '/wine/kid-friendly-wineries-mornington-peninsula', vol: null, diff: null },
  { kw: 'romantic wineries mornington peninsula', cluster: 'wine', target: '/wine/romantic-wineries-mornington-peninsula', vol: null, diff: null },
  { kw: 'best winery itinerary one day', cluster: 'escape', target: '/escape/best-winery-itinerary-one-day', vol: null, diff: null },

  // Stay
  { kw: 'where to stay mornington peninsula', cluster: 'stay', target: '/stay/where-to-stay-mornington-peninsula', vol: null, diff: null },
  { kw: 'best accommodation mornington peninsula', cluster: 'stay', target: '/stay/best-accommodation', vol: null, diff: null },
  { kw: 'luxury accommodation mornington peninsula', cluster: 'stay', target: '/stay/luxury-accommodation-mornington-peninsula', vol: null, diff: null },
  { kw: 'boutique accommodation mornington peninsula', cluster: 'stay', target: '/stay/boutique-accommodation-mornington-peninsula', vol: null, diff: null },
  { kw: 'romantic accommodation mornington peninsula', cluster: 'stay', target: '/stay/romantic-accommodation-mornington-peninsula', vol: null, diff: null },
  { kw: 'pet friendly accommodation mornington peninsula', cluster: 'stay', target: '/stay/pet-friendly-accommodation-mornington-peninsula', vol: null, diff: null },
  { kw: 'accommodation red hill mornington peninsula', cluster: 'stay', target: '/stay/accommodation-red-hill', vol: null, diff: null },

  // Itineraries
  { kw: 'mornington peninsula itinerary', cluster: 'escape', target: '/escape/mornington-peninsula-itinerary', vol: null, diff: null },
  { kw: 'romantic weekend mornington peninsula', cluster: 'escape', target: '/escape/romantic-weekend-mornington-peninsula', vol: null, diff: null },
  { kw: 'mornington peninsula weekend', cluster: 'escape', target: '/escape/mornington-peninsula-weekend', vol: null, diff: null },
];

// Towns worth depth pages per the feedback (Stage 4).
const PRIORITY_TOWNS = ['red-hill', 'sorrento', 'mornington', 'flinders', 'rye', 'dromana', 'rosebud', 'portsea', 'main-ridge', 'blairgowrie'];

// -----------------------------------------------------------------
// Walk the repo root for index.html files, extract metadata.
// -----------------------------------------------------------------
function walk(dir, depth = 0) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (depth === 0 && SKIP.has(entry)) continue;
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      out.push(...walk(full, depth + 1));
    } else if (entry === 'index.html' || entry === '404.html') {
      out.push(rel);
    }
  }
  return out;
}

function htmlToUrl(relPath) {
  const parts = relPath.split(sep);
  if (parts.length === 1 && parts[0] === 'index.html') return '/';
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  return '/' + parts.join('/');
}

function extract(html) {
  const pick = (re) => { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : null; };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  // Apostrophes are valid inside double-quoted HTML attribute values, so the content
  // class must be [^"]* (not [^"']*) — earlier versions were truncating at the first
  // apostrophe, producing massive false-positive "short description" counts.
  const desc = pick(/<meta[^>]+?name="description"[^>]+?content="([^"]*)"/i) ||
               pick(/<meta[^>]+?content="([^"]*)"[^>]+?name="description"/i);
  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').trim() || null;
  const canonical = pick(/<link[^>]+?rel="canonical"[^>]+?href="([^"]*)"/i);
  const wordCountHint = (html.match(/<p[^>]*>/gi) || []).length;

  // Internal links: href starting with / (not //), not .jpg/.webp/.png/.css
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
  const internal = hrefs
    .filter(h => h.startsWith('/') && !h.startsWith('//'))
    .filter(h => !/\.(jpe?g|png|webp|svg|css|js|ico|xml|txt|json|pdf)(\?|$)/i.test(h))
    .map(h => h.split('#')[0].split('?')[0])
    .map(h => h.replace(/\/$/, '') || '/');

  return { title, desc, h1, canonical, internalLinks: [...new Set(internal)], pCount: wordCountHint };
}

function classify(url) {
  for (const rule of CLUSTER_RULES) {
    if (rule.pattern.test(url)) return { cluster: rule.cluster, intent: rule.intent };
  }
  return { cluster: 'other', intent: 'unclassified' };
}

// -----------------------------------------------------------------
// Main
// -----------------------------------------------------------------
const files = walk(ROOT);
console.log(`Found ${files.length} HTML pages at repo root.`);

const pages = new Map(); // url -> { url, relPath, meta..., inbound: Set }
for (const f of files) {
  const url = htmlToUrl(f);
  const html = readFileSync(join(ROOT, f), 'utf8');
  const meta = extract(html);
  const { cluster, intent } = classify(url);
  pages.set(url, {
    url,
    relPath: f,
    cluster,
    intent,
    title: meta.title,
    titleLen: meta.title?.length || 0,
    desc: meta.desc,
    descLen: meta.desc?.length || 0,
    h1: meta.h1,
    canonical: meta.canonical,
    pCount: meta.pCount,
    outbound: meta.internalLinks,
    inbound: new Set(),
  });
}

// Build inbound graph
for (const [srcUrl, page] of pages) {
  for (const dst of page.outbound) {
    if (pages.has(dst) && dst !== srcUrl) {
      pages.get(dst).inbound.add(srcUrl);
    }
  }
}

// -----------------------------------------------------------------
// Analyses
// -----------------------------------------------------------------
const byCluster = {};
const orphans = [];
const underLinked = [];
const titleIssues = [];
const descIssues = [];
const missingH1 = [];

for (const [url, p] of pages) {
  byCluster[p.cluster] ||= { count: 0, totalInbound: 0, avgPCount: 0, pages: [] };
  byCluster[p.cluster].count++;
  byCluster[p.cluster].totalInbound += p.inbound.size;
  byCluster[p.cluster].avgPCount += p.pCount;
  byCluster[p.cluster].pages.push(url);
  if (p.inbound.size === 0 && url !== '/') orphans.push(url);
  else if (p.inbound.size < 2 && url !== '/') underLinked.push({ url, inbound: p.inbound.size });
  if (!p.title || p.titleLen < 20 || p.titleLen > 65) titleIssues.push({ url, titleLen: p.titleLen, title: p.title });
  if (!p.desc || p.descLen < 90 || p.descLen > 160) descIssues.push({ url, descLen: p.descLen, desc: p.desc });
  if (!p.h1) missingH1.push(url);
}
for (const k of Object.keys(byCluster)) byCluster[k].avgPCount = Math.round(byCluster[k].avgPCount / byCluster[k].count);

// Keyword → page map
const kwMatches = PRIORITY_KEYWORDS.map(kw => {
  const existing = pages.get(kw.target);
  return {
    ...kw,
    exists: !!existing,
    inbound: existing?.inbound.size ?? 0,
    title: existing?.title ?? null,
    descLen: existing?.descLen ?? 0,
  };
});
const gapPages = kwMatches.filter(k => !k.exists);
const existingButWeak = kwMatches.filter(k => k.exists && k.inbound < 3);

// Town depth
const townStatus = PRIORITY_TOWNS.map(slug => {
  const placesUrl = `/places/${slug}`;
  const exists = pages.has(placesUrl);
  const existing = pages.get(placesUrl);
  return { slug, url: placesUrl, exists, inbound: existing?.inbound.size ?? 0, pCount: existing?.pCount ?? 0 };
});

// -----------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------
mkdirSync(REPORT_DIR, { recursive: true });

// CSV: one row per page
const csvRows = [['url', 'cluster', 'intent', 'title', 'title_len', 'desc_len', 'h1', 'p_count', 'inbound_links', 'outbound_links']];
for (const [url, p] of pages) {
  csvRows.push([
    url, p.cluster, p.intent,
    (p.title || '').replace(/"/g, '""').replace(/[\n,]/g, ' '),
    p.titleLen, p.descLen,
    p.h1 ? 'yes' : 'no',
    p.pCount, p.inbound.size, p.outbound.length,
  ]);
}
writeFileSync(join(REPORT_DIR, `seo-audit-pages-${TODAY}.csv`),
  csvRows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n'));

// Summary markdown
let md = `---
title: Peninsula Insider — SEO Stage 0 Audit
date: ${TODAY}
prepared_by: Remy (scripted via ops/scripts/seo-audit.mjs)
responding_to: docs/seo-staged-plan-2026-04-15.md — Stage 0 foundation audit
status: complete (content side); awaiting GSC data for query-side analysis
---

# Peninsula Insider — SEO Stage 0 Audit

## Overview

- **Pages audited:** ${pages.size}
- **Source:** static build output at repo root (live-equivalent)
- **Classification:** URL pattern → editorial cluster
- **Internal-link graph:** built from all \`href="/..."\` references across the corpus

## Pages by cluster

| Cluster | Pages | Avg inbound | Avg <p> blocks |
|---|---|---|---|
${Object.entries(byCluster).sort((a, b) => b[1].count - a[1].count).map(([c, v]) =>
  `| ${c} | ${v.count} | ${Math.round(v.totalInbound / v.count * 10) / 10} | ${v.avgPCount} |`
).join('\n')}

## Priority-keyword coverage

**Target keywords defined:** ${PRIORITY_KEYWORDS.length}
**Already have a page:** ${kwMatches.filter(k => k.exists).length}
**Gap (need to create):** ${gapPages.length}
**Existing but weakly linked (< 3 inbound):** ${existingButWeak.length}

### Gap pages to create (Stage 2 + Stage 3 brief list)

| Keyword | Cluster | Target URL | Volume | Difficulty |
|---|---|---|---|---|
${gapPages.map(k => `| ${k.kw} | ${k.cluster} | \`${k.target}\` | ${k.vol ?? '—'} | ${k.diff ?? '—'} |`).join('\n')}

### Existing pages that need link strengthening (< 3 inbound)

| Keyword | URL | Current inbound | Notes |
|---|---|---|---|
${existingButWeak.map(k => `| ${k.kw} | \`${k.target}\` | ${k.inbound} | ${k.inbound === 0 ? 'ORPHAN — critical' : k.inbound === 1 ? 'single-link dependency' : 'needs 2+ more inbound links'} |`).join('\n')}

## Town depth (Stage 4 baseline)

| Town | URL | Exists? | Inbound links | <p> blocks (depth proxy) |
|---|---|---|---|---|
${townStatus.map(t => `| ${t.slug} | \`${t.url}\` | ${t.exists ? '✓' : '**MISSING**'} | ${t.inbound} | ${t.pCount} |`).join('\n')}

## Technical hygiene issues

- **Title tags out of range (< 20 or > 65 chars or missing):** ${titleIssues.length}
- **Meta descriptions out of range (< 90 or > 160 chars or missing):** ${descIssues.length}
- **Pages with no H1:** ${missingH1.length}
- **Orphans (zero inbound internal links):** ${orphans.length}
- **Under-linked (1 inbound only):** ${underLinked.filter(u => u.inbound === 1).length}

### Top orphans (sample — first 20)

${orphans.slice(0, 20).map(u => `- \`${u}\``).join('\n')}

### Pages with only one inbound link (sample — first 20)

${underLinked.filter(u => u.inbound === 1).slice(0, 20).map(u => `- \`${u.url}\``).join('\n')}

### Pages with title issues (sample — first 15)

${titleIssues.slice(0, 15).map(t => `- \`${t.url}\` (title ${t.titleLen} chars): ${t.title || 'MISSING'}`).join('\n')}

### Pages with meta-description issues (sample — first 15)

${descIssues.slice(0, 15).map(d => `- \`${d.url}\` (desc ${d.descLen} chars)`).join('\n')}

## What this audit does NOT cover (still required for full Stage 0)

- **GSC data** — impressions, clicks, average position, top query pages. Needs James's access. Open a GSC export and pull last 90 days at Query + Page dimensions.
- **Rank tracking on 25 priority keywords** — requires a rank-tracker tool (free options: Ahrefs Webmaster Tools if site is verified there, or manual SERP checks for tonight).
- **Core Web Vitals + PageSpeed** — CrUX data via GSC or PageSpeed Insights API run against the top 20 pages.
- **Mobile usability** — GSC mobile usability report.
- **Indexing coverage** — GSC Pages report: which URLs are indexed vs discovered-not-indexed vs crawled-not-indexed.
- **External advisor's "first 25 pages" brief** — promised by the SEO feedback source. James to request.

## Stage 1 immediate priorities, derived from this audit

Priority 1 — **Fix the orphans.** ${orphans.length} pages have zero inbound links. They receive no authority and may not be re-crawled reliably. Mechanical fix via the Astro content-collection \`related*\` fields on every venue/experience/article and automatic inbound-generation from related pages' templates.

Priority 2 — **Build the keyword-gap pages.** ${gapPages.length} priority keywords have no target page. Those become the Stage 2 + Stage 3 brief list. Use this audit's gap table directly as the content plan input.

Priority 3 — **Title/meta remediation on top-impression pages.** ${titleIssues.length} title-tag issues + ${descIssues.length} meta-description issues. Prioritise by GSC impression volume once James pulls the data.

Priority 4 — **Town-depth baseline.** ${townStatus.filter(t => !t.exists).length} of the 10 priority towns have no \`/places/\` page. ${townStatus.filter(t => t.exists && t.pCount < 10).length} exist but are thin (<10 <p> blocks).

Priority 5 — **Strengthen the ranking page.** \`/stay/best-accommodation\` already ranks ~#41. Current inbound link count: ${pages.get('/stay/best-accommodation')?.inbound.size ?? 'NOT FOUND'}. Push toward 6+ inbound links from related Stay, Explore, Escape pages.

---

*Generated ${new Date().toISOString()} by Remy. Data file: \`docs/reports/seo-audit-pages-${TODAY}.csv\` (one row per page).*
`;

writeFileSync(join(REPORT_DIR, `seo-audit-summary-${TODAY}.md`), md);

console.log(`\nWrote:`);
console.log(`  - docs/reports/seo-audit-pages-${TODAY}.csv (${pages.size} rows)`);
console.log(`  - docs/reports/seo-audit-summary-${TODAY}.md`);
console.log(`\nKey counts:`);
console.log(`  orphans: ${orphans.length}`);
console.log(`  under-linked (1 inbound): ${underLinked.filter(u => u.inbound === 1).length}`);
console.log(`  title issues: ${titleIssues.length}`);
console.log(`  desc issues: ${descIssues.length}`);
console.log(`  missing H1: ${missingH1.length}`);
console.log(`  keyword-gap pages: ${gapPages.length} / ${PRIORITY_KEYWORDS.length}`);
console.log(`  missing town pages: ${townStatus.filter(t => !t.exists).length} / ${PRIORITY_TOWNS.length}`);
