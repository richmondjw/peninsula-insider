#!/usr/bin/env node
/**
 * Forensic URL ledger builder — Peninsula Insider indexation recovery.
 *
 * Measures the BUILT ARTEFACT, not source declarations. Point it at a
 * directory containing a deployed static site (gh-pages checkout, or
 * next/dist after a build) and it emits a machine-readable ledger of every
 * route with its real indexation signals, plus the internal-link graph.
 *
 * Usage:
 *   node ops/scripts/seo/build-url-ledger.mjs --dist <dir> [--out <dir>]
 *
 * Outputs (into --out, default ops/reports/seo/ledger):
 *   url-ledger.json   full per-URL records
 *   url-ledger.csv    same, flattened for spreadsheets
 *   link-graph.json   inbound/outbound internal link graph + click depth
 *
 * Deliberately dependency-free: it runs in CI with no install step.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ORIGIN = 'https://peninsulainsider.com.au';

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const args = { dist: null, out: 'ops/reports/seo/ledger' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dist') args.dist = argv[i + 1];
    if (argv[i] === '--out') args.out = argv[i + 1];
  }
  if (!args.dist) {
    console.error('usage: build-url-ledger.mjs --dist <built-site-dir> [--out <dir>]');
    process.exit(2);
  }
  return args;
}

// ---------------------------------------------------------------- fs walk

function walkHtml(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Never treat build-internal or vendored asset trees as routes.
        if (entry.name === '.git' || entry.name === '_astro' || entry.name === 'pagefind') continue;
        stack.push(full);
      } else if (entry.name.endsWith('.html')) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/** Map a built file path to the URL path it is served at. */
function filePathToRoute(root, file) {
  let rel = relative(root, file).split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  else if (rel === 'index.html') rel = '';
  else rel = rel.replace(/\.html$/, '/');
  const route = `/${rel}`.replace(/\/{2,}/g, '/');
  return route.endsWith('/') ? route : `${route}/`;
}

// ---------------------------------------------------------------- html parsing

/**
 * Extract the <head> region. Directives outside <head> do not count for
 * robots/canonical, and scanning the whole document would pick up prose,
 * JSON-LD strings and inlined script that merely mention the words.
 */
function headOf(html) {
  const start = html.search(/<head[\s>]/i);
  if (start === -1) return html.slice(0, 20000);
  const end = html.search(/<\/head>/i);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? '').trim();
}

function metaRobots(head) {
  const tags = head.match(/<meta\b[^>]*>/gi) ?? [];
  const values = [];
  for (const tag of tags) {
    const name = (attr(tag, 'name') ?? '').toLowerCase();
    // googlebot directives bind as tightly as the generic robots name.
    if (name === 'robots' || name === 'googlebot') {
      const content = attr(tag, 'content');
      if (content) values.push(content.toLowerCase());
    }
  }
  return values;
}

function canonicalOf(head) {
  const links = head.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    if (rel === 'canonical') return attr(tag, 'href');
  }
  return null;
}

function metaRefreshOf(head) {
  const tags = head.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if ((attr(tag, 'http-equiv') ?? '').toLowerCase() !== 'refresh') continue;
    const content = attr(tag, 'content') ?? '';
    const m = content.match(/url\s*=\s*(.+)$/i);
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return null;
}

/** Normalise any href to a site-internal route, or null if external/non-page. */
function toRoute(href, fromRoute) {
  if (!href) return null;
  let value = href.trim();
  if (!value || value.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(value)) return null;

  if (value.startsWith('//')) return null;
  if (/^https?:\/\//i.test(value)) {
    if (!value.startsWith(ORIGIN)) return null;
    value = value.slice(ORIGIN.length) || '/';
  } else if (!value.startsWith('/')) {
    // Relative link — resolve against the directory of the current route.
    const base = fromRoute.endsWith('/') ? fromRoute : `${fromRoute.replace(/[^/]*$/, '')}`;
    value = new URL(value, `${ORIGIN}${base}`).pathname;
  }

  value = value.split('#')[0].split('?')[0];
  if (!value) return null;
  // Assets are not routes.
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|webmanifest|woff2?)$/i.test(value)) return null;
  return value.endsWith('/') ? value : `${value}/`;
}

/** Body-region <a href> targets, deduplicated per source page occurrence-counted. */
function outboundLinks(html, fromRoute) {
  const bodyStart = html.search(/<body[\s>]/i);
  let body = bodyStart === -1 ? html : html.slice(bodyStart);
  // Anchors assembled inside inline scripts/templates are not links Google can
  // follow in the served HTML, and their unresolved `' + expr + '` fragments
  // otherwise register as broken routes. Strip those regions before matching.
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
  const anchors = body.match(/<a\b[^>]*>/gi) ?? [];
  const counts = new Map();
  for (const tag of anchors) {
    const route = toRoute(attr(tag, 'href'), fromRoute);
    if (!route) continue;
    counts.set(route, (counts.get(route) ?? 0) + 1);
  }
  return counts;
}

/** Rough visible-word count: strip non-content elements, then tags. */
function wordCount(html) {
  const bodyStart = html.search(/<body[\s>]/i);
  let text = bodyStart === -1 ? html : html.slice(bodyStart);
  text = text
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  const words = text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  return words.length;
}

function titleOf(head) {
  const m = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// ---------------------------------------------------------------- classification

/** First path segment, with a few multi-segment families kept whole. */
function routeFamily(route) {
  const parts = route.split('/').filter(Boolean);
  if (parts.length === 0) return '/(home)';
  const two = `/${parts[0]}/${parts[1] ?? ''}`;
  if (parts[0] === 'explore' && ['plans', 'places', 'walks'].includes(parts[1])) return two.replace(/\/$/, '');
  return `/${parts[0]}`;
}

function pageType(route, record) {
  if (record.isRedirectStub) return 'redirect-stub';
  const depth = route.split('/').filter(Boolean).length;
  if (depth === 0) return 'home';
  if (depth === 1) return 'hub';
  return 'detail';
}

/**
 * Assign exactly one operational bucket. This is the classification the
 * recovery programme is steered by, so it must be derivable from measured
 * artefact state alone — no judgement calls baked in here.
 */
function classify(record) {
  const { noindex, canonicalRoute, route, inSitemap, isRedirectStub, selfCanonical, words } = record;

  if (isRedirectStub || (noindex && canonicalRoute && !selfCanonical)) {
    return noindex ? 'REAL_TECHNICAL_DEFECT' : 'MIGRATION_PENDING';
  }
  if (noindex && inSitemap) return 'REAL_TECHNICAL_DEFECT';
  if (!noindex && inSitemap && !selfCanonical) return 'REAL_TECHNICAL_DEFECT';
  if (noindex) return 'INTENTIONAL_EXCLUSION';
  if (!selfCanonical && canonicalRoute) return 'MIGRATION_PENDING';
  if (!inSitemap) return 'NEEDS_INVESTIGATION';
  if (words < 300) return 'QUALITY_REJECTION';
  return 'CRAWL_PRIORITY';
}

// ---------------------------------------------------------------- main

const args = parseArgs(process.argv.slice(2));
const root = args.dist;

// --- sitemap membership -----------------------------------------------
let sitemapRoutes = new Set();
try {
  const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    const route = toRoute(m[1], '/');
    if (route) sitemapRoutes.add(route);
  }
} catch {
  console.error('WARN: no sitemap.xml found in dist — sitemap membership will be empty');
}

// --- robots.txt disallow rules ----------------------------------------
let disallows = [];
try {
  const txt = readFileSync(join(root, 'robots.txt'), 'utf8');
  let inStar = false;
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (/^user-agent:/i.test(t)) inStar = t.split(':')[1].trim() === '*';
    else if (inStar && /^disallow:/i.test(t)) {
      const path = t.slice(t.indexOf(':') + 1).trim();
      if (path) disallows.push(path);
    }
  }
} catch {
  console.error('WARN: no robots.txt found in dist');
}
const robotsBlocked = (route) => disallows.some((d) => route.startsWith(d));

// --- parse every built page -------------------------------------------
const files = walkHtml(root);
const records = new Map();
const outbound = new Map();

for (const file of files) {
  const route = filePathToRoute(root, file);
  const html = readFileSync(file, 'utf8');
  const head = headOf(html);

  const robotsValues = metaRobots(head);
  const robotsJoined = robotsValues.join(', ');
  const noindex = robotsValues.some((v) => /\bnoindex\b/.test(v));
  const nofollow = robotsValues.some((v) => /\bnofollow\b/.test(v));

  const canonicalHref = canonicalOf(head);
  const canonicalRoute = toRoute(canonicalHref, route);
  const refreshTarget = metaRefreshOf(head);
  const refreshRoute = toRoute(refreshTarget, route);

  const record = {
    url: `${ORIGIN}${route}`,
    route,
    routeFamily: routeFamily(route),
    title: titleOf(head),
    httpStatus: 200, // static artefact: every built file is served 200 by Pages
    robotsTxt: robotsBlocked(route) ? 'disallowed' : 'allowed',
    metaRobots: robotsJoined || '(none)',
    noindex,
    nofollow,
    canonical: canonicalHref,
    canonicalRoute,
    selfCanonical: Boolean(canonicalRoute) && canonicalRoute === route,
    inSitemap: sitemapRoutes.has(route),
    isRedirectStub: Boolean(refreshRoute),
    redirectTarget: refreshRoute,
    redirectHops: refreshRoute ? 1 : 0,
    words: wordCount(html),
    sourceFile: relative(root, file).split(sep).join('/'),
  };
  record.pageType = pageType(route, record);
  records.set(route, record);
  outbound.set(route, outboundLinks(html, route));
}

// --- resolve redirect chains -------------------------------------------
for (const record of records.values()) {
  if (!record.isRedirectStub) continue;
  const seen = new Set([record.route]);
  let cursor = record.redirectTarget;
  let hops = 1;
  while (cursor && records.has(cursor) && records.get(cursor).isRedirectStub) {
    if (seen.has(cursor)) {
      record.redirectLoop = true;
      break;
    }
    seen.add(cursor);
    cursor = records.get(cursor).redirectTarget;
    hops += 1;
  }
  record.redirectHops = hops;
  record.redirectFinal = cursor;
  const dest = cursor ? records.get(cursor) : null;
  record.redirectDestinationOk = Boolean(dest) && !dest.noindex && dest.selfCanonical;
}

// --- canonical loops ---------------------------------------------------
for (const record of records.values()) {
  if (record.selfCanonical || !record.canonicalRoute) continue;
  const target = records.get(record.canonicalRoute);
  record.canonicalTargetExists = Boolean(target);
  record.canonicalTargetSelfCanonical = target ? target.selfCanonical : null;
  record.canonicalLoop = Boolean(target) && target.canonicalRoute === record.route && !target.selfCanonical;
}

// --- internal link graph ----------------------------------------------
const inboundCounts = new Map();
const inboundPages = new Map();
for (const [from, targets] of outbound) {
  const fromRecord = records.get(from);
  // Links from a noindex page carry no crawl signal worth counting.
  if (!fromRecord || fromRecord.noindex) continue;
  for (const [to, count] of targets) {
    if (to === from) continue;
    inboundCounts.set(to, (inboundCounts.get(to) ?? 0) + count);
    if (!inboundPages.has(to)) inboundPages.set(to, new Set());
    inboundPages.get(to).add(from);
  }
}

// --- click depth from the homepage (BFS over indexable pages) ----------
const depth = new Map([['/', 0]]);
const queue = ['/'];
while (queue.length) {
  const current = queue.shift();
  const currentRecord = records.get(current);
  if (!currentRecord || currentRecord.noindex) continue;
  for (const to of outbound.get(current)?.keys() ?? []) {
    if (depth.has(to)) continue;
    if (!records.has(to)) continue;
    depth.set(to, depth.get(current) + 1);
    queue.push(to);
  }
}

for (const record of records.values()) {
  record.internalInboundLinks = inboundCounts.get(record.route) ?? 0;
  record.internalInboundPages = inboundPages.get(record.route)?.size ?? 0;
  record.clickDepth = depth.has(record.route) ? depth.get(record.route) : null;
  record.orphan = record.internalInboundPages === 0;
  record.recoveryBucket = classify(record);
}

// --- broken internal targets ------------------------------------------
const brokenTargets = new Map();
for (const [from, targets] of outbound) {
  for (const to of targets.keys()) {
    if (records.has(to)) continue;
    if (!brokenTargets.has(to)) brokenTargets.set(to, new Set());
    brokenTargets.get(to).add(from);
  }
}

// --- links pointing at non-winners ------------------------------------
const linksToLosers = [];
for (const [from, targets] of outbound) {
  const fromRecord = records.get(from);
  if (!fromRecord || fromRecord.noindex) continue;
  for (const [to, count] of targets) {
    const target = records.get(to);
    if (!target) continue;
    if (target.noindex || target.isRedirectStub || (target.canonicalRoute && !target.selfCanonical)) {
      linksToLosers.push({ from, to, count, reason: target.isRedirectStub ? 'redirect-stub' : target.noindex ? 'noindex' : 'canonical-loser' });
    }
  }
}
const loserTotals = new Map();
for (const link of linksToLosers) {
  const entry = loserTotals.get(link.to) ?? { target: link.to, links: 0, sourcePages: new Set(), reason: link.reason };
  entry.links += link.count;
  entry.sourcePages.add(link.from);
  loserTotals.set(link.to, entry);
}

// --- sitemap entries with no built page --------------------------------
const sitemapOrphans = [...sitemapRoutes].filter((r) => !records.has(r));

// ---------------------------------------------------------------- output

mkdirSync(args.out, { recursive: true });
const all = [...records.values()].sort((a, b) => a.route.localeCompare(b.route));

const summary = {
  generatedAt: new Date().toISOString(),
  dist: root,
  totals: {
    builtPages: all.length,
    sitemapEntries: sitemapRoutes.size,
    sitemapEntriesWithoutPage: sitemapOrphans.length,
    noindex: all.filter((r) => r.noindex).length,
    redirectStubs: all.filter((r) => r.isRedirectStub).length,
    indexableSelfCanonical: all.filter((r) => !r.noindex && r.selfCanonical && !r.isRedirectStub).length,
    orphanIndexable: all.filter((r) => !r.noindex && !r.isRedirectStub && r.orphan).length,
  },
  constitutionViolations: {
    sitemapNoindex: all.filter((r) => r.inSitemap && r.noindex).map((r) => r.route),
    sitemapNonSelfCanonical: all.filter((r) => r.inSitemap && !r.selfCanonical).map((r) => ({ route: r.route, canonical: r.canonicalRoute })),
    sitemapRedirect: all.filter((r) => r.inSitemap && r.isRedirectStub).map((r) => r.route),
    noindexPlusForeignCanonical: all.filter((r) => r.noindex && r.canonicalRoute && !r.selfCanonical).map((r) => ({ route: r.route, canonical: r.canonicalRoute })),
    indexableCanonicalLosers: all.filter((r) => !r.noindex && r.canonicalRoute && !r.selfCanonical && !r.isRedirectStub).map((r) => ({ route: r.route, canonical: r.canonicalRoute })),
    multiHopRedirects: all.filter((r) => r.redirectHops > 1).map((r) => ({ route: r.route, hops: r.redirectHops, final: r.redirectFinal })),
    redirectLoops: all.filter((r) => r.redirectLoop).map((r) => r.route),
    canonicalLoops: all.filter((r) => r.canonicalLoop).map((r) => r.route),
    canonicalToMissingPage: all.filter((r) => r.canonicalRoute && r.canonicalTargetExists === false).map((r) => ({ route: r.route, canonical: r.canonicalRoute })),
    redirectToBadDestination: all.filter((r) => r.isRedirectStub && !r.redirectDestinationOk).map((r) => ({ route: r.route, final: r.redirectFinal })),
    indexableOrphans: all.filter((r) => !r.noindex && !r.isRedirectStub && r.orphan && r.inSitemap).map((r) => r.route),
    sitemapEntriesWithoutPage: sitemapOrphans,
  },
  byBucket: all.reduce((acc, r) => {
    acc[r.recoveryBucket] = (acc[r.recoveryBucket] ?? 0) + 1;
    return acc;
  }, {}),
  byFamily: all.reduce((acc, r) => {
    const f = (acc[r.routeFamily] ??= { total: 0, indexable: 0, noindex: 0, inSitemap: 0, redirectStub: 0 });
    f.total += 1;
    if (r.noindex) f.noindex += 1;
    else if (!r.isRedirectStub) f.indexable += 1;
    if (r.inSitemap) f.inSitemap += 1;
    if (r.isRedirectStub) f.redirectStub += 1;
    return acc;
  }, {}),
  topLinkedLosers: [...loserTotals.values()]
    .map((e) => ({ target: e.target, links: e.links, sourcePages: e.sourcePages.size, reason: e.reason }))
    .sort((a, b) => b.links - a.links)
    .slice(0, 40),
  brokenInternalTargets: [...brokenTargets.entries()]
    .map(([to, froms]) => ({ target: to, sourcePages: froms.size }))
    .sort((a, b) => b.sourcePages - a.sourcePages)
    .slice(0, 40),
};

writeFileSync(join(args.out, 'url-ledger.json'), `${JSON.stringify({ summary, urls: all }, null, 2)}\n`);

const columns = [
  'url', 'route', 'routeFamily', 'pageType', 'httpStatus', 'robotsTxt', 'metaRobots', 'noindex',
  'canonical', 'selfCanonical', 'inSitemap', 'isRedirectStub', 'redirectTarget', 'redirectHops',
  'redirectFinal', 'redirectDestinationOk', 'canonicalLoop', 'words', 'internalInboundLinks',
  'internalInboundPages', 'clickDepth', 'orphan', 'recoveryBucket', 'title',
];
const csv = [columns.join(',')];
for (const record of all) {
  csv.push(columns.map((c) => {
    const value = record[c];
    if (value === null || value === undefined) return '';
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
}
writeFileSync(join(args.out, 'url-ledger.csv'), `${csv.join('\n')}\n`);

writeFileSync(join(args.out, 'link-graph.json'), `${JSON.stringify({
  generatedAt: summary.generatedAt,
  nodes: all.length,
  edges: [...outbound.values()].reduce((n, m) => n + m.size, 0),
  inbound: Object.fromEntries([...inboundCounts.entries()].sort((a, b) => b[1] - a[1])),
  depth: Object.fromEntries([...depth.entries()].sort((a, b) => a[1] - b[1])),
  linksToLosers: summary.topLinkedLosers,
  brokenTargets: summary.brokenInternalTargets,
}, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
