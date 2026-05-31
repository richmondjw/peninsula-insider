-- PI Market Consolidation Migration
-- PR-4: collapse dual market collections into the venue-market model
-- Run after: 2026-06-01-pi-type-routing.sql
-- Spec: docs/specs/pr-4-market-consolidation.md

BEGIN;

-- 1. Remove experience-side market rows (the 2 true duplicates whose venue
--    equivalent is retained). The other 3 experience markets were converted
--    to venue rows and keep their slug, so they only need a pillar fix below.
DELETE FROM pi.content_registry
  WHERE entity_type = 'market'
    AND pillar = 'explore'
    AND slug IN ('balnarring-farmers-market', 'red-hill-market');

-- 2. The 3 converted markets and any other market rows now route under Eat.
UPDATE pi.content_registry
  SET pillar = 'eat'
  WHERE entity_type = 'market'
    AND pillar <> 'eat';

COMMIT;
