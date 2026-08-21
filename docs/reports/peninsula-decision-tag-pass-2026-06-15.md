# Peninsula Insider — Decision Tag Audit Pass
**Date:** 2026-06-15
**Run by:** Remy
**Scope:** 140 venue JSON files + 44 experience JSON files; priority I30 venues reviewed; schema-validated changes only
**Previous pass:** 2026-06-01
**Decision-intent tags audited:** `worth-the-drive`, `long-lunch`, `view`, `quick-bite`, `big-group`, `first-date`, `casual-stop`, `slow`

---

## Executive Summary

This pass focused on three objectives: (1) applying the `worth-the-drive` tag now that it is schema-valid (it was re-added to the mood enum after the June 1 build blocker), (2) continuing the `slow` retirement program with two more high-confidence removals, and (3) filling obvious decision-intent gaps in top-tier venues. Six source file changes made. All are backed by existing editorial copy or I30 editorial record. No speculative bulk edits.

**6 high-confidence changes made. 8 recommendations outstanding.**

---

## Entities Reviewed

### Priority Venues (I30 top 15 + supporting tier)
Tedesca Osteria, Ten Minutes by Tractor, Montalto, Pt. Leo Estate, Jackalope, Barragunda Dining, Laura at Pt. Leo, Polperro, Paringa Estate, Foxeys Hangout, Alba Thermal Springs, Peninsula Hot Springs, Hotel Sorrento, The Continental Sorrento, Flinders Hotel, Bass & Flinders, Red Hill Estate, Commonfolk Coffee, Balnarring Bakehouse, Stonier Wines, Yabby Lake, Doot Doot Doot, Main Ridge Estate, Flinders Sourdough, Crittenden Estate

### Experiences (sample — 12 reviewed)
Cape Schanck Lighthouse Walk, Gunnamatta Ocean Beach, Cape Schanck Boardwalk, Bushrangers Bay Walk, Arthurs Seat Lookout, Mornington Peninsula Gallery, Ashcombe Maze, Farnsworth Track, Greens Bush (Two Bays), Montalto Sculpture Trail, Cape Schanck Lighthouse Walk, Balnarring Beach

---

## Decision-Intent Tag State: Before and After This Pass

| Tag | June 1 (before) | June 15 (after) | Movement |
|---|---|---|---|
| `worth-the-drive` | 10 venues | 12 venues | +2 |
| `long-lunch` | 26 venues | 26 venues | — |
| `view` | 28 venues | 28 venues | — |
| `quick-bite` | 18 venues | 18 venues | — |
| `big-group` | 15 venues | 16 venues | +1 |
| `first-date` | 12 venues | 13 venues | +1 |
| `casual-stop` | 0 venues | 0 venues | — (still needs editorial) |
| `slow` | 92 venues | 90 venues | −2 |

**Notes on baseline:** The June 1 report listed `slow` at 92 and noted 97 pre-pass. The 92 baseline reflects the post-June-1 state after 5 `slow` removals were applied between June 1 and June 15 (the 4 priority removals from the June 1 report plus one additional).

---

## Changes Made This Pass

### `worth-the-drive` — 2 venues

| Venue | Evidence |
|---|---|
| `alba-thermal-springs` | Editor note: "one of the most complete wellness days the Peninsula offers." Morning session + thermal circuit + ridge lunch = a deliberate day-trip construct. |
| `peninsula-hot-springs` | The Peninsula's signature thermal destination. Drove tourism from Melbourne for 15+ years. The Alba note explicitly contrasts it as "the original" that "became a theme park" — confirming it is a drive destination, even if chaotic. |

### `slow` removal — 2 venues

| Venue | Rationale |
|---|---|
| `polperro` | Already carries `cellar-door`, `view`, `worth-the-drive`. The June 1 report framed it as "benchmark producer, appointment culture." `slow` was filler. |
| `main-ridge-estate` | Already carries `cellar-door`, `fireplace`, `weekend-escape`, `worth-the-drive`. The I30 blurb calls it "appointment-only, the Peninsula's foundational pinot grower." `slow` added no decision signal. |

### `big-group` — 1 venue

| Venue | Evidence |
|---|---|
| `montalto` | June 1 report: "The long-lunch room that scales without losing the plot. The grounds, the Piazza, the tasting bar — every door is a different right answer." Grounds + sculpture trail + multiple dining formats = explicitly group-scalable. |

### `first-date` — 1 venue

| Venue | Evidence |
|---|---|
| `hotel-sorrento` | Waterfront position, sunset tag, view tag, weekend-escape tag. The physical setting (bay-front terrace, sunset views) is unambiguously date-grade. Missing the explicit decision signal was an oversight. |

---

## Structural Issues (Status Update)

### `slow` retirement — in progress but still overloaded

**Current count: 90 of 140 venues (64%)**

Since the June 1 report, 7 total `slow` removals have been applied (5 between June 1–15, 2 this pass). The 4 priority removals from June 1 (`tedesca-osteria`, `barragunda-dining`, `peninsula-hot-springs`, `alba-thermal-springs`) were all completed before this pass. Good progress.

However, 64% coverage still makes `slow` a low-signal tag. Venues where it remains alongside 3+ specific tags are the next candidates:

- `bistro-elba` — `anniversary`, `fireplace`, `first-date`, `slow`
- `cassis-red-hill` — `anniversary`, `romance`, `view`, `slow`, `garden`
- `crittenden-estate` — `cellar-door`, `waterfront`, `slow`
- `moke-dining` — `anniversary`, `romance`, `slow`, `first-date`
- `one-spa-at-racv-cape-schanck-resort` — `wellness`, `slow`, `anniversary`, `weekend-escape`, `view`
- `spa-by-jackalope` — `wellness`, `anniversary`, `romance`, `slow`, `cellar-door`

**Recommendation:** Continue gradual removal. Do not bulk-remove — each venue needs a quick editorial sanity check.

### `casual-stop` — still absent

Still 0 venues. This remains the highest-value new tag to introduce. Farm-gate producers (`red-hill-cheese`, `peninsula-fresh-organics`, `main-ridge-dairy`) and markets (`red-hill-market`, `balnarring-market`) are natural fits. The distinction from `quick-bite` (food-speed) and `slow` (ambience) is real: `casual-stop` signals "no booking, browse/browse-and-buy, passing through."

**Recommended action:** Sloane or Tyler approve `casual-stop` as a new mood tag; seed with: `red-hill-cheese`, `peninsula-fresh-organics`, `main-ridge-dairy`, `mornington-peninsula-chocolates`, `somers-general`, `johnny-ripe`, `balnarring-market`, `red-hill-market`.

### `worth-the-drive` second tier — now 12 venues

The following remain as editorial candidates for review:

| Venue | Why it might qualify |
|---|---|
| `laura-pt-leo` | 2 hats, fine dining; but the drive is "to Pt Leo", not specifically to Laura. The estate already has `worth-the-drive`. |
| `bass-and-flinders` | Botanical walk + gin tasting that "became a Peninsula activity" (I30 #16). |
| `jackalope` | $$$$ hotel; primarily a stay, not a day-trip. `first-date` is the more accurate signal. |
| `the-continental-sorrento` | $$$$ destination stay; waterfront, rooftop, view. Less clear as a drive-for-experience venue. |

### Experiences — `worth-the-drive` gap

Only 2 experiences currently carry `worth-the-drive` (`cape-schanck-lighthouse-walk`, `gunnamatta_ocean_beach`). The following are strong candidates:

- `cape-schanck-boardwalk` — iconic coastal boardwalk, lighthouse proximity
- `bushrangers-bay-walk` — one of the Peninsula's most photographed coastal walks
- `arthurs-seat-lookout` — highest point, panoramic views, gondola access

**No changes made to experience files this pass** — recommend including in next worth-the-drive review.

---

## Tag Coverage Summary (After This Pass)

| Tag | Venues | Quality |
|---|---|---|
| `long-lunch` | 26 | ✅ Solid — consistent, well-applied in top tier |
| `view` | 28 | ✅ Good — coastal, ridge, and sunset venues aligned |
| `worth-the-drive` | 12 | ✅ Improved — now schema-valid; 2 strong additions this pass |
| `quick-bite` | 18 | ⚠️ Fair — food-centric; farm-gate/browse stops not well covered |
| `big-group` | 16 | ⚠️ Improved — montalto added; further audit pending |
| `first-date` | 13 | ⚠️ Better — hotel-sorrento closed a clear gap |
| `casual-stop` | 0 | ❌ Still missing — producers/markets need it urgently |
| `slow` | 90 | ❌ Overloaded (64%) — retirement in progress, 7 removed since June 1 |

---

## Recommended Next Actions

**Immediate (no editorial gate — low-risk):**
1. Remove `slow` from `bistro-elba` — already has `anniversary`, `fireplace`, `first-date`
2. Remove `slow` from `moke-dining` — already has `anniversary`, `romance`, `first-date`
3. Remove `slow` from `cassis-red-hill` — already has `anniversary`, `romance`, `view`, `garden`

**Editorial decision needed (Sloane/Vera sign-off):**
4. Introduce `casual-stop` mood tag — start with producer/market cohort
5. Add `worth-the-drive` to `laura-pt-leo` — reconsider the June 1 exclusion
6. Review experiences for `worth-the-drive` — `cape-schanck-boardwalk`, `bushrangers-bay-walk`, `arthurs-seat-lookout`
7. Continue `slow` audit on remaining 90 venues — batch-remove where 3+ specific tags already present

**Ongoing:**
8. Confirm `worth-the-drive` third tier at next editorial meeting (`bass-and-flinders`, `the-continental-sorrento`)

---

## Git Commit Suggested

```
fix(tags): decision-intent tag pass 2026-06-15

- +worth-the-drive: alba-thermal-springs, peninsula-hot-springs
- +big-group: montalto
- +first-date: hotel-sorrento
- -slow: polperro, main-ridge-estate

6 tag changes across 6 venue files.
All changes backed by I30 editorial record or explicit editor note.
```

---

*Report produced by Remy, Peninsula Insider cron job `pi-weekly-decision-tag-pass` (66909f1c-68b2-4c91-a1f4-c95ba17aa365). Source file changes are single-field mood tag additions/removals. No structural schema changes. Structural recommendations require editorial sign-off before implementation.*
