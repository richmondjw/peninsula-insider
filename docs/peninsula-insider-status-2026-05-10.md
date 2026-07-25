# Peninsula Insider — Status Update
**Date:** 2026-05-10
**Author:** Remy
**For:** James, Emma

> **Correction notice (2026-07-25):** this status update overstated what was
> running. The three event-maintenance workflows it describes as live did not
> exist. See the correction under "Recently completed" below. The rest of the
> document is left as written, as the record of what was believed on
> 2026-05-10.

## TL;DR
Approval model and publication ledger are live and wired into the deploy workflow plus three event-maintenance crons. Five strategic docs landed today (uncommitted). Next move: pause new mutating automation; run the P0 control-hardening tranche before anything else.

*(2026-07-25: "plus three event-maintenance crons" was inaccurate. Those crons were wired for the first time on 2026-07-25 via `.github/workflows/content-freshness.yml`.)*

## Recently completed
- **Tiered approval model** — implemented in `ops/editorial-jobs.json` and core PI docs. Low-risk operational changes auto-approve / system-approve, medium-risk gets light review, high-risk editorial requires founder approval.
- **Canonical publication ledger** — `ops/publication-ledger/` with `ops/scripts/publication-ledger.py` for validate / dry-run append flows. Template validates; append works.
- **Ledger writes wired into runtime** — `deploy.yml` writes a site-deploy ledger entry before commit/push. Three event-maintenance workflows (`events-archive-expired`, `events-recompute-occurrence`, `events-rederive-lenses`) write low-risk system-approved entries when they mutate event files. Diff verified. (YAML lint deferred — PyYAML not in this workspace runtime.)
  - **CORRECTION, 2026-07-25:** the second sentence above was never true. The three event-maintenance workflows did not exist; `.github/workflows/` contained no such files on 2026-05-10 and contained none on 2026-07-25. The three scripts (`next/scripts/recompute-occurrence.py`, `archive-expired-events.py`, `rederive-lenses.py`) were written, stdlib-only and working, but nothing invoked them, so no event maintenance ran between 2026-05-10 and 2026-07-25 and no ledger entries were written by them. "Diff verified" referred to a local script run, not to a workflow. The `deploy.yml` claim is also stale: the deploy workflow in the repository is `build-and-deploy.yml`.
  - **Now wired:** `.github/workflows/content-freshness.yml` (added 2026-07-25) runs the three scripts daily at 19:00 UTC in dependency order, plus a new fourth script, `next/scripts/archive-expired-quick-notes.py`, which retires quick notes past their `expiresAt`. It commits and pushes its own diff. It does **not** write publication-ledger entries yet; that remains open. Status is `partial` in `ops/operating-surface.md` until a scheduled run is observed.
- **Strategic docs landed today (2026-05-10, uncommitted in `peninsula-insider/docs/`):**
  - `peninsula-insider-content-architecture-ia-blueprint-2026-05-10.md`
  - `peninsula-insider-content-architecture-ux-model-2026-05-10.md`
  - `peninsula-insider-content-governance-rollout-2026-05-10.md`
  - `peninsula-insider-current-state-operational-review-2026-05-10.md`
  - `peninsula-insider-current-state-implementation-backlog-2026-05-10.md`

## Diagnosis
Editorial product is strong. The bottleneck is operational legibility — PI control sits across GitHub Actions, OpenClaw cron, repo docs, and Mission Control with no single source of truth. Adding more mutating automation now compounds risk faster than it adds value.

## Recommended next sequence

### Tranche 1 — P0, do immediately
1. **Canonical live job inventory** — one file listing every PI job with: name, owner, actual schedule, source-of-execution (GitHub / OpenClaw / manual), inputs, outputs, alert path, mutation status (`scan-only`, `report-only`, `mutating`), current-live status (`live`, `planned`, `dormant`, `partial`).
2. **Post-publish verification gate** — external route resolves, canonical present, title/meta present, stylesheet/assets present, core image renders, target copy visible. Nothing is "live" until external verification passes.
3. **Published-content governance field audit** — `lastVerified`, image `credit`, image `license`, placeholder/temporary states, commercial/disclosure markers. Output is the first exception list across live business-facing content.
4. **Live vs staging surface map** — production / staging / deprecated / internal-preview, explicitly named.

### Tranche 2 — governance enforcement
5. Governance lint pass in content workflow.
6. Central recurring copy source review (newsletter cadence, dispatch timing, recurring CTAs, evergreen disclaimers).
7. Correction and changelog handling pass — operating loop behind the now-live correction CTA.
8. Deploy-path dependency and preflight checks.

### Tranche 3 — drift reduction
9. Overlap audit: Journal / evergreen / What's On / quick-note.
10. Weekly editorial rhythm visibility check.
11. Mission Control / repo / runtime alignment pass.

### Tranche 4 — consolidation
12. Exception queue for governance and QA issues.
13. Run-log and reporting standard for PI jobs.
14. Operating handbook cleanup.

## Decisions blocking the governance rollout
1. First URL set for audit.
2. Homepage restructuring priority.
3. Migration path: repo-first, CMS-first, or doc-first.
4. Named weekly owner for What's On.

## What not to do yet
- More mutating cron behaviour.
- Broader auto-publish logic.
- Future-state architecture redesign.
- Major nav or product rebuilds before control cleanup.
- Cosmetic governance language without enforcement changes.

## Proposed first move (awaiting sign-off)
1. Commit the five strategic docs that landed today.
2. Start Tranche 1 task 1 — synthesise `ops/editorial-jobs.json` + `.github/workflows/` + the OpenClaw cron registry into `ops/operating-surface.md`. That single artifact then unblocks tasks 2 and 4.

## Bottom line
The current-state priority is not "make PI bigger". It is: make the operating surface legible, make governance enforceable, make publish truth verifiable, reduce duplication and drift. That's the shortest path from a strong editorial product to a reliable editorial operating system.
