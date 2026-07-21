# Peninsula Insider — Daily Accuracy Scan
**Date:** Saturday, 18 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — issues found (scan only, no content edits)

---

## Summary

- **Issues found:** 2 active
- **Bucket 1 — Safe auto-fix:** 1 (expired events on live What's On page)
- **Bucket 2 — Needs approval:** 1 (site rebuild required — 3 weeks of dispatches not deployed)
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0
- **Forward warnings:** 2 (events expiring tomorrow, July 19)
- **Methodological note:** Prior scans (Jul 10–17) incorrectly reported homepage as clean. See §8.

---

## Governance

- **0** articles with stale/missing `lastVerified`
- **0** articles with unresolved `tmp-placeholder` images
- **0** articles with pricing but no disclaimer
- **0** partner disclosure flags

---

## Issue 1 — Bucket 2 (Needs Approval): Site not rebuilt — three dispatches missing from live

**Surfaces affected:** Homepage (`/`), `/whats-on/this-weekend/`  
**Severity:** High — live front-door content is 3 weeks out of date

### What the live site shows:
- Homepage weekend-picker: *"This weekend · 27–28 June"*
- `/whats-on/this-weekend/`: Full jun-27 dispatch rendered with stale structured data:
  - `startDate: 2026-06-26T07:00:00.000Z`
  - `endDate: 2026-06-28T13:59:00.000Z`
- Live journal (`/journal/`) has no July dispatch pages

### What should be live:
- Current dispatch: `peninsula-this-weekend-jul-18.md` (publishedAt: 2026-07-13, verified: 2026-07-12)
- Missed dispatches (exist in source but never built/deployed):
  - `peninsula-this-weekend-jul-04.md` (publishedAt: 2026-06-29)
  - `peninsula-this-weekend-jul-11.md` (publishedAt: 2026-07-10)
  - `peninsula-this-weekend-jul-18.md` (publishedAt: 2026-07-13)

### Root cause:
Last full site build was committed `2026-07-05 00:09 UTC` (commit `d7990236c5`: *"build: refresh live root mirror from clean source"*). Since then, all content has been updated in source only — quick notes, strategy refreshes, daily picks — but the weekly dispatch pages have not triggered a rebuild.

**Action required:** Site rebuild and deploy. The autofix job should trigger `build-live.sh` to deploy the current state (jul-18 dispatch and all intermediate July dispatches). This crosses into editorial territory (deploying 3 dispatches at once) — flagging here for approval.

---

## Issue 2 — Bucket 1 (Safe Auto-Fix): Expired events on live What's On page

**Surface affected:** `/whats-on/index.html`  
**Count:** 8 events

These events appear in the live built What's On page with endDates now in the past. They were not expired at the time of the July 5 build. They should be removed from the live rendered surface via the next rebuild.

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

**Note:** These will resolve automatically on the next rebuild — no individual source edits required. The source event files exist and have correct endDates; the issue is that the live HTML has not been refreshed.

---

## Forward Warnings

Two events in the `2026-07-18.json` weekend-picks expire **tomorrow (Sunday 19 July)**:

| Slug | End Date | Notes |
|------|----------|-------|
| `faux-snow-flurries-arthurs-seat-eagle-2026` | 2026-07-19 | School holidays programme ends Sunday |
| `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` | 2026-07-19 | School holidays programme ends Sunday |

**Action for Monday 20 July autofix:** After any rebuild, remove these two from the weekend-picks and replace with appropriate July/August events. Since a rebuild is overdue anyway, this should be handled as part of the rebuild package — update weekend-picks before building.

---

## Surfaces Checked

| Surface | Status |
|---------|--------|
| Homepage — weekend-picker block | ⚠️ Shows Jun 27–28 dispatch (3 weeks stale) |
| `/whats-on/this-weekend/` | ⚠️ Shows Jun 27–28 content, structured data wrong |
| `/journal/` live dispatch pages | ⚠️ Missing Jul 4, Jul 11, Jul 18 dispatches |
| `/whats-on/index.html` events | ⚠️ 8 expired events present |
| `/whats-on/index.html` featured events | ✅ Main Street Festival (Oct), Hill Ridge (Sep), Bloody Long Walk (Oct), National Works on Paper (Sep–Nov) all valid |
| Weekend picks source (`2026-07-18.json`) | ✅ All 4 events valid for Jul 18–19 |
| Current dispatch source (`peninsula-this-weekend-jul-18.md`) | ✅ Events valid, dates correct, `lastVerified: 2026-07-12` |
| Event source files — freshness | ✅ 54 archived events filtered correctly in source; 42 current/upcoming |
| Articles — `lastVerified` staleness (>90 days) | ✅ Zero |
| Articles — image licences (`tmp-placeholder`) | ✅ Zero |
| Articles — pricing without disclaimer | ✅ Zero |
| Partner disclosure gate | ✅ No flags |
| Quick notes today (Jul 18) | ✅ Weather, editor note, cellar door — correct expiry windows |

---

## Current Weekend Event Validation

Current dispatch covers: **Saturday 18 – Sunday 19 July 2026**

| Position | Event Slug | End Date | Status | Valid? |
|----------|-----------|----------|--------|--------|
| 1 (lead) | `red-hill-truffles-winter-truffle-hunt-season` | 2026-09-30 | published | ✅ |
| 2 (sunday) | `pt-leo-estate-sculpture-park` | 2027-04-30 | published | ✅ |
| 3 (rainy day) | `helen-britton-story-so-far-mprg-2026` | 2026-08-23 | published | ✅ |
| 4 (quieter alt) | `flinders-truffles-winter-truffle-hunt-season` | 2026-08-31 | published | ✅ |

---

## §8 — Methodological Note: Prior Scan Accuracy

Scans from **10–17 July 2026** reported the homepage weekend-picker as clean, e.g.:
> *"Homepage — HomeWeekend module (`weekendWindow` → 2026-07-18) | ✅ Clean — resolves to `2026-07-18.json` picks, all 4 events valid"*

This finding was incorrect. Today's scan verified the actual live HTML files. The live `index.html` and `whats-on/this-weekend/index.html` both contain statically rendered Jun 27-28 dispatch content — this is visible to users and search engines.

Prior scans were validating the source weekend-picks JSON files (which are correct) rather than the live built HTML output. The build gap was not detected.

**Future scans must verify the live HTML directly**, not infer correctness from source data alone.

---

*Report generated: 2026-07-18 20:20 UTC*  
*Next scan: 2026-07-19 20:20 UTC*  
*Autofix job: 2026-07-18 20:35 UTC*
