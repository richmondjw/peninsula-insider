# Archive Rollover: Peninsula This Weekend — 30 to 31 May 2026
_Phase 7/7 | Job: pi-weekly-dispatch-archive-rollover_
_Generated: 2026-05-24 12:15 UTC_
_Dispatch cycle: publish-date 2026-05-24, covers Saturday 30 May + Sunday 31 May 2026_

---

## Summary

**✅ Archive integrity confirmed.** The May 30–31 dispatch is live at the rolling URL. The May 23–24 dispatch is correctly archived and accessible. All cross-links, event refs, and adjacent-dispatch nav are intact. One gap noted: no Phase 5 publish report file on disk (commit and live state confirm publish succeeded).

---

## 1. Rolling URL — `/whats-on/this-weekend/`

| Check | Result |
|---|---|
| Selects latest by `publishedAt` | `peninsula-this-weekend-may-30.md` (2026-05-24) ✅ |
| Article `format` | `weekend-picker` ✅ |
| Article `status` | `published` ✅ |
| Article `featured` | `true` ✅ |
| Title | "Peninsula This Weekend — 30 to 31 May" ✅ |
| Weekend covered | Saturday 30 May + Sunday 31 May (publish+6, publish+7) ✅ |
| `selectLatestPtw` will not pick previous dispatch | `featured: false` on may-23; sort is by `publishedAt` desc regardless ✅ |

---

## 2. Previous Dispatch — May 23–24 Archive State

| Check | Result |
|---|---|
| Article file | `peninsula-this-weekend-may-23.md` ✅ |
| `publishedAt` | 2026-05-17 ✅ |
| `featured` | `false` (rotated in today's commit `fde04a10`) ✅ |
| `status` | `published` ✅ |
| Dated archive path | `/whats-on/this-weekend/archive/2026-05-17/` ✅ |
| Archive slug source | `ptwArchiveSlug` → `publishedAt.toISOString().split('T')[0]` = `2026-05-17` ✅ |

---

## 3. Full Archive Inventory

All six dispatches have correct `featured` state and unique dated archive paths:

| publishedAt | Covers | featured | Archive path | Status |
|---|---|---|---|---|
| 2026-04-24 | 24–26 Apr | false | `/whats-on/this-weekend/archive/2026-04-24/` | ✅ |
| 2026-04-26 | 2–3 May | false | `/whats-on/this-weekend/archive/2026-04-26/` | ✅ |
| 2026-05-03 | 9–10 May | false | `/whats-on/this-weekend/archive/2026-05-03/` | ✅ |
| 2026-05-11 | 16–17 May | false | `/whats-on/this-weekend/archive/2026-05-11/` | ✅ |
| 2026-05-17 | 23–24 May | false | `/whats-on/this-weekend/archive/2026-05-17/` | ✅ |
| 2026-05-24 | 30–31 May | **true** | `/whats-on/this-weekend/archive/2026-05-24/` | ✅ **CURRENT** |

Exactly one dispatch has `featured: true`. No collisions.

---

## 4. Legacy Journal Redirect Integrity

The `/journal/[slug].astro` page calls `isPeninsulaThisWeekend(article)` and redirects matching articles to `ptwArchivePath(article)` (Wave 2 Brief 2 migration).

| Legacy URL | Redirects to | Status |
|---|---|---|
| `/journal/peninsula-this-weekend-may-23/` | `/whats-on/this-weekend/archive/2026-05-17/` | ✅ |
| `/journal/peninsula-this-weekend-may-30/` | `/whats-on/this-weekend/archive/2026-05-24/` | ✅ |
| All older PTW slugs | Respective `/archive/YYYY-MM-DD/` paths | ✅ |

Note: The "journal archive" framing in earlier job definitions refers to this redirect layer. Actual archival lives at `/whats-on/this-weekend/archive/` per Wave 2 Brief 2 (2026-05-10).

---

## 5. Cross-Link Integrity

### clusterLinks (both dispatches)

| Link | Target file | Resolves |
|---|---|---|
| `/journal/how-to-build-a-red-hill-saturday/` | `how-to-build-a-red-hill-saturday.md` | ✅ |
| `/journal/the-cellar-door-short-list/` | `the-cellar-door-short-list.md` | ✅ |
| `/journal/things-to-do-mornington-peninsula/` | `things-to-do-mornington-peninsula.mdx` + static `.astro` | ✅ |

### eventRef links

| Dispatch | eventRef | Event file | Resolves |
|---|---|---|---|
| May 30–31 | `red-hill-truffles-winter-truffle-hunt-season` | `red-hill-truffles-winter-truffle-hunt-season.json` | ✅ |
| May 23–24 | `wild-mushroom-forage-lunch-with-the-kitchen` | `wild-mushroom-forage-lunch-with-the-kitchen.json` | ✅ |

---

## 6. Adjacent Dispatch Navigation (Archive `[slug].astro`)

`sortPtwLatestFirst` produces this order, and prev/next nav links accordingly:

```
2026-05-24 (may-30) ← NEWEST
  older → 2026-05-17 (may-23)
2026-05-17 (may-23)
  newer → 2026-05-24 (may-30)
  older → 2026-05-11 (may-16)
2026-05-11 (may-16)
  newer → 2026-05-17 (may-23)
  older → 2026-05-03 (may-09)
...
```

All adjacency links resolve to existing archive pages. ✅

---

## 7. Commit Verification

| Item | Detail |
|---|---|
| Today's dispatch commit | `fde04a10979c2d2ba2a244970c11c0bc24f965eb` |
| Commit timestamp | Sun 24 May 2026 11:32:09 UTC (2 min after scheduled 11:30) |
| Author | Remy (PI Architect) |
| Files changed | `may-23.md` (featured: true→false), `may-30.md` (created, 106 lines), 3 report files |
| Previous dispatch commit | `08f5a5649b` (2026-05-17 11:37 UTC) — may-16 de-featured, may-23 created |

---

## 8. Gaps / Flags

| Flag | Severity | Detail |
|---|---|---|
| No `peninsula-this-weekend-publish-2026-05-24.md` report | Low | Phase 5 publish report not written to `reports/`. Commit and live dispatch confirm publish succeeded. No action required on content; recommend Phase 5 write report to disk in future runs. |
| No ledger entry for today's dispatch publish | Low | The most recent `pi-weekly-dispatch-publish` ledger entry is 2026-05-17. A ledger entry for today's publish is being appended as part of this Phase 7 run. |
| Apr-24 dispatch title uses ` - ` (hyphen) not ` — ` (em-dash) | Cosmetic | Pre-dates house style lock. Does not affect archive routing or `isPeninsulaThisWeekend` detection. |

---

## 9. Ledger Entry

A Phase 7 ledger entry has been appended to `ops/publication-ledger/entries/2026-05.jsonl`.

---

**Archive rollover: CLEAN. No corrective action required.**
