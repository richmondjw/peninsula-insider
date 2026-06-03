#!/usr/bin/env python3
"""
archive-expired-events.py — daily cron job 2 from the events registry design.

For each event where endDate (or startDate if no endDate) + 1 day is before
today (i.e. the event ended yesterday or earlier), set status to "archived". Editor can flag `keepLive: true` on a JSON
file to opt out of auto-archive (handy for post-mortem windows).

Auto-archive rule: only one-off and annual recurring events are eligible.
Weekly / monthly / ongoing events never auto-archive.

The script writes back to the JSON files in place. Diff is committed by the
GitHub Actions workflow.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from pathlib import Path

GRACE_DAYS = 1  # archive events the day after they end (was 14)
EVENT_DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'events'
ARCHIVE_ELIGIBLE_RECURRENCES = {'one-off', 'annual', 'seasonal'}


def parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except (ValueError, TypeError):
        return None


def main() -> int:
    today = date.today()
    cutoff = today - timedelta(days=GRACE_DAYS)
    archived = []
    skipped_keep_live = []

    for path in sorted(EVENT_DIR.glob('*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"SKIP (parse error) {path.name}: {e}")
            continue

        if data.get('status') == 'archived':
            continue
        if data.get('keepLive') is True:
            skipped_keep_live.append(path.stem)
            continue

        recurrence = data.get('recurrence', 'one-off')
        if recurrence not in ARCHIVE_ELIGIBLE_RECURRENCES:
            continue

        end = parse_date(data.get('endDate')) or parse_date(data.get('startDate'))
        if end is None:
            continue
        if end > cutoff:
            continue

        # For annual events, only archive if the event is more than 14 days
        # past AND no nextOccurrence is set. Otherwise it's a recurring event
        # waiting for next year's date.
        if recurrence == 'annual' and data.get('nextOccurrence'):
            next_occ = parse_date(data.get('nextOccurrence'))
            if next_occ and next_occ >= today:
                continue

        data['status'] = 'archived'
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n',
                        encoding='utf-8')
        archived.append(path.stem)

    print(f"Archived: {len(archived)}")
    if archived:
        for slug in archived:
            print(f"  - {slug}")
    print(f"Skipped (keep-live flag): {len(skipped_keep_live)}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
