# Peninsula Insider Daily Accuracy Scan — 2026-09-26

## Status

- Git sync: passed (`git pull --ff-only origin main`), fast-forward to `3eb753a`.
- Scope: current Astro/live site only; no root legacy `index.html` or root `whats-on/*.html` used as evidence.
- Findings: 0 confirmed live accuracy defects; 1 verification note.
- Content edits: none.
- Mission Control Docs: filing gap — no connected authorized document session was available; no document ID.
- Legacy-root reports: superseded by this current-site report; do not use any report labeled `invalid legacy root` as current evidence.

## Verification note

The original Red Hill Community Market is temporarily closed. The official source says so at https://www.redhillcommunitymarket.com.au/ and separately notes that Mount Martha Briars Market takes over the regular schedule. The separate Hill & Ridge Community Market is not the original event.

Current live replacement surfaces correctly state the distinction and closure:

- https://peninsulainsider.com.au/explore/markets/ — says “The original Red Hill Community Market is temporarily closed”; lists Hill & Ridge separately and identifies its 3 October 2026 date.
- https://peninsulainsider.com.au/eat/markets/ — says the original market is temporarily closed and describes Hill and Ridge as separate.
- https://peninsulainsider.com.au/whats-on/red-hill-market-first-saturday/ — current live route is a redirect to `/explore/markets/`; it does not present a future original-market visit date.
- https://peninsulainsider.com.au/eat/red-hill-market/ — current live route is a redirect to `/eat/markets/`; it does not present a future original-market visit date.

Therefore the requested confirmed defect condition is **not present**: the live original-market pages do not still recommend a future visit date.

## Primary-source check

- Official source: https://www.redhillcommunitymarket.com.au/
- Observed official content: “The Red Hill Community Market® is temporarily closed.”
- Confidence: high.
- Action: no content change; retain current redirects and closure/separation wording. Recheck organiser status before any future relaunch or date claim.

## Surface summary

- Homepage: current site fetched successfully; no original Red Hill Community Market recommendation observed.
- What's On: current calendar fetched successfully; current market/event entries observed, with no original Red Hill Community Market future listing.
- Current recommendations: market landing pages are closure-aware and distinguish Hill & Ridge.
- Unsourced/closed/future records: no currently presented original-market record requiring action found in the live Astro surfaces.
