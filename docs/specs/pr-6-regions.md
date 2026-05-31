# PR-6 · Regions Collection & Template

**Branch:** `feat/regions`  
**Depends on:** PR-5 merged  
**Effort:** 1 week  
**Owner:** Developer

---

## Objective

Introduce `regions` as a new Astro content collection with 5 JSON files, build the `RegionDetailTemplate` component, create the `/explore/regions/[slug]` route, implement `TouristDestination` JSON-LD, and seed the Supabase `regions` table. Regions are the second tier of the geographic hierarchy — above places, below the Peninsula itself — and are the primary surface for editorial depth, AI discoverability, and cross-pillar content aggregation.

---

## 1 · Content Schema

**File:** `next/src/content.config.ts`

Add a new `regions` collection after the `places` collection:

```ts
const regions = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/regions' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    
    /** One-line editorial tagline. Used as SEO meta description. */
    tagline: z.string().optional(),
    
    /** Editorial introduction paragraph. 80–120 words. */
    intro: z.string(),
    
    heroImage: imageRef,
    
    /** The 7-value zone enum values that fall within this region. */
    zones: z.array(zone),
    
    /** Place slugs within this region — references to places collection. */
    places: z.array(reference('places')),
    
    /** Slugs of adjacent regions for cross-linking in the template footer. */
    adjacentRegions: z.array(z.string()).default([]),
    
    /** Geographic centroid for map rendering and JSON-LD. Optional. */
    coordinates: coordinates.optional(),
    
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});
```

Add `regions` to the `export const collections` object at the bottom of `content.config.ts`.

---

## 2 · Region JSON Files

**Directory:** `next/src/content/regions/` (create this directory)

Create 5 JSON files, one per confirmed region:

### `red-hill-wine-country.json`
```json
{
  "slug": "red-hill-wine-country",
  "name": "Red Hill & Merricks",
  "tagline": "The Peninsula's wine heartland — cool-climate pinot, long lunches, and unhurried cellar doors.",
  "intro": "Red Hill and Merricks form the Peninsula's most celebrated wine corridor. The ridge sits 300 metres above sea level, catching the cool Bass Strait air that defines the region's pinot noir and chardonnay. This is not a drive-through wine region — it rewards slow movement. Cellar doors range from the architecturally ambitious (Point Leo, Jackalope) to the quietly exceptional (Stonier, Ten Minutes by Tractor). Between tastings, the farmers markets, providores, and destination restaurants make Red Hill one of the most coherent food-and-wine precincts in Victoria.",
  "heroImage": {
    "src": "/images/sourced/region-red-hill-01.webp",
    "alt": "Morning light across Red Hill's vineyard rows, Mornington Peninsula",
    "license": "tmp-unsplash"
  },
  "zones": ["red-hill", "hinterland"],
  "places": ["red-hill", "main-ridge", "merricks", "merricks-beach", "merricks-north", "balnarring"],
  "adjacentRegions": ["mornington-bay-coast", "ocean-coast"],
  "coordinates": { "lat": -38.385, "lng": 145.015 },
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

### `peninsula-tip.json`
```json
{
  "slug": "peninsula-tip",
  "name": "Sorrento & Portsea",
  "tagline": "Limestone cliffs, ocean baths, the Heads ferry — the Peninsula's most iconic edge.",
  "intro": "The tip of the Mornington Peninsula is where the land narrows to a point and the social temperature rises. Sorrento and Portsea have been Melbourne's summer escape for generations — limestone cliffs above the bay, ocean baths carved into back-beach rock, the ferry to Queenscliff cutting across the Heads. The dining scene has quietly become something worth driving for year-round. Come in the off-season and the towns reveal their best selves: quieter, more local, more honest. The back beach at dusk is one of the best things on the Peninsula.",
  "heroImage": {
    "src": "/images/sourced/region-peninsula-tip-01.webp",
    "alt": "Limestone cliffs and calm bay water at Sorrento, Mornington Peninsula",
    "license": "tmp-unsplash"
  },
  "zones": ["peninsula-tip"],
  "places": ["sorrento", "portsea", "blairgowrie", "rye", "fingal"],
  "adjacentRegions": ["ocean-coast", "mornington-bay-coast"],
  "coordinates": { "lat": -38.34, "lng": 144.74 },
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

### `mornington-bay-coast.json`
```json
{
  "slug": "mornington-bay-coast",
  "name": "Mornington & the Bay",
  "tagline": "The Peninsula's urban edge — the main street dining strip, the bay beaches, and the easy weekend gateway.",
  "intro": "Mornington is the Peninsula's largest town and its most accessible gateway. The main street dining strip punches above its weight, the bay beaches stretch from Mount Eliza to Dromana, and the Saturday morning market is a Peninsula institution. This is where the Peninsula starts — the transition from Melbourne's suburbs to something genuinely different. Mount Martha's elevated bay views and the Dromana hillside are the scenic punctuation marks. For first-timers, this is the entry point. For regulars, it's often overlooked in favour of the tip or the ridge — a mistake.",
  "heroImage": {
    "src": "/images/sourced/region-mornington-01.webp",
    "alt": "Mornington main street on a clear autumn morning",
    "license": "tmp-unsplash"
  },
  "zones": ["mornington", "bay-coast"],
  "places": ["mornington", "mount-martha", "safety-beach", "mccrae", "dromana", "rosebud", "capel-sound", "mount-eliza"],
  "adjacentRegions": ["red-hill-wine-country", "western-port"],
  "coordinates": { "lat": -38.22, "lng": 145.04 },
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

### `western-port.json`
```json
{
  "slug": "western-port",
  "name": "Western Port",
  "tagline": "The quieter side — mangroves, French Island ferries, and a genuinely local pace of life.",
  "intro": "Western Port is the Peninsula's other shore — the protected bay side where the water is calmer, the towns are more working than weekending, and the landscape shifts to mangrove and tidal flat. Hastings is the hub, with French Island ferry access and a working harbour that feels a world away from Sorrento. This is the Peninsula for locals and those who have graduated beyond the obvious. The birding is exceptional, the fishing is serious, and the absence of tourists is, for many, the entire point.",
  "heroImage": {
    "src": "/images/sourced/region-western-port-01.webp",
    "alt": "Calm tidal waters at Western Port Bay, Mornington Peninsula",
    "license": "tmp-unsplash"
  },
  "zones": ["western-port"],
  "places": ["hastings", "bittern", "crib-point", "boneo"],
  "adjacentRegions": ["mornington-bay-coast"],
  "coordinates": { "lat": -38.30, "lng": 145.20 },
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

### `ocean-coast.json`
```json
{
  "slug": "ocean-coast",
  "name": "Flinders & the Ocean Coast",
  "tagline": "Wild surf beaches, the best pub on the Peninsula, and a rural quiet that feels hard-won.",
  "intro": "The ocean coast runs along the Peninsula's south-facing edge, where Bass Strait swells arrive unimpeded and the light has a particular quality in the afternoon. Flinders is the anchor — an extraordinary village that manages to be a serious food-and-wine destination while remaining genuinely unspoiled. Cape Schanck marks the south-west corner with its lighthouse and coastal boardwalk. The ocean beach walking here is among the best in Victoria. Fewer people come this way, which remains one of the coast's distinguishing features.",
  "heroImage": {
    "src": "/images/sourced/region-ocean-coast-01.webp",
    "alt": "Surf breaking on the ocean beach near Flinders, Mornington Peninsula",
    "license": "tmp-unsplash"
  },
  "zones": ["ocean-coast"],
  "places": ["flinders", "cape-schanck", "rye", "fingal"],
  "adjacentRegions": ["red-hill-wine-country", "peninsula-tip"],
  "coordinates": { "lat": -38.49, "lng": 144.97 },
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

---

## 3 · Region Detail Template

**File:** `next/src/components/RegionDetailTemplate.astro` (create new)

### Component structure

```
RegionDetailTemplate
│
├── Hero
│   └── Full-bleed heroImage · region name overlay · tagline
│
├── Breadcrumb
│   └── Home → Explore → Regions → [Region Name]
│
├── Editorial Header
│   └── name (h1) · intro paragraph
│
├── Places Strip
│   └── Horizontal scroll rail of place cards (PlaceCard component)
│       Filtered to places[] from region JSON
│
├── Category Tabs (client-side filter, no full-page reload)
│   └── All · Eat & Drink · Stay · Wine · Experiences
│       Tab click filters the venue grid below
│
├── Venue Grid
│   └── VenueCard grid, filtered by region → places → venues
│       Rendered server-side, tab state managed client-side via data attributes
│
├── Journal Picks
│   └── 2–3 articles where relatedPlaces includes any place in this region
│
├── Adjacent Regions Strip
│   └── Small cards: region name + tagline, link to /explore/regions/[slug]
│
└── Footer / Schema
    └── TouristDestination JSON-LD (see section 4)
```

### Props interface

```ts
interface Props {
  region: CollectionEntry<'regions'>;
  places: CollectionEntry<'places'>[];
  venues: CollectionEntry<'venues'>[];
  articles: CollectionEntry<'articles'>[];
  adjacentRegionData: CollectionEntry<'regions'>[];
}
```

### Category tab implementation

Use `data-venue-type` attributes on venue cards and a lightweight `<script>` for tab filtering:

```html
<!-- Tab buttons -->
<button data-tab="all" class="tab active">All</button>
<button data-tab="eat" class="tab">Eat & Drink</button>
<button data-tab="stay" class="tab">Stay</button>
<button data-tab="wine" class="tab">Wine</button>
<button data-tab="experiences" class="tab">Experiences</button>

<!-- Venue cards get data attribute from server-rendered pillar -->
<div class="venue-card" data-pillar="eat">...</div>
```

```js
// Inline <script> in the component
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('[data-pillar]').forEach(card => {
      card.hidden = tab !== 'all' && card.dataset.pillar !== tab;
    });
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
  });
});
```

---

## 4 · Route Page

**File:** `next/src/pages/explore/regions/[slug].astro` (create new, ensure `explore/regions/` directory exists)

```ts
---
import { getCollection, getEntry } from 'astro:content';
import RegionDetailTemplate from '../../../components/RegionDetailTemplate.astro';
import { eatTypes, stayTypes, wineTypes } from '../../../lib/editorial';

export async function getStaticPaths() {
  const regions = await getCollection('regions', r => !r.data.sitemapExclude);
  return regions.map(region => ({ params: { slug: region.data.slug } }));
}

const { slug } = Astro.params;
const region = await getEntry('regions', slug);
if (!region) return Astro.redirect('/explore/regions/', 302);

// Load all places in this region
const allPlaces = await getCollection('places');
const regionPlaces = allPlaces.filter(p => region.data.places.some(ref => ref.id === p.id));
const placeSlugs = new Set(regionPlaces.map(p => p.data.slug));

// Load all venues in region places
const allVenues = await getCollection('venues', v => v.data.status !== 'permanently_closed');
const regionVenues = allVenues.filter(v => placeSlugs.has(String(v.data.place?.id ?? '')));

// Load adjacent regions
const allRegions = await getCollection('regions');
const adjacentRegionData = allRegions.filter(r =>
  region.data.adjacentRegions.includes(r.data.slug)
);

// Load related articles
const allArticles = await getCollection('articles', a => a.data.status === 'published');
const regionArticles = allArticles.filter(a =>
  a.data.relatedPlaces?.some(ref => placeSlugs.has(String(ref.id ?? '')))
).slice(0, 3);
---

<RegionDetailTemplate
  region={region}
  places={regionPlaces}
  venues={regionVenues}
  articles={regionArticles}
  adjacentRegionData={adjacentRegionData}
/>
```

---

## 5 · Regions Index Page

**File:** `next/src/pages/explore/regions/index.astro` (create new)

A simple grid of 5 region cards. Each card: hero image, region name, tagline, link to detail page.

---

## 6 · TouristDestination JSON-LD

Add in `RegionDetailTemplate.astro` `<head>` or `<script type="application/ld+json">`:

```json
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "[region.name]",
  "description": "[region.intro — first sentence or tagline]",
  "url": "https://peninsulainsider.com.au/explore/regions/[region.slug]/",
  "image": "[region.heroImage.src — full absolute URL]",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[region.coordinates.lat]",
    "longitude": "[region.coordinates.lng]"
  },
  "containsPlace": [
    // One entry per place in region.places
    {
      "@type": "Place",
      "name": "[place.name]",
      "url": "https://peninsulainsider.com.au/explore/places/[place.slug]/"
    }
  ],
  "touristType": ["Couples", "Families", "Food and wine lovers", "Weekend travellers"],
  "isLocatedIn": {
    "@type": "AdministrativeArea",
    "name": "Mornington Peninsula",
    "addressRegion": "VIC",
    "addressCountry": "AU"
  }
}
```

---

## 7 · Supabase — Regions Table

**Migration file:** `ops/migrations/2026-06-XX-pi-regions.sql`

```sql
-- PR-6: Regions table
BEGIN;

CREATE TABLE IF NOT EXISTS pi.regions (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  tagline       TEXT,
  intro         TEXT,
  hero_image    JSONB,
  zones         TEXT[] NOT NULL DEFAULT '{}',
  place_slugs   TEXT[] NOT NULL DEFAULT '{}',
  coordinates   JSONB,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Content registry entries for regions
INSERT INTO pi.content_registry (slug, entity_type, pillar, href, title, priority)
  VALUES
    ('red-hill-wine-country', 'region', 'explore', '/explore/regions/red-hill-wine-country/', 'Red Hill & Merricks', 90),
    ('peninsula-tip',         'region', 'explore', '/explore/regions/peninsula-tip/',         'Sorrento & Portsea',  90),
    ('mornington-bay-coast',  'region', 'explore', '/explore/regions/mornington-bay-coast/',  'Mornington & the Bay',90),
    ('western-port',          'region', 'explore', '/explore/regions/western-port/',          'Western Port',        90),
    ('ocean-coast',           'region', 'explore', '/explore/regions/ocean-coast/',           'Flinders & the Ocean Coast', 90)
  ON CONFLICT (slug) DO UPDATE SET
    href = EXCLUDED.href,
    title = EXCLUDED.title,
    priority = EXCLUDED.priority;

-- Seed initial region data
INSERT INTO pi.regions (slug, name, tagline, zones, place_slugs, published_at) VALUES
  ('red-hill-wine-country', 'Red Hill & Merricks', 'The Peninsula''s wine heartland', ARRAY['red-hill','hinterland'], ARRAY['red-hill','main-ridge','merricks','merricks-beach','merricks-north','balnarring'], NOW()),
  ('peninsula-tip', 'Sorrento & Portsea', 'Limestone cliffs, ocean baths, the Heads ferry', ARRAY['peninsula-tip'], ARRAY['sorrento','portsea','blairgowrie','rye','fingal'], NOW()),
  ('mornington-bay-coast', 'Mornington & the Bay', 'The Peninsula''s urban edge', ARRAY['mornington','bay-coast'], ARRAY['mornington','mount-martha','safety-beach','mccrae','dromana','rosebud','capel-sound','mount-eliza'], NOW()),
  ('western-port', 'Western Port', 'The quieter side', ARRAY['western-port'], ARRAY['hastings','bittern','crib-point','boneo'], NOW()),
  ('ocean-coast', 'Flinders & the Ocean Coast', 'Wild surf beaches, the best pub on the Peninsula', ARRAY['ocean-coast'], ARRAY['flinders','cape-schanck','rye','fingal'], NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;
```

---

## 8 · v4-nav.ts Regions Link

**File:** `next/src/lib/v4-nav.ts`

Add Regions link to the Explore pillar mega panel:

```ts
{ key: 'regions', label: 'Regions', href: '/explore/regions/' },
```

---

## 9 · Acceptance Criteria

- [ ] `regions` collection defined in `content.config.ts`, `npx astro check` passes
- [ ] 5 region JSON files exist and pass schema validation
- [ ] All 5 region detail pages render at `/explore/regions/[slug]/`
- [ ] Regions index renders at `/explore/regions/`
- [ ] RegionDetailTemplate shows: hero, intro, places strip, category tabs, venue grid, journal picks, adjacent regions
- [ ] Category tab filtering works client-side with no full-page reload
- [ ] TouristDestination JSON-LD present in page source for all 5 region pages
- [ ] Supabase `pi.regions` table created and seeded with 5 rows
- [ ] Content registry contains 5 region entries with `entity_type = 'region'`
- [ ] v4-nav.ts Explore pillar includes Regions link

---

## Dependencies

- **Requires:** PR-5 merged (places at new `/explore/places/` URLs — region template links to them)
- **Parallel with:** PR-7 (template extensions — no overlap)
- **Blocks:** PR-8 (Plans Browse needs regions for area filter)

---

*Spec version: 1.0 · 31 May 2026*
