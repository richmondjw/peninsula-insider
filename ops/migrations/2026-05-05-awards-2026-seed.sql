-- Migration: Awards 2026 category seed (Phase 5 WS5B)
-- Date: 2026-05-05
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: seed the 9 default categories from WS4E into pi.award_categories
-- for year 2026 with the planned voting cycle (nominations August,
-- voting through September, results announced first weekend of October).
--
-- Editorial only has to fill in nominees via pi.award_nominees after this.
-- Voting windows can be edited from Supabase Studio if the cycle shifts.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING preserves any editor edits
-- made after a previous run.
--
-- HOW TO APPLY
--   1. Supabase Studio → SQL editor for project tjjhpvslpysfklwpqmgz
--   2. Paste this file
--   3. Run. Expect <1s.
--   4. Verify with: select count(*) from pi.award_categories;  -- 9

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

-- Verify
-- select slug, title, year, voting_opens_at, voting_closes_at, published
-- from pi.award_categories
-- where year = 2026
-- order by sort_order;
