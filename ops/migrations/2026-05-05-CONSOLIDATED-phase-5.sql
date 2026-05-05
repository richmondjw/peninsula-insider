-- ============================================================================
-- CONSOLIDATED MIGRATION: Phase 5 (Awards 2026 seed + venue change requests)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)  ← peninsula-insider-crm
-- Schema: pi
--
-- Single-paste deploy. Combines:
--   1. Awards 2026 category seed                  (Phase 5 WS5B)
--   2. pi.venue_change_requests                   (Phase 5 WS5C)
--   3. (Optional, commented) editor-role flag     (operational)
--
-- Idempotent: safe to re-run. Both top-level operations use either
-- ON CONFLICT DO NOTHING (5B) or CREATE...IF NOT EXISTS + DROP POLICY
-- IF EXISTS + CREATE POLICY (5C).
--
-- HOW TO APPLY
--   1. Supabase Studio → top-left dropdown → peninsula-insider-crm
--      (URL https://tjjhpvslpysfklwpqmgz.supabase.co)
--   2. SQL Editor → New query → paste this entire file
--   3. Run. Expect <2 seconds.
--   4. Verification block at the foot.
-- ============================================================================

-- ─── 1. AWARDS 2026 — category seed (WS5B) ──────────────────────────────────

insert into pi.award_categories (slug, year, title, description, sort_order, voting_opens_at, voting_closes_at, published)
values
  (
    'restaurant-of-the-year',
    2026,
    'Restaurant of the Year',
    'The dining room the editorial desk would book this year if it could only book one.',
    10,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'cellar-door-of-the-year',
    2026,
    'Cellar Door of the Year',
    'Where the wine, the room, and the welcome converged in 2026.',
    20,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'stay-of-the-year',
    2026,
    'Stay of the Year',
    'The bed that defined a Peninsula weekend in 2026.',
    30,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'walk-of-the-year',
    2026,
    'Walk of the Year',
    'The route that justified the drive and the boots.',
    40,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'best-new-opening',
    2026,
    'Best New Opening',
    'The 2026 arrival that reset what was possible in its category.',
    50,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'best-family-day',
    2026,
    'Best Family Day',
    'Pram, picnic, parking. Kids-grade A in the field.',
    60,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'locals-choice',
    2026,
    'Locals'' Choice',
    'Reader-voted. The place locals would actually send a friend to.',
    70,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'worth-the-drive',
    2026,
    'Worth-the-Drive Award',
    'The Peninsula moment that justified the 90-minute return without any other reason.',
    80,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  ),
  (
    'editorial-discovery',
    2026,
    'Editorial Discovery',
    'The hidden corner the editorial desk found this year that won''t stay hidden much longer.',
    90,
    '2026-09-01 00:00:00+10',
    '2026-09-30 23:59:00+10',
    false
  )
on conflict (slug) do nothing;

-- ─── 2. pi.venue_change_requests (WS5C) ─────────────────────────────────────

create table if not exists pi.venue_change_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  venue_slug      text not null,
  venue_name      text,
  change_type     text not null check (change_type in (
    'hours', 'photo', 'closure', 'event', 'correction', 'other'
  )),
  proposed_change text not null,
  reference_url   text,
  operator_name   text not null,
  operator_email  text not null,
  operator_role   text,
  status          text not null default 'pending' check (status in (
    'pending', 'in-review', 'applied', 'declined'
  )),
  editor_notes    text,
  decision_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  client_token    text
);
comment on table pi.venue_change_requests is 'Phase 5 WS5C: operator-submitted change requests against the venue corpus.';

create index if not exists venue_change_requests_by_status_created
  on pi.venue_change_requests (status, created_at desc);
create index if not exists venue_change_requests_by_venue
  on pi.venue_change_requests (venue_slug, created_at desc);

alter table pi.venue_change_requests enable row level security;

drop policy if exists "venue_change_requests_anon_insert" on pi.venue_change_requests;
create policy "venue_change_requests_anon_insert"
  on pi.venue_change_requests for insert with check (true);

drop policy if exists "venue_change_requests_select_own_by_user" on pi.venue_change_requests;
create policy "venue_change_requests_select_own_by_user"
  on pi.venue_change_requests for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "venue_change_requests_editor_all" on pi.venue_change_requests;
create policy "venue_change_requests_editor_all"
  on pi.venue_change_requests for all
  using (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true))
  with check (exists (select 1 from pi.profiles p where p.id = auth.uid() and p.is_editor = true));

create or replace function pi.venue_change_requests_set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists venue_change_requests_set_updated_at on pi.venue_change_requests;
create trigger venue_change_requests_set_updated_at
  before update on pi.venue_change_requests
  for each row execute function pi.venue_change_requests_set_updated_at();

-- ─── 3. (OPTIONAL) Editor-role flag ─────────────────────────────────────────
-- Only relevant if you haven't already set is_editor = true on your
-- profile from the Phase 3+4 consolidated migration. Sign in once on the
-- live site first to create your auth.users row, then uncomment + edit
-- below with your email.
--
-- update pi.profiles
-- set is_editor = true
-- where id = (select id from auth.users where email = 'YOUR_EDITOR_EMAIL@example.com');

-- ============================================================================
-- VERIFY
--   select count(*) from pi.award_categories where year = 2026;
--     -- expect 9
--
--   select slug, sort_order, voting_opens_at, voting_closes_at, published
--   from pi.award_categories
--   where year = 2026
--   order by sort_order;
--     -- expect the 9 categories in editorial order, all not-yet-published
--
--   select count(*) from pi.venue_change_requests;
--     -- expect 0 (no operators have submitted yet)
--
--   select tablename from pg_tables
--   where schemaname = 'pi'
--   order by tablename;
--     -- should now include venue_change_requests alongside the rest
-- ============================================================================
