-- PI Explore URL Migration
-- PR-5: move Places and Plans under /explore/
-- Run after: 2026-06-01-pi-market-consolidation.sql
-- Spec: docs/specs/pr-5-explore-url-migration.md

BEGIN;

-- Repoint stored hrefs to the new /explore/ structure.
UPDATE pi.content_registry
  SET href = REPLACE(href, '/places/', '/explore/places/')
  WHERE href LIKE '/places/%';

UPDATE pi.content_registry
  SET href = REPLACE(href, '/plans/', '/explore/plans/')
  WHERE href LIKE '/plans/%';

UPDATE pi.content_registry
  SET href = REPLACE(href, '/escape/', '/explore/plans/')
  WHERE href LIKE '/escape/%';

-- Verification (expect zero rows):
-- SELECT slug, href FROM pi.content_registry
--   WHERE href LIKE '/places/%' OR href LIKE '/plans/%' OR href LIKE '/escape/%';

COMMIT;
