# Peninsula Insider — Agentic Content Engine

Autonomous content production system for peninsulainsider.com.au.

## What this does

Three cron-triggered tempos run continuously:

| Tempo | Trigger | Output |
|---|---|---|
| **Daily** | 6:00 AM AEST (scheduled) | Insider Picks column + corpus refresh |
| **Weekly** | **manual dispatch only** (see note) | Signal brief + slate + Weekend Picks + SEO piece + newsletter |
| **Monthly** | 1st of month 6:00 AM AEST (scheduled) | Deep research + long-form editorial batch + town hub refresh |

> **Note (2026-08-27):** the weekly tempo is **not** currently on a schedule.
> `weekly-content.yml` declares only `workflow_dispatch`; it has no `schedule:`
> block. This README previously stated a Monday 07:00 AEST cadence. Daily and
> monthly are scheduled as documented. If the weekly cadence is meant to be
> automatic, the schedule needs restoring in the workflow.

## Quick start (local / OpenClaw)

```bash
# Install deps
pip install -r engine/requirements.txt

# Set environment
export PI_REPO_ROOT=/path/to/peninsula-insider
export ANTHROPIC_API_KEY=sk-...
export SUPABASE_URL=https://...
export SUPABASE_SERVICE_ROLE_KEY=...

# Run daily cycle
python engine/orchestrator.py --tempo daily

# Run weekly cycle
python engine/orchestrator.py --tempo weekly

# Dry run (no git push)
python engine/orchestrator.py --tempo daily --dry-run
```

## Architecture

See `docs/agentic-content-engine-architecture-2026-06-29.md`

## Agent specs

All agent definitions live in `.claude/agents/`:
- `remy-orchestrator.md` — orchestrator, loop engineer
- `commissioning-agent.md` — slate and brief decisions
- `signal-agent.md` — SEO and competitive intelligence
- `research-agent.md` — web research and event harvest
- `dispatch-desk.md` — Insider Picks + newsletter writer
- `style-agent.md` — voice QA gate
- `verify-agent.md` — factual accuracy gate

## GitHub Actions

Three workflows in `.github/workflows/`:
- `daily-content.yml` — fires at 20:00 UTC (6:00 AM AEST)
- `weekly-content.yml` — **`workflow_dispatch` only, no schedule** (see note above)
- `monthly-content.yml` — fires 1st of month 20:00 UTC

Required secrets:
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAT_CONTENT_PUSH` (GitHub PAT with repo write access)
- `FIRECRAWL_API_KEY` (optional — for competitive scans)
- `SEMRUSH_API_KEY` (optional — for SEO signals)

## Loop engineering

The orchestrator never stalls. On any step failure:
1. Log the stall
2. Simplify brief (reduce scope 40%)
3. Retry once
4. Fall back to last successful template
5. Always commit something — even degraded content

Every run produces:
- `.claude/newsroom/runs/YYYY-MM-DD-[tempo].json` — machine log
- `.claude/newsroom/runs/YYYY-MM-DD-[tempo].md` — human summary

## Feedback loop — the Strategy Brain

`strategy_engine.py` is the closed loop. Each daily run it fuses five research
points — GSC search performance, sitemap content inventory, competitive scan,
seasonal intent calendar, and its own prior snapshot — into a single **scored,
ranked commissioning queue** (`ops/strategy/content-strategy.json`), and diffs
today vs yesterday so strategy improvement is observable, not assumed.

The orchestrator runs it as step 0 of the daily tempo (performance shapes
commissioning *before* anything is written) and exposes
`load_commissioning_queue(limit)` for desks. Full design, scoring model and
roadmap: [`ops/strategy/README.md`](../ops/strategy/README.md).

```bash
python engine/strategy_engine.py            # regenerate strategy from current inputs
python engine/strategy_engine.py --dry-run  # print the plan, write nothing
```

## Agent discoverability

`ops/scripts/generate-llms-txt.mjs` generates root `llms.txt` / `llms-full.txt`
(the llmstxt.org convention) from `sitemap.xml`, so AI agents get a curated,
always-current map of the site. Run `node ops/scripts/generate-llms-txt.mjs`
(or `--check` for a CI drift gate). Wired into the daily post-publish step.

Currently contextualised for new/early-stage site: competitive intelligence and
striking-distance/CTR wins weighted over historical traffic.
