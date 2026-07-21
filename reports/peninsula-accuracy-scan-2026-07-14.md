# Peninsula Insider — Daily Accuracy Scan
**Date:** Tuesday, 14 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 0
- **Bucket 1 — Safe auto-fix:** 0
- **Bucket 2 — Needs approval:** 0
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0

**All surfaces clean.** Yesterday's autofix (13 July) successfully applied both fixes — Pt. Leo sculpture count corrected to "sixty-plus" and Stonier card replaced with Faux Snow Flurries. No new drift detected.

**Forward note:** Faux Snow Flurries at Arthurs Seat Eagle (`faux-snow-flurries-arthurs-seat-eagle-2026`) ends **Sunday 19 July**. After this weekend, homepage weekendPlanner card 3 will reference an expired event. The autofix scan on Monday 20 July should replace this card with a valid August event. No action needed today.

---

## Surfaces Checked

| Surface | Status |
|---------|--------|
| Homepage weekendPlanner (`next/src/data/homepage.json`) | ✅ Clean — 4 cards, all July 18–19 events, dates correct |
| Homepage weekendPlanner dek | ✅ Correct — references "Mid-July", school holiday finale, truffle season |
| What's On events — published events with past endDate | ✅ Zero |
| What's On events — archived events surfacing live | ✅ Zero (54 archived events correctly filtered by `status === 'published'` gate) |
| Weekend picks (`2026-07-18.json`) | ✅ All 4 picks reference valid, live, published events |
| Current dispatch (Jul 18–19) | ✅ Events valid, dates correct, `lastVerified: 2026-07-12` |
| Previous dispatch (Jul 11–12) | ✅ Past weekend; correctly not surfaced as current |
| Articles — lastVerified staleness | ✅ All published articles verified within 90 days |
| Articles — image licences | ✅ No `tmp-placeholder` found |
| Articles — pricing disclaimer | ✅ All articles with pricing carry the standard disclaimer |
| Partner disclosure | ✅ No flags |

---

## Homepage weekendPlanner — Card Verification

| Card | Title | Event Date Window | Event Status | Valid? |
|------|-------|------------------|--------------|--------|
| 1 | Red Hill Truffles, Main Ridge | Jul 18–19 | Published, ends Sep 30 | ✅ |
| 2 | Pt. Leo Estate Sculpture Park, Merricks | Jul 18–19 | Published, ends Apr 2027 | ✅ |
| 3 | Faux Snow Flurries, Arthurs Seat Eagle | Jul 18–19 (last school holiday weekend) | Published, ends **Jul 19** | ✅ (expires Sunday — flag for Mon 20 Jul autofix) |
| 4 | Flinders Truffles, Flinders | Jul 18–19 | Published, ends Aug 31 | ✅ |

---

## Dispatch Alignment Check

**Current dispatch:** `peninsula-this-weekend-jul-18.md`  
- Covers: Saturday 18 July – Sunday 19 July ✅  
- Published: 2026-07-13 ✅  
- `lastVerified`: 2026-07-12 ✅  
- Lead: Red Hill Truffles — event published, end date Sep 30 ✅  
- Sunday move: Pt. Leo Estate Sculpture Park — event published, end date Apr 2027 ✅  
- Rainy day: MPRG Winter Program (Helen Britton / Natalia Milosz-Piekarska) — event published, end dates Aug 23 ✅  
- Quieter alt: Flinders Truffles — event published, end date Aug 31 ✅  

**Previous dispatch (Jul 11–12):** Not surfaced as current ✅

---

## Event Freshness

- **Published events with past endDate:** 0 ✅
- **Archived events total:** 54 — all correctly carry `status: "archived"` and are filtered from all live surfaces by the `status === 'published'` gate in `_data.ts` line 274 ✅
- **Events expiring this weekend (Jul 19):** 2 — `faux-snow-flurries-arthurs-seat-eagle-2026`, `sip-sketch-sculpture-park-pt-leo-estate-school-holidays-2026`

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

No Bucket 1 fixes required today.

**Watch item for tomorrow (Mon 20 Jul):** Homepage weekendPlanner card 3 (Faux Snow Flurries) will expire after Sunday 19 July. The autofix agent should replace it with a valid August event on its next run. Candidate events active in the Aug window: `stonier-fire-wine-winter-lunch` (Aug 9), `country-day-tar-barrel-august-2026` (Aug 2), `red-hill-brewery-secret-stash-weekend` (Aug 16).

---

*Scan complete. Report filed to repo and Mission Control.*
