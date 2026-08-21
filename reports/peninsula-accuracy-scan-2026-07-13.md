# Peninsula Insider — Daily Accuracy Scan
**Date:** Monday, 13 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 2
- **Bucket 1 — Safe auto-fix:** 2
- **Bucket 2 — Needs approval:** 0
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0

**Context note:** Yesterday's autofix (12 July) successfully updated the homepage weekendPlanner from the stale 27–28 June block to the 18–19 July window ✅. However, the autofix introduced two errors in the new weekendPlanner content: an incorrect event date on the Stonier card (listed as 18 July; actual event is 9 August), and an understated sculpture count on the Pt. Leo card. Both are safe to fix from source data.

The Jul-18 dispatch publishedAt issue flagged yesterday (Bucket 2) is now resolved — today is 13 July, so the `publishedAt: 2026-07-13` date is correct and the dispatch is live.

---

## Issues Found

---

### ISSUE 01 · Bucket 1 · Safe auto-fix
**Surface:** Homepage weekendPlanner — card 3 (Stonier Fire & Wine)  
**Type:** Event date error — wrong moment in homepage pick  
**Confidence:** High

**Description:**  
`next/src/data/homepage.json` weekendPlanner card 3 lists:

```json
{
  "moment": "Saturday 18 July",
  "title": "Stonier Fire & Wine Winter Lunch, Merricks",
  ...
}
```

The Stonier Fire & Wine Winter Lunch event file (`stonier-fire-wine-winter-lunch.json`) shows:
- `startDate: 2026-08-09`
- `endDate: 2026-08-09`

This is a **single-day event on Sunday 9 August 2026** — not Saturday 18 July. The autofix on 12 July correctly noted the event's active period includes August, but incorrectly assigned it to the 18–19 July weekend window. Stonier does not occur on July 18.

A reader using this homepage card to plan for 18–19 July would arrive expecting a Stonier lunch that does not exist on those dates.

**Recommended autofix:** Replace the Stonier card with a valid July 18–19 event. The `faux-snow-flurries-arthurs-seat-eagle-2026` event runs through 19 July (last day of school holidays, strong family pick) and is the natural replacement. Alternatively, remove the card and operate the weekendPlanner with 3 picks. Do not keep Stonier with a corrected date of "Sunday 9 August" inside a "This weekend — 18 to 19 July" module.

**Suggested replacement card:**
```json
{
  "moment": "Saturday 18 and Sunday 19 July — last days of school holidays",
  "title": "Faux Snow Flurries, Arthurs Seat Eagle",
  "note": "Faux snow on the hour every hour from 11am–4pm at the gondola summit. Last weekend of the school holidays. Best with a hot chocolate at the top; book the gondola online as peak days sell out.",
  "tag": "Booking required"
}
```

---

### ISSUE 02 · Bucket 1 · Safe auto-fix
**Surface:** Homepage weekendPlanner — card 2 (Pt. Leo Estate Sculpture Park)  
**Type:** Factual understatement — sculpture count mismatch  
**Confidence:** High

**Description:**  
Homepage weekendPlanner card 2 (`next/src/data/homepage.json`) states:

```
"Forty-plus sculptures across the estate's rolling hillside vineyard."
```

Source data says otherwise:
- Event file (`pt-leo-estate-sculpture-park.json`): **"60+ contemporary works"**
- Jul-18 dispatch article: **"more than sixty contemporary works"**
- Event file summary: `"16.5 acres, 60+ contemporary works, two walking loops"`

"Forty-plus" understates the park by roughly a third. The correct figure is 60+.

**Recommended autofix:** Update the Pt. Leo card note in `next/src/data/homepage.json` from "Forty-plus sculptures" to "sixty-plus sculptures".

---

## Resolved Since Yesterday

| Issue | Resolution |
|-------|-----------|
| Homepage weekendPlanner stale "27–28 June" block (Issue 01, Jul 12 carry-forward) | ✅ Fixed — autofix 12 July updated to "18–19 July", commit `621f1e7a2e` |
| Jul-18 dispatch `publishedAt: 2026-07-13` date (Issue 02, Jul 12) | ✅ Resolved — today is 13 July, date is now correct, dispatch is live |

---

## Surfaces Checked

| Surface | Status |
|---------|--------|
| Homepage (`next/src/data/homepage.json`) | ⚠️ 2 issues in weekendPlanner cards |
| What's On source events (`next/src/content/events/`) | ✅ Clean — all published events have future end dates |
| Current weekend dispatch (Jul 18–19) | ✅ Clean — events valid, dates correct, lastVerified 2026-07-12 |
| Previous dispatch (Jul 11–12) | ✅ Archived correctly; not surfaced as current |
| Weekend picks (`next/src/content/weekend-picks/2026-07-18.json`) | ✅ All 4 picks reference valid, live events |
| Articles — lastVerified | ✅ All published articles have lastVerified within 90 days |
| Articles — image licences | ✅ No `tmp-placeholder` found |
| Articles — pricing disclaimer | ✅ All articles with pricing carry the standard disclaimer |
| Event freshness (expired still live) | ✅ Zero published events with past endDate |

---

## Governance Check

| Gate | Status |
|------|--------|
| Image licence — tmp-placeholder | ✅ None found |
| lastVerified staleness (>90 days or missing) | ✅ Clean — all published articles verified within 90 days |
| Pricing disclaimer | ✅ Clean |
| Partner disclosure | ✅ No flags |

**Governance summary:**
- 0 articles with stale/missing lastVerified
- 0 articles with unresolved tmp-placeholder images
- 0 articles with pricing but no disclaimer

---

## Autofix Handoff

The following two changes are safe to apply in `pi-daily-accuracy-autofix`:

1. **homepage.json card 3** — Replace Stonier (wrong date) with Faux Snow Flurries at Arthurs Seat Eagle (valid July 18–19; school holiday finale)
2. **homepage.json card 2** — Update Pt. Leo note from "Forty-plus sculptures" to "sixty-plus sculptures"

Rebuild and redeploy after applying both. Total changeset: 1 file (`next/src/data/homepage.json`).

No approval required. Both changes are factual corrections from trusted source data with no editorial judgement.

---

*Scan complete. Report filed to repo and Mission Control.*
