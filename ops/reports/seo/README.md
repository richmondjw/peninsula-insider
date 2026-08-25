# Peninsula Insider — SEO operations

The doc set we read every morning. Owned by Claude (with James's review), updated daily.

## The daily cycle

Each weekday morning:
1. Run `cd ops/scripts/seo && npm run pull` — fetches GSC data, appends to `daily-log.md`, saves raw to `ops/data/seo/YYYY-MM-DD.json`.
2. Run `npm run daily-loop` — writes an immutable scorecard to `ops/data/seo/daily/YYYY-MM-DD.{json,md}` and a recommendation queue to `ops/reports/seo/action-queue/YYYY-MM-DD.md`.
3. Read the new entry in `daily-log.md` and the queue. Diagnose movement vs prior days, note what to investigate.
4. Cross-reference with `experiments.md` — if we shipped a change recently, has it landed? Did it move the metric we predicted?
5. Pick today's actions from `backlog.md`. Limit to 2–3 substantive changes per day so we can attribute results.
6. Ship changes via PR. Log the experiment in `experiments.md` with hypothesis + how we'll measure.
7. Update `backlog.md`.

## Files

| File | Purpose |
|---|---|
| `daily-log.md` | Append-only journal. Each entry = one daily pull + interpretation + actions. **The doc we read every morning.** |
| `action-queue/YYYY-MM-DD.md` | Shadow-mode recommendations with evidence, hypothesis and evaluation date. It never authorises production edits. |
| `../../data/seo/daily/YYYY-MM-DD.{json,md}` | Immutable machine and human scorecards generated from the existing GSC snapshot. |
| `baseline.md` | Frozen snapshot of where we started (May 2026). Reference point for "is it actually working?". Never edited. |
| `url-inventory.md` | Every URL on the site, categorised as keep / improve / noindex / 410. Updated as we work the 283-page indexation backlog. |
| `experiments.md` | Every change we ship is logged here with hypothesis, expected impact, and how we'll measure. Wins and losses both kept. |
| `backlog.md` | Prioritised list of next actions. Pulled from each morning. |

## Conventions

- Every entry dated as `YYYY-MM-DD`.
- Every shipped change references the PR.
- Every experiment has a measurable hypothesis. "Improve X" is not a hypothesis; "increase CTR on /eat/best-restaurants from 1.2% to >2.5% within 21 days by rewriting the title and meta" is.
- No em-dashes (project rule — use commas, periods, colons, parentheses).
- The daily loop is recommendation-only during shadow mode. Content/link edits, outreach and spend require their normal PI gates.
