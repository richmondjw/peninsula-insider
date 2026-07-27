# Peninsula Insider — Daily Accuracy Scan
**Date:** Monday, 27 July 2026  
**Run time:** 20:20 UTC (scheduled)  
**Earlier run:** 08:34 UTC (GitHub Actions — autofix applied: `mugs-keep-cups` event archived)  
**Job:** `pi-daily-accuracy-scan`  
**Agent:** Remy  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`

---

## Summary

- Total issues found: **5**
- Safe auto-fix (Bucket 1): **0** (1 already applied in 08:34 UTC run)
- Needs approval (Bucket 2): **2** (homepage rollover + governance staleness)
- Needs verification (Bucket 3): **2** (dispatch gaps from cron outage)
- Governance gates: **1 flag** (56+ articles with stale lastVerified)

**Context note:** The 08:34 UTC run archived `mugs-keep-cups-workshop` (ended 26 July). No new expired events found in the 20:20 UTC scan. The homepage weekendPlanner remains stale at "18 to 19 July" — now 9 days out of date. Aug 1–2 dispatch is still missing with 5 days until that weekend.

---

## Surfaces Checked

| Surface | Status |
|---|---|
| Homepage (`next/src/data/homepage.json`) | ✅ Checked |
| What's On partner slot (`next/src/data/whats-on-partner.json`) | ✅ Checked |
| Weekend dispatch articles (Jul + Aug) | ✅ Checked |
| All active event files (current pass) | ✅ Checked |
| Homepage card event status verification | ✅ Checked |
| Published articles (lastVerified, image licences, pricing) | ✅ Checked |

---

## Issue Register

---

### ISSUE 001 — ✅ RESOLVED (08:34 UTC autofix) — `mugs-keep-cups-workshop` archived
**Bucket:** 1 — Safe auto-fix  
**Status:** Applied in morning run  
**Action taken:** `status: archived`, moved to `events/archive/`. Build passed (932 pages). Pushed to origin.

---

### ISSUE 002 — Homepage weekendPlanner stale: "18 to 19 July" with dead event card
**Bucket:** 2 — Needs approval  
**Severity:** Medium–High  
**File:** `next/src/data/homepage.json`  
**Fields:** `weekendPlanner.eyebrow`, `weekendPlanner.cards`

**Detail:** Homepage weekendPlanner eyebrow reads "This weekend - 18 to 19 July" — now 9 days stale. Worse: one of the four active cards references **Faux Snow Flurries at Arthurs Seat Eagle**, which has `status: archived` (ended 19 July). This is a live dead-card on the homepage.

**Current 4 cards:**
| Card | Event status | End date | Live? |
|---|---|---|---|
| Red Hill Truffles, winter truffle hunt | published | 2026-09-30 | ✅ Yes |
| Pt Leo Estate Sculpture Park | published | 2027-04-30 | ✅ Yes |
| Faux Snow Flurries, Arthurs Seat Eagle | **archived** | 2026-07-19 | ❌ Expired |
| Flinders Truffles, winter truffle hunt | published | 2026-08-31 | ✅ Yes |

**Upcoming weekend (Aug 1–2) replacement candidates:**
| Event | Status | End date | Notes |
|---|---|---|---|
| Southern Peninsula Sleepout, The Ranch | published | 2026-08-01 | Sat Aug 1 only |
| Country Day — Tar Barrel Farm | published | 2026-08-02 | Sun Aug 2 only |
| Stonier Fire & Wine Winter Lunch | published | 2026-08-09 | Strong weekend anchor |
| Peninsula Hot Springs — Sound Healing | published | Ongoing | Evergreen |

**Approval required:**
1. Confirm replacement for Faux Snow Flurries card (remove or swap)
2. Confirm whether eyebrow should roll to "1 to 2 August" or remain generic
3. Confirm final card selection for Aug 1–2

Once approved, autofix applies the update. If James wants to keep the other 3 valid cards and just remove the dead one, that could be classified Bucket 1.

---

### ISSUE 003 — Weekend dispatch for Jul 25–26 missing (cron outage gap)
**Bucket:** 3 — Needs verification  
**Severity:** Low (weekend has passed)  
**Expected file:** `next/src/content/articles/peninsula-this-weekend-jul-25.md`

**Detail:** The Sunday 20 July dispatch pipeline did not run due to the cron outage. The Jul 25–26 weekend has now passed. No retrospective dispatch needed. Most recent dispatch in the repo is `peninsula-this-weekend-jul-18.md`.

**Action:** No content action needed. Confirm with James that the gap is acceptable.

---

### ISSUE 004 — Weekend dispatch for Aug 1–2 missing (URGENT — 5 days out)
**Bucket:** 3 — Needs verification  
**Severity:** High  
**Expected file:** `next/src/content/articles/peninsula-this-weekend-aug-01.md`  
**Expected pipeline run date:** Sunday 27 July 2026 (yesterday — missed due to cron outage)

**Detail:** The Aug 1–2 dispatch pipeline (research → shape → draft → review → publish) should have run yesterday, Sunday 27 July. The cron outage covered this date. No dispatch for the upcoming weekend exists. August 1 is 5 days away.

**Events available for Aug 1–2 dispatch:**
- Southern Peninsula Sleepout, The Ranch (Sat Aug 1)
- Country Day — Tar Barrel Farm, Aug 2 (Sun Aug 2)
- Stonier Fire & Wine Winter Lunch (through Aug 9)
- Flinders Truffles: Winter Truffle Hunt Season (through Aug 31)
- Red Hill Truffles: Winter Truffle Hunt Season (through Sep 30)
- Peninsula Hot Springs: Bathe-in Cinema Thursdays (last day Jul 31 — not weekend-relevant)
- Peninsula Hot Springs: Sound Healing, daily studio yoga — evergreen
- Wild Mushroom Forage & Lunch with The Kitchen
- Sorrento Writers Festival 2026

**Action required:** Human decision — does James want to commission the Aug 1–2 dispatch today? Suggest triggering immediately given the 5-day window. The standard pipeline is available on demand.

---

### UPCOMING EXPIRY WATCH — `bathe-in-cinema-thursdays` expires Jul 31 (tomorrow)
**Bucket:** 1 — Safe auto-fix (on expiry)  
**Severity:** Low  
**File:** `next/src/content/events/peninsula-hot-springs-bathe-in-cinema-thursdays.json`  
**End date:** 2026-07-31

**Detail:** This event is currently `published` and correctly so — Thursday 31 July is 4 days away. It will need to be archived by the 20:20 UTC scan on **Friday 1 August** (or earlier if the autofix runs tomorrow evening). No action today; flagged for tomorrow's autofix run.

---

### GOVERNANCE — 56+ published articles with `lastVerified` older than 90 days
**Bucket:** 2 — Needs approval (editorial refresh queue)  
**Severity:** Medium  
**Gate:** `lastVerified` staleness (>90 days from 2026-07-27 = before 2026-04-28)

**Detail:** Scan confirmed 56+ published articles with `lastVerified` of 2026-04-22 or earlier (96+ days ago). This is the ongoing structural staleness backlog, primarily evergreen winery, venue, and area guide content. No acute closures or factual changes detected; risk is gradual drift in venue details, pricing, and seasonal framing.

**Action required:** Surface to editorial queue. Recommend a systematic lastVerified refresh pass as a background project.

---

## Clean Checks

| Check | Result |
|---|---|
| Active events with future `endDate` | ✅ All clean — 0 expired published events |
| Events expiring this week (Jul 27–Aug 2) | ⚠️ 3 events: `bathe-in-cinema-thursdays` (Jul 31), `southern-peninsula-sleepout` (Aug 1), `country-day-tar-barrel` (Aug 2) — all correctly published |
| Homepage card event status | ⚠️ 1 dead card (Faux Snow Flurries — archived Jul 19) |
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
| `lastVerified` older than 90 days | **56+** — stale articles at 2026-04-22 (96 days ago) |
| Pricing without disclaimer | **0** — Clean |

**Governance summary:**
- 0 articles with tmp-placeholder images
- 56+ articles with stale/outdated lastVerified (>90 days)
- 0 articles with pricing but no disclaimer

---

## Autofix Recommendations (for `pi-daily-accuracy-autofix`)

**Already applied (Bucket 1 — 08:34 UTC run):**
1. ✅ Archived `mugs-keep-cups-workshop-peninsula-ceramics-studio-july-2026.json`

**Hold for approval (Bucket 2):**
1. Homepage weekendPlanner rollover to Aug 1–2 — editorial approval required on event selection, dead card removal, and eyebrow update
2. lastVerified refresh pass for 56+ stale articles — editorial queue decision required

**Hold for verification (Bucket 3):**
1. Jul 25–26 dispatch gap — no action needed (weekend passed); confirm gap is acceptable
2. Aug 1–2 dispatch — **urgent**: weekend is 5 days away; human decision needed to commission today

**Scheduled for tomorrow's autofix (Bucket 1 — no action today):**
1. Archive `peninsula-hot-springs-bathe-in-cinema-thursdays` after Jul 31 end date

---

*Report filed: `reports/peninsula-accuracy-scan-2026-07-27.md`*  
*Previous scan: 2026-07-19 (8-day gap due to cron outage; 08:34 UTC run also produced today)*  
*Next run: Tuesday 28 July 2026, 20:20 UTC*
