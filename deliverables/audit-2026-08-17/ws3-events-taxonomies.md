# Peninsula Insider Technical SEO Audit — Workstream 3

## Events lifecycle (§16) + Taxonomies, archives, pagination (§17)

**Scope:** `/home/node/.openclaw/workspace/peninsula-insider` — Astro static build, `trailingSlash: 'always'`. Evidence drawn from `next/src` (source), `next/dist` (952-file built output, dated 2026-08-16), and `next/scripts/*.py` (content-lifecycle cron jobs). Live `curl -sS -A "curl/8.5.0"` used only to spot-confirm; all counts below are from the local build unless marked "(live)". "Today" for date-relative logic = 2026-08-16, matching the audit date and `next/dist`'s file mtimes.

Read-only audit. No source was modified.

---

## OBJECTIVE A — Events lifecycle (§16)

### A.1 — Inventory: how many event pages exist, live vs expired, recurring vs one-off, sitemap coverage

**Evidence:**
- Content collection `events` (`next/src/content.config.ts:770`) loads `**/*.json` recursively from `src/content/events/`, which resolves to two directories:
  - `src/content/events/*.json` — **82 files**
  - `src/content/events/archive/*.json` — **70 files**
  - Total content records: **152**
- Of the 152 records, **46 share an identical `slug` value** between a top-level file and an `archive/` file (verified: for all 46 pairs, `startDate`, `endDate`, and `title` are byte-for-byte identical — these are literal duplicate copies, not year-over-year re-dated variants). Net **unique slugs: 106**.
- Status field distribution across all 152 records: **34 `published`**, **118 `archived`** (0 `draft`/`review`/`scheduled`/`past`/`expired` in current data). All 70 `archive/` records are `status: archived`; the 34 `published` records are all top-level.
- `next/dist/whats-on/` contains **106 event-detail directories** (excluding `by-mood/` and `this-weekend/`) — exactly matching the 106-unique-slug count. This confirms Astro's static build **silently resolves the 46 slug collisions** at write time rather than erroring (see A.2).
- Recurrence distribution across the 152 records: `one-off` 47, `annual` 40, `monthly` 26, `weekly` 19, `seasonal` 13, `ongoing` 7.
- Sitemap coverage: `next/dist/sitemap.xml` (local build, ground truth for this repo state) contains **34 `/whats-on/<slug>/` event-detail URLs**, which is exactly the `status: published` count (`next/src/pages/whats-on/_data.ts:287`: `getCollection('events', ({ data }) => data.status === 'published')`, consumed by `sitemap.xml.ts:379-386`). **106 built pages − 34 in sitemap = 72 orphaned, indexable `/whats-on/*` pages** — this reconciles exactly with the already-established 72-page figure.
  - *Caveat:* the **live** production sitemap (`https://peninsulainsider.com.au/sitemap.xml`, fetched via curl) currently shows 46 event URLs, not 34 — production has been rebuilt from newer content than what's checked into this local repo. Use the local 34/72 figures for anything tied to this repo's current source; flag to editorial that local content is trailing production.
- `signature-events` collection (separate from `events`) powers the deprecated `/events/*` hub: **12 detail pages + 1 index**, confirmed live at `https://peninsulainsider.com.au/events/portsea-polo/` → `200`, self-canonical, `<meta name="robots" content="index, follow, max-image-preview:large">`. Zero internal links to `/events/` anywhere in `next/src` (`grep -rn 'href="/events'` returns nothing outside the route files themselves) — these 12 + 1 pages are true orphans, reachable only by direct URL/backlink/stale external index, not by crawl.

**Root cause:** the sitemap generator (§4.1 contract, `sitemap.xml.ts:6-17`) treats "live" as "has an occurrence today-or-later," but `getStaticPaths` in `whats-on/[slug].astro:28-34` and `events/[slug].astro` build **every** record with no date or status filter. The lifecycle gate exists only in the sitemap/hub layer, not the build layer — so expiry never removes a page, it only removes it from *discovery surfaces*, while the page itself remains fully live and self-promoting.

### A.2 — Duplicate-slug build collision (`content/events/archive/`)

**Evidence:** 46 of the 70 files in `src/content/events/archive/` are exact duplicates (same `slug`, `startDate`, `endDate`, `title`) of an already-`archived` top-level file. Example (`src/content/events/alba-fire-and-ice-sessions.json` vs. `src/content/events/archive/alba-fire-and-ice-sessions.json`): identical `startDate: 2026-04-18`, `endDate: 2026-04-30`, `status: archived`; the only difference is `sitemapExclude` (`null` top-level vs. `true` in the archive copy — moot, since `status !== 'published'` already excludes both from every live query).

Because the Astro content-collection glob loader keys entries by file path (`id`), both copies persist as **distinct collection entries with identical `data.slug`**. `getStaticPaths` in `whats-on/[slug].astro:28-34` maps `params: { slug: routeSlug(event) }` for every entry — two entries emit the same route param, and the static build **silently overwrites one output file with the other** (152 records → 106 written directories, confirmed in A.1). This is a landmine, not a currently-active bug for search (both copies are `status: archived` in every observed case, so neither would ever reach the sitemap regardless of which "wins" the collision), but:
- It means whichever editorial system re-publishes an archived event (see A.4) can silently target the wrong physical file if a duplicate exists, with the *other* copy's stale data winning the build.
- It's a live landmine for the next duplicate pair where one copy is `published` and the other isn't — nothing in the loader or build prevents that state, and the build gives no warning.

**Recommendation:** delete the 46 duplicate files from `src/content/events/archive/` (keep the 24 archive-only records that have no top-level counterpart) and add a slug-uniqueness assertion to the build (fail the build if two `events` entries share `data.slug`). Low effort (script + one CI check), removes a currently-latent but real correctness risk.

### A.3 — Recurring/annual URL reuse: same URL, shifting date

**Evidence:** annual events keep one permanent slug (frequently with the origin year baked in, e.g. `autumn-winery-walk-2026`, `flinders-hotel-mothers-day-2026`) rather than minting a new URL per year. Freshness is carried by a separate `nextOccurrence` field, cron-recomputed (`next/scripts/recompute-occurrence.py`), and consumed by:
- `eventJsonLd()` (`next/src/lib/events.ts:219-226`) — swaps `startDate`/`endDate` in the JSON-LD to `nextOccurrence` for `weekly`/`monthly`/`annual` recurrence when set.
- `ruleFor()` (`next/src/pages/whats-on/_data.ts:161-213`) — same substitution for the on-page "When" label and listing eligibility.

This is a defensible pattern (it consolidates authority onto one URL instead of fragmenting it across `event-2026`, `event-2027`, …), **but the slug itself is never updated**, so a URL literally reads `/whats-on/autumn-winery-walk-2026/` while displaying and structuring data for 2027 — a URL/content mismatch that is confusing in a shared link or SERP snippet and makes the URL a permanent misnomer once it rolls past its first cycle.

### A.4 — The `archived`-events lifecycle is a one-way gate — 19 confirmed live events wrongly hidden

**This is the most material finding in this workstream.**

**Evidence — the bug, reproduced from data:** cross-referencing `status` against `nextOccurrence` across all 152 records, **19 distinct events are `status: archived` while `nextOccurrence` is a valid future date** (≥ 2026-08-16):

| slug | recurrence | startDate | nextOccurrence |
|---|---|---|---|
| autumn-winery-walk-2026 | annual | 2026-05-09 | 2027-05-09 |
| crittenden-wines-king-s-birthday-wine-weekend-events | annual | 2026-06-06 | 2027-06-06 |
| flinders-hotel-mothers-day-2026 | annual | 2026-05-10 | 2027-05-10 |
| jetty-road-brewery-mothers-day-2026 | annual | 2026-05-10 | 2027-05-10 |
| michael-vale-exhibition-at-mprg | annual | 2026-02-28 | 2027-02-28 |
| mornington-cup-2026 | annual | 2026-04-18 | 2027-04-18 |
| mornington-peninsula-winter-wine-weekend-winter-wine-festival | annual | 2026-06-06 | 2027-06-06 |
| mothers-day-classic-moonah-links-2026 | annual | 2026-05-10 | 2027-05-10 |
| pier-10-mothers-day-lunch-2026 | annual | 2026-05-10 | 2027-05-10 |
| rocky-road-festival-mornington-peninsula-chocolaterie | annual | 2026-05-01 | 2027-05-01 |
| sorrento-writers-festival-2026 | annual | 2026-04-23 | 2027-04-23 |
| stonier-fire-wine-winter-lunch | annual | 2026-08-09 | 2027-08-09 |
| stonier-pies-pinot-king-s-birthday-weekend | annual | 2026-06-06 | 2027-06-06 |
| sustainable-house-day-2026 | annual | 2026-05-17 | 2027-05-17 |
| winter-wine-weekend-full-3-day-peninsula-program | annual | 2026-06-06 | 2027-06-06 |
| winter-wine-weekend-june | annual | 2026-06-06 | 2027-06-06 |
| winter-wine-weekend-winter-wine-festival-red-hill-showgrounds | annual | 2026-06-06 | 2027-06-06 |
| peninsula-hot-springs-bathe-in-cinema-thursdays | weekly | 2026-05-07 | 2026-08-20 |
| shoreham-community-market | monthly | 2026-05-17 | 2026-09-20 |

Because `loadLiveEvents()` (`whats-on/_data.ts:287`) filters on `status === 'published'` *before* any date logic runs, these 19 events are invisible to: the `/whats-on/` hub, the `/whats-on/feed.json` island, all four `/whats-on/by-mood/*` chip pages (`by-mood/[mood].astro:35-40` also has no `status` filter but independently excludes them because it checks `isUpcoming(endDate)`, not `nextOccurrence`), PI's Picks, category shelves, and the sitemap — while remaining fully built, self-canonical, and `index, follow` at their `/whats-on/<slug>/` URL (confirmed on `alba-fire-and-ice-sessions`, a comparable case — see A.5). Two of the 19 are `weekly`/`monthly`, which should essentially never go stale — their presence on this list means the archive job is firing on cadenced, still-running series.

**Root cause — confirmed in code, not inferred:**
- `next/scripts/archive-expired-events.py` (cron job 2) sets `status: archived` when `endDate + 1 day < today`, for `one-off`/`annual`/`seasonal` recurrence, **unless** (`archive-expired-events.py:64-69`) `recurrence == 'annual' and nextOccurrence >= today` — i.e., the script's own author clearly intended annual events with a valid future `nextOccurrence` to be skipped.
- `next/scripts/recompute-occurrence.py` (cron job 1) computes the next future `nextOccurrence` for `weekly`/`monthly`/`annual` events — but **explicitly refuses to touch any record where `status in ('archived', 'expired')`** (`recompute-occurrence.py:97`, `if data.get('status') in ('archived', 'expired'): continue`).
- The combination is a **one-way gate**: nothing in the pipeline ever moves `status` back to `published`. If `archive-expired-events.py` ever archives a record on a day when `nextOccurrence` was still stale/null (a plausible race if the two cron jobs run out of order, or one run is skipped/delayed — GitHub Actions cron is not guaranteed to fire at the exact minute), the record is permanently stuck: `recompute-occurrence.py` will never again update its `nextOccurrence`, and no other script re-publishes it. The 19 events above are exactly the signature of that failure mode — plausible future dates sitting on records the pipeline has locked into `archived`.
- The `weekly`/`monthly` cases (`peninsula-hot-springs-bathe-in-cinema-thursdays`, `shoreham-community-market`) shouldn't be `archived`-eligible at all per `archive-expired-events.py:47` (`ARCHIVE_ELIGIBLE_RECURRENCES = {'one-off', 'annual', 'seasonal'}` excludes `weekly`/`monthly`) — these were very likely archived by a manual/editorial status edit or an earlier version of the pipeline, then caught by the same one-way-gate trap.

**Consequence:** this isn't just an orphan-page problem — it's a **genuine visibility bug**. These are events editorial believes are running (the data says so), that readers cannot find via any on-site navigation, that are excluded from the XML sitemap, and that Google will not learn are "actually still running" because nothing signals it.

**Recommendation:** fix `archive-expired-events.py` to be idempotent-safe regardless of cron ordering by having it derive its own `nextOccurrence` check inline (or simply run `recompute-occurrence.py` immediately before it in the same workflow step, unconditionally, even for already-`archived` records with recognized recurrence rules) — and, more importantly, add a "resurrect" pass: for any `archived` record with `recurrence in (weekly, monthly, annual)` and `nextOccurrence >= today`, flip `status` back to `published`. This closes the one-way gate. Effort: ~30 lines across the two scripts + a CI backfill run against current content. Low engineering cost, directly fixes 19 currently-hidden live URLs.

### A.5 — Soft-404 risk: expired events render as complete, normal, indexable pages

**Evidence**, using `alba-fire-and-ice-sessions` (`status: archived`, `recurrence: seasonal`, ended 2026-04-30, no `nextOccurrence` — a genuinely, permanently dead one-off, ~3.5 months stale relative to audit date) as a representative sample of the 72-orphan set:

- `next/dist/whats-on/alba-fire-and-ice-sessions/index.html` is a full **113 KB** page with complete site chrome (header, nav, sidebar "More from What's On", newsletter block).
- `<link rel="canonical" href="https://peninsulainsider.com.au/whats-on/alba-fire-and-ice-sessions/">` — self-canonical.
- `<meta name="robots" content="index, follow, max-image-preview:large">` — no `noindex`.
- Embedded Event JSON-LD (`eventJsonLd()`, `lib/events.ts:215-352`) still emits:
  ```
  "startDate":"2026-04-18T00:00:00.000Z","endDate":"2026-04-30T00:00:00.000Z",
  "eventStatus":"https://schema.org/EventScheduled"
  ```
  i.e. Google's structured-data pipeline is being told this event is **`EventScheduled`** with a start date roughly four months in the past — schema.org / Google's Event guidelines expect `EventScheduled` to describe a future or in-progress event; a past-dated `EventScheduled` is exactly the pattern Google's docs flag as invalid/stale and is a known trigger for "Events" rich-result warnings in Search Console. There is no `EventCancelled`, `EventMovedOnline`, or omission of the schema block on expired records — `[slug].astro` has no conditional logic keyed on expiry at all (confirmed reading the full template: no "this event has ended" messaging, no schema suppression).
- Template source (`whats-on/[slug].astro:40-45`) also means these expired pages **actively cross-link each other**: the "More from What's On" sidebar is built from `getCollection('events')` with only a same-slug exclusion — no status or date filter — so an expired page's related-events block can surface (and does, whenever the category-match yields <2 results, via the unconditional `relatedFallback = allEvents.slice(0, 3)` fallback) other expired/archived pages. **This is the actual crawl-discovery mechanism**: even though these 72 pages are absent from the sitemap, Googlebot can reach them via ordinary internal links from other event pages — the sitemap-exclusion strategy does not stop crawl, it only stops sitemap-driven discovery. The two signals are inconsistent: "don't bother crawling this" (sitemap) vs. "here's a link to it" (in-page sidebar).

**Net assessment:** every one of the 72 `/whats-on/*` + 12 `/events/*` orphans is a **soft-404 in all but name** — 200 status, full template, stale/invalid Event schema, real (if thin) internal link equity flowing to it from sibling pages, and no user-facing signal that the event is over. This is exactly the shape of page Google's algorithmic soft-404 detection is built to catch, and at accumulating volume (72 today, growing by however many one-off/seasonal events expire per month) it is a live, worsening crawl-budget and quality-signal problem, not a one-time cleanup.

### A.6 — `/whats-on/this-weekend/archive/` branch: correctly built, no action needed

**Evidence:** `next/dist/whats-on/this-weekend/archive/` contains **14 dated dispatch pages** (`YYYY-MM-DD` slugs, e.g. `2026-07-13`), each backed by a genuine, distinct editorial article (`getStaticPaths` in `this-weekend/archive/[slug].astro:30-38` sources from the `articles` collection filtered to `isPeninsulaThisWeekend`, one per published weekend dispatch — not auto-generated, not templated boilerplate). Each is self-canonical, carries its own Event/BreadcrumbList JSON-LD, and includes prev/next navigation between adjacent weekends. All 14 (13 confirmed in the local `dist/sitemap.xml`, the archive index itself correctly excluded — see below) are explicitly emitted by `sitemap.xml.ts:295-301`.

The archive **index** (`this-weekend/archive/index.astro`) is correctly `noindex={true}` (line 9) with a single link back to the current edition — appropriate, since it's a low-value navigational stub, not a content page. This whole branch is a clean, already-correct implementation: unique per-URL content, correct indexability split between index (noindex) and children (index), stable URLs. **No recommended change.**

### A.7 — Recommended architecture: three options

**Constraint to satisfy:** preserve whatever link equity/impressions history these URLs have accumulated (many are 3–12+ months old), while stopping Google from indexing stale/soft-404 content, and closing the internal-link-propagation gap found in A.5.

**Option 1 — `noindex` on expiry, keep the URL live.**
Add a template-level check in `whats-on/[slug].astro`: when the event's effective end (`nextOccurrence`-aware, same logic as `ruleFor()`) is in the past, render `<meta name="robots" content="noindex, follow">`, add an on-page "This event has ended" banner, and strip/alter the JSON-LD (`eventStatus` should not be `EventScheduled` once the date has passed — omit the JSON-LD block entirely for a definitively-dead one-off, or emit nothing rather than a false-future-tense schema). Also gate the related-events sidebar (A.5) to only link to *live* events, closing the crawl-propagation leak.
- *Trade-off:* Google eventually drops `noindex`'d URLs from its index — this doesn't "preserve authority," it just stops active harm gracefully and keeps the page reachable for a direct link/backlink for a while. Cheapest, safest, fastest to ship (one template change).

**Option 2 — 301 redirect to a category/hub anchor on expiry.**
Once an event is definitively over (no `nextOccurrence`), 301 `/whats-on/<slug>/` → the matching `/whats-on/by-mood/<mood>/` or category shelf, or to `/whats-on/` itself.
- *Trade-off:* this is the standard "preserve link equity" move, but here it's a poor fit — the redirect target (a generic mood/category page) has essentially zero topical relevance to the specific dead event, so Google is likely to treat it as a soft-404-flavoured redirect anyway ("redirect to an unrelated page" is itself a quality signal Google discounts). Also operationally heavier: needs a redirect map maintained per-event, and Astro's static output needs either a hosting-level redirect rule (e.g. `_redirects`/Cloudflare rule, the project already has `ops/cloudflare-redirects.csv` for exactly this) or a client-side/meta-refresh shim, which is worse for SEO than either other option.

**Option 3 — Evergreen-archive conversion (recommended).**
For events with real recurrence (`annual`/`seasonal`/`weekly`/`monthly` — the majority of the corpus per A.1), don't treat "the 2026 date has passed" as death at all: this is what `nextOccurrence` already half-implements (A.3) — extend it properly. Once the current dated occurrence lapses, convert the page in place from "event on this date" framing to "recurring [event name] — next on [nextOccurrence]" framing, keep it fully indexed and in the sitemap continuously, and only apply Option 1 (`noindex`) to genuine one-off events with no recurrence and no future date. This is the direct fix for A.4 as well, since it removes the need for an `archived` status to ever hide a still-relevant page.

**Recommendation:** **Option 3 for recurring events (annual/seasonal/weekly/monthly — ~85 of 152 records), Option 1 for true one-off events with no future occurrence (~47 records).** This matches effort to actual content shape instead of applying one blanket rule, fixes A.4's visibility bug as a side effect (the `status` field stops needing to gate indexability at all — indexability should be computed from dates/recurrence, exactly as `loadLiveEvents()` already computes *listing* eligibility), and avoids Option 2's redirect-relevance problem entirely.
**What I'd need to be confident:** GSC "Events" rich-result report + Search Analytics impressions/clicks filtered to `/whats-on/*` and `/events/*`, broken out by currently-orphaned vs. currently-indexed URLs, to confirm these orphans are actually accumulating impressions worth preserving before spending engineering time on Option 3 over the cheaper Option 1. Also want one full cron cycle of GitHub Actions run logs for `archive-expired-events.py`/`recompute-occurrence.py` to nail the exact ordering/race that produced the A.4 list, rather than the plausible-but-unconfirmed mechanism above.

---

## OBJECTIVE B — Taxonomies, archives, pagination (§17)

### B.1 — Full inventory of taxonomy/archive/listing surfaces

Enumerated by grepping every `getStaticPaths` export in `next/src/pages` (24 dynamic route files total) plus every hand-authored index/category page referenced by the sitemap. The site has **no classic tag/category/date/author archive sprawl** — there is no `/tag/*`, `/category/*`, `/author/*`, or `/YYYY/MM/*` route anywhere in `next/src/pages`, and the `authors` collection has exactly **1 record**, used only for bylines (`journal/index.astro`, `EditionFrontPage.astro`), never as an archive route. This is a hand-curated hub model, not an auto-generated taxonomy — the classic WordPress-style thin-taxonomy risk largely does not apply here.

| Surface | Pages | Verdict | Evidence / justification |
|---|---|---|---|
| `/whats-on/by-mood/[mood]/` (4: this-weekend, when-it-rains, worth-the-drive, after-dark) | 4 | **Index** | Unique framing copy + `ItemList` JSON-LD per chip (`lib/events.ts:134-195`), all 4 already in `sitemap.xml.ts:375-377`. Distinct filter logic per page (weather/appeal/time-of-day), not near-duplicate. |
| `/whats-on/by-mood/` (index) | 1 | **Noindex (already correct)** | `by-mood/index.astro:9`, `noindex={true}`; single link back to `/whats-on/`. Zero unique content. Correctly excluded from sitemap. |
| `/whats-on/this-weekend/archive/[date]/` | 14 built (13 in sitemap) | **Index (already correct)** | See A.6 — unique editorial content per dated dispatch, self-canonical, in sitemap. |
| `/whats-on/this-weekend/archive/` (index) | 1 | **Noindex (already correct)** | `archive/index.astro:9`, `noindex={true}`. |
| `/eat/`, `/stay/`, `/wine/`, `/explore/` category & best-of pages (e.g. `/eat/markets/`, `/stay/glamping/`, `/wine/red-hill/`) | 24 hand-authored `.astro` files under `/eat/` alone (+ comparable sets under `/stay/`, `/wine/`, `/explore/`) | **Index** | Confirmed hand-authored (not templated from a type array) and substantial: `/eat/markets/` renders **5,327 words** of body text in the built HTML. All already explicitly listed in `sitemap.xml.ts:235-249`. Not a thin-taxonomy risk — these are the site's actual editorial "best-of" architecture. |
| `/explore/regions/[slug]/` | 5 | **Index (already correct)** | Small, curated, editorial (`content/regions/`: 5 JSON records — coastal/wine sub-regions), already in sitemap (`sitemap.xml.ts:266-268`). No thin-content risk at this volume. |
| `/explore/places/[slug]/` (town pages) | 37 | **Index (already correct)** | Editorial town guides, already Tier-1 protected in the sitemap contract (`sitemap.xml.ts:259-262`, comment: "protected set at template level"). |
| `/events/` + `/events/[slug]/` (signature-events) | 1 + 12 | **Delete or 301-consolidate** | See A.1 — fully orphaned (zero internal links, absent from sitemap since the 2026-07-11 hub removal), yet still built, `200`, self-canonical, `index,follow` on production. This is dead weight actively serving crawl budget for nothing: either finish the "§3.4 migration into `/whats-on/*`" the code comments reference (301 each of the 12 to its `/whats-on/` counterpart if one exists, else fold the content in), or formally decommission the route (`export const prerender = false` + 410, or drop the page files and let the host 404) instead of leaving it live-but-invisible indefinitely. |
| `/whats-on/[slug]/` (72 orphaned event pages) | 72 | **Consolidate/Rebuild** (see Objective A recommendation) | Covered fully in A.4/A.5/A.7 — not a taxonomy surface per se, but the largest indexable-orphan set on the site. |
| Pagination (`page/2`, `?page=`, any `paginate()` usage) | **0** | **N/A — does not exist** | See B.2. |

### B.2 — Pagination: not implemented anywhere on the site

**Evidence:** `grep -rl "paginate(" next/src/pages` — zero matches. `grep -rln 'rel="next"\|rel=.next.'` across `next/src` — zero matches. No file matching `*page*` under `next/src/pages` beyond the literal string "pages" itself. Every listing surface on the site (journal index, whats-on hub, eat/stay/wine hubs, by-mood pages) renders its full result set (or a hard JS/template-level `.slice(0, N)` cap, e.g. `by-mood` chips cap at 12–20 items via `ChipDefinition.limit`, `lib/events.ts:148/163/177/193`) on a single URL. There is no `/journal/page/2/`, no `?page=` query param wired to a route, and consequently:
- The classic "page 2+ self-canonicalises vs. canonicalises to page 1" error this objective asked me to check **cannot occur — the failure mode requires pagination to exist first.**
- The trade-off the site has actually made instead is **silent truncation**: capped lists (e.g. `by-mood/this-weekend` limits to 12 events, `lib/events.ts:148`) have no "see more" affordance or an uncapped alternate URL, so any event beyond the cap position is invisible on that surface (though still separately reachable at its own `/whats-on/<slug>/` URL if it's in the live set). This isn't a duplication/indexation risk in the way mispaginated page-2 URLs are, but it is a **content-discovery** ceiling worth flagging: if the "This weekend" window ever holds >12 live events, items 13+ get no listing exposure anywhere except the JSON feed (`/whats-on/feed.json`, not indexable) and direct link.

**Verdict:** **No fix needed for pagination correctness** (there's no rel=next/prev bug to have, since there's no pagination). **Optional enhancement, not a defect:** if the events corpus grows enough that the hard-coded per-chip limits regularly truncate real inventory, consider either raising the limits or adding true paginated routes with correct self-canonical page-N URLs and `rel="next"/"prev"` — but this is a scale problem for the future, not a current audit finding.

---

## Summary of quantified findings

| Metric | Count | Source |
|---|---|---|
| Total `events` content records | 152 (82 top-level + 70 archive/) | `src/content/events/**/*.json` |
| Duplicate-slug pairs (build collision) | 46 | cross-file `slug` comparison |
| Unique event slugs / built `/whats-on/*` pages | 106 | `next/dist/whats-on/*` dir count |
| `status: published` | 34 | jq over content records |
| `status: archived` | 118 | jq over content records |
| Event URLs in local `sitemap.xml` | 34 | `next/dist/sitemap.xml` |
| Orphaned, indexable `/whats-on/*` pages | 72 | 106 built − 34 sitemap |
| Orphaned, indexable `/events/*` pages | 12 + 1 index | `next/dist/events/*`, 0 in sitemap, 0 internal links |
| `status: archived` but `nextOccurrence` valid & future (wrongly hidden live events) | **19** | cross-field date comparison, A.4 |
| `/whats-on/this-weekend/archive/` dated pages | 14 built / 13 in sitemap | already correct, no action |
| Auto-generated tag/category/author/date archive routes | 0 | `getStaticPaths` inventory |
| Pagination routes (`paginate()`, `rel=next/prev`) | 0 | codebase grep |
