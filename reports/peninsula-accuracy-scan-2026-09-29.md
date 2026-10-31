# Peninsula Insider Daily Accuracy Scan — 2026-09-29

## Status

- Git sync: passed (`git pull --ff-only origin main`), fast-forward to `9f7158e`.
- Scope: current Astro source and live site only. Root legacy `index.html` and root `whats-on/*.html` were not used as current-site evidence.
- Findings: **0 confirmed current live defects; 0 safe auto-fixes; 0 approval items; 0 verification-only items.**
- Content edits: none.
- Any report labeled `invalid legacy root` is superseded by this current-site report.

## Explicit Red Hill Community Market check

- **Exact live URLs:**
  - https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/
  - https://peninsulainsider.com.au/eat/red-hill-market/
- **Claim checked:** The original Red Hill Community Market must not be presented with a future visit date while the official source says it is closed or unsourced.
- **Observed live content:** Both URLs return HTTP 200 with a “Redirecting…” page and do not present a future visit date or active recommendation for the original market. Current live What’s On presents **Hill & Ridge Community Market, 3 October 2026** as a separate event; the original market is not listed.
- **Official source:** https://www.redhillcommunitymarket.com.au/ — title and body state that the original Red Hill Community Market is temporarily closed, is not running until a new location is found, and that markets associated with the original are not currently running. The source separately identifies other markets and does not make Hill & Ridge the original event.
- **Confidence:** High.
- **Action:** None. Retain the redirects and closure/separation wording. Do not treat Hill & Ridge’s future date or recurrence as evidence that the original market has reopened.

## Other current surfaces checked

- **Homepage:** HTTP 200; current “This weekend” window is 3–4 October. No original Red Hill Community Market recommendation observed.
- **What’s On:** HTTP 200; current window is Fri 2–Sun 4 October. Hill & Ridge is listed separately for Saturday 3 October; no original-market listing observed.
- **Current recommendations:** Current live market landing content distinguishes the temporarily closed original from Hill & Ridge; no unsafe original-market recommendation observed.
- **Current source records:** `next/src/content/events/red-hill-market-first-saturday.json` is archived; `next/src/content/venues/red-hill-market.json` is closed/sitemap-excluded. Both records explicitly distinguish the original from Hill & Ridge and carry no current future occurrence for the original.

## Filing

Mission Control Docs filing was unavailable: no authorized document connector/session was available in this run. **Filing gap:** no document ID was recorded. The repo report is the only filed copy for this run.
