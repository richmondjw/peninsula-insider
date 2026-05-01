# SEO backlog — Peninsula Insider

Prioritised next actions. Pulled from each morning. Each item has impact (1-5), effort (1-5), and a one-line rationale.

Sorted by impact/effort ratio.

## P0 — this week

- [ ] **Ship the place page canonical fix** (experiment 2026-05-02-01). *Impact 5, Effort 1.* One-line fix unlocks indexation on 20 pages and clears 3 of 14 priority URLs out of "Alternate canonical" purgatory. Pending PR.
- [ ] **Manual reindex requests via GSC URL Inspection** for `/stay/best-accommodation/`, `/journal/dog-friendly-mornington-peninsula/`, `/places/red-hill/` (and the other 10 place pages once canonical fix is shipped). *Impact 4, Effort 1.* GSC has stale crawl data; current HTML is correct.
- [ ] **CTR rewrite on `/whats-on/mornington-cup-2026`.** *Impact 4, Effort 1.* 228 impr at pos 7.6 with 0.44% CTR. New title + meta description targeted at "mornington cup 2026" and related queries. Hypothesis: CTR to ≥2.5% within 14 days.
- [ ] **Diagnose http:// vs https:// indexation.** *Impact 3, Effort 1.* Top page reports include `http://peninsulainsider.com.au/` getting traffic. Confirm 301 status from http to https and test redirect.
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
