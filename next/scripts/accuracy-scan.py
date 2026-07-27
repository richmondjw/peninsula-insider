#!/usr/bin/env python3
"""
Peninsula Insider, daily accuracy scan (deterministic implementation).
===========================================================================
Implements the checkable parts of
`docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`
as a stdlib-only script, so the scan cannot hallucinate and needs no API key.

Spec checks covered here, all deterministic:
  A. Event freshness drift      -> A1 expired published events, A2 stale nextOccurrence
  B. Homepage / What's On align -> B1 weekendPlanner date drift, B2 orphaned homepage events
  E. Link and route integrity   -> E1 internal links to routes absent from the built site
  F. Seasonal / context drift   -> F1 out-of-season framing on front-door surfaces

Spec checks NOT covered here, because they need editorial judgement and a
deterministic script would produce false confidence:
  C. Dispatch drift
  D. Structured vs editorial mismatch
These are reported as an explicit "not checked" section rather than silently
omitted, per the house rule that silent partial coverage reads as full coverage.

Bucket model is the spec's:
  Bucket 1  safe auto-fix        -> pi-daily-accuracy-autofix may act
  Bucket 2  needs approval       -> report only
  Bucket 3  needs verification   -> report only

Usage:
  python next/scripts/accuracy-scan.py [--date YYYY-MM-DD] [--repo-root PATH]
Exit codes:
  0 always, unless the repo layout is unreadable (2). A scan finding problems
  is a successful scan; failing the workflow on findings would stop the autofix
  step from running, which is the opposite of what we want.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

CONTENT = "next/src/content"
EVENTS_DIR = f"{CONTENT}/events"
HOMEPAGE = "next/src/data/homepage.json"
REPORTS = "reports"

# Sections that exist as single landing pages rather than content sections.
# Linking into them as though they were sections produces a dead end.
SINGLE_PAGE_ROUTES = {
    "ask", "dog-friendly", "do", "fish", "golf", "spa", "map",
    "plan", "picks", "pass", "itinerary", "eat-drink",
}

# Front-door surfaces. Seasonal drift matters here and almost nowhere else.
FRONT_DOOR = [HOMEPAGE]

SEASON_WORDS = {
    "summer": {12, 1, 2},
    "spring": {9, 10, 11},
    "autumn": {3, 4, 5},
    "winter": {6, 7, 8},
}

MONTHS = ("january february march april may june july august september "
          "october november december").split()


# ── helpers ────────────────────────────────────────────────────────────────
def southern_season(m: int) -> str:
    for name, months in SEASON_WORDS.items():
        if m in months:
            return name
    return "unknown"


def upcoming_weekend(today: date) -> tuple[date, date]:
    """Friday through Sunday of the weekend the site should currently front."""
    dow = today.weekday()               # Mon=0 .. Sun=6
    fri = today + timedelta(days=(4 - dow) if dow <= 4 else -(dow - 4))
    return fri, fri + timedelta(days=2)


def parse_iso(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def load_events(root: Path) -> list[tuple[Path, dict]]:
    out = []
    d = root / EVENTS_DIR
    if not d.is_dir():
        return out
    for f in sorted(d.glob("*.json")):
        try:
            out.append((f, json.loads(f.read_text(encoding="utf-8"))))
        except (json.JSONDecodeError, OSError):
            continue
    return out


def built_routes(root: Path) -> set[str]:
    """Top-level route segments present in the built site at the repo root."""
    skip = {"next", "_astro", "assets", ".git", "_archive", "node_modules",
            "docs", "ops", "engine", "reports", "images", "downloads"}
    routes = set()
    for entry in root.iterdir():
        if not entry.is_dir() or entry.name in skip or entry.name.startswith("."):
            continue
        if any(entry.rglob("*.html")):
            routes.add(entry.name)
    return routes


def built_paths(root: Path) -> set[str]:
    """Every built page path, as '/a/b/' with leading and trailing slash."""
    paths = set()
    for f in root.rglob("index.html"):
        if "node_modules" in f.parts or "next" in f.parts:
            continue
        rel = f.relative_to(root).parent.as_posix()
        paths.add("/" if rel == "." else f"/{rel}/")
    return paths


# ── checks ─────────────────────────────────────────────────────────────────
def check_a1_expired_events(events, today):
    """Published events whose end date has passed. content-freshness.yml
    should have archived these; anything here means it did not run or missed."""
    findings = []
    for path, d in events:
        if d.get("status") != "published":
            continue
        end = parse_iso(d.get("endDate") or d.get("startDate"))
        if end and end < today:
            findings.append({
                "bucket": 1,
                "check": "A1",
                "title": f"Expired event still published: {d.get('title', path.stem)}",
                "detail": f"endDate {end.isoformat()} has passed. Should be status: archived.",
                "file": str(path.relative_to(REPO_ROOT)),
                "fix": "set status to archived",
            })
    return findings


def check_a2_stale_occurrence(events, today):
    """Recurring events whose nextOccurrence is in the past."""
    findings = []
    for path, d in events:
        if d.get("status") != "published":
            continue
        nxt = parse_iso(d.get("nextOccurrence"))
        if nxt and nxt < today:
            findings.append({
                "bucket": 1,
                "check": "A2",
                "title": f"Stale nextOccurrence: {d.get('title', path.stem)}",
                "detail": f"nextOccurrence {nxt.isoformat()} is in the past.",
                "file": str(path.relative_to(REPO_ROOT)),
                "fix": "recompute nextOccurrence",
            })
    return findings


def check_b1_weekend_planner(root, today):
    """Homepage weekendPlanner pointing at a weekend that has passed."""
    findings = []
    hp = root / HOMEPAGE
    if not hp.is_file():
        return findings
    try:
        data = json.loads(hp.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return findings

    fri, sun = upcoming_weekend(today)
    wp = data.get("weekendPlanner") or {}
    blob = json.dumps(wp)

    # Any "<day> <n>" or "<n> <Month>" reference we can resolve to a date.
    seen_dates = set()
    for m in re.finditer(r"(\d{1,2})\s+(" + "|".join(MONTHS) + r")", blob, re.I):
        day, month = int(m.group(1)), MONTHS.index(m.group(2).lower()) + 1
        for yr in (today.year, today.year - 1):
            try:
                seen_dates.add(date(yr, month, day))
            except ValueError:
                pass
    # "Saturday 18 or Sunday 19 July" style: bare day numbers near a month name
    month_hit = re.search(r"\b(" + "|".join(MONTHS) + r")\b", blob, re.I)
    if month_hit:
        month = MONTHS.index(month_hit.group(1).lower()) + 1
        for m in re.finditer(r"\b(\d{1,2})\b", blob):
            day = int(m.group(1))
            if 1 <= day <= 31:
                try:
                    seen_dates.add(date(today.year, month, day))
                except ValueError:
                    pass

    past = sorted(d for d in seen_dates if d < today)
    if past and not any(fri <= d <= sun for d in seen_dates):
        findings.append({
            "bucket": 1,
            "check": "B1",
            "title": "Homepage weekendPlanner is pointing at a past weekend",
            "detail": (
                f"Dates referenced: {', '.join(d.isoformat() for d in past[:6])}. "
                f"The current weekend window is {fri.isoformat()} to {sun.isoformat()}. "
                f"Planner title: {wp.get('title', '')[:90]}"
            ),
            "file": HOMEPAGE,
            "fix": "realign weekendPlanner to the current weekend window",
        })
    return findings


def check_b2_orphaned_homepage_events(root, events):
    """Homepage naming an event that is not live in the collection."""
    findings = []
    hp = root / HOMEPAGE
    if not hp.is_file():
        return findings
    try:
        blob = hp.read_text(encoding="utf-8")
    except OSError:
        return findings

    live_titles = {
        (d.get("title") or "").lower()
        for _, d in events if d.get("status") == "published"
    }
    archived = [
        (p, d) for p, d in events if d.get("status") != "published"
    ]
    for path, d in archived:
        title = (d.get("title") or "").strip()
        if len(title) < 12:
            continue
        if title.lower() in blob.lower() and title.lower() not in live_titles:
            findings.append({
                "bucket": 2,
                "check": "B2",
                "title": f"Homepage names a non-live event: {title}",
                "detail": f"Event status is {d.get('status')}, but the title appears on the homepage.",
                "file": HOMEPAGE,
                "fix": "replace with a live event (changes editorial emphasis, needs approval)",
            })
    return findings


def check_e1_internal_links(root):
    """Internal links in content pointing at routes the built site lacks."""
    findings = []
    routes = built_routes(root)
    paths = built_paths(root)
    if not routes:
        return findings

    content_dir = root / CONTENT
    if not content_dir.is_dir():
        return findings

    href_re = re.compile(r'["\(](/[a-z0-9][a-z0-9\-/]*/)["\)]')
    seen = set()
    for f in content_dir.rglob("*"):
        if f.suffix.lower() not in {".md", ".mdx", ".json"} or not f.is_file():
            continue
        try:
            text = f.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for m in href_re.finditer(text):
            href = m.group(1)
            top = href.strip("/").split("/")[0]
            key = (str(f), href)
            if key in seen:
                continue
            if top not in routes:
                seen.add(key)
                findings.append({
                    "bucket": 1,
                    "check": "E1",
                    "title": f"Internal link to a section that does not exist: {href}",
                    "detail": f"Top-level segment '{top}' is not a built route.",
                    "file": str(f.relative_to(root)),
                    "fix": "correct the route reference",
                })
            elif paths and href not in paths and top not in SINGLE_PAGE_ROUTES:
                seen.add(key)
                findings.append({
                    "bucket": 3,
                    "check": "E1",
                    "title": f"Internal link with no built page: {href}",
                    "detail": "Section exists but this exact path was not built. May be newer than the last build.",
                    "file": str(f.relative_to(root)),
                    "fix": "verify against the next build before changing",
                })
    return findings


def check_f1_seasonal_drift(root, today):
    """Out-of-season framing on front-door surfaces."""
    findings = []
    now_season = southern_season(today.month)
    for rel in FRONT_DOOR:
        f = root / rel
        if not f.is_file():
            continue
        try:
            blob = f.read_text(encoding="utf-8").lower()
        except OSError:
            continue
        for season in SEASON_WORDS:
            if season == now_season:
                continue
            hits = len(re.findall(rf"\b{season}\b", blob))
            if hits:
                findings.append({
                    "bucket": 2,
                    "check": "F1",
                    "title": f"Out-of-season framing on a front-door surface: '{season}'",
                    "detail": f"'{season}' appears {hits} time(s); the current season is {now_season}.",
                    "file": rel,
                    "fix": "reframe to the current season (editorial judgement, needs approval)",
                })
        if "school holiday" in blob:
            findings.append({
                "bucket": 3,
                "check": "F1",
                "title": "School-holiday framing on a front-door surface",
                "detail": "Verify against the Victorian term dates before acting.",
                "file": rel,
                "fix": "check vic.gov.au term dates",
            })
    return findings


# ── report ─────────────────────────────────────────────────────────────────
def render(findings, today, events, notes):
    b1 = [f for f in findings if f["bucket"] == 1]
    b2 = [f for f in findings if f["bucket"] == 2]
    b3 = [f for f in findings if f["bucket"] == 3]
    published = sum(1 for _, d in events if d.get("status") == "published")

    L = []
    add = L.append
    add(f"# Peninsula Insider, daily accuracy scan {today.isoformat()}")
    add("")
    add("Generated by `next/scripts/accuracy-scan.py`, deterministic checks only.")
    add("No editorial judgement was applied and nothing was changed.")
    add("")
    add("## Summary")
    add("")
    add(f"- Events in collection: {len(events)}, of which {published} published")
    add(f"- Bucket 1, safe auto-fix: **{len(b1)}**")
    add(f"- Bucket 2, needs approval: **{len(b2)}**")
    add(f"- Bucket 3, needs verification: **{len(b3)}**")
    add("")
    if not findings:
        add("No drift detected by the deterministic checks.")
        add("")

    for label, bucket in (("Bucket 1, safe auto-fix", b1),
                          ("Bucket 2, needs approval", b2),
                          ("Bucket 3, needs verification", b3)):
        add(f"## {label}")
        add("")
        if not bucket:
            add("None.")
            add("")
            continue
        add("| Check | Finding | File | Suggested action |")
        add("|---|---|---|---|")
        for f in bucket:
            title = f["title"].replace("|", "/")
            detail = f["detail"].replace("|", "/")
            add(f"| {f['check']} | {title}<br>{detail} | `{f['file']}` | {f['fix']} |")
        add("")

    add("## Checks not performed")
    add("")
    add("These spec checks need editorial judgement and are not implemented here.")
    add("Treating their absence as a clean result would be wrong.")
    add("")
    add("- C. Dispatch drift: Peninsula This Weekend copy against the real calendar")
    add("- D. Structured versus editorial mismatch: article prose against event records")
    add("")
    for n in notes:
        add(f"- {n}")
    add("")
    add("## Machine-readable")
    add("")
    add("```json")
    add(json.dumps({"date": today.isoformat(),
                    "counts": {"bucket1": len(b1), "bucket2": len(b2), "bucket3": len(b3)},
                    "findings": findings}, indent=2))
    add("```")
    return "\n".join(L) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=None, help="YYYY-MM-DD, defaults to today UTC")
    ap.add_argument("--repo-root", default=str(REPO_ROOT))
    ap.add_argument("--stdout", action="store_true", help="print instead of writing")
    args = ap.parse_args()

    root = Path(args.repo_root).resolve()
    if not (root / CONTENT).is_dir():
        print(f"FATAL: {root/CONTENT} not found", file=sys.stderr)
        return 2

    today = date.fromisoformat(args.date) if args.date else datetime.utcnow().date()
    events = load_events(root)

    notes = []
    if not built_routes(root):
        notes.append("Built site not present at the repo root, so check E1 was skipped entirely.")

    findings = []
    findings += check_a1_expired_events(events, today)
    findings += check_a2_stale_occurrence(events, today)
    findings += check_b1_weekend_planner(root, today)
    findings += check_b2_orphaned_homepage_events(root, events)
    findings += check_e1_internal_links(root)
    findings += check_f1_seasonal_drift(root, today)

    report = render(findings, today, events, notes)

    if args.stdout:
        print(report)
        return 0

    out_dir = root / REPORTS
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"peninsula-accuracy-scan-{today.isoformat()}.md"
    out.write_text(report, encoding="utf-8")
    print(f"wrote {out.relative_to(root)}")
    b1 = sum(1 for f in findings if f["bucket"] == 1)
    print(f"bucket1={b1} bucket2={sum(1 for f in findings if f['bucket']==2)} "
          f"bucket3={sum(1 for f in findings if f['bucket']==3)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
