# Peninsula Insider — Weekly Decision UX Pass
**Date:** 2026-06-02
**Run by:** Remy (cron `pi-weekly-decision-ux-pass`)
**Scope:** Homepage, Best Restaurants (live + v2-staging), Stay hub, Weddings hub, Holiday Rentals (gap)
**Goal:** Surface where pages can guide decisions and trigger saves, screenshots, and shares without new product features.

---

## Executive summary

Peninsula Insider's landing surfaces are editorially strong but structurally still in *browse* mode. Every priority page opens with "here is the territory" rather than "here is what to do next." That costs three of the four behaviours the decision system relies on: a lead recommendation to anchor the page, a compact screenshotable block to capture the decision, and a share prompt aimed at the person actually making the booking.

The single highest-leverage move is **adding a lead recommendation block ("Where to begin") above the list on every hub page**. The second is **adding screenshot/send copy prompts under the most compact block on each page** — these cost a line of copy each and signal the right reader behaviour without needing new save/share components to ship first.

One low-risk staging change made this pass: added a "Screenshot this list. Send it to whoever is booking Saturday lunch." prompt under the shortlist on `v2-staging/eat/best-restaurants.astro`. Three further implementation-ready briefs follow.

---

## What I reviewed

| Surface | File | Status | Key structural issue |
|---|---|---|---|
| Homepage | `src/pages/index.astro` | Live | Cover → mission bar → weekend dispatch → places → plans. No save/share anywhere; weekend dispatch is the most actionable block and has zero send-this affordance. |
| Best Restaurants | `src/pages/eat/best-restaurants.astro` | Live (152 lines) | Three-paragraph intro then 15-card grid then FAQ. No lead recommendation. No "save this list." Individual `VenueCard` has save (System A) but the list itself is not saveable. |
| Best Restaurants (staging) | `src/pages/v2-staging/eat/best-restaurants.astro` | v2-staging (385 lines) | Numbered shortlist (good — screenshotable). Sandpit map with cluster pins (good). "Save this shortlist" CTA mislabels what it does (in-page anchor). Still no lead pick before the list. |
| Stay | `src/pages/stay/index.astro` | Live (396 lines) | CompareBlock (Ridge vs Coastal) is the strongest decision block on the site. But 11 zones below it including a 16-link hub grid — heavy option load. No "if it's your first trip, base in X" lead. |
| Weddings | `src/pages/weddings/index.astro` | Live (418 lines) | Format-nav chips good. Six venue-type cards all link to the same long-form article — feels like a card grid that the back-end can't deliver on. No lead recommendation; couples need one. |
| Holiday Rentals | — | **No dedicated landing page** | Splintered across `/stay/villas/`, `/stay/cottages/`, `/stay/winery-accommodation/`. The Weddings FAQ explicitly mentions "holiday rental houses that sleep 8–12 guests" — reader intent exists, surface does not. |

---

## The pattern across all five pages

Every hub page on the site today does the same three things in the same order:

1. **Hero with brand promise** ("Curation over volume", "Choose the base", "The Best Restaurants")
2. **Long list of options** organised by category, sometimes with editor's picks
3. **FAQ / journal sidebar / newsletter**

Missing from this pattern, in priority order:

1. **Lead recommendation block** — *one* answer that anchors the page before alternatives. Calm decision guidance, not a verdict; phrased as "If this is your first Peninsula weekend, start here" rather than "winner."
2. **Screenshotable compact block** — the most-shared element from any guide page is the bit that fits on one phone screen. Today these don't exist on hub pages; the numbered shortlist on v2-staging is the closest.
3. **Send/share prompts** — explicit copy that names the next behaviour. "Send this to whoever is booking Saturday lunch." "Save this for later — the booking page can wait."
4. **Hierarchy fidelity** — the most actionable surface on the homepage (Weekend Dispatch) has no save or share. The least actionable (cover story) has the most visual weight.

---

## Concrete prompt placements (implementation-ready, no new components required)

The save/share infrastructure is documented in `docs/save-share-audit-2026-05-11.md`. Wave 1 (unified save store) and Wave 2 (card-level rollout) are upstream of what's below. These prompts work as **copy-only additions** today; when the save/share system catches up, the prompts become hooks for real behaviour.

### Homepage (`src/pages/index.astro`)

| Where | Prompt copy | Why |
|---|---|---|
| Under Weekend Dispatch block, replacing the current bare CTA | "Send this weekend to the group." | The dispatch is the page's single most actionable block. Today it has no share affordance at all. |
| Under Plans grid, after `hp-plans__melbourne` link | "Save the plan that fits. The booking can wait." | Plans are saveable but the page doesn't tell readers that. |
| Under cover scene's "Read" CTA | (nothing) | Cover story is correct as a hero. No action belongs here. |

### Best Restaurants — live and staging (`eat/best-restaurants.astro`)

| Where | Prompt copy | Why |
|---|---|---|
| **Lead recommendation block, above the shortlist** | New section: "Where to begin · This season we'd send a first-time visitor to [Tedesca Osteria]. It's the room that explains what the Peninsula does best." | Currently the page opens with editorial methodology, then 15 ranked rooms. No anchor for the indecisive reader. Editorial picks one room based on season — keeps it calm (not "winner") and updateable. |
| Under shortlist (staging — **done this pass**) | "Screenshot this list to keep it. Send it to whoever is booking Saturday lunch." | Names the two highest-frequency next behaviours after reading a Best Restaurants list. |
| Replacing "Save this shortlist" CTA on planning section (currently an in-page anchor) | "See which cluster fits your day →" | Truth-in-labelling. The button doesn't save anything today; it scrolls to the planning cards. |
| Under each planning card's actions row | (no new copy needed — Maps + venue links already serve the action) | |

### Stay (`src/pages/stay/index.astro`)

| Where | Prompt copy | Why |
|---|---|---|
| **Lead recommendation block, above CompareBlock** | New section: "Where to base yourself, in one sentence · For most first-time weekenders, Red Hill in winter and Sorrento in summer. Below is the longer version." | The 16-zone hub grid is heavy. A one-sentence lead reduces option overload before the reader hits it. |
| Under Editor's picks venues section | "Save the one you'd actually book. The other two are good comparisons." | Editor's picks today has no after-action prompt. |
| Under CompareBlock (Ridge vs Coastal) | "Share this with whoever is choosing the trip." | CompareBlock is the page's strongest decision tool and the most likely thing to be sent in a group chat. |
| Above the 16-link hub grid | (tighten: collapse to two rows of 8, group by intent — see brief #2 below) | Option overload. |

### Weddings (`src/pages/weddings/index.astro`)

| Where | Prompt copy | Why |
|---|---|---|
| **Lead recommendation block, above Venue Types** | New section: "Where to start · If you can only visit one venue this month, start with Montalto. It explains what a Peninsula vineyard wedding feels like, and clarifies whether that's the direction." | Couples landing here are early-stage. Six format-cards is too many to weigh cold. One named tour anchors them. |
| Under each Venue Type card | "Save this format. We'll send the venue list separately." | Each format card today links to the same long article. A save action makes the formats a decision tool rather than a click-tax. |
| Under Guest Weekend section | "Send this to the person planning guest logistics." | Names the actual recipient — usually a parent or wedding planner, not the couple. |

### Holiday Rentals (missing surface)

There is no `/stay/holiday-rentals/` landing page. Reader intent shows up in the Weddings FAQ ("holiday rental houses that sleep 8–12 guests work well for bridal parties"), in the Stay hub's villa/cottage hubs, and in the Insiders 30 evidence (cottages-with-fireplaces is a real decision category).

**Recommendation:** Build `/stay/holiday-rentals/` as a single-page decision guide that:
- Leads with "When a holiday rental fits better than a hotel" (the actual decision)
- Numbered list of 10 vetted properties grouped by group-size band (3–4, 5–8, 8–12+)
- Three trip-shape options: *Two-night Red Hill weekend*, *Sorrento beach week*, *Wedding-weekend overflow*
- Screenshot/send prompts on each section
- Single CTA: "Save this list. The owner contact is on each property page."

This is a content piece more than a build piece — the hub component, venue cards, and save store all exist.

---

## Three implementation-ready briefs (in priority order)

### Brief 1 — Lead recommendation block component (`<HubLead />`)

**Why:** Every hub page (Eat, Stay, Weddings, Walks, Wine) opens with "the territory" instead of "where to start." A single reusable lead block solves the pattern in one place.

**Shape:**
```astro
<HubLead
  eyebrow="Where to begin"
  recommendation="Tedesca Osteria"
  recommendationHref="/eat/tedesca-osteria/"
  reasoning="The room that explains what the Peninsula does best. If you're choosing one this season, choose this."
  alternatives={[
    { name: "Montalto", reason: "If you want the day, not just the lunch" },
    { name: "Polperro", reason: "If your party is six or fewer" }
  ]}
/>
```

**Behaviour:** Renders above the main list on every hub. Editorial picks the rec via frontmatter on the hub page; alternatives are optional (max 2). Phrasing rules from the PI Standard: not "best", not "winner", but "fits which version of the day."

**Placement on each page:** Top of `<main>`, between hero and first list section.

**Effort:** One component + frontmatter prop on five hub pages. Editorial picks the recs.

### Brief 2 — Stay hub grid restructure (option overload fix)

**Current state:** 16 stay-hub links rendered as a flat grid (`stayHubs` array, line 62 of `stay/index.astro`).

**Recommendation:** Group into two visual tiers, six links above the fold, ten in an expandable "More ways to filter" block.

**Tier A (above fold):** Luxury, Boutique Hotels, Couples, Dog-Friendly, Glamping, Where to Base Yourself.
**Tier B (collapsed):** All remaining 10, including the by-town hubs.

**Effort:** One file edit. No new component. Reduces visible options from 16 to 6, which is the threshold where readers actually choose.

### Brief 3 — Weekend Dispatch share affordance (homepage)

**Current state:** `WeekendPickerBlock` on the homepage has no save or share. It is the single most actionable block on the site.

**Recommendation:** Add a small one-line affordance row at the bottom of the dispatch block:
- Copy: "Send this weekend to the group. Save it for later if Saturday's still open."
- Mechanics (Wave 2 spec): one Save icon (kind=article, slug=dispatch), one Share icon (native share API on mobile, copy-link fallback).
- Until Wave 2 ships, use copy-only — the prompt sets the expectation.

**Effort:** One block edit. Plugs into existing `ShareBlock` once available; copy-only in the interim.

---

## What was made this pass

**One staging copy change:**

`/next/src/pages/v2-staging/eat/best-restaurants.astro` (line 206) — Added one-line prompt above the shortlist:

> "Screenshot this list to keep it. Send it to whoever is booking Saturday lunch."

This is purely additive, copy-only, no behaviour wired, on a v2-staging page (not production). It models the exact pattern recommended above for live rollout, so editorial can review the tone in context before applying it sitewide.

---

## What was *not* made

- No edits to live (`src/pages/`) files — all five priority hubs await editorial sign-off on the lead-recommendation framing before structural copy lands.
- No new components — `<HubLead />` and the share/save affordance row are recommendations only.
- No edits to the 16-hub stay grid — restructure should be a single coordinated decision, not a drive-by change in a UX pass.
- Did not invent a holiday-rentals page — that needs a content commission, not a UX pass output.

---

## Recommended next actions (no editorial gate)

1. Apply the same screenshot/send prompt strip from the staging best-restaurants page to the **live** `eat/best-restaurants.astro` (line ~117, above the venue grid). Same copy. Lowest-risk live edit available.
2. Add a "Send this weekend to the group" line under the Weekend Dispatch block on the homepage. Copy-only until share component ships.
3. Tighten the Stay hub grid from 16 visible links to 6 + expandable 10 (Brief 2 above).

## Recommended next actions (editorial sign-off needed)

4. Tyler/Sloane approve the `<HubLead />` framing and pattern. Editorial picks one lead recommendation per hub. Refresh quarterly.
5. Commission `/stay/holiday-rentals/` as a single-page decision guide. Lucien or Iris depending on framing.
6. Audit the Weddings six-card grid: today every card links to the same article. Either split into six articles or collapse to one strong "Choose your wedding format" decision block with anchor jumps.

---

*Report produced by Remy, Peninsula Insider cron `pi-weekly-decision-ux-pass` (d613c956-4af7-4240-b6e9-62809f539b1e). Builds on `peninsula-insider-decision-behaviour-system` thinking and the `save-share-audit-2026-05-11` system map. The save/share component infrastructure is the long-term answer; the prompts in this report are what works in the meantime, and what should land first when the components arrive.*
