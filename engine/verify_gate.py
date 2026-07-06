#!/usr/bin/env python3
"""
Peninsula Insider — Factual Verify Gate (real implementation)
===========================================================================
Replaces the frontmatter-presence stub with the offline, deterministic parts of
`.claude/agents/verify-agent.md`. The loop auto-publishes to production, so a
real gate that can BLOCK a bad publish is the safety net that makes expanding
autonomy responsible.

What it can prove offline (-> hard FAIL, blocks publish):
  1. Referential integrity — a venue/experience slug referenced in frontmatter
     that does not exist in next/src/content/ (mirrors the CMS integrity rule).
  2. Day-of-week correctness — "Saturday 26 July" where the next real 26 July is
     not a Saturday. Deterministic for forward-looking "what's on" content.
  3. Internal links whose top-level section does not exist at all (clear 404).

What it flags but does not block (-> PASS_WITH_FLAGS, logged):
  - Internal links not yet in the sitemap (may just be newer than the last build).
  - Stated prices, "booking essential", specific opening hours — web-only claims.

Web verification (venue open/closed, live URL 200s) is intentionally out of scope
here — it needs network + is non-deterministic; those remain flags. This gate is
stdlib-only so it runs inside the pre-flight self-test gate.

Usage:
  python3 engine/verify_gate.py <path.md> [--anchor YYYY-MM-DD]
  exit code 0 = PASS/PASS_WITH_FLAGS, 2 = FAIL
"""

from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "next/src/content"
SITEMAP = REPO_ROOT / "sitemap.xml"

# Slug-addressable entity collections we can confirm a reference against.
ENTITY_COLLECTIONS = [
    "venues", "experiences", "places", "events", "articles", "tours",
    "tour-operators", "tour-packages", "signature-events", "fishing-charters",
    "fishing-locations", "boat-ramps", "boat-hire", "species", "itineraries",
    "local-secrets", "quick-notes", "weekend-picks", "regions",
]

_DAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
         "friday": 4, "saturday": 5, "sunday": 6}
_MONTHS = {m[:3]: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"], start=1)}

# "Saturday 26 July" / "Sat, 26th of July"
_DATE_RE = re.compile(
    r"(?i)\b(mon|tues|wednes|thurs|fri|satur|sun)day\s*,?\s*(?:the\s+)?"
    r"(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?"
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*")

# Top-level site sections that legitimately exist (for 404 sniffing).
_KNOWN_SECTIONS = {
    "eat", "wine", "stay", "explore", "journal", "whats-on", "events",
    "places", "guides", "fishing", "boating", "tour", "weddings",
    "corporate-events", "dog-friendly", "about", "methodology", "our-approach",
    "editorial-approach", "ethics", "corrections", "accessibility", "contact",
    "newsletter", "submit", "partners", "partner-with-us", "ask", "insiders-30",
}


def known_entity_slugs(content_dir: Path) -> set[str]:
    slugs = set()
    for coll in ENTITY_COLLECTIONS:
        d = content_dir / coll
        if not d.exists():
            continue
        for f in glob.glob(str(d / "*.json")) + glob.glob(str(d / "*.md")):
            slugs.add(Path(f).stem)
    return slugs


def known_site_paths(sitemap_path: Path) -> set[str]:
    paths = set()
    if sitemap_path.exists():
        xml = sitemap_path.read_text(encoding="utf-8")
        for loc in re.findall(r"<loc>(.*?)</loc>", xml):
            p = re.sub(r"^https?://[^/]+", "", loc).rstrip("/")
            paths.add(p or "/")
    return paths


def _frontmatter(text: str) -> str:
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    return m.group(1) if m else ""


def _referenced_slugs(fm: str) -> list[str]:
    out = []
    for field in ("relatedVenues", "relatedExperiences"):
        m = re.search(rf"{field}:\s*\[([^\]]*)\]", fm)
        if m:
            out += [s.strip().strip("'\"") for s in m.group(1).split(",") if s.strip()]
    return out


def _internal_links(text: str, fm: str) -> list[str]:
    links = re.findall(r'href:\s*["\'](/[^"\']+)["\']', fm)        # clusterLinks
    links += re.findall(r"\]\((/[^)\s]+)\)", text)                  # inline markdown
    # normalise: strip trailing slash, drop anchors/queries
    norm = []
    for l in links:
        l = re.sub(r"[?#].*$", "", l).rstrip("/") or "/"
        norm.append(l)
    return sorted(set(norm))


def check_venues(fm: str, known: set[str]) -> tuple[list[str], list[dict]]:
    fails, checks = [], []
    for slug in _referenced_slugs(fm):
        if slug in known:
            checks.append({"venue": slug, "status": "confirmed-in-pi-content"})
        else:
            fails.append(f"Referenced entity '{slug}' does not exist in next/src/content/")
            checks.append({"venue": slug, "status": "MISSING"})
    return fails, checks


def check_dates(text: str, anchor: date) -> tuple[list[str], list[dict]]:
    """For each 'Weekday DD Month', resolve the next real occurrence on/after the
    anchor and verify the weekday. Deterministic for upcoming-events content."""
    fails, checks = [], []
    for m in _DATE_RE.finditer(text):
        day_name = (m.group(1) + "day").lower()
        day_num = int(m.group(2))
        month = _MONTHS.get(m.group(3).lower()[:3])
        if not month or not (1 <= day_num <= 31):
            continue
        intended = _next_occurrence(month, day_num, anchor)
        if intended is None:
            continue
        stated = _DAYS[day_name]
        claim = f"{m.group(1).title()}day {day_num} {m.group(3).title()}"
        if intended.weekday() == stated:
            checks.append({"claim": claim, "status": "correct"})
        else:
            actual = [k for k, v in _DAYS.items() if v == intended.weekday()][0].title()
            fails.append(f"{claim} is wrong: {intended.isoformat()} is a {actual}, not "
                         f"{m.group(1).title()}day")
            checks.append({"claim": claim, "status": "WRONG_DAY",
                           "resolved": intended.isoformat(), "actual_day": actual})
    return fails, checks


def _next_occurrence(month: int, day: int, anchor: date) -> date | None:
    for yr in (anchor.year, anchor.year + 1, anchor.year + 2):
        try:
            cand = date(yr, month, day)
        except ValueError:
            return None  # impossible date like 30 Feb
        if cand >= anchor:
            return cand
    return None


def check_links(text: str, fm: str, site_paths: set[str]) -> tuple[list[str], list[str]]:
    fails, flags = [], []
    for link in _internal_links(text, fm):
        if link in site_paths or link == "/":
            continue
        section = link.strip("/").split("/")[0]
        if section not in _KNOWN_SECTIONS:
            fails.append(f"Internal link '{link}' points to unknown section '/{section}/' (likely 404)")
        else:
            flags.append(f"Internal link '{link}' not in sitemap yet — verify it resolves")
    return fails, flags


def _soft_flags(text: str) -> list[str]:
    flags = []
    if re.search(r"\$\d", text):
        flags.append("Contains a numeric price — BRAND-PI forbids prices; confirm/remove")
    if re.search(r"(?i)\bbookings?\s+essential\b", text):
        flags.append("'Bookings essential' stated — verify directly with venue")
    if re.search(r"(?i)\bopen\s+(?:daily|most days|thu|fri|sat|sun|mon|tue|wed)", text):
        flags.append("Opening hours stated — remind reader to confirm with venue")
    return flags


def verify_content(path: Path, content_dir: Path = CONTENT_DIR,
                   sitemap_path: Path = SITEMAP, anchor: date | None = None) -> dict:
    if not path.exists():
        return {"result": "FAIL", "fails": [f"File not found: {path}"], "flags": [],
                "venue_checks": [], "date_checks": [], "link_checks": []}
    text = path.read_text(encoding="utf-8")
    fm = _frontmatter(text)
    if anchor is None:
        pub = re.search(r"publishedAt:\s*(\d{4}-\d{2}-\d{2})", fm)
        anchor = date.fromisoformat(pub.group(1)) if pub else date.today()

    vf, vchecks = check_venues(fm, known_entity_slugs(content_dir))
    df, dchecks = check_dates(text, anchor)
    lf, lflags = check_links(text, fm, known_site_paths(sitemap_path))

    fails = vf + df + lf
    flags = lflags + _soft_flags(text)
    result = "FAIL" if fails else ("PASS_WITH_FLAGS" if flags else "PASS")
    return {
        "result": result,
        "fails": fails,
        "flags": flags,
        "venue_checks": vchecks,
        "date_checks": dchecks,
        "link_checks": {"failed": lf, "flagged": lflags},
        "lastVerified": (anchor or date.today()).isoformat(),
    }


def main():
    ap = argparse.ArgumentParser(description="Peninsula Insider factual verify gate")
    ap.add_argument("path")
    ap.add_argument("--anchor", default=None, help="Anchor date YYYY-MM-DD (default: publishedAt)")
    args = ap.parse_args()
    anchor = date.fromisoformat(args.anchor) if args.anchor else None
    r = verify_content(Path(args.path), anchor=anchor)
    print(json.dumps(r, indent=2))
    sys.exit(2 if r["result"] == "FAIL" else 0)


if __name__ == "__main__":
    main()
