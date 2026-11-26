-- Migration: pi.search() matches the way people ask
-- Date: 2026-11-26
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
-- Replaces the body of pi.search from 2026-05-17-pi-search-rpc.sql. The
-- arguments and returned columns are unchanged, so callers need no change.
-- To roll back, re-run 2026-05-17-pi-search-rpc.sql.
--
-- Why
-- ---
-- The old function used websearch_to_tsquery, which requires every word of
-- the query in one record. "best places for a long lunch in red hill"
-- returned 3 rows and "where can i take the kids when it rains" returned
-- none. It also had no tolerance for a misspelt name: "tedeska" found nothing.
--
-- What changes
-- ------------
--   1. Filler words ("show", "best", "places") and the region's own name are
--      dropped from the query before matching.
--   2. A record matches on ANY remaining word, and is ranked by the share of
--      those words it contains. Queries of three or more words need at least
--      half; one or two word queries take the fullest match available.
--   3. A query that closely resembles a title matches it (pg_trgm
--      word_similarity of 0.45 or more), which catches misspellings.
--   4. Venues get a 10 percent lift on text queries.
--
-- Measured on the live index before and after (rows returned, limit 96):
--   best places for a long lunch in red hill   3 -> venues first, capped
--   where can i take the kids when it rains    0 -> 3
--   tedeska                                    0 -> 2 (Tedesca Osteria first)
--   montalto                                   6 -> 6 (venue now first)
--
-- Owner approved this database change on 26 November 2026.

create or replace function pi.search
(
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
    -- 1. The words that carry the query. to_tsvector drops English stop words
    --    ("me", "the", "for") and stems the rest; the list below drops filler
    --    that says nothing about the subject ("show", "best", "places") and
    --    the region's own name, which every record matches.
    terms as (
      select distinct t.lexeme
        from unnest(to_tsvector('english', coalesce(q, ''))) as t
       where t.lexeme not in (
         'show','best','place','find','good','great','nice','top','want','look',
         'recommend','suggest','somewher','anywher','near','around','go','get',
         'peninsula','mornington','visit','option','idea','thing','spot','area'
       )
    ),
    nterms as (select count(*)::int as n from terms),
    -- 2. Match ANY carrying word; ranking then rewards records that match
    --    more of them. If the query is all filler, fall back to the old
    --    every-word match so it still means something.
    qts as (
      select case
               when q is null or length(trim(q)) = 0 then null
               when (select n from nterms) = 0 then websearch_to_tsquery('english', q)
               else to_tsquery('simple', (select string_agg(quote_literal(lexeme), ' | ') from terms))
             end as tsq
    ),
    qtext as (select nullif(lower(trim(coalesce(q, ''))), '') as t),
    qpt as (
      select case
               when near_lat is null or near_lng is null then null
               else ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)::geography
             end as pt
    ),
    scored as (
      select
        ei.entity_type, ei.entity_slug, ei.title, ei.dek, ei.href, ei.facets, ei.zone,
        ei.place_slug, ei.hero_image, ei.starts_at, ei.ends_at,
        case
          when (select pt from qpt) is not null and ei.coordinates is not null
          then (ST_Distance(ei.coordinates, (select pt from qpt)) / 1000.0)::numeric
          else null
        end as distance_km,
        -- Share of the carrying words this record contains.
        case
          when (select n from nterms) = 0 then
            case when (select tsq from qts) is not null and ei.body_tsv @@ (select tsq from qts) then 1::real else 0::real end
          else (
            select count(*)::real from terms t
             where ei.body_tsv @@ to_tsquery('simple', quote_literal(t.lexeme))
          ) / (select n from nterms)
        end as coverage,
        case
          when (select tsq from qts) is null then 0::real
          else ts_rank_cd(ei.body_tsv, (select tsq from qts))::real
        end as rank_cd,
        -- Typo tolerance: how closely the query resembles the title.
        case
          when (select t from qtext) is null then 0::real
          else word_similarity((select t from qtext), lower(ei.title))::real
        end as title_sim,
        case
          when query_embedding is null or ei.embedding is null then 0::real
          else (1 - (ei.embedding <=> query_embedding))::real
        end as vector_score,
        pi.facet_match_count(ei.facets, filters) as facet_score
      from pi.entity_index ei
      where
        (entity_types is null or ei.entity_type = any(entity_types))
        and (when_from is null or ei.ends_at is null or ei.ends_at >= when_from)
        and (when_to   is null or ei.starts_at is null or ei.starts_at <= when_to)
        and (
          (select pt from qpt) is null
          or near_km is null
          or ei.coordinates is null
          or ST_DWithin(ei.coordinates, (select pt from qpt), near_km * 1000)
        )
    ),
    candidates as (
      select
        s.*,
        max(s.coverage) over () as best_coverage,
        (
          -- Coverage leads: a record with every carrying word outranks one
          -- with half of them. Rank and a close title add to it.
          s.coverage * s.coverage
          + least(s.rank_cd, 1) * 0.5
          + case when s.title_sim >= 0.45 then s.title_sim * 0.6 else 0 end
        )::real as lexical_score
      from scored s
    ),
    kept as (
      select c.* from candidates c
      where
        (select tsq from qts) is null
        or query_embedding is not null
        or c.title_sim >= 0.45
        -- Three or more carrying words: at least half must match, so one
        -- common word does not drag in every record that mentions it.
        -- One or two: take the fullest match the index has ("hot springs"
        -- means both words when any record has both).
        or c.coverage >= case when (select n from nterms) <= 2 then greatest(c.best_coverage, 0.5) else 0.5 end
    )
  select
    c.entity_type, c.entity_slug, c.title, c.dek, c.href, c.facets, c.zone,
    c.place_slug, c.hero_image, c.starts_at, c.ends_at, c.distance_km,
    c.lexical_score, c.vector_score, c.facet_score,
    (
      (
        coalesce(weight_lexical, 0.4) * c.lexical_score +
        coalesce(weight_vector,  0.4) * c.vector_score +
        coalesce(weight_facet,   0.2) * least(c.facet_score, 5) / 5.0
      )
      -- A reader searching a guide to places usually wants a place to go.
      * case when (select tsq from qts) is not null and c.entity_type = 'venue' then 1.1 else 1 end
    )::numeric as combined_score
  from kept c
  where (
    c.lexical_score > 0
    or c.vector_score > 0
    or c.facet_score > 0
    or ((select tsq from qts) is null and query_embedding is null)
  )
  order by
    combined_score desc nulls last,
    c.starts_at desc nulls last,
    c.title asc
  limit greatest(result_limit, 1);
$$;

comment on function pi.search is
  'Hybrid lexical + semantic + facet + spatial + temporal search over pi.entity_index. Any-word matching ranked by coverage, with title typo tolerance. See ops/migrations/2026-11-26-pi-search-natural-language.sql.';

grant execute on function pi.search to anon, authenticated;
