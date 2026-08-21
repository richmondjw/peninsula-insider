# Peninsula Insider — Daily Accuracy Scan
**Date:** 2026-06-18 (Thursday)  
**Run time:** 00:43 UTC (10:43 AEST Thursday)  
**Agent:** Remy  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`  
**Approval policy:** No content changes applied in this scan run.

---

## Summary

- Total issues found: **4**
- Safe auto-fix: **0**
- Needs approval: **3**
- Needs verification: **1**
- Governance gates: **All clean**

**Autofix pipeline status:** Deferred at 00:42 UTC today — foreign working-tree changes detected. Will retry at next scheduled run.

---

## Surfaces Checked

| Surface | Status |
|---|---|
| Homepage (index.html) | ✅ Checked |
| What's On hub (whats-on/index.html) | ✅ Checked |
| Current weekend dispatch (`peninsula-this-weekend-jun-20.md`) | ✅ Checked |
| Weekend picks JSON (`2026-06-20.json`) | ✅ Checked |
| This-weekend built page (`whats-on/by-mood/this-weekend/`) | ✅ Checked |
| Dispatch hub (`dispatch/index.html`) | ✅ Checked |
| All published event files (40 total) | ✅ Checked |
| All article files (77 published, 85 draft) | ✅ Checked |
| Navigation source (`next/src/lib/v4-nav.ts`) | ✅ Checked |
| Homepage hero data (`next/src/data/home-hero-slides.json`) | ✅ Checked |
| Quick notes (`next/src/content/quick-notes/`) | ✅ Checked |
| Weekend picks (`next/src/content/weekend-picks/`) | ✅ Checked |

---

## Issue Register

---

### ISSUE 001 — Nav editorial picks: stale "Autumn '26" eyebrows across all six pillars
**Bucket:** 2 — Needs approval  
**Severity:** Medium  
**Status:** CARRIED — first flagged 2026-06-15, **unresolved for 3 days**  
**File:** `next/src/lib/v4-nav.ts`  
**Lines:** 89, 139, 185, 241, 295, 339

**Description:**  
All six navigation pillar mega-menus carry the eyebrow label `"Editor's pick · Autumn '26"`. The site is now in winter (solstice is Saturday 20 June). The masthead correctly shows "Winter Insider · June 2026" via the dynamic `getPublicationEdition()` function, but the nav picks are static strings that have not been refreshed.

| Pillar | Current pick | Issue |
|---|---|---|
| Eat & Drink | Laura at Pt Leo Estate | Label: "Autumn '26" |
| Stay | Jackalope | Label: "Autumn '26" |
| Wine | Ten Minutes by Tractor | Label: "Autumn '26" |
| Explore | Bushrangers Bay walk | Label: "Autumn '26" + verdict references wildflowers in late April |
| What's On | Mt Eliza Farmers' Market | Label: "Autumn '26" |
| Journal | "On the quiet authority of a good autumn" | Label: "Autumn '26" + title and content are explicitly autumn-coded |

**Worst offender:** Journal pick. Title and editorial verdict describe autumn; the site is actively promoting the Sorrento Solstice Festival for this Saturday.

**Recommended fix:** Update all six eyebrows to `"Editor's pick · Winter '26"`. Replace Journal pick with winter-appropriate article (e.g. `a-winter-peninsula-weekend.md`). Update Explore verdict to remove April wildflower reference.

---

### ISSUE 002 — "By the mood" nav links to "Autumn weekend edit" during winter
**Bucket:** 2 — Needs approval  
**Severity:** Low-Medium  
**Status:** CARRIED — first flagged 2026-06-15, **unresolved for 3 days**  
**File:** `next/src/lib/v4-nav.ts`  
**Line:** 321

**Description:**  
The What's On mega-menu "By the mood" section lists `Autumn weekend edit` linking to `/journal/autumn-weekend-edit/`. It is mid-June (winter). The winter equivalent (`a-winter-peninsula-weekend.md`) exists at `/journal/a-winter-peninsula-weekend/`.

This is bundled with Issue 001 (same file, same PR) but called out separately — it actively routes visitors to an out-of-season content entry point.

**Recommended fix:**
```
{ key: 'weekend-edit', label: 'Winter weekend guide', href: '/journal/a-winter-peninsula-weekend/' }
```

---

### ISSUE 003 — Sorrento Solstice Festival booking URL mismatch (URGENT — festival is Saturday)
**Bucket:** 3 — Needs verification  
**Severity:** HIGH — live booking link on a time-sensitive event 2 days out  
**File:** `next/src/content/articles/peninsula-this-weekend-jun-20.md` vs `next/src/content/events/sorrento-solstice-festival-2026.json`

**Description:**  
Two different Humanitix URLs are in use for the same festival:

| Source | URL |
|---|---|
| Dispatch article (`peninsula-this-weekend-jun-20.md`) | `https://www.humanitix.com/au/event/sorrento-solstice-festival-2026` |
| Event structured data (both JSON files) | `https://events.humanitix.com/sorrento-solstice-festival` |

These are different URL formats. One may 404 or redirect in a way that hurts the booking flow. Given the festival is in **2 days**, a broken or wrong booking link is high risk.

**Action required:** Verify which Humanitix URL is canonical for the 2026 festival. Update the dispatch article and/or event JSON files to use a single consistent URL. Cannot auto-fix — source confidence is insufficient.

---

### ISSUE 004 — Hatted restaurants homepage feature: URL slug contains "2025" but article is 2026
**Bucket:** 2 — Needs approval  
**Severity:** Low-Medium  
**File:** `next/src/content/articles/hatted-restaurants-mornington-peninsula-2025.mdx`  
**Status:** Published, `featured: true`, featured as cover story on homepage

**Description:**  
The article at `/journal/hatted-restaurants-mornington-peninsula-2025/` is a current (April 2026) guide to the Good Food Guide hat list. The content is accurate and `lastVerified: 2026-04-22`. However, the URL slug contains "2025" — implying to readers (and search engines) that this is last year's guide. This is an SEO trust issue when used as a homepage featured story.

**Classification rationale:** Bucket 2 — a URL rename requires a 301 redirect decision; it changes the published permalink and affects indexed search results.

**Recommended action:** Rename file to `hatted-restaurants-mornington-peninsula-2026.mdx`, deploy redirect from old to new URL, update all internal links.

---

## What Is Fine

**Event freshness:** Clean sweep. All 40 published events have valid future or current end dates. Zero published events with `endDate` before 2026-06-18. ✅

**Current weekend dispatch:**  
`peninsula-this-weekend-jun-20.md` — published 2026-06-15, `lastVerified: 2026-06-15`. All three anchor picks confirmed valid:
- Sorrento Solstice Festival (endDate: 2026-06-21) ✅
- Peninsula Hot Springs Sunday Sessions (endDate: 2026-06-28) ✅
- Red Hill Truffles Winter Hunt (endDate: 2026-09-30) ✅

Pricing disclaimer present. Dispatch copy aligned with structured event records. ✅

**Homepage hero carousel:** Locked to winter/solstice content per `home-hero-slides.json`. Slide 1: Sorrento Solstice Festival guide. Slide 2: Flinders weekend. Slide 3: Winter Peninsula weekend. Appropriate for this week. ✅

**This-weekend module:** Correctly resolves to `peninsula-this-weekend-jun-20` dispatch. ✅

**Previous dispatches:** `peninsula-this-weekend-jun-13` and all prior dispatches not surfaced as current on any hub page. ✅

**Weekend picks JSON:** `2026-06-20.json` correctly configured. All four event slugs reference currently published events. ✅

**Edition stamp:** Dynamically shows "Winter Insider · June 2026". ✅

**Quick notes:** Most recent notes (`2026-06-15-editor-note-monday`, `2026-06-15-weather-monday`) have `expiresAt` dates in the past. Not surfacing on homepage. ✅

**MPRG Autumn Exhibition:** Still running (endDate: 2026-06-30, status: published). Title says "Autumn" but event is still live. Valid. ✅

---

## Governance Gates (per spec §13)

| Gate | Result | Detail |
|---|---|---|
| `tmp-placeholder` image licence | ✅ Clean | 0 published articles flagged |
| `lastVerified` missing | ✅ Clean | 0 published articles without it |
| `lastVerified` stale (>90 days) | ✅ Clean | All published articles verified after 2026-03-19 |
| Disclosure gate (known partners) | ✅ Clean | 0 flagged |
| Pricing disclaimer gate | ✅ Clean | 0 articles with pricing but missing disclaimer |

---

## Autofix Pipeline Status

Autofix run (scheduled 20:35 UTC daily) was **deferred** at 00:42 UTC 2026-06-18 due to foreign working-tree changes detected by `pi-autofix-safe-stash.sh check`. Foreign files include newsroom slates, GitHub workflow files, and built HTML. The autofix will retry at the next scheduled run.

There are no Bucket 1 (safe auto-fix) items to apply in this scan. All issues are Bucket 2 or Bucket 3.

---

## Approval Required

Three items require editorial decision before any fix can ship:

1. **Issue 001 / 002 (bundled):** Update `v4-nav.ts` to replace "Autumn '26" eyebrows with "Winter '26" and swap out-of-season picks. Same PR/commit scope. **3 days outstanding.**

2. **Issue 004:** Rename `hatted-restaurants-mornington-peninsula-2025.mdx` to a 2026 slug and deploy 301 redirect. Decision: is the rename worth the redirect complexity, or is it acceptable to leave the 2025 slug for now?

One item requires verification before any fix:

3. **Issue 003 (urgent):** Verify which Humanitix URL is canonical for the Sorrento Solstice Festival 2026. Festival is Saturday 20 June — verify today.

---

*Report generated by: Remy (accuracy scan agent)*  
*Date: 2026-06-18 00:43 UTC*  
*Repo path: `reports/peninsula-accuracy-scan-2026-06-18.md`*  
*Filed to: Mission Control Docs*
