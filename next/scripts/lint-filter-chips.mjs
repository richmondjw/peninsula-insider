#!/usr/bin/env node
/**
 * lint-filter-chips - fails the build when a filter chip cannot match anything.
 *
 * FilterBar renders its chips from CHIP_PRESETS[surface] in lib/facets.ts.
 * That list is authored by hand; the items it filters come from content. When
 * the two drift, the chip still renders, still highlights when tapped, still
 * writes its param to the URL, and returns zero results every time. Nothing
 * else in the pipeline notices: the build passes, the page is valid HTML, and
 * the failure only shows up when someone taps it.
 *
 * That is how /explore/ shipped Markets and Springs & spa chips against a
 * directory containing no market and no spa. Both had content; it lived in a
 * collection the page did not read.
 *
 * This runs on the built output rather than on source so it checks what
 * actually shipped, and needs no map of which page reads which collection.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) htmlFiles(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Decode the numeric and named entities Astro emits inside attributes. */
function decodeAttr(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decodeAttr(m[1]) : null;
}

let pagesChecked = 0;
const failures = [];

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('data-filter-chip')) continue;
  pagesChecked += 1;

  // Every value present on the page, per facet key.
  const available = new Map();
  for (const m of html.matchAll(/\sdata-facets="([^"]*)"/g)) {
    let facets;
    try {
      facets = JSON.parse(decodeAttr(m[1]));
    } catch {
      continue;
    }
    if (!facets || typeof facets !== 'object') continue;
    for (const [key, values] of Object.entries(facets)) {
      if (!Array.isArray(values)) continue;
      if (!available.has(key)) available.set(key, new Set());
      for (const v of values) available.get(key).add(v);
    }
  }

  for (const m of html.matchAll(/<button[^>]*\sdata-filter-chip[^>]*>/g)) {
    const tag = m[0];
    const key = attr(tag, 'data-key');
    const value = attr(tag, 'data-value');
    if (!key || !value) continue;
    if (available.get(key)?.has(value)) continue;
    failures.push({
      page: '/' + relative(DIST, file).replace(/index\.html$/, ''),
      key,
      value,
      items: [...available.values()].reduce((n, s) => n + (s.size ? 1 : 0), 0),
    });
  }
}

if (failures.length) {
  console.error(`\nlint-filter-chips: ${failures.length} chip(s) match nothing on their own page.\n`);
  for (const f of failures) {
    console.error(`  ${f.page}  ${f.key}=${f.value}`);
  }
  console.error(
    '\nEither the page is not sourcing that content, or the chip should be ' +
      'removed from CHIP_PRESETS in src/lib/facets.ts. A chip that always ' +
      'returns zero results is a dead control.\n',
  );
  process.exit(1);
}

console.log(`lint-filter-chips: OK (${pagesChecked} filterable page(s), no dead chips).`);
