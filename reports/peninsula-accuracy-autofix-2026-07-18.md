# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Saturday, 18 July 2026  
**Run time:** 20:42 UTC  
**Job:** `pi-daily-accuracy-autofix`  
**Status:** Complete — Bucket 1 applied; Bucket 2 deferred (needs approval)

---

## Summary

- **Bucket 1 applied:** 1 action (8 expired event files moved to archive)
- **Bucket 2 deferred:** 1 action (site rebuild — needs approval)
- **Build triggered:** No — rebuild is the Bucket 2 item and requires explicit approval
- **Committed:** Yes (source-only changes)
- **Pushed:** Yes

---

## Bucket 1 Action: Archive 8 Expired Event Files

All 8 events flagged in the scan report already had `status: archived` in source. They had not been physically relocated from the active events directory to the `archive/` subdirectory.

**Action taken:** Moved the following 8 files from `next/src/content/events/` → `next/src/content/events/archive/`:

| Slug | End Date | Days Expired |
|------|----------|-------------|
| `boneo-community-market` | 2026-06-20 | 28 days |
| `emu-plains-market-balnarring` | 2026-06-20 | 28 days |
| `pearcedale-community-market` | 2026-06-20 | 28 days |
| `mt-eliza-farmers-market` | 2026-06-24 | 24 days |
| `dromana-community-market` | 2026-06-28 | 20 days |
| `mornington-tourist-railway-school-holiday-special-runs` | 2026-07-05 | 13 days |
| `mornington-peninsula-regional-gallery-school-holiday-workshops` | 2026-07-10 | 8 days |
| `youth-services-school-holiday-program` | 2026-07-10 | 8 days |

No content edits were needed — status fields and endDates were already correct. This was a physical organisation fix only.

---

## Bucket 2 Deferred: Site Rebuild

The scan report classified the site rebuild as **Bucket 2 (Needs Approval)** because it would simultaneously deploy 3 missed dispatches:
- `peninsula-this-weekend-jul-04.md`
- `peninsula-this-weekend-jul-11.md`
- `peninsula-this-weekend-jul-18.md`

This crosses into editorial territory. The rebuild was **not triggered** in this autofix run.

**Impact of deferral:** The 8 archived events will remain visible on the live `/whats-on/index.html` until the next approved rebuild. Their source files are correctly organised.

**To resolve Bucket 2:** Approve a full site rebuild. Once triggered, all of the following will resolve in a single build:
1. 8 expired events removed from `/whats-on/`
2. 3 missed dispatches deployed to `/journal/`
3. Homepage weekend-picker updated from Jun 27–28 → Jul 18–19

---

## Forward Warnings (from scan)

Two events in the `2026-07-18.json` weekend-picks expire **tomorrow (Sunday 19 July)**:

| Slug | End Date |
|------|----------|
| `faux-snow-flurries-arthurs-seat-eagle-2026` | 2026-07-19 |
| `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` | 2026-07-19 |

**Recommendation for Monday 20 July:** Update weekend-picks before any rebuild so the deploy is already current.

---

## Skipped: Homepage Updates

Standard Bucket 1 steps 2–3 (update homepage weekendPlanner, replace stale event cards) were not applicable — these issues are part of the Bucket 2 rebuild scope. The homepage data requires a rebuild to take effect regardless.

---

*Report generated: 2026-07-18 20:42 UTC*  
*Next autofix: 2026-07-19 20:35 UTC*
