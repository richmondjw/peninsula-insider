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

Usage:
  python engine/strategy_engine.py                 # write strategy from current inputs
  python engine/strategy_engine.py --date 2026-07-06
  python engine/strategy_engine.py --dry-run       # print, write nothing
"""

from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from pathlib import Path

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
COMPETITIVE_DIR = REPO_ROOT / ".claude/signals"
STRATEGY_DIR = REPO_ROOT / "ops/strategy"
SNAPSHOT_DIR = STRATEGY_DIR / "snapshots"
STRATEGY_JSON = STRATEGY_DIR / "content-strategy.json"
STRATEGY_MD = STRATEGY_DIR / "content-strategy.md"

SITE = "https://peninsulainsider.com.au"

NORTH_STAR = (
    "Become the number-1 destination — for people and AI agents — for what's on, "
    "and where to stay, eat, drink and explore on the Mornington Peninsula."
)

# ── Scoring weights (tunable — this IS the strategy model) ───────────────────
# A single interpretable scoring function ranks every opportunity so the queue
# is explainable. Weights are deliberately in one place so the model can be
# tuned as the site matures (early-stage favours striking-distance + CTR wins;
# a mature site would lift coverage/freshness).
WEIGHTS = {
    "indexation": 1.8,       # not indexed = can't rank at all — the upstream lever
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
    "ctr-fix": 1.25,          # rewrite title + meta on an existing page
    "striking-distance": 1.15,  # tighten an existing page to reach page 1
    "freshness": 1.0,
    "coverage-gap": 0.9,      # net-new piece — higher value, slower payoff
}

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
    rationale: str = ""
    recommended_action: str = ""
    suggested_desk: str = ""
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
    headers = [c.strip().strip("`") for c in lines[hdr].strip().strip("|").split("|")]
    rows = []
    for line in lines[hdr + 2:]:
        if not line.strip().startswith("|"):
            break
        cells = [c.strip().strip("`") for c in line.strip().strip("|").split("|")]
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


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
        "top_pages": [], "top_queries": [], "striking_distance": [], "ctr_opportunities": [],
    }
    if not report_path.exists():
        return data
    md = report_path.read_text(encoding="utf-8")
    data["available"] = True
    period = re.search(r"_Period:\s*(.+?)_", md)
    if period:
        data["period"] = period.group(1).strip()

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
        data["striking_distance"].append({
            "query": row.get("Query", ""),
            "impressions": int(_num(row.get("Impressions", 0))),
            "avg_position": _num(row.get("Avg Pos", 0)),
            "clicks": int(_num(row.get("Clicks", 0))),
        })
    for row in parse_markdown_table(md, r"^#+.*CTR Opportunities"):
        data["ctr_opportunities"].append({
            "path": _norm_path(row.get("Page", "")),
            "impressions": int(_num(row.get("Impressions", 0))),
            "ctr": _num(row.get("CTR", 0)),
            "avg_position": _num(row.get("Avg Pos", 0)),
        })
    return data


def load_coverage(report_path: Path) -> dict:
    """Parse the GSC coverage report — which URLs Google has (not) indexed.
    A page that isn't indexed cannot rank, so these are the most upstream fixes."""
    data = {"available": False, "indexed": 0, "not_indexed": [], "generated": ""}
    if not report_path.exists():
        return data
    md = report_path.read_text(encoding="utf-8")
    data["available"] = True
    gen = re.search(r"_Generated (.+?)_", md)
    if gen:
        data["generated"] = gen.group(1).strip()
    indexed = re.search(r"Indexed \(PASS\):\s*\*\*(\d+)\*\*", md)
    if indexed:
        data["indexed"] = int(indexed.group(1))
    for row in parse_markdown_table(md, r"^#+.*URL Inspection Results"):
        verdict_cov = row.get("Coverage", "")
        if not verdict_cov:
            continue
        # Anything not clearly indexed is an indexation opportunity.
        if re.search(r"not indexed|unknown to google|discovered|crawled - currently not",
                     verdict_cov, re.I):
            data["not_indexed"].append({
                "path": _norm_path(row.get("URL", "")),
                "coverage": verdict_cov.strip(),
                "last_crawl": row.get("Last Crawl", "").strip(),
            })
    return data


def load_inventory(sitemap_path: Path, today: date) -> dict:
    """Section coverage + freshness from the sitemap."""
    inv = {"available": False, "total": 0, "sections": {}, "stale": []}
    if not sitemap_path.exists():
        return inv
    xml = sitemap_path.read_text(encoding="utf-8")
    inv["available"] = True
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
                        cov: dict | None = None) -> list[Opportunity]:
    themes = SEASONAL_THEMES.get(season, [])
    cov = cov or {"not_indexed": []}
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
                       f"for anything — the single highest-leverage fix."),
            recommended_action=("Ensure it's in sitemap.xml with a strong priority, add internal "
                                "links from already-indexed pages, confirm it isn't noindex, add "
                                "unique above-the-fold content, then Request Indexing in GSC."),
            suggested_desk=route_desk(path),
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
                         f"{row['impressions']} impressions but CTR is {row['ctr']:.2f}% — "
                         f"a snippet problem, not a ranking problem.")
            action = ("Rewrite the <title> and meta description to match query intent and add "
                      "a benefit/number; add a direct-answer first line under the H1.")
        else:
            title = f"Strengthen ranking + snippet for {path}"
            rationale = (f"Surfaced on {row['impressions']} impressions but stuck at avg position "
                         f"{pos:.0f} with {row['ctr']:.2f}% CTR — real demand, weak page. Needs to "
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
        opps.append(Opportunity(
            kind="striking-distance",
            title=f"Push '{q}' onto page 1",
            target=_best_page_for_query(q, gsc),
            query=q,
            impressions=row["impressions"],
            avg_position=row["avg_position"],
            seasonal=seasonal_match(q),
            rationale=(f"'{q}' ranks avg position {row['avg_position']:.1f} on "
                       f"{row['impressions']} impressions — small, targeted improvement "
                       f"could reach page 1 and start earning clicks."),
            recommended_action=("Strengthen the ranking page for this exact query: expand the "
                                "relevant section, add an FAQ answer, tighten the H1/intro, add "
                                "internal links from related hub pages."),
            suggested_desk=route_desk(_best_page_for_query(q, gsc), q),
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
            rationale=f"Last updated {stale['age_days']} days ago — freshness signal decaying.",
            recommended_action=("Verify venues/hours/prices, refresh seasonal framing, update "
                                "lastVerified, add one new internal link."),
            suggested_desk=route_desk(path),
        ))

    for opp in opps:
        score_opportunity(opp, gsc)
    opps.sort(key=lambda o: -o.score)
    return opps


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

    raw = sum(b.values())
    effort = EFFORT_BONUS.get(opp.kind, 1.0)
    opp.score = round(raw * effort, 3)
    opp.score_breakdown = {k: round(v, 3) for k, v in b.items()}
    opp.score_breakdown["effort_multiplier"] = effort


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


def compute_diff(prev: dict | None, metrics: dict, queue: list[dict]) -> dict:
    if not prev:
        return {"first_run": True, "notes": ["First strategy snapshot — no prior day to compare."]}
    pm = prev.get("metrics", {})
    diff = {"first_run": False, "since": prev.get("date"), "deltas": {}, "notes": []}
    for k in ("total_clicks", "total_impressions", "avg_position", "open_opportunities"):
        if k in metrics and k in pm:
            delta = round(metrics[k] - pm[k], 2)
            diff["deltas"][k] = delta
    # Position is better when lower — annotate direction.
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
def _fmt(v):
    return "—" if v is None else v


def render_markdown(state: dict) -> str:
    m = state["metrics"]
    md = [f"# Peninsula Insider — Content Strategy", ""]
    md.append(f"**North star:** {NORTH_STAR}")
    md.append("")
    md.append(f"**Generated:** {state['generated_at']}  ")
    md.append(f"**Season:** {state['season'].title()}  ")
    md.append(f"**Inputs used:** {', '.join(state['inputs_used']) or 'none available'}  ")
    md.append("")
    md.append("## Where we stand")
    md.append("")
    md.append("| Metric | Value |")
    md.append("|---|---|")
    md.append(f"| Search period | {state.get('gsc_period','—')} |")
    md.append(f"| Total clicks | {m.get('total_clicks','—')} |")
    md.append(f"| Total impressions | {m.get('total_impressions','—')} |")
    md.append(f"| Avg position | {m.get('avg_position','—')} |")
    md.append(f"| Pages indexed by Google | {_fmt(m.get('pages_indexed'))} |")
    md.append(f"| Pages known-not-indexed | {_fmt(m.get('pages_not_indexed'))} |")
    md.append(f"| Pages in sitemap | {m.get('pages_in_sitemap','—')} |")
    md.append(f"| Open opportunities | {m.get('open_opportunities','—')} |")
    md.append("")

    diff = state["day_over_day"]
    md.append("## Day-over-day (is the strategy improving?)")
    md.append("")
    if diff.get("first_run"):
        md.append("_First strategy snapshot — baseline established. Improvement tracked from tomorrow._")
    else:
        md.append(f"_Compared with {diff.get('since')}._")
        md.append("")
        for note in diff.get("notes", []):
            md.append(f"- {note}")
    md.append("")

    md.append("## This cycle's commissioning queue (ranked)")
    md.append("")
    md.append("Ranked by the strategy model (performance + season + coverage + effort). "
              "The orchestrator commissions from the top down.")
    md.append("")
    for i, o in enumerate(state["commissioning_queue"][:12], 1):
        tag = {"indexation": "INDEX", "ctr-fix": "CTR", "striking-distance": "RANK",
               "coverage-gap": "NEW", "freshness": "FRESH"}.get(o["kind"], o["kind"].upper())
        md.append(f"### {i}. [{tag} · score {o['score']}] {o['title']}")
        md.append(f"- **Desk:** {o['suggested_desk']}")
        if o.get("query"):
            md.append(f"- **Query:** `{o['query']}`")
        md.append(f"- **Why:** {o['rationale']}")
        md.append(f"- **Do:** {o['recommended_action']}")
        md.append("")

    md.append("## Coverage snapshot")
    md.append("")
    for seg, n in sorted(state["coverage"].items(), key=lambda x: -x[1])[:12]:
        md.append(f"- `/{seg}/` — {n} pages")
    md.append("")
    md.append("---")
    md.append("*Generated by the Peninsula Insider Strategy Brain "
              "(`engine/strategy_engine.py`). This file is machine-owned; edit the model, not the output.*")
    return "\n".join(md) + "\n"


# ── Main ─────────────────────────────────────────────────────────────────────
def build_state(today: date) -> dict:
    season = get_season(today.month)
    gsc = load_gsc(GSC_REPORT)
    cov = load_coverage(GSC_COVERAGE)
    inv = load_inventory(SITEMAP, today)
    comp = load_competitive(COMPETITIVE_DIR)

    inputs_used = []
    if gsc["available"]:
        inputs_used.append("gsc-search-analytics")
    if cov["available"]:
        inputs_used.append("gsc-coverage")
    if inv["available"]:
        inputs_used.append("sitemap-inventory")
    if comp["available"]:
        inputs_used.append("competitive-scan")
    inputs_used.append(f"seasonal-calendar:{season}")

    opps = build_opportunities(gsc, inv, comp, season, cov)

    total_clicks = int(_num(gsc["summary"].get("Total clicks", 0))) if gsc["available"] else 0
    total_impr = int(_num(gsc["summary"].get("Total impressions", 0))) if gsc["available"] else 0
    avg_pos = _num(gsc["summary"].get("Avg position (imp-weighted)", 0)) if gsc["available"] else 0.0

    metrics = {
        "total_clicks": total_clicks,
        "total_impressions": total_impr,
        "avg_position": avg_pos,
        "pages_indexed": cov["indexed"] if cov["available"] else None,
        "pages_not_indexed": len(cov["not_indexed"]) if cov["available"] else None,
        "pages_in_sitemap": inv["total"],
        "open_opportunities": len(opps),
    }

    queue = [asdict(o) for o in opps]
    prev = load_prev_snapshot(SNAPSHOT_DIR, today)
    diff = compute_diff(prev, metrics, queue)

    state = {
        "generated_at": _now_iso(),
        "date": today.isoformat(),
        "north_star": NORTH_STAR,
        "season": season,
        "inputs_used": inputs_used,
        "gsc_period": gsc.get("period", ""),
        "metrics": metrics,
        "coverage": inv["sections"],
        "day_over_day": diff,
        "commissioning_queue": queue,
    }
    return state


def _now_iso() -> str:
    try:
        return datetime.now(AEST).strftime("%Y-%m-%d %H:%M %Z") if AEST else datetime.now().isoformat()
    except Exception:
        return datetime.now().isoformat()


def load_commissioning_queue(limit: int = 5) -> list[dict]:
    """Helper for the orchestrator: read the top-N ranked commissions.
    Returns [] if no strategy has been generated yet (loop never blocks)."""
    if not STRATEGY_JSON.exists():
        return []
    try:
        state = json.loads(STRATEGY_JSON.read_text(encoding="utf-8"))
        return state.get("commissioning_queue", [])[:limit]
    except (json.JSONDecodeError, OSError):
        return []


def main():
    ap = argparse.ArgumentParser(description="Peninsula Insider Content Strategy Brain")
    ap.add_argument("--date", default=None, help="Override run date (YYYY-MM-DD)")
    ap.add_argument("--dry-run", action="store_true", help="Print summary, write nothing")
    args = ap.parse_args()

    today = date.fromisoformat(args.date) if args.date else (
        datetime.now(AEST).date() if AEST else date.today())

    state = build_state(today)

    print(f"Strategy Brain — {today.isoformat()} ({state['season']})")
    print(f"  Inputs: {', '.join(state['inputs_used'])}")
    print(f"  Opportunities scored: {len(state['commissioning_queue'])}")
    print(f"  Top priority: {state['commissioning_queue'][0]['title'] if state['commissioning_queue'] else '(none)'}")
    for note in state["day_over_day"].get("notes", []):
        print(f"  Δ {note}")

    if args.dry_run:
        print("\n[dry-run] Nothing written.")
        return

    STRATEGY_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    STRATEGY_JSON.write_text(json.dumps(state, indent=2), encoding="utf-8")
    STRATEGY_MD.write_text(render_markdown(state), encoding="utf-8")
    (SNAPSHOT_DIR / f"{today.isoformat()}.json").write_text(
        json.dumps(state, indent=2), encoding="utf-8")

    print(f"\n✓ Wrote {STRATEGY_JSON.relative_to(REPO_ROOT)}")
    print(f"✓ Wrote {STRATEGY_MD.relative_to(REPO_ROOT)}")
    print(f"✓ Snapshot {(SNAPSHOT_DIR / (today.isoformat() + '.json')).relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
