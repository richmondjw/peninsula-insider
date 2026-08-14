#!/usr/bin/env node
/**
 * audit-link-graph.mjs — crawl-budget and internal-link-graph audit over `dist`.
 *
 * Produces the numbers behind deliverables/2026-08-15-pi-internal-linking-and-indexing-plan.md
 * as a build artifact rather than a claim in a document.
 *
 * Four classes of built page:
 *   - self-canonical      : rel=canonical matches the page's own URL. Correct.
 *   - redirect stub       : emits the Redirect.astro location.replace() shim. Correct.
 *                           Detected by signature, NOT by byte size — the `consolidate`
 *                           stubs pick up BaseLayout CSS and land around 4 KB, so a
 *                           size threshold misclassifies them as duplicates.
 *   - noindex surface     : robots noindex. A real UI surface we choose not to index
 *                           (mood filters, archive indexes). Not a duplicate — but a
 *                           noindex page carrying a *foreign* canonical is the same
 *                           contradictory pairing fixed on 8 Aug, tracked separately.
 *   - full duplicate      : indexable, full render, canonical points elsewhere. DEFECT.
 *                           Googlebot must fetch the whole page to learn it should be
 *                           discarded, which spends crawl budget the site does not have.
 *
 * Link classification:
 *   - chrome        : inside <nav>/<header>/<footer>. Sitewide, near-zero discriminating weight.
 *   - index-surface : from a page emitting >= INDEX_SURFACE_MIN body links (collection-generated
 *                     directories like /site-index/ and /map/).
 *   - editorial     : body links from everything else. The number that moves crawl priority.
 *
 * Usage:
 *   node scripts/audit-link-graph.mjs [--dist dist] [--json out.json] [--assert]
 *
 * --assert exits 1 if the duplicate-render count is above MAX_DUPLICATE_RENDERS.
 * That is the CI gate that stops this defect class recurring.
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://peninsulainsider.com.au';
const INDEX_SURFACE_MIN = 40;
const MAX_DUPLICATE_RENDERS = 0;
/**
 * Signature emitted by components/Redirect.astro. Identifies a stub by what it *is*,
 * not by byte size. Matching on `location.replace(` instead would hit ~912 pages,
 * because that call also appears in the sitewide client bundle.
 */
const REDIRECT_SIGNATURE = /<title>Redirecting/i;

/** Namespaces that are deliberately not indexable — excluded from orphan counts. */
const PRIVATE_PREFIXES = ['/admin/', '/account/', '/me/', '/preview/', '/dev/', '/api/'];

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const DIST = path.resolve(getArg('--dist', 'dist'));
const JSON_OUT = getArg('--json', null);
const ASSERT = args.includes('--assert');

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

/** dist/eat/index.html -> /eat/ ; dist/index.html -> / */
function toUrlPath(file) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  const dir = rel.replace(/index\.html$/, '');
  return '/' + dir;
}

function normalise(href, fromPath) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;
  let url;
  try {
    url = new URL(trimmed, SITE + fromPath);
  } catch {
    return null;
  }
  if (url.origin !== SITE) return null;
  let p = url.pathname;
  if (!p.endsWith('/') && !path.extname(p)) p += '/';
  return p;
}

const CHROME_BLOCK = /<(nav|header|footer)\b[\s\S]*?<\/\1>/gi;
const ANCHOR = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
const CANONICAL = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i;
const CANONICAL_ALT = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']canonical["']/i;
const NOINDEX = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*\bcontent\s*=\s*["'][^"']*noindex/i;

function extractLinks(html, fromPath) {
  const chrome = new Set();
  const body = new Set();
  for (const block of html.match(CHROME_BLOCK) ?? []) {
    for (const m of block.matchAll(ANCHOR)) {
      const p = normalise(m[1], fromPath);
      if (p) chrome.add(p);
    }
  }
  const stripped = html.replace(CHROME_BLOCK, '');
  for (const m of stripped.matchAll(ANCHOR)) {
    const p = normalise(m[1], fromPath);
    if (p) body.add(p);
  }
  return { chrome: [...chrome], body: [...body] };
}

const isPrivate = (p) => PRIVATE_PREFIXES.some((prefix) => p.startsWith(prefix));

async function main() {
  const files = await walk(DIST);
  if (!files.length) {
    console.error(`No index.html found under ${DIST}. Run \`astro build\` first.`);
    process.exit(2);
  }

  const pages = new Map();

  for (const file of files) {
    const urlPath = toUrlPath(file);
    const [html, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
    const canonMatch = html.match(CANONICAL) ?? html.match(CANONICAL_ALT);
    let canonicalPath = null;
    if (canonMatch) canonicalPath = normalise(canonMatch[1], urlPath);
    const { chrome, body } = extractLinks(html, urlPath);
    pages.set(urlPath, {
      url: urlPath,
      bytes: info.size,
      canonical: canonicalPath,
      noindex: NOINDEX.test(html),
      isStub: REDIRECT_SIGNATURE.test(html),
      selfCanonical: canonicalPath === urlPath || canonicalPath === null,
      chrome,
      body,
    });
  }

  // --- classify renders -------------------------------------------------
  const selfCanonical = [];
  const stubs = [];
  const noindexSurfaces = [];
  const duplicates = [];
  for (const page of pages.values()) {
    if (page.isStub) stubs.push(page);
    else if (page.selfCanonical) selfCanonical.push(page);
    else if (page.noindex) noindexSurfaces.push(page);
    else duplicates.push(page);
  }
  duplicates.sort((a, b) => b.bytes - a.bytes);
  noindexSurfaces.sort((a, b) => b.bytes - a.bytes);

  // --- index surfaces ---------------------------------------------------
  const indexSurfaces = new Set(
    [...pages.values()].filter((p) => p.body.length >= INDEX_SURFACE_MIN).map((p) => p.url)
  );

  // --- inbound counts ---------------------------------------------------
  const editorialIn = new Map();
  const indexIn = new Map();
  const chromeIn = new Map();
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const page of pages.values()) {
    const target = indexSurfaces.has(page.url) ? indexIn : editorialIn;
    for (const link of page.body) {
      if (link === page.url) continue;
      bump(target, link);
    }
  }
  // Chrome links are counted by how many pages emit them. A link present on
  // (almost) every page is sitewide navigation — the highest-weight link on the
  // site. A chrome-region link on a handful of pages is a local sub-nav and
  // matters far less. Conflating the two overstates the nav defect.
  const chromeFreq = new Map();
  for (const page of pages.values()) for (const link of page.chrome) bump(chromeFreq, link);
  for (const link of chromeFreq.keys()) bump(chromeIn, link);
  // 0.5, not 0.9: the global nav renders on 765 of 947 pages (81%) because a few
  // layouts opt out. A link on the majority of the site is sitewide in every way
  // that matters for link weight, and a 0.9 cutoff hides exactly the nav defect
  // this audit exists to catch.
  const SITEWIDE_MIN = Math.floor(pages.size * 0.5);

  // --- chrome links landing on non-canonical URLs ------------------------
  const chromeNonCanonical = [];
  for (const [link, freq] of [...chromeFreq].sort((a, b) => b[1] - a[1])) {
    const target = pages.get(link);
    if (!target || target.selfCanonical) continue;
    chromeNonCanonical.push({
      link,
      canonical: target.canonical,
      onPages: freq,
      sitewide: freq >= SITEWIDE_MIN,
      targetIsStub: target.isStub,
    });
  }
  const chromeSitewideNonCanonical = chromeNonCanonical.filter((c) => c.sitewide);

  // --- orphans ----------------------------------------------------------
  const indexable = [...pages.values()].filter(
    (p) => p.selfCanonical && !p.noindex && !isPrivate(p.url)
  );
  const zeroEditorial = indexable.filter((p) => !(editorialIn.get(p.url) > 0));
  const zeroAny = zeroEditorial.filter(
    (p) => !(indexIn.get(p.url) > 0) && !(chromeIn.get(p.url) > 0)
  );

  const buckets = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '11-25': 0, '26+': 0 };
  for (const p of indexable) {
    const n = editorialIn.get(p.url) ?? 0;
    if (n === 0) buckets['0']++;
    else if (n <= 2) buckets['1-2']++;
    else if (n <= 5) buckets['3-5']++;
    else if (n <= 10) buckets['6-10']++;
    else if (n <= 25) buckets['11-25']++;
    else buckets['26+']++;
  }

  const duplicateBytes = duplicates.reduce((sum, p) => sum + p.bytes, 0);
  const noindexForeignCanonical = noindexSurfaces.filter((p) => p.canonical && !p.selfCanonical);

  const report = {
    generatedAt: new Date().toISOString(),
    dist: DIST,
    totals: {
      pages: pages.size,
      indexable: indexable.length,
      selfCanonical: selfCanonical.length,
      redirectStubs: stubs.length,
      noindexSurfaces: noindexSurfaces.length,
      noindexWithForeignCanonical: noindexForeignCanonical.length,
      fullDuplicateRenders: duplicates.length,
      duplicateBytes,
      indexSurfaces: indexSurfaces.size,
      chromeLinks: chromeFreq.size,
      chromeNonCanonicalLinks: chromeNonCanonical.length,
      chromeSitewideNonCanonicalLinks: chromeSitewideNonCanonical.length,
      zeroEditorialInbound: zeroEditorial.length,
      zeroInboundOfAnyKind: zeroAny.length,
    },
    editorialInboundBuckets: buckets,
    chromeNonCanonical,
    noindexForeignCanonical: noindexForeignCanonical.map((p) => ({
      url: p.url,
      kb: Math.round(p.bytes / 1024),
      canonical: p.canonical,
    })),
    duplicates: duplicates.map((p) => ({
      url: p.url,
      kb: Math.round(p.bytes / 1024),
      canonical: p.canonical,
    })),
    orphans: zeroEditorial.map((p) => p.url).sort(),
  };

  // --- output -----------------------------------------------------------
  const t = report.totals;
  console.log(`Link-graph audit — ${t.pages} built pages (${DIST})`);
  console.log('');
  console.log('  Render classes');
  console.log(`    self-canonical .............. ${t.selfCanonical}`);
  console.log(`    redirect stubs .............. ${t.redirectStubs}`);
  console.log(
    `    noindex surfaces ............ ${t.noindexSurfaces}` +
      (t.noindexWithForeignCanonical
        ? `  (${t.noindexWithForeignCanonical} with a foreign canonical — contradictory)`
        : '')
  );
  console.log(
    `    FULL DUPLICATE RENDERS ...... ${t.fullDuplicateRenders}` +
      (t.fullDuplicateRenders ? `  (${(duplicateBytes / 1048576).toFixed(1)} MB wasted crawl)` : '')
  );
  console.log('');
  console.log('  Chrome links');
  console.log(`    distinct chrome links ....... ${t.chromeLinks}`);
  console.log(`    landing on non-canonical .... ${t.chromeNonCanonicalLinks}`);
  console.log(`      of which sitewide ......... ${t.chromeSitewideNonCanonicalLinks}`);
  for (const c of chromeNonCanonical) {
    console.log(
      `      ${c.sitewide ? 'SITEWIDE' : `on ${c.onPages}`.padStart(8)}  ${c.link} -> ${c.canonical}`
    );
  }
  console.log('');
  console.log('  Editorial link graph');
  console.log(`    indexable pages ............. ${t.indexable}`);
  console.log(`    zero editorial inbound ...... ${t.zeroEditorialInbound}`);
  console.log(`    zero inbound of any kind .... ${t.zeroInboundOfAnyKind}`);
  console.log(`    distribution ................ ${JSON.stringify(buckets)}`);

  if (t.fullDuplicateRenders) {
    console.log('');
    console.log('  Largest duplicate renders');
    for (const d of report.duplicates.slice(0, 25)) {
      console.log(`    ${String(d.kb).padStart(4)} KB  ${d.url} -> ${d.canonical}`);
    }
    if (report.duplicates.length > 25) {
      console.log(`    … and ${report.duplicates.length - 25} more`);
    }
  }

  if (JSON_OUT) {
    await writeFile(JSON_OUT, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nJSON written to ${JSON_OUT}`);
  }

  if (ASSERT) {
    const failures = [];
    if (t.fullDuplicateRenders > MAX_DUPLICATE_RENDERS) {
      failures.push(
        `full duplicate renders = ${t.fullDuplicateRenders} (max ${MAX_DUPLICATE_RENDERS})`
      );
    }
    if (t.chromeSitewideNonCanonicalLinks > 0) {
      failures.push(
        `sitewide chrome links to non-canonical URLs = ${t.chromeSitewideNonCanonicalLinks}`
      );
    }
    if (t.noindexWithForeignCanonical > 0) {
      failures.push(
        `noindex pages carrying a foreign canonical = ${t.noindexWithForeignCanonical} ` +
          `(noindex + cross-canonical is the contradictory pairing fixed on 8 Aug)`
      );
    }
    if (failures.length) {
      console.error('\nFAIL — crawl-budget assertions:');
      for (const f of failures) console.error(`  - ${f}`);
      process.exit(1);
    }
    console.log('\nPASS — crawl-budget assertions.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
