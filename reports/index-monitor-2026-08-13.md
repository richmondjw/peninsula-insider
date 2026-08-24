# Peninsula Insider — Index Monitor Report
**Date:** 2026-08-13
**Site went live:** 2026-08-03 (10 days ago)

## 1. Google indexed page count (site:peninsulainsider.com.au)
- Tool used: `web_search` (backed by DuckDuckGo, not Google directly — no first-party Google Search API available in this environment)
- Returned 10 results, no total count surfaced by the provider
- Top pages appearing: `/`, `/explore/places/`, `/explore/`, `/site-index/`, `/explore/plans/`, `/about/`, `/eat/`, `/journal/`, `/guides/`, `/map/`
- **Caveat:** cannot report a true Google-indexed count without direct Google SERP access or Search Console coverage data. Recommend switching this check to `mcp__searchconsole__gsc_search_analytics` / `gsc_inspect_url` (now available) for an authoritative number going forward.

## 2. Bing indexed page count (site:peninsulainsider.com.au)
- **Result: ~54 results** (`About 54 results` per Bing SERP)
- First recorded data point — no prior report to compare against.

## 3. IndexNow aggregator push
- Source: `https://peninsulainsider.com.au/sitemap.xml` — **655 URLs**
- Key file verified live: `https://peninsulainsider.com.au/965c9c83a6184285347acd57ca597852.txt` → HTTP 200, matches key
- Submitted bulk POST to `https://api.indexnow.org/indexnow` with all 655 URLs
- **Result: HTTP 200 — accepted**

## Status
First-ever run of this monitor — no prior report exists in `reports/` to diff against, so "growth since last report" is not yet measurable. Baseline established today: **Bing ~54 pages indexed**, **655 URLs in sitemap**, **IndexNow push accepted**.

## Notification decision
Per instructions: no prior baseline to compare growth against, but the aggregator push succeeded (200) → **sending James a one-line update.**
