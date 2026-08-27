# Peninsula Insider — System & Database Architecture

> **Status:** Current
> **Last verified against the codebase:** 2026-08-27
> **Maintainer:** James Richmond
>
> **Orientation lives in the [project wiki](https://github.com/richmondjw/peninsula-insider/wiki).** This file is the deep reference for system and database structure. The wiki covers how the pieces fit together, how to work on them, and how to operate them.
>
> **Revision note (2026-08-27):** the 2026-05-24 revision of this file described Vercel hosting and a Sanity CMS. Both were accurate when written and neither is true now. Those sections have been rewritten. See [Appendix A](#appendix-a--what-changed-and-why) for what moved and when, so older documents that still reference the old model can be read correctly.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend — Astro static site](#2-frontend--astro-static-site)
3. [Content Layer — Astro Collections (JSON/MDX)](#3-content-layer--astro-collections-jsonmdx)
4. [CMS Layer — Supabase override store](#4-cms-layer--supabase-override-store)
5. [Database — Supabase (Auth Project)](#5-database--supabase-auth-project)
6. [Database — Supabase (Concierge Project)](#6-database--supabase-concierge-project)
7. [Inline Editor / Admin Overlay](#7-inline-editor--admin-overlay)
8. [Deployment](#8-deployment)
9. [Environment Variables](#9-environment-variables)
10. [Data Flow Summary](#10-data-flow-summary)
11. [Appendix A — What changed and why](#appendix-a--what-changed-and-why)

---

## 1. System Overview

Peninsula Insider is an **editorial guide** to the Mornington Peninsula, not a directory. The architecture reflects that: content lives in flat files in the repo, a Supabase-backed override layer handles editorial corrections, and Postgres handles user accounts, saves, and the AI concierge.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISITOR (browser)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│         GitHub Pages  (peninsulainsider.com.au)                 │
│   Fully prerendered static HTML, served from the gh-pages branch│
└──────┬────────────────────┬─────────────────────┬───────────────┘
       │ static pages       │ client-side calls   │ client-side calls
       │                    │                     │
  ┌────▼────┐         ┌─────▼──────┐       ┌──────▼──────┐
  │  Astro  │         │  Supabase  │       │  Concierge  │
  │  JSON   │         │   (Auth)   │       │     API     │
  │ Content │         │  Postgres  │       │  (separate  │
  │  Layer  │         │            │       │    repo)    │
  └─────────┘         └────────────┘       └──────┬──────┘
                                                  │
                                           ┌──────▼──────┐
                                           │  Supabase   │
                                           │ (Concierge) │
                                           │  pgvector   │
                                           └─────────────┘
```

**Key principle:** the Astro JSON content layer is always the source of truth and the safe fallback. Supabase supplements it with published editor overrides, baked in at build time, and holds user state. **The public site renders without it.** Do not trade that property away.

---

## 2. Frontend — Astro static site

| Property | Value |
|---|---|
| Framework | Astro 6 |
| Output mode | `static` — every page prerendered at build time |
| Deployment | GitHub Pages, `gh-pages` branch, CNAME `peninsulainsider.com.au` |
| Repo path | `next/` |
| Config | `next/astro.config.mjs` |
| Build output | `next/dist` |

### Key decisions

- **`output: 'static'`** by default. The public site is fully prerendered. There are no serverless API routes in the published build.
- **Optional hybrid admin mode.** Setting `PI_ADMIN_HYBRID=1` switches to `output: 'server'` and dynamically loads `@astrojs/vercel`, so `src/middleware.ts` runs at request time and `/admin/api/*` becomes real serverless. The adapter is **not a dependency**: it is imported dynamically and the build throws a clear error if hybrid mode is requested without it installed. This path is for local and preview use; production is static.
- **Zero JS by default** on content pages. React islands are added only where needed (search overlay, maps, admin editor, save actions).
- **Trailing slashes enforced** (`trailingSlash: 'always'`). All internal links must include them.
- **Tailwind v4** via the Vite plugin. Preflight is disabled in `styles/tailwind.css`, so Tailwind never resets the global design system. It applies only inside files that explicitly `@import 'tailwind.css'`.
- **MDX with `remark-block-ids`** — every rendered paragraph, heading, list and blockquote gets a stable `data-pi-block-id`, which the inline editor uses as its key.
- **`cacheBustImages()`** appends `?v=<contenthash>` to `/images/*` references in built HTML, so an editor byte-swap invalidates stale CDN and browser caches. Build-only.
- **Redirects are page files, not config.** Use `src/components/Redirect.astro`, which gives flash-free JS redirects instead of Astro's meta-refresh HTML. **Do not add redirect entries to `astro.config.mjs`.**
- **Preview builds** to `/V2/` on GitHub Pages set `ASTRO_BASE=/V2/`. Production leaves it unset.

### Page routes

All routes live in `next/src/pages/`. Key structural routes:

| Route pattern | Content source |
|---|---|
| `/` | `index.astro` — composed from several collections |
| `/places/[slug]/` | `places` collection |
| `/eat/[slug]/`, `/wine/[slug]/`, `/stay/[slug]/` | `venues` collection |
| `/explore/[slug]/` | `experiences` collection |
| `/plans/[slug]/` | `itineraries` collection |
| `/journal/[slug]/` | `articles` collection |
| `/events/[slug]/` | `signature-events` and `events` collections |
| `/ask/` | AI concierge (calls the Concierge API) |
| `/admin/` | inline editor dashboard — **pruned from the public build** |

---

## 3. Content Layer — Astro Collections (JSON/MDX)

All editorial content is stored as **JSON files** (and some MDX) under `next/src/content/`. This is the build-time source of truth.

**Schemas are explicit Zod**, declared in `next/src/content.config.ts` (~1,500 lines, Astro 6 Content Layer format, one glob loader per collection). An earlier revision of this file claimed schemas were inferred from JSON shape with no explicit Zod. That was wrong.

Shared enums are declared once and reused across collections: `zone` (7 values), `season`, `mood` (25 values), `audience`, and `imageLicense`. A value outside the enum is a validation failure, not a warning.

Collection inventory and counts: see the wiki's [Content Model](https://github.com/richmondjw/peninsula-insider/wiki/Content-Model) page, which is regenerated against the tree rather than hand-maintained here.

### Routing pattern

Every collection entry is routed via `routeSlug(entry)` from `next/src/lib/editorial.ts`, which normalises the slug. The `getStaticPaths()` in each page file maps the collection to URL params.

### Taxonomy

`next/src/taxonomy/facet-taxonomy.yaml` is the canonical reconciliation layer across per-collection vocabularies: `facets` (canonical families), `mappings` (per-collection field mapping), `policy` (strict vs advisory, deprecation, promotion timing). Lint with `npm run lint:taxonomy`.

---

## 4. CMS Layer — Supabase override store

**The canonical CMS reference is [`docs/cms-architecture.md`](cms-architecture.md).** That document is current and this section is a summary of it.

Editorial overrides are stored in the `pi` schema in Supabase and **baked into the static HTML at build time**. There is no headless CMS product in the stack.

The model is **entity-scoped**: every editable element declares its identity (`entityType`, `entitySlug`, `fieldPath`), and overrides key on that identity. **Overrides are never keyed on filename.** That rule exists because filename keying caused a real incident on 2026-05-11, where replacing one venue's hero photo replaced it on every other venue sharing the same file.

`pi.content_registry` is the canonical list of every entity the site renders, refreshed from the Astro collections. The `pi.assert_content_registry_match()` trigger rejects CMS writes for unregistered entities.

> **Retired: Sanity.** Between roughly April and mid-2026 the stack included a Sanity Studio (project `a062b30n`) as a real-time override layer, read at build time through a dual-read adapter behind `SANITY_*` feature flags, with a webhook to `/api/revalidate`. **It is fully removed.** There are zero `sanity` references in `next/src` and no studio directory in the repo. Older documents describing dual-reads, Sanity singletons (`homepageCover`, `megaRail`, `siteSettings`, `pageHero`), or `SANITY_*` environment variables are describing a retired system.

---

## 5. Database — Supabase (Auth Project)

> **Verification note:** the table and function inventory below was documented on 2026-05-24 and has **not been re-verified against the live database** in this revision. Structure is believed current; treat specific column lists as indicative and confirm against the database before depending on them.

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
| `pi.content_registry` | Canonical list of every `(entity_type, entity_slug)` the site renders. Refreshed from Astro collections by `scripts/refresh-content-registry.mjs`. CMS writes are rejected if the entity isn't registered here. **Refresh is manual-only — see [section 8](#the-supabase-refresh-gap-open-decision).** | Public read. |
| `pi.image_bindings` | Editor-supplied bindings from an untagged page image (URL pattern + basename) to a document + field path. | Public read. Editor write. |

#### Entity search index

| Table | Purpose |
|---|---|
| `pi.entity_attributes` | Normalised facet store. One row per `(entity, facet, value)`. Used for coverage dashboards and attribute filtering. |
| `pi.entity_index` | Denormalised entity rows with `body_tsv` (full-text), `embedding` (pgvector, 1536-dim), `geography` (PostGIS point), and `facets` JSONB. The primary search table. |

Populated by `scripts/refresh-entity-index.mjs`, embedded by `scripts/embed-entity-index.mjs`. **See [section 8](#refreshing-the-search-index) — this no longer happens automatically on deploy.**

### Key stored functions

| Function | Purpose |
|---|---|
| `pi.handle_new_user()` | Trigger: auto-creates `pi.profiles` row on `auth.users` insert |
| `pi.assert_content_registry_match()` | Trigger: blocks CMS writes for unregistered entities |
| `pi.search(q, filters, ...)` | Hybrid search RPC combining lexical (tsvector), semantic (pgvector cosine), facet JSONB predicates, spatial filter, and time-window filter. Used by the concierge and the search overlay. |
| `pi.facet_match_count(facets, filters)` | Helper: counts how many required facets an entity satisfies (ranking input) |

### RLS pattern

All tables use Row-Level Security. The standard patterns are:

- **Own-rows**: `using (user_id = auth.uid())`
- **Editor-all**: checks `pi.profiles.is_editor = true` or `pi.admin_user_allowlist` membership
- **Public-read**: `using (true)`
- **Anon-insert**: `with check (true)` — for submissions and nominations

Pick one of these deliberately when adding a table. Do not invent a fifth.

---

## 6. Database — Supabase (Concierge Project)

**Schema:** `public`
**Purpose:** AI concierge vector search for the `/ask` page

A **separate Supabase project**, used exclusively for the concierge so the large vector index does not sit alongside the auth database.

### Tables

| Table | Purpose |
|---|---|
| `concierge_chunks` | Pre-chunked text from all editorial content. Each row: `chunk_id`, `source_entity_type`, `source_entity_id`, `page_slug`, `page_title`, `section_heading`, `category`, `region`, `vendor_relationship`, `editorial_tier` (A/B), `text`, `embedding` (vector), `metadata_fingerprint`, `event_date`. |

### Key RPCs

| Function | Purpose |
|---|---|
| `concierge_vector_search(query_embedding, match_count, filter_region, filter_category, filter_source_type, filter_entity_ids)` | Cosine similarity search over `concierge_chunks.embedding`. Optional filters for region, category, source type, and entity IDs (passed from `pi.search` results). |
| `concierge_bm25_search(query, ...)` | Lexical BM25 search, same filter surface. |

Chunks are populated by `ops/scripts/refresh-corpus.mjs` and embedded by a separate pipeline. The `editorial_tier` column (`A`/`B`) gates which chunks are returned — originally tier A only, relaxed to A/B after the concierge outage in May 2026.

---

## 7. Inline Editor / Admin Overlay

The site has a built-in right-click editorial overlay for editors. Components are tagged with `data-pi-edit` attributes that open a field editor or image replacement dialog on right-click, in admin mode only.

**Key files:**

| File | Purpose |
|---|---|
| `next/src/lib/inline-edit/attrs.ts` | `editableText()` and `editableImage()` — generate `data-pi-edit` attribute objects |
| `next/src/lib/inline-edit/client.ts` | Client-side overlay: right-click, contenteditable, save UI |
| `next/src/lib/inline-edit/overrides.ts` | `loadOverrides()` — reads published `cms_image_slots` from Supabase at build time and bakes override URLs into static HTML |
| `next/src/lib/inline-edit/resolve-hero.ts` | Hero image resolution |
| `next/src/lib/inline-edit/remark-block-ids.mjs` | Stamps stable `data-pi-block-id` on rendered markdown blocks |

Server-side access control lives in `next/src/lib/cms/` (`api.ts`, `schema.ts`, `server.ts`, `validators.ts`).

**Admin API:** `GET/PUT /admin/api/content/[collection]/[slug]` — reads and writes `pi.cms_text_fields` and `pi.cms_image_slots`. Authorised via Supabase JWT cookie.

**Admin gate:** `next/src/middleware.ts` allows a request to reach `/admin` or `/admin/api/*` only with a valid Supabase session **and** an editor flag, checked RLS-backed through `resolveCmsAccess()`. A legacy fallback gate exists behind `PI_ADMIN_LEGACY_GATE=1` for QA.

**Admin does not ship to production.** The deploy workflow removes `next/dist/admin` and `next/dist/dev` before publishing. Admin remains available in local dev and in `PI_ADMIN_HYBRID` server builds.

---

## 8. Deployment

**Push to `main`. There is no manual deploy step.**

| Layer | Mechanism | Trigger |
|---|---|---|
| **Site build and publish** | `.github/workflows/build-and-deploy.yml` | Push to `main` touching watched paths, plus six scheduled rebuilds, plus manual dispatch |
| **Hosting** | GitHub Pages, `gh-pages` branch | Written only by the deploy workflow |
| **Content registry / entity index / embeddings** | `.github/workflows/pi-data-refresh.yml` | **Manual dispatch only** |
| **Concierge corpus refresh** | `ops/scripts/refresh-corpus.mjs` | Scheduled |

**Build command:** `npm run build:search` in `next/` (which runs the full gate stack, `astro build`, then Pagefind).
**Output dir:** `next/dist`.
**Publish:** `peaceiris/actions-gh-pages@v3` to `gh-pages` with `cname: peninsulainsider.com.au`.

The workflow's watched paths deliberately include `next/scripts/**` and `ops/scripts/seo/**`. Omitting them once meant a change to a build gate never exercised that gate. **A change to the thing that guards the build must rebuild the build.**

Deploy failures raise a deduplicated `pi-alert` GitHub issue via `engine/alert.py`.

Full workflow inventory: the wiki's [CI and Workflows](https://github.com/richmondjw/peninsula-insider/wiki/CI-and-Workflows) page.

### The Supabase refresh gap (open decision)

**Recorded here so it is not rediscovered a third time.**

`deploy.yml` used to refresh `pi.content_registry`, refresh `pi.entity_index` with `--apply --prune`, embed vectors, and run a failing post-publish search audit **on every deploy**. When it was consolidated into `build-and-deploy.yml`, **those steps did not move.**

`refresh-content-registry.mjs`, `refresh-entity-index.mjs` and `embed-entity-index.mjs` are now invoked from **exactly one place**: `pi-data-refresh.yml`, which is `workflow_dispatch` only. They are not in the deploy workflow, not in `npm run build`, and not in an Astro integration.

Two consequences, both live:

**1. Live search can be stale indefinitely.** `pi.entity_index` only refreshes on a manual dispatch. Pagefind, which indexes the built site, *does* refresh on every deploy, so **a fresh Pagefind index is not evidence that live search is clean**. They are separate surfaces. This is the exact trap `docs/search-health-runbook-2026-06-03.md` was written to prevent, except the guardrail it describes is gone.

**2. Newly added content cannot be edited in the CMS until a manual refresh.** `pi.content_registry` only refreshes on the same manual dispatch, and `pi.assert_content_registry_match()` rejects CMS writes for unregistered entities. So a new venue or article shipped by the content engine will produce a `foreign_key_violation` on its first inline edit. Existing guidance says to "wait for a deploy refresh" — **there is no longer a deploy refresh to wait for.** Dispatch `PI Data Refresh`.

**Open decision:** restore these steps to the deploy path (cost: embedding calls on every deploy, and a new way for a deploy to fail after publish), or keep them manual and document the windows explicitly. Not yet decided.

Until then, after any deploy that adds or materially changes content, dispatch **PI Data Refresh** and then:

```bash
cd next && npm run search:audit -- --limit=10 --fail-on-broken
```

### What is not the site

The repository root contains directories that look like the live site (`eat/`, `wine/`, `about/`, `_astro/`), plus `index.html` and a root `CNAME`. These are **leftovers of the retired `build-live.sh` root-deploy model**. The live site builds from `next/`. Editing the root copies changes nothing.

---

## 9. Environment Variables

Set in GitHub Actions secrets, and locally in `next/.env.local`. **Names only — never commit values.**

### Build-time, set in the deploy workflow

| Variable | Purpose |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase Auth project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (safe to expose) |
| `PUBLIC_CONCIERGE_API_URL` | Concierge API endpoint for `/ask` |
| `PUBLIC_ACCESS_GATE` | Client-side password gate. `off` in production. |
| `PUBLIC_NEWSLETTER_POPUP` | Insider Note signup popup. `on` in production. |

### Server, scripts and engine

| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Scripts, engine | Service role key — **bypasses RLS** |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pass payments | Stripe API and webhook verification |
| `ANTHROPIC_API_KEY` | `engine/` | Content generation |
| `PAT_CONTENT_PUSH` | Content workflows | GitHub PAT with repo write access |
| `OPENAI_API_KEY` | Index scripts | Entity embedding |
| `FIRECRAWL_API_KEY`, `SEMRUSH_API_KEY` | `engine/` | Optional — competitive scans and SEO signals |
| `BABYLOVEGROWTH_API_BASE_URL`, `BABYLOVEGROWTH_API_KEY` | Draft import workflow | External draft provider |

### Build-mode switches

| Variable | Purpose |
|---|---|
| `PI_ADMIN_HYBRID` | `1` switches to server output and loads the Vercel adapter |
| `PI_ADMIN_LEGACY_GATE` | `1` enables the legacy admin gate for QA |
| `ASTRO_BASE` | `/V2/` for preview builds; unset in production |

**Retired:** `SANITY_READ_TOKEN`, `SANITY_WRITE_TOKEN`, `SANITY_WEBHOOK_SECRET`, `SANITY_READ_ENABLED`, `SANITY_<COLLECTION>_ENABLED`, `PI_PUBLIC_SANITY_READS_DISABLED`, `RESEND_API_KEY`. If you find these set anywhere, they are dead configuration.

---

## 10. Data Flow Summary

### How a venue page renders

1. `astro build` runs `getStaticPaths()` — walks `next/src/content/venues/` and maps each JSON file to a URL slug.
2. `loadOverrides('venue', slug)` queries `pi.cms_image_slots` for published editor image overrides and bakes the URL into the prerendered HTML.
3. `cacheBustImages()` appends a content hash to `/images/*` references.
4. The gate stack asserts the emitted HTML before anything is published.
5. GitHub Pages serves the static HTML.

### How a reader saves a venue

1. Visitor clicks "Save" on a venue card → the save island fires.
2. `getSupabase()` returns the singleton Supabase client (schema: `pi`).
3. `UPSERT INTO pi.user_saves (user_id, kind, slug, title, href)` with `user_id = auth.uid()`.
4. RLS policy `user_saves_insert_own` enforces that a user can only write their own saves.
5. On `/account/saved/`, the same client `SELECT`s under `user_saves_select_own`.

### How the AI concierge answers a query

1. `/ask` page → user types a question → the client calls the Concierge API.
2. The query is embedded (OpenAI `text-embedding-3-small`).
3. `pi.search()` runs on the Auth project for facet and attribute filtering, returning matching `entity_type:entity_slug` IDs.
4. `concierge_vector_search()` runs on the Concierge project, **hard-filtered to the entity IDs from step 3**.
5. Top chunks go to the LLM with the user's question.
6. The answer streams back.

Step 4's hard filter is what enforces "no invented venues" structurally rather than by prompt instruction alone.

---

## Appendix A — What changed and why

Older documents in `docs/` were accurate when written. This table lets them be read correctly rather than discarded.

| Was | Is now | Notes |
|---|---|---|
| Vercel hosting, SSR API routes, `/api/revalidate`, `.vercel/output/` | GitHub Pages, `gh-pages` branch, fully static | Vercel still hosts the **Concierge API** from the separate `peninsula-insider-platform` repo. That is the likely source of lingering confusion. |
| Sanity Studio as a real-time override layer, dual-read adapter, `SANITY_*` flags, Sanity singletons | Supabase override store, entity-scoped, baked at build time | Zero `sanity` references remain in `next/src`. See [`cms-architecture.md`](cms-architecture.md). |
| Content schemas inferred from JSON shape | Explicit Zod in `next/src/content.config.ts` | Content is strictly validated, not loosely typed. |
| `.github/workflows/deploy.yml` | `.github/workflows/build-and-deploy.yml` | Several docs still reference the old filename. Index-refresh steps did **not** move with it — see [section 8](#refreshing-the-search-index). |
| Resend transactional email | Beehiiv-led newsletter | Per the standing constraint in `HANDOVER-CLAUDE.md`: do not reintroduce Resend or custom email plumbing. |

A fuller register of documentation that contradicts current code lives in the wiki's [Doc Drift Register](https://github.com/richmondjw/peninsula-insider/wiki/Doc-Drift-Register).
