# Peninsula Insider accuracy scan — 25 September 2026

**Scan time:** 2026-09-25 20:20 UTC  
**Repository state:** `git pull --ff-only origin main` succeeded (`15ad4e7` → `ce5088d`).  
**Scope:** current live Astro site and `next/src/content` / `next/src/pages`. Root legacy `index.html` and root `whats-on/*.html` were not used as current-site evidence. No content edits or publishing actions were made.

## Result

**0 confirmed live defects; 0 safe auto-fixes; 0 approval items; 0 verification-only items.**

### Red Hill Community Market — checked explicitly

- **Exact live URLs:** https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/ and https://peninsulainsider.com.au/eat/red-hill-market/
- **Observed page content:** Both URLs return HTTP 200 and synchronously redirect to `/explore/markets/` and `/eat/markets/` respectively. Neither live URL currently presents a future visit date or recommends visiting the original Red Hill Community Market. The current `/eat/markets/` content distinguishes the temporarily closed original from Hill & Ridge Community Market. No confirmed live defect.
- **Primary official source:** https://www.redhillcommunitymarket.com.au/ — states that the original Red Hill Community Market is temporarily closed and not running until a new location is found; it also states that no markets associated with the original market are currently running. It separately identifies Hill & Ridge Community Market; the two events were not treated as interchangeable.
- **Claim checked:** A future recurrence for the original market would not be safe while the official source says closed or unsourced. No such future recommendation is currently presented on the live URLs.
- **Confidence:** High.
- **Action:** None required. Continue keeping the original market separate from Hill & Ridge.

## Other live surfaces checked

- **Homepage:** HTTP 200; current “This weekend” window is 26–27 September. No original Red Hill Community Market recommendation was surfaced in extracted content.
- **What’s On:** HTTP 200; current window is Fri 25–Sun 27 September. Current picks/listings are forward-dated; no original Red Hill Community Market listing was surfaced. The expired Bass & Flinders listing is explicitly marked “Ended,” so it was not classified as a live defect.
- **Recommendations:** No separate current `/recommendations/` route was found during the scan; no recommendation claim was assessed there.
- **Current records:** The original Red Hill event record is archived and the venue record is closed/sitemap-excluded. The separate Hill & Ridge record has a source-backed 3 October 2026 occurrence and was not conflated with the original market.

## Classification

- **Safe auto-fix:** 0
- **Needs approval:** 0
- **Needs verification:** 0

## Filing

Mission Control Docs filing was unavailable: the connected document-control tool reported no connected Codex document sessions. **Filing gap:** no document ID was recorded. This report supersedes any prior report labeled “invalid legacy root”; none was found in the repository.
