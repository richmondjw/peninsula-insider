# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Sunday, 19 July 2026  
**Run time:** 20:45 UTC  
**Job:** `pi-daily-accuracy-autofix`  
**Agent:** Remy  
**Source scan:** `reports/peninsula-accuracy-scan-2026-07-19.md`

---

## Summary

- Bucket 1 items applied: **2** (both event files archived)
- Bucket 2 items skipped: **1** (homepage weekendPlanner rollover — needs editorial approval)
- Bucket 3 items skipped: **1** (Jul 25–26 dispatch — needs verification)
- Build: **✅ Passed** (976 pages, 1m 46s)
- Commit: **✅ Pushed to origin**

---

## Actions Taken

### 1. Archived: `faux-snow-flurries-arthurs-seat-eagle-2026.json`
- **File:** `next/src/content/events/faux-snow-flurries-arthurs-seat-eagle-2026.json`
- **Action:** Set `status: "archived"`, moved to `next/src/content/events/archive/`
- **Reason:** `endDate: 2026-07-19` — event ends today (school holidays over)

### 2. Archived: `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026.json`
- **File:** `next/src/content/events/sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026.json`
- **Action:** Set `status: "archived"`, moved to `next/src/content/events/archive/`
- **Reason:** `endDate: 2026-07-19` — event ends today (school holidays over)

---

## Skipped (Bucket 2 — Needs Approval)

### Homepage weekendPlanner rollover (ISSUE 002)
The weekendPlanner block in `next/src/data/homepage.json` still references "This weekend - 18 to 19 July". Rolling forward to Jul 25–26 requires editorial sign-off on event selection. No action taken.

---

## Skipped (Bucket 3 — Needs Verification)

### Jul 25–26 dispatch missing (ISSUE 003)
No `peninsula-this-weekend-jul-25.md` found. Status of dispatch pipeline unclear. No action taken.

---

## Build Notes

Build passed after `npm install` to resolve a pre-existing `@rollup/rollup-linux-x64-gnu` optional dependency issue (unrelated to content changes). 976 pages built cleanly.

---

*Next autofix run: Monday 20 July 2026, 20:45 UTC*
