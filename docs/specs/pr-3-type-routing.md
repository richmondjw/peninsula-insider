# PR-3 · Type Rationalisation & Routing

**Branch:** `feat/type-routing`  
**Depends on:** PR-2 merged  
**Effort:** 2–3 days  
**Owner:** Developer

---

## Objective

Reclassify all `producer` venues to their correct new types (`providore`, `cafe`, or experience-side), fix brewery/distillery routing from Wine → Eat & Drink, and clean up any residual routing mismatches. After this PR, `producer` is dead as an active type — no venue JSON should carry it forward.

---

## 1 · `producer` Type Reclassification

There are ~20 venues currently typed as `producer`. Each needs reassignment to one of:

| New type | Criteria |
|---|---|
| `providore` | Farmgate store, cheesemonger, fishmonger, produce retailer — sells product directly to consumers |
| `cafe` | Has a café / dining component that is the primary offering |
| Experience (move to `/experiences/`) | Primarily an attraction — truffle hunting, berry picking, maze — not a food-retail venue |

### Confirmed reclassifications (from session analysis)

| Venue slug | Current type | New type | Notes |
|---|---|---|---|
| red-hill-truffles | producer | experience | Seasonal truffle hunt — move to experiences collection |
| sunny-ridge-strawberry-farm | producer | experience | Pick-your-own attraction |
| ashcombe-maze | producer | experience | Attraction, not a food retailer |
| any cheesemonger/fishmonger/farmgate | producer | providore | Retail produce model |
| any with café seating as primary | producer | cafe | Subtype = 'roaster' or similar if warranted |

**Developer task:** Run the full audit:

```bash
# List all producer-typed venues
grep -rl '"type": "producer"' next/src/content/venues/ | sort
```

For each file, determine correct new type and update. Add `subtype` field where useful (e.g. `"subtype": "cheesemonger"`).

### Three venues moving to experiences
Create new experience JSON files (or move existing venue JSONs):
- `next/src/content/experiences/red-hill-truffles.json`
- `next/src/content/experiences/sunny-ridge-strawberry-farm.json`  
- `next/src/content/experiences/ashcombe-maze.json`

Add `type: 'attraction'` to each (already in experiences type enum). Add `venueSlug` if applicable.

Delete the corresponding venue JSON files after experience files are created.

---

## 2 · Brewery / Distillery Routing Fix

In the current `editorial.ts`, brewery and distillery are under `wineTypes` (route to `/wine/`). Under the confirmed IA, they belong under `eatTypes` (route to `/eat/`).

PR-2 already corrects the arrays in `editorial.ts`. This PR validates that all brewery/distillery venues now resolve to `/eat/[slug]` URLs and that no `/wine/brewery/` or `/wine/distillery/` collection URLs are referenced anywhere.

**Audit:**

```bash
# Check for any hardcoded wine/brewery or wine/distillery paths
grep -r '/wine/brewery\|/wine/distillery\|wine.*brewery\|wine.*distillery' next/src/ --include="*.astro" --include="*.ts" --include="*.tsx"
```

Add 301 redirects for any legacy URLs that may have been indexed:
- `/wine/brewery/` → `/eat/brewery/`
- `/wine/distillery/` → `/eat/distillery/`
- Individual venue pages (e.g. `/wine/[brewery-slug]`) → `/eat/[brewery-slug]/`

**File:** `next/astro.config.mjs` (or wherever redirects are configured)

---

## 3 · Wine Mega Menu — Remove Brewery/Distillery Links

**File:** `next/src/lib/v4-nav.ts`

The current Wine pillar in v4-nav.ts contains links to breweries and distilleries:

```ts
// REMOVE these from the Wine pillar columns:
{ key: 'brewery',    label: 'Breweries',    href: '/wine/#breweries' },
{ key: 'distillery', label: 'Distilleries', href: '/wine/#distilleries' },
```

Move them to the Eat & Drink pillar column under "More":

```ts
// ADD to Eat & Drink pillar:
{ key: 'brewery',    label: 'Breweries',    href: '/eat/breweries/' },
{ key: 'distillery', label: 'Distilleries', href: '/eat/distilleries/' },
{ key: 'providore',  label: 'Providores',   href: '/eat/providores/' },
```

---

## 4 · Hub Page Type Filtering

Any hub page that currently filters by `wineTypes` to include breweries/distilleries needs updating.

**Audit:**

```bash
grep -rn "wineTypes\|wine.*brewery\|wine.*distillery" next/src/pages/ --include="*.astro"
```

For each occurrence, ensure the filter now uses the updated `editorial.ts` arrays (which will be correct after PR-2). No hardcoded type lists should remain in page files — all routing logic flows through `editorial.ts`.

---

## 5 · `venueHrefPrefix` Function Verification

**File:** `next/src/lib/editorial.ts`

After PR-2's changes, verify the function resolves correctly:

```ts
// Expected resolution after PR-2 + PR-3:
venueHrefPrefix('restaurant')   // → /eat/
venueHrefPrefix('cafe')         // → /eat/
venueHrefPrefix('brewery')      // → /eat/
venueHrefPrefix('distillery')   // → /eat/
venueHrefPrefix('providore')    // → /eat/
venueHrefPrefix('winery')       // → /wine/
venueHrefPrefix('hotel')        // → /stay/
venueHrefPrefix('spa')          // → /stay/
```

Write a simple test or add assertions in a dev script to verify all 15 venue types resolve to the correct pillar.

---

## 6 · Content Registry Updates (Supabase)

Update `entity_type` values in `pi.content_registry` for reclassified venues:

```sql
-- Update brewery/distillery routing in content_registry
UPDATE pi.content_registry
  SET pillar = 'eat'
  WHERE entity_type IN ('brewery', 'distillery')
    AND pillar = 'wine';

-- Update producer → providore for reclassified venues
-- (run after venue JSONs are updated and re-synced)
UPDATE pi.content_registry
  SET entity_type = 'providore'
  WHERE entity_type = 'producer'
    AND slug IN (
      -- list of slugs confirmed as providore type
      -- populate after audit in step 1
    );

-- Remove producer entries for venues moving to experiences
DELETE FROM pi.content_registry
  WHERE entity_type = 'producer'
    AND slug IN ('red-hill-truffles', 'sunny-ridge-strawberry-farm', 'ashcombe-maze');

-- Insert experience entries for moved venues
INSERT INTO pi.content_registry (slug, entity_type, pillar, href, ...)
  VALUES
    ('red-hill-truffles', 'experience', 'explore', '/explore/places/red-hill/', ...),
    ('sunny-ridge-strawberry-farm', 'experience', 'explore', '/explore/places/...', ...),
    ('ashcombe-maze', 'experience', 'explore', '/explore/places/...', ...);
```

---

## 7 · Acceptance Criteria

- [ ] Zero venue JSON files carry `"type": "producer"` after this PR
- [ ] `red-hill-truffles`, `sunny-ridge-strawberry-farm`, `ashcombe-maze` exist in `experiences/` collection
- [ ] `venueHrefPrefix('brewery')` → `/eat/`, `venueHrefPrefix('distillery')` → `/eat/`
- [ ] `venueHrefPrefix('winery')` → `/wine/` only
- [ ] No `wineTypes` array includes brewery or distillery after PR-2
- [ ] 301 redirects added for `/wine/brewery/` and `/wine/distillery/`
- [ ] v4-nav.ts Wine pillar contains no brewery/distillery links
- [ ] `npx astro check` passes — no type errors on reclassified venue JSONs
- [ ] Supabase content_registry rows reflect updated types and pillars

---

## Dependencies

- **Requires:** PR-2 merged (providore type in enum, updated routing arrays)
- **Blocks:** PR-4, PR-5

---

*Spec version: 1.0 · 31 May 2026*
