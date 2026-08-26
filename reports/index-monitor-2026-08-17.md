# Peninsula Insider — Index Monitor Report

**Date:** 2026-08-17  
**Site went live:** 2026-08-03 (14 days ago)  
**Prior report:** 2026-08-16

## 1. Google indexed page count (`site:peninsulainsider.com.au`)

- Requested via `web_search`; its current DuckDuckGo-backed provider returned a bot-detection challenge, so no result set or count was available today.
- This check is only an estimate in any case: the environment has no first-party Google Search API and the search provider caps/suppresses totals.

## 2. Bing indexed page count (`site:peninsulainsider.com.au`)

- HTTP 200 from Bing.
- SERP displayed: **About 5,090 results** (`sb_count`).
- This is materially different from the prior reported ~51, so it should be treated as an unstable SERP estimate rather than a reliable coverage metric.

## 3. IndexNow aggregator push

- Sitemap: `https://peninsulainsider.com.au/sitemap.xml` — HTTP 200, **610 URLs**.
- Submitted all 610 sitemap URLs to `https://api.indexnow.org/indexnow` with the configured key and key location.
- **Result: HTTP 200 — accepted.**

## Notification decision

IndexNow accepted the submission, meeting the cron’s notification condition. A one-line update is due to James in Telegram topic 381.
