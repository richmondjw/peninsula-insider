# Technical SEO Audit — Workstream 2: Structured Data Validation + Entity Architecture

**Scope:** `next/dist` (948 static `index.html` files, 4 misc top-level `.html` files not schema-bearing). Read-only analysis. Live-site spot checks via curl noted where used.
**Method:** Every `<script type="application/ld+json">` block on every built page was extracted and `json.loads`-parsed. A recursive deep-scan then walked the full JSON tree (including `@graph` arrays and nested properties like `image`, `location`, `address`) to enumerate every schema node, not just top-level ones. Scripts and raw data: `extract_jsonld.py`, `analyze.py`, `deepscan.py`, `completeness.py`, plus ad-hoc verification snippets, all in this directory. Deep-scan counts reproduce the pre-supplied baseline counts closely (e.g. ListItem 1334/1334, Place 1107/1107, Question/Answer 799/799, FAQPage 230/230, BreadcrumbList 221/221, PostalAddress 431/431), which validates the extraction methodology.

---

## OBJECTIVE A — Structured Data Quality (§14)

### A.1 — Syntax validity: CLEAN

- **1,618 JSON-LD `<script>` blocks** found across 715 of 948 pages (75%).
- **`json.loads` success: 1,618 / 1,618 (100%). Zero syntax failures.**
- Every block also carries a valid `@context` and resolvable `@type`. There is nothing to fix here — the templating/serialization layer that emits JSON-LD is syntactically sound sitewide. Do not spend engineering time re-validating this; it's solid.

### A.2 — Duplicate schema per page: NOT a sitewide problem

Checked every page for the same `@type` appearing more than once as a **separate top-level JSON-LD node** (i.e. two distinct `Organization` blocks, two `BreadcrumbList` blocks, etc. — the failure mode Google actually penalizes/ignores).

- **1 file out of 715** has a genuine duplicate: `/eat/jetty-road-brewery/index.html` emits **two separate `LocalBusiness` nodes** — one carrying `address`/`geo`/`telephone`, a second carrying only `name`/`url`/`openingHoursSpecification`. This looks like two independent template partials (main venue card + an hours widget) each emitting their own full `LocalBusiness` object instead of one component owning the canonical node and the other contributing a property to it.
- No other template (town, hub, article, event, wine, stay) shows duplicate schema in 714 other pages.
- **Verdict: this is not a systemic issue.** Fix the one file; don't build a general de-dup pass for something that's already correct everywhere else.

### A.3 — Organization vs NewsMediaOrganization: NO conflict — already resolved correctly

This was flagged as a risk to check. Result: **`NewsMediaOrganization` is used exclusively as the publisher node, on all 715 pages that carry it. `Organization` (as a top-level publisher identity) never co-occurs with it.** 0 pages emit both. The 345 raw `Organization` nodes counted in the pre-supplied baseline are nested references (e.g. `organizer`, `author` sub-objects), not competing publisher identities.

Every one of those 715 `NewsMediaOrganization` nodes shares one `@id`: `https://peninsulainsider.com.au/#organization`, reused identically 715 times with consistent `name`, `legalName`, `logo`, `foundingDate`, `sameAs`, `contactPoint`, and editorial-policy links (`publishingPrinciples`, `correctionsPolicy`, `diversityPolicy`, `ethicsPolicy`).

**Verdict: this is exactly what Google wants** — a single, well-attributed, policy-rich publisher entity reused via a stable `@id`. This is the one part of the site's schema that already behaves like proper entity architecture. No action needed; do not "fix" this.

### A.4 — Article completeness

117 top-level `Article` nodes (baseline count 141 includes nested/duplicated counting; 117 is the number of distinct pages carrying an `Article` node).

| Field | Missing | / Total |
|---|---|---|
| `headline` | 0 | 117 |
| `datePublished` | 0 | 117 |
| `author` | 0 | 117 |
| `image` | **40** | 117 |
| `dateModified` | **78** | 117 |

- **`image` missing on 40/117 (34%) of Article pages** — e.g. every page under `/boating/ramps/*` uses `Article` schema with no `image` property at all. Article without an image is ineligible for most visual rich results.
- **`dateModified` missing on 78/117 (67%)** — the majority of articles never declare a modification date, which weakens freshness signals for a fast-moving local publisher whose value proposition is "current" listings (opening hours, prices, events).
- `author` is present on all 117 but is **always `{"@type": "Organization"}"`** — no `Person` authors anywhere. Not a schema-validity defect (Organization is a legal author type), but it forecloses any Article-level E-E-A-T byline signal Google increasingly rewards for "who wrote this and what's their expertise" — worth an editorial decision, not a technical one.

### A.5 — Event completeness

130 top-level `Event` nodes.

| Field | Missing | / Total |
|---|---|---|
| `name` | 0 | 130 |
| `location` | 0 | 130 |
| `eventStatus` | 0 | 130 |
| `startDate` | **11** | 130 |
| `offers` | **77** | 130 |

- **`startDate` missing on 11 events** — `startDate` is a hard requirement for `Event` rich-result eligibility. These 11 events (e.g. `/events/sorrento-writers-festival/`, `/events/annual-festivals/`, `/events/sailing-regattas/`) are **disqualified from Event rich results entirely**, not just degraded. Spot check shows most of these 11 are *category/roundup* pages (an "annual festivals" hub) rather than single dated events, which is arguably correct — but if any of them are meant to represent a single dated event, they need a date.
- `offers` missing on 77/130 (59%). Spot-checked two (`national-works-on-paper-2026-nwop`, `stonier-vineyard-tours-new-release-pinot-tasting`): **neither mentions a price anywhere in the visible page content either**, so this isn't a schema-authoring bug — it's a genuine content gap (ticket/price info was never sourced), not fabricated-then-dropped schema. Recommendation is editorial (source pricing) not technical, except that `isAccessibleForFree: true` should be set explicitly wherever an event is genuinely free — that field is `None`/absent on both samples checked, so free events aren't being marked as such either.

### A.6 — BreadcrumbList: syntactically flawless, but coverage is wildly inconsistent

- **199 top-level `BreadcrumbList` nodes checked. 0 have non-sequential/broken `position` values. 0 have relative (non-absolute) item URLs.** Wherever BreadcrumbList exists, it is built correctly.
- Coverage, however, is the real problem — and it's not random, it's systematic by template:

| Template | Pages with `BreadcrumbList` schema | Total pages (with any JSON-LD) |
|---|---|---|
| venue_wine | 57 | 59 |
| hub | 21 | 94 |
| article | 9 | 83 |
| event | 14 | 127 |
| town | 1 | 38 |
| **venue_eat** | **0** | **80** |
| **venue_stay** | **0** | **55** |
| homepage | 0 | 1 |

- **`/eat/` (80 pages) and `/stay/` (55 pages) emit zero `BreadcrumbList` schema — none at all.** Town pages are effectively the same (1/38).
- This is **not** a case of the site lacking breadcrumb UX to describe: manual check confirms `/eat/jetty-road-brewery/`, `/stay/jackalope/`, `/wine/baillieu-vineyard/` and the sampled town pages all render a **visible breadcrumb trail in HTML** (`<nav aria-label="breadcrumb">` present). The wine template turns that visible trail into `BreadcrumbList` schema (57/59); eat and stay templates render the identical visible UI pattern but never emit the matching schema. This is a template-level omission specific to the eat/stay/town template components, easily fixed by porting the wine template's breadcrumb-schema partial — the visible markup and the underlying data (page hierarchy) already exist, it's not being serialized for those templates.
- **SEO consequence:** BreadcrumbList directly affects the breadcrumb trail Google shows under a result in place of the raw URL. Losing it on 80+55+37(town gap) = ~172 pages means those results show raw slash-delimited URLs instead of a clean "Eat > Cellar Door > Baillieu Vineyard"-style trail — a real, cheap-to-fix visibility loss on exactly the pages (venue pages) that carry the most commercial intent.

### A.7 — FAQPage: real problem, and largely moot regardless

**Context Google has already set:** since August 2023, Google restricts FAQ rich results to "well-known, authoritative government and health websites" — for essentially every other site, including Peninsula Insider, **FAQ rich results will not display no matter how well the schema is built.** ([Google Search Central, Aug 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes)) That alone means **230 `FAQPage` blocks are producing no rich-result value today**, independent of quality.

On top of that, quality is genuinely uneven. Google's guidelines (still enforced for the general FAQPage type rules, and relevant if the policy ever loosens, plus as a spam-signal input) require FAQ content in the schema to be visibly present on the page. I checked every one of the 230 `FAQPage` blocks by extracting each question's exact text and searching the page's rendered HTML (stripped of scripts/styles) for that text:

| Template | Questions visible on page | Total FAQPage blocks |
|---|---|---|
| article | 59 | 74 |
| hub | 32 | 38 |
| other | 60 | 71 |
| venue_wine | 1 | 2 |
| **venue_eat** | **1** | **17** |
| **venue_stay** | **0** | **7** |
| **town** | **0** | **21** |

**77 of 230 FAQPage blocks (33%) have questions that exist only inside the `<script>` tag and nowhere in the visible page** — confirmed manually on `/explore/places/portsea/`: the string `"What is Portsea known for?"` occurs exactly once in the raw HTML, inside the JSON-LD `<script>`, and not in any rendered element. This is template-injected FAQ, not an authored Q&A section users can read. **This is entirely systemic on two templates: 0/21 town pages and 0/7 venue_stay pages have any visible FAQ content backing their schema.** Article and hub pages, by contrast, mostly do have real, visible Q&A (59/74 and 32/38) — those were evidently hand-authored or genuinely rendered.

**Recommended fix, in priority order:**
1. Given the Aug-2023 policy change, **do not invest in "fixing" FAQ schema to chase rich results that Google won't show for this site category.** It's not worth engineering time as an SEO play.
2. **Do** either (a) delete the invisible town/stay/eat FAQ blocks, or (b) actually render the Q&A as visible on-page content (which has standalone UX value — real questions people ask about a destination — independent of rich-result eligibility). Leaving invisible structured data that misrepresents page content is a soft spam signal Google's structured-data quality checks can penalize even outside rich-result eligibility.
3. The 60% of FAQPage blocks that already have real visible content (article/hub) are fine as-is; don't touch those.

### A.8 — ImageObject: the single biggest schema defect found in this audit

**832 `ImageObject` nodes were found across the site (deep-scanned, matches the 833 baseline). Every one of them — 832 / 832 — resolves to the exact same URL:**

```
https://peninsulainsider.com.au/images/sourced/home-cover.webp?v=d88526c1
```

That's the site's generic homepage cover photo, used as the `ImageObject.url` for Article images, Event images, and every other place an `ImageObject` is nested — regardless of whether the page is about a winery in Red Hill, a hot springs event, or a journal piece about a beach walk. Additionally, **0 of the 832 carry `width` or `height`**, and none carry `caption`/`description` — each is a bare `{"@type": "ImageObject", "url": "..."}`.

**Root cause, confirmed from the build output:** venue/article pages use `<img>` tags that ship in the static HTML completely bare (`<img>` — no `src`, no `alt`, no attributes at all). A build comment in the HTML explains why:

> *"Image slot hydration - reads all published cms\_image\_slots from Supabase and swaps matching `<img>` src values on every page load. Covers every page so right-click image edits on any page (events, places, venues, home) are visible immediately on next load without waiting for a re[build]."*

This is a deliberate CMS architecture: real per-page photography is injected **client-side, post-hydration, from Supabase**, not baked into the static build. The JSON-LD, however, is generated at **build time**, before that hydration step runs — so the schema generator has no real image to reference and falls back to the site's default OG image for every single entity. The two problems (empty static `<img>` tags and generic-image JSON-LD) share one root cause: the structured-data layer and the CMS image layer are not connected.

**SEO consequence — this is serious, more so than any other single finding in this audit:**
- Google's structured-data guidelines require Article/Event images to be "specific to the article" and of adequate resolution — a site-wide identical placeholder image fails that requirement for essentially all 141 Article and 147 Event nodes that carry an image reference. Zero of these pages are eligible for Google Discover, Top Stories, or Event visual card placement on the strength of their own imagery, because structurally Google cannot tell any of them apart.
- It also means **Google Images has no per-venue image signal from structured data** — a wasted opportunity specifically bad for a visually-driven local travel/dining publisher, where Images/Discover traffic is often disproportionately valuable.
- Separately (crawlability, arguably WS1 territory but directly caused by the same mechanism): any crawler, tool, or AI agent that doesn't execute the Supabase-hydration JS sees zero `alt` text and zero image `src` on every venue page. Manually confirmed on 6 sampled venue pages (`jetty-road-brewery`, `baillieu-vineyard`, `avani-wines`, `jackalope`, `birch-creek` — all show `alt_total: 0` in the static HTML).

**Recommended fix:** generate the `ImageObject.url` (and ideally `width`/`height`) from the same Supabase `cms_image_slots` source the client-side hydration reads from, at build time, per page — not from a static fallback. This is the highest-leverage single fix available in this audit: it touches Article, Event, and implicitly every venue page's visual search eligibility at once.

### A.9 — @id / entity linking: confirms isolated-islands hypothesis, with one clean exception and one broken exception

Deep-scanned every node for `@id` presence, sitewide:

| Entity type | Total nodes | Nodes with `@id` |
|---|---|---|
| NewsMediaOrganization | 715 | 715 (100%, all same `@id`) |
| Event | 130 | 106 |
| BreadcrumbList | 199 | 90 |
| FAQPage | 230 | 63 |
| Article | 117 | 30 |
| LocalBusiness | 92 | 24 |
| **Winery** | **138** | **0** |
| **Restaurant** | **37** | **0** |
| **TouristAttraction** | **100** | **0** |
| **TouristDestination (town)** | **43** | **0** |
| **Beach** | **27** | **0** |
| **GolfCourse** | **23** | **0** |
| LodgingBusiness | 50 | 5 |

**The publisher entity (`NewsMediaOrganization`) is the only fully-linked node in the graph.** Every venue-level and town-level entity type — Winery, Restaurant, TouristAttraction, TouristDestination, Beach, GolfCourse — has **zero** `@id` anywhere on the site. That means:
- The same restaurant, winery, or town, when referenced from a different page (e.g. a town page listing its top wineries, an article mentioning a venue, a tour package citing a hotel), is re-emitted as a brand-new, unlinked object each time, rather than a reference to one canonical node.
- Google's structured-data reconciliation depends on stable identifiers to merge mentions of the same real-world entity across a site (or across the web via `sameAs`) into one Knowledge Graph node. Without `@id`, every mention is evaluated in isolation.

**There is one place cross-page linking is attempted, and it's broken.** 5 `LodgingBusiness` nodes carry `@id`-style references — e.g. `/tour-packages/long-weekend/index.html` references `https://peninsulainsider.com.au/stay/jackalope/#LodgingBusiness` as a `locationCreatedIn` target. But **the actual page at `/stay/jackalope/index.html` defines its own `LodgingBusiness` node with no `@id` at all** — its keys are `['@context', '@type', 'name', 'description', 'address', 'geo', 'url', 'telephone', 'additionalProperty']`, no `@id`. So that reference points at nothing; it's a dangling fragment identifier. Same pattern confirmed for `/stay/lindenderry/`. This is worse than not attempting linking at all, because it looks like an entity graph is being built and isn't — three tour-package pages currently reference IDs that resolve to nothing.

**Recommended fix:** assign every canonical venue/town page's primary entity a stable `@id` (e.g. `https://peninsulainsider.com.au/wine/baillieu-vineyard/#winery`), and have every other page that mentions that entity (town pages, articles, tour packages, itineraries) reference that same `@id` instead of re-declaring the entity inline. This is the mechanical prerequisite for Objective B below.

### A.10 — Minor additional findings

- 13 wine pages (`/wine/main-ridge-estate/`, `/wine/kooyong/`, `/wine/port-phillip-estate/`, etc.) declare a secondary `Restaurant` node for their on-site cellar-door dining that has `address` but no `geo` — the winery's own node has coordinates, its restaurant sibling doesn't. Low priority, easy fix (copy the parent's `geo`).
- Canonical venue pages (venue_eat/venue_wine/venue_stay, 208 primary business nodes checked) are otherwise in good shape: only 4/208 missing `address` entirely (`/stay/peninsula-hot-springs/`, `/stay/lindenderry/`).
- Business-type specificity on `/eat/` pages is reasonable: of 60 pages with a business schema, 22 use `Restaurant`, 8 `CafeOrCoffeeShop`, 7 `BarOrPub`, 5 `Bakery`, and 17 fall back to generic `LocalBusiness` — spot-consistent with genuinely mixed venue types (producers, breweries) rather than miscategorization.

---

## OBJECTIVE B — Entity Architecture (§15)

Sampled 6 towns (Sorrento, Flinders, Red Hill, Mornington, Rye, Portsea) and 6 venues (Jetty Road Brewery, Bakeries hub, Baillieu Vineyard, Avani Wines, Jackalope, Birch Creek) across URL / `<title>` / H1 / breadcrumbs / body / schema / image alt.

### Towns: internally consistent

All 6 sampled towns show clean alignment: URL slug, `<title>` (e.g. *"Sorrento Mornington Peninsula 2026 - Where to Eat, Stay & Swim"*), `<h1>` (bare town name), `TouristDestination` schema `name`, and body text (name appears 181–325 times per page) all agree on the same town name and spelling. Visible breadcrumb nav is present on all 6 (though, per A.6, not backed by `BreadcrumbList` schema on 5 of them — a schema gap, not a naming-consistency problem). Image alt text mentioning the town name is present but thin (1–6 total `alt` attributes per page, 1–4 of which mention the town).

### Venues: consistent on text, silent on images, disconnected from their town

All 6 sampled venues show matching `title`/`H1`/canonical URL/schema `name` (e.g. Jackalope Hotel appears identically across all four). `address` and `geo` are present in schema for all 6. **But every one of the 6 sampled venue pages has zero `alt` attributes anywhere in the rendered static HTML** — confirmed this is the same client-side image-hydration mechanism from A.8: the `<img>` tags are shipped empty and populated post-load, so there is no alt text for any crawler that doesn't execute that hydration JS, and no alt text feeding the (already generic) `ImageObject` schema either.

The deeper gap is **relational, not textual**: nothing in a venue's own schema, or in its town's schema, declares the relationship between them. Baillieu Vineyard's page never states via structured data "this venue is `containedInPlace` Red Hill" or similar, and Red Hill's `TouristDestination` node doesn't list Baillieu Vineyard as a related entity via `@id`. The town → venue relationship exists only informally, through internal links and prose ("Red Hill's best wineries include...") — which Google can follow, but can't formally graph the way it would with entity-typed relationships and shared `@id`s.

### Direct answer: does PI have the technical foundations for a Mornington Peninsula knowledge graph?

**Partially, and closer than the raw numbers suggest — but not yet.** The building blocks that exist are genuinely solid: syntactically perfect JSON-LD (A.1), a single well-formed canonical publisher entity used correctly everywhere (A.3), correctly-typed venue schema with real address/geo data for the large majority of venues (A.10), and consistent naming across URL/title/H1/body for every entity sampled. That's a real foundation — most sites doing local content at this scale have far messier basics.

**The single biggest structural gap is the missing `@id` layer (A.9), compounded by the fact that every entity's imagery is currently identical and generic (A.8).** Those two together mean: even though the site *talks about* the same real-world entities consistently in prose, its structured data currently describes 138 wineries, 100 attractions, 43 towns, and dozens of restaurants and hotels as isolated, un-photographed islands with no formal relationship to each other or to the town pages that list them. A knowledge graph requires *stable identity* (an `@id` per entity, reused everywhere that entity is mentioned) and *distinguishing signal* (real images, real relationships via `containedInPlace`/`about`/`mentions`) — right now PI has neither, despite having everything else (correct types, correct addresses, correct geo, consistent naming) already in place to support them.

**Fix priority, in order of leverage:** (1) real per-venue images feeding `ImageObject` at build time instead of the shared fallback — A.8; (2) stable `@id`s on every canonical venue/town entity, reused by every other page that mentions it — A.9; (3) explicit `containedInPlace`/`about` relationships linking venue entities to their town's `TouristDestination` node. Items 1–2 alone would convert this from "consistent prose about disconnected schema objects" into an actual queryable local entity graph.
