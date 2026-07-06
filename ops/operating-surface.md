# Peninsula Insider — Canonical Operating Surface
**Last reviewed:** 2026-05-10
**Owner:** PI operations (Remy)
**Authority:** This file is the single source of truth for what jobs run against PI, where they run, what they touch, and what state they are in. If an entry conflicts with another doc, this file wins until the entry is updated.

## How to read this file

- **Source-of-execution** — where the job is *triggered from*: `github-actions` (CI), `openclaw-cron` (containerised scheduler in `~/.openclaw/cron/jobs.json`), `manual` (no scheduler), or `composite` (multiple).
- **Mutation** — `scan-only` produces a report and writes nothing to live. `report-only` writes to `ops/reports/` but not to live surfaces. `mutating-content` writes to `next/src/content/`. `mutating-live` writes to live HTML or deploy. `mutating-config` modifies repo configuration (rare).
- **Status** — `live` is observably running. `partial` is registered but not all integrations are wired. `dormant` is registered but disabled. `planned` is documented but not registered.
- **Alert path** — where failures surface. `silent` means failures are not currently surfaced anywhere visible to operators.

## Tier-1 — Daily mutating publish path (highest risk)

| Job | Source | Schedule (UTC) | Mutation | Status | Alert path |
|---|---|---|---|---|---|
| `pi-daily-quick-note-research` | openclaw-cron | daily 19:45 | report-only | live | silent |
| `pi-daily-quick-note-draft` | openclaw-cron | daily 20:05 | mutating-content | live | silent |
| `pi-daily-quick-note-qa-publish` | openclaw-cron | daily 20:20 | mutating-live | live | silent |
| `pi-daily-build-draft` | openclaw-cron | daily 06:40 | mutating-content | live | silent |
| `pi-daily-qa-and-publish` | openclaw-cron | daily 07:00 | mutating-live | live | silent |
| `pi-daily-accuracy-scan` | openclaw-cron | daily 20:20 | report-only | live | silent |
| `pi-daily-accuracy-autofix` | openclaw-cron | daily 20:35 | mutating-live | live | silent |
| `pi-daily-image-relevance-scan` | openclaw-cron | daily 20:50 | report-only | live | silent |
| `pi-daily-image-relevance-autofix` | openclaw-cron | daily 21:05 | mutating-content | live | silent |
| `Build & deploy site` (`deploy.yml`) | github-actions | on push to `main` + manual | mutating-live | live | GitHub Actions UI |

**Daily publish-path note:** every job in this table can mutate either content files or live HTML in production. Five of them run autonomously without external review. The current alert path for nine of the ten is `silent` — operators only see failures by inspecting `ops/reports/` or live diff. **This is the highest-priority observability gap.**

## Tier-1b — Daily strategy + agent-index (feeds the publish path)

| Job | Source | Schedule (UTC) | Mutation | Status | Alert path |
|---|---|---|---|---|---|
| `pi-strategy-brain` (`engine/strategy_engine.py`) | orchestrator (daily step 0) | daily, pre-commission | mutating-content (`ops/strategy/`) | live | run-log |
| `pi-llms-index-live` (`ops/scripts/generate-llms-txt.mjs`) | github-actions (`build-and-deploy.yml`, post-build) | on deploy | mutating-live (`dist/llms.txt`, `dist/llms-full.txt`) | live | GitHub Actions UI |
| `pi-llms-index-artifact` (same script) | orchestrator (daily post-publish) | daily, post-publish | mutating-content (repo-root `llms.txt`) | live | run-log |

**Strategy-brain note:** the strategy brain runs *before* commissioning and fuses
GSC performance + sitemap inventory + competitive scan + seasonal calendar +
its own prior snapshot into `ops/strategy/content-strategy.json` (the ranked
commissioning queue the orchestrator reads). It diffs day-over-day, so strategy
improvement is observable. Deterministic and stdlib-only.

**Self-monitoring note (addresses the Tier-1 "silent alert paths" gap for the
strategy loop):** `strategy_engine.py --health` inspects the loop's own cadence
(days since last snapshot), input health (is GSC performance data flowing?), and
learning health, and **exits non-zero when the loop is stalled** — so a
monitoring cron can alert instead of failures being invisible. Every run also
writes `ops/strategy/health.json` and a 🟢/🟡/🔴 badge into the brief. This is
the first strategy-path job with a non-silent alert path.

**Agent-index note:** the *live* `/llms.txt` and `/llms-full.txt` are generated
in the deploy workflow from the freshly-built `next/dist/sitemap.xml`, so they
ship with the site and can never drift from what was published. The orchestrator
also regenerates the repo-root copies (artifact parity with root `sitemap.xml`).
`generate-llms-txt.mjs --check` gives CI a drift gate. See `ops/strategy/README.md`.

## Tier-2 — Daily verification and cleanup (no live mutation)

| Job | Source | Schedule (UTC) | Mutation | Status |
|---|---|---|---|---|
| `pi-daily-events-scan` | openclaw-cron | daily 05:30 | report-only | live |
| `pi-daily-venue-healthcheck` | openclaw-cron | daily 06:00 | report-only | live |
| `pi-daily-seasonality-refresh` | openclaw-cron | daily 06:20 | report-only | live |
| `pi-daily-link-audit` | openclaw-cron | daily 21:20 | report-only | live |
| `events-archive-expired` | github-actions | daily | mutating-content | live |
| `events-recompute-occurrence` | github-actions | daily | mutating-content | live |
| `events-rederive-lenses` | github-actions | daily | mutating-content | live |
| `events-editorial-research` | github-actions | scheduled | report-only | live |
| `events-weekly-rebuild` | github-actions | weekly | mutating-content | live |
| `insider-usage-report` | github-actions | daily | report-only | live |
| `refresh-corpus` | github-actions | scheduled | mutating-content | live |

## Tier-3 — Weekly editorial and SEO rhythm

| Job | Source | Schedule (UTC) | Mutation | Status |
|---|---|---|---|---|
| `pi-weekly-editorial-commissioning` | openclaw-cron | Wed 06:00 | report-only | live |
| `pi-weekly-evergreen-refresh` | openclaw-cron | Mon 05:00 | report-only | live |
| `pi-weekly-seo-authority-audit` | editorial-jobs.json | Tue 07:45 | report-only | partial — defined in `editorial-jobs.json`, no openclaw-cron entry; current execution unclear |
| `pi-weekly-seo-opportunity-scan` | editorial-jobs.json | Thu 07:45 | report-only | partial — same as above |
| `pi-weekly-metadata-schema-audit` | editorial-jobs.json | Fri 07:45 | report-only | partial — same as above |
| `pi-weekly-internal-linking-audit` | editorial-jobs.json | Sat 07:45 | report-only | partial — same as above |
| `Peninsula Insider — Weekly SEO Digest` | openclaw-cron | Mon 00:00 | report-only | live |
| `pi-weekly-design-review` | openclaw-cron | Sun 22:00 | report-only | live |
| `pi-weekly-insider-picks` | openclaw-cron | Thu 09:00 | report-only | live |
| `pi-monthly-content-audit` | openclaw-cron | day 1, 08:00 | report-only | live |
| `pi-monthly-seo-refresh-priority-run` | editorial-jobs.json | day 1, 08:00 | report-only | partial |

**Weekly editorial-rhythm note:** five SEO jobs are defined in `ops/editorial-jobs.json` but do not appear as registered cron entries. Either they are bundled inside the Weekly SEO Digest, or they are documented intent without execution. **This needs reconciliation — see [item 11 / system-alignment-2026-05-10.md].**

## Tier-4 — Sunday weekly dispatch chain (high-impact editorial)

| Job | Source | Schedule (UTC) | Mutation | Status |
|---|---|---|---|---|
| `pi-weekly-dispatch-research-scan` | editorial-jobs.json | Sun 08:30 | report-only | partial — composed inside `dispatch-publish` chain |
| `pi-weekly-dispatch-shape-and-shortlist` | editorial-jobs.json | Sun 09:15 | report-only | partial |
| `pi-weekly-dispatch-draft` | editorial-jobs.json | Sun 10:00 | mutating-content | partial |
| `pi-weekly-dispatch-review-and-tighten` | editorial-jobs.json | Sun 10:45 | report-only | partial |
| `pi-weekly-dispatch-publish` | editorial-jobs.json | Sun 11:30 | mutating-live | partial — operates inside `PI: Sunday Editor Letter` chain |
| `PI: Sunday Editor Letter` | openclaw-cron | Sun 08:00 | mutating-live | live — composite umbrella for the dispatch chain |
| `pi-weekly-dispatch-social-production` | editorial-jobs.json | post-publish | mutating-content (assets) | partial |
| `pi-weekly-dispatch-archive-rollover` | editorial-jobs.json | Sun 11:50 | mutating-live | partial |

**Dispatch-chain note:** the dispatch chain is documented as seven discrete jobs in `editorial-jobs.json` but executed as one composite Sunday cron. That is fine in principle, but the run-log standard (item 13) needs to expose each phase separately so it is observable. Right now, dispatch failures show up as one big "Sunday cron failed" with no granularity.

## Tier-5 — Newsroom rituals (Sloane / Editor's Council)

| Job | Source | Schedule (UTC) | Mutation | Status |
|---|---|---|---|---|
| `PI: Monday Commissioning` | openclaw-cron | Mon 23:00 | report-only | live |
| `PI: Wednesday Checkpoint` | openclaw-cron | Wed 00:00 | report-only | live |
| `PI: Friday Performance Council` | openclaw-cron | Fri 00:00 | report-only | live |
| `PI: Friday Retro` | openclaw-cron | Fri 01:00 | report-only | live |
| `PI: Friday Look-ahead` | openclaw-cron | Fri 02:00 | report-only | live |

These rituals write to `next/.claude/newsroom/` (slates, perf, retros, look-ahead). They do not touch live HTML.

## Tier-6 — Cross-system support (not strictly PI but operates on PI)

| Job | Source | Schedule (UTC) | Mutation | Status |
|---|---|---|---|---|
| `Memory Sync — Daily Journal to Mission Control` | openclaw-cron | hourly :15 | mutating-config (Supabase) | live |
| `Archivist — Morning Knowledge Intake Scan` | openclaw-cron | daily 07:00 | report-only | live |
| `Archivist — Midday Linking Pass` | openclaw-cron | daily 12:00 | mutating-content (vault) | live |
| `Archivist — Evening Distillation & Health Snapshot` | openclaw-cron | daily 21:00 | report-only | live |
| `Warden — Daily Backup Freshness Check` | openclaw-cron | daily 07:30 | report-only | live |
| `Runner — Stall Detection` | openclaw-cron | every 15 min | report-only | live |

## Cross-cutting observations

### What is actually running on PI right now
Counting only `live` rows above: roughly **27 jobs** are observably executing on PI on some recurring schedule. That is the operational footprint to design control around — not the 50+ jobs that documents *imply* exist.

### Where the gaps are
1. **Alert paths are mostly silent.** Almost every `mutating-*` job in Tier-1 has alert path `silent`. Failures are detectable by reading reports, not by being notified. **This is the single highest-impact fix in this backlog.**
2. **`editorial-jobs.json` has 26 jobs; openclaw-cron has 24 PI jobs; there is overlap but not 1:1.** Reconciliation in item 11 needs to produce a single registry that both files derive from, or a clear rule that `editorial-jobs.json` is descriptive and `openclaw-cron/jobs.json` is operational.
3. **Five SEO jobs are listed in `editorial-jobs.json` with no cron registration.** Either they are folded into the Weekly SEO Digest or they are aspirational. Document the answer in item 11.
4. **Dispatch chain visibility is too coarse.** Sunday's seven-phase chain reports as one job. Item 13's run-log standard should require per-phase entries.

### What this surface implies for governance
- 5 jobs in Tier-1 can mutate live HTML autonomously.
- Of those, only `Build & deploy site` has a visible alert path.
- Of those, the publication ledger requirement is now defined (in `editorial-jobs.json` `publicationLedger`) but not yet enforced in code for any of them.
- Closing this gap is the work of Tranche 4 item 13.

## Ownership

| Concern | Owner |
|---|---|
| `editorial-jobs.json` job definitions | PI editorial-ops (James) |
| `openclaw-cron/jobs.json` registration | OpenClaw infra (Remy) |
| `.github/workflows/` CI workflows | PI infra (James) |
| Live HTML deploy | `deploy.yml` workflow + GitHub Pages |
| `ops/publication-ledger/` | PI ops (Remy + James) |
| This file | PI ops (Remy) |

## Maintenance rule

This file must be updated:
- whenever a new cron entry is added or removed in `~/.openclaw/cron/jobs.json`
- whenever a new workflow lands in `.github/workflows/`
- whenever a job moves between `live`, `partial`, `dormant`, or `planned`
- whenever an alert path changes
- whenever a mutation classification changes

Update on the same commit as the underlying change. If this file falls behind reality, it loses its authority claim.
