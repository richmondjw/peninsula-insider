# SEO experiments — Peninsula Insider

Every shipped SEO change is logged here as a hypothesis-driven experiment. Wins and losses both kept; failed experiments are as informative as successful ones.

## Format

```
## YYYY-MM-DD — short title
- **PR**: link
- **Pages affected**: list
- **Hypothesis**: specific, measurable. "If we do X then metric Y will move from A to B by date Z."
- **Mechanism**: why we expect it to work, in one sentence.
- **Measurement**: which line in `daily-log.md` we'll read on date Z to confirm or refute.
- **Outcome (filled later)**: what actually happened, hypothesis confirmed/refuted, what we learned.
```

## Active experiments

### PI-SEARCH-2026-10-01-DAYTRIP — Distinct route intent and safe landing

- **Status**: Prepared in `codex/pi-search-growth-20261001`; not released or recrawled. No SEO result claimed.
- **Owner / reviewer**: PI engineering owns the release and measurement; PI editorial and the independent release reviewer must approve the factual, safety and landing changes.
- **Pages affected**: `/journal/mornington-peninsula-day-trip/` and `/explore/day-trips/`.
- **Baseline**: Live GSC final web window 2026-08-31 to 2026-09-27; neither page appeared in privacy-filtered AU page rows. URL Inspection last showed the article crawled but not indexed and the hub discovered but not indexed. Exact property totals are retained in the private strategy receipt. Missing AU page rows are not proof of zero demand or an exact page-level impression count.
- **Hypothesis**: Clearer distinction between one timed route and five alternative routes, reciprocal contextual links and safer current copy will make the pages more useful and easier to interpret. Indexation and relevant AU impressions may improve after recrawl; no volume forecast is asserted.
- **Bounded change**: Reciprocal body links; route section anchors and accurate list schema; trailing-slash article schema URL; removal of wine-then-drive wording, price symbols and unsupported no-booking assurances. No new article or paid promotion in this experiment.
- **Metric / source**: URL Inspection verdict and canonical for both URLs; fixed AU GSC page/query cohorts in complete equal 28-day windows after verified deployment and recrawl. Use the existing `pi-seo-daily-pull` and Monday digest; do not sum privacy-filtered rows to get property totals.
- **Evaluation date**: First complete 28-day post-recrawl window, no earlier than 2026-11-02. If recrawl is later, move the comparison window forward and record that fact.
- **Rollback**: Revert only these page changes through the normal PI release process if factual QA fails or the page experience regresses.
- **Decision / next action**: INVESTIGATE. Editorial review, build and live release receipt are pending; then request/observe recrawl. Independent reviewer and final outcome are pending.

### PI-SEARCH-2026-10-01-ADS — Australia planning-intent pilot

- **Status**: GATED. Account draft at `ops/campaigns/search-pilot-2026-10/pilot.json`; no campaign launched and no Ads spend.
- **Owner / reviewers**: Ads account owner operates; James approves exact spend; PI editorial, engineering and analytics approve their respective launch gates.
- **Baseline / hypothesis**: No live Google Ads or GA4 account receipt was available. Test whether bounded Australian planning-intent visits lead to a positively receipted `newsletter_signup_succeeded` or a meaningful `save_add`/`trip_add` action.
- **Bounded change**: One Search campaign, at most A$300 billed in an authorised month, two ad groups run sequentially after their own landing gates. See the campaign draft for keywords, negatives, copy, locations and pause rules.
- **Metric / source**: Google Ads billed cost, clicks and reviewed search-term relevance; consented GA4 positive signup and planning-action events. Booking outbound is a handoff, not a reservation.
- **Evaluation**: A$75 tracking check; A$150 relevance check; A$300 or 30-day decision. Pause immediately for broken measurement, false claims, wrong geography or unauthorised billed spend.
- **Rollback**: Pause the campaign. Keep unused allocation unspent.
- **Decision / next action**: INVESTIGATE. Obtain editorial, landing, analytics and account preview receipts, then James's exact spend authorisation before activation.

### 2026-05-17-01 — CTR snippet rewrite on /wine/ hub

- **Status**: shipped to worktree branch 2026-05-17. Awaiting deploy.
- **PR**: pending
- **Pages affected**: `/wine/` (the wine hub, single page)
- **Baseline (May 16 pull, 28d window Apr 17–May 14)**: 813 impressions, 1 click, **0.12% CTR**, average position 25.5. Page is the #1 page by impressions site-wide that is not converting. Single click came from the query "pt leo estate" (1 impression at pos 6).
- **Query mix diagnosis (top queries this page ranks for)**:
  - **~170 impressions on street-address searches** ("34 western parade point leo vic 3916" 78 impr pos 32, "20 junction road merricks north vic 3926" 52 impr pos 36, "42 brasser avenue dromana vic 3936" 39 impr pos 32). Zero clicks — users want maps, not a wine hub. **No snippet can fix these** (separate noindex/structural work needed).
  - **~50 impressions on specific winery name searches** ("main ridge winery", "merricks winery", "kerri greens winery", "flinders winery", "crittenden estate", etc) at positions 50–100. These should land on venue pages, not the hub.
  - **~20 impressions on genuine hub-intent queries** ("best wineries mornington peninsula" variants, "best mornington peninsula pinot noir", "cellar doors"). One query "best wineries in mornington peninsula" ranks position 1 but only 1 impression in 28d.
- **Hypothesis**: rewriting title + meta to target the genuine hub-intent queries will lift CTR from 0.12% to ≥1.5% within 14 days. Specifically: by 2026-05-31, this page earns ≥5 clicks per 7-day window with similar impression volume (~200/week). Address-query CTR will remain 0% (out of scope).
- **Mechanism**: old title "Best Wineries Mornington Peninsula · Peninsula Insider" was generic, with brand suffix consuming character budget. Old meta was 200 chars (Google truncates at ~155). New title front-loads "Cellar Doors" (a more specific phrase used by intent-led searchers, distinct from generic "wineries"), adds year freshness signal, drops the brand suffix. New meta has editorial voice ("worth the appointment", "Pinot worth the cellar"), promises specific value props, fits in 148 chars.
- **Files changed**: `next/src/pages/wine/index.astro` lines 91–92 (BaseLayout title + description). Also bumped `modifiedTime` to 2026-05-17 to signal freshness.
- **Verification** (2026-05-17): rebuilt locally — 1356 pages, no errors. New title `Best Cellar Doors on the Mornington Peninsula 2026 Guide` (56 chars) and meta (148 chars) confirmed in `dist/wine/index.html`.
- **Measurement**: read `/wine/` page-level CTR in `daily-log.md` on 2026-05-24 (7d) and 2026-05-31 (14d). Headline metric: 7d clicks on `/wine/` in the CTR opportunity pages table.
- **Followups not in this experiment**: address-query indexing (separate problem — likely the wine hub appears for these because it contains venue addresses; may need a way to exclude or move address content to venue pages). Specific winery names ranking the hub instead of venue pages is also a separate indexation/internal-linking issue.
- **Outcome (filled later)**: _pending — measure 2026-05-24 and 2026-05-31_

### 2026-05-05-01 — Push the 5 unindexed top-level hubs into the index

- **Status**: shipped to worktree branch 2026-05-05.
- **PR**: pending push
- **Pages affected**: `/dog-friendly/`, `/whats-on/`, `/corporate-events/`, `/ask/`, `/golf/` (also bumps `/fishing/` priority but that hub is already indexed).
- **Baseline (2026-05-05 inspection of all 418 known URLs)**: 4 of these 5 hubs have `lastCrawlTime: never`. Despite being internally linked from 500+ pages each (via masthead/footer), URL Inspection reports `referringUrls: 0 shown`. Google has not committed crawl budget to them. Only `/fishing/` is indexed (PASS).
- **Hypothesis**: bumping these hubs to `priority=1.0` in the sitemap (alongside the homepage), strengthening contextual body links from indexed sister pages, and James submitting them for manual reindexing in GSC will get at least 4 of the 5 to PASS within 14 days. Specifically: by 2026-05-19, indexed hub count rises from 1/6 (only fishing) to ≥5/6.
- **Mechanism**: nav/footer links carry less crawl weight than contextual body links. Combined with low sitemap priority signal, Google deprioritised these URLs even though they are reachable. The fix is signal stacking: (1) bump sitemap priority from 0.9 to 1.0 for these specific hubs, (2) add a substantive contextual link from the high-impression dog-friendly journal article body to the `/dog-friendly/` hub (the hub at the bottom of the article in editorial voice, not just a nav link), (3) James submits each hub for manual reindexing via GSC URL Inspection.
- **Files changed**: `next/src/pages/sitemap.xml.ts` (TOP_HUBS priority bump), `next/src/pages/journal/dog-friendly-mornington-peninsula.astro` (contextual hub CTA paragraph + related-articles aside).
- **Verification** (2026-05-05): rebuilt locally — 1052 pages, no errors. Sitemap shows priority=1.0 for /dog-friendly/, /whats-on/, /corporate-events/, /fishing/, /golf/, /ask/. Journal article includes contextual link to /dog-friendly/ hub.
- **Manual action for James (post-deploy)**: in GSC, submit `https://peninsulainsider.com.au/dog-friendly/`, `/whats-on/`, `/corporate-events/`, `/ask/`, `/golf/` via URL Inspection → Request Indexing.
- **Measurement**: re-run `node ops/scripts/seo/discover-unindexed.mjs` on 2026-05-12 (7d) and 2026-05-19 (14d). Headline metric: hub-page indexation status (PASS vs Discovered).
- **Outcome (filled later)**: _pending — measure 2026-05-12 and 2026-05-19_

### 2026-05-05-02 — Internal linking sweep on /journal/

- **Status**: shipped to worktree branch 2026-05-05.
- **PR**: pending push
- **Pages affected**: 4 high-impression indexed journal articles act as sources; 15 unindexed sibling articles benefit as link targets.
- **Baseline (2026-05-05 inspection)**: 58 of 110 journal articles are "Discovered – currently not indexed". `[slug].astro` already auto-renders 3 related articles via `pickRelatedArticles`, but the limit was 3 and explicit ref lists were empty for most articles, so unindexed siblings were rarely surfaced.
- **Hypothesis**: bumping the auto-related limit from 3 to 6, plus explicitly populating `relatedArticles` arrays on 3 high-impression source articles to point at unindexed siblings, will get at least 8 of the 15 explicitly-linked unindexed articles to PASS within 14 days. Specifically: by 2026-05-19, the unindexed journal count drops from 58 to ≤50.
- **Mechanism**: link equity flows from indexed to unindexed siblings via the related-articles rail. The pub-guide and where-to-eat-mornington-peninsula are visible in search and earning impressions; their related rails are now seeded with the unindexed seafood, brunch, hatted-restaurants, pub-crawl, and waterfront articles. The cellar-door-short-list is similarly seeded with the unindexed wine articles.
- **Files changed**: `next/src/pages/journal/[slug].astro` (limit 3 → 6), `next/src/content/articles/the-pub-guide.md` (+6 relatedArticles refs), `next/src/content/articles/the-cellar-door-short-list.md` (+6 refs), `next/src/content/articles/where-to-eat-mornington-peninsula.mdx` (+6 refs). Plus the manually-curated aside on `dog-friendly-mornington-peninsula.astro` from experiment 2026-05-05-01 above (which links 7 unindexed dog-friendly siblings).
- **Verification** (2026-05-05): rebuilt locally — pub-guide HTML now includes links to the-pub-crawl, where-to-eat-without-a-booking, the-seafood-list, waterfront-restaurants-mornington-peninsula, and others.
- **Measurement**: re-run `discover-unindexed.mjs` on 2026-05-12 and 2026-05-19. Headline metric: how many of the 15 explicitly-linked unindexed articles flip to PASS.
- **Outcome (filled later)**: _pending — measure 2026-05-12 and 2026-05-19_

### 2026-05-05-03 — Stop /eat/ vs /wine/ winery duplicates competing

- **Status**: shipped to worktree branch 2026-05-05.
- **PR**: pending push
- **Pages affected**: every venue with `type: "winery"` — currently 25+ wineries each with /eat/{slug}/ and /wine/{slug}/ URLs both indexable. Confirmed live duplicates: kerri-greens, polperro. Confirmed alternate-canonical (Google already picked /wine/): elan-vineyard, plus likely others.
- **Baseline (2026-05-05 inspection)**: `next/src/pages/eat/[slug].astro` includes `winery` in its `eatTypes` filter, so wineries get pages emitted at both `/eat/{slug}/` and `/wine/{slug}/`. Both pages had self-referential canonicals, so Google was indexing both URLs as separate pages or marking them as alternate-canonical inconsistently.
- **Hypothesis**: changing the `/eat/{slug}/` template to emit a `canonical` pointing to `/wine/{slug}/` whenever `venue.type === 'winery'` will consolidate signal to the wine URL. By 2026-05-19, the alternate-canonical count for /eat/ winery URLs drops to near zero, and /wine/ winery pages absorb the impressions. No URLs break (the /eat/ versions still resolve, they just hand canonical authority to /wine/).
- **Mechanism**: dual self-canonicals on duplicate-content URLs is the textbook duplicate-content problem. Pointing /eat/{winery}/ canonical at /wine/{winery}/ tells Google "the wine version is the real one" without breaking inbound /eat/ links from elsewhere on the site.
- **Files changed**: `next/src/pages/eat/[slug].astro` line 50 — conditional canonical based on `venue.data.type === 'winery'`.
- **Verification** (2026-05-05): rebuilt locally. Verified `/eat/polperro/` and `/eat/kerri-greens/` canonicals now point to `/wine/{slug}/`. `/wine/{slug}/` self-canonical preserved. Non-winery /eat/ pages (pho-rosebud, sorrento-hotel) still self-canonical. Bonus: `/eat/elan-vineyard/` (also type=winery) also flipped correctly.
- **Measurement**: re-run `discover-unindexed.mjs` on 2026-05-12 and 2026-05-19. Headline metric: for the 17 alternate-canonical URLs in today's snapshot, count how many are eat→wine winery pairs that now resolve cleanly (only /wine/ indexed; /eat/ either dropped or correctly alternate).
- **Outcome (filled later)**: _pending — measure 2026-05-12 and 2026-05-19_

### 2026-05-04-01 — CTR snippet rewrite on dog-friendly journal page

- **Status**: shipped to worktree branch `claude/seo-day1-followup` 2026-05-04. Awaiting deploy.
- **PR**: pending
- **Pages affected**: `/journal/dog-friendly-mornington-peninsula/` (single page)
- **Baseline (May 3 pull, 28d window Apr 4-May 1)**: 138 impressions on with-slash variant + 317 on no-slash variant = 455 combined impressions, **0 clicks**, average position 8.9-12.8. Page ranks position 1-10 across 13 dog-related queries. Top queries: "a dog-friendly guide mornington peninsula" (14 impr, pos 7.4), "dog friendly guide mornington peninsula" (12 impr, pos 7.3), "mornington peninsula dog rules regulations beaches parks" (9 impr, pos 4.4), "dog friendly mornington peninsula guide" (2 impr, pos 1.0).
- **Hypothesis**: rewriting the title and meta description to add a freshness signal (2026), front-load the core query, and promise specific value props (off-leash beaches, cafés, stays, rules) will move CTR from 0% to ≥1.5% on the with-slash variant within 14 days. Specifically: by 2026-05-18, this page earns ≥3 clicks per 7-day window with impression count similar (~138/wk).
- **Mechanism**: 0% CTR across 138+ impressions at page-1 positions is structurally low — strong indication the snippet is failing to win the click. Old title was generic ("Dog-Friendly Guide to the Mornington Peninsula · Peninsula Insider") with no freshness signal, vague brand suffix consuming character budget. Old meta used em-dash punctuation (project rule violation) and softer phrasing ("complete guide... what to avoid"). New title front-loads the topic + year + three concrete value props in 62 chars. New meta opens with a specific value prop ("Off-leash beaches at Rye and Blairgowrie") and adds a freshness signal at the end ("2026 dog guide").
- **Files changed**: `next/src/pages/journal/dog-friendly-mornington-peninsula.astro` — `BaseLayout` title and description props, plus matching `articleSchema.description`.
- **Verification** (2026-05-04): rebuilt locally with `npm run build` — 1027 pages built in 16.46s, no errors. New title and meta confirmed in `dist/journal/dog-friendly-mornington-peninsula/index.html`.
- **Measurement**: read the indexation + queries blocks in `daily-log.md` on 2026-05-11 (7d) and 2026-05-18 (14d). Headline metric: CTR on `/journal/dog-friendly-mornington-peninsula/` (with slash) in the page-level data.
- **Outcome (filled later)**: _pending — measure 2026-05-11 and 2026-05-18_

## Completed experiments

### 2026-05-01-01 — Remove duplicate broken `/places/undefined` canonical ✓ EXCEEDED

- **Status**: shipped 2026-05-01 ([PR #16](https://github.com/richmondjw/peninsula-insider/pull/16)), deployed same day, verified live across 7 spot-checked pages.
- **Pages affected**: all 20 pages under `/places/*`.
- **Hypothesis**: by 2026-05-16, priority URL indexed count rises from 2/14 to ≥7/14.
- **Mechanism**: `PlaceDetailTemplate.astro:62-77` defined a `canonical` const from `place.slug` (undefined; correct property is `place.id`) and emitted it via `<Fragment slot="head">` alongside duplicate `<title>`, meta description, og: tags, and JSON-LD. Result: every place page had two `<link rel="canonical">` tags (second pointing to `/places/undefined`). Removed the entire fragment block and the unused locals that fed it. The parent `places/[slug].astro` already passed correct head metadata to BaseLayout.
- **Outcome (2026-05-04, 3 days after deploy)**: hypothesis EXCEEDED. **Priority URL indexed count went 2/14 → 11/14 by 2026-05-03 → 14/14 by 2026-05-04.** Hit the 7/14 target 12 days early; hit 14/14 (full sweep) 12 days early. All 9 stuck "Discovered" / "Alternate canonical" priority URLs flipped to "PASS — Submitted and indexed":
  - Day 2 gainers: `/wine/best-cellar-doors/`, `/explore/best-walks/`, `/stay/best-accommodation/` (was Alt canonical), `/journal/mornington-peninsula-day-trip/`, `/journal/dog-friendly-mornington-peninsula/` (was Alt canonical), `/places/sorrento/`, `/places/red-hill/` (was Alt canonical), `/places/mornington/`, `/places/rye/`
  - Day 3 gainers: `/eat/best-restaurants/`, `/journal/mornington-peninsula-in-autumn/` (recovered from "URL unknown"), `/journal/mornington-peninsula-with-kids/`
- **Side effects observed**: 28d impressions rose 1,780 → 2,415 (+36% in 3 days). 14 new pages now appearing in search. 8+ fishing pages from PR #8/#38 also lit up at page-1 positions in the same window. Clicks finally moved off the floor (23 → 26 in 28d).
- **What we learned**: (1) duplicate canonicals on a young site are catastrophic — fixing them unblocked indexation across an entire URL pattern. (2) Google's response time was much faster than the 14-day budget — likely because the canonical conflict was the dominant blocker, not crawl budget. (3) Manual reindex requests (which James submitted on 2026-05-01-02) probably helped accelerate, but the magnitude (9 URLs in 48h) suggests Google was waiting for the canonical signal to clear and recrawled aggressively once it did. (4) Fixing one root-cause template bug had ripple effects across pages we weren't measuring (fishing pack, journal pages) — supports the "fix templates first, then content" prioritisation.

### 2026-09-30-agent-experience - Welcome and compact-content pilot

- Owner: Remy; request and implementation approval: James in the existing PI Codex chat. DELI 1219016952128910.
- Baseline: live audit on 30 September, deployment abe5620bdbc271d8531df5932a36cc61eb0ce5f3; llms.txt 14,855 bytes and 164 links; seven advertised redirect stubs; sampled Pt. Leo HTML 234,292 bytes and no Markdown alternative. Existing live readiness passed its narrower assertions.
- Hypothesis: direct task routes and compact representations preserve answer context while reducing retrieval effort. No search ranking or agent-preference effect is presumed.
- Bounded change: public /agents/ guide, short generated index, footer and discovery metadata, a 20-page Markdown pilot and hash catalogue, explicit event timezone/build-date/source-check semantics, build and existing daily live checks. Existing public terms remain controlling pending the user-directed retrieval policy decision.
- Metrics: index bytes, working direct destinations, compact/public parity, source hashes, unknown check dates, median representation bytes, and desktop/mobile overflow. These are not token counts or a full site score.
- Initial local receipt: full site build passed; seven focused export tests passed; 17 direct destinations and 20 compact pages passed acceptance; median byte reduction approximately 95.6%. Source-preview desktop 1440x1000 and mobile 390x844 had no horizontal overflow. Independent Impeccable review required a permission wording correction, applied before release.
- Evaluation: build and post-deploy receipts on release; reuse the existing daily live workflow and weekly SEO/GEO review. First broader evaluation due 7 October 2026. Retain exact source SHA, test denominator and failures with each run. AI-answer citation and search effects require account evidence and comparable 28 to 56 day windows.
- Rubric v1 weights: access/permissions 10; welcome/routing 10; readable content 12; entity identity 10; evidence/confidence 15; freshness/changes 12; discovery/citation 10; efficiency 8; safe completion 6; measurement/upkeep 7. Unknown cases receive no credit. Freeze cases before comparison; critical failures block green regardless of score.
- Remaining acceptance: editorially grounded 30-task set, three available agent stacks with two fresh-session repeats and ten unseen tasks; independent factual checks; production caching/rate-limit evidence. Full rubric score remains unmeasured. A deterministic build pass is not a 99/100 claim.
- Rollback: revert this bounded release through the normal source pipeline. Remove generated alternatives and catalogue on rebuild; existing HTML canonicals, content and feeds remain the source of truth. No account or training permissions changed.
- Independent reviewer: impeccable_finish_reviewer; source and capture review, with final disposition retained in the release handoff.
- Outcome: INVESTIGATE until deployed verification and held-out task evidence are complete. Preserve negative results; expand the pilot only when it demonstrates a useful improvement without caveat loss.


### 2026-10-01-agent-experience-expansion - Complete formats and independent evaluation

- Owner: Remy; James approved continuing the existing programme toward99 after the live foundation release. Reuses the 30 September experiment and original rubric weights.
- Baseline:20 compact pages; independent frozen30-task answerability sample found17 supported,3 contradicted,6 absent and4 partial answers. This was content inspection, not autonomous task success. Five live format/cache probes returned200 then304 with validators. Exact public source SHA is retained with the private baseline receipt.
- Hypothesis: whole-sitemap text coverage, section catalogues, stable snapshot comparison and corrected source facts remove demonstrated retrieval and answerability failures without inventing confidence.
- Change: all eligible sitemap pages receive compact text, citation bundles and section indexes; prior-public-snapshot changes are explicit; source corrections follow official operator/authority evidence; frozen rubric/receipt validator refuses incomplete or simulated99-point claims.
- Gates: unit regressions, complete-sitemap build audit, release CI, independent source review, exact deployed SHA and full live audit. The broader target additionally requires the original two independent real-stack evaluations and held-out tasks; structural passes alone remain insufficient.
- Evaluation: on this release and at the existing weekly review on7 October. Retain failed provider calls and factual findings. Do not count bytes as input tokens or catalogue absence as a venue closure.
- Review: independent factual/implementation reviewers, with receipts retained outside the public corpus. No author approves their own corrections.
- Rollback: normal source revert/rebuild for formats; review verified factual corrections separately. Existing HTML citation destinations and private account protections remain in force.
- Outcome: INVESTIGATE pending real agent evaluation and release evidence. Do not claim99 until the frozen scorecard accepts independently reviewed receipts.
