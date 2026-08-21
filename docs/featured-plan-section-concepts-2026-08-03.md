# Featured Plan section: design direction

**Status, 3 August 2026:** the recommended Plan Desk direction has been implemented locally in `next/src/components/v5/home/HomePlan.astro`. It remains uncommitted and un-deployed pending visual review.

**Decision requested:** confirm the direction after review. No production deployment is proposed until approval.

## Recommendation: the Plan Desk

Build one expanded, editorially led Featured Plan with a supporting right-hand decision rail. It makes the weekly plan feel like Peninsula Insider's primary product, resolves the empty desktop canvas without inventing a second equal-priority recommendation, and gives readers two lower-friction next actions when they are not ready to open the full itinerary.

This retains the existing editorial promise: one clear recommended Peninsula day or weekend. A second full plan would weaken that promise, create an unnecessary choice, and make the module feel like a generic content shelf rather than a useful planning tool.

### Reader intent and conversion job

| Reader state | What the module should do | Primary action |
| --- | --- | --- |
| "Help me decide" | Make this week's plan immediately legible | Open the itinerary |
| "I like this, but not now" | Preserve the plan without adding noise | Save the plan |
| "This isn't my day" | Provide a purposeful alternative | Browse plans by mood or duration |

### Desktop composition

Use a 12-column asymmetric grid within the existing container.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ PLAN IT                                             All plans →               │
│ Featured plan                                                               │
├──────────────────────────────────────────┬───────────────────────────────────┤
│                                          │ THIS WEEK'S SHAPE                 │
│  [wide, carefully art-directed image]   │  2 days · Couples · Winter        │
│                                          │                                   │
│  The Sorrento off-season weekend         │  Start here                       │
│  A slow two-day plan ...                  │  [first stop / one useful detail]│
│                                          │                                   │
│  View the full plan →     Save           │  IF TODAY LOOKS DIFFERENT         │
│                                          │  Rainy day · One day · With kids  │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

- **Main story, 8 columns:** a 16:9 image, plan title, restrained one- or two-line dek, plan metadata, and one unmistakable text CTA. The image must meet the existing art-direction standard: low light or overcast Peninsula atmosphere, no car parks, bins, powerlines, stock imagery, or hard midday blue sky.
- **Decision rail, 4 columns:** warm limestone or pale stone ground, a small "This week's shape" summary, one concrete "Start here" detail drawn from the itinerary, then 2–3 context links. It earns the right-hand space by helping a reader decide, rather than filling it with decoration.
- **One hierarchy:** the featured itinerary owns the visual weight. Supporting links are clearly secondary and must not read as sponsored or as a competing recommendation.

### Responsive behaviour

- **Desktop, 1024px and up:** 8/4 split. The image and editorial detail stay in the primary panel; the rail is aligned to the card height, not floated in unrelated whitespace.
- **Tablet, 640–1023px:** primary panel stays full-width; the decision rail becomes a three-item horizontal strip beneath it.
- **Mobile, below 640px:** title, image, title/dek, primary CTA, then a compact "This week's shape" block. Context links become horizontally scrollable chips only if they remain plainly useful; otherwise show a single `Browse all plans` link.
- Preserve the existing Save control and use a 44px minimum interactive target for all calls to action.

### Why this is the recommended direction

1. **It protects the product promise.** The site has already defined Plans as a premium decision layer, not a browsing archive. One recommendation is clearer than two equal cards.
2. **It addresses the real conversion leak.** The current 34rem card cap strands attention after the reader has found the module. The rail uses that attention for orientation and an alternative path.
3. **It adds reusable data, not bespoke copy.** Mood, duration, first stop, and matched contexts can be derived from the itinerary schema. No weekly manual module-writing should be required.
4. **It is technically modest.** The existing single-plan selection stays intact. The change is composition, a small supporting-data contract, and responsive CSS, rather than a new content system.

### Success measures

Instrument the module before release and compare a four-week baseline with four weeks after release:

- featured-plan click-through rate;
- saves per plan impression;
- completed itinerary page views from the module;
- use of supporting context links;
- mobile versus desktop engagement split.

Do not optimise merely for total clicks. A stronger plan module should also reduce immediate exits from the plans journey and increase saves.

## Alternative concept 2: the Two-Plan Pair

Show two deliberately contrasted plans in a 7/5 composition: a large weekly featured plan and a smaller, clearly labelled "Also suits" plan. The second plan must be a different decision context, for example one-day versus weekend, or couples versus family, rather than a second generic recommendation.

```text
┌──────────────────────────────────────────┬───────────────────────────────────┐
│ THIS WEEK'S PLAN                         │ ANOTHER WAY TO SPEND THE DAY      │
│ [large image]                            │ [portrait image]                   │
│ Title + dek + View plan →                │ Title + one-line context + →       │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

**Best for:** a mature plan library with reliable editorial coverage across contrasting needs.

**Conversion hypothesis:** readers who reject the main plan can self-select into a relevant alternative without first entering the Plans hub.

**Trade-off:** it introduces choice at exactly the moment the homepage should simplify choice. It also doubles image-quality and editorial-selection requirements. Use only if the data shows the primary plan is regularly mismatched to a meaningful share of homepage readers.

**Responsive rule:** never retain side-by-side cards on mobile. Stack the feature first, then the alternative with a strong contextual label. Do not turn it into a carousel.

## Alternative concept 3: the Plan as a Route

Use the empty space for a visual three-stop route rather than a second card. The left two-thirds remains the large Featured Plan card; the right third shows a vertical sequence of `Morning`, `Lunch`, and `Afternoon` with one named stop per stage and a link to the complete plan.

```text
┌──────────────────────────────────────────┬───────────────────────────────────┐
│ [image]                                  │ 09:30  Morning walk                │
│ Featured plan title                      │ 12:30  Long lunch                  │
│ Dek + View the full plan →               │ 15:30  Final stop                  │
│                                          │          View the route →           │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

**Best for:** plans with a clear, real-world sequence and verified venue information.

**Conversion hypothesis:** showing the day taking shape helps a reader picture themselves in it, increasing itinerary opens and saves.

**Trade-off:** this becomes brittle if stop data, opening hours, bookings, or seasonal availability are not current. It carries a higher editorial-verification burden and must never imply availability. It is more evocative than the Plan Desk, but less durable as a universal component.

**Responsive rule:** convert the route into a numbered, non-interactive summary below the primary CTA. Keep the full itinerary as the only route-planning action.

## Design guardrails

- Treat the module as editorial utility, not a promotional hero. No urgency language, countdowns, pop-ups, or "best" claims.
- Keep the section title and CTA plain: `Featured plan` and `View the full plan` are clearer than clever marketing labels.
- Avoid a second hero-sized image. The image should support the plan, not compete with the page's main feature.
- Use a visible rule and structured spacing rather than card shadows or rounded SaaS-style containers.
- Maintain editorial-commercial hierarchy. No partner treatment may occupy the decision rail or visually rival the plan.
- Clamp supporting text so card height remains deliberate. The rail should carry a maximum of one start-here detail and three context links.

## Recommended next step

Approve the **Plan Desk** direction, then create a narrow implementation brief covering the final data fields, component states, analytics events, and a visual QA at desktop, tablet, and mobile. Concept 3 can be revisited later as an enriched campaign variant once itinerary data is consistently verified.
