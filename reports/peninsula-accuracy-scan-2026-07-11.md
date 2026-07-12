# Peninsula Insider — Daily Accuracy Scan
**Date:** Saturday, 11 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 7
- **Bucket 1 — Safe auto-fix:** 4
- **Bucket 2 — Needs approval:** 3
- **Bucket 3 — Needs verification:** 0
- **Governance flags:** 0

**Important note:** No autofix report exists for 10 July 2026. Yesterday's Bucket 1 issues (53 expired events, homepage event card, MPRG editor's pick) were not acted upon. Today's Bucket 1 findings are carry-forwards. Autofix agent should treat today's report as the current action list.

---

## Issues Found

---

### ISSUE 01 · Bucket 1 · Safe auto-fix (carry-forward from 10 Jul)
**Surface:** Events source directory (`next/src/content/events/`)  
**Type:** Event freshness drift — expired events still with `status: published`  
**Confidence:** High

**Description:**  
53 event files in `next/src/content/events/` have end dates prior to today (2026-07-11) and retain `status: published`. These range from ANZAC Day (April 25) through to yesterday (July 10). Most were identified in the July 10 scan and were not acted upon by autofix.

Events that are **newly expired since yesterday's scan:**
- `mornington-peninsula-regional-gallery-school-holiday-workshops.json` — ended 2026-07-10
- `youth-services-school-holiday-program.json` — ended 2026-07-10

**Full expired events list (`status: published`, `endDate < 2026-07-11`):**

| File | End Date |
|------|----------|
| alba-fire-and-ice-sessions.json | 2026-04-30 |
| anzac-day-sorrento-dawn.json | 2026-04-25 |
| autumn-winery-walk-2026.json | 2026-05-09 |
| boneo-community-market.json | 2026-06-20 |
| briars-eco-explorers-autumn.json | 2026-04-15 |
| chocolaterie-junior-chocolatier.json | 2026-04-20 |
| coastrek-mornington-peninsula-2026.json | 2026-05-22 |
| crib-point-community-market.json | 2026-05-09 |
| dromana-community-market.json | 2026-06-28 |
| emu-plains-market-balnarring.json | 2026-06-20 |
| flinders-hotel-mothers-day-2026.json | 2026-05-10 |
| harry-baker-2k-sailing-regatta.json | 2026-05-30 |
| heart-of-the-community-market-rosebud.json | 2026-05-09 |
| jetty-road-brewery-mothers-day-2026.json | 2026-05-10 |
| michael-vale-exhibition-at-mprg.json | 2026-05-31 |
| moonlit-sanctuary-easter-program.json | 2026-04-27 |
| mornington-cup-2026.json | 2026-04-18 |
| mornington-peninsula-regional-gallery-school-holiday-workshops.json | 2026-07-10 |
| mornington-peninsula-winter-wine-weekend-2026.json | 2026-06-08 |
| mornington-peninsula-winter-wine-weekend-winter-wine-festival.json | 2026-06-08 |
| mornington-racecourse-market-may-2026.json | 2026-05-10 |
| mornington-tourist-railway-school-holiday-special-runs.json | 2026-07-05 |
| mornington-winter-music-festival-2026.json | 2026-06-08 |
| mothers-day-classic-moonah-links-2026.json | 2026-05-10 |
| mprg-autumn-exhibition.json | 2026-06-30 |
| mt-eliza-farmers-market.json | 2026-06-24 |
| mt-martha-south-beach-market.json | 2026-06-08 |
| new-wave-26-at-mprg.json | 2026-05-31 |
| pearcedale-community-market.json | 2026-06-20 |
| peninsula-hot-springs-allara-briggs-pattison.json | 2026-05-02 |
| peninsula-hot-springs-kodomo-no-hi.json | 2026-05-09 |
| peninsula-hot-springs-sunday-sessions.json | 2026-06-28 |
| pier-10-mothers-day-lunch-2026.json | 2026-05-10 |
| point-nepean-portsea-market.json | 2026-06-06 |
| red-hill-market-first-saturday.json | 2026-06-06 |
| rocky-road-festival-mornington-peninsula-chocolaterie.json | 2026-05-31 |
| rocky-road-festival-tasting-sessions.json | 2026-05-31 |
| shoreham-community-market.json | 2026-05-17 |
| songs-of-dreams-and-destiny.json | 2026-05-31 |
| sorrento-solstice-festival-2026.json | 2026-06-21 |
| sorrento-solstice-festival-fire-night.json | 2026-06-20 |
| sorrento-writers-festival-2026.json | 2026-04-26 |
| soul-night-market-sorrento-beach.json | 2026-05-22 |
| sustainable-house-day-2026.json | 2026-05-17 |
| tall-poppy-melbourne-design-week-exhibition.json | 2026-06-07 |
| the-enchanted-market-at-the-briars.json | 2026-05-31 |
| tootgarook-primary-school-market.json | 2026-05-23 |
| trace-duo-exhibition-at-lander-se.json | 2026-05-31 |
| trace-duo-exhibition.json | 2026-05-31 |
| wild-mushroom-forage-lunch-with-the-kitchen.json | 2026-05-30 |
| winter-camp-2026-the-ranch.json | 2026-07-02 |
| winter-wine-weekend-full-3-day-peninsula-program.json | 2026-06-08 |
| winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json | 2026-06-06 |
| youth-services-school-holiday-program.json | 2026-07-10 |

**Recommended autofix:** Move all 53 files to `next/src/content/events/archive/`. Set `status: archived` in each file. Rebuild and redeploy.

---

### ISSUE 02 · Bucket 1 · Safe auto-fix (carry-forward from 10 Jul)
**Surface:** Homepage weekendPlanner section  
**Type:** Homepage drift — stale weekend planner  
**Confidence:** High

**Description:**  
`next/src/data/homepage.json` contains a `weekendPlanner` block with `eyebrow: "This weekend - 27 to 28 June"`. Today is Saturday 11 July 2026 — this is **two weeks stale**. The content references:
- Tootgarook Market (June 27)
- Peninsula Hot Springs Sunday Sessions — described as "final session" of the 2026 run
- Red Hill Truffles, Flinders Truffles (these are still live)

The stale June 27-28 content is surfacing on the homepage weekend planner rail.

**Recommended autofix:** Update the `weekendPlanner` block in `homepage.json` to reflect the current weekend (11–12 July) or the next upcoming weekend (18–19 July), using currently-live events. Rebuild after.

---

### ISSUE 03 · Bucket 1 · Safe auto-fix (carry-forward from 10 Jul)
**Surface:** Homepage event card  
**Type:** Expired event on homepage  
**Confidence:** High

**Description:**  
The homepage contains a card or reference to the **MPRG Autumn Exhibition** (`mprg-autumn-exhibition.json`, ended 2026-06-30). This has been expired for 11 days.

**Recommended autofix:** Replace with an active winter event. Best candidates:
- Stonier Fire & Wine Winter Lunch (9 Aug)
- Soil & Cellar: Flinders Truffles × Polperro Winery (25 Jul)
- Red Hill Brewery Secret Stash Weekend (15–16 Aug)

---

### ISSUE 04 · Bucket 1 · Safe auto-fix (carry-forward from 10 Jul)
**Surface:** Site build  
**Type:** Stale site build — deployed site not reflecting latest dispatch  
**Confidence:** High

**Description:**  
The site build has not been refreshed since the July 4–5 dispatch was published. The homepage and What's On surfaces may still be showing the June 27–28 dispatch as the featured weekend piece. A rebuild is required to ensure the most recent published content is live.

**Recommended autofix:** Rebuild and redeploy the site after Issues 01–03 are addressed.

---

### ISSUE 05 · Bucket 2 · Needs approval
**Surface:** `/whats-on/this-weekend/`  
**Type:** Dispatch drift — no dispatch for current weekend  
**Confidence:** High

**Description:**  
Today is Saturday 11 July 2026. The current weekend is **Saturday 11 – Sunday 12 July**. There is no published dispatch for this weekend. The most recent dispatch covers **4–5 July** (last weekend). Once the build is refreshed, the What's On "This Weekend" page will show the July 4–5 dispatch — a dispatch for a past weekend, with events that have already occurred.

This has been an open issue since Friday 10 July. No editorial action was taken.

**Recommended action:** Commission and publish a dispatch for the 11–12 July weekend today, or acknowledge the gap and resume with the 18–19 July Sunday cadence. The July 4–5 dispatch will remain the front-door weekend piece until a new dispatch is live.

---

### ISSUE 06 · Bucket 2 · Needs approval
**Surface:** Home hero carousel  
**Type:** Stale event feature in homepage hero  
**Confidence:** High

**Description:**  
The homepage hero carousel (`next/src/data/home-hero-slides.json`, **LOCKED file — no autofix**) has the first slide (`id: "sorrento-solstice-2026"`) referencing the Sorrento Solstice Festival with dispatch text: *"Saturday 20 June."* — an event that ended 21 days ago on 21 June 2026.

The hero file is LOCKED for automation per its README. This requires manual editorial action.

**Recommended action (approval required):** Replace or demote the `sorrento-solstice-2026` slide via the Hero Editor. The winter peninsula weekend content in slides 2–3 (`flinders-weekend`, `winter-peninsula-weekend`) is evergreen and provides a better front-door during this window.

---

### ISSUE 07 · Bucket 2 · Needs approval
**Surface:** Automated accuracy pipeline  
**Type:** Operational gap — autofix agent did not run on 10 July 2026  
**Confidence:** High

**Description:**  
No `reports/peninsula-accuracy-autofix-2026-07-10.md` exists. The July 10 scan identified Bucket 1 issues (53 expired events, stale homepage content, stale build). The autofix job scheduled at 20:35 UTC on July 10 did not produce a report. The same issues are unresolved one day later.

**Recommended action:** Investigate why the autofix agent did not run or produce a report on July 10. The autofix for today's Bucket 1 issues should be prioritised.

---

## Governance Check

| Gate | Status |
|------|--------|
| `tmp-placeholder` images | ✅ 0 flagged |
| `lastVerified` stale/missing (published articles) | ✅ 0 flagged |
| Articles with pricing but no disclaimer | ✅ 0 flagged |
| Undisclosed partner content | ✅ 0 flagged |

Governance gates are **clean**.

---

## Active Events (currently live as of 11 July 2026)

| Event | Active Until |
|-------|-------------|
| Bass & Flinders Gin Masterclass | 2027-04-30 |
| Emu Plains Market | 2026-10-17 |
| Flinders Truffles: Winter Truffle Hunt Season | 2026-08-31 |
| Foxeys Hangout Vegetable Feast (Morning Sun Vineyard) | 2027-04-30 |
| Hastings Thursday Street Market | 2027-04-29 |
| Hill & Ridge Community Market, September 2026 | 2026-09-05 |
| Main Street Mornington Festival 2026 | 2026-10-18 |
| Mornington Wednesday Market | 2027-04-28 |
| National Works on Paper 2026 (NWOP) | 2026-11-22 |
| Peninsula Hot Springs – Bathe-in Cinema (Thursdays) | 2026-07-31 |
| Peninsula Hot Springs Daily Studio Yoga | 2027-04-30 |
| Peninsula Hot Springs Yoga (Complimentary) | 2027-04-30 |
| Peninsula Hot Springs, Sound Healing Sessions | 2026-09-30 |
| Peninsula Summer Music Festival 2027 | 2027-01-11 |
| Polperro Cellar Table, Private Dining Experience | 2027-04-30 |
| Pt. Leo Estate Sculpture Park | 2027-04-30 |
| Red Hill Truffles: Winter Truffle Hunt Season | 2026-09-30 |
| Restore & Pamper Retreat at Polperro Farmhouse | 2027-04-30 |
| Soil & Cellar: Flinders Truffles × Polperro Winery | 2026-07-25 |
| Sound Circle: Full Moon Sound Journey at Peninsula Hot Springs | 2027-04-30 |
| Stonier Fire & Wine Winter Lunch | 2026-08-09 |
| Ten Minutes by Tractor, Terroir Masterclass | 2027-04-30 |
| The Bloody Long Walk – Mornington Peninsula 2026 | 2026-10-25 |

**Coming soon:**
- Red Hill Brewery Secret Stash Weekend — 15–16 August 2026

---

## Working Tree Safety

This run is **scan-only** — no content edits, no autofix. Working tree safety check not required for this job. The autofix agent (`pi-daily-accuracy-autofix`) must run `bash ops/scripts/pi-autofix-safe-stash.sh check` before applying any changes.

---

## Recommended Actions for `pi-daily-accuracy-autofix` (20:35 UTC)

1. **Archive all 53 expired events** — move to `next/src/content/events/archive/`, set `status: archived` (Issue 01)
2. **Update homepage `weekendPlanner`** — replace June 27–28 block with current live events (Issue 02)
3. **Replace MPRG Autumn Exhibition card** on homepage with active winter event (Issue 03)
4. **Rebuild and redeploy** the site (Issue 04)
5. **HOLD** — Issue 05 (missing 11–12 July dispatch) — editorial decision required
6. **HOLD** — Issue 06 (hero carousel Solstice slide) — file is LOCKED, manual action via Hero Editor
7. **HOLD** — Issue 07 (autofix gap investigation) — operational review

---

*Scan completed by Remy · Peninsula Insider accuracy desk · 11 July 2026 · 20:20 UTC*
