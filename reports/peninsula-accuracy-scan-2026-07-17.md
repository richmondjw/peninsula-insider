# Peninsula Insider — Daily Accuracy Scan
**Date:** Friday, 17 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 0 active
- **Bucket 1 — Safe auto-fix:** 0
- **Bucket 2 — Needs approval:** 0
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0
- **Forward warnings:** 1 (carry-forward from Jul 16)

**All surfaces clean for the July 18–19 weekend.** No expired events on live surfaces, no dispatch drift, no governance flags. One standing forward warning (third consecutive day): two school holiday events expire this Sunday (July 19) — `faux-snow-flurries-arthurs-seat-eagle-2026` and `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026`. Both are still valid and correctly featured this weekend. Autofix required Monday July 20 to archive these and refresh the weekend-picks entry.

---

## Surfaces Checked

| Surface | Status |
|---------|--------|
| Homepage — HomeWeekend module (`weekendWindow` → 2026-07-18) | ✅ Clean — resolves to `2026-07-18.json` picks, all 4 events valid |
| Homepage — HomeDispatch block | ✅ Newsletter block only, no event references |
| What's On events — published events with past endDate | ✅ Zero |
| What's On events — archived events surfacing live | ✅ Zero (54+ archived events correctly filtered) |
| Weekend picks (`2026-07-18.json`) | ✅ All 4 picks reference valid, published events |
| Current dispatch (`peninsula-this-weekend-jul-18.md`) | ✅ Events valid, dates correct, `lastVerified: 2026-07-12` |
| Previous dispatch (Jul 11–12) | ✅ Not surfacing as current |
| Articles — lastVerified staleness (>90 days) | ✅ Zero |
| Articles — image licences (`tmp-placeholder`) | ✅ Zero |
| Articles — pricing without disclaimer | ✅ Zero |
| Partner disclosure gate | ✅ No flags |
| Quick notes expiry integrity | ✅ July 17 notes carry correct `expiresAt`; Friday editor note expires Jul 18 08:00 AEST (still in window at scan time, by design) |

---

## Homepage Weekend Module — Card Verification

| Position | Event Slug | End Date | Status | Valid? |
|----------|-----------|----------|--------|--------|
| 1 | `red-hill-truffles-winter-truffle-hunt-season` | 2026-09-30 | published | ✅ |
| 2 | `pt-leo-estate-sculpture-park` | 2027-04-30 | published | ✅ |
| 3 | `helen-britton-story-so-far-mprg-2026` | 2026-08-23 | published | ✅ |
| 4 | `flinders-truffles-winter-truffle-hunt-season` | 2026-08-31 | published | ✅ |

---

## Dispatch Alignment Check

**Current dispatch:** `peninsula-this-weekend-jul-18.md`
- Covers: Saturday 18 July – Sunday 19 July ✅
- Published: 2026-07-13 ✅
- `lastVerified`: 2026-07-12 ✅
- Lead: Red Hill Truffles — published, end 2026-09-30 ✅
- Sunday move: Pt. Leo Estate Sculpture Park — published, end 2027-04-30 ✅
- Rainy day: MPRG Winter Program (Helen Britton / Natalia Milosz-Piekarska) — published, end 2026-08-23 ✅
- Quieter alt: Flinders Truffles — published, end 2026-08-31, lastChecked 2026-05-04 ✅

**Weekend picks alignment:** `2026-07-18.json` matches dispatch picks. All 4 events live and published. ✅

---

## Event Freshness

- **Total active (published) events:** 42
- **Published events with past endDate:** 0 ✅
- **Events expiring this weekend (Jul 17–19):** 2
  - `faux-snow-flurries-arthurs-seat-eagle-2026` — endDate Jul 19 (last day of school holiday program) ⚠️ flag for Mon Jul 20 autofix
  - `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` — endDate Jul 19 (last day of school holiday program) ⚠️ flag for Mon Jul 20 autofix
- **Events valid beyond this weekend:** 40 ✅

---

## Governance Check

| Gate | Status | Count |
|------|--------|-------|
| `tmp-placeholder` images on published articles | ✅ Clean | 0 |
| `lastVerified` missing on published articles | ✅ Clean | 0 |
| `lastVerified` >90 days stale | ✅ Clean | 0 |
| Partner disclosure missing | ✅ Clean | 0 |
| Pricing without standard disclaimer | ✅ Clean | 0 |

**Governance summary:** 0 articles with stale/missing lastVerified · 0 articles with unresolved tmp-placeholder images · 0 articles with pricing but no disclaimer

---

## Forward Actions

| Priority | Action | When |
|----------|--------|------|
| ⚠️ Required | Archive `faux-snow-flurries-arthurs-seat-eagle-2026` and `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026`; refresh `weekend-picks` entry | Monday 20 July autofix run |

---

## Notes

- `peninsula-hot-springs-bathe-in-cinema-thursdays` ends 2026-07-31 — still valid, no action needed.
- `mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026` ends 2026-07-26 — still valid, no action needed.
- `pt-leo-estate-local-complimentary-sculpture-park-winter-2026` runs through 2026-08-31. Not in weekend picks but valid on What's On surface.
- Flinders Truffles `lastChecked` is 2026-05-04 — due for a re-verification pass (not an accuracy issue today; suggest inclusion in next venue healthcheck run).
