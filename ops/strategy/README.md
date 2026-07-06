# Peninsula Insider — Content Strategy Brain

**North star:** become the number-1 destination — for people *and* AI agents —
for what's on, and where to stay, eat, drink and explore on the Mornington
Peninsula.

This directory holds the **evolving content strategy**: not a document someone
writes once, but machine-owned state that is regenerated every day from live
signals, and that measurably improves as the site's performance improves.

## The closed loop

Before this, the content engine *produced* on a fixed cadence but never *learned*
— nothing read performance data back into what got commissioned next. The
Strategy Brain (`engine/strategy_engine.py`) closes that loop:

```
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
  Research points ──► STRATEGY BRAIN ──► ranked commissioning ──► content ──► live site
  · GSC search perf     (score + rank      queue (this file)      engine        │
  · sitemap inventory    every opportunity)                                     │
  · competitive scan          ▲                                                 │
  · seasonal calendar         │                                                 │
  · yesterday's snapshot ◄─────┴───────────── performance data (GSC) ◄──────────┘
```

Each daily run the brain:

1. **Ingests multiple research points**
   - Google Search Console report (`ops/reports/gsc-search-analytics.md`) —
     clicks, impressions, positions, striking-distance queries, CTR misses
   - Content inventory from `sitemap.xml` — section coverage + page freshness
   - Competitive-scan JSON from the signal engine (`.claude/signals/`)
   - Seasonal intent calendar (season → peak-intent Peninsula themes)
   - Its own previous snapshot (memory)
2. **Scores every opportunity** with one interpretable model (see below) and
   ranks them into a single commissioning queue.
3. **Diffs today vs yesterday** so "the strategy improves each day" is an
   observable fact — clicks, impressions, average position and the top-5
   priorities are compared against the last snapshot.
4. **Writes** machine state the orchestrator consumes.

## Outputs

| File | Purpose |
|---|---|
| `content-strategy.json` | Machine state. `orchestrator.py` reads `commissioning_queue` to decide what to work on. |
| `content-strategy.md` | Human-readable strategy brief (where we stand, day-over-day, ranked queue). |
| `snapshots/YYYY-MM-DD.json` | Immutable daily snapshot — history and the basis for day-over-day diffs. |

## The scoring model

Opportunities fall into four kinds, each mapped to a concrete action:

| Kind | Trigger | Typical action | Effort |
|---|---|---|---|
| `ctr-fix` | Ranks page 1–2, high impressions, low CTR | Rewrite title + meta / direct answer | cheap |
| `striking-distance` | Query at avg position 4–20 with demand | Deepen the ranking page to reach page 1 | medium |
| `coverage-gap` | Competitor / seasonal theme not covered | Commission a definitive PI piece | higher value, slower |
| `freshness` | Important page stale >90 days | Verify + refresh + relink | medium |

Each opportunity's score is a weighted sum of interpretable contributions —
`impressions` (log-damped proven demand), `position_proximity` (closeness to
page 1), `ctr_deficit` (gap below the expected CTR for its position), `seasonal`
relevance, and structural nudges for coverage/freshness — multiplied by an
`effort` bonus so fast, high-certainty wins float to the top of the queue.

Weights live in one place (`WEIGHTS` / `EFFORT_BONUS` in `engine/strategy_engine.py`)
so the model can be tuned as the site matures. Early-stage tuning favours
striking-distance and CTR wins (convert the demand Google already gives us);
a mature site would lift coverage and freshness.

## Running it

```bash
python3 engine/strategy_engine.py            # regenerate strategy from current inputs
python3 engine/strategy_engine.py --dry-run  # print the plan, write nothing
python3 engine/strategy_engine.py --date 2026-07-06
```

It is wired into the daily tempo as step 0 of `run_daily` in
`engine/orchestrator.py`, and the orchestrator exposes
`load_commissioning_queue(limit)` for any desk that wants the ranked list.

Design guarantees: **standard library only** (runs wherever the orchestrator
runs), **degrades gracefully** (any missing input is skipped and noted, never
fatal), and **deterministic** (same inputs + date → same strategy, so it is
testable).

## Roadmap (toward number 1)

The loop is live but early. Ordered next increments:

1. **Fresh GSC on every run.** Today the brain reads the last committed GSC
   report. Wire `ops/scripts/gsc-search-analytics.py` to refresh it immediately
   before each strategy run so performance data is same-day.
2. **Real competitive scan.** Replace the signal engine's hardcoded gaps with a
   live Firecrawl/search-backed scan feeding `.claude/signals/competitive-*.json`.
3. **Close the write side.** Have the orchestrator *act* on the top queue items
   automatically (CTR rewrites are safe to automate first), not just log them.
4. **Outcome attribution.** Tag each commissioned piece with the opportunity it
   came from, then in the next snapshot measure whether that page's position/CTR
   actually moved — feeding a learning signal back into the weights.
5. **Agent-answer coverage.** Track which Peninsula questions AI assistants
   answer *from* Peninsula Insider vs competitors, and treat gaps as a new
   research point alongside GSC.
