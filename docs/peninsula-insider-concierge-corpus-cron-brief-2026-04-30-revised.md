# Peninsula Insider Concierge: Daily Corpus Refresh — Revised Operational Brief

**Prepared for:** IT Department / Platform Operations  
**Prepared by:** Remy  
**Date:** 30 April 2026  
**Status:** Revised draft — operational handover pending implementation check  
**Purpose:** Define the production cron job, reporting, ownership, and recovery model for the Peninsula Insider concierge corpus refresh.

---

## 1. Recommendation

Peninsula Insider should keep a **daily concierge corpus refresh** as a production job, but **IT should not accept operational handover until the runner is restored and verified**.

The architecture is sound:
- source content lives in the repo
- a refresh job should chunk, diff, embed, and upsert into Supabase
- the concierge API should read only from that refreshed corpus

But the current repository state does **not** yet support a clean handover:
- `.github/workflows/refresh-corpus.yml` exists
- the workflow references `scripts/refresh-corpus.mjs`
- that script is **not present in the current repository checkout**
- daily report persistence is **not implemented** in the workflow
- Mission Control logging is **not implemented** in the workflow
- alerting is **not implemented** in the workflow

**Call:** treat this as a valid operational design with an immediate implementation gap, not as a finished IT-owned service.

---

## 2. What this job does

The Peninsula Insider concierge (“Ask The Insider”) answers reader questions using a curated internal corpus rather than open-web search.

Reader flow:
1. reader asks a question on `/ask`
2. the concierge API retrieves relevant chunks from Supabase
3. the response is assembled from Peninsula Insider’s own source material

That means source freshness is critical. If editorial content changes and the corpus does not refresh, the concierge drifts.

---

## 3. Production intent

The daily corpus refresh job should:
1. read published venue and article source files
2. build deterministic retrievable chunks
3. compare fresh chunk hashes against the live database
4. embed only changed or new chunks
5. upsert those chunks into `concierge_chunks`
6. identify stale rows no longer represented in source
7. write a machine-readable and human-readable run report
8. emit a one-line operational digest
9. alert on failure or anomaly

---

## 4. Current implementation state

## What exists now
- GitHub Actions workflow: `.github/workflows/refresh-corpus.yml`
- Trigger model: `schedule`, `push`, `workflow_dispatch`
- Source content tree in `next/src/content/`
- Concierge front-end entry point at `next/src/pages/ask.astro`

## What is missing or unverified now
- `scripts/refresh-corpus.mjs` is missing from this repo checkout
- no report-writing step exists in the workflow
- no Mission Control writeback step exists in the workflow
- no explicit alerting step exists in the workflow
- no verified stale-row prune logic exists
- no verified metadata-only re-upsert logic exists

**Operational consequence:** the cron brief must not describe the service as fully institutionalised yet.

---

## 5. Core correctness risks

These are the real risks IT should care about.

### A. Missing runner
If the workflow points to a script that is not in the repo, the scheduled job is not operational.

### B. Metadata-only drift
If ranking or transparency metadata changes without chunk text changing, rows may stay stale unless the refresh compares metadata separately.

Examples:
- `vendor_relationship`
- `freshness_flag`
- any future structured ranking fields

### C. Deleted-source drift
If a source file is deleted but stale rows remain in `concierge_chunks`, the concierge can still surface removed venues or articles.

### D. Silent schedule drift
GitHub scheduled workflows are approximate, not hard real-time. The job should be described as targeting an evening Melbourne window, not executing at a guaranteed exact minute.

---

## 6. Scheduling recommendation

## Current workflow schedule
```yaml
- cron: '0 19 * * *'
```

The existing inline comment is inaccurate. `19:00 UTC` is:
- `05:00 AEST`
- `06:00 AEDT`

## Recommended production schedule
Use a fixed UTC evening-Melbourne slot:

```yaml
- cron: '0 11 * * *'
```

This means:
- `21:00 AEST`
- `22:00 AEDT`

## Important dependency note
This slot should only be used if the corpus refresh is **independent** of later nightly jobs.

If the refresh is intended to include outputs from other nightly automation, it must run **after** those jobs, not before them.

So IT should choose one of two models explicitly:

### Option A — Recommended
**Cron is a safety net only.**
- push triggers keep the corpus fresh through the day
- the evening cron simply guarantees at least one clean refresh per day
- the cron does **not** depend on later nightly jobs

### Option B
**Cron is downstream of other nightly jobs.**
- if nightly autofixes must land first, move the cron later than those jobs
- document the exact dependency chain in the workflow file

**Recommendation:** use **Option A** unless there is a proven upstream dependency.

---

## 7. Reporting model

The workflow should produce two artifacts per run:

### A. JSON summary
Path:
- `reports/concierge-corpus/YYYY-MM-DD.json`

Contents should include:
- run id
- trigger
- mode
- duration
- source counts
- database counts before/after
- added / updated / unchanged / stale / error counts
- changed chunk ids
- estimated embedding cost
- git sha
- embedding model and dimensions

### B. Markdown summary
Path:
- `reports/concierge-corpus/YYYY-MM-DD.md`

Contents should include:
- run timestamp
- trigger
- top-line result
- added list
- updated list
- stale list
- error list if any
- retry / rate-limit notes
- estimated cost

## Storage recommendation
Do **not** make repo commits the primary operational record unless there is a strong audit requirement.

Preferred order:
1. workflow artifacts
2. Mission Control log row
3. optional repo mirror if James wants a Git history

If repo commits are kept, use:
- a dedicated reports branch, or
- a non-recursive `[skip ci]` reporting commit flow

---

## 8. Alerting model

Alert when any of the following occur:
- non-zero workflow exit
- embedding retries exhausted
- Supabase auth failure
- Supabase upsert failure
- chunk count drops materially versus prior run
- stale count spikes beyond threshold
- no successful run within 26 hours

Minimum destinations:
- operator channel digest
- IT on-call alert path

---

## 9. Access and credentials

Separate writer and reader credentials.

### Writer credentials
Used by the corpus refresh job only.

### Reader credentials
Used by the concierge API only.

Use least privilege and separate rotation paths. Do not describe this too narrowly as a “write-only service role” unless the exact Supabase role design has been implemented and verified.

---

## 10. Minimum acceptance checklist before IT handover

IT should only accept ownership once all items below are true:

- [ ] `scripts/refresh-corpus.mjs` exists in the production repo
- [ ] local dry run succeeds
- [ ] GitHub Actions dry run succeeds
- [ ] scheduled workflow path verified
- [ ] report artifacts generated automatically
- [ ] Mission Control logging wired
- [ ] alerting wired
- [ ] stale-row policy documented
- [ ] metadata-only re-upsert policy documented
- [ ] runbook tested by someone other than the original author

---

## 11. Trial-run procedure

Run these in order:

1. local dry run
2. GitHub Actions manual `workflow_dispatch` dry run
3. normal delta run against production credentials
4. verify report output
5. verify database writes
6. smoke-test five known concierge queries

If the local dry run fails because the runner is missing, stop and fix the repository before operational handover.

---

## 12. Definition of done

This service is done when:
1. the runner exists in the repo
2. the workflow executes successfully on schedule
3. the corpus updates without manual intervention
4. each run emits report artifacts and operational logging
5. failures alert someone before the next editorial morning
6. deleted or metadata-changed content cannot drift silently for long

Until then, this is a valid design with an implementation gap — not a finished IT-owned production service.
