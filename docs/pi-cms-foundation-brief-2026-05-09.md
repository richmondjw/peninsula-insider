# PI CMS foundation brief — 2026-05-09

## Recommendation
Build a file-backed editorial admin layer inside the Astro app under `next/`, not alongside the prebuilt static export at repo root. Keep v1 deliberately narrow: gated admin routes, thin API endpoints, reusable editable wrappers, and one shared content-access layer that public pages can migrate onto incrementally.

## Key insertion points

### App root
- **Real source app:** `next/`
- **Do not integrate against:** repo-root HTML output, `_astro/`, `dist/`, `dist-new/`

### Route structure
Recommended route tree:
- `src/pages/admin/index.astro` — admin shell / dashboard
- `src/pages/admin/content/[collection]/index.astro` — list entries in a collection
- `src/pages/admin/content/[collection]/[slug].astro` — single-entry editor
- `src/pages/admin/review/submissions.astro` — community submissions queue
- `src/pages/admin/review/venue-changes.astro` — operator change requests queue
- `src/pages/admin/review/events.astro` — event intake / curation queue
- `src/pages/admin/api/content/[collection]/[slug].ts` — JSON read/write endpoint
- `src/pages/admin/api/content/[collection]/index.ts` — collection listing/search endpoint
- `src/pages/admin/api/media/sign.ts` or equivalent later, only if uploads are added

For v1, keep API paths under `/admin/api/*` so auth and audit rules stay localised.

### Auth / middleware
Best location:
- `src/middleware.ts`

Why there:
- central gate for `/admin` and `/admin/api`
- can attach `locals.admin`, `locals.user`, `locals.isEditor`
- avoids sprinkling auth checks across every page and endpoint

Current state:
- no middleware exists yet
- site auth is currently browser-side Supabase only (`src/lib/auth.ts`)
- because the site is configured as `output: 'static'`, meaningful server-checked admin auth will require enabling hybrid/SSR for admin endpoints/pages

Practical v1 bridge:
- add middleware once output mode is adjusted for admin surfaces
- until then, use only scaffold-level guards and avoid claiming real security

### Editable wrappers
Best location:
- `src/components/admin/Editable.astro`
- future helpers in `src/components/admin/` (`EditableField`, `EditToolbar`, `InlineEditTrigger`)

Why:
- keeps admin affordances out of editorial components
- lets public templates opt into editability with a small wrapper
- preserves clean separation between reader UI and editor UI

Best first targets:
- hub intro sections already mirrored in `src/content/editorial_blocks/`
- article hero / dek / summary blocks
- venue and experience detail headers

### Content abstraction layer
Best location:
- `src/lib/content/`

Recommended modules:
- `src/lib/content/loaders.ts` — collection loaders / normalization
- `src/lib/content/queries.ts` — reusable public-page queries
- `src/lib/content/admin.ts` — file path resolution + safe read/write helpers
- `src/lib/content/types.ts` — shared collection/editor types

Why introduce it:
- public pages currently call `getCollection(...)` directly in dozens of page files
- content selection logic is duplicated across pages and staging variants
- admin editing will need shared path resolution between runtime views and write targets

## How public pages source content now

Current pattern:
- Astro content collections defined in `src/content.config.ts`
- source files live under `src/content/*`
- pages fetch directly with `getCollection(...)` or `render(...)`
- examples:
  - `src/pages/journal/[slug].astro`
  - `src/pages/eat/best-restaurants.astro`
  - `src/pages/explore/best-walks.astro`
  - `src/pages/stay/best-accommodation.astro`
  - many more across `src/pages/`

Important note:
- editorial hub intros already have a strong admin seam via `src/content/editorial_blocks/*.md`, but several pages still inline the copy instead of reading those entries dynamically

Recommended first abstraction move:
1. create shared helpers for collection access
2. migrate `editorial_blocks` consumption first
3. then migrate high-value detail routes (`journal/[slug]`, venue/place/experience pages)
4. leave long-tail hub pages for later

## Risks in current structure

### 1. Static-output architecture vs secure admin
- `astro.config.mjs` is `output: 'static'`
- true protected admin routes and server-side write endpoints do not fit cleanly without hybrid/SSR changes
- biggest architectural blocker

### 2. Direct `getCollection` sprawl
- many page files query collections inline
- increases migration cost and makes consistent edit behaviour harder

### 3. Duplicate page trees
- `src/pages/` plus `src/pages/v2-staging/` and v3/v4 surfaces
- if admin hooks are added indiscriminately, maintenance multiplies fast
- recommendation: scope CMS support to canonical production routes first

### 4. Inline editorial copy on hub pages
- some pages already have matching `editorial_blocks` content files, but templates still hardcode prose
- editors will expect those sections to be editable centrally

### 5. Client-side auth assumptions
- current auth utilities are browser-oriented, ideal for likes/saves/dashboard UX
- insufficient on their own for privileged editorial writes

## Foundation scaffolding added

Files added:
- `next/src/lib/admin.ts`
- `next/src/components/admin/Editable.astro`
- `next/src/pages/admin/index.astro`
- `next/src/pages/admin/api/content/[collection]/[slug].ts`

Files updated:
- `next/src/layouts/BaseLayout.astro`
- `next/src/pages/eat/best-restaurants.astro`
- `next/src/pages/explore/best-walks.astro`
- `next/src/pages/stay/best-accommodation.astro`

What the scaffold does:
- introduces shared admin helpers and route detection
- adds a minimal `/admin/` shell
- adds a placeholder admin content API route
- exposes admin mode on the layout via `data-admin`
- adds reusable editable wrappers around three high-signal hub intro sections

What it intentionally does **not** do yet:
- no real auth enforcement
- no file writes
- no form editor UI
- no middleware
- no output-mode switch

## Recommended next step
1. switch Astro to a hybrid/server-capable mode for admin surfaces
2. add `src/middleware.ts` with Supabase-backed editor checks
3. create `src/lib/content/admin.ts` for collection-to-file resolution
4. wire `editorial_blocks` pages to load from collection files instead of inline copy
5. build first real editor against `editorial_blocks` only before touching broader collections

## Verification
Attempted smallest useful gate:
- `npm run check` in `next/`

Result:
- blocked in this environment because `astro` is not installed/available (`sh: 1: astro: not found`)

Secondary verification completed:
- direct inspection confirmed new scaffold files exist at the expected paths
- edits were kept scoped to source files under `next/src/`
