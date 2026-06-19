# Peninsula This Weekend — Review Report
**Phase 4/7: Weekend Dispatch Review & Tighten**
**Dispatch:** Peninsula This Weekend — 20 to 21 June 2026
**Draft file:** `next/src/content/articles/peninsula-this-weekend-jun-20.md`
**Reviewed:** 2026-06-15 05:00 UTC
**Reviewer:** Remy (PI Editorial Desk, Phase 4)
**Weekend covered:** Saturday 20 June + Sunday 21 June 2026 ✓

---

## Working Tree Status

**⛔ BLOCKED — In-place copy edits DEFERRED**

`pi-autofix-safe-stash.sh check` returned EXIT_CODE=2. Foreign changes detected in working tree (2,533 files, primarily build artifacts: `_astro/`, `*.html`, `.gitattributes`). Per PI working tree safety contract, no repo files were modified.

All copy tightening recommendations are documented below for execution in Phase 5 (publish) or the next safe run.

---

## Date & Coverage Check

| Check | Result |
|---|---|
| Upcoming Saturday | 20 June 2026 ✓ |
| Upcoming Sunday | 21 June 2026 ✓ |
| Title format | "Peninsula This Weekend — 20 to 21 June" ✓ |
| Event dates in body | Saturday 20 June / Sunday 21 June ✓ |
| `publishedAt` field | **⚠️ 2026-06-15 (Monday) — should be 2026-06-14 (Sunday dispatch date)** |

---

## Fact Checks

### Sorrento Solstice Festival ✓ with flags

**Source verified:** sorrentosolstice.com.au + sorrento.org.au + events.humanitix.com

| Claim | Status |
|---|---|
| Saturday 20 June 2026 | ✓ Confirmed |
| 2:00pm to 9:00pm | ✓ Confirmed |
| Sorrento Foreshore | ✓ Confirmed |
| Free, ticketed | ✓ Confirmed |
| 6-metre effigy burn at 6:30pm | ✓ Confirmed |
| "Two music stages" | ⚠️ Official site lists "chill zone + main stage" — close but imprecise |
| "Fire performers" on promenade | ✓ Confirmed (roving performers + fire installations) |
| "Lantern path through the village" | ✓ Confirmed ("illuminated path of Australian animal lanterns") |
| "Food trucks line the eastern foreshore" | ✓ Confirmed |
| **'Bernie' effigy name** | **🔴 UNVERIFIED — official site gives no name. Remove.** |

> **Note:** The official site also mentions a companion **Dawn Swim on Sunday 21 June** (via sorrento.org.au). Draft does not mention this — not a problem (the hot springs is a better Sunday pick), but flagged as additional context.

### Peninsula Hot Springs Sunday Sessions ✓

**Source verified:** peninsulahotsprings.com

| Claim | Status |
|---|---|
| Sunday 21 June | ✓ |
| 2:00pm to 5:00pm | ✓ Confirmed |
| Included with bathing session (complimentary) | ✓ Confirmed — "complimentary with Bath House bathing" |
| Live music from amphitheatre pool stage | ✓ Confirmed |
| **"Runs through 28 June"** | ⚠️ Could not independently verify end date — flag for operator confirmation |
| Booking URL missing | ⚠️ No `bookingUrl` in `companion` frontmatter — add peninsulahotsprings.com booking link |

### Red Hill Truffles ✓

| Claim | Status |
|---|---|
| redhilltruffles.com/hunts | ✓ HTTP 200 |
| Périgord black season at peak in June | ✓ Seasonally correct |
| Pizza hunt from $189pp | Unverified exact price — draft adds "Prices may change. Confirm current rates" caveat ✓ |
| Lunch bundle from $195pp | Unverified exact price — same caveat applies ✓ |
| Private hunt from $120pp | Unverified exact price — same ✓ |

---

## Link Checks

| Link | Status |
|---|---|
| **Humanitix booking URL (draft):** `humanitix.com/au/event/sorrento-solstice-festival-2026` | **🔴 404 — BROKEN** |
| **Correct URL:** `https://events.humanitix.com/sorrento-solstice-festival/tickets` | ✓ Verified via search |
| `redhilltruffles.com/hunts` | ✓ HTTP 200 |
| Internal: `/journal/the-cellar-door-short-list/` | ✓ Source file exists |
| Internal: `/journal/how-to-build-a-red-hill-saturday/` | ✓ Source file exists |
| Internal: `/journal/things-to-do-mornington-peninsula/` | ✓ Source file exists |
| `companion.bookingUrl` (Hot Springs) | ⚠️ Missing — should link to peninsulahotsprings.com/book or bathing entry page |

---

## Tone & House Voice Check

**Overall: PASS** — the draft is on-voice. Body copy is calm, local, specific, and earns its PI badge.

| Check | Status |
|---|---|
| No exclamation marks (body) | ✓ |
| No em-dashes (body) | ✓ |
| No ellipses | ✓ |
| No scare quotes on normal nouns | ✓ |
| No AI tics ("in our humble opinion", "let's dive in", etc.) | ✓ |
| No "Editor's Verdict" / "PI call" structural devices | ✓ |
| No "best/worst/winner" ranking framing | ✓ |
| Specificity over adjectives | ✓ — "render, blister" energy present |
| Starts from the reader, not the publication | ✓ |
| **Em-dashes in frontmatter (FAQ + lead.summary)** | **⚠️ Two violations — see below** |
| **`status: "published"` in frontmatter** | **⚠️ Should be "draft" until Phase 5** |

---

## Flags Requiring Fix Before Publish

### 🔴 CRITICAL — Must fix before Phase 5

**1. "Bernie" effigy name — fabricated detail**

The draft's frontmatter `lead.summary` reads:
> `"…and the six-metre 'Bernie' effigy burn on the bay at 6:30pm."`

The official festival site (sorrentosolstice.com.au) names the effigy but does **not** call it "Bernie". This name does not appear on any verified source. It should be removed.

**Fix:** Replace `'Bernie' effigy` with `effigy` throughout.

**2. Humanitix booking URL — 404**

Draft `bookingUrl`: `https://www.humanitix.com/au/event/sorrento-solstice-festival-2026`
Correct URL: `https://events.humanitix.com/sorrento-solstice-festival/tickets`

**Fix:** Update `lead.bookingUrl` and any in-body references to the correct URL.

---

### ⚠️ MODERATE — Fix before publish

**3. Em-dashes in frontmatter (PI house rule)**

Two violations in frontmatter fields (not in body — body is clean):

- `lead.summary`: `"Free but ticketed — book now."` → `"Free but ticketed: book now."`
- `faq[1].answer`: `"Book in advance — the festival reaches capacity."` → `"Book in advance; the festival reaches capacity."`

**4. `publishedAt` date**

Current: `publishedAt: 2026-06-15`
This pipeline is running one day late (scheduled Sunday June 14, running Monday June 15). The dispatch covers the weekend of 20–21 June, which follows the Sunday June 14 publish date in the dispatch cadence convention. Recommend correcting to `publishedAt: 2026-06-14`.

**5. `status` field**

Current: `status: "published"` — set prematurely by Phase 3.
Should remain `status: "draft"` until Phase 5 publish executes successfully.

**6. Hot Springs booking URL missing**

`companion.bookingUrl` is absent. Add: `https://www.peninsulahotsprings.com/book` or the bathing session booking page.

---

### 🟡 MINOR — Editorial notes for tightening

These are copy improvements that can be made at Phase 5 if the working tree clears:

1. The "two music stages" claim in `lead.summary` could be softened: the official site describes "a chill zone + main stage" — not two formal stages. Consider "live music across two areas" or simply "live music throughout".

2. The closing "---" section repeats information already in the body (times, prices, booking label). Consider trimming the quick-reference block to booking-only (no need to re-state all times when the body already covers them). Or keep as is — the format has utility for scan readers.

3. "Runs through 28 June" for Hot Springs Sunday Sessions is unverified. Either verify with operator or soften to "running through late June" or remove the end date.

---

## Copy Tightening: Body Assessment

**Verdict: tight as written.** The body does not need structural changes. Three sections (anchor, companion, local edge) are well-paced. Practical closing bullets are earned. Voice is local, calm, specific.

Minor body observations (low priority):
- "Let Saturday happen around you" — borderline literary but acceptable within PI register
- "earns the drive home" — good PI idiom, keep
- "A good thing to build a Sunday around rather than a quick stop on the way through" — good
- Ten Minutes by Tractor reference is well-placed and specific

---

## Summary

| Category | Status |
|---|---|
| Date coverage | ✅ Pass |
| Festival fact-check | ✅ Pass (with flags) |
| Hot Springs fact-check | ✅ Pass |
| Red Hill Truffles fact-check | ✅ Pass |
| Booking URL — Humanitix | 🔴 Fix required |
| Booking URL — Hot Springs | ⚠️ Add |
| Fabricated detail ("Bernie") | 🔴 Remove |
| Em-dashes in frontmatter | ⚠️ Fix |
| `publishedAt` date | ⚠️ Fix |
| `status` field | ⚠️ Fix |
| Internal links | ✅ Pass |
| Tone / house voice (body) | ✅ Pass |
| Working tree | ⛔ Blocked — edits deferred |

**Phase 4 outcome:** Review complete. Two critical fixes required before Phase 5 publish. Working tree must clear before any edits land.

---

_Generated by Remy (Phase 4 — weekend-dispatch-review-and-tighten) · 2026-06-15 05:00 UTC_
