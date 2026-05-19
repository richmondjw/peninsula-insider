-- Migration: pi.image_bindings
-- Date: 2026-05-19
-- Purpose: Editor-supplied binding from an unmarked page image
--          (URL pattern + image basename) to a Sanity doc + field path.
--          Powers the "Bind to a Sanity doc…" right-click flow in the
--          admin overlay so editors can wire any visible image into the
--          existing Replace-from-media-library pipeline without a code
--          change.

create table if not exists pi.image_bindings (
  id uuid primary key default gen_random_uuid(),
  page_url_pattern text not null,
  image_basename text not null,
  sanity_doc_id text not null,
  sanity_doc_type text not null,
  sanity_field_path text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (page_url_pattern, image_basename)
);

comment on table pi.image_bindings is
  'Editor-supplied binding from an unmarked page image (URL pattern + basename) to a Sanity doc/field. Used by the admin overlay to inject data-pi-edit on the fly.';

create index if not exists image_bindings_pattern_idx on pi.image_bindings (page_url_pattern);

create or replace function pi.image_bindings_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists image_bindings_set_updated_at on pi.image_bindings;
create trigger image_bindings_set_updated_at
  before update on pi.image_bindings
  for each row execute function pi.image_bindings_set_updated_at();

alter table pi.image_bindings enable row level security;

-- Public SELECT: bindings are essentially page-config (no secrets).
drop policy if exists image_bindings_public_read on pi.image_bindings;
create policy image_bindings_public_read on pi.image_bindings
  for select using (true);

-- Editor write: insert/update/delete restricted to allowlisted editors.
drop policy if exists image_bindings_editor_insert on pi.image_bindings;
create policy image_bindings_editor_insert on pi.image_bindings
  for insert with check (
    exists (
      select 1 from pi.admin_user_allowlist a
      where a.user_id = auth.uid()
        and a.role in ('editor','publisher','admin')
    )
  );

drop policy if exists image_bindings_editor_update on pi.image_bindings;
create policy image_bindings_editor_update on pi.image_bindings
  for update using (
    exists (
      select 1 from pi.admin_user_allowlist a
      where a.user_id = auth.uid()
        and a.role in ('editor','publisher','admin')
    )
  );

drop policy if exists image_bindings_editor_delete on pi.image_bindings;
create policy image_bindings_editor_delete on pi.image_bindings
  for delete using (
    exists (
      select 1 from pi.admin_user_allowlist a
      where a.user_id = auth.uid()
        and a.role in ('editor','publisher','admin')
    )
  );

grant select on pi.image_bindings to anon, authenticated;
grant insert, update, delete on pi.image_bindings to authenticated;
