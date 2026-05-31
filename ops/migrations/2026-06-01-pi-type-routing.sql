-- PI Type Routing Migration
-- PR-3: producer reclassification, brewery/distillery -> eat routing
-- Run after: 2026-06-01-pi-schema-foundations.sql
-- Spec: docs/specs/pr-3-type-routing.md

BEGIN;

-- 1. Brewery/distillery now route under Eat & Drink, not Wine
UPDATE pi.content_registry
  SET pillar = 'eat'
  WHERE entity_type IN ('brewery', 'distillery')
    AND pillar = 'wine';

-- 2. Producer -> providore for the 5 reclassified retail venues
UPDATE pi.content_registry
  SET entity_type = 'providore'
  WHERE entity_type = 'producer'
    AND slug IN (
      'main-ridge-dairy',
      'red-hill-cheese',
      'pier-street-seafood',
      'peninsula-fresh-organics',
      'mornington-peninsula-chocolates'
    );

-- 3. Remove producer rows for the 3 venues moved to experiences
DELETE FROM pi.content_registry
  WHERE entity_type = 'producer'
    AND slug IN ('red-hill-truffles', 'sunny-ridge-strawberry-farm', 'ashcombe-maze');

-- 4. Re-insert the 3 as experiences (pillar = explore).
-- canonical_url resolves to /experiences/[slug]/ in the content layer; adjust
-- the column set to match the actual content_registry shape before applying.
INSERT INTO pi.content_registry (slug, entity_type, pillar)
  VALUES
    ('red-hill-truffles',           'experience', 'explore'),
    ('sunny-ridge-strawberry-farm', 'experience', 'explore'),
    ('ashcombe-maze',               'experience', 'explore')
  ON CONFLICT (slug) DO UPDATE
    SET entity_type = EXCLUDED.entity_type,
        pillar      = EXCLUDED.pillar;

COMMIT;
