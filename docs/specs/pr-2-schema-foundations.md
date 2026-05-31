# PR-2 · Schema Foundations

**Branch:** `feat/schema-foundations`  
**Depends on:** Nothing (parallel with PR-1)  
**Effort:** 2–3 days  
**Owner:** Developer

---

## Objective

Lay the complete data foundation for the IA refactor: correct the zone enum, introduce `providore` as a first-class venue type, add estate/tier/region relational fields to the content schemas, and migrate Supabase columns to match. All downstream PRs (3–9) depend on this landing cleanly.

---

## 1 · Zone Enum Correction

**File:** `next/src/content.config.ts`

Replace the current 7-value zone enum (which uses legacy names) with the corrected set:

```ts
// BEFORE
const zone = z.enum([
  'bayside',
  'hinterland',
  'red-hill-plateau',
  'ocean-coast',
  'back-beaches',
  'tip',
  'western-port',
]);

// AFTER
const zone = z.enum([
  'mornington',      // was 'bayside'
  'bay-coast',       // new — covers Dromana–Rye coastal strip
  'red-hill',        // was 'red-hill-plateau'
  'hinterland',      // unchanged
  'peninsula-tip',   // was 'tip' and 'back-beaches' (consolidated)
  'ocean-coast',     // unchanged
  'western-port',    // unchanged
]);
```

**Migration notes:**
- `bayside` → `mornington` in all venue/place/experience JSON files
- `red-hill-plateau` → `red-hill`
- `back-beaches` → `peninsula-tip`
- `tip` → `peninsula-tip`
- New `bay-coast` zone covers Dromana, Rye, Rosebud, Safety Beach, McCrae, Capel Sound — update those venue/place JSONs accordingly

**Search for all affected JSON files:**
```bash
grep -rl '"zone": "bayside"\|"zone": "red-hill-plateau"\|"zone": "back-beaches"\|"zone": "tip"' next/src/content/
```

---

## 2 · Venue Type Enum — Add `providore`

**File:** `next/src/content.config.ts`

Add `providore` to the venue type enum. Keep `producer` in the enum during migration (PR-3 handles reclassification and eventual deprecation):

```ts
// In the venues defineCollection schema, type field:
type: z.enum([
  'restaurant',
  'winery',
  'cafe',
  'bakery',
  'pub',
  'brewery',
  'distillery',
  'producer',      // deprecated — keep during migration, remove after PR-3
  'providore',     // NEW — farmgate, cheesemonger, fishmonger, produce store
  'market',
  'hotel',
  'villa',
  'cottage',
  'glamping',
  'farm-stay',
  'spa',
  'walk',
  'beach',
  'activity',
]),
```

---

## 3 · New Venue Fields

**File:** `next/src/content.config.ts` — venues `defineCollection` schema

Add the following optional fields to the venues schema block:

```ts
/**
 * Optional free-text sub-classification within a type.
 * Examples: type=cafe + subtype=roaster | type=providore + subtype=fishmonger
 * Surfaced as a secondary chip on venue cards and detail pages.
 */
subtype: z.string().optional(),

/**
 * Estate grouping — links this venue to a parent multi-venue estate.
 * When set, VenueDetailTemplate renders an EstateCluster block showing
 * sibling venues. Value must match an estateSlug from the confirmed
 * multi-venue estate list (see PR-7 spec).
 */
estateSlug: z.string().optional(),
estateLabel: z.string().optional(),

/**
 * Editorial tier — drives verdict block visibility and listing sort order.
 *   destination  → full editorial treatment, verdict block shown
 *   recommended  → listed and linked, no verdict block
 *   directory    → directory-only entry, minimal page
 */
venueTier: z.enum(['destination', 'recommended', 'directory']).default('destination'),
```

---

## 4 · New Experience Field

**File:** `next/src/content.config.ts` — experiences `defineCollection` schema

```ts
/**
 * Optional link to a parent venue when the experience is venue-owned
 * (e.g. a winery tour, a restaurant garden experience).
 * Used by VenueDetailTemplate to surface owned experiences inline.
 */
venueSlug: z.string().optional(),
```

---

## 5 · New Places Fields

**File:** `next/src/content.config.ts` — places `defineCollection` schema

```ts
/**
 * Region this place belongs to. Set on all 37 place JSONs post PR-2.
 * Used by RegionDetailTemplate (PR-6) to build the places strip.
 */
regionSlug: z.string().optional(),
regionLabel: z.string().optional(),
```

---

## 6 · `lib/editorial.ts` Updates

**File:** `next/src/lib/editorial.ts`

### 6a — Correct routing arrays

```ts
// BEFORE
export const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];
export const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'winery'];
export const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];

// AFTER
export const wineTypes = ['winery'];
export const eatTypes = [
  'restaurant', 'cafe', 'bakery', 'pub', 'market',
  'brewery', 'distillery', 'providore',
];
export const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
// Note: 'producer' removed from all arrays — handled as deprecated in PR-3
```

### 6b — Update `typeLabel` map

```ts
export const typeLabel: Record<string, string> = {
  restaurant: 'Restaurant',
  winery: 'Winery',
  cafe: 'Café',
  bakery: 'Bakery',
  pub: 'Pub',
  brewery: 'Brewery',
  distillery: 'Distillery',
  producer: 'Producer',    // keep during migration
  providore: 'Providore',  // NEW
  market: 'Market',
  hotel: 'Hotel',
  villa: 'Villa',
  cottage: 'Cottage',
  glamping: 'Glamping',
  'farm-stay': 'Farm Stay',
  spa: 'Spa',
};
```

### 6c — Update zone label map (add if not present)

```ts
export const zoneLabel: Record<string, string> = {
  mornington: 'Mornington',
  'bay-coast': 'Bay Coast',
  'red-hill': 'Red Hill',
  hinterland: 'Hinterland',
  'peninsula-tip': 'Peninsula Tip',
  'ocean-coast': 'Ocean Coast',
  'western-port': 'Western Port',
};
```

---

## 7 · Supabase Migration

**File:** `ops/migrations/2026-06-XX-pi-schema-foundations.sql`

Create this migration file:

```sql
-- PI Schema Foundations Migration
-- PR-2: zone enum correction, providore type, estate/tier/region fields
-- Run after: 2026-05-19-pi-image-bindings.sql

BEGIN;

-- ── 1. Zone enum ─────────────────────────────────────────────────────────────
-- Rename legacy zone values to new canonical names
-- Note: Supabase enums cannot be renamed in-place; use a column migration approach

-- Add new zone enum if pi.zone_enum exists as a type
DO $$
BEGIN
  -- Update any zone columns using text-based approach
  -- (adjust table/column names to match actual Supabase schema)
  UPDATE pi.venues SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.venues SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.venues SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.venues SET zone = 'peninsula-tip' WHERE zone = 'tip';
  
  UPDATE pi.places SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.places SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.places SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.places SET zone = 'peninsula-tip' WHERE zone = 'tip';
  
  UPDATE pi.experiences SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.experiences SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.experiences SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.experiences SET zone = 'peninsula-tip' WHERE zone = 'tip';
END $$;

-- ── 2. Venues — new columns ───────────────────────────────────────────────────
ALTER TABLE pi.venues
  ADD COLUMN IF NOT EXISTS subtype       TEXT,
  ADD COLUMN IF NOT EXISTS estate_slug   TEXT,
  ADD COLUMN IF NOT EXISTS estate_label  TEXT,
  ADD COLUMN IF NOT EXISTS venue_tier    TEXT NOT NULL DEFAULT 'destination'
    CHECK (venue_tier IN ('destination', 'recommended', 'directory'));

-- ── 3. Experiences — new column ───────────────────────────────────────────────
ALTER TABLE pi.experiences
  ADD COLUMN IF NOT EXISTS venue_slug TEXT;

-- ── 4. Places — new columns ───────────────────────────────────────────────────
ALTER TABLE pi.places
  ADD COLUMN IF NOT EXISTS region_slug  TEXT,
  ADD COLUMN IF NOT EXISTS region_label TEXT;

-- ── 5. Content registry — add providore type ─────────────────────────────────
-- content_registry.entity_type check constraint may need updating
-- Check existing constraint name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'pi.content_registry'::regclass;
-- Then drop and recreate with updated list including 'providore'

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS venues_estate_slug_idx  ON pi.venues (estate_slug);
CREATE INDEX IF NOT EXISTS venues_venue_tier_idx   ON pi.venues (venue_tier);
CREATE INDEX IF NOT EXISTS venues_zone_idx         ON pi.venues (zone);
CREATE INDEX IF NOT EXISTS places_region_slug_idx  ON pi.places (region_slug);

COMMIT;
```

---

## 8 · JSON File Updates Required

### Zone renames — run bulk update script
After schema change, update all venue/place/experience JSON files:

```bash
# Dry run first
find next/src/content -name "*.json" | xargs grep -l '"zone": "bayside"' 
find next/src/content -name "*.json" | xargs grep -l '"zone": "tip"'
find next/src/content -name "*.json" | xargs grep -l '"zone": "back-beaches"'
find next/src/content -name "*.json" | xargs grep -l '"zone": "red-hill-plateau"'

# Then sed replace (macOS: sed -i '')
sed -i 's/"zone": "bayside"/"zone": "mornington"/g' $(find next/src/content -name "*.json")
sed -i 's/"zone": "tip"/"zone": "peninsula-tip"/g' $(find next/src/content -name "*.json")
sed -i 's/"zone": "back-beaches"/"zone": "peninsula-tip"/g' $(find next/src/content -name "*.json")
sed -i 's/"zone": "red-hill-plateau"/"zone": "red-hill"/g' $(find next/src/content -name "*.json")
```

### Region assignments — manual, after zone migration
Set `regionSlug` + `regionLabel` on all 37 place JSONs per the confirmed region map:

| regionSlug | regionLabel | Places |
|---|---|---|
| `red-hill-wine-country` | Red Hill & Merricks | red-hill, main-ridge, merricks, merricks-beach, merricks-north, balnarring |
| `peninsula-tip` | Sorrento & Portsea | sorrento, portsea, blairgowrie, rye (partially) |
| `mornington-bay-coast` | Mornington & the Bay | mornington, mount-martha, safety-beach, mccrae, dromana, rosebud, capel-sound, mount-eliza |
| `western-port` | Western Port | hastings, bittern, crib-point, boneo |
| `ocean-coast` | Flinders & the Ocean Coast | flinders, cape-schanck, fingal, rye (partially) |

---

## 9 · Acceptance Criteria

- [ ] `npx astro check` passes with no type errors after schema changes
- [ ] Zone enum values match exactly: `mornington · bay-coast · red-hill · hinterland · peninsula-tip · ocean-coast · western-port`
- [ ] `providore` present in venue type enum; `producer` still present (deprecated marker in comment)
- [ ] `subtype`, `estateSlug`, `estateLabel`, `venueTier` fields present in venues schema — all optional or default-bearing
- [ ] `venueSlug` present in experiences schema
- [ ] `regionSlug`, `regionLabel` present in places schema
- [ ] `editorial.ts` routing arrays correct: `wineTypes = ['winery']`, `eatTypes` includes brewery/distillery/providore
- [ ] Supabase migration runs clean with no FK violations
- [ ] All 37 place JSON files pass `astro check` — no zone enum errors
- [ ] All 140 venue JSON files pass — no zone enum errors

---

## Dependencies

- **Blocks:** PR-3, PR-5, PR-7 (all need the new fields live)
- **Parallel with:** PR-1 (mega menu — no schema overlap)

---

*Spec version: 1.0 · 31 May 2026*
