# Peninsula Insider — CMS architecture

**Last updated:** 2026-05-11
**Status:** live in production
**Owners:** James, Claude

This document is the canonical reference for how the Peninsula Insider inline
CMS works. It explains the architecture, the rules every contributor must
follow, and the safeguards that exist to keep editor overrides referentially
sound.

If you are touching anything that calls `editableImage()`, `editableText()`,
`cms_image_slots`, `cms_text_fields`, or `pi.content_registry`, **read this
first.** The rules here are what stand between a single editor click and a
2026-05-11-style "same image across many venues" bug.

## The problem this solves

Before 2026-05-11, image overrides were keyed by source filename. The flow
was:

1. Editor right-clicks a venue's hero photo and replaces it.
2. The CMS records an override with key `img:<basename-of-old-photo.jpg>`.
3. On every page load, the inline-edit client walks the DOM and, for any
   `<img>` whose `src` basename matches a known key, swaps the src.

The implicit assumption was that each photo file was used by exactly one
venue. In practice many venues shared the same stock image, so editing one
venue overwrote the photo for every other venue using the same file. Editors
had no way to see the spread before clicking save.

This document describes the architecture that replaced the filename-keyed
approach. The new model is **entity-scoped**: every editable element declares
its identity (entity type, entity slug, field path) and overrides key on
that identity.

## High-level architecture

```
                ┌────────────────────────────┐
   Editor click │  next/src/lib/inline-edit/ │ ◀── DOM elements tagged via
                │  client.ts (right-click,   │     editableImage({...}) /
                │  contenteditable, save UI) │     editableText({...})
                └─────────────┬──────────────┘
                              │ writes
                              ▼
              ┌──────────────────────────────────┐
   Supabase   │ pi.cms_image_slots               │
              │ pi.cms_text_fields               │
              │   key: (entity_type, entity_slug,│
              │        field_path, locale?)      │
              └──────────────┬───────────────────┘
                             │ INSERT/UPDATE intercepted by:
                             ▼
              ┌──────────────────────────────────┐
              │ pi.assert_content_registry_match │  ──── raises
              │  (BEFORE trigger on both tables) │       foreign_key_violation
              └──────────────┬───────────────────┘       for unknown entities
                             │ reads
                             ▼
              ┌──────────────────────────────────┐
   Refreshed  │ pi.content_registry              │
   every      │   row per valid                  │
   deploy by  │   (entity_type, entity_slug)     │
   refresh-…  │   the live site renders          │
   .mjs       └──────────────────────────────────┘
```

## The three rules

### Rule 1 — Every editable image carries its entity identity

Any element a user can edit must be tagged with the canonical helper. There
is no "auto-detect" anymore.

```astro
---
import { editableImage } from '../lib/inline-edit/attrs';
---
<a class="venue-card__hero" {...editableImage({
  entityType: 'venue',
  entitySlug: slug,
  fieldPath: 'hero',
  label: `${data.name} hero`,
  purpose: 'hero',
})}>
  <img src={data.image} alt={data.name} />
</a>
```

`entityType` must be one of:

```
article, page, event, place, venue, experience, itinerary,
tour, tour-operator, tour-package
```

Adding a new entity type requires both a database migration to extend the
`CHECK` constraints **and** an update to `VALID_KINDS` in
[`scripts/check-editable-coverage.mjs`](../scripts/check-editable-coverage.mjs).

`fieldPath` convention:

- `'hero'` for the primary card image. The build-time enforcer warns on any
  other path for the hero.
- `'hero.alt'`, `'hero.credit'` for sibling fields on the same image.
- `'image'` is tolerated for legacy compatibility.

### Rule 2 — Every override targets an entity that exists

`pi.content_registry` holds one row per `(entity_type, entity_slug)` the live
site renders. A `BEFORE INSERT OR UPDATE` trigger on `pi.cms_image_slots` and
`pi.cms_text_fields` calls `pi.assert_content_registry_match()` and raises:

```
CMS override for (venue, foo-bar) refused: no matching row in
pi.content_registry. Run the deploy-time content registry refresh, or
use a valid entity.
```

The registry is refreshed automatically on every deploy by
[`scripts/refresh-content-registry.mjs`](../scripts/refresh-content-registry.mjs),
which:

1. Walks every collection directory under `next/src/content/` and converts
   each file into a `(entity_type, entity_slug, title, href)` row.
2. Appends a fixed set of static page rows (`home`, `_global`, section
   landings).
3. Upserts in chunks of 500 with `refreshed_at = now()`.
4. Deletes any rows whose `refreshed_at` is older than the run watermark —
   so deleted content pages are pruned automatically.

The script requires a service-role key (`SUPABASE_SERVICE_ROLE_KEY` env var).

> **Corrected 2026-08-27.** This script was invoked from `.github/workflows/deploy.yml`
> before the Astro build. **That is no longer true.** `deploy.yml` was consolidated
> into `build-and-deploy.yml` and the registry refresh did not move with it.
> `refresh-content-registry.mjs` now runs from exactly one place:
> `.github/workflows/pi-data-refresh.yml`, which is **manual dispatch only**.
>
> **Consequence for editors:** a newly shipped venue, article or event is not in
> `pi.content_registry` until someone dispatches **PI Data Refresh**. Its first
> inline CMS edit will be rejected by `pi.assert_content_registry_match()` with a
> `foreign_key_violation`. That is the trigger working correctly, not a bug, and
> the fix is to dispatch the refresh — not to bypass the trigger. See
> [`ARCHITECTURE.md` section 8](ARCHITECTURE.md#the-supabase-refresh-gap-open-decision).

### Rule 3 — CI fails the build if a card forgets to tag itself

[`scripts/check-editable-coverage.mjs`](../scripts/check-editable-coverage.mjs)
walks `next/src/components/**/*Card.astro` and fails the deploy if:

- A card is missing `<PiSaveActions .../>`.
- A card is missing an `editableImage({...})` call (unless explicitly listed
  in `HERO_EXEMPT` — text-only editorial variants).
- An `editableImage()` call is missing `entityType`, `entitySlug`, or
  `fieldPath`.
- The `entityType` is not in the canonical list.

The enforcer warns (but does not fail) when `fieldPath` is not `'hero'` /
`'hero.*'` / `'image'`. This is to nudge naming toward the convention while
allowing intentional exceptions.

The enforcer runs as the **"CMS editable-coverage gate"** step in
`.github/workflows/build-and-deploy.yml`, immediately before the content
admission gates and the Astro build. Fail fast: by the time the build hits this
step it has only installed dependencies, so errors here are cheap.

(This gate did survive the workflow consolidation. The registry refresh above
did not.)

## File map

| Layer | Path | What it does |
|---|---|---|
| DOM tagging | [`next/src/lib/inline-edit/attrs.ts`](../next/src/lib/inline-edit/attrs.ts) | `editableImage()` / `editableText()` helpers — produce the `data-pi-*` attrs the client reads |
| Build-time hydration | [`next/src/lib/inline-edit/overrides.ts`](../next/src/lib/inline-edit/overrides.ts) | `loadOverrides(entity_type, entity_slug)` — read published overrides during Astro build so SSG'd HTML carries the editor's choices |
| Browser-side hydration | [`next/src/lib/inline-edit/client.ts`](../next/src/lib/inline-edit/client.ts) | Right-click menu, image picker, text save flow, **and** the load-time override patcher (explicit-pass + implicit-pass) |
| DB schema | [`ops/migrations/2026-05-09-pi-cms-admin.sql`](../ops/migrations/2026-05-09-pi-cms-admin.sql) | `cms_text_fields`, `cms_image_slots`, `cms_revisions`, `admin_user_allowlist`, RLS, Storage bucket |
| DB integrity | [`ops/migrations/2026-05-11-pi-cms-content-registry-and-referential-integrity.sql`](../ops/migrations/2026-05-11-pi-cms-content-registry-and-referential-integrity.sql) | `pi.content_registry` + trigger + extended `entity_type` CHECK |
| Registry refresh | [`scripts/refresh-content-registry.mjs`](../scripts/refresh-content-registry.mjs) | Walk content collections, upsert registry, prune stale rows. **Manual dispatch only.** |
| CI enforcement | [`scripts/check-editable-coverage.mjs`](../scripts/check-editable-coverage.mjs) | Block deploys that omit the editor attrs |
| CI wiring — enforcer | [`.github/workflows/build-and-deploy.yml`](../.github/workflows/build-and-deploy.yml) | Runs the coverage gate before the build |
| CI wiring — registry | [`.github/workflows/pi-data-refresh.yml`](../.github/workflows/pi-data-refresh.yml) | Runs the registry + entity index + embedding refresh. `workflow_dispatch` only |

## Adding a new editable card

1. Add the helper to the hero element of your card component:
   ```astro
   <a class="x-card__hero" {...editableImage({
     entityType: '<one-of-the-canonical-kinds>',
     entitySlug: slug,
     fieldPath: 'hero',
     label: `${data.name} hero`,
     purpose: 'hero',
   })}>
   ```
2. Include `<PiSaveActions .../>` somewhere in the card.
3. Run `node scripts/check-editable-coverage.mjs` to confirm conformance.
4. If your card represents a brand-new content collection, also add it to
   the `COLLECTIONS` array in `scripts/refresh-content-registry.mjs` so the
   registry refresh picks up the new slugs.

## Adding a new entity type

This is rare and requires two coordinated changes:

1. **Database** — write a migration to extend the `CHECK (entity_type IN
   (...))` constraint on both `pi.cms_image_slots` and `pi.cms_text_fields`,
   and on the `pi.content_registry` table itself.
2. **Build pipeline** — add the new kind to:
   - `VALID_KINDS` in `scripts/check-editable-coverage.mjs`
   - The `COLLECTIONS` array in `scripts/refresh-content-registry.mjs`
   - The "canonical kinds" list in this document.

Until both sides are landed, the CI enforcer will reject any card that uses
the new kind. That is intentional — it forces the database migration to
ship at the same time as the code.

## Operational state today

- **Database:** Project `tjjhpvslpysfklwpqmgz`, schema `pi`. Migration
  `2026-05-11-pi-cms-content-registry-and-referential-integrity.sql` applied.
- **Registry rows:** 516 entities seeded (154 venue, 173 article, 91 event,
  42 experience, 20 tour, 20 place, 10 page, 6 itinerary).
- **CI:** Enforcer + registry refresh wired. The registry refresh is
  currently `continue-on-error: true` because the `SUPABASE_SERVICE_KEY`
  repo secret authenticates against an older project — rotation is the
  open followup. The protection is **not weakened** by this, because the
  trigger runs in the database and is independent of CI.

## Body-prose block editor (article body)

The block editor is the second layer of inline editing for article body content (the actual paragraphs / headings / lists / blockquotes inside an article, not the title and dek which were already editable).

### Build-time pipeline

1. **`next/src/lib/inline-edit/remark-block-ids.mjs`** — remark plugin registered against both the `markdown` and `mdx` integrations in `next/astro.config.mjs`. Walks the root-level MDAST nodes; for every `paragraph`, `heading`, `blockquote`, `list` it stamps two HTML attributes via `hProperties`:
   - `data-pi-block-id="b<10-char-sha1>"` — content-derived deterministic hash of the first 80 chars of text. Stable across re-renders and reorderings; invalidated only when the text of the block itself changes.
   - `data-pi-block-kind="paragraph"|"h2"|"h3"|...|"blockquote"|"list"` — readable label shown in the toolbar.
2. **`next/src/pages/journal/[slug].astro`** wraps `<Content />` in a `<div data-pi-prose-root data-pi-entity-type="article" data-pi-entity-slug={slug}>`. The prose root identifies which entity the block edits belong to.
3. **Build-time override consult** — `loadOverrides('article', slug).text` is filtered to entries starting `body.block:`, the prefix is stripped, the map is JSON-stringified into a `<script type="application/json" id="pi-block-overrides">` element on the page.
4. **Pre-paint patcher** — a tiny inline script runs synchronously after the JSON blob: reads the overrides, iterates `[data-pi-prose-root] [data-pi-block-id]` elements, swaps `innerHTML` for any matching ID. No flash because this runs before the body renders.

### Browser-side editor

`next/src/lib/inline-edit/client.ts` exports a block-editor module that:

- Delegates clicks on `[data-pi-prose-root] [data-pi-block-id]` to `startBlockEdit()` (takes precedence over the existing `data-pi-edit="text"` handler).
- Turns the clicked element into a `contenteditable=true` surface with a floating dark toolbar anchored above it.
- Toolbar: **B** / **I** / **🔗** / **Cancel** / **Save**, plus keyboard shortcuts (Cmd+B / Cmd+I / Cmd+K / Cmd+Enter / Esc).
- Link popover: URL input, internal-link autocomplete from `pi.content_registry` (lazy-loaded on first popover open), apply / remove buttons.
- On save, runs the HTML through a strict sanitiser before persisting.

### Sanitiser allowlist

The sanitiser (`sanitiseBlockHtml` in `client.ts`) walks the saved HTML, normalises, and drops everything not on this allowlist:

| Allowed | Notes |
|---|---|
| `<strong>` (and `<b>` → `<strong>`) | No attributes |
| `<em>` (and `<i>` → `<em>`) | No attributes |
| `<a href="...">` | `href` only — must be `/`, `#`, `mailto:`, `tel:`, or `https?://`. External links get `target="_blank" rel="noopener noreferrer"` added automatically; internal links don't. |
| `<br>` | No attributes |

Everything else — `<script>`, `<style>`, `<iframe>`, `<img>`, `<span>`, `<div>`, `class`, `style`, `on*` event handlers, `javascript:` / `data:` URLs — is stripped silently. Tag unwrapping preserves the inner text. The sanitiser runs both client-side (on save) and is the canonical contract for what reaches the DB. Anything that bypasses it (e.g. direct SQL injection) would still be filtered at render time if we ever added a render-time sanitiser pass; today we trust the client-side sanitiser because writes are gated by the editor allowlist.

### Storage shape

Block overrides land in `pi.cms_text_fields` as:

| Column | Value |
|---|---|
| `entity_type` | `'article'` |
| `entity_slug` | the article's routeSlug |
| `field_path` | `body.block:b<hash>` (the same ID emitted by the remark plugin) |
| `label` | `Body block (paragraph)` etc — humanised kind label for editor UI |
| `field_kind` | `'richtext'` |
| `value` | sanitised HTML |
| `status` | `'published'` |

The integrity trigger on `cms_text_fields` validates that `('article', slug)` exists in `pi.content_registry` — same protection as every other CMS write.

### Failure modes

- **MDX source edited after a block override exists** — if you change the text of a paragraph in the `.md` file, its block-id changes (content-hash). The previous override becomes orphaned (still in the DB but no longer matches any rendered block). Acceptable trade-off: if you've changed the canonical source, the previous override is stale by definition. A future "stranded overrides" cleanup pass could prune these.
- **Block reordering in MDX** — does NOT invalidate IDs, because they're content-derived not positional.
- **Two editors editing the same block at the same time** — last-write-wins. No locking. Acceptable for a small editorial team.
- **MDX components inside the body** (e.g. `<ClusterLinks>`, `<FAQ>`) — the remark plugin doesn't add IDs to these (only standard markdown blocks), so they're correctly skipped. The block editor cannot accidentally edit them.

## What this does NOT cover (deferred phases)

- **Phase 2 — Storage tombstones.** Today, replacing a hero image leaves the
  old object in the `cms-assets` bucket forever. Future work: mark
  superseded uploads as tombstoned and run a nightly cleanup edge function.
- **Phase 4 — Draft mode + revert UI.** Editors currently save published
  directly. A draft/review flow with one-click revert to the prior version
  is the next safety net to add.

## Pointers to related docs

- [`docs/cms-editorial-guide.md`](cms-editorial-guide.md) — operator-facing
  guide: how to edit a venue, how to add a new venue, what to do when an
  edit fails.
- [`ops/migrations/README.md`](../ops/migrations/README.md) — migration
  apply order and rollback notes.
