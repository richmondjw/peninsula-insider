# PR-4 · Market Consolidation

**Branch:** `feat/market-consolidation`  
**Depends on:** PR-3 merged  
**Effort:** 1 day  
**Owner:** Developer

---

## Objective

Collapse the dual market collection structure (experience-markets and venue-markets) into a single, coherent venue-market model. Delete the five experience-collection market files, enrich the three retained venue-market files, add two new venue-market files, and add 301 redirects for the deleted experience-market URLs. Markets become a consistently venue-type content node — not a hybrid experience/venue collection.

---

## Background

The current content structure has markets split across two collections:
- **Experience-side markets** (`/experiences/`) — thin files, minimal editorial
- **Venue-side markets** (`/venues/`) — richer files with venue-type routing to `/eat/`

Under the confirmed IA, markets are a venue type (`"type": "market"`) routed to `/eat/`. Experience-side market files are an artefact of the old taxonomy and must be removed.

---

## 1 · Files to Delete (Experience-Side Markets)

Audit experience JSONs for market-type entries:

```bash
grep -rl '"type": "market"' next/src/content/experiences/
```

Expected deletions (confirm via audit):

| File | Redirect target |
|---|---|
| `next/src/content/experiences/[market-slug-1].json` | `/eat/[market-slug]/` |
| `next/src/content/experiences/[market-slug-2].json` | `/eat/[market-slug]/` |
| `next/src/content/experiences/[market-slug-3].json` | `/eat/[market-slug]/` |
| `next/src/content/experiences/[market-slug-4].json` | `/eat/[market-slug]/` |
| `next/src/content/experiences/[market-slug-5].json` | `/eat/[market-slug]/` |

**Do not delete** the event-side market entries (e.g. community markets in `/events/`). Those are event records for specific dates, not venue pages.

---

## 2 · Venue-Market Files to Retain and Enrich

Three existing venue-market files are retained. Each should be reviewed and enriched with:
- `editorNote` — minimum 2 sentences, editorial voice
- `whyWeGo` — one-line insider positioning
- `bestFor` — 2–4 audience tags
- `venueTier` — set to `'recommended'` or `'destination'` as appropriate
- `heroImage` — confirm non-placeholder image is set
- `lastVerified` — update to current date

Audit command:

```bash
grep -rl '"type": "market"' next/src/content/venues/
```

---

## 3 · New Venue-Market Files to Create

Add two new venue-market JSON files for markets that have editorial value but are currently unrepresented as venue pages.

**Template for new market venue JSON:**

```json
{
  "slug": "[market-slug]",
  "name": "[Market Name]",
  "type": "market",
  "place": "[place-slug]",
  "zone": "[corrected-zone]",
  "coordinates": { "lat": 0.0, "lng": 0.0 },
  "address": "[address]",
  "website": "[url]",
  "priceBand": "$",
  "venueTier": "recommended",
  "authority": null,
  "signature": "[one-line tagline]",
  "editorNote": "[editorial paragraph]",
  "whyWeGo": "[insider positioning line]",
  "bestFor": ["families", "local produce"],
  "tags": { "mood": [], "audience": [], "season": [] },
  "heroImage": {
    "src": "/images/placeholder.webp",
    "alt": "[description]",
    "license": "tmp-unsplash"
  },
  "lastVerified": "2026-06-01",
  "publishedAt": "2026-06-01",
  "sitemapExclude": false
}
```

Developer to confirm the two market slugs with editorial before creating files.

---

## 4 · 301 Redirects

**File:** `next/astro.config.mjs` (or `next/src/pages/[...404].astro` redirect config — check existing pattern)

Add 301 redirects for all five deleted experience-market URLs:

```js
// In astro.config.mjs redirects block:
redirects: {
  // Market consolidation PR-4
  '/experiences/[market-slug-1]/': { status: 301, destination: '/eat/[market-slug-1]/' },
  '/experiences/[market-slug-2]/': { status: 301, destination: '/eat/[market-slug-2]/' },
  '/experiences/[market-slug-3]/': { status: 301, destination: '/eat/[market-slug-3]/' },
  '/experiences/[market-slug-4]/': { status: 301, destination: '/eat/[market-slug-4]/' },
  '/experiences/[market-slug-5]/': { status: 301, destination: '/eat/[market-slug-5]/' },
  
  // Also redirect the experience-side market collection URL if it existed
  '/explore/markets/': { status: 301, destination: '/eat/markets/' },
}
```

Populate actual slugs after the audit in Step 1.

---

## 5 · Content Registry Cleanup (Supabase)

```sql
-- Remove experience-side market entries
DELETE FROM pi.content_registry
  WHERE entity_type = 'market'
    AND pillar = 'explore'  -- or however experience markets were registered
    AND slug IN (
      '[market-slug-1]',
      '[market-slug-2]',
      '[market-slug-3]',
      '[market-slug-4]',
      '[market-slug-5]'
    );

-- Ensure venue-side markets are registered correctly
UPDATE pi.content_registry
  SET pillar = 'eat',
      href = '/eat/' || slug || '/'
  WHERE entity_type = 'market'
    AND pillar != 'eat';
```

---

## 6 · Acceptance Criteria

- [ ] Zero market-type JSON files remain in `next/src/content/experiences/`
- [ ] Three existing venue-market files enriched (editorNote, whyWeGo, venueTier set)
- [ ] Two new venue-market JSON files created and pass `astro check`
- [ ] Five 301 redirects added and tested in local dev (verify with `curl -I`)
- [ ] `npx astro build` completes without referencing deleted experience market files
- [ ] Supabase content_registry: no `entity_type = 'market'` rows with `pillar = 'explore'`
- [ ] No broken internal links to deleted experience-market slugs (run `astro check` or link checker)

---

## Dependencies

- **Requires:** PR-3 merged (type rationalisation complete — markets confirmed as venue type only)
- **Blocks:** Nothing directly (but clean data here helps PR-8 Plans Browse and PR-9 Search Sync)

---

*Spec version: 1.0 · 31 May 2026*
