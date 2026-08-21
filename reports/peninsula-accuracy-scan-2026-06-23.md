# Peninsula Insider Daily Accuracy Scan — 2026-06-23

**Run:** Tuesday, 23 June 2026 20:20 UTC  
**Reference date:** 2026-06-23  
**Agent:** Remy  
**Scope:** homepage, What's On hub, current Peninsula This Weekend dispatch, key event files, live built outputs

---

## Executive summary

- **5 expired events still live** (`status: published`) on What's On surfaces — safe to archive automatically.
- **1 event-data mismatch** on the Tootgarook Primary School Market — the homepage and current weekend dispatch say it runs Saturday 27 June, but the event record is archived and dated May. Needs external verification before fixing.
- **41 already-archived events** still sitting in the live events directory — safe to move to `events/archive/`.
- **Governance gates clean** — no stale `lastVerified`, no `tmp-placeholder` images, no missing pricing disclaimers.
- **Working tree:** foreign change present (`reports/daily-2026-06-23.md`). The autofix job must defer until the tree is clean.

---

## Issues by classification

### Bucket 1 — Safe auto-fix

These are factual, high-confidence corrections that do not change editorial judgement.

#### 1. Archive expired events still marked `published`

Five events have `endDate` in the past but still carry `status: published`. They will continue to surface on `/whats-on` and related grids until archived.

| File | Title | endDate | recurrence | Action |
|---|---|---|---|---|
| `boneo-community-market.json` | Boneo Community Market | 2026-06-20 | monthly | Set `status: archived` |
| `emu-plains-market-balnarring.json` | Emu Plains Market, Balnarring | 2026-06-20 | monthly | Set `status: archived` |
| `pearcedale-community-market.json` | Pearcedale Community Market | 2026-06-20 | monthly | Set `status: archived` |
| `sorrento-solstice-festival-2026.json` | Sorrento Solstice Festival 2026 | 2026-06-21 | one-off | Set `status: archived` |
| `sorrento-solstice-festival-fire-night.json` | Sorrento Solstice Festival (Fire Night) | 2026-06-20 | annual | Set `status: archived` |

**Note:** The three monthly markets could alternatively be rolled forward to their next occurrence (e.g., 18 July for 4th-Saturday markets), but the safe default without fresh verification is to archive and let the editorial process create the next occurrence.

#### 2. Move archived event files out of the live directory

41 events already carry `status: archived` but remain in `next/src/content/events/`. They should be moved to `next/src/content/events/archive/` to keep the live collection clean and reduce build-time noise.

Full list (expired endDate, status = archived):

- `alba-fire-and-ice-sessions.json` (2026-04-30)
- `anzac-day-sorrento-dawn.json` (2026-04-25)
- `autumn-winery-walk-2026.json` (2026-05-09)
- `briars-eco-explorers-autumn.json` (2026-04-15)
- `chocolaterie-junior-chocolatier.json` (2026-04-20)
- `coastrek-mornington-peninsula-2026.json` (2026-05-22)
- `crib-point-community-market.json` (2026-05-09)
- `flinders-hotel-mothers-day-2026.json` (2026-05-10)
- `harry-baker-2k-sailing-regatta.json` (2026-05-30)
- `heart-of-the-community-market-rosebud.json` (2026-05-09)
- `hill-ridge-community-market-september-2026-restart.json` (2026-09-20 — future, but archived)
- `jetty-road-brewery-mothers-day-2026.json` (2026-05-10)
- `michael-vale-exhibition-at-mprg.json` (2026-05-31)
- `moonlit-sanctuary-easter-program.json` (2026-04-27)
- `mothers-day-classic-moonah-links-2026.json` (2026-05-10)
- `mornington-racecourse-market-may-2026.json` (2026-05-10)
- `mprg-autumn-exhibition.json` (2026-05-18)
- `mt-martha-south-beach-market.json` (2026-06-08)
- `national-works-on-paper-2026-nwop.json` (2026-05-18)
- `new-wave-26-at-mprg.json` (2026-05-31)
- `pier-10-mothers-day-lunch-2026.json` (2026-05-10)
- `point-nepean-portsea-market.json` (2026-06-06)
- `red-hill-market-first-saturday.json` (2026-06-06)
- `rocky-road-festival-mornington-peninsula-chocolaterie.json` (2026-05-31)
- `rocky-road-festival-tasting-sessions.json` (2026-05-31)
- `shoreham-community-market.json` (2026-05-17)
- `songs-of-dreams-and-destiny.json` (2026-05-31)
- `sustainable-house-day-2026.json` (2026-05-17)
- `tall-poppy-melbourne-design-week-exhibition.json` (2026-06-07)
- `the-bloody-long-walk-mornington-peninsula-2026.json` (2026-10-18 — future, but archived)
- `the-enchanted-market-at-the-briars.json` (2026-05-31)
- `tootgarook-primary-school-market.json` (2026-05-23 — see Bucket 3)
- `trace-duo-exhibition-at-lander-se.json` (2026-05-31)
- `trace-duo-exhibition.json` (2026-05-31)
- `wild-mushroom-forage-lunch-with-the-kitchen.json` (2026-05-30)
- `winter-camp-2026-the-ranch.json` (2026-07-17 — future, but archived)
- `winter-wine-weekend-full-3-day-peninsula-program.json` (2026-06-08)
- `winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json` (2026-06-06)
- `mornington-peninsula-winter-wine-weekend-2026.json` (2026-06-08)
- `mornington-peninsula-winter-wine-weekend-winter-wine-festival.json` (2026-06-08)
- `mornington-winter-music-festival-2026.json` (2026-06-08)
- `youth-services-school-holiday-program.json` (2026-04-17)

### Bucket 2 — Needs approval

No direct approval-level changes are required today, but one is contingent:

- **Tootgarook Market homepage / dispatch replacement (contingent on Bucket 3 verification):** If the market cannot be verified for Saturday 27 June, the Tootgarook card on the homepage and the lead pick in `peninsula-this-weekend-jun-27.md` should be replaced with a verified Saturday market or event. This changes the editorial lead for the weekend and therefore requires approval.

### Bucket 3 — Needs verification

#### 1. Tootgarook Primary School Market — date and URL mismatch

**Evidence:**
- Homepage `next/src/data/homepage.json` weekendPlanner card: "Tootgarook Market, Tootgarook Primary School — Saturday 27 June".
- Current dispatch `next/src/content/articles/peninsula-this-weekend-jun-27.md` lead pick: "Tootgarook Market, Tootgarook Primary School — Saturday 27 June, 7:30am–12:30pm".
- Event record `next/src/content/events/tootgarook-primary-school-market.json`:
  - `status: archived`
  - `startDate: 2026-05-23`, `endDate: 2026-05-23`
  - `recurrenceNote`: "Monthly – 4th Saturday of every month"
  - `nextOccurrence: 2026-06-23` (a Tuesday — inconsistent with 4th-Saturday recurrence)
  - `primarySourceUrl`: `https://peninsulakids.com.au/markets-3/`
- Dispatch booking URL: `https://www.morningtonpeninsulamakers.com/markets/tootgarook-primary-school-market` (different source).

**Question to resolve:** Is the market actually running on Saturday 27 June 2026, and which is the canonical booking/source URL?

**If verified:** update the event record to `status: published`, `startDate/endDate: 2026-06-27`, `nextOccurrence: 2026-06-27`, and correct the source/booking URLs. This then becomes a safe auto-fix.

**If not verified:** treat as Bucket 2 — remove/replace the homepage card and dispatch lead.

---

## Surface-by-surface check

| Surface | Check | Result |
|---|---|---|
| Homepage `next/src/data/homepage.json` | Weekend planner dates | Correctly shows 27–28 June |
| Homepage | Featured events vs live event data | Tootgarook mismatch flagged |
| What's On hub `next/src/pages/whats-on/index.astro` | Latest dispatch selection | Will render `peninsula-this-weekend-jun-27.md` (publishedAt 2026-06-22) |
| What's On | Event freshness filter | Filters `status: published`; 5 expired events still pass through |
| Current PTW dispatch `peninsula-this-weekend-jun-27.md` | Date window, event refs | Window is correct; Tootgarook ref needs verification |
| Event files `next/src/content/events/*.json` | Expired records | 46 expired; 5 still published |
| PTW archive | Past dispatches | Archive page renders correctly |

---

## Governance summary

Per `docs/peninsula-insider-editorial-governance-standard-2026-05-02.md`:

- **Stale / missing `lastVerified`:** 0 articles
- **`tmp-placeholder` images:** 0
- **Pricing without disclaimer:** 0
- **Undisclosed partner content:** 0 flagged

Governance gates are clean.

---

## Working tree safety

`bash ops/scripts/pi-autofix-safe-stash.sh check` returned **exit 2**.

- **Foreign file in working tree:** `reports/daily-2026-06-23.md`
- **Impact:** `pi-daily-accuracy-autofix` must **abort and defer** per the 2026-06-11 working-tree safety rule. No content edits, commits, or pushes until the foreign change is resolved.
- **This scan** wrote only report files and did not alter content.

---

## Recommended next actions

1. **Verify Tootgarook Market** for Saturday 27 June 2026 and confirm the canonical URL.
2. Once the working tree is clean, run `pi-daily-accuracy-autofix` to:
   - Archive the 5 expired published events.
   - Move 41 archived events to `next/src/content/events/archive/`.
3. If Tootgarook is verified, update its event record; if not, replace it on the homepage and in the dispatch.
4. Rebuild and redeploy once fixes are applied.

---

*Report generated by Remy for Peninsula Insider.*
