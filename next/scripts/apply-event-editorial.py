#!/usr/bin/env python3
"""
apply-event-editorial.py — apply hand-written or LLM-generated editorial
fields to an event JSON, with voice validation.

This is the back half of the event-card-research-writeup skill. It takes
editorial-fields YAML (either inline via --editorial or extracted from the
bottom of a research note) and writes them to the event JSON, preserving
all machine-imported fields.

Voice validation enforces Peninsula Insider's house rules:
- No em-dashes
- No exclamation marks
- No emojis
- Word-count ranges per field

If validation fails, the script writes nothing and exits with the report.

Usage:
    python next/scripts/apply-event-editorial.py \\
        --slug tall-poppy-melbourne-design-week-exhibition \\
        --research ops/reports/events/research/tall-poppy-melbourne-design-week-exhibition.md

    # Or pass editorial YAML inline:
    python next/scripts/apply-event-editorial.py --slug some-event --editorial path/to/editorial.yaml

    # Validate-only (no write):
    python next/scripts/apply-event-editorial.py --slug some-event --research path --check-only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

# These are the editorial-overlay fields the skill is allowed to write.
# Machine-imported fields (title, venue, dates, etc.) are NEVER touched.
EDITORIAL_FIELDS = {
    'whyWeCare', 'editorVerdict', 'editorNote', 'pairingProse',
    'kidsGrade', 'kidsGradeNote',
    'worthTheDrive', 'firstTimer', 'editorVisited',
    'lens',
    'skipThis', 'skipReason', 'skipInstead',
    'standoutOfMonth', 'featuredInDispatch',
}

# Word-count ranges per field. (min, max). None = no limit.
WORD_RANGES = {
    'whyWeCare': (8, 30),
    'editorVerdict': (25, 90),
    'editorNote': (200, 500),
    'pairingProse': (5, 25),
    'kidsGradeNote': (5, 60),
}


@dataclass
class ValidationReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def validate_voice(field_name: str, value: str | int | bool | list,
                   report: ValidationReport) -> None:
    if not isinstance(value, str):
        return
    # House rules
    if '—' in value:
        report.errors.append(f"{field_name}: contains an em-dash, replace with comma/colon/period.")
    if '!' in value:
        report.errors.append(f"{field_name}: contains an exclamation mark.")
    # Emoji check (rough — anything outside ASCII + standard typography)
    if re.search(r'[\U0001F300-\U0001FAFF\U0001F600-\U0001F64F]', value):
        report.errors.append(f"{field_name}: contains an emoji.")
    # Promotional language sniff
    lower = value.lower()
    for phrase in ('join us', 'don\'t miss', 'unmissable', 'must-see',
                   'a must', 'amazing', 'incredible'):
        if phrase in lower:
            report.warnings.append(f"{field_name}: contains promotional phrase '{phrase}'.")
    # Word count
    if field_name in WORD_RANGES:
        word_count = len(value.split())
        lo, hi = WORD_RANGES[field_name]
        if word_count < lo:
            report.warnings.append(f"{field_name}: {word_count} words, below {lo}-{hi} range.")
        elif word_count > hi:
            report.warnings.append(f"{field_name}: {word_count} words, above {lo}-{hi} range.")


def parse_research_note(path: Path) -> dict:
    """Extract editorial fields from the bottom of a research note.

    Convention: the research note may end with a fenced ```yaml block tagged
    'editorial'. If absent, returns empty dict and the caller can supply
    fields via --editorial-yaml.
    """
    text = path.read_text(encoding='utf-8')
    m = re.search(r'```yaml\s+editorial\s*\n(.+?)\n```', text, re.DOTALL)
    if not m:
        return {}
    try:
        import yaml
    except ImportError:
        print("ERROR: PyYAML required to parse research note YAML block. pip install pyyaml")
        sys.exit(1)
    return yaml.safe_load(m.group(1)) or {}


def parse_editorial_yaml(path: Path) -> dict:
    text = path.read_text(encoding='utf-8')
    try:
        import yaml
    except ImportError:
        print("ERROR: PyYAML required. pip install pyyaml")
        sys.exit(1)
    return yaml.safe_load(text) or {}


def validate_editorial(editorial: dict, report: ValidationReport) -> None:
    # Reject any field outside the allow-list
    for k in editorial:
        if k not in EDITORIAL_FIELDS:
            report.errors.append(f"Field '{k}' is not editorial-owned. Refusing to apply.")
    # Per-field validation
    for k, v in editorial.items():
        if k in EDITORIAL_FIELDS:
            validate_voice(k, v, report)


def apply_to_event(slug: str, editorial: dict, dry_run: bool) -> ValidationReport:
    repo_root = Path(__file__).resolve().parent.parent
    event_path = repo_root / 'src' / 'content' / 'events' / f'{slug}.json'
    if not event_path.exists():
        report = ValidationReport()
        report.errors.append(f"Event not found: {event_path}")
        return report

    data = json.loads(event_path.read_text(encoding='utf-8'))

    report = ValidationReport()
    validate_editorial(editorial, report)
    if not report.ok:
        return report

    changed = []
    for k, v in editorial.items():
        # Normalise trailing whitespace on string fields (YAML pipe blocks
        # preserve a trailing newline that JSON-raw values don't have).
        if isinstance(v, str):
            v = v.rstrip()
        if data.get(k) != v:
            changed.append(k)
            data[k] = v

    # Stamp lastVerified to today
    data['lastCheckedDate'] = date.today().isoformat()

    if changed:
        if dry_run:
            print(f"WOULD UPDATE: {slug}")
            for k in changed:
                print(f"  - {k}")
        else:
            event_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n',
                                  encoding='utf-8')
            print(f"UPDATED: {slug}")
            for k in changed:
                print(f"  - {k}")
    else:
        print(f"NO CHANGES: {slug} (editorial fields already match)")

    return report


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--slug', required=True)
    p.add_argument('--research', type=Path, help="Research note path. Reads YAML block if present.")
    p.add_argument('--editorial', type=Path, help="Editorial fields YAML path.")
    p.add_argument('--check-only', action='store_true', help="Validate only, no write.")
    args = p.parse_args()

    if not args.research and not args.editorial:
        print("ERROR: pass --research or --editorial")
        return 2

    editorial = {}
    if args.research:
        editorial = parse_research_note(args.research)
        if not editorial:
            print(f"NOTE: no editorial YAML block found in {args.research}")
            print("      Add a ```yaml editorial block to the research note,")
            print("      or pass --editorial path/to/editorial.yaml directly.")
    if args.editorial:
        editorial = parse_editorial_yaml(args.editorial)

    if not editorial:
        print("ERROR: no editorial fields to apply.")
        return 2

    report = apply_to_event(args.slug, editorial, dry_run=args.check_only)

    if report.warnings:
        print("\nWarnings:")
        for w in report.warnings:
            print(f"  - {w}")

    if report.errors:
        print("\nErrors:")
        for e in report.errors:
            print(f"  - {e}")
        return 1

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
