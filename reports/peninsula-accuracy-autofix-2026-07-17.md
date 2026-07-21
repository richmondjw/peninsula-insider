# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Friday, 17 July 2026  
**Run time:** 20:40 UTC  
**Autofix agent:** Remy  
**Job:** `pi-daily-accuracy-autofix`  
**Status:** Complete — no changes required

---

## Summary

- **Bucket 1 items actioned:** 0
- **Files modified:** 0
- **Build run:** No (no changes to verify)
- **Commit/push:** No (no changes)

---

## Source Scan Report

Read: `peninsula-accuracy-scan-2026-07-17.md`

All surfaces clean. Scan reported **0 Bucket 1 items**. No expired events on live surfaces, no stale homepage cards, no dispatch drift.

---

## Forward Warning (carry-forward)

Two school holiday events expire Sunday 19 July 2026 — autofix required on **Monday 20 July**:

- `faux-snow-flurries-arthurs-seat-eagle-2026` (endDate: 2026-07-19)
- `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` (endDate: 2026-07-19)

Monday autofix should: archive both event files → `next/src/content/events/archive/` with `status: archived`, and refresh `weekend-picks` accordingly.

---

No action taken today. Site is clean for the July 18–19 weekend.
