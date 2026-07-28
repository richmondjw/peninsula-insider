# Peninsula Insider — Canonical Operating Surface
**Last reviewed:** 2026-05-10
**Last corrected:** 2026-07-25 (Tier-2 github-actions rows only - see the content-freshness note below. The rest of this file has not been re-verified since 2026-05-10.)
**Owner:** PI operations (Remy)
**Authority:** This file is the single source of truth for what jobs run against PI, where they run, what they touch, and what state they are in. If an entry conflicts with another doc, this file wins until the entry is updated.

## How to read this file

- **Source-of-execution** — where the job is *triggered from*: `github-actions` (CI), `openclaw-cron` (containerised scheduler in `~/.openclaw/cron/jobs.json`), `manual` (no scheduler), or `composite` (multiple).
- **Mutation** — `scan-only` produces a report and writes nothing to live. `report-only` writes to `ops/reports/` but not to live surfaces. `mutating-content` writes to `next/src/content/`. `mutating-live` writes to live HTML or deploy. `mutating-config` modifies repo configuration (rare).
- **Status** — `live` is observably running. `partial` is registered but not all integrations are wired. `dormant` is registered but disabled. `planned` is documented but not registered. `unverified` (added 2026-07-25) is claimed by an earlier revision of this file but with no artifact found to back the claim.
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
| `Content Freshness` (`content-freshness.yml`) | github-actions | daily 19:00 | mutating-content | partial - workflow added 2026-07-25, first scheduled run still pending |
| `events-editorial-research` | github-actions | scheduled | report-only | unverified - no matching file in `.github/workflows/` |
| `events-weekly-rebuild` | github-actions | weekly | mutating-content | unverified - no matching file in `.github/workflows/` |
| `insider-usage-report` | github-actions | daily | report-only | unverified - no matching file in `.github/workflows/` |
| `refresh-corpus` | github-actions | scheduled | mutating-content | unverified - no matching file in `.github/workflows/` |

**Content-freshness note (corrected 2026-07-25):** this row previously listed
three separate `live` workflows (`events-archive-expired`,
`events-recompute-occurrence`, `events-rederive-lenses`). No such workflow
files ever existed. The three scripts were written and tested but referenced by
nothing, so no event maintenance has actually been running. They are now wired
into a single daily workflow, `.github/workflows/content-freshness.yml`, which
runs them in dependency order (`recompute-occurrence.py`, then
`archive-expired-events.py` (it reads `nextOccurrence`), then
`rederive-lenses.py`), plus a fourth script,
`archive-expired-quick-notes.py`, which retires quick notes past their
`expiresAt`. The workflow commits and pushes its own diff; it does not write a
publication-ledger entry. Alert path is the GitHub Actions UI. Promote this row
to `live` once a scheduled run is observed.

**Tier-2 github-actions note (2026-07-25):** the four `unverified` rows above
were also listed as `live` github-actions jobs, but the repository contains
only five workflow files (`build-and-deploy.yml`, `daily-content.yml`,
`weekly-content.yml`, `monthly-content.yml`, `pi-data-refresh.yml`) plus the
new `content-freshness.yml`. Whatever these four jobs are, they are not running
as GitHub Actions. Reconciling them is part of item 11.

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

## Tier-0 — Content Factory (weekly campaign rhythm)

**Added 2026-07-28.** The campaign layer. Selects one Featured Plan a week, packages it as a
Content Campaign Packet, derives channel copy, and queues a staggered release ladder. Every
stage writes a `pi_run_log` row, so this tier has **no silent alert paths by construction**.

| Job | Source | Schedule (UTC) | Mutation | Status | Alert path |
|---|---|---|---|---|---|
| `content-factory / build` | github-actions | Sun 20:00 (Mon 06:00 AEST) | mutating-content (`ops/campaigns/`) | live | GH issue (thesis request) |
| `content-factory / derive` | github-actions | Wed 19:00 (Thu 05:00 AEST) | mutating-content | live | `pi_run_log` + GH Actions UI |
| `content-factory / health` | github-actions | daily 21:00 | scan-only | live | `engine/alert.py` deduped GH issue |
| `campaign-schedule --submit` | **manual only** | on demand | **mutating-live** | live | `pi_run_log` |

**Deliberate non-automation:** nothing in this tier submits to Buffer or Mailchimp. Live
distribution is a separate manual act, gated in code on a signed thesis and `ready` L3 assets.
Automating the build rhythm is safe; automating the send is autonomy that should be earned on
evidence, not assumed at install time. See the graduated approval ladder in
`docs/peninsula-insider-content-operating-system-2026-07-28.md`.

**Observability:** `node ops/scripts/factory-status.mjs` is the single view. Exit code 1 means
something is genuinely wrong (a stale job, a failed publication, a campaign past its SLA), so
the daily job alerts on it rather than a human remembering to look.

**Correction to a long-standing hazard note (verified 2026-07-28):** the "sync dist to repo
root wipes everything except an allowlist" trap no longer applies. `build-and-deploy.yml`
publishes only `next/dist` to `gh-pages`; the root-deploy model (`build-live.sh`) is retired.
New top-level directories such as `ops/campaigns/` are safe. Earlier docs warning otherwise
are describing a hazard that has been removed.

## Heartbeat findings — 2026-07-28

`node ops/scripts/job-heartbeat.mjs` checks the opposite way round from an alert: it knows
what artifact each job is supposed to leave and reports when the artifact is missing. A job
cannot hide from it by not running, which is the failure mode alerts never catch.

First run found four problems, none of which were visible anywhere before:

| Job | Listed status | Actual | Evidence |
|---|---|---|---|
| `pi-daily-link-audit` | live | **NEVER produced an artifact** | no `reports/peninsula-link-audit-*` exists |
| `pi-daily-venue-healthcheck` | live | **NEVER produced an artifact** | no `reports/peninsula-venue-health-*` exists |
| `pi-daily-events-scan` | live | **NEVER produced an artifact** | already flagged in `ops/editorial-jobs.json`, now confirmed |
| `pi-opportunity-detection` | live | ~~stale~~ **CORRECTED: runs fine** | see the correction below |

The link-audit and venue-healthcheck rows in Tier-2 above should be read as `unverified`
until they produce a dated report. This is the same class of error the 2026-07-25 correction
found for the three phantom event workflows: a row in this file is a claim, not evidence.

**Causal note:** `pi-opportunity-detection` being dead for 11 days is why `signal_lift` scores
0.00 for nearly every Plan in `score-plan-fitness.mjs`. A dead upstream job was silently
degrading downstream commissioning quality, and nothing surfaced it. That is the whole
argument for the heartbeat.

**Correction, same day.** The `pi-opportunity-detection` "stale" verdict above was a false
positive and the diagnosis of "dead job" was wrong. Run manually 2026-07-28: it executed
cleanly, formed 58 clusters, made 18 LLM calls, cost $0.023, and correctly created zero
opportunities because every cluster was irrelevant. **"No new rows" is not "did not run"** for
a table that only gains rows when something qualifies. The heartbeat now treats
`pi_opportunities` as a conditional-output table.

The real problem is upstream, in the source mix:

| Source | Tier | State | Reality |
|---|---|---|---|
| `venue: Doot Doot Doot` | T1 | `active` | **37 consecutive failures** and never demoted |
| `GDELT DOC 2.0` | T2 | `active` | 15 consecutive failures |
| `Eventbrite - Mornington` | T3 | degraded | one of only two real event feeds |
| `Humanitix - Mornington` | T3 | degraded | the other one |
| `ABC News - Victoria RSS` | T2 | active, healthy | flooding the pipe with statewide noise |

Both dedicated event feeds are degraded while a statewide news RSS works perfectly, so the
material reaching L3 is Albury council rate rises, Melbourne CBD attractions, and state
politics. That is why `signal_lift` scores 0.00 for nearly every Plan: not a dead job, a
starved one. Fixing Eventbrite and Humanitix, demoting Doot Doot Doot, and narrowing or
dropping the ABC Victoria feed would do more for commissioning quality than any change to the
scoring model.

The heartbeat now reports source health on failure streak rather than on the `state` label,
because a source can sit at `active` with 37 failures indefinitely.

**Three mutating jobs are unobservable by design** because they leave no dated artifact:
`pi-daily-quick-note-qa-publish` (mutates live), `pi-daily-image-relevance-autofix`
(mutates content), and `pi-maintenance-sweep`. Each should either emit a dated artifact or
be retired. A mutating job that cannot be proven to have run is a standing risk.

## Cross-cutting observations

### What is actually running on PI right now
Counting only `live` rows above: roughly **27 jobs** are observably executing on PI on some recurring schedule. That is the operational footprint to design control around, not the 50+ jobs that documents *imply* exist.

**Correction (2026-07-25):** that count was itself inflated. Seven Tier-2 rows were marked `live` as github-actions jobs with no workflow file behind them. Three of those (the event-maintenance trio) are now genuinely wired via `content-freshness.yml` but have not yet had a scheduled run; the other four remain `unverified`. Treat the live count as **20 confirmed plus 7 to re-verify** until item 11 reconciles the registries.

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
