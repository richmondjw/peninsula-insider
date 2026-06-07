# Archive Rollover: Peninsula This Weekend — 13 to 14 June 2026
_Phase 7/7 | Job: pi-weekly-dispatch-archive-rollover_
_Generated: 2026-06-07 11:57 UTC_
_Dispatch cycle: publish-date 2026-06-07, covers Saturday 13 June + Sunday 14 June 2026_

---

## Summary

**✅ Archive integrity confirmed.** The June 13–14 dispatch is live at the rolling URL. The June 6–7 dispatch is correctly de-featured and resolvable at its dated archive path. All cross-links and event refs intact. Phase 5 publish report written to disk (improvement on prior cycle). One low-level note: the Jun 13 dispatch uses `companion` and `localEdge` keys rather than `saturday`/`sunday` — the structured dispatch card layer will only render the `lead` card, but the full editorial content is present in the markdown body. No archive routing impact.

---

## 1. Rolling URL — `/whats-on/this-weekend/`

| Check | Result |
|---|---|
| Selects latest by `publishedAt` | `peninsula-this-weekend-jun-13.md` (2026-06-07) ✅ |
| Article `format` | `weekend-picker` ✅ |
| Article `status` | `published` ✅ |
| Article `featured` | `true` ✅ |
| Title | "Peninsula This Weekend — 13 to 14 June" ✅ |
| Weekend covered | Saturday 13 June + Sunday 14 June (publish+6, publish+7) ✅ |
| `selectLatestPtw` will not pick previous dispatch | `featured: false` on jun-06; sort is by `publishedAt` desc regardless ✅ |

---

## 2. Previous Dispatch — June 6–7 Archive State

| Check | Result |
|---|---|
| Article file | `peninsula-this-weekend-jun-06.md` ✅ |
| `publishedAt` | 2026-05-31 ✅ |
| `featured` | `false` (rotated in commit `fbe3552878`) ✅ |
| `status` | `published` ✅ |
| Dated archive path | `/whats-on/this-weekend/archive/2026-05-31/` ✅ |
| Archive slug source | `ptwArchiveSlug` → `publishedAt.toISOString().split('T')[0]` = `2026-05-31` ✅ |

---

## 3. Full Archive Inventory

All eight dispatches have correct `featured` state and unique dated archive paths:

| File slug | publishedAt | Covers | featured | Archive path | Status |
|---|---|---|---|---|---|
| april-24 | 2026-04-24 | 30 Apr–1 May | false | `/whats-on/this-weekend/archive/2026-04-24/` | ✅ |
| april-26 | 2026-04-26 | 2–3 May | false | `/whats-on/this-weekend/archive/2026-04-26/` | ✅ |
| may-03 | 2026-05-03 | 9–10 May | false | `/whats-on/this-weekend/archive/2026-05-03/` | ✅ |
| may-16 | 2026-05-11 | 16–17 May | false | `/whats-on/this-weekend/archive/2026-05-11/` | ✅ |
| may-23 | 2026-05-17 | 23–24 May | false | `/whats-on/this-weekend/archive/2026-05-17/` | ✅ |
| may-30 | 2026-05-24 | 30–31 May | false | `/whats-on/this-weekend/archive/2026-05-24/` | ✅ |
| jun-06 | 2026-05-31 | 6–7 Jun | false | `/whats-on/this-weekend/archive/2026-05-31/` | ✅ |
| jun-13 | 2026-06-07 | 13–14 Jun | **true** | `/whats-on/this-weekend/archive/2026-06-07/` | ✅ **CURRENT** |

Exactly one dispatch has `featured: true`. No collisions. Eight dispatches total.

---

## 4. Legacy Journal Redirect Integrity

`/journal/[slug].astro` calls `isPeninsulaThisWeekend(article)` and emits a redirect to `ptwArchivePath(article)` for all PTW articles (Wave 2 Brief 2 migration, 2026-05-10).

| Legacy URL | Redirects to | Status |
|---|---|---|
| `/journal/peninsula-this-weekend-jun-06/` | `/whats-on/this-weekend/archive/2026-05-31/` | ✅ |
| `/journal/peninsula-this-weekend-jun-13/` | `/whats-on/this-weekend/archive/2026-06-07/` | ✅ |
| All older PTW slugs | Respective `/archive/YYYY-MM-DD/` paths | ✅ (confirmed in prior cycles) |

---

## 5. Cross-Link Integrity

### clusterLinks (both dispatches — identical set)

| Link | Target file | Resolves |
|---|---|---|
| `/journal/the-cellar-door-short-list/` | `the-cellar-door-short-list.md` | ✅ |
| `/journal/how-to-build-a-red-hill-saturday/` | `how-to-build-a-red-hill-saturday.md` | ✅ |
| `/journal/things-to-do-mornington-peninsula/` | `things-to-do-mornington-peninsula.mdx` + static `.astro` override | ✅ |

### eventRef links

| Dispatch | eventRef | Event file | Resolves |
|---|---|---|---|
| Jun 6–7 (lead) | `winter-wine-weekend-winter-wine-festival-red-hill-showgrounds` | `winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json` | ✅ |
| Jun 13–14 | (none — direct booking URLs used throughout) | n/a | ✅ |

### Jun 13–14 external booking links (dispatch frontmatter)

| Link | URL |
|---|---|
| Red Hill Truffles booking | `https://redhilltruffles.com/hunts` |

External URL — not an internal link check, but noted. No broken internal refs.

---

## 6. Adjacent Dispatch Navigation (Archive `[slug].astro`)

`sortPtwLatestFirst` produces this order; prev/next nav links accordingly:

```
2026-06-07 (jun-13) ← NEWEST / CURRENT
  older → 2026-05-31 (jun-06)
2026-05-31 (jun-06)
  newer → 2026-06-07 (jun-13)
  older → 2026-05-24 (may-30)
2026-05-24 (may-30)
  newer → 2026-05-31 (jun-06)
  older → 2026-05-17 (may-23)
...
```

All adjacency links resolve to existing archive pages. ✅

---

## 7. Commit Verification

| Item | Detail |
|---|---|
| Today's dispatch commit | `fbe3552878f23e4a303d408c74c7e396a4b45f10` |
| Commit timestamp | Sun 7 Jun 2026 11:34:53 UTC (4 min after scheduled 11:30) |
| Author | Remy (PI Architect) |
| Files changed | `jun-06.md` (featured: true→false), `jun-13.md` (created, 104 lines) |
| Ledger entry written | `pi-weekly-dispatch-publish-20260607T115424Z-411f0834` (2026-06-07T11:52:00Z) ✅ |
| Phase 5 publish report | `reports/peninsula-this-weekend-publish-2026-06-07.md` ✅ (improvement on May 24 cycle) |

---

## 8. Gaps / Flags

| Flag | Severity | Detail |
|---|---|---|
| Jun 13 dispatch uses `companion`/`localEdge` keys, not `saturday`/`sunday` | Low/cosmetic | The `DispatchPickCard` layer in `this-weekend/index.astro` only renders cards for `lead`, `saturday`, `sunday`, `rainyDay`. The `companion` and `localEdge` picks are editorial content present in the markdown body. No archive routing impact; card rendering partial but intentional for this format. |
| Apr 24 dispatch title uses hyphen not em-dash | Cosmetic | Pre-dates house style lock. No routing impact. Carried from prior cycles. |

No corrective action required.

---

## 9. Ledger Entry

A Phase 7 ledger entry has been appended to `ops/publication-ledger/entries/2026-06.jsonl`.

---

**Archive rollover: CLEAN. No corrective action required.**
