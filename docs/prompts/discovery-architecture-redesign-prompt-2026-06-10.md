# Prompt — Discovery Architecture Redesign (Peninsula Insider)

> Date: 2026-06-10
> Purpose: Brief for a deep review and redesign of the site's discovery layer (navigation, Pagefind search, the PI concierge, and the entity index). Improved from an earlier generic draft to match the current reality of peninsulainsider.com.au.

---

I want you to act as a world-class search engineer, AI systems architect, information architect, UX strategist, and conversational AI designer.

You are reviewing and redesigning the **discovery layer of Peninsula Insider** (peninsulainsider.com.au) — an editorial guide to the Mornington Peninsula. It is a magazine with opinions, not a directory: the brand promise is "the friend with better taste", and every discovery decision must serve that.

## Ground truth — what exists today

Do not assume; this is the current state. Verify anything ambiguous in the repo before asserting it, and flag wherever the docs and the code disagree.

**Stack:** Astro 6 static site (repo path `next/`), deployed on Vercel, zero-JS by default with React islands. Content lives as JSON/MDX Astro collections (~144 venues, ~179 journal articles, 37 place hubs, 45 experiences, 6 itineraries, ~50 events, plus fishing/boating/tours verticals). Sanity is a build-time override layer (currently singletons only). Two Supabase projects: an Auth project (`pi` schema — users, saves, CMS layer, search telemetry, entity index) and a separate Concierge project (`concierge_chunks` vector corpus).

**There are already three discovery mechanisms, not two:**

1. **Pagefind 1.3 keyword search** — client-side WASM, index built at deploy time, surfaced at `/search` and via `SearchOverlay.astro` in the masthead. Facet chips are wired via `data-pagefind-filter` annotations (see `BaseLayout.astro`, `search.astro`, place/region templates). Telemetry lands in `pi.site_search_queries`. Sub-100ms, $0/query.
2. **PI, the AI concierge** ("Ask The Insider") — at `/ask` and via `ConciergeDrawer.astro` on every page. Pipeline: intent classification (Haiku) + query embedding (text-embedding-3-small) in parallel → `pi.search()` facet/attribute pre-filter on the entity index → hybrid retrieval over `concierge_chunks` (vector + BM25, RRF merge, Cohere rerank, top 5) → Claude Sonnet answer with structured recommendations and follow-on chips. ~2,000+ chunks across venues, articles, experiences, itineraries, events. Median latency has been ~12s; cost ~$0.02/query; rate-limited 20/hr/session. Telemetry in `concierge_queries` (several fields exist but are unpopulated — gap_detected, refusal_reason, token counts, cost, ttft).
3. **`pi.entity_index` hybrid entity search** — a denormalised entity table with full-text tsvector, 1536-dim pgvector embeddings, PostGIS geography, and a facets JSONB column, plus `pi.entity_attributes` as a normalised facet store. This is already an entity-first retrieval layer; it currently feeds the concierge's pre-filter and the search overlay via the `pi.search()` RPC.

**Navigation IA:** editorial pillars (`/eat/`, `/wine/`, `/stay/`, `/explore/`, `/plans/`, `/whats-on/`, `/journal/`), 37 place hubs under `/places/`, specialist verticals (fishing, boating, tours, dog-friendly, weddings, corporate events), `/map/`, seasonal `/guides/`, and curation surfaces (`/insiders-30/`, `/picks/`, `/awards/`). Places are hubs, not filters.

**The search/concierge split is a deliberate, documented decision** (see `docs/insider-search-scope-2026-05-03.md`): Pagefind for "I know what I want", the concierge for "I don't know what to search for", bridged by a "Didn't find?" fallback that deep-links the failed query into `/ask`. Algolia/Typesense were explicitly rejected. Treat this as the starting position — you may challenge it, but engage with the written reasoning, not a strawman.

## Required reading before you write anything

- `docs/ARCHITECTURE.md` — system and database architecture
- `docs/INFORMATION-ARCHITECTURE.md` — site map, taxonomy, places hierarchy, SEO architecture
- `BRAND-PI.md` — the PI persona and voice rules (the concierge prompt compiles against this)
- `docs/insider-search-scope-2026-05-03.md` — search scope decision and phased build
- `docs/insider-concierge-review-and-roadmap-2026-05-02.md` — concierge state, gaps, roadmap
- `docs/patches/concierge-attribute-aware-retrieval-2026-05-17.md` — attribute-aware retrieval patch
- `docs/peninsula-insider-content-architecture-ia-blueprint-2026-05-10.md` — content architecture blueprint
- `docs/peninsula-insider-seo-and-metadata-operating-model-2026-04-18.md` — SEO/metadata operating model
- `docs/concierge-corpus-cutover-status-2026-04-30.md` — corpus pipeline status

## Hard constraints (non-negotiable)

- **Static-first.** Content pages are prerendered; no client-side CMS fetches on public pages. Pagefind stays free, client-side, and rebuilt on every deploy.
- **PI's voice rules apply to every discovery surface** — no tourism-board adjectives, no chatbot openers, specific over generic, always make a call. PI only recommends from the editorial corpus; no invented venues.
- **No pricing on site, ever.** No dollar figures in answers, structured data, or JSON-LD `Offer`/`priceSpecification` blocks. Enforced by CI lint.
- **The two-Supabase split (Auth vs Concierge) is deliberate** — don't merge them casually.
- **Tiny team.** This is a founder-plus-AI-agents operation (see `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`). Every recommendation must be buildable and maintainable at that scale. Prefer enhancing existing infrastructure over greenfield systems.
- **Budgets.** Concierge target: materially under the current ~12s median latency and ~$0.02/query. Search target: instant and free.

## Your task

Design the optimal intelligence architecture that determines how navigation, Pagefind, the PI concierge, the entity index (`pi.entity_index` / `pi.entity_attributes`), the concierge corpus (`concierge_chunks`), content structure, metadata, and future AI systems work together as one coherent discovery experience.

Assume the long-term vision: Peninsula Insider becomes the **authoritative, AI-native knowledge layer for the Mornington Peninsula** — the source that both readers and AI assistants cite — while remaining an editorial product with taste, not a structured-data directory.

Challenge assumptions. Do not assume readers should navigate, search, or chat — determine the optimal balance and the handoffs between all three for this site's actual audiences.

### 1. Current state review

Analyse navigation, IA, content organisation, metadata quality, internal linking, taxonomy, Pagefind UX, and the concierge UX — grounded in the docs above and the actual telemetry tables (`pi.site_search_queries`, `concierge_queries`). Identify discovery friction, retrieval weaknesses and blind spots, knowledge gaps, journey inefficiencies, and AI retrieval limitations. Where a previously specced phase may or may not have shipped, check the code.

### 2. Pagefind evaluation

Assess index quality, ranking, facet coverage (`data-pagefind-filter` annotations — which templates are tagged, which aren't), metadata indexing, synonym/colloquialism handling (readers search "Sorrento", "long lunch", "rainy day with kids"), zero-result handling, search suggestions, and the overlay-vs-page split. Recommend enhancements that maximise retrieval quality *before* any AI reasoning occurs. Respect the prior decision not to replace Pagefind with hosted search.

### 3. PI concierge evaluation

Determine, with concrete decision rules: what PI should answer directly vs. hand to search results; when PI should summarise vs. recommend vs. deep-link to a hub, place page, map view, or itinerary; when PI should nudge toward the commercial pathways that actually exist here — newsletter signup, Pass membership (Insider/Founders tiers), saved shortlists and the itinerary builder, event alerts, and weddings/corporate-events/partner enquiry forms; and when PI should decline (corpus gap, off-Peninsula, stale event). Address latency, the editorial-tier (A/B) gating, corpus freshness, the rate limiter, and the unpopulated telemetry fields. Design the ideal interaction model between search and conversation, including both directions of the existing "Didn't find?" bridge.

### 4. Discovery architecture

Design the ideal relationship between: Navigation → Pagefind → PI concierge → entity index (`pi.search`) → concierge corpus → content collections → future AI agents. For each layer: what it is responsible for, how information flows, where retrieval vs. reasoning happens, how answers cite canonical pages (every PI recommendation should land the reader on a real page), and how readers move between experiences without dead ends.

### 5. Entity-first architecture

The site already has entity infrastructure. Evaluate evolving it rather than green-fielding: should `pi.entity_index` + `pi.entity_attributes` grow into a proper knowledge graph? The real entity types here are: **venues** (restaurants, wineries, cellar doors, stays), **places** (towns, capes, ridges), **experiences** (walks, beaches, golf, markets, galleries), **events** (calendar + signature annuals), **itineraries**, **articles**, **authors/editors**, **operators** (tours, charters, boat hire), **species** (fishing), and cross-cutting **occasions/lenses** (long lunch, anniversary, rainy day, dog-friendly, group of six). Recommend the entity schema, the relationships worth modelling (venue↔place, venue↔occasion, event↔venue, itinerary↔stops, article↔everything it reviews), retrieval enhancements, and what AI reasoning this unlocks.

### 6. AI-native discoverability

Future readers will increasingly arrive via ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude, and agentic/MCP-connected systems. Building on the existing SEO/metadata operating model, recommend how content, JSON-LD/schema.org (venues, events, articles, FAQs — the `faqItem` Sanity object exists), feeds, an `llms.txt`, and potentially an MCP server over the concierge corpus should be structured to maximise discoverability, citation likelihood, retrieval accuracy, and agent usability — without violating the no-pricing rule or flattening the editorial voice into generic structured data.

### 7. Content optimisation

Identify opportunities in chunking (currently ~5 chunks per venue), content atomisation, canonical answers, FAQ generation, semantic enrichment, topic clustering, and citation readiness — evaluated against both Pagefind and concierge retrieval performance. Use the zero-hit search queries and concierge `gap_detected` signals as the content-gap engine.

### 8. User experience

Design ideal discovery journeys for the audiences this site actually serves: first-time weekend planners, repeat locals, researchers planning a specific occasion (anniversary dinner, group long lunch), wedding and corporate-event planners, niche vertical users (fishing, boating, dog owners), Pass members, and AI-assisted arrivals landing mid-site from an assistant's citation. Recommend search, conversational, and hybrid interfaces, plus recommendation pathways — consistent with the masthead/drawer patterns and the mobile "pocket concierge" app direction.

### 9. Analytics and learning

Design a unified measurement framework across `pi.site_search_queries` and `concierge_queries`: search success and abandonment, AI resolution rate, retrieval quality, zero-hit and gap detection, reader satisfaction, and contribution to newsletter/Pass/partner conversions. Specify which dormant telemetry fields to populate first and how the daily usage report and content-brief loop should consume them.

### 10. Roadmap

Present recommendations as:

- **Phase 1 — Quick wins (30 days)**
- **Phase 2 — Strategic enhancements (90 days)**
- **Phase 3 — AI-native knowledge platform (12 months)**

For every recommendation: reader value, business value, technical complexity, estimated impact, priority — and whether it builds on existing infrastructure or introduces something new (justify anything new against the tiny-team constraint).

## Output

A single blueprint document that reads as the plan for evolving Peninsula Insider from an editorial website with good search into the intelligent, citable knowledge layer for the Mornington Peninsula — powered by Pagefind, the PI concierge, the entity index, structured content, and future AI retrieval systems, without ever losing the voice of the friend with better taste.
