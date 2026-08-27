# Peninsula Insider — AI-Agent Readiness Review

**Date:** 10 June 2026
**Author:** Claude (remote agent), commissioned by James Richmond
**Scope:** How the site reads, retrieves, cites, and acts when the visitor is not a human but an AI system: ChatGPT, Claude, Perplexity, Gemini, AI search crawlers, autonomous research agents, and future buyer-side assistants planning a Peninsula trip on someone's behalf.
**Status:** Assessment + roadmap. The single highest-leverage quick win (llms.txt) ships alongside this document.

---

## 1. Strategic diagnosis

**Peninsula Insider is unusually AI-ready at the content layer and almost entirely absent at the access layer.**

The audit found a site that most publishers would envy as an AI substrate:

- **Fully static, pre-rendered HTML.** Every venue, place, article, and event renders complete content without JavaScript. Crawlers and LLM fetchers see everything a human sees.
- **Deep schema.org coverage already live.** `NewsMediaOrganization`, `WebSite` + `SearchAction`, `Article`, `FAQPage`, `BreadcrumbList`, `Restaurant`/`LodgingBusiness`/`Winery`, `Event`, `ItemList`, `TouristDestination`, `Tour`, with geo coordinates, on 200+ page templates (`next/src/layouts/BaseLayout.astro`, venue/place/journal slug templates).
- **A genuinely rich entity model.** 311 content files across 24 collections; venues carry coordinates, address, type, `knownFor`, `signature`, `bestFor`, `editorNote`, booking URLs, dog-friendly flags; events carry `verificationStatus` and `lastCheckedDate`; places carry `tldr`, drive times, and seasonal guidance.
- **A trust architecture most local guides never build:** `/editorial-approach/`, `/ethics/`, `/corrections/`, `/complaints/`, `/methodology/`, an A–Z `/site-index/`, sitemap with priority tiers, RSS feed.
- **A working retrieval product of its own:** Ask PI, a hybrid-retrieval (vector + BM25 + RRF + Cohere rerank) concierge over a 2,000+ chunk editorial corpus.

What is missing is everything that turns that substrate into something **agents can discover, address, verify, and act through**:

1. **No `llms.txt`.** An AI assistant landing on the domain has no curated map of what this publication is, what it covers, how to cite it, or where the canonical answers live.
2. **No machine endpoints.** The content is JSON-first in the repo (`next/src/content/`) but is published only as HTML. Agents must scrape what we already hold as structured data.
3. **Ask PI is browser-only.** The best retrieval interface to the editorial corpus is invisible to external agents: no CORS, no docs, no key model. The site's biggest AI asset is sealed inside a chat widget.
4. **Authority is implicit, not machine-legible.** The Organization schema has no `sameAs` links, no founder/people entities, and the `authors` collection has one entry. Event verification dates exist in frontmatter but are not consistently surfaced in rendered HTML or schema. AI systems weighting E-E-A-T have little to anchor on.
5. **The feed is thin.** `feed.xml` carries ~86 items with title + short description only: no full content, no categories, no per-item authors. Low-fidelity for agent ingestion and for LLM training/citation pipelines that prefer feeds.

**The framing that should drive the next two quarters:** Peninsula Insider's moat against generic AI answers is not coverage (any LLM can list Peninsula wineries) but *verified, opinionated, current* editorial judgement: the table to ask for, the season that's actually good, the venue that closed last month. AI agents will only carry that judgement to users if the site makes it (a) easy to retrieve, (b) easy to attribute, and (c) verifiably fresh. Every recommendation below serves one of those three.

**One honest tension to flag, not relitigate:** the house rule "No pricing on site. Ever" (BRAND-PI.md, enforced by `next/scripts/lint-no-pricing.mjs`) means AI agents answering "how much is a long lunch at X" will source price claims from competitors, aggregators, or stale training data, and may attach them to our citation. The rule's rationale (stale prices erode trust faster than missing prices) is sound and this review does not propose breaking it. The compensating moves are: state the policy explicitly in `llms.txt` so agents understand the omission is deliberate and route users to operator links for current prices; and keep `bookingUrl` coverage on venues as complete as possible so agents have a "check current price here" action.

---

## 2. The biggest missed opportunities

Ranked by impact relative to effort.

1. **No `llms.txt`.** ~1 hour of work; affects every LLM-with-browsing interaction with the domain. Shipped with this review (`next/public/llms.txt` + root copy).
2. **Ask PI as an agent-facing API / MCP server.** The concierge pipeline is exactly what a buyer-side agent needs ("find me a dog-friendly winery lunch for six on Saturday") and it already exists. Documenting the endpoint, enabling CORS with an API key, and wrapping it as an MCP server would make Peninsula Insider one of the first regional publications agents can *call* rather than merely scrape. This converts the corpus from a cost centre into distribution.
3. **Publishing the structured content we already maintain.** Build-time JSON exports (per-entity `.json` alongside each page, or a `/data/` index) cost little in a static Astro build and remove the scraping tax entirely. The CMS registry (`scripts/refresh-content-registry.mjs`) already enumerates every entity.
4. **Surfacing freshness.** `lastCheckedDate` / `verificationStatus` on events and editorial review dates on venues are the single strongest citation-worthiness signal a local guide can emit ("verified 3 weeks ago" beats every competitor page that says nothing). Today these live in frontmatter and barely reach the rendered page or schema.
5. **Entity consolidation for E-E-A-T.** `/about/`, `/methodology/`, `/editorial-approach/` overlap (already flagged in `docs/ecosystem-review-2026-05-16.md`); the Organization node lacks `sameAs` (social profiles, LinkedIn, Google Business Profile); authors are anonymous. Knowledge-graph construction in AI search engines keys on exactly these signals.
6. **Comparison content.** The ecosystem review endorsed CompareBlocks; AI buyers' most common query shape is comparative ("X vs Y", "best winery for Z"). Structured comparison pages with HTML tables are highly extractable and almost nobody in the region publishes them.

---

## 3. Recommended AI-agent-ready site architecture

The existing IA (`docs/INFORMATION-ARCHITECTURE.md`) is sound and should not be restructured for agents. Agents reward the same things the current IA already does: stable canonical URLs, places-as-hubs, one entity per page. The architecture work is **additive layers**, not a rebuild:

```
peninsulainsider.com.au/
│
├── HUMAN LAYER (existing — unchanged)
│   pillars, places, venues, journal, whats-on, plans, trust pages
│
├── DISCOVERY LAYER (extend)
│   ├── /llms.txt                 Curated LLM map of the site        [NEW — shipped]
│   ├── /llms-full.txt            Expanded version w/ per-section detail [later]
│   ├── /robots.txt               Explicit AI-crawler welcome + llms.txt pointer [updated]
│   ├── /sitemap.xml              (existing) consider <lastmod> accuracy audit
│   ├── /feed.xml                 Enrich: full content, categories, authors
│   └── /site-index/              (existing — already excellent for agents)
│
├── DATA LAYER (new, build-time, static)
│   ├── /data/venues.json         All venues, public fields only (no priceBand)
│   ├── /data/places.json         Places + geo + tldr
│   ├── /data/events.json         Current events + verification dates
│   ├── /data/index.json          Entity registry: type, slug, canonical URL, lastmod
│   └── /eat/[slug]/index.json    (optional) per-entity JSON next to each page
│
├── ANSWER LAYER (extend)
│   ├── /ask/                     (existing UI)
│   ├── POST /concierge/ask       Documented, CORS-enabled, keyed   [API repo]
│   ├── /docs/api/ or /for-agents/  Human+agent-readable API docs page
│   └── MCP server                pi-concierge: search, recommend, itinerary tools
│
└── TRUST LAYER (consolidate + enrich)
    ├── /editorial-approach/      Canonical (redirect /about + /methodology into it,
    │                             or repurpose /about per ecosystem review)
    ├── /journal/authors → people Author entity pages w/ Person schema
    └── Per-page "Last reviewed"  Rendered + in schema (dateModified, reviewedBy)
```

Principles:

- **One canonical answer per question.** Agents quote the first clean answer they find. Every high-intent query ("best restaurants", "is it dog friendly", "what's on this weekend") should have exactly one page that opens with a direct, extractable answer in the first 150 words: the existing SERP-snippet work (HANDOVER-CLAUDE.md §4A) is the same work; finish it.
- **Stable URLs as API.** `/whats-on/this-weekend/` as a rolling stable URL is exactly right; agents learn and reuse it. Apply the pattern: `/guides/[season]/` always-current, `/picks/` always-current.
- **The site stays static.** Every addition above is compatible with the static-only constraint; the only server-side piece is the concierge API, which already lives in the separate Vercel platform repo.

---

## 4. Priority content additions

Content that would let an AI agent answer buyer questions accurately, which today it cannot:

1. **A "What is Peninsula Insider" canonical block.** One paragraph, factual register, on `/editorial-approach/` and mirrored in `llms.txt`: who publishes it, since when, coverage area, what makes it credible (independence, no pay-for-coverage, verification cadence), how to cite it. Today this is spread across manifesto-style prose that LLMs paraphrase loosely.
2. **Practical logistics agents constantly need and the site under-serves:** getting there without a car, EV charging, accessibility per venue (the `accessibilityNotes` field exists on events; venues need it), wet-weather contingency mapping, public toilets/parking for beach towns, seasonal closure patterns. `/explore/getting-here/` exists; the gap is per-venue and per-place practical fields rendered consistently.
3. **Comparison pages.** Start with the highest-traffic decisions: Hot springs A vs B; the three big cellar-door lunches compared; Sorrento vs Flinders for a weekend base; Portsea vs Sorrento beaches. HTML tables with consistent axes (booking required, group size, kids, dogs, season, time needed). No prices: use the comparison axes the brand permits.
4. **A glossary / "Peninsula 101" page.** Defines the entities agents trip over: front beach vs back beach, the zones (bayside, Western Port, hinterland), "cellar door", hatted, the place-name disambiguations (Rye front vs back, Red Hill vs Red Hill South). Glossaries are disproportionately cited by LLMs because they are definitional.
5. **FAQ blocks on the top 10 town hubs and pillar hubs** (already queued in HANDOVER-CLAUDE.md): each Q phrased the way a user asks an assistant, each A self-contained in 2–3 sentences, marked up as `FAQPage`.
6. **Author/people pages.** Even pseudonymous mastheads ("The Editor", "The Critic", PI) can carry Person-like entity pages explaining who reviews what and how often: this is the E-E-A-T anchor.
7. **"Last reviewed" surfaced everywhere.** A one-line render on venue pages ("Editor last visited autumn 2026 · details checked 14 May 2026") backed by `dateModified` in schema. This is the citation-clincher for AI search engines ranking conflicting sources.

---

## 5. Technical and schema recommendations

### Shipped with this review
- **`llms.txt`** at `next/public/llms.txt` (and copied to the deployed root). Curated map: identity block, citation guidance, the no-pricing policy stated for agents, canonical hubs, best-of pages, places, trust pages, concierge.
- **`robots.txt`**: comment block welcoming AI crawlers and pointing at `llms.txt`. Note: deliberately did **not** add named `User-agent: GPTBot`-style groups, because a named group *overrides* the `*` group and would silently drop the existing `/next/`, `/preview/` disallows for those bots. If per-bot rules are ever wanted, each named group must repeat all disallows.

### Schema upgrades (in order)
1. **Organization enrichment** (`BaseLayout.astro`): add `sameAs` (Instagram, Facebook, LinkedIn channel IDs already exist in ops docs), `foundingDate`, `logo`, `contactPoint` (hello@/corrections@ with `contactType`), and `parentOrganization`/`founder` if appropriate.
2. **`dateModified` + review dates** on venue and place schema; `Event` schema should carry the verification story (at minimum accurate `validFrom`/`dateModified`).
3. **`speakable`** on direct-answer intros of the top 20 SEO pages.
4. **`ItemList` with `position` + nested entity references** on every best-of page (some exist; make it uniform), so list pages are extractable as ranked recommendations with attribution.
5. **`Person` schema** on author pages; `author` on Article schema pointing at those entities rather than a bare string.
6. **`potentialAction`** beyond the existing `SearchAction`: `ReserveAction` pointing at the venue's `bookingUrl` on venue pages (this is the schema-legal way to say "book direct with the operator", consistent with the no-pricing rule).
7. **Audit the existing JSON-LD with Google's Rich Results + Schema.org validators in CI** (a small `lint-schema.mjs` in the same spirit as `lint-no-pricing.mjs`), so schema doesn't rot.

### Machine-readable surfaces
8. **Build-time JSON exports** (`/data/*.json` as in §3). Strip internal-only fields (`priceBand`, `sitemapExclude`, editorial workflow fields) at export: extend `lint-no-pricing.mjs` coverage to the export script.
9. **Enrich `feed.xml`**: full `content:encoded` HTML, `category` per item, `dc:creator`, and consider a second feed scoped to What's On.
10. **`lastmod` accuracy audit** in sitemap.xml: agents and crawlers use it to decide refetch cadence; inaccurate lastmod trains them to ignore it.

### Concierge / API
11. **Document `POST /concierge/ask` (+ stream)** in a public page; add CORS with a free-tier API key; populate the dormant telemetry fields (`gap_detected`, cost, ttft) so external usage is observable (these are already-identified quick wins in `docs/insider-concierge-review-and-roadmap-2026-05-02.md`).
12. **Citations in concierge responses**: the pipeline holds `chunk_ids`; have the model return source slugs and render "From PI's review of X, May 2026". Required for trust in the web UI and non-negotiable for an agent-facing API.
13. **MCP server (`pi-concierge`)** wrapping three tools: `search_peninsula(query, filters)`, `recommend(brief)`, `get_entity(slug)`. This is the 90-day flagship: it makes PI installable inside Claude, ChatGPT (via connectors), and agent frameworks.

---

## 6. Search and conversational UX improvements

**Pagefind (`/search/`):**
- Add more `data-pagefind-meta`: place, venue type, season tags: so filters go beyond the current `kind` facet (Eat/Stay/Wine/…). The frontmatter already has the fields.
- Add `data-pagefind-meta="verdict"` carrying the one-line editorial verdict so search results show a *call*, not a truncated intro: this is the PI difference rendered in the result list.
- Ensure best-of and comparison pages rank for their head terms in Pagefind (Pagefind weights `<h1>`/headings: keep the direct-answer phrasing in headings).
- Keep `/search/` `noindex` (it is) but make sure the *query* pattern `/search/?q=` is documented in llms.txt so agents can deep-link users into it.

**Ask PI:**
- **Latency:** switch the `/ask` front end to the existing SSE streaming endpoint (12s median silent wait is fatal for both humans and agents; the endpoint already exists per the May roadmap).
- **Citations rendered** (see §5.12): lifts human trust and makes transcript content quotable.
- **Render all corpus types as tiles** (places, itineraries, events, experiences: currently venues/articles only), so the answer's actionability matches its grounding.
- **Capture-the-handoff:** every PI answer should end with durable artefacts: a shareable `/plan/?p=` link, save-to-itinerary, "email me this". Agents acting for users need URLs they can return; ephemeral chat text is a dead end.
- **Entry points:** the May review found test traffic dominating real usage. The mega-nav "Ask PI →" footer exists; add Ask PI as a first-class result row in the Pagefind overlay ("No good match? Ask PI") to convert failed searches.
- **Conversational avatar:** defer. The PI character is strongest as text + the silhouette mark; an avatar adds latency and cost without improving answer quality, and the brand doc's "the mystery is the point" argues against a face.

---

## 7. 30 / 60 / 90 day roadmap

### Days 0–30 — Make the site legible and citable (static-only, low risk)
| # | Item | Where |
|---|------|-------|
| 1 | `llms.txt` live | shipped in this PR |
| 2 | robots.txt AI-welcome comment | shipped in this PR |
| 3 | Organization schema: `sameAs`, `contactPoint`, `logo`, `foundingDate` | `BaseLayout.astro` |
| 4 | Consolidate `/about` + `/methodology` → `/editorial-approach/` (redirects), add the canonical "What is PI" block | per ecosystem review |
| 5 | Render "last reviewed/verified" lines on venue + event pages; `dateModified` in schema | venue/event templates |
| 6 | Enrich `feed.xml` (full content, categories, authors) | feed generator |
| 7 | Finish FAQ blocks + direct-answer intros on top 10 pages (existing queue) | HANDOVER §4A |
| 8 | Schema validation script in CI | `next/scripts/` |

### Days 31–60 — Publish the data, sharpen the answers
| # | Item |
|---|------|
| 9 | Build-time `/data/*.json` exports + entity registry index (pricing-stripped) |
| 10 | First 5 comparison pages with HTML tables; `ItemList` uniformity on best-of pages |
| 11 | Glossary / Peninsula 101 page |
| 12 | Author/masthead entity pages with `Person` schema |
| 13 | Pagefind: richer meta (place, type, verdict), Ask-PI fallback row in search overlay |
| 14 | Ask PI front end → streaming endpoint; citations in responses; all corpus types as tiles |

### Days 61–90 — Open the answer layer to agents
| # | Item |
|---|------|
| 15 | Public concierge API: docs page, CORS, keyed free tier, rate limiting moved out of process memory (existing roadmap item) |
| 16 | MCP server (`pi-concierge`) with search/recommend/get_entity tools |
| 17 | `ReserveAction`/`potentialAction` markup on venue pages; agent-friendly handoff links audit (bookingUrl coverage) |
| 18 | AI-referral analytics: segment ChatGPT/Perplexity/Claude/Gemini referrers and concierge API usage into the daily ops report |
| 19 | Retrieval eval harness (existing roadmap item F) so corpus/prompt changes are measurable before agents depend on them |
| 20 | `llms-full.txt` generated at build from the entity registry |

### Quick wins vs larger rebuild items

**Quick wins (days-to-a-week each, static, no architecture change):**
llms.txt (done) · robots comment (done) · Organization `sameAs`/contactPoint · about/methodology consolidation · last-reviewed rendering · feed enrichment · FAQ/direct-answer pass · schema CI lint · Pagefind meta · glossary page.

**Larger items (multi-week, cross-repo, or need sign-off):**
`/data/` JSON export layer · comparison page programme · author entity system · concierge citations + streaming front end · public concierge API (security, keys, rate limiting) · MCP server · eval harness · AI-referral analytics.

---

## 8. What this review deliberately does not recommend

- **No SSR/Vercel migration.** Everything above fits the static constraint (HANDOVER §2).
- **No pricing, anywhere,** including `Offer`/`priceSpecification` JSON-LD: the existing lint stays authoritative; `llms.txt` states the policy to agents instead.
- **No blocking of AI crawlers.** For a publication whose strategy is to be *the* cited source on the Peninsula, training/retrieval exposure is distribution, not leakage. The asset to protect is the live concierge (rate-limited, keyed), not the editorial HTML.
- **No avatar/voice concierge** in this horizon (see §6).

---

*Follow-ups land in CHANGELOG.md per house rules. Source audit references: `docs/INFORMATION-ARCHITECTURE.md`, `docs/ecosystem-review-2026-05-16.md`, `docs/insider-concierge-review-and-roadmap-2026-05-02.md`, `BRAND-PI.md`, `HANDOVER-CLAUDE.md`.*

---

## Implementation status — 2026-06-11

Implemented in the same PR (branch `claude/ai-agent-website-redesign-9aujzk`), verified with a full build (1,486 pages) and the new schema lint (2,502 JSON-LD blocks valid):

| Item | Status |
|---|---|
| llms.txt + robots.txt AI note | Shipped (links corrected: editorial-approach/ethics/methodology all redirect to /about/, so /about/ is the canonical trust page) |
| /data/venues.json, /data/places.json, /data/events.json, /data/index.json | Shipped — static build-time exports, public fields only, mirroring the sitemap's publish posture (sitemapExclude and permanently-closed entries omitted) |
| /llms-full.txt | Shipped — generated at build from the content collections (283 entities) |
| Venue JSON-LD enrichment | Shipped — mainEntityOfPage, image, addressLocality, ReserveAction on bookingUrl (the schema-legal "book direct" consistent with no-pricing), dateModified from lastFactVerified, across eat/stay/wine templates |
| lastFactVerified field | Added to the venues schema (the wine template already referenced it; ~21 venue JSONs already carry data). Rendered as a "Verified" row in the At-a-glance panel |
| feed.xml enrichment | Shipped — dc:creator, category from article format, body excerpts in descriptions, 60 items |
| Pagefind facets | Shipped — BaseLayout searchMeta prop; venue pages emit place/type facets + verdict metadata |
| Glossary | Shipped at /journal/peninsula-glossary/ with DefinedTermSet schema |
| Canonical facts block | Shipped on /about/ ("The facts.") with citation guidance |
| Schema CI lint | Shipped as `npm run lint:schema` (validates all JSON-LD in dist; run post-build) |

Found already done since the audit (no action needed): Organization schema sameAs/contactPoint/foundingDate; Ask PI streaming front end; about/methodology/editorial-approach consolidation (all → /about/).

Not done here, with reasons:

- **Comparison pages and FAQ content passes** — require genuine editorial judgement in the house voice; fabricating venue comparisons would violate the no-invented-content principle. Backlog for the editor.
- **Concierge API docs, CORS, keys, citations; MCP server** — live in the separate platform repo (Vercel API), not this one.
- **Author entity pages** — needs a masthead decision (named people vs the three archetypes) before Person schema is honest.
- **Flagged inconsistency for an owner decision:** BRAND-PI.md and INFORMATION-ARCHITECTURE.md §1 both state priceBand "is never rendered publicly", but it renders on ~20 live surfaces (venue At-a-glance "Spend" row, venue cards, guides, the /eat/ price filter) and tasting fees render with dollar figures. This review initially removed two of those renders, then reverted on finding the pattern is site-wide and clearly deliberate product behaviour. Either the docs should be amended to carve out relative bands ($–$$$$), or the renders should be removed in a deliberate pass. Decision needed; the lint currently allows it.
