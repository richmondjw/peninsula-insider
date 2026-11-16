# Plan cards and the plan builder - spec

**Date:** 19 September 2026
**Branch:** `feat/plans-builder` (off `origin/main`)
**Owner:** James
**Status:** Scoped, not started
**Reference:** Tripadvisor's "Itineraries to help you plan" row plus its
"Create your own trip" card

---

## 1. Decisions taken, 19 September

| Question | Decision |
|---|---|
| What "Build my plan" returns | **Existing plans, matched.** No generation, no AI surface, no backend dependency. |
| The existing `/explore/plans/build/` | **Folded into the new builder card**, with a redirect. |
| Homepage | **Three plan cards plus a compact chip strip** in block 5. |

The reference shows human and machine-made plans side by side. This build
has no generated plans in it, so it carries no "Powered by AI" label. If
generation is added later, that is when the provenance question returns,
and it is a brand decision before it is a build one.

---

## 2. Current state (verified on `origin/main`, 19 Sep)

- **`/explore/plans/`** is already a decision engine, not a card wall:
  single-select context chips, one featured plan plus two alternates,
  catalogue rows, next-step band. The default context server-renders so
  the page works with JS off; other contexts swap from embedded JSON with
  `?context=` persisted and the canonical fixed at `/explore/plans/`.
- **`plans-data.ts`** builds the model from `itineraries` plus plan-shaped
  articles, and enriches from `venues` and `experiences`. Every
  `PlanRecord` already carries `facets`, `dayCount`, `verdict`, `stops`
  and an image. **The chips in the reference are a rendering job here, not
  a data job.**
- **`/explore/plans/build/`** already runs an attribute-aware planner over
  eight facet families plus free text, through the `pi.search` Supabase
  RPC. It is **indexable** (`noindex={false}`).
- **My Trip** exists: `tripAdd` / `tripAddDay`, "Make this my trip"
  forking from plan cards, `/itinerary/` as the destination.
- **`lib/concierge-itinerary.ts`** documents a full contract for a
  concierge-generated itinerary and the front-end recogniser is built. Its
  own header notes the backend does not speak it yet. Unused by this spec,
  kept intact for later.
- **Ask PI is off sitewide** (`SHOW_ASK_PI = false`, 21 July). Nothing in
  this spec turns it back on.

---

## 3. Design

### 3.1 Plans page

Order on `/explore/plans/`:

1. Hero (unchanged)
2. Context chips (unchanged - they are better than the reference, because
   they answer rather than filter)
3. **Plan cards, new.** Three cards: the featured plan and its two
   alternates for the active context, each with up to three facet chips
   above the title, the verdict line under it, day count, a provenance
   byline, and the existing fork control.
4. **Builder card, new.** "Build your own Peninsula day":
   - How long: Half day / One day / Weekend / Long weekend
   - Who's coming: Solo / Couple / Friends / Family
   - What you're into: multi-select over the theme facet, capped at the
     six values that actually occur across the catalogue
   - One button
5. Catalogue rows (unchanged)
6. Next-step band (unchanged)

The builder writes its answer into slots 3 and 4: one best match, two
alternates, plus a line saying why it matched ("Couples, coastal, one
day"). No new page, no navigation.

### 3.2 Matching

Client-side, over the plans payload the page already embeds. No network
call, so it cannot fail when Supabase is down, and it works on the first
click rather than after a round trip. With a catalogue this size that is
the right engineering answer.

Score per plan: weighted facet overlap (who against `audience`, into
against `theme` and `mood`, length against `dayCount`), season as the
tie-break, `publishedAt` last. Show the top three. Below a floor score,
say so honestly rather than returning a bad plan: "Nothing in the
catalogue fits that shape yet" plus a link to `/search/`.

**Free text is not carried over.** The reference's "Anything else?" box
implies a generator that reads it. Matching cannot, and a box that
silently ignores what someone typed is worse than no box. The equivalent
affordance is the link to full search.

### 3.3 Homepage

Block 5 (`HomePlan`) widens from one rotating plan to three cards, plus a
two-row chip strip (how long, who's coming) and a button that deep-links
to `/explore/plans/?length=..&who=..#build` with the selections applied on
arrival. No matching logic on the homepage.

### 3.4 Folding in `/explore/plans/build/`

The new card covers the three questions people actually answer. The old
page covers eight facet families across the whole corpus through the RPC.
Folding means **losing corpus-wide search from that URL**, which is a real
reduction, not a tidy-up.

Sequence:
1. Check GSC for `/explore/plans/build/` impressions and clicks first. If
   it has earned traffic, it stays and links from the new card as "more
   filters".
2. If it has not, 301 it to `/explore/plans/` and add the entry to the
   redirect list. The RPC layer stays in the codebase for a later
   "expand to venues and experiences" step on the builder card.

---

## 4. SEO and a11y

- No new URLs. Builder state rides on `?length=`, `?who=`, `?into=` on
  `/explore/plans/`, exactly as `?context=` does now; canonical stays
  `/explore/plans/`, so parameterised views never index.
- The single `<h1>` does not move or change.
- Chips are buttons with `aria-pressed`, matching the existing engine.
  Results announce through the page's existing `#pi-results-status` live
  region. 44px targets. The server-rendered default state stays complete
  with JS disabled.

---

## 5. Files

```
next/src/components/v5/plans/PlanContextEngine.astro   cards + chip rendering
next/src/components/v5/plans/PlanBuilder.astro         new - the builder card
next/src/components/v5/plans/plan-match.ts             new - scoring, pure, testable
next/src/components/v5/plans/plans-data.ts             expose facets + byline on PlanRecord
next/src/components/v5/home/HomePlan.astro             three cards + chip strip
next/src/pages/explore/plans/index.astro               compose the new blocks
next/src/pages/explore/plans/build.astro               redirect or "more filters", per 3.4
docs/specs/plans-builder-2026-09-19.md                 this spec
```

---

## 6. Phases

**Phase 0 (30 min)** - GSC check on `/explore/plans/build/`, and count how
many distinct facet values actually occur across the catalogue, so the
chip rows offer only values that can return something.

**Phase 1 (3 h)** - Plan cards with facet chips and provenance byline on
`/explore/plans/`, replacing the current featured/alternate rendering.

**Phase 2 (3 h)** - `plan-match.ts` plus the builder card, wired to the
embedded payload, with URL params and the no-match state.

**Phase 3 (2 h)** - Homepage block 5: three cards and the chip strip,
deep-linking into the builder.

**Phase 4 (1 h)** - Fold or keep `build.astro` per Phase 0, redirect entry
if folding, full gate chain, deploy.

Around a day and a half. No feature flag: every phase is complete and
shippable on its own, and the existing engine keeps working throughout.

---

## 7. Acceptance criteria

1. Three plan cards render for every context, each with facet chips, a
   verdict line and a byline.
2. The builder returns a match plus two alternates without a network call,
   and says so plainly when nothing fits.
3. Builder state survives a reload through URL params; canonical unchanged;
   no new indexable URL.
4. The page still works with JS disabled, showing the default context.
5. Forking a matched plan into My Trip works signed-out.
6. The homepage chip strip lands on the plans page with selections applied.
7. Full `npm run build` gate chain passes.

---

## 8. Open questions

- Byline wording for plans with no named author: "Peninsula Insider
  editorial", or the desk that owns the plan?
- Does "What you're into" stay multi-select, or single-select like the
  context chips above it, which would make the whole page one grammar?
- Should the builder card also appear on `/itinerary/` (My Trip) when the
  trip is empty, which is the other place someone is stuck for a plan?
