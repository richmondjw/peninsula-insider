-- Migration: concierge_chunks RPCs accept hard entity-ID filter
-- Date: 2026-05-17
-- Project: PI_Concierge Supabase (mvdtkgsfuhmkioygxgge)
-- Schema: public
--
-- Phase D wave 4 of the data architecture rollout
-- (vault: 07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md).
--
-- Lives in ops/migrations/concierge/ (not the top-level ops/migrations/
-- because that folder targets the PI auth project tjjhpvslpysfklwpqmgz).
-- This one targets the CONCIERGE project. Already applied via MCP.
--
-- What this does
-- --------------
-- Adds an optional `filter_entity_ids text[]` parameter to both
-- concierge_vector_search and concierge_bm25_search. When set, the chunk
-- retrieval is hard-filtered to those entities — backend calls pi.search
-- on tjjhpvslpysfklwpqmgz first to get attribute-matched entities, then
-- passes the resulting IDs here so the LLM only sees chunks from
-- approved entities.
--
-- Filter accepts BOTH ID formats:
--   1. Canonical pi form:  'venue:alba-thermal-springs'
--      (what pi.search returns: entity_type || ':' || entity_slug)
--   2. Raw corpus form:    'venue_alba_thermal_springs'
--      (what concierge_chunks already stores: matches source_entity_id)
--
-- Backend can pass either format. Coverage by entity type for the
-- canonical→raw translation (regexp + underscore swap):
--   venue:      140 / 140  (100%)
--   itinerary:    6 /   6  (100%)
--   event:       68 /  68  (100%)
--   article:    173 / 183  (95%)
--   experience:  41 /  63  (65%)
-- The OR-both predicate covers the remaining 32 edge cases via exact
-- raw-form match.

create or replace function public.concierge_vector_search(
  query_embedding    vector,
  match_count        integer default 30,
  filter_region      text default null,
  filter_category    text default null,
  filter_source_type text default null,
  filter_entity_ids  text[] default null
)
returns table (
  chunk_id            text,
  source_entity_type  text,
  source_entity_id    text,
  page_slug           text,
  page_title          text,
  section_heading     text,
  category            text,
  region              text,
  vendor_relationship text,
  text                text,
  similarity          double precision
)
language sql
stable
as $$
  select
    c.chunk_id,
    c.source_entity_type,
    c.source_entity_id,
    c.page_slug,
    c.page_title,
    c.section_heading,
    c.category,
    c.region,
    c.vendor_relationship,
    c.text,
    1 - (c.embedding <=> query_embedding) as similarity
  from concierge_chunks c
  where
    c.editorial_tier in ('A','B')
    and c.embedding is not null
    and (filter_region is null      or c.region = filter_region)
    and (filter_category is null    or c.category = filter_category)
    and (filter_source_type is null or c.source_entity_type = filter_source_type)
    and (filter_entity_ids is null
         or c.source_entity_id = any(filter_entity_ids)
         or (c.source_entity_type || ':' || replace(
               regexp_replace(c.source_entity_id, '^' || c.source_entity_type || '_', ''),
               '_', '-'
             )) = any(filter_entity_ids))
  order by c.embedding <=> query_embedding
  limit match_count
$$;

create or replace function public.concierge_bm25_search(
  query_text         text,
  match_count        integer default 30,
  filter_region      text default null,
  filter_category    text default null,
  filter_source_type text default null,
  filter_entity_ids  text[] default null
)
returns table (
  chunk_id            text,
  source_entity_type  text,
  source_entity_id    text,
  page_slug           text,
  page_title          text,
  section_heading     text,
  category            text,
  region              text,
  vendor_relationship text,
  text                text,
  rank                real
)
language sql
stable
as $$
  with q as (
    select plainto_tsquery('english', query_text) as tsq
  )
  select
    c.chunk_id,
    c.source_entity_type,
    c.source_entity_id,
    c.page_slug,
    c.page_title,
    c.section_heading,
    c.category,
    c.region,
    c.vendor_relationship,
    c.text,
    ts_rank(c.text_tsv, q.tsq) as rank
  from concierge_chunks c, q
  where
    c.editorial_tier in ('A','B')
    and c.text_tsv @@ q.tsq
    and (filter_region is null      or c.region = filter_region)
    and (filter_category is null    or c.category = filter_category)
    and (filter_source_type is null or c.source_entity_type = filter_source_type)
    and (filter_entity_ids is null
         or c.source_entity_id = any(filter_entity_ids)
         or (c.source_entity_type || ':' || replace(
               regexp_replace(c.source_entity_id, '^' || c.source_entity_type || '_', ''),
               '_', '-'
             )) = any(filter_entity_ids))
  order by ts_rank(c.text_tsv, q.tsq) desc
  limit match_count
$$;

-- Note: the previous 5-arg overloads were dropped to avoid ambiguity.
-- Backend callers passing 5 args continue to work because the new 6th
-- parameter defaults to null.

-- Verification (read-only, run after applying):
--   select count(*) from concierge_bm25_search('cellar door', 50, null, null, null);
--   -- expect unrestricted
--   select count(*) from concierge_bm25_search(
--     'cellar door', 50, null, null, null,
--     array['venue:phaedrus-estate','venue:dromana-estate']
--   );
--   -- expect filtered, chunks only from those two venues
