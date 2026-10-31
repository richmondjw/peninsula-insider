# Peninsula Insider accuracy scan — 23 September 2026

**Scan time:** 2026-09-23 20:20 UTC  
**Repository state:** `git pull --ff-only origin main` succeeded (`39a46ff` → `2e05357`).  
**Scope:** current live Astro site and `next/src/content` / `next/src/pages`. Root legacy `index.html` and root `whats-on/*.html` were not used as current-site evidence. No content edits or publishing actions were made.

## Result

**0 confirmed live defects; 0 safe auto-fixes; 0 approval items; 0 verification-only items.**

### Red Hill Community Market — checked explicitly

- **Exact live URLs:** https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/ and https://peninsulainsider.com.au/eat/red-hill-market/
- **Observed page content:** Both URLs return HTTP 200 but synchronously redirect to `/explore/markets/` and `/eat/markets/` respectively. Neither live URL currently presents a future visit date or recommends visiting the original Red Hill Community Market. No defect is confirmed.
- **Primary official source:** https://www.redhillcommunitymarket.com.au/ — states that the original Red Hill Community Market is temporarily closed, is not running until a new location is found, and that no markets associated with the original market are currently running. It separately identifies Hill & Ridge Community Market; the two events were not treated as interchangeable.
- **Source record:** `next/src/content/events/red-hill-market-first-saturday.json` is archived; `next/src/content/venues/red-hill-market.json` is closed and sitemap-excluded. Both were checked against the live result.
- **Confidence:** High.
- **Action:** None required from this scan. Continue to keep the original market separate from Hill & Ridge and do not treat a future recurrence as safe while the official source says closed.

## Other live surfaces checked

- **Homepage:** HTTP 200; current “This weekend” window is 26–27 September. No original Red Hill Community Market recommendation was surfaced in extracted content.
- **What’s On:** HTTP 200; current window is Fri 25–Sun 27 September. Current picks and listings are forward-dated; no original Red Hill Community Market listing was surfaced.
- **Recommendations:** No separate current `/recommendations/` route was found during the scan; no recommendation claim was assessed there.

## Classification

- **Safe auto-fix:** 0
- **Needs approval:** 0
- **Needs verification:** 0

## Filing

Mission Control Docs filing was unavailable in the connected tool set. **Filing gap:** no document ID was recorded. This report supersedes the earlier same-day report that incorrectly treated the redirected legacy URLs as live defect evidence. No report labeled “invalid legacy root” was found.
