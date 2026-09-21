// The persistent site inventory.
//
// The served tree is checked into this repository, so the inventory is built
// from the real rendered HTML rather than from a crawl. Rebuilds are
// incremental: a page whose content hash is unchanged keeps its previous
// record, its scores and its intervention history.

import fs from 'node:fs';
import path from 'node:path';
import { parsePage } from './html.mjs';
import { ORIGIN, REPO_ROOT, daysBetween, readJson, sha256, walkPages, writeJson } from './util.mjs';
import { loadVocabulary, mentionedTowns, mentionedVenues } from './vocab.mjs';

export function loadSitemapUrls(root = REPO_ROOT) {
  const file = path.join(root, 'sitemap.xml');
  let xml;
  try {
    xml = fs.readFileSync(file, 'utf8');
  } catch {
    return { urls: new Set(), lastmod: new Map(), duplicates: [], entryCount: 0, available: false };
  }
  const urls = new Set();
  const lastmod = new Map();
  const counts = new Map();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1]?.trim();
    if (!loc) continue;
    const p = toPath(loc);
    if (!p) continue;
    counts.set(p, (counts.get(p) ?? 0) + 1);
    urls.add(p);
    const lm = /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1]?.trim();
    if (lm) lastmod.set(p, lm);
  }
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  return { urls, lastmod, duplicates, entryCount: [...counts.values()].reduce((a, b) => a + b, 0), available: true };
}

export function toPath(url) {
  try {
    const u = new URL(url, ORIGIN);
    if (u.origin !== ORIGIN) return null;
    let p = u.pathname;
    if (!p.endsWith('/') && !path.extname(p)) p = `${p}/`;
    return p;
  } catch {
    return null;
  }
}

/** Classify a page from its URL shape — the site's own information architecture. */
export function pageTypeFor(urlPath) {
  if (urlPath === '/') return 'home';
  const seg = urlPath.split('/').filter(Boolean);
  const top = seg[0];
  const depth = seg.length;
  const map = {
    'whats-on': depth === 1 ? 'hub' : 'event',
    events: depth === 1 ? 'hub' : 'event',
    journal: depth === 1 ? 'hub' : 'article',
    eat: depth === 1 ? 'hub' : 'venue-or-guide',
    wine: depth === 1 ? 'hub' : 'venue-or-guide',
    stay: depth === 1 ? 'hub' : 'venue-or-guide',
    explore: depth === 1 ? 'hub' : 'place-or-guide',
    places: depth === 1 ? 'hub' : 'place',
    guides: 'guide',
    plans: depth === 1 ? 'hub' : 'itinerary',
    itinerary: 'itinerary',
    tour: depth === 1 ? 'hub' : 'tour',
    'tour-packages': 'tour',
    walks: 'guide',
    fishing: 'guide',
    boating: 'guide',
    'quick-note': 'quick-note',
  };
  if (Object.hasOwn(map, top)) return map[top];
  const editorial = new Set(['about', 'contact', 'privacy', 'terms', 'careers', 'newsletter', 'ethics', 'corrections', 'complaints', 'accessibility', 'editorial-approach', 'our-approach', 'methodology', 'partner-with-us', 'partners', 'submit', 'access', 'account', 'search', 'saved', 'alerts', 'dispatch', 'downloads', 'site-index', 'map', 'ask', 'preview', 'spa']);
  if (editorial.has(top)) return 'utility';
  return depth === 1 ? 'hub' : 'page';
}

/**
 * Build or incrementally refresh the inventory.
 * @returns {{ pages: Record<string, object>, stats: object }}
 */
export function buildInventory({ root = REPO_ROOT, previous = {}, vocab = loadVocabulary(), logger } = {}) {
  const sitemap = loadSitemapUrls(root);
  const pages = {};
  const stats = { scanned: 0, reused: 0, reparsed: 0, failed: 0, new: 0, removed: 0 };
  const seen = new Set();

  for (const { file, urlPath } of walkPages(root)) {
    seen.add(urlPath);
    stats.scanned += 1;
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch (err) {
      stats.failed += 1;
      logger?.warn('could not read page', { urlPath, error: err.message });
      continue;
    }
    const contentHash = sha256(html);
    const prior = previous[urlPath];
    // Structural fields are always re-derived from the HTML: parsing the whole
    // corpus costs a few seconds, and the persisted record deliberately does
    // not carry them. `unchanged` drives what needs re-SCORING, which is the
    // expensive part of a cycle.
    const unchanged = Boolean(prior && prior.contentHash === contentHash);

    let parsed;
    try {
      parsed = parsePage(html);
    } catch (err) {
      stats.failed += 1;
      logger?.warn('could not parse page', { urlPath, error: err.message });
      continue;
    }

    const h1s = parsed.headings.filter((h) => h.level === 1);
    const towns = mentionedTowns(parsed.text, vocab);
    const venues = mentionedVenues(parsed.text, vocab);
    const internal = [];
    const external = [];
    for (const a of parsed.anchors) {
      if (/^(mailto:|tel:|javascript:|#)/i.test(a.href)) continue;
      const p = toPath(a.href);
      if (p) internal.push({ to: p, anchor: a.text.slice(0, 120) });
      else external.push(a.href);
    }

    const lastmod = sitemap.lastmod.get(urlPath) ?? null;
    let fileMtime = null;
    try { fileMtime = fs.statSync(file).mtime.toISOString(); } catch { /* ignore */ }

    const record = {
      urlPath,
      url: `${ORIGIN}${urlPath}`,
      file: path.relative(root, file),
      pageType: parsed.metaRefresh ? 'redirect-stub' : pageTypeFor(urlPath),
      redirectTarget: parsed.metaRefresh ? toPath(parsed.metaRefresh.target) : null,
      contentHash,
      title: parsed.title,
      titleLength: parsed.title ? parsed.title.length : 0,
      metaDescription: parsed.metaDescription,
      metaDescriptionLength: parsed.metaDescription ? parsed.metaDescription.length : 0,
      canonical: parsed.canonical,
      canonicalPath: parsed.canonical ? toPath(parsed.canonical) : null,
      robots: parsed.robots,
      indexable: !/noindex/i.test(parsed.robots ?? ''),
      lang: parsed.lang,
      h1: h1s[0]?.text ?? null,
      h1Count: h1s.length,
      headings: parsed.headings.slice(0, 60),
      wordCount: parsed.wordCount,
      leadSentences: parsed.sentences.slice(0, 3),
      imageCount: parsed.images.length,
      missingAltCount: parsed.images.filter((i) => i.alt === null || i.alt.trim() === '').length,
      schemaTypes: parsed.schemaTypes,
      jsonLdBlockCount: parsed.jsonLd.length,
      jsonLdInvalidCount: parsed.jsonLdInvalid.length,
      jsonLdInvalid: parsed.jsonLdInvalid.slice(0, 3),
      openGraph: { title: parsed.ogTitle, description: parsed.ogDescription, image: parsed.ogImage, type: parsed.ogType },
      outgoingInternal: dedupeLinks(internal),
      outgoingInternalCount: dedupeLinks(internal).length,
      externalLinkCount: external.length,
      towns,
      venues,
      inSitemap: sitemap.urls.has(urlPath),
      sitemapLastmod: lastmod,
      fileMtime,
      daysSinceModified: lastmod ? daysBetween(lastmod, new Date().toISOString()) : null,
      // Carry forward everything the engine learned about this URL previously.
      scores: prior?.scores ?? null,
      interventions: prior?.interventions ?? [],
      unresolvedIssues: prior?.unresolvedIssues ?? [],
      search: prior?.search ?? null,
      firstSeenAt: prior?.firstSeenAt ?? new Date().toISOString(),
      seenAt: new Date().toISOString(),
      changedSinceLastRun: !unchanged,
      lastAuditAt: prior?.lastAuditAt ?? null,
    };
    pages[urlPath] = record;
    if (unchanged) stats.reused += 1;
    else if (prior) stats.reparsed += 1;
    else stats.new += 1;
  }

  for (const urlPath of Object.keys(previous)) {
    if (!seen.has(urlPath)) stats.removed += 1;
  }

  // Inbound links are a whole-graph property, so they are computed after the
  // full pass rather than per page.
  const inbound = new Map();
  for (const page of Object.values(pages)) {
    for (const link of page.outgoingInternal) {
      if (link.to === page.urlPath) continue;
      if (!inbound.has(link.to)) inbound.set(link.to, []);
      inbound.get(link.to).push({ from: page.urlPath, anchor: link.anchor });
    }
  }
  for (const page of Object.values(pages)) {
    const list = inbound.get(page.urlPath) ?? [];
    page.incomingInternalCount = list.length;
    page.incomingInternalSample = list.slice(0, 10);
    page.orphan = list.length === 0 && page.urlPath !== '/';
  }

  stats.sitemapUrls = sitemap.urls.size;
  stats.sitemapAvailable = sitemap.available;
  stats.total = Object.keys(pages).length;
  return { pages, stats, sitemap };
}

function dedupeLinks(links) {
  const seen = new Map();
  for (const l of links) {
    if (!seen.has(l.to)) seen.set(l.to, l);
  }
  return [...seen.values()];
}

export function loadInventory(file) {
  const state = readJson(file, null);
  return state?.pages ?? {};
}

/**
 * Persisted records drop the bulky per-page link and heading arrays. They are
 * rebuilt from the HTML on every run, and this state file is committed daily,
 * so keeping them would bloat the repository for no gain. Counts, scores,
 * issues and intervention history — the things that must survive — are kept.
 */
export function serialiseForState(page) {
  const { outgoingInternal, incomingInternalSample, headings, leadSentences, jsonLdInvalid, ...rest } = page;
  return {
    ...rest,
    headingSample: (headings ?? []).slice(0, 12).map((h) => `h${h.level}:${h.text}`),
    outgoingInternalSample: (outgoingInternal ?? []).slice(0, 8).map((l) => l.to),
    incomingInternalSample: (incomingInternalSample ?? []).slice(0, 5).map((l) => l.from),
  };
}

export function saveInventory(file, pages, stats) {
  const slim = Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, serialiseForState(v)]));
  return writeJson(file, { version: 1, updatedAt: new Date().toISOString(), stats, pages: slim });
}
