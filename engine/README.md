# Peninsula Insider — Agentic Content Engine

Autonomous content production system for peninsulainsider.com.au.

## What this does

Three cron-triggered tempos run continuously:

| Tempo | Trigger | Output |
|---|---|---|
| **Daily** | 6:00 AM AEST | Insider Picks column + corpus refresh |
| **Weekly** | Monday 7:00 AM AEST | Signal brief + slate + Weekend Picks + SEO piece + newsletter |
| **Monthly** | 1st of month 6:00 AM AEST | Deep research + long-form editorial batch + town hub refresh |

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
- `weekly-content.yml` — fires Sunday 21:00 UTC (Monday 7:00 AM AEST)
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

## Feedback loop

Signal engine reads SEO and competitive data → feeds commissioning decisions → content targets gaps → performance data updates next cycle.

Currently contextualised for new/early-stage site: competitive intelligence weighted over historical traffic.
