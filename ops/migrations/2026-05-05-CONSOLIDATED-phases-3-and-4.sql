-- ============================================================================
-- CONSOLIDATED MIGRATION: pi schema bootstrap + Phase 3 WS3E + all Phase 4
-- Date: 2026-05-05  (revised after first run failed: pi schema didn't exist)
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Single-paste deploy. Combines:
--   0. pi schema bootstrap + grants + pi.profiles + auth trigger
--   1. user_saves + user_itineraries     (Phase 3 WS3E)
--   2. submissions                       (Phase 4 WS4D)
--   3. event_alerts                      (Phase 4 WS4B)
--   4. award_categories / nominees /
--      votes / nominations / counts view (Phase 4 WS4E)
--   5. submissions storage bucket + RLS  (Phase 4 WS4D)
--   6. (Optional) editor-role flag       (operational)
--
-- Idempotent: safe to re-run. Every statement uses
--   CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS ... CREATE POLICY ...
-- so partial application doesn't break a re-run.
--
-- HOW TO APPLY
--   1. Supabase Studio → SQL Editor for project tjjhpvslpysfklwpqmgz
--   2. Paste this entire file
--   3. Run. Expect 1-3 seconds total.
--   4. Verify by opening any of the new tables in the Table Editor.
--   5. Project Settings → API → Exposed schemas → add `pi` to the
--      comma-separated list. Without this PostgREST won't expose the
--      tables to the JS client.
--
-- The individual phase migrations remain in this folder for reference;
-- this file is the deploy artifact.
-- ============================================================================

-- ─── 0. PI SCHEMA BOOTSTRAP ─────────────────────────────────────────────────
-- Fresh deploy: the `pi` schema doesn't exist yet on this project. Create
-- it with the standard Supabase role grants so PostgREST can expose
-- tables in it once `pi` is added to the API settings' Exposed schemas
-- list (manual UI step, see header).

create schema if not exists pi;

grant usage on schema pi to anon, authenticated, service_role;

-- Default privileges so subsequent CREATE TABLE statements pick up the
-- right access without per-table grants. authenticated gets full DML
-- (gated by RLS); anon gets read+insert only (also RLS-gated; e.g. the
-- submissions form needs anonymous insert).
alter default privileges in schema pi grant all on tables to postgres, service_role;
alter default privileges in schema pi grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema pi grant select, insert on tables to anon;
alter default privileges in schema pi grant all on functions to postgres, service_role;
alter default privileges in schema pi grant execute on functions to authenticated, anon;
alter default privileges in schema pi grant all on sequences to postgres, service_role;
alter default privileges in schema pi grant select, usage on sequences to authenticated, anon;

-- ─── 0a. pi.profiles ────────────────────────────────────────────────────────
-- Referenced by every editor-only RLS policy below. Mirrors the shape
-- expected by next/src/lib/auth.ts (Profile type).
create table if not exists pi.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  avatar_url        text,
  bio               text,
  is_editor         boolean not null default false,
  newsletter_optin  boolean not null default false,
  created_at        timestamptz not null default now()
);
comment on table pi.profiles is 'One row per auth.users entry. Auto-created on signup via trigger below.';

-- Apply table-level grants explicitly (default-privileges only apply to
-- *future* tables, so we need this for the ones declared in this file).
grant select, insert, update, delete on pi.profiles to authenticated;
grant select on pi.profiles to anon;

alter table pi.profiles enable row level security;

drop policy if exists "profiles_public_read" on pi.profiles;
create policy "profiles_public_read" on pi.profiles for select using (true);

drop policy if exists "profiles_self_insert" on pi.profiles;
create policy "profiles_self_insert" on pi.profiles for insert with check (id = auth.uid());

drop policy if exists "profiles_self_update" on pi.profiles;
create policy "profiles_self_update" on pi.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile row whenever a new auth.users row is inserted.
-- Standard Supabase pattern. The function runs as the table owner, so
-- it bypasses RLS during the auto-insert.
create or replace function pi.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pi.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function pi.handle_new_user();

-- Backfill: create a profile for every existing auth.users row that
-- doesn't have one yet. Safe no-op if there are no users yet.
insert into pi.profiles (id)
select u.id from auth.users u
left join pi.profiles p on p.id = u.id
where p.id is null;

-- ─── 1. PHASE 3 WS3E — user-saves + user-itineraries ────────────────────────

create table if not exists pi.user_saves (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('venue', 'event', 'experience')),
  slug       text not null,
  title      text,
  href       text,
  saved_at   timestamptz not null default now(),
  primary key (user_id, kind, slug)
);
comment on table pi.user_saves is 'Phase 3 WS3E: generic kind/slug shortlist for the site-wide save system.';
create index if not exists user_saves_by_user on pi.user_saves (user_id, saved_at desc);
alter table pi.user_saves enable row level security;
drop policy if exists "user_saves_select_own" on pi.user_saves;
create policy "user_saves_select_own" on pi.user_saves for select using (user_id = auth.uid());
drop policy if exists "user_saves_insert_own" on pi.user_saves;
create policy "user_saves_insert_own" on pi.user_saves for insert with check (user_id = auth.uid());
drop policy if exists "user_saves_delete_own" on pi.user_saves;
create policy "user_saves_delete_own" on pi.user_saves for delete using (user_id = auth.uid());

create table if not exists pi.user_itineraries (
  user_id     uuid not null references auth.users(id) on delete cascade primary key,
  items       jsonb not null default '[]'::jsonb,
  days        jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);
comment on table pi.user_itineraries is 'Phase 3 WS3E: single owned itinerary per user.';
alter table pi.user_itineraries enable row level security;
drop policy if exists "user_itineraries_select_own" on pi.user_itineraries;
create policy "user_itineraries_select_own" on pi.user_itineraries for select using (user_id = auth.uid());
drop policy if exists "user_itineraries_upsert_own" on pi.user_itineraries;
create policy "user_itineraries_upsert_own" on pi.user_itineraries for insert with check (user_id = auth.uid());
drop policy if exists "user_itineraries_update_own" on pi.user_itineraries;
create policy "user_itineraries_update_own" on pi.user_itineraries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "user_itineraries_delete_own" on pi.user_itineraries;
create policy "user_itineraries_delete_own" on pi.user_itineraries for delete using (user_id = auth.uid());

create or replace function pi.user_itineraries_set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists user_itineraries_set_updated_at on pi.user_itineraries;
create trigger user_itineraries_set_updated_at
  before update on pi.user_itineraries
  for each row execute function pi.user_itineraries_set_updated_at();

-- ─── 2. PHASE 4 WS4D — community submissions ───────────────────────────────

create table if not exists pi.submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  category        text not null check (category in (
    'food', 'drink', 'wine', 'beach', 'walk', 'view',
    'experience', 'event', 'shop', 'service', 'wildlife', 'other'
  )),
  place_name      text,
  title           text not null,
  body            text not null,
  submitter_name  text not null,
  submitter_email text not null,
  submitter_handle text,
  photo_urls      text[] default array[]::text[],
  status          text not null default 'pending' check (status in (
    'pending', 'in-review', 'approved', 'declined', 'published'
  )),
  editor_notes    text,
  decision_at     timestamptz,
  published_slug  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  client_token    text
);
comment on table pi.submissions is 'Phase 4 WS4D: reader-submitted local secrets.';
create index if not exists submissions_by_status_created on pi.submissions (status, created_at desc);
create index if not exists submissions_by_email on pi.submissions (submitter_email);
alter table pi.submissions enable row level security;
drop policy if exists "submissions_anonymous_insert" on pi.submissions;
create policy "submissions_anonymous_insert" on pi.submissions for insert with check (true);
drop policy if exists "submissions_select_own_by_user" on pi.submissions;
create policy "submissions_select_own_by_user" on pi.submissions for select
  using (user_id is not null and user_id = auth.uid());
drop policy if exists "submissions_editor_all" on pi.submissions;
create policy "submissions_editor_all" on pi.submissions for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create or replace function pi.submissions_set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists submissions_set_updated_at on pi.submissions;
create trigger submissions_set_updated_at
  before update on pi.submissions
  for each row execute function pi.submissions_set_updated_at();

-- ─── 3. PHASE 4 WS4B — event alerts ─────────────────────────────────────────

create table if not exists pi.event_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      text check (category in (
    'food-wine', 'market', 'festival', 'cellar-door', 'community',
    'arts', 'wellness', 'live-music', 'racing-sport', 'family-programs',
    'exhibition', 'civic', 'nature', 'writers-ideas'
  )),
  place_slug    text,
  lens          text,
  email         boolean not null default true,
  browser       boolean not null default false,
  created_at    timestamptz not null default now(),
  last_fired_at timestamptz
);
comment on table pi.event_alerts is 'Phase 4 WS4B: reader alert subscriptions for events.';
create index if not exists event_alerts_by_user on pi.event_alerts (user_id, created_at desc);
create index if not exists event_alerts_by_category on pi.event_alerts (category) where category is not null;
alter table pi.event_alerts enable row level security;
drop policy if exists "event_alerts_select_own" on pi.event_alerts;
create policy "event_alerts_select_own" on pi.event_alerts for select using (user_id = auth.uid());
drop policy if exists "event_alerts_insert_own" on pi.event_alerts;
create policy "event_alerts_insert_own" on pi.event_alerts for insert with check (user_id = auth.uid());
drop policy if exists "event_alerts_update_own" on pi.event_alerts;
create policy "event_alerts_update_own" on pi.event_alerts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "event_alerts_delete_own" on pi.event_alerts;
create policy "event_alerts_delete_own" on pi.event_alerts for delete using (user_id = auth.uid());

-- ─── 4. PHASE 4 WS4E — Awards ───────────────────────────────────────────────

create table if not exists pi.award_categories (
  slug             text primary key,
  year             integer not null,
  title            text not null,
  description      text,
  sort_order       integer not null default 0,
  voting_opens_at  timestamptz,
  voting_closes_at timestamptz,
  published        boolean not null default false,
  created_at       timestamptz not null default now()
);
comment on table pi.award_categories is 'Phase 4 WS4E: annual Awards categories.';
create index if not exists award_categories_by_year on pi.award_categories (year, sort_order);
alter table pi.award_categories enable row level security;
drop policy if exists "award_categories_public_read" on pi.award_categories;
create policy "award_categories_public_read" on pi.award_categories for select using (true);
drop policy if exists "award_categories_editor_write" on pi.award_categories;
create policy "award_categories_editor_write" on pi.award_categories for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create table if not exists pi.award_nominees (
  id              uuid primary key default gen_random_uuid(),
  category_slug   text not null references pi.award_categories(slug) on delete cascade,
  venue_slug      text,
  event_slug      text,
  experience_slug text,
  place_slug      text,
  custom_label    text,
  blurb           text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists award_nominees_by_category on pi.award_nominees (category_slug, sort_order);
alter table pi.award_nominees enable row level security;
drop policy if exists "award_nominees_public_read" on pi.award_nominees;
create policy "award_nominees_public_read" on pi.award_nominees for select using (true);
drop policy if exists "award_nominees_editor_write" on pi.award_nominees;
create policy "award_nominees_editor_write" on pi.award_nominees for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create table if not exists pi.award_votes (
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_slug text not null references pi.award_categories(slug) on delete cascade,
  nominee_id    uuid not null references pi.award_nominees(id) on delete cascade,
  voted_at      timestamptz not null default now(),
  primary key (user_id, category_slug)
);
create index if not exists award_votes_by_nominee on pi.award_votes (nominee_id);
create index if not exists award_votes_by_category on pi.award_votes (category_slug);
alter table pi.award_votes enable row level security;
drop policy if exists "award_votes_select_own" on pi.award_votes;
create policy "award_votes_select_own" on pi.award_votes for select using (user_id = auth.uid());
drop policy if exists "award_votes_insert_own" on pi.award_votes;
create policy "award_votes_insert_own" on pi.award_votes for insert with check (user_id = auth.uid());
drop policy if exists "award_votes_update_own" on pi.award_votes;
create policy "award_votes_update_own" on pi.award_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "award_votes_delete_own" on pi.award_votes;
create policy "award_votes_delete_own" on pi.award_votes for delete using (user_id = auth.uid());
drop policy if exists "award_votes_editor_read" on pi.award_votes;
create policy "award_votes_editor_read" on pi.award_votes for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create table if not exists pi.award_nominations (
  id              uuid primary key default gen_random_uuid(),
  category_slug   text not null references pi.award_categories(slug) on delete cascade,
  nominee_label   text not null,
  reason          text,
  submitter_email text,
  client_token    text,
  created_at      timestamptz not null default now()
);
create index if not exists award_nominations_by_category on pi.award_nominations (category_slug, created_at desc);
alter table pi.award_nominations enable row level security;
drop policy if exists "award_nominations_anon_insert" on pi.award_nominations;
create policy "award_nominations_anon_insert" on pi.award_nominations for insert with check (true);
drop policy if exists "award_nominations_editor_read" on pi.award_nominations;
create policy "award_nominations_editor_read" on pi.award_nominations for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create or replace view pi.award_vote_counts as
select v.category_slug, v.nominee_id, count(*)::integer as vote_count
from pi.award_votes v
group by v.category_slug, v.nominee_id;

-- ─── 4b. EXPLICIT TABLE GRANTS ──────────────────────────────────────────────
-- Default-privileges only cover *future* tables, so the tables created in
-- this file need explicit grants. Roles still go through RLS, so this just
-- opens the door — RLS does the gating.

grant select, insert, update, delete on pi.user_saves         to authenticated;
grant select, insert, update, delete on pi.user_itineraries   to authenticated;
grant select, insert, update, delete on pi.event_alerts       to authenticated;
grant select, insert, update, delete on pi.award_votes        to authenticated;

grant select, insert on pi.submissions                        to anon, authenticated;
grant select on pi.submissions                                to authenticated;
grant update, delete on pi.submissions                        to authenticated;  -- editors via RLS

grant select on pi.award_categories                           to anon, authenticated;
grant select on pi.award_nominees                             to anon, authenticated;
grant insert on pi.award_nominations                          to anon, authenticated;
grant select on pi.award_nominations                          to authenticated;  -- editors via RLS

grant select on pi.award_vote_counts                          to anon, authenticated;

-- ─── 5. PHASE 4 WS4D — submissions storage bucket ──────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Anyone (anon or signed-in) can upload to the submissions bucket. The form
-- generates a per-client subpath so no two uploads collide.
drop policy if exists "submissions_bucket_anon_insert" on storage.objects;
create policy "submissions_bucket_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'submissions');

-- Read access: editors only (via pi.profiles.is_editor).
drop policy if exists "submissions_bucket_editor_read" on storage.objects;
create policy "submissions_bucket_editor_read"
  on storage.objects for select
  using (
    bucket_id = 'submissions'
    and exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true)
  );

-- ─── 6. (OPTIONAL) Editor-role flag ─────────────────────────────────────────
-- Uncomment and edit the email address below to flag your editor account.
-- This grants access to the moderation views in Supabase Studio (and the
-- SELECT-on-submissions / award_votes editor policies above).
--
-- update pi.profiles
-- set is_editor = true
-- where id = (select id from auth.users where email = 'YOUR_EDITOR_EMAIL@example.com');

-- ============================================================================
-- DONE. Verify by:
--   select count(*) from pi.profiles;          -- 0 unless you've signed up
--   select count(*) from pi.user_saves;        -- expect 0
--   select count(*) from pi.submissions;       -- expect 0
--   select count(*) from pi.event_alerts;      -- expect 0
--   select count(*) from pi.award_categories;  -- expect 0 (editorial fills)
--   select * from storage.buckets where id = 'submissions';  -- expect 1 row
--
-- After verification, do these two manual UI steps in Supabase Studio:
--   A. Project Settings → API → Exposed schemas: add `pi` to the
--      comma-separated list. Without this PostgREST won't expose the
--      tables to the JS client even though they exist.
--   B. Sign in once on the live site (or any auth flow that creates an
--      auth.users row), then run the OPTIONAL editor-role flag block
--      above with your email so you can manage Awards / Submissions.
-- ============================================================================
