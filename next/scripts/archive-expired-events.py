#!/usr/bin/env python3
"""
archive-expired-events.py — daily cron job 2 from the events registry design.

For each event where endDate (or startDate if no endDate) + 1 day is before
today (i.e. the event ended yesterday or earlier), set status to "archived". Editor can flag `keepLive: true` on a JSON
file to opt out of auto-archive (handy for post-mortem windows).

Auto-archive rule: only one-off and annual recurring events are eligible.
Weekly / monthly / ongoing events never auto-archive.

A recurring event is never archived while `nextOccurrence` is still ahead of
us, whatever its endDate says. See `has_future_occurrence` for why.

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

# Every recurrence that describes a series rather than a single dated running.
# For all of these, `endDate` is the end of the last occurrence the registry
# has computed so far — not the end of the series.
RECURRING_RECURRENCES = {'weekly', 'monthly', 'annual', 'seasonal', 'ongoing'}


def parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except (ValueError, TypeError):
        return None


def has_future_occurrence(data: dict, recurrence: str, today: date) -> bool:
    """True when a recurring series still has a running scheduled ahead of us.

    For a recurring event `endDate` is the end of its LAST COMPUTED occurrence,
    so `endDate < today` says nothing about whether the series is over — it is
    true of every healthy monthly market the morning after it runs.
    `nextOccurrence` is the authoritative signal: while it is still ahead of us
    the series rolls forward and must stay live.

    Archiving on endDate alone is what took live markets off the site in
    August 2026 (the records carry `archivedReason: "endDate < today"`).
    One-off events are deliberately excluded: they have no next running to roll
    forward to, so a passed endDate really is the end of them.
    """
    if recurrence not in RECURRING_RECURRENCES:
        return False
    next_occ = parse_date(data.get('nextOccurrence'))
    return next_occ is not None and next_occ >= today


def main() -> int:
    today = date.today()
    cutoff = today - timedelta(days=GRACE_DAYS)
    archived = []
    skipped_keep_live = []
    skipped_future_occurrence = []

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

        # A passed endDate only ends a series that has nowhere left to roll to.
        if has_future_occurrence(data, recurrence, today):
            skipped_future_occurrence.append(
                f"{path.stem} (next {data.get('nextOccurrence')})")
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
    print(f"Skipped (recurring, next occurrence still ahead): "
          f"{len(skipped_future_occurrence)}")
    for line in skipped_future_occurrence:
        print(f"  - {line}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
