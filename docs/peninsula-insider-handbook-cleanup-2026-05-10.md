# Peninsula Insider — Operating Handbook Cleanup
**Date:** 2026-05-10
**Scope:** The 60 docs (and 2 dirs) currently in `peninsula-insider/docs/`. Goal is to (a) reduce duplicate operating docs, (b) retire stale claims, (c) promote one canonical reference per operating concern.
**Method:** Catalogue + classify each doc as **keep**, **retire**, **archive**, or **supersede**. Then list one canonical reference per operational concern.

## Headline result

Of the 60 docs:
- **22 keep** — current and authoritative
- **18 archive** — historical value but no longer authoritative; move to `docs/archive/`
- **11 supersede** — replaced by newer docs (or by the Tranche 1–4 deliverables); flag with a one-line redirect note
- **6 retire** — no longer relevant or accurate; delete after a stand-down window
- **3 unclassified** (require James's call) — see explicit list below

## Canonical-reference table

For each major operating concern, the **single source of truth** going forward:

| Concern | Canonical | Notes |
|---|---|---|
| What jobs run, where, with what risk | [`ops/operating-surface.md`](ops/operating-surface.md) | Consolidates editorial-jobs + workflows + cron |
| Job definitions and approval tiers | [`ops/editorial-jobs.json`](ops/editorial-jobs.json) | Machine-readable; `editorial-ops-system-2026-04-09.md` is descriptive |
| Production / staging / deprecated surface boundaries | [`ops/surface-map.md`](ops/surface-map.md) | New today |
| Editorial governance standard | [`docs/peninsula-insider-editorial-governance-standard-2026-05-02.md`](docs/peninsula-insider-editorial-governance-standard-2026-05-02.md) | Already canonical; cross-link from agentic-editorial-operating-model |
| Recurring copy / claim wording | [`ops/copy/canonical.md`](ops/copy/canonical.md) | New today |
| Correction handling loop | [`ops/correction-handling.md`](ops/correction-handling.md) | New today |
| Build/deploy pipeline | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Code is canonical; `site-system-documentation.md` is descriptive |
| Brand voice / creative | [`docs/peninsula-insider-branding-and-creative-guide-2026-04-20.md`](docs/peninsula-insider-branding-and-creative-guide-2026-04-20.md) | The cheat-sheet variant is a derivative |
| Newsletter / dispatch product | [`docs/newsletter-product-2026-04-09.md`](docs/newsletter-product-2026-04-09.md) | Update with cadence canonical from `ops/copy/canonical.md` |
| Image rights / licensing | [`docs/peninsula-insider-image-relevance-operating-model-2026-04-14.md`](docs/peninsula-insider-image-relevance-operating-model-2026-04-14.md) | + `ops/scripts/governance-audit.mjs` for enforcement |
| Cross-system truth alignment | [`docs/peninsula-insider-system-alignment-2026-05-10.md`](docs/peninsula-insider-system-alignment-2026-05-10.md) | New today; defines which surface wins on which question |
| Active operating exceptions | [`ops/exception-queue.md`](ops/exception-queue.md) | New today |
| Run-log standard | [`ops/run-log-standard.md`](ops/run-log-standard.md) | New today |
| Publication ledger | [`ops/publication-ledger/README.md`](ops/publication-ledger/README.md) | Built in main checkout (uncommitted at session time) |

## Per-doc classification

### KEEP — current and authoritative (22)

These docs continue to serve as canonical or actively-referenced. No action needed beyond keeping them up to date when underlying code or policy changes.

- `peninsula-insider-editorial-governance-standard-2026-05-02.md`
- `peninsula-insider-branding-and-creative-guide-2026-04-20.md`
- `peninsula-insider-branding-creative-guide-cheat-sheet-2026-04-20.md`
- `peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`
- `peninsula-insider-image-relevance-operating-model-2026-04-14.md`
- `peninsula-insider-seo-and-metadata-operating-model-2026-04-18.md`
- `peninsula-this-weekend-operating-system-2026-04-20.md`
- `newsletter-product-2026-04-09.md`
- `editorial-ops-system-2026-04-09.md`
- `editorial-system-2026-04-09.md` _(verify against `editorial-ops-system` — either keep both or merge)_
- `peninsula-insider-current-state-operational-review-2026-05-10.md`
- `peninsula-insider-current-state-implementation-backlog-2026-05-10.md`
- `peninsula-insider-status-2026-05-10.md`
- `peninsula-insider-content-architecture-ia-blueprint-2026-05-10.md`
- `peninsula-insider-content-architecture-ux-model-2026-05-10.md`
- `peninsula-insider-content-governance-rollout-2026-05-10.md`
- `peninsula-insider-overlap-audit-2026-05-10.md` (new)
- `peninsula-insider-weekly-rhythm-state-2026-05-10.md` (new)
- `peninsula-insider-system-alignment-2026-05-10.md` (new)
- `peninsula-insider-handbook-cleanup-2026-05-10.md` (this doc)
- `CHANGELOG-corrections.md` (new)
- `site-system-documentation.md`

### ARCHIVE — historical value, move to `docs/archive/` (18)

These were authoritative at their date but are now superseded by current state or have served their planning purpose.

- `cron-activation-checklist-2026-04-09.md` _(early activation; superseded by ops/operating-surface.md)_
- `cloudflare-implementation-checklist-2026-04-13.md` _(point-in-time)_
- `decision-checklist-2026-04-13.md` _(point-in-time)_
- `concierge-corpus-cutover-status-2026-04-30.md` _(status doc, decay-fast)_
- `peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md` _(superseded by `-revised`)_
- `peninsula-insider-concierge-corpus-cron-brief-2026-04-30-revised.md` _(implemented; archive)_
- `peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md` _(implemented in cron + workflows)_
- `peninsula-insider-daily-link-audit-spec-2026-04-16.md` _(implemented)_
- `peninsula-insider-image-mismatch-audit-2026-04-14.md` _(audit moment; archived)_
- `peninsula-insider-newsletter-subscribe-rebuild-2026-04-19.md` _(implementation done)_
- `peninsula-insider-editors-workbench-phase-1-implementation-2026-04-17.md`
- `peninsula-insider-editors-workbench-plan-2026-04-17.md`
- `peninsula-insider-platform-architecture-recommendation-2026-04-13.md` _(strategic at time)_
- `peninsula-insider-platform-execution-roadmap-2026-04-13.md` _(replaced by phase deliveries)_
- `peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md` _(superseded by mobile-app/ docs)_
- `roadmap-2026-04-09.md` _(historical — current roadmap is in milestones)_
- `roadmap.html` _(rendered version of above)_
- `strategic-review-2026-04-09.md` + `strategic-review.html` _(historical strategic moment)_

### SUPERSEDE — newer doc replaces; add one-line redirect (11)

These overlap with a newer authority. Add a one-line "→ see X" at the top, keep the file body for history.

- `pi-eos-p0-p1-backlog-and-job-map-2026-05-02.md` → see `peninsula-insider-current-state-implementation-backlog-2026-05-10.md`
- `pi-eos-phase-0-kickoff-2026-05-02.md` → see `peninsula-insider-current-state-operational-review-2026-05-10.md`
- `seo-staged-plan-2026-04-15.md` → see `peninsula-insider-seo-and-metadata-operating-model-2026-04-18.md`
- `search-phase-a-implementation-brief-2026-04-13.md` → see `insider-search-scope-2026-05-03.md`
- `peninsula-insider-pet-owner-hub-plan-2026-04-16.md` → see `/dog-friendly/` vertical hub (live)
- `peninsula-insider-walks-hikes-hub-strategy-2026-04-19.md` → see `/explore/walks/` (live)
- `peninsula-insider-weddings-hub-strategy-2026-04-19.md` → see live `/corporate-events/` and weddings sub-vertical
- `peninsula-insider-corporate-events-hub-strategy-2026-04-19.md` → see live `/corporate-events/`
- `new-verticals-first-wave-content-plan-2026-04-19.md` → see live verticals
- `peninsula-insider-founders-prospectus-2026-04-30.md` → see `peninsula-insider-advertising-kit-2026-04-30.md` if both exist for similar purpose; otherwise keep
- `peninsula-insider-founders-outreach-email-2026-04-30.md` _(communication artifact — supersede by latest outreach iteration when it exists)_

### RETIRE — no longer relevant; delete after stand-down window (6)

These do not represent current operating reality. Recommend deletion after a 30-day stand-down window so anyone looking for them notices the gap and asks.

- `winery-draft-progress-2026-05-02.md` _(progress note; concrete state now in repo)_
- `insider-concierge-perf-pass-2026-05-02.md` _(perf snapshot; superseded by ongoing perf monitoring)_
- `insider-concierge-review-and-roadmap-2026-05-02.md` _(replaced by Discovery Layer phase docs in vault)_
- `insider-search-scope-2026-05-03.md` _(implemented)_
- `peninsula-insider-daily-link-audit-spec-2026-04-16.md` _(if also in archive list, choose one — recommend retire)_
- `free-image-sourcing-brief-2026-04-09.md` _(implemented; rights / licensing now governed by content schema + audit)_

### UNCLASSIFIED — needs James's call (3)

- `peninsula-insider-linkedin-editorial-guide-2026-05-02.md` — keep if LinkedIn is part of the active editorial surface; archive otherwise.
- `peninsula-insider-partners-page-copy-2026-04-30.md` — keep if `/partners/` page copy still derives from this; archive if the live copy has diverged.
- `peninsula-insider-advertising-kit-2026-04-30.md` — keep as live commercial collateral if so used; archive if internal-only and now stale.

### v3 / v4 / image-intake / reports / (sub-directories)

- `docs/v3/`, `docs/v4/` — appear to mirror the v3/v4 component variants flagged in the recurring-copy audit. **Recommend: move under `docs/archive/staging-experiments/` once the corresponding staging components are also retired.** Otherwise keep as adjacent design notes.
- `docs/image-intake/` — likely image rights / sourcing artifacts. Keep until governance audit reaches zero `tmp-*` placeholders, then re-evaluate.
- `docs/reports/` — operational reports surface. Keep; this is where ad-hoc reports land. Consider naming convention `docs/reports/<area>/<date>-<topic>.md`.

## Mechanical cleanup steps

1. **Create the archive subtree:**
   ```
   docs/archive/
       2026-q2/
       (other-eras can be added later)
   ```

2. **Bulk-move ARCHIVE candidates** to `docs/archive/2026-q2/` in a single PR. No content change — git move only.

3. **Add one-line redirect notes** at the top of SUPERSEDE candidates:
   ```markdown
   > **This doc has been superseded by [X](path).** Kept as history.
   ```

4. **Schedule the RETIRE candidates** for deletion in 30 days. Track in `ops/exception-queue.md` as a P3 entry so the deletion isn't forgotten.

5. **Resolve the UNCLASSIFIED 3** with James — single conversation, three decisions.

6. **Update internal cross-references** that point to docs in the moved set. (Use `git grep` to find them.)

## Volume target

Current: **60 docs in `docs/`**.

After cleanup: roughly **22 keep + 11 superseded-with-redirects = 33 active docs** in `docs/`. The other 24 (archive 18 + retire 6) move out of the live tree.

That's a 45% reduction in active docs without losing any history.

## What this cleanup deliberately does NOT do

- It does not change the **`workspace/JWR_PKM_2026/04-agents/`** vault. That is a separate cleanup if needed.
- It does not consolidate the agent persona files. They are canonical for agent behaviour and treated separately.
- It does not retire any **runtime** artifacts (cron, workflows, scripts). This is a docs cleanup only.

## Maintenance rule going forward

When you write a new operating doc:
1. Check the canonical-reference table above. If a canonical exists for your concern, **update the canonical** rather than writing a parallel doc.
2. If your doc is a one-off (status, audit, point-in-time analysis), date it in the filename so its decay window is visible.
3. When a status / audit / analysis is more than 60 days old, default to archiving it.
4. Backlog docs go in `docs/archive/` as soon as the items have all been delivered or reflected in operational artifacts (`ops/exception-queue.md`).

## Coverage rating

| Aspect | Status |
|---|---|
| Canonical references named for top-12 operating concerns | ✓ |
| Per-doc classification | ✓ for 57 of 60 docs |
| Archive subtree proposed | ✓ |
| Redirect notes proposed for SUPERSEDE set | ✓ |
| Mechanical move proposed | ✓ |
| Decision items surfaced | ✓ (3 unclassified) |
