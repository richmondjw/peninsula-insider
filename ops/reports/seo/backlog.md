# SEO backlog, Peninsula Insider

Prioritised next actions. Pulled from each morning. Each item has impact (1-5), effort (1-5), and a one-line rationale.

Top of the list now reflects the May 2026 monthly audit (`audit-2026-05/`). The full ranked view with composite scores lives in `audit-2026-05/06-opportunity-matrix.md`. The 30/60/90 plan lives in `audit-2026-05/07-30-60-90.md`. This file remains the daily operating queue.

## P0, this week (audit-derived 30-day window starts here)

- [ ] **Fix the orphaned conversion-surface footer/masthead links** (matrix #2, composite 30). `next/src/lib/v4-nav.ts:470` Pass href, `next/src/components/Masthead.astro:58` Newsletter href. *Impact 5, Effort 5.* **Recommended next experiment.**
- [ ] **Add Awards to masthead More menu and footer About column** (matrix #3, composite 28). `next/src/lib/nav.ts:55-66` and `next/src/lib/v4-nav.ts:465-474`. *Impact 5, Effort 5.*
- [ ] **CTR rewrite on `/journal/the-chardonnay-case/`** (matrix #16, composite 23). 71+55 combined impr (slash variants), 0% CTR, position 5.6. Snippet failure on a top-of-page-1 page. *Impact 4, Effort 1.*
- [ ] **CTR rewrite on `/journal/the-pub-guide/`** (matrix #17, composite 23). 65 impr, 0% CTR, position 8.8. *Impact 3, Effort 1.*
- [ ] **(James)** Resubmit `sitemap.xml` in GSC, Sitemaps. *Impact 2, Effort 0.*
- [ ] **(James)** Submit 20 priority URLs to GSC URL Inspection across two days (full list in `daily-log.md` 2026-05-01 entry). *Impact 4, Effort 1.*
- [ ] **(James)** After dog-friendly snippet rewrite deploys: submit `/journal/dog-friendly-mornington-peninsula/` (and no-slash variant) for reindex in GSC. *Impact 3, Effort 0.*
- [ ] **(James)** Submit the 5 niche-hub URLs from experiment 2026-05-05-01 for manual reindexing: `/dog-friendly/`, `/whats-on/`, `/corporate-events/`, `/ask/`, `/explore/golf/`. *Impact 4, Effort 1.*
- [ ] **Replicate experiment 2026-05-05-02 on the explore/walks cluster** (matrix #4, composite 25). 32 unindexed walk pages match the journal pattern. *Impact 5, Effort 4.*
- [ ] **Fix duplicate sitemap entry for `/journal/free-things-to-do-mornington-peninsula/`** (matrix #19, composite 20). `next/src/pages/sitemap.xml.ts`. *Impact 2, Effort 5.*
- [ ] **Investigate the 4 address-string queries showing in top impressions** (matrix #40, composite 17). Likely legacy directory pages still indexed. *Impact 3, Effort 1.*
- [ ] **Investigate Apr 24-25 indexation jump (16 → 39).** Find what worked and reproduce. Likely candidate: a content push or manual indexing batch. *Impact 4, Effort 1.* (Carried over.)

## P1, this month (audit 30-day window completes here)

- [ ] **Render `pressMentions` and won-awards on `VenueDetailTemplate`** (matrix #1, composite 26). Data exists, render is missing. *Impact 5, Effort 4.*
- [ ] **"Is this your venue? Claim it." link on `VenueDetailTemplate`** (matrix #12, composite 26). First venue → operator-claim path. *Impact 4, Effort 5.*
- [ ] **Convert journal/place/venue heroes from CSS `background-image` to `<img>`** (matrix #5, composite 23). The single highest-leverage technical-SEO fix. *Impact 5, Effort 3.*
- [ ] **Mount `PassCallout` and `AskTheInsiderLink` in journal `[slug].astro`** (matrix #7, #24). First editorial → Pass + Concierge body links. *Impact 4, Effort 4.*
- [ ] **Add `Product` + `Offer` JSON-LD to `/pass/`** (matrix #6, composite 25). *Impact 4, Effort 4.*
- [ ] **Add `ItemList` to `/wine/best-cellar-doors/`; add `CollectionPage` + `ItemList` to `/wine/`, `/journal/`, `/whats-on/` hubs** (matrix #10, composite 23). *Impact 4, Effort 4.*
- [ ] **Render `v4FooterNiche` in `Footer.astro`** (matrix #8, composite 23). Already defined in `v4-nav.ts:455-463`, never rendered. *Impact 4, Effort 5.*
- [ ] **Migrate `dog-friendly-mornington-peninsula.astro` into article collection** (matrix #9, composite 20). The site's #1 query magnet is hand-coded with em-dashes and schema mismatch. *Impact 4, Effort 3.*
- [ ] **Add `image` field to Restaurant/Cafe/Winery JSON-LD on `/eat/[slug]/`** (matrix #20, composite 22). *Impact 3, Effort 5.*
- [ ] **Add `image` field to TouristDestination JSON-LD on `/places/[slug]/`** (matrix #21, composite 22). *Impact 3, Effort 5.*
- [ ] **Fix `WebSite.SearchAction` target** (matrix #18, composite 21). `index.astro:79-80` points at `/journal?q=` which doesn't render results. *Impact 3, Effort 5.*
- [ ] **Internal-linking sweep, 20 source-page → target-page pairs** (matrix #25, composite 19). See `audit-2026-05/02-content-clusters.md §6` for the full list. *Impact 4, Effort 3.*
- [ ] **Add `lastVerified` rendering to `PlaceDetailTemplate`** (matrix #37, composite 18). Parity with VenueDetailTemplate. *Impact 2, Effort 5.*
- [ ] **Internal linking audit on PRIORITY_URLS** (matrix #43, composite 18). Each priority URL should be linked from ≥ 3 other pages. *Impact 3, Effort 4.*

## P2, next 4-8 weeks (60-day window)

- [ ] **Add `psi-pull.mjs` weekly cron + `web-vitals` RUM** (matrix #11, #32). Without PSI capture, every monthly audit hits the 429 quota wall.
- [ ] **Build "Stays Near Peninsula Hot Springs" article** (matrix #14, content-roadmap B1). 19 impr/wk unmet demand.
- [ ] **Rebuild `/eat/best-restaurants/` for 2026 freshness, FAQ, depth** (matrix #15, content-roadmap B4).
- [ ] **Rebuild `/explore/best-walks/` as graded walks hub** (matrix #26, content-roadmap B3).
- [ ] **Build `/escape/day-trip-mornington-peninsula/`** (matrix #28, content-roadmap B2). Most contestable winnable SERP.
- [ ] **Refresh + consolidate the 9 rebuild items + 3 consolidate clusters** (content-roadmap §R, §C).
- [ ] **`Person` JSON-LD on `/about/`, `Organization` + `ContactPage` on `/contact/`, `lastReviewed` on `/methodology/`** (matrix #30).
- [ ] **Generate 800w + 1600w hero image renditions** (matrix #31).
- [ ] **Replace `Organization.logo` with a real square logo** (matrix #38).
- [ ] **Lazy-mount lower category sections on `/whats-on/`** (matrix #39). 460KB HTML payload.
- [ ] **Bing Webmaster Tools submission and sitemap.** *Impact 1, Effort 5.*
- [ ] **Refresh `/journal/dog-friendly-beaches-mornington-peninsula/`** with map + table (content-roadmap R2 + matrix #35).
- [ ] **FAQ blocks added to top 10 pages with FAQPage schema** (matrix #44).

## P3, next 8-13 weeks (90-day window)

- [ ] **Featured-by-PI badge program** (matrix #13, composite 22). Badge endpoint + outreach to 134 operators.
- [ ] **Build the "Cellar-Door Price Index" data piece** (matrix #34, content-roadmap B6). Citation-bait for wine writers.
- [ ] **Build the "Best Dog Beaches Map" data + chart** (matrix #35, content-roadmap R2). Pet sites have no equivalent canonical.
- [ ] **Quarterly press release cadence: "What's open / what's closed Mornington Peninsula"** (matrix #33). Use PI's verification cadence as the data source.
- [ ] **Awards `Event` schema + August nominations launch prep** (matrix Awards bundle).
- [ ] **Build `/whats-on/this-weekend/` permanent page** (matrix #41).
- [ ] **Add named editor entry to `next/src/content/authors/`** (matrix #36). Lifts E-E-A-T bio depth axis.

## Iceberg (consider later, per project memory)

- [ ] Programmatic suburb × intent pages (only after editorial credibility is established, premature now).
- [ ] Newsletter subscriber growth funnel (out of SEO scope but related).
- [ ] The Insider's 30: 2026 Edition (annual ranked list, separate editorial planning).

## Completed (for reference)

- [x] **Place page canonical fix** (experiment 2026-05-01-01). Done + deployed + verified live 2026-05-01. PR #16 merged.
- [x] **Diagnose http vs https indexation.** Done 2026-05-01. GitHub Pages was serving both protocols 200 OK without redirecting.
- [x] **Enable "Enforce HTTPS" in GitHub Pages settings.** Done by Claude via gh API 2026-05-01.
- [x] **Dog-friendly snippet rewrite** (experiment 2026-05-04-01). Done 2026-05-04. Awaiting deploy + reindex.
- [x] **Niche-hub indexation push** (experiment 2026-05-05-01). Sitemap priority bumps + contextual link from dog-friendly journal. Awaiting James reindex submission.
- [x] **Journal internal-linking sweep** (experiment 2026-05-05-02). Auto-related limit 3 → 6 + explicit refs on 3 source articles. Awaiting measurement 2026-05-12 and 2026-05-19.
- [x] **/eat/ vs /wine/ winery duplicate canonicalisation** (experiment 2026-05-05-03). /eat/{winery} now canonical to /wine/{winery}. Awaiting measurement.

---

_Items are added when discovered, prioritised when reviewed, removed when shipped (logged in `experiments.md`). The May 2026 monthly audit (`audit-2026-05/`) added ~30 items; the originals were preserved or promoted as appropriate._
