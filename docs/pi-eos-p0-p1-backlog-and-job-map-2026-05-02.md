# PI-EOS — P0/P1 Backlog and Current Job Map

**Date:** 2026-05-02  
**Purpose:** Translate the PI-EOS brief into an implementation-ready stabilisation backlog grounded in the current Peninsula Insider repo.

---

## Executive recommendation

Build this in two steps:

1. **P0 stabilise the current automation surface** so failures, risky mutation, and QA blind spots become visible.
2. **P1 add shared state** so content, changes, approvals, and job runs stop living as scattered reports and implicit repo history.

Do **not** add more mutating editorial automation until P0 and the core P1 tables exist.

---

## What is currently real

### Repo-level automation confirmed

#### GitHub workflows
1. **`deploy.yml`**
   - Builds Astro site from `next/`
   - Syncs `next/dist` into repo root
   - Auto-commits deploy output back to `main`
   - **Mutation status:** mutates live site output

2. **`refresh-corpus.yml`**
   - Runs `ops/scripts/refresh-corpus.mjs`
   - Upserts concierge corpus into Supabase
   - Commits daily reports back to repo
   - **Mutation status:** mutates Supabase `concierge_chunks`; commits reports

3. **`insider-usage-report.yml`**
   - Reads concierge usage from Supabase
   - Writes report artifacts and optional Telegram digest
   - **Mutation status:** report/log mutation only

### Planned / documented editorial jobs confirmed
Source: `ops/editorial-jobs.json`

These jobs exist as the intended PI operating schedule, but they are not yet the same thing as a governed control plane:

#### Daily
- `pi-daily-accuracy-scan`
- `pi-daily-accuracy-autofix`
- `pi-daily-link-audit`
- `pi-daily-events-scan`
- `pi-daily-venue-healthcheck`
- `pi-daily-seasonality-refresh`
- `pi-daily-build-draft`
- `pi-daily-qa-and-publish`

#### Weekly / monthly
- `pi-weekly-editorial-commissioning`
- `pi-weekly-evergreen-expansion`
- `pi-weekly-seo-authority-audit`
- `pi-weekly-seo-opportunity-scan`
- `pi-weekly-metadata-schema-audit`
- `pi-weekly-internal-linking-audit`
- `pi-monthly-seo-refresh-priority-run`
- full Sunday dispatch chain:
  - research scan
  - shape and shortlist
  - draft
  - review and tighten
  - publish
  - social production
  - archive rollover

### Existing governance / ops docs confirmed
- editorial governance standard
- daily accuracy scan spec
- daily link audit spec
- editors workbench planning
- site system documentation
- agentic editorial operating model

That means the **policy layer exists**. The missing layer is **shared operational state + enforcement**.

---

## Current gaps against PI-EOS target state

### Missing shared state
Not yet visible in repo as canonical system objects:
- `content_items`
- `content_versions`
- `job_runs`
- `proposed_changes`
- `entities`
- `sources`
- `approval_actions`
- `rollback_records`

### Missing enforcement layer
Not yet visible as centrally enforced:
- risk classifier in front of every meaningful mutation
- approval queue shared across jobs
- publish gate requiring approved status
- circuit breaker on QA/dependency failure
- manual lock / cooldown enforcement
- unified notification adapter

### Current architectural risk
The system has:
- strong docs
- real content
- some real workflows
- multiple report generators

But it still appears to behave mostly like:
**job -> report -> optional mutation**

PI-EOS needs to become:
**shared state -> detected change -> classified proposal -> approval decision -> logged mutation -> QA -> audit trail**

---

## P0 backlog — stabilisation and observability

### PI-EOS-001 — Cron / workflow inventory
**Goal:** create the single inventory of actual running jobs, documented jobs, and dormant jobs.

**Tasks**
- enumerate GitHub Actions workflows
- enumerate any OpenClaw cron jobs still active outside GitHub Actions
- enumerate scripts in `ops/scripts/` with scheduling intent
- mark each job as scan-only, report-only, or mutating
- record dependencies, outputs, alerts, and owners

**Acceptance**
- every job has owner, schedule, inputs, outputs, dependency list, mutation status
- undocumented runners are flagged explicitly

**Priority:** P0

---

### PI-EOS-002 — Dependency preflight checker
**Goal:** fail loudly before unsafe execution.

**Tasks**
- build a shared preflight module for:
  - Supabase vars/keys
  - OpenAI key
  - Telegram token/chat/topic settings
  - filesystem expectations
  - required source directories
- wire it into every mutating or alerting job first

**Acceptance**
- missing dependency halts job
- failure is typed and logged
- no silent fallback to partial mutation

**Priority:** P0

---

### PI-EOS-003 — Central notification adapter
**Goal:** stop notification logic being embedded job-by-job.

**Tasks**
- create one notifier for Telegram + future channels
- standardise payload shape:
  - severity
  - job name
  - summary
  - action required
  - artifact links
- log notification success/failure

**Acceptance**
- jobs emit one standard alert payload
- notification failures become visible
- schema changes stop requiring per-job rewrites

**Priority:** P0

---

### PI-EOS-004 — Job run logging
**Goal:** every meaningful job writes a structured run record.

**First schema**
- `job_run_id`
- `job_name`
- `job_group`
- `started_at`
- `ended_at`
- `status`
- `duration_seconds`
- `items_scanned`
- `items_created`
- `items_updated`
- `items_failed`
- `error_type`
- `error_message`
- `model_or_harness`
- `prompt_version`
- `input_hash`
- `output_hash`
- `alert_sent`
- `notes`

**Acceptance**
- all live workflows write start/end/status
- failure classification exists
- critical failures alert

**Priority:** P0

---

### PI-EOS-005 — Post-publish QA restoration
**Goal:** publishing cannot outrun verification.

**Tasks**
- identify actual current QA path for deploys and publish jobs
- add explicit post-publish checks for:
  - route resolves
  - canonical present
  - title/meta present
  - images load
  - CSS/assets present
  - core page integrity
- fail high on QA outage

**Acceptance**
- QA cannot silently disappear
- failed QA produces review item and alert
- critical QA outage can pause publish jobs

**Priority:** P0

---

## P1 backlog — system memory and change control

### PI-EOS-006 — Content ledger schema
**Goal:** canonical record for every editorial asset.

**Recommendation:** Supabase/Postgres as system of record.

**Minimum tables**
- `content_items`
- `content_versions`
- `job_runs`
- `proposed_changes`

**Acceptance**
- every current content asset gets stable `content_id`
- content type and canonical URL tracked
- freshness + review metadata available

**Priority:** P1

---

### PI-EOS-007 — CMS/content import
**Goal:** import Astro content into the ledger.

**Source surfaces**
- `next/src/content/articles`
- `next/src/content/events`
- `next/src/content/venues`
- `next/src/content/places`
- `next/src/content/itineraries`
- `next/src/content/experiences`
- `next/src/content/editorial_blocks`

**Acceptance**
- published assets represented in ledger
- duplicates/missing canonicals flagged

**Priority:** P1

---

### PI-EOS-008 — Content version snapshots
**Goal:** every meaningful mutation becomes reversible.

**Acceptance**
- before/after records created for automated changes
- rollback-ready snapshot exists
- manual changes can be detected later

**Priority:** P1

---

### PI-EOS-009 — Proposed change queue
**Goal:** no more meaningful mutation without a proposal object.

**Acceptance**
- change type, field, diff, evidence, confidence, status stored
- amber/red changes held from publish

**Priority:** P1

---

### PI-EOS-010 — Risk classifier
**Goal:** implement green/amber/red handling.

**First green class candidates**
- expire past events from known end dates
- fix broken internal redirects
- refresh structured schema fields from already-verified data

**Acceptance**
- safe changes can auto-apply only with logs and snapshots
- amber/red require approval

**Priority:** P1

---

### PI-EOS-011 — Manual locks and cooldowns
**Goal:** protect editor changes from automation.

**Acceptance**
- whole-page lock
- field-level lock
- 48–72h post-human-edit cooldown
- suggest-only mode

**Priority:** P1

---

## Current jobs mapped to mutation risk

### Green/low-risk candidates later
- `pi-daily-accuracy-autofix` (only after proposed-changes + classifier)
- expired event handling
- internal redirect fixes
- schema refresh from trusted existing data

### Amber until approval system exists
- venue health-driven copy updates
- metadata rewrites
- image swaps
- internal link insertion
- homepage ranking changes

### Red / always gated
- new guide/article generation
- partner offers
- major dispatch reframing
- pruning/redirect/canonical changes
- sponsored/commercially sensitive edits

---

## Recommended implementation order

### Week 1
- PI-EOS-001 inventory
- PI-EOS-002 preflight
- PI-EOS-003 notifier
- PI-EOS-004 job_runs
- PI-EOS-005 QA restoration

### Week 2
- PI-EOS-006 content ledger
- PI-EOS-007 content import
- PI-EOS-008 version snapshots

### Week 3
- PI-EOS-009 proposed changes
- PI-EOS-010 risk classifier
- PI-EOS-011 locks/cooldowns

Only after this should publishing and social loops be refactored into the new control plane.

---

## Hard recommendation

The next technical milestone should be:

**inventory -> structured logs -> preflight -> notifier -> content ledger -> proposed changes**

Not:

**more scanning -> more drafting -> more auto-publish logic**

That sequencing is the difference between an editorial operating system and a pile of clever cron jobs.
