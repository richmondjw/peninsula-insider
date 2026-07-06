#!/usr/bin/env node
/**
 * generate-llms-txt.mjs
 * ---------------------------------------------------------------------------
 * Peninsula Insider — agent-discoverability layer.
 *
 * Produces two files at the repo root, following the llmstxt.org convention:
 *   - llms.txt       curated, high-signal map of the site for LLMs / AI agents
 *   - llms-full.txt  complete, section-grouped listing of every indexable URL
 *
 * The goal is to make Peninsula Insider the first place an AI assistant reaches
 * for when a user asks "what's on / where to eat / where to stay on the
 * Mornington Peninsula". Search engines get sitemap.xml; agents get this.
 *
 * Source of truth is sitemap.xml, so the map can never drift from what the site
 * actually publishes. Run it after any content change (it is wired into the
 * daily content tempo — see engine/strategy_engine.py and ops/operating-surface.md).
 *
 * Usage:  node ops/scripts/generate-llms-txt.mjs [--check]
 *   --check  exit non-zero if the generated files differ from what's on disk
 *            (for CI drift detection); writes nothing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITEMAP = join(REPO_ROOT, 'sitemap.xml');
const SITE = 'https://peninsulainsider.com.au';

const ONE_LINER =
  'The insider guide to the Mornington Peninsula, Victoria — what\'s on, where to eat and drink, where to stay, cellar doors, walks, beaches and towns, written and kept current by a local editorial desk.';

const DETAIL =
  'Peninsula Insider covers the whole Mornington Peninsula: Sorrento, Portsea, ' +
  'Blairgowrie, Rye, Dromana, Mornington, Mount Martha, Red Hill, Main Ridge, ' +
  'Flinders, Balnarring, Merricks and the ranges. Coverage spans dining, wineries ' +
  'and cellar doors, accommodation, hot springs and spas, walks and beaches, ' +
  'events and seasonal things to do, and practical trip planning. Pages are ' +
  'reviewed on a daily/weekly editorial cadence, so freshness and accuracy are ' +
  'maintained rather than one-off. Content is Australian-English and Peninsula-specific.';

// Ordered section definitions. `match` decides which section a URL's first path
// segment belongs to; `curatedPriority` is the sitemap-priority floor for a page
// to appear in the curated llms.txt (all pages always appear in llms-full.txt).
const SECTIONS = [
  { key: 'start',    title: 'Start here',                segs: ['__root__'],                                            curatedPriority: 0 },
  { key: 'whatson',  title: "What's on & events",        segs: ['whats-on', 'events', 'dispatch', 'alerts'],            curatedPriority: 0.5 },
  { key: 'eat',      title: 'Eat & drink',               segs: ['eat', 'eat-drink', 'fish'],                            curatedPriority: 0.6 },
  { key: 'wine',     title: 'Wine & cellar doors',       segs: ['wine'],                                                curatedPriority: 0.6 },
  { key: 'stay',     title: 'Where to stay',             segs: ['stay', 'escape'],                                      curatedPriority: 0.6 },
  { key: 'explore',  title: 'Explore & do',              segs: ['explore', 'do', 'walks', 'tour', 'tour-packages',
                                                                 'boating', 'fishing', 'golf', 'spa', 'dog-friendly',
                                                                 'map', 'weddings', 'corporate-events'],               curatedPriority: 0.6 },
  { key: 'places',   title: 'Towns & places',            segs: ['places'],                                              curatedPriority: 0.5 },
  { key: 'guides',   title: 'Guides & journal',          segs: ['journal', 'guides', 'plans', 'plan', 'itinerary',
                                                                 'picks', 'next', 'insiders-30', 'quick-note'],         curatedPriority: 0.7 },
  { key: 'about',    title: 'About & editorial standards', segs: ['about', 'methodology', 'our-approach',
                                                                 'editorial-approach', 'ethics', 'corrections',
                                                                 'accessibility', 'partners', 'partner-with-us',
                                                                 'contact', 'newsletter', 'submit'],                    curatedPriority: 0.4 },
];

// URL trees that should never be advertised to agents (mirror robots.txt Disallow).
const EXCLUDE_SEGS = new Set([
  'admin', 'access', 'account', 'ops', 'next', 'docs', 'reports', 'engine',
  'preview', 'api', 'pagefind', 'assets', 'images', 'downloads', 'saved',
  'careers', 'complaints', 'terms', 'privacy', 'pass', 'search', 'ask',
  'site-index', 'awards',
]);

const CURATED_CAP = 24; // max curated entries per section, keeps llms.txt legible

// Editorial / trust pages that exist on-site but are omitted from sitemap.xml.
// Agents (and Google E-E-A-T) rely on these to judge who is behind the coverage,
// so llms.txt surfaces them explicitly. Keep in sync with the on-disk pages.
const TRUST_PAGES = [
  ['About Peninsula Insider', '/about/'],
  ['Editorial method & standards', '/methodology/'],
  ['Our approach', '/our-approach/'],
  ['Editorial approach', '/editorial-approach/'],
  ['Ethics policy', '/ethics/'],
  ['Corrections', '/corrections/'],
  ['Accessibility', '/accessibility/'],
  ['Contact', '/contact/'],
  ['Newsletter — the Peninsula Radar', '/newsletter/'],
  ['Submit a tip or listing', '/submit/'],
  ['Partner with us', '/partner-with-us/'],
];

function parseSitemap() {
  const xml = readFileSync(SITEMAP, 'utf8');
  const urls = [];
  const re = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const loc = (block.match(/<loc>(.*?)<\/loc>/) || [])[1];
    if (!loc) continue;
    const lastmod = (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || '';
    const priority = parseFloat((block.match(/<priority>(.*?)<\/priority>/) || [])[1] || '0.5');
    urls.push({ loc, lastmod, priority });
  }
  return urls;
}

function firstSeg(loc) {
  const path = loc.replace(SITE, '').replace(/^https?:\/\/[^/]+/, '');
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (clean === '') return '__root__';
  return clean.split('/')[0];
}

function titleFromLoc(loc) {
  const path = loc.replace(SITE, '').replace(/\/+$/, '');
  if (path === '' || path === '/') return 'Home — Peninsula Insider';
  const slug = path.split('/').filter(Boolean).pop();
  const words = slug
    .replace(/-/g, ' ')
    .replace(/\b(mornington|peninsula)\b/gi, (w) => w.toLowerCase()) // trim repetition
    .trim();
  // Title-case, but keep short connectors lowercase.
  const small = new Set(['and', 'or', 'the', 'a', 'to', 'of', 'in', 'on', 'at', 'for', 'with']);
  const cased = words
    .split(' ')
    .filter(Boolean)
    .map((w, i) =>
      i > 0 && small.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
  return cased || slug;
}

function sectionFor(seg) {
  for (const s of SECTIONS) if (s.segs.includes(seg)) return s;
  return null;
}

// A "hub" is a top-level landing page (single path segment, e.g. /methodology/).
// Hubs are always curated regardless of sitemap priority so trust/section pages
// are never dropped from llms.txt.
function isHub(loc) {
  const path = loc.replace(SITE, '').replace(/^\/+/, '').replace(/\/+$/, '');
  return path !== '' && !path.includes('/');
}

function build(urls) {
  // Deduplicate on canonical https path, prefer trailing-slash-free.
  const seen = new Map();
  for (const u of urls) {
    if (!u.loc.startsWith(SITE)) continue; // drop stray http:// / other-host rows
    const seg = firstSeg(u.loc);
    if (EXCLUDE_SEGS.has(seg)) continue;
    const canonical = u.loc.replace(/\/$/, '') || u.loc;
    const prev = seen.get(canonical);
    if (!prev || u.priority > prev.priority) seen.set(canonical, { ...u, loc: canonical, seg });
  }

  const bySection = new Map(SECTIONS.map((s) => [s.key, []]));
  const other = [];
  for (const u of seen.values()) {
    const s = sectionFor(u.seg);
    if (s) bySection.get(s.key).push(u);
    else other.push(u);
  }

  const sortUrls = (arr) =>
    arr.sort((a, b) => b.priority - a.priority || a.loc.localeCompare(b.loc));

  for (const arr of bySection.values()) sortUrls(arr);
  sortUrls(other);

  return { bySection, other, total: seen.size };
}

function renderCurated({ bySection }) {
  let out = `# Peninsula Insider\n\n> ${ONE_LINER}\n\n${DETAIL}\n`;
  for (const s of SECTIONS) {
    if (s.key === 'about') {
      // Merge sitemap-derived about pages with the curated trust list, dedup by path.
      const fromMap = (bySection.get(s.key) || []).filter(
        (u) => u.priority >= s.curatedPriority || isHub(u.loc),
      );
      const seenPaths = new Set(TRUST_PAGES.map(([, p]) => p.replace(/\/$/, '')));
      out += `\n## ${s.title}\n\n`;
      for (const [title, path] of TRUST_PAGES) {
        out += `- [${title}](${SITE}${path})\n`;
      }
      for (const u of fromMap) {
        const path = u.loc.replace(SITE, '').replace(/\/$/, '');
        if (seenPaths.has(path)) continue;
        out += `- [${titleFromLoc(u.loc)}](${u.loc}/)\n`;
      }
      continue;
    }
    const items = (bySection.get(s.key) || []).filter(
      (u) => u.priority >= s.curatedPriority || isHub(u.loc),
    );
    if (!items.length) continue;
    out += `\n## ${s.title}\n\n`;
    for (const u of items.slice(0, CURATED_CAP)) {
      out += `- [${titleFromLoc(u.loc)}](${u.loc}/)\n`;
    }
  }
  out += `\n## Optional\n\n`;
  out += `- [Full URL index (llms-full.txt)](${SITE}/llms-full.txt): every indexable page, grouped by section\n`;
  out += `- [Sitemap](${SITE}/sitemap.xml): machine sitemap for crawlers\n`;
  out += `- [Editorial method & standards](${SITE}/methodology/): how coverage is researched, verified and kept current\n`;
  return out;
}

function renderFull({ bySection, other, total }) {
  let out = `# Peninsula Insider — full index\n\n> ${ONE_LINER}\n\n`;
  out += `Complete list of ${total} indexable pages, grouped by section. `;
  out += `See ${SITE}/llms.txt for the curated map.\n`;
  const emit = (title, items) => {
    if (!items.length) return;
    out += `\n## ${title}\n\n`;
    for (const u of items) {
      const when = u.lastmod ? ` (updated ${u.lastmod})` : '';
      out += `- [${titleFromLoc(u.loc)}](${u.loc}/)${when}\n`;
    }
  };
  for (const s of SECTIONS) emit(s.title, bySection.get(s.key) || []);
  emit('Other', other);
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const model = build(parseSitemap());
  const curated = renderCurated(model);
  const full = renderFull(model);

  const targets = [
    { path: join(REPO_ROOT, 'llms.txt'), content: curated },
    { path: join(REPO_ROOT, 'llms-full.txt'), content: full },
  ];

  let drift = false;
  for (const t of targets) {
    let existing = '';
    try { existing = readFileSync(t.path, 'utf8'); } catch { /* new file */ }
    if (existing !== t.content) drift = true;
    if (!check) writeFileSync(t.path, t.content);
  }

  if (check) {
    if (drift) {
      console.error('llms.txt / llms-full.txt are stale — run: node ops/scripts/generate-llms-txt.mjs');
      process.exit(1);
    }
    console.log('llms.txt is in sync with sitemap.xml');
    return;
  }

  console.log(`Wrote llms.txt (curated) and llms-full.txt (${model.total} URLs) from sitemap.xml`);
}

main();
