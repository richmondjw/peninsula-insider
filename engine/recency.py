#!/usr/bin/env python3
"""
Peninsula Insider, recency ledger and rotation rules for Insider Picks.
===========================================================================
Why this exists
---------------
On 24, 25 and 27 July 2026 the daily column featured Ten Minutes by Tractor
three days running, "slow-braised lamb" twice, Bushrangers Bay twice, and the
identical sentence shape every day:

    [dish] at [venue], [coastal walk], and a [medium] show closing soon at [place]

The generator has no memory. Each run is independent, so asked "which
restaurant is best right now" it returns the highest-prior answer every time,
and Ten Minutes by Tractor holds the top AGFG score on the Peninsula. It was
answering correctly to a question asked identically every day.

Meanwhile the collection holds 139 venues across 14 types, 6 zones and 4 price
bands, 136 of them carrying whyWeGo and ifOnlyOneThing. The engine never looked
at any of it.

This module supplies the memory and the constraints. Stdlib only, deterministic,
no API calls, so it cannot itself become a source of drift.

What it returns
---------------
    ledger = build_ledger(repo_root, today)
    ledger["blocked"]        set of venue slugs inside their cooldown
    ledger["blocked_names"]  the same, as display names, for the prompt
    ledger["eat_type"]       the venue `type` the EAT slot owes today
    ledger["lens"]           the required slot-3 lens for today's weekday
    ledger["candidates"]     eligible venues with the fields a pick is made of
    ledger["locality_load"]  localities already used twice in the last 7 days
    ledger["banned_phrases"] dek shapes and dishes used recently

Usage:
    python engine/recency.py [--date YYYY-MM-DD] [--repo-root PATH] [--json]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(os.environ.get("PI_REPO_ROOT", Path(__file__).resolve().parents[1]))

ARTICLES = "next/src/content/articles"
VENUES = "next/src/content/venues"
EXPERIENCES = "next/src/content/experiences"

# ── Cooldowns ──────────────────────────────────────────────────────────────
# Sized against the pool so they are comfortably satisfiable. 21 days of venue
# cooldown uses 15% of 139 venues; 28 days of experience cooldown uses 64% of
# 44. Neither can paint the generator into a corner.
VENUE_COOLDOWN_DAYS = 21
EXPERIENCE_COOLDOWN_DAYS = 28
LOCALITY_WINDOW_DAYS = 7
LOCALITY_MAX_IN_WINDOW = 2
ZONE_MAX_IN_WINDOW = 3
PHRASE_LOOKBACK_DAYS = 14

# ── Rotation ───────────────────────────────────────────────────────────────
# The single highest-impact rule. Four days in five the EAT slot may not pick a
# restaurant at all, which is what breaks the convergence on the top-rated one.
# Values are the venue `type` field as it appears in the collection.
EAT_TYPE_CYCLE = [
    ("restaurant",),
    ("winery",),
    ("cafe", "bakery", "providore"),
    ("pub", "hotel"),
    ("market", "brewery", "distillery", "cellar-door"),
]

# Replaces the open-ended "something off the main track", whose first listed
# example was "a gallery show with a closing date". The model reached for that
# three days running because the prompt put it first.
LENS_BY_WEEKDAY = {
    0: "market or producer",
    1: "gallery or cultural, and you MUST name the show and its dates",
    2: "a new opening, reopening or change",
    3: "free or outdoors",
    4: "a weekend anchor event drawn from the events collection",
    5: "a local secret, something with lens: locals-know",
    6: "seasonal or conditions-led",
}


def _read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


def _frontmatter(text: str) -> dict:
    """Cheap frontmatter scrape. Avoids a yaml dependency; we only need scalars."""
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        return {}
    out = {}
    for line in m.group(1).split("\n"):
        fm = re.match(r"^([a-zA-Z_]+):\s*(.*)$", line)
        if fm:
            out[fm.group(1)] = fm.group(2).strip().strip('"\'')
    return out


def load_venues(root: Path) -> list[dict]:
    out = []
    d = root / VENUES
    if not d.is_dir():
        return out
    for f in sorted(d.glob("*.json")):
        try:
            rec = json.loads(f.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        rec.setdefault("slug", f.stem)
        out.append(rec)
    return out


def recent_columns(root: Path, today: date, days: int) -> list[tuple[date, str, str]]:
    """(published_date, filename, full_text) for picks columns inside `days`."""
    out = []
    d = root / ARTICLES
    if not d.is_dir():
        return out
    cutoff = today - timedelta(days=days)
    for f in sorted(d.glob("insider-picks-*.md")) + sorted(d.glob("weekend-picks-*.md")):
        m = re.search(r"(\d{4}-\d{2}-\d{2})", f.name)
        if not m:
            continue
        try:
            pub = date.fromisoformat(m.group(1))
        except ValueError:
            continue
        if cutoff <= pub <= today:
            out.append((pub, f.name, _read(f)))
    return sorted(out, reverse=True)


def _feature_text(text: str) -> str:
    """The part of a column that counts as FEATURING a venue.

    A venue is featured if it appears in the dek or inside a bold span, which
    is where every column format so far has put its subject. It is NOT featured
    merely by being named in running prose: the 18 June and 5 July columns both
    said "finish with lunch at the Flinders Hotel" as an aside, 17 days apart,
    and a naive whole-text match reads that as a repeat feature and burns a
    cooldown on a venue that was never the pick.

    Deliberately conservative in the other direction too: false negatives here
    only weaken the rule, while false positives block legitimate columns, and a
    gate that blocks good work gets switched off.
    """
    parts = []
    fm = re.match(r"^---\n(.*?)\n---", text, re.S)
    if fm:
        dek = re.search(r'^dek:\s*"?(.*?)"?\s*$', fm.group(1), re.M)
        if dek:
            parts.append(dek.group(1))
    body = text[fm.end():] if fm else text
    body = re.sub(r"^\s*\*?Pair it with:?\*?.*$", "", body, flags=re.M | re.I)
    parts += re.findall(r"\*\*(.+?)\*\*", body, re.S)
    return "\n".join(parts)


def featured_in(text: str, venues: list[dict]) -> set[str]:
    """Venue slugs a column actually featured.

    Matches the venue `name` in the prose, because the picks columns ship
    `relatedVenues: []` and the frontmatter is not a reliable record of what was
    featured. Names under 8 characters are skipped: matching "Laura" or "Cape"
    against free text produces noise.
    """
    hits = set()
    low = _feature_text(text).lower()
    for v in venues:
        name = (v.get("name") or "").strip()
        if len(name) < 8:
            continue
        if name.lower() in low:
            hits.add(v["slug"])
    return hits


def build_ledger(root: Path = REPO_ROOT, today: date | None = None) -> dict:
    today = today or datetime.utcnow().date()
    venues = load_venues(root)
    by_slug = {v["slug"]: v for v in venues}

    # 1. Cooldowns from recent columns.
    blocked: dict[str, date] = {}
    locality_hits: dict[str, int] = {}
    zone_hits: dict[str, int] = {}
    phrases: list[str] = []

    for pub, _name, text in recent_columns(root, today, VENUE_COOLDOWN_DAYS):
        age = (today - pub).days
        for slug in featured_in(text, venues):
            if age <= VENUE_COOLDOWN_DAYS:
                blocked.setdefault(slug, pub)
            v = by_slug.get(slug, {})
            if age <= LOCALITY_WINDOW_DAYS:
                if v.get("place"):
                    locality_hits[v["place"]] = locality_hits.get(v["place"], 0) + 1
                if v.get("zone"):
                    zone_hits[v["zone"]] = zone_hits.get(v["zone"], 0) + 1
        if age <= PHRASE_LOOKBACK_DAYS:
            fm = _frontmatter(text)
            if fm.get("dek"):
                phrases.append(fm["dek"])

    hot_localities = {k for k, n in locality_hits.items() if n >= LOCALITY_MAX_IN_WINDOW}
    hot_zones = {k for k, n in zone_hits.items() if n >= ZONE_MAX_IN_WINDOW}

    # 2. Today's required EAT type, cycling so the same type cannot recur.
    eat_types = EAT_TYPE_CYCLE[today.toordinal() % len(EAT_TYPE_CYCLE)]

    # 3. Candidate shortlist: right type, off cooldown, not in a saturated
    #    locality. Handing the model twelve eligible venues with their own
    #    editorial fields beats asking it to recall the Peninsula from memory.
    candidates = []
    for v in venues:
        if v.get("status") not in (None, "published"):
            continue
        if v["slug"] in blocked:
            continue
        if v.get("type") not in eat_types:
            continue
        # Locality is a hard filter, zone deliberately is not. `zone` is far too
        # coarse here: red-hill alone holds 67 of 139 venues, so excluding a hot
        # zone amputates 48% of the pool in one move and starves the rotation.
        # `place` has 16 values with a max of 33, which is the right granularity
        # for "stop clustering picks in one spot". Zone stays as advice in the
        # prompt rather than a filter.
        if v.get("place") in hot_localities:
            continue
        candidates.append({
            "slug": v["slug"],
            "name": v.get("name"),
            "type": v.get("type"),
            "place": v.get("place"),
            "zone": v.get("zone"),
            "priceBand": v.get("priceBand"),
            "knownFor": v.get("knownFor"),
            "whyWeGo": v.get("whyWeGo"),
            "ifOnlyOneThing": v.get("ifOnlyOneThing"),
            "pairWith": v.get("pairWith"),
        })
    candidates.sort(key=lambda c: c["slug"])

    return {
        "date": today.isoformat(),
        "blocked": sorted(blocked),
        "blocked_names": sorted(
            f"{by_slug[s].get('name', s)} (last featured {blocked[s].isoformat()})"
            for s in blocked if s in by_slug
        ),
        "eat_type": list(eat_types),
        "lens": LENS_BY_WEEKDAY[today.weekday()],
        "hot_localities": sorted(hot_localities),
        "hot_zones": sorted(hot_zones),
        "candidates": candidates,
        "recent_deks": phrases,
        "pool": {"venues": len(venues), "eligible_today": len(candidates)},
    }


def prompt_block(ledger: dict, max_candidates: int = 12) -> str:
    """The ledger rendered for injection into the picks prompt."""
    lines = ["ROTATION RULES FOR TODAY, these are constraints and not suggestions.", ""]
    if ledger["blocked_names"]:
        lines.append("DO NOT FEATURE, inside their cooldown:")
        for b in ledger["blocked_names"]:
            lines.append(f"  - {b}")
        lines.append("")
    lines.append(
        f"EAT slot MUST be one of these venue types today: {', '.join(ledger['eat_type'])}. "
        "This rotates daily so the column cannot converge on the same venue."
    )
    lines.append(f"DISCOVERY slot MUST be: {ledger['lens']}.")
    if ledger["hot_localities"]:
        lines.append(
            f"AVOID these localities, already used twice this week: {', '.join(ledger['hot_localities'])}."
        )
    lines.append("")
    lines.append("Do not reuse the sentence shape of the recent deks below, and do not")
    lines.append("repeat a named dish from them:")
    for d in ledger["recent_deks"][:4]:
        lines.append(f"  - {d[:150]}")
    lines.append("")
    if ledger["candidates"]:
        lines.append(f"ELIGIBLE VENUES for the EAT slot ({len(ledger['candidates'])} available, showing {min(max_candidates, len(ledger['candidates']))}).")
        lines.append("Pick from these. Each carries the publication's own notes:")
        lines.append(json.dumps(ledger["candidates"][:max_candidates], indent=2))
    else:
        lines.append(
            "WARNING: no eligible venues matched today's type after cooldowns. "
            "Widen the type rather than repeating a blocked venue, and say so in the run log."
        )
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=None)
    ap.add_argument("--repo-root", default=str(REPO_ROOT))
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    today = date.fromisoformat(args.date) if args.date else datetime.utcnow().date()
    ledger = build_ledger(Path(args.repo_root), today)

    if args.json:
        print(json.dumps(ledger, indent=2))
    else:
        print(prompt_block(ledger))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
