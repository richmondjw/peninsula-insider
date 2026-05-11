#!/usr/bin/env python3
"""
Peninsula Insider — Editorial Phrase Audit & Fix Script
Finds and replaces overused phrases across the article corpus.

Runs in two modes:
  --report   Print every match with file/line (default, no changes)
  --fix      Apply targeted replacements

Usage:
  python ops/scripts/editorial-phrase-audit.py --report
  python ops/scripts/editorial-phrase-audit.py --fix
  python ops/scripts/editorial-phrase-audit.py --fix --file articles/the-market-saturday.md
"""

import argparse
import re
from pathlib import Path

CONTENT_DIR = Path(__file__).resolve().parents[2] / "next" / "src" / "content" / "articles"

# ---------------------------------------------------------------------------
# Replacement rules: (pattern, replacement, description)
# Only replacements that are universally safe (no meaning loss) are here.
# Context-dependent fixes (e.g. "quietly" rewrites) are in CONTEXTUAL_RULES.
# ---------------------------------------------------------------------------

SAFE_REPLACEMENTS = [
    # "Here is / This is that" meta-announcement sentences — always redundant
    (r"\nHere is how to plan for it\.\n",          "\n",  "Remove 'Here is how to plan for it.'"),
    (r"\nHere is that version\.\n",                "\n",  "Remove 'Here is that version.'"),
    (r"\nHere is that list\.\n",                   "\n",  "Remove 'Here is that list.'"),
    (r"\nHere is that guide\.\n",                  "\n",  "Remove 'Here is that guide.'"),
    (r"\nThis is that guide\.\n",                  "\n",  "Remove 'This is that guide.'"),
    (r"\nThis is that version\.\n",                "\n",  "Remove 'This is that version.'"),
    (r"\nThis is that list\.\n",                   "\n",  "Remove 'This is that list.'"),
    (r"\nHere is the drive\.\n",                   "\n",  "Remove 'Here is the drive.'"),
    (r"\nThis is that plan\.\n",                   "\n",  "Remove 'This is that plan.'"),
    (r"\nHere is how to do it\.\n",                "\n",  "Remove 'Here is how to do it.'"),
    # "actually" as a hollow intensifier in common patterns
    (r"\bwhat (?:it|they|this|the \w+) actually (?:is|are|does|do)\b",
     lambda m: m.group(0).replace(" actually ", " "),
     "Remove 'actually' from 'what X actually is/does'"),
    (r"\bactually (?:excellent|strong|good|useful|great|well|better|right)\b",
     lambda m: m.group(0).replace("actually ", ""),
     "Remove hollow 'actually' before adjectives"),
    # "quietly, almost conspicuously" — self-contradictory
    (r"quietly, almost conspicuously better",
     "measurably, impressively better",
     "Fix self-contradictory 'quietly, almost conspicuously'"),
    # "quietly some of the best value" → simply "among the best value"
    (r"very quietly one of the most",
     "one of the most",
     "Remove 'very quietly' as double qualifier"),
    # "quietly, the most common" → "the most common"
    (r"quietly, the most common",
     "the most common",
     "Remove 'quietly,' before superlative"),
    # "quietly come apart" → "fall apart"
    (r"quietly come apart",
     "fall apart",
     "Replace 'quietly come apart' with 'fall apart'"),
    # "quietly waiting for" → "ready for" / "long needed"
    (r"had been quietly waiting for",
     "had been ready for",
     "Replace 'had been quietly waiting for'"),
]

# Contextual replacements — more targeted, fewer false positives
CONTEXTUAL_REPLACEMENTS = [
    # "quietly prefer" → "prefer"
    (r"\bquietly prefer\b",                "prefer",              "quietly prefer → prefer"),
    # "quietly evolved" → "evolved"
    (r"\bquietly evolved\b",               "evolved",             "quietly evolved → evolved"),
    # "quietly structured" → "carefully structured"
    (r"\bquietly structured\b",            "carefully structured","quietly structured → carefully structured"),
    # "quietly pioneering" → "genuinely pioneering"
    (r"\bquietly pioneering\b",            "genuinely pioneering","quietly pioneering → genuinely pioneering"),
    # "quietly shop at" → "shop at"
    (r"\bquietly shop at\b",               "shop at",             "quietly shop at → shop at"),
    # "quietly rival" → "rival"
    (r"\bquietly rival\b",                 "rival",               "quietly rival → rival"),
    # "quietly rearranged" → "rearranged"
    (r"\bquietly rearranged\b",            "rearranged",          "quietly rearranged → rearranged"),
    # "quietly building" → "building"
    (r"\bquietly building\b",              "building",            "quietly building → building"),
    # "quietly confident" → "calm and confident"
    (r"\bmost quietly confident\b",        "most composed and confident", "most quietly confident → most composed and confident"),
    # "quietly some of the best" → "among the best"
    (r"\bquietly some of the best\b",      "among the best",      "quietly some of the best → among the best"),
    # "quietly won" → "won" (for award/medal contexts)
    (r"\bquietly won the international\b", "won the international","quietly won the international → won the international"),
    # "quietly suspecting" → "beginning to suspect"
    (r"\bquietly suspecting\b",            "beginning to suspect","quietly suspecting → beginning to suspect"),
]

# These instances of "quietly" are KEEP — they add genuine meaning:
# - "quietly prize"      (locals' secret knowledge — keeps the insider tone)
# - "quietly ignores"    (deliberate dismissal — effective)
# - "quietly miffed"     (atmospheric, specific emotion)
# - "quietly serious"    (unexpected quality — the egg sandwich line)
# - "quietly best at"    (regional understatement — intentional)
# - "quietly prize"
# - "quietly come back" in the kids article ending (tonal)
# - "sit quietly" (literal)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def apply_replacements(text: str, rules: list, dry_run: bool) -> tuple[str, list[str]]:
    changes = []
    for rule in rules:
        if len(rule) == 3:
            pattern, replacement, description = rule
        else:
            continue
        if callable(replacement):
            new_text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        else:
            new_text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        if new_text != text:
            count = len(re.findall(pattern, text, flags=re.IGNORECASE))
            changes.append(f"  [{count}x] {description.encode('ascii', 'replace').decode('ascii')}")
            text = new_text
    return text, changes


def report_phrases(files: list[Path]) -> None:
    """Print all instances of tracked phrases with file/line context."""
    patterns = {
        "quietly": re.compile(r"\bquietly\b", re.IGNORECASE),
        "actually": re.compile(r"\bactually\b", re.IGNORECASE),
        "Here is/This is that": re.compile(r"^(Here is|This is that)\b", re.IGNORECASE | re.MULTILINE),
        "most .* on the Peninsula": re.compile(r"\bmost \w+ (?:on|in|of) the peninsula\b", re.IGNORECASE),
    }

    totals: dict[str, int] = {k: 0 for k in patterns}

    for fp in sorted(files):
        text = fp.read_text(encoding="utf-8")
        lines = text.splitlines()
        for phrase, pat in patterns.items():
            matches = list(pat.finditer(text))
            if matches:
                totals[phrase] += len(matches)
                print(f"\n{fp.name}  [{phrase}  ×{len(matches)}]")
                for m in matches[:5]:
                    lineno = text[:m.start()].count("\n") + 1
                    line = lines[lineno - 1].strip()[:100]
                    print(f"  L{lineno:3}  {line}")
                if len(matches) > 5:
                    print(f"  ... and {len(matches) - 5} more")

    print("\n" + "=" * 60)
    print("TOTALS")
    for phrase, count in totals.items():
        print(f"  {phrase:40}  {count}")


def fix_files(files: list[Path]) -> None:
    all_rules = SAFE_REPLACEMENTS + CONTEXTUAL_REPLACEMENTS
    total_changes = 0
    for fp in sorted(files):
        raw = fp.read_text(encoding="utf-8")
        # Only apply to body text, not frontmatter
        if "---" in raw:
            end_fm = raw.find("\n---", 3)
            if end_fm != -1:
                fm = raw[:end_fm + 4]
                body = raw[end_fm + 4:]
                fixed_body, changes = apply_replacements(body, all_rules, dry_run=False)
                if changes:
                    print(f"\n{fp.name}")
                    for c in changes:
                        print(c)
                    fp.write_text(fm + fixed_body, encoding="utf-8")
                    total_changes += len(changes)
            else:
                fixed, changes = apply_replacements(raw, all_rules, dry_run=False)
                if changes:
                    print(f"\n{fp.name}")
                    for c in changes:
                        print(c)
                    fp.write_text(fixed, encoding="utf-8")
                    total_changes += len(changes)
    print(f"\nTotal change types applied: {total_changes}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", action="store_true", default=False)
    parser.add_argument("--fix", action="store_true", default=False)
    parser.add_argument("--file", type=str, default=None, help="Restrict to one file (relative to articles/)")
    args = parser.parse_args()

    if args.file:
        files = [CONTENT_DIR / args.file]
    else:
        files = list(CONTENT_DIR.glob("*.md")) + list(CONTENT_DIR.glob("*.mdx"))

    if args.fix:
        fix_files(files)
    else:
        report_phrases(files)


if __name__ == "__main__":
    main()
