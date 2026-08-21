# Peninsula Insider — Daily Accuracy Autofix Report
**Date:** Saturday, 11 July 2026  
**Run time:** 20:55–21:10 UTC  
**Agent:** Remy  
**Job:** `pi-daily-accuracy-autofix`  
**Status:** Complete — all Bucket 1 items resolved

---

## Summary

- **Bucket 1 items processed:** 4 issues (Issues 01–04 from scan report)
- **Events archived:** 54 files
- **Homepage sections updated:** 1 (weekendPlanner)
- **Build result:** ✅ Passed — 931 pages built in 3m 34s
- **Commit:** `de27c0ab93` on branch `v5-1`
- **Push:** ✅ Pushed to origin — GitHub Pages deploy triggered
- **Bucket 2/3 items:** Not touched (held per governance rules)

---

## Actions Taken

### Issue 01 · RESOLVED — 54 expired events archived

All 54 events with `endDate < 2026-07-11` and `status: published` moved from `next/src/content/events/` to `next/src/content/events/archive/`. Status field updated to `status: archived` in each file via `sed`.

**Note:** Scan report cited 53 events; the actual count on disk was 54 (scan may have counted the two newly-expired July 10 events separately in the narrative then included them in the table, but the table itself has 54 rows).

Files archived:
- alba-fire-and-ice-sessions.json (2026-04-30)
- anzac-day-sorrento-dawn.json (2026-04-25)
- autumn-winery-walk-2026.json (2026-05-09)
- boneo-community-market.json (2026-06-20)
- briars-eco-explorers-autumn.json (2026-04-15)
- chocolaterie-junior-chocolatier.json (2026-04-20)
- coastrek-mornington-peninsula-2026.json (2026-05-22)
- crib-point-community-market.json (2026-05-09)
- dromana-community-market.json (2026-06-28)
- emu-plains-market-balnarring.json (2026-06-20)
- flinders-hotel-mothers-day-2026.json (2026-05-10)
- harry-baker-2k-sailing-regatta.json (2026-05-30)
- heart-of-the-community-market-rosebud.json (2026-05-09)
- jetty-road-brewery-mothers-day-2026.json (2026-05-10)
- michael-vale-exhibition-at-mprg.json (2026-05-31)
- moonlit-sanctuary-easter-program.json (2026-04-27)
- mornington-cup-2026.json (2026-04-18)
- mornington-peninsula-regional-gallery-school-holiday-workshops.json (2026-07-10)
- mornington-peninsula-winter-wine-weekend-2026.json (2026-06-08)
- mornington-peninsula-winter-wine-weekend-winter-wine-festival.json (2026-06-08)
- mornington-racecourse-market-may-2026.json (2026-05-10)
- mornington-tourist-railway-school-holiday-special-runs.json (2026-07-05)
- mornington-winter-music-festival-2026.json (2026-06-08)
- mothers-day-classic-moonah-links-2026.json (2026-05-10)
- mprg-autumn-exhibition.json (2026-06-30)
- mt-eliza-farmers-market.json (2026-06-24)
- mt-martha-south-beach-market.json (2026-06-08)
- new-wave-26-at-mprg.json (2026-05-31)
- pearcedale-community-market.json (2026-06-20)
- peninsula-hot-springs-allara-briggs-pattison.json (2026-05-02)
- peninsula-hot-springs-kodomo-no-hi.json (2026-05-09)
- peninsula-hot-springs-sunday-sessions.json (2026-06-28)
- pier-10-mothers-day-lunch-2026.json (2026-05-10)
- point-nepean-portsea-market.json (2026-06-06)
- red-hill-market-first-saturday.json (2026-06-06)
- rocky-road-festival-mornington-peninsula-chocolaterie.json (2026-05-31)
- rocky-road-festival-tasting-sessions.json (2026-05-31)
- shoreham-community-market.json (2026-05-17)
- songs-of-dreams-and-destiny.json (2026-05-31)
- sorrento-solstice-festival-2026.json (2026-06-21)
- sorrento-solstice-festival-fire-night.json (2026-06-20)
- sorrento-writers-festival-2026.json (2026-04-26)
- soul-night-market-sorrento-beach.json (2026-05-22)
- sustainable-house-day-2026.json (2026-05-17)
- tall-poppy-melbourne-design-week-exhibition.json (2026-06-07)
- the-enchanted-market-at-the-briars.json (2026-05-31)
- tootgarook-primary-school-market.json (2026-05-23)
- trace-duo-exhibition-at-lander-se.json (2026-05-31)
- trace-duo-exhibition.json (2026-05-31)
- wild-mushroom-forage-lunch-with-the-kitchen.json (2026-05-30)
- winter-camp-2026-the-ranch.json (2026-07-02)
- winter-wine-weekend-full-3-day-peninsula-program.json (2026-06-08)
- winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json (2026-06-06)
- youth-services-school-holiday-program.json (2026-07-10)

---

### Issue 02 · RESOLVED — Homepage weekendPlanner updated

Replaced the stale 27–28 June weekendPlanner block in `next/src/data/homepage.json` with current weekend content (11–12 July 2026).

**Old:** `"eyebrow": "This weekend - 27 to 28 June"` featuring Tootgarook Market, Sunday Sessions (final), and truffle hunts.

**New:** `"eyebrow": "This weekend - 11 to 12 July"` featuring:
- Red Hill Truffles winter truffle hunt, Main Ridge (active through 2026-09-30)
- Flinders Truffles winter hunt, Flinders (active through 2026-08-31)
- National Works on Paper 2026 at MPRG, Mornington (active through 2026-11-22)
- Stonier Fire & Wine Winter Lunch, Merricks (active through 2026-08-09)

---

### Issue 03 · RESOLVED — MPRG Autumn Exhibition removed from published pool

`mprg-autumn-exhibition.json` (ended 2026-06-30) was archived as part of Issue 01. No explicit homepage.json card referenced this event by slug — the scan identified it as appearing in the published events pool surfaced dynamically. Archiving the file removes it from all event surfaces.

---

### Issue 04 · RESOLVED — Site rebuilt and deployed

Build ran after all content changes. Result: **931 pages built in 3m 34s — clean pass**. Pushed to origin `v5-1`. GitHub Pages deploy triggered via push hook.

**Note:** Build required `npm install --include=optional` to resolve a missing `@rollup/rollup-linux-x64-gnu` native module (known npm optional deps bug). This is an infrastructure issue unrelated to content changes — the module was re-added and the build succeeded.

---

## Items Not Actioned (Bucket 2 — Approval Required)

| Issue | Reason held |
|-------|-------------|
| Issue 05 — Missing 11–12 July dispatch | Editorial decision — Bucket 2 |
| Issue 06 — Hero carousel Solstice slide | LOCKED file (`home-hero-slides.json`) — Bucket 2, manual Hero Editor only |
| Issue 07 — Autofix pipeline gap on 10 July | Operational review — Bucket 2 |

---

## Build Details

- **Tool:** `npm run build` (Next.js / Astro)
- **Pages built:** 931
- **Build time:** 3m 34s
- **Cache-bust integration:** `pi-cache-bust-images` stamped 11,179 references across 759 pages (155 images hashed)
- **Pre-commit warnings (non-blocking):** 2 v5 Card title-length warnings, 1 verdict length warning

---

*Autofix completed by Remy · Peninsula Insider accuracy desk · 11 July 2026 · 21:10 UTC*
