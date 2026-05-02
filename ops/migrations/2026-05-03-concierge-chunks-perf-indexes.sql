-- Migration: performance indexes on concierge_chunks
-- Date: 2026-05-03
-- Purpose: drop retrieval latency from O(n) sequential scans to O(log n)
--          index lookups. Expected speedup at current corpus size (~2,000
--          rows) is modest (~50-100ms) but compounds dramatically as the
--          corpus grows past 10k chunks.
--
-- Run once against the live Supabase project (mvdtkgsfuhmkioygxgge).
-- Idempotent — safe to re-run; CREATE INDEX IF NOT EXISTS skips existing
-- indexes.
--
-- How to apply:
--   1. Open Supabase Studio → SQL editor for the concierge project
--   2. Paste this entire file
--   3. Click Run. Expect ~5-15s of index-build time.
--
-- After applying, re-run the eval harness (ops/scripts/insider-eval-runner.mjs)
-- to confirm latency improvement.

-- ─── 1. HNSW index on the embedding column ─────────────────────────────────
-- HNSW (Hierarchical Navigable Small World) is the right vector index for
-- pgvector at this scale. Trades index size for query speed: ~10-50x faster
-- than IVFFlat at <100k rows, and ~10x faster than no index at all.
--
-- The `vector_cosine_ops` opclass matches the cosine-distance similarity the
-- concierge_vector_search RPC uses. Tune `m` and `ef_construction` if recall
-- becomes an issue (current defaults are good for our scale).

CREATE INDEX IF NOT EXISTS concierge_chunks_embedding_hnsw_idx
  ON concierge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── 2. GIN index on the BM25 tsvector ─────────────────────────────────────
-- The BM25 RPC scans `text_tsv`. Without GIN, it sequential-scans every row.
-- GIN is the standard pgrole tsvector index. ~5-10x faster on text search.

CREATE INDEX IF NOT EXISTS concierge_chunks_text_tsv_gin_idx
  ON concierge_chunks
  USING gin (text_tsv);

-- ─── 3. Compound btree for filter narrowing ────────────────────────────────
-- The vector_search and bm25_search RPCs filter by region + category +
-- source_entity_type. A multi-column btree lets PostgREST narrow the row set
-- before the vector / tsv scan, especially on common combos like
-- (red-hill, winery, venue).

CREATE INDEX IF NOT EXISTS concierge_chunks_filter_btree_idx
  ON concierge_chunks (region, category, source_entity_type)
  WHERE source_entity_type IS NOT NULL;

-- ─── 4. Btree on chunk_purpose for the place-hint join ─────────────────────
-- The new enricher does
--   SELECT page_slug, page_title, region FROM concierge_chunks
--   WHERE page_slug IN (...) AND chunk_purpose IN ('place_intro', 'place_tldr')
-- on every concierge response (to resolve place recommendations). Without
-- this, that lookup is a seq scan.

CREATE INDEX IF NOT EXISTS concierge_chunks_chunk_purpose_idx
  ON concierge_chunks (chunk_purpose, page_slug);

-- ─── 5. Btree on extracted_at for the daily report's "stale row" prune ─────
-- The refresh script's --prune flag deletes rows where extracted_at <
-- now() - 7 days. That predicate becomes index-only with this btree.

CREATE INDEX IF NOT EXISTS concierge_chunks_extracted_at_idx
  ON concierge_chunks (extracted_at);

-- ─── 6. Refresh statistics ─────────────────────────────────────────────────
-- ANALYZE updates the planner's row-count estimates so it picks the new
-- indexes. Without this, the first few queries after applying may still
-- choose seq scans.

ANALYZE concierge_chunks;

-- ─── Verification queries (read-only, run after the above) ─────────────────
-- Confirm all indexes are present and being used by the planner.
--
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE tablename = 'concierge_chunks'
--    AND schemaname = 'public'
--  ORDER BY indexname;
--
-- EXPLAIN ANALYZE
--  SELECT chunk_id, page_title FROM concierge_chunks
--  WHERE region = 'red-hill' AND source_entity_type = 'venue'
--  LIMIT 25;
-- (expect: "Index Scan using concierge_chunks_filter_btree_idx")
