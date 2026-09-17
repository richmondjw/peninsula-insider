# Peninsula Insider SEO automation

SiteOne 2.5.1 (MIT) and Lighthouse CI 0.15.1 (Apache-2.0), with a small deterministic runner and Remy adapter. No model calls, paid SEO service, external report hosting, or new Google credentials are needed for these checks. Google Search Console remains the source for search outcomes through Remy's existing connector.

## Execution

Linux x64, Node 22+, Python 3, Chrome/Chromium, and Git. The GitHub Ubuntu runner provides Chrome; locally set `CHROME_PATH` to an installed browser. The installer verifies the pinned release archive against its GitHub SHA-256 digest. npm dependencies are locked separately from Astro.

```sh
cd ops/seo-automation
npm ci --no-audit --no-fund
npm run setup
npm test
npm run audit -- --target=live --profile=daily
# After the normal next/ build:
npm run audit -- --target=local --profile=ci
# Full internal-link discovery, with a 2,000 URL ceiling:
npm run audit -- --target=live --profile=weekly
```

Daily/CI SiteOne checks cover the seven explicit priority URLs in `policy.json`. These are first-party owned URLs; SiteOne's URL-list mode bypasses robots filtering for those explicit requests. Weekly discovery follows same-site links and respects robots.txt. Assets are excluded from the SiteOne crawl; Lighthouse loads page assets separately. Neither run is proof of complete Google indexation. The runner fails on HTTP errors, missing priority URLs, malformed/empty evidence, reaching the crawl ceiling, collection errors or release changes during live measurement. Warnings and technical debt remain in the full SiteOne report; not every vendor finding blocks delivery.

Lighthouse samples home, `/eat/`, and `/eat/best-restaurants/`. CI collects three runs per page; scheduled/live audits collect one to limit overhead. SEO and accessibility floors are initially 90. Performance below 50, LCP above four seconds, and CLS above 0.1 are warnings retained in the report, not hidden passes. Adjust thresholds through reviewed source changes using observed baselines; do not weaken a failing gate to ship unrelated work.

The site build already checks canonical/indexability, links, content and event correctness. These checks remain authoritative and run before the added audit gate. The new gate runs before `gh-pages` publication, so a direct main push also exercises it. A separate `SEO Audit` workflow checks PRs, runs daily at 21:35 UTC (07:35 AEST / 08:35 AEDT), and substitutes a full crawl on Sunday Melbourne time. Manual dispatch runs the selected live scope. The existing OpenClaw weekly SEO digest consumes these reports alongside Search Console; its existing delivery destination and schedule are retained. No duplicate OpenClaw cron is installed.

`.runs/<timestamp-target-profile>/` retains SiteOne JSON/HTML, Lighthouse JSON/HTML and assertions, execution logs, source/deployment SHAs and a machine-readable `summary.json`. GitHub retains artifacts for 90 days, including failed runs. `status: failed` is diagnostic evidence, never a baseline. The summary identifies sample scope. A single-worker lock prevents overlap locally; GitHub concurrency queues remote jobs. An abandoned local lock must be inspected against its PID before removal.

## Remy / OpenClaw

Use the existing authenticated `gh` CLI in the gateway. No gateway restart or token copying is needed. Install the repository's `remy.py` as the capability entry point and retain its source commit in the operator record.

```sh
python3 remy.py status
python3 remy.py run --profile=daily
python3 remy.py report RUN_ID
python3 remy.py compare BEFORE_RUN_ID AFTER_RUN_ID
```

The adapter fixes repository/workflow/main ref, validates report shape and keeps retrieved artifacts privately in `~/.cache/pi-seo` (override `PI_SEO_CACHE`). A submission receipt is not completion. `report` returns provider state, complete evidence path and SHA-256. `compare` rejects failed runs and incompatible coverage, tool versions, target or profile. Use native Git/GitHub tools to prepare a narrow patch and PR; the checks execute automatically.

## Improvement loop

1. Read the latest successful audit and current GSC evidence. Reconcile old pending experiments against actual merged commits and deployment evidence; never infer deployment from a Markdown status.
2. Prioritise verified failures and restaurant pages with relevant impressions. Initially limit changes to three per week across five to ten pages. Do not fabricate venue facts or bulk-publish generic pages.
3. Record baseline, hypothesis, page cohort and GSC window in the existing `ops/reports/seo/experiments.md`, then make a source branch and PR. Keep content, canonical/noindex, redirect or deletion decisions within the explicitly approved scope.
4. Pass the existing build and new checks, publish through the normal workflow, then verify `/deployment.json` and a fresh live audit. Roll back technical regressions through a revert; do not overwrite unrelated changes.
5. Record observed Google recrawl and assess outcomes after 28-56 days. Keep control/cohort context and mark sparse results inconclusive. Lab scores do not establish rankings, conversions, or causal lift.

## Rollback and maintenance

Revert the integration commit to remove the workflow and deploy steps, retaining audit artifacts. Disable the SEO Audit workflow if scheduled execution alone needs pausing. Do not delete existing SEO scripts or credentials. Update SiteOne version+archive digest and the npm lockfile only in a reviewed PR; rerun tests and both local/live commissioning. Tools have no auto-update behavior.

Sources: https://github.com/janreges/siteone-crawler/releases/tag/v2.5.1 and https://github.com/GoogleChrome/lighthouse-ci .
