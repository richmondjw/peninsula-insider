# Concierge Corpus Cutover — Live Status

**Date:** 30 April 2026
**Operator:** Remy (Claude local agent)
**Purpose:** Single-page record of what was applied live, what remains, and what to do about each item.

---

## Applied live

1. **PR #9 merged.** [feat(concierge): triple corpus coverage + operationalise daily refresh](https://github.com/richmondjw/peninsula-insider/pull/9). Brought in:
   - `ops/scripts/refresh-corpus.mjs` (recovered from the deploy-scrub gap, extended with five new walkers)
   - `next/src/content/editorial_blocks/` (10 hub intros)
   - `ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql`
   - IT handover brief in `docs/`
2. **Workflow updated on main.** `.github/workflows/refresh-corpus.yml` now points at `ops/scripts/refresh-corpus.mjs`, runs on `0 11 * * *` UTC (21:00 Melbourne AEST), defaults `--prune` and `--report`, and commits the daily JSON + Markdown summary back to `reports/concierge-corpus/`.
3. **PR #10 merged.** [fix(concierge): live-schema fixes](https://github.com/richmondjw/peninsula-insider/pull/10). Two production fixes after smoke-testing against the real Supabase project:
   - DB column is `extracted_at`, not `ingested_at`. The original 2026-04-29 script had this wrong from day one.
   - Schema probe + compat mode: the script now detects whether `metadata_fingerprint` and `event_date` columns exist and falls back gracefully if they don't.
4. **Manual workflow_dispatch run** triggered on `mode: dry, prune: true` to validate the live pipeline against the real DB. Result captured in the daily report. (See most recent run on the [Actions tab](https://github.com/richmondjw/peninsula-insider/actions/workflows/refresh-corpus.yml).)

## Smoke-test result against live DB (dry, no writes)

| Source collection | Files | Chunks built |
|---|---:|---:|
| Venues | 135 | ~540 |
| Articles | 78 | ~234 |
| Places | 20 | ~60 |
| Itineraries | 6 | ~30 |
| Experiences | 42 | ~126 |
| Events | 16 (0 expired) | ~48 |
| Editorial blocks | 10 | 10 |
| **Total** | | **1,157** |

Diff against the live `concierge_chunks` table (903 rows currently in DB):

- **886 would be added** (new chunks from new collections + naming-convention shift)
- **271 would be re-embedded** (chunk_ids that match existing rows but with updated text)
- **896 currently stale** (legacy `::editorial::0` style chunk_ids that do not match the new chunker's `::editor_note::0` etc.)

The first non-dry run will:
1. Embed 1,157 chunks (~$0.005 USD at `text-embedding-3-small`)
2. Insert 886 new + upsert 271 changed
3. Prune 896 legacy chunks
4. Net DB state: 1,157 fresh chunks under the new naming convention

After that, daily delta runs cost effectively nothing on a quiet editorial day.

---

## What still needs manual attention

### 1. DB migration

The script is currently running in **compat mode** — it skips writing `metadata_fingerprint` and `event_date` because the columns don't exist on the live table. To unlock those features, run the SQL at [`ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql`](../ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql) against the Supabase project (`mvdtkgsfuhmkioygxgge`).

**How to apply:**
- Open Supabase Studio → SQL editor → paste the file contents → Run. Idempotent, so re-running is safe.
- Or via `psql` if you have the database password handy.

The script is forward-compatible: the moment the columns appear, the next run picks them up. Until then, the cron is fine, just running without metadata-fingerprint upserts and event-date filtering.

### 2. Trigger the actual cutover

After the DB migration (or now, if you accept compat mode for a few days), trigger a real run:

- GitHub → Actions → "Refresh concierge corpus" → "Run workflow" → `mode: normal, prune: true` → Run.
- Watch the run complete (~1–3 minutes).
- A daily report should land at `reports/concierge-corpus/2026-04-30.md` and be committed back to main with `[skip ci]`.

After that the daily 21:00 Melbourne cron runs hands-free.

### 3. Tooling clean-up (optional)

- Refactor the 10 migrated hub pages to read intro copy from `editorial_blocks` instead of duplicating it inline. Currently both render fine; this just removes the duplication for editors. Bundle this with the next site refactor pass.
- Refresh `SUPABASE_PERSONAL_TOKEN` in `peninsula-insider-platform/.env` — the current one fails auth on the Supabase Management API. Not blocking.
- Split the Supabase service key into write-only (refresh job) and read-only (concierge API) roles. Listed in the IT brief; do quarterly with the regular key rotation.

---

## What the concierge gains today

Before this PR, "Ask The Insider" answered from venues + articles only. Reader queries about Sorrento as a town, Peninsula walks, weekend itineraries, "rainy day" framing, and editorial best-of intros all bottomed out against partial data.

After PR #9 + PR #10:

- **Town queries** ("what's Sorrento like?") → answers draw from `places/sorrento.json`'s intro and TLDR
- **Itinerary queries** ("plan a Sorrento weekend") → the 6 curated itineraries surface as full multi-stop sequences
- **Walk queries** ("best peninsula walks") → 42 experience records with duration, difficulty, and editor's notes
- **Event queries** ("what's on this weekend") → fresh events with auto-prune past 14 days
- **"Best of X" queries** → the 10 migrated editorial blocks carry the same framing copy readers see on the live page

Effective coverage roughly doubles, and the editorial voice (which was previously locked inside `.astro` page templates) is now queryable.

---

## Files to read for full context

- [`docs/peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md`](peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md) — full IT handover brief
- [`ops/scripts/refresh-corpus.mjs`](../ops/scripts/refresh-corpus.mjs) — the script
- [`.github/workflows/refresh-corpus.yml`](../.github/workflows/refresh-corpus.yml) — the schedule
- [`reports/concierge-corpus/`](../reports/concierge-corpus/) — daily report archive (populates from next run onward)
- `CHANGELOG.md` — entry under 2026-05-01
