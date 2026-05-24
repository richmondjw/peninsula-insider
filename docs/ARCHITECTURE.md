# Peninsula Insider — System & Database Architecture

> Last updated: 2026-05-24  
> Maintainer: James Richmond  
> Status: Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend — Astro Static Site](#2-frontend--astro-static-site)
3. [Content Layer — Astro Collections (JSON/MDX)](#3-content-layer--astro-collections-jsonmdx)
4. [CMS Layer — Sanity Studio](#4-cms-layer--sanity-studio)
5. [Database — Supabase (Auth Project)](#5-database--supabase-auth-project)
6. [Database — Supabase (Concierge Project)](#6-database--supabase-concierge-project)
7. [Inline Editor / Admin Overlay](#7-inline-editor--admin-overlay)
8. [Deployment](#8-deployment)
9. [Environment Variables](#9-environment-variables)
10. [Data Flow Summary](#10-data-flow-summary)

---

## 1. System Overview

Peninsula Insider is an **editorial guide** to the Mornington Peninsula — not a directory. The architecture reflects that: content lives in flat files in the repo, a headless CMS handles editorial overrides, and a Postgres database handles user accounts, saves, and the AI concierge.

```
┌─────────────────────────────────────────────────────────────────┐
│                   VISITOR (browser)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│              Vercel CDN  (peninsulainsider.com.au)              │
│        Static HTML prebaked at build time + SSR API routes      │
└──────┬────────────────────┬────────────────────┬────────────────┘
       │ static pages        │ /api/admin/*        │ /api/revalidate
       │                     │ /api/preview/*      │
  ┌────▼────┐          ┌─────▼──────┐       ┌─────▼──────┐
  │  Astro  │          │ Supabase   │       │  Sanity    │
  │  JSON   │          │  (Auth)    │       │  CMS       │
  │ Content │          │  Postgres  │       │  project   │
  │  Layer  │          │            │       │ a062b30n   │
  └─────────┘          └────────────┘       └────────────┘
                               │
                        ┌──────▼──────┐
                        │  Supabase   │
                        │(Concierge)  │
                        │  pgvector   │
                        │  /ask page  │
                        └─────────────┘
```

**Key principle:** The Astro JSON content layer is always the source of truth and the safe fallback. Sanity overrides are baked in at build time via a dual-read adapter. Supabase is user-state only — the public site renders without it.

---

## 2. Frontend — Astro Static Site

| Property | Value |
|---|---|
| Framework | Astro 6 |
| Output mode | `static` (with Vercel adapter for SSR API routes) |
| Deployment | Vercel — `peninsulainsider.com.au` |
| Repo path | `next/` |
| Config | `next/astro.config.mjs` |

### Key decisions

- **`output: 'static'`** — every content page is prerendered at build time. Sanity data is baked into the HTML; no client-side Sanity fetches on public pages.
- **API routes opt out of prerendering** via `export const prerender = false`. These are Vercel serverless functions: `/api/admin/*`, `/api/preview/*`, `/api/revalidate`.
- **Zero JS by default** on content pages. React islands are added only where needed (search overlay, maps, admin editor).
- **Trailing slashes** enforced (`trailingSlash: 'always'`). All internal links must include them.
- **Tailwind v4** via Vite plugin. Preflight disabled — Tailwind is opt-in per component, not global.
- **MDX** with `remark-block-ids` — every rendered paragraph gets a stable `data-pi-block-id` for the inline editor.

### Page routes

All routes live in `next/src/pages/`. Key structural routes:

| Route pattern | Content source |
|---|---|
| `/` | `index.astro` — Sanity `homepageCover` singleton + Astro collections |
| `/places/[slug]/` | `places/[slug].astro` — `places` collection |
| `/eat/[slug]/`, `/wine/[slug]/`, `/stay/[slug]/` | `venues/[slug].astro` — `venues` collection |
| `/explore/[slug]/` | `explore/[slug].astro` — `experiences` collection |
| `/plans/[slug]/` | `plans/[slug].astro` — `itineraries` collection |
| `/journal/[slug]/` | `journal/[slug].astro` — `articles` collection |
| `/events/[slug]/` | `events/[slug].astro` — `signature-events` collection |
| `/ask/` | `ask.astro` — AI concierge (Supabase Concierge project) |
| `/admin/` | `admin/index.astro` — inline editor dashboard |

---

## 3. Content Layer — Astro Collections (JSON/MDX)

All editorial content is stored as **JSON files** (and some MDX) under `next/src/content/`. This is the build-time source of truth.

### Collections

| Collection | Count | Format | Description |
|---|---|---|---|
| `venues` | ~144 | JSON | Restaurants, wineries, cellar doors, accommodation, experiences |
| `articles` | ~179 | JSON/MDX | Journal editorial pieces |
| `places` | 37 | JSON | Place hubs (Sorrento, Portsea, Red Hill, etc.) |
| `experiences` | 45 | JSON | Walks, beaches, parks, galleries, markets, golf courses |
| `itineraries` | 6 | JSON | Curated weekend plans |
| `signature-events` | 11 | JSON | Annual events (Pinot Palooza, Peninsula Picnic, etc.) |
| `events` | ~50 | JSON | Short-form calendar events |
| `authors` | — | JSON | Editor profiles |
| `quick-notes` | — | JSON | Homepage "Notebook" module (expiry-gated) |
| `weekend-picks` | — | JSON | Weekly editorial curation for homepage |
| `local-secrets` | — | JSON | Short local tips |
| `insiders-thirty` | — | JSON | The Insider's 30 list |
| `boat-hire`, `fishing-charters`, `fishing-locations`, `species`, `tour-operators`, `tour-packages`, `tours` | — | JSON | Marine/touring verticals |

### Collection config

Content schemas are defined in Astro's content collection config (auto-inferred from JSON shape — no explicit Zod schema in this project, types are maintained via TypeScript inference from the JSON structure).

### Routing pattern

Every collection entry is routed via `routeSlug(entry)` from `next/src/lib/editorial.ts`, which normalises the slug. The `getStaticPaths()` function in each page file maps the collection to URL params.

---

## 4. CMS Layer — Sanity Studio

**Project ID:** `a062b30n`  
**Dataset:** `production`  
**Studio URL:** `https://peninsula-insider.sanity.studio`  
**API version:** `2025-01-01`

Sanity is used as a **real-time editorial override layer** on top of the static JSON content. It does not replace the JSON files — it supplements them at build time (and via on-demand revalidation for live updates).

### Sanity documents (schema types)

Defined in `studio-peninsula-insider/schemaTypes/documents/`:

| Document type | Purpose |
|---|---|
| `venue` | Full venue content (parallel to JSON collection, dual-read adapter) |
| `place` | Place hub content |
| `article` | Journal article content |
| `experience` | Experience page content |
| `event` | Calendar event content |
| `itinerary` | Weekend plan content |
| `tour` / `tourOperator` / `tourPackage` | Marine/touring vertical content |
| `homepageCover` | **Singleton** — controls the homepage cover image, headline, caption, and scene rotation |
| `megaRail` | **Singleton** — controls the global mega-navigation editorial rail |
| `siteSettings` | **Singleton** — masthead label, edition name, footer links |
| `pageHero` | Per-page hero override (used for place/category hub pages) |

### Sanity objects (reusable schema types)

Defined in `studio-peninsula-insider/schemaTypes/objects/`:

`imageRef`, `coordinates`, `openingHourEntry`, `wines`, `visiting`, `tags`, `authority`, `sameAs`, `itineraryStop`, `onSiteFood`, `faqItem`, `embedBlocks`, `pageSections`

### Three Sanity clients

All defined in `next/src/lib/sanity/client.ts`:

| Client | CDN | Perspective | Stega | Use |
|---|---|---|---|---|
| `sanityClient` | Yes | Published | Disabled | All build-time and public SSR reads |
| `sanityClientFresh` | No | Published | Disabled | Revalidation / webhook handlers |
| `sanityPreviewClient` | No | Drafts | Enabled | `/preview/` routes inside Studio iframe only |

### Dual-read pattern

Pages that have a Sanity adapter (venues, places, articles, experiences, events, itineraries) use a **dual-read pattern**:

1. Astro content collection provides the base data (always available, baked at build time).
2. `sanityReadEnabled('<collection>')` checks environment flags.
3. If enabled, the Sanity adapter fetches a fresh copy and **replaces** the collection data.
4. The page template is unchanged — the adapter returns the same shape as the collection entry.

Feature flags: `PI_PUBLIC_SANITY_READS_DISABLED`, `SANITY_READ_ENABLED`, `SANITY_<COLLECTION>_ENABLED` (per-collection granular control).

**Currently:** All public dual-reads are disabled (`PI_PUBLIC_SANITY_READS_DISABLED=true` default). Sanity is active for **singletons only** (homepage cover, mega-rail, site settings, page heroes) — these always fetch from Sanity regardless of the feature flags.

### Sanity → Vercel revalidation

When an editor publishes in Sanity Studio, a webhook fires to `/api/revalidate`. This:
1. Verifies the HMAC signature (`SANITY_WEBHOOK_SECRET`)
2. Maps the document `_type` + slug to affected URL paths
3. Calls Vercel's on-demand revalidation API to drop the stale HTML

Configured for: `venue`, `place`, `article`, `event`, `itinerary`, `tour`, `tourOperator`, `tourPackage`, `experience`, `homepageCover`, `megaRail`, `pageHero`, `siteSettings`.

---

## 5. Database — Supabase (Auth Project)

**Project ID:** `tjjhpvslpysfklwpqmgz`  
**URL:** `https://tjjhpvslpysfklwpqmgz.supabase.co`  
**Schema:** `pi` (custom schema, exposed via PostgREST)  
**Auth:** Supabase Auth (email magic link + Google OAuth)  
**Extensions:** `vector`, `postgis`, `pg_trgm`

This is the **primary Supabase project** — user auth, profiles, saves, editorial features, CMS admin layer, and the search index.

### Tables

#### User management

| Table | Purpose | RLS |
|---|---|---|
| `pi.profiles` | One row per `auth.users` entry. Mirrors `is_editor`, `is_member`, newsletter opt-in, Stripe customer ID. Auto-created on signup via `pi.handle_new_user()` trigger. | Public read. Self-insert/update. |
| `pi.admin_user_allowlist` | Explicit CMS editor allowlist with roles (`editor`, `publisher`, `admin`) and `can_publish` flag. Layered on top of `profiles.is_editor`. | Editor-only read/write. |

#### User features

| Table | Purpose | RLS |
|---|---|---|
| `pi.user_saves` | Generic shortlist (kind: `venue`/`event`/`experience`, slug, title, href). One row per saved item. | Own-rows only. |
| `pi.user_itineraries` | Single owned itinerary per user. `items` and `days` stored as JSONB. | Own-row only. |
| `pi.event_alerts` | Reader alert subscriptions — by category, place_slug, or lens. Email and browser notification flags. | Own-rows only. |

#### Pass / membership

| Table | Purpose | RLS |
|---|---|---|
| `pi.pass_subscriptions` | Cached mirror of Stripe subscription records. Populated by webhook. Primary key: `stripe_subscription_id`. Stores tier (`insider`/`founders`), status, `current_period_end`, `cancel_at_period_end`. | Own-rows. Editors can read all. |

`pi.profiles` is extended with: `is_member`, `pass_tier`, `pass_active_until`, `stripe_customer_id`.

#### Awards

| Table | Purpose | RLS |
|---|---|---|
| `pi.award_categories` | Category definitions with voting window dates and `published` flag. | Public read. Editor write. |
| `pi.award_nominees` | Nominees per category — references venue/event/experience/place by slug, or free-text `custom_label`. | Public read. Editor write. |
| `pi.award_votes` | One vote per user per category. Composite PK `(user_id, category_slug)`. | Own-rows. Editor read all. |
| `pi.award_nominations` | Public nominations submitted by readers (email + reason). | Anon insert. Editor read. |
| `pi.award_vote_counts` (view) | Aggregated vote counts per nominee for the results display. | Public read. |

#### Community

| Table | Purpose | RLS |
|---|---|---|
| `pi.submissions` | Community venue/experience/event submissions form. Stores name, category, description, contact email, image paths. | Anon insert. Editor read/write. |

Storage bucket `submissions` holds uploaded images (4MB max, JPEG/PNG/WebP, private — editor read only).

#### Analytics

| Table | Purpose | RLS |
|---|---|---|
| `pi.site_search_queries` | One row per search event. Captures query, result count, surface (`overlay`/`search_page`), user_id (nullable), session_id. | Anon insert only. Service role reads for reporting. |

#### CMS admin layer

| Table | Purpose | RLS |
|---|---|---|
| `pi.cms_text_fields` | Editable text field overrides. Keyed by `(entity_type, entity_slug, field_path, locale)`. `status`: `draft`/`published`. | Editor write. Public read when published. |
| `pi.cms_image_slots` | Editable image slot overrides. Keyed by `(entity_type, entity_slug, field_path)`. Stores `storage_path`, `public_url`, `alt_text`, `caption`, `credit`. | Editor write. Public read when published. |
| `pi.cms_revisions` | Append-only audit log of every CMS edit. Stores JSON patch, action, status, `created_by`. | Editor read. |
| `pi.content_registry` | Canonical list of every `(entity_type, entity_slug)` the site renders. Refreshed at deploy time from Astro collections by `scripts/refresh-content-registry.mjs`. CMS writes are rejected if the entity isn't registered here. | Public read. |
| `pi.image_bindings` | Editor-supplied bindings from an untagged page image (URL pattern + basename) to a Sanity document + field path. Powers the "Bind to Sanity" right-click flow. | Public read. Editor write. |

#### Entity search index

| Table | Purpose |
|---|---|
| `pi.entity_attributes` | Normalised facet store. One row per `(entity, facet, value)`. Used for coverage dashboards and attribute filtering. |
| `pi.entity_index` | Denormalised entity rows with `body_tsv` (full-text), `embedding` (pgvector, 1536-dim), `geography` (PostGIS point), and `facets` JSONB. The primary search table. |

Populated at deploy time by `scripts/refresh-entity-index.mjs`, embedded by `scripts/embed-entity-index.mjs`.

### Key stored functions

| Function | Purpose |
|---|---|
| `pi.handle_new_user()` | Trigger: auto-creates `pi.profiles` row on `auth.users` insert |
| `pi.assert_content_registry_match()` | Trigger: blocks CMS writes for unregistered entities |
| `pi.search(q, filters, ...)` | Hybrid search RPC combining lexical (tsvector), semantic (pgvector cosine), facet JSONB predicates, spatial filter, and time-window filter. Used by `/ask` concierge and search overlay. |
| `pi.facet_match_count(facets, filters)` | Helper: counts how many required facets an entity satisfies (ranking input) |

### RLS pattern

All tables use Row-Level Security. The standard patterns are:

- **Own-rows**: `using (user_id = auth.uid())` — users read/write their own data only
- **Editor-all**: checks `pi.profiles.is_editor = true` or `pi.admin_user_allowlist` membership
- **Public-read**: `using (true)` — no auth required to read published content
- **Anon-insert**: `with check (true)` — for submissions and nominations

---

## 6. Database — Supabase (Concierge Project)

**Project ID:** `mvdtkgsfuhmkioygxgge`  
**Schema:** `public`  
**Purpose:** AI concierge vector search for the `/ask` page

This is a **separate Supabase project** used exclusively for the AI concierge to avoid mixing the large vector index with the auth database.

### Tables

| Table | Purpose |
|---|---|
| `concierge_chunks` | Pre-chunked text from all editorial content. Each row: `chunk_id`, `source_entity_type`, `source_entity_id`, `page_slug`, `page_title`, `section_heading`, `category`, `region`, `vendor_relationship`, `editorial_tier` (A/B), `text`, `embedding` (vector), `metadata_fingerprint`, `event_date`. |

### Key RPCs

| Function | Purpose |
|---|---|
| `concierge_vector_search(query_embedding, match_count, filter_region, filter_category, filter_source_type, filter_entity_ids)` | Cosine similarity search over `concierge_chunks.embedding`. Optional filters for region, category, source type, and entity IDs (passed from `pi.search` results). |
| `concierge_bm25_search(query, ...)` | Lexical BM25 search, same filter surface. |

Chunks are populated by `ops/scripts/refresh-corpus.mjs` and embedded by a separate embedding pipeline. The `editorial_tier` column (`A`/`B`) gates which chunks are returned — originally only tier A was returned, relaxed to A/B after the concierge outage in May 2026.

---

## 7. Inline Editor / Admin Overlay

The site has a built-in right-click editorial overlay for editors. Components are tagged with `data-pi-edit` attributes that open a Sanity field editor or CMS image replacement dialog on right-click (in admin mode only).

**Key files:**

| File | Purpose |
|---|---|
| `next/src/lib/inline-edit/attrs.ts` | `editableText()` and `editableImage()` — generate `data-pi-edit` attribute objects |
| `next/src/lib/inline-edit/overrides.ts` | `loadOverrides()` — reads published `cms_image_slots` from Supabase at build time and bakes override URLs into static HTML |
| `next/src/lib/inline-edit/sanity-image-overlay.ts` | Client-side overlay: right-click → upload → Sanity PATCH |
| `next/src/lib/inline-edit/sanity-bind-modal.ts` | Client-side "Bind to Sanity doc" modal — writes to `pi.image_bindings` |

**Admin API:** `GET/PUT /admin/api/content/:collection/:slug` — reads/writes `pi.cms_text_fields` and `pi.cms_image_slots`. Authorised via Supabase JWT cookie.

**Admin login:** `/admin/login.astro` — Google OAuth via Supabase Auth. Admin access requires a row in `pi.admin_user_allowlist`.

---

## 8. Deployment

| Layer | Service | Trigger |
|---|---|---|
| **Site build** | Vercel | Push to `main` branch |
| **Content registry refresh** | Build step | `scripts/refresh-content-registry.mjs` runs during `astro build` |
| **On-demand revalidation** | Vercel + Sanity webhook | Editor publishes in Sanity Studio → `POST /api/revalidate` |
| **Entity index refresh** | Manual / scheduled | `scripts/refresh-entity-index.mjs` |
| **Concierge corpus refresh** | Scheduled (cron) | `ops/scripts/refresh-corpus.mjs` |

**Build command:** `npm run build` (in `next/`)  
**Output dir:** `.vercel/output/` (via `@astrojs/vercel`)

The `dist/` at the repo root is a **GitHub Pages copy** of a prior static build — it is not `peninsulainsider.com.au`. The Vercel build produces the live site independently.

---

## 9. Environment Variables

Set in Vercel project settings (and locally in `next/.env.local`):

| Variable | Used by | Purpose |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Client + server | Supabase Auth project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase public anon key (safe to expose) |
| `SUPABASE_SERVICE_KEY` | Server / scripts | Supabase service role key (bypasses RLS) |
| `SANITY_READ_TOKEN` | Build + SSR | Sanity API read token |
| `SANITY_WRITE_TOKEN` | Admin API | Sanity API write token (inline editor patches) |
| `SANITY_WEBHOOK_SECRET` | `/api/revalidate` | HMAC secret for Sanity webhook verification |
| `SANITY_READ_ENABLED` | Build | Master switch for Sanity dual-reads (`true`/`false`) |
| `PI_PUBLIC_SANITY_READS_DISABLED` | Build | Emergency override — disables all public Sanity reads when `true` |
| `SANITY_<COLLECTION>_ENABLED` | Build | Per-collection Sanity dual-read flag |
| `STRIPE_SECRET_KEY` | Server | Stripe API secret (Pass payments) |
| `STRIPE_WEBHOOK_SECRET` | Webhook handler | Stripe webhook HMAC verification |
| `RESEND_API_KEY` | Email | Transactional email via Resend |
| `CONCIERGE_SUPABASE_URL` | `/ask` page | Concierge Supabase project URL |
| `CONCIERGE_SUPABASE_ANON_KEY` | `/ask` page | Concierge Supabase anon key |

---

## 10. Data Flow Summary

### How a venue page renders

1. `astro build` runs `getStaticPaths()` — walks `next/src/content/venues/` and maps each JSON file to a URL slug.
2. For each venue, `sanityReadEnabled('venues')` is checked. Currently returns `false` — the JSON file is used as-is.
3. `loadOverrides('venue', slug)` queries `pi.cms_image_slots` in Supabase for any published editor image overrides, and bakes the URL into the prerendered HTML.
4. Vercel serves the static HTML from its CDN.

### How the homepage cover image works

1. `index.astro` calls `fetchHomepageCoverFromSanity()` at build time.
2. If Sanity returns a `homepageCover` document, `sanityActiveSceneIndex` is set and `ssrScene` is fully overridden with Sanity's image URL, headline, and caption.
3. If Sanity is unreachable, `sanityActiveSceneIndex` remains `null` and the hardcoded `scenes[0]` in the file is used as fallback.
4. **Changing the cover image** = update the `homepageCover` document in Sanity Studio (or right-click the image in admin mode to replace it). Code changes to `scenes[0]` only affect the fallback when Sanity is down.

### How a reader saves a venue

1. Visitor clicks "Save" on a venue card → `PiSaveActions` island fires.
2. `getSupabase()` returns the singleton Supabase JS client (schema: `pi`).
3. `UPSERT INTO pi.user_saves (user_id, kind, slug, title, href)` with `user_id = auth.uid()`.
4. RLS policy `user_saves_insert_own` enforces the user can only write their own saves.
5. On `/account/saved/`, the same client `SELECT`s with the `user_saves_select_own` policy.

### How the AI concierge answers a query

1. `/ask` page → user types a question → client fires the Concierge API.
2. The query is embedded (OpenAI `text-embedding-3-small`).
3. `pi.search()` runs on the Auth project for facet/attribute filtering — returns matching `entity_type:entity_slug` IDs.
4. `concierge_vector_search()` runs on the Concierge project, hard-filtered to the entity IDs from step 3.
5. Top chunks are returned to the LLM (Claude) with the user's question.
6. Answer is streamed back.
