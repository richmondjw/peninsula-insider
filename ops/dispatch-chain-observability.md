# Sunday dispatch chain — per-phase observability

**Last reviewed:** 2026-05-10
**Closes:** EXC-2026-05-10-006 — *Sunday dispatch chain has no per-phase observability*
**Related:** [ops/run-log-standard.md](./run-log-standard.md), [ops/scripts/dispatch-phase-runner.sh](./scripts/dispatch-phase-runner.sh)

## The problem

The Sunday dispatch chain is documented as **seven discrete phases** in `ops/editorial-jobs.json`:

1. `pi-weekly-dispatch-research-scan` (Sun 08:30 — report-only)
2. `pi-weekly-dispatch-shape-and-shortlist` (Sun 09:15 — report-only)
3. `pi-weekly-dispatch-draft` (Sun 10:00 — mutating-content)
4. `pi-weekly-dispatch-review-and-tighten` (Sun 10:45 — report-only)
5. `pi-weekly-dispatch-publish` (Sun 11:30 — mutating-live)
6. `pi-weekly-dispatch-social-production` (post-publish — mutating-content)
7. `pi-weekly-dispatch-archive-rollover` (Sun 11:50 — mutating-live)

But it executes as **one composite OpenClaw cron**: `PI: Sunday Editor Letter`. Failures collapse to "Sunday cron failed" with no per-phase signal. That's the EXC-006 finding.

## The fix

`ops/scripts/dispatch-phase-runner.sh` is a thin wrapper that:

1. Generates a fresh `runId` for the phase.
2. Reuses (or generates and propagates) a `parentRunId` so all 7 phases of a single Sunday share one parent.
3. Runs the wrapped phase command, captures exit code.
4. Writes a `run-log` entry conforming to `ops/run-log/run-log.schema.json` with the right `mutation`, `status`, alert routing, and `parentRunId`.

Each phase becomes individually observable via the run-log standard while the Sunday job remains a single cron entry from OpenClaw's perspective.

## How to wire it into the OpenClaw cron

The cron currently runs the dispatch end-to-end. Replace the chain command with one wrapped call per phase, all sharing a `PI_DISPATCH_PARENT_RUN_ID` exported by the orchestrator.

Example shape (executable from the repo root):

```bash
#!/usr/bin/env bash
set -uo pipefail

cd /path/to/peninsula-insider

# Generate one parent id for the whole Sunday chain
export PI_DISPATCH_PARENT_RUN_ID="$(node -e 'process.stdout.write(require(\"crypto\").randomUUID())')"
export PI_DISPATCH_SURFACES="journal/peninsula-this-weekend-*/index.html,index.html"
export PI_DISPATCH_ALERT_CHANNEL="mission-control"

# Phase 1 — research scan
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-research-scan report-only -- \
  npm run dispatch:research-scan

# Phase 2 — shape & shortlist
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-shape-and-shortlist report-only -- \
  npm run dispatch:shape-shortlist

# Phase 3 — draft
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-draft mutating-content -- \
  npm run dispatch:draft

# Phase 4 — review & tighten
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-review-and-tighten report-only -- \
  npm run dispatch:review-tighten

# Phase 5 — publish (founder-approved upstream of this point)
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-publish mutating-live -- \
  npm run dispatch:publish

# Phase 6 — social production (post-publish)
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-social-production mutating-content -- \
  npm run dispatch:social

# Phase 7 — archive rollover
ops/scripts/dispatch-phase-runner.sh \
  pi-weekly-dispatch-archive-rollover mutating-live -- \
  npm run dispatch:archive-rollover
```

Replace each `npm run dispatch:*` with the actual phase command in the OpenClaw cron payload. Phases that don't exist yet should still be wrapped — a "command not found" exit code becomes a clean per-phase `failure` entry rather than a silent no-op.

## What you can ask the run-log after this lands

- "Did the Sunday dispatch run today?" → look for any entry with `parentRunId = <today's parent>`.
- "Which phase failed?" → filter `entries/YYYY-MM.jsonl` by `parentRunId` + `status != success`.
- "How long did the draft phase take?" → read `durationMs` on the `pi-weekly-dispatch-draft` entry.
- "Did the publish step write a publication-ledger entry?" → check `ledgerEntries` on the publish-phase entry.

All of which are impossible today.

## Migration plan

1. Land this script + doc (this PR).
2. Update the OpenClaw cron payload to call the wrapper for each phase. **Do not** change phase commands themselves.
3. Observe two consecutive Sundays with the wrapper in place; confirm 7 entries land per Sunday with shared `parentRunId`.
4. Mark EXC-2026-05-10-006 resolved in `ops/exception-queue.md` once the second clean Sunday lands.

## Notes

- The wrapper is intentionally bash-only; no Node deps beyond `node` itself (used only for UUID generation, which Node 14.17+ ships natively).
- It exits with the wrapped command's exit code so existing chain-stops-on-first-failure semantics are preserved.
- It writes its own log lines to stderr so stdout from the wrapped command is not corrupted.
