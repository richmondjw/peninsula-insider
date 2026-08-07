# Daily publication runbook

## Ownership

The daily writer owns creating `next/src/content/articles/insider-picks-YYYY-MM-DD.md`. The deploy workflow owns publishing that committed record to GitHub Pages. The `Publication Freshness` workflow is the independent verification owner: it must not treat either upstream workflow's green status as proof of a live refresh.

## Success evidence

A healthy daily cycle has all of the following:

1. `Daily Content Engine` creates a new dated source record, passes its style, factual and content-admission gates, and pushes a commit.
2. `Build and Deploy` succeeds for that commit.
3. `Publication Freshness` confirms the source record has today's Melbourne `publishedAt` and `lastVerified`, `status: published`, a substantive body, and a public page whose dated URL and HTML `<time>` match.

## Failure response

1. Open the linked `pi-alert` issue or failed workflow. The alerts are deduplicated, so recurrence is appended to the existing issue.
2. For a daily-writer failure, inspect its run artifact (`daily-run-log-*`) and restore a usable provider/key or repair the generator. Do not substitute yesterday's article or accept a no-op commit.
3. For a content-freshness failure at commit time, confirm `next` dependencies install before the pre-commit admission hook runs, then dispatch `Content Freshness` again.
4. For a public-page failure, inspect the matching `Build and Deploy` run, fix the failed build/deploy, and dispatch it. Re-run `Publication Freshness` only after the deployment is green.
5. Record the run URLs, commit SHA and the dated public URL in the incident/task before closing the alert.

## Local checks

```bash
python engine/test_publication_freshness.py
python engine/publication_freshness.py \
  --expected-date 2026-08-06 \
  --article next/src/content/articles/insider-picks-2026-08-06.md
```
