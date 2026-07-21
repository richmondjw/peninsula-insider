# Peninsula Insider — Daily Accuracy Scan
**Date:** Thursday, 16 July 2026  
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
- **Forward warnings:** 1

**All surfaces clean for the July 18–19 weekend.** No expired events on live surfaces, no dispatch drift, no governance flags. One standing forward warning: two school holiday events expire this Sunday (July 19) — the homepage weekendPlanner card 3 and the July 18–19 weekend-picks entry will require autofix on Monday July 20 to replace expired content.

---

## Surfaces Checked

| Surface | Status |
|---------|--------|
| Homepage weekendPlanner (`next/src/data/homepage.json`) | ✅ Clean — eyebrow "18 to 19 July", 4 cards all valid through Jul 19 |
| Homepage weekendPlanner dek | ✅ Correct — references mid-July truffle season, school holiday finale framing consistent with operator programming (Jul 5–19) |
| What's On events — published events with past endDate | ✅ Zero |
| What's On events — archived events surfacing live | ✅ Zero (54+ archived events correctly filtered by `status === 'published'` gate in `_data.ts:274`) |
| Weekend picks (`2026-07-18.json`) | ✅ All 4 picks reference valid, live, published events |
| Current dispatch (`peninsula-this-weekend-jul-18.md`) | ✅ Events valid, dates correct, `lastVerified: 2026-07-12` |
| Previous dispatch (Jul 11–12) | ✅ Not surfaced as current; archived week |
| Articles — lastVerified staleness | ✅ Clean — all published articles verified within 90 days |
| Articles — image licences | ✅ No `tmp-placeholder` found |
| Articles — pricing disclaimer | ✅ All articles with pricing carry the standard disclaimer |
| Partner disclosure | ✅ No flags |

---

## Homepage weekendPlanner — Card Verification

| Card | Title | Event Date Window | Event Status | Valid? |
|------|-------|------------------|--------------|--------|
| 1 | Red Hill Truffles, Main Ridge | Jul 18–19 (season through Sep 30) | Published | ✅ |
| 2 | Pt. Leo Estate Sculpture Park, Merricks | Jul 18–19 (open through Apr 2027) | Published | ✅ |
| 3 | Faux Snow Flurries, Arthurs Seat Eagle | Jul 18–19 (ends **Jul 19**) | Published | ✅ valid this weekend — expires Sunday |
| 4 | Flinders Truffles, Flinders | Jul 18–19 (season through Aug 31) | Published | ✅ |

---

## Dispatch Alignment Check

**Current dispatch:** `peninsula-this-weekend-jul-18.md`
- Covers: Saturday 18 July – Sunday 19 July ✅
- Published: 2026-07-13 ✅
- `lastVerified`: 2026-07-12 ✅
- Lead: Red Hill Truffles — event published, endDate Sep 30 ✅
- Sunday move: Pt. Leo Estate Sculpture Park — event published, endDate Apr 2027 ✅
- Rainy day: MPRG Winter Program (Helen Britton / Natalia Milosz-Piekarska) — events published, endDate Aug 23 ✅
- Quieter alt: Flinders Truffles — event published, endDate Aug 31 ✅

**Weekend picks alignment:** `2026-07-18.json` matches dispatch picks — Red Hill Truffles (pos 1), Pt. Leo Sculpture Park (pos 2), MPRG Helen Britton (pos 3), Flinders Truffles (pos 4). All four events published and live. ✅

---

## Event Freshness

- **Published events with past endDate:** 0 ✅
- **Total published events:** 42 — all end dates in future ✅
- **Archived events total:** 54+ — all correctly carry `status: "archived"` and filtered from live surfaces ✅
- **Events expiring this weekend (Jul 19):** 2
  - `faux-snow-flurries-arthurs-seat-eagle-2026` — endDate Jul 19, school holiday programming ⚠️ flag for Mon autofix
  - `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` — endDate Jul 19, school holiday programming ⚠️ flag for Mon autofix

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

## Forward Warning — Autofix Target: Monday 20 July

Two events expire this Sunday July 19. From Monday July 20, the following will be stale:

1. **Homepage weekendPlanner card 3** (`homepage.json`) — references Faux Snow Flurries and "last school holiday window" framing, which will be expired.
2. **Weekend picks `2026-07-18.json`** — the `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026` pick (position 4 in picks) also expires Jul 19.
3. **Homepage weekendPlanner eyebrow and dek** — will need to update from "18 to 19 July" to "25 to 26 July" window.

**Candidate replacement events for the July 25–26 weekend:**
- `stonier-fire-wine-winter-lunch` — endDate Aug 9, annual, Merricks (strong summer/winter calendar anchor)
- `country-day-tar-barrel-august-2026` — endDate Aug 2, Tuerong (August country festival)
- `red-hill-brewery-secret-stash-weekend` — endDate Aug 16, Red Hill (annual)
- `southern-peninsula-sleepout-the-ranch-2026` — endDate Aug 1, community event

The autofix agent on Monday July 20 (or the accuracy-autofix at 20:35 UTC Monday) should:
1. Update `homepage.json` weekendPlanner eyebrow, dek, and card 3 for Jul 25–26 window
2. Ensure weekend-picks entry exists for `2026-07-25` (or create fallback)
3. Status `faux-snow-flurries` and `sip-sketch-sculpture-park` to `archived` once the Jul 19 date passes

---

## Autofix Handoff

No Bucket 1 fixes required today.

All active surfaces are accurate for the July 18–19 weekend. The autofix agent's Monday run should action the July 25–26 transition items listed above.

---

*Scan complete. Report filed to repo and Mission Control.*
