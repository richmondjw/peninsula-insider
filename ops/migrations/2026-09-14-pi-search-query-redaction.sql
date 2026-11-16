-- Migration: stop storing raw reader search queries
-- Date: 2026-09-14
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
-- Ticket: PI-024 / action register A13
--
-- WHY
--
-- 2026-05-07-site-search-queries.sql created pi.site_search_queries with
-- `query text not null`, and both search surfaces POSTed the reader's raw
-- query string on every search, for every reader, whether or not they had
-- accepted the consent banner. Each row also carries a session identifier and,
-- for a signed-in reader, their auth UID -- so the text is attributable.
--
-- Search text is personal data. People type names, addresses, medical and
-- financial terms into a search box with no expectation that any of it is
-- stored. The fix is not a consent dialog; it is not to collect. As of
-- 2026-09-14 the client sends result_count, kind_filter, surface and
-- page_path, and no query text at all.
--
-- WHAT THIS DOES
--
--   1. Drops NOT NULL on `query` so the redacted client insert succeeds.
--      Until this is applied, the new client's inserts are rejected by the
--      NOT NULL constraint and NOTHING is logged. That is the fail-safe
--      direction, but it does mean zero-result analytics stay dark until
--      this runs.
--   2. Adds a CHECK constraint that forbids any future row from carrying
--      query text. NOT VALID, so the constraint applies to new and updated
--      rows without having to rewrite or delete the historical ones. A
--      client that regains the habit of sending the text now gets a database
--      error rather than a silent write.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--
-- It does not touch the rows already collected. Purging them is a separate,
-- destructive, James-only decision -- see the clearly marked block at the
-- bottom of this file, which is commented out on purpose. Do not uncomment
-- it as part of applying this migration.
--
-- Idempotent: safe to re-run.
--
-- How to apply:
--   1. Supabase Studio -> SQL editor for the PI auth project
--   2. Paste this file
--   3. Run. Expect <1s.

-- ─── 1. the column may now be absent ────────────────────────────────────────

alter table pi.site_search_queries
  alter column query drop not null;

alter table pi.site_search_queries
  alter column query set default null;

-- ─── 2. the column may no longer be populated ───────────────────────────────

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'pi.site_search_queries'::regclass
      and conname  = 'site_search_queries_no_raw_query'
  ) then
    execute $con$
      alter table pi.site_search_queries
        add constraint site_search_queries_no_raw_query
        check (query is null)
        not valid
    $con$;
  end if;
end;
$$;

comment on column pi.site_search_queries.query is
  'RETIRED 2026-09-14 (A13). Raw reader search text is no longer collected. '
  'The no-raw-query CHECK constraint rejects any attempt to repopulate it. '
  'Historical rows are retained pending a separate retention decision.';

-- ─── Verification (read-only, safe to run any time) ─────────────────────────
--
--   -- expect: is_nullable = YES, column_default = NULL
--   select is_nullable, column_default
--     from information_schema.columns
--    where table_schema = 'pi'
--      and table_name   = 'site_search_queries'
--      and column_name  = 'query';
--
--   -- expect: one row, convalidated = false (NOT VALID is intentional)
--   select conname, convalidated
--     from pg_constraint
--    where conrelid = 'pi.site_search_queries'::regclass
--      and conname  = 'site_search_queries_no_raw_query';
--
--   -- how much historical raw text is still held
--   select count(*) as rows_with_raw_query,
--          min(created_at) as oldest,
--          max(created_at) as newest
--     from pi.site_search_queries
--    where query is not null;

-- ─── OPTIONAL AND DESTRUCTIVE -- James's decision, not part of this migration
--
-- Redacting the historical rows keeps the aggregate signal (result counts,
-- surfaces, dates) and discards the text. It cannot be undone.
--
--   update pi.site_search_queries set query = null where query is not null;
--
-- If the column itself should go, so that no future schema change can bring
-- the text back, drop it instead -- this also drops the CHECK above:
--
--   alter table pi.site_search_queries drop column query;
