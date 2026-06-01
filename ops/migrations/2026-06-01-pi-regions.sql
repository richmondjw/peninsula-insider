-- PI Regions Table
-- PR-6: regions collection backing table + content_registry entries
-- Run after: 2026-06-01-pi-explore-url-migration.sql
-- Spec: docs/specs/pr-6-regions.md

BEGIN;

ALTER TABLE pi.content_registry DROP CONSTRAINT IF EXISTS content_registry_entity_type_check;
ALTER TABLE pi.content_registry
  ADD CONSTRAINT content_registry_entity_type_check
  CHECK (entity_type IN (
    'article', 'page', 'event', 'place', 'region', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));

ALTER TABLE pi.cms_image_slots DROP CONSTRAINT IF EXISTS cms_image_slots_entity_type_check;
ALTER TABLE pi.cms_image_slots
  ADD CONSTRAINT cms_image_slots_entity_type_check
  CHECK (entity_type IN (
    'article', 'page', 'event', 'place', 'region', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));

ALTER TABLE pi.cms_text_fields DROP CONSTRAINT IF EXISTS cms_text_fields_entity_type_check;
ALTER TABLE pi.cms_text_fields
  ADD CONSTRAINT cms_text_fields_entity_type_check
  CHECK (entity_type IN (
    'article', 'page', 'event', 'place', 'region', 'venue', 'experience', 'itinerary',
    'tour', 'tour-operator', 'tour-package', 'quick-note', 'local-secret'
  ));

CREATE TABLE IF NOT EXISTS pi.regions (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  tagline       TEXT,
  intro         TEXT,
  hero_image    JSONB,
  zones         TEXT[] NOT NULL DEFAULT '{}',
  place_slugs   TEXT[] NOT NULL DEFAULT '{}',
  coordinates   JSONB,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Content registry entries for regions (pillar = explore)
INSERT INTO pi.content_registry (slug, entity_type, pillar, href, title, priority)
  VALUES
    ('red-hill-wine-country', 'region', 'explore', '/explore/regions/red-hill-wine-country/', 'Red Hill & Merricks', 90),
    ('peninsula-tip',         'region', 'explore', '/explore/regions/peninsula-tip/',         'Sorrento & Portsea',  90),
    ('mornington-bay-coast',  'region', 'explore', '/explore/regions/mornington-bay-coast/',  'Mornington & the Bay',90),
    ('western-port',          'region', 'explore', '/explore/regions/western-port/',          'Western Port',        90),
    ('ocean-coast',           'region', 'explore', '/explore/regions/ocean-coast/',           'Flinders & the Ocean Coast', 90)
  ON CONFLICT (slug) DO UPDATE SET
    href = EXCLUDED.href,
    title = EXCLUDED.title,
    priority = EXCLUDED.priority;

-- Seed initial region rows
INSERT INTO pi.regions (slug, name, tagline, zones, place_slugs, published_at) VALUES
  ('red-hill-wine-country', 'Red Hill & Merricks', 'The Peninsula''s wine heartland', ARRAY['red-hill','hinterland'], ARRAY['red-hill','main-ridge','merricks','merricks-beach','merricks-north','balnarring'], NOW()),
  ('peninsula-tip', 'Sorrento & Portsea', 'Limestone cliffs, ocean baths, the Heads ferry', ARRAY['peninsula-tip'], ARRAY['sorrento','portsea','blairgowrie','rye','fingal'], NOW()),
  ('mornington-bay-coast', 'Mornington & the Bay', 'The Peninsula''s urban edge', ARRAY['mornington','bay-coast'], ARRAY['mornington','mount-martha','safety-beach','mccrae','dromana','rosebud','capel-sound','mount-eliza'], NOW()),
  ('western-port', 'Western Port', 'The quieter side', ARRAY['western-port'], ARRAY['hastings','bittern','crib-point','boneo'], NOW()),
  ('ocean-coast', 'Flinders & the Ocean Coast', 'Wild surf beaches, the best pub on the Peninsula', ARRAY['ocean-coast'], ARRAY['flinders','cape-schanck','rye','fingal'], NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;
