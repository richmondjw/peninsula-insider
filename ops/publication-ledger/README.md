# Peninsula Insider — Publication Ledger

This directory is the canonical publish record for Peninsula Insider.

Every live mutation that reaches production should leave a durable record here, whether it was:
- system-approved
- bulk-approved
- lightly reviewed
- founder-approved

## Purpose

The ledger exists to answer, quickly and unambiguously:
- what changed
- when it changed
- where it changed
- which job or agent changed it
- which approval rule allowed it
- whether post-publish verification passed
- how to trace or roll it back later

## Directory layout

```text
ops/publication-ledger/
├── README.md
├── publication-ledger.schema.json
├── index.csv
├── templates/
│   └── entry-template.json
└── entries/
    └── YYYY-MM.jsonl
```

## Files

### `index.csv`
Spreadsheet-friendly cumulative ledger.
One row per publish event.

### `entries/YYYY-MM.jsonl`
Append-only monthly event log.
One JSON object per line.
This is the canonical machine-readable record.

### `publication-ledger.schema.json`
Schema for required fields and allowed values.

### `templates/entry-template.json`
Starter payload for scripts and operators.

## Single invariant

**No live publish-capable workflow should mutate production without either writing a ledger entry or explicitly failing closed.**

If the publish happened and no ledger record exists, the workflow is incomplete.

## Required fields

- `timestamp`
- `job_name`
- `agent_or_owner`
- `content_type`
- `canonical_url_or_path`
- `change_summary`
- `risk_tier`
- `approval_mode`
- `publish_result`
- `verification_result`

Optional but strongly preferred:
- `approved_by`
- `rollback_reference`
- `content_id`
- `run_id`
- `notes`

## Command-line usage

Append a record from a JSON payload:

```bash
python3 ops/scripts/publication-ledger.py append \
  --entry-file ops/publication-ledger/templates/entry-template.json \
  --dry-run
```

Validate a record file:

```bash
python3 ops/scripts/publication-ledger.py validate \
  --entry-file path/to/entry.json
```

## Approval mapping

- **Tier 1 / low risk** → autonomous or system-approved publish is allowed, but logging is still mandatory
- **Tier 2 / medium risk** → review-gated publish, logging mandatory
- **Tier 3 / high risk** → founder-led approval before publish, logging mandatory

## Notes

- `entries/` is append-only.
- `index.csv` is the fast human-readable surface.
- This repo implementation is the local ledger surface.
- A future Supabase-backed content ledger can ingest the same records rather than replacing the discipline.
