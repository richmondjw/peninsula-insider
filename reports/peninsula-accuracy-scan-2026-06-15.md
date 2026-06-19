# Peninsula Insider — Daily Accuracy Scan
**Date:** 2026-06-15 (Monday)  
**Run time:** 20:20 UTC (06:20 AEST Tuesday)  
**Agent:** Remy  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`  
**Approval policy:** No content changes applied in this scan run.

---

## Summary

- Total issues found: **2**
- Safe auto-fix: **0**
- Needs approval: **2**
- Needs verification: **0**
- Governance gates: **Clean** (all pass)

---

## Surfaces Checked

| Surface | Status |
|---|---|
| Homepage (index.html) | ✅ Checked |
| What's On hub (whats-on/index.html) | ✅ Checked |
| Current weekend dispatch (`peninsula-this-weekend-jun-20.md`) | ✅ Checked |
| Weekend picks JSON (`2026-06-20.json`) | ✅ Checked |
| All published event files (40 total) | ✅ Checked |
| Navigation source (`next/src/lib/v4-nav.ts`) | ✅ Checked |
| Homepage hero data (`next/src/data/home-hero-slides.json`) | ✅ Checked |
| Article governance scan (98 articles) | ✅ Checked |

---

## Issue Register

### ISSUE 001 — Nav editorial picks: stale "Autumn '26" season labels across all six pillars
**Bucket:** 2 — Needs approval  
**Severity:** Medium  
**File:** `next/src/lib/v4-nav.ts`  
**Lines affected:** 89, 139, 185, 241, 295, 339

**Description:**  
All six navigation pillar mega-menus carry hardcoded eyebrow labels reading `"Editor's pick · Autumn '26"`. The site edition stamp and masthead correctly display "Winter Insider · June 2026" (via `getPublicationEdition()` which is dynamic and working). However, the nav editorial picks are static strings in `v4-nav.ts` and have not been updated since the autumn edition.

Specific stale content:

| Pillar | Current pick title | Seasonal issue |
|---|---|---|
| Eat & Drink | Laura at Pt Leo Estate | Label: "Autumn '26" |
| Stay | Jackalope | Label: "Autumn '26" |
| Wine | Ten Minutes by Tractor | Label: "Autumn '26" |
| Explore | Bushrangers Bay walk | Label: "Autumn '26" + verdict mentions "wildflowers come out late April" |
| What's On | Mt Eliza Farmers' Market | Label: "Autumn '26" |
| Journal | "On the quiet authority of a good autumn" | Label: "Autumn '26" + title and verdict are autumn-specific |

**Worst offender:** The Journal pick is the most visible drift. The title ("On the quiet authority of a good autumn") and verdict ("The season the Peninsula stops performing. Vintage trucks finished, weekend crowds thinning...") describe autumn. During winter, this reads as stale editorial positioning — particularly since the site is actively promoting the Sorrento Solstice Festival and winter content.

**Explore pick verdict drift:** The Bushrangers Bay walk verdict reads: *"Two hours, almost nobody on it after lunch, and the wildflowers come out late April. Park at Cape Schanck, not Boneo."* The wildflower timing reference is seasonally misaligned for mid-June (winter).

**Classification rationale:** Bucket 2 (not Bucket 1) because updating these picks requires editorial judgement — choosing which venue/article to feature as the winter pick for each pillar, not just a label swap.

**Recommended action:** Update `v4-nav.ts` to:
- Change all six eyebrows from `"Editor's pick · Autumn '26"` to `"Editor's pick · Winter '26"`
- Replace Journal pick with a winter-appropriate article (e.g. `a-winter-peninsula-weekend.md` or the new solstice guide)
- Update Explore verdict to remove "wildflowers come out late April"
- Optionally refresh the Eat & Stay picks if editorially better winter options exist

---

### ISSUE 002 — What's On nav "By the mood": links to "Autumn weekend edit" during winter
**Bucket:** 2 — Needs approval  
**Severity:** Low-Medium  
**File:** `next/src/lib/v4-nav.ts`  
**Line:** 321

**Description:**  
The What's On mega-menu "By the mood" section lists "Autumn weekend edit" linking to `/journal/autumn-weekend-edit/`. It is mid-June (winter). The winter equivalent article exists: `a-winter-peninsula-weekend.md` at `/journal/a-winter-peninsula-weekend/`.

This is bundled with Issue 001 (same file, same PR scope) but called out separately as it involves a live nav link routing readers to an out-of-season content entry point.

**Recommended action:** Update the mood link to:
```
{ key: 'weekend-edit', label: 'Winter weekend guide', href: '/journal/a-winter-peninsula-weekend/' }
```

---

## What Is Fine

The following surfaces were checked and are **accurate and clean**:

**Event freshness:** No expired events in the published set. All 40 published events have end dates from 2026-06-20 onwards. Zero events with `status: published` and `endDate` before today.

**Current weekend dispatch (Jun 20–21):**  
Published 2026-06-15, lastVerified 2026-06-15. All three anchor picks are valid:
- Sorrento Solstice Festival (endDate: 2026-06-21) ✅
- Peninsula Hot Springs Sunday Sessions (endDate: 2026-06-28) ✅  
- Red Hill Truffles Winter Hunt (endDate: 2026-09-30) ✅  

Dispatch copy is aligned with structured event records. Booking URLs verified as present. Pricing disclaimer present in article footer.

**Homepage hero carousel:** Correctly pinned to winter content (LOCKED per `home-hero-slides.json` — autofix may not touch this file). Slide 1: Sorrento Solstice Festival. Slides 2–3: winter Peninsula weekend content. Appropriate for June.

**Homepage weekend picker module:** Correctly showing "This weekend · 20–21 June" with accurate dispatch content. ✅

**Edition stamp:** V4Masthead dynamically reads from `getPublicationEdition()`. Built output correctly shows "Winter Insider · June 2026". ✅

**The Notebook (quick-note):** `2026-06-15-editor-note-monday.md` — solstice is correctly described as "five days out" from June 15. Expires 2026-06-17. Accurate. ✅

**Previous dispatches:** All marked `featured: false` (Apr 24, May 3, May 9, May 16, May 23, May 30, Jun 6, Jun 13). Only the upcoming-weekend dispatch (Jun 20) carries `featured: true`. Correct. ✅

---

## Governance Gates (per spec §13)

| Gate | Result | Detail |
|---|---|---|
| `tmp-placeholder` image licence | ✅ Clean | 0 published articles flagged |
| `lastVerified` missing | ✅ Clean | 0 published articles without it |
| `lastVerified` stale (>90 days) | ✅ Clean | 0 articles older than 2026-03-17 |
| Disclosure gate (known partners) | ✅ Clean | 0 flagged |
| Pricing disclaimer gate | ✅ Clean | All articles with `$` pricing carry the standard disclaimer |

---

## Approval Required

**Two Bucket 2 items need editorial decision before any fix can ship:**

1. **Which winter picks to feature** in the six nav pillar slots (Eat/Stay/Wine/Explore/What's On/Journal)
2. **Journal nav pick replacement** — confirm `a-winter-peninsula-weekend.md` or the new solstice guide as the winter Journal pin

No auto-fix scheduled. These will surface in the next `pi-daily-accuracy-autofix` run with status `held-for-approval`.

---

## Autofix Pipeline Status

No items in the safe auto-fix queue today. Autofix job will run at 20:35 UTC and will report: nothing to fix, two approval items held.

---

*Report generated by: Remy (accuracy scan agent)*  
*Repo path: `reports/peninsula-accuracy-scan-2026-06-15.md`*  
*Filed to: Mission Control Docs*
