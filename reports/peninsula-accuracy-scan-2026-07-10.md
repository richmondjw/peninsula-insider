# Peninsula Insider — Daily Accuracy Scan
**Date:** Friday, 10 July 2026  
**Run time:** 20:20 UTC  
**Scan agent:** Remy  
**Job:** `pi-daily-accuracy-scan`  
**Status:** Complete — no content edits (scan only)

---

## Summary

- **Issues found:** 8
- **Bucket 1 — Safe auto-fix:** 5
- **Bucket 2 — Needs approval:** 1
- **Bucket 3 — Needs verification:** 2
- **Governance flags:** 0

---

## Issues Found

---

### ISSUE 01 · Bucket 1 · Safe auto-fix
**Surface:** Homepage + What's On hub  
**Type:** Dispatch drift — stale featured dispatch  
**Confidence:** High

**Description:**  
Both the homepage and the What's On hub are displaying the **27–28 June 2026** dispatch ("Peninsula This Weekend — 27 to 28 June") as the current weekend feature. Today is Friday 10 July 2026. The upcoming weekend is **11–12 July 2026**.

The source article `next/src/content/articles/peninsula-this-weekend-jul-04.md` (covering 4–5 July) was published and exists in the repo, but the **built site was never rebuilt and redeployed** to reflect this dispatch. The Jun-27 dispatch is still live at `/journal/peninsula-this-weekend-jun-27/` as the featured weekend piece.

**Impact:** Front-door editorial surfaces are pointing readers to a dispatch that is two weekends out of date.

**Recommended autofix:**  
Rebuild and redeploy the site so the Jul-04 dispatch becomes the active featured weekend piece on the homepage and What's On hub. No editorial content changes required — this is a stale build.

**Note for autofix agent:** The upcoming weekend of 11–12 July has no dispatch yet. The Jul-04 dispatch (covering the just-passed 4–5 July weekend) should be the most recent live dispatch post-rebuild, until a Jul-11 dispatch is authored. The What's On "This weekend" label should be reviewed to ensure it no longer reads "27–28 June."

---

### ISSUE 02 · Bucket 1 · Safe auto-fix
**Surface:** Homepage + What's On hub (editor's pick card)  
**Type:** Event freshness drift — expired editor's pick  
**Confidence:** High

**Description:**  
The **What's On nav mega-menu editor's pick** and the **homepage featured event card** both prominently feature:

> **MPRG school holiday workshops** — "Starts 1 July in Mornington, indoor, practical, and actually useful if the school-holiday weather turns. Book early."

The event record (`mornington-peninsula-regional-gallery-school-holiday-workshops.json`) has an **end date of 2026-07-10** — today. As of the scan at 20:20 UTC (which is 6:20 AM AEST July 11), these workshops have ended.

The What's On nav mega-menu still presents this as the "Editor's pick · Winter '26" front-door recommendation.

**Recommended autofix:**  
Replace the MPRG school holiday workshops editor's pick card with a currently-live event. Best available candidates based on active events:
- **Flinders Truffles: Winter Truffle Hunt Season** (active until 31 Aug 2026)
- **Red Hill Truffles: Winter Truffle Hunt Season** (active until 30 Sep 2026)
- **Peninsula Hot Springs – Bathe-in Cinema (Thursdays)** (active until 31 Jul 2026)

Rebuild after update.

---

### ISSUE 03 · Bucket 1 · Safe auto-fix  
**Surface:** What's On event listing  
**Type:** Event freshness drift — expired event surfacing in structured data  
**Confidence:** High

**Description:**  
The What's On page contains structured JSON-LD data referencing the **Mornington Tourist Railway School Holiday Special Runs** with `endDate: 2026-07-05`. This event ended 5 days ago and remains in the live structured data.

Additionally, the **Youth Services School Holiday Program** (`endDate: 2026-07-10`) ends today.

Both records should be moved to the events archive (`next/src/content/events/archive/`).

**Recommended autofix (for `pi-daily-accuracy-autofix`):**  
Archive the following event files:
- `mornington-tourist-railway-school-holiday-special-runs.json`
- `youth-services-school-holiday-program.json`
- `mornington-peninsula-regional-gallery-school-holiday-workshops.json` (ends today)

---

### ISSUE 04 · Bucket 1 · Safe auto-fix  
**Surface:** Events source directory (`next/src/content/events/`)  
**Type:** Event freshness drift — large volume of expired events still in active directory  
**Confidence:** High

**Description:**  
52 event files in `next/src/content/events/` have end dates prior to today (2026-07-10). These range from ANZAC Day (April 25) to the Winter Wine Weekend (June 8), the Sorrento Solstice Festival (June 21), and multiple Mother's Day and autumn events.

Previous scans (June 15, June 23) also identified this backlog. Only 10 events have been archived to date. The remaining 52 expired events continue to reside in the active events directory.

**Recommended autofix:**  
Archive all 52 expired events. Full list:

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

---

### ISSUE 05 · Bucket 1 · Safe auto-fix  
**Surface:** Homepage event cards  
**Type:** Expired event surfacing on homepage  
**Confidence:** High

**Description:**  
The homepage contains a card linking to `/whats-on/mprg-autumn-exhibition` — the **Mornington Peninsula Regional Gallery Autumn Exhibition** which ended **30 June 2026**. This card is embedded in the homepage event grid and still appears to be live-linked.

**Recommended autofix:**  
Remove or replace the MPRG Autumn Exhibition card from the homepage event grid with a currently-active winter event (e.g. Flinders Truffles or Hot Springs Bathe-in Cinema).

---

### ISSUE 06 · Bucket 2 · Needs approval  
**Surface:** Homepage + What's On hub  
**Type:** Missing weekend dispatch for 11–12 July 2026  
**Confidence:** High

**Description:**  
Today is Friday 10 July 2026. The upcoming weekend is **Saturday 11 – Sunday 12 July**. There is no published dispatch for this weekend. The most recent dispatch covers **4–5 July** (the past weekend).

The homepage and What's On are pointing to the stale 27–28 June dispatch (see Issue 01). Even after autofix (rebuilding to show the Jul-04 dispatch), readers arriving this Friday evening will find a dispatch for last weekend, not this weekend.

**This is an editorial judgement call** — it requires deciding:
1. Whether to commission and publish a 11–12 July dispatch now (or this Sunday)
2. Or to acknowledge the gap and hold for the normal Sunday cadence

**Holding for approval:** No autofix can produce the editorial content. This issue is flagged for James's awareness.

**Recommended action:**  
Commission the `pi-weekly-dispatch-research-scan` → draft → review → publish chain for the 11–12 July weekend as an urgent catch-up, or note that the Sunday cadence will resume with the 18–19 July dispatch. The Jul-04 dispatch remains the best available live piece until then.

---

### ISSUE 07 · Bucket 3 · Needs verification  
**Surface:** What's On hub  
**Type:** Recurring market dates — possible single-instance records for recurring events  
**Confidence:** Medium

**Description:**  
Several market events in the active events directory appear to be **single-occurrence records** for what are recurring markets:
- **Boneo Community Market** — listed as `endDate: 2026-06-20` (single day, now expired)
- **Red Hill Market — First Saturday** — listed as `endDate: 2026-06-06` (single day, now expired)
- **Dromana Community Market** — listed as `endDate: 2026-06-28` (single day, now expired)
- **Pearcedale Community Market** — listed as `endDate: 2026-06-20` (single day, now expired)
- **Emu Plains Market, Balnarring** — listed as `endDate: 2026-06-20` (single day, now expired)

These markets likely recur monthly but only a single future instance was ever added. They are expired and will be archived by autofix, but it is worth verifying whether recurring records should be created.

**Recommended action:**  
Verify recurrence schedule and, if confirmed recurring, create updated ongoing event records before archiving the single-instance expired files. Assign to editorial or events desk.

---

### ISSUE 08 · Bucket 3 · Needs verification  
**Surface:** What's On hub  
**Type:** Dispatch — Jul-04 dispatch references events now expired  
**Confidence:** Medium

**Description:**  
The **July 4–5 dispatch** (`peninsula-this-weekend-jul-04.md`) recommends:
1. **Mornington Tourist Railway School Holiday Special Runs** — ended July 5 (still referenced as a "Sunday 5 July" plan)
2. **MPRG School Holiday Workshops** — ended July 10 (still referenced)

Once the build is updated (Issue 01 autofix), the Jul-04 dispatch will be the most recent published dispatch while the 11–12 July weekend dispatch does not yet exist. Readers arriving Friday evening will see a dispatch recommending events that have now passed.

**This is borderline** — the dispatch is correctly dated (4–5 July) and accurately described what was valid then. It is not an error in the dispatch itself. However, if the dispatch remains the prominent "current weekend" feature for another week without a new dispatch replacing it, the expired event references within it become misleading.

**Recommended action:**  
Expedite the Jul-11 or Jul-18 dispatch (linked to Issue 06). Once a new dispatch is live, this self-resolves. If no new dispatch is published for 11–12 July, add a brief editorial note to the What's On hub clarifying that the next dispatch covers 18–19 July.

---

## Governance Check

| Gate | Status |
|------|--------|
| `tmp-placeholder` images | ✅ 0 flagged |
| `lastVerified` stale/missing (published articles) | ✅ 0 flagged |
| Articles with pricing but no disclaimer | ✅ 0 flagged |
| Undisclosed partner content | ✅ 0 flagged (no known partner content detected) |

Governance gates are **clean**.

---

## Active Events (currently live as of 10 July 2026)

| Event | Active Until |
|-------|-------------|
| Bass & Flinders Gin Masterclass | 2027-04-30 |
| Flinders Truffles: Winter Truffle Hunt Season | 2026-08-31 |
| Foxeys Hangout Vegetable Feast (Morning Sun Vineyard) | 2027-04-30 |
| Hastings Thursday Street Market | 2027-04-29 |
| Mornington Wednesday Market (Main Street Market) | 2027-04-28 |
| Peninsula Hot Springs – Bathe-in Cinema (Thursdays) | 2026-07-31 |
| Peninsula Hot Springs Daily Studio Yoga | 2027-04-30 |
| Peninsula Hot Springs Yoga (Complimentary) | 2027-04-30 |
| Peninsula Hot Springs, Sound Healing Sessions | 2026-09-30 |
| Polperro Cellar Table, Private Dining Experience | 2027-04-30 |
| Pt. Leo Estate Sculpture Park | 2027-04-30 |
| Red Hill Truffles: Winter Truffle Hunt Season | 2026-09-30 |
| Restore & Pamper Retreat at Polperro Farmhouse | 2027-04-30 |
| Sound Circle: Full Moon Sound Journey at Peninsula Hot Springs | 2027-04-30 |
| Ten Minutes by Tractor, Terroir Masterclass | 2027-04-30 |

**Upcoming soon:**
- Soil & Cellar: Flinders Truffles × Polperro Winery — 25 July 2026
- Stonier Fire & Wine Winter Lunch — 9 August 2026
- Red Hill Brewery Secret Stash Weekend — 15–16 August 2026

---

## Working Tree Safety

This run is **scan-only** — no content edits, no autofix. Working tree safety check not required for this job. The autofix agent (`pi-daily-accuracy-autofix`) must run `bash ops/scripts/pi-autofix-safe-stash.sh check` before applying any changes.

---

## Recommended Actions for `pi-daily-accuracy-autofix` (20:35 UTC)

1. Archive all 55 expired events (Issues 01, 03, 04, 05 combined)
2. Update MPRG Autumn Exhibition card on homepage
3. Rebuild and redeploy the site (primary fix for stale dispatch display)
4. Replace MPRG school holiday workshops editor's pick with an active winter event
5. **Hold** on Issue 06 (missing 11–12 July dispatch) — editorial decision required
6. **Hold** on Issue 07 (recurring market records) — needs verification
7. **Hold** on Issue 08 (Jul-04 dispatch references) — self-resolves with new dispatch

---

*Scan completed by Remy · Peninsula Insider accuracy desk · 10 July 2026 · 20:20 UTC*
