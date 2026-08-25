#!/usr/bin/env python3
"""Small, dependency-free regression tests for archive-expired-events.

Run from the repo root or from next/:

    python next/scripts/test_archive_expired_events.py

The module under test is hyphenated (it is a cron entry point, not a package),
so it is loaded by path rather than imported by name.
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

_MODULE_PATH = Path(__file__).resolve().parent / "archive-expired-events.py"
_spec = importlib.util.spec_from_file_location("archive_expired_events", _MODULE_PATH)
archive_expired_events = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(archive_expired_events)


TODAY = date(2026, 8, 24)
LONG_PAST = "2026-05-09"          # comfortably past TODAY - GRACE_DAYS
FUTURE = "2026-09-12"             # a real next running, ahead of TODAY


def event(**overrides) -> dict:
    """A minimal event record; overrides win."""
    base = {
        "slug": "crib-point-community-market",
        "title": "Crib Point Community Market",
        "summary": "Second Saturday of the month.",
        "startDate": LONG_PAST,
        "endDate": LONG_PAST,
        "recurrence": "monthly",
        "status": "published",
    }
    base.update(overrides)
    return base


class ArchiveExpiredEventsTest(unittest.TestCase):
    def run_archiver(self, records: dict[str, dict]) -> dict[str, dict]:
        """Run main() over a temp event dir; return the records as written."""
        with tempfile.TemporaryDirectory() as directory:
            event_dir = Path(directory)
            for name, data in records.items():
                (event_dir / f"{name}.json").write_text(
                    json.dumps(data, indent=2) + "\n", encoding="utf-8")

            with patch.object(archive_expired_events, "EVENT_DIR", event_dir), \
                    patch.object(archive_expired_events, "date") as fake_date:
                fake_date.today.return_value = TODAY
                fake_date.side_effect = date
                self.assertEqual(archive_expired_events.main(), 0)

            return {
                name: json.loads((event_dir / f"{name}.json").read_text(encoding="utf-8"))
                for name in records
            }

    # ------------------------------------------------------------------
    # The regression this file exists for.
    # ------------------------------------------------------------------

    def test_recurring_event_with_future_next_occurrence_is_never_archived(self):
        """The August 2026 defect: `endDate < today` archived live series.

        Every one of these has an endDate well in the past — that is simply
        what the last running looks like the morning after it happens — and a
        nextOccurrence still ahead. None of them may be archived.
        """
        for recurrence in ("weekly", "monthly", "annual", "seasonal", "ongoing"):
            with self.subTest(recurrence=recurrence):
                written = self.run_archiver({
                    "market": event(recurrence=recurrence, nextOccurrence=FUTURE),
                })
                self.assertEqual(written["market"]["status"], "published")

    def test_next_occurrence_today_keeps_the_event_live(self):
        """An event running today is live, not expired."""
        written = self.run_archiver({
            "market": event(nextOccurrence=TODAY.isoformat()),
        })
        self.assertEqual(written["market"]["status"], "published")

    def test_the_four_monthly_markets_stay_live(self):
        """The exact records the defect took off the site, with their real dates."""
        records = {
            "red-hill-market-first-saturday":
                event(recurrence="monthly", startDate="2026-06-06",
                      endDate="2026-06-06", nextOccurrence="2026-09-05"),
            "crib-point-community-market":
                event(recurrence="monthly", nextOccurrence="2026-09-12"),
            "heart-of-the-community-market-rosebud":
                event(recurrence="monthly", nextOccurrence="2026-09-12"),
            "tootgarook-primary-school-market":
                event(recurrence="monthly", startDate="2026-05-23",
                      endDate="2026-05-23", nextOccurrence="2026-09-26"),
        }
        written = self.run_archiver(records)
        for name in records:
            with self.subTest(event=name):
                self.assertEqual(written[name]["status"], "published")

    # ------------------------------------------------------------------
    # Behaviour that must not regress in the other direction.
    # ------------------------------------------------------------------

    def test_genuinely_expired_one_off_is_still_archived(self):
        written = self.run_archiver({
            "gig": event(recurrence="one-off", nextOccurrence=None),
        })
        self.assertEqual(written["gig"]["status"], "archived")

    def test_one_off_is_archived_even_if_it_carries_a_future_next_occurrence(self):
        """A one-off has no series to roll forward to, so the guard must not apply."""
        written = self.run_archiver({
            "gig": event(recurrence="one-off", nextOccurrence=FUTURE),
        })
        self.assertEqual(written["gig"]["status"], "archived")

    def test_recurring_series_with_no_future_occurrence_is_archived(self):
        """A finished series — endDate past, nextOccurrence past — really is over."""
        written = self.run_archiver({
            "season": event(recurrence="seasonal",
                            nextOccurrence=(TODAY - timedelta(days=3)).isoformat()),
        })
        self.assertEqual(written["season"]["status"], "archived")

    def test_recurring_series_with_no_next_occurrence_at_all_is_archived(self):
        written = self.run_archiver({
            "season": event(recurrence="seasonal", nextOccurrence=None),
        })
        self.assertEqual(written["season"]["status"], "archived")

    def test_keep_live_flag_still_wins(self):
        written = self.run_archiver({
            "gig": event(recurrence="one-off", keepLive=True),
        })
        self.assertEqual(written["gig"]["status"], "published")

    def test_event_that_has_not_ended_yet_is_left_alone(self):
        future = (TODAY + timedelta(days=10)).isoformat()
        written = self.run_archiver({
            "gig": event(recurrence="one-off", startDate=future, endDate=future),
        })
        self.assertEqual(written["gig"]["status"], "published")


class RecomputeOccurrenceRestoreTest(unittest.TestCase):
    """The restore generator must move live records out of archive/."""

    def test_restore_moves_archived_record_to_collection_root(self):
        module_path = Path(__file__).resolve().parent / "recompute-occurrence.py"
        spec = importlib.util.spec_from_file_location("recompute_occurrence", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            event_dir = Path(directory)
            archive = event_dir / "archive"
            archive.mkdir()
            archived = archive / "market.json"
            archived.write_text(json.dumps(event(
                status="archived",
                archiveReason="endDate < today",
                recurrence="monthly",
                recurrenceNote="Second Saturday of the month",
            )) + "\n", encoding="utf-8")
            with patch.object(module, "EVENT_DIR", event_dir), \
                    patch.object(module, "date") as fake_date:
                fake_date.today.return_value = TODAY
                fake_date.side_effect = date
                self.assertEqual(module.main(), 0)
            restored = event_dir / "market.json"
            self.assertTrue(restored.exists())
            self.assertFalse(archived.exists())
            self.assertEqual(json.loads(restored.read_text())["status"], "published")

if __name__ == "__main__":
    unittest.main()
