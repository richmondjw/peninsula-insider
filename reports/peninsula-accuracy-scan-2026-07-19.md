# Peninsula Insider — Daily Accuracy Scan
**Date:** Sunday, 19 July 2026  
**Run time:** 20:20 UTC  
**Job:** `pi-daily-accuracy-scan`  
**Agent:** Remy  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`

---

## Summary

- Total issues found: **3**
- Safe auto-fix (Bucket 1): **1** (2 event files to archive)
- Needs approval (Bucket 2): **1** (homepage weekend planner rollover)
- Needs verification (Bucket 3): **1** (upcoming weekend dispatch status)
- Governance gates: **All clean**

---

## Surfaces Checked

| Surface | Status |
|---|---|
| Homepage (`next/src/data/homepage.json`) | ✅ Checked |
| Hero carousel (`next/src/data/home-hero-slides.json`) | ✅ Checked |
| What's On partner slot (`next/src/data/whats-on-partner.json`) | ✅ Checked |
| Navigation eyebrows (`next/src/lib/v4-nav.ts`) | ✅ Checked |
| Current weekend dispatch (`peninsula-this-weekend-jul-18.md`) | ✅ Checked |
| Weekend picks JSON (`2026-07-18.json`) | ✅ Checked |
| All published event files (40 active, 46 archived) | ✅ Checked |
| All published article files | ✅ Checked |
| Dispatch history (upcoming Jul 25–26) | ✅ Checked |

---

## Issue Register

---

### ISSUE 001 — Two events expire today, still marked `published`
**Bucket:** 1 — Safe auto-fix  
**Severity:** Low  
**Files:**
- `next/src/content/events/faux-snow-flurries-arthurs-seat-eagle-2026.json` — `endDate: 2026-07-19`, `status: published`
- `next/src/content/events/sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026.json` — `endDate: 2026-07-19`, `status: published`

**Detail:** Both events end today (Sunday 19 July). After today they should no longer surface on What's On or in search. The previous autofix run (July 18) flagged these as forward warnings. Both files need `status` changed to `archived` and physical move to `next/src/content/events/archive/`.

**Note:** `faux-snow-flurries` also appears in the homepage weekendPlanner card (see ISSUE 002 below).

**Autofix action:** Set `status: archived`, move to `events/archive/` directory.

---

### ISSUE 002 — Homepage weekendPlanner stale: still showing Jul 18–19 events
**Bucket:** 2 — Needs approval  
**Severity:** Medium  
**File:** `next/src/data/homepage.json`  
**Field:** `weekendPlanner`

**Detail:** The homepage weekendPlanner still reads "This weekend - 18 to 19 July" with four event cards:
1. Red Hill Truffles — still active (ends Sep 2026) ✅
2. Pt Leo Estate Sculpture Park — still active (ends Apr 2027) ✅
3. **Faux Snow Flurries, Arthurs Seat Eagle — expires TODAY (Jul 19)** ✗
4. Flinders Truffles — still active (ends Aug 2026) ✅

The weekend it covers is now over. The planner needs to roll forward to the upcoming weekend (July 25–26). Card 3 (Faux Snow Flurries) is no longer valid after today.

**Active events suitable for the Jul 25–26 weekend planner:**
- Red Hill Truffles (ongoing, truffle season)
- Flinders Truffles (ongoing, truffle season)
- `soil-cellar-flinders-truffles-x-polperro-winery` — single-day event Saturday 25 July
- MPRG winter exhibitions (Helen Britton, Natalia Milosz-Piekarska — end Aug 2026)
- Stonier Fire & Wine Winter Lunch (ends Aug 9)
- Red Hill Brewery Secret Stash Weekend (ends Aug 16)
- Peninsula Hot Springs Bathe in Cinema Thursdays (ends Jul 31)

**Approval required:** Editorial decision on what events to feature for Jul 25–26. Once approved, autofix can apply the homepage update.

---

### ISSUE 003 — No dispatch filed for upcoming weekend Jul 25–26
**Bucket:** 3 — Needs verification  
**Severity:** Medium  
**Expected file:** `next/src/content/articles/peninsula-this-weekend-jul-25.md`

**Detail:** The most recent dispatch is `peninsula-this-weekend-jul-18.md` (covering Jul 18–19). No dispatch for the upcoming weekend (Jul 25–26) was found in the content directory or reports. Today's dispatch workflow (08:30–11:30 UTC) should have produced this. Current status is unclear — the dispatch may be in an approval queue, may have been blocked, or may not have run.

**Action required:** Verify whether today's dispatch pipeline completed successfully and whether a Jul 25–26 dispatch exists in a draft or approval state.

---

## Clean Checks

| Check | Result |
|---|---|
| Expired event files with `status: published` | None (all 46 expired events correctly marked `archived`) |
| Active events with future `endDate` | 40 files, all clean |
| Events expiring today | 2 (see ISSUE 001) |
| Events expiring in next 7 days | 1 — `soil-cellar-flinders-truffles-x-polperro-winery` (ends 2026-07-25, single-day event, correct) |
| Hero carousel | Clean — LOCKED, evergreen content |
| What's On partner slot | Clean — `enabled: false` |
| Navigation eyebrows | Clean — "Winter '26" across all 6 pillars |

---

## Governance Gates

| Gate | Result |
|---|---|
| `tmp-placeholder` images in published articles | **0** — Clean |
| Missing `lastVerified` on published articles | **0** — Clean |
| `lastVerified` older than 90 days | **0** — Clean |
| Pricing without disclaimer | **0** — Clean |

**Governance: All gates clean.**

---

## Autofix Recommendations (for `pi-daily-accuracy-autofix`)

**Apply immediately (Bucket 1):**
1. Set `status: archived` on `faux-snow-flurries-arthurs-seat-eagle-2026.json` and move to `events/archive/`
2. Set `status: archived` on `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026.json` and move to `events/archive/`

**Hold for approval (Bucket 2):**
1. Homepage weekendPlanner rollover to Jul 25–26 — editorial approval required on event selection

**Hold for verification (Bucket 3):**
1. Jul 25–26 dispatch — verify pipeline status before any action

---

*Report filed: `reports/peninsula-accuracy-scan-2026-07-19.md`*  
*Next run: Monday 20 July 2026, 20:20 UTC*
