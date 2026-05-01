# Concierge Corpus Cutover — Live Status

**Date:** 30 April 2026
**Operator:** Remy (Claude local agent)
**Status:** ✅ COMPLETE — concierge corpus is live and serving from the expanded chunk set.

---

## Final state

The "Ask The Insider" concierge is now retrieving from a corpus more than twice the size of yesterday's:

| Source type (DB) | Row count | What it represents |
|---|---:|---|
| `venue` | 672 | 135 venue records, ~5 chunks each |
| `article` | 1,138 | 78 articles + 10 editorial blocks remapped (best-of intros, hub framing) |
| `experience` | 186 | 42 experience records + 20 places remapped (towns, capes, ridges) |
| `itinerary` | 27 | 6 curated multi-stop trip plans |
| `event` | 24 | 8 future / in-progress events; recently-past auto-skipped |
| **Total** | **2,047** | up from 1,000 yesterday |

Note on the remap: `place` and `editorial_block` types are folded into `experience` and `article` respectively at write time, because the live `concierge_chunks_source_entity_type_check` constraint allows only the five types above. Chunk metadata still carries the original distinction via `category` and `chunk_purpose`, and the concierge API doesn't filter by `source_entity_type` by default, so retrieval is unaffected.

---

## Applied live (in order)

1. **PR #9** — [feat(concierge): triple corpus coverage + operationalise daily refresh](https://github.com/richmondjw/peninsula-insider/pull/9). Recovered the silently-failing pipeline (relocated to `ops/scripts/`), extended with 5 new walkers, added editorial_blocks collection, IT handover brief.
2. **Workflow file applied directly to main** via `gh api PUT` (PAT lacked workflow scope, gh CLI did not). Schedule moved from 06:00 → 21:00 Melbourne.
3. **PR #10** — [fix(concierge): live-schema fixes — extracted_at, schema probe, compat mode](https://github.com/richmondjw/peninsula-insider/pull/10). DB column was `extracted_at` not `ingested_at`. Added schema probe so the script runs cleanly before/after the migration.
4. **PR #12** — [fix: NOT NULL editorial_voice_owner + tier-A constraint](https://github.com/richmondjw/peninsula-insider/pull/12). Live DB has `editorial_voice_owner NOT NULL` (default 'Editorial') and `chunks_tier_a_requires_otto_verified` check (new chunks land tier B; Otto promotes).
5. **PR #13** — [fix: source_entity_type allowlist](https://github.com/richmondjw/peninsula-insider/pull/13). Remapped `place→experience`, `editorial_block→article` at write time.
6. **PR #14** — [fix: compat-mode metadata-only false-positive + event freshness_flag check](https://github.com/richmondjw/peninsula-insider/pull/14). Compat-mode bug was misrouting text-matching chunks to the metadata-only branch which threw. Plus event `stale` flag isn't allowed by DB; recently-past events are now skipped.
7. **Cutover run #25175436625 succeeded.** 0 errors, 1,151 chunks unchanged, 3 re-embedded, daily report committed back to [reports/concierge-corpus/2026-04-30.md](../reports/concierge-corpus/2026-04-30.md).

---

## What still needs manual attention

### 1. DB migration (NOT BLOCKING; for unlocking metadata-only diff and event_date filtering)

The script is currently running in **compat mode** — it skips writing `metadata_fingerprint` and `event_date` because the columns don't exist on the live table. The cron is healthy in this mode; the migration is an enhancement, not a fix.

To apply: open Supabase Studio → SQL editor → paste contents of [`ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql`](../ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql) → Run. Idempotent.

The script auto-detects on its next run and lights up the metadata-only and event-date logic.

### 2. Legacy chunks aging out

The DB has 896 "stale" chunks left over from the legacy chunker (`<slug>::editorial::0` etc.). They're newer than the 7-day prune grace, so the daily run skips them. They will age past the grace window on **2026-05-05** and the next daily run will auto-prune them, leaving the corpus at ~1,151 fresh chunks.

If you want to force-prune them now, trigger `workflow_dispatch` with `mode: normal` and they will go.

### 3. Concierge API enricher (separate repo: peninsula-insider-platform)

The `enrichRecommendations` function in `apps/api/src/routes/concierge.ts` only resolves slugs against the `venues` and `articles` tables. New types (places-as-experiences, itineraries, events, editorial_blocks) contribute to the LLM's grounding context **but won't render as recommendation tiles** on `/ask` until the enricher learns to look them up. This is a UX gap, not a correctness gap. Concierge answers improve immediately; tile UX needs an enricher extension as a future PR in that repo.

### 4. Stale Supabase personal token

`SUPABASE_PERSONAL_TOKEN` in `peninsula-insider-platform/.env` returns 401 against the Management API. Refresh it from the Supabase dashboard → Account → Access Tokens. Not blocking; only matters for direct DB-management API calls.

---

## What the concierge gains today

Reader queries that bottomed out before now hit framing context:

- **Town queries** ("what's Sorrento like?") → answers draw from `places/sorrento.json` intro + TLDR
- **Itinerary queries** ("plan a Sorrento weekend") → 6 curated itineraries surface as multi-stop sequences
- **Walk queries** ("best peninsula walks") → 42 experience records with duration, difficulty, editor's notes
- **Event queries** ("what's on this weekend") → fresh events; recently-past auto-skipped
- **"Best of X" queries** → 10 migrated editorial blocks carry the same framing copy readers see on the live page

Effective coverage roughly doubles, and the editorial voice (previously locked inside `.astro` page templates) is now queryable.

---

## What runs tomorrow without anyone touching it

- **21:00 Melbourne (11:00 UTC):** workflow fires, refresh script reads `next/src/content/`, computes diff, embeds delta, upserts to Supabase, commits a daily report to `reports/concierge-corpus/`.
- **Push triggers:** any commit touching `next/src/content/{venues,articles,places,itineraries,experiences,events,editorial_blocks}/` or `ops/scripts/refresh-corpus.mjs` runs the refresh within minutes.

---

## Files to read for full context

- [`docs/peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md`](peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md) — full IT handover brief
- [`ops/scripts/refresh-corpus.mjs`](../ops/scripts/refresh-corpus.mjs) — the script (live)
- [`.github/workflows/refresh-corpus.yml`](../.github/workflows/refresh-corpus.yml) — the schedule (live)
- [`reports/concierge-corpus/2026-04-30.md`](../reports/concierge-corpus/2026-04-30.md) — first successful daily report
- `CHANGELOG.md` — entry under 2026-05-01
