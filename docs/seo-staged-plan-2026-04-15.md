---
title: Peninsula Insider — SEO Staged Project Plan
date: 2026-04-15
prepared_by: Remy
responding_to: External SEO feedback on planning-layer wedge strategy
status: draft for James's approval
horizon: 16 weeks
---

# Peninsula Insider — SEO Staged Project Plan

## 1. Thesis — and where I agree with the feedback

**The feedback is right in direction, close in detail, and slightly off on sequencing.**

The core thesis — *"build the best Mornington Peninsula trip-planning content hub in Australia, then route that authority into accommodation and high-intent booking pages"* — matches the brand's natural shape. You are already an editorial brand in Google's eyes. Trying to win the raw accommodation SERP against Booking.com, Stayz, Airbnb, Wotif, and Luxury Escapes is losing ground by design. Playing planner-in-chief is winning ground by definition.

The sequencing argument (things to do → hot springs → wineries → stay → towns → itineraries) is also correct on the traffic side. Head term demand per the AU SpyFu data cited:

| Cluster | Volume | Difficulty |
|---|---|---|
| Hot springs (MP) | ~3,500 | 19 |
| Things to do (MP) | ~810 | 20 |
| Wineries (MP) | ~570–600 | 27–30 |
| "Where to stay" (MP) — already #41 | untested at head | OTA-saturated |

Hot springs is the biggest short-term opportunity by absolute volume, and the difficulty is the same as things-to-do. I'd push the feedback's #2 and #1 to parity in Stage 2 (build both pillars simultaneously rather than hot springs trailing).

---

## 2. Three points where I'd refine the feedback

### 2a. Don't defer the Stay cluster to week 8

The feedback says "build Stay after authority clusters take shape." I disagree in one specific way: `/stay/best-accommodation` is already at ~#41 for a valuable planning-style query. **That's the best single ranking signal on the site.** Nurture it now. Rewrite and link-build it in Stage 2 alongside the planning pillars, not in Stage 4.

The rest of the Stay support cluster (boutique, romantic, pet-friendly, near-hot-springs, winery accommodation) is where the planner-first sequence is correct — those CAN wait until the planning hubs are feeding them.

### 2b. Hot Springs pillar strategy — promote, don't duplicate

The feedback implies a new `/hot-springs/` top-level pillar. **We already have `/spa/`** (launched recently — see git log `feat: spa: full section launch`). Creating a parallel `/hot-springs/` URL fragments topical authority.

Better play: make `/spa/mornington-peninsula-hot-springs-guide/` the canonical hub (the existing journal article at `/journal/mornington-peninsula-hot-springs-guide/` should probably be promoted and 301'd). Put a strong hot-springs landing at `/spa/` that leads with Peninsula Hot Springs + Alba + Hot Springs Adventure Park. Keep "spa" as the brand-level category, use "hot springs" as the dominant search-intent framing inside it.

### 2c. URL vocabulary — don't rebrand existing pillars, add alongside

The feedback assumes slugs like `/things-to-do/`, `/hot-springs/`, `/itineraries/`. The site currently uses `/explore/`, `/spa/`, `/escape/`. Renaming pillars is expensive (301 chains, lost signals, broken external links, internal-link rewrites across 338 pages).

Recommended: **keep brand pillar URLs, add search-intent slugs as parallel landing pages.** Concretely:

| Keep as-is | Add alongside |
|---|---|
| `/explore/` (brand pillar, editorial voice) | `/explore/things-to-do-mornington-peninsula/` (search-intent best-of hub) |
| `/escape/` (brand pillar) | `/escape/mornington-peninsula-itinerary/` (hub for itineraries, can replace existing journal slug) |
| `/spa/` (brand pillar) | `/spa/mornington-peninsula-hot-springs-guide/` (hub) |
| `/wine/` (brand pillar) | `/wine/best-wineries-mornington-peninsula/` (hub, complements existing `/wine/best-cellar-doors`) |
| `/stay/` (brand pillar) | `/stay/where-to-stay-mornington-peninsula/` (hub, complements `/stay/best-accommodation`) |

This gives us the search-intent URLs *and* the brand IA. Internal linking points dual paths at the same authoritative content.

---

## 3. Current state assessment — what's already here

Before staging new work, worth naming what already exists. The site is more built than the feedback assumes:

**Pillar navigation (as of tonight's deploy):** Eat & Drink · Stay · Explore · Wine Country · Escape · What's On · Golf · Spa.

**Existing journal articles matching the feedback's cluster map:**
- Mornington Peninsula hot springs guide ✓
- Free things to do in Mornington Peninsula ✓
- Mornington Peninsula day trip from Melbourne ✓
- Mornington Peninsula in autumn ✓
- Mornington Peninsula in winter ✓
- Mornington Peninsula itinerary ✓
- Mornington Peninsula wedding venues ✓
- Mornington Peninsula winery tour ✓
- Mornington Peninsula with kids ✓
- Dog-friendly Mornington Peninsula ✓
- Best brunch Mornington Peninsula ✓
- The Peninsula with kids (alt)

**Existing best-of hubs:**
- `/eat/best-restaurants/`
- `/wine/best-cellar-doors/`
- `/explore/best-walks/`
- `/stay/best-accommodation/`

**What the site lacks:**
- Dedicated "best things to do" hub (only `/explore/best-walks` is narrow)
- Dedicated "best wineries" hub (currently only best-cellar-doors)
- Strong hot-springs landing at `/spa/`
- Most Stay-modifier support pages (boutique, romantic, pet-friendly, near-hot-springs, winery accommodation)
- Winery-lunch hub (high-intent commercial query)
- Town pages with planning-intent depth (places/ exists but mostly light)
- Hot-springs ↔ accommodation cross-cluster bridges
- Proper internal linking discipline between hub ↔ spoke ↔ cross-cluster
- Clear "realness" markers: author bylines, first-visit dates, last-updated stamps

**Technical state — already strong foundations:**
- Schema: Article, Organization, WebSite, BreadcrumbList, FAQPage ✓
- OG tags, Twitter Card, canonicals, meta descriptions ✓
- Sitemap endpoint ✓
- Pagefind search (6,394 words indexed across 338 pages) ✓
- Robots.txt ✓
- V2 Astro build with JSON-first content collections ✓ (now on v6 content layer)
- Editorial-jobs cron pipeline *specified but not firing* (Maven handoff item)

---

## 4. Staged project plan — 16 weeks, one-editor capacity

Designed around a single-editor brand with variable-energy health constraint. Each stage is "ship a visible win, then move." No stage requires you to stop everything else.

### Stage 0 — Audit & Instrumentation (Week 0–1)

**Goal:** Know what's ranking, what's indexed, what's broken, before we add anything.

Deliverables:
- **GSC audit** — if Google Search Console isn't set up and verified, do that first. Pull 90-day data on: impressions, clicks, average position, top query pages, coverage issues, mobile usability.
- **Live content audit** — list every page of substance on the site (roughly 338 pages), tag each with primary intent (planning / local reference / editorial / commercial), target cluster, current state (flagship / needs refresh / thin / dead).
- **Keyword-to-page map** — map every priority keyword from the feedback to the page that should own it. Flag gaps (keywords with no page).
- **Orphan + under-link audit** — run a script on the static output to identify pages with <2 inbound internal links. These are authority black holes.
- **Technical SEO snapshot** — Core Web Vitals, mobile-friendly test, canonicals check, broken internal links, duplicate meta descriptions, duplicate title tags, thin content flags.

**Owner:** Remy as scripted audit + James for GSC access. No new content.

### Stage 1 — Technical & IA Foundation (Week 1–2)

**Goal:** Fix the plumbing so everything we build in Stage 2+ compounds properly.

Deliverables:
- **GSC + Bing Webmaster** submission, sitemap verification, priority-page request-indexing pass.
- **Breadcrumb audit** on all pillar/hub pages (should already have schema — verify rendering).
- **Title + meta description rewrite** on the top 50 pages by impressions (from Stage 0 GSC data). Aim: every title unique, descriptive, intent-matched. Every meta description CTR-optimized (benefit-led, not summary-led).
- **Canonical pass** — ensure every page has one clean canonical, no cross-pillar ambiguity.
- **Internal link rules** — codify the "every hub links to its spokes, every spoke links up to hub + 2 sibling spokes + 1 cross-cluster" pattern. Implement via the Astro content collections (JSON-referenced `relatedVenues`, `relatedExperiences`, `relatedArticles` fields).
- **Robots.txt hygiene** — make sure we're not indexing thin tag archives, author archives, or search results.
- **Schema expansion** — add `ItemList` schema to best-of and top-X pages (list items with order, name, URL); add `FAQPage` only to pages that actually render FAQ blocks.
- **Cron pipeline activation** (queued on Maven handoff) — events scan + venue health + accuracy scan wired. Content freshness signals require pages to be touched regularly.

**Owner:** Remy for scripted work, Maven for cron activation, James for GSC access.

### Stage 2 — Five Flagship Pillar Hubs (Week 2–4)

**Goal:** Ship the five planning hubs that carry the brand's weight. Flagship quality. No thin listicle smell.

Order of publish (revised from feedback, based on §2 refinements):

1. **`/explore/things-to-do-mornington-peninsula/`** — the Things-to-Do hub.
2. **`/spa/mornington-peninsula-hot-springs-guide/`** — the Hot Springs hub (existing journal article gets promoted/rewritten).
3. **`/wine/best-wineries-mornington-peninsula/`** — the Wineries hub (complement to best-cellar-doors).
4. **`/stay/where-to-stay-mornington-peninsula/`** — the Stay hub (upgrade from best-accommodation, which stays as a support page).
5. **`/escape/mornington-peninsula-itinerary/`** — the 2-day itinerary hub.

Each hub is a **flagship** page:
- 3,000–5,000 words, but editorial not bloated
- Opens with a direct answer (what someone should do / where they should go / what the editor recommends)
- Editor's take in voice (1–2 paragraphs of opinion)
- Best-for categories (romance, families, rainy day, winery lunch, etc.)
- Map or geographic context
- Comparison table / quick-picks section
- Local notes no tourism board would publish
- Practical info (drive times, price bands, booking windows)
- "Related" blocks linking to every sibling hub and 4–8 spokes
- ItemList + Article schema
- Hero image that's either first-party or clearly licensed with credit
- Last-updated stamp visible in the article meta
- Author byline pointing at an author bio page

**Capacity note:** Five 5,000-word pieces of flagship quality in two weeks is ~2,500 words/day of production. Achievable for James in morning blocks but only if Stage 0 audit produces clean briefs. Otherwise bleeds into Week 5.

### Stage 3 — Priority Spokes (Week 4–8)

**Goal:** 15–20 support pages under the five hubs. Each one targets a specific intent, each one funnels authority up to the hub.

Priority order, grouped by ROI:

**Highest ROI — bridging queries (editorial × commercial):**
1. Best accommodation near Mornington Peninsula Hot Springs
2. Winery accommodation Mornington Peninsula
3. Romantic accommodation Mornington Peninsula
4. Boutique accommodation Mornington Peninsula
5. Pet-friendly accommodation Mornington Peninsula
6. Best winery lunch Mornington Peninsula
7. Best winery restaurants Mornington Peninsula

**Medium ROI — seasonal + mode pages:**
8. Things to do in Mornington Peninsula in winter (refresh existing)
9. Things to do in Mornington Peninsula in autumn (refresh existing)
10. Things to do in Mornington Peninsula for couples
11. Free things to do in Mornington Peninsula (refresh existing)
12. Day trip to Mornington Peninsula from Melbourne (refresh existing)
13. Mornington Peninsula with kids (refresh existing)
14. Dog-friendly Mornington Peninsula (refresh existing)

**Evergreen cluster strength:**
15. Best wineries in Red Hill
16. Kid-friendly wineries Mornington Peninsula
17. Romantic wineries Mornington Peninsula
18. Hot springs day trip from Melbourne
19. What to do after Mornington Peninsula Hot Springs
20. Best time to visit Mornington Peninsula Hot Springs

Each spoke:
- 1,500–2,500 words
- Real specificity (drive times, price bands, opening hours, booking windows)
- 3–6 internal links up to hub + sibling spokes + cross-cluster bridge
- ItemList schema where appropriate
- First-party photography where possible; licensed where not, with credit

### Stage 4 — Geographic Depth (Week 8–12)

**Goal:** Town/area pages with real substance. Nine towns, each a planning-grade page.

Priority order (by search volume + commercial density, tightening the 9 named towns into the ones that matter):

1. **Red Hill** (winery density, hinterland, highest-intent commercial)
2. **Sorrento** (coastal, literary festival, high-intent planning)
3. **Mornington** (biggest town, biggest head volume)
4. **Flinders** (editorial darling, cellar doors, quiet-luxury)
5. **Rye** (mid-market, beach, families)
6. **Dromana / Rosebud** (consolidated — beach, accommodation, bay access)
7. **Portsea** (high-end, back beaches)
8. **Main Ridge** (wineries, hinterland depth)
9. **Blairgowrie** (quiet coastal)

Each town page must answer (in this order):
- What it's best for (one-sentence positioning)
- When to go (seasonal)
- Where to stay (3–6 recommendations with price bands)
- Where to eat (3–6 recommendations)
- Top things to do (3–6 experiences)
- Who it suits (couples / families / solo)
- How to get there (drive time, signature route)
- Nearby options (adjacent towns, easy add-ons)
- Related itineraries

**This is where the cron pipeline pays off** — town pages are where weekly/monthly freshness signals (new opening, chef moved, road closure) compound into durable authority.

### Stage 5 — Linkable Assets & Outreach (Week 12–16)

**Goal:** Build things other people want to link to, then ask them to link to you.

Linkable assets to create:
- **Interactive Peninsula map** — Mapbox-based, filterable by category (winery / cellar door / hot springs / walk / beach / best restaurant). Peninsula doesn't have a good one; this becomes the default "where's X" link.
- **Printable weekend itinerary PDF** — lead magnet for newsletter, also a linkable "free guide" asset.
- **"Best winery lunch map"** — single-purpose, deeply linkable (per feedback).
- **Seasonal round-ups** — "Autumn 2026 Peninsula Guide," "Winter 2026 Guide" — shippable every quarter, evergreen-refreshable.
- **Editorial standards + author pages** — build author bios for anyone contributing, visible standards page (how we test venues, what "worth the drive" means). Signals "realness" to both readers and Google.

Outreach targets:
- Local wineries, stays, tour operators, venues featured on the site → "press/featured" backlinks
- Local publications (Mornington News, Bayside News, Broadsheet Mornington Peninsula if it exists, Visit Mornington Peninsula) → seasonal guide pitches
- Melbourne creator network (IG/TikTok) → cross-linking relationships; local perspective matters more than DR
- Not chasing generic guest posts or DR-for-sale link schemes

### Stage 6 — Measurement & Iteration (Ongoing from Week 4)

**Goal:** Know what's working, double down on the winners, revise the stalls.

Monthly cadence:
- GSC review — top movers (up and down), query drift, new impressions
- Rank tracking on 25 priority keywords (pick the set during Stage 0, track consistently)
- Page-level CTR analysis — identify pages with high impressions but low CTR → title/meta refresh
- Content refresh cycle — every published piece gets a last-updated review every 90 days. Real updates only (no fake date bumps).
- Cross-cluster link audit — ensure new spokes are linking back to hubs and across clusters
- Outreach tracking — who was pitched, who linked, what asset got the link

Quarterly cadence:
- Full content audit — which pages have died, which need rewriting, which should be merged or deleted
- Competitor SERP review on 10 priority terms
- New-cluster exploration — what's emerging in Peninsula search behaviour (festivals, seasonality, new openings)

---

## 5. Cross-cutting principles that thread every stage

### The realness test

Before any page ships, it passes three checks:

1. **Would a local read this and think "yes, that's right"?** (Not "yes, that's plausible.")
2. **Is there at least one detail here that only a real visitor or local would know?**
3. **If you stripped the photography and the layout, would the copy still sound like a human who lives here?**

If any answer is no, the page is generic. Rewrite.

### The interlinking rule

- Every hub links to every other hub (5 × 5 = 10 pillar-to-pillar links).
- Every hub links to every spoke it covers.
- Every spoke links up to its hub, across to 2 sibling spokes, and to at least 1 cross-cluster spoke that serves the same user.
- Every venue / experience / article in a content collection declares its related items in JSON, and the templates render those links automatically.

Mechanical, not creative. Done via Astro content collection references (`relatedVenues`, `relatedExperiences`, `relatedArticles` — already in the schema).

### The author-and-date markers

Every page of substance has:
- Visible author byline (James, until additional editors join)
- First-published date
- Last-updated date (when genuinely updated, not vanity-bumped)
- Credit on every image (first-party, venue media kit, licensed stock)

These are `E-E-A-T` signals Google reads, and readers trust.

---

## 6. What this plan gives up

- **Short-term speed.** Stage 0–1 is audit + instrumentation, not content. That's 2 weeks before the first flagship ships. A site pushing "15 articles a week" will look busier in the first month. It will also be thinner and lose in month 6.
- **Head-term accommodation rankings.** We're explicitly NOT trying to outrank Booking.com on "accommodation mornington peninsula." We're playing the middle-of-funnel. The trade is: slower peak commercial volume, higher eventual margin per visit because the intent is qualified by planning context.
- **Geographic breadth.** We're doing 9 towns, not 30 suburbs. Thin suburb pages are the failure mode the feedback rightly flags.
- **Tag sprawl.** We're not adding `/tags/*` or `/topic/*` archives. They create index bloat and authority dilution.
- **AI-assisted thin content.** Every flagship and spoke passes the realness test. If capacity is a constraint, we publish fewer pages slower, not thinner pages faster.

---

## 7. Decisions for James before Stage 0 starts

1. **GSC access.** Is Peninsula Insider already verified in Google Search Console? If not, we need to verify the property (DNS TXT record or HTML meta) before anything else.
2. **The "first 25 pages" offer.** The feedback source offered to map the first 25 pages in priority order with target keyword, intent, URL slug, page type, internal links. That's gold for Stage 2–3 briefs. Accept that offer? I'd say yes — it's operational layer on top of this strategic layer, and they're the one looking at the SpyFu data directly.
3. **Hot Springs URL strategy.** Promote existing `/journal/mornington-peninsula-hot-springs-guide/` to `/spa/mornington-peninsula-hot-springs-guide/` as hub, with 301 from the journal URL? Or build new and leave the old article as a spoke?
4. **Capacity allocation.** Stage 2 is the single biggest content-production sprint (5 flagship hubs in 2 weeks = ~2,500 words/day of flagship-grade work). Is that realistic given day-job + health? If not, we stretch Stage 2 to 4 weeks and accept Stage 3 shifting out.
5. **Interactive map in Stage 5.** Mapbox map is the biggest linkable-asset play but it adds a JS island and dependency. Budget call.
6. **V2 rebuild timing.** Memory says V2 is ~75–80% complete. Shipping a full cluster strategy on V1 and then migrating risks losing signal in the cutover. Worth sequencing: finalise V2 first? Ship SEO work on V1 now and migrate carefully later? Not a blocker for Stage 0–1 (audit + technical work applies to both), but needs a call before Stage 2 content lands.

---

## 8. First concrete next action

Run Stage 0 in a half-day block:
1. Verify GSC access (or complete verification).
2. I produce the live content audit as a structured JSON → CSV, one row per page with: url, intent, cluster, status, target keyword, inbound-link-count, last-verified date.
3. I produce the keyword-to-page map matching the feedback's cluster lists against what exists.
4. I produce the gap list — keywords with no page, pages with no keyword.

That's a ~4 hour Remy job (mostly scripted against the content collections), and it's the foundation every later stage depends on.

Say go and I'll run it.

---

*Prepared 2026-04-15 by Remy. Strategic response to external SEO feedback. Filed under `docs/` per the source-of-truth rule. When this plan is approved, it supersedes the SEO priorities in `HANDOVER-CLAUDE.md` §3 and the relevant sections of `docs/strategic-review-2026-04-09.md`.*
