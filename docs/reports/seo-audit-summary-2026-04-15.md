---
title: Peninsula Insider — SEO Stage 0 Audit
date: 2026-04-15
prepared_by: Remy (scripted via ops/scripts/seo-audit.mjs)
responding_to: docs/seo-staged-plan-2026-04-15.md — Stage 0 foundation audit
status: complete (content side); awaiting GSC data for query-side analysis
---

# Peninsula Insider — SEO Stage 0 Audit

## Overview

- **Pages audited:** 337
- **Source:** static build output at repo root (live-equivalent)
- **Classification:** URL pattern → editorial cluster
- **Internal-link graph:** built from all `href="/..."` references across the corpus

## Pages by cluster

| Cluster | Pages | Avg inbound | Avg <p> blocks |
|---|---|---|---|
| eat | 102 | 10 | 34 |
| journal | 62 | 31.9 | 54 |
| wine | 58 | 12 | 34 |
| explore | 44 | 15.8 | 34 |
| places | 21 | 131.5 | 65 |
| stay | 20 | 29.7 | 41 |
| whats-on | 13 | 29.8 | 42 |
| escape | 7 | 60.4 | 40 |
| legal | 5 | 201.6 | 24 |
| golf | 1 | 336 | 26 |
| home | 1 | 336 | 109 |
| newsletter | 1 | 336 | 23 |
| search | 1 | 0 | 17 |
| spa | 1 | 336 | 34 |

## Priority-keyword coverage

**Target keywords defined:** 37
**Already have a page:** 7
**Gap (need to create):** 30
**Existing but weakly linked (< 3 inbound):** 3

### Gap pages to create (Stage 2 + Stage 3 brief list)

| Keyword | Cluster | Target URL | Volume | Difficulty |
|---|---|---|---|---|
| mornington peninsula hot springs | spa | `/spa/mornington-peninsula-hot-springs-guide` | 3500 | 19 |
| best time to visit mornington peninsula hot springs | spa | `/spa/best-time-to-visit-mornington-peninsula-hot-springs` | — | — |
| mornington peninsula hot springs deals | spa | `/spa/mornington-peninsula-hot-springs-deals` | — | — |
| best accommodation near mornington peninsula hot springs | stay | `/stay/best-accommodation-near-mornington-peninsula-hot-springs` | — | — |
| mornington peninsula hot springs day trip from melbourne | spa | `/spa/mornington-peninsula-hot-springs-day-trip-from-melbourne` | — | — |
| hot springs and winery itinerary | escape | `/escape/hot-springs-and-winery-itinerary` | — | — |
| what to do after mornington peninsula hot springs | spa | `/spa/what-to-do-after-mornington-peninsula-hot-springs` | — | — |
| things to do mornington peninsula | explore | `/explore/things-to-do-mornington-peninsula` | 810 | 20 |
| things to do mornington peninsula for couples | explore | `/explore/things-to-do-mornington-peninsula-for-couples` | — | — |
| best beaches mornington peninsula | explore | `/explore/best-beaches-mornington-peninsula` | — | — |
| best lookouts mornington peninsula | explore | `/explore/best-lookouts-mornington-peninsula` | — | — |
| best markets mornington peninsula | explore | `/explore/best-markets-mornington-peninsula` | — | — |
| best wineries mornington peninsula | wine | `/wine/best-wineries-mornington-peninsula` | 600 | 30 |
| mornington peninsula wineries | wine | `/wine/best-wineries-mornington-peninsula` | 570 | 27 |
| best winery lunch mornington peninsula | wine | `/wine/best-winery-lunch-mornington-peninsula` | — | — |
| best winery restaurants mornington peninsula | wine | `/wine/best-winery-restaurants-mornington-peninsula` | — | — |
| winery accommodation mornington peninsula | stay | `/stay/winery-accommodation-mornington-peninsula` | — | — |
| best wineries red hill | wine | `/wine/best-wineries-red-hill` | — | — |
| kid friendly wineries mornington peninsula | wine | `/wine/kid-friendly-wineries-mornington-peninsula` | — | — |
| romantic wineries mornington peninsula | wine | `/wine/romantic-wineries-mornington-peninsula` | — | — |
| best winery itinerary one day | escape | `/escape/best-winery-itinerary-one-day` | — | — |
| where to stay mornington peninsula | stay | `/stay/where-to-stay-mornington-peninsula` | — | — |
| luxury accommodation mornington peninsula | stay | `/stay/luxury-accommodation-mornington-peninsula` | — | — |
| boutique accommodation mornington peninsula | stay | `/stay/boutique-accommodation-mornington-peninsula` | — | — |
| romantic accommodation mornington peninsula | stay | `/stay/romantic-accommodation-mornington-peninsula` | — | — |
| pet friendly accommodation mornington peninsula | stay | `/stay/pet-friendly-accommodation-mornington-peninsula` | — | — |
| accommodation red hill mornington peninsula | stay | `/stay/accommodation-red-hill` | — | — |
| mornington peninsula itinerary | escape | `/escape/mornington-peninsula-itinerary` | — | — |
| romantic weekend mornington peninsula | escape | `/escape/romantic-weekend-mornington-peninsula` | — | — |
| mornington peninsula weekend | escape | `/escape/mornington-peninsula-weekend` | — | — |

### Existing pages that need link strengthening (< 3 inbound)

| Keyword | URL | Current inbound | Notes |
|---|---|---|---|
| things to do mornington peninsula with kids | `/journal/mornington-peninsula-with-kids` | 2 | needs 2+ more inbound links |
| mornington peninsula day trip from melbourne | `/journal/mornington-peninsula-day-trip` | 2 | needs 2+ more inbound links |
| best walks mornington peninsula | `/explore/best-walks` | 2 | needs 2+ more inbound links |

## Town depth (Stage 4 baseline)

| Town | URL | Exists? | Inbound links | <p> blocks (depth proxy) |
|---|---|---|---|---|
| red-hill | `/places/red-hill` | ✓ | 336 | 96 |
| sorrento | `/places/sorrento` | ✓ | 336 | 77 |
| mornington | `/places/mornington` | ✓ | 336 | 86 |
| flinders | `/places/flinders` | ✓ | 336 | 70 |
| rye | `/places/rye` | ✓ | 16 | 57 |
| dromana | `/places/dromana` | ✓ | 65 | 75 |
| rosebud | `/places/rosebud` | ✓ | 5 | 45 |
| portsea | `/places/portsea` | ✓ | 336 | 50 |
| main-ridge | `/places/main-ridge` | ✓ | 336 | 75 |
| blairgowrie | `/places/blairgowrie` | ✓ | 1 | 34 |

## Technical hygiene issues

- **Title tags out of range (< 20 or > 65 chars or missing):** 80
- **Meta descriptions out of range (< 90 or > 160 chars or missing):** 84
- **Pages with no H1:** 0
- **Orphans (zero inbound internal links):** 3
- **Under-linked (1 inbound only):** 41

### Top orphans (sample — first 20)

- `/404.html`
- `/search`
- `/terms`

### Pages with only one inbound link (sample — first 20)

- `/eat/circe-wines`
- `/eat/foxeys-hangout`
- `/eat/garagiste`
- `/eat/hurley-vineyard`
- `/eat/lightfoot-wines`
- `/eat/morning-sun`
- `/eat/mornington-hotel`
- `/eat/mr-vincenzos`
- `/eat/ocean-eight`
- `/eat/ouest-france-bistro`
- `/eat/paradigm-hill`
- `/eat/polperro`
- `/eat/prancing-horse-estate`
- `/eat/red-gum-bbq`
- `/eat/red-hill-estate`
- `/eat/rocker`
- `/eat/scorpo-wines`
- `/eat/sourdough-kitchen`
- `/eat/store-ten`
- `/eat/stringers-mornington`

### Pages with title issues (sample — first 15)

- `/escape/flinders-and-cape-reset` (title 98 chars): Flinders and the Cape: A One-Night Reset — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/escape/ridge-to-sea-two-night-escape` (title 100 chars): Ridge to Sea: A Two-Night Peninsula Escape — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/escape/sorrento-off-season-weekend` (title 89 chars): The Sorrento Off-Season Weekend — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/escape/the-family-day-out` (title 86 chars): The Peninsula Family Day Out — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/escape/the-peninsula-golf-weekend` (title 134 chars): The Peninsula Golf Weekend: Two Nights, One Serious Round, Room for the Rest — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/escape/wellness-weekend` (title 107 chars): The Wellness Reset: A Two-Night Peninsula Weekend — Mornington Peninsula Weekend Escape | Peninsula Insider
- `/explore/coastal-walk-cape-schanck` (title 76 chars): Cape Schanck to London Bridge Coastal Walk, Cape Schanck · Peninsula Insider
- `/explore/mornington-foreshore-walk` (title 67 chars): Mornington Peninsula Foreshore Walk, Mornington · Peninsula Insider
- `/explore/mornington-peninsula-gallery` (title 69 chars): Mornington Peninsula Regional Gallery, Mornington · Peninsula Insider
- `/journal/a-flinders-weekend` (title 84 chars): A Flinders Weekend: The Case for the Quiet Side of the Peninsula | Peninsula Insider
- `/journal/a-winter-peninsula-weekend` (title 75 chars): A Winter Peninsula Weekend: The Case for Coming in July | Peninsula Insider
- `/journal/autumn-weekend-edit` (title 89 chars): The Autumn Weekend Edit: Why April on the Peninsula Feels Most Earned | Peninsula Insider
- `/journal/best-golf-courses-mornington-peninsula` (title 82 chars): Best Golf Courses on the Mornington Peninsula — The Tier Guide | Peninsula Insider
- `/journal/best-spas-mornington-peninsula` (title 74 chars): Best Spas on the Mornington Peninsula — The Tier Guide | Peninsula Insider
- `/journal/breakfast-before-the-crowds` (title 81 chars): Breakfast Before the Crowds: Where Locals Actually Eat at 8am | Peninsula Insider

### Pages with meta-description issues (sample — first 15)

- `/404.html` (desc 83 chars)
- `/about` (desc 180 chars)
- `/contact` (desc 86 chars)
- `/eat/bistro-elba` (desc 167 chars)
- `/eat` (desc 184 chars)
- `/eat/maxs-red-hill-estate` (desc 171 chars)
- `/eat/point-leo-wine-terrace` (desc 176 chars)
- `/eat/port-phillip-estate-restaurant` (desc 168 chars)
- `/eat/rare-hare` (desc 88 chars)
- `/eat/red-gum-bbq` (desc 165 chars)
- `/escape/sorrento-off-season-weekend` (desc 180 chars)
- `/escape/the-family-day-out` (desc 216 chars)
- `/escape/the-peninsula-golf-weekend` (desc 193 chars)
- `/explore/best-walks` (desc 176 chars)
- `/explore` (desc 179 chars)

## What this audit does NOT cover (still required for full Stage 0)

- **GSC data** — impressions, clicks, average position, top query pages. Needs James's access. Open a GSC export and pull last 90 days at Query + Page dimensions.
- **Rank tracking on 25 priority keywords** — requires a rank-tracker tool (free options: Ahrefs Webmaster Tools if site is verified there, or manual SERP checks for tonight).
- **Core Web Vitals + PageSpeed** — CrUX data via GSC or PageSpeed Insights API run against the top 20 pages.
- **Mobile usability** — GSC mobile usability report.
- **Indexing coverage** — GSC Pages report: which URLs are indexed vs discovered-not-indexed vs crawled-not-indexed.
- **External advisor's "first 25 pages" brief** — promised by the SEO feedback source. James to request.

## Stage 1 immediate priorities, derived from this audit

Priority 1 — **Fix the orphans.** 3 pages have zero inbound links. They receive no authority and may not be re-crawled reliably. Mechanical fix via the Astro content-collection `related*` fields on every venue/experience/article and automatic inbound-generation from related pages' templates.

Priority 2 — **Build the keyword-gap pages.** 30 priority keywords have no target page. Those become the Stage 2 + Stage 3 brief list. Use this audit's gap table directly as the content plan input.

Priority 3 — **Title/meta remediation on top-impression pages.** 80 title-tag issues + 84 meta-description issues. Prioritise by GSC impression volume once James pulls the data.

Priority 4 — **Town-depth baseline.** 0 of the 10 priority towns have no `/places/` page. 0 exist but are thin (<10 <p> blocks).

Priority 5 — **Strengthen the ranking page.** `/stay/best-accommodation` already ranks ~#41. Current inbound link count: 11. Push toward 6+ inbound links from related Stay, Explore, Escape pages.

---

*Generated 2026-04-15T14:07:25.666Z by Remy. Data file: `docs/reports/seo-audit-pages-2026-04-15.csv` (one row per page).*
