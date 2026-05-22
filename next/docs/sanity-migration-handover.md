# Peninsula Insider — Sanity CMS Integration Handover

*Last updated: 2026-05-22. Commits: phases 7–11 + component cleanup (`78bd5ce614` and prior).*

---

## What this document covers

The Peninsula Insider frontend is an **Astro 5 static site** (`output: 'static'`, deployed to Vercel). Its content was originally stored as JSON/MDX files inside `next/src/content/` — Astro's built-in content collections. Over a series of migration phases (7–11 plus component cleanup), all entities managed in **Sanity CMS** were switched from file-based `getCollection()` calls to direct Sanity CDN bulk-fetch adapters at build time.

This document describes the resulting architecture: how data flows from Sanity into the build, what the adapter layer looks like, which collections are Sanity-backed vs still file-based, and how to work with the system going forward.

---

## Architecture overview

```
Sanity Studio (a062b30n / production)
        │
        │  GROQ queries (CDN-cached, build-time)
        ▼
next/src/lib/sanity/
  ├── client.ts          — sanityClient (CDN), sanityPreviewClient (drafts + stega)
  ├── queries.ts         — typed GROQ query strings, one per entity type
  ├── venue-adapter.ts   — fetchAllVenuesFromSanity(), fetchVenueFromSanity()
  ├── place-adapter.ts   — fetchAllPlacesFromSanity(), fetchPlaceFromSanity()
  ├── itinerary-adapter.ts — fetchAllItinerariesFromSanity(), fetchItineraryFromSanity()
  ├── event-adapter.ts   — fetchAllEventsFromSanity(), fetchEventFromSanity()
  └── phase5-adapters.ts — experiences, tours, tour operators, tour packages
        │
        │  Called inside getStaticPaths() or component frontmatter
        ▼
Astro pages & components
        │
        │  prerender = true  →  static HTML at build time
        ▼
Vercel CDN (peninsulainsider.com.au)
```

All Sanity fetches happen **at build time only**. The deployed site has zero runtime Sanity calls on the public pages (preview mode is the sole exception — it runs SSR inside Sanity Studio's Presentation iframe).

---

## The Sanity client (`client.ts`)

**Project:** `a062b30n` | **Dataset:** `production` | **API version:** `2025-01-01`

Three clients are exported:

| Client | Used for | CDN | Perspective | Stega |
|---|---|---|---|---|
| `sanityClient` | All build-time fetches | Yes | `published` | Disabled |
| `sanityPreviewClient` | Preview SSR routes only | No | `drafts` | Enabled |
| `getSanityReadClient(preview?)` | Convenience helper | — | Switches on flag | — |

Stega (invisible Unicode markers for Studio overlay binding) is **disabled on the production client** — it was found to corrupt `background-image: url(...)` CSS values, causing 404s on image assets. Components bind to the CMS editor via explicit `data-pi-edit` attributes instead.

Environment variables required:
- `SANITY_READ_TOKEN` — read-only token, used by the production client
- `SANITY_PREVIEW_TOKEN` — preview token with draft access, used by the preview client

---

## Adapter pattern

Every Sanity-backed entity follows the same contract:

```ts
// Adapted shape — what components receive
interface AdaptedFoo {
  id: string;       // = slug (for routeSlug() compatibility)
  slug: string;
  data: {
    slug: string;
    name: string;         // or title for itineraries/events
    publishedAt: Date;
    sitemapExclude: boolean;
    // ... entity-specific fields
  };
}

// Bulk fetch — used in getStaticPaths / component bodies
export async function fetchAllFoosFromSanity(): Promise<AdaptedFoo[]>

// Single fetch — used in preview mode
export async function fetchFooFromSanity(slug: string): Promise<AdaptedFoo | null>
```

The adapted shape deliberately mirrors the shape Astro's `getCollection()` returns (`{ id, slug, data }`) so that `routeSlug()` and all existing component props work without change.

### GROQ conventions in `queries.ts`

- All list queries exclude drafts: `!(_id in path("drafts.**"))`
- Events additionally exclude archived: `status != "archived"`
- Default sort is `order(name asc)` for venues/places, `order(publishedAt desc)` for articles/itineraries, `order(startDate asc)` for events
- Image projection is shared across all queries: resolves `asset->` with `metadata.lqip` and `metadata.dimensions`
- Place is always resolved inline as `place-> { _id, name, "slug": slug.current, kind, zone }` — never left as a raw reference

---

## Adapter files

### `venue-adapter.ts`
Exports: `fetchAllVenuesFromSanity()`, `fetchAllVenueSlugsFromSanity()`, `fetchVenueFromSanity(slug, opts?)`

Venue is the most complex adapter. Key fields mapped: `name`, `type`, `place` (resolved to `{ id, name }`), `coordinates`, `address`, `phone`, `website`, `bookingUrl`, `heroImage`, `gallery`, `tags`, `dogFriendly`, `editorPick`, `featuredPartner`, `lastFactVerified`, `publishedAt`, `sitemapExclude`, `status`.

### `place-adapter.ts`
Exports: `fetchAllPlacesFromSanity()`, `fetchPlaceFromSanity(slug)`

Places are towns/suburbs on the Peninsula. Key fields: `name`, `slug`, `kind`, `zone`, `coordinates`, `description`, `heroImage`, `sitemapExclude`.

### `itinerary-adapter.ts`
Exports: `fetchAllItinerariesFromSanity()`, `fetchItineraryFromSanity(slug)`

Key fields: `title`, `slug`, `subtitle`, `lengthNights`, `stops` (array with `venue.id` refs), `heroImage`, `publishedAt`, `sitemapExclude`.

### `event-adapter.ts`
Exports: `fetchAllEventsFromSanity()`, `fetchEventFromSanity(slug)`

Key fields: `title`, `slug`, `summary`, `category`, `startDate` (Date), `endDate` (Date), `recurrence` (`one-off|weekly|monthly|ongoing|seasonal`), `venue` (resolved ref), `place` (resolved ref), `coordinates`, `visitorAppealScore`, `publishedAt`, `sitemapExclude`.

### `phase5-adapters.ts`
Exports for four entity types:

| Entity | Bulk fetch | Single fetch |
|---|---|---|
| Experiences | `fetchAllExperiencesFromSanity()` | `fetchExperienceFromSanity(slug)` |
| Tours | `fetchAllToursFromSanity()` | `fetchTourFromSanity(slug)` |
| Tour operators | `fetchAllTourOperatorsFromSanity()` | `fetchTourOperatorFromSanity(slug)` |
| Tour packages | `fetchAllTourPackagesFromSanity()` | `fetchTourPackageFromSanity(slug)` |

---

## Build patterns

### Pattern 1 — filtered index pages (most common)

Simple pages that display a filtered subset of one entity. Fetch once, filter in the frontmatter:

```ts
// eat/bakeries.astro
import { fetchAllVenuesFromSanity } from '../../lib/sanity/venue-adapter';

const allVenues = await fetchAllVenuesFromSanity();
const venues = allVenues
  .filter(v => v.data.type === 'bakery')
  .filter(v => v.data.status !== 'permanently_closed')
  .sort((a, b) => (a.data.name ?? '').localeCompare(b.data.name ?? ''));
```

### Pattern 2 — `getStaticPaths` with sharedProps (detail pages)

Dynamic `[slug].astro` pages. All shared entity data is fetched once in `getStaticPaths` and spread to every path's props. This means Sanity is called **once per entity type per build**, not once per page.

```ts
// eat/[slug].astro
export async function getStaticPaths() {
  const [allVenues, allItineraries, allEvents] = await Promise.all([
    fetchAllVenuesFromSanity(),
    fetchAllItinerariesFromSanity(),
    fetchAllEventsFromSanity(),
  ]);
  const eatVenues = allVenues.filter(v => eatTypes.includes(v.data.type));
  return eatVenues.map(venue => ({
    params: { slug: venue.slug },
    props: { venue, related, allItineraries, allEvents },  // shared corpus in every prop
  }));
}

// Component body filters from props — no further Sanity calls
let { venue, related, allItineraries, allEvents } = Astro.props as any;
const itineraries = allItineraries
  .filter(i => i.data.stops.some(s => String(s.venue?.id ?? s.venue ?? '') === slug))
  .slice(0, 2);
```

Pages using this pattern: `eat/[slug]`, `wine/[slug]`, `stay/[slug]`, `plans/[slug]`, `places/[slug]`, `journal/[slug]`, `explore/[slug]`.

### Pattern 3 — parallel fetch for unrelated collections

Pages that need multiple entities fetch them concurrently:

```ts
const [venues, events] = await Promise.all([
  fetchAllVenuesFromSanity(),
  fetchAllEventsFromSanity(),
]);
```

### Pattern 4 — preview mode override

Venue detail pages support live preview inside Sanity Studio's Presentation iframe. After receiving `venue` from `getStaticPaths` props, the body checks for preview mode and re-fetches the draft version:

```ts
const previewMode = (Astro.locals as any).sanityPreview === true;
if (previewMode) {
  const previewVenue = await fetchVenueFromSanity(slug, { preview: true });
  if (previewVenue) venue = previewVenue;
}
```

---

## What is Sanity-backed vs file-based

### Sanity-backed (fetched via adapters — no files authoritative)

| Entity | Adapter | File count in `content/` |
|---|---|---|
| Venues | `venue-adapter.ts` | 182 (legacy, read by nothing) |
| Places | `place-adapter.ts` | 37 (legacy) |
| Itineraries | `itinerary-adapter.ts` | 6 (legacy) |
| Events | `event-adapter.ts` | 91 (legacy) |
| Experiences | `phase5-adapters.ts` | 45 (legacy) |
| Tours | `phase5-adapters.ts` | 18 (legacy) |
| Tour operators | `phase5-adapters.ts` | 17 (legacy) |
| Tour packages | `phase5-adapters.ts` | 8 (legacy) |

> **Important:** The JSON files in `next/src/content/venues/`, `places/`, `events/` etc. are now legacy artefacts. Nothing in the build reads them. Sanity Studio is the single source of truth for these entities. The files can be archived or deleted once you are confident the Sanity dataset is complete and correct.

### File-based (Astro content collections — files are authoritative)

| Collection | Directory | Format | Notes |
|---|---|---|---|
| `articles` | `content/articles/` | MDX | 179 editorial articles, journal dispatches, PTW |
| `fishingCharters` | `content/fishing-charters/` | JSON | 4 entries |
| `species` | `content/species/` | JSON | 12 species |
| `fishingLocations` | `content/fishing-locations/` | JSON | — |
| `boatRamps` | `content/boat-ramps/` | JSON | 6 entries |
| `boatHire` | `content/boat-hire/` | JSON | 1 entry |
| `quickNotes` | `content/quick-notes/` | — | Time-limited editorial notes |
| `weekend-picks` | `content/weekend-picks/` | — | PTW curation JSON |
| `signature-events` | `content/signature-events/` | — | Recurring flagship events |
| `localSecrets` | `content/local-secrets/` | — | Journal sub-collection |
| `insidersThirty` | `content/insiders-thirty/` | — | The Insider's 30 lists |

These collections are **not in Sanity** and are not expected to be. They are managed as files in the repo. `articles` (MDX) in particular is large, complex, and has its own editorial pipeline — it stays file-based intentionally.

---

## Import paths quick reference

From a page in `src/pages/foo/bar.astro`:
```ts
import { fetchAllVenuesFromSanity } from '../../lib/sanity/venue-adapter';
import { fetchAllPlacesFromSanity } from '../../lib/sanity/place-adapter';
import { fetchAllItinerariesFromSanity } from '../../lib/sanity/itinerary-adapter';
import { fetchAllEventsFromSanity } from '../../lib/sanity/event-adapter';
import { fetchAllExperiencesFromSanity } from '../../lib/sanity/phase5-adapters';
import { fetchAllToursFromSanity } from '../../lib/sanity/phase5-adapters';
```

From a component in `src/components/foo/Bar.astro`:
```ts
import { fetchAllVenuesFromSanity } from '../../lib/sanity/venue-adapter';
// (depth varies — adjust ../ prefix to reach src/lib/)
```

---

## Adding a new Sanity-backed entity

1. **Define the GROQ query** in `queries.ts` — a list query (`allFoosQuery`) and a by-slug query (`fooBySlugQuery`). Exclude drafts with `!(_id in path("drafts.**"))`.

2. **Write the adapter** in a new `foo-adapter.ts` (or add to `phase5-adapters.ts` for tour-adjacent types). Export `fetchAllFoosFromSanity()` and `fetchFooFromSanity(slug)`. Adapt the Sanity document shape to `{ id: slug, slug, data: { slug, publishedAt: Date, sitemapExclude: boolean, ...fields } }`.

3. **Create the detail page** at `src/pages/foo/[slug].astro` using Pattern 2 (`getStaticPaths` with `fetchAllFoosFromSanity()`).

4. **Add to the sitemap** in `src/pages/sitemap.xml.ts` — add the adapter to the `Promise.all`, then emit entries in the loop.

5. **Add to `site-index.astro`** for crawlability.

6. **Add the section hub** to the `for (const section of [...])` loop in `sitemap.xml.ts` if it's a top-level section.

---

## Migration history (phases completed)

| Phase | Commits | Scope |
|---|---|---|
| 1–6 | Earlier sessions | Initial Sanity integration; entity detail pages; `getStaticPaths` for `eat/[slug]`, `wine/[slug]`, `stay/[slug]`, `plans/[slug]`, `places/[slug]`, `whats-on/[slug]` |
| 7 | `3b8324ae` | Tour pages, explore/walk pages, cross-reference pages (`journal/[slug]`, `plans/[slug]`, `places/[slug]`), infrastructure (`sitemap.xml.ts`, `site-index.astro`, `map.astro`, `itinerary.astro`) |
| 8 | `325020b8` | 58 filtered index pages across eat/stay/wine/guides/spa |
| 9 | `369caed c` | Moved `allItineraries` + `allEvents` into `getStaticPaths` sharedProps for `eat/[slug]`, `wine/[slug]`, `stay/[slug]` |
| 10+11 | `40bd0984` | Remaining scattered pages (`whats-on/this-weekend`, `saved`, `alerts`, `explore/weekend-trips`, `plans/mornington-peninsula-itinerary`, `events/[slug]`) + admin/dev tools (`partners/*`, `preview-hero`) |
| Component cleanup | `78bd5ce6` | `hub-guide/` components + `VenueDirectory.astro` |

---

## Known limitations and open items

- **Legacy content files** — `content/venues/`, `content/places/`, `content/events/`, `content/experiences/`, `content/itineraries/`, `content/tours/`, `content/tour-operators/`, `content/tour-packages/` are now dead weight. They are not read by any page or component. Safe to archive or delete once Sanity data completeness is verified.

- **`events/[slug].astro`** — this page is for `signature-events` (file-based), not the main Sanity events collection. It uses `getEntry(data.placeRef)` which references the old file-based places collection; this returns `null` gracefully via a `.catch(() => null)` fallback. If place cross-linking is needed on signature event pages, it should be refactored to look up from `fetchAllPlacesFromSanity()` instead.

- **`pages-drafts/golf/`** — draft pages still using `getCollection('experiences')`. Not production-routed; update when the golf section ships.

- **Fishing and boating** (`fishingCharters`, `species`, `fishingLocations`, `boatRamps`, `boatHire`) — these are file-based and content-light. If these entities grow or need CMS editing, add Sanity document types and adapters following the pattern above.

- **Build caching** — Sanity CDN responses are HTTP-cached. If content is updated in Studio and you need the build to pick it up, trigger a redeploy via Vercel (or the deploy hook). There is no ISR on public pages.
