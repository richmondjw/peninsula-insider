# Peninsula Insider — Run-log and Reporting Standard
**Last reviewed:** 2026-05-10
**Authority:** Standard reporting shape for all recurring PI jobs. Every job listed in `ops/operating-surface.md` should produce a run-log entry conforming to this shape.

## Why this exists

Right now, recurring PI jobs are observable mostly by reading individual reports under `ops/reports/`. There is no single place to inspect "did everything that should have run today actually run?". This standard fixes that.

It is **complementary** to the publication ledger:

| Surface | Records |
|---|---|
| **Publication ledger** (`ops/publication-ledger/`) | publish events — what changed live, what approval allowed it |
| **Run-log** (this standard) | every job execution — whether it published or not, success or failure, what it did |

Both reference each other. Neither replaces the other.

## Run-log entry shape

Every job run produces a JSON object. Required fields:

```json
{
  "schemaVersion": 1,
  "runId": "uuid",
  "jobName": "pi-daily-accuracy-scan",
  "jobSource": "openclaw-cron | github-actions | manual",
  "startedAt": "2026-05-10T20:20:00Z",
  "endedAt": "2026-05-10T20:20:42Z",
  "durationMs": 42000,
  "status": "success | failure | partial | skipped",
  "mutation": "scan-only | report-only | mutating-content | mutating-live | mutating-config",
  "surfaces": ["index.html", "whats-on/index.html"],
  "counts": {
    "scanned": 0,
    "changed": 0,
    "errors": 0,
    "warnings": 0
  },
  "alertSent": false,
  "alertChannel": null,
  "artifacts": [
    "reports/peninsula-accuracy-scan-2026-05-10.md"
  ],
  "ledgerEntries": [],
  "errorSummary": null
}
```

### Field semantics

- `schemaVersion`: integer. Increment on incompatible schema changes.
- `runId`: UUID. Should match the Mission Control `cron_job_runs.id` if applicable, so the run-log and Mission Control row are linkable.
- `jobName`: matches a `name` in `ops/editorial-jobs.json` or `~/.openclaw/cron/jobs.json`.
- `jobSource`: where it triggered from. Must be one of the enum values.
- `startedAt`, `endedAt`: ISO 8601, UTC. `endedAt` may be null while running.
- `durationMs`: integer. Derived from start/end. Optional but strongly preferred.
- `status`:
  - `success` — completed and produced expected outputs
  - `failure` — did not complete OR completed but expected outputs are missing
  - `partial` — completed but with one or more `errors` in `counts`
  - `skipped` — intentionally did not run (e.g. precondition failed, locked surface)
- `mutation`: matches `ops/operating-surface.md` mutation classification.
- `surfaces`: list of paths or surface IDs touched. May be empty for `scan-only`.
- `counts`: at minimum the four canonical counts above. Jobs may add more domain-specific counts.
- `alertSent`: boolean. True if a notification was emitted to a human-visible channel.
- `alertChannel`: which channel (`telegram`, `email`, `mission-control`, `github-issue`). Null if `alertSent: false`.
- `artifacts`: paths (repo-relative) to reports / outputs the run produced.
- `ledgerEntries`: IDs of `ops/publication-ledger/` entries written by this run. Empty if the run is non-publishing.
- `errorSummary`: short text describing the failure when `status != "success"`. Null otherwise.

## Storage

Run-log entries live at:
- `ops/run-log/entries/YYYY-MM.jsonl` — one JSON object per line, append-only, one file per month
- `ops/run-log/index.csv` — derived flat index for spreadsheet inspection
- `ops/run-log/run-log.schema.json` — JSON-schema validation file

This mirrors the publication-ledger layout deliberately. Tooling that already exists for the ledger (validate / append) can be parameterised to handle both.

## When a run-log entry is required

**Required for:**
- Every `mutating-live` or `mutating-content` job execution
- Every `mutating-config` job execution
- Every Tier-1 publish-path job

**Strongly recommended for:**
- Every `report-only` and `scan-only` job execution
  *(makes it possible to ask "did the daily accuracy scan actually run yesterday?" without spelunking)*

**Optional for:**
- One-shot manual scripts that don't represent a recurring operation

## Alert path standard

A job whose `status` is not `success` should set `alertSent: true` and emit to one channel. The channel selection rule:

| Severity / surface | Channel |
|---|---|
| Tier-1 mutating-live failure | Telegram (immediate) |
| Tier-2 mutation failure | Email digest (next morning) |
| Report-only or scan-only failure | Mission Control task only |
| Repeated failures (≥3 same job in 7 days) | Telegram regardless of tier |

This matrix lives here because the operating-surface inventory identified silent alert paths as the highest-priority gap.

## Per-phase entries for composite jobs

The Sunday dispatch chain is one cron-level execution but seven editorial phases (research → shape → draft → review → publish → social → archive). The run-log should emit **one entry per phase** with a shared `parentRunId` field linking them:

```json
{
  "schemaVersion": 1,
  "runId": "...",
  "parentRunId": "<the umbrella run id>",
  "jobName": "pi-weekly-dispatch-review-and-tighten",
  ...
}
```

This makes per-phase failure visible — closing EXC-2026-05-10-006.

## Implementation roadmap

This file describes the *standard*. Implementation lands in stages:

### Stage A (this Tranche — done)
- Standard documented (this file)
- Schema location reserved (`ops/run-log/run-log.schema.json`)
- Storage layout defined

### Stage B (next, scope-bounded)
- `ops/scripts/run-log.py` (or `.mjs`) — append + validate, mirroring `ops/scripts/publication-ledger.py`
- `ops/run-log/run-log.schema.json` — JSON schema
- `ops/run-log/templates/entry-template.json` — starter payload
- Deploy.yml + 3 event-maintenance workflows wired to write entries (mirrors the publication-ledger wiring already in flight in main checkout)

### Stage C (later)
- Wire OpenClaw cron payloads to write entries
- Wire dispatch chain to emit per-phase entries with `parentRunId`
- Mission Control derived view: `recent_runs` + `failures_last_7d`

### Stage D (eventually)
- Alert dispatcher: reads run-log + applies the alert-path matrix
- Self-healing checks: e.g. if a Tier-1 job has 3 consecutive failures, page James

## Migration / coexistence

The publication ledger already exists (in main-checkout uncommitted work) and writes for publish events. Run-log entries should:
1. Reference the ledger entry IDs for any publish events emitted in the same run (`ledgerEntries: [...]`).
2. Not duplicate ledger content. The run-log says "this run wrote 3 ledger entries". The ledger says what those entries are.

This way the two surfaces stay decoupled.

## Operational rule

**No new mutating cron job should land without a run-log emitter.** The Tranche 1 status doc explicitly says "do not add more mutating automation until tranches 1+2 control hardening is done". This standard is the artifact that closes the loop.

## What this standard deliberately does not do

- It does not specify a UI. Run-log entries are JSONL; visualisation can come later.
- It does not require runtime ingestion (e.g. it does not say entries must land in Supabase). That's an option but not a requirement of the standard.
- It does not replace per-job report markdown files. Those continue to live under `ops/reports/` and are referenced in the `artifacts` field.
