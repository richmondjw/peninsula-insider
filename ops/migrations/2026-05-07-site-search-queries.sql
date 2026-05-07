-- Migration: site search query logging
-- Date: 2026-05-07
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Purpose: capture every search query fired on PI (both the full
--          /search page and the instant SearchOverlay) so we can
--          analyse search intent, surface zero-result gaps, and
--          drive editorial/SEO decisions over time.
--
-- Table:
--   pi.site_search_queries — one row per search event. Anonymous
--   sessions get a null user_id; logged-in sessions get their
--   Supabase auth UID. result_count lets us flag zero-result searches.
--
-- RLS policy:
--   anon can INSERT only — no read-back, no update, no delete.
--   service role retains full access for reporting scripts.
--
-- Idempotent: safe to re-run.
--
-- How to apply:
--   1. Supabase Studio → SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.

-- ─── pi.site_search_queries ──────────────────────────────────────

create table if not exists pi.site_search_queries (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  query         text        not null,
  result_count  int         not null default 0,
  kind_filter   text,                 -- active chip value, null = "all"
  surface       text        not null  -- 'overlay' | 'search_page'
                            check (surface in ('overlay', 'search_page')),
  user_id       uuid        references auth.users(id) on delete set null,
  session_id    text,                 -- client-generated session UUID (no PII)
  page_path     text                  -- pathname when search was fired
);

-- Index for the daily report query (time-range scan + aggregation)
create index if not exists site_search_queries_created_at_idx
  on pi.site_search_queries (created_at desc);

-- Index for zero-result gap analysis
create index if not exists site_search_queries_result_count_idx
  on pi.site_search_queries (result_count, created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────

alter table pi.site_search_queries enable row level security;

-- anon and authenticated users may insert only
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'pi'
      and tablename  = 'site_search_queries'
      and policyname = 'anon_insert'
  ) then
    execute $pol$
      create policy anon_insert on pi.site_search_queries
        for insert
        to anon, authenticated
        with check (true)
    $pol$;
  end if;
end;
$$;
