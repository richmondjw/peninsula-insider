# Peninsula Insider — Supabase migrations

This directory holds the raw SQL migrations applied to the Peninsula Insider
Supabase project. They are intentionally small, dated, and idempotent so any
operator can re-run them safely against the same database.

- **Project ref:** `tjjhpvslpysfklwpqmgz`
- **Project URL:** `https://tjjhpvslpysfklwpqmgz.supabase.co`
- **Dashboard:** <https://supabase.com/dashboard/project/tjjhpvslpysfklwpqmgz/sql/new>

> All migrations create objects in the `pi` schema (sometimes touching
> `auth.*` and `storage.*` for FK / policy reasons). The anon key is in
> `next/.env` as `PUBLIC_SUPABASE_ANON_KEY`; the service-role key is
> intentionally **not** stored in the repo. RLS is the security boundary on
> the request path.

## Apply order — CMS admin layer (May 2026)

Two migrations make up the v1 CMS admin layer. Apply in this order against
the `tjjhpvslpysfklwpqmgz` project:

1. `2026-05-09-pi-cms-admin.sql`
   - Creates `pi.admin_user_allowlist`, `pi.cms_text_fields`,
     `pi.cms_image_slots`, `pi.cms_revisions`
   - Adds the `pi.is_cms_admin()` and `pi.can_publish_cms()` helper functions
   - Enables RLS and the editor-only policies
   - Creates the `cms-assets` Storage bucket (private, 10 MiB cap, image
     mime-types only) and its editor-only policies
2. `2026-05-10-pi-cms-public-read.sql`
   - Adds *additive* policies that let the anon key read **only**
     `status = 'published'` rows from `cms_text_fields` / `cms_image_slots`
   - Adds the matching `storage.objects` SELECT policy so published image
     assets are publicly fetchable through Storage
3. `2026-05-10-pi-cms-seed-founding-editor.sql`
   - Idempotent founding-editor seed for `james@peninsulainsider.com.au`
   - Flips `pi.profiles.is_editor = true` and writes a `pi.admin_user_allowlist`
     row with `role = 'admin'`, `can_publish = true`
   - Requires James to have signed in to `/admin/login` at least once so an
     `auth.users` row exists. Otherwise the script raises a NOTICE and exits
     cleanly — re-run after first sign-in.
4. `2026-05-11-pi-cms-strict-allowlist-gate.sql`
   - Replaces `pi.is_cms_admin()` and `pi.can_publish_cms()` to require an
     explicit `pi.admin_user_allowlist` row. Closes a privilege-escalation
     path where `profiles_self_update` would let any signed-in user flip
     their own `is_editor` flag and walk into the admin.
   - Pins `search_path` on both functions (resolves the
     `function_search_path_mutable` advisor warning for these two).
5. `2026-05-11-pi-cms-admin-fix-recursion.sql`
   - Hotfix on top of (4). The strict-allowlist version of
     `pi.is_cms_admin()` reads `pi.admin_user_allowlist` whose own RLS
     policy calls `pi.is_cms_admin()` — infinite recursion blew the
     Postgres stack and Storage uploads 500'd with "stack depth limit
     exceeded". Both helper functions are now `SECURITY DEFINER` so they
     bypass RLS on the allowlist table, breaking the cycle.
   - Also adds `user_saves_update_own` RLS policy on `pi.user_saves`.
     The CloudSync layer uses `upsert(..., { onConflict })` which can
     trigger an UPDATE; the previous policy set only allowed
     INSERT/SELECT/DELETE.
6. `2026-05-11-pi-cms-content-registry-and-referential-integrity.sql`
   - **Phase 1 of the CMS Integrity Plan.** Eliminates the shared-image-
     across-venues bug class by making entity overrides referential.
   - Creates `pi.content_registry` — the canonical list of every
     `(entity_type, entity_slug)` the live site renders.
   - Adds a `before insert or update` trigger on
     `pi.cms_image_slots` / `pi.cms_text_fields` that raises
     `foreign_key_violation` when the override targets an unknown entity.
   - Extends both tables' `entity_type` CHECK to include `tour`,
     `tour-operator`, `tour-package` (previously rejected at write time).
   - Seeds the static `page` rows. Collection-backed rows
     (venue/place/event/experience/itinerary/article/tour/tour-operator/
     tour-package) are populated by
     `scripts/refresh-content-registry.mjs` at every deploy.

> **Note (2026-05-11):** the original `2026-05-09-pi-cms-admin.sql` declared
> `unique (entity_type, entity_slug, field_path, coalesce(locale, ''))` as an
> inline table constraint, which Postgres rejects because UNIQUE constraints
> can't contain function calls. The constraint has been replaced with the
> equivalent `create unique index … on pi.cms_text_fields (…, coalesce(locale, ''))`.
> Apply order is unchanged.
>
> **Note (2026-05-11):** the seed email above was originally
> `james.richmondau@gmail.com`. The operational editor account in
> `auth.users` is `james@peninsulainsider.com.au`, so the seed has been
> updated to target it. Re-running the v1 migration in a fresh project is
> still idempotent; if you need the gmail address allowlisted as well, add
> a second `insert` block or seed it manually after the user signs in.

Order matters because (2) references tables, columns, and the `cms-assets`
bucket created by (1), and (3) references both `pi.profiles` and
`pi.admin_user_allowlist` from (1).

### How to apply

#### Option A — Supabase SQL editor (recommended for prod)

1. Open <https://supabase.com/dashboard/project/tjjhpvslpysfklwpqmgz/sql/new>
2. Paste the entire contents of `2026-05-09-pi-cms-admin.sql`
3. Run it. Confirm no errors.
4. Repeat for `2026-05-10-pi-cms-public-read.sql`.

#### Option B — `psql`

```bash
# Get the connection string from
# https://supabase.com/dashboard/project/tjjhpvslpysfklwpqmgz/settings/database
export DATABASE_URL='postgres://postgres:<password>@db.tjjhpvslpysfklwpqmgz.supabase.co:5432/postgres'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f ops/migrations/2026-05-09-pi-cms-admin.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f ops/migrations/2026-05-10-pi-cms-public-read.sql

# Run AFTER James has signed in to /admin/login at least once.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f ops/migrations/2026-05-10-pi-cms-seed-founding-editor.sql
```

#### Option C — Supabase CLI

```bash
supabase link --project-ref tjjhpvslpysfklwpqmgz
supabase db execute --file ops/migrations/2026-05-09-pi-cms-admin.sql
supabase db execute --file ops/migrations/2026-05-10-pi-cms-public-read.sql
# Run AFTER James has signed in to /admin/login at least once.
supabase db execute --file ops/migrations/2026-05-10-pi-cms-seed-founding-editor.sql
```

### Verify

```sql
-- Tables exist and have RLS enabled
select schemaname, tablename, rowsecurity
  from pg_tables
 where schemaname = 'pi'
   and tablename in (
     'admin_user_allowlist',
     'cms_text_fields',
     'cms_image_slots',
     'cms_revisions'
   );

-- Helper functions exist
select proname from pg_proc
 where pronamespace = 'pi'::regnamespace
   and proname in ('is_cms_admin', 'can_publish_cms');

-- Storage bucket present
select id, public, file_size_limit from storage.buckets where id = 'cms-assets';

-- Public-read policies present
select polname from pg_policy
 where polrelid in (
   'pi.cms_text_fields'::regclass,
   'pi.cms_image_slots'::regclass
 );
```

## Adding an editor

There are two layers:

1. `pi.profiles.is_editor` must be `true`
2. `pi.admin_user_allowlist` may carry an explicit role / `can_publish` flag

The minimum required for admin access is `pi.profiles.is_editor = true`. The
allowlist is optional metadata; if a row exists, its `role` must be one of
`editor | publisher | admin`. Publish rights require either
`can_publish = true` or `role in ('publisher', 'admin')`.

```sql
-- 1. Find the user id (must already exist in auth.users, e.g. they signed in
--    once via /admin/login).
select id, email from auth.users where email = 'editor@example.com';

-- 2. Promote them to editor in the profile (creates row if missing).
insert into pi.profiles (id, is_editor)
values ('<user-uuid>', true)
on conflict (id) do update set is_editor = excluded.is_editor;

-- 3. (Optional) Add an allowlist row with publish rights.
insert into pi.admin_user_allowlist (user_id, email, role, can_publish, notes)
values ('<user-uuid>', 'editor@example.com', 'publisher', true, 'Founding editor')
on conflict (user_id) do update
  set role        = excluded.role,
      can_publish = excluded.can_publish,
      notes       = excluded.notes;
```

## Rollback

The CMS admin layer is intentionally additive — no existing tables are
modified — so rollback is just a matter of dropping what was created.

> **Warning:** dropping `pi.cms_text_fields` / `pi.cms_image_slots` /
> `pi.cms_revisions` deletes all editor content and the audit trail. Take a
> snapshot first via the Supabase dashboard ("Database → Backups") or
> `pg_dump --schema=pi` before rolling back in production.

Reverse order — drop the public-read policies first, then the v1 layer:

```sql
-- 2026-05-10-pi-cms-public-read.sql
drop policy if exists "cms_assets_public_select_published" on storage.objects;
drop policy if exists "cms_image_slots_public_read_published" on pi.cms_image_slots;
drop policy if exists "cms_text_fields_public_read_published" on pi.cms_text_fields;

-- 2026-05-09-pi-cms-admin.sql
drop policy if exists "cms_assets_editor_delete" on storage.objects;
drop policy if exists "cms_assets_editor_update" on storage.objects;
drop policy if exists "cms_assets_editor_select" on storage.objects;
drop policy if exists "cms_assets_editor_insert" on storage.objects;

-- Optional: keep the bucket if you want to retain uploaded assets.
-- delete from storage.buckets where id = 'cms-assets';

drop policy if exists "cms_revisions_editor_insert"      on pi.cms_revisions;
drop policy if exists "cms_revisions_editor_select"      on pi.cms_revisions;
drop policy if exists "cms_image_slots_editor_all"       on pi.cms_image_slots;
drop policy if exists "cms_text_fields_editor_all"       on pi.cms_text_fields;
drop policy if exists "cms_admin_allowlist_editor_all"   on pi.admin_user_allowlist;
drop policy if exists "cms_admin_allowlist_self_or_editor_select"
  on pi.admin_user_allowlist;

drop function if exists pi.can_publish_cms();
drop function if exists pi.is_cms_admin();

drop trigger if exists cms_image_slots_set_updated_at on pi.cms_image_slots;
drop trigger if exists cms_text_fields_set_updated_at on pi.cms_text_fields;
drop function if exists pi.cms_set_updated_at();

drop table if exists pi.cms_revisions;
drop table if exists pi.cms_image_slots;
drop table if exists pi.cms_text_fields;

drop trigger if exists admin_user_allowlist_set_updated_at on pi.admin_user_allowlist;
drop function if exists pi.admin_user_allowlist_set_updated_at();
drop table if exists pi.admin_user_allowlist;
```

## Troubleshooting

- **`permission denied for schema pi`** — RLS is doing its job. Confirm the
  caller is signed in as an editor and that `pi.profiles.is_editor = true`
  for their `user_id`. Service-role key bypasses RLS but should never be used
  on the request path.
- **Anon-key reads return empty** even after applying
  `2026-05-10-pi-cms-public-read.sql` — check that the rows you expect have
  `status = 'published'`. The public-read policy is intentionally restricted.
- **`@astrojs/vercel is not installed`** during `astro build` — that error
  comes from `next/astro.config.mjs` when `PI_ADMIN_HYBRID=1` is set without
  the adapter. Run `npm install` in `next/`.
