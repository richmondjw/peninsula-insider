-- PI Schema Foundations Migration
-- PR-2: zone enum correction, providore type, estate/tier/region fields
-- Run after: 2026-05-19-pi-image-bindings.sql
-- Spec: docs/specs/pr-2-schema-foundations.md

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Zone values
-- Rename legacy zone values to new canonical names. Supabase enums cannot be
-- renamed in-place, so this uses a text-based column update. New 'bay-coast'
-- zone is applied to the Dromana-to-Rye coastal strip by place reference in
-- the content layer; mirror here if/when a zone backfill by town is run.
-- (Adjust table/column names to match the actual Supabase schema.)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE pi.venues SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.venues SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.venues SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.venues SET zone = 'peninsula-tip' WHERE zone = 'tip';

  UPDATE pi.places SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.places SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.places SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.places SET zone = 'peninsula-tip' WHERE zone = 'tip';

  UPDATE pi.experiences SET zone = 'mornington'    WHERE zone = 'bayside';
  UPDATE pi.experiences SET zone = 'red-hill'      WHERE zone = 'red-hill-plateau';
  UPDATE pi.experiences SET zone = 'peninsula-tip' WHERE zone = 'back-beaches';
  UPDATE pi.experiences SET zone = 'peninsula-tip' WHERE zone = 'tip';
END $$;

-- ----------------------------------------------------------------------------
-- 2. Venues: new columns
-- ----------------------------------------------------------------------------
ALTER TABLE pi.venues
  ADD COLUMN IF NOT EXISTS subtype       TEXT,
  ADD COLUMN IF NOT EXISTS estate_slug   TEXT,
  ADD COLUMN IF NOT EXISTS estate_label  TEXT,
  ADD COLUMN IF NOT EXISTS venue_tier    TEXT NOT NULL DEFAULT 'destination'
    CHECK (venue_tier IN ('destination', 'recommended', 'directory'));

-- ----------------------------------------------------------------------------
-- 3. Experiences: new column
-- ----------------------------------------------------------------------------
ALTER TABLE pi.experiences
  ADD COLUMN IF NOT EXISTS venue_slug TEXT;

-- ----------------------------------------------------------------------------
-- 4. Places: new columns
-- ----------------------------------------------------------------------------
ALTER TABLE pi.places
  ADD COLUMN IF NOT EXISTS region_slug  TEXT,
  ADD COLUMN IF NOT EXISTS region_label TEXT;

-- ----------------------------------------------------------------------------
-- 5. Content registry: allow 'providore' entity/type
-- The content_registry type check constraint may need updating to include
-- 'providore'. Inspect the existing constraint name, then drop and recreate
-- with the updated list:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'pi.content_registry'::regclass;
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 6. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS venues_estate_slug_idx  ON pi.venues (estate_slug);
CREATE INDEX IF NOT EXISTS venues_venue_tier_idx   ON pi.venues (venue_tier);
CREATE INDEX IF NOT EXISTS venues_zone_idx          ON pi.venues (zone);
CREATE INDEX IF NOT EXISTS places_region_slug_idx  ON pi.places (region_slug);

COMMIT;
