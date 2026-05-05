-- Migration: Peninsula Insider Awards (Phase 4 WS4E)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: voting infrastructure for the annual Peninsula Insider
--          Awards. One row per (user, category, year) for signed-in
--          votes; anonymous nominations land in pi.award_nominations
--          with a client_token for light dedupe.
--
-- v1 ships the *infrastructure*. The actual 2026 Awards content
-- (categories, nominees, results) is editorial work that follows.
--
-- Idempotent. RLS scoped tightly.

-- ─── Categories (editor-managed) ──────────────────────────────────────────
create table if not exists pi.award_categories (
  slug         text primary key,
  year         integer not null,
  title        text not null,
  description  text,
  -- Display ordering on the awards page.
  sort_order   integer not null default 0,
  -- Voting window controls. Outside the window the form is read-only.
  voting_opens_at  timestamptz,
  voting_closes_at timestamptz,
  -- Once results are public, set published=true to surface them.
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table pi.award_categories is 'Annual categories for the Peninsula Insider Awards. One row per (slug, year) effectively — slug is unique here for simplicity in v1.';

create index if not exists award_categories_by_year on pi.award_categories (year, sort_order);

alter table pi.award_categories enable row level security;

drop policy if exists "award_categories_public_read" on pi.award_categories;
create policy "award_categories_public_read"
  on pi.award_categories for select using (true);

drop policy if exists "award_categories_editor_write" on pi.award_categories;
create policy "award_categories_editor_write"
  on pi.award_categories for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- ─── Nominees (editor-curated shortlist per category) ─────────────────────
create table if not exists pi.award_nominees (
  id              uuid primary key default gen_random_uuid(),
  category_slug   text not null references pi.award_categories(slug) on delete cascade,
  -- Polymorphic nominee: one of (venue_slug, event_slug, experience_slug, place_slug).
  -- Exactly one should be set; not enforced as a constraint to keep editorial flexibility.
  venue_slug      text,
  event_slug      text,
  experience_slug text,
  place_slug      text,
  -- Free-text for write-in nominees that don't map to a content row.
  custom_label    text,
  -- Editorial framing for the awards page.
  blurb           text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists award_nominees_by_category on pi.award_nominees (category_slug, sort_order);

alter table pi.award_nominees enable row level security;

drop policy if exists "award_nominees_public_read" on pi.award_nominees;
create policy "award_nominees_public_read"
  on pi.award_nominees for select using (true);

drop policy if exists "award_nominees_editor_write" on pi.award_nominees;
create policy "award_nominees_editor_write"
  on pi.award_nominees for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- ─── Votes (signed-in only; one per user per category per year) ──────────
create table if not exists pi.award_votes (
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_slug  text not null references pi.award_categories(slug) on delete cascade,
  nominee_id     uuid not null references pi.award_nominees(id) on delete cascade,
  voted_at       timestamptz not null default now(),
  primary key (user_id, category_slug)
);

create index if not exists award_votes_by_nominee on pi.award_votes (nominee_id);
create index if not exists award_votes_by_category on pi.award_votes (category_slug);

alter table pi.award_votes enable row level security;

drop policy if exists "award_votes_select_own" on pi.award_votes;
create policy "award_votes_select_own"
  on pi.award_votes for select using (user_id = auth.uid());

drop policy if exists "award_votes_insert_own" on pi.award_votes;
create policy "award_votes_insert_own"
  on pi.award_votes for insert with check (user_id = auth.uid());

drop policy if exists "award_votes_update_own" on pi.award_votes;
create policy "award_votes_update_own"
  on pi.award_votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "award_votes_delete_own" on pi.award_votes;
create policy "award_votes_delete_own"
  on pi.award_votes for delete using (user_id = auth.uid());

-- Editor read-all so we can surface aggregate counts on the results page.
drop policy if exists "award_votes_editor_read" on pi.award_votes;
create policy "award_votes_editor_read"
  on pi.award_votes for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- ─── Anonymous nominations (open submissions) ────────────────────────────
create table if not exists pi.award_nominations (
  id              uuid primary key default gen_random_uuid(),
  category_slug   text not null references pi.award_categories(slug) on delete cascade,
  -- Free text: the venue/event/place the visitor is nominating.
  nominee_label   text not null,
  reason          text,
  -- Submitter optional metadata.
  submitter_email text,
  client_token    text,
  created_at      timestamptz not null default now()
);

create index if not exists award_nominations_by_category on pi.award_nominations (category_slug, created_at desc);

alter table pi.award_nominations enable row level security;

drop policy if exists "award_nominations_anon_insert" on pi.award_nominations;
create policy "award_nominations_anon_insert"
  on pi.award_nominations for insert with check (true);

drop policy if exists "award_nominations_editor_read" on pi.award_nominations;
create policy "award_nominations_editor_read"
  on pi.award_nominations for select
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

-- ─── Aggregate view (public read; counts per nominee) ────────────────────
create or replace view pi.award_vote_counts as
select
  v.category_slug,
  v.nominee_id,
  count(*)::integer as vote_count
from pi.award_votes v
group by v.category_slug, v.nominee_id;

comment on view pi.award_vote_counts is 'Aggregated reader-vote totals per nominee. Public read for the results page.';
