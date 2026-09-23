# Peninsula Insider SEO/GEO continual improvement programme

## Contract

The objective is better, more trustworthy discovery of Peninsula Insider's existing local guidance. The programme runs as a measured cycle: observe, prioritise, make a bounded change, verify it live, and review the result after a complete search window. A completed audit, a merged PR, a search impression and an AI citation are different outcomes.

Remy owns daily operational health and the decision log. PI editorial owns factual research and proposed new content through the existing work-item approval flow. James owns any expansion of autonomous release scope, spending, credentials, external commitments or policy changes. The recurring engine may make only the extractive, reversible source edits in `policy.json` under the release contract in `README.md`. It cannot promote research briefs to publication.

## Cadence and evidence

| When | Action | Acceptance evidence |
|---|---|---|
| Daily 05:30 Melbourne | Existing `pi-seo-daily-pull` cron runs the staged gateway executor, with expanded Sunday coverage. | Matching `latest-run.json`, run `summary.json`, terminal `step-latest.json` and `latest-report.txt`; `programme-health.py` exits 0. |
| On every source patch | Open PR, pass existing site/engine CI, merge exact tested head, verify deployment provenance and live HTML. | Immutable release receipt and `release_status=verified`. A proposed or merged patch alone is pending. |
| Monday | Review weekly SEO digest, failed runs, highest-value verified technical findings, research queue and any releases awaiting measurement. | One concise reviewed report in the existing PI SEO topic; decisions and links retained with the work. |
| After 28 complete post-deployment days plus GSC finalisation lag | Compare each released URL with its fixed pre-release window. | Ledger result `improved`, `regressed`, `no_change` or `inconclusive`, with dates and source rows. Descriptive association is not causation. |
| Monthly | Review programme reliability, outcome quality, cost and false positives; change policy only through a separate reviewed release. | Dated decision and tests. Three measured, eligible outcomes are required before the engine adjusts an action weight. |

The daily completion target is 08:30 Melbourne. Alert on a failed terminal step, missing delivery, or a last accepted run older than 36 hours. `programme-health.py` is the artifact assertion; scheduler `ok` alone is insufficient because an agent may report a degraded result successfully. A release-only continuation may finish after the original turn. Do not start a second cycle while its checkpoint or release is active.

## Operator checks

Run inside the gateway container as `node` with `HOME=/home/node`:

```sh
python3 /home/node/.openclaw/workspace/pi-geo-runner/ops/geo-engine/scripts/programme-health.py
openclaw cron runs --id ce4f637c-574a-44fc-8149-b5a1e69cf43c --limit 8 --json
```

Read `ops/geo-engine/.runs/state/step-latest.json` and `pipeline.json` before any retry. `engine=ok` with `release_status=no_changes` is a valid complete cycle. `release_handed_off` is a continuation receipt, not a deployment receipt. A verified release requires its PR, merge SHA, deployment provenance and live assertions. Check native cron delivery status separately from engine status.

The runner owns its `next/node_modules` installation. Before each source or post-change build it checks the local dependency directory against `next/package-lock.json`; missing, shared-link or stale dependencies are replaced with `npm ci` in that isolated checkout. Build output and dependency directories are generated and must not be committed. The build uses the local Astro binary, so a missing package cannot trigger an implicit `npx` download.

If a step fails, keep its logs and checkpoint, diagnose the exact stage, and repair only that fault. The next ordinary cycle starts after a terminal failure; interrupted/nonterminal checkpoints require the documented recovery path and must never be blindly replayed. Do not bypass CI, change Jev confidence thresholds, or directly push to `main` to clear a queue. Restore a failed published change through the scoped revert PR path in `README.md`.

## Scorecard and interpretation

Track four separate lines in each weekly review:

1. **Reliability:** accepted daily cycles / scheduled cycles, age of last accepted cycle, Jev probe success, delivery receipts, and time to repair failures.
2. **Quality:** confirmed material findings, human rejection reasons, exact patches that pass safety/CI/live checks, and incidents or rollbacks. Raw finding counts and model-weighted scores are triage, not site health certification.
3. **Search:** property-level GSC clicks/impressions/CTR and page/query cohorts in separate, final equal-length windows; GA4 organic engagement with its own timezone. Label sparse data inconclusive and do not add privacy-filtered rows into property totals.
4. **AI visibility:** only actual answer-surface receipts with query, surface, date, answer and citation context. Until a repeatable authorised sampler produces them, citation share stays `not_yet_measurable`. The site's own question coverage is inferred, not observed visibility.

The current 2,000-call Jev budget is a ceiling, not a completion target. `budgetExhausted=true` means later decisions used labelled deterministic rules; it must be visible in the weekly review. New content and broad rewrites are researched through the editorial queue, not generated by this engine.

## Current baseline and next review

Commissioning on 21 September 2026 produced two live-verified title edits in PR #473. The 23 September cycle completed with a Jev probe and no new patch. Neither title change has a complete post-deployment search window or observed AI citation baseline. Review the first title intervention only after the full post-deployment 28-day GSC window becomes final, approximately late October; record the actual dates in the ledger rather than assuming a calendar deadline.
