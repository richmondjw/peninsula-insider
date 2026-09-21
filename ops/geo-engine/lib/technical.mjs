// Deterministic technical SEO checks.
//
// Correctness here is decided by code, not by a model: a title is either
// missing or it is not. The decision layer is used only to rank what is
// material, so the engine reports a short list of real problems rather than
// hundreds of trivial warnings.

const TITLE_MIN = 25;
const TITLE_MAX = 65;
const META_MIN = 70;
const META_MAX = 165;
const THIN_WORDS = { article: 300, guide: 350, 'venue-or-guide': 250, place: 250, itinerary: 300, event: 120, hub: 150, 'quick-note': 80, tour: 200, utility: 0, home: 0, page: 200, 'place-or-guide': 250 };

/** One finding: a rule that fired on a URL, with the evidence that fired it. */
function finding(urlPath, rule, detail, extra = {}) {
  return { urlPath, rule, detail, ...extra };
}

export function auditPage(page, ctx) {
  const out = [];
  const { urlPath } = page;

  // A meta-refresh stub is an intentional client-side redirect, not a content
  // page. Only two things matter about one: that it is not advertised for
  // indexing, and that it points somewhere real.
  if (page.pageType === 'redirect-stub') {
    if (page.inSitemap) {
      out.push(finding(urlPath, 'noindex_in_sitemap', `redirect stub to ${page.redirectTarget ?? '(unparseable target)'} is listed in sitemap.xml`, { target: page.redirectTarget }));
    }
    if (page.redirectTarget && !ctx.knownPaths.has(page.redirectTarget)) {
      out.push(finding(urlPath, 'broken_internal_link', `redirects to ${page.redirectTarget}, which is not a page in the served tree`, { target: page.redirectTarget }));
    }
    return out;
  }

  const indexableSurface = page.indexable && page.pageType !== 'utility';

  if (!page.title) out.push(finding(urlPath, 'missing_title', 'page has no <title>'));
  else if (page.titleLength > TITLE_MAX) out.push(finding(urlPath, 'title_too_long', `${page.titleLength} chars (>${TITLE_MAX})`));
  else if (page.titleLength < TITLE_MIN && indexableSurface) out.push(finding(urlPath, 'title_too_short', `${page.titleLength} chars (<${TITLE_MIN})`));

  if (!page.metaDescription) {
    if (indexableSurface) out.push(finding(urlPath, 'missing_meta_description', 'no meta description'));
  } else if (page.metaDescriptionLength > META_MAX || page.metaDescriptionLength < META_MIN) {
    out.push(finding(urlPath, 'meta_description_length', `${page.metaDescriptionLength} chars (target ${META_MIN}-${META_MAX})`));
  }

  // A canonical only matters where indexing can happen; noindex pages are exempt.
  if (!page.canonical && page.indexable) out.push(finding(urlPath, 'missing_canonical', 'no canonical link'));
  else if (page.canonicalPath && page.canonicalPath !== urlPath) {
    out.push(finding(urlPath, 'canonical_mismatch', `canonical points to ${page.canonicalPath}`, { target: page.canonicalPath }));
  }

  if (!page.h1) out.push(finding(urlPath, 'missing_h1', 'no H1'));
  else if (page.h1Count > 1) out.push(finding(urlPath, 'multiple_h1', `${page.h1Count} H1 elements`));

  const skip = headingSkip(page.headings ?? []);
  if (skip) out.push(finding(urlPath, 'heading_skip', `H${skip.from} followed by H${skip.to}`));

  if (page.missingAltCount > 0) {
    out.push(finding(urlPath, 'missing_alt', `${page.missingAltCount} of ${page.imageCount} images lack alt text`, { count: page.missingAltCount }));
  }

  if (page.jsonLdInvalidCount > 0) {
    out.push(finding(urlPath, 'invalid_jsonld', `${page.jsonLdInvalidCount} JSON-LD block(s) failed to parse`, { count: page.jsonLdInvalidCount }));
  }
  if (indexableSurface && page.jsonLdBlockCount === 0) {
    out.push(finding(urlPath, 'no_schema', 'no structured data on an indexable content page'));
  }

  if (!page.indexable && page.inSitemap) {
    out.push(finding(urlPath, 'noindex_in_sitemap', 'page is noindex but listed in sitemap.xml'));
  }
  if (indexableSurface && !page.inSitemap && ctx.sitemapAvailable) {
    out.push(finding(urlPath, 'not_in_sitemap', 'indexable content page missing from sitemap.xml'));
  }

  const floor = THIN_WORDS[page.pageType] ?? 200;
  if (indexableSurface && floor > 0 && page.wordCount < floor) {
    out.push(finding(urlPath, 'thin_content', `${page.wordCount} words (below the ${floor}-word floor for ${page.pageType})`));
  }

  if (page.orphan && indexableSurface) {
    out.push(finding(urlPath, 'orphan_page', 'no internal links point at this page'));
  }

  for (const link of page.outgoingInternal ?? []) {
    if (!ctx.knownPaths.has(link.to) && !ctx.assetLike(link.to)) {
      out.push(finding(urlPath, 'broken_internal_link', `links to ${link.to}, which is not a page in the served tree`, { target: link.to, anchor: link.anchor }));
    }
  }

  return out;
}

function headingSkip(headings) {
  let prev = null;
  for (const h of headings) {
    if (prev !== null && h.level > prev + 1) return { from: prev, to: h.level };
    prev = h.level;
  }
  return null;
}

/** Duplicate metadata is a site-level property, checked across the inventory. */
export function auditSite(pages) {
  const out = [];
  const byTitle = new Map();
  const byMeta = new Map();
  for (const page of Object.values(pages)) {
    // Redirect stubs all carry the same placeholder title by design; they are
    // not duplicate content and must not drown the real duplicates.
    if (!page.indexable || page.pageType === 'utility' || page.pageType === 'redirect-stub') continue;
    if (page.title) push(byTitle, page.title.trim().toLowerCase(), page.urlPath);
    if (page.metaDescription) push(byMeta, page.metaDescription.trim().toLowerCase(), page.urlPath);
  }
  for (const [title, urls] of byTitle) {
    if (urls.length > 1) {
      for (const urlPath of urls) {
        out.push(finding(urlPath, 'duplicate_title', `title shared with ${urls.length - 1} other page(s)`, { shared: urls.filter((u) => u !== urlPath).slice(0, 5), value: title.slice(0, 80) }));
      }
    }
  }
  for (const [, urls] of byMeta) {
    if (urls.length > 1) {
      for (const urlPath of urls) {
        out.push(finding(urlPath, 'duplicate_meta_description', `meta description shared with ${urls.length - 1} other page(s)`, { shared: urls.filter((u) => u !== urlPath).slice(0, 5) }));
      }
    }
  }
  return out;
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

/** Sitemap integrity: duplicate entries, and entries with no page behind them. */
export function auditSitemap(sitemap, pages) {
  const out = [];
  if (!sitemap?.available) return out;
  for (const [urlPath, count] of sitemap.duplicates ?? []) {
    out.push(finding(urlPath, 'sitemap_duplicate_entry', `listed ${count} times in sitemap.xml`, { count }));
  }
  for (const urlPath of sitemap.urls) {
    if (!pages[urlPath]) out.push(finding(urlPath, 'sitemap_url_missing_page', 'listed in sitemap.xml but no page exists in the served tree'));
  }
  return out;
}

export function auditAll(pages, { sitemapAvailable = true, sitemap = null } = {}) {
  const knownPaths = new Set(Object.keys(pages));
  const assetLike = (p) => /\.(webp|jpg|jpeg|png|svg|pdf|xml|txt|ics|json|webmanifest)\/?$/i.test(p) || p.startsWith('/api/');
  const ctx = { knownPaths, assetLike, sitemapAvailable };
  const findings = [];
  for (const page of Object.values(pages)) findings.push(...auditPage(page, ctx));
  findings.push(...auditSite(pages));
  if (sitemap) findings.push(...auditSitemap(sitemap, pages));
  return findings;
}

export function summariseFindings(findings) {
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  return {
    total: findings.length,
    byRule: Object.fromEntries(Object.entries(byRule).sort((a, b) => b[1] - a[1])),
    urlsAffected: new Set(findings.map((f) => f.urlPath)).size,
  };
}
