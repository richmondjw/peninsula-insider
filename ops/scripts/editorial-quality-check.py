#!/usr/bin/env python3
"""
Peninsula Insider — Editorial Quality Check
Runs as a weekly CRON job. Audits all published articles and venue notes
for style violations, stale cross-references, and content architecture issues.

Outputs:
  - ops/reports/editorial/quality-YYYY-MM-DD.md (Markdown report)
  - Exit code 0 = pass (no blockers), 1 = warnings present

CRON schedule: Weekly, Sunday 06:00 AEST (Saturday 20:00 UTC)

Usage:
  python ops/scripts/editorial-quality-check.py
  python ops/scripts/editorial-quality-check.py --fail-on-warnings
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT     = Path(__file__).resolve().parents[2]
ARTICLES_DIR  = REPO_ROOT / "next" / "src" / "content" / "articles"
VENUES_DIR    = REPO_ROOT / "next" / "src" / "content" / "venues"
REPORT_DIR    = REPO_ROOT / "ops" / "reports" / "editorial"

# ---------------------------------------------------------------------------
# Phrase blacklist — tracked per the PI Editorial Style Guide (v1)
# Each entry: (pattern, severity, note)
# severity: "error" (must fix before publish) | "warning" (flag for review)
# ---------------------------------------------------------------------------

PHRASE_BLACKLIST = [
    # Hollow intensifiers
    (r"\bactually\b",                   "warning", "Hollow intensifier — remove or replace with the specific claim"),
    (r"\breally\b",                     "warning", "Weak intensifier — use a concrete adjective"),
    (r"\bvery\b",                       "warning", "Weak intensifier — find a stronger word"),
    (r"\bjust\b",                        "warning", "Filler word — usually removable"),
    # Overused PI-specific words
    (r"\bquietly\b",                    "warning", "Overused PI modifier — use sparingly, 2 max per article"),
    (r"\bgenuinely\b",                  "warning", "Overused PI intensifier — use sparingly"),
    # Meta-announcement sentences (remove these)
    (r"^here is how to\b",              "error",   "Meta-announcement sentence — cut it, the content follows"),
    (r"^this is that (guide|list|version|plan)\b", "error", "Meta-announcement sentence — cut it"),
    (r"^here is the (drive|plan|route|list)\b",    "error", "Meta-announcement sentence — cut it"),
    # Clichéd travel writing
    (r"\bhidden gem\b",                 "error",   "Travel writing cliché — banned phrase"),
    (r"\bmust.see\b",                   "error",   "Travel writing cliché — banned phrase"),
    (r"\bworld.class\b",                "error",   "Vague superlative — be specific"),
    (r"\bsecond to none\b",             "error",   "Cliché — be specific"),
    (r"\bsomething for everyone\b",     "error",   "Cliché — be specific"),
    (r"\btruly (special|unique|amazing|incredible)\b", "error", "Cliché intensifier — be specific"),
    (r"\bpicturesque\b",                "warning", "Generic landscape word — describe what you actually see"),
    (r"\bstunning\b",                   "warning", "Overused — be specific about what stuns"),
    (r"\bcharming\b",                   "warning", "Vague positive — what is the specific quality?"),
    (r"\bmagical\b",                    "warning", "Vague positive — be specific"),
    (r"\bwonderful\b",                  "warning", "Vague positive — be specific"),
    (r"\bincredible\b",                 "warning", "Vague positive — be specific"),
    (r"\bamazing\b",                    "warning", "Vague positive — be specific"),
    # AI-pattern flags
    (r"\bdelve\b",                      "error",   "AI-associated word — banned"),
    (r"\bfoster\b",                     "warning", "AI-associated word — review"),
    (r"\bleverage\b",                   "warning", "Corporate jargon — use a plain verb"),
    (r"\bcurated\b",                    "warning", "Overused in the category — PI should show curation, not claim it"),
    (r"\bseamless\b",                   "warning", "AI/marketing cliché — be specific"),
    (r"\btailored\b",                   "warning", "Marketing language — be specific"),
    (r"\bboast\b",                      "warning", "Promotional tone — use a neutral verb"),
    (r"\bboasts\b",                     "warning", "Promotional tone — use a neutral verb"),
    # Em-dash variants (PI uses ' - ' not em-dash)
    (r"—",                              "error",   "Em-dash found — PI style uses ' - ' (space-hyphen-space)"),
]

# Minimum word counts by format
MIN_WORD_COUNTS = {
    "service":               600,
    "slow-peninsula":        500,
    "cellar-door-dispatch":  400,
    "weekend-picker":        200,
    "stay-notes":            300,
    "insider-edit":          300,
    "long-lunch-list":       400,
    "editors-letter":        200,
    "interview":             500,
    "investigation":         600,
}

# Maximum word counts (flag if exceeded — suggests bloat)
MAX_WORD_COUNTS = {
    "service":               3000,
    "slow-peninsula":        2500,
    "cellar-door-dispatch":  1800,
    "weekend-picker":        800,
    "stay-notes":            1500,
}

# ---------------------------------------------------------------------------
# Internal Editorial Structure Framework — checks for §4.5 of the Style Guide
# Framework lives at: peninsula-insider-vault/03-editorial/editorial-structure-framework.md
# Phase coverage: orientation, payoffs, planning value, continuation.
# Started as warnings only — promote to errors after a corpus-wide sweep.
# ---------------------------------------------------------------------------

# Formats the framework applies to (long-form planning pieces).
# Excluded: weekend-picker (short dispatches), editors-letter (opinion), interview (Q&A).
FRAMEWORK_FORMATS = {
    "service", "slow-peninsula", "insider-edit", "long-lunch-list",
    "investigation", "cellar-door-dispatch", "stay-notes",
}
# Planning-value applies only to pieces that promise utility.
PLANNING_VALUE_FORMATS = {
    "service", "insider-edit", "long-lunch-list", "stay-notes",
}

# Orientation: lede must signal one of mood / problem / why-this-matters / experience type.
# Heuristics: detect generic openings (warn) and absence of orientation markers (warn).
GENERIC_OPENING_PATTERNS = [
    r"^welcome to ",
    r"^as (summer|autumn|winter|spring) ",
    r"^the mornington peninsula (is|offers) ",
    r"^nestled ",
    r"^picture ",
    r"^imagine ",
    r"^there is something (special|magical|wonderful) ",
]
ORIENTATION_MARKERS = [
    r"\bworks best\b",
    r"\bbest experienced\b",
    r"\btreat (it|this) as\b",
    r"\bfail because\b",
    r"\bproblem (is|with)\b",
    r"\bbest when\b",
    r"\bif you ",   # conditional planning frame
    r"\bmost (people|visitors|travellers) ",
    r"\bthe trick is\b",
    r"\bdo this if\b",
]

# Payoffs: each H2 section should answer the "so what" at least once.
PAYOFF_MARKERS = [
    r"\bthis is what makes\b",
    r"\bthis works best\b",
    r"\bthe best version\b",
    r"\bthis is where\b",
    r"\bbest for\b",
    r"\bsuits (families|couples|groups|solo|kids|locals)\b",
    r"\bworth the (drive|trip|walk|wait)\b",
    r"\bworth doing\b",
    r"\bworth a (visit|stop|detour)\b",
    r"\bthe payoff is\b",
    r"\bthe point is\b",
    r"\bwhat makes (this|it) work\b",
    r"\bif you have\b",       # "if you have an hour..."
    r"\ballow (\d|an? )",     # "allow an hour", "allow 90 minutes"
]

# Planning value: piece should answer at least two of these categories.
PLANNING_CATEGORIES = {
    "timing": [
        r"\ballow (\d|an? )",
        r"\b(\d+)\s*(minute|hour|min|hr)s?\b",
        r"\bhalf a day\b", r"\bhalf.day\b",
        r"\bmid-afternoon\b", r"\bby lunchtime\b",
        r"\bby late afternoon\b",
    ],
    "suitability": [
        r"\bsuits (families|couples|groups|solo|kids|locals|dogs)\b",
        r"\bbest for\b",
        r"\b(family|kid|dog).friendly\b",
        r"\bwith (kids|children|dogs)\b",
        r"\bdate (night|day)\b",
    ],
    "pairing": [
        r"\bcombine (with|nearby)\b",
        r"\bpair (this|it) with\b",
        r"\bbest paired with\b",
        r"\bnext stop\b",
        r"\bfollow this with\b",
        r"\bfrom here\b",
        r"\bnearby (you|is|are)\b",
        r"\bif you have more time\b",
    ],
    "weather": [
        r"\brainy day\b",
        r"\bbad weather\b",
        r"\bworks in (rain|cold|wind|summer|winter|autumn|spring)\b",
        r"\bweather suitability\b",
        r"\bif (it|the weather) (rains|turns)\b",
        r"\bin colder weather\b",
        r"\bin warmer weather\b",
    ],
}

# Continuation: piece should end on a move, not stop.
CONTINUATION_MARKERS = [
    r"\bbest paired with\b",
    r"\bworth extending\b",
    r"\bworks best as part of\b",
    r"\bcontinue (toward|to|with)\b",
    r"\bpair this with\b",
    r"\bif (the weather|it) turns\b",
    r"\bfrom here,?\b",
    r"\bnext stop\b",
    r"\bfollow this with\b",
    r"\bif you have more time\b",
    r"\bif you have an? (extra|more)\b",
    r"\bextending into\b",
    r"\binto an overnight\b",
    r"\bover to\b",         # "over to Sorrento for..."
    r"\bend the day\b",
    r"\bstay the night\b",
    r"\bcarry on to\b",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_raw = text[3:end].strip()
    body = text[end + 4:].strip()
    data: dict = {}
    for line in fm_raw.splitlines():
        if ":" in line and not line.startswith(" ") and not line.startswith("-"):
            key, _, val = line.partition(":")
            val = val.strip().strip('"').strip("'")
            if val.lower() == "true":
                val = True
            elif val.lower() == "false":
                val = False
            data[key.strip()] = val
    return data, body


def word_count(text: str) -> int:
    return len(re.findall(r"\w+", text))


def count_phrase(text: str, pattern: str) -> int:
    return len(re.findall(pattern, text, re.IGNORECASE | re.MULTILINE))


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_phrases(slug: str, body: str, fmt: str) -> list[dict]:
    issues = []
    # Phrase blacklist
    phrase_counts: dict[str, int] = {}
    for pattern, severity, note in PHRASE_BLACKLIST:
        count = count_phrase(body, pattern)
        if count > 0:
            key = pattern
            phrase_counts[key] = count
            # "quietly" is allowed up to 2 times
            if pattern == r"\bquietly\b" and count <= 2:
                continue
            issues.append({
                "slug": slug, "check": "phrase_blacklist",
                "severity": severity, "count": count,
                "message": f"`{pattern}` ({count}x) — {note}",
            })
    return issues


def check_word_count(slug: str, body: str, fmt: str) -> list[dict]:
    issues = []
    wc = word_count(body)
    if fmt in MIN_WORD_COUNTS and wc < MIN_WORD_COUNTS[fmt]:
        issues.append({
            "slug": slug, "check": "word_count_min",
            "severity": "warning",
            "message": f"Word count {wc} below minimum {MIN_WORD_COUNTS[fmt]} for format '{fmt}'",
        })
    if fmt in MAX_WORD_COUNTS and wc > MAX_WORD_COUNTS[fmt]:
        issues.append({
            "slug": slug, "check": "word_count_max",
            "severity": "warning",
            "message": f"Word count {wc} exceeds expected maximum {MAX_WORD_COUNTS[fmt]} for format '{fmt}' — consider trimming",
        })
    return issues


def check_stale_venue_refs(slug: str, data: dict) -> list[dict]:
    """Flag articles that reference closed or sitemapExclude venues."""
    issues = []
    related = data.get("relatedVenues", [])
    if not isinstance(related, list):
        return issues
    for venue_slug in related:
        venue_file = VENUES_DIR / f"{venue_slug}.json"
        if not venue_file.exists():
            issues.append({
                "slug": slug, "check": "stale_venue_ref",
                "severity": "warning",
                "message": f"relatedVenues references `{venue_slug}` — file not found",
            })
            continue
        try:
            venue_data = json.loads(venue_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        if venue_data.get("status") == "closed":
            issues.append({
                "slug": slug, "check": "stale_venue_ref",
                "severity": "error",
                "message": f"relatedVenues references `{venue_slug}` which has status: closed",
            })
        if venue_data.get("sitemapExclude") is True:
            issues.append({
                "slug": slug, "check": "stale_venue_ref",
                "severity": "warning",
                "message": f"relatedVenues references `{venue_slug}` which is sitemapExclude (staging only)",
            })
    return issues


def check_faq_length(slug: str, text: str) -> list[dict]:
    """Flag FAQ answers over 5 sentences."""
    issues = []
    faq_section = re.search(r"^faq:(.+?)^(?=\w|\Z)", text, re.DOTALL | re.MULTILINE)
    if not faq_section:
        return issues
    answers = re.findall(r"answer:\s*[\"'](.+?)[\"']", faq_section.group(0), re.DOTALL)
    for answer in answers:
        sentences = len(re.findall(r"[.!?]+\s", answer))
        if sentences > 5:
            issues.append({
                "slug": slug, "check": "faq_length",
                "severity": "warning",
                "message": f"FAQ answer has ~{sentences} sentences — trim to 4 max, move excess to article body",
            })
    return issues


def _strip_markdown_body(body: str) -> str:
    """Strip H2+/HTML/quotes so paragraph-level checks see prose, not markup."""
    text = re.sub(r"^#{1,6}\s.*$", "", body, flags=re.MULTILINE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    return text


def _split_h2_sections(body: str) -> list[tuple[str, str]]:
    """Return [(heading, section_body)] for each H2 section."""
    sections: list[tuple[str, str]] = []
    parts = re.split(r"^##\s+(.+?)$", body, flags=re.MULTILINE)
    # parts: [pre-amble, h2_1, body_1, h2_2, body_2, ...]
    for i in range(1, len(parts), 2):
        heading = parts[i].strip()
        section_body = parts[i + 1] if (i + 1) < len(parts) else ""
        # Trim at next H1 if any
        section_body = re.split(r"^#\s+", section_body, flags=re.MULTILINE)[0]
        sections.append((heading, section_body))
    return sections


def _matches_any(text: str, patterns: list[str]) -> bool:
    for p in patterns:
        if re.search(p, text, re.IGNORECASE | re.MULTILINE):
            return True
    return False


def check_framework_orientation(slug: str, body: str, fmt: str) -> list[dict]:
    """Lede must signal mood / problem / why-this-matters / experience type.
    Generic openings or absence of orientation markers in the first 2 paragraphs flag a warning."""
    if fmt not in FRAMEWORK_FORMATS:
        return []
    issues: list[dict] = []
    prose = _strip_markdown_body(body).strip()
    if not prose:
        return issues
    # First two paragraphs only
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", prose) if p.strip()]
    lede = "\n\n".join(paragraphs[:2]).lower()
    if not lede:
        return issues
    # Generic opening?
    if _matches_any(lede, GENERIC_OPENING_PATTERNS):
        issues.append({
            "slug": slug, "check": "framework_orientation",
            "severity": "warning",
            "message": "Lede opens with a generic / tourism-style frame — establish mood, problem, or why-this-matters instead",
        })
        return issues
    # No orientation marker at all?
    if not _matches_any(lede, ORIENTATION_MARKERS):
        issues.append({
            "slug": slug, "check": "framework_orientation",
            "severity": "warning",
            "message": "Lede has no orientation marker (mood / problem / why-this-matters / experience type) — see framework §1",
        })
    return issues


def check_framework_payoffs(slug: str, body: str, fmt: str) -> list[dict]:
    """Each H2 section should answer 'so what' at least once. Sections without a payoff marker flag a warning."""
    if fmt not in FRAMEWORK_FORMATS:
        return []
    issues: list[dict] = []
    sections = _split_h2_sections(body)
    if not sections:
        return issues
    missing: list[str] = []
    for heading, section_body in sections:
        prose = _strip_markdown_body(section_body)
        if word_count(prose) < 40:  # short callout sections excused
            continue
        if not _matches_any(prose, PAYOFF_MARKERS):
            missing.append(heading)
    if missing:
        sample = ", ".join(f"`{h}`" for h in missing[:3])
        more = "" if len(missing) <= 3 else f" (and {len(missing) - 3} more)"
        issues.append({
            "slug": slug, "check": "framework_payoffs",
            "severity": "warning",
            "message": f"{len(missing)} section(s) without a 'so what' payoff sentence: {sample}{more} — see framework §5",
        })
    return issues


def check_framework_planning_value(slug: str, body: str, fmt: str) -> list[dict]:
    """Planning pieces should answer at least 2 of: timing / suitability / pairing / weather."""
    if fmt not in PLANNING_VALUE_FORMATS:
        return []
    issues: list[dict] = []
    prose = _strip_markdown_body(body)
    if not prose:
        return issues
    hit_categories = sum(1 for patterns in PLANNING_CATEGORIES.values() if _matches_any(prose, patterns))
    if hit_categories < 2:
        issues.append({
            "slug": slug, "check": "framework_planning_value",
            "severity": "warning",
            "message": f"Piece signals only {hit_categories}/4 planning categories (timing / suitability / pairing / weather) — reads as description, not plan; see framework §6",
        })
    return issues


def check_framework_continuation(slug: str, body: str, fmt: str) -> list[dict]:
    """Piece should end on a continuation move (best paired with / worth extending / continue toward / ...)."""
    if fmt not in FRAMEWORK_FORMATS:
        return []
    issues: list[dict] = []
    prose = _strip_markdown_body(body).strip()
    if not prose:
        return issues
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", prose) if p.strip()]
    tail = " ".join(paragraphs[-2:]).lower()
    if not _matches_any(tail, CONTINUATION_MARKERS):
        issues.append({
            "slug": slug, "check": "framework_continuation",
            "severity": "warning",
            "message": "Piece ends abruptly — no continuation move (pair / extend / continue / next stop). See framework §7",
        })
    return issues


def check_duplicate_intent(articles: list[dict]) -> list[dict]:
    """Flag pairs of articles with identical or very similar titles/tags."""
    issues = []
    tag_index: dict[str, list[str]] = {}
    for a in articles:
        tags = a.get("tags", [])
        if not isinstance(tags, list):
            continue
        for tag in tags:
            tag_index.setdefault(tag, []).append(a["slug"])

    # Find tags shared by 5+ articles — potential cannibalisation clusters
    for tag, slugs in tag_index.items():
        if len(slugs) >= 6:
            issues.append({
                "slug": "__cluster__", "check": "intent_cluster",
                "severity": "warning",
                "message": f"Tag `{tag}` shared by {len(slugs)} articles: {', '.join(slugs[:5])}{'...' if len(slugs) > 5 else ''} — review for cannibalisation",
            })
    return issues


def check_venue_editor_notes() -> list[dict]:
    """Flag venues with very short or missing editor notes."""
    issues = []
    for fp in sorted(VENUES_DIR.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        if data.get("sitemapExclude") or data.get("status") == "closed":
            continue
        slug = data.get("slug", fp.stem)
        note = data.get("editorNote", "") or ""
        sig = data.get("signature", "") or ""
        if not note and not sig:
            issues.append({
                "slug": slug, "check": "venue_missing_copy",
                "severity": "warning",
                "message": f"Venue `{slug}` has no editorNote and no signature",
            })
        elif note and len(note.split()) < 20:
            issues.append({
                "slug": slug, "check": "venue_thin_copy",
                "severity": "warning",
                "message": f"Venue `{slug}` editorNote is only {len(note.split())} words — consider expanding",
            })
    return issues


# ---------------------------------------------------------------------------
# Main audit
# ---------------------------------------------------------------------------

def run_audit() -> tuple[list[dict], list[dict]]:
    all_issues: list[dict] = []
    article_meta: list[dict] = []

    for fp in sorted(list(ARTICLES_DIR.glob("*.md")) + list(ARTICLES_DIR.glob("*.mdx"))):
        raw = fp.read_text(encoding="utf-8")
        data, body = parse_frontmatter(raw)
        if data.get("status") not in ("published",):
            continue
        slug = fp.stem
        fmt = data.get("format", "service")

        meta = {"slug": slug, "format": fmt, "tags": data.get("tags", [])}
        article_meta.append(meta)

        all_issues += check_phrases(slug, body, fmt)
        all_issues += check_word_count(slug, body, fmt)
        all_issues += check_stale_venue_refs(slug, data)
        all_issues += check_faq_length(slug, raw)
        all_issues += check_framework_orientation(slug, body, fmt)
        all_issues += check_framework_payoffs(slug, body, fmt)
        all_issues += check_framework_planning_value(slug, body, fmt)
        all_issues += check_framework_continuation(slug, body, fmt)

    all_issues += check_duplicate_intent(article_meta)
    all_issues += check_venue_editor_notes()

    errors   = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]
    return errors, warnings


# ---------------------------------------------------------------------------
# Report writer
# ---------------------------------------------------------------------------

def write_report(errors: list[dict], warnings: list[dict]) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    report_path = REPORT_DIR / f"quality-{today}.md"

    lines = [
        f"# Peninsula Insider — Editorial Quality Report",
        f"**Date:** {today}",
        f"**Errors:** {len(errors)}  |  **Warnings:** {len(warnings)}",
        "",
        "---",
        "",
    ]

    if errors:
        lines += ["## Errors (must fix before next publish)", ""]
        for i in errors:
            lines.append(f"- **[{i['slug']}]** `{i['check']}` — {i['message']}")
        lines.append("")

    if warnings:
        lines += ["## Warnings (review and address)", ""]
        # Group by check type
        by_check: dict[str, list] = {}
        for i in warnings:
            by_check.setdefault(i["check"], []).append(i)
        for check, items in sorted(by_check.items()):
            lines.append(f"### {check} ({len(items)})")
            for item in items[:20]:
                lines.append(f"- **{item['slug']}** — {item['message']}")
            if len(items) > 20:
                lines.append(f"- _(and {len(items) - 20} more)_")
            lines.append("")

    if not errors and not warnings:
        lines += ["## Result", "", "No issues found. Corpus is clean."]

    lines += [
        "---",
        "",
        "_Generated by `ops/scripts/editorial-quality-check.py`._",
        "_To fix phrase violations: `python ops/scripts/editorial-phrase-audit.py --fix`_",
    ]

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fail-on-warnings", action="store_true")
    args = parser.parse_args()

    print("Running Peninsula Insider editorial quality audit...")
    errors, warnings = run_audit()

    report_path = write_report(errors, warnings)
    print(f"Report: {report_path}")
    print(f"Errors: {len(errors)}  Warnings: {len(warnings)}")

    if errors:
        print("\nERRORS found — fix before next publish.")
        for e in errors[:10]:
            print(f"  [{e['slug']}] {e['message']}")
        sys.exit(1)

    if args.fail_on_warnings and warnings:
        print(f"\n{len(warnings)} warnings — run with --report for details.")
        sys.exit(1)

    print("Quality check passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
