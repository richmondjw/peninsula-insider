# Peninsula Insider — Index Monitor Report
**Date:** 2026-08-15
**Site went live:** 2026-08-03 (12 days ago)
**Prior report:** 2026-08-14

## 1. Google indexed page count (site:peninsulainsider.com.au)
- Tool used: `web_search` (backed by DuckDuckGo, not Google directly — no first-party Google Search API available in this environment)
- Returned 10 results (provider caps display, no total count surfaced)
- Top pages appearing: `/`, `/journal/`, `/site-index/`, `/whats-on/`, `/about/`, `/explore/places/`, `/explore/`, `/insiders-30/`, `/quick-note/`, `/explore/plans/`
- Same caveat as prior reports: not a reliable count. `mcp__searchconsole__gsc_search_analytics` / `gsc_inspect_url` remain the better source of truth for actual Google coverage — not yet wired into this check.

## 2. Bing indexed page count (site:peninsulainsider.com.au)
- **Result: ~54 results** ("About 54 results" per Bing SERP)
- **Unchanged from 2026-08-14** (also ~54, and ~54 on 2026-08-13). Flat for three consecutive days.

## 3. IndexNow aggregator push
- Source: `https://peninsulainsider.com.au/sitemap.xml` — **602 URLs**
  - Down again from 604 URLs on 2026-08-14 (−2 URLs). Continues the shrink trend: 655 → 604 → 602 over the last three days (−53 total, −8.1%). Still worth James confirming this is intentional pruning and not accidental page loss.
- Key file verified live: `https://peninsulainsider.com.au/965c9c83a6184285347acd57ca597852.txt` → HTTP 200, matches key
- Submitted bulk POST to `https://api.indexnow.org/indexnow` with all 602 URLs
- **Result: HTTP 200 — accepted** (also accepted on 2026-08-13 and 2026-08-14)

## Status
- Bing count flat (54 → 54 → 54): no growth for three straight days.
- IndexNow push succeeded again (200), same outcome as the prior two days.
- Sitemap URL count keeps shrinking (604 → 602 today), continuing a multi-day trend.

## Notification decision
Per instructions, message James only if indexed count grew or the aggregator push succeeded, and only if something changed since the last report. Bing count didn't move and the IndexNow 200 is now a routine daily outcome (per the process note logged 2026-08-14). The one arguably notable item — sitemap shrinking again — is a continuation of an already-flagged trend, not new information. Staying quiet today.
