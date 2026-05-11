-- Phase 1 of the CMS Integrity Plan, 2026-05-11.
--
-- Establishes pi.content_registry as the canonical list of every
-- (entity_type, entity_slug) the live site renders, with a referential-
-- integrity trigger that refuses CMS writes for unknown entities.
--
-- Applied to Supabase project tjjhpvslpysfklwpqmgz via MCP migration
-- 20260511115516_pi_cms_content_registry_and_referential_integrity.
-- This file is the source-of-truth checked into the repo.
--
-- Companion build-time script: scripts/refresh-content-registry.mjs
-- (walks the Astro content collections at deploy time and upserts here).

create table if not exists pi.content_registry (
  entity_type text not null check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package'
  )),
  entity_slug text not null,
  title       text,
  href        text,
  refreshed_at timestamptz not null default now(),
  primary key (entity_type, entity_slug)
);

comment on table pi.content_registry is 'Canonical list of every (entity_type, entity_slug) the site renders. Refreshed at deploy time from Astro content collections. cms_image_slots and cms_text_fields reject writes that do not match a row here.';

create index if not exists content_registry_refreshed_at_idx
  on pi.content_registry (refreshed_at desc);

-- Extend entity_type CHECK to cover tour kinds — the original cms_image_slots
-- schema only knew about article/page/event/place/venue/experience/itinerary.
alter table pi.cms_image_slots drop constraint if exists cms_image_slots_entity_type_check;
alter table pi.cms_image_slots
  add constraint cms_image_slots_entity_type_check
  check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package'
  ));

alter table pi.cms_text_fields drop constraint if exists cms_text_fields_entity_type_check;
alter table pi.cms_text_fields
  add constraint cms_text_fields_entity_type_check
  check (entity_type in (
    'article', 'page', 'event', 'place', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package'
  ));

create or replace function pi.assert_content_registry_match()
returns trigger
language plpgsql
security definer
set search_path = pi, public, pg_catalog
as $$
begin
  if not exists (
    select 1 from pi.content_registry r
     where r.entity_type = new.entity_type
       and r.entity_slug = new.entity_slug
  ) then
    raise exception
      'CMS override for (%, %) refused: no matching row in pi.content_registry. Run the deploy-time content registry refresh, or use a valid entity.',
      new.entity_type, new.entity_slug
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists cms_image_slots_registry_check on pi.cms_image_slots;
create trigger cms_image_slots_registry_check
  before insert or update on pi.cms_image_slots
  for each row execute function pi.assert_content_registry_match();

drop trigger if exists cms_text_fields_registry_check on pi.cms_text_fields;
create trigger cms_text_fields_registry_check
  before insert or update on pi.cms_text_fields
  for each row execute function pi.assert_content_registry_match();

-- Public read of the registry — useful for the inline editor to enumerate
-- valid entities. No write policies; only the service role writes here.
alter table pi.content_registry enable row level security;

drop policy if exists "content_registry_public_select" on pi.content_registry;
create policy "content_registry_public_select"
  on pi.content_registry for select
  to anon, authenticated
  using (true);

-- Seed the static page rows. Collection-backed rows (venue/place/event/etc.)
-- are populated by scripts/refresh-content-registry.mjs at deploy time.
insert into pi.content_registry (entity_type, entity_slug, title, href)
values
  ('page', 'home',                'Homepage',              '/'),
  ('page', '_global',             'Site-wide editorial',   null),
  ('page', 'wine',                'Wine landing',          '/wine/'),
  ('page', 'eat',                 'Eat landing',           '/eat/'),
  ('page', 'stay',                'Stay landing',          '/stay/'),
  ('page', 'explore',             'Explore landing',       '/explore/'),
  ('page', 'plans',               'Plans landing',         '/plans/'),
  ('page', 'whats-on',            'What''s On landing',    '/whats-on/'),
  ('page', 'journal',             'Journal landing',       '/journal/'),
  ('page', 'wine-cellar-doors',   'Wine cellar doors',     '/wine/cellar-doors/')
on conflict (entity_type, entity_slug) do nothing;
