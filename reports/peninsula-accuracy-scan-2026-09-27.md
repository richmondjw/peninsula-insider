# Peninsula Insider Daily Accuracy Scan — 2026-09-27

## Status

- Git sync: passed (`git pull --ff-only origin main`), fast-forward to `4da51ff`.
- Scope: current Astro/live site only; root legacy `index.html` and root `whats-on/*.html` were not used as evidence.
- Findings: 0 confirmed live accuracy defects; 1 verification note.
- Content edits: none.
- Mission Control Docs: filing gap — no connected authorized document session was available; no document ID.
- Any report labeled `invalid legacy root` is superseded by this current-site report.

## Verification note — Red Hill Community Market

- **Exact live URLs:** https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/ and https://peninsulainsider.com.au/eat/red-hill-market/
- **Claim checked:** The original Red Hill Community Market should not be presented with a future visit date while its source status is closed or unsourced.
- **Observed live content:** Both URLs return HTTP 200 and redirect to current market landing pages (`/explore/markets/` and `/eat/markets/`). They do not present a future visit date for the original market. The current market content states the original is temporarily closed and distinguishes Hill & Ridge Community Market.
- **Official source:** https://www.redhillcommunitymarket.com.au/ — “The Red Hill Community Market® is temporarily closed” and is not running until a new location is found; it separately states that markets at Red Hill may have no association with the original market.
- **Confidence:** High.
- **Action:** No content change. Retain redirects and closure/separation wording; recheck the organiser before any future original-market date claim.

## Other current surfaces checked

- **Homepage:** HTTP 200; current “This weekend” window is 3–4 October. No original Red Hill Community Market recommendation observed.
- **What’s On:** HTTP 200; current window is Fri 2–Sun 4 October. Hill & Ridge Community Market is listed as a separate event for 3 October; no original-market listing observed.
- **Current recommendations and records:** The current Astro pages and records distinguish the archived/temporarily closed original market from the source-backed Hill & Ridge event. No currently presented unsourced, closed, or unsafe future original-market record requiring action was found.

## Classification

- **Safe auto-fix:** 0
- **Needs approval:** 0
- **Needs verification:** 0

## Filing

Mission Control Docs filing was unavailable because no authorized document connector/session was available in this run. **Filing gap:** no document ID was recorded.
