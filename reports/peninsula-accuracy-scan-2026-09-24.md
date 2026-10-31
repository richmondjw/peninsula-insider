# Peninsula Insider daily accuracy scan — 2026-09-24

## Status

- Scan completed against the current Astro source and live site at 2026-09-24 20:20 UTC.
- `git pull --ff-only origin main` succeeded before scanning (`af5e046`).
- No content edits made.
- **Confirmed current live defects: 0.**
- The requested original Red Hill Community Market URLs return a live 200 response whose extracted content is only “Redirecting…”; neither currently presents a future visit date or active recommendation.

## Scope and checks

Checked the live homepage, current What's On surface, current Eat/recommendations surface, the two specified Red Hill URLs, the official Red Hill Community Market site, and current Astro content/evidence under `next/src`.

The homepage currently presents the 26–27 September weekend and general Red Hill & ridge guidance. What's On presents the 25–27 September window and current picks including Dromana Community Market; the original Red Hill event is not in the current listings. Eat editorial choices do not include Red Hill Market.

## Red Hill Community Market — explicit check

- **Live URL:** https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/
  - **Claim / observed content:** HTTP 200; page extraction is “Redirecting…” only. No future date or visit recommendation is currently presented.
- **Live URL:** https://peninsulainsider.com.au/eat/red-hill-market/
  - **Claim / observed content:** HTTP 200; page extraction is “Redirecting…” only. No future date or visit recommendation is currently presented.
- **Official source:** https://www.redhillcommunitymarket.com.au/ — page title and body state that the original Red Hill Community Market is temporarily closed, is not running until a new location is found, and that no markets associated with the original are currently running.
- **Confidence:** High.
- **Action:** No live fix required. Continue to keep the original record archived and distinguish it from the separate Hill & Ridge Community Market. Do not treat the separate market’s first-Saturday recurrence as evidence that the original has reopened.

## Source-state findings

The Astro record `next/src/content/events/red-hill-market-first-saturday.json` is archived and explicitly says the original market is temporarily closed and distinct from Hill & Ridge. This is consistent with the official source and is not reported as a live defect because it is not currently presented as an active recommendation.

No other confirmed current defect was established from the checked live surfaces. Unsourced, closed, or future-occurrence records were not treated as defects unless currently presented live.

## Filing

Mission Control Docs filing was unavailable in the connected tool set. **Filing gap:** no document ID was recorded. The repo report is the only filed copy for this run.

