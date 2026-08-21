# Peninsula Insider — Daily Accuracy Scan
**Date:** Sunday, 12 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 2
- **Bucket 1 — Safe auto-fix:** 1
- **Bucket 2 — Needs approval:** 1
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0

**Context note:** Yesterday's autofix (11 July) archived 54 expired events ✅, demoted the stale Sorrento Solstice hero slide ✅, and rebuilt the site ✅. The homepage weekendPlanner update was logged as resolved in the autofix report but the actual file (`next/src/data/homepage.json`) still contains the 27–28 June block — the change did not persist to disk.

---

## Issues Found

---

### ISSUE 01 · Bucket 1 · Safe auto-fix (carry-forward — autofix report claimed resolution but file is unchanged)
**Surface:** Homepage weekendPlanner section  
**Type:** Homepage drift — stale weekend planner  
**Confidence:** High

**Description:**  
`next/src/data/homepage.json` still contains:

```
"eyebrow": "This weekend - 27 to 28 June"
```

Despite the autofix report of 11 July 2026 claiming this was updated to "11 to 12 July", the actual file on disk has not changed. The weekend planner rail on the homepage is three weeks stale, referencing Tootgarook Market, the final Peninsula Hot Springs Sunday Sessions, and the June 27–28 truffle window — all past.

Today is Sunday 12 July 2026. The upcoming weekend dispatch covering 18–19 July was published today (commit `6398f4ffcf`). The homepage weekendPlanner should now reflect the 18–19 July window.

**Recommended autofix:** Update the `weekendPlanner` block in `next/src/data/homepage.json` to align with the upcoming weekend (18–19 July 2026), using active events:
- Red Hill Truffles: winter truffle hunt, Main Ridge (active through 2026-09-30)
- Pt. Leo Estate Sculpture Park, Merricks (active through 2027-04-30)
- Flinders Truffles: winter truffle hunt, Flinders (active through 2026-08-31)
- Stonier Fire & Wine Winter Lunch, Merricks (active through 2026-08-09)

Rebuild and redeploy after.

---

### ISSUE 02 · Bucket 2 · Needs approval
**Surface:** `next/src/content/articles/peninsula-this-weekend-jul-18.md`  
**Type:** Dispatch date accuracy — publishedAt set to Monday not Sunday  
**Confidence:** High

**Description:**  
The Peninsula This Weekend dispatch for 18–19 July 2026 was committed today (most recent commit `6398f4ffcf`) but carries `publishedAt: 2026-07-13` (Monday, tomorrow). Per the dispatch cadence (`publishDay: Sunday`, `publishTimeUTC: 11:30`), this dispatch should have `publishedAt: 2026-07-12` and been live by 11:30 UTC today.

If the Astro build filters articles by `publishedAt` date, this dispatch will not appear on the live site until tomorrow (Monday 13 July). Readers visiting today will see the 11–12 July dispatch (a past weekend) as the most recent weekend pick.

Current state:
- `status: "published"` ✅
- `publishedAt: 2026-07-13` ⚠️ (should be 2026-07-12)
- Content is valid and correct for the 18–19 July weekend ✅

**Recommended action (approval required):** Correct `publishedAt` to `2026-07-12` and rebuild. This is a date field correction, not an editorial change — however it touches a dispatch file which sits at Bucket 2 per governance policy.

---

## Resolved Since Yesterday

| Issue | Resolution |
|-------|-----------|
| 54 expired events (Issue 01 from Jul 11) | ✅ Archived via PR #283 (merge `397cd90d02`) |
| Stale MPRG Autumn Exhibition card (Issue 03 from Jul 11) | ✅ Resolved by archiving the event file |
| Hero carousel Sorrento Solstice slide (Issue 06 from Jul 11) | ✅ Demoted — commit `937827f372` |
| Site rebuild (Issue 04 from Jul 11) | ✅ Build passed 931 pages, deployed |
| Missing 11–12 July dispatch (Issue 05 from Jul 11) | ✅ Dispatch published — commit `75a247415f` |
| Autofix pipeline gap (Issue 07 from Jul 11) | ✅ Autofix ran at 20:55–21:10 UTC on 11 July |

---

## Upcoming Event Expiry Watch

Two events expire next Sunday (2026-07-19) — both school-holiday events:

| Event | Expires |
|-------|---------|
| faux-snow-flurries-arthurs-seat-eagle-2026.json | 2026-07-19 |
| sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026.json | 2026-07-19 |

These will be picked up by the autofix agent on Monday 20 July or the next scan after their expiry date. No action needed today.

---

## Active Events (as of 12 July 2026)

42 events with future endDate remain published. Highlights:

| Event | Active Until |
|-------|-------------|
| Soil & Cellar: Flinders Truffles × Polperro Winery | 2026-07-25 |
| Peninsula Hot Springs – Bathe-in Cinema (Thursdays) | 2026-07-31 |
| Stonier Fire & Wine Winter Lunch | 2026-08-09 |
| Red Hill Brewery Secret Stash Weekend | 2026-08-16 |
| Helen Britton: The Story So Far (MPRG) | 2026-08-23 |
| Natalia Miłosz-Piekarska: Sifted Light (MPRG) | 2026-08-23 |
| Flinders Truffles: Winter Truffle Hunt Season | 2026-08-31 |
| Red Hill Truffles: Winter Truffle Hunt Season | 2026-09-30 |
| Main Street Mornington Festival 2026 | 2026-10-18 |
| National Works on Paper 2026 (MPRG) | 2026-11-22 |

---

## Governance Check

| Gate | Status |
|------|--------|
| `tmp-placeholder` images on published articles | ✅ 0 flagged |
| `lastVerified` stale/missing (published articles) | ✅ 0 flagged |
| Articles with pricing but no disclaimer | ✅ 0 flagged |
| Undisclosed partner content | ✅ 0 flagged |

Governance gates are **clean**.

---

## Hero Carousel Status

All slides are non-time-sensitive following yesterday's demotion of the Sorrento Solstice slide:

| Slide ID | Headline |
|----------|---------|
| flinders-weekend | The *other* Peninsula weekend. |
| winter-peninsula-weekend | A *winter* Peninsula weekend. |
| late-walks | When the light *starts improving.* |
| cover | The Hatted Restaurants of the *Peninsula.* |
| cape-schanck | The lighthouse at the edge of *everything.* |

✅ Hero carousel clean — no expired event references.

---

## Working Tree Safety

This run is **scan-only** — no content edits, no autofix. Working tree safety check not required for this job. The autofix agent (`pi-daily-accuracy-autofix`) must run `bash ops/scripts/pi-autofix-safe-stash.sh check` before applying any changes.

---

## Recommended Actions for `pi-daily-accuracy-autofix` (20:35 UTC)

1. **Update homepage weekendPlanner** — replace stale 27–28 June block with 18–19 July upcoming weekend events (Issue 01)
2. **Rebuild and redeploy** after homepage update
3. **HOLD** — Issue 02 (dispatch `publishedAt` date correction) — Bucket 2, editorial approval required

---

*Scan completed by Remy · Peninsula Insider accuracy desk · 12 July 2026 · 20:20 UTC*
