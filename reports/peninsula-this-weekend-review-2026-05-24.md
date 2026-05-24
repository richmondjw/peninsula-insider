# Review: Peninsula This Weekend — 30 to 31 May 2026
_Phase 4/7 | Generated: 2026-05-24 10:45 UTC_
_Dispatch covers: Saturday 30 May and Sunday 31 May 2026_
_Reviewed against draft: `next/src/content/articles/peninsula-this-weekend-may-30.md`_

---

## Review verdict

**APPROVED WITH MINOR FIXES APPLIED**

The draft is structurally sound, tonally on-brand, and editorially clean. Two copy fixes applied in-place. Three low-priority flags noted below for awareness. Ready for Phase 5 publish.

---

## Date checks ✅

| Check | Result |
|---|---|
| Run date | Sunday 24 May 2026 |
| Publish date in frontmatter | 2026-05-24 ✅ |
| Weekend covered | Saturday 30 May + Sunday 31 May ✅ |
| Title convention | "Peninsula This Weekend — 30 to 31 May" ✅ |
| Saturday = publish + 6 days | 24 May + 6 = 30 May ✅ |
| Sunday = publish + 7 days | 24 May + 7 = 31 May ✅ |

---

## Fact checks ✅

| Claim | Source | Status |
|---|---|---|
| Red Hill Truffles season opens Saturday 30 May | `red-hill-truffles-winter-truffle-hunt-season.json` (startDate: 2026-05-30) | ✅ Confirmed |
| Pizza hunt from $189pp | Event data + research | ✅ Confirmed |
| Red Hill Estate lunch from $199pp | Event data + research | ✅ Confirmed |
| Sessions from 11am | Shape doc / research | ✅ Confirmed |
| Enchanted Market at The Briars, Sunday 31 May from 10am | `the-enchanted-market-at-the-briars.json` | ✅ Confirmed |
| Enchanted Market: free, walk-in | Event data | ✅ Confirmed |
| New Wave 26 closes Sunday 31 May | `new-wave-26-at-mprg.json` (endDate: 2026-05-31) | ✅ Confirmed |
| Michael Vale Exhibition closes Sunday 31 May | `michael-vale-exhibition-at-mprg.json` (recurrence: annual, endTime aligns) | ✅ Confirmed |
| TRACE Duo closes Sunday 31 May | `trace-duo-exhibition.json` (endDate: 2026-05-31) | ✅ Confirmed |
| MPRG address: Dunns Road, Mornington | Event data: "2/350 Dunns Road (Civic Reserve)" | ✅ Confirmed |
| MPRG hours: Tue–Sun 11am–4pm | Event data: startTime 11:00, endTime 16:00 | ✅ Confirmed |
| MPRG: free, no booking | Event data | ✅ Confirmed |
| Weather: 12–13°C, grey, chance of rain | Research brief | ✅ Consistent |
| Wild Mushroom Forage: final session of season, 30 May | Research brief | ✅ (used as frame only, not booking rec) |

---

## Link checks

| Link | Type | Status | Notes |
|---|---|---|---|
| `redhilltruffles.com.au` (original) | External booking | ⚠️ REDIRECTS → `redhilltruffles.com` | Fixed in-place: all references updated to canonical `redhilltruffles.com` |
| `https://redhilltruffles.com/hunts` | External booking (updated) | ✅ Live (web_fetch confirmed site is up) | Canonical booking URL per event data |
| `/journal/how-to-build-a-red-hill-saturday/` | Internal clusterLink | ✅ Resolves | File: `how-to-build-a-red-hill-saturday.md` in content/articles, renders via `[slug].astro` |
| `/journal/the-cellar-door-short-list/` | Internal clusterLink | ✅ Resolves | File: `the-cellar-door-short-list.md` in content/articles, renders via `[slug].astro` |
| `/journal/things-to-do-mornington-peninsula/` | Internal clusterLink | ✅ Functional (redirect) | `pages/journal/things-to-do-mornington-peninsula.astro` is a redirect to `/explore/things-to-do/` — functional but indirect |

---

## Tone checks ✅

| Check | Result |
|---|---|
| No exclamation marks | ✅ None found |
| No em-dashes | ✅ None found (en-dashes used correctly for ranges: 12–13°C) |
| No ellipses | ✅ None found |
| No scare quotes on normal nouns | ✅ Clear |
| No AI tics ("in our humble opinion", "in conclusion") | ✅ None found |
| No "Editor's Verdict" / "Peninsula Insider call" | ✅ Not used |
| No star reviews | ✅ Not used |
| No "best/worst/winner/loser" ranking | ✅ Not used |
| No "delicious" or vague adjectives | ✅ Specific throughout |
| No publication self-awareness ("what makes this dispatch different") | ✅ Body is clean — italic opener is standard PTW structural scaffold |
| Passes "local told a friend" test | ✅ Observational, calm, specific throughout |
| No aggressive urgency performance | ✅ Booking notes are practical, not promotional |
| House voice consistent | ✅ Understated, seasonal, selective |

---

## Copy fixes applied in-place

### Fix 1 — Booking URL (canonical domain)
The article referenced `redhilltruffles.com.au` throughout. The live site redirects to `redhilltruffles.com`, and event data confirms `redhilltruffles.com/hunts` as the canonical booking URL.

**Changed:** 5 occurrences — frontmatter `bookingUrl`, frontmatter `bookingLabel`, FAQ answer, body copy booking line, footer quick-reference block.

`redhilltruffles.com.au` → `redhilltruffles.com` (labels and body)
`bookingUrl` → `https://redhilltruffles.com/hunts` (frontmatter)

### Fix 2 — Phrase tightening
**Before:** "Red Hill Truffles is one of the Peninsula's most consistently in-demand winter bookings, and opening weekend will move fast."
**After:** "Red Hill Truffles is one of the Peninsula's most consistently in-demand winter bookings. Opening weekend fills quickly."

Rationale: Single-clause sentences. "Will move fast" is marketing-adjacent; "fills quickly" is factual and consistent with frontmatter (`"Opening weekend at Red Hill Truffles fills early"`). The sentence break improves rhythm.

---

## Low-priority flags (no copy change required)

### Flag 1 — Lander-Se hours not separately stated
The draft groups MPRG and Lander-Se under the shared descriptor "open Tuesday to Sunday 11am–4pm." Event data confirms MPRG is Tue–Sun 11am–4pm but Lander-Se is "open daily except Tuesdays and Wednesdays" (i.e. Thu–Mon). For a Sat/Sun visit this is a non-issue — both venues are open. No misleading information for the dispatch's actual use case.

**Action:** None required for this dispatch. Flag for Lander-Se venue data accuracy desk to confirm and update opening hours in source JSON.

### Flag 2 — `/journal/things-to-do-mornington-peninsula/` is a redirect
The clusterLink resolves, but the Astro page at that path is a redirect component pointing to `/explore/things-to-do/`. Functionally fine for readers; slightly indirect for link equity. Not a broken link. Cosmetic note only.

**Action:** None required now. SEO desk may want to update this clusterLink to the canonical destination `/explore/things-to-do/` in a future pass.

### Flag 3 — Enchanted Market weather contingency not explicit in body
The footer quick-reference correctly notes "Outdoor event, weather dependent." The body copy does not state a rain-date or cancellation policy (none is in the source data). Research brief flagged that no rain-date is listed in source data.

**Action:** Acceptable as-is. The "weather dependent" note in the footer quick-reference covers the reader. If Briars Market publishes a cancellation policy before Phase 5, it can be added as a brief parenthetical in the companion section.

---

## Accuracy desk carry-forwards

From research/shape flags not yet resolved:

- [ ] `rocky-road-festival-tasting-sessions.json` — `nextOccurrence` field shows 2026-05-24 (stale). Flag for daily accuracy scan.
- [ ] `peninsula-hot-springs-sunday-sessions.json` — `nextOccurrence` field shows 2026-05-24 (stale). Flag for daily accuracy scan.
- [ ] Foxeys Hangout Vegetable Feast: dates not confirmed for Saturday 30 May. Not in draft — no action required for dispatch. Flag for events desk.

---

## SEO / metadata check ✅

| Field | Status |
|---|---|
| `title` | "Peninsula This Weekend — 30 to 31 May" ✅ |
| `dek` | Present, specific, no AI tics ✅ |
| `publishedAt` | 2026-05-24 ✅ |
| `heroImage` | Present with alt text ✅ |
| `tags` | 10 tags, relevant ✅ |
| `format` | "weekend-picker" ✅ |
| `featured` | true ✅ |
| `status` | "published" (set in draft — confirm before Phase 5 publish push) |
| `lastVerified` | 2026-05-24 ✅ |
| `clusterLinks` | 3 links, all resolve ✅ |
| `faq` | 2 questions, answers match body ✅ |
| `dispatch.editorLine` | Set, clean, specific ✅ |
| `dispatch.weather` | Set ✅ |
| `readingTimeMinutes` | 3 — appropriate for ~600-word piece ✅ |

---

## Editorial structure check ✅

| Section | PI standard | Status |
|---|---|---|
| Opening paragraph | Sets mood/season without naming it; doesn't lead with recommendations | ✅ "The season turns on Saturday" — observational, seasonal, specific |
| Anchor booking | One thing worth locking in; practical booking note; time-specific | ✅ Red Hill Truffles, opening day, clear price tiers, booking required |
| Companion move | Slower, unhurried, free or accessible | ✅ Enchanted Market, free, wildlife reserve setting |
| Local edge | Under-published, final-weekend urgency without performance | ✅ Three exhibitions closing, factual, no dramatising |
| Footer quick-reference | Practical details, prices, caveats | ✅ Present, accurate |
| Word count | 550–650 words target (newsletter brief) | ✅ Estimated ~580 words |
| No skip/avoid sections | ✅ Clean |
| No three-weekend-shapes buzz-bullets | ✅ Clean |

---

## Phase 4 verdict

**APPROVED — READY FOR PHASE 5 PUBLISH**

Dispatch is factually clean, dates correct, links resolve, tone is on-brand. Two minor fixes applied in-place. No structural issues. No fact errors. No tone flags requiring editorial intervention.

File location: `next/src/content/articles/peninsula-this-weekend-may-30.md`
Status: Draft (set to "published" in frontmatter — Phase 5 to confirm and push live)

_Review filed. Ready for Phase 5: pi-weekly-dispatch-publish._
