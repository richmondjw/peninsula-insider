-- PI Search Sync
-- PR-9: surface region/estate/tier in search; clean producer -> providore
-- Run after: 2026-06-01-pi-regions.sql
-- Spec: docs/specs/pr-9-search-sync.md

BEGIN;

-- 1. venues_search view: venue joined to its place's region context.
-- Adjust the join column to match the actual venues.place FK column name.
CREATE OR REPLACE VIEW pi.venues_search AS
SELECT
  v.slug,
  v.name,
  v.type            AS entity_type,
  v.zone,
  v.estate_slug,
  v.venue_tier,
  p.slug            AS place_slug,
  p.name            AS place_name,
  p.region_slug,
  p.region_label
FROM pi.venues v
LEFT JOIN pi.places p ON p.slug = v.place_slug
WHERE v.status IS NULL OR v.status = 'active';

GRANT SELECT ON pi.venues_search TO anon, authenticated;

-- 2. pi.search() RPC: add region_slug, estate_slug, venue_tier to the
-- RETURNS TABLE(...) and the SELECT body. The exact change depends on the
-- current RPC definition; inspect it first:
--   SELECT pg_get_functiondef('pi.search'::regproc);
-- then recreate with the three columns added (region_slug/estate_slug from
-- pi.venues_search for venue rows, NULL for other entity types).

-- 3. Content registry: producer -> providore (belt and braces; PR-3 already
-- reclassified the venue JSON).
UPDATE pi.content_registry
  SET entity_type = 'providore'
  WHERE entity_type = 'producer';

-- 4. Verification (expect: 0 producers, 5 regions).
-- SELECT COUNT(*) FROM pi.content_registry WHERE entity_type = 'producer';
-- SELECT COUNT(*) FROM pi.content_registry WHERE entity_type = 'region';

COMMIT;
