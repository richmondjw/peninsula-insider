#!/usr/bin/env node
/**
 * count-semantics.test.mjs - the regression test for PI-009.
 *
 * The defect: /eat/ rendered "All 53 places to eat" while the filter bar
 * reported "Showing all 60 places". The heading counted directory items; the
 * runtime counted every [data-facets] element, which included The Six (six
 * venues already in the directory, rendered a second time) and one empty
 * bridge container. A constant offset of seven that drifted with content.
 *
 * Two levels are covered here:
 *   1. the pure semantics (countableSubset + itemMatches), on a fixture that
 *      includes a venue in two categories and a duplicated pick;
 *   2. the rendered contract, by running the build assert's HTML analyser
 *      over a fixture page shaped like /eat/ (and over dist when present).
 *
 * Usage:  node --test scripts/count-semantics.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { analyseHtml, checkPage } from './assert-count-semantics.mjs';

const { countableSubset, itemMatches, parseItemFacets, COUNTABLE_ATTR } = await import(
  new URL('../src/lib/v5-filter-state.ts', import.meta.url).href
);

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

/* ------------------------------------------------------------------ */
/* Fixture: three venues, one of them in two categories, plus the two  */
/* shapes that broke the count (a duplicated pick, a bridge container). */
/* ------------------------------------------------------------------ */

const VENUES = [
  { slug: 'tedesca-osteria', facets: { place: ['red-hill'], cat: ['restaurant'], mood: ['long-lunch'] } },
  // Multi-category: a brewery that is also a restaurant. It must match under
  // either category and still count exactly once.
  { slug: 'jetty-road-brewery', facets: { place: ['dromana'], cat: ['brewery', 'restaurant'], mood: ['casual'] } },
  { slug: 'baker-bleu', facets: { place: ['sorrento'], cat: ['bakery'], mood: ['quick'] } },
];

/** The directory row: one per venue, the page's countable result. */
const directoryItems = VENUES.map((v) => ({ facets: v.facets, countable: true }));
/** The Six: two of the same venues, pinned above. Filterable, not countable. */
const pinnedItems = [VENUES[0], VENUES[1]].map((v) => ({ facets: v.facets, countable: false }));
/** The bridge container: carries facets, represents nothing. */
const bridgeItems = [{ facets: { cat: ['winery'] }, countable: false }];

const pageItems = [...pinnedItems, ...bridgeItems, ...directoryItems];

const fixtureHtml = `<!DOCTYPE html><html><body>
<section class="v5-six">
  <ul>
${pinnedItems
  .map(
    (it, i) =>
      `    <li class="v5-six__item" data-facets='${JSON.stringify(it.facets)}' data-title="pick ${i}"></li>`,
  )
  .join('\n')}
  </ul>
</section>
<section class="v5-directory">
  <h2 class="v5-directory__heading" id="directory-heading">All ${VENUES.length} places to eat</h2>
  <div class="v5-filterbar"><p><span data-filter-count></span></p></div>
  <div class="eat-winery-kitchens" data-facets='{"cat":["winery"]}' data-title="Winery kitchens"></div>
  <ul data-sort-container>
${directoryItems
  .map(
    (it, i) =>
      `    <li class="v5-directory__row" data-facets='${JSON.stringify(it.facets)}' data-filter-countable="true" data-title="${VENUES[i].slug}"></li>`,
  )
  .join('\n')}
  </ul>
</section>
<script>document.querySelectorAll('[data-facets]');</script>
</body></html>`;

/* ------------------------------------------------------------------ */

test('the attribute contract is exported, so pages and checks agree', () => {
  assert.equal(COUNTABLE_ATTR, 'data-filter-countable');
});

test('counting counts distinct results, not tagged nodes', () => {
  assert.equal(pageItems.length, 6, 'fixture page carries six data-facets nodes');
  assert.equal(countableSubset(pageItems).length, VENUES.length);
});

test('a duplicated pick filters but does not count twice', () => {
  const state = { cat: ['restaurant'] };
  // Both the pinned card and its directory row match, so both stay visible.
  const visible = pageItems.filter((it) => itemMatches(it.facets, state));
  assert.equal(visible.length, 4, 'two pinned picks plus two directory rows');
  // The count sees each venue once.
  const counted = countableSubset(pageItems).filter((it) => itemMatches(it.facets, state));
  assert.equal(counted.length, 2, 'Tedesca and Jetty Road, once each');
});

test('a multi-category venue is found under either category and counted once', () => {
  for (const cat of ['brewery', 'restaurant']) {
    const counted = countableSubset(pageItems).filter((it) => itemMatches(it.facets, { cat: [cat] }));
    const hits = counted.filter((it) => (it.facets.cat ?? []).includes(cat));
    assert.equal(hits.length, counted.length);
    assert.ok(
      counted.some((it) => (it.facets.place ?? []).includes('dromana')),
      `Jetty Road should appear under ${cat}`,
    );
  }
  const both = countableSubset(pageItems).filter((it) =>
    itemMatches(it.facets, { cat: ['brewery', 'restaurant'] }),
  );
  assert.equal(both.length, 2, 'OR within a facet must not double-count the multi-category venue');
});

test('the empty bridge container never counts', () => {
  const counted = countableSubset(pageItems);
  assert.ok(!counted.some((it) => (it.facets.cat ?? []).includes('winery')));
});

test('a page that marks nothing countable still counts everything', () => {
  const legacy = pageItems.map((it) => ({ facets: it.facets }));
  assert.equal(countableSubset(legacy).length, legacy.length);
});

test('parseItemFacets tolerates the JSON the pages emit', () => {
  assert.deepEqual(parseItemFacets('{"cat":["brewery","restaurant"]}'), {
    cat: ['brewery', 'restaurant'],
  });
  assert.deepEqual(parseItemFacets('not json'), {});
});

/* ---------------- the rendered contract ---------------- */

test('rendered heading equals the count the filter bar will produce', () => {
  const a = analyseHtml(fixtureHtml);
  assert.equal(a.claims.length, 1);
  assert.equal(a.claims[0].count, VENUES.length);
  assert.equal(a.countableNodes, VENUES.length);
  assert.equal(a.runtimeCount, VENUES.length);
  assert.equal(a.claims[0].count, a.runtimeCount);
  assert.deepEqual(checkPage('fixture', fixtureHtml).failures, []);
});

test('the pre-fix shape is what this test would have caught', () => {
  // Strip the opt-in markers: this is exactly the DOM that shipped.
  const before = fixtureHtml.replace(/ data-filter-countable="true"/g, '');
  const a = analyseHtml(before);
  assert.equal(a.facetNodes, 6);
  assert.equal(a.countableNodes, 0);
  // With nothing marked, the runtime falls back to counting every tagged
  // node, which is precisely the 53-versus-60 defect.
  assert.equal(a.runtimeCount, 6);
  const result = checkPage('fixture', before);
  assert.ok(
    result.failures.some((f) => /heading says 3 .*will count 6/.test(f)),
    `expected a heading/count mismatch, got: ${JSON.stringify(result.failures)}`,
  );
});

test('built hubs agree (skipped when dist/ is absent)', (t) => {
  const pages = ['eat/index.html', 'wine/index.html', 'stay/index.html', 'explore/index.html'];
  const present = pages.filter((p) => existsSync(new URL(p, `file://${DIST}`)));
  if (present.length === 0) {
    t.skip('no dist/ build to inspect; npm run build covers this via assert:count-semantics');
    return;
  }
  for (const page of present) {
    const html = readFileSync(new URL(page, `file://${DIST}`), 'utf8');
    const result = checkPage(page, html);
    assert.equal(result.skipped, false, `${page} made no "All N" count claim`);
    assert.deepEqual(result.failures, [], `${page} heading and count disagree`);
  }
});
