-- Migration: PI CMS — public-read for published rows
-- Date: 2026-05-10
-- Purpose: allow the static site (anon key) to read CMS-managed text fields and
--          image slots at build time, restricted to status = 'published'.
-- Scope: additive policy only. Editor-write/read paths from the v1 migration are
--        unchanged.

drop policy if exists "cms_text_fields_public_read_published" on pi.cms_text_fields;
create policy "cms_text_fields_public_read_published"
  on pi.cms_text_fields for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "cms_image_slots_public_read_published" on pi.cms_image_slots;
create policy "cms_image_slots_public_read_published"
  on pi.cms_image_slots for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "cms_assets_public_select_published" on storage.objects;
create policy "cms_assets_public_select_published"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'cms-assets'
    and exists (
      select 1
      from pi.cms_image_slots s
      where s.storage_path = storage.objects.name
        and s.status = 'published'
    )
  );
