# PR-5 · Explore URL Migration

**Branch:** `feat/explore-url-migration`  
**Depends on:** PR-3 merged  
**Effort:** 3–4 days  
**Owner:** Developer

---

## Objective

Move Places and Plans under the `/explore/` URL umbrella. Migrate all `/places/` routes to `/explore/places/`, all `/plans/` and `/escape/` routes to `/explore/plans/`, add ~50 redirects, update the BaseLayout section enum, and update all Supabase `content_registry` hrefs to match the new URL structure.

---

## 1 · URL Structure Change

### Before → After

| Content type | Old URL pattern | New URL pattern |
|---|---|---|
| Places index | `/places/` | `/explore/places/` |
| Place detail | `/places/[slug]/` | `/explore/places/[slug]/` |
| Plans index | `/plans/` | `/explore/plans/` |
| Plan/escape detail | `/plans/[slug]/` | `/explore/plans/[slug]/` |
| Escape (legacy) | `/escape/` | `/explore/plans/` |
| Explore hub | `/explore/` | `/explore/` (unchanged — now a hub) |

---

## 2 · File Structure Changes

### 2a — Places pages

Move/rename Astro page files:

```
# From:
next/src/pages/places/index.astro
next/src/pages/places/[slug].astro

# To:
next/src/pages/explore/places/index.astro
next/src/pages/explore/places/[slug].astro
```

If the `next/src/pages/explore/` directory doesn't exist yet, create it. The `explore/` directory will also house `regions/` (PR-6) and `plans/` (this PR).

### 2b — Plans pages

```
# From:
next/src/pages/plans/index.astro
next/src/pages/plans/[slug].astro
next/src/pages/escape/[slug].astro  (if it exists)

# To:
next/src/pages/explore/plans/index.astro
next/src/pages/explore/plans/[slug].astro
```

### 2c — Explore hub index

Create or update `next/src/pages/explore/index.astro` as the Explore umbrella hub. This page surfaces:
- Places grid (featured places, filtered by `featured: true`)
- Plans rail (latest plans articles)
- Regions grid (after PR-6 — feature-flag until then)
- Free experiences highlights

For this PR, the index is a lightweight hub — a full explore hub design is part of PR-8.

---

## 3 · 301 Redirects

**File:** `next/astro.config.mjs`

Add all place and plan redirects to the `redirects` block:

```js
// ── PR-5 · Explore URL Migration ─────────────────────────────────────────────
// Places: /places/ → /explore/places/
'/places/': { status: 301, destination: '/explore/places/' },

// Place detail pages (~37 slugs)
// Generate this list from: ls next/src/content/places/ | sed 's/.json//'
'/places/arthurs-seat/':      { status: 301, destination: '/explore/places/arthurs-seat/' },
'/places/balnarring/':        { status: 301, destination: '/explore/places/balnarring/' },
'/places/bittern/':           { status: 301, destination: '/explore/places/bittern/' },
'/places/blairgowrie/':       { status: 301, destination: '/explore/places/blairgowrie/' },
'/places/boneo/':             { status: 301, destination: '/explore/places/boneo/' },
'/places/cape-schanck/':      { status: 301, destination: '/explore/places/cape-schanck/' },
'/places/capel-sound/':       { status: 301, destination: '/explore/places/capel-sound/' },
'/places/crib-point/':        { status: 301, destination: '/explore/places/crib-point/' },
'/places/dromana/':           { status: 301, destination: '/explore/places/dromana/' },
'/places/fingal/':            { status: 301, destination: '/explore/places/fingal/' },
'/places/flinders/':          { status: 301, destination: '/explore/places/flinders/' },
'/places/hastings/':          { status: 301, destination: '/explore/places/hastings/' },
'/places/main-ridge/':        { status: 301, destination: '/explore/places/main-ridge/' },
'/places/mccrae/':            { status: 301, destination: '/explore/places/mccrae/' },
'/places/merricks-beach/':    { status: 301, destination: '/explore/places/merricks-beach/' },
'/places/merricks-north/':    { status: 301, destination: '/explore/places/merricks-north/' },
'/places/merricks/':          { status: 301, destination: '/explore/places/merricks/' },
'/places/moorooduc/':         { status: 301, destination: '/explore/places/moorooduc/' },
'/places/mornington/':        { status: 301, destination: '/explore/places/mornington/' },
'/places/mount-eliza/':       { status: 301, destination: '/explore/places/mount-eliza/' },
// ... (complete the full list from ls next/src/content/places/)

// Plans: /plans/ → /explore/plans/
'/plans/': { status: 301, destination: '/explore/plans/' },
'/escape/': { status: 301, destination: '/explore/plans/' },

// Individual plan slugs — generate from content/articles where section=plans
// '/plans/[slug]/': { status: 301, destination: '/explore/plans/[slug]/' },
```

**Generate the complete redirect list:**

```bash
# Get all place slugs
ls next/src/content/places/ | sed 's/\.json//' | \
  awk '{print "'"'"'/places/" $0 "/'"'"': { status: 301, destination: '"'"'/explore/places/" $0 "/'"'"' },"}'

# Get all plans article slugs  
grep -rl '"section": "plans"' next/src/content/articles/ | \
  sed 's/.*\///' | sed 's/\.md//' | sed 's/\.mdx//'
```

---

## 4 · BaseLayout Section Enum

**File:** `next/src/layouts/BaseLayout.astro`

```ts
// BEFORE
section?: 'home' | 'eat' | 'stay' | 'wine' | 'explore' | 'journal' | 'places' | 'escape' | 'whats-on';

// AFTER
section?: 'home' | 'eat' | 'stay' | 'wine' | 'explore' | 'journal' | 'whats-on';
// 'places' and 'escape' removed — both now map to 'explore'
```

Update the `SECTION_TO_SEARCH_KIND` map:

```ts
// Remove or remap:
// places: 'Places',  → remove (use explore)
// escape: 'Plans',   → remove (use explore)

// Ensure:
explore: 'Explore',
```

Update all page files that pass `section="places"` or `section="escape"` to instead pass `section="explore"`.

**Audit:**

```bash
grep -rn 'section="places"\|section="escape"\|section=.places.\|section=.escape.' next/src/pages/ next/src/layouts/ --include="*.astro"
```

---

## 5 · Internal Link Updates

All internal links to `/places/` and `/plans/` must be updated to the new paths.

**Audit commands:**

```bash
# Find all hardcoded /places/ links
grep -rn '"/places/\|href="/places/' next/src/ --include="*.astro" --include="*.ts" --include="*.tsx" --include="*.json"

# Find all hardcoded /plans/ links
grep -rn '"/plans/\|href="/plans/' next/src/ --include="*.astro" --include="*.ts" --include="*.tsx" --include="*.json"

# Find /escape/ links
grep -rn '"/escape/\|href="/escape/' next/src/ --include="*.astro" --include="*.ts" --include="*.tsx"
```

Key locations to update:
- `next/src/lib/v4-nav.ts` — Places and Plans pillar hrefs
- `next/src/lib/editorial.ts` — any place/plan href helpers
- Hub pages (`/eat/`, `/wine/`, `/stay/` index pages) — place links in sidebars
- Article body content — inline links to places (search markdown content too)
- Venue JSON `pairWith` arrays that reference place URLs

---

## 6 · v4-nav.ts Updates

**File:** `next/src/lib/v4-nav.ts`

Update the Explore pillar to reflect the new URL structure:

```ts
// Explore pillar top-level
href: '/explore/',

// Column links:
{ key: 'places',  label: 'Places',  href: '/explore/places/' },
{ key: 'plans',   label: 'Plans',   href: '/explore/plans/'  },
{ key: 'regions', label: 'Regions', href: '/explore/regions/' }, // live after PR-6
```

Remove the standalone Plans pillar if it exists, or remap its href to `/explore/plans/`.

---

## 7 · Supabase `content_registry` Updates

Update all `href` values for places and plans entries:

```sql
-- Update place href patterns
UPDATE pi.content_registry
  SET href = REPLACE(href, '/places/', '/explore/places/')
  WHERE href LIKE '/places/%';

-- Update plan/escape href patterns  
UPDATE pi.content_registry
  SET href = REPLACE(href, '/plans/', '/explore/plans/')
  WHERE href LIKE '/plans/%';

UPDATE pi.content_registry
  SET href = REPLACE(href, '/escape/', '/explore/plans/')
  WHERE href LIKE '/escape/%';

-- Verify no legacy paths remain
SELECT slug, href FROM pi.content_registry
  WHERE href LIKE '/places/%' OR href LIKE '/plans/%' OR href LIKE '/escape/%';
```

---

## 8 · Sitemap

After the URL migration, regenerate the sitemap. Ensure:
- Old `/places/` and `/plans/` URLs are **not** in the sitemap (they 301 to new URLs)
- New `/explore/places/` and `/explore/plans/` URLs are in the sitemap
- `sitemapExclude: false` on all active place and plan files

---

## 9 · Acceptance Criteria

- [ ] All 37 place detail pages render at `/explore/places/[slug]/`
- [ ] `/places/` and `/places/[slug]/` return 301 to new URLs (test with `curl -I`)
- [ ] Plans index renders at `/explore/plans/`
- [ ] `/plans/` and `/escape/` return 301 to `/explore/plans/`
- [ ] BaseLayout section enum no longer includes `'places'` or `'escape'`
- [ ] No page file passes `section="places"` or `section="escape"` to BaseLayout
- [ ] `npx astro build` completes without 404s or broken routes
- [ ] Supabase content_registry: zero rows with `href LIKE '/places/%'`
- [ ] v4-nav.ts Explore pillar href = `/explore/`, Places link = `/explore/places/`
- [ ] Pagefind index rebuild queued (PR-9 handles full rebuild)

---

## Dependencies

- **Requires:** PR-3 merged
- **Blocks:** PR-6 (regions need places at new URLs), PR-8 (plans browse hub)

---

*Spec version: 1.0 · 31 May 2026*
