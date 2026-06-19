# Peninsula Insider — Decision UX Pass
**Date:** 2026-06-18
**Run by:** Remy
**Scope:** Homepage, Best Restaurants, Eat hub, Stay hub, Villas (Holiday Rentals), Luxury stays, Weddings, Plans, active staging prototypes
**Objective:** Improve pages so they guide decisions and trigger saves, screenshots, and shares without needing new product features.

---

## Executive Summary

Peninsula Insider's **card-level save/share system (Wave 2) is now fully deployed** across VenueCard, ItineraryCard, ArticleCard, PlaceCard, and EventCard. This is solid infrastructure.

The gap is **page-level decision prompts**. None of the priority hub pages explicitly invite the user to save, screenshot, or share after they've read a comparison, ranked list, or planning guide. The product is doing the editorial work to lead users to a decision — but stopping one sentence short of asking them to act on it.

**One low-risk change made today:** a screenshot/share prompt added to `/stay/villas/` (the Holiday Rentals page). The rest of this report is an implementation-ready brief.

**Strongest recommended changes:**
1. Add a "Save this dispatch" action to the `WeekendPickerBlock` on the homepage.
2. Add a compact "Screenshot this comparison" prompt below every `CompareBlock`.
3. Add a "Send this to the person booking" prompt to the Best Restaurants and Weddings ranked grids.
4. Add save/share to `WeekendPickerBlock` and the Plans `CompareBlock` (one night vs two nights).

---

## Methodology

Reviewed source files for:
- `next/src/pages/index.astro` (homepage)
- `next/src/pages/eat/index.astro` (Eat hub)
- `next/src/pages/eat/best-restaurants.astro` (Best Restaurants)
- `next/src/pages/stay/index.astro` (Stay hub)
- `next/src/pages/stay/villas.astro` (Holiday Rentals)
- `next/src/pages/stay/luxury.astro` (Luxury stays)
- `next/src/pages/weddings/index.astro` (Weddings)
- `next/src/pages/explore/plans/index.astro` (Plans)
- `next/src/pages/v2-staging/stay/villas.astro` (active staging)
- `next/src/pages/v3/index.astro` (V3 staging)

Cross-referenced against:
- `docs/save-share-audit-2026-05-11.md` (Wave 1–5 roadmap)
- `docs/peninsula-insider-content-architecture-ux-model-2026-05-10.md` (navigation behaviour)
- `next/src/components/PiSaveActions.astro` (current card-level affordance)
- `next/src/components/CompareBlock.astro` (decision block)
- `next/src/components/WeekendPickerBlock.astro` (homepage dispatch)

---

## Findings by Page

### 1. Homepage (`/`)

**Current state:** Vivid-style cover carousel, WeekendPickerBlock, "On this weekend" event rail, Places rail, Plans grid, Shortlist, Editor's Letter, Notebook, Newsletter.

**What's working:**
- Plans grid uses `ItineraryCard`, which has `PiSaveActions` (save + share).
- The "On this weekend" rail uses `EventCard`, which has `PiSaveActions`.
- Cover carousel has no actions — correct per brief (heroes have no action).

**What's missing:**
- `WeekendPickerBlock` has **no save or share affordance**. The save-share audit explicitly flagged this: *"Should get a 'Save this dispatch' — it's the most actionable thing on the homepage."*
- The Plans grid header has no prompt like "Save a plan for your next trip" or "Send this to your weekend group."
- The Shortlist has no prompt like "Screenshot these three picks."

**Recommendation:**
- Add `PiSaveActions` (or a simplified variant) to `WeekendPickerBlock`. The dispatch article is saveable as `kind: "article"` with the dispatch slug.
- Add a one-line micro-copy prompt below the Plans grid header: *"See a plan that fits? Save it for later or send it to whoever's booking the bed."*

---

### 2. Eat Hub (`/eat/`)

**Current state:** GuideHero, area quick-nav, EditorialSurface (Featured Long Lunch), AudiencePicker, EventStrip, CompareBlock (Red Hill plateau vs Bay corridor), Editor's Picks, Long Lunch Shortlist, hub navigation, Casual Stops, Editorial Guides, full VenueDirectory, FAQ.

**What's working:**
- The `CompareBlock` is excellent decision UX: two clean columns, no ranking language, calm framing.
- VenueCards throughout have `PiSaveActions`.
- `EditorialSurface` adds a confident single recommendation post-hero.

**What's missing:**
- The `CompareBlock` ends abruptly after the two columns. No prompt to save the comparison, screenshot it, or share it.
- The "Featured Long Lunch" `EditorialSurface` has no save/share action — it's a single editorial pick that users should be able to save.

**Recommendation:**
- Below the `CompareBlock` grid, add a compact prompt: *"Decided on ridge or bay? Screenshot this comparison or save the long lunch guide to come back to it."*
- Add `PiSaveActions` to `EditorialSurface` (or a wrapper), since it's functionally a single recommended venue/article.

---

### 3. Best Restaurants (`/eat/best-restaurants/`)

**Current state:** SubpageHero with prose intro, ranked venue grid (top 15 by authority), FAQ, category links.

**What's working:**
- The ranked list is clean and editorially framed ("by authority," not "best to worst").
- VenueCards have `PiSaveActions`.

**What's missing:**
- The ranked grid is **the perfect screenshot candidate** — a curated list of 15 restaurants in priority order. There is no prompt to screenshot it.
- No prompt to share the list with "the person booking" or "your weekend group."
- The page has no save action at the page level (only per-card).

**Recommendation:**
- Add a prompt below the grid header: *"Planning a Peninsula food weekend? Screenshot this list or save the rooms that matter to your shortlist."*
- Optionally add a page-level share action (native share API with the page URL) near the header.

---

### 4. Stay Hub (`/stay/`)

**Current state:** GuideHero, CompareBlock (Ridge & hinterland vs Coastal village), Editor's Picks, Vineyard Weekends, Coastal Weekends, Wellness & Retreats, hub navigation, full VenueDirectory, Itineraries, Places, Editorial Guides, FAQ.

**What's working:**
- The `CompareBlock` is the strongest decision surface on the site. It directly answers "Which side of the region do I wake up on?"
- Editor's Picks are recommendation-first ("Three stays worth planning the trip around").

**What's missing:**
- Same `CompareBlock` gap as Eat: no post-comparison prompt.
- Editor's Picks grid header doesn't prompt save/share.
- The FAQ has no "Share this guide" prompt.

**Recommendation:**
- Below the `CompareBlock`: *"Know which side of the Peninsula you want? Save this comparison or send it to whoever's booking the bed."*
- Below Editor's Picks header: *"One of these fits your trip? Save it now — the best rooms book out weeks ahead."*

---

### 5. Villas / Holiday Rentals (`/stay/villas/`)

**Current state:** Article intro, ranked venue grid (8 villas), NewsletterBlock.

**What's working:**
- VenueCards have `PiSaveActions`.
- The intro is specific and decision-oriented.

**What's missing:**
- No page-level prompt to screenshot or share the list.

**Change made today:**
Added a compact decision-prompt paragraph below the grid header:

```html
<p class="decision-prompt">
  <span class="decision-prompt__icon" aria-hidden="true">📸</span>
  Planning with a group? <strong>Screenshot this list</strong> or tap Save on any villa to share it with the person booking.
</p>
```

This demonstrates the pattern: one line of copy, no new components, no engineering dependencies. It frames the existing `PiSaveActions` on cards as a shareable shortlist mechanism.

**Note:** No CSS class `.decision-prompt` exists in the design system yet. The markup will render as plain text until a style rule is added, or a `style` block can be added to the page. For now, it degrades gracefully.

---

### 6. Luxury Stays (`/stay/luxury/`)

**Current state:** Article intro, ranked venue grid (9 properties), "How to choose well" FAQ, related guides.

**What's working:**
- The FAQ section directly addresses the decision ("Red Hill or Sorrento?", "Hotel or villa?").
- VenueCards have `PiSaveActions`.

**What's missing:**
- The "How to choose well" section is excellent decision UX but has no prompt to save or share the page.
- No screenshot prompt for the ranked grid.

**Recommendation:**
- Below the FAQ section: *"Made your choice? Screenshot this guide or save the property that fits your trip."*

---

### 7. Weddings (`/weddings/`)

**Current state:** SectionHero, format-nav chips, editorial promise, Venue Types (6 cards), By Town (6 cards), Planning (6 cards), Guest Weekend (6 cards), Journal articles, FAQ, related guides, NewsletterBlock.

**What's working:**
- This is the most decision-first page on the site. Every section starts with a structural question ("Choose by setting, not by search rank").
- The venue-type cards frame the decision as "which format fits you" rather than "which is best."
- The planning section answers real structural questions (guest count, transport, season).

**What's missing:**
- No save/share prompts on any of the 18 decision cards.
- No "Save this for your shortlist" or "Send this to your partner" prompt.
- The Guest Weekend section has 6 links (accommodation, rehearsal dinner, recovery brunch, etc.) but no prompt to save the whole plan.

**Recommendation:**
- Below the Venue Types grid header: *"Found a format that fits? Save this page or screenshot the section to share with your partner."*
- Below the Guest Weekend grid header: *"Building the weekend around the wedding? Save these links or send them to your bridal party."*

---

### 8. Plans (`/explore/plans/`)

**Current state:** GuideHero, "Build your own plan" CTA, EditorialSurface, Plan by Mood (4 cards), Planning Guides by trip length, CompareBlock (One night vs Two nights), Itinerary grids (two-night, one-night, longer), Planning Philosophy, Stay Highlights, Places, filterable browse.

**What's working:**
- The `CompareBlock` (One night vs Two nights) is a critical decision surface.
- Mood cards are intent-led entry points.
- ItineraryCards have `PiSaveActions`.
- The filterable browse is a real decision engine.

**What's missing:**
- The `CompareBlock` has no post-decision prompt.
- The "Build your own plan" CTA links to `/explore/plans/build/` but there's no prompt to share a built plan.
- The Planning Philosophy section ("Three things we've learned") is highly screenshotable but has no prompt.

**Recommendation:**
- Below the `CompareBlock`: *"Know how many nights? Save this comparison or jump straight to the plans that match."*
- Below Planning Philosophy: *"These three rules fit in a text message. Screenshot them or share this plan with your travel partner."*

---

### 9. Active Staging Prototypes

**V2 staging (`/v2-staging/stay/villas/`):**
- Uses the old v2 layout and components. No `PiSaveActions`.
- The shortlist format is clean but lacks any save/share affordance.
- **Recommendation:** If this page is ever promoted, wrap the shortlist in the current production card system or add a page-level prompt.

**V3 staging (`/v3/`):**
- Comprehensive homepage rebuild with cover, Ask PI, pillars, weekend hero, intent grid, shortlist, editor's letter, insider stripe, lateral surfaces, newsletter.
- No visible save/share on V3HomeCover, V3WeekendHero, V3IntentGrid, V3Shortlist, or V3LateralSurfaces.
- **Recommendation:** Before V3 ships, audit every block for save/share. The intent grid and shortlist are the highest-priority surfaces.

---

## Recommended Prompt Placements (Summary Table)

| Page | Block | Prompt Copy |
|---|---|---|
| Homepage | WeekendPickerBlock | *"Save this weekend's dispatch"* (add PiSaveActions) |
| Homepage | Plans grid header | *"See a plan that fits? Save it for later or send it to whoever's booking the bed."* |
| Eat | CompareBlock (Ridge vs Bay) | *"Decided on ridge or bay? Screenshot this comparison or save the long lunch guide."* |
| Best Restaurants | Ranked grid header | *"Planning a Peninsula food weekend? Screenshot this list or save the rooms that matter."* |
| Stay | CompareBlock (Ridge vs Coast) | *"Know which side of the Peninsula you want? Save this comparison or send it to whoever's booking."* |
| Stay | Editor's Picks header | *"One of these fits your trip? Save it now — the best rooms book out weeks ahead."* |
| Villas | Grid header | **DONE** — *"Planning with a group? Screenshot this list or tap Save on any villa to share it with the person booking."* |
| Weddings | Venue Types header | *"Found a format that fits? Save this page or screenshot the section to share with your partner."* |
| Weddings | Guest Weekend header | *"Building the weekend around the wedding? Save these links or send them to your bridal party."* |
| Plans | CompareBlock (1 night vs 2) | *"Know how many nights? Save this comparison or jump straight to the plans that match."* |
| Plans | Planning Philosophy | *"These three rules fit in a text message. Screenshot them or share this plan with your travel partner."* |

---

## Implementation Notes

### No new product features required
All recommendations are **copy + existing PiSaveActions**. No new components, no new API endpoints, no store migrations.

### Two implementation paths

**Path A: Copy-only (today)**
- Add the one-line prompt paragraphs shown above to each page's `.astro` file.
- Zero risk. Zero dependencies. Works immediately.

**Path B: Component-level (next sprint)**
- Add a `prompt` prop to `CompareBlock` that renders a `.decision-prompt` below the grid.
- Add `PiSaveActions` to `WeekendPickerBlock` (save the dispatch article).
- Add a `prompt` prop to `EditorialSurface`.
- Requires a brief dev pass but keeps the pattern consistent.

### Styling
The `.decision-prompt` class used on `/stay/villas/` does not yet have design-system styles. A minimal style block can be added to any page that uses it:

```css
.decision-prompt {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 0.85rem;
  color: var(--soft, #5f5a50);
  margin: 0.5rem 0 1.25rem;
  line-height: 1.5;
}
.decision-prompt__icon {
  margin-right: 0.35rem;
}
```

Or add it to the global stylesheet once the pattern is validated.

---

## Rules Followed

- **Lead pages toward one recommendation before alternatives.** The existing `CompareBlock` and `EditorialSurface` already do this. The prompts reinforce the decision.
- **Avoid option overload and committee language.** Every prompt is a single action, not a menu.
- **Prefer compact, screenshotable blocks over long explanatory copy.** The prompts are one line. The blocks they sit above are already compact.

---

## Next Actions

1. **Validate the Villas prompt** — check engagement after the next deploy. If it works, roll the pattern out to Eat, Stay, Weddings, and Plans.
2. **Add PiSaveActions to WeekendPickerBlock** — this is the highest-impact single component change.
3. **Add a `prompt` prop to CompareBlock** — DRYs the pattern across all hub pages.
4. **Audit V3 staging** before promotion — ensure every decision surface has a corresponding save/share affordance.

---

*Report produced by Remy, Peninsula Insider cron job `pi-weekly-decision-ux-pass` (d613c956-4af7-4240-b6e9-62809f539b1e).*
