#!/usr/bin/env python3
"""
rederive-lenses.py — daily safety-net cron job.

Walks every event JSON file and recomputes the auto-derived `lens` array
from the data already in the file (visitorAppealScore, weatherShape,
priceTier, bookingRequired, ticketingUrl).

Editor's lens tags are preserved when the editor has hand-curated. The
auto-derive only fires when the array is empty or absent. This prevents
editor work being clobbered.

Why this exists: lens tags drive what surfaces in the editorial sections
of /whats-on/. If an editor adjusts visitorAppealScore on an event, the
lens tags should refresh accordingly. Daily run keeps things consistent
without re-running the full spreadsheet import.
"""

from __future__ import annotations

import json
from pathlib import Path

EVENT_DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'events'

# A small marker that says "auto-derived, safe to overwrite." If we ever
# need to distinguish editor-set from auto-set lenses, we use this.
AUTO_DERIVED_MARKER = '_lensAutoDerived'


def derive_lens(data: dict) -> list[str]:
    tags: list[str] = []
    appeal = data.get('visitorAppealScore') or 0
    if appeal >= 4:
        tags.append('weekend-pick')
    if appeal >= 5 or data.get('worthTheDrive'):
        tags.append('worth-the-drive')
    if data.get('weatherShape') == 'all-weather':
        tags.append('rainy-day')
    if data.get('familyFriendly'):
        tags.append('family-saturday')
    if data.get('priceTier') == 'free':
        tags.append('free')
    booking = (data.get('bookingRequired') or '').lower()
    if 'no' in booking or 'walk' in booking:
        tags.append('walk-in')
    elif 'yes' in booking and data.get('ticketingUrl'):
        tags.append('ticketed')
    return tags


def main() -> int:
    updated = []
    skipped_editor_set = []

    for path in sorted(EVENT_DIR.glob('*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"SKIP (parse error) {path.name}: {e}")
            continue

        # Editor-set lens tags are preserved. Heuristic: if the file has
        # editorVerdict or editorNote, treat the lens as editor-curated and
        # leave alone. Without that signal, lens is considered auto-derived.
        has_editorial_overlay = bool(
            data.get('editorVerdict') or data.get('editorNote') or data.get('whyWeCare')
        )
        if has_editorial_overlay and data.get('lens'):
            skipped_editor_set.append(path.stem)
            continue

        new_lens = derive_lens(data)
        existing = data.get('lens') or []
        if sorted(existing) == sorted(new_lens):
            continue

        data['lens'] = new_lens
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n',
                        encoding='utf-8')
        updated.append(f"{path.stem}: {new_lens}")

    print(f"Updated lens on {len(updated)} events")
    for line in updated[:20]:
        print(f"  - {line}")
    if len(updated) > 20:
        print(f"  ... and {len(updated) - 20} more")
    print(f"Skipped (editor-curated): {len(skipped_editor_set)}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
