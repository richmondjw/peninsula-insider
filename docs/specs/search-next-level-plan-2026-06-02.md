# Peninsula Insider Search Next-Level Plan

Date: 2026-06-02  
Status: Kicked off  
Owner surface: `/search/`, masthead search overlay, `pi.search`, `pi.entity_index`, PageFind fallback

## Why This Exists

The June 2026 search incident showed that a fresh PageFind index is not enough.
The visible search page prefers the Supabase `pi.search` RPC, and stale or
unrouteable rows in `pi.entity_index` can surface broken links even when
PageFind is correct.

The next version of search should behave less like a flat index and more like
an editorial concierge: route-safe, grouped by intent, boosted by editorial
judgement, and resilient when content structure changes.

## North Star

Search results should be served from one validated canonical corpus. PageFind
can remain the static fallback and Supabase can remain the live hybrid engine,
but both must be downstream of the same route-safe understanding of what exists
on the site.

For a query like `red hill`, the user should not receive a random mixed list.
They should receive an editorially shaped result set:

- Red Hill place hub first.
- Then grouped sections for Wine, Eat & Drink, Stay, Explore, What's On, and
  Journal.
- Current and routeable entries only.
- Closed, deprecated, duplicate, or non-detail records suppressed unless the
  result deliberately routes to a live guide or hub.

## Phase 0 - Immediate Guardrail

Completed / in progress:

- `refresh-entity-index.mjs --apply --prune` removes DB rows that no longer
  exist in the source projection.
- Venue projection now excludes records that do not have generated detail
  pages.
- `SUPABASE_SERVICE_KEY` was updated in GitHub so data refresh can write to the
  active PI Supabase project.

Next guardrail:

- Add a search-link audit that queries live `pi.search` for representative
  terms and verifies top result links resolve.
- Run it after the daily `PI data refresh` workflow.
- Fail the workflow if live search returns broken links.

## Phase 1 - Canonical Corpus Contract

Every searchable item must have one canonical registry row with:

- `entity_type`
- `entity_slug`
- canonical `href`
- `title`
- `dek`
- body/search text
- place, region, estate, zone
- facets: theme, mood, season, audience, price band where appropriate
- `status`
- `is_routeable`
- `canonical_section`
- `search_boost`
- `hero_image`
- `refreshed_at`

Rules:

- Search must not infer URLs at render time.
- Search must not include entities that cannot resolve to a live route.
- Search may include non-detail records only when their canonical `href` points
  to a live hub, collection, or editorial guide.
- Stale rows are pruned during every data refresh.

## Phase 2 - Ranking Model

Ranking should combine:

- Exact title and slug match.
- Place/region match.
- Lexical score.
- Semantic/vector score.
- Facet match.
- Editorial boost.
- Freshness/current-event boost.
- Route confidence.

Editorial defaults:

- Broad place queries should prioritise place hubs and area guides.
- Planning queries should prioritise itineraries and Journal guides.
- Venue-exact queries should prioritise the venue detail page.
- Event queries should prioritise current and upcoming events.
- Closed or expired records should not surface as direct search hits.

## Phase 3 - Intent-Shaped Results UI

The `/search/` page should classify the query into an intent bucket:

- Place: `red hill`, `sorrento`, `flinders`
- Venue: `jackalope`, `montalto`
- Planning: `weekend in red hill`, `rainy day`, `with kids`
- Event: `market`, `winter wine`, `this weekend`
- Need-state: `dog friendly`, `long lunch`, `hot springs`

The result page should render groups rather than a single flat feed:

- Top answer
- Places / Regions
- Eat & Drink
- Wine
- Stay
- Explore
- What's On
- Journal / Guides

This is the major user-visible leap: search becomes a structured editorial
navigation surface.

## Phase 4 - Refinement Controls

Add query-aware chips:

- Wineries
- Lunch
- Stays
- This weekend
- With kids
- Dog friendly
- Rainy day
- Walks
- Hot springs

Chips should apply structured filters to the current query rather than merely
append text.

## Phase 5 - Observability

Track:

- top zero-result queries
- top clicked results
- broken-link audit failures
- result group distribution
- result click position
- fallback path used: RPC or PageFind
- slow RPC responses

Daily jobs:

- data refresh
- entity prune
- search-link audit
- query analytics report

Weekly review:

- promote recurring high-value queries into editorial boost rules or new hub
  pages.

## First Implementation Slice

1. Add live search-link audit.
2. Run audit after `PI data refresh`.
3. Add canonical routeability fields to `entity_index` projection.
4. Add a small ranking profile layer in the client or RPC result shaping.
5. Prototype grouped `/search/` rendering for `red hill`, `sorrento`, `dog
   friendly`, and `winter wine`.

## Acceptance Criteria

- Representative live queries return no broken links in top results.
- `/search/?q=red%20hill` surfaces Red Hill place/guide content before arbitrary
  Red Hill mentions.
- Broad queries render grouped results.
- PageFind remains available as a fallback.
- Daily data refresh fails loudly if live search starts serving broken links.

