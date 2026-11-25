#!/usr/bin/env python3
"""
Peninsula Insider — Content Strategy Brain
===========================================================================
The closed feedback loop the content engine was missing.

The orchestrator *produces* content on daily/weekly/monthly tempos, but until
now nothing read performance data back into *what gets commissioned next*. The
signal engine emitted a brief from hardcoded competitive gaps and a static
seasonal list — useful scaffolding, but it did not learn.

This module is the brain. Each run it fuses multiple research points:

  1. Search performance   — Google Search Console report (clicks, impressions,
                            positions, striking-distance queries, CTR misses)
  2. Content inventory    — sitemap.xml (what exists, section coverage, freshness)
  3. Competitive signal   — competitive-scan JSON from the signal engine
  4. Seasonal intent      — season -> priority themes for the Peninsula
  5. Its own memory       — yesterday's strategy snapshot, so it can measure
                            whether the strategy is actually improving

...into a single scored, ranked **commissioning queue** plus a human brief, and
it diffs today against yesterday so "the strategy improves each day" is an
observable fact, not an aspiration.

Outputs (all under ops/strategy/):
  - content-strategy.json          machine state consumed by the orchestrator
  - content-strategy.md            human-readable strategy brief
  - snapshots/YYYY-MM-DD.json      immutable daily snapshot (history / diffing)

Design constraints:
  - Standard library only. Runs anywhere the orchestrator runs, no new deps.
  - Degrades gracefully. Any missing input is skipped and noted, never fatal.
  - Deterministic. Same inputs -> same strategy (given date), so it is testable.
  - Honest about age. Every dated input is checked against today. Work derived
    from an input that is too old is withheld from the queue and the brief says
    so at the top, rather than ranking old numbers under today's date.

Usage:
  python engine/strategy_engine.py                 # write strategy from current inputs
  python engine/strategy_engine.py --date 2026-07-06
  python engine/strategy_engine.py --dry-run       # print, write nothing
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from event_admission import is_cancelled_record

try:
    import zoneinfo
    AEST = zoneinfo.ZoneInfo("Australia/Sydney")
except Exception:  # pragma: no cover - zoneinfo always present on 3.9+
    AEST = None

# ── Paths ───────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
SITEMAP = REPO_ROOT / "sitemap.xml"
GSC_REPORT = REPO_ROOT / "ops/reports/gsc-search-analytics.md"
GSC_COVERAGE = REPO_ROOT / "ops/reports/gsc-coverage-report.md"
EVENTS_DIR = REPO_ROOT / "next/src/content/events"
COMPETITIVE_DIR = REPO_ROOT / ".claude/signals"
STRATEGY_DIR = REPO_ROOT / "ops/strategy"
SNAPSHOT_DIR = STRATEGY_DIR / "snapshots"
STRATEGY_JSON = STRATEGY_DIR / "content-strategy.json"
STRATEGY_MD = STRATEGY_DIR / "content-strategy.md"
ACTIONED_LEDGER = STRATEGY_DIR / "actioned.jsonl"
MODEL_WEIGHTS_FILE = STRATEGY_DIR / "model-weights.json"
HEALTH_FILE = STRATEGY_DIR / "health.json"

SITE = "https://peninsulainsider.com.au"

NORTH_STAR = (
    "Become the number-1 destination, for people and AI agents, for what's on, "
    "and where to stay, eat, drink and explore on the Mornington Peninsula."
)

# ── Input freshness (the staleness guard) ────────────────────────────────────
# For its first 111 daily runs this loop published a strategy dated today from
# search data that ended on 2026-04-19 (seven months old by the end), mostly
# with a green health badge. Each dated input is now measured against the run
# date. Past its limit an input is "stale": the work derived from it is
# withheld from the commissioning queue, its numbers are labelled as old, and
# loop health cannot read as healthy.
SEARCH_STALE_AFTER_DAYS = 14     # newest search data older than this is stale
SEARCH_AGING_AFTER_DAYS = 7      # a working daily pull trails by about 3 days
COVERAGE_STALE_AFTER_DAYS = 14   # age of the URL inspection snapshot
INVENTORY_STALE_AFTER_DAYS = 30  # newest lastmod in the sitemap we were handed

# The input each opportunity kind is derived from. Kinds not listed here come
# from the live events calendar or the seasonal calendar and are never withheld
# for staleness.
KIND_INPUT = {
    "ctr-fix": "search",
    "striking-distance": "search",
    "indexation": "coverage",
    "freshness": "inventory",
}
INPUT_NAMES = {
    "search": "Search Console search data",
    "coverage": "Index coverage",
    "inventory": "Content inventory (sitemap.xml)",
}
INPUT_VERBS = {"search": "ends", "coverage": "was last inspected", "inventory": "was last updated"}
INPUT_SOURCES = {
    "search": "gsc-search-analytics",
    "coverage": "gsc-coverage",
    "inventory": "sitemap-inventory",
}

# ── Events: what counts as over ──────────────────────────────────────────────
# An event that has ended, been cancelled, or had its listing archived must
# never be commissioned, whatever search data says about its page. The rule is
# in event_block_reason; the recurrence sets below are the ones the site's own
# expiry job (next/scripts/archive-expired-events.py) uses.
EVENT_PATH_RE = re.compile(r"^/whats-on/([^/]+)/$")
RETIRED_EVENT_STATUSES = {"archived", "expired"}
ROLLING_RECURRENCES = {"weekly", "monthly", "ongoing"}   # series the registry rolls forward
RECURRING_RECURRENCES = {"weekly", "monthly", "annual", "seasonal", "ongoing"}

# Loop health, least to most serious. "degraded" is a loop that runs on time
# but without a usable performance signal: distinct from "stalled" (not running).
HEALTH_RANK = {"ok": 0, "warning": 1, "degraded": 2, "stalled": 3}
HEALTH_BADGE = {"ok": "🟢 healthy", "warning": "🟡 warning",
                "degraded": "🟠 degraded", "stalled": "🔴 stalled"}

# ── Scoring weights (tunable — this IS the strategy model) ───────────────────
# A single interpretable scoring function ranks every opportunity so the queue
# is explainable. Weights are deliberately in one place so the model can be
# tuned as the site matures (early-stage favours striking-distance + CTR wins;
# a mature site would lift coverage/freshness).
WEIGHTS = {
    "indexation": 1.8,       # not indexed = can't rank at all — the upstream lever
    "event_coverage": 1.5,   # timely "what's on" — the primary mission clause
    "impressions": 1.0,      # demand already proven by Google surfacing us
    "position_proximity": 1.4,  # how close to page 1 (fast to convert)
    "ctr_deficit": 1.2,      # surfaced but not clicked = title/meta fix, cheap
    "seasonal": 0.8,         # right thing for the season right now
    "coverage_gap": 0.9,     # competitor covers it, we don't
    "freshness": 0.6,        # decaying authority on an important page
}

# Effort multipliers: cheap, high-certainty wins get a nudge so the queue front
# is dominated by things that move the needle this week, not moonshots.
EFFORT_BONUS = {
    "indexation": 1.2,        # getting a page indexed is high-leverage and mostly mechanical
    "event-coverage": 1.1,    # timely, but a net-new preview page is real work
    "ctr-fix": 1.25,          # rewrite title + meta on an existing page
    "striking-distance": 1.15,  # tighten an existing page to reach page 1
    "freshness": 1.0,
    "coverage-gap": 0.9,      # net-new piece — higher value, slower payoff
}

# ── Adaptive model (the self-tuning that makes the strategy improve daily) ────
# The learning loop measures which fix types actually move pages on THIS site.
# The model then nudges a per-kind multiplier toward the fix types that work and
# away from those that don't — automatically, a little each day, so the strategy
# compounds. Guarded: a kind is only adapted once it has enough measured
# outcomes, so early noise (14 clicks) can't swing the model. Bounded + smoothed
# so it drifts, never lurches.
ALL_KINDS = ["indexation", "event-coverage", "ctr-fix", "striking-distance",
             "coverage-gap", "freshness"]

# Advance-coverage window for events: a preview page needs weeks of lead time to
# be indexed and ranking by the time the event draws search interest. 14–45 days
# out is prime; too-soon can't build fresh ranking, too-far isn't urgent yet.
EVENT_WINDOW_MAX_DAYS = 90
ADAPT_MIN_MEASURED = 4      # need this many measured outcomes before adapting a kind
ADAPT_SMOOTHING = 0.30      # EMA weight on the new target (0=frozen, 1=jumpy)
ADAPT_CLAMP = (0.7, 1.3)    # a kind's multiplier can never leave this band

# Set by build_state() from the persisted adaptive model, read by score_opportunity.
_KIND_MULT: dict = {}

SEASONAL_THEMES = {
    "summer": ["beaches", "swimming", "boat hire", "outdoor dining", "coastal walks",
               "summer events", "family holidays", "foreshore camping"],
    "autumn": ["truffle season", "vintage & harvest", "cellar door", "long lunches",
               "autumn walks", "cosy pubs", "mushroom foraging"],
    "winter": ["hot springs", "cellar door fires", "truffle season", "winter menus",
               "spa & wellness", "cosy stays", "winter walks", "wineries by fire"],
    "spring": ["wildflowers", "new menus", "garden season", "outdoor dining returns",
               "spring racing", "cellar door", "coastal walks"],
}

SEASON_BY_MONTH = {
    12: "summer", 1: "summer", 2: "summer",
    3: "autumn", 4: "autumn", 5: "autumn",
    6: "winter", 7: "winter", 8: "winter",
    9: "spring", 10: "spring", 11: "spring",
}


def get_season(month: int) -> str:
    return SEASON_BY_MONTH.get(month, "summer")


# ── Data structures ──────────────────────────────────────────────────────────
@dataclass
class Opportunity:
    kind: str            # ctr-fix | striking-distance | coverage-gap | freshness
    title: str           # human label of the work
    target: str          # page path or new-piece topic
    query: str = ""      # driving query, if any
    impressions: int = 0
    avg_position: float = 0.0
    ctr: float = 0.0
    seasonal: bool = False
    days_until: int = None   # for event-coverage: days to the event
    major: bool = False      # for event-coverage: significant/ticketed vs recurring market
    rationale: str = ""
    recommended_action: str = ""
    suggested_desk: str = ""
    expires_on: str = ""     # ISO day after which this must not be acted on (event pages)
    score: float = 0.0
    score_breakdown: dict = field(default_factory=dict)


# ── Input parsing ────────────────────────────────────────────────────────────
def parse_markdown_table(md: str, heading_regex: str) -> list[dict]:
    """Extract the first markdown table appearing under a heading matching
    heading_regex. Returns a list of {column: value} dicts."""
    lines = md.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.search(heading_regex, line, re.I):
            start = i
            break
    if start is None:
        return []
    # Find the header row (first line starting with |) after the heading.
    hdr = None
    for i in range(start + 1, min(start + 8, len(lines))):
        if lines[i].strip().startswith("|"):
            hdr = i
            break
    if hdr is None or hdr + 1 >= len(lines):
        return []
    headers = _split_row(lines[hdr])
    rows = []
    for line in lines[hdr + 2:]:
        if not line.strip().startswith("|"):
            break
        cells = _split_row(line)
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


def _split_row(line: str) -> list[str]:
    """Cells of one markdown table row. A pipe inside a cell is written as an
    escaped pipe by the report writers (search queries can contain one)."""
    body = line.strip()
    if body.startswith("|"):
        body = body[1:]
    if body.endswith("|") and not body.endswith("\\|"):
        body = body[:-1]
    return [c.replace("\\|", "|").strip().strip("`") for c in re.split(r"(?<!\\)\|", body)]


_ISO_DAY = re.compile(r"\d{4}-\d{2}-\d{2}")


def _iso_days(text) -> list[str]:
    """Every valid YYYY-MM-DD in a string, in order of appearance."""
    out = []
    for raw in _ISO_DAY.findall(str(text or "")):
        try:
            date.fromisoformat(raw)
        except ValueError:
            continue
        out.append(raw)
    return out


def _day(value) -> date | None:
    """A date from an ISO day or timestamp string, or None."""
    days = _iso_days(str(value or "")[:10])
    return date.fromisoformat(days[0]) if days else None


def _num(s: str) -> float:
    m = re.search(r"-?\d+\.?\d*", str(s).replace(",", "").replace("%", ""))
    return float(m.group()) if m else 0.0


def _norm_path(url: str) -> str:
    """Normalise a GSC page cell to a canonical site path."""
    u = url.strip().strip("`")
    u = re.sub(r"^https?://[^/]+", "", u)
    if not u.startswith("/"):
        u = "/" + u
    u = re.sub(r"/+$", "/", u)
    if not u.endswith("/"):
        u += "/"
    return u


def load_gsc(report_path: Path) -> dict:
    """Parse the GSC search-analytics report into structured performance data."""
    data = {
        "available": False, "period": "", "summary": {},
        "period_start": "", "period_end": "", "data_through": "", "generated": "",
        "top_pages": [], "top_queries": [], "striking_distance": [], "ctr_opportunities": [],
        "pages": [], "pages_complete": False,
    }
    if not report_path.exists():
        return data
    md = report_path.read_text(encoding="utf-8")
    data["available"] = True
    period = re.search(r"_Period:\s*(.+?)_", md)
    if period:
        data["period"] = period.group(1).strip()
        days = _iso_days(data["period"])
        if days:
            data["period_start"], data["period_end"] = days[0], days[-1]
    through = re.search(r"_Data through:\s*(.+?)_", md)
    if through and _iso_days(through.group(1)):
        data["data_through"] = _iso_days(through.group(1))[0]
    generated = re.search(r"_Generated:?\s*(.+?)_", md)
    if generated:
        data["generated"] = generated.group(1).strip()

    for row in parse_markdown_table(md, r"^##+\s*Summary"):
        # Summary is a Metric | Value table.
        keys = list(row.values())
        if len(keys) == 2:
            data["summary"][keys[0]] = keys[1]

    for row in parse_markdown_table(md, r"^#+.*Top Pages by Impressions"):
        page = row.get("Page", "")
        data["top_pages"].append({
            "path": _norm_path(page),
            "impressions": int(_num(row.get("Impressions", 0))),
            "clicks": int(_num(row.get("Clicks", 0))),
            "ctr": _num(row.get("CTR", 0)),
            "avg_position": _num(row.get("Avg Pos", 0)),
        })
    for row in parse_markdown_table(md, r"^#+.*Top Queries"):
        data["top_queries"].append({
            "query": row.get("Query", ""),
            "impressions": int(_num(row.get("Impressions", 0))),
            "clicks": int(_num(row.get("Clicks", 0))),
            "avg_position": _num(row.get("Avg Pos", 0)),
        })
    for row in parse_markdown_table(md, r"^#+.*Keyword Gaps"):
        page = row.get("Top page", "").strip()
        data["striking_distance"].append({
            "query": row.get("Query", ""),
            "impressions": int(_num(row.get("Impressions", 0))),
            "avg_position": _num(row.get("Avg Pos", 0)),
            "clicks": int(_num(row.get("Clicks", 0))),
            # The page that actually ranks, when the report carries it.
            "page": _norm_path(page) if page.startswith(("/", "http")) else "",
        })
    for row in parse_markdown_table(md, r"^#+.*CTR Opportunities"):
        data["ctr_opportunities"].append({
            "path": _norm_path(row.get("Page", "")),
            "impressions": int(_num(row.get("Impressions", 0))),
            "ctr": _num(row.get("CTR", 0)),
            "avg_position": _num(row.get("Avg Pos", 0)),
        })
    # Every page with impressions. When present the table is complete, so a
    # page that is not in it had none; the top-25 table alone cannot say that.
    for row in parse_markdown_table(md, r"^#+\s*All Pages With Impressions"):
        data["pages"].append({
            "path": _norm_path(row.get("Page", "")),
            "impressions": int(_num(row.get("Impressions", 0))),
            "clicks": int(_num(row.get("Clicks", 0))),
            "ctr": _num(row.get("CTR", 0)),
            "avg_position": _num(row.get("Avg Pos", 0)),
        })
    data["pages_complete"] = bool(data["pages"])
    return data


def load_coverage(report_path: Path) -> dict:
    """Parse the GSC coverage report — which URLs Google has (not) indexed.
    A page that isn't indexed cannot rank, so these are the most upstream fixes."""
    data = {"available": False, "indexed": 0, "not_indexed": [], "generated": "",
            "as_of": "", "inspected": 0, "by_path": {}}
    if not report_path.exists():
        return data
    md = report_path.read_text(encoding="utf-8")
    data["available"] = True
    gen = re.search(r"_(?:Generated|Run) (.+?)_", md)
    if gen:
        data["generated"] = gen.group(1).strip()
        days = _iso_days(data["generated"])
        data["as_of"] = days[0] if days else ""
    indexed = re.search(r"Indexed \(PASS\)\s*[:|]\s*\*\*(\d+)\*\*", md)
    if indexed:
        data["indexed"] = int(indexed.group(1))
    rows = parse_markdown_table(md, r"^#+.*(?:URL Inspection Results|Full Status)")
    for row in rows:
        verdict_cov = row.get("Coverage", "")
        if not verdict_cov:
            continue
        path = _norm_path(row.get("URL", ""))
        verdict = row.get("Verdict", "").strip().upper()
        data["by_path"][path] = {"verdict": verdict, "coverage": verdict_cov.strip(),
                                 "last_crawl": row.get("Last Crawl", "").strip()}
        # Anything not clearly indexed is an indexation opportunity.
        if re.search(r"not indexed|unknown to google|discovered|crawled - currently not",
                     verdict_cov, re.I):
            data["not_indexed"].append({
                "path": path,
                "coverage": verdict_cov.strip(),
                "last_crawl": row.get("Last Crawl", "").strip(),
            })
    verdicts = [r["verdict"] for r in data["by_path"].values() if r["verdict"]]
    # Failed inspections say nothing about the page: they are not "inspected".
    data["inspected"] = sum(1 for v in verdicts if v not in ("ERROR", "UNKNOWN"))
    if verdicts:
        data["indexed"] = sum(1 for v in verdicts if v == "PASS")
    return data


def load_inventory(sitemap_path: Path, today: date) -> dict:
    """Section coverage + freshness from the sitemap."""
    inv = {"available": False, "total": 0, "sections": {}, "stale": [], "newest_lastmod": ""}
    if not sitemap_path.exists():
        return inv
    xml = sitemap_path.read_text(encoding="utf-8")
    inv["available"] = True
    # A sitemap for a site that publishes daily always carries a recent lastmod.
    # The newest one dates the file itself: a copy that stopped being rebuilt
    # makes every page look stale and every page count wrong.
    lastmods = _iso_days(" ".join(re.findall(r"<lastmod>(.*?)</lastmod>", xml)))
    inv["newest_lastmod"] = max(lastmods) if lastmods else ""
    for block in re.findall(r"<url>([\s\S]*?)</url>", xml):
        loc = re.search(r"<loc>(.*?)</loc>", block)
        if not loc:
            continue
        path = re.sub(r"^https?://[^/]+", "", loc.group(1))
        seg = path.strip("/").split("/")[0] if path.strip("/") else "(home)"
        inv["total"] += 1
        inv["sections"].setdefault(seg, 0)
        inv["sections"][seg] += 1
        lm = re.search(r"<lastmod>(.*?)</lastmod>", block)
        if lm:
            try:
                age = (today - date.fromisoformat(lm.group(1).strip())).days
                if age > 90:
                    inv["stale"].append({"path": path, "age_days": age})
            except ValueError:
                pass
    inv["stale"].sort(key=lambda x: -x["age_days"])
    inv["stale"] = inv["stale"][:15]
    return inv


def load_events(events_dir: Path, today: date) -> dict:
    """Upcoming events from the events collection — the timely 'what's on' input.
    Returns events within the advance-coverage window, most-imminent first, with
    days-until and a significance flag (ticketed / one-off draws > recurring markets)."""
    out = {"available": False, "upcoming": []}
    if not events_dir.exists():
        return out
    out["available"] = True
    for jf in events_dir.glob("*.json"):
        try:
            d = json.loads(jf.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(d, dict):
            continue
        try:
            start = date.fromisoformat(str(d.get("startDate", ""))[:10])
        except ValueError:
            continue
        days = (start - today).days
        if days < 0 or days > EVENT_WINDOW_MAX_DAYS:
            continue
        if event_block_reason(d, today):
            # Cancelled, or the listing is archived (unconfirmed dates, a
            # duplicate, a dead source). A future start date does not make it live.
            continue
        recurrence = str(d.get("recurrence") or "one-off").lower()
        paid = "paid" in str(d.get("freePaid") or "").lower()
        is_market = "market" in (str(d.get("category") or "") + str(d.get("title") or "")).lower()
        # A significant event worth a dedicated advance preview: ticketed, or a
        # one-off/annual non-market draw. Recurring community markets are evergreen.
        major = (paid or recurrence in ("one-off", "annual")) and not is_market
        out["upcoming"].append({
            "slug": str(d.get("slug") or jf.stem), "title": str(d.get("title") or jf.stem),
            "start": start.isoformat(), "days_until": days, "major": major,
            "end": (_event_last_day(d) or start).isoformat(),
            "summary": d.get("summary", ""), "category": d.get("category", ""),
            "region": d.get("venueRegion", d.get("suburb", "")),
        })
    out["upcoming"].sort(key=lambda e: e["days_until"])
    return out


def _event_last_day(rec: dict) -> date | None:
    """The last calendar day the record itself states (end date, else start)."""
    days = [d for d in (_day(rec.get("startDate")), _day(rec.get("endDate"))) if d]
    return max(days) if days else None


def event_block_reason(rec: dict, today: date) -> str:
    """Why an event record must not be commissioned, or "" while it is live.

    An event is over once the last day the record states has passed. Two
    exceptions, both taken from how the events registry models a series:

      - weekly, monthly and ongoing records roll forward; their dates are the
        last occurrence computed so far, not the end of the series
      - an annual or seasonal record whose next occurrence falls inside the
        advance-coverage window has an edition coming that is worth working on

    This is deliberately stricter than next/scripts/archive-expired-events.py,
    which keeps an annual listing published while any next occurrence exists,
    even a pattern-based guess a year out. A listing can stay on the site for
    a year after the day; commissioning work on it should not.

    A cancelled record, and a listing an editor or the expiry job has retired
    (status archived or expired), is off the table whatever its dates say."""
    if is_cancelled_record(rec):
        return "event cancelled"
    last = _event_last_day(rec)
    recurrence = str(rec.get("recurrence") or "one-off").lower()
    if last is not None and last < today and recurrence not in ROLLING_RECURRENCES:
        nxt = _day(rec.get("nextOccurrence"))
        upcoming = (recurrence in RECURRING_RECURRENCES and nxt is not None
                    and today <= nxt <= today + timedelta(days=EVENT_WINDOW_MAX_DAYS))
        if not upcoming:
            return f"event ended {last.isoformat()}"
    status = str(rec.get("status") or "").lower()
    if status in RETIRED_EVENT_STATUSES:
        return f"listing {status}"
    return ""


def load_event_index(events_dir: Path, today: date) -> dict:
    """slug -> facts for every event record, including events/archive/.

    Event pages keep their URL after the event (/whats-on/{slug}/ stays
    published with an "ended" notice), so search data goes on naming them long
    after there is anything to promote. This index is how the queue recognises
    such a page. `blocked` is the reason it must not be commissioned ("" while
    live); `expires_on` is the last day a live, date-bound event can be acted
    on ("" for a series that rolls forward)."""
    index: dict = {}
    if not events_dir.exists():
        return index
    for jf in sorted(events_dir.rglob("*.json")):
        try:
            d = json.loads(jf.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(d, dict):
            continue
        slug = str(d.get("slug") or jf.stem)
        blocked = event_block_reason(d, today)
        if slug in index and not index[slug]["blocked"]:
            continue  # a live record owns the URL over an archived namesake
        last = _event_last_day(d)
        recurrence = str(d.get("recurrence") or "one-off").lower()
        expires = ""
        if not blocked and recurrence not in ROLLING_RECURRENCES and last is not None:
            # Live and date-bound: good until its stated last day, or, when that
            # has passed, until the next occurrence that is keeping it live.
            upcoming = last if last >= today else (_day(d.get("nextOccurrence")) or last)
            expires = upcoming.isoformat()
        index[slug] = {
            "title": str(d.get("title") or slug),
            "last_day": last.isoformat() if last else "",
            "blocked": blocked,
            "expires_on": expires,
        }
    return index


def event_for_path(path: str, event_index: dict | None) -> dict | None:
    """The event record a site path is the page of, if any."""
    if not event_index:
        return None
    m = EVENT_PATH_RE.match(_norm_path(path))
    return event_index.get(m.group(1)) if m else None


# ── Input freshness ──────────────────────────────────────────────────────────
def _input_freshness(available: bool, as_of: str, today: date,
                     stale_after: int, aging_after: int | None = None) -> dict:
    """How old one input is, and whether work may be derived from it.

    state: missing | undated | future | stale | aging | fresh. Only "fresh" and
    "aging" are usable. An input that cannot be dated, or is dated after the
    run date, is treated as unusable: the guard fails closed."""
    f = {"available": bool(available), "as_of": as_of or "", "age_days": None,
         "stale_after_days": stale_after, "state": "missing", "usable": False}
    if not available:
        return f
    as_of_day = _day(as_of)
    if as_of_day is None:
        f["state"] = "undated"
        return f
    age = (today - as_of_day).days
    f["age_days"] = age
    if age < -1:                      # one day of slack for UTC against local dates
        f["state"] = "future"
    elif age > stale_after:
        f["state"] = "stale"
    elif aging_after is not None and age > aging_after:
        f["state"], f["usable"] = "aging", True
    else:
        f["state"], f["usable"] = "fresh", True
    return f


def assess_freshness(gsc: dict, cov: dict, inv: dict, today: date) -> dict:
    """Age of every dated input, measured from the newest data it contains."""
    return {
        "search": _input_freshness(
            gsc.get("available", False), gsc.get("data_through") or gsc.get("period_end", ""),
            today, SEARCH_STALE_AFTER_DAYS, SEARCH_AGING_AFTER_DAYS),
        "coverage": _input_freshness(
            cov.get("available", False), cov.get("as_of", ""), today, COVERAGE_STALE_AFTER_DAYS),
        "inventory": _input_freshness(
            inv.get("available", False), inv.get("newest_lastmod", ""), today,
            INVENTORY_STALE_AFTER_DAYS),
    }


def describe_input(name: str, f: dict) -> str:
    """One plain sentence on why an input is not usable."""
    label = INPUT_NAMES[name]
    if f["state"] == "missing":
        return f"{label} is missing."
    if f["state"] == "undated":
        return f"{label} carries no date, so its age cannot be checked."
    if f["state"] == "future":
        return f"{label} is dated {f['as_of']}, after the run date, so it cannot be trusted."
    return (f"{label} {INPUT_VERBS[name]} {f['as_of']} and is {f['age_days']} days old "
            f"(limit: {f['stale_after_days']} days).")


def load_competitive(signals_dir: Path) -> dict:
    """Most recent competitive-scan JSON from the signal engine, if any."""
    out = {"available": False, "gaps": []}
    if not signals_dir.exists():
        return out
    scans = sorted(signals_dir.glob("competitive-*.json"), reverse=True)
    if not scans:
        return out
    try:
        payload = json.loads(scans[0].read_text(encoding="utf-8"))
        out["available"] = True
        out["source"] = scans[0].name
        out["gaps"] = payload.get("pi_coverage_gaps", [])
    except (json.JSONDecodeError, OSError):
        pass
    return out


# ── Desk routing ─────────────────────────────────────────────────────────────
def route_desk(target: str, query: str = "") -> str:
    hay = f"{target} {query}".lower()
    if any(w in hay for w in ["stay", "hotel", "accommodation", "retreat", "villa", "cottage"]):
        return "escapes-desk"
    if any(w in hay for w in ["eat", "restaurant", "brunch", "cafe", "food", "bakery", "pub", "cheese"]):
        return "table-desk"
    if any(w in hay for w in ["wine", "cellar", "vineyard", "winery", "cider", "chardonnay"]):
        return "table-desk"
    if any(w in hay for w in ["walk", "beach", "dog", "hot spring", "spa", "explore", "trail", "kids", "free"]):
        return "field-desk"
    if any(w in hay for w in ["whats-on", "event", "cup", "festival", "market", "weekend"]):
        return "dispatch-desk"
    return "field-desk"


# ── Opportunity generation ───────────────────────────────────────────────────
def build_opportunities(gsc: dict, inv: dict, comp: dict, season: str,
                        cov: dict | None = None, events: dict | None = None) -> list[Opportunity]:
    themes = SEASONAL_THEMES.get(season, [])
    cov = cov or {"not_indexed": []}
    events = events or {"upcoming": []}
    opps: list[Opportunity] = []
    seen_targets: set[str] = set()

    def seasonal_match(text: str) -> bool:
        t = text.lower()
        return any(theme.split()[0] in t for theme in themes)

    def is_hub(path: str) -> bool:
        p = path.strip("/").split("/")
        return len(p) <= 1 and p[0] != ""

    # 0. Indexation — pages Google hasn't indexed. Upstream of everything else:
    #    an unindexed page earns zero regardless of how good it is.
    for row in cov.get("not_indexed", []):
        path = row["path"]
        key = ("idx", path)
        if key in seen_targets:
            continue
        seen_targets.add(key)
        hub = is_hub(path)
        opps.append(Opportunity(
            kind="indexation",
            title=f"Get {path} indexed{' (hub page!)' if hub else ''}",
            target=path,
            seasonal=seasonal_match(path),
            rationale=(f"Google reports '{row['coverage']}' (last crawl: {row['last_crawl']}). "
                       f"{'A section hub' if hub else 'This page'} that isn't indexed cannot rank "
                       f"for anything. The single highest-leverage fix."),
            recommended_action=("Ensure it's in sitemap.xml with a strong priority, add internal "
                                "links from already-indexed pages, confirm it isn't noindex, add "
                                "unique above-the-fold content, then Request Indexing in GSC."),
            suggested_desk=route_desk(path),
        ))

    # 0b. Event coverage — timely "what's on". Ensure a preview ranks for major
    #     upcoming events while there's lead time. This is the primary mission clause.
    for ev in events.get("upcoming", []):
        if not ev["major"]:
            continue  # recurring markets are evergreen; skip the advance-preview push
        window = "prime window" if 14 <= ev["days_until"] <= 45 else (
            "closing fast" if ev["days_until"] < 14 else "on the horizon")
        where = ", ".join(x for x in (ev["start"], ev.get("region") or "") if x)
        opps.append(Opportunity(
            kind="event-coverage",
            title=f"Preview: {ev['title']} ({ev['days_until']}d out)",
            target=f"/whats-on/{ev['slug']}/",
            days_until=ev["days_until"],
            major=ev["major"],
            seasonal=True,  # dated events are inherently timely
            expires_on=ev.get("end") or ev["start"],
            rationale=(f"{ev['title']} is {ev['days_until']} days out ({where}): {window}. "
                       f"Advance-planning searches build now; "
                       f"a preview page needs lead time to index and rank by event week."),
            recommended_action=("Ensure a dedicated, indexable preview page exists with dates, "
                                "booking link, what-to-expect and internal links from the town "
                                "hub and What's On. Publish now, not event week."),
            suggested_desk="dispatch-desk",
        ))

    # 1. CTR fixes — surfaced with demand but not clicked. If the page ranks on
    #    page 1–2 it's a snippet problem (cheap fix); if it ranks deep, it's a
    #    ranking problem masquerading as a CTR miss (needs a stronger page).
    for row in gsc.get("ctr_opportunities", []):
        path = row["path"]
        key = ("ctr", path)
        if key in seen_targets:
            continue
        seen_targets.add(key)
        pos = row["avg_position"]
        snippet_only = pos <= 15
        if snippet_only:
            title = f"Rewrite title & meta description for {path}"
            rationale = (f"Google surfaces this at avg position {pos:.0f} on "
                         f"{row['impressions']} impressions but CTR is {row['ctr']:.2f}%: "
                         f"a snippet problem, not a ranking problem.")
            action = ("Rewrite the <title> and meta description to match query intent and add "
                      "a benefit/number; add a direct-answer first line under the H1.")
        else:
            title = f"Strengthen ranking + snippet for {path}"
            rationale = (f"Surfaced on {row['impressions']} impressions but stuck at avg position "
                         f"{pos:.0f} with {row['ctr']:.2f}% CTR: real demand, weak page. Needs to "
                         f"climb before the snippet matters.")
            action = ("Deepen the page (content, schema, internal links) to climb toward page 1, "
                      "then sharpen the title/meta for the winning query.")
        opps.append(Opportunity(
            kind="ctr-fix",
            title=title,
            target=path,
            impressions=row["impressions"],
            avg_position=pos,
            ctr=row["ctr"],
            seasonal=seasonal_match(path),
            rationale=rationale,
            recommended_action=action,
            suggested_desk=route_desk(path),
        ))

    # 2. Striking distance — queries at pos 4–20 with demand.
    for row in gsc.get("striking_distance", []):
        q = row["query"]
        key = ("sd", q.lower())
        if key in seen_targets:
            continue
        seen_targets.add(key)
        # The page that really ranks, when the report says; otherwise a guess.
        page = row.get("page") or _best_page_for_query(q, gsc)
        opps.append(Opportunity(
            kind="striking-distance",
            title=f"Push '{q}' onto page 1",
            target=page,
            query=q,
            impressions=row["impressions"],
            avg_position=row["avg_position"],
            seasonal=seasonal_match(q),
            rationale=(f"'{q}' ranks avg position {row['avg_position']:.1f} on "
                       f"{row['impressions']} impressions. A small, targeted improvement "
                       f"could reach page 1 and start earning clicks."),
            recommended_action=("Strengthen the ranking page for this exact query: expand the "
                                "relevant section, add an FAQ answer, tighten the H1/intro, add "
                                "internal links from related hub pages."),
            suggested_desk=route_desk(page, q),
        ))

    # 3. Coverage gaps — competitors cover it, we don't.
    for gap in comp.get("gaps", []):
        topic = gap.get("topic", "")
        if not topic:
            continue
        opps.append(Opportunity(
            kind="coverage-gap",
            title=f"Cover: {topic}",
            target=gap.get("pi_opportunity", topic),
            impressions=0,
            seasonal=seasonal_match(topic),
            rationale=(f"{gap.get('competitor', 'A competitor')} covers this; PI does not. "
                       f"Priority {gap.get('priority', 'MEDIUM')}."),
            recommended_action=gap.get("pi_opportunity", "Commission a definitive PI version."),
            suggested_desk=route_desk(topic),
        ))

    # 3b. Seasonal coverage prompts — always keep the calendar in the queue.
    for theme in themes[:4]:
        opps.append(Opportunity(
            kind="coverage-gap",
            title=f"Seasonal angle: {theme} ({season})",
            target=f"{theme} on the Mornington Peninsula",
            seasonal=True,
            rationale=f"'{theme}' is peak-intent for {season}; own the seasonal query now.",
            recommended_action=(f"Commission or refresh a definitive {season} '{theme}' guide with "
                                "current venues, booking links and an FAQ block."),
            suggested_desk=route_desk(theme),
        ))

    # 4. Freshness — important pages going stale.
    for stale in inv.get("stale", [])[:8]:
        path = stale["path"]
        opps.append(Opportunity(
            kind="freshness",
            title=f"Refresh {path} (stale {stale['age_days']}d)",
            target=path,
            seasonal=seasonal_match(path),
            rationale=f"Last updated {stale['age_days']} days ago: freshness signal decaying.",
            recommended_action=("Verify venues/hours/prices, refresh seasonal framing, update "
                                "lastVerified, add one new internal link."),
            suggested_desk=route_desk(path),
        ))

    for opp in opps:
        score_opportunity(opp, gsc)
    opps.sort(key=lambda o: -o.score)
    return opps


def screen_opportunities(opps: list[Opportunity], freshness: dict | None = None,
                         event_index: dict | None = None) -> tuple[list[Opportunity], list[dict]]:
    """Split scored opportunities into (queue, withheld).

    Two things keep an opportunity out of the commissioning queue:

      expired-event  its target is the page of an event that has ended, been
                     cancelled or had its listing retired. Never comes back.
      stale-input    it was derived from an input that is past its age limit
                     (see KIND_INPUT). Returns once that input is fresh again.

    Withheld items keep their score and gain `withheld_class` and
    `withheld_reason`; they are reported, never ranked. Order is preserved."""
    queue: list[Opportunity] = []
    withheld: list[dict] = []
    for opp in opps:
        event = event_for_path(opp.target, event_index)
        if event and event["blocked"]:
            withheld.append({**asdict(opp), "withheld_class": "expired-event",
                             "withheld_reason": f"{event['blocked']}: {event['title']}"})
            continue
        if event and event["expires_on"] and not opp.expires_on:
            opp.expires_on = event["expires_on"]
        source = KIND_INPUT.get(opp.kind)
        f = (freshness or {}).get(source) if source else None
        if f is not None and not f["usable"]:
            withheld.append({**asdict(opp), "withheld_class": "stale-input",
                             "withheld_input": source,
                             "withheld_reason": describe_input(source, f)})
            continue
        queue.append(opp)
    return queue, withheld


def _best_page_for_query(query: str, gsc: dict) -> str:
    """Guess which existing page ranks for a query, by keyword overlap with top pages."""
    words = set(re.findall(r"[a-z]+", query.lower()))
    best, best_overlap = "", 0
    for p in gsc.get("top_pages", []):
        pw = set(re.findall(r"[a-z]+", p["path"].lower()))
        overlap = len(words & pw)
        if overlap > best_overlap:
            best, best_overlap = p["path"], overlap
    return best or "(new or unidentified page)"


def score_opportunity(opp: Opportunity, gsc: dict) -> None:
    """The scoring model. Interpretable, weighted, bounded contributions."""
    b = {}
    # Demand: log-damped impressions.
    b["impressions"] = WEIGHTS["impressions"] * math.log10(opp.impressions + 1)
    # Position proximity: 1.0 at page-1 top, decaying to 0 by ~position 30.
    if opp.avg_position > 0:
        proximity = max(0.0, min(1.0, (30 - opp.avg_position) / 30))
    else:
        proximity = 0.3  # unknown position (new piece) gets a modest baseline
    b["position_proximity"] = WEIGHTS["position_proximity"] * proximity
    # CTR deficit: how far below an expected CTR for the position we sit.
    expected = _expected_ctr(opp.avg_position)
    deficit = max(0.0, expected - (opp.ctr / 100.0)) if opp.avg_position else 0.0
    b["ctr_deficit"] = WEIGHTS["ctr_deficit"] * (deficit * 10)  # scale to comparable range
    # Seasonal relevance.
    b["seasonal"] = WEIGHTS["seasonal"] * (1.0 if opp.seasonal else 0.0)
    # Coverage-gap / freshness structural nudges by kind.
    b["coverage_gap"] = WEIGHTS["coverage_gap"] * (1.0 if opp.kind == "coverage-gap" else 0.0)
    b["freshness"] = WEIGHTS["freshness"] * (1.0 if opp.kind == "freshness" else 0.0)
    # Indexation — strongest structural weight; hub pages boosted (they gate
    # crawl equity for everything beneath them).
    if opp.kind == "indexation":
        segs = [s for s in opp.target.strip("/").split("/") if s]
        hub_boost = 1.0 if len(segs) <= 1 else 0.65
        b["indexation"] = WEIGHTS["indexation"] * hub_boost
    else:
        b["indexation"] = 0.0
    # Event coverage: urgency by how well the event sits in the advance-coverage
    # window, boosted for significant (ticketed / one-off) events.
    if opp.kind == "event-coverage":
        b["event_coverage"] = WEIGHTS["event_coverage"] * _event_urgency(opp.days_until) \
            * (1.0 if opp.major else 0.55)
    else:
        b["event_coverage"] = 0.0

    raw = sum(b.values())
    effort = EFFORT_BONUS.get(opp.kind, 1.0)
    learned = _KIND_MULT.get(opp.kind, 1.0)  # adaptive multiplier from measured outcomes
    opp.score = round(raw * effort * learned, 3)
    opp.score_breakdown = {k: round(v, 3) for k, v in b.items()}
    opp.score_breakdown["effort_multiplier"] = effort
    opp.score_breakdown["learned_multiplier"] = round(learned, 3)


def _event_urgency(days: int) -> float:
    """Advance-coverage urgency curve. Peaks in the 14–45 day window where a
    preview page has lead time to rank; lower when too soon (can't build ranking)
    or too far (not urgent yet)."""
    if days is None or days < 0:
        return 0.0
    if days <= 7:
        return 0.45          # too late to build fresh ranking, still worth a mention
    if days <= 14:
        return 0.8
    if days <= 45:
        return 1.0           # prime advance-coverage window
    if days <= 90:
        return max(0.2, 1.0 - (days - 45) / 45 * 0.8)
    return 0.15


def _expected_ctr(position: float) -> float:
    """Rough organic CTR curve by position (fraction). Used to size CTR deficit."""
    if position <= 0:
        return 0.0
    table = {1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
             6: 0.05, 7: 0.04, 8: 0.035, 9: 0.03, 10: 0.025}
    p = int(round(position))
    if p in table:
        return table[p]
    if p < 1:
        return 0.28
    return max(0.005, 0.02 - (p - 10) * 0.0005)


# ── Attribution ledger (the "continually enhance / learns" mechanism) ────────
# When an opportunity is acted on, we record it here with the page's metrics at
# the time of action. On later runs we look up the page's current metrics and
# measure whether the fix actually moved anything — turning the strategy from a
# scorer into a learner. Append-only JSONL so history is never lost.

def _merge_pages(rows: list[dict]) -> dict:
    """path -> metrics, folding rows that normalise to the same path into one.
    Older reports list http/https and slash variants of a page separately; kept
    apart, the last row silently overwrote the others."""
    grouped: dict = {}
    for p in rows:
        grouped.setdefault(p["path"], []).append(p)
    out = {}
    for path, group in grouped.items():
        if len(group) == 1:
            p = group[0]
            out[path] = {"impressions": p["impressions"], "clicks": p.get("clicks"),
                         "ctr": p["ctr"], "avg_position": p["avg_position"]}
            continue
        impressions = sum(p["impressions"] for p in group)
        merged = {"impressions": impressions, "clicks": None, "ctr": 0.0, "avg_position": 0.0}
        if impressions:
            merged["avg_position"] = round(
                sum(p["avg_position"] * p["impressions"] for p in group) / impressions, 1)
            if all(p.get("clicks") is not None for p in group):
                merged["clicks"] = sum(p["clicks"] for p in group)
                merged["ctr"] = round(merged["clicks"] / impressions * 100, 2)
            else:
                merged["ctr"] = round(
                    sum(p["ctr"] * p["impressions"] for p in group) / impressions, 2)
        out[path] = merged
    return out


def _metric_maps(gsc: dict):
    """Build path->metrics and query->metrics lookups from GSC data."""
    by_query = {}
    # The complete page table when the report has one, else the top-25 table,
    # topped up with any CTR-opportunity page the top-25 did not list.
    by_path = _merge_pages(gsc.get("pages") or gsc.get("top_pages", []))
    for path, metrics in _merge_pages(gsc.get("ctr_opportunities", [])).items():
        by_path.setdefault(path, {k: metrics[k] for k in ("impressions", "ctr", "avg_position")})
    for q in gsc.get("top_queries", []):
        by_query[q["query"].lower()] = {"impressions": q["impressions"], "clicks": q["clicks"],
                                        "avg_position": q["avg_position"]}
    for q in gsc.get("striking_distance", []):
        by_query.setdefault(q["query"].lower(), {"impressions": q["impressions"],
                                                 "avg_position": q["avg_position"]})
    return by_path, by_query


def record_action(target: str, kind: str, query: str, note: str,
                  gsc: dict, today: date, cov: dict | None = None) -> dict:
    """Append an actioned opportunity to the ledger with its current baseline.

    The baseline records what it was measured against (`baseline_level`: the
    query or the page) and how old the data was (`baseline_as_of`), so a later
    run compares like with like and can tell a baseline taken from old data."""
    by_path, by_query = _metric_maps(gsc)
    path = _norm_path(target)
    level, baseline = "page", {}
    if query and query.lower() in by_query:
        level, baseline = "query", by_query[query.lower()]
    elif path in by_path:
        baseline = by_path[path]
    elif gsc.get("pages_complete"):
        baseline = {"impressions": 0}  # complete table and not in it: no impressions
    entry = {
        "recorded": _now_iso(), "date": today.isoformat(),
        "kind": kind, "target": target, "query": query, "note": note,
        "baseline": {k: baseline.get(k) for k in ("impressions", "ctr", "avg_position")},
        "baseline_level": level,
        "baseline_as_of": gsc.get("data_through") or gsc.get("period_end") or "",
    }
    inspected = ((cov or {}).get("by_path") or {}).get(path)
    if inspected:
        entry["baseline"]["index_verdict"] = inspected["verdict"]
    STRATEGY_DIR.mkdir(parents=True, exist_ok=True)
    with ACTIONED_LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


def load_actioned() -> list[dict]:
    if not ACTIONED_LEDGER.exists():
        return []
    out = []
    for line in ACTIONED_LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def _post_action_window(acted: date | None, start: date | None, end: date | None) -> tuple[bool, str, str]:
    """Is the search window a clean read of what happened AFTER an action?

    Returns (ready, waiting_on, reason). Search data that ends before the action
    cannot say anything about it, and a window that still contains pre-action
    days mixes before with after. With no dates to go on (hand-built inputs)
    the window is taken at face value."""
    if acted is None or end is None:
        return True, "", ""
    if end <= acted:
        return False, "search-data", f"search data ends {end.isoformat()}, before this action"
    if start is not None and start <= acted:
        return (False, "post-action-window",
                f"search window ({start.isoformat()} to {end.isoformat()}) still includes "
                f"days before the action")
    return True, "", ""


def _compare(base: dict, cur: dict) -> tuple[bool | None, list[str]]:
    """Movement between a baseline and current metrics. Position is better when
    lower; CTR and impressions better when higher. Returns (improved, parts);
    improved is None when the two share nothing comparable."""
    parts, win, comparable = [], False, False
    bpos, cpos = base.get("avg_position"), cur.get("avg_position")
    bctr, cctr = base.get("ctr"), cur.get("ctr")
    if bpos is not None and cpos is not None:
        comparable = True
        dp = round(cpos - bpos, 1)
        parts.append(f"position {bpos}→{cpos} ({'▲' if dp < 0 else '▼' if dp > 0 else '–'}{abs(dp)})")
        win = win or dp < 0
    if bctr is not None and cctr is not None:
        comparable = True
        dc = round(cctr - bctr, 2)
        parts.append(f"CTR {bctr}%→{cctr}% ({'▲' if dc > 0 else '▼' if dc < 0 else '–'}{abs(dc)})")
        win = win or dc > 0
    if not comparable and base.get("impressions") == 0 and cur.get("impressions"):
        comparable, win = True, True
        parts.append(f"impressions 0→{cur['impressions']} (now surfacing)")
    return (win if comparable else None), parts


def evaluate_actioned(actioned: list[dict], gsc: dict, cov: dict | None = None) -> dict:
    """Measure movement on actioned pages/queries since they were recorded.

    An item is only measured against evidence gathered after the action:

      - search metrics count once the whole search window post-dates the action
      - an indexation fix is judged first on URL inspection (is the page indexed
        now?), then on whether the page has started earning impressions, since
        Google only shows pages it has indexed
      - a page absent from a complete page table had no impressions; absent
        from a top-25 table says nothing

    Anything else stays pending, with the reason in `detail` and `waiting_on`.
    Pending items are never counted in the hit rates the model adapts from."""
    by_path, by_query = _metric_maps(gsc)
    pages_complete = bool(gsc.get("pages_complete"))
    win_start = _day(gsc.get("period_start"))
    win_end = _day(gsc.get("data_through") or gsc.get("period_end"))
    cov = cov or {}
    cov_day = _day(cov.get("as_of"))
    cov_paths = cov.get("by_path") or {}

    results, hits, measurable = [], {}, 0
    for a in actioned:
        kind = a.get("kind", "")
        path = _norm_path(a["target"])
        query = (a.get("query") or "").lower()
        base = a.get("baseline") or {}
        acted = _day(a.get("date"))
        row = {"target": a["target"], "kind": kind, "query": a.get("query", ""),
               "since": a.get("date"), "moved": None, "detail": "not yet re-measured",
               "waiting_on": "evidence"}
        ready, waiting_on, wait_reason = _post_action_window(acted, win_start, win_end)
        outcome, detail = None, ""

        if kind == "indexation":
            inspected = cov_paths.get(path)
            inspected_after = inspected is not None and inspected["verdict"] not in ("ERROR", "UNKNOWN", "") \
                and (acted is None or cov_day is None or cov_day > acted)
            surfaced = by_path.get(path) if ready else None
            if inspected_after and inspected["verdict"] == "PASS":
                outcome, detail = True, f"indexed (inspected {cov.get('as_of') or 'this run'})"
            elif surfaced and surfaced.get("impressions"):
                outcome = True
                detail = (f"indexed and surfacing: {surfaced['impressions']} impressions "
                          f"at avg position {surfaced['avg_position']}")
            elif inspected_after:
                outcome = False
                detail = f"still not indexed as of {cov.get('as_of') or 'this run'}: {inspected['coverage']}"
            elif not ready:
                row["waiting_on"], detail = waiting_on, f"not yet re-measured: {wait_reason}"
            else:
                row["waiting_on"] = "index-evidence"
                detail = ("not yet re-measured: no index evidence (page not in the inspected "
                          "set and no impressions in the window)")
        elif not ready:
            row["waiting_on"], detail = waiting_on, f"not yet re-measured: {wait_reason}"
        else:
            level = a.get("baseline_level") or ("query" if query and query in by_query else "page")
            cur = by_query.get(query) if level == "query" else by_path.get(path)
            if cur is None and level == "query":
                row["waiting_on"] = "query-data"
                detail = "not yet re-measured: query is not in the current top queries"
            elif cur is None and pages_complete and (base.get("impressions") or 0) > 0:
                outcome = False
                detail = f"no impressions in the current window (was {base['impressions']})"
            elif cur is None:
                row["waiting_on"] = "page-data"
                detail = "not yet re-measured: page is not in the current search data"
            else:
                outcome, parts = _compare(base, cur)
                if outcome is None:
                    row["waiting_on"] = "baseline"
                    detail = "not measurable: no baseline was recorded to compare against"
                else:
                    detail = "; ".join(parts)

        if outcome is not None:
            measurable += 1
            row["moved"], row["waiting_on"] = outcome, ""
            k = kind or "?"
            hits.setdefault(k, [0, 0])
            hits[k][1] += 1
            if outcome:
                hits[k][0] += 1
        row["detail"] = detail or row["detail"]
        results.append(row)
    hit_rate = {k: {"wins": v[0], "measured": v[1]} for k, v in hits.items()}
    return {"count": len(actioned), "measurable": measurable,
            "awaiting_search_data": sum(1 for r in results if r["waiting_on"] == "search-data"),
            "results": results, "hit_rate_by_kind": hit_rate}


def load_model_weights() -> dict:
    """Load the persisted adaptive per-kind multipliers (defaults to 1.0)."""
    base = {k: 1.0 for k in ALL_KINDS}
    if MODEL_WEIGHTS_FILE.exists():
        try:
            saved = json.loads(MODEL_WEIGHTS_FILE.read_text(encoding="utf-8"))
            for k, v in (saved.get("kind_multiplier") or {}).items():
                if k in base and isinstance(v, (int, float)):
                    base[k] = float(v)
        except (json.JSONDecodeError, OSError):
            pass
    return base


def adapt_weights(prev: dict, hit_rate: dict, today: date) -> tuple[dict, list]:
    """Nudge per-kind multipliers toward fix types that demonstrably work.
    Only adapts a kind with >= ADAPT_MIN_MEASURED outcomes; otherwise holds.
    Returns (new_multipliers, change_notes)."""
    lo, hi = ADAPT_CLAMP
    new = dict(prev)
    notes = []
    for kind in ALL_KINDS:
        stats = hit_rate.get(kind)
        if not stats or stats.get("measured", 0) < ADAPT_MIN_MEASURED:
            continue  # not enough evidence — hold steady (anti-noise guard)
        win_rate = stats["wins"] / stats["measured"]
        # target in [0.8, 1.2]: 0% wins -> 0.8, 100% wins -> 1.2
        target = 0.8 + 0.4 * win_rate
        cur = prev.get(kind, 1.0)
        adjusted = cur * (1 - ADAPT_SMOOTHING) + target * ADAPT_SMOOTHING
        adjusted = round(max(lo, min(hi, adjusted)), 4)
        if abs(adjusted - cur) >= 0.001:
            notes.append(f"{kind}: {cur:.3f} → {adjusted:.3f} "
                         f"({stats['wins']}/{stats['measured']} wins)")
        new[kind] = adjusted
    return new, notes


def save_model_weights(mult: dict, notes: list, today: date) -> None:
    STRATEGY_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"updated": today.isoformat(), "kind_multiplier": mult,
               "last_change": notes}
    MODEL_WEIGHTS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


# ── Self-monitoring (closes the "silent alert paths" gap for the loop) ───────
# A fully-automated loop must notice when it stalls. This inspects the loop's own
# cadence + inputs and emits a health status the daily workflow can alert on,
# instead of failures being invisible until someone reads a report.

def detect_feed(env: dict | None = None) -> dict:
    """What this environment knows about the Search Console feed.

    `credentials` is whether a headless token is available here (the same two
    places ops/scripts/gsc_client.py looks). `refresh` is the outcome of the
    pull the orchestrator just attempted, passed down as PI_GSC_REFRESH, e.g.
    {"search": "no-credentials", "coverage": "no-credentials"}. Reason codes
    only: no error text and nothing secret ever travels this way."""
    env = os.environ if env is None else env
    feed = {"credentials": "none"}
    if (env.get("GSC_TOKEN_JSON") or "").strip():
        feed["credentials"] = "env-token"
    elif (REPO_ROOT / "ops/tokens/gsc-token.json").exists():
        feed["credentials"] = "token-file"
    try:
        refresh = json.loads(env.get("PI_GSC_REFRESH") or "null")
    except json.JSONDecodeError:
        refresh = None
    if isinstance(refresh, dict):
        feed["refresh"] = {k: str(refresh[k]) for k in ("search", "coverage") if k in refresh}
    return feed


FEED_CAUSES = {
    "no-credentials": ("the job has no Search Console credentials (the GSC_TOKEN_JSON secret "
                       "is not set). Fix: ops/gsc-auth/README.md."),
    "auth-failed": ("Google rejected the stored token (expired, revoked or malformed). Mint a "
                    "new one and replace the GSC_TOKEN_JSON secret: ops/gsc-auth/README.md."),
    "api-error": ("the Search Console API refused or failed the request. See the gsc-refresh "
                  "step in the run log."),
    "no-data": ("the pull authenticated but the property returned no rows. Check that the "
                "token's Google account can see the Search Console property."),
    "missing-deps": "the Google client libraries are not installed where the job runs.",
    "timeout": "the pull timed out. See the gsc-refresh step in the run log.",
    "error": "the pull crashed. See the gsc-refresh step in the run log.",
}


def feed_cause(feed: dict | None, source: str = "search") -> str:
    """Why the feed is not delivering, as far as this run can tell ("" if unknown)."""
    if not feed:
        return ""
    outcome = (feed.get("refresh") or {}).get(source)
    if outcome in FEED_CAUSES:
        return "Cause: " + FEED_CAUSES[outcome]
    if outcome == "ok":
        return ""
    if feed.get("credentials") == "none":
        return "Cause: " + FEED_CAUSES["no-credentials"]
    if feed.get("credentials"):
        return ("Credentials are present, so the pull itself is failing. See the gsc-refresh "
                "step in the run log.")
    return ""


def check_health(today: date, inputs_used: list, learning: dict,
                 freshness: dict | None = None, feed: dict | None = None) -> dict:
    """Assess whether the automated strategy loop is running and fed. Returns
    {status, notes, cause} where status is ok | warning | degraded | stalled.

    degraded means the loop runs on time but has no usable search data, so it
    cannot see performance or learn. Notes are ordered most serious first: the
    brief prints the first one beside the badge. `cause` says why the Search
    Console feed is not delivering, when this run can tell."""
    flagged: list[tuple[int, str]] = []

    def flag(level: str, text: str) -> None:
        flagged.append((HEALTH_RANK[level], text))

    # Cadence: how long since the loop last produced a snapshot?
    snaps = sorted(SNAPSHOT_DIR.glob("*.json")) if SNAPSHOT_DIR.exists() else []
    if not snaps:
        flag("ok", "No prior snapshots: first run or history lost.")
    else:
        try:
            last = date.fromisoformat(snaps[-1].stem)
            gap = (today - last).days
            if gap >= 3:
                flag("stalled", f"Loop stalled: {gap} days since last snapshot ({last}).")
            elif gap == 2:
                flag("warning", f"Loop may be slipping: {gap} days since last snapshot.")
        except ValueError:
            pass
        recent = sum(1 for s in snaps if s.stem >= (today - _days(7)).isoformat())
        if recent < 3 and len(snaps) >= 3:
            flag("warning", f"Only {recent} snapshot(s) in the last 7 days. Expected about 7.")

    # Input health: is performance data actually flowing, and is it current?
    search = (freshness or {}).get("search")
    search_usable = True
    cause = ""   # why the feed is not delivering, kept apart from the facts
    if search is None:
        # Caller supplied no freshness model: presence is all we can check.
        search_usable = any(i.startswith("gsc-search") for i in inputs_used)
        if not search_usable:
            flag("degraded", "No Search Console search data this run: the strategy is running "
                             "without performance signal.")
    elif not search["usable"]:
        search_usable = False
        lead = ("No Search Console search data this run: the strategy is running without "
                "performance signal." if search["state"] == "missing"
                else "Stale search data. " + describe_input("search", search))
        cause = feed_cause(feed)
        flag("degraded", lead + " Search-derived priorities are withheld.")
    elif search["state"] == "aging":
        cause = feed_cause(feed)
        flag("warning",
             f"Search data is {search['age_days']} days old (ends {search['as_of']}). A working "
             f"daily pull trails by about 3 days, so recent pulls are failing. It is withheld "
             f"as stale after {search['stale_after_days']} days.")

    coverage = (freshness or {}).get("coverage")
    if coverage is None:
        if not any(i.startswith("gsc-coverage") for i in inputs_used):
            flag("ok", "No GSC coverage data: indexation opportunities cannot be assessed.")
    elif coverage["state"] == "missing":
        flag("ok", "No GSC coverage data: indexation opportunities cannot be assessed.")
    elif not coverage["usable"]:
        cause = cause or feed_cause(feed, "coverage")
        flag("warning", "Stale index coverage. " + describe_input("coverage", coverage)
             + " Indexation items are withheld.")

    inventory = (freshness or {}).get("inventory")
    if inventory is not None and inventory["available"] and not inventory["usable"]:
        flag("warning", "Stale content inventory. " + describe_input("inventory", inventory)
             + " Page counts are unreliable and freshness items are withheld.")

    # Learning health: is the loop accumulating measurable outcomes over time?
    if learning.get("count", 0) > 0 and learning.get("measurable", 0) == 0:
        if not search_usable or learning.get("awaiting_search_data"):
            flag("ok", f"Learning loop paused: {learning['count']} actioned item(s) cannot be "
                       "re-measured until search data newer than the actions arrives.")
        else:
            flag("ok", "Actions recorded but none measurable yet: waiting on a full search "
                       "window after each action, or on index evidence.")

    status = "ok"
    for name, rank in HEALTH_RANK.items():
        if any(r == rank for r, _ in flagged) and rank > HEALTH_RANK[status]:
            status = name
    notes = [text for _, text in sorted(flagged, key=lambda item: -item[0])]
    if not notes:
        notes.append("Loop healthy: running on cadence with current performance data.")
    return {"status": status, "checked": today.isoformat(), "notes": notes,
            "cause": cause, "feed": feed or {}}


def _days(n: int):
    return timedelta(days=n)


# ── Snapshot + diff (the "improves each day" mechanism) ──────────────────────
def load_prev_snapshot(snapshot_dir: Path, today: date) -> dict | None:
    if not snapshot_dir.exists():
        return None
    snaps = sorted(snapshot_dir.glob("*.json"))
    snaps = [s for s in snaps if s.stem < today.isoformat()]
    if not snaps:
        return None
    try:
        return json.loads(snaps[-1].read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def compute_diff(prev: dict | None, metrics: dict, queue: list[dict],
                 gsc_period: str = "", search_usable: bool = True) -> dict:
    if not prev:
        return {"first_run": True, "notes": ["First strategy snapshot: no prior day to compare."]}
    pm = prev.get("metrics", {})
    diff = {"first_run": False, "since": prev.get("date"), "deltas": {}, "notes": []}
    for k in ("total_clicks", "total_impressions", "avg_position", "open_opportunities"):
        if metrics.get(k) is not None and pm.get(k) is not None:
            delta = round(metrics[k] - pm[k], 2)
            diff["deltas"][k] = delta
    same_window = bool(gsc_period) and prev.get("gsc_period") == gsc_period
    if not search_usable:
        # Subtracting a stale figure from itself is not a trend.
        diff["notes"].append("Search data is stale, so there is no search movement to report.")
    elif same_window:
        diff["notes"].append(f"Same search window as the last snapshot ({gsc_period}): "
                             "no new search data to compare.")
    else:
        # Position is better when lower: annotate direction.
        ap = diff["deltas"].get("avg_position")
        if ap is not None:
            diff["notes"].append(
                f"Average position {'improved' if ap < 0 else 'slipped' if ap > 0 else 'held'} "
                f"by {abs(ap):.2f}.")
        clk = diff["deltas"].get("total_clicks")
        if clk is not None:
            diff["notes"].append(
                f"Clicks {'up' if clk > 0 else 'down' if clk < 0 else 'flat'} {abs(int(clk))} vs last snapshot.")
    prev_top = {o.get("target") for o in prev.get("commissioning_queue", [])[:5]}
    now_top = {o.get("target") for o in queue[:5]}
    entered = now_top - prev_top
    if entered:
        diff["notes"].append(f"New into top-5 priorities: {', '.join(sorted(entered))[:300]}")
    return diff


# ── Rendering ────────────────────────────────────────────────────────────────
_EM_DASH = chr(0x2014)   # spelled by code point: the house rule applies to this file too
_EM_DASH_RE = re.compile(rf"\s*{_EM_DASH}\s*")


def house_style(value):
    """Enforce the no-em-dash house rule on anything this module emits. Titles
    and queries arrive from event records and from searchers, so the engine's
    own wording being clean is not enough. Recurses through dicts and lists."""
    if isinstance(value, str):
        return _EM_DASH_RE.sub(" - ", value) if _EM_DASH in value else value
    if isinstance(value, list):
        return [house_style(v) for v in value]
    if isinstance(value, dict):
        return {k: house_style(v) for k, v in value.items()}
    return value


def _known(value, suffix: str = "") -> str:
    return "not known" if value is None else f"{value}{suffix}"


def _stale_banner(state: dict) -> list[str]:
    """The block that opens the brief when any dated input is past its limit."""
    fresh = state.get("freshness", {})
    stale = [name for name in ("search", "coverage", "inventory")
             if fresh.get(name, {}).get("available") and not fresh[name]["usable"]]
    missing_search = fresh.get("search", {}).get("state") == "missing"
    if not stale and not missing_search:
        return []
    held = [w for w in state.get("withheld", []) if w.get("withheld_class") == "stale-input"]
    lines = ["> **STALE DATA. Do not treat this brief as a current picture of search performance.**", ">"]
    if missing_search:
        lines.append("> - " + describe_input("search", fresh["search"]))
    for name in stale:
        lines.append("> - " + describe_input(name, fresh[name]))
    lines.append(">")
    if held:
        lines.append(f"> {len(held)} item(s) built on that data are withheld from the queue "
                     "below. They return when a current pull lands.")
    cause = state.get("health", {}).get("cause")
    if cause:
        lines.append("> " + cause)
    lines.append("")
    return lines


def render_markdown(state: dict) -> str:
    m = state["metrics"]
    fresh = state.get("freshness", {})
    search = fresh.get("search", {"usable": True, "state": "fresh"})
    coverage = fresh.get("coverage", {"usable": True, "state": "fresh"})
    inventory = fresh.get("inventory", {"usable": True, "state": "fresh"})
    last = state.get("last_known", {})
    md = ["# Peninsula Insider: Content Strategy", ""]
    md += _stale_banner(state)
    md.append(f"**North star:** {NORTH_STAR}")
    md.append("")
    h = state.get("health", {})
    if h:
        badge = HEALTH_BADGE.get(h.get("status"), h.get("status", "?"))
        md.append(f"**Loop health:** {badge}. {h['notes'][0]}")
        for note in h["notes"][1:]:
            md.append(f"- {note}")
        md.append("")
    md.append(f"**Generated:** {state['generated_at']}  ")
    md.append(f"**Season:** {state['season'].title()}  ")
    md.append(f"**Inputs used:** {', '.join(state['inputs_used']) or 'none available'}  ")
    if state.get("inputs_stale"):
        md.append(f"**Inputs set aside as stale:** {', '.join(state['inputs_stale'])}  ")
    md.append("")
    md.append("## Where we stand")
    md.append("")

    def stale_tag(f: dict) -> str:
        if f.get("usable", True) or f.get("state") == "missing":
            return ""
        if f.get("age_days") is None:
            return " (undated)"
        return f" (stale: {f['age_days']} days old)"

    if not search.get("usable", True) and search.get("state") != "missing":
        md.append(f"_Search figures below are the last known values, for a period that ended "
                  f"{search.get('as_of') or 'on an unknown date'}. They are not today's numbers._")
        md.append("")
    search_values = m if search.get("usable", True) else last.get("search", {})
    cov_values = m if coverage.get("usable", True) else last.get("coverage", {})
    tag_s, tag_c, tag_i = stale_tag(search), stale_tag(coverage), stale_tag(inventory)
    md.append("| Metric | Value |")
    md.append("|---|---|")
    md.append(f"| Search period | {state.get('gsc_period') or 'not known'}{tag_s} |")
    md.append(f"| Total clicks | {_known(search_values.get('total_clicks'))}{tag_s} |")
    md.append(f"| Total impressions | {_known(search_values.get('total_impressions'))}{tag_s} |")
    md.append(f"| Avg position | {_known(search_values.get('avg_position'))}{tag_s} |")
    md.append(f"| Pages with search impressions | "
              f"{_known(search_values.get('pages_with_impressions'))}{tag_s} |")
    inspected = cov_values.get("pages_inspected")
    of = f" of {inspected} inspected" if inspected else ""
    on = f" on {coverage['as_of']}" if inspected and coverage.get("as_of") else ""
    md.append(f"| Tracked pages indexed by Google | "
              f"{_known(cov_values.get('pages_indexed'))}{of}{on}{tag_c} |")
    md.append(f"| Tracked pages not indexed | {_known(cov_values.get('pages_not_indexed'))}{tag_c} |")
    md.append(f"| Pages in sitemap | {m.get('pages_in_sitemap', 'not known')}{tag_i} |")
    md.append(f"| Open opportunities | {m.get('open_opportunities', 'not known')} |")
    md.append(f"| Withheld from the queue | {m.get('withheld', 0)} |")
    md.append("")

    diff = state["day_over_day"]
    md.append("## Day-over-day (is the strategy improving?)")
    md.append("")
    if diff.get("first_run"):
        md.append("_First strategy snapshot: baseline established. Improvement tracked from tomorrow._")
    else:
        md.append(f"_Compared with {diff.get('since')}._")
        md.append("")
        for note in diff.get("notes", []):
            md.append(f"- {note}")
    md.append("")

    learn = state.get("learning", {})
    md.append("## Did our fixes work? (learning loop)")
    md.append("")
    if not learn.get("count"):
        md.append("_No actions recorded yet. As opportunities are actioned they're logged to "
                  "`ops/strategy/actioned.jsonl` and their pages re-measured here each cycle._")
    else:
        hr = learn.get("hit_rate_by_kind", {})
        if hr:
            md.append("**Effectiveness by fix type** (pages that improved / measured):")
            md.append("")
            for kind, v in sorted(hr.items()):
                md.append(f"- `{kind}`: {v['wins']}/{v['measured']} improved")
            md.append("")
        md.append(f"Tracking {learn['count']} actioned item(s), "
                  f"{learn['measurable']} re-measured against GSC:")
        md.append("")
        for r in learn.get("results", [])[:12]:
            flag = "✅" if r["moved"] else ("⏳" if r["moved"] is None else "➖")
            label = r["query"] or r["target"]
            md.append(f"- {flag} [{r['kind']}] {label}: {r['detail']} _(since {r['since']})_")
    md.append("")

    model = state.get("model", {})
    md.append("## Model self-tuning")
    md.append("")
    md.append("The scoring model nudges its per-fix-type weights toward what "
              f"demonstrably works on this site (only after ≥{model.get('adapt_min_measured', 4)} "
              "measured outcomes, so early noise can't swing it):")
    md.append("")
    for kind, mult in model.get("kind_multiplier", {}).items():
        bar = "at baseline" if abs(mult - 1.0) < 0.001 else (
            f"**+{(mult-1)*100:.0f}%**" if mult > 1 else f"**{(mult-1)*100:.0f}%**")
        md.append(f"- `{kind}` × {mult:.3f} ({bar})")
    if model.get("changes"):
        md.append("")
        md.append("**Adjusted this cycle:** " + "; ".join(model["changes"]))
    md.append("")

    md.append("## This cycle's commissioning queue (ranked)")
    md.append("")
    md.append("Ranked by the strategy model (performance + season + coverage + effort). "
              "The orchestrator commissions from the top down.")
    md.append("")
    if not state["commissioning_queue"]:
        md.append("_Nothing to commission this cycle._")
        md.append("")
    for i, o in enumerate(state["commissioning_queue"][:12], 1):
        tag = {"indexation": "INDEX", "event-coverage": "EVENT", "ctr-fix": "CTR",
               "striking-distance": "RANK", "coverage-gap": "NEW",
               "freshness": "FRESH"}.get(o["kind"], o["kind"].upper())
        md.append(f"### {i}. [{tag} · score {o['score']}] {o['title']}")
        md.append(f"- **Desk:** {o['suggested_desk']}")
        if o.get("query"):
            md.append(f"- **Query:** `{o['query']}`")
        md.append(f"- **Why:** {o['rationale']}")
        md.append(f"- **Do:** {o['recommended_action']}")
        md.append("")

    withheld = state.get("withheld", [])
    if withheld:
        md.append("## Withheld from the queue")
        md.append("")
        md.append("Not ranked and not to be commissioned. Counted here so nothing disappears silently.")
        md.append("")
        for name in ("search", "coverage", "inventory"):
            items = [w for w in withheld if w.get("withheld_input") == name]
            if not items:
                continue
            kinds: dict = {}
            for w in items:
                kinds[w["kind"]] = kinds.get(w["kind"], 0) + 1
            breakdown = ", ".join(f"{n} {k}" for k, n in sorted(kinds.items()))
            md.append(f"- **{len(items)} waiting on current data** ({breakdown}). "
                      f"{items[0]['withheld_reason']}")
        expired = [w for w in withheld if w.get("withheld_class") == "expired-event"]
        if expired:
            pages: dict = {}
            for w in expired:
                pages.setdefault(w["target"], w["withheld_reason"])
            md.append(f"- **{len(expired)} dropped for good** across {len(pages)} event page(s): "
                      "the event is over, cancelled, or its listing is retired.")
            for target, reason in pages.items():
                md.append(f"  - `{target}` ({reason})")
        md.append("")

    md.append("## Coverage snapshot")
    md.append("")
    if tag_i:
        md.append(f"_From a sitemap last updated {inventory.get('as_of') or 'on an unknown date'}. "
                  "Counts will be out of date._")
        md.append("")
    for seg, n in sorted(state["coverage"].items(), key=lambda x: -x[1])[:12]:
        md.append(f"- `/{seg}/`: {n} pages")
    md.append("")
    md.append("---")
    md.append("*Generated by the Peninsula Insider Strategy Brain "
              "(`engine/strategy_engine.py`). This file is machine-owned; edit the model, not the output.*")
    return house_style("\n".join(md) + "\n")


# ── Main ─────────────────────────────────────────────────────────────────────
def build_state(today: date, feed: dict | None = None) -> dict:
    global _KIND_MULT
    season = get_season(today.month)
    gsc = load_gsc(GSC_REPORT)
    cov = load_coverage(GSC_COVERAGE)
    inv = load_inventory(SITEMAP, today)
    comp = load_competitive(COMPETITIVE_DIR)
    events = load_events(EVENTS_DIR, today)
    event_index = load_event_index(EVENTS_DIR, today)
    freshness = assess_freshness(gsc, cov, inv, today)

    # Learning + self-tuning must happen BEFORE scoring so the queue reflects the
    # adapted model. Measure past outcomes, adapt the per-kind multipliers, then
    # score everything with them.
    learning = evaluate_actioned(load_actioned(), gsc, cov)
    prev_weights = load_model_weights()
    new_weights, weight_notes = adapt_weights(prev_weights, learning["hit_rate_by_kind"], today)
    _KIND_MULT = new_weights

    # An input counts as "used" only when it is present AND current. One that is
    # present but past its age limit is listed apart, with the date it stops at.
    available = {"search": gsc["available"], "coverage": cov["available"], "inventory": inv["available"]}
    inputs_used, inputs_stale = [], []
    for name in ("search", "coverage", "inventory"):
        if not available[name]:
            continue
        if freshness[name]["usable"]:
            inputs_used.append(INPUT_SOURCES[name])
        else:
            inputs_stale.append(f"{INPUT_SOURCES[name]} ({freshness[name]['as_of'] or 'undated'})")
    if comp["available"]:
        inputs_used.append("competitive-scan")
    if events["available"]:
        inputs_used.append(f"events-calendar:{len(events['upcoming'])}-upcoming")
    inputs_used.append(f"seasonal-calendar:{season}")

    scored = build_opportunities(gsc, inv, comp, season, cov, events)
    opps, withheld = screen_opportunities(scored, freshness, event_index)

    search_metrics = {
        "total_clicks": int(_num(gsc["summary"].get("Total clicks", 0))) if gsc["available"] else 0,
        "total_impressions": int(_num(gsc["summary"].get("Total impressions", 0))) if gsc["available"] else 0,
        "avg_position": _num(gsc["summary"].get("Avg position (imp-weighted)", 0)) if gsc["available"] else 0.0,
        "pages_with_impressions": (int(_num(gsc["summary"]["Pages with impressions"]))
                                   if "Pages with impressions" in gsc["summary"] else None),
    }
    coverage_metrics = {
        "pages_indexed": cov["indexed"] if cov["available"] else None,
        "pages_not_indexed": len(cov["not_indexed"]) if cov["available"] else None,
        "pages_inspected": cov["inspected"] if cov["available"] else None,
    }
    # Figures from an input past its age limit are not today's figures. They are
    # kept under `last_known`, and published as null in `metrics`, so nothing
    # downstream can read April's clicks or an old "0 pages indexed" as current.
    last_known = {}
    if gsc["available"] and not freshness["search"]["usable"]:
        last_known["search"] = dict(search_metrics, as_of=freshness["search"]["as_of"])
        search_metrics = {k: None for k in search_metrics}
    if cov["available"] and not freshness["coverage"]["usable"]:
        last_known["coverage"] = dict(coverage_metrics, as_of=freshness["coverage"]["as_of"])
        coverage_metrics = {k: None for k in coverage_metrics}

    metrics = {
        **search_metrics,
        **coverage_metrics,
        "pages_in_sitemap": inv["total"],
        "open_opportunities": len(opps),
        "withheld": len(withheld),
    }

    queue = [asdict(o) for o in opps]
    prev = load_prev_snapshot(SNAPSHOT_DIR, today)
    period = (f"{gsc['period_start']} to {gsc['period_end']}"
              if gsc.get("period_start") and gsc.get("period_end") else gsc.get("period", ""))
    diff = compute_diff(prev, metrics, queue, period, freshness["search"]["usable"])

    state = {
        "generated_at": _now_iso(),
        "date": today.isoformat(),
        "north_star": NORTH_STAR,
        "season": season,
        "inputs_used": inputs_used,
        "inputs_stale": inputs_stale,
        "gsc_period": period,
        "freshness": freshness,
        "stale": bool(inputs_stale) or not freshness["search"]["usable"],
        "metrics": metrics,
        "last_known": last_known,
        "coverage": inv["sections"],
        "day_over_day": diff,
        "learning": learning,
        "model": {"kind_multiplier": new_weights, "changes": weight_notes,
                  "adapt_min_measured": ADAPT_MIN_MEASURED},
        "health": check_health(today, inputs_used, learning, freshness, feed),
        "commissioning_queue": queue,
        "withheld": withheld,
    }
    return house_style(state)


def _now_iso() -> str:
    try:
        return datetime.now(AEST).strftime("%Y-%m-%d %H:%M %Z") if AEST else datetime.now().isoformat()
    except Exception:
        return datetime.now().isoformat()


def usable_queue(state: dict, today: date) -> list[dict]:
    """The commissioning items a consumer may act on TODAY, from a state file.

    The engine screens the queue when it writes it, but a consumer can read a
    state file that is days old (the engine failed, or the file predates this
    guard). So the same two rules are applied again at the moment of reading,
    against today's date rather than the date the file was written:

      - an item past its `expires_on` (an event that has since happened) is gone
      - an item whose source data is, by now, past its age limit is held back

    A state that records no freshness (written before this guard) is judged on
    its search period alone; coverage and inventory items in it cannot be shown
    to be current and are held back."""
    recorded = state.get("freshness") or {}
    period_days = _iso_days(state.get("gsc_period", ""))
    as_of = {
        "search": (recorded.get("search") or {}).get("as_of") or (period_days[-1] if period_days else ""),
        "coverage": (recorded.get("coverage") or {}).get("as_of", ""),
        "inventory": (recorded.get("inventory") or {}).get("as_of", ""),
    }
    limits = {"search": SEARCH_STALE_AFTER_DAYS, "coverage": COVERAGE_STALE_AFTER_DAYS,
              "inventory": INVENTORY_STALE_AFTER_DAYS}
    now = {name: _input_freshness(bool(as_of[name]), as_of[name], today, limits[name])
           for name in as_of}
    written = _day(state.get("date"))
    out = []
    for o in state.get("commissioning_queue", []):
        expires = _day(o.get("expires_on"))
        if expires is None and o.get("kind") == "event-coverage" \
                and o.get("days_until") is not None and written is not None:
            expires = written + timedelta(days=int(o["days_until"]))  # pre-guard state files
        if expires is not None and expires < today:
            continue
        source = KIND_INPUT.get(o.get("kind"))
        if source and not now[source]["usable"]:
            continue
        out.append(o)
    return out


def load_commissioning_queue(limit: int | None = 5, today: date | None = None) -> list[dict]:
    """Helper for the orchestrator: read the top-N ranked commissions that are
    still safe to act on today (see usable_queue).
    Returns [] if no strategy has been generated yet (loop never blocks)."""
    if not STRATEGY_JSON.exists():
        return []
    try:
        state = json.loads(STRATEGY_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    today = today or (datetime.now(AEST).date() if AEST else date.today())
    queue = usable_queue(state, today)
    return queue if limit is None else queue[:limit]


def health_alert(state: dict) -> tuple[str, str]:
    """(title, markdown body) for the issue raised while the loop is unhealthy."""
    h = state["health"]
    held = [w for w in state.get("withheld", []) if w.get("withheld_class") == "stale-input"]
    title = f"Strategy loop {h['status']}: {h['notes'][0].split('.')[0][:90]}"
    lines = [
        f"The daily content strategy is **{h['status']}** as of {h['checked']}.",
        "",
        "**What the loop found**",
        "",
    ]
    lines += [f"- {note}" for note in h["notes"]]
    lines += [
        "",
        "**Effect**",
        "",
        f"- {len(held)} search-derived item(s) are withheld from the commissioning queue, so "
        "nothing is being commissioned from old numbers.",
        "- The learning loop cannot re-measure actioned pages, so model weights do not update.",
        "",
        "**Fix**",
        "",
    ]
    outcome = ((h.get("feed") or {}).get("refresh") or {}).get("search")
    if outcome == "no-credentials" or (outcome is None and (h.get("feed") or {}).get("credentials") == "none"):
        lines += [
            "The job has no Search Console credentials. One-time setup, about ten minutes, "
            "in `ops/gsc-auth/README.md`:",
            "",
            "1. Download the OAuth client JSON (the client secret) from Google Cloud Console.",
            "2. Run `python3 ops/scripts/gsc-search-analytics.py` locally once and approve the "
            "browser consent. It writes `ops/tokens/gsc-token.json`.",
            "3. Save that file's contents as the repository secret `GSC_TOKEN_JSON`.",
            "4. Run the `Strategy Engine` workflow by hand: its feed check proves the secret works.",
        ]
    else:
        lines += [
            (h.get("cause") or "See the gsc-refresh step in the latest daily run log."),
            "",
            "Then run the `Strategy Engine` workflow by hand: its feed check proves the credentials work.",
        ]
    lines += [
        "",
        "This issue is reused while the loop stays unhealthy. Close it once "
        "`ops/strategy/health.json` reads `ok`; it reopens by itself if the problem returns.",
    ]
    return house_style(title), house_style("\n".join(lines))


def _health_feed(today: date) -> dict:
    """The feed status for a --health run. The daily run records what its pull
    did in health.json; a later monitoring step has no credentials or pull
    outcome in its own environment, so it reuses today's record when there is one."""
    if "PI_GSC_REFRESH" not in os.environ and HEALTH_FILE.exists():
        try:
            saved = json.loads(HEALTH_FILE.read_text(encoding="utf-8"))
            if saved.get("checked") == today.isoformat() and saved.get("feed"):
                return saved["feed"]
        except (json.JSONDecodeError, OSError):
            pass
    return detect_feed()


def main():
    ap = argparse.ArgumentParser(description="Peninsula Insider Content Strategy Brain")
    ap.add_argument("--date", default=None, help="Override run date (YYYY-MM-DD)")
    ap.add_argument("--dry-run", action="store_true", help="Print summary, write nothing")
    ap.add_argument("--health", action="store_true",
                    help="Print loop health and exit non-zero if it is not healthy: "
                         "2 stalled, 1 degraded (for a monitoring cron)")
    ap.add_argument("--alert", action="store_true",
                    help="With --health: raise (or silently reuse) a GitHub issue while the "
                         "loop is degraded or stalled. Needs GITHUB_TOKEN + GITHUB_REPOSITORY.")
    ap.add_argument("--record", metavar="TARGET",
                    help="Record an actioned opportunity (page path or topic) to the "
                         "attribution ledger, capturing its current metrics as baseline")
    ap.add_argument("--kind", default="manual", help="Opportunity kind for --record")
    ap.add_argument("--query", default="", help="Driving query for --record (for query-level tracking)")
    ap.add_argument("--note", default="", help="Note for --record")
    args = ap.parse_args()

    today = date.fromisoformat(args.date) if args.date else (
        datetime.now(AEST).date() if AEST else date.today())

    if args.health:
        # Health gate for a monitoring cron. Built from the same state the daily
        # run builds, so the gate and the brief cannot disagree.
        state = build_state(today, _health_feed(today))
        h = state["health"]
        print(f"Loop health: {h['status'].upper()}")
        for n in h["notes"]:
            print(f"  - {n}")
        if h.get("cause"):
            print(f"  {h['cause']}")
        unhealthy = h["status"] in ("degraded", "stalled")
        if unhealthy and os.environ.get("GITHUB_ACTIONS"):
            print(f"::warning title=Strategy loop {h['status']}::{h['notes'][0]}")
        if unhealthy and args.alert:
            title, body = health_alert(state)
            try:
                import alert
                alert.emit_alert(title, body, severity="error",
                                 dedup_key="strategy-loop-health", quiet_reuse=True)
            except Exception as e:  # alerting must never mask the health result
                print(f"  alert emit failed: {e}", file=sys.stderr)
        sys.exit({"stalled": 2, "degraded": 1}.get(h["status"], 0))

    if args.record:
        gsc = load_gsc(GSC_REPORT)
        entry = record_action(args.record, args.kind, args.query, args.note,
                              gsc, today, load_coverage(GSC_COVERAGE))
        print(f"✓ Recorded action: [{entry['kind']}] {entry['target']} "
              f"(baseline: {entry['baseline']})")
        search = assess_freshness(gsc, {}, {}, today)["search"]
        if not search["usable"]:
            print(f"  ! Baseline taken from search data that is not current "
                  f"({describe_input('search', search)})")
        return

    state = build_state(today, detect_feed())

    print(f"Strategy Brain: {today.isoformat()} ({state['season']})")
    print(f"  Health: {state['health']['status']}. {state['health']['notes'][0]}")
    if state["health"].get("cause"):
        print(f"  {state['health']['cause']}")
    print(f"  Inputs: {', '.join(state['inputs_used'])}")
    if state["inputs_stale"]:
        print(f"  Stale inputs set aside: {', '.join(state['inputs_stale'])}")
    print(f"  Opportunities queued: {len(state['commissioning_queue'])} "
          f"(withheld: {len(state['withheld'])})")
    print(f"  Top priority: {state['commissioning_queue'][0]['title'] if state['commissioning_queue'] else '(none)'}")
    for note in state["day_over_day"].get("notes", []):
        print(f"  Δ {note}")

    if args.dry_run:
        print("\n[dry-run] Nothing written.")
        return

    STRATEGY_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    save_model_weights(state["model"]["kind_multiplier"], state["model"]["changes"], today)
    HEALTH_FILE.write_text(json.dumps(state["health"], indent=2), encoding="utf-8")
    STRATEGY_JSON.write_text(json.dumps(state, indent=2), encoding="utf-8")
    STRATEGY_MD.write_text(render_markdown(state), encoding="utf-8")
    (SNAPSHOT_DIR / f"{today.isoformat()}.json").write_text(
        json.dumps(state, indent=2), encoding="utf-8")

    print(f"\n✓ Wrote {STRATEGY_JSON.relative_to(REPO_ROOT)}")
    print(f"✓ Wrote {STRATEGY_MD.relative_to(REPO_ROOT)}")
    print(f"✓ Snapshot {(SNAPSHOT_DIR / (today.isoformat() + '.json')).relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
