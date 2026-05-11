-- Migration: PI CMS admin layer v1
-- Date: 2026-05-09
-- Purpose: minimal editable-field CMS primitives for Supabase Auth + Postgres + Storage.
-- Scope: editor allowlist, editable text fields, editable image slots, revision history,
--        and draft/publish status. No browser-side service-role assumptions.

create schema if not exists pi;

-- Editors are still identified primarily through pi.profiles.is_editor.
-- This allowlist adds an explicit audit-friendly table for admin access control.
create table if not exists pi.admin_user_allowlist (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  email          text,
  role           text not null default 'editor' check (role in ('editor', 'publisher', 'admin')),
  can_publish    boolean not null default false,
  invited_by     uuid references auth.users(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table pi.admin_user_allowlist is 'Explicit CMS admin allowlist layered on top of Supabase Auth users.';

create or replace function pi.admin_user_allowlist_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admin_user_allowlist_set_updated_at on pi.admin_user_allowlist;
create trigger admin_user_allowlist_set_updated_at
  before update on pi.admin_user_allowlist
  for each row execute function pi.admin_user_allowlist_set_updated_at();

create table if not exists pi.cms_text_fields (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary')),
  entity_slug     text not null,
  field_path      text not null,
  label           text not null,
  field_kind      text not null check (field_kind in ('text', 'markdown', 'richtext')),
  locale          text,
  value           text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table pi.cms_text_fields is 'Canonical editable text primitives for the CMS.';

create unique index if not exists cms_text_fields_entity_field_locale_uidx
  on pi.cms_text_fields (entity_type, entity_slug, field_path, coalesce(locale, ''));

create table if not exists pi.cms_image_slots (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary')),
  entity_slug     text not null,
  field_path      text not null,
  label           text not null,
  purpose         text not null default 'hero' check (purpose in ('hero', 'card', 'gallery', 'inline', 'seo')),
  storage_bucket  text not null default 'cms-assets',
  storage_path    text,
  public_url      text,
  alt_text        text,
  caption         text,
  credit          text,
  mime_type       text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (entity_type, entity_slug, field_path)
);

comment on table pi.cms_image_slots is 'Canonical editable image slot registry for the CMS.';

create table if not exists pi.cms_revisions (
  id                       uuid primary key default gen_random_uuid(),
  entity_type              text not null check (entity_type in ('article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary')),
  entity_slug              text not null,
  action                   text not null check (action in ('create', 'update', 'publish', 'unpublish', 'restore')),
  status                   text not null check (status in ('draft', 'published')),
  summary                  text,
  patch                    jsonb not null default '[]'::jsonb,
  created_by               uuid references auth.users(id) on delete set null,
  restored_from_revision_id uuid references pi.cms_revisions(id) on delete set null,
  created_at               timestamptz not null default now()
);

comment on table pi.cms_revisions is 'Append-only revision log for CMS-managed field changes.';

create index if not exists cms_text_fields_entity_idx
  on pi.cms_text_fields (entity_type, entity_slug, status, updated_at desc);
create index if not exists cms_image_slots_entity_idx
  on pi.cms_image_slots (entity_type, entity_slug, status, updated_at desc);
create index if not exists cms_revisions_entity_idx
  on pi.cms_revisions (entity_type, entity_slug, created_at desc);

create or replace function pi.cms_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cms_text_fields_set_updated_at on pi.cms_text_fields;
create trigger cms_text_fields_set_updated_at
  before update on pi.cms_text_fields
  for each row execute function pi.cms_set_updated_at();

drop trigger if exists cms_image_slots_set_updated_at on pi.cms_image_slots;
create trigger cms_image_slots_set_updated_at
  before update on pi.cms_image_slots
  for each row execute function pi.cms_set_updated_at();

alter table pi.admin_user_allowlist enable row level security;
alter table pi.cms_text_fields enable row level security;
alter table pi.cms_image_slots enable row level security;
alter table pi.cms_revisions enable row level security;

create or replace function pi.is_cms_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pi.profiles p
    left join pi.admin_user_allowlist a on a.user_id = p.id
    where p.id = auth.uid()
      and p.is_editor = true
      and (a.user_id is null or a.role in ('editor', 'publisher', 'admin'))
  );
$$;

create or replace function pi.can_publish_cms()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pi.profiles p
    join pi.admin_user_allowlist a on a.user_id = p.id
    where p.id = auth.uid()
      and p.is_editor = true
      and (a.can_publish = true or a.role in ('publisher', 'admin'))
  );
$$;

drop policy if exists "cms_admin_allowlist_self_or_editor_select" on pi.admin_user_allowlist;
create policy "cms_admin_allowlist_self_or_editor_select"
  on pi.admin_user_allowlist for select
  using (user_id = auth.uid() or pi.is_cms_admin());

drop policy if exists "cms_admin_allowlist_editor_all" on pi.admin_user_allowlist;
create policy "cms_admin_allowlist_editor_all"
  on pi.admin_user_allowlist for all
  using (pi.is_cms_admin())
  with check (pi.is_cms_admin());

drop policy if exists "cms_text_fields_editor_all" on pi.cms_text_fields;
create policy "cms_text_fields_editor_all"
  on pi.cms_text_fields for all
  using (pi.is_cms_admin())
  with check (pi.is_cms_admin());

drop policy if exists "cms_image_slots_editor_all" on pi.cms_image_slots;
create policy "cms_image_slots_editor_all"
  on pi.cms_image_slots for all
  using (pi.is_cms_admin())
  with check (pi.is_cms_admin());

drop policy if exists "cms_revisions_editor_select" on pi.cms_revisions;
create policy "cms_revisions_editor_select"
  on pi.cms_revisions for select
  using (pi.is_cms_admin());

drop policy if exists "cms_revisions_editor_insert" on pi.cms_revisions;
create policy "cms_revisions_editor_insert"
  on pi.cms_revisions for insert
  with check (pi.is_cms_admin());

-- cms-assets bucket is public so `getPublicUrl(...)` URLs resolve via
-- /storage/v1/object/public/<bucket>/<path>. Paths are timestamped and
-- unguessable; RLS still gates INSERT/UPDATE/DELETE to editors.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-assets',
  'cms-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
   set public = excluded.public;

drop policy if exists "cms_assets_editor_insert" on storage.objects;
create policy "cms_assets_editor_insert"
  on storage.objects for insert
  with check (bucket_id = 'cms-assets' and pi.is_cms_admin());

drop policy if exists "cms_assets_editor_select" on storage.objects;
create policy "cms_assets_editor_select"
  on storage.objects for select
  using (bucket_id = 'cms-assets' and pi.is_cms_admin());

drop policy if exists "cms_assets_editor_update" on storage.objects;
create policy "cms_assets_editor_update"
  on storage.objects for update
  using (bucket_id = 'cms-assets' and pi.is_cms_admin())
  with check (bucket_id = 'cms-assets' and pi.is_cms_admin());

drop policy if exists "cms_assets_editor_delete" on storage.objects;
create policy "cms_assets_editor_delete"
  on storage.objects for delete
  using (bucket_id = 'cms-assets' and pi.is_cms_admin());
