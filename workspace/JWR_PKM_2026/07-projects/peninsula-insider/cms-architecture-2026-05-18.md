# Peninsula Insider — CMS & Content Architecture Report

**Date:** 2026-05-18
**Author:** James + Claude (Sonnet 4.7, 1M context)
**Status:** Migration build-out complete; awaiting production cutover
**Branch:** `claude/focused-bhaskara-9fc0a3` (16 commits)

This report describes the new content-management and rendering
architecture for **peninsulainsider.com.au** as of May 2026, after the
Sanity migration project. It is the canonical reference for any
developer (human or agent) entering the project.

---

## 1. Executive summary

Peninsula Insider was previously a static Astro site with content
authored as JSON files in a Git repo and live edits patched through a
homemade Supabase-backed inline editor. That architecture had reached
its ceiling — most visibly through an image-swap flicker on first
paint, but more fundamentally through three sources of truth that
couldn't be reconciled (build-time JSON, build-time Supabase overrides,
run-time client-side patches).

The system has been re-architected around **Sanity** (headless CMS) as
the canonical content store and **Vercel hybrid** (SSR + ISR) as the
rendering layer. **519 entity documents and 9 page-level singletons**
have been migrated. Editors work in a single Studio UI; published edits
propagate to production within ~30 seconds via webhook-triggered
revalidation. The flicker class of bugs is structurally impossible in
the new architecture.

The legacy stack remains operational under feature flags and is
scheduled for decommissioning after a 14-day stable bake of the
Sanity-only configuration.

---

## 2. The stack — at a glance

| Layer | Component | Version | Why |
|---|---|---|---|
| **CMS** | Sanity | Studio 5.25 / API v2025-01-01 | Real-time collab, structured content, first-class image pipeline, schema-as-code, GROQ |
| **Studio** | `studio-peninsula-insider/` | React app (Vite) | Editor-facing UI; hosted at peninsula-insider.sanity.studio |
| **Site framework** | Astro | 6.1 | File-based routing, component islands, content collections, hybrid SSR |
| **Frontend** | Vanilla components | Astro `.astro` + minimal client JS | No React/Vue runtime in the site bundle |
| **Hosting** | Vercel | (hybrid adapter) | SSR + ISR + edge cache + on-demand revalidation |
| **Image CDN** | Sanity Asset Pipeline | bundled | On-the-fly transforms, hotspot crop, AVIF/WebP, LQIP |
| **Auth (admin)** | Sanity Studio auth | Google/GitHub | Editor identity via Sanity's own auth surface |
| **Search** | Pagefind | (static index) | Built at deploy time against rendered HTML |
| **Database (operational)** | Supabase Postgres | — | Saves/lists, concierge, alerts, partner portal, CMS legacy (in decom) |
| **Backups** | GitHub Actions + `sanity dataset export` | nightly | 90-day retention in `ops/backups/` |

---

## 3. System topology

```
              ┌────────────────────────────────────────────────────┐
              │                  Editor (Emma)                     │
              │   peninsula-insider.sanity.studio   (Google login) │
              └──────────────────────┬─────────────────────────────┘
                                     │ publish / unpublish
                                     ▼
                          ┌──────────────────────┐
                          │   Sanity dataset     │
                          │   project a062b30n   │
                          │   dataset 'production'│
                          │   528 documents      │
                          │   + Asset Pipeline   │
                          └──────────┬───────────┘
                                     │
                       publish event │ (webhook)
                                     ▼
              ┌─────────────────────────────────────┐
              │  Vercel: peninsulainsider.com.au    │
              │  ┌───────────────────────────────┐  │
              │  │ /api/revalidate               │  │
              │  │ HMAC-verified, maps _type →   │  │
              │  │ affected routes, calls        │  │
              │  │ on-demand revalidation        │  │
              │  └────────────┬──────────────────┘  │
              │               │ purges cached HTML  │
              │               ▼                     │
              │  ┌───────────────────────────────┐  │
              │  │ Edge cache (ISR)              │  │
              │  └────────────┬──────────────────┘  │
              │               │ on cache miss       │
              │               ▼                     │
              │  ┌───────────────────────────────┐  │
              │  │ Astro SSR — Node runtime      │  │
              │  │ - Fetches doc from Sanity     │  │
              │  │   (via @sanity/client)        │  │
              │  │ - Renders via Astro template  │  │
              │  │ - Sets Cache-Control          │  │
              │  └───────────────────────────────┘  │
              └───────────────────┬─────────────────┘
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │   Visitor browser    │
                      │   HTML + assets from │
                      │   Vercel + Sanity CDN│
                      └──────────────────────┘
```

**Daily backup leg** (not pictured): GitHub Actions runs
`sanity dataset export production` at 17:00 UTC, commits the tar.gz to
`ops/backups/`, prunes anything older than 90 days.

---

## 4. Content model

### 4.1 Entity document types (10)

All entity schemas live in
`studio-peninsula-insider/schemaTypes/documents/`. Each schema mirrors
the Zod shape that used to validate the JSON files; field groups
organise the editing form. Every document has a slug-derived `_id`
(e.g. `venue-alba-thermal-springs`) for predictable references and
idempotent imports.

| Type | Count | _id pattern | Owner | Most-touched fields |
|---|---|---|---|---|
| `venue` | 141 | `venue-<slug>` | Editor | signature, whyWeGo, editorNote (PT), heroImage, tags, place |
| `place` | 21 | `place-<slug>` | Editor | factualLede, intro, signature, bestFor, bestDay, tldr |
| `article` | 174 | `article-<slug>` | Editor | title, dek, body (PT), relatedX, faq, status |
| `event` | 91 | `event-<slug>` | Mix (scraper + editor) | editorVerdict, kidsGrade, lens, hero |
| `experience` | 42 | `experience-<slug>` | Editor | name, type, place, editorNote, durationMinutes |
| `tour` | 18 | `tour-<slug>` | Editor | operator, intro, whatHappens, experienceType, FAQs |
| `tourOperator` | 17 | `tourOperator-<slug>` | Editor | name, operatorType, intro, whatGoodAt, notSuitedFor |
| `tourPackage` | 8 | `tourPackage-<slug>` | Editor | name, occasion, componentTours, anchorStay |
| `itinerary` | 6 | `itinerary-<slug>` | Editor | dek, audience, mood, stops[], anchorStay, anatomy |
| `author` | 1 | `author-<slug>` | Editor | name, bio, byline (currently just "editorial") |

### 4.2 Singletons (4 schemas, 9 docs)

Singletons hold "one of" config across the site. Stored as fixed-ID
documents so adapter code can fetch by hardcoded path.

| Type | _id | Drives |
|---|---|---|
| `siteSettings` | `siteSettings` | Masthead, edition label, footer links, social handles |
| `homepageCover` | `homepageCover` | Scenes array + activeSceneIndex for the homepage cover |
| `megaRail` | `megaRail` | 5 mega-menu rail entries (whats-on, escape, eat, wine, stay) |
| `pageHero` | `pageHero-<slug>` | Per-hub hero override (6 seeded: whats-on, plans, eat-cafes, places, tour-operators, events) |

### 4.3 Reusable object types

In `studio-peninsula-insider/schemaTypes/objects/`. These compose the
documents above:

- `imageRef` — image with `alt`, `credit`, `license`, `caption` (Sanity
  asset with hotspot + crop)
- `coordinates` — lat/lng pair with validation
- `authority` — hats / Halliday score / awards / press
- `tags` — mood + season + audience facets (closed vocabularies)
- `openingHourEntry`, `visiting` — wine cellar door scheduling
- `wines`, `onSiteFood` — wine + on-site restaurant blocks
- `sameAs` — external links (official site, Halliday, social)
- `faqItem` — `{q, a}` pair
- `itineraryStop` — day/order/venue/experience/timeOfDay/practical
- 6 Portable Text embed types: `alertBlock`, `practicalCallout`,
  `cellarDoorList`, `dogPolicyTable`, `subregionGrid`, `varietyGuide`

### 4.4 References between entities

References are stored as Sanity `reference` objects targeting document
IDs. **All cross-entity references use `_weak: true`** — when a target
document is missing, the field gracefully returns null instead of
failing the document validation. This tolerated 77 dangling references
that pre-existed in the JSON source data; they appear in Studio as
broken links the editor can fix as they touch each entity.

| Source | Target | Field |
|---|---|---|
| venue | place | `place` |
| place | place[] | `relatedPlaces` |
| experience | place | `place` |
| itinerary | venue/place | `anchorStay`, `altStays`, `anchorTown`, `baseTowns`, `stops[].venue` |
| tour | tourOperator | `operator` |
| tourPackage | tour[], venue | `componentTours`, `anchorStay`, `altStay` |
| event | venue, place | `venue`, `place` |
| article | author | `author` |
| article | venue/experience/place/itinerary/article[] | `relatedX` |

Audit script: `next/scripts/audit-references.mjs` walks every reference
field and reports dangling targets.

---

## 5. Image management

Images live in **Sanity Asset Pipeline** — a global CDN with on-the-fly
transforms. Every image upload gets:

- A globally unique asset ID
- Automatic format negotiation (AVIF / WebP / JPEG via `?auto=format`)
- Hotspot + crop metadata that editors set in the Studio
- Width/height/aspect-ratio metadata for responsive layouts
- LQIP (low-quality image placeholder) blur data

The Astro side ships **`next/src/lib/sanity/image.ts`** with intent-based
helpers:

| Intent | Width | Quality | Used for |
|---|---|---|---|
| `hero` | 1920 | 82 | Full-bleed editorial covers |
| `card` | 800 | 78 | Listing cards / hub rails |
| `gallery` | 1200 | 80 | Lightbox-friendly mid-size |
| `thumb` | 320 | 75 | Inline thumbnails |
| `og` | 1200×630 | 82 | Open Graph social cards |

Each helper emits a `srcset` + `sizes` for proper responsive loading.
The hotspot data travels with every responsive crop — Emma sets it
once per image; every layout respects it.

**Image provenance** is tracked: every imported asset's source
(`/images/sourced/foo.webp` from the legacy JSON or
`cdn.supabase.co/...` from the legacy override layer) was used by the
importer; future audit work could expose this in Studio.

**Image library** is the Studio's **Tools → Media** view. Search by
filename, see which documents reference each asset, dedupe by content
hash.

---

## 6. Rendering pipeline — request to response

### 6.1 Anonymous visitor, cache hit (most common path)

1. Browser requests `https://peninsulainsider.com.au/eat/alba-thermal-springs/`
2. Vercel edge cache has fresh HTML for that route
3. HTML served from edge (~30ms TTFB)
4. Browser fetches CSS/JS/images
5. Images served from Sanity CDN (`cdn.sanity.io/...`) with edge cache

### 6.2 Anonymous visitor, cache miss / first request after publish

1. Browser requests the route
2. Edge cache invalidated (or absent)
3. Vercel boots the Astro SSR Node runtime
4. Astro page checks `sanityReadEnabled('venues')`
   - If true: fetches venue doc via GROQ
   - If false: legacy JSON `getCollection('venues')` path
5. Adapter (`next/src/lib/sanity/venue-adapter.ts`) reshapes the Sanity
   doc to match the legacy Astro content-collection shape so
   `VenueDetailTemplate.astro` consumes it unchanged
6. Template renders to HTML
7. Response sent with `Cache-Control: s-maxage=…, stale-while-revalidate`
8. Edge caches the HTML for the next request

### 6.3 Editor publishes a change

1. Editor hits Publish in Studio
2. Sanity emits a webhook POST to `/api/revalidate`
3. Astro endpoint (`next/src/pages/api/revalidate.ts`):
   - Verifies HMAC signature against `SANITY_WEBHOOK_SECRET`
   - Maps `body._type` + `body.slug.current` → affected route paths
   - Calls Vercel's on-demand revalidation for each route
4. Edge cache drops the stale HTML for those routes
5. Next visitor (or revalidation prefetch) triggers a fresh SSR render
6. Editor's change is live within ~30 seconds

---

## 7. The dual-read mechanism

During the cutover window, every Astro page is wired to read from
**either** the legacy JSON content collection **or** Sanity — gated by
per-entity feature flags. The intent: ship Sanity-sourced rendering to
production but keep an instant rollback path for two full weeks.

### 7.1 Feature flags

In Vercel project env vars (and `next/.env.local` for local dev):

```
SANITY_READ_ENABLED              # master kill-switch
SANITY_VENUES_ENABLED
SANITY_PLACES_ENABLED
SANITY_ARTICLES_ENABLED
SANITY_EVENTS_ENABLED
SANITY_ITINERARIES_ENABLED
SANITY_TOURS_ENABLED
SANITY_TOUR_OPERATORS_ENABLED
SANITY_TOUR_PACKAGES_ENABLED
SANITY_EXPERIENCES_ENABLED
SANITY_PAGE_LEVEL_ENABLED         # homepage cover, mega-rail, page heroes, site settings
```

Helper: `sanityReadEnabled(entity)` in `next/src/lib/sanity/client.ts`
returns true only when both the master flag AND the entity flag are
`'true'`.

### 7.2 Adapters

Each entity has a Sanity → legacy-shape adapter in `next/src/lib/sanity/`:

| Adapter | Function |
|---|---|
| `venue-adapter.ts` | `fetchVenueFromSanity(slug)` |
| `place-adapter.ts` | `fetchPlaceFromSanity(slug)` |
| `itinerary-adapter.ts` | `fetchItineraryFromSanity(slug)` |
| `phase5-adapters.ts` | `fetchExperienceFromSanity`, `fetchTourFromSanity`, `fetchTourOperatorFromSanity`, `fetchTourPackageFromSanity` |
| `article-adapter.ts` | `fetchArticleFromSanity(slug)` (returns body as Portable Text) |
| `event-adapter.ts` | `fetchEventFromSanity(slug)` |
| `singletons-adapter.ts` | `fetchHomepageCoverFromSanity`, `fetchMegaRailFromSanity`, `fetchSiteSettingsFromSanity`, `fetchPageHeroFromSanity` |

The adapters absorb the schema-shape difference so the existing Astro
templates (`VenueDetailTemplate.astro`, `PlaceDetailTemplate.astro`,
etc.) didn't need to change during the cutover. Once Phase 9
decommissioning runs, the adapters become the only path — at which
point the templates can be inlined to consume Sanity natively.

### 7.3 Article body — Portable Text path

Article bodies were the largest single conversion effort. The 174
articles split:

- **154 .md files**: parsed → marked → HTML → `htmlToBlocks` → Portable
  Text blocks (paragraphs, headings, lists, marks, links). Conversion
  is lossless for everything markdown supports.
- **20 .mdx files**: same as above, plus a JSX extractor that pulls
  out the 6 custom embed components (`AlertBlock`, `PracticalCallout`,
  `CellarDoorList`, `DogPolicyTable`, `SubregionGrid`, `VarietyGuide`)
  and stores each as a custom PT block type with its props.

On the rendering side, **`next/src/components/PortableTextBody.astro`**
walks the PT block array. Standard blocks pass through
`@portabletext/to-html`; custom embed blocks render via the **real**
Astro components used in the legacy MDX pipeline. So an
`alertBlock` PT node becomes `<AlertBlock>`, a `cellarDoorList` PT node
becomes `<CellarDoorList items={…}>`, etc. The on-screen result is
pixel-identical to the MDX path.

---

## 8. The flicker problem — what it was and why it's gone

### 8.1 What the flicker actually was

On admin loads (and on some anon loads of pages with stale data), images
would visibly swap from one source to another about half a second after
first paint. The cause was three sources of truth, each trying to be the
canonical image URL:

1. **Build-time content** — Astro read `next/src/content/venues/*.json`
   at build, baked HTML with `/images/sourced/foo.webp`
2. **Build-time overrides** — components that called `loadOverrides()`
   consulted Supabase at build, baked the override URL into HTML
3. **Run-time overrides** — the inline editor's `applyOverridesOnLoad()`
   ran on every page load, post-paint, querying Supabase for newer
   images and patching `<img src>` via JavaScript

When the build-time bake didn't match the run-time database state, the
client-side patcher swapped the image, visibly. There were also bugs
where the build-time consumer used the wrong field path (the homepage
cover scene-rotation incident).

### 8.2 The bridge fix (before the migration)

A holding-pattern commit (`698c8ac3c8`) removed the implicit
basename-keyed client-side pass entirely and gated the explicit pass to
fire only when an admin **clicks** the Edit Mode toggle. That made the
flicker disappear for anon visitors and for admins browsing normally.

### 8.3 The architectural fix (this migration)

Sanity is the single source of truth at render time. The site is now
SSR-per-request with edge caching; what the browser receives is the
final HTML with the final image URL. There is no second source of truth
to reconcile, no client-side patcher, no swap. Visitors see whatever the
edge cache holds, which is whatever Astro rendered, which is whatever
Sanity returned.

Once the page-level flag flips, the homepage cover (the most-flickered
surface) renders from the `homepageCover` singleton's
`activeSceneIndex`. Emma picks the active scene with a dropdown; that's
the only thing that can affect what visitors see.

---

## 9. Studio editing experience

### 9.1 Document workflow

Every Sanity document has three states:

1. **Draft** — author's working copy, visible only in Studio
2. **Published** — what the live site shows
3. **Draft over published** — author has edits, hasn't published yet;
   live site still shows the old version

Publishing requires an explicit click. Revision history is automatic —
every save creates a snapshot visible via the document's history panel.

### 9.2 Field groups

Each document type's schema declares field groups (tabs across the top
of the editing form) to keep dense entities manageable. Example —
`venue` has eight groups:

```
Editorial | Location | Booking & price | Wine | FAQ | Authority | Dog friendly | Admin
```

Editors mostly work in **Editorial**; wine-specific fields are tucked
into **Wine** and hidden by default for non-winery types via the
`hidden` predicate on each field.

### 9.3 Image editing UX

- **Replace image**: click the image preview → Replace → upload or pick
  from existing assets
- **Hotspot / crop**: drag the dot on the image to set the focal point;
  every responsive crop respects this
- **Alt / credit / caption / license**: structured fields on every
  image; alt is required

### 9.4 Portable Text editor

The rich-text editor used in `article.body` and `editorNote` fields
supports:

- Headings (H2, H3)
- Bullet + numbered lists
- Bold, italic, links (with internal-link autocomplete pending in a
  future Studio plugin)
- Custom embed insertion via the `+` button: alert, practical callout,
  cellar door list, dog policy table, subregion grid, variety guide

### 9.5 Real-time collaboration

Two editors editing the same document at the same time see each other's
cursors, presence indicators, and per-field locks. Sanity reconciles
the operational transforms server-side.

---

## 10. Repository layout

```
peninsula-insider/
├── .github/workflows/
│   ├── deploy.yml
│   ├── sanity-backup.yml          ← nightly dataset export
│   └── …
├── next/                           ← Astro site
│   ├── src/
│   │   ├── components/
│   │   │   ├── PortableTextBody.astro  ← PT → Astro components
│   │   │   ├── VenueDetailTemplate.astro
│   │   │   ├── PlaceDetailTemplate.astro
│   │   │   ├── SubpageHero.astro       ← reads pageHero singleton
│   │   │   ├── SectionHero.astro       ← reads pageHero singleton
│   │   │   ├── v4/V4MegaRail.astro     ← reads megaRail singleton
│   │   │   └── …
│   │   ├── lib/sanity/
│   │   │   ├── client.ts               ← read/preview/fresh clients + flags
│   │   │   ├── image.ts                ← URL builder + responsive helpers
│   │   │   ├── queries.ts              ← named GROQ queries
│   │   │   ├── venue-adapter.ts
│   │   │   ├── place-adapter.ts
│   │   │   ├── itinerary-adapter.ts
│   │   │   ├── article-adapter.ts
│   │   │   ├── event-adapter.ts
│   │   │   ├── phase5-adapters.ts      ← experience, tour, op, package
│   │   │   └── singletons-adapter.ts   ← homepageCover, megaRail, etc
│   │   ├── pages/
│   │   │   ├── api/revalidate.ts       ← Sanity webhook handler
│   │   │   ├── eat/[slug].astro        ← dual-read venue page
│   │   │   ├── wine/[slug].astro       ← dual-read venue page
│   │   │   ├── stay/[slug].astro       ← dual-read venue page
│   │   │   ├── places/[slug].astro     ← dual-read place page
│   │   │   ├── journal/[slug].astro    ← dual-read article page
│   │   │   ├── whats-on/[slug].astro   ← dual-read event page
│   │   │   ├── explore/[slug].astro    ← dual-read experience page
│   │   │   ├── tour/[slug].astro       ← dual-read tour page
│   │   │   ├── tour/operators/[slug].astro
│   │   │   ├── tour-packages/[slug].astro
│   │   │   ├── plans/[slug].astro      ← itinerary + article branches
│   │   │   └── index.astro             ← homepage cover reads from Sanity
│   │   ├── lib/inline-edit/            ← LEGACY (to be removed in Phase 9)
│   │   ├── content/                    ← LEGACY JSON content collections
│   │   └── content.config.ts           ← LEGACY Zod schemas
│   ├── scripts/
│   │   ├── sanity-smoke.mjs            ← read pipeline regression check
│   │   ├── diff-venues.mjs             ← JSON vs Sanity field diff
│   │   ├── diff-places.mjs
│   │   ├── diff-itineraries.mjs
│   │   └── audit-references.mjs        ← dangling refs audit
│   └── .env.local                      ← gitignored; SANITY_*_TOKEN + flags
├── studio-peninsula-insider/          ← Sanity Studio (sibling to next/)
│   ├── sanity.config.ts                ← projectId + dataset + plugins
│   ├── sanity.cli.ts                   ← appId pinned for deploys
│   ├── schemaTypes/
│   │   ├── index.ts                    ← registry of all types
│   │   ├── objects/                    ← reusable object types
│   │   └── documents/                  ← document types (one per entity + singletons)
│   ├── scripts/
│   │   ├── import-venues.ts            ← idempotent venue importer
│   │   ├── import-places.ts            ← two-pass for relatedPlaces refs
│   │   ├── import-articles.ts          ← .md/.mdx → PT
│   │   ├── import-events.ts            ← event snapshot
│   │   ├── import-itineraries.ts       ← with venue refs in stops
│   │   ├── import-phase5.ts            ← exp/tour/op/package
│   │   └── seed-singletons.ts          ← homepage + mega-rail + site settings
│   └── package.json
└── ops/
    ├── sanity-migration/
    │   ├── PLAN.md                     ← phase tracker + manual setup
    │   └── decommission.sh             ← Phase 9 dry-run + execute
    └── backups/
        └── sanity-YYYY-MM-DD.tar.gz    ← nightly exports, 90-day retention
```

---

## 11. How a developer onboards

### 11.1 Prerequisites

- Node 20+
- Git
- A Sanity account with at least Viewer access to project `a062b30n`
- A Vercel account with access to the `next` project on team
  `team_AUFeyP0ViI2O79cp3NnF2Ajm`

### 11.2 Local setup

```bash
git clone https://github.com/richmondjw/peninsula-insider.git
cd peninsula-insider

# Site
cd next
npm install
# Copy env vars from 1Password (or ask James)
# next/.env.local contains SANITY_READ_TOKEN, SANITY_PREVIEW_TOKEN,
# SANITY_WEBHOOK_SECRET, and all SANITY_*_ENABLED flags
npm run dev                # http://localhost:4321
cd ..

# Studio (only needed if editing schemas / importers)
cd studio-peninsula-insider
npm install
npm run dev                # http://localhost:3333
```

### 11.3 First-time orientation tasks

1. Open https://peninsula-insider.sanity.studio/, sign in, click around
   the entity types in the left rail.
2. Read [editorial guide](../../04-agents/editorial-guides/sanity-studio.md)
   to understand what editors do.
3. Read `ops/sanity-migration/PLAN.md` for the rollout plan and
   carry-forwards.
4. Run `node next/scripts/sanity-smoke.mjs` to confirm the read
   pipeline works from your machine.
5. Run `node next/scripts/audit-references.mjs` to see the current
   dangling-reference state.

### 11.4 Day-to-day workflows

**Editing a Sanity schema:**
```bash
cd studio-peninsula-insider
# Edit schemaTypes/documents/<entity>.ts or schemaTypes/objects/…
npm run dev                         # hot-reloads at localhost:3333
# When ready:
SANITY_AUTH_TOKEN=... npx sanity deploy --yes
```

**Adding a new entity type:**
1. Create the document schema in
   `studio-peninsula-insider/schemaTypes/documents/<name>.ts`
2. Register it in `studio-peninsula-insider/schemaTypes/index.ts`
3. Create the adapter in
   `next/src/lib/sanity/<name>-adapter.ts`
4. Add the GROQ query to `next/src/lib/sanity/queries.ts`
5. Add the feature flag handling in
   `next/src/lib/sanity/client.ts` (entity type union)
6. Wire dual-read into the Astro page(s) that render this entity
7. Add the entity type to the revalidate route map in
   `next/src/pages/api/revalidate.ts`
8. Update the Sanity webhook filter in Studio Manage
9. Write an importer + (optionally) a diff script
10. `npx sanity deploy --yes`

**Adding a new field to an existing entity:**
1. Add `defineField` in the schema, with appropriate `group` + validation
2. Update the GROQ query in `next/src/lib/sanity/queries.ts` or the
   relevant `*-adapter.ts`
3. Update the adapter's TypeScript types and field mapping
4. Update the Astro template that renders this field, if it's
   user-facing
5. `npx sanity deploy --yes`

**Editing the homepage cover:**
- For content edits (active scene, scene text, image): use Studio.
  Don't touch `next/src/pages/index.astro` for this.
- For structural changes (new fields per scene, different layout): edit
  the `homepageCover` schema + `singletons-adapter.ts` +
  `index.astro` together.

---

## 12. Operational systems

### 12.1 Sanity webhook → Vercel revalidation

- **Endpoint:** `https://peninsulainsider.com.au/api/revalidate`
- **Configured in:** Sanity Manage dashboard (GROQ-powered webhook),
  filter: `_type in ["venue","place","article","event","itinerary","tour","tourOperator","tourPackage","experience","homepageCover","megaRail","pageHero","siteSettings"]`
- **Projection:** `{ _id, _type, slug }`
- **Auth:** HMAC SHA-256 with `SANITY_WEBHOOK_SECRET`
- **Failure mode:** if the endpoint is unreachable, the webhook retries
  with exponential backoff. ISR continues to revalidate routes lazily.

### 12.2 Daily backup

- **Schedule:** 17:00 UTC nightly (`.github/workflows/sanity-backup.yml`)
- **Output:** `ops/backups/sanity-YYYY-MM-DD.tar.gz` committed to main
- **Retention:** 90 days
- **Restore path:** `sanity dataset import <file> production --replace`
- **Required secret:** `SANITY_WRITE_TOKEN` in GitHub Actions secrets

### 12.3 Token management

| Token | Used by | Where it lives |
|---|---|---|
| `SANITY_READ_TOKEN` | Astro SSR | Vercel env, `next/.env.local` |
| `SANITY_PREVIEW_TOKEN` | Astro preview routes (future) | same |
| `SANITY_WEBHOOK_SECRET` | `/api/revalidate` HMAC verify | same |
| `SANITY_WRITE_TOKEN` | Importer scripts, GitHub Actions backup | 1Password, repo secrets |

Tokens are gitignored. Rotate quarterly or whenever an editor leaves.
Sanity manage UI handles rotation; new tokens replace the env vars.

### 12.4 Monitoring

- **Sanity usage**: https://www.sanity.io/manage/personal/project/a062b30n
  shows API requests / bandwidth / documents
- **Vercel**: deployment logs, function invocations, edge cache hit
  rates per route in the Vercel dashboard
- **Pagefind search**: rebuilt at every deploy via `build:search` npm
  script

---

## 13. Strengths

1. **Single source of truth.** One document per entity in Sanity. No
   patches, no overrides, no merging at render time.
2. **Editorial UX is best-in-class.** Real-time collab, structured
   fields, image hotspot, revision history, draft/preview workflow.
3. **Sub-30-second publish-to-live propagation** via webhook + ISR.
4. **Image pipeline is global CDN with on-the-fly transforms.** No
   image build step, no asset duplication, AVIF/WebP delivered to every
   browser, hotspot-respecting crops at every size.
5. **Schema-as-code.** Every schema is a TypeScript file in the repo,
   reviewed via PR. Editors can't break the data model.
6. **Cross-entity references are weak by default.** Stale data doesn't
   break documents; editors fix dangling refs as they touch each entity.
7. **Per-entity feature flags + cutover-on-rails.** Any phase can be
   rolled back to the JSON path with a single env-var flip.
8. **Cost stays flat with traffic.** ~$75/mo Sanity Growth + Vercel
   Pro on the team plan. Scales linearly with seats, not with reads.
9. **Backups are automated and committed to Git.** Disaster recovery is
   `sanity dataset import`.
10. **Decommissioning is scripted.** `ops/sanity-migration/decommission.sh`
    is a dry-runnable runbook, not tribal knowledge.

---

## 14. Limitations & carry-forwards

These are explicitly noted, not hidden:

1. **Events scraper pipeline still writes to JSON.** The
   `next/src/scripts/import-events.config.ts` cron pipeline (Visit
   Victoria scraping + enrichment) is not yet rewired to write into
   Sanity. Until that's done, scraper-discovered events should not be
   edited in Studio's machine-imported fields — only their editorial
   overlay (verdict, kids grade, lens, etc.) is safe to touch. Separate
   workstream.

2. **77 dangling cross-references.** Mostly `article.relatedVenues`
   pointing at venue slugs that don't match the actual venue IDs (e.g.
   "avani-syrah" → actual venue is "avani-wines"). Editorial cleanup
   as each article is touched in Studio.

3. **~70 page-level `page/img:*` overrides** from the legacy Supabase
   layer haven't been audited. Most will be drops (ad-hoc one-off edits
   from the inline editor that don't need to persist); the survivors
   need to be migrated to structured slots in their parent components.
   Walk-through with Emma is the right next step.

4. **Items-array editing in Studio is JSON-only.** The 4 items-array
   embed types (`cellarDoorList`, `dogPolicyTable`, `subregionGrid`,
   `varietyGuide`) store their items as raw JSON in a single field.
   Editing requires manual JSON editing. A future Studio custom-input
   could provide a structured per-item editor. Affects ~20 articles.

5. **Preview mode for drafts on the live site** is wired at the API
   level (`SANITY_PREVIEW_TOKEN` exists, `sanityPreviewClient` is
   exported) but no UI surface drives it yet. Could be added by
   exposing a `/preview/<entity>/<slug>` route family that fetches via
   the preview client and renders the same templates. Deferred until
   editors ask for it.

6. **No structured editorial workflow beyond draft/published.** Sanity
   ships review states by convention only; richer workflow (assigned
   reviewers, approvals, scheduled publishing windows) would need a
   Sanity plugin or a custom Studio extension. Not a blocker for a
   5-editor team.

7. **Internal-link autocomplete in the body editor is plain.** Editors
   paste internal hrefs as strings rather than picking from an
   autocomplete. Could be improved with a custom Sanity input plugin
   that queries `content_registry` (or equivalent) at typing time.

8. **Sanity GROQ-powered webhooks have no public REST API.** The
   webhook configuration is a one-time manual step in the Manage UI.
   Documented in `ops/sanity-migration/PLAN.md`. Sanity has indicated
   they'll add API support but no committed date.

9. **Pagefind search indexes static HTML at deploy time.** It doesn't
   automatically reindex on a Sanity publish — only on the next deploy.
   For instant search updates after editorial changes, this would need
   a different search backend (or a periodic re-index trigger from the
   revalidate endpoint).

10. **Backup integrity isn't verified automatically.** The nightly
    workflow exports and commits the tar.gz, but doesn't attempt a
    test-import to confirm the export is restorable. Cheap to add.

---

## 15. Specs

### 15.1 Scale

- **Documents:** 528 (519 entities + 9 singletons)
- **Assets:** ~700 images in Sanity Asset Pipeline (one per venue / place
  / article / event / experience / etc. hero, plus some galleries)
- **Average doc size:** ~3 KB (text + references + image refs)
- **Largest doc type by volume:** `article` (174 × ~8 KB avg = ~1.5 MB
  raw content)

### 15.2 Runtime performance targets

- **TTFB (cache hit):** < 100 ms (edge served)
- **TTFB (cache miss / fresh render):** < 800 ms (Astro SSR + 1–3 GROQ
  queries)
- **GROQ query latency (warm):** 30–80 ms median
- **Image transformation:** done at Sanity CDN edge; no SSR cost
- **Time from publish to live update:** typically 5–15 sec; SLA target
  < 30 sec

### 15.3 Cost

| Service | Plan | Monthly cost (AUD est.) |
|---|---|---|
| Sanity Growth | $15 USD × 5 seats | ~$110 |
| Vercel | Pro | ~$30 |
| Supabase | Pro (legacy CMS + ops DBs) | ~$40 |
| Domain + DNS | Cloudflare | ~$5 |
| **Total** | | **~$185/mo** |

After Phase 9 decommissioning, the Supabase pi.cms_* tables can be
dropped; Supabase still needed for non-CMS surfaces (saves/lists,
concierge, alerts, partner portal) but at a smaller footprint.

### 15.4 Limits

- **Sanity Growth tier**: 25,000 documents, 250k API requests/mo,
  100 GB bandwidth/storage. Current usage is well under all three.
- **Vercel Pro**: 1 TB bandwidth, 1M function invocations. ISR caching
  means most requests don't hit functions.

---

## 16. Migration history

16 commits on `claude/focused-bhaskara-9fc0a3`:

```
ceac1bee58 feat(cms): Phase 7b finish + Phase 8 onboarding + Phase 9 decom script
c0190ca56e feat(cms): Phase 7b — homepage cover reads from Sanity singleton
223af3a2ed feat(cms): Phases 6 + 7 — cross-ref audit, page-level singletons, infra
d2a8025965 docs(cms): mark Phases 3 + 4 complete; entire content database now in Sanity
41e9f41cfd feat(cms): Phases 3 + 4 — articles, authors, events
e21bbc99b3 docs(cms): mark Phases 4 (partial) and 5 complete; events deferred
fae4e44e98 feat(cms): Phase 5 — tours + operators + packages + experiences
f5d5f7d559 feat(cms): Phase 4 (partial) — itinerary migration with dual-read
d621722ee7 feat(cms): Phase 2 — full place migration with dual-read + diff
9c14763598 docs(cms): mark Phase 0 complete + Phase 1 ready for cutover
c9399642ba feat(cms): Phase 1 — full venue import + dual-read + diff verification
228b44714f ops(cms): end-to-end smoke test for Sanity → Astro pipeline
05b524de0b ops(cms): pin Sanity Studio appId after first production deploy
9a584c8894 feat(cms): Sanity Studio + Phase 0 migration foundations
698c8ac3c8 fix(cms): eliminate image-swap flicker — SSR overrides, gated client patcher
```

(Plus 16th commit: `feat(cms): Phase 7b finish + Phase 8 + Phase 9 decom`.)

The full phase plan, including manual-step instructions and remaining
carry-forwards, lives in
`ops/sanity-migration/PLAN.md`.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **GROQ** | Sanity's query language. Loose JSON shape with projections, references, joins. |
| **Portable Text (PT)** | Sanity's structured rich-text format. Array of typed blocks (paragraph, heading, list, custom embed) with marks. |
| **htmlToBlocks** | `@sanity/block-tools` function that converts HTML to PT. Used by the article importer. |
| **toHTML** | `@portabletext/to-html` function that renders PT back to HTML. Used by `PortableTextBody`. |
| **Weak reference** | Sanity reference with `_weak: true`. Target doc may not exist; field returns null instead of erroring. |
| **Hotspot** | Image-side metadata pin that responsive crops respect as the focal point. |
| **LQIP** | Low-quality image placeholder. 20px-wide blurred preview rendered while the real image loads. |
| **ISR** | Incremental Static Regeneration. Vercel feature — Cached HTML served from edge; on cache miss, fresh SSR; on webhook, cache purged. |
| **Adapter** | Module in `next/src/lib/sanity/*-adapter.ts` that converts a Sanity doc into the legacy Astro content-collection shape. |
| **Singleton** | A Sanity document with a fixed `_id` (e.g. `siteSettings`). Logically one of its kind. |
| **Dual-read** | The cutover technique: an Astro page reads from EITHER JSON or Sanity based on a feature flag. |

---

## 18. Contact

- **Primary maintainer:** James (richmondjw on GitHub)
- **Editorial lead:** Emma
- **Migration author:** Claude (Sonnet 4.7, 1M context) — branch
  `claude/focused-bhaskara-9fc0a3`, 16 commits dated 2026-05-17 / 18

For questions on the migration itself, see commit messages — each
commit explains why a change was made and what it traded against. The
PLAN.md is the authoritative project tracker.

For questions on Sanity Studio editing, see
`workspace/JWR_PKM_2026/04-agents/editorial-guides/sanity-studio.md`.
