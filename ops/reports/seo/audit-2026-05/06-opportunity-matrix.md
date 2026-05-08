# 06, Opportunity matrix

Date: 2026-05-08
Scope: every actionable opportunity surfaced by sections 01 through 05 of this audit, scored and ranked. Items already shipped (the four active experiments from 2026-05-04 and 2026-05-05) are excluded; items already in `backlog.md` are included so the matrix is the single ranked view.

## Scoring scale

Each opportunity is scored on five dimensions, 1 to 5.

| Axis | 1 | 5 |
|---|---|---|
| **Impact** | Marginal traffic or conversion lift | Step-change in indexed pages, clicks, or conversion |
| **Effort** | Multi-week build, requires coordination | Under one hour, single file edit |
| **Speed** | Measurable beyond 90 days | Measurable inside 14 days |
| **Commercial** | Pure traffic, no direct revenue lever | Direct revenue lever (Pass / Operator / Partner) |
| **Confidence** | Speculative; needs an experiment to learn | Strong evidence in this audit or prior experiments |

**Composite score** = (Impact × 2) + Effort + Speed + Commercial + Confidence. Impact double-weighted because we still pull on a small base. Higher is better. Items tied on composite are sub-ranked by Confidence then Effort.

## The matrix

Sorted high-to-low. Source column maps each item back to the audit section that surfaced it.

| # | Opportunity | Impact | Effort | Speed | Commercial | Confidence | Score | Source | File:line / artefact |
|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | Render `pressMentions` and won-awards from `data.authority` on `VenueDetailTemplate`. Data is structured, render is missing. Lifts E-E-A-T trust signals across 134 venue pages in one PR. | 5 | 4 | 4 | 3 | 5 | **26** | 05 | `next/src/components/VenueDetailTemplate.astro` (lines ~25-30) |
| 2 | Fix the `v4FooterAbout` Pass link from `/preview-insider-plans/` to `/pass/`. Plus a one-line edit in masthead `Subscribe` href to point at `/newsletter/` instead of `/#newsletter`. Two trivial edits, structural orphans become reachable. | 5 | 5 | 5 | 5 | 5 | **30** | 04 | `next/src/lib/v4-nav.ts:470`, `next/src/components/Masthead.astro:58` |
| 3 | Add Awards to masthead More menu and Footer About column. The cluster is structurally orphaned: zero internal links from any indexable surface. | 5 | 5 | 4 | 4 | 5 | **28** | 02 §7, 04 §2.4 | `next/src/lib/nav.ts:55-66`, `next/src/lib/v4-nav.ts:465-474` |
| 4 | Replicate experiment 2026-05-05-02 (related-articles seeding, limit 3→6, explicit refs) on the `/explore/` walks template. 32 unindexed walk pages match the same pattern that just unblocked 15 journal pages. | 5 | 4 | 4 | 2 | 5 | **25** | 02 §2.5, §6 | `next/src/pages/explore/[slug].astro`, walks article markdowns |
| 5 | Convert journal article + place + venue hero from CSS `background-image` to `<img>` element. Single highest-leverage technical-SEO fix; unblocks Google Images, image-search ranking, Discover eligibility on 200+ pages. | 5 | 3 | 3 | 2 | 5 | **23** | 01 §5 | `next/src/lib/editorial.ts:360-365`, `next/src/pages/journal/[slug].astro:165`, `next/src/components/VenueDetailTemplate.astro`, `next/src/components/PlaceDetailTemplate.astro` |
| 6 | Add `Product` + `Offer` JSON-LD to `/pass/` (three tiers: Reader, Insider, Founders). Currently zero rich-result eligibility on the commercial conversion surface. | 4 | 4 | 3 | 5 | 5 | **25** | 01 §2, 04 §2.1 | `next/src/pages/pass.astro` |
| 7 | Mount a `PassCallout` component in `journal/[slug].astro` between `<Content />` and `<ClusterLinks>`. First editorial-to-Pass body link path. Conditional render on relevant article formats. | 4 | 4 | 3 | 5 | 4 | **23** | 04 §2.1, §3 | new component, `next/src/pages/journal/[slug].astro:188` |
| 8 | Render `v4FooterNiche` (already defined) in `Footer.astro`. Adds a global "Special interests" column linking golf, spa, fishing, boating, dog-friendly, weddings, corporate-events. Free crawl signal to the niche lanes. | 4 | 5 | 4 | 2 | 5 | **23** | 01 §4 | `next/src/lib/v4-nav.ts:455-463` (defined), `next/src/components/Footer.astro:34-65` (render missing) |
| 9 | Migrate `dog-friendly-mornington-peninsula.astro` (hand-coded) into the article collection. Currently has hardcoded no-slash canonical, generic OG image, 17 em-dashes, schema/canonical mismatch. The site's #1 query magnet is structurally weakest of all journal pages. | 4 | 3 | 3 | 2 | 5 | **20** | 01 §2, §0 | delete `pages/journal/dog-friendly-mornington-peninsula.astro`; create `content/articles/dog-friendly-mornington-peninsula.md` |
| 10 | Add `ItemList` to `/wine/best-cellar-doors/` (Eat best-restaurants peer already has it). Plus `CollectionPage` + `ItemList` on `/wine/`, `/journal/`, `/whats-on/` hubs (Eat and Places already have them). | 4 | 4 | 3 | 3 | 5 | **23** | 01 §2 | `next/src/pages/wine/best-cellar-doors.astro`, three index files |
| 11 | Add `psi-pull.mjs` to the daily SEO script suite, weekly cron, against 7 representative URLs, with CrUX project enabled. Without this every monthly audit hits the 429 quota wall. | 3 | 3 | 2 | 1 | 5 | **17** | 01 §1 | new `ops/scripts/seo/psi-pull.mjs` |
| 12 | Add a small "Is this your venue? Claim it." link to `VenueDetailTemplate.astro` near the editor note. First venue-page → operator-claim path. Polite text link, not a banner. | 4 | 5 | 4 | 5 | 4 | **26** | 04 §2.2 | `next/src/components/VenueDetailTemplate.astro` |
| 13 | Build the Featured-by-PI badge program. Self-serve `/badge/{slug}/` endpoint returning an SVG; email outreach to 134 operators. Cleanest sustainable inbound-link layer. | 5 | 2 | 2 | 4 | 4 | **22** | 05 §4 | new endpoint, manual outreach |
| 14 | "Stays Near Peninsula Hot Springs" article. Targets "accommodation near peninsula hot springs" (19 impr/wk, position 67.8). Closest existing page is unindexed. High-impression query with no targeted page. | 4 | 3 | 3 | 4 | 4 | **22** | 02 §4 #1 | new `next/src/content/articles/stays-near-peninsula-hot-springs.md` |
| 15 | Rewrite `/eat/best-restaurants/` for 2026 freshness, FAQ schema, more depth, beat Broadsheet's Dec 2025 update. Currently page-5 ranking on a primary commercial query. | 4 | 3 | 2 | 4 | 4 | **21** | 02 §4 #5, 03 §5 | `next/src/pages/eat/best-restaurants.astro`, supporting article |
| 16 | Snippet rewrite on `/journal/the-chardonnay-case/`. 71+55 combined impr at position 5.6, 0% CTR. Top-of-page-1 with zero clicks is a textbook snippet failure. | 3 | 5 | 5 | 2 | 5 | **23** | backlog | `next/src/content/articles/the-chardonnay-case.mdx` |
| 17 | Snippet rewrite on `/journal/the-pub-guide/`. 65 impr, 0% CTR, position 8.8. Same pattern as chardonnay-case but lower volume. | 3 | 5 | 5 | 2 | 5 | **23** | backlog | `next/src/content/articles/the-pub-guide.md` |
| 18 | Fix `WebSite.SearchAction` target from `/journal?q=` (which doesn't render results) to `/search/?q={search_term_string}`. Sitelinks search box behaviour when Google awards one. | 3 | 5 | 4 | 1 | 5 | **21** | 01 §2 | `next/src/pages/index.astro:79-80` |
| 19 | De-duplicate the journal sitemap entry for `free-things-to-do-mornington-peninsula`. Already in backlog. | 2 | 5 | 5 | 1 | 5 | **20** | 01 §6, backlog | `next/src/pages/sitemap.xml.ts` |
| 20 | Add `image` field to Restaurant/Cafe/Winery JSON-LD on `/eat/[slug]/`. Currently no image at all in venue schema. | 3 | 5 | 4 | 2 | 5 | **22** | 01 §2 | `next/src/pages/eat/[slug].astro:88-107` |
| 21 | Add `image` field to TouristDestination JSON-LD on `/places/[slug]/`. | 3 | 5 | 4 | 2 | 5 | **22** | 01 §2 | `next/src/pages/places/[slug].astro:297-308` |
| 22 | Compute `lastmod` from real publish/update dates on hub pages instead of `TODAY` default. Hub URLs aren't actually changing daily; the signal is mildly noisy. | 2 | 4 | 3 | 1 | 5 | **17** | 01 §6, §8 #20 | `next/src/pages/sitemap.xml.ts:6` |
| 23 | "Build this as your itinerary →" CTA on weekend-shape and escape-shape articles. First inbound link path for `/itinerary/`. | 3 | 4 | 3 | 4 | 3 | **20** | 04 §3 | `next/src/pages/journal/[slug].astro` |
| 24 | "Looking for something specific? Ask The Insider →" 1-line link at end of `<Content />` block. First editorial → /ask/ link. | 3 | 5 | 3 | 3 | 3 | **20** | 04 §2.3 | `next/src/pages/journal/[slug].astro` |
| 25 | Internal-linking sweep, 20 specific source-page → target-page pairs (the second pass after experiment 2026-05-05-02). Pushes equity into 20 specific Discovered URLs not yet covered. | 4 | 3 | 3 | 1 | 5 | **19** | 02 §6 | 20 article markdown files |
| 26 | "Best Walks Mornington Peninsula" graded walks hub modelled on Australian Traveller's structure. PI's `/explore/` does not yet have a definitive walks hub; AllTrails owns trail-data, but editorial ranking is contestable. | 4 | 2 | 2 | 2 | 4 | **18** | 03 §5 #6, 02 §4 #11 | new spine article, plus refresh of 32 unindexed walk pages |
| 27 | Refresh `/journal/mornington-peninsula-itinerary/` to be the canonical itinerary spine. Consolidate `mornington-peninsula-day-trip` and `the-four-hour-peninsula` into 301-redirects to it. | 3 | 3 | 3 | 2 | 4 | **18** | 02 §5 | three article markdowns |
| 28 | Single 2,500-word `/escape/day-trip-mornington-peninsula/` editorial day plan. Targets "mornington peninsula day trip" (the most contestable of the 8 priority queries). | 4 | 2 | 2 | 3 | 4 | **19** | 03 §5 #3 | new escape page |
| 29 | "Save all to itinerary" + "Build a 2-day plan" CTA after concierge response. Conversion link out of the chat surface. | 3 | 4 | 3 | 4 | 3 | **20** | 04 §2.3 | `next/src/pages/ask.astro:425-428` |
| 30 | `Person` JSON-LD on `/about/` for the publisher. Plus `Organization` + `ContactPage` on `/contact/`. Plus `lastReviewed` on `/methodology/`. Three small E-E-A-T schema additions. | 3 | 4 | 3 | 1 | 4 | **18** | 05 §3 | `pages/about.astro`, `pages/contact.astro`, `pages/methodology.astro` |
| 31 | Generate 800w + 1600w renditions of editorial hero images. Mean hero is ~280KB; 2-rendition `<picture>` source set halves mobile transfer. | 4 | 2 | 2 | 1 | 4 | **17** | 01 §5, §8 #14 | new build script + template updates |
| 32 | Add a "Special interests" `WebVitalsReporter.astro` (75 lines of `web-vitals` JS) reporting LCP/INP/CLS to Supabase. Site is below CrUX threshold; this is the bridge until traffic crosses it. | 2 | 3 | 2 | 1 | 4 | **14** | 01 §1, §8 #19 | new component + Supabase RPC |
| 33 | Quarterly "What's open / what's closed on the Peninsula this season" press release. PI's verification cadence already produces the data; standardise into a press format and seed local press list. | 4 | 4 | 2 | 3 | 3 | **20** | 05 §4 #14 | editorial calendar + press list |
| 34 | "Cellar-Door Price Index" (data piece). Aggregate `priceBand` data across all winery pages into a single canonical resource + downloadable spreadsheet. Citation-bait for wine writers. | 4 | 2 | 2 | 2 | 3 | **17** | 05 §4 #11 | new article + data export |
| 35 | "Best Dog Beaches Map" (data + chart). Aggregate beach data into a single canonical visual + table. Pet sites and council have no equivalent. | 4 | 2 | 2 | 2 | 3 | **17** | 05 §4 #12 | new article + chart |
| 36 | Add at least one named editor entry to `next/src/content/authors/`. Optional: keep house byline editorially but acknowledge a real editor. Lifts the weakest E-E-A-T axis (bio depth, currently 0.1/3.0). | 3 | 3 | 3 | 1 | 3 | **16** | 05 §1, §2.4 | new author file + about update |
| 37 | Add `lastVerified` rendering to `PlaceDetailTemplate.astro` (parity with VenueDetailTemplate). Place hubs currently show no freshness date. | 2 | 5 | 3 | 1 | 5 | **18** | 05 §2.5 | `next/src/components/PlaceDetailTemplate.astro` |
| 38 | Replace `Organization.logo` with a real square logo (≥112×112px). Currently a hero photograph. Required for News rich result eligibility eventually. | 2 | 3 | 1 | 1 | 4 | **13** | 01 §2, §8 #15 | new `/public/images/logo.png`, `BaseLayout.astro:136`, `schema.ts:5` |
| 39 | Lazy-mount lower category sections on `/whats-on/`. Hub renders 90+ event cards inline (460KB HTML). | 3 | 3 | 2 | 1 | 3 | **14** | 01 §1 | `next/src/pages/whats-on/index.astro:560-600` |
| 40 | Audit + investigate the address-string queries (4 of top 10 by impressions). Likely legacy directory pages still indexed. Either noindex or 410. | 3 | 3 | 4 | 1 | 4 | **17** | backlog, 02 §5 | TBD by investigation |
| 41 | Build `/whats-on/this-weekend/` permanent page that auto-rebuilds weekly from the dispatch. Targets "mornington peninsula weekend" (a query Google reads as event-intent). | 4 | 2 | 2 | 2 | 3 | **17** | 03 §5 #5 | new astro page + dispatch integration |
| 42 | Submit `sitemap.xml` to GSC (already in backlog as James-action). Plus submit 20 priority URLs across two days. | 2 | 5 | 4 | 1 | 5 | **18** | backlog | manual GSC action |
| 43 | Quarterly internal linking audit on PRIORITY_URLS. Each priority URL should be linked from ≥3 other pages. Already in backlog as a one-off; promote to quarterly. | 3 | 4 | 3 | 1 | 4 | **18** | backlog | code-level audit |
| 44 | Add FAQ blocks to top-10-by-impressions pages with FAQPage schema. Drives long-tail surface and rich-result eligibility on commercial queries. | 3 | 3 | 3 | 2 | 4 | **18** | backlog (P2) | various article pages |
| 45 | Submit to Bing Webmaster Tools. Mirror sitemap there. Marginal share, low effort. | 1 | 5 | 4 | 1 | 5 | **15** | backlog (P1) | one-time setup |

## What this matrix excludes deliberately

- **Items currently in flight as experiments**, items 2026-05-04-01 through 2026-05-05-03 are awaiting their measurement dates (May 12 and May 19) and are tracked in `experiments.md`, not here.
- **Items with cost > 1 week and < high confidence**, the audit recommends running short experiments first to learn before committing to the larger build. Examples: building `/insiders-30/` 2026 edition, full Awards-as-citation-bait release.
- **Items the project memory flags as Iceberg**, e.g. programmatic suburb × intent pages. Those are out of scope until editorial credibility compounds further.

## Reading the matrix

The top 10 items by composite score are the next-30-days slate. Items 11-25 are next-60. Items 26+ are next-90 or later. The 30/60/90 plan in `07-30-60-90.md` operationalises these into named experiments with measurement dates.

## Diff vs prior audit

This is the first monthly audit. There is no prior audit to diff against. Future audits open with a "What changed since last audit" block in this file.

---

End of file.
