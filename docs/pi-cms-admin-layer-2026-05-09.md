# PI CMS admin layer v1

## Scope

Minimal CMS primitives for Peninsula Insider on Supabase Auth + Postgres + Storage:
- explicit admin allowlist
- editable text fields
- editable image slots
- append-only revisions/history
- draft/published status

## Model decisions

### Auth / admin users
- Keep `pi.profiles.is_editor` as the hard gate because the existing repo already relies on it.
- Add `pi.admin_user_allowlist` for explicit CMS access, publish capability, and audit notes.
- Effective admin check: `pi.profiles.is_editor = true` plus optional allowlist row.
- Publish permission is stricter via `can_publish` or role `publisher` / `admin`.

### Editable fields
- `pi.cms_text_fields`: one row per editable text surface, keyed by `entity_type + entity_slug + field_path (+ locale)`.
- `field_path` stays string-based (`hero.dek`, `seo.title`, `body.intro`) so the CMS can map onto file-backed Astro content without forcing a full relational mirror.
- `status` lives on the field row for simple v1 draft/publish handling.

### Image slots
- `pi.cms_image_slots`: one row per managed image slot.
- Stores storage metadata (`storage_bucket`, `storage_path`), plus editorial metadata (`alt_text`, `caption`, `credit`).
- Uses a private `cms-assets` bucket; reads/writes rely on editor auth + RLS, not service-role keys in the browser.

### Revisions
- `pi.cms_revisions`: append-only log with JSONB patch payload.
- Patch entries are simple `{ op, target, value }` records so the API layer can replay or export them against file-backed content later.
- Supports `restore` with `restored_from_revision_id`.

### Draft / publish
- Minimal v1 status enum is just `draft | published`.
- Revisions also store the status at commit time so publish/unpublish history is explicit.

## Integration assumptions
- Frontend/browser uses Supabase anon key + authenticated user session only.
- Any future sync from Postgres CMS rows back into `next/src/content/**` happens server-side or in a trusted editorial worker.
- Existing content schemas in `next/src/content.config.ts` remain source-of-truth for public build validation.
- Existing `submissions` bucket remains separate from editor-managed `cms-assets`.
