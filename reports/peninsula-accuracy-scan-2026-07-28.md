# Peninsula Insider — Daily Accuracy Scan
**Date:** 2026-07-28  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Today:** Tuesday 28 July 2026  
**Coming weekend:** Saturday 2 – Sunday 3 August 2026  
**Repo state:** Up to date with origin/main  

---

## Summary

| Category | Count |
|---|---|
| Issues found | 4 |
| Bucket 1 — Safe auto-fix | 2 |
| Bucket 2 — Needs approval | 2 |
| Bucket 3 — Needs verification | 0 |
| Governance flags | 1 |

---

## Issue 1 — Expired events in active folder
**Bucket: 1 — Safe auto-fix**  
**Surface:** `next/src/content/events/`  
**Type:** Event freshness drift  

**47 event files** have an `endDate` prior to today (2026-07-28) and remain in the active events folder rather than `events/archive/`. These are actively served to the What's On surface and event-related modules.

**Recently expired (July 2026):**
- `winter-camp-2026-the-ranch.json` — expired 2026-07-02
- `soil-cellar-flinders-truffles-x-polperro-winery.json` — expired 2026-07-25

**Full expired list (47 files):**

| Expired | File |
|---|---|
| 2026-04-15 | briars-eco-explorers-autumn.json |
| 2026-04-18 | mornington-cup-2026.json |
| 2026-04-20 | chocolaterie-junior-chocolatier.json |
| 2026-04-25 | anzac-day-sorrento-dawn.json |
| 2026-04-26 | sorrento-writers-festival-2026.json |
| 2026-04-27 | moonlit-sanctuary-easter-program.json |
| 2026-04-30 | alba-fire-and-ice-sessions.json |
| 2026-05-02 | peninsula-hot-springs-allara-briggs-pattison.json |
| 2026-05-09 | autumn-winery-walk-2026.json |
| 2026-05-09 | crib-point-community-market.json |
| 2026-05-09 | heart-of-the-community-market-rosebud.json |
| 2026-05-09 | peninsula-hot-springs-kodomo-no-hi.json |
| 2026-05-10 | flinders-hotel-mothers-day-2026.json |
| 2026-05-10 | jetty-road-brewery-mothers-day-2026.json |
| 2026-05-10 | mornington-racecourse-market-may-2026.json |
| 2026-05-10 | mothers-day-classic-moonah-links-2026.json |
| 2026-05-10 | pier-10-mothers-day-lunch-2026.json |
| 2026-05-17 | shoreham-community-market.json |
| 2026-05-17 | sustainable-house-day-2026.json |
| 2026-05-22 | coastrek-mornington-peninsula-2026.json |
| 2026-05-22 | soul-night-market-sorrento-beach.json |
| 2026-05-23 | tootgarook-primary-school-market.json |
| 2026-05-30 | harry-baker-2k-sailing-regatta.json |
| 2026-05-30 | wild-mushroom-forage-lunch-with-the-kitchen.json |
| 2026-05-31 | michael-vale-exhibition-at-mprg.json |
| 2026-05-31 | new-wave-26-at-mprg.json |
| 2026-05-31 | rocky-road-festival-mornington-peninsula-chocolaterie.json |
| 2026-05-31 | rocky-road-festival-tasting-sessions.json |
| 2026-05-31 | songs-of-dreams-and-destiny.json |
| 2026-05-31 | the-enchanted-market-at-the-briars.json |
| 2026-05-31 | trace-duo-exhibition-at-lander-se.json |
| 2026-05-31 | trace-duo-exhibition.json |
| 2026-06-06 | point-nepean-portsea-market.json |
| 2026-06-06 | red-hill-market-first-saturday.json |
| 2026-06-06 | winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json |
| 2026-06-07 | tall-poppy-melbourne-design-week-exhibition.json |
| 2026-06-08 | mornington-peninsula-winter-wine-weekend-2026.json |
| 2026-06-08 | mornington-peninsula-winter-wine-weekend-winter-wine-festival.json |
| 2026-06-08 | mornington-winter-music-festival-2026.json |
| 2026-06-08 | mt-martha-south-beach-market.json |
| 2026-06-08 | winter-wine-weekend-full-3-day-peninsula-program.json |
| 2026-06-20 | sorrento-solstice-festival-fire-night.json |
| 2026-06-21 | sorrento-solstice-festival-2026.json |
| 2026-06-28 | peninsula-hot-springs-sunday-sessions.json |
| 2026-06-30 | mprg-autumn-exhibition.json |
| 2026-07-02 | winter-camp-2026-the-ranch.json |
| 2026-07-25 | soil-cellar-flinders-truffles-x-polperro-winery.json |

**Autofix action:** Move all 47 files to `next/src/content/events/archive/`.

**Note — Events expiring within 7 days (monitor):**
- `peninsula-hot-springs-bathe-in-cinema-thursdays.json` — expires 2026-07-31
- `southern-peninsula-sleepout-the-ranch-2026.json` — expires 2026-08-01 (this coming Saturday)

---

## Issue 2 — Homepage weekend planner showing past weekend
**Bucket: 1 — Safe auto-fix**  
**Surface:** `next/src/data/homepage.json` → `weekendPlanner`  
**Type:** Homepage/event-hub inconsistency — stale date window  

The homepage `weekendPlanner` section currently shows:
- Eyebrow: **"This weekend - 18 to 19 July"** (10 days in the past)
- All four cards reference "Saturday 18 or Sunday 19 July" dates

One card specifically says "Saturday 18 and Sunday 19 July - **last days of school holidays**" (Faux Snow Flurries, Arthurs Seat Eagle). School holidays have ended; this framing is no longer valid and actively misleads visitors.

Still-valid events referenced in the current planner (seasons running):
- Red Hill Truffles — season runs to September ✅
- Pt Leo Sculpture Park — open daily to April 2027 ✅
- Flinders Truffles — season runs to August ✅

Invalid:
- Faux Snow Flurries "last days of school holidays" framing ❌ (school holidays ended)
- All date labels referencing "18 to 19 July" ❌

**Autofix action:** Update `weekendPlanner.eyebrow` to "This weekend - 1 to 2 August", update card date labels to "Saturday 1 or Sunday 2 August", remove school holidays framing from the Arthurs Seat Eagle card or remove that card and replace with an active August event.

---

## Issue 3 — Missing weekend dispatch: August 1–2
**Bucket: 2 — Needs approval (editorial)**  
**Surface:** `next/src/content/articles/` + Journal surface  
**Type:** Dispatch drift  

The most recent "Peninsula This Weekend" dispatch is `peninsula-this-weekend-jul-18.md`, covering the July 18–19 weekend.

**No dispatch exists for:**
- July 25–26 (last weekend — missed cycle)
- **August 1–2 (the coming weekend — missing and urgent)**

Per the dispatch cadence rule (`dispatchCadence.publishDay: Sunday`), the August 1–2 dispatch should have published Sunday July 27. It is now Tuesday July 28 and no draft or published version exists.

**Impact:** Visitors arriving this week find a dispatch 10 days stale. The "Peninsula This Weekend" product is the site's primary weekly editorial commitment.

**Action required:** Commission and publish dispatch covering August 1–2. Key active events for the August 1–2 window:
- `southern-peninsula-sleepout-the-ranch-2026.json` — August 1 (Saturday)
- `country-day-tar-barrel-august-2026.json` — August 2 (Sunday) — featured Country Day event
- `stonier-fire-wine-winter-lunch.json` — through August 9
- Red Hill Truffles — season running ✅
- Pt Leo Sculpture Park — open daily ✅
- MPRG winter exhibitions (Helen Britton, Natalia Milosz-Piekarska — through August 23) ✅

This is editorial work; cannot be auto-fixed.

---

## Issue 4 — Stale lastVerified on published articles (governance)
**Bucket: 2 — Needs approval (editorial refresh queue)**  
**Surface:** `next/src/content/articles/` — published articles  
**Type:** lastVerified staleness gate (>90 days)  

**38 published articles** have `lastVerified: 2026-04-22` or `2026-04-26` — both more than 90 days before today (threshold: 2026-04-29).

These are high-value evergreen pieces (long lunch guides, dog-friendly guides, golf guides, stay guides, weekend planning pieces) that should be verified at least quarterly.

**Stale published articles (38 total):**
a-flinders-weekend.md, a-winter-peninsula-weekend.md, best-golf-courses-mornington-peninsula.md, best-spas-mornington-peninsula.md, corporate-events-red-hill-vs-sorrento.md, dog-daycare-boarding-groomers-pet-shops-mornington-peninsula.md, dog-friendly-accommodation-mornington-peninsula.md, dog-friendly-cafes-pubs-wineries-mornington-peninsula.md, emergency-vet-pet-help-mornington-peninsula.md, how-to-build-a-red-hill-saturday.md, how-to-plan-a-peninsula-weekend.md, mornington-day-guide.md, mornington-peninsula-golf-guide.md, mornington-peninsula-golf-stay-and-play.md, mornington-peninsula-stay-and-soak.md, peninsula-this-weekend-april-24.md, st-andrews-beach-golf-course.md, the-birthday-weekend.md, the-chardonnay-case.md, the-four-hour-peninsula.md, the-one-night-escape.md, the-peninsula-beach-swimming-guide.md, the-peninsula-orientation-drive.md, the-peninsula-pantry.md, the-peninsulas-best-late-afternoon-walks.md, the-pub-crawl.md, the-pub-guide.md, the-seafood-list.md, the-sunset-drink.md, the-sunset-hour.md, the-thermal-springs-weekend.md, the-vineyard-villa-weekend.md, three-italian-dinners.md, weddings-mornington-peninsula-weekend-planning.md, weddings-where-guests-stay-mornington-peninsula.md, where-to-eat-without-a-booking.md, where-to-stay-for-a-two-night-escape.md, peninsula-this-weekend-april-26.md

**Note:** This is a standing issue, flagged in prior scans. Volume has not reduced. Priority candidates for immediate re-verification: `how-to-build-a-red-hill-saturday.md`, `the-thermal-springs-weekend.md`, `mornington-peninsula-stay-and-soak.md` (high-traffic intent pieces).

---

## Governance Summary

| Gate | Status |
|---|---|
| tmp-placeholder image licenses | ✅ None found |
| Pricing articles without disclaimer | ✅ None found |
| Articles with stale/missing lastVerified (>90 days) | ⚠️ 38 articles (Bucket 2) |
| Articles with unresolved tmp-placeholder images | ✅ 0 |

---

## Active Event Inventory (as of 2026-07-28)

**Events still active (endDate ≥ today):**

| End Date | Event |
|---|---|
| 2026-07-31 | peninsula-hot-springs-bathe-in-cinema-thursdays ⚠️ expiring Friday |
| 2026-08-01 | southern-peninsula-sleepout-the-ranch-2026 ⚠️ this Saturday |
| 2026-08-02 | country-day-tar-barrel-august-2026 |
| 2026-08-09 | stonier-fire-wine-winter-lunch |
| 2026-08-16 | red-hill-brewery-secret-stash-weekend |
| 2026-08-23 | helen-britton-story-so-far-mprg-2026 |
| 2026-08-23 | natalia-milosz-piekarska-sifted-light-mprg-2026 |
| 2026-08-26 | trivia-jetty-road-brewery-winter-2026 |
| 2026-08-28 | aperitivo-hour-trofeo-estate-winter-2026 |
| 2026-08-31 | brunch-thyme-alba-thermal-springs-winter-2026 |
| 2026-08-31 | flinders-truffles-winter-truffle-hunt-season |
| 2026-08-31 | pt-leo-estate-local-complimentary-sculpture-park-winter-2026 |
| 2026-08-31 | red-hill-truffles-winter-truffle-hunt-season |
| 2026-08-31 | winter-acoustic-sessions-portsea-hotel-2026 |
| 2026-09-05 | hill-ridge-community-market-september-2026-restart |
| 2026-09-30 | peninsula-hot-springs-sound-healing-sessions |
| 2026-10-17 | emu-plains-market |
| 2026-10-18 | main-street-mornington-festival-2026 |
| 2026-10-25 | the-bloody-long-walk-mornington-peninsula-2026 |
| 2026-11-22 | national-works-on-paper-2026-nwop |
| 2026-12-20 | mornington-tourist-railway-santa-specials |
| 2026-12-23 | mornington-christmas-festival-main-street-christmas-parade |
| 2026-12-26 | acoustic-saturdays-peppers-moonah-links-2026 |
| 2026-12-31 | doggy-day-out-mornington-peninsula-2026 |
| 2026-12-31 | family-mystery-picnic-mornington-peninsula-2026 |
| 2027-01-11 | peninsula-summer-music-festival-2027 |
| 2027-04-28+ | mornington-wednesday-market, hastings-thursday-market (recurring) |
| 2027-04-30 | bass-flinders-gin-masterclass, foxeys-hangout-vegetable-feast, PHS yoga/sound events, polperro, pt-leo-sculpture-park, restore-pamper-retreat, ten-minutes-by-tractor |

---

## Checks Not Triggered Today

| Check | Reason |
|---|---|
| Structural/editorial mismatch | Dispatch drift already flagged; no new dispatch to cross-check |
| Link and route integrity | Covered by separate `pi-daily-link-audit` job |
| Seasonal framing drift | Homepage hero still uses "Winter edition" — appropriate for late July ✅ |

---

## Autofix Handoff

The following items are pre-approved for the `pi-daily-accuracy-autofix` job:

1. **Archive 47 expired event files** — move from `events/` to `events/archive/`
2. **Update homepage weekendPlanner** — update `eyebrow`, card date labels to August 1–2; remove expired school holidays framing

Items requiring editorial action (not auto-fixable):
- Commission and publish August 1–2 weekend dispatch
- Initiate lastVerified re-verification cycle for 38 stale articles

---

*Report generated by Remy | Scan time: 2026-07-28 20:20 UTC | No content edits made in this run*
