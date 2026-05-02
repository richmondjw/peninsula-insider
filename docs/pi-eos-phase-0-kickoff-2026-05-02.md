# PI-EOS Phase 0 Kickoff — 2026-05-02

## What already exists
- Editorial governance baseline: `docs/peninsula-insider-editorial-governance-standard-2026-05-02.md`
- Editorial operating model / approval concepts: `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`
- Accuracy scan and link audit specs with approval buckets: `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`, `docs/peninsula-insider-daily-link-audit-spec-2026-04-16.md`
- Editors workbench planning: `docs/peninsula-insider-editors-workbench-plan-2026-04-17.md`
- Content source layer in Astro collections: `next/src/content/*`, `next/src/content.config.ts`
- Live build/publish surface in Astro repo: `next/`

## Gaps confirmed in current repo
1. No visible shared content ledger with lifecycle state.
2. No visible entity registry or source registry.
3. No visible proposed-change queue with risk classification + approvals.
4. No clear structured job-run persistence for cron/automation outcomes.
5. QA and approval logic mostly exist as documents/specs, not a central enforced control plane.
6. Current repo contains site/content/build concerns, but not yet a durable editorial orchestration layer.

## Recommended first build milestone
**Phase 0 → Phase 1 bridge:**
1. Inventory every current cron/job/mutating script.
2. Add structured `job_runs` logging and dependency preflight checks.
3. Centralise notifications/alerts.
4. Stand up the first persistent tables:
   - `content_items`
   - `content_versions`
   - `job_runs`
   - `proposed_changes`
5. Run in observation mode before enabling any new mutation path.

## Proposed implementation order
### P0 Stabilise
- Cron inventory
- Dependency inventory
- Notification adapter
- Post-publish QA restoration
- Structured job logging

### P1 System memory
- `content_items`
- `content_versions`
- CMS/content import
- lifecycle status + freshness fields

### P2 Control plane
- `proposed_changes`
- risk classifier
- approval workflow
- rollback records

### P3 Safe publishing
- pre-publish QA gates
- post-publish QA gates
- circuit breaker
- manual lock / cooldown enforcement

## Architecture call
Use **Supabase/Postgres** as the canonical PI-EOS state store.
- Keep Astro/content files as source artefacts and render inputs.
- Do not try to make cron or flat files the system of record.
- Treat every automation as a service operating against shared state.

## Non-negotiable rule
No automated content mutation without:
- recorded state
- source evidence
- risk classification
- version snapshot
- rollback path
- logged job run
