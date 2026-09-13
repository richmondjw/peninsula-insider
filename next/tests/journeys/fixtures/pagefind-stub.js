/**
 * Stub for /pagefind/pagefind.js, served by the journey harness in place of
 * the generated index.
 *
 * The search page imports this module dynamically and calls `options()` then
 * `search()`. Only that surface is implemented. Serving a fixture rather than
 * the real index buys three things the real index cannot give:
 *
 *   - a zero-result query that stays zero-result as the corpus changes, so the
 *     empty state is testable and stays testable;
 *   - a query that makes search throw, so the failed-lookup state is
 *     reachable without unplugging anything;
 *   - a CI run that does not have to build a Pagefind index first.
 *
 * The page's own rendering, listener wiring, pagination and analytics are the
 * real built code either way - this only decides what comes back.
 *
 * Query contract (the tests use these, nothing else is special):
 *   "sorrento"  -> 3 results
 *   "boom"      -> throws, exercising the search-error branch
 *   anything else -> 0 results
 */

const RESULTS = {
  sorrento: [
    {
      url: '/eat/sorrento-fixture-one/',
      meta: { title: 'Fixture One, Sorrento', image: '', kind: 'Eat' },
      excerpt: 'A fixture result used by the PI-012 journey harness.',
      entity_type: 'venue',
      entity_slug: 'sorrento-fixture-one',
    },
    {
      url: '/stay/sorrento-fixture-two/',
      meta: { title: 'Fixture Two, Sorrento', image: '', kind: 'Stay' },
      excerpt: 'A second fixture result used by the PI-012 journey harness.',
      entity_type: 'venue',
      entity_slug: 'sorrento-fixture-two',
    },
    {
      url: '/journal/sorrento-fixture-three/',
      meta: { title: 'Fixture Three, Sorrento', image: '', kind: 'Journal' },
      excerpt: 'A third fixture result used by the PI-012 journey harness.',
      entity_type: 'article',
      entity_slug: 'sorrento-fixture-three',
    },
  ],
};

export async function options() {
  return undefined;
}

export async function search(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q === 'boom') throw new Error('pagefind-stub: deliberate search failure');
  const hits = RESULTS[q] || [];
  return {
    results: hits.map((data, i) => ({
      id: `stub-${q}-${i}`,
      data: async () => data,
    })),
    unfilteredResultCount: hits.length,
    filters: {},
    totalFilters: {},
    timings: [],
  };
}

export async function debouncedSearch(query) {
  return search(query);
}

export default { options, search, debouncedSearch };
