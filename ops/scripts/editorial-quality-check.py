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
