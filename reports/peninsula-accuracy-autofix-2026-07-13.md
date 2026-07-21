# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Monday, 13 July 2026  
**Run time:** 20:44 UTC  
**Autofix agent:** Remy  
**Job:** `pi-daily-accuracy-autofix`  
**Status:** Complete — 2 fixes applied, build passed, pushed to origin

---

## Summary

- **Bucket 1 fixes applied:** 2
- **Files changed:** 1 (`next/src/data/homepage.json`)
- **Build result:** ✅ Passed — 955 pages built in 1m 40s
- **Commit:** `db80967dfb`
- **Push:** ✅ `redesign-v6` → `origin/redesign-v6`

---

## Changes Applied

### Fix 01 — Card 2: Pt. Leo Estate sculpture count corrected
**File:** `next/src/data/homepage.json`  
**Surface:** Homepage weekendPlanner, card 2

| Field | Before | After |
|-------|--------|-------|
| `note` | "Forty-plus sculptures across the estate's rolling hillside vineyard..." | "Sixty-plus sculptures across the estate's rolling hillside vineyard..." |

**Source:** Event file `pt-leo-estate-sculpture-park.json` states "60+ contemporary works"; Jul-18 dispatch article states "more than sixty contemporary works". The previous "forty-plus" understated the park by ~33%.

---

### Fix 02 — Card 3: Stonier replaced with Faux Snow Flurries
**File:** `next/src/data/homepage.json`  
**Surface:** Homepage weekendPlanner, card 3

| Field | Before | After |
|-------|--------|-------|
| `moment` | "Saturday 18 July" | "Saturday 18 and Sunday 19 July — last days of school holidays" |
| `title` | "Stonier Fire & Wine Winter Lunch, Merricks" | "Faux Snow Flurries, Arthurs Seat Eagle" |
| `note` | "A set winter lunch at one of the Peninsula's most respected Pinot houses..." | "Faux snow on the hour every hour from 11am–4pm at the gondola summit. Last weekend of the school holidays. Best with a hot chocolate at the top; book the gondola online as peak days sell out." |
| `tag` | "Booking essential" | "Booking required" |

**Reason:** Stonier Fire & Wine Winter Lunch event file shows `startDate: 2026-08-09` / `endDate: 2026-08-09` — a single-day event on 9 August, not 18 July. A reader using the card to plan for July 18–19 would find no Stonier event. Replaced with `faux-snow-flurries-arthurs-seat-eagle-2026` which runs through 19 July (last school holiday weekend).

**Additional:** The weekendPlanner `dek` was updated to remove the Stonier reference and contextualise Faux Snow Flurries — a necessary editorial consistency fix as part of the card replacement.

---

## Skipped

- **Bucket 2 / Bucket 3 items:** None in today's scan.
- **`next/src/data/home-hero-slides.json`:** Not touched (LOCKED).
- **Event archives:** No published events with past endDate found in today's scan — no archiving needed.

---

## Build Log Summary

All pre-build lints passed:
- ✅ `lint:no-pricing` — No pricing renderers found
- ✅ `lint:region-images` — Region image wiring lint passed for 5 region pages
- ✅ `lint:surfaces` — Surface hardening audit passed

Astro build: ✅ 955 pages built in 1m 40s  
Cache bust integration: 11,611 references stamped across 781 pages

---

*Autofix complete. Report filed.*
