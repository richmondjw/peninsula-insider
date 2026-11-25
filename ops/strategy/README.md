# Peninsula Insider: Content Strategy Brain

**North star:** become the number-1 destination, for people *and* AI agents,
for what's on, and where to stay, eat, drink and explore on the Mornington
Peninsula.

This directory holds the **evolving content strategy**: not a document someone
writes once, but machine-owned state that is regenerated every day from live
signals, and that measurably improves as the site's performance improves.

## The closed loop

Before this, the content engine *produced* on a fixed cadence but never
*learned*: nothing read performance data back into what got commissioned next.
The Strategy Brain (`engine/strategy_engine.py`) closes that loop:

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
   - GSC search analytics (`ops/reports/gsc-search-analytics.md`): clicks,
     impressions, positions, striking-distance queries, CTR misses, and every
     page with impressions
   - GSC coverage/indexation (`ops/reports/gsc-coverage-report.md`): which
     tracked URLs Google has (not) indexed; an unindexed page can't rank at all
   - Events calendar (`next/src/content/events/`): upcoming events needing
     advance preview coverage, and which event pages belong to events that are over
   - Content inventory from `sitemap.xml`: section coverage + page freshness
   - Competitive-scan JSON from the signal engine (`.claude/signals/`)
   - Seasonal intent calendar (season to peak-intent Peninsula themes)
   - Its own previous snapshot (memory)
2. **Checks how old each input is** and sets aside any that is past its limit
   (see the staleness guard below).
3. **Scores every opportunity** with one interpretable model (see below) and
   ranks them into a single commissioning queue.
4. **Diffs today vs yesterday** so "the strategy improves each day" is an
   observable fact: clicks, impressions, average position and the top-5
   priorities are compared against the last snapshot.
5. **Measures whether past fixes worked** (the learning loop, see below).
6. **Writes** machine state the orchestrator consumes.

## The staleness guard

From its first run on 2026-07-06 until late November 2026 (111 daily runs) this
loop published a brief dated today from search data that ended on 2026-04-19,
mostly with a green health badge. The Search Console pull had no
credentials, failed every morning, and was logged as a skip. The guard exists so
that cannot happen quietly again.

Every dated input is measured against the run date, from the newest data it
actually contains:

| Input | Dated by | Warns after | Stale after |
|---|---|---|---|
| Search analytics | last day with data (`Data through`, else the period end) | 7 days | 14 days |
| Index coverage | the report's `Generated` date | | 14 days |
| Content inventory | newest `lastmod` in the sitemap | | 30 days |

A working daily pull trails Search Console by about three days, so a week-old
report already means pulls are failing. The limits are the `*_STALE_AFTER_DAYS`
constants at the top of `engine/strategy_engine.py`.

When an input is stale (or carries no date, or is dated after the run date: the
guard fails closed):

- **The brief says so first.** `content-strategy.md` opens with a stale-data
  block naming each stale input, its end date and its age, and the cause when
  the run knows it.
- **Work built on it is withheld.** Opportunities derived from that input leave
  the commissioning queue and are counted under "Withheld from the queue".
  Search analytics feeds `ctr-fix` and `striking-distance`; coverage feeds
  `indexation`; the inventory feeds `freshness`. Event previews and seasonal
  prompts do not depend on any of them and are still commissioned.
- **Its numbers are not published as current.** In `content-strategy.json` the
  affected `metrics` are `null` and the old values move to `last_known` with
  their date. The brief shows them labelled stale.
- **Health is not green.** Stale or missing search data is `degraded`; stale
  coverage or inventory is `warning`.

Stale or missing search data gets the full warning block, because search
performance is what the brief is for. Coverage or inventory alone get a short
"some inputs are out of date" note, so a brief built on current search data is
not labelled as if it were not.

The same rules run again when a consumer reads the queue
(`usable_queue`, used by `orchestrator.py` and `auto_act.py`), against the
date of reading. A state file that is days old, or was written before the guard
existed, cannot hand on items that have since gone stale.

## Events that are over

An event page keeps its URL after the event, and Google goes on showing it. So
old search data keeps proposing work on it ("rewrite the title for
`/whats-on/mornington-cup-2026/`", seven months after the race).

No opportunity of any kind may target the page of an event that is over. The
brain indexes every event record, including `events/archive/`, and drops an
opportunity whose target is `/whats-on/{slug}/` for a record that is:

- **ended**: nothing the record states is still ahead. The reading of each
  recurrence follows the site's own schedule logic
  (`next/src/lib/event-schedule.ts`):
  - a one-off is over the day after its last stated day
  - an annual or seasonal record is too, unless its next occurrence falls
    inside the 90-day advance-coverage window
  - a weekly, monthly or ongoing record whose end date is after its start date
    is a bounded run (an exhibition, a season of Saturdays) and is over after
    that end, unless a next occurrence is still ahead. With no end after the
    start, the dates are only the last occurrence computed so far: the series
    is open-ended and never ends by date alone
- **cancelled** (the same test the site uses, `engine/event_admission.py`).
- **retired**: status `archived` or `expired`, whatever its dates say. A
  future date on an archived listing usually means the date is unconfirmed.

Dropped items are listed in the brief with the reason and do not return. Live
event items carry `expires_on`, so one that is acted on late is refused at
read time.

This is deliberately stricter than `next/scripts/archive-expired-events.py`,
which keeps an annual listing on the site while any next occurrence exists and
never retires a weekly, monthly or ongoing record at all.

## The learning loop (does the strategy actually work?)

Scoring what to do next is only half a strategy; the other half is knowing
whether the last thing worked. When an opportunity is acted on it's appended to
`actioned.jsonl` with the target page's metrics *at the time of action*:

```bash
python3 engine/strategy_engine.py --record /journal/dog-friendly-mornington-peninsula/ \
  --kind ctr-fix --query "dog friendly guide mornington peninsula" \
  --note "rewrote title + meta"
```

On every later run the brain re-measures each actioned item and produces a
**hit-rate by fix type** in the brief ("Did our fixes work?"). An item is only
measured against evidence gathered *after* the action:

- Search metrics count once the whole 28-day search window post-dates the
  action. Data that ends before the action says nothing about it; a window that
  straddles it mixes before with after. In practice an action becomes
  measurable about a month after it is taken.
- An `indexation` fix is judged on URL inspection first (is the page indexed
  now?), then on whether the page has started earning impressions, since Google
  only shows pages it has indexed. The coverage monitor inspects every page in
  the ledger so that this evidence exists.
- The search report lists every page with impressions, not only the top 25, so
  a low-traffic page can be measured. A page absent from that complete table
  had no impressions.
- An item with no baseline to compare against is left pending. It is not scored
  as a miss. The same goes for a baseline recorded from data that was already
  stale at the time (`baseline_as_of` more than 14 days before the action):
  comparing it with today would measure the drift in between, not the fix.
- A query-level action is scored on the report's "Tracked Queries" table, which
  carries every query in the ledger whatever its rank. Without it a query that
  climbed to position 2, or dropped out of sight, would fall outside the top
  queries and the position 4 to 20 band and never be scored.

Anything that cannot be measured yet stays pending with the reason shown, and
pending items never enter the hit rates. As the hit-rate data accumulates the
per-kind weights adapt toward the fix types that demonstrably work.

## Outputs

| File | Purpose |
|---|---|
| `content-strategy.json` | Machine state. Read `commissioning_queue` through `usable_queue` / `load_commissioning_queue`, not directly. Also carries `freshness`, `withheld`, `last_known`. |
| `content-strategy.md` | Human-readable strategy brief (stale-data block if any, where we stand, day-over-day, ranked queue, what was withheld). |
| `snapshots/YYYY-MM-DD.json` | Immutable daily snapshot: history and the basis for day-over-day diffs. |
| `actioned.jsonl` | Append-only ledger of actioned opportunities + their baseline metrics (learning loop). |
| `model-weights.json` | The self-tuning per-fix-type multipliers, adapted from measured outcomes. |
| `health.json` | Loop health for the run: status, notes, cause, and what the Search Console pull did. |

## The scoring model

Opportunities fall into six kinds, each mapped to a concrete action:

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
ranked against proven-demand fixes rather than always first.

Each opportunity's score is a weighted sum of interpretable contributions:
`impressions` (log-damped proven demand), `position_proximity` (closeness to
page 1), `ctr_deficit` (gap below the expected CTR for its position), `seasonal`
relevance, and structural nudges for coverage/freshness, multiplied by an
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
`engine/orchestrator.py`, which first runs the two Search Console pulls and
tells the brain what each one did.

Design guarantees: **standard library only** (runs wherever the orchestrator
runs), **degrades gracefully** (any missing input is skipped and noted, never
fatal), **deterministic** (same inputs + date give the same strategy, so it is
testable), and **honest about age** (above).

### Trustworthiness (self-test gate)

Because the loop runs unattended daily, `engine/test_strategy_engine.py` locks
the behaviour it depends on: table parsing (incl. the summary-row trap),
position-aware CTR classification, scoring monotonicity, the staleness guard
end to end, the expired-event rule, learning-loop re-measurement, day-over-day
diffing, graceful degradation, and the contract between the reports the feed
scripts write and what the brain parses (each report is built with the script's
own writer and parsed back).

```bash
python3 engine/test_strategy_engine.py          # stdlib only, well under a second
```

It runs in two places:

- as a **pre-flight gate** in `daily-content.yml` before the engine executes, so
  a broken parser fails the run loudly instead of publishing a bad strategy
  (`PI_PREFLIGHT=1` leaves out the few checks that read the repository's own
  events and reports, so a content record cannot stop the publish);
- on **pull requests** that touch the engine or the feed scripts
  (`strategy-engine.yml`), in full.

### Self-monitoring (non-silent alert path)

A fully-automated loop must notice when it stalls. Every run writes
`health.json` and a badge into the brief:

| Status | Meaning |
|---|---|
| 🟢 `ok` | On cadence, inputs current, today's pulls succeeded |
| 🟡 `warning` | Cadence slipping, a pull failed today, search data ageing, or coverage/inventory stale |
| 🟠 `degraded` | Running on time, but search data is stale or missing: the loop cannot see performance or learn |
| 🔴 `stalled` | Not running: three or more days since the last snapshot |

```bash
python3 engine/strategy_engine.py --health           # exit 2 stalled, 3 degraded, 0 otherwise
python3 engine/strategy_engine.py --health --alert   # also keep a GitHub issue open
```

Exit 1 is never used: it is what an uncaught exception exits with, and a
monitor has to tell "degraded" from "the check crashed".

`health.json` also carries `alert`: whether the owner should be told now. It is
true whenever the loop is degraded or stalled, and already at `warning` when a
Search Console pull is failing in a way that will not fix itself (no
credentials, a rejected token), when search data is ageing because pulls have
failed for days, or when index coverage has gone stale. A one-morning API error
does not set it, and neither does the stale sitemap inventory, which no
settings page can fix.

`daily-content.yml` runs `--health --alert` after every daily run. It never
fails the publish. While `alert` is true it puts a warning on the run and keeps
one issue open, labelled `pi-alert`, with the cause and the fix. The issue is
edited in place rather than commented on each day; it gets one comment when the
cause changes, for instance when the secret is set but holds the wrong file.

## Roadmap (toward number 1)

The loop is live but early. Status of the ordered increments:

1. **Fresh GSC on every run.** The pipeline is in place and tested:
   `orchestrator.py` runs `ops/scripts/gsc-search-analytics.py` +
   `gsc-coverage-monitor.py` before the strategy step and commits their
   reports; `gsc_client.py` accepts a headless token via `GSC_TOKEN_JSON`.
   **Not yet delivering:** the token has never been minted and the secret is
   empty. That is an owner step: [`ops/gsc-auth/README.md`](../gsc-auth/README.md).
2. **A current content inventory.** The brain reads the repository-root
   `sitemap.xml`, a leftover of the retired root-deploy model that was last
   rebuilt on 2026-07-05. The live sitemap is built into `next/dist` and never
   reaches the daily job. The guard now sets the inventory aside as stale;
   feeding the brain the real sitemap is still to do.
3. **Real competitive scan.** Replace the signal engine's hardcoded gaps with a
   live Firecrawl/search-backed scan feeding `.claude/signals/competitive-*.json`.
4. ✅ **Close the write side (human out of the loop).** `engine/auto_act.py`
   autonomously executes the safest top items (CTR `title`/`dek` rewrites on
   journal articles) with hard guardrails: capped (`PI_AUTO_ACT_LIMIT`, default
   1/run), idempotent (never re-acts a target in the ledger), grounded (drafted
   by Claude from the real page; skips rather than fabricates if unreachable),
   gated (length + house-style + frontmatter-valid), and measured (records to
   the learning loop, git-reversible). It reads the queue through
   `usable_queue`, so it cannot act on stale data or an expired event page.
   Venue/event pages derive meta from templates and are left flagged, not
   blindly edited. Wired into `run_daily` as step 0b; currently paused with
   `PI_AUTO_ACT=0` in `daily-content.yml`.
5. ✅ **Outcome attribution + self-tuning.** Actioned opportunities are logged to
   `actioned.jsonl` and re-measured each run (hit-rate by fix type). The model
   **automatically adapts its per-kind weights** toward what works
   (`model-weights.json`), a little each cycle so it compounds: guarded to only
   act once a kind has ≥`ADAPT_MIN_MEASURED` outcomes, so noise (14 clicks) can't
   swing it, bounded to ±30% and EMA-smoothed so it drifts rather than lurches.
   No outcome has been measured yet, because no post-action data has arrived
   (item 1).
6. **Agent-answer coverage.** Track which Peninsula questions AI assistants
   answer *from* Peninsula Insider vs competitors, and treat gaps as a new
   research point alongside GSC.
