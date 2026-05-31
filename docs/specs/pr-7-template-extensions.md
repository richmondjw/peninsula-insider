# PR-7 · Template Extensions

**Branch:** `feat/template-extensions`  
**Depends on:** PR-2 merged (parallel with PR-6)  
**Effort:** 3–4 days  
**Owner:** Developer

---

## Objective

Extend four existing templates to reflect the new IA: add the EstateCluster block to VenueDetailTemplate, add the region kicker and category sub-nav tabs to PlaceDetailTemplate, add place/estate context to the event template sidebar, and add region-aware breadcrumbs to the article template. No layout redesign — these are targeted additions to existing, well-functioning templates.

---

## 1 · VenueDetailTemplate — EstateCluster Block

**File:** `next/src/components/VenueDetailTemplate.astro`

### 1a — EstateCluster component

**File:** `next/src/components/EstateCluster.astro` (create new)

The EstateCluster block surfaces sibling venues within the same multi-venue estate. It appears below the hero/intro block on venue pages where `estateSlug` is set.

```ts
---
interface Props {
  estateSlug: string;
  estateLabel: string;
  currentVenueSlug: string;
  siblingVenues: CollectionEntry<'venues'>[];
}

const { estateSlug, estateLabel, currentVenueSlug, siblingVenues } = Astro.props;
const siblings = siblingVenues.filter(v => v.data.slug !== currentVenueSlug);
---
```

**Render structure:**

```
EstateCluster
│
├── Label: "Part of [estateLabel]" (small grey kicker)
├── Horizontal card strip of sibling venues (2–4 cards)
│   Each card: venue name · type chip · brief signature line · link
└── [View all at estateLabel] link → /eat/[estate-hub]/ or /wine/[estate-hub]/
```

**Design notes:**
- Use a contained, outlined card style — distinct from full venue cards
- This is a contextual block, not a hub feature
- Mobile: horizontal scroll
- Max display: 4 sibling venues (show "and X more" if > 4)

### 1b — Integration in VenueDetailTemplate

```ts
---
// In VenueDetailTemplate.astro, add after the hero block data loading:
import EstateCluster from './EstateCluster.astro';

// Load sibling venues if estateSlug is present
const estateSlug = venue.data.estateSlug;
let estateVenues: CollectionEntry<'venues'>[] = [];

if (estateSlug) {
  const allVenues = await getCollection('venues');
  estateVenues = allVenues.filter(v => v.data.estateSlug === estateSlug);
}
---
```

In template body, insert after the hero/intro section:

```astro
{estateSlug && (
  <EstateCluster
    estateSlug={estateSlug}
    estateLabel={venue.data.estateLabel ?? estateSlug}
    currentVenueSlug={venue.data.slug}
    siblingVenues={estateVenues}
  />
)}
```

### 1c — Breadcrumb update

Update breadcrumb in VenueDetailTemplate to reflect pillar routing:

```
Home → [Pillar] → [Place] → [Venue Name]

Examples:
Home → Eat & Drink → Sorrento → Laura
Home → Wine → Red Hill → Ten Minutes by Tractor
Home → Stay → Portsea → Portsea Hotel
```

Use `venueHrefPrefix(venue.data.type)` to derive the pillar link.

### 1d — `venueTier` gate on verdict block

The verdict/authority block should only render for venues with `venueTier === 'destination'`.

```astro
{venue.data.venueTier === 'destination' && venue.data.authority && (
  <AuthorityBlock authority={venue.data.authority} />
)}
```

For `recommended` and `directory` tier venues, the authority block is hidden. This is already handled by `authority` being optional — add the explicit tier gate so it's clear in code, and so future changes to tier don't inadvertently show verdict blocks.

---

## 2 · PlaceDetailTemplate — Region Kicker + Category Sub-Nav

**File:** `next/src/components/PlaceDetailTemplate.astro`

### 2a — Region kicker

Above the place name (h1), add a small region kicker if `regionSlug` is set:

```astro
{place.data.regionSlug && (
  <a href={`/explore/regions/${place.data.regionSlug}/`} class="region-kicker">
    {place.data.regionLabel ?? place.data.regionSlug}
  </a>
)}
<h1>{place.data.name}</h1>
```

**Style:** Small uppercase text, underline on hover, links to the region page. Establishes the geographic hierarchy visually.

### 2b — Category sub-nav tabs

After the intro paragraph, before the venue grid, add a client-side filter tab row:

```
[ All ]  [ Eat & Drink ]  [ Stay ]  [ Wine ]  [ Experiences ]
```

Implementation mirrors the approach in RegionDetailTemplate (PR-6). Use `data-pillar` attributes on venue/experience cards and an inline `<script>` for tab state:

```astro
<div class="category-tabs" role="tablist">
  <button data-tab="all" class="tab-btn active" role="tab">All</button>
  <button data-tab="eat" class="tab-btn" role="tab">Eat & Drink</button>
  <button data-tab="stay" class="tab-btn" role="tab">Stay</button>
  <button data-tab="wine" class="tab-btn" role="tab">Wine</button>
  <button data-tab="experiences" class="tab-btn" role="tab">Experiences</button>
</div>

<!-- Venue cards rendered with data-pillar attribute -->
<!-- Experience cards rendered with data-pillar="experiences" -->

<script>
  // Same pattern as RegionDetailTemplate — tab filter logic
</script>
```

### 2c — Breadcrumb update

```
Home → Explore → Places → [Place Name]
```

Update the existing breadcrumb component call in PlaceDetailTemplate to use the new URL structure:

```astro
<Breadcrumb items={[
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore/' },
  { label: 'Places', href: '/explore/places/' },
  { label: place.data.name },
]} />
```

---

## 3 · Event Template — Place & Estate Context in Sidebar

**File:** `next/src/pages/whats-on/[slug].astro`

### 3a — Place link in sidebar

The event template currently surfaces venue information. Add a place link when the event's venue has a `place` reference:

```astro
{eventVenue?.data.place && (
  <div class="sidebar-item">
    <span class="sidebar-label">Location</span>
    <a href={`/explore/places/${eventVenue.data.place.id}/`}>
      {placeLabel(eventVenue.data.place.id)}
    </a>
  </div>
)}
```

### 3b — Estate context in "Hosted at"

When the venue has an `estateSlug`, modify the "Hosted at" sidebar row to include the estate context:

```astro
<div class="sidebar-item">
  <span class="sidebar-label">Hosted at</span>
  <a href={venueHref}>{eventVenue.data.name}</a>
  {eventVenue.data.estateLabel && (
    <span class="sidebar-sub">Part of {eventVenue.data.estateLabel}</span>
  )}
</div>
```

---

## 4 · Article Template — Region-Aware Breadcrumbs

**File:** `next/src/pages/journal/[slug].astro`

For articles with format `'hub-guide'` or `'service'` that have `relatedPlaces` set, add a region-aware breadcrumb.

**Logic:**
1. If `article.data.relatedPlaces` has exactly one place, and that place has a `regionSlug`, show:
   `Home → [Region Name] → [Place Name] → [Article Title]`
2. If multiple places from the same region, show:
   `Home → [Region Name] → [Article Title]`
3. Otherwise fall back to standard:
   `Home → Journal → [Article Title]`

```ts
// In journal/[slug].astro frontmatter
const breadcrumbItems = (() => {
  const places = article.data.relatedPlaces ?? [];
  const base = [{ label: 'Home', href: '/' }];
  
  if (places.length === 1) {
    const place = resolvedPlaces[0]; // pre-fetched
    if (place?.data.regionSlug) {
      return [
        ...base,
        { label: place.data.regionLabel ?? place.data.regionSlug, href: `/explore/regions/${place.data.regionSlug}/` },
        { label: place.data.name, href: `/explore/places/${place.data.slug}/` },
        { label: article.data.title },
      ];
    }
  }
  // fallback
  return [...base, { label: 'Journal', href: '/journal/' }, { label: article.data.title }];
})();
```

Only apply to formats: `'hub-guide'`, `'service'`, `'venue-guide'`, `'trail-guide'`. Other formats (editors-letter, long-lunch-list etc.) keep their existing breadcrumb.

---

## 5 · Shared Breadcrumb Component

If a `Breadcrumb.astro` component doesn't already exist, create one:

**File:** `next/src/components/Breadcrumb.astro`

```ts
---
interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface Props {
  items: BreadcrumbItem[];
}
const { items } = Astro.props;
---

<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    {items.map((item, i) => (
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        {item.href
          ? <a itemprop="item" href={item.href}><span itemprop="name">{item.label}</span></a>
          : <span itemprop="name">{item.label}</span>
        }
        <meta itemprop="position" content={String(i + 1)} />
      </li>
    ))}
  </ol>
</nav>
```

This implements `BreadcrumbList` schema markup — useful for AI overviews and rich results.

---

## 6 · Acceptance Criteria

### VenueDetailTemplate
- [ ] `EstateCluster.astro` component created
- [ ] EstateCluster renders on venue pages with `estateSlug` set (test with Point Leo Estate venues)
- [ ] EstateCluster does **not** render on venues without `estateSlug`
- [ ] Venue breadcrumb: `Home → [Pillar] → [Place] → [Venue]`
- [ ] Authority/verdict block hidden for `venueTier === 'recommended'` and `'directory'` venues

### PlaceDetailTemplate
- [ ] Region kicker renders above h1 when `regionSlug` is set, links to correct region page
- [ ] Category tabs filter venue grid client-side — no page reload
- [ ] Tabs: All, Eat & Drink, Stay, Wine, Experiences
- [ ] Place breadcrumb: `Home → Explore → Places → [Place]` (updated URLs)

### Event Template
- [ ] Place link present in sidebar when venue has place reference
- [ ] Estate context line present when venue has `estateLabel`

### Article Template
- [ ] Region-aware breadcrumb renders for hub-guide, service, venue-guide, trail-guide formats with single-place relatedPlaces
- [ ] Fallback breadcrumb for other formats unchanged

### Shared
- [ ] `Breadcrumb.astro` component created with `BreadcrumbList` JSON-LD markup
- [ ] `npx astro check` passes across all modified templates

---

## Dependencies

- **Requires:** PR-2 merged (`estateSlug`, `venueTier`, `regionSlug` fields in schema)
- **Parallel with:** PR-6 (no file overlap)
- **Blocks:** Nothing directly

---

*Spec version: 1.0 · 31 May 2026*
