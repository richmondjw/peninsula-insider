# SEO backlog — Peninsula Insider

Prioritised next actions. Pulled from each morning. Each item has impact (1-5), effort (1-5), and a one-line rationale.

Sorted by impact/effort ratio.

## P0 — this week

- [x] **Ship the place page canonical fix** (experiment 2026-05-01-01). *Done + deployed + verified live 2026-05-01.* PR #16 merged.
- [x] **Diagnose http:// vs https:// indexation.** *Done 2026-05-01.* GitHub Pages was serving both protocols 200 OK without redirecting.
- [x] **Enable "Enforce HTTPS" in GitHub Pages settings.** *Done by Claude via gh API 2026-05-01.* Verified: http→https 301 redirect is live.
- [ ] **(James)** Resubmit `sitemap.xml` in GSC → Sitemaps. *Impact 2, Effort 0.*
- [ ] **(James)** Submit 20 priority URLs to GSC URL Inspection across two days (full list in `daily-log.md` 2026-05-01 entry). *Impact 4, Effort 1.*
- [x] **CTR rewrite (target shifted)**: original `/whats-on/mornington-cup-2026` had zero impressions in last 28d (race past). Pivoted to `/journal/dog-friendly-mornington-peninsula/`. *Done 2026-05-04 as experiment 2026-05-04-01.* Awaiting deploy.
- [ ] **(James)** After dog-friendly snippet rewrite deploys: submit `/journal/dog-friendly-mornington-peninsula/` (and no-slash variant) for reindex in GSC. *Impact 3, Effort 0.*
- [ ] **CTR rewrite on `/journal/the-chardonnay-case/`.** *Impact 4, Effort 1.* 71+55 combined impr (slash variants), 0% CTR, pos 5.6 (top of page 1). Snippet failure. **Recommended next experiment.**
- [ ] **CTR rewrite on `/journal/the-pub-guide/`.** *Impact 3, Effort 1.* 65 impr, 0% CTR, pos 8.8.
- [ ] **Fix duplicate sitemap entry for `/journal/free-things-to-do-mornington-peninsula/`.** *Impact 2, Effort 2.* Page appears twice in `sitemap.xml` (likely a `next/src/pages/sitemap.xml.ts` bug).
- [ ] **Audit & prune the 283 "Discovered – currently not indexed" URLs.** *Impact 5, Effort 3.* Pruning thin/templated pages should ~double indexation rate within 2-3 weeks per Google's behaviour with new sites. Need GSC export of the 283 URL list to begin.
- [ ] **Investigate Apr 24-25 indexation jump (16 → 39).** *Impact 4, Effort 1.* Find what worked and reproduce. Likely candidate: a content push or manual indexing batch.
- [ ] **Investigate the 4 address-string queries showing in top impressions.** *Impact 3, Effort 1.* Likely legacy directory pages still indexed. Should they be noindexed (address searches want a map, not a listing)?
- [ ] **Internal linking audit on PRIORITY_URLS.** *Impact 4, Effort 2.* Each priority URL should be linked from ≥3 other pages. Currently unknown.

## P1 — next 2-3 weeks

- [ ] **SERP snippet pass on top 10 pages by impressions** (titles, meta descriptions, first 100-150 words). Per HANDOVER-CLAUDE.md priority A.
- [ ] **Town hub depth** — Sorrento, Red Hill, Flinders, Mornington, Rye. Per HANDOVER priority B.
- [ ] **Schema audit & gap-fill** across templates: Article/NewsArticle, BreadcrumbList, FAQPage, LocalBusiness, Organization, WebSite+SearchAction.
- [ ] **Bing Webmaster Tools** submission & sitemap.

## P2 — next 4-8 weeks

- [ ] **Earn first quality backlink** (local Vic press, council site, regional tourism body, Broadsheet/Time Out). Single biggest crawl-budget unlock.
- [ ] **FAQ blocks** added to top 10 pages with FAQPage schema.
- [ ] **Image SEO pass** — alt text, file naming, dimensions for Discover eligibility.
- [ ] **Google Discover preparation** — articles with 1200px+ images, fresh dates, strong titles.

## Iceberg (consider later)

- [ ] Programmatic suburb × intent pages (only after editorial credibility is established — premature now)
- [ ] Newsletter subscriber growth funnel (out of SEO scope but related)
- [ ] Competitor content gap analysis (after we have a baseline of our own performance)

---

_Items are added when discovered, prioritised when reviewed, removed when shipped (logged in `experiments.md`)._
