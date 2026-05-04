#!/usr/bin/env python3
"""
recompute-occurrence.py — daily cron job 1 from the events registry design.

For each recurring event (weekly, monthly, annual), recompute the
`nextOccurrence` field. Drops past dates from the upcoming list, computes
the next future date from the recurrence rule.

Recurrence rules supported:
- weekly: nextOccurrence = next future date matching startDate's day-of-week
- monthly: nextOccurrence = next future date matching startDate's day-of-month
- annual: nextOccurrence = next future date matching startDate's month + day

Writes back to JSON files in place. Idempotent: rerunning produces the
same result. Diff is committed by the GitHub Actions workflow.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from pathlib import Path

EVENT_DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'events'
RECURRING = {'weekly', 'monthly', 'annual'}


def parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except (ValueError, TypeError):
        return None


def next_weekly(start: date, today: date) -> date:
    """Next future date matching start's day-of-week."""
    target_weekday = start.weekday()
    delta = (target_weekday - today.weekday()) % 7
    if delta == 0 and today >= start:
        delta = 7
    return today + timedelta(days=delta)


def next_monthly(start: date, today: date) -> date:
    """Next future date matching start's day-of-month."""
    day = start.day
    candidate = date(today.year, today.month, min(day, _last_day_of_month(today.year, today.month)))
    if candidate <= today:
        # roll to next month
        if today.month == 12:
            candidate = date(today.year + 1, 1, min(day, 31))
        else:
            next_m = today.month + 1
            candidate = date(today.year, next_m, min(day, _last_day_of_month(today.year, next_m)))
    return candidate


def next_annual(start: date, today: date) -> date:
    """Next future date matching start's month + day."""
    candidate_year = today.year
    try:
        candidate = date(candidate_year, start.month, start.day)
    except ValueError:
        # 29 Feb on a non-leap year, push to 1 March
        candidate = date(candidate_year, start.month + 1, 1)
    if candidate <= today:
        candidate_year += 1
        try:
            candidate = date(candidate_year, start.month, start.day)
        except ValueError:
            candidate = date(candidate_year, start.month + 1, 1)
    return candidate


def _last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day


def main() -> int:
    today = date.today()
    updated = []

    for path in sorted(EVENT_DIR.glob('*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"SKIP (parse error) {path.name}: {e}")
            continue

        recurrence = data.get('recurrence', 'one-off')
        if recurrence not in RECURRING:
            continue
        if data.get('status') in ('archived', 'expired'):
            continue

        start = parse_date(data.get('startDate'))
        if start is None:
            continue

        if recurrence == 'weekly':
            next_occ = next_weekly(start, today)
        elif recurrence == 'monthly':
            next_occ = next_monthly(start, today)
        else:  # annual
            next_occ = next_annual(start, today)

        new_value = next_occ.isoformat()
        if data.get('nextOccurrence') == new_value:
            continue

        data['nextOccurrence'] = new_value
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n',
                        encoding='utf-8')
        updated.append(f"{path.stem} -> {new_value}")

    print(f"Updated nextOccurrence on {len(updated)} events")
    for line in updated:
        print(f"  - {line}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
