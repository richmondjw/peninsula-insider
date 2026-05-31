# PR-9 · Search Sync

**Branch:** `feat/search-sync`  
**Depends on:** All data PRs merged (PR-2 through PR-7)  
**Effort:** 2–3 days  
**Owner:** Developer

---

## Objective

Synchronise the search layer with the completed IA refactor. This PR updates the search client to surface `region_slug` as a new facet, extends the `pi.search()` RPC to return region and estate data, creates a `pi.venues_search` view that joins place region data, registers the `region` entity type in the content registry, cleans up `producer` → `providore` in search data, and triggers a full Pagefind index rebuild after all URL changes from PR-5.

---

## 1 · SearchHit Type Extension

**File:** `next/src/lib/search.ts` (or wherever the SearchHit interface is defined — locate with `grep -rn "SearchHit\|searchHit" next/src/`)

Add `region_slug` and `estate_slug` to the SearchHit type:

```ts
export interface SearchHit {
  slug: string;
  entity_type: string;
  pillar: string;
  href: string;
  title: string;
  // ... existing fields ...
  
  // New in PR-9
  region_slug?: string;    // populated for venues, places, regions
  estate_slug?: string;    // populated for venues within a multi-venue estate
  venue_tier?: string;     // 'destination' | 'recommended' | 'directory'
  zone?: string;           // zone enum value (corrected names from PR-2)
}
```

---

## 2 · `pi.search()` RPC Extension

**File:** `ops/migrations/2026-06-XX-pi-search-sync.sql`

The existing `pi.search()` RPC (defined in `2026-05-17-pi-search-rpc.sql`) needs to return `region_slug` and `estate_slug` as additional facet columns.

```sql
-- First: create the venues_search view (used by updated RPC)
CREATE OR REPLACE VIEW pi.venues_search AS
SELECT
  v.slug,
  v.name,
  v.type           AS entity_type,
  v.zone,
  v.estate_slug,
  v.venue_tier,
  p.slug           AS place_slug,
  p.name           AS place_name,
  p.region_slug,
  p.region_label
FROM pi.venues v
LEFT JOIN pi.places p ON p.slug = v.place_slug  -- adjust column name to match actual FK
WHERE v.status IS NULL OR v.status = 'active';

-- Grant read access
GRANT SELECT ON pi.venues_search TO anon, authenticated;
```

Update the `pi.search()` function to include the new fields in its return set. The exact SQL depends on the current RPC definition — read `2026-05-17-pi-search-rpc.sql` before writing the update:

```bash
cat ops/migrations/2026-05-17-pi-search-rpc.sql
```

At minimum, add `region_slug`, `estate_slug`, and `venue_tier` to:
1. The function return type declaration (`RETURNS TABLE(...)`)
2. The SELECT clause of the function body
3. The client TypeScript type if auto-generated from Supabase schema

---

## 3 · Content Registry Updates

### 3a — Register `region` entity type

Regions were added to the content registry in PR-6. This PR ensures the search client handles `entity_type = 'region'` correctly:

```ts
// In search client, entity_type routing for display
case 'region':
  return {
    icon: 'map',
    label: 'Region',
    href: `/explore/regions/${hit.slug}/`,
    pillar: 'explore',
  };
```

Verify the content_registry priority for regions is 90 (set in PR-6 migration).

### 3b — `producer` → `providore` cleanup

After PR-3 has reclassified all producer venues, ensure no `entity_type = 'producer'` rows remain in `pi.content_registry`:

```sql
-- Verify
SELECT COUNT(*) FROM pi.content_registry WHERE entity_type = 'producer';

-- If any remain (shouldn't after PR-3, but belt-and-braces):
UPDATE pi.content_registry
  SET entity_type = 'providore'
  WHERE entity_type = 'producer';
```

### 3c — Update `typeLabel` in search results display

The search results UI may have a display label for `producer`. Update to `providore`:

```ts
// In search display utility
const entityTypeLabel: Record<string, string> = {
  // ... existing ...
  providore: 'Providore',
  region: 'Region',
  // Remove or leave as fallback:
  // producer: 'Producer',
};
```

---

## 4 · Zone Filter Update

The search client may expose a zone filter. Update zone values to match the corrected enum from PR-2:

```ts
// Corrected zone filter options
const zoneFilterOptions = [
  { value: 'mornington',    label: 'Mornington' },
  { value: 'bay-coast',     label: 'Bay Coast' },
  { value: 'red-hill',      label: 'Red Hill' },
  { value: 'hinterland',    label: 'Hinterland' },
  { value: 'peninsula-tip', label: 'Peninsula Tip' },
  { value: 'ocean-coast',   label: 'Ocean Coast' },
  { value: 'western-port',  label: 'Western Port' },
];
```

Remove legacy zone values: `bayside`, `red-hill-plateau`, `back-beaches`, `tip`.

**Audit:**
```bash
grep -rn "bayside\|red-hill-plateau\|back-beaches\|\"tip\"" next/src/ --include="*.ts" --include="*.astro" --include="*.tsx"
```

---

## 5 · Region Facet in Search UI

Add `region_slug` as a filterable facet in the search interface. This allows users to filter search results by region.

**Implementation approach:**

If the search UI has an existing facet sidebar or filter panel:

```ts
// Add region filter group
{
  key: 'region_slug',
  label: 'Region',
  options: [
    { value: 'red-hill-wine-country', label: 'Red Hill & Merricks' },
    { value: 'peninsula-tip',         label: 'Sorrento & Portsea' },
    { value: 'mornington-bay-coast',  label: 'Mornington & the Bay' },
    { value: 'western-port',          label: 'Western Port' },
    { value: 'ocean-coast',           label: 'Flinders & the Ocean Coast' },
  ],
}
```

If the search is powered by Pagefind, add `data-pagefind-filter="region_slug"` to venue and place page elements that carry region data:

```astro
<!-- In VenueDetailTemplate, somewhere in the body -->
{venue.data.place?.data?.regionSlug && (
  <meta data-pagefind-filter="region_slug" content={venue.data.place.data.regionSlug} />
)}
```

---

## 6 · `pi.search()` RPC — `pi.venues_search` View

**File:** `ops/migrations/2026-06-XX-pi-search-sync.sql` (continued from section 2)

The `pi.venues_search` view should also be surfaced through the search RPC for venue queries that need region context. Specifically, when a search returns venue hits, the client should be able to display the region name as a secondary label.

```sql
-- Example extension to search RPC return type
-- (depends on existing RPC structure — read the existing RPC first)
-- Add to RETURNS TABLE(...):
  region_slug  TEXT,
  estate_slug  TEXT,
  venue_tier   TEXT
```

---

## 7 · Pagefind Index Rebuild

Pagefind is a static search index that needs to be rebuilt after:
- All URL changes from PR-5 (places at new `/explore/places/` paths)
- New region pages from PR-6
- Any venue pages with updated types/routes

**Rebuild command** (run after final production build):

```bash
cd next && npx astro build && npx pagefind --site dist
```

**Important:** Do not run the Pagefind rebuild mid-PR sequence. Run once after PR-5 through PR-9 are all merged and a clean build is done.

**CI/Build note:** Add a comment to the CI config noting that a Pagefind rebuild is required after any URL-structure PR merge:

```yaml
# .github/workflows/deploy.yml or similar
# After PR-5 through PR-9: run full Pagefind rebuild
# npx pagefind --site dist
```

---

## 8 · Search Client Integration Test

After all changes, run manual search tests to verify:

| Query | Expected top result type | Notes |
|---|---|---|
| "red hill wine" | venue (winery) or region | Should surface Red Hill & Merricks region |
| "sorrento restaurant" | venue (restaurant) | Should be in peninsula-tip region |
| "providore" | venue (providore) | No producer-type results |
| "weekend plan" | article (plans section) | Plans section articles surface |
| "flinders" | place or region | ocean-coast region present |
| "brewery" | venue (brewery in eat pillar) | NOT wine pillar |

---

## 9 · Acceptance Criteria

- [ ] `SearchHit` interface includes `region_slug`, `estate_slug`, `venue_tier`
- [ ] `pi.venues_search` view exists and returns region_slug correctly
- [ ] `pi.search()` RPC returns `region_slug` and `estate_slug` for venue hits
- [ ] Content registry: zero rows with `entity_type = 'producer'`
- [ ] Content registry: 5 rows with `entity_type = 'region'`
- [ ] Search UI zone filter uses corrected zone values (no legacy values)
- [ ] Search results display shows `Providore` label, not `Producer`
- [ ] Region facet available in search filter UI
- [ ] Pagefind rebuild completed — all `/explore/places/` and `/explore/regions/` URLs indexed
- [ ] Legacy `/places/` URLs return 0 results in Pagefind (they 301 away)
- [ ] Manual search tests pass (see section 8)

---

## Dependencies

- **Requires:** PR-2 (schema/zones), PR-3 (type routing), PR-4 (market cleanup), PR-5 (URL migration), PR-6 (regions in content registry), PR-7 (template data attributes for Pagefind)
- **Blocks:** Nothing — this is the final PR

---

## Post-Deploy Checklist

After PR-9 is merged and deployed:

1. Run Pagefind rebuild on production build
2. Verify Google Search Console has no 404 spikes (301s should be transparent)
3. Submit updated sitemap to Google Search Console
4. Check AI Overview presence for key region queries ("what to do in Red Hill", "Sorrento weekend")
5. Verify `pi.search()` RPC latency is acceptable with new view join

---

*Spec version: 1.0 · 31 May 2026*
