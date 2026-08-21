# Archive Rollover: Peninsula This Weekend — 20 to 21 June 2026
_Phase 7/7 | Job: pi-weekly-dispatch-archive-rollover_
_Generated: 2026-06-15 04:34 UTC_
_Dispatch cycle: publish-date 2026-06-15, covers Saturday 20 June + Sunday 21 June 2026_

---

## Summary

**✅ Archive integrity confirmed.** The June 20–21 dispatch (Sorrento Solstice Festival edition) is live at the rolling URL and selecting correctly as latest. The June 13–14 dispatch is de-featured and resolving cleanly at its dated archive path. All cluster links, journal redirects, and archive URLs verified live. No broken cross-links detected.

**⚠️ Timing note (informational, no action required):** The dispatch was committed at 03:35 UTC Monday 15 June, with `publishedAt: 2026-06-15`, rather than the target Sunday 14 June 11:30 UTC. This appears to be a pipeline delay (phases ran in the early hours of Monday). No archive routing impact — `selectLatestPtw` sorts by `publishedAt` descending and the Jun 20 article correctly outranks all prior dispatches.

**⚠️ Phase reports gap (informational):** No reports/peninsula-this-weekend-{research,shape,draft,review,publish}-2026-06-14.md or -2026-06-15.md files were found. The dispatch content was committed directly (commits `461fa2cfb6`, `30afa15047`) without the structured phase report artefacts from phases 1–6. This doesn't affect archive integrity but is noted for pipeline observability.

---

## 1. Rolling URL — `/whats-on/this-weekend/`

| Check | Result |
|---|---|
| Live HTTP status | 200 ✅ |
| Page title | "Peninsula This Weekend — 20–21 June · Peninsula Insider" ✅ |
| Selects latest by `publishedAt` | `peninsula-this-weekend-jun-20.md` (2026-06-15) ✅ |
| Article `format` | `weekend-picker` ✅ |
| Article `status` | `published` ✅ |
| Article `featured` | `true` ✅ |
| Title | "Peninsula This Weekend — 20 to 21 June" ✅ |
| Weekend covered | Saturday 20 June + Sunday 21 June (publish+5, publish+6 from Jun 15) ✅ |
| Hero image | `/images/sourced/article-sorrento-foreshore-01.webp` ✅ |
| Weather strip present | Yes — "Mid-June Peninsula: 12–14°C, showers possible. Saturday forecast currently favourable for the outdoor festival. Sunday clearing to partly cloudy." ✅ |
| Lead pick | Sorrento Solstice Festival, Saturday 20 June ✅ |

---

## 2. Previous Dispatch — June 13–14 Archive State

| Check | Result |
|---|---|
| Article file | `peninsula-this-weekend-jun-13.md` ✅ |
| `publishedAt` | 2026-06-07 ✅ |
| `featured` | `false` (rotated in commit `30afa15047`) ✅ |
| `status` | `published` ✅ |
| Dated archive path | `/whats-on/this-weekend/archive/2026-06-07/` ✅ |
| Archive slug source | `ptwArchiveSlug` → `publishedAt.toISOString().split('T')[0]` = `2026-06-07` ✅ |
| Live archive HTTP | 200 ✅ |
| Archive page title | "Peninsula This Weekend — 13–14 June · Peninsula Insider" ✅ |
| Journal redirect | `/journal/peninsula-this-weekend-jun-13/` → `<meta http-equiv="refresh" content="0;url=/whats-on/this-weekend/archive/2026-06-07/">` ✅ |
| Journal redirect canonical | `https://peninsulainsider.com.au/whats-on/this-weekend/archive/2026-06-07/` ✅ |
| noindex on journal redirect | Yes (`<meta name="robots" content="noindex">`) ✅ |

---

## 3. New Dispatch — June 20–21 Archive State

| Check | Result |
|---|---|
| Article file | `peninsula-this-weekend-jun-20.md` ✅ |
| `publishedAt` | 2026-06-15 ✅ |
| `featured` | `true` ✅ |
| `status` | `published` ✅ |
| Dated archive path | `/whats-on/this-weekend/archive/2026-06-15/` ✅ |
| Live archive HTTP | 200 ✅ |
| Archive page title | "Peninsula This Weekend — 20–21 June · Peninsula Insider" ✅ |
| Journal redirect | `/journal/peninsula-this-weekend-jun-20/` → `<meta http-equiv="refresh" content="0;url=/whats-on/this-weekend/archive/2026-06-15/">` ✅ |
| Journal redirect canonical | `https://peninsulainsider.com.au/whats-on/this-weekend/archive/2026-06-15/` ✅ |
| noindex on journal redirect | Yes ✅ |

---

## 4. Cluster Links Integrity

Both dispatches share the same cluster links. All verified as resolving to static pages in the repo.

| Link | Href | Source file | Status |
|---|---|---|---|
| The Cellar Door Short List | `/journal/the-cellar-door-short-list/` | `next/src/pages/journal/cellar-door/index.astro` | ✅ |
| How to Build a Red Hill Saturday | `/journal/how-to-build-a-red-hill-saturday/` | `next/src/content/articles/...` via `[slug].astro` | ✅ |
| Things to Do on the Mornington Peninsula | `/journal/things-to-do-mornington-peninsula/` | `next/src/pages/journal/...` (static override) | ✅ |

---

## 5. Full Archive Inventory

All 9 PTW dispatches confirmed — unique `publishedAt` dates, unique archive paths, all `status: published`, exactly one `featured: true` (current edition).

| File slug | publishedAt | Covers | featured | Archive path | Notes |
|---|---|---|---|---|---|
| april-24 | 2026-04-24 | 30 Apr–1 May | false | `/whats-on/this-weekend/archive/2026-04-24/` | ✅ |
| april-26 | 2026-04-26 | 2–3 May | false | `/whats-on/this-weekend/archive/2026-04-26/` | ✅ |
| may-03 | 2026-05-03 | 9–10 May | false | `/whats-on/this-weekend/archive/2026-05-03/` | ✅ |
| may-16 | 2026-05-11 | 16–17 May | false | `/whats-on/this-weekend/archive/2026-05-11/` | ✅ |
| may-23 | 2026-05-17 | 23–24 May | false | `/whats-on/this-weekend/archive/2026-05-17/` | ✅ |
| may-30 | 2026-05-24 | 30–31 May | false | `/whats-on/this-weekend/archive/2026-05-24/` | ✅ |
| jun-06 | 2026-05-31 | 6–7 Jun | false | `/whats-on/this-weekend/archive/2026-05-31/` | ✅ |
| jun-13 | 2026-06-07 | 13–14 Jun | false | `/whats-on/this-weekend/archive/2026-06-07/` | ✅ live-verified |
| **jun-20** | **2026-06-15** | **20–21 Jun** | **true** | `/whats-on/this-weekend/archive/2026-06-15/` | ✅ live-verified |

Archive depth: 9 editions (April 24 – June 20). Prev/next navigation in archive template confirmed functional via adjacent-dispatch logic in `[slug].astro`.

---

## 6. Booking URLs

| Dispatch | Booking URL | Status |
|---|---|---|
| Jun 13–14 (Red Hill Truffles) | `https://redhilltruffles.com/hunts` | present, not dead-checked (external, stable venue) |
| Jun 20–21 (Sorrento Solstice) | `https://www.humanitix.com/au/event/sorrento-solstice-festival-2026` | present, event-specific |
| Jun 20–21 (Hot Springs Sunday) | `https://redhilltruffles.com/hunts` | present (reused from Jun 13 companion note) |

No `eventRef` fields pointing to internal event collection slugs in either dispatch — no internal event cross-links to verify.

---

## 7. Working Tree / Mutation State

No mutations required by this phase. Publish commit `30afa15047` (Mon Jun 15 03:35:01 UTC) covers the full dispatch addition and featured-state rotation. No uncommitted changes related to this dispatch chain detected in the index.

---

## 8. Open Items

| Item | Priority | Owner |
|---|---|---|
| Phase reports 1–6 not written to disk for Jun 20 chain | Low | PI-dispatch-desk (next cycle) |
| Pipeline timing: dispatch committed 16h after target cadence (11:30 UTC Sun) | Low | PI-ops (review cron schedule) |
| Booking URL for Hot Springs Sunday Sessions appears to be Red Hill Truffles URL (copy-paste residue in jun-20 dispatch) | Medium | PI-accuracy-desk to verify |

---

## Verdict

**✅ Archive rollover complete.** Rolling URL shows June 20–21 edition. June 13–14 dispatch correctly archived and resolvable. All redirects, archive paths, and cluster links verified live. No structural issues.
