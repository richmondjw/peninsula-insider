-- Migration: user-scoped saves and itineraries
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: cross-device sync for the Phase 2 / 3 save list and itinerary
--          builder. localStorage stays the primary cache for snappy UX;
--          these tables are the cloud source of truth when the user is
--          signed in.
--
-- Tables:
--   pi.user_saves       — generic kind/slug saves (venue, event,
--                         experience). Supersedes article_saves for the
--                         site-wide shortlist use case.
--   pi.user_itineraries — single owned itinerary per user (one row per
--                         user, items + days as JSONB). v1 ships with
--                         one itinerary per account; multi-itinerary
--                         is a Phase 3.x extension.
--
-- Idempotent: safe to re-run. Uses CREATE TABLE IF NOT EXISTS and
-- CREATE POLICY IF NOT EXISTS where supported.
--
-- How to apply:
--   1. Supabase Studio → SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.

-- ─── pi.user_saves ──────────────────────────────────────────────────────────

create table if not exists pi.user_saves (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('venue', 'event', 'experience')),
  slug       text not null,
  title      text,
  href       text,
  saved_at   timestamptz not null default now(),
  primary key (user_id, kind, slug)
);

comment on table pi.user_saves is 'Generic kind/slug shortlist for the Phase 2/3 site-wide save system.';

create index if not exists user_saves_by_user
  on pi.user_saves (user_id, saved_at desc);

alter table pi.user_saves enable row level security;

drop policy if exists "user_saves_select_own" on pi.user_saves;
create policy "user_saves_select_own"
  on pi.user_saves for select
  using (user_id = auth.uid());

drop policy if exists "user_saves_insert_own" on pi.user_saves;
create policy "user_saves_insert_own"
  on pi.user_saves for insert
  with check (user_id = auth.uid());

drop policy if exists "user_saves_delete_own" on pi.user_saves;
create policy "user_saves_delete_own"
  on pi.user_saves for delete
  using (user_id = auth.uid());

-- ─── pi.user_itineraries ────────────────────────────────────────────────────

create table if not exists pi.user_itineraries (
  user_id     uuid not null references auth.users(id) on delete cascade primary key,
  items       jsonb not null default '[]'::jsonb,
  days        jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table pi.user_itineraries is 'Single owned itinerary per user (Phase 3 WS3E). items is the sequenced array of {kind, slug, dayId, note}; days is the optional day groupings.';

alter table pi.user_itineraries enable row level security;

drop policy if exists "user_itineraries_select_own" on pi.user_itineraries;
create policy "user_itineraries_select_own"
  on pi.user_itineraries for select
  using (user_id = auth.uid());

drop policy if exists "user_itineraries_upsert_own" on pi.user_itineraries;
create policy "user_itineraries_upsert_own"
  on pi.user_itineraries for insert
  with check (user_id = auth.uid());

drop policy if exists "user_itineraries_update_own" on pi.user_itineraries;
create policy "user_itineraries_update_own"
  on pi.user_itineraries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_itineraries_delete_own" on pi.user_itineraries;
create policy "user_itineraries_delete_own"
  on pi.user_itineraries for delete
  using (user_id = auth.uid());

-- updated_at trigger (so client doesn't have to manage it)
create or replace function pi.user_itineraries_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_itineraries_set_updated_at on pi.user_itineraries;
create trigger user_itineraries_set_updated_at
  before update on pi.user_itineraries
  for each row execute function pi.user_itineraries_set_updated_at();
