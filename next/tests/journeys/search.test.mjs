/**
 * PI-012 journey 1 of 4: SEARCH.
 *
 * States covered, per the ticket's own list:
 *   - signed out (the only state search has; it needs no account)
 *   - idle, before anything is typed
 *   - results
 *   - an empty result set
 *   - a repeated action - the same search run three times
 *   - a navigation between two pages that both use the feature, then the
 *     feature used again. This is the one that mattered: /search/ was dead
 *     after any client-side navigation, because the router never re-executes
 *     a script it has already run.
 *   - a failed lookup, which must not be reported as "no results"
 *
 * Pagefind is served from the fixture (see harness.mjs), so the result set is
 * fixed and a corpus change cannot turn this red.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';

const site = await Site.open();
test.after(() => site.close());

async function typeQuery(reader, q) {
  await reader.page.evaluate((value) => {
    const input = document.getElementById('searchPageInput');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, q);
  // The page debounces input by 100ms and the search resolves a microtask later.
  await reader.page.waitForFunction(
    () => document.getElementById('searchResultsMeta')
      && document.getElementById('searchResultsMeta').textContent.trim() !== 'Searching…',
    { timeout: 10000 },
  );
  await new Promise((r) => setTimeout(r, 250));
}

const state = (reader) => reader.page.evaluate(() => ({
  meta: (document.getElementById('searchResultsMeta')?.textContent || '').trim(),
  cards: document.querySelectorAll('#searchResultsList a.search-card').length,
  list: (document.getElementById('searchResultsList')?.textContent || '').trim(),
}));

test('signed out, the search page opens idle and says so', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/search/');
    const before = await state(reader);
    assert.equal(before.cards, 0, 'nothing should be listed before a query');
    assert.match(before.meta, /start typing/i);
  } finally {
    await reader.close();
  }
});

test('a query returns results, and running it again returns the same ones', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/search/');
    await typeQuery(reader, 'sorrento');
    const first = await state(reader);
    assert.equal(first.cards, 3, `expected the fixture's three results, got ${first.cards}`);

    // Repeated action. A second and third identical search must replace the
    // result list, not append to it - the shape that a duplicated submit
    // listener turns into 6 and then 9.
    await typeQuery(reader, 'sorrento');
    await typeQuery(reader, 'sorrento');
    const third = await state(reader);
    assert.equal(third.cards, 3, `three identical searches produced ${third.cards} results`);
    assert.equal(third.meta, first.meta, 'the result count line should not drift on a repeat');
  } finally {
    await reader.close();
  }
});

test('a query with no matches gets the empty state, not an empty page', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/search/');
    await typeQuery(reader, 'nothingmatchesthisatall');
    const s = await state(reader);
    assert.equal(s.cards, 0);
    assert.match(s.meta, /no matches/i, 'an empty result set must say so');
  } finally {
    await reader.close();
  }
});

test('a failed lookup says it failed - it does not report zero results', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/search/');
    // The fixture throws for this query; see fixtures/pagefind-stub.js.
    await typeQuery(reader, 'boom');
    const s = await state(reader);
    assert.equal(s.cards, 0);
    assert.match(
      s.list,
      /isn't available|not available|try again/i,
      'a search that threw must not be presented as "no matches" - that tells the reader '
      + 'the Peninsula has nothing when the truth is that the lookup broke',
    );
    assert.doesNotMatch(s.meta, /no matches for/i);
  } finally {
    await reader.close();
  }
});

test('search still works after navigating away and back', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/search/');
    await typeQuery(reader, 'sorrento');
    assert.equal((await state(reader)).cards, 3, 'precondition: search works on a cold load');

    await reader.navigate('/eat/');
    await reader.navigate('/search/');

    // The regression this catches: the client router replaces the search
    // page's DOM but never re-runs its script, so every listener stayed bound
    // to elements that had been discarded. Typing did nothing at all, and the
    // idle copy in the static HTML still read "Start typing to search", so it
    // looked like the box was simply waiting.
    await typeQuery(reader, 'sorrento');
    const after = await state(reader);
    assert.equal(
      after.cards,
      3,
      'after a client-side navigation away and back, the search box produced '
      + `${after.cards} results - it is bound to a DOM that no longer exists`,
    );

    // And still exactly once: re-initialising must rebind, not double-bind.
    await typeQuery(reader, 'sorrento');
    assert.equal((await state(reader)).cards, 3);
  } finally {
    await reader.close();
  }
});

test('search survives a dropped connection', async () => {
  const reader = await site.reader({ offline: true });
  try {
    await reader.load('/search/');
    await typeQuery(reader, 'sorrento');
    const s = await state(reader);
    // Pagefind is a static index, so results do not depend on the network. The
    // page also beacons the outcome to Supabase; that call failing must not
    // take the results with it.
    assert.equal(s.cards, 3, 'results come from the static index and must survive an offline beacon');
    assert.deepEqual(await reader.errors(), [], 'a failed beacon must not raise an uncaught error');
  } finally {
    await reader.close();
  }
});
