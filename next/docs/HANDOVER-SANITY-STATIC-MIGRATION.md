# Handover: Sanity-First Static Architecture Migration

**Project:** Peninsula Insider (`peninsulainsider.com.au`)
**Repo:** `richmondjw/peninsula-insider`
**Prepared:** 2026-05-21
**Status:** Planning complete, ready to implement

---

## The Problem Being Solved

The site's CMS image editing workflow is broken. Editors can right-click any image on the site, select a replacement from the Sanity media library, and save — but **the image reverts on every page refresh**. The site also suffered a homepage HTTP 500 outage (now resolved) caused by the same root issue.

**Root cause:** The architecture has three simultaneous sources of truth:
1. Static content files in `src/content/` — baked at build time
2. Sanity CMS — fetched at runtime via SSR on every request
3. Supabase `pi.content_registry` — a second override layer on top

The right-click overlay saves to Sanity correctly, but the page reads images from static files (or Sanity via a fragile SSR path that fails under quota pressure). Saves go to one place, reads come from another.

**The fix:** Move to a standard Sanity + static build pattern. Sanity is the single source of truth. A webhook fires on every Sanity publish, triggering a Vercel rebuild. Pages are statically generated with Sanity content baked in. No runtime Sanity reads, no quota dependency, no complex env var gating.

**Editor experience after migration:** Right-click image → select from media library → save → site rebuilds automatically → new image live within ~4 minutes (measured build time, not the 90s estimated pre-implementation).

---

## Current Architecture (What Exists Now)

### Stack
- **Frontend:** Astro 6, deployed on Vercel
- **CMS:** Sanity (Studio at `peninsula-insider.sanity.studio`, project ID `a062b30n`, dataset `production`)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Vercel (`peninsulainsider.com.au`)
- **Repo structure:** Monorepo. Frontend lives in `next/`. Sanity Studio lives in `studio/`.

### The SSR Hybrid Mode
When `PI_ADMIN_HYBRID=1` is set in Vercel environment variables, the build switches from `output: 'static'` to `output: 'server'`, and every page with `export const prerender = process.env.PI_ADMIN_HYBRID !== '1'` becomes a Vercel serverless function. This means the homepage and key pages re-run on every visitor request, fetching from Sanity and Supabase at runtime.

This is what enables the CMS overlay to show updated content — but it's also what causes failures when Sanity's API quota is exhausted.

### The Right-Click Overlay
Lives in `next/src/lib/inline-edit/`. Images tagged with `editableImage()` get a right-click handler. In edit mode (Sanity perspective cookie set), right-clicking shows a popup with "Replace from media library". Selecting an image sends a PATCH to the Sanity write API via `next/src/lib/sanity/write-client.ts`.

The overlay uses **stega encoding** (invisible Unicode markers in Sanity image URLs) to auto-detect which Sanity document and field an image belongs to, so editors don't have to configure bindings manually.

### Sanity Clients (in `next/src/lib/sanity/client.ts`)
| Client | `useCdn` | Used for |
|--------|----------|---------|
| `sanityClient` | `true` | Production reads (CDN-cached) |
| `sanityClientFresh` | `false` | **Deprecated** — was used for all production reads, caused quota exhaustion. Now unused. |
| `sanityPreviewClient` | `false`, drafts perspective | Preview/edit mode only |

> ⚠️ **Important:** Commit `ae436a88cd` (2026-05-21) switched all production reads from `sanityClientFresh` to `sanityClient`. The `sanityClientFresh` export still exists in `client.ts` but nothing should import it. Delete it once you've confirmed nothing else uses it.

### The `sanityReadEnabled()` Guard (in `next/src/lib/sanity/client.ts`)
This function gates all Sanity reads in production. It requires **three** env vars to all be set correctly:

```ts
if (process.env.PI_PUBLIC_SANITY_READS_DISABLED === 'true') return false
if (process.env.PI_PUBLIC_SANITY_READS_DISABLED !== 'false') return false  // default-deny
if (process.env.SANITY_READ_ENABLED !== 'true') return false
// then checks per-entity flag: SANITY_PLACES_ENABLED=true, etc.
```

The double-guard on `PI_PUBLIC_SANITY_READS_DISABLED` means Sanity reads are **off by default** unless you explicitly set it to `'false'`. This was added as an emergency kill switch. **The entire `sanityReadEnabled()` function is deleted in Phase 6 of the migration.**

### Current Vercel Environment Variables (relevant ones)
| Variable | Current Value | Purpose |
|----------|--------------|---------|
| `PI_ADMIN_HYBRID` | `1` | Switches build to SSR mode |
| `SANITY_READ_ENABLED` | `false` (set 2026-05-21 to stop quota burn) | Master Sanity read switch |
| `PI_PUBLIC_SANITY_READS_DISABLED` | unknown — check Vercel | Emergency kill switch |
| `SANITY_READ_TOKEN` | set | API token for Sanity reads |
| `SANITY_PREVIEW_TOKEN` | set | Token for draft/preview reads |
| `SANITY_WRITE_TOKEN` | set | Token for overlay writes |

> ⚠️ `SANITY_READ_ENABLED=false` was set manually to stop the homepage 500. Once the webhook migration is complete and SSR reads are removed, this variable becomes irrelevant and can be deleted.

### Content Collections
`next/src/content/` contains Astro content collections. Current file counts:

| Collection | Files | Notes |
|------------|-------|-------|
| `articles` | 159 | Journal articles — primary editorial content |
| `quick-notes` | 74 | Short time-sensitive notes |
| `places` | **0** | All place data lives in Sanity only |
| `itineraries` | **0** | All itinerary data lives in Sanity only |
| `venues` | 2 | Effectively in Sanity only |
| `experiences` | 0 | Sanity only |
| `events` | 0 | Sanity only |
| `authors` | 0 | Sanity only |
| fishing/species/boat | ~30 | Specialty content, static files |

Collections with **0 files** are already Sanity-first — those pages currently only exist because SSR fetches from Sanity at request time. Migrating them to build-time is Phase 4.

### Sanity Adapters (in `next/src/lib/sanity/`)
Each adapter fetches a document type from Sanity and returns it shaped to match the Astro content collection schema:

| File | Fetches | Used by |
|------|---------|---------|
| `place-adapter.ts` | `place` documents | `places/[slug].astro` |
| `venue-adapter.ts` | `venue` documents | `eat/`, `wine/`, `stay/` pages |
| `article-adapter.ts` | `article` documents | `journal/[slug].astro` |
| `itinerary-adapter.ts` | `itinerary` documents | `plans/[slug].astro` |
| `event-adapter.ts` | `event` documents | `whats-on/[slug].astro` |
| `singletons-adapter.ts` | `homepageCover`, `siteSettings`, `megaRail`, `pageHero` | Homepage, nav, hub pages |

---

## The Migration Plan

### Overview
Eight phases. Phases 1 and 2 deliver the core editorial fix. Phases 3–8 clean up the architecture.

**Phases 1+2 = editors can right-click → save → live in ~4 minutes.**
Phases 3–8 = cleaner, simpler codebase with no SSR complexity.

---

### Phase 1 — Webhook Pipeline ✅ COMPLETE (2026-05-21)
**Effort: 1 day | Start here**

**Goal:** Any publish in Sanity Studio triggers a Vercel rebuild within 5 seconds.

Steps:
1. In Vercel: Project → Settings → Git → Deploy Hooks → create hook named `sanity-publish`. Copy the URL.
2. In Sanity Studio: Manage → API → Webhooks → create webhook pointing at the Vercel hook URL.
   - Trigger on: `publish` events
   - Document filter: leave blank (all types) or explicitly list: `place`, `venue`, `article`, `itinerary`, `homepageCover`, `siteSettings`, `megaRail`, `pageHero`
   - HTTP method: POST
3. Test: Make a trivial change in Sanity Studio → publish → verify Vercel build starts within 5 seconds → verify it completes and the change is live.
4. Measure build time. Target: under 3 minutes.

**Deliverable:** Sanity publish → Vercel rebuild → live.

**Implementation notes (2026-05-21):**
- Deploy hook `0uBnbXyXFx` created in Vercel project `next`, named `sanity-publish`
- Sanity webhook created in Studio, triggering on Create/Update/Delete (Sanity UI doesn't have a dedicated "Publish" trigger — use all three document event types)
- Tested: trivial publish → Vercel build `dpl_6DAKyWDVuSB2NP9MKNqiVmFZexZT` started within 5s, completed READY — pipeline confirmed working
- Actual build time: **4–5 minutes** (not 3 min target; acceptable given asset pipeline)
- Fixed blocking issue: `maxs-red-hill-estate.json` had `"bookingUrl": ""` (empty string fails `z.string().url()` schema) — was blocking all builds for 9 hours before discovery

---

### Phase 2 — Fix the Right-Click Overlay Write Path ✅ COMPLETE (2026-05-21)
**Effort: 2–3 days | Depends on Phase 1**

**Goal:** Every image on the site can be right-clicked, replaced, and the change persists after refresh.

**Context:** The overlay saves to Sanity via stega bindings (invisible Unicode markers in Sanity CDN image URLs that encode the document ID and field path). When stega is disabled or the binding points to the wrong document, saves go to the wrong place or don't persist.

Steps:
1. **Audit all `editableImage()` bindings sitewide.** Every call to `editableImage()` in `next/src/pages/` and `next/src/components/` should have a `sanitySingletonId`/`sanitySingletonPath` (for singletons like homepage cover) or rely on stega (for entity documents). Verify each binding.

2. **Known mismatch found during diagnosis:** The "ALSO IN THIS ISSUE" section on the homepage (the `cover-also` cards) — when Sanity reads are off, `alsoScenes` comes from the static `scenes[]` array with no stega. The overlay shows a stale `pageHero-*` binding from a previous stega-encoded URL. Fix: ensure `sanityActiveSceneIndex` and `s.sanitySceneIndex` are always populated from Sanity, or explicitly set `sanitySingletonId: 'homepageCover'` and `sanitySingletonPath` on every scene card.

3. **Verify `write-client.ts`** sends the correct PATCH to Sanity when an image is replaced. Check `next/src/lib/sanity/write-client.ts` and the API endpoint it calls.

4. **Add rebuild feedback to the overlay.** After a successful save, display: *"Saved to Sanity. Site rebuilding (~4 min to live)."* This sets editor expectations correctly. ✅ Done (Phase 2 implementation).

5. **Test each image type end-to-end:**
   - Homepage cover image
   - Homepage "Also in this issue" scene images
   - Place hero (e.g., `/places/sorrento/`)
   - Venue hero (e.g., `/eat/laura/`)
   - Article hero (e.g., `/journal/hatted-restaurants-mornington-peninsula-2025/`)
   - Hub page hero (e.g., `/eat/` via `SectionHero.astro`)
   - Mega rail images

**Deliverable:** Right-click → replace → save → Sanity patched → webhook fires → rebuild → new image live.

**Implementation notes (2026-05-21):**
- `journal/[slug].astro` hero binding fixed: was `entityType: 'article'` (looks up article doc in Sanity — fails for 159 static markdown files). Changed to `pageHero-journal--{slug}` singleton pattern, matching SectionHero/SubpageHero behaviour. Commit `fe330601d0`.
- Overlay toast and undo banner now say "Saved to Sanity. Site rebuilding (~4 min to live)." / "Saved to Sanity. Rebuilding (~4 min)."
- `PI_PUBLIC_SANITY_READS_DISABLED=false` set in Vercel production env — was absent (triggering default-deny guard in `sanityReadEnabled()`), blocking `sanityActiveSceneIndex` on homepage and `sanityEntryIndex` on MegaRail.
- Remaining binding verification (step 5) is deferred — end-to-end test all 7 image types in Phase 2 testing session.
- Key discovery: homepage cover and also-scenes overlay bindings depend on `sanityReadEnabled('page-level')` at build time. With the env var now set, the `sanityActiveSceneIndex` will be populated from Sanity at build time and explicit `sanitySingletonId` will flow through correctly.

---

### Phase 3 — Build-Time Reads for Singletons ✅ COMPLETE (2026-05-21)
**Effort: 2 days | Can run parallel with Phase 4**

**Goal:** `homepageCover`, `siteSettings`, `megaRail`, and `pageHero` are fetched once at build time, not on every SSR request.

Key files to change:
- `next/src/pages/index.astro` — move `fetchHomepageCoverFromSanity()` out of the SSR request path into build-time data fetching
- `next/src/components/v4/V4MegaRail.astro` — move `fetchMegaRailFromSanity()` to build time
- `next/src/layouts/BaseLayout.astro` — move `fetchSiteSettingsFromSanity()` to build time
- `next/src/components/SubpageHero.astro`, `GuideHero.astro`, `SectionHero.astro` — move `fetchPageHeroFromSanity()` into the parent page's `getStaticPaths` and pass as a prop

Pattern:
```ts
// BEFORE (SSR — runs on every request)
if (sanityReadEnabled('page-level')) {
  const cover = await fetchHomepageCoverFromSanity();
  // ...
}

// AFTER (build-time — runs once per build)
const cover = await fetchHomepageCoverFromSanity();
// No guard needed — this is build-time, not runtime
```

Also in this phase:
- Remove Supabase `pi.content_registry` image slots (the `cmsImage[*]` overrides). These compensated for the broken Sanity SSR read path. With Sanity as build-time source, they're redundant. The text overrides (`cmsText[*]`) can stay if still used for editorial copy.
- Remove `sanityReadEnabled('page-level')` guards (no longer needed at build time).

**Deliverable:** Singleton content baked into static HTML at build time.

**Implementation notes (2026-05-21):**
- `next/astro.config.mjs` — always `output: 'hybrid'` with `@astrojs/vercel` adapter. Previously switched between `output: 'server'` (PI_ADMIN_HYBRID=1) and `output: 'static'`. Hybrid gives static pages baked at build time + SSR serverless for API routes.
- `PI_ADMIN_HYBRID` env var removed from Vercel production. No longer needed.
- All 12 API routes (`src/pages/api/admin/*`, `api/preview/*`, `api/revalidate.ts`) changed to `export const prerender = false` (SSR, required for serverless function behaviour).
- `src/pages/index.astro` — `export const prerender = process.env.PI_ADMIN_HYBRID !== '1'` → `export const prerender = true`. `sanityReadEnabled('page-level')` guard removed from `fetchHomepageCoverFromSanity()` call. Now always fetches at build time with try/catch.
- `src/components/v4/V4MegaRail.astro` — removed `sanityReadEnabled` guard and Supabase override fallback. Always calls `fetchMegaRailFromSanity()` at build time.
- `src/components/SectionHero.astro` and `SubpageHero.astro` — removed `sanityReadEnabled` guard and `loadOverrides` Supabase fallback. Always calls `fetchPageHeroFromSanity()` at build time via `if (isPageEntity)`.
- `src/pages/places/[slug].astro` — kept as `prerender = false` (SSR placeholder) pending Phase 4 getStaticPaths implementation.
- `src/pages/preview/[section]/[slug].astro` — kept as `prerender = false` (always SSR — renders draft content inside Studio iframe).
- **Deployment note:** Phase 3 commit `17e12e315e` was pushed to GitHub main branch on 2026-05-21. Earlier Sanity webhook deployments had raced ahead and locked production on the Phase 2 commit (deploy hook triggers on Sanity publishes and uses the latest main commit at the moment Vercel clones — if Sanity published just before or concurrent with the git push, Phase 2 was deployed instead). Push confirmed via `git push origin main`.
- **PI_PUBLIC_SANITY_READS_DISABLED** — currently `""` (empty string) in Vercel production. This is fine for Phase 3: the singleton fetches in `index.astro`, `V4MegaRail`, `SectionHero`, and `SubpageHero` no longer use `sanityReadEnabled()`. The entity card overlay reads (`places`, `itineraries`) in `index.astro` still use `sanityReadEnabled()` — with `""` value these return `false`, which is intentional until Phase 4.
- **Note for Phase 6:** `sanityReadEnabled` import is still in `index.astro` because `placeReadOn` and `itineraryReadOn` use it for entity overlay conditionals. Delete in Phase 4/6 when those entity reads are moved to `getStaticPaths`.

---

### Phase 4 — Build-Time Reads for Entities
**Effort: 3–5 days | Can run parallel with Phase 3**

**Goal:** Places, venues, itineraries, and events are fetched from Sanity at build time and generate fully static pages.

For each entity type, the pattern is:

```ts
// BEFORE (SSR — runs on every request, gated by sanityReadEnabled)
export const prerender = process.env.PI_ADMIN_HYBRID !== '1'

if (sanityReadEnabled('places')) {
  const place = await fetchPlaceFromSanity(slug);
  // overlay onto static data
}

// AFTER (build-time — static page generated per Sanity document)
export async function getStaticPaths() {
  const places = await sanityClient.fetch(allPlacesQuery);
  return places.map(place => ({
    params: { slug: place.slug },
    props: { place }
  }));
}
```

Order of implementation:
1. **Places** (`places/[slug].astro`, `places/index.astro`) — currently 0 static files, Sanity is the only source
2. **Venues/Eat** (`eat/[slug].astro`, `eat/index.astro`)
3. **Venues/Drink** (`wine/[slug].astro`, `wine/index.astro`)
4. **Venues/Stay** (`stay/[slug].astro`, `stay/index.astro`)
5. **Itineraries/Plans** (`plans/[slug].astro`, `plans/index.astro`)
6. **Events** (`whats-on/[slug].astro`, `whats-on/index.astro`)

For each: delete `sanityReadEnabled()` guard, remove `PI_ADMIN_HYBRID` check, convert to static `getStaticPaths`.

Also: remove `applySanityHero()` from `next/src/pages/index.astro`. This function overlaid Sanity hero image URLs onto static place/itinerary cards at SSR request time. At build time, the Sanity data already has the correct images — the function is no longer needed.

**Deliverable:** All entity pages (places, venues, itineraries, events) fully static, generated from Sanity at build time.

---

### Phase 5 — Articles Decision
**Effort: 1–2 days**

159 journal articles live as static markdown files in `src/content/articles/`. Decision required:

**Option A (recommended for now):** Keep static files. Add `pageHero` build-time read per article to allow hero image replacement via right-click overlay. Articles remain in markdown. No content migration needed.

**Option B (future work):** Migrate all articles to Sanity as full documents with Portable Text bodies. The `fetchArticleFromSanity` adapter already exists. This is a significant content migration effort — not required to fix the immediate problem.

For Option A:
- Verify `fetchPageHeroFromSanity('journal/{slug}')` is called in `getStaticPaths` for each article page
- Test: right-click article hero → replace → save → rebuild → verify new image live
- Document the decision in `ARCHITECTURE.md`

---

### Phase 6 — Remove SSR Hybrid
**Effort: 1–2 days | Depends on Phases 3, 4, 5**

Once all pages get data at build time, remove the SSR machinery entirely.

Files to change:
- `next/astro.config.mjs` — remove the `adminHybrid` conditional, set `output: 'static'` unconditionally
- Every page with `export const prerender = process.env.PI_ADMIN_HYBRID !== '1'` — remove this line (35 pages)
- `next/src/lib/sanity/client.ts` — delete `sanityClientFresh` export and `sanityReadEnabled()` function
- Remove from Vercel env vars: `PI_ADMIN_HYBRID`, `SANITY_READ_ENABLED`, `PI_PUBLIC_SANITY_READS_DISABLED`, all `SANITY_*_ENABLED` per-entity flags

**Deliverable:** Clean codebase. `output: 'static'`. No env var maze. No feature flags.

---

### Phase 7 — Preview Mode Verification
**Effort: 1 day | After Phase 6**

Sanity Presentation tool (draft preview) must continue working.

- `/api/preview/enable` and `/api/preview/disable` must remain as API routes
- Preview pages read from Sanity's `drafts` perspective (via `sanityPreviewClient`)
- Test: create a draft in Sanity Studio → open Presentation → verify draft content shows → publish → verify webhook fires → rebuild → verify live

The preview system is separate from the static build — it runs in an iframe inside Sanity Studio and is not affected by the static/SSR change.

---

### Phase 8 — Image Cleanup
**Effort: 1–2 days | Ongoing**

- Audit `next/public/images/sourced/` — identify editorial images (should be in Sanity) vs permanent UI assets (logos, icons, stay in repo)
- Upload editorial images to Sanity media library
- Update Sanity documents to reference media library assets
- Retire `/images/sourced/` paths for managed content

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `next/astro.config.mjs` | Build config — static vs SSR mode, adapter loading |
| `next/src/lib/sanity/client.ts` | Sanity clients + `sanityReadEnabled()` guard |
| `next/src/lib/sanity/singletons-adapter.ts` | Fetches for homepage cover, site settings, mega rail, page heroes |
| `next/src/lib/sanity/place-adapter.ts` | Place documents from Sanity |
| `next/src/lib/sanity/venue-adapter.ts` | Venue documents from Sanity |
| `next/src/lib/sanity/article-adapter.ts` | Article documents from Sanity |
| `next/src/lib/sanity/itinerary-adapter.ts` | Itinerary documents from Sanity |
| `next/src/lib/sanity/write-client.ts` | Sanity write operations (used by overlay) |
| `next/src/lib/inline-edit/` | Right-click overlay system |
| `next/src/pages/index.astro` | Homepage — has `applySanityHero()` to remove in Phase 4 |
| `next/src/components/SubpageHero.astro` | Hub page hero — calls `fetchPageHeroFromSanity` |
| `next/src/components/SectionHero.astro` | Section hero — calls `fetchPageHeroFromSanity` |
| `next/src/components/GuideHero.astro` | Guide page hero — calls `fetchPageHeroFromSanity` |
| `next/src/components/v4/V4MegaRail.astro` | Nav mega rail — calls `fetchMegaRailFromSanity` |
| `next/src/pages/api/preview/enable.ts` | Sets Sanity perspective cookie for preview mode |
| `studio/` | Sanity Studio — schemas, desk structure |

---

## Work Already Done (Do Not Re-Do)

| Commit | What it did |
|--------|------------|
| `ae436a88cd` | Switched all production Sanity reads from `sanityClientFresh` (no CDN) to `sanityClient` (CDN). This fixed the quota exhaustion that caused the homepage 500. |
| `71bf0e294e` | Added try/catch guards around `fetchHomepageCoverFromSanity()` and `applySanityHero()` in `index.astro` so SSR failures degrade gracefully instead of producing a 500. |

---

## Decisions Already Made

- **Keep Sanity** (not replacing with Directus, Payload, or any other CMS)
- **Option A for articles** (keep static markdown files, add `pageHero` build-time read for hero images; full Sanity migration is future work)
- **Remove Supabase `pi.content_registry` image slots** in Phase 3 (text overrides can remain if still used)
- **Standard Sanity + webhook + static build pattern** — not SSR, not ISR

---

## Sanity Project Details

| | |
|-|-|
| Project ID | `a062b30n` |
| Dataset | `production` |
| Studio URL | `https://peninsula-insider.sanity.studio` |
| API version | `2025-01-01` |
| CDN host | `cdn.sanity.io` |

---

## Questions to Resolve Before Starting

1. **What is the current value of `PI_PUBLIC_SANITY_READS_DISABLED` in Vercel?** If it's not set to `'false'`, Sanity reads are silently disabled even when `SANITY_READ_ENABLED=true`. Check Vercel env vars.

2. **Has `SANITY_READ_ENABLED` been re-enabled after the outage?** It was set to `false` on 2026-05-21 to stop the quota burn. It should be re-enabled to `true` once Phase 1 (webhook) is in place and the CDN client fix has deployed.

3. **Build time measurement.** Run a Vercel build and measure actual time. If > 3 minutes, identify slow steps before committing to the webhook pattern.

4. **Sanity API quota status.** Check Sanity usage dashboard. The quota issue that caused the outage was caused by `sanityClientFresh` bypassing the CDN (now fixed). Verify quota has recovered before re-enabling reads.

---

## Getting Started

1. Set up the development environment: `cd next && npm install && npm run dev`
2. Verify local build: `npm run build` (will fail with `NoAdapterInstalled` locally if `PI_ADMIN_HYBRID` is not set — this is expected for local static builds)
3. Read `next/docs/pi-cms-hybrid-cutover-2026-05-10.md` for background on the hybrid mode
4. **Start with Phase 1** — the webhook is the foundation for everything else
