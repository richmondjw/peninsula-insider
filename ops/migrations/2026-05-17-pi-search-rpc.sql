-- Migration: pi.search() hybrid search RPC
-- Date: 2026-05-17
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
-- Depends on: 2026-05-16-pi-entity-attributes-and-index.sql
--
-- Phase C of the data architecture plan
-- (vault: 07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md).
--
-- Purpose
-- -------
-- Single SQL RPC that powers both the typeahead and the planner. Combines:
--   - Lexical retrieval over pi.entity_index.body_tsv (websearch_to_tsquery)
--   - Semantic retrieval over pi.entity_index.embedding (cosine via HNSW)
--   - JSONB facet predicates (theme, audience, mood, weather, etc.)
--   - Spatial filter (geography distance) for "near me"
--   - Time-window filter for events
--   - Optional entity_type restriction
--
-- All filters are optional. With no arguments, returns the most-recently-
-- refreshed entities. The function is SECURITY DEFINER and runs as the
-- table owner so anon callers can hit it directly via PostgREST without
-- needing select on pi.entity_index.
--
-- Idempotent: drop + recreate.
--
-- How to apply
-- ------------
--   1. Block on Phase B migration being applied (pi.entity_index must exist).
--   2. Supabase Studio → SQL editor for the PI auth project
--   3. Paste this file
--   4. Run. Expect <1s.
--   5. Test:
--        select entity_type, title, combined_score
--          from pi.search(q => 'cellar door', result_limit => 5);
--
-- Frontend integration
-- --------------------
-- next/src/lib/search-client.ts wraps this RPC via supabase-js. SearchOverlay
-- and /search.astro try the RPC first and fall back to Pagefind if it errors
-- or returns no rows. Pagefind stays as the static crawl-time backup.

-- ─── content_hash column for embedding drift detection ──────────────────
-- next/scripts/embed-entity-index.mjs writes the sha256 of title|dek|body
-- when it embeds a row, so the next run skips unchanged content.
alter table pi.entity_index
  add column if not exists content_hash text;

-- ─── helper: facet-match score ───────────────────────────────────────────
-- Returns the count of (key, value) pairs in `filters` that also appear in
-- `facets`. Used to rank entities by how many required facets they match.
create or replace function pi.facet_match_count(facets jsonb, filters jsonb)
returns int
language sql
immutable
as $$
  select coalesce(
    sum(
      case
        when facets ? key
         and (
           select bool_and(facets -> key @> to_jsonb(v))
             from jsonb_array_elements_text(value) v
         )
        then jsonb_array_length(value)
        else 0
      end
    )::int,
    0
  )
  from jsonb_each(coalesce(filters, '{}'::jsonb))
  where jsonb_typeof(value) = 'array';
$$;

-- ─── main RPC ────────────────────────────────────────────────────────────
drop function if exists pi.search(text, jsonb, double precision, double precision, numeric, timestamptz, timestamptz, text[], vector, int, numeric, numeric, numeric);

create or replace function pi.search(
  q                text          default null,
  filters          jsonb         default '{}'::jsonb,
  near_lat         double precision default null,
  near_lng         double precision default null,
  near_km          numeric       default null,
  when_from        timestamptz   default null,
  when_to          timestamptz   default null,
  entity_types     text[]        default null,
  query_embedding  vector(1536)  default null,
  result_limit     int           default 25,
  weight_lexical   numeric       default 0.4,
  weight_vector    numeric       default 0.4,
  weight_facet     numeric       default 0.2
)
returns table (
  entity_type     text,
  entity_slug     text,
  title           text,
  dek             text,
  href            text,
  facets          jsonb,
  zone            text,
  place_slug      text,
  hero_image      jsonb,
  starts_at       timestamptz,
  ends_at         timestamptz,
  distance_km     numeric,
  lexical_score   real,
  vector_score    real,
  facet_score     int,
  combined_score  numeric
)
language sql
stable
security definer
set search_path = pi, public, pg_catalog
as $$
  with
    -- 1. Resolve the lexical query (if any). websearch_to_tsquery handles
    --    natural-language input like "rainy day with the dog" gracefully.
    qts as (
      select case when q is null or length(trim(q)) = 0
                  then null
                  else websearch_to_tsquery('english', q)
             end as tsq
    ),
    -- 2. Optional geography point for near-me distance.
    qpt as (
      select case
               when near_lat is null or near_lng is null then null
               else ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)::geography
             end as pt
    ),
    -- 3. Scored candidates. We intentionally evaluate every row that passes
    --    the hard filters; entity_index is small (~600 rows), so per-row
    --    cost is fine. Indexes still help when filters narrow aggressively.
    candidates as (
      select
        ei.entity_type,
        ei.entity_slug,
        ei.title,
        ei.dek,
        ei.href,
        ei.facets,
        ei.zone,
        ei.place_slug,
        ei.hero_image,
        ei.starts_at,
        ei.ends_at,
        case
          when (select pt from qpt) is not null and ei.coordinates is not null
          then (ST_Distance(ei.coordinates, (select pt from qpt)) / 1000.0)::numeric
          else null
        end as distance_km,
        case
          when (select tsq from qts) is null then 0::real
          else ts_rank_cd(ei.body_tsv, (select tsq from qts))::real
        end as lexical_score,
        case
          when query_embedding is null or ei.embedding is null then 0::real
          else (1 - (ei.embedding <=> query_embedding))::real
        end as vector_score,
        pi.facet_match_count(ei.facets, filters) as facet_score
      from pi.entity_index ei
      where
        -- Hard filter: entity type
        (entity_types is null or ei.entity_type = any(entity_types))
        -- Hard filter: time window (for events)
        and (when_from is null or ei.ends_at is null or ei.ends_at >= when_from)
        and (when_to   is null or ei.starts_at is null or ei.starts_at <= when_to)
        -- Hard filter: spatial radius
        and (
          (select pt from qpt) is null
          or near_km is null
          or ei.coordinates is null
          or ST_DWithin(ei.coordinates, (select pt from qpt), near_km * 1000)
        )
        -- Hard filter: lexical query, when provided
        and (
          (select tsq from qts) is null
          or ei.body_tsv @@ (select tsq from qts)
          or query_embedding is not null   -- bypass lexical filter when semantic provided
        )
    )
  select
    c.entity_type,
    c.entity_slug,
    c.title,
    c.dek,
    c.href,
    c.facets,
    c.zone,
    c.place_slug,
    c.hero_image,
    c.starts_at,
    c.ends_at,
    c.distance_km,
    c.lexical_score,
    c.vector_score,
    c.facet_score,
    (
      coalesce(weight_lexical, 0.4) * c.lexical_score +
      coalesce(weight_vector,  0.4) * c.vector_score +
      coalesce(weight_facet,   0.2) * least(c.facet_score, 5) / 5.0
    )::numeric as combined_score
  from candidates c
  -- Drop rows that match nothing meaningful.
  where (
    c.lexical_score > 0
    or c.vector_score > 0
    or c.facet_score > 0
    or ((select tsq from qts) is null and query_embedding is null)
  )
  order by
    combined_score desc nulls last,
    -- Tie-break by recency
    c.starts_at desc nulls last,
    c.title asc
  limit greatest(result_limit, 1);
$$;

comment on function pi.search is
  'Hybrid lexical + semantic + facet + spatial + temporal search over pi.entity_index. Phase C. Pagefind stays as crawl-time fallback. See ops/migrations/2026-05-17-pi-search-rpc.sql for parameter docs.';

-- Allow anon + authenticated to call the function via PostgREST.
grant execute on function pi.search to anon, authenticated;
grant execute on function pi.facet_match_count(jsonb, jsonb) to anon, authenticated;

-- ─── verification ────────────────────────────────────────────────────────
-- After applying + populating entity_index:
--
--   -- 1. Plain text query
--   select entity_type, title, combined_score
--     from pi.search(q => 'cellar door', result_limit => 5);
--
--   -- 2. Facet filter only
--   select entity_type, title from pi.search(
--     filters => '{"theme": ["wine"], "audience": ["couples"]}'::jsonb,
--     result_limit => 10
--   );
--
--   -- 3. Combined: "dog-friendly cellar doors near Sorrento, open Sunday"
--   select entity_type, title, distance_km from pi.search(
--     q        => 'cellar door',
--     filters  => '{"dog-friendly": ["yes"]}'::jsonb,
--     near_lat => -38.3367, near_lng => 144.7470, near_km => 15,
--     result_limit => 10
--   );
--
--   -- 4. Future-event window
--   select title, starts_at from pi.search(
--     entity_types => array['event'],
--     when_from    => now(),
--     when_to      => now() + interval '7 days',
--     result_limit => 20
--   );
