# Peninsula Insider accuracy scan — 23 September 2026

**Scan time:** 2026-09-23 12:18 UTC  
**Repository state:** `git pull --ff-only origin main` succeeded; already up to date.  
**Scope:** current live Astro pages and `next/src/content`, `next/src/pages`, and evidence records. Root legacy `index.html` and root `whats-on/*.html` were not used as current-site evidence. No content edits or publishing actions were made.

## Result

**1 confirmed live defect; 0 safe auto-fixes; 0 approval items; 0 additional verification-only items.**

### Confirmed defect — needs verification / consequential correction

- **Exact live URLs:**
  - https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/
  - https://peninsulainsider.com.au/eat/red-hill-market/
- **Claim presented:** The original Red Hill Market runs on the first Saturday monthly from September through May, with 200+ stalls; the live event record has `nextOccurrence: 2026-10-03`.
- **Observed live content:** The event page says “Red Hill Market runs the first Saturday of the month from September through May” and instructs readers to arrive at 8:45am and park at the recreation reserve. The venue page says it is held on the first Saturday from September through May at Red Hill Recreation Reserve and calls it an essential weekend experience.
- **Primary official source:** https://www.redhillcommunitymarket.com.au/ — page title/body state “The Red Hill Community Market is temporarily closed”, “not running until a new location is found”, and “no markets associated with the original Red Hill Market® are currently running”. It distinguishes the separate Hill & Ridge Community Market and says the original market is no longer running at the reserve.
- **Source record evidence:** `next/src/content/evidence/venues/red-hill-market/trading-status/trading-status-operator-2026-09-14.json` records the operator’s temporary-closure status. The event and venue records remain `sourceStatus: "unsourced"`; the event retains `nextOccurrence: "2026-10-03"`.
- **Confidence:** High — official operator source directly disputes the live recommendation and the displayed future recurrence.
- **Action:** Remove/suspend the original-market live recommendation and future recurrence, or replace it only after separately verifying the distinct Hill & Ridge Community Market. Do not merge the two markets. Held for editorial/content action; no edit made by this scan.

## Other live surfaces checked

- **Homepage:** HTTP 200; current “This weekend” window is 26–27 September and no Red Hill Market claim was surfaced in extracted page content.
- **What’s On:** HTTP 200; current window is Fri 25–Sun 27 September and current picks/listings were forward-dated. The Red Hill original-market entry was not present in the extracted current-weekend list, but its direct event and venue pages remain live, so the defect above is currently presented.
- **Recommendations route:** `/recommendations/` returned HTTP 404; no current recommendations surface exists at that URL, so this was recorded as a route observation rather than a content defect.

## Classification

- **Safe auto-fix:** 0
- **Needs approval:** 0
- **Needs verification / consequential correction:** 1 (Red Hill original-market pages and recurrence)
- **Confirmed source-only observations:** 0

## Filing

Mission Control Docs filing was unavailable in the connected tool set for this run. **Filing gap:** no document ID was recorded. This report supersedes the prior same-day report labeled as having no confirmed defect; no “invalid legacy root” report was found in `reports/`.
