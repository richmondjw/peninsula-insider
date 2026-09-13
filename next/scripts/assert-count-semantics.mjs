#!/usr/bin/env node
/**
 * assert-count-semantics - fails the build when a listing page's heading and
 * the count its filter bar will render disagree.
 *
 * /eat/ shipped "All 53 places to eat" above a status line that said
 * "Showing all 60 places", every day, for as long as both existed. The two
 * numbers came from different definitions: the heading counted directory
 * items, the runtime counted every element on the page carrying a
 * data-facets attribute. Six of those were The Six, which is the directory's
 * own top picks rendered a second time, and one was a bridge container that
 * represented no venue at all. Nothing in the pipeline compared them.
 *
 * The fix gave counting an explicit subject: an element is counted only when
 * it also carries data-filter-countable (COUNTABLE_ATTR in
 * lib/v5-filter-state.ts). This check holds that contract to the built HTML,
 * which is the only place both numbers exist side by side.
 *
 * Runs on dist, like lint-filter-chips, so it checks what actually shipped.
 *
 * Usage:  node scripts/assert-count-semantics.mjs
 * Exit:   0 every listing surface agrees; 1 any disagreement.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

/** Surfaces that must be present and must pass. A hub that stops emitting
 *  countable markers would otherwise vanish from the check silently. */
export const REQUIRED_SURFACES = [
  'eat/index.html',
  'wine/index.html',
  'stay/index.html',
  'explore/index.html',
];

export function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Script and style bodies mention these attributes as plain strings. */
function stripCode(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

const hasAttr = (tag, name) => new RegExp(`\\s${name}[=\\s/>]`).test(tag);

/**
 * What the page claims and what it will count.
 *
 *   facetNodes     every [data-facets] element: what the old counter counted
 *   countableNodes [data-facets][data-filter-countable]: distinct results
 *   runtimeCount   what the filter bar will actually print, mirroring
 *                  countableSubset(): the countable nodes, or, when a page
 *                  marks none, all of them
 *   claims         each "All N ..." directory heading, with its number
 */
export function analyseHtml(html) {
  const body = stripCode(html);

  let facetNodes = 0;
  let countableNodes = 0;
  let orphanMarkers = 0;
  for (const tag of body.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const facets = hasAttr(tag, 'data-facets');
    const countable = hasAttr(tag, 'data-filter-countable');
    if (facets) facetNodes += 1;
    if (facets && countable) countableNodes += 1;
    if (!facets && countable) orphanMarkers += 1;
  }

  const headings = [];
  const H2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = H2.exec(body)) !== null) {
    const text = decodeEntities(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    headings.push({ text, directory: /directory__heading/.test(m[1]) });
  }
  // A count claim is a heading that opens with "All <number>". Prefer the
  // ones the directory modules render; fall back to any h2 so a hand-rolled
  // listing page is still covered.
  const claimed = headings.filter((h) => /^All\s+[\d,]+\b/.test(h.text));
  const scoped = claimed.filter((h) => h.directory);
  const chosen = scoped.length ? scoped : claimed;

  return {
    facetNodes,
    countableNodes,
    // Mirrors countableSubset() in lib/v5-filter-state.ts: a page that marks
    // nothing countable falls back to counting every tagged node, which is
    // the behaviour this check exists to catch on a page that should have
    // opted in.
    runtimeCount: countableNodes > 0 ? countableNodes : facetNodes,
    orphanMarkers,
    hasFilterCount: /\sdata-filter-count[=\s/>]/.test(body),
    claims: chosen.map((h) => ({
      text: h.text,
      count: Number(h.text.match(/^All\s+([\d,]+)/)[1].replace(/,/g, '')),
    })),
  };
}

/** Verdict for one page. `null` when the page makes no count claim. */
export function checkPage(name, html) {
  const a = analyseHtml(html);
  if (!a.hasFilterCount || a.claims.length === 0) return { name, ...a, skipped: true };
  const failures = [];
  if (a.claims.length > 1) {
    failures.push(
      `${a.claims.length} competing "All N" directory headings: ` +
        a.claims.map((c) => `"${c.text}"`).join(', '),
    );
  }
  for (const claim of a.claims) {
    if (claim.count !== a.runtimeCount) {
      failures.push(
        `heading says ${claim.count} ("${claim.text}") but the filter bar will ` +
          `count ${a.runtimeCount} (${a.facetNodes} elements carry data-facets, ` +
          `${a.countableNodes} of them countable)`,
      );
    }
  }
  if (a.orphanMarkers > 0) {
    failures.push(
      `${a.orphanMarkers} element(s) carry data-filter-countable without data-facets, ` +
        'so they are invisible to both the filter and the count',
    );
  }
  return { name, ...a, skipped: false, failures };
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) htmlFiles(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('assert-count-semantics: dist/ not found. Run the build first.');
    process.exit(1);
  }

  const failures = [];
  const seen = new Set();
  const rows = [];

  for (const file of htmlFiles(DIST)) {
    const name = relative(DIST, file).split(sep).join('/');
    const result = checkPage(name, readFileSync(file, 'utf8'));
    if (result.skipped) continue;
    seen.add(name);
    rows.push(result);
    for (const f of result.failures) failures.push(`${name}: ${f}`);
  }

  for (const required of REQUIRED_SURFACES) {
    if (!seen.has(required)) {
      failures.push(
        `${required}: expected a filtered listing with an "All N" heading, found none. ` +
          'Did the page lose its FilterBar, its heading, or its data-filter-countable markers?',
      );
    }
  }

  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const offset = r.facetNodes - r.runtimeCount;
    console.log(
      `  ${r.name.padEnd(24)} heading ${String(r.claims[0].count).padStart(4)}  ` +
        `counted ${String(r.runtimeCount).padStart(4)}  ` +
        `data-facets nodes ${String(r.facetNodes).padStart(4)}  ` +
        `(uncounted duplicates: ${offset})`,
    );
  }

  if (failures.length) {
    console.error(`\nassert-count-semantics: ${failures.length} failure(s)\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      '\nHeading, filters and count must share one definition of a result. ' +
        'Mark exactly one element per distinct result with data-filter-countable; ' +
        'echo modules (The Six, bridge lists) filter without counting.',
    );
    process.exit(1);
  }

  console.log(`\nassert-count-semantics: ${rows.length} listing surface(s) agree.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
