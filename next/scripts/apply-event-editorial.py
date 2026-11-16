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
from pathlib import Path

# These are the editorial-overlay fields the skill is allowed to write.
# Machine-imported fields (title, venue, dates, etc.) are NEVER touched.
EDITORIAL_FIELDS = {
    'whyWeCare', 'editorVerdict', 'editorNote', 'pairingProse',
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


def apply_to_event(slug: str, editorial: dict, dry_run: bool,
                   events_dir: Path | None = None) -> ValidationReport:
    # events_dir is a test-harness override. Production callers pass none:
    # the default is the real corpus, exactly as before.
    repo_root = Path(__file__).resolve().parent.parent
    base = events_dir or (repo_root / 'src' / 'content' / 'events')
    event_path = Path(base) / f'{slug}.json'
    if not event_path.exists():
        report = ValidationReport()
        report.errors.append(f"Event not found: {event_path}")
        return report

    data = json.loads(event_path.read_text(encoding='utf-8'))

    report = ValidationReport()
    validate_editorial(editorial, report)

    # PI-004: a visit claim needs a visit record.
    #
    # `editorVisited` is the flag that licenses first-hand copy, and this
    # script cannot create the thing that would justify it. The visit belongs
    # in the record's `editorialProvenance.visit` block, written by whoever went.
    # records in this corpus claim a visit today, which is the correct number
    # until one of them earns it.
    if editorial.get('editorVisited') and not (data.get('editorialProvenance') or {}).get('visit'):
        report.errors.append(
            "editorVisited: refusing to assert a visit. The record carries no "
            "editorialProvenance.visit block, so no visit is documented."
        )

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

    # PI-004: this script does NOT touch lastCheckedDate, and must not.
    #
    # It used to stamp it to today on every run. Applying a blurb is not a
    # factual check: the editorial overlay above is prose about an event, and
    # writing a verification date off the back of it asserts to a reader that
    # somebody re-confirmed the dates, the venue and the ticketing on the day
    # the copy was applied. Nobody did. lastCheckedDate advances only when a
    # source was actually read, which is a different job than this one.
    #
    # The comment on the deleted line said 'Stamp lastVerified' while the code
    # wrote lastCheckedDate. That slip is the whole ticket in miniature: the
    # review date and the fact-check date had drifted into one field and one
    # word. scripts/test_apply_event_editorial.py holds this line.

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
    p.add_argument('--events-dir', type=Path,
                   help="Test-harness override. Production callers omit this.")
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

    report = apply_to_event(args.slug, editorial, dry_run=args.check_only,
                            events_dir=args.events_dir)

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
