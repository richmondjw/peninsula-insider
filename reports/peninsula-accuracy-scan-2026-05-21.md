# Peninsula Insider — Daily Accuracy Scan
**Date:** Thursday, 21 May 2026 (08:20 AEST / 20:20 UTC)
**Operator:** Remy (automated daily scan)
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`
**Current weekend window:** Saturday 23 – Sunday 24 May 2026

---

## Summary

| Category | Count |
|---|---|
| Issues found | 4 |
| Safe auto-fix (Bucket 1) | 2 |
| Needs approval (Bucket 2) | 1 |
| Needs verification (Bucket 3) | 1 |
| Governance flags | 0 |
| Expired events still live | 0 |
| Dispatch alignment | ✓ Correct |

---

## Surfaces Checked

- [x] Homepage (`index.html`)
- [x] What's On hub (`whats-on/index.html`)
- [x] Current weekend dispatch (`peninsula-this-weekend-may-23.md`)
- [x] Previous dispatch (`peninsula-this-weekend-may-16.md`)
- [x] Weekly insider picks (`insider-picks-2026-05-20.md`, `insider-picks-2026-05-14.md`)
- [x] Event files in `next/src/content/events/` (91 files)
- [x] Quick-note source files (`next/src/content/quick-notes/`)
- [x] Governance gates (lastVerified, images, pricing, disclosure)

---

## Bucket 1 — Safe Auto-fix

### ISSUE 1-A: Homepage Notebook shows expired quick-note

**Surface:** Homepage — `hp-notebook` section
**Built output:** Still showing the `2026-05-18-hot-springs-monday` quick-note
**Source state:** `status: archived` / `expiresAt: 2026-05-19T06:00:00+10:00`
**Today:** May 21, 2026 — note expired 2 days ago
**Visible text on homepage:**
> "Peninsula Hot Springs — weekday programme runs today. Showcase with Chloe Gill on Friday 23 May."

**Problem:** The phrase "runs today" refers to Monday 18 May. "Friday 23 May" is also factually wrong (23 May is a Saturday). Both errors are visible on the live site because the homepage was not rebuilt since the quick-note expired on the 19th.

**Fix:** Rebuild homepage. The archived quick-note will not render once rebuilt from source. No content change needed — source already correct.

**Classification:** Bucket 1 — safe auto-fix (rebuild removes it automatically from source truth)

---

### ISSUE 1-B: Insider Picks 2026-05-20 still in draft status

**File:** `next/src/content/articles/insider-picks-2026-05-20.md`
**Published date:** 2026-05-20
**Title:** "Insider Picks — Week of 21 May: The Register Has Changed"
**Current status field:** `draft`

**Problem:** The article was published May 20 for the current week (May 21). It is not marked as `published`, meaning it would not surface on any published-status-gated editorial surface. The dispatch link in the article (`/journal/peninsula-this-weekend-may-23/`) correctly points to this weekend.

**Note:** Insider-picks articles may be intentionally held as `draft` while their companion dispatch is the primary live surface. Verify editorial policy. If this is a weekly Insider Picks article that should be live, the status change is low risk.

**Classification:** Bucket 1 — safe auto-fix (status: draft → published), contingent on editorial confirmation this is the intended workflow. Queued for autofix.

---

## Bucket 2 — Needs Approval

### ISSUE 2-A: Stray ✘ character in homepage Places mega-menu rail

**Surface:** Homepage — What's On mega-menu → Places rail eyebrow text
**Visible text:** `Editor's pick · Autumn ✘'26`
**Expected text:** `Editor's pick · Autumn '26`

**Problem:** A stray ✘ (U+2718, heavy ballot X) character appears before the closing apostrophe-year in the Places mega-menu rail eyebrow. Other mega-menu sections render correctly (`&#39;` → `'`). Only the Places rail has this corruption.

**Source:** This text likely originates from the Supabase CMS (`page/_global/mega-rail.places` field). The built HTML reflects what the CMS served at build time.

**Impact:** Visual/trust issue on a prominently visible navigation element. Visitors on desktop hover over Places and see a stray character in the editorial pick label.

**Fix required:** CMS field update (`mega-rail.places` eyebrow text → remove the ✘) and homepage rebuild. Editorial approval needed before modifying CMS content.

**Classification:** Bucket 2 — needs approval. Surfaced here for editorial sign-off.

---

## Bucket 3 — Needs Verification

### ISSUE 3-A: Soul Night Market Sorrento Beach (May 22) not surfaced in What's On nav

**Event:** `soul-night-market-sorrento-beach.json`
**Event date:** Friday 22 May 2026 (tomorrow from scan date)
**Event status:** `published`
**Appears in What's On nav "This weekend":** No

**Context:** The What's On mega-menu "This weekend" section links to:
- "All this weekend" → /whats-on/
- "Mt Eliza Farmers'" → /whats-on/mt-eliza-farmers-market/
- "Coastrek Fri 22 May" → /whats-on/coastrek-mornington-peninsula-2026/

The Soul Night Market at Sorrento Beach on Friday 22 May is a published, active event but is not surfaced in the nav.

**Question:** Is the "This weekend" nav window intended to cover Friday-through-Sunday (including Friday events)? Coastrek is listed for Friday 22 May, so Fridays appear to be in scope. If so, the Soul Night Market may be an omission.

**Counterpoint:** Nav links may be manually curated rather than auto-generated from events. The Coastrek link may have been added deliberately as a major event; the Soul Night Market may have been an editorial choice not to prioritise.

**Classification:** Bucket 3 — needs verification. Not an accuracy error per se, but a potential editorial gap on a live event. Flagged for editorial review.

---

## No Issues Found

The following surfaces and checks returned clean results:

- **Event freshness:** All 91 active events in `next/src/content/events/` have valid dates OR are correctly marked `status: archived`. Zero expired events remain in `published` state.
- **Homepage weekend dispatch:** Correctly shows "Peninsula This Weekend — 23 to 24 May" (current weekend).
- **What's On hub:** Correctly references 23–24 May as the weekend window.
- **Dispatch editorial alignment:** `peninsula-this-weekend-may-23.md` is `status: published`, correctly filed as the current dispatch, and all three anchor events reference valid, still-live occurrences (Wild Mushroom Forage ends May 30 ✓, MPRG closes May 31 ✓, Rocky Road tasting sessions close May 31 ✓).
- **Previous dispatches:** `peninsula-this-weekend-may-16.md` is not featured on homepage or What's On. Correctly retired from front-door surfaces.
- **Wild Mushroom Forage event ref:** Dispatch `eventRef: "wild-mushroom-forage-lunch-with-the-kitchen"` resolves to a valid, active event (start: 2026-05-09, end: 2026-05-30). The Saturday May 23 session is within the event window.
- **Coastrek (May 22):** Published event, correctly shown in What's On nav. Date and day name ("Fri 22 May") are accurate.

---

## Governance Gate Results

| Gate | Status | Count |
|---|---|---|
| Articles with stale/missing `lastVerified` | ✓ Clean | 0 |
| Articles with `tmp-placeholder` images | ✓ Clean | 0 |
| Published articles with pricing but no disclaimer | ✓ Clean | 0 |
| Known partner content without disclosure | Not checked (partner list not loaded) | — |

**Note:** The commercial disclosure gate (partner content without `partnerContent: true`) was not run in this scan due to the partner list not being available in the governance spec's referenced `docs/` location. This check should be included in a future scan pass.

---

## Recommended Actions for Autofix (Job 2)

The following items are queued for the `pi-daily-accuracy-autofix` job:

1. **Rebuild homepage** — clears stale Notebook quick-note (Issue 1-A)
2. **Publish `insider-picks-2026-05-20.md`** — set `status: published` (Issue 1-B, pending editorial policy confirmation)

The following items are **held from autofix**:

- Issue 2-A (Places mega-menu ✘ character): awaiting editorial approval
- Issue 3-A (Soul Night Market nav omission): awaiting editorial decision

---

## Autofix Register

No autofixes applied in this scan run (scan-only pass, per spec).
Autofix job (`pi-daily-accuracy-autofix`) will act on Bucket 1 items shortly.

---

_Scan completed: 2026-05-21 20:20 UTC. Next scan: 2026-05-22 20:20 UTC._
