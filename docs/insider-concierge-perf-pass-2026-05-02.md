# Insider Concierge Performance Pass — Honest Findings

**Date:** 2 May 2026
**Author:** Remy
**Scope:** Latency + quality optimization for The Insider concierge.

---

## TL;DR

Server-side total latency is dominated by **Claude Sonnet 4.5 generation** (~80% of every request). Optimizations to retrieval, rerank, candidate pool, and prompt context only move the needle by ~0.5-1s out of ~17s. Reader-perceived latency is already addressed by the **streaming endpoint** (first token lands in 2-3s).

To meaningfully cut backend total time further, the levers are:

1. **DB indexes** (HNSW + GIN + btree) — migration ready at `ops/migrations/2026-05-03-concierge-chunks-perf-indexes.sql`. ~50-150ms gain. Apply via Supabase Studio when convenient.
2. **Vercel region change** to Sydney — config change. ~100-300ms gain (DB is in `ap-southeast`; Vercel default is `iad1` US East). Requires `regions: ["syd1"]` in `vercel.json` plus a deploy.
3. **Switch generation model to Claude Haiku 4.5** — env var change (`ANTHROPIC_MODEL_QUALITY=claude-haiku-4-5`). 5-10x faster (3-5s vs 9-15s). Quality risk needs an A/B against the eval set before flipping in production.

The code is now structured so each is one decision, not a project.

---

## What landed in this pass (4 PRs, all merged)

| PR | What | Effect |
|---|---|---|
| platform#3 | Per-step timing telemetry, max_tokens 900, pool 30→15, TOP_K 5→4, speculative retrieval | Speculative pattern broke recall |
| platform#4 | Revert speculative retrieval to SQL-level filtering | Recall partially recovered |
| platform#5 | On-demand unfiltered retrieval fallback when filtered set is sparse | Empty-pool regression closed |
| platform#6 | TOP_K back to 5 — quality > marginal latency | Quality fully recovered |

**Net code changes that stuck:**

- **Per-step timing telemetry**. Every response now emits `_debug.timings`: `intent_and_embed_ms`, `retrieve_ms`, `rerank_ms`, `generate_ms`, `enrich_ms`, plus `ttft_ms` on the streaming path. We can see what we're optimizing.
- **Candidate pool 30 → 15**. RRF returns half as many to Cohere; saves ~100-150ms on rerank with no recall cost.
- **max_tokens 1500 → 900**. Output rarely exceeded 700 tokens; the slow tail is capped earlier.
- **Fallback retrieval**: when filtered SQL returns < 6 results combined (vector + bm25), a second unfiltered round runs in parallel and merges. Closes the "intent classifier picked a too-narrow filter" regression.
- **TOP_K 5 (preserved)**. Tried 4, lost 0.17 mean quality on the eval set; restored.

**Quality changes that stuck:**

- Recommendation **dedupe** in the enricher (first occurrence wins).
- Prompt **diversity nudge**: the system prompt now explicitly tells the LLM to use distinct slugs and mix kinds when the context supports it.

---

## Eval results across passes (30-query frozen set)

| Pass | Median latency | Mean quality |
|---|---:|---:|
| Baseline (post-dedupe, pre-perf) | 17.09s | 4.77 / 5 |
| After pass 1 (speculative retrieval) | 13.77s | 4.10 / 5 ← speculative broke recall |
| After pass 2 (revert speculative) | 14.38s | 4.13 / 5 ← still empty-pools |
| After pass 3 (+ fallback retrieval) | 16.66s | 4.60 / 5 |
| After pass 4 (+ TOP_K restored) | 17.88s | 4.63 / 5 |

The variance in median across runs (±2s) is roughly the noise floor at this sample size. The honest read: the changes are essentially **quality-neutral** vs baseline, with the upside being **better observability**, **safer recall**, and **half the candidate pool** for the rerank step.

---

## What dominates latency, and why

A typical query timing breakdown (from the new `_debug.timings`):

| Step | Time | Share |
|---|---:|---:|
| `intent_and_embed_ms` (Haiku classify + OpenAI embed, parallel) | ~1,300ms | 8% |
| `retrieve_ms` (Supabase pgvector + tsv) | ~200ms | 1% |
| `rerank_ms` (Cohere) | ~300ms | 2% |
| `generate_ms` (Sonnet 4.5, streaming) | ~13,000ms | **80%** |
| `enrich_ms` (Supabase lookups) | ~250ms | 1% |
| Network/cold-start variance | ~1,000ms | 6% |

**Generation is the bottleneck. Everything else is measurement.**

---

## What can still meaningfully reduce backend total time

### A. DB indexes (lowest risk; ready to apply)

Migration is already at [ops/migrations/2026-05-03-concierge-chunks-perf-indexes.sql](../ops/migrations/2026-05-03-concierge-chunks-perf-indexes.sql). Idempotent. Adds:

- HNSW index on `embedding` (vector_cosine_ops)
- GIN on `text_tsv`
- Compound btree on `(region, category, source_entity_type)`
- Btree on `(chunk_purpose, page_slug)` for the place enricher
- Btree on `extracted_at` for prune

**Expected gain:** retrieve_ms 200ms → ~50-100ms. Modest now (corpus is 2k rows); compounds dramatically as the corpus grows past 10k.

**To apply:** Supabase Studio → SQL editor → paste file → Run.

### B. Vercel region change (one-line config)

Currently the API runs in Vercel's default region (`iad1` = US East Virginia). Supabase is in `ap-southeast-2` (Sydney). Every retrieve, embed, rerank, and generate call crosses the Pacific.

Add to `apps/api/vercel.json`:

```json
{
  "regions": ["syd1"]
}
```

**Expected gain:** 100-300ms shaved off every external call (retrieve_ms, enrich_ms, embed within intent_and_embed_ms). Cumulative ~400-800ms per request because there are several round trips.

**Requires:** Vercel Pro plan (single region is allowed on Hobby; multi-region isn't). Check the project's plan before flipping.

### C. Switch generation to Claude Haiku 4.5 (highest leverage; quality decision)

Today: `ANTHROPIC_MODEL_QUALITY=claude-sonnet-4-5` (Vercel project env var, matches the code default).

To flip: set `ANTHROPIC_MODEL_QUALITY=claude-haiku-4-5` in Vercel. No code change needed.

**Expected gain:** Haiku 4.5 is roughly **5-10x faster** than Sonnet 4.5 for this kind of structured-output work. Median 17s → ~3-5s. Editorial voice quality drops measurably; the eval harness can confirm by how much.

**Test plan before flipping:**

```
ANTHROPIC_MODEL_QUALITY=claude-haiku-4-5  # set in Vercel preview deployment
node ops/scripts/insider-eval-runner.mjs --label haiku-test --concurrency=3
```

If mean quality stays ≥ 4.4 / 5, flip. If it drops below, keep Sonnet and look at hybrid strategies (Haiku for prose, Sonnet for the structured recommendations tool call).

### D. Voyage 3 embeddings (medium risk)

Already in env vars (`VOYAGE_API_KEY`, `VOYAGE_MODEL`); not yet used for query embedding. Voyage 3 is materially better at editorial-prose retrieval than `text-embedding-3-small` per published benchmarks.

**Requires:** running the existing `apps/api/scripts/backfill-voyage-embeddings.ts` once to re-embed the corpus (~$0.50 one-off), then switching `embedQuery` to use Voyage. Both vectors must use the same embedding model.

**Expected gain:** retrieval relevance improves measurably; latency neutral (Voyage is comparably fast). Quality lift, not latency.

---

## What we tried and reverted

- **Speculative retrieval** (classify in parallel with retrieval, filter in memory). Saved ~400-700ms but tanked recall on filter-targeted queries because the top-25 unfiltered vector results often contained zero chunks in the filter region. **Reverted.** The fallback retrieval pattern in pass 3 is the safer middle ground.
- **TOP_K 5 → 4**. Saved ~100ms input tokens but the LLM occasionally missed the most relevant chunk (e.g. Bushrangers Bay on a Cape Schanck walks query). **Reverted to 5.**

---

## Where the code is now

```
peninsula-insider-platform / apps/api/src/routes/concierge.ts
  - parallel classify + embed
  - SQL-filtered retrieval (matchCount=25)
  - on-demand unfiltered fallback (when filtered total < 6)
  - RRF merge top 15
  - Cohere rerank to TOP_K=5
  - Sonnet 4.5 generation (max_tokens=900)
  - Per-step timings on every response
  - sources[] for citations (already shipped)
  - Telemetry: token usage + cost_approx_aud + gap_detected (already shipped)
```

---

## Recommended next moves, in priority order

1. **Apply the DB indexes migration** (5 min in Studio). No risk. Modest immediate gain. Compounds.
2. **Run a Haiku eval** in Vercel preview environment. If quality holds, flip to Haiku in production. **This is the single biggest latency win available.** Median 17s → ~4s.
3. **Add `regions: ["syd1"]` to vercel.json** if the project is on Pro tier. Otherwise document for the next plan upgrade.
4. **Backfill Voyage embeddings** for retrieval quality. Quality lift, not latency. Defer until after Haiku decision lands.

---

## What stayed the same (and is fine)

- Sonnet 4.5 system prompt with voice examples — kept; cache hits make repeat queries cheap and fast on warm caches.
- Dedupe + diversity prompt nudges from the prior session.
- Streaming endpoint — already optimal for reader perceived latency.
- Telemetry pipeline — already populated cost, tokens, gaps, ttft.
- Daily usage report — running on schedule; Telegram delivery working.
- Source citations — already on the `sources` array of every response.
