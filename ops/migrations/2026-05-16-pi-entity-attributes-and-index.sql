-- Migration: pi.entity_attributes + pi.entity_index
-- Date: 2026-05-16
-- Project: PI auth Supabase (tjjhpvslpysfklwpqmgz)
-- Schema: pi
--
-- Phase B of the data architecture plan
-- (vault: 07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md).
--
-- Purpose
-- -------
-- Establish the runtime queryable entity layer the planner, concierge,
-- alerts, iOS app, and Pass products read from. Built from:
--   - next/src/taxonomy/facet-taxonomy.yaml (Phase A — canonical taxonomy)
--   - next/src/content/**/*.{json,md,mdx} (the 21 Astro collections)
-- by the projector at next/scripts/refresh-entity-index.mjs, run on every
-- deploy.
--
-- Two tables:
--
--   pi.entity_attributes  — normalised. One row per (entity, facet, value).
--                           Useful for "find every venue with facet X = Y"
--                           and for the coverage dashboard.
--
--   pi.entity_index       — denormalised. One row per entity, with the
--                           facet payload as JSONB plus tsvector + vector +
--                           geography for hybrid search. This is the table
--                           the public search RPC queries.
--
-- Idempotent: safe to re-run. Uses CREATE TABLE IF NOT EXISTS and
-- ON CONFLICT clauses in the projector.
--
-- How to apply
-- ------------
--   1. Block on Phase A merge (PR #142). The projector references the
--      canonical taxonomy values; running it before sign-off risks
--      writing rows with values that will be renamed.
--   2. Supabase Studio → SQL editor for the PI auth project
--      (tjjhpvslpysfklwpqmgz)
--   3. Paste this file
--   4. Run. Expect <2s for the schema. PostGIS extension may already be
--      enabled; the `create extension if not exists` is a no-op if so.
--   5. Run the projector with --apply to populate rows:
--        SUPABASE_SERVICE_KEY=... \
--        node next/scripts/refresh-entity-index.mjs --apply
--   6. Verify counts with the queries at the bottom of this file.
--
-- After applying
-- --------------
-- Wire the projector into the deploy workflow (next step), so every
-- merge to main repopulates the index. Embedding population is gated on
-- the concierge embedding pipeline being pointed at this table — Phase C
-- work, not blocking.

-- ─── extensions ──────────────────────────────────────────────────────────
create extension if not exists vector;
create extension if not exists postgis;
create extension if not exists pg_trgm;  -- for typeahead fuzzy match

-- ─── pi.entity_attributes ────────────────────────────────────────────────
-- Normalised attribute store. Granular row per facet value so SQL queries
-- like "every entity with audience=families AND theme=wine" stay fast and
-- composable.
--
-- entity_type   — venue, experience, event, place, etc. Matches
--                 pi.content_registry.entity_type so the referential
--                 integrity trigger from 2026-05-11 can extend here.
-- entity_slug   — slug as it appears in next/src/content/<type>/<slug>.*
-- facet_key     — canonical facet family from facet-taxonomy.yaml
--                 (audience, mood, theme, occasion, etc.)
-- facet_value   — canonical value within that family.
-- confidence    — 1.0 = editor-set, <1 = inferred. Phase B ships with 1.0
--                 for editor-set values; 0.5 for inferred-from-mapping values.
-- source        — 'editor' (declared in content frontmatter) | 'projector'
--                 (mapped from legacy enum via Phase A taxonomy) | 'inferred'
--                 (Phase C — derived heuristically).
-- evidence_url  — citation URL when source != editor. Phase B leaves null.
-- verified_at   — when an editor last confirmed this attribute. Lets the
--                 coverage dashboard prioritise stale facets.

create table if not exists pi.entity_attributes (
  entity_type   text not null,
  entity_slug   text not null,
  facet_key     text not null,
  facet_value   text not null,
  confidence    numeric(3,2) not null default 1.0
                 check (confidence > 0 and confidence <= 1),
  source        text not null default 'projector'
                 check (source in ('editor', 'projector', 'inferred')),
  evidence_url  text,
  verified_at   timestamptz,
  refreshed_at  timestamptz not null default now(),
  primary key (entity_type, entity_slug, facet_key, facet_value)
);

comment on table pi.entity_attributes is
  'Normalised facet attributes per entity, projected from Astro content via the Phase A taxonomy mappings. One row per (entity, facet, value). Refreshed by next/scripts/refresh-entity-index.mjs on every deploy.';

create index if not exists entity_attributes_facet_idx
  on pi.entity_attributes (facet_key, facet_value);

create index if not exists entity_attributes_entity_idx
  on pi.entity_attributes (entity_type, entity_slug);

create index if not exists entity_attributes_refreshed_at_idx
  on pi.entity_attributes (refreshed_at desc);

-- ─── pi.entity_index ─────────────────────────────────────────────────────
-- Denormalised single-row-per-entity index that powers the runtime search.
-- This is the table pi.search() RPC (Phase C) reads from.
--
-- Three retrieval paths against it:
--   1. Lexical:  body_tsv @@ websearch_to_tsquery(...)
--   2. Semantic: embedding <=> $query_vector  (HNSW index)
--   3. Facets:   facets @> '{"audience":["families"]}'::jsonb
-- Combined and reranked by the RPC; this table is just the storage layer.
--
-- facets is a JSONB object keyed by facet_key with array values, e.g.
--   {"audience": ["families","couples"], "theme": ["wine"], "mood": ["scenic"]}
-- mirroring the canonical taxonomy families.

create table if not exists pi.entity_index (
  entity_type   text not null,
  entity_slug   text not null,
  title         text not null,
  dek           text,
  body          text,                       -- searchable freeform copy
  body_tsv      tsvector,                   -- lexical (auto-populated)
  embedding     vector(1536),               -- semantic (Phase C populates)
  facets        jsonb not null default '{}'::jsonb,
  zone          text,                       -- pi taxonomy zone
  place_slug    text,                       -- references pi.content_registry
  coordinates   geography(point, 4326),
  starts_at     timestamptz,                -- for events
  ends_at       timestamptz,
  open_hours    jsonb,                      -- when known
  href          text not null,
  hero_image    jsonb,                      -- {src, alt, credit, license}
  taxonomy_version text,                    -- pin to facet-taxonomy.yaml version
  refreshed_at  timestamptz not null default now(),
  primary key (entity_type, entity_slug)
);

comment on table pi.entity_index is
  'Denormalised runtime entity index. One row per public entity, with tsvector + vector + JSONB facets + geography. Read by the pi.search() RPC (Phase C).';

-- Auto-populate body_tsv from body + title + dek on insert/update. Phase C
-- can tune the weighting; for now title gets weight A, dek B, body C.
create or replace function pi.entity_index_set_tsv()
returns trigger
language plpgsql
as $$
begin
  new.body_tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.dek, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body, '')), 'C');
  return new;
end;
$$;

drop trigger if exists entity_index_tsv_trg on pi.entity_index;
create trigger entity_index_tsv_trg
  before insert or update of title, dek, body on pi.entity_index
  for each row execute function pi.entity_index_set_tsv();

-- ─── indexes ─────────────────────────────────────────────────────────────
-- HNSW for semantic retrieval (matches concierge_chunks pattern).
create index if not exists entity_index_embedding_hnsw_idx
  on pi.entity_index
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- GIN for lexical retrieval.
create index if not exists entity_index_body_tsv_gin_idx
  on pi.entity_index
  using gin (body_tsv);

-- GIN for JSONB facet predicates (jsonb_path_ops is faster for @> queries).
create index if not exists entity_index_facets_gin_idx
  on pi.entity_index
  using gin (facets jsonb_path_ops);

-- GiST for spatial "near me" queries.
create index if not exists entity_index_coordinates_gist_idx
  on pi.entity_index
  using gist (coordinates);

-- Btree on common filter columns.
create index if not exists entity_index_filter_btree_idx
  on pi.entity_index (entity_type, zone, place_slug);

-- Btree on time-window for events.
create index if not exists entity_index_time_window_idx
  on pi.entity_index (starts_at, ends_at)
  where starts_at is not null;

-- Trigram on title for fast typeahead.
create index if not exists entity_index_title_trgm_idx
  on pi.entity_index
  using gin (title gin_trgm_ops);

-- ─── RLS ─────────────────────────────────────────────────────────────────
-- Public read (anon and authenticated). Writes service-role only — the
-- projector runs with SUPABASE_SERVICE_KEY at deploy time.
alter table pi.entity_attributes enable row level security;
alter table pi.entity_index enable row level security;

drop policy if exists entity_attributes_public_read on pi.entity_attributes;
create policy entity_attributes_public_read
  on pi.entity_attributes for select
  to anon, authenticated
  using (true);

drop policy if exists entity_index_public_read on pi.entity_index;
create policy entity_index_public_read
  on pi.entity_index for select
  to anon, authenticated
  using (true);

-- Service role has full access via the bypass-RLS flag on its JWT, so no
-- explicit write policy is needed. Anon and authenticated cannot write.

-- ─── content_registry referential integrity extension ────────────────────
-- Mirror the trigger pattern from 2026-05-11: entity_attributes and
-- entity_index rows must reference a known entity. Prevents drift if
-- the projector ever runs against stale content.

create or replace function pi.assert_entity_in_registry()
returns trigger
language plpgsql
security definer
set search_path = pi, public, pg_catalog
as $$
begin
  if not exists (
    select 1 from pi.content_registry r
     where r.entity_type = new.entity_type
       and r.entity_slug = new.entity_slug
  ) then
    raise exception
      'entity (%) (%) not in pi.content_registry — refresh registry first',
      new.entity_type, new.entity_slug
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists entity_attributes_registry_trg on pi.entity_attributes;
create trigger entity_attributes_registry_trg
  before insert or update on pi.entity_attributes
  for each row execute function pi.assert_entity_in_registry();

drop trigger if exists entity_index_registry_trg on pi.entity_index;
create trigger entity_index_registry_trg
  before insert or update on pi.entity_index
  for each row execute function pi.assert_entity_in_registry();

-- ─── verification queries (read-only) ────────────────────────────────────
-- Run after applying + after first projector run:
--
--   select count(*) from pi.entity_index;
--   -- expect ~580 rows matching content_registry count
--
--   select facet_key, count(*) from pi.entity_attributes
--    group by facet_key order by count(*) desc;
--   -- attribute coverage per facet
--
--   select entity_type, count(*) from pi.entity_index
--    group by entity_type order by count(*) desc;
--   -- entity type breakdown
--
--   select * from pi.entity_index
--    where title % 'jackalope';  -- trigram match
