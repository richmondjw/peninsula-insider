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

import argparse
import json
import re
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


# Most "monthly" records on this site are nth-weekday markets - "3rd Saturday
# of every month", "Last Saturday", "2nd Sunday". Day-of-month arithmetic is
# the wrong rule for all of them: on 2026-08-16 it put every one of the ten
# restored community markets on the wrong weekday (Boneo's 3rd-Saturday market
# came out as Thursday 20 August; the real date was Saturday 15 August). The
# weekday/ordinal vocabulary below mirrors parseWeekday/parseNth in
# src/pages/whats-on/_data.ts so the JSON and the rendered page agree.
WEEKDAYS = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6}
NTH_WORDS = {'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
             'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5, 'last': -1}
_WEEKDAY_RE = re.compile(r'\b(' + '|'.join(WEEKDAYS) + r')\b', re.IGNORECASE)
_NTH_RE = re.compile(r'\b(' + '|'.join(NTH_WORDS) + r')\b', re.IGNORECASE)


def cadence_text(data: dict) -> str:
    """The fields the site itself reads a recurrence cadence out of."""
    return ' '.join(str(data.get(k) or '')
                    for k in ('recurrenceNote', 'title', 'summary'))


def parse_nth_weekday(data: dict) -> tuple[int, int] | None:
    """(weekday, nth) from the record's prose, or None if not stated."""
    text = cadence_text(data)
    wd = _WEEKDAY_RE.search(text)
    nth = _NTH_RE.search(text)
    if not wd or not nth:
        return None
    return WEEKDAYS[wd.group(1).lower()], NTH_WORDS[nth.group(1).lower()]


def nth_weekday_of_month(year: int, month: int, weekday: int, nth: int) -> date:
    """The nth (1-5, or -1 for last) `weekday` in the given month."""
    days = [d for d in range(1, _last_day_of_month(year, month) + 1)
            if date(year, month, d).weekday() == weekday]
    return date(year, month, days[-1] if nth == -1 else days[nth - 1])


def next_nth_weekday(weekday: int, nth: int, today: date) -> date | None:
    """Next future nth-weekday occurrence, searching this month then forward."""
    year, month = today.year, today.month
    for _ in range(13):
        try:
            candidate = nth_weekday_of_month(year, month, weekday, nth)
        except IndexError:
            candidate = None  # e.g. no 5th Saturday this month
        if candidate and candidate > today:
            return candidate
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return None


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


# Archival reason recorded by the upstream auto-archiver when it judges a
# single dated occurrence's endDate to have passed. For a recurring event
# this is a false positive — the series isn't over, only that occurrence is.
# Any other (non-empty) reason is treated as a deliberate editorial call that
# the series itself has ended, and is left archived.
AUTO_ARCHIVE_FALSE_POSITIVE_REASON = 'endDate < today'

# Recurrences where a startDate..endDate span means "the season runs between
# these dates", not "this single occurrence lasts this long". For a weekly or
# monthly series a past span-end is the recurrence window closing, so the
# series really is over and must stay archived — restoring it would invent
# occurrences the publisher never scheduled. For an `annual` series a span is
# just the festival's own duration (a 3-day wine weekend), which says nothing
# about whether it recurs next year.
SEASONAL_RECURRENCES = ('weekly', 'monthly')

# Un-archiving is deliberately limited to weekly/monthly series inside a short
# horizon. Two reasons, both learned from the 2026-08-16 first cut of this fix:
#
#   * `annual` records are almost all dated editions — "Mornington Cup 2026",
#     "Mother's Day at Pier 10", "Winter Camp 2026". Their body copy describes
#     the 2026 running: that year's prices, lineup and session times. Flipping
#     them to published because the recurrence maths says "next one is June
#     2027" would put an unverified 2027 date on 2026 facts. That is an
#     editorial refresh, not a script fix, so they stay archived.
#   * A long horizon publishes events 6-12 months out with no editorial pass.
#     120 days covers every genuine community market cycle and nothing else.
RESTORE_MAX_HORIZON_DAYS = 120

# A slug ending in a month-year stamp is a single dated capture of a series
# ("mornington-racecourse-market-may-2026"), not the series itself. The
# undated sibling is the canonical record. Restoring the captures alongside it
# publishes two or three contradictory dates for the same market.
DATED_CAPTURE_SLUG = re.compile(
    r'-(january|february|march|april|may|june|july|august|september|october'
    r'|november|december)-\d{4}$'
)

# A recurrenceNote that restricts the series to a season, or says outright that
# the dates are hand-picked, means the plain monthly/weekly maths below cannot
# produce a date the organiser has actually announced. Shoreham Community
# Market is the worked example: "3rd Sunday of month (September-May season
# only)" - the arithmetic happily returns 17 August, a month the market does
# not run. Publishing that is inventing an event. These records need a human to
# confirm the next date, so auto-restore leaves them archived.
IRREGULAR_CADENCE_NOTE = re.compile(
    r'season only|selected dates|selected monthly dates|not monthly regular'
    r'|by appointment|dates? tbc|check with|varies',
    re.IGNORECASE,
)


def series_window_closed(data: dict, recurrence: str, today: date) -> bool:
    """True when a seasonal series' own endDate shows the run has finished."""
    if recurrence not in SEASONAL_RECURRENCES:
        return False
    start = parse_date(data.get('startDate'))
    end = parse_date(data.get('endDate'))
    if start is None or end is None:
        return False
    # endDate == startDate is a single dated occurrence, not a season window.
    return end > start and end < today


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true',
                         help='Report what would change without writing files')
    args = parser.parse_args()

    today = date.today()
    updated = []
    restored = []
    skipped_horizon = []
    irregular = []

    # Recursive glob covers next/src/content/events/archive/ too, matching the
    # Astro content collection's own glob pattern (`**/*.json`) — archived
    # events live there but are still part of the live collection, gated
    # purely by `status`.
    top_level_stems = {p.stem for p in EVENT_DIR.glob('*.json')}

    for path in sorted(EVENT_DIR.glob('**/*.json')):
        in_archive_dir = path.parent != EVENT_DIR
        if in_archive_dir and path.stem in top_level_stems:
            # A top-level copy of this event already exists and is authoritative;
            # skip the archive/ duplicate so we don't publish the same event twice.
            continue

        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception as e:
            print(f"SKIP (parse error) {path.relative_to(EVENT_DIR)}: {e}")
            continue

        recurrence = data.get('recurrence', 'one-off')
        if recurrence not in RECURRING:
            continue

        archived = data.get('status') in ('archived', 'expired')
        if archived:
            reason = data.get('archiveReason') or data.get('archivedReason')
            if reason and reason != AUTO_ARCHIVE_FALSE_POSITIVE_REASON:
                # Genuinely finished series (e.g. "end of recurrence window") — stay archived.
                continue
            if recurrence not in SEASONAL_RECURRENCES:
                # Annual editions need an editorial refresh, not a status flip.
                continue
            if DATED_CAPTURE_SLUG.search(path.stem):
                # Dated capture of a series; the undated sibling is canonical.
                continue
            if IRREGULAR_CADENCE_NOTE.search(data.get('recurrenceNote') or ''):
                # Cadence is seasonal or hand-picked; needs an editor, not maths.
                irregular.append(
                    f"{path.relative_to(EVENT_DIR)} ({data.get('recurrenceNote')})")
                continue
            if series_window_closed(data, recurrence, today):
                # Seasonal run has ended on its own terms — stay archived.
                continue

        start = parse_date(data.get('startDate'))
        if start is None:
            continue

        if recurrence == 'weekly':
            next_occ = next_weekly(start, today)
        elif recurrence == 'monthly':
            # Prefer the stated nth-weekday cadence; day-of-month arithmetic is
            # only right for the handful of fixed-date monthly records.
            cadence = parse_nth_weekday(data)
            next_occ = None
            if cadence:
                next_occ = next_nth_weekday(cadence[0], cadence[1], today)
            if next_occ is None:
                if archived:
                    # No stated cadence to restore against - guessing a date for
                    # a live listing is exactly the failure mode this guard exists
                    # to prevent.
                    irregular.append(
                        f"{path.relative_to(EVENT_DIR)} (monthly, no nth-weekday "
                        f"cadence stated)")
                    continue
                next_occ = next_monthly(start, today)
        else:  # annual
            next_occ = next_annual(start, today)

        new_value = next_occ.isoformat()

        if archived and (next_occ - today).days > RESTORE_MAX_HORIZON_DAYS:
            # Next running is too far out to publish unreviewed. Leave the
            # record exactly as it is — don't even restamp nextOccurrence, so
            # the archive stops churning in the daily diff.
            skipped_horizon.append(
                f"{path.relative_to(EVENT_DIR)} (next {new_value}, "
                f"{(next_occ - today).days}d out)")
            continue

        changed = False

        if data.get('nextOccurrence') != new_value:
            data['nextOccurrence'] = new_value
            changed = True

        if archived:
            data['status'] = 'published'
            for stale_key in ('archivedAt', 'archiveReason', 'archivedReason'):
                data.pop(stale_key, None)
            changed = True
            restored.append(f"{path.relative_to(EVENT_DIR)} -> published, nextOccurrence={new_value}")

        if not changed:
            continue

        if not args.dry_run:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n',
                            encoding='utf-8')
        updated.append(f"{path.relative_to(EVENT_DIR)} -> {new_value}")

    suffix = ' (dry run, no files written)' if args.dry_run else ''
    print(f"Updated nextOccurrence on {len(updated)} events{suffix}")
    for line in updated:
        print(f"  - {line}")
    if restored:
        print(f"\nRestored {len(restored)} recurring events from archived/expired status:")
        for line in restored:
            print(f"  - {line}")
    if irregular:
        print(f"\nLeft archived - irregular or seasonal cadence, needs an editor "
              f"({len(irregular)}):")
        for line in irregular:
            print(f"  - {line}")
    if skipped_horizon:
        print(f"\nLeft archived - next running beyond the "
              f"{RESTORE_MAX_HORIZON_DAYS}-day restore horizon ({len(skipped_horizon)}):")
        for line in skipped_horizon:
            print(f"  - {line}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
