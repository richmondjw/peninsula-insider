# Peninsula Insider — Run-log

Append-only execution record for every recurring PI job. See `ops/run-log-standard.md` for the standard, schema, and operational rules.

## Layout

```
ops/run-log/
├── README.md
├── run-log.schema.json
├── templates/
│   └── entry-template.json
└── entries/
    └── YYYY-MM.jsonl    (created lazily by the appender, not committed empty)
```

## Append flow (when implemented)

```bash
# Validate then append (Stage B — implementation pending)
node ops/scripts/run-log.mjs append --entry-file <entry.json>

# Validate only
node ops/scripts/run-log.mjs validate --entry-file <entry.json>
```

`ops/scripts/run-log.mjs` is the Stage B deliverable. The schema and standard are committed first so emitters can be written against a stable contract.

## Relationship to publication-ledger

| Question | Surface |
|---|---|
| Did the cron actually run? | run-log |
| Did the cron run produce a publish event? | run-log + ledger reference |
| What changed on live, with what approval? | publication-ledger |
| What approval allowed the publish? | publication-ledger |

The two surfaces deliberately do not duplicate. A run that publishes will have one run-log entry referencing one or more ledger entries.
