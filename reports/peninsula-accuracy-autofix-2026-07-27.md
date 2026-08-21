# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Monday, 27 July 2026  
**Run time:** 08:46 UTC  
**Job:** `pi-daily-accuracy-autofix`  
**Agent:** Remy  
**Source scan:** `reports/peninsula-accuracy-scan-2026-07-27.md`

---

## Summary

- Bucket 1 items found: **1**
- Bucket 1 items applied: **1**
- Build status: **PASS** (932 pages built)
- Pushed to origin: **Yes**

---

## Changes Applied

### ISSUE 001 — `mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json` archived

**Action:** Set `status: "archived"`, moved file to `next/src/content/events/archive/`  
**Reason:** Event `endDate: 2026-07-26` — ended yesterday (26 July 2026). File was still `status: published` and would have continued surfacing on What's On queries.  
**File moved:** `next/src/content/events/mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json` → `next/src/content/events/archive/`

---

## Build Fix

The build failed initially with `Cannot find module @rollup/rollup-linux-x64-gnu`. This is a known npm optional-dependency bug. Installed the missing native module via `npm install @rollup/rollup-linux-x64-gnu --save-optional`. Build then completed successfully.

---

## Items NOT Acted On

| Issue | Bucket | Reason held |
|---|---|---|
| Homepage weekendPlanner rollover (Jul 18–19 → Aug 1–2) | 2 | Needs editorial approval on event selection and card copy |
| Jul 25–26 dispatch gap | 3 | Weekend passed; no action needed; verification with James pending |
| Aug 1–2 dispatch missing | 3 | Urgent — 5 days away; human decision required to commission |
| 77 articles with stale `lastVerified` (>90 days) | 2 | Editorial queue decision required |

---

## Governance

No Bucket 1 governance actions were required. All governance issues are in Bucket 2 and flagged in the scan report.

---

*Report filed: `reports/peninsula-accuracy-autofix-2026-07-27.md`*  
*Scan source: `reports/peninsula-accuracy-scan-2026-07-27.md`*  
*Commit: `autofix: daily accuracy fixes 2026-07-27`*
