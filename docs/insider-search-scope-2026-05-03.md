# Site Search — Scope and Recommendations

**Date:** 3 May 2026
**Author:** Remy
**Trigger:** James saw Destination Vancouver's pattern (header pill → full-width search bar → faceted card results → "didn't find?" AI concierge fallback) and wants the same for Peninsula Insider.

---

## TL;DR

Peninsula Insider already has the search engine wired (Pagefind 1.3, runs at build time, lives at `pagefind/` on the live site). What's missing is the design treatment around it: a header pill, a polished results page with images and tag chips, a "Didn't find?" concierge fallback, and a few nice-to-haves like instant search in a modal.

**This is a 3-5 day UI build, not a from-scratch search engine project.** Existing Pagefind index covers all rendered HTML; we just need to dress it.

**Recommendation: don't reuse the concierge engine for search.** Pagefind for search (instant, free, keyword-perfect), the concierge for the "didn't find?" fallback (semantic, conversational). They complement each other; using one for both compromises both.

---

## What's already there

```
peninsula-insider repo
├── next/package.json
│   └── "build:search": "astro build && npx pagefind --site dist"   ← already runs
├── next/src/pages/search.astro                                      ← basic /search page
└── pagefind/                                                        ← built index (lives on live site)
    ├── pagefind.js
    ├── pagefind-ui.js
    ├── fragment/
    └── index/
```

The current `/search` page works — type a query, get text-only results listed by URL. What it's missing:

- Header search pill / opening interaction
- Card-style results with hero images, eyebrow, title, dek
- Tag-filter chips (All / Eat / Stay / Wine / Explore / Escape / What's On / Journal)
- Pagination
- Mobile overlay UX
- "Didn't find what you were looking for?" concierge fallback block
- Telemetry on what readers search for

---

## Why not reuse the concierge engine for search

You asked the right question. Here's the honest answer.

The concierge stack (pgvector + BM25 + RRF + Cohere rerank + Sonnet 4.5) is built for **semantic understanding** — "rainy day with two kids" works because the LLM reads vibes, not keywords. Search is the opposite need: a reader types "Sorrento" or "long lunch" and wants the page that matches that exact phrase, instantly.

Concrete reasons not to reuse:

| Need | Search reality | Concierge reality |
|---|---|---|
| Latency | Sub-100ms expected (instant typing) | ~17s end-to-end |
| Cost | $0 / query (Pagefind, all client-side) | ~$0.02 / query (Cohere + LLM) |
| Granularity | One result = one PAGE | One result = one CHUNK (we'd need dedupe-by-page) |
| Offline | Works (static index) | Fails (requires API + LLM provider) |
| Network | Zero round-trips after page load | 4-5 round-trips per query |
| Keyword precision | BM25-strong, "Sorrento" finds the Sorrento page | Semantic-strong, may surface adjacent pages |

**What we DO reuse from the concierge:**

1. The "Didn't find what you were looking for?" block at the bottom of the search results page — a small embedded concierge that fires the user's failed search through `/concierge/ask/stream`. Pure UX bridge: search couldn't help, so let the AI try.
2. The telemetry pattern. We'll add a `search_queries` table mirroring `concierge_queries` so the daily report has both.
3. The masthead drawer pattern for the optional "instant search" overlay if we go that route.

This is exactly Destination Vancouver's split: keyword search + AI concierge, side by side, each doing what it's best at.

---

## What we'll build

### Phase 1 — Polished search results (1-1.5 days)

Replace the current `/search` page with a Destination-Vancouver-style design:

- **Hero band** with the search input centred, full-width, prominent
- **Tag-filter chips** above results: `All · Eat · Stay · Wine · Explore · Escape · What's On · Journal · Places`
- **Result cards** with hero image, type eyebrow ("LISTING" / "BLOG" / "ESCAPE"), title, dek
- **Pagination** (10-12 cards per page, "1 2 3 ... 18" footer)
- **Empty state**: friendly copy + suggested chips ("try: Red Hill, long lunch, family beach")
- **Pagefind filters wired** to the chip row via `data-pagefind-filter` annotations on page templates

### Phase 2 — Header pill + entry points (half day)

Add a search pill to `Masthead.astro` next to "Subscribe" (and next to the existing "Ask The Insider" drawer trigger). Click → navigate to `/search`, with optional `?q=...` deep-link support.

If we want a Destination Vancouver-style **instant search overlay** (search bar drops down from header on click, results stream as you type, hit Enter to go to full /search page), that's another half day. I'd recommend YES — it's the modern pattern and Pagefind is fast enough that the typing experience is delightful.

### Phase 3 — "Didn't find?" concierge fallback (half day)

Below the results (or replacing them when zero results):

```
Didn't find what you were looking for?
[ Ask The Insider                 ▶ ]
                                  ↑
                                  Reuses the concierge drawer's
                                  /ask/stream call, prefilled with
                                  the reader's failed search query.
```

This bridges the two layers naturally. Reader's search didn't hit; the concierge gets a shot.

### Phase 4 — Filter facets at index time (half day)

Pagefind needs each indexed page tagged so chip filters work. Add `data-pagefind-filter` attributes to layout templates:

```html
<!-- in venue/[slug].astro layout -->
<article data-pagefind-filter="kind:Eat" data-pagefind-filter="region:Red Hill">
```

One pass through the page templates; Pagefind picks the values up automatically on the next `npm run build:search`. Six page templates need touching:
- `venue/[slug].astro` → `kind: Eat | Stay | Wine | Spa` (derived from venue type)
- `experience/[slug].astro` → `kind: Explore`
- `itinerary/[slug].astro` → `kind: Escape`
- `event/[slug].astro` → `kind: What's On`
- `place/[slug].astro` → `kind: Places`
- `articles/[slug].astro` → `kind: Journal` + `format` (long-lunch-list, weekend-picker, etc.)

### Phase 5 — Search telemetry (half day)

New Supabase table `search_queries` modelled on `concierge_queries`:
- `query_id, session_id, query_text, result_count, top_hit_url, latency_ms, current_page, timestamp`

Logged from `/search` via a tiny POST to `/concierge/log-search` (or a new `/search/log` endpoint on the platform-api). Fire-and-forget. Costs ~5ms per query.

The daily usage report (`ops/scripts/insider-usage-report.mjs`) extends to include search alongside concierge — same Telegram digest, more complete picture of reader intent.

### Phase 6 — Mobile, a11y, polish (half day)

- Keyboard shortcut `/` to focus search (industry norm)
- Escape to close overlay
- Skip link from `<nav>` to `<main>` for screen readers
- ARIA labels and `aria-live` on results region
- Mobile: search pill in masthead → full-screen overlay → instant results

### Phase 7 — Telemetry-driven content briefs (later, half day)

When a reader searches for something with **zero hits**, that's a content opportunity. Surface zero-hit queries in the daily report as a "content gap" section. Same pattern we already have for concierge `gap_detected` queries.

---

## Architecture

```
                   ┌─────────────────────────────────────────┐
                   │  Reader on peninsulainsider.com.au       │
                   └────────────┬────────────────────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  Header pill: 🔍 Search    │
                  └─────────────┬──────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  /search page                       │
              │                                     │
              │  ┌──────────────────────────────┐   │
              │  │  Pagefind (client-side WASM) │   │  ← all in browser, ~10-50ms
              │  │  reads /pagefind/index/*     │   │
              │  └──────────────────────────────┘   │
              │                                     │
              │  Results → cards (image, title…)   │
              │                                     │
              │  ┌──────────────────────────────┐   │
              │  │ Didn't find?                 │   │
              │  │ [Ask The Insider ▶]          │   │  ← single click fires
              │  └──────────────────────────────┘   │     /concierge/ask/stream
              │                  │                  │     with the failed query
              └──────────────────┼──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  POST /search/log → Supabase        │  ← fire-and-forget telemetry
              │       search_queries table          │
              └─────────────────────────────────────┘
```

Pagefind index builds with the rest of the site via `npm run build:search`. Zero ongoing maintenance — every deploy refreshes the index.

---

## Effort estimate

| Phase | What | Days |
|---|---|---:|
| 1 | Polished `/search` page with cards, chips, pagination | 1 - 1.5 |
| 2 | Header pill + optional instant overlay | 0.5 - 1 |
| 3 | "Didn't find?" concierge fallback block | 0.5 |
| 4 | `data-pagefind-filter` annotations on 6 templates | 0.5 |
| 5 | `search_queries` telemetry + daily report extension | 0.5 |
| 6 | Mobile, a11y, polish | 0.5 |
| 7 | Zero-hit content-brief surfacing (deferred) | 0.5 |
| **Total** | | **3.5 - 5** |

I'd ship phases 1-4 in the first week (search visible, working, on-brand), 5-6 in the second week (telemetry + mobile polish), 7 once we have a few weeks of data.

---

## Open decisions for you

1. **Instant overlay vs full page?** Destination Vancouver does both: pill in nav drops a small overlay with instant results, hitting Enter goes to the full results page. I'd build both — minor extra effort, big UX win. **Default: yes, build both.**

2. **Tag chips: just kind, or also place / occasion?** Destination Vancouver uses page-type chips. Adding region (Red Hill / Sorrento / Flinders) or occasion (Long Lunch / Rainy Day / Weekend) chips would be useful for the Peninsula reader who often searches by place or occasion. **Default recommendation: kind chips only in Phase 1; add region chips in Phase 2 once we see what people actually search for in telemetry.**

3. **"Didn't find?" copy and CTA.** Destination Vancouver uses a stock phrase with a giant chat box. We could make it more on-brand: "The Insider can take a guess" or "Ask The Insider directly". **Default: short, direct, links to a /ask?q=<query> deep-link that pre-fills the concierge.**

4. **Show search in the masthead at all times, or only on certain pages?** Destination Vancouver shows it everywhere. **Default: everywhere. The reason readers don't search is that they don't think to; making it visible changes that.**

5. **Index editorial blocks?** Currently we have 10 hub-intro markdown files that reflect copy already on hub pages. Indexing them risks duplicate results. **Default: no, don't index editorial_blocks.**

6. **Index quick-notes?** They're time-bounded and expire. **Default: yes for non-expired, with a freshness chip so the reader can filter to "fresh this week".**

---

## What lands first if you green-light

Two independently useful PRs:

**PR A — Polished /search results + pill in masthead** (1.5-2 days)
- Replaces `next/src/pages/search.astro` with a Destination-Vancouver-style page
- Adds a search pill to `Masthead.astro` next to Subscribe / Ask The Insider
- Adds tag-filter chips wired to Pagefind
- Adds pagination
- Wires the "Didn't find?" block to fire the concierge

**PR B — Search telemetry + daily report extension** (half day)
- Adds `/search/log` endpoint to platform-api
- Creates `search_queries` table
- Extends `insider-usage-report.mjs` to summarise search alongside concierge

Both can ship in week 1 if you want me to push.

---

## What I'd avoid

- **Switching to Algolia or Typesense.** Pagefind is free, fast, static, on-brand for a content-led product, and already in the build. Don't add infra cost for a need that's covered.
- **Using the concierge stack as the primary search engine.** Wrong tool, wrong cost, wrong UX rhythm. The concierge is a bridge for "I don't know what to search for"; search is for "I know exactly what I want".
- **Server-side search rendering for SEO.** Pagefind is client-only, but search results pages don't need to be indexed by Google (canonical pages already are). Mark `/search` `noindex`.
- **Building "save searches" / "saved trip" features in the same surface.** Those are concierge-side products. Keep search lean and fast.

---

## Recommended decision

Green-light PR A (polished search + masthead pill + concierge fallback) for this week. PR B (telemetry) for the following week. Phase 7 (zero-hit content briefs) once we have a month of data.

Total visible-in-product time: 3-5 days of focused work over 1-2 weeks.

If you say go, I'll start with PR A.
