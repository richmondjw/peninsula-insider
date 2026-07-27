# Peninsula Insider — Daily Accuracy Scan
**Date:** Monday, 27 July 2026  
**Run time:** 08:34 UTC  
**Job:** `pi-daily-accuracy-scan`  
**Agent:** Remy  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`

---

## Summary

- Total issues found: **5**
- Safe auto-fix (Bucket 1): **1**
- Needs approval (Bucket 2): **2** (homepage rollover + governance staleness)
- Needs verification (Bucket 3): **2** (missing dispatches from cron outage gap)
- Governance gates: **1 flag** (stale lastVerified on 77 published articles)

**Context note:** This is the first accuracy scan since 19 July 2026. A cron outage from 19–27 July caused 8 daily runs (and 1 weekly Sunday dispatch run) to be skipped. Issues carried forward from the Jul 19 scan are noted where relevant.

---

## Surfaces Checked

| Surface | Status |
|---|---|
| Homepage (`next/src/data/homepage.json`) | ✅ Checked |
| What's On partner slot (`next/src/data/whats-on-partner.json`) | ✅ Checked |
| Current weekend dispatch articles | ✅ Checked |
| All active event files (38 current, 47+ archived) | ✅ Checked |
| All published article files (lastVerified, image licences, pricing) | ✅ Checked |
| Dispatch history for Jul 25–26 and Aug 1–2 | ✅ Checked |

---

## Issue Register

---

### ISSUE 001 — `mugs-keep-cups-workshop` event still `published`, endDate yesterday
**Bucket:** 1 — Safe auto-fix  
**Severity:** Low  
**File:** `next/src/content/events/mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json`  
**Field:** `status: published`, `endDate: 2026-07-26`

**Detail:** This ceramics workshop at Moorooduc ran through Sunday 26 July. It ended yesterday. The event file still carries `status: published` and would continue surfacing on any What's On queries that return all `published` events. It should be marked `archived` and moved to `events/archive/`.

**Autofix action (for `pi-daily-accuracy-autofix`):**
1. Set `status: "archived"` in `mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json`
2. Move file to `next/src/content/events/archive/`

---

### ISSUE 002 — Homepage weekendPlanner stuck on "18 to 19 July" — now 9 days stale
**Bucket:** 2 — Needs approval  
**Severity:** Medium  
**File:** `next/src/data/homepage.json`  
**Field:** `weekendPlanner.eyebrow` and `weekendPlanner.cards`

**Detail:** The homepage weekendPlanner reads "This weekend - 18 to 19 July" with four event cards referencing Saturday 18 or Sunday 19 July. That weekend is 9 days in the past. Two of the original four events in those cards have since expired:
- ~~Faux Snow Flurries, Arthurs Seat Eagle~~ — expired 19 July (archived by autofix 19–20 Jul)
- ~~Sip & Sketch Sculpture Park~~ — expired 19 July (archived by autofix 19–20 Jul)

The upcoming weekend is **Saturday 1 – Sunday 2 August 2026**.

**Active events suitable for an Aug 1–2 weekendPlanner:**
| Event | Status | Notes |
|---|---|---|
| Red Hill Truffles — truffle hunt season | Active (ends Sep 2026) | Anchor booking, ongoing |
| Flinders Truffles — truffle hunt season | Active (ends Aug 2026) | Quieter alternative |
| Southern Peninsula Sleepout, The Ranch | Active (ends Aug 1) | Single-day Sat Aug 1 |
| Country Day — Tar Barrel Farm, Aug 2 | Active (ends Aug 2) | Single-day Sun Aug 2 |
| Pt Leo Estate Sculpture Park | Active (ends Apr 2027) | Evergreen, always valid |
| Stonier Fire & Wine Winter Lunch | Active (ends Aug 9) | Good weekend booking |

**Approval required:** Editorial decision on which events to feature for Aug 1–2, and updated `eyebrow` date string and card copy. Once approved, autofix applies the homepage update.

---

### ISSUE 003 — Weekend dispatch for Jul 25–26 missing (cron outage gap)
**Bucket:** 3 — Needs verification  
**Severity:** Medium  
**Expected file:** `next/src/content/articles/peninsula-this-weekend-jul-25.md`

**Detail:** The weekly dispatch pipeline (research scan → shape → draft → review → publish) normally runs on Sundays. Sunday 20 July was the run date for the Jul 25–26 dispatch. The cron outage from 19–27 July meant this pipeline did not run. No dispatch for July 25–26 exists in the content directory or reports.

The Jul 25–26 weekend has now passed. No action is needed to create a retrospective dispatch.

**Action:** Confirm with James whether any content exists in draft form. If not, the gap stands — no retrospective dispatch required.

---

### ISSUE 004 — Weekend dispatch for Aug 1–2 missing (should have run yesterday, Jul 26)
**Bucket:** 3 — Needs verification  
**Severity:** High  
**Expected file:** `next/src/content/articles/peninsula-this-weekend-aug-01.md`  
**Expected dispatch pipeline run date:** Sunday 27 July 2026

**Detail:** Wait — today (27 July 2026) is a Monday. The dispatch pipeline for Aug 1–2 should have run **yesterday, Sunday 26 July**. The cron outage covered this date. No dispatch research, shape, draft, review, or publish ran for the Aug 1–2 weekend.

**The Aug 1–2 weekend is 5 days away.** This is a live gap. The dispatch should be commissioned and drafted now or today if James wants coverage for the upcoming weekend.

**Action required:** Human decision — does James want to manually trigger or create the Aug 1–2 dispatch today? The standard editorial workflow is available but requires a human prompt to initiate outside the normal Sunday schedule.

---

### GOVERNANCE — 77 published articles with `lastVerified` older than 90 days
**Bucket:** 2 — Needs approval (editorial refresh queue)  
**Severity:** Medium  
**Gate:** `lastVerified` staleness (>90 days from today 2026-07-27 = before 2026-04-28)

**Detail:** 77 published articles carry `lastVerified: 2026-04-22` (76 articles) or `lastVerified: 2026-04-26` (1 article). Both dates are more than 90 days ago. These articles are flagged for editorial refresh review.

These are primarily evergreen winery, venue, and area guide articles — not time-sensitive event content. However the 90-day gate exists to catch venue closures, pricing changes, and seasonal drift in evergreen copy.

**Action required:** Surface to editorial queue for systematic lastVerified refresh pass. This is a known structural staleness backlog, not a new acute issue.

---

## Clean Checks

| Check | Result |
|---|---|
| Active event files with future `endDate` | ✅ 38 events — all clean |
| Events expiring this week (Jul 27–Aug 2) | ✅ 2 events: `southern-peninsula-sleepout` (Aug 1), `country-day-tar-barrel-august-2026` (Aug 2) — both live, correctly published |
| Expired events still marked `status: published` | ⚠️ 1 — see ISSUE 001 |
| Expired events correctly archived | ✅ 47 files marked `status: archived` |
| Archive directory files | ✅ 20 files physically in `events/archive/` |
| What's On partner slot | ✅ `enabled: false` — clean |
| `tmp-placeholder` images in published articles | ✅ 0 — clean |
| Missing `lastVerified` on published articles | ✅ 0 — all published articles have lastVerified |
| Pricing without disclaimer | ✅ 0 — clean |

---

## Governance Gates

| Gate | Result |
|---|---|
| `tmp-placeholder` images in published articles | **0** — Clean |
| Missing `lastVerified` on published articles | **0** — Clean |
| `lastVerified` older than 90 days | **77** — 76 articles at 2026-04-22, 1 at 2026-04-26 |
| Pricing without disclaimer | **0** — Clean |

**Governance summary:**
- 0 articles with tmp-placeholder images
- 77 articles with stale/outdated lastVerified (>90 days)
- 0 articles with pricing but no disclaimer

---

## Autofix Recommendations (for `pi-daily-accuracy-autofix`)

**Apply immediately (Bucket 1):**
1. Archive `mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json` — set `status: archived`, move to `events/archive/`

**Hold for approval (Bucket 2):**
1. Homepage weekendPlanner rollover to Aug 1–2 — editorial approval required on event selection and card copy
2. lastVerified refresh pass for 77 stale articles — editorial queue decision required

**Hold for verification (Bucket 3):**
1. Jul 25–26 dispatch gap — no action needed (weekend passed), confirm with James
2. Aug 1–2 dispatch — **urgent**: weekend is 5 days away; human decision needed on whether to create this dispatch today

---

*Report filed: `reports/peninsula-accuracy-scan-2026-07-27.md`*  
*Previous scan: 2026-07-19 (8-day gap due to cron outage)*  
*Next run: Tuesday 28 July 2026, 20:20 UTC*
