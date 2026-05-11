# Save & Share audit, 2026-05-11

Reference for Peninsula Insider Save & Share System Brief v2. Maps every component that has, or should have, a save or share action. Source-of-truth for Wave 1 (store unification) and Wave 2 (card-level rollout).

## Two competing save systems exist today

| System | Used by | UI markup | Store | Sync to Supabase |
|---|---|---|---|---|
| **A: SaveSiteController + components/SaveButton.astro** | `VenueCard`, `EventCard` | `<button data-save-toggle data-save-kind="venue|event" data-save-slug="..." ...>` | `localStorage["pi:saved:v1"]` shape `{ venues: [...], events: [...] }` | None today |
| **B: components/v2/SaveButton.astro** | Journal article body (`/journal/[slug].astro`) | `<button class="v2-save" data-save-slug data-save-section ...>` | `pi.user_saves` (Supabase) when signed in; `localStorage["pi:saved-articles:v1"]` when anonymous (added 2026-05-11) | Yes for signed-in users via direct Supabase write |

These two stores need to merge into one canonical local store with one canonical UI. Documented as the first deliverable of Wave 1.

## Save coverage matrix

| Component | Save today | Share today | Notes |
|---|---|---|---|
| `VenueCard.astro` | ✅ System A (venue) | ❌ | `<SaveButton kind="venue" />` rendered inside `.venue-card__actions`. Placement: bottom-left of card body. |
| `EventCard.astro` | ✅ System A (event) | ❌ | `<SaveButton kind="event" />` rendered in card actions area. |
| `ItineraryCard.astro` | ❌ | ❌ | High-priority gap. Itineraries are the heart of "build your weekend." |
| `ExperienceCard.astro` | ❌ | ❌ | Should get save (kind=experience). |
| `PlaceCard.astro` | ❌ | ❌ | Should get save (kind=place). |
| `ArticleCard.astro` | ❌ | ❌ | Should get save (kind=article). |
| `TourCard.astro` | ❌ | ❌ | Should get save (kind=tour). |
| `TourOperatorCard.astro` | ❌ | ❌ | Should get save (kind=tour-operator). |
| `TourPackageCard.astro` | ❌ | ❌ | Should get save (kind=tour-package). |
| `components/v3/V3EditorialCard.astro` | ❌ | ❌ | V3 chrome, may be deprecated. Skip unless still in use. |
| `components/v3/V3EntityCard.astro` | ❌ | ❌ | V3 chrome. Skip. |
| `components/v3/V3EventCard.astro` | ❌ | ❌ | V3 chrome. Skip. |
| Journal article body (`/journal/[slug].astro`) | ✅ System B (article) | ✅ ShareBlock (top + end) | `<SaveButton slug section title dek imageUrl />` near the byline. |
| Venue detail template (`VenueDetailTemplate.astro`) | ❌ on the page itself, ✅ on related cards | ✅ ShareBlock | Page itself has no save action, only the related cards underneath do. Gap. |
| What's on dispatch (`/whats-on/this-weekend/index.astro`) | ❌ on the page itself | ✅ ShareBlock (top + end) | Same gap as venue detail. Page is itself a saveable plan. |
| Homepage hero | ❌ | ❌ | Correct, per brief: heroes have no action. |
| Homepage weekend dispatch block (`WeekendPickerBlock`) | ❌ | ❌ | Should get a "Save this dispatch" — it's the most actionable thing on the homepage. |

## Share coverage today

| Surface | Component | Behaviour |
|---|---|---|
| Journal article (top + end) | `ShareBlock` | Variable wording per content type (`plan` / `picks` / `editorial`). Native share API on mobile, copy-link fallback. Includes a newsletter CTA at the end variant. |
| Dispatch (`/whats-on/this-weekend/`) | `ShareBlock` | Same. Plan content type. |
| Dispatch archive (`/whats-on/this-weekend/archive/[slug]/`) | `ShareBlock` | Same. |
| Venue detail template | `ShareBlock` | Editorial content type. |
| Everywhere else | None | All cards, all landing pages, all place pages have no share affordance. |

## Wording variations to remove

The ShareBlock currently emits different copy depending on content type:
- "Send this plan" / "Share this weekend" (plan)
- "Send this list" / "Share these picks" (picks)
- "Send this" / "Share this" (editorial)

Standardise to: **Share** (icon, hover label "Share").

The end-of-article block also includes a newsletter CTA ("Get this every week →") which is good editorially but bloats the share surface. Move newsletter CTA out of ShareBlock into its own component if it should stay near the article foot.

## Placement inconsistencies

- VenueCard places SaveButton **bottom-left** of card actions
- EventCard places it **inside the actions row** but ordering varies
- Journal article SaveButton lives **at the top near the byline**
- ShareBlock has both a **top** and **end** placement on articles
- No share on cards
- No save on most card types

Phase 2 fixes this with three target classes: card-level (bottom-right), article-level (top + sticky), hero-level (none).

## Mobile-specific observations

- VenueCard.SaveButton is full-text "Save" pill on both mobile and desktop. On mobile it competes for touch space with "Read notes" / "Book" CTAs immediately adjacent.
- v2/SaveButton (article) is also a full-text pill. Awkward on narrow widths.
- ShareBlock's primary button is large on both viewports.
- None of the current saves have a thumb-zone consideration (bottom-right of card is ideal for thumb reach in a list view).

## Two stores → one merge plan

Wave 1 builds `pi:saves:v2`. Schema:

```ts
type SaveKind = 'article' | 'venue' | 'place' | 'event' | 'experience' | 'itinerary' | 'tour' | 'tour-operator' | 'tour-package';

interface SavedItem {
  kind: SaveKind;
  slug: string;
  section?: string;   // editorial section for articles
  title: string;
  dek?: string;
  image_url?: string;
  href: string;
  savedAt: number;
}

interface SavesV2Store {
  version: 2;
  items: SavedItem[];
}
```

Migration runs on first read after Wave 1 ships:

1. Read `localStorage["pi:saves:v2"]` — if exists, use it
2. Else, read `localStorage["pi:saved:v1"]` (venues + events) and `localStorage["pi:saved-articles:v1"]` (articles), merge into v2 shape, write v2, leave v1s in place (do not delete; allows rollback)
3. Three months from now, a separate cleanup commit deletes the legacy keys

The Supabase `pi.user_saves` table already covers `slug + section`. Wave 1 extends it to include a `kind` column (default `'article'` for existing rows) so the same table backs every kind.

## What ships in each Wave

- **Wave 1** Foundation: pi:saves:v2 local store, migration shim, single shared module `lib/saves/`. CloudSync extended to cover the new schema. No visible UI changes.
- **Wave 2** Card-level: `<PiSaveActions />` component (Save + Share icons, bottom-right of card). Tagged into every card listed above. Removes the old `<SaveButton />` from VenueCard + EventCard.
- **Wave 3** Article-level: replaces `v2/SaveButton.astro` and `ShareBlock.astro` with a unified `<PiArticleActions />` near the byline + sticky bottom-right on scroll past 30%.
- **Wave 4** Saved-plan view: `/account/saved/` rebuilt to group by kind, signed share-by-link.
- **Wave 5** Editorial templates fork-to-saves + PDF export.
