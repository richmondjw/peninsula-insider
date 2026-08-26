# Peninsula Insider — Page 1 SEO Plan
**2026-08-21 · Remy · based on live GSC (90-day) + GA4 data, not a generic crawl checklist**

## The real starting point

This is an early-stage site, not an established one carrying technical debt: **361 organic sessions in the last 90 days** (GA4), across **1,000 tracked queries** (GSC), almost none of which sit on page 1. The technical foundation is actually solid — canonicals, trailing-slash handling, sitemap (610 URLs), robots.txt are all correctly configured. This is not a "fix broken infrastructure" problem. It's a **content-authority and internal-linking** problem, and the data points at exactly where to spend effort first.

One channel worth flagging on its own: **30 of the 361 organic-adjacent sessions came from "AI Assistant" referrals** (GA4's own channel grouping) — real traffic from ChatGPT/Perplexity-style tools is already happening at a small site. That validates continued GEO investment, not just classic SEO.

## What's already working (do more of this)

- **Comparison-format content wins.** `/journal/peninsula-hot-springs-vs-alba/` is the single best-performing page on the site: position 11, 1,066 impressions, 47 clicks. Head-to-head "X vs Y" content clearly resonates for a destination with genuine either/or choices (hot springs, wineries, beaches).
- **Long-tail specificity beats the generic head term.** "free things to do in mornington peninsula **for adults**" ranks position 6.9; the shorter "free things to do in mornington peninsula" sits at position 23.4. Same intent, wildly different result — specificity is working, worth applying deliberately elsewhere.

## Priority 1 — Fix the Hot Springs self-cannibalization (highest leverage, days not weeks)

This is the single biggest topic by search demand on the whole site, and it's fighting itself:

| Query / Page | Position | Impressions |
|---|---|---|
| "mornington peninsula hot springs" | 31.6 | 110 |
| `/explore/hot-springs/` (the hub, titled correctly for this exact query) | 18.9 | 849 |
| `/journal/peninsula-hot-springs-vs-alba/` (a separate article) | 11.1 | 1,066 |
| "alba hot springs" | 17.6 | 124 |
| "accommodation near peninsula hot springs" | 28.2 | 94 |

The hub page (`/explore/hot-springs/`) is well-titled ("Mornington Peninsula Hot Springs...") and has real impression volume (849) but a **0.12% CTR** and position in the 20s-30s for its own target query. Meanwhile the `vs-alba` journal article is winning the traffic that should be reinforcing the hub. I checked the actual link graph: **the hub links to the article three times; the article links back to the hub zero times.** All the authority/relevance signal is flowing one-way, away from the page that should be the category authority.

**Fix:** add one prominent contextual link from the `vs-alba` article back to `/explore/hot-springs/` (e.g. "see the full hot springs guide" near the top). Cheap, five-minute content edit, directly targets the actual measured cause. I can do this now if you want.

## Priority 2 — Clean up stale non-canonical URLs in the index

GSC is still showing impressions on old non-trailing-slash URLs (`/journal/peninsula-hot-springs-vs-alba` without the `/`, `/journal/best-brunch-mornington-peninsula` without the `/`, etc.) as if they were separate pages, splitting reported performance. I verified this is **not a live bug** — every non-slash URL I tested correctly 301s to the canonical slash version, and the canonical tag on the real page is correct. This is just Google not having fully re-crawled/consolidated yet. Low effort, worth doing: use GSC's URL removal/reindex tools to speed that consolidation up rather than waiting it out.

## Priority 3 — The category hubs need authority, not on-page tweaks

`/eat/`, `/stay/`, `/whats-on/` all have good, correctly-targeted titles ("Where to Eat on the Mornington Peninsula", etc.) but sit at position 30-42 with hundreds of impressions and single-digit clicks. This isn't an on-page defect — it's competing against TripAdvisor, Broadsheet, Visit Victoria for genuinely competitive head terms. That needs sustained internal linking from every relevant deep page (each venue/journal article should link up to its parent hub, the way the hot springs hub does it right) plus more supporting content under each hub over time. This is a months-long play, not a quick fix — flagging it honestly rather than promising a fast win here.

## Priority 4 — Same cannibalization pattern, smaller cluster: "dog-friendly"

`/journal/dog-friendly-wineries-mornington-peninsula/`, `/journal/dog-friendly-mornington-peninsula/`, and `/journal/dog-friendly-accommodation-mornington-peninsula/` are three separate articles splitting a related audience (positions 6-30, fragmented impressions). Same fix pattern as Priority 1: pick one as the canonical "dog-friendly Mornington Peninsula" hub, cross-link the other two into it.

## Priority 5 — Net-new content gap: boat moorings/berths

"boat moorings mornington" (86 impressions, position 82.8) and "berths mornington" (53 impressions, position 74.8) have real search demand and **essentially zero dedicated content** — I checked, there's one passing mention on the Blairgowrie place page and nothing else. This reads like low-competition, practical-utility search intent (visiting boaters need this exact information) that a single well-built page could plausibly rank for relatively quickly, precisely because so little else is competing for it.

## Suggested sequence

- **This week:** Priority 1 (hot springs internal link) + Priority 2 (GSC reindex requests) — both cheap, both directly evidenced by the data above.
- **Weeks 2-4:** Priority 4 (dog-friendly consolidation), draft the boat moorings/berths page (Priority 5).
- **Month 2+:** Priority 3 — systematic internal linking from every venue/article back to its category hub, plus a content cadence targeting the hub topics directly.

---
*Data sources: Google Search Console (`sc-domain:peninsulainsider.com.au`, 2026-05-24 to 2026-08-19, 1,000 queries / 250 pages), Google Analytics 4 (property 532577226, same window), live crawl spot-checks of the pages named above. Technical foundation (canonicals, trailing-slash, sitemap, robots.txt, schema pipeline) checked and confirmed sound — not itemized here since none of it is blocking anything right now.*
