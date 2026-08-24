# Peninsula Insider — Index Monitor Report
**Date:** 2026-08-16
**Site went live:** 2026-08-03 (13 days ago)
**Prior report:** 2026-08-15

## 1. Google indexed page count (site:peninsulainsider.com.au)
- Tool used: `web_search` (backed by DuckDuckGo, not Google directly — no first-party Google Search API available in this environment)
- Returned 10 results (provider caps display, no total count surfaced)
- Top pages appearing: `/`, `/journal/`, `/site-index/`, `/whats-on/`, `/explore/places/`, `/about/`, `/explore/`, `/quick-note/`, `/insiders-30/`, `/insiders-30/2026/`
- Same caveat as prior reports: not a reliable count. `mcp__searchconsole__gsc_search_analytics` / `gsc_inspect_url` remain the better source of truth for actual Google coverage — not yet wired into this check.

## 2. Bing indexed page count (site:peninsulainsider.com.au)
- **Result: ~51 results** ("About 51 results" per Bing SERP, `sb_count` element)
- **Down from ~54** on 2026-08-13/14/15 (flat for three straight days before today). First movement in the monitoring window — and it's a drop, not growth.

## 3. IndexNow aggregator push
- Source: `https://peninsulainsider.com.au/sitemap.xml` — **610 URLs**
  - **Up from 602 URLs on 2026-08-15 (+8)**. Reverses the multi-day shrink trend flagged in prior reports (655 → 604 → 602 → now 610).
- Key file verified live: `https://peninsulainsider.com.au/965c9c83a6184285347acd57ca597852.txt` → HTTP 200, matches key
- Submitted bulk POST to `https://api.indexnow.org/indexnow` with all 610 URLs
- **Result: HTTP 200 — accepted** (consistent with 2026-08-13 through 2026-08-15; now a routine daily outcome)

## Status
- Bing count moved for the first time in the window: 54 → 51 (down 3).
- Sitemap URL count reversed its shrink trend: 602 → 610 (up 8), after three prior days of decline.
- IndexNow push succeeded again (200) — routine.

## Notification decision
Two real changes today (first movement in either metric since monitoring began): Bing index count dropped, and the sitemap URL count — previously flagged as a shrinking-trend concern — grew back. Per instructions (notify on growth or aggregator success, stay quiet if nothing changed), and consistent with treating the daily IndexNow 200 as routine non-news, today has genuine news: the sitemap trend reversed. Sending James a one-line update.
