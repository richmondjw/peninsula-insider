# Peninsula Insider — Decision Tag Audit Pass
**Date:** 2026-05-17  
**Run by:** Remy  
**Scope:** Priority venues (top 30 + supplementary), all experiences, places taxonomy  
**Decision-intent tags audited:** Best views, Long lunch, Casual stop, Group-friendly, Date day, Quick stop, Worth the drive

---

## Executive Summary

The PI content library carries 140 venues, 46 experiences, and 37 place entries. Decision-intent tagging is currently expressed implicitly through `mood` tags and `bestFor` arrays — there is no dedicated `decisionTags` field in the schema. The tag infrastructure is largely functional but has two critical problems: the `slow` tag has inflated to 95/140 venues (68%), losing all signal value, and a `worth-the-drive` decision tag is entirely absent despite being the Peninsula's single most useful planning signal.

**7 high-confidence changes made. 5 structural recommendations outstanding.**

---

## Entities Reviewed

### Tier A — Insiders 30 (top 20 reviewed in full)
Tedesca Osteria, Ten Minutes by Tractor, Montalto, Pt. Leo Estate, Jackalope Hotel, Barragunda Dining, Laura at Pt. Leo, Polperro, Paringa Estate, Foxeys Hangout, Alba Thermal Springs, Peninsula Hot Springs, Hotel Sorrento, Flinders Hotel, Bass & Flinders Distillery, Garagiste, Doot Doot Doot, Willow Creek Vineyard, Stonier Wines, Yabby Lake

### Tier B — Supporting Insiders 30
Main Ridge Estate, Red Hill Estate, Commonfolk Coffee, Balnarring Bakehouse, Flinders Sourdough, Red Hill Cheese, Sorrento Gelato, The Baths Sorrento

### Tier C — Additional Priority Venues
Bistro Elba, Port Phillip Estate, Villa Mallorca, Arthurs Views, The Continental Sorrento, The Epicurean, Crittenden Estate, Moke Dining, Stillwater at Crittenden, Cape Retreat

### Experiences (all 46)
Full audit of mood/audience tags across all walk, beach, golf, market, and gallery entries.

---

## Decision-Intent Tag Mapping: Current State

| Decision-Intent Tag | Closest Current Tag | Venue Count | Quality Assessment |
|---|---|---|---|
| Long lunch | `long-lunch` | 26 | **Good** — consistent, well-applied in top tier |
| Best views | `view` | 26 venues + 22 experiences | **Fair** — has gaps; `sunset` (8 venues) overlaps without consolidation |
| Quick stop | `quick-bite` | 12 venues | **Undercovers** — food-only; casual non-food stops untagged |
| Group-friendly | `big-group` | 13 venues | **Undercovers** — `group` audience (56 venues) not surfaced as decision signal |
| Date day | `first-date` | 9 venues | **Narrow** — misses anniversary/romance-adjacent date venues |
| Casual stop | *(none)* | 0 | **Missing** — no equivalent tag exists |
| Worth the drive | *(none)* | 0 (before this pass) | **Missing** — the Peninsula's most important planning signal absent |

---

## Changes Made This Pass

### 1. `worth-the-drive` tag added — 7 venues

All additions are backed by explicit editorial evidence in editor notes, signatures, or verified Insiders 30 editorial.

| Venue | Slug | Evidence |
|---|---|---|
| Pt. Leo Estate | `pt-leo-estate` | Editor note: *"The setting alone is worth the drive."* |
| Tedesca Osteria | `tedesca-osteria` | Insiders 30 #1: *"the dining room that justified the most weekend drives in 2026"* |
| Ten Minutes by Tractor | `ten-minutes-by-tractor` | 3-hat degustation, *"Book the long lunch: you'll want the afternoon"* — destination by definition |
| Barragunda Dining | `barragunda-dining` | Cape Schanck destination farm dining, 2-hat, $$$$, *"one of the Peninsula's most compelling new voices"* |
| Main Ridge Estate | `main-ridge-estate` | Appointment-only, foundational — *"the vineyard that started it all"* — a trip, not a stop |
| Doot Doot Doot | `doot-doot-doot` | Insiders 30 #18: *"Worth the ride to the bottom of the ridge"* |
| Flinders Sourdough | `flinders-sourdough` | Signature: *"A village bakery so good it accidentally became a reason to drive to Flinders"* |

**Rationale for `worth-the-drive` as new tag:** This is the Peninsula's most load-bearing decision signal. Readers deciding whether to make a dedicated drive vs. staying in-zone need to know which venues justify the trip. None of the existing mood tags captures this. The tag is conservative by design — only venues where the editorial record explicitly frames the journey as part of the value proposition qualify.

**Intentionally excluded this pass:**
- Montalto — iconic but editor note doesn't frame the drive explicitly; recommend adding after editorial review
- Laura at Pt. Leo — nested within Pt. Leo Estate, complex relationship; recommend adding when standalone drive is confirmed
- Jackalope — editorial note frames it as a *stay*, not a day trip — `worth-the-drive` would misrepresent the offer

---

## Structural Issues Identified (Recommendations Only)

### Critical: `slow` tag overloaded beyond usefulness

**Severity: HIGH**

`slow` appears on **95 of 140 venues (68%)**. It is currently applied to everything from 2-hat restaurants (Tedesca, Barragunda) to basic cellar doors where "slow" just means "not fast food."

When 68% of venues share a tag, the tag provides no decision guidance. A reader filtering by "slow" gets almost the entire content library.

**Recommendation:** Retire or subdivide `slow` into:
- `leisurely-afternoon` — for venues where an unstructured 2–3 hour visit is the offer (cellar doors, sculpture trails, market days)
- Remove from venues already tagged `long-lunch`, `degustation`, or `anniversary` — the intent is already expressed by the more specific tag

**High-priority removals of `slow` (venues where it's clearly redundant):**
- `tedesca-osteria` — already `long-lunch` + `fireplace`
- `barragunda-dining` — already `long-lunch` + `anniversary` + `first-date`
- `peninsula-hot-springs` — already `wellness`
- `alba-thermal-springs` — already `wellness` + `rainy-day` + `anniversary`

This is a bulk editorial decision — recommend Sloane or Vera sign off before execution.

---

### High: `worth-the-drive` tag needs wider review

7 venues were updated this pass with high-confidence editorial backing. A second tier of candidates should be reviewed for addition:

**Candidates for editorial consideration:**
- `montalto` — Insiders 30 #3, 1 hat, sculpture park + cellar door + restaurant
- `laura-pt-leo` — 2 hats, fine dining room at Pt Leo Estate, distinct from main venue
- `jackalope` — $$$$, architectural destination (though better framed as `destination-stay`)
- `polperro` — 1 hat, one of the region's benchmark pinot producers, appointment advised
- `paringa-estate` — 1 hat, "The estate that taught the Peninsula how to do long lunches well"

---

### Medium: `view` and `sunset` tags overlap without hierarchy

26 venues have `view`; 8 have `sunset`. These often co-occur but serve different decisions: `view` is daytime/all-day; `sunset` is time-specific. The tags should be treated as complementary, but several sunset-view venues have only one of the two.

**Notable gaps:**
- `paringa-estate` — sunset views from vineyard deck, has `sunset` only, missing `view`
- `hotel-sorrento` — waterfront sunsets, has `sunset` only, missing `view`
- `the-baths-sorrento` — has `sunset` and `first-date`, missing `view` (bay aspect)

**Recommendation:** Where `sunset` exists on a venue with a clear day-view aspect, add `view` as well. Low-risk, can be done in batches.

---

### Medium: `date-day` gap — `first-date` is too narrow

Only 9 venues carry `first-date`. However, many of the Peninsula's best date venues are tagged `anniversary` or `romance` without a `first-date` signal. This creates a gap for readers planning a date (not necessarily a first date and not an anniversary).

**Problem venues:**
- `jackalope` — unmistakably a date destination, has `anniversary` and `weekend-escape` only
- `villa-mallorca` — intimate garden cottage, has `anniversary` and `romance` only
- `moke-dining` — $$$$, romance-mood restaurant, has `anniversary` and `romance` only

**Recommendation:** Either broaden `first-date` to `date-day` (schema change — surface as mood tag), or add `first-date` to clearly date-appropriate anniversary/romance venues. The latter is lower friction.

---

### Low: `casual-stop` missing as a distinct decision tag

Several venue types serve a "passing through" decision that isn't captured by `quick-bite` (which is food-specific):

- Farm gates (Red Hill Cheese, Peninsula Fresh Organics) — browse and buy, no booking
- Galleries and sculpture trails mid-route (Montalto Sculpture Trail, Pt Leo Sculpture Park)
- Roadside general stores (Somers General, Johnny Ripe)

`quick-bite` signals food speed. `casual-stop` signals "doesn't require a plan, fine to drop in." These serve different reader decisions.

**Recommendation:** Introduce `casual-stop` as a mood tag for browse/drop-in venues where no booking is required and a 20–40 min visit is the natural format.

---

### Low: `group-friendly` as decision signal

`big-group` (13 venues) and audience `group` (56 venues) serve different purposes but the decision signal doesn't surface cleanly. Several excellent dining group venues lack `big-group` in mood:

- `montalto` — large groups accommodated, sculpture park format
- `foxeys-hangout` — walk-in, garden seating, described as the Peninsula's most *conversational* cellar door
- `alba-thermal-springs` — group spa days, has `group` in audience but not `big-group` in mood
- `red-hill-estate` — large deck, family-and-group winery

**Recommendation:** Audit the 56 venues with `group` audience — add `big-group` to mood for those that can comfortably seat a group of 8+ without special booking. This is a practical decision signal that `big-group` mood correctly expresses.

---

## Tag Coverage Summary (After This Pass)

| Tag | Venues | Quality |
|---|---|---|
| `long-lunch` | 26 | ✅ Solid |
| `view` | 26 | ⚠️ Fair — some gaps, see above |
| `quick-bite` | 12 | ⚠️ Undercovers non-food |
| `big-group` | 13 | ⚠️ Undercovers dining groups |
| `first-date` | 9 | ⚠️ Too narrow for date-day decisions |
| `worth-the-drive` | 7 (new) | ✅ Conservative start — expand carefully |
| `slow` | 95 | ❌ Overloaded — retire or subdivide |
| `casual-stop` | 0 | ❌ Missing — recommend adding |

---

## Recommended Next Actions

**This week (high-confidence, low-risk):**
1. Add `view` to `paringa-estate`, `hotel-sorrento`, `the-baths-sorrento` — bay-aspect venues with `sunset` only
2. Add `first-date` to `jackalope`, `moke-dining`, `villa-mallorca` — clearly date-appropriate venues with only `anniversary`/`romance`

**Editorial decision needed (Sloane/Vera sign-off):**
3. Audit `slow` removal from venues already tagged with more specific intent tags (start with the 4 listed above)
4. Introduce `casual-stop` tag concept — farm gates, no-booking browse venues, roadside stops
5. Review `worth-the-drive` second tier (Montalto, Polperro, Paringa, Laura at Pt Leo)

---

*Report produced by Remy, Peninsula Insider cron job `pi-weekly-decision-tag-pass`. All source file changes are single-field additions backed by editor notes or published editorial record.*
