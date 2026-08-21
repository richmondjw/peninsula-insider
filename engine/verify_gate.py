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
from datetime import date, timedelta
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


_BUILD_SKIP = {"next", "_astro", "assets", ".git", "_archive", "node_modules",
               "docs", "ops", "engine", "reports", "images", "downloads"}


def known_sections(repo_root: Path = REPO_ROOT) -> set[str]:
    """Section names, derived from the built site with the literal set as a floor.

    Fixed 2026-07-27. _KNOWN_SECTIONS alone was missing 29 sections that exist
    and are reader-facing, among them escape, plans, awards, walks, quick-note
    and tour-packages. A link to any of them hard-FAILED, so the gate was
    blocking valid content. A gate that blocks good work gets bypassed, and a
    bypassed gate protects nothing, which makes this worse than a miss.

    Deriving from the build keeps it correct as sections are added. The union
    with the literal set means a pre-build CI checkout still gets sensible
    behaviour rather than failing everything.
    """
    sections = set(_KNOWN_SECTIONS)
    try:
        for entry in repo_root.iterdir():
            if (entry.is_dir() and entry.name not in _BUILD_SKIP
                    and not entry.name.startswith(".")):
                if next(entry.rglob("*.html"), None) is not None:
                    sections.add(entry.name)
    except OSError:
        pass
    return sections


def check_links(text: str, fm: str, site_paths: set[str],
                sections: set[str] | None = None) -> tuple[list[str], list[str]]:
    fails, flags = [], []
    if sections is None:
        sections = known_sections()
    for link in _internal_links(text, fm):
        if link in site_paths or link == "/":
            continue
        section = link.strip("/").split("/")[0]
        if section not in sections:
            fails.append(f"Internal link '{link}' points to unknown section '/{section}/' (likely 404)")
        else:
            flags.append(f"Internal link '{link}' not in sitemap yet, verify it resolves")
    return fails, flags


# ── Event grounding ────────────────────────────────────────────────────────
#
# Added 2026-07-27 after the daily engine published a recommendation for "a
# ceramics show closing soon in Red Hill" with no venue, no dates, and an FAQ
# answer telling the reader to "check the Red Hill Community Centre
# noticeboard and local Instagram accounts for the current closing date".
#
# check_venues() did not catch it because it only validates slugs declared in
# frontmatter, and this claim lived in prose. The root cause was orchestrator
# handing the generator an empty events list every day (fixed separately), but
# a gate that can block the symptom is worth having regardless: the generator
# will always be one bad day away from doing it again.

# Copy that pushes a factual claim onto the reader is an admission the writer
# did not know the fact. High precision, so it hard-fails.
_UNVERIFIABLE_REFERRAL = [
    (re.compile(r"(?i)check\s+(?:the\s+)?[\w' ]*\bnoticeboard\b"),
     "tells the reader to check a noticeboard for a fact the copy should state"),
    (re.compile(r"(?i)check\s+[\w' ]*\b(?:local\s+)?instagram\b[\w' ]*for\s+(?:the\s+)?"
                r"(?:current\s+)?(?:date|dates|closing|times?|hours)"),
     "tells the reader to check social media for a date the copy should state"),
    (re.compile(r"(?i)\b(?:shows?|events?|exhibitions?)\s+in\s+this\s+space\s+typically\b"),
     "describes what events 'typically' do instead of naming actual dates"),
    (re.compile(r"(?i)for\s+the\s+current\s+(?:closing\s+)?date[,\s]"),
     "defers the current date to the reader"),
]

# Time-bound language that implies a specific event exists. Fuzzy by nature,
# so it flags rather than fails: prose names events in ways no regex will
# reliably match against a slug.
_TIME_BOUND_CLAIM = re.compile(
    r"(?i)\b(closing soon|last chance|final week|closes? (?:this|next) \w+|"
    r"on (?:now )?until|ends? (?:this|next) \w+|this weekend only|opening (?:this|next) \w+)\b"
)


def known_event_titles(content_dir: Path) -> set[str]:
    """Lowercased titles of every event in the collection, any status.

    Any status deliberately: a claim matching an archived event is a staleness
    problem for the accuracy scan, not a fabrication, and this gate should not
    conflate the two.
    """
    titles = set()
    d = content_dir / "events"
    if not d.exists():
        return titles
    for f in glob.glob(str(d / "*.json")):
        try:
            with open(f, encoding="utf-8") as fh:
                rec = json.load(fh)
        except (json.JSONDecodeError, OSError):
            continue
        t = (rec.get("title") or "").strip().lower()
        if t:
            titles.add(t)
    return titles


def check_event_grounding(text: str, event_titles: set[str]) -> tuple[list[str], list[str]]:
    """Returns (fails, flags) for event claims the copy cannot support."""
    fails, flags = [], []

    for pattern, why in _UNVERIFIABLE_REFERRAL:
        m = pattern.search(text)
        if m:
            fails.append(
                f"Unverifiable referral: {why}. Matched: '{m.group(0)[:70]}'. "
                f"State the fact or drop the claim."
            )

    for m in _TIME_BOUND_CLAIM.finditer(text):
        phrase = m.group(0)
        # Look for any known event title in the surrounding sentence.
        start = max(0, m.start() - 220)
        window = text[start:m.end() + 220].lower()
        if not any(t in window for t in event_titles if len(t) > 10):
            flags.append(
                f"Time-bound claim '{phrase}' with no matching event record nearby. "
                f"Confirm an event exists in next/src/content/events/ before publishing."
            )
    return fails, flags


def check_fence_balance(text: str) -> list[str]:
    """Unclosed code fences. Added 2026-07-27.

    insider-picks-2026-07-27.md shipped with a lone ``` immediately after the
    frontmatter, so the whole article rendered as one monospace block that ran
    off the right edge on mobile. The 24 July "strip LLM code fences" fix held
    for the 24th and 25th then regressed on the 27th, so the stripper has a gap
    and the gate should catch what it misses.
    """
    body = re.sub(r"^---\n.*?\n---", "", text, count=1, flags=re.S)
    n = len(re.findall(r"^```", body, re.M))
    if n % 2:
        return [f"Unbalanced code fences in body ({n} found). An unclosed ``` "
                f"renders the whole article as a code block."]
    return []


def check_rotation(path: Path, text: str, repo_root: Path = REPO_ROOT) -> list[str]:
    """Block a column that features a venue inside its cooldown.

    A rotation rule that lives only in the prompt is a suggestion, and this
    generator has shown it will drift. Only applies to picks columns.
    """
    if "insider-picks-" not in path.name and "weekend-picks-" not in path.name:
        return []
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import recency
    except ImportError:
        return []
    m = re.search(r"(\d{4}-\d{2}-\d{2})", path.name)
    if not m:
        return []
    try:
        today = date.fromisoformat(m.group(1))
    except ValueError:
        return []
    try:
        # Exclude this column from its own ledger, or it blocks itself.
        ledger = recency.build_ledger(repo_root, today - timedelta(days=1))
    except Exception:
        return []
    venues = {v["slug"]: v.get("name", "") for v in recency.load_venues(repo_root)}
    # Must match how the ledger decides a venue was featured, or the gate
    # enforces a stricter rule than the one it built. Matching the whole article
    # flagged "Pair it with: Flinders Sourdough two doors up" as a repeat
    # feature, which it plainly is not.
    low = recency._feature_text(text).lower()
    fails = []
    for slug in ledger["blocked"]:
        name = venues.get(slug, "")
        if len(name) >= 8 and name.lower() in low:
            fails.append(f"Rotation violation: '{name}' is inside its "
                         f"{recency.VENUE_COOLDOWN_DAYS}-day cooldown and cannot be featured again yet.")
    return fails


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
    ef, eflags = check_event_grounding(text, known_event_titles(content_dir))
    ff = check_fence_balance(text)
    rf = check_rotation(path, text, content_dir.parents[2])

    fails = vf + df + lf + ef + ff + rf
    flags = lflags + eflags + _soft_flags(text)
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
