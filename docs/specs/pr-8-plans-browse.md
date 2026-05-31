# PR-8 · Plans Browse Hub

**Branch:** `feat/plans-browse`  
**Depends on:** PR-5 + PR-6 merged  
**Effort:** 3–4 days  
**Owner:** Developer

---

## Objective

Build the `/explore/plans/` hub as a fully functional editorial browse experience with a four-axis filter UI. Plans are itinerary-style articles (`section: 'plans'` in the articles schema) surfaced as scannable cards. The four filter axes are: occasion, duration, season, and peninsula area (region). No back-end search required — all filtering is client-side over a pre-rendered dataset.

---

## 1 · URL & Route

**Route:** `/explore/plans/` (created in PR-5 as a basic index — this PR builds the full hub)

**File:** `next/src/pages/explore/plans/index.astro` — replace the stub from PR-5 with the full implementation.

Individual plan articles continue to live at their existing journal slugs (`/journal/[slug]/`) — the plans hub is a filtered browse surface, not a separate URL for plan content.

> **Note:** If PR-7 has introduced `section: 'plans'` routing to `/explore/plans/[slug]/`, coordinate to ensure no double routing. Confirm with lead developer before implementing individual plan URL routing.

---

## 2 · Content Source

Plans are `articles` collection entries where `section === 'plans'`.

```ts
const plans = await getCollection('articles', a =>
  a.data.section === 'plans' && a.data.status === 'published'
);
```

Each plan card uses:
- `title` — plan name
- `dek` — subtitle/sell line
- `heroImage` — card image
- `planShape` — `'one-night' | 'two-night' | 'day-trip' | 'seasonal'` (maps to Duration axis)
- `tags.mood` — maps to Occasion axis
- `tags.season` — maps to Season axis
- `relatedPlaces` — derive peninsula area (region) by looking up `regionSlug` on each place

---

## 3 · Four-Axis Filter System

### Axis 1 — Occasion

Source: article `tags.mood` values

| Filter value | Label | Mood tags that match |
|---|---|---|
| `romantic` | Romantic | anniversary, romance, first-date, sunset |
| `family` | Family | family |
| `long-lunch` | Long Lunch | long-lunch, slow |
| `wellness` | Wellness | wellness |
| `adventure` | Adventure + Outdoors | walk, beach, outdoor, surf |
| `weekend-escape` | Weekend Escape | weekend-escape, cellar-door |

### Axis 2 — Duration

Source: article `planShape` field

| planShape value | Label |
|---|---|
| `day-trip` | Day trip |
| `one-night` | One night |
| `two-night` | Weekend |
| `seasonal` | Seasonal |

### Axis 3 — Season

Source: article `tags.season` values (or `dispatch.weather` for weekend-picker formats)

| Value | Label |
|---|---|
| `summer` | Summer |
| `autumn` | Autumn |
| `winter` | Winter |
| `spring` | Spring |
| `all-year` | Any time |

### Axis 4 — Peninsula Area (Region)

Source: derived from `relatedPlaces` → place `regionSlug`

| regionSlug | Label |
|---|---|
| `red-hill-wine-country` | Red Hill & Merricks |
| `peninsula-tip` | Sorrento & Portsea |
| `mornington-bay-coast` | Mornington & the Bay |
| `western-port` | Western Port |
| `ocean-coast` | Flinders & the Ocean Coast |

---

## 4 · Filter UI Implementation

### Architecture: server-side render + client-side filter

Render all plan cards server-side. Attach `data-*` attributes to each card from the four axes. Filter state is managed entirely client-side — no API calls, no route changes.

```astro
<!-- Plan card markup (simplified) -->
<article
  class="plan-card"
  data-occasion="romantic long-lunch"
  data-duration="two-night"
  data-season="autumn winter"
  data-region="red-hill-wine-country"
>
  <!-- card content -->
</article>
```

### Filter bar markup

```astro
<div class="plans-filter" role="search" aria-label="Filter plans">
  
  <!-- Occasion -->
  <fieldset>
    <legend>Occasion</legend>
    <label><input type="checkbox" name="occasion" value="romantic"> Romantic</label>
    <label><input type="checkbox" name="occasion" value="family"> Family</label>
    <label><input type="checkbox" name="occasion" value="long-lunch"> Long Lunch</label>
    <label><input type="checkbox" name="occasion" value="wellness"> Wellness</label>
    <label><input type="checkbox" name="occasion" value="adventure"> Adventure</label>
    <label><input type="checkbox" name="occasion" value="weekend-escape"> Weekend Escape</label>
  </fieldset>

  <!-- Duration -->
  <fieldset>
    <legend>Duration</legend>
    <label><input type="checkbox" name="duration" value="day-trip"> Day trip</label>
    <label><input type="checkbox" name="duration" value="one-night"> One night</label>
    <label><input type="checkbox" name="duration" value="two-night"> Weekend</label>
    <label><input type="checkbox" name="duration" value="seasonal"> Seasonal</label>
  </fieldset>

  <!-- Season -->
  <fieldset>
    <legend>Season</legend>
    <label><input type="checkbox" name="season" value="summer"> Summer</label>
    <label><input type="checkbox" name="season" value="autumn"> Autumn</label>
    <label><input type="checkbox" name="season" value="winter"> Winter</label>
    <label><input type="checkbox" name="season" value="spring"> Spring</label>
    <label><input type="checkbox" name="season" value="all-year"> Any time</label>
  </fieldset>

  <!-- Area -->
  <fieldset>
    <legend>Peninsula Area</legend>
    <label><input type="checkbox" name="region" value="red-hill-wine-country"> Red Hill & Merricks</label>
    <label><input type="checkbox" name="region" value="peninsula-tip"> Sorrento & Portsea</label>
    <label><input type="checkbox" name="region" value="mornington-bay-coast"> Mornington & the Bay</label>
    <label><input type="checkbox" name="region" value="western-port"> Western Port</label>
    <label><input type="checkbox" name="region" value="ocean-coast"> Flinders & the Ocean Coast</label>
  </fieldset>

  <button type="button" id="clear-filters">Clear all</button>
</div>
```

### Filter script

```js
// Inline <script> in explore/plans/index.astro
(function () {
  const cards = Array.from(document.querySelectorAll('.plan-card'));
  const filterBar = document.querySelector('.plans-filter');
  const countEl = document.getElementById('plans-count');

  function getActiveFilters() {
    const checked = Array.from(filterBar.querySelectorAll('input[type=checkbox]:checked'));
    const filters = { occasion: [], duration: [], season: [], region: [] };
    checked.forEach(input => {
      filters[input.name]?.push(input.value);
    });
    return filters;
  }

  function matches(card, filters) {
    return ['occasion', 'duration', 'season', 'region'].every(axis => {
      if (!filters[axis].length) return true; // no filter on this axis
      const cardValues = (card.dataset[axis] ?? '').split(' ');
      return filters[axis].some(v => cardValues.includes(v));
    });
  }

  function applyFilters() {
    const filters = getActiveFilters();
    let visible = 0;
    cards.forEach(card => {
      const show = matches(card, filters);
      card.hidden = !show;
      if (show) visible++;
    });
    if (countEl) countEl.textContent = `${visible} plan${visible !== 1 ? 's' : ''}`;
  }

  filterBar.addEventListener('change', applyFilters);
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    filterBar.querySelectorAll('input[type=checkbox]').forEach(i => (i.checked = false));
    applyFilters();
  });

  applyFilters(); // initial state
})();
```

---

## 5 · Plan Card Component

**File:** `next/src/components/PlanCard.astro` (create new, or extend existing ArticleCard if one exists)

```ts
---
interface Props {
  plan: CollectionEntry<'articles'>;
  regionLabel?: string;
}
---
```

**Card structure:**
```
PlanCard
├── Hero image (16:9, lazy loaded)
├── Occasion chip (from tags.mood[0])
├── Duration chip (from planShape)
├── Title (h2 or h3)
├── Dek
├── Region label (small grey)
└── "Read the plan →" link
```

---

## 6 · Itinerary `baseTowns` Enrichment

**File:** `next/src/content.config.ts` — itineraries collection

The existing `itineraries` collection may have a `baseTowns` field. If not, add:

```ts
// In itineraries schema
baseTowns: z.array(z.string()).optional(),
```

For any itinerary JSON files (if they exist), populate `baseTowns` with place slugs that the itinerary covers. This data feeds the region-area filter on the plans hub — itinerary-format plans use `baseTowns` rather than `relatedPlaces` to derive their region.

**Audit:**
```bash
ls next/src/content/itineraries/ 2>/dev/null || echo "No itineraries directory"
```

If the itineraries collection exists and has files, enrich `baseTowns` for each file and update the filter derivation logic accordingly.

---

## 7 · Hub Page Structure

```
/explore/plans/ — full page layout

├── Masthead (existing, section="explore")
│
├── Hub header
│   ├── Title: "Peninsula Plans"
│   └── Subtitle: "Every weekend sorted. Browse by occasion, duration, or where you want to be."
│
├── Results count: "24 plans" (updates live via JS)
│
├── Filter bar (left sidebar on desktop, drawer on mobile)
│   └── Four-axis filters (see section 4)
│
├── Plan card grid (right, main)
│   └── Responsive 2–3 column grid of PlanCard components
│
└── Footer (existing)
```

**Mobile layout:** Filter bar collapses into a "Filter plans" button that opens a bottom drawer. Filter state persists across open/close. Badge count on button shows number of active filters.

---

## 8 · URL State (Optional Enhancement)

If time allows, persist filter state to URL query params so filtered views are shareable:

```
/explore/plans/?occasion=romantic&duration=two-night&region=peninsula-tip
```

On page load, read query params and pre-check corresponding checkboxes before running `applyFilters()`. This is a nice-to-have, not a blocker.

---

## 9 · Acceptance Criteria

- [ ] `/explore/plans/` renders with all published `section: 'plans'` articles as cards
- [ ] Four filter axes present: Occasion, Duration, Season, Peninsula Area
- [ ] Selecting a filter hides non-matching cards instantly (no page reload)
- [ ] Multiple filters on same axis: OR logic (show if matches any)
- [ ] Filters across different axes: AND logic (must match all active axes)
- [ ] "Clear all" resets all filters and shows all cards
- [ ] Results count updates live as filters change
- [ ] Plan cards show: hero image, occasion chip, duration chip, title, dek, region label
- [ ] Mobile filter: collapsed behind button, opens as drawer
- [ ] `npx astro build` completes with no errors
- [ ] 301 redirect from `/plans/` → `/explore/plans/` confirmed working (PR-5)
- [ ] Itineraries `baseTowns` field added and populated if itineraries collection exists

---

## Dependencies

- **Requires:** PR-5 merged (`/explore/plans/` route exists), PR-6 merged (regions available for area filter)
- **Blocks:** Nothing directly (PR-9 search sync is parallel-capable)

---

*Spec version: 1.0 · 31 May 2026*
