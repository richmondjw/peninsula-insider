# Concierge corpus refresh reports

Daily reports written by `ops/scripts/refresh-corpus.mjs` and committed by
`.github/workflows/refresh-corpus.yml`.

## Files

- `YYYY-MM-DD.json` — machine-readable record of one refresh run
- `YYYY-MM-DD.md`   — human-readable summary of the same run

## What a healthy day looks like

- `delta.errors`: 0
- `delta.added` + `delta.updated`: typically single digits on a normal editorial day
- `delta.unchanged`: most of the corpus
- `delta.stale_remaining`: 0 (all expired events and stale rows pruned within grace)
- `embedding_cost_usd_estimate`: under $0.01 USD on most days

## What to investigate

- `delta.errors > 0` → check `errors` array, escalate per runbook in
  `docs/peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md`
- Sudden drop in `database.chunks_after` → may indicate a schema parse failure
  or accidental bulk delete
- `delta.added > 50` → likely a bulk content import; sanity-check before approving
- Per-collection counts shifting unexpectedly → review recent commits to
  `next/src/content/<collection>/`

## Retention

Reports accumulate by date and are not auto-pruned. Manual cleanup once a
quarter is fine; total disk footprint is tiny (KB per run).
