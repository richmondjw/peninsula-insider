-- Migration: add metadata_fingerprint and event_date columns to concierge_chunks
-- Date: 2026-04-30
-- Required by: ops/scripts/refresh-corpus.mjs (post 2026-04-30 update)
--
-- Run once against the live Supabase project before the next scheduled
-- refresh fires. Safe to re-run (idempotent thanks to IF NOT EXISTS).
--
-- Why this is needed:
--   1. metadata_fingerprint closes the "metadata-only changes do not retrigger
--      embedding upsert" gap. The refresh job now hashes structured metadata
--      separately from chunk text, and re-upserts when either changes. When a
--      venue's featuredPartner flips or its freshness_flag updates, the row's
--      vendor_relationship / freshness_flag columns will now stay in sync
--      without requiring a chunk text change.
--   2. event_date stores the effective end date of an event as a real DATE
--      column, so the concierge API can filter expired events at query time
--      and the refresh script can target them for pruning.

ALTER TABLE concierge_chunks
  ADD COLUMN IF NOT EXISTS metadata_fingerprint text,
  ADD COLUMN IF NOT EXISTS event_date date;

-- Optional: backfill metadata_fingerprint with a placeholder so first-pass
-- comparisons after deploy don't treat every existing row as "metadata
-- changed". The next refresh run will overwrite these with real fingerprints
-- as it walks each chunk.
UPDATE concierge_chunks
   SET metadata_fingerprint = 'pre-migration'
 WHERE metadata_fingerprint IS NULL;

-- Optional: helpful index for the concierge API if it filters expired events
-- at query time. Leave commented until the API actually uses event_date.
-- CREATE INDEX IF NOT EXISTS concierge_chunks_event_date_idx
--   ON concierge_chunks (event_date)
--   WHERE source_entity_type = 'event';
