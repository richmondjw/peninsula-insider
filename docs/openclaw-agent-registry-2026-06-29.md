---
type: openclaw-agent-registry
domain: peninsula-insider
version: 1.0
created: 2026-06-29
---

# Peninsula Insider — OpenClaw Agent Registry

This file defines all named agents for the Peninsula Insider content engine.
In OpenClaw, each agent is loaded by name with its spec file as system context.

## How to deploy in OpenClaw

1. Copy `engine/` directory to your OpenClaw workspace
2. Create the agents in OC using these specs (or reference spec files directly)
3. Set environment variables:
   - `PI_REPO_ROOT` → path to peninsula-insider repo checkout
   - `ANTHROPIC_API_KEY` → for content generation
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → for corpus refresh
   - `FIRECRAWL_API_KEY` → for competitive scans
   - `SEMRUSH_API_KEY` → for SEO signals (optional — pplx fallback available)

4. Run cron entries (see below)
5. First run: `python orchestrator.py --tempo daily` (manual trigger)

---

## Cron Schedule (OpenClaw format)

```
# Daily — 6:00 AM AEST (20:00 UTC)
0 20 * * *    cd $OC_WORKSPACE/peninsula-insider && python engine/orchestrator.py --tempo daily

# Weekly — Monday 7:00 AM AEST (Sunday 21:00 UTC)
0 21 * * 0    cd $OC_WORKSPACE/peninsula-insider && python engine/orchestrator.py --tempo weekly

# Monthly — 1st of month, 6:00 AM AEST
0 20 1 * *    cd $OC_WORKSPACE/peninsula-insider && python engine/orchestrator.py --tempo monthly
```

---

## Token Budget Guidelines

| Agent | Max tokens/run | Notes |
|---|---|---|
| REMY (orchestrator) | 2,000 | Reads summaries only |
| RESEARCH | 4,000 | Reads raw search results |
| DISPATCH DESK | 3,000 | Writes 700-word article |
| COMMISSIONING | 2,000 | Reads signal brief, writes slate |
| SIGNAL | 3,000 | Reads data, writes brief |
| STYLE GATE | 1,000 | Diff-only review |
| VERIFY GATE | 1,000 | Checklist only |

Total daily budget: ~12,000 tokens
Weekly additional: ~15,000 tokens  
Monthly additional: ~30,000 tokens

Monthly total: ~12,000 × 30 + 15,000 × 4 + 30,000 = ~450,000 tokens

---

## Agent Warm Context Files

Each agent loads these files on activation (not the full vault):

### REMY
- `.claude/newsroom/loop-state/current.json`
- `.claude/signals/signal-brief-latest.md` (weekly+)
- `.claude/newsroom/slates/lookahead.md`

### DISPATCH DESK
- `agents/dispatch-desk.md` (spec)
- `.claude/research/daily-YYYY-MM-DD.json` (today's research)
- Last 2 Insider Picks articles (for voice calibration)

### RESEARCH AGENT
- `agents/research-agent.md` (spec)
- `.claude/signals/competitive-latest.json`

### SIGNAL AGENT
- `agents/signal-agent.md` (spec)
- Previous week's signal brief

---

## Loop Completion Guarantee

The orchestrator uses a completion-forcing loop:

```python
MAX_RETRIES = 2
FALLBACK_STRATEGY = "template"  # use last successful article as template

for step in pipeline:
    attempt = 0
    while attempt < MAX_RETRIES:
        result = run_step(step)
        if result.success:
            break
        attempt += 1
        simplify_brief(step)  # reduce scope on retry
    if not result.success:
        use_fallback(step, FALLBACK_STRATEGY)
    
    # ALWAYS log, even on fallback
    log_completion(step, result)
```

The loop NEVER returns without shipping something and logging the run.
Even on full failure, a minimal piece is committed and the run is logged.

---

## Feedback Loop Architecture

```
PERFORMANCE DATA
    │
    ├── Semrush (weekly) → keyword positions, traffic
    ├── GA4 (weekly, if connected) → page views, bounce rate  
    └── Search Console (weekly, if connected) → query impressions, CTR

    ↓

SIGNAL AGENT processes → signal brief

    ↓

COMMISSIONING AGENT reads → commission decisions

    ↓

DESK AGENTS write → content targeted at gaps

    ↓

DEPLOY → live on peninsulainsider.com.au

    ↓

NEXT WEEK → performance data updated → loop continues
```

The feedback loop is contextual:
- New site: rely on competitive intelligence + keyword research (not historical traffic)
- Growing site: weight towards rising queries and declining pages
- Mature site: optimize for conversion and depth, not just traffic

The signal agent is aware of the site's maturity stage and adjusts its recommendations.
Currently: early-stage — competitive and keyword signals weighted over traffic history.
