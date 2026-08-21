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
   - GSC search analytics (`ops/reports/gsc-search-analytics.md`) —
     clicks, impressions, positions, striking-distance queries, CTR misses
   - GSC coverage/indexation (`ops/reports/gsc-coverage-report.md`) —
     which URLs Google has (not) indexed; an unindexed page can't rank at all
   - Events calendar (`next/src/content/events/`) — upcoming events needing
     advance preview coverage; the timely "what's on" input (the mission's first clause)
   - Content inventory from `sitemap.xml` — section coverage + page freshness
   - Competitive-scan JSON from the signal engine (`.claude/signals/`)
   - Seasonal intent calendar (season → peak-intent Peninsula themes)
   - Its own previous snapshot (memory)
2. **Scores every opportunity** with one interpretable model (see below) and
   ranks them into a single commissioning queue.
3. **Diffs today vs yesterday** so "the strategy improves each day" is an
   observable fact — clicks, impressions, average position and the top-5
   priorities are compared against the last snapshot.
4. **Measures whether past fixes worked** (the learning loop, see below).
5. **Writes** machine state the orchestrator consumes.

## The learning loop (does the strategy actually work?)

Scoring what to do next is only half a strategy; the other half is knowing
whether the last thing worked. When an opportunity is acted on it's appended to
`actioned.jsonl` with the target page's metrics *at the time of action*:

```bash
python3 engine/strategy_engine.py --record /journal/dog-friendly-mornington-peninsula/ \
  --kind ctr-fix --query "dog friendly guide mornington peninsula" \
  --note "rewrote title + meta"
```

On every later run the brain looks up each actioned page's *current* metrics and
measures movement (Δposition, ΔCTR), producing a **hit-rate by fix type** in the
brief ("Did our fixes work?"). That is the signal that lets the model — and the
operators — learn which interventions move the needle on this specific site,
rather than assuming. As the hit-rate data accumulates, the `WEIGHTS` can be
tuned toward the fix types that demonstrably work.

## Outputs

| File | Purpose |
|---|---|
| `content-strategy.json` | Machine state. `orchestrator.py` reads `commissioning_queue` to decide what to work on. |
| `content-strategy.md` | Human-readable strategy brief (where we stand, day-over-day, ranked queue). |
| `snapshots/YYYY-MM-DD.json` | Immutable daily snapshot — history and the basis for day-over-day diffs. |
| `actioned.jsonl` | Append-only ledger of actioned opportunities + their baseline metrics (learning loop). |
| `model-weights.json` | The self-tuning per-fix-type multipliers, adapted from measured outcomes. |

## The scoring model

Opportunities fall into five kinds, each mapped to a concrete action:

| Kind | Trigger | Typical action | Effort |
|---|---|---|---|
| `indexation` | Page not indexed by Google | Internal links + sitemap + request indexing | mechanical, highest leverage |
| `event-coverage` | Major event 14–45 days out | Publish an indexable preview page now | timely, net-new page |
| `ctr-fix` | Ranks page 1–2, high impressions, low CTR | Rewrite title + meta / direct answer | cheap |
| `striking-distance` | Query at avg position 4–20 with demand | Deepen the ranking page to reach page 1 | medium |
| `coverage-gap` | Competitor / seasonal theme not covered | Commission a definitive PI piece | higher value, slower |
| `freshness` | Important page stale >90 days | Verify + refresh + relink | medium |

`indexation` carries the strongest structural weight (a page Google hasn't
indexed earns nothing, whatever its quality), with section-hub pages boosted
above deep pages since hubs gate crawl equity for everything beneath them. It is
ranked against proven-demand fixes rather than always first, so concrete wins on
pages already earning impressions aren't crowded out by a stale coverage report.

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

### Trustworthiness (self-test gate)

Because the loop runs unattended daily, `engine/test_strategy_engine.py` locks
the behaviour it depends on — table parsing (incl. the summary-row trap),
position-aware CTR classification, scoring monotonicity, learning-loop movement
detection, day-over-day diffing, and graceful degradation:

```bash
python3 engine/test_strategy_engine.py          # 17 tests, ~0.01s, stdlib only
```

It runs as a **pre-flight gate** in `daily-content.yml` before the engine
executes, so a broken parser fails the run loudly instead of silently publishing
a bad strategy.

### Self-monitoring (non-silent alert path)

A fully-automated loop must notice when it stalls. Every run writes
`health.json` (🟢 ok / 🟡 warning / 🔴 stalled) and a badge into the brief, based
on cadence (days since last snapshot), input health (is GSC data flowing?), and
learning health. For alerting, a monitoring cron can run:

```bash
python3 engine/strategy_engine.py --health   # exits 2 if the loop is stalled
```

This closes the operating-surface's "alert paths are mostly silent" gap for the
strategy path — the first such job with a non-silent alert path.

## Roadmap (toward number 1)

The loop is live but early. Status of the ordered increments:

1. ✅ **Fresh GSC on every run.** `orchestrator.py` runs
   `ops/scripts/gsc-search-analytics.py` + `gsc-coverage-monitor.py` before the
   strategy step (guarded — no-ops without credentials). `gsc_client.py` now
   accepts a headless token via `GSC_TOKEN_JSON`, and `daily-content.yml` passes
   it as a secret. *Remaining: mint the token once and set the secret — see
   [`ops/gsc-auth/README.md`](../gsc-auth/README.md).*
2. **Real competitive scan.** Replace the signal engine's hardcoded gaps with a
   live Firecrawl/search-backed scan feeding `.claude/signals/competitive-*.json`.
3. ✅ **Close the write side (human out of the loop).** `engine/auto_act.py`
   autonomously executes the safest top items — CTR `title`/`dek` rewrites on
   journal articles — with hard guardrails: capped (`PI_AUTO_ACT_LIMIT`, default
   1/run), idempotent (never re-acts a target in the ledger), grounded (drafted
   by Claude from the real page; skips rather than fabricates if unreachable),
   gated (length + house-style + frontmatter-valid), and measured (records to
   the learning loop, git-reversible). Venue/event pages derive meta from
   templates and are left flagged, not blindly edited. Wired into `run_daily`
   as step 0b; set `PI_AUTO_ACT=0` to disable.
4. ✅ **Outcome attribution + self-tuning.** Actioned opportunities are logged to
   `actioned.jsonl` and re-measured against GSC each run (hit-rate by fix type).
   The model **automatically adapts its per-kind weights** toward what works
   (`model-weights.json`), a little each cycle so it compounds — guarded to only
   act once a kind has ≥`ADAPT_MIN_MEASURED` outcomes, so noise (14 clicks) can't
   swing it, bounded to ±30% and EMA-smoothed so it drifts rather than lurches.
5. **Agent-answer coverage.** Track which Peninsula questions AI assistants
   answer *from* Peninsula Insider vs competitors, and treat gaps as a new
   research point alongside GSC.
