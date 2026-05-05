-- Migration: event alert subscriptions
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: Phase 4 WS4B — reader alert subscriptions for events.
--          One row per (user, alert spec). Anonymous alerts stay in
--          localStorage; this table is the cross-device backing store
--          for signed-in readers.
--
-- Idempotent. RLS scoped to auth.uid().
--
-- How to apply:
--   1. Supabase Studio → SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.

create table if not exists pi.event_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Alert specification: any combination of these may be set; null means
  -- "no constraint on this dimension". The cron worker (out of repo)
  -- joins this table against the events feed each week.
  category    text check (category in (
    'food-wine', 'market', 'festival', 'cellar-door', 'community',
    'arts', 'wellness', 'live-music', 'racing-sport', 'family-programs',
    'exhibition', 'civic', 'nature', 'writers-ideas'
  )),
  place_slug  text,            -- match against pi.events.place
  lens        text,            -- match against pi.events.lens (array overlap)
  -- Delivery preferences
  email       boolean not null default true,
  browser     boolean not null default false,
  -- Audit
  created_at  timestamptz not null default now(),
  -- Tracking
  last_fired_at timestamptz
);

comment on table pi.event_alerts is 'Reader alert subscriptions for events. Phase 4 WS4B. Cron worker pushes weekly digests to email + browser-Notifications subscribers.';

create index if not exists event_alerts_by_user
  on pi.event_alerts (user_id, created_at desc);
create index if not exists event_alerts_by_category
  on pi.event_alerts (category) where category is not null;

alter table pi.event_alerts enable row level security;

drop policy if exists "event_alerts_select_own" on pi.event_alerts;
create policy "event_alerts_select_own"
  on pi.event_alerts for select
  using (user_id = auth.uid());

drop policy if exists "event_alerts_insert_own" on pi.event_alerts;
create policy "event_alerts_insert_own"
  on pi.event_alerts for insert
  with check (user_id = auth.uid());

drop policy if exists "event_alerts_update_own" on pi.event_alerts;
create policy "event_alerts_update_own"
  on pi.event_alerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "event_alerts_delete_own" on pi.event_alerts;
create policy "event_alerts_delete_own"
  on pi.event_alerts for delete
  using (user_id = auth.uid());
