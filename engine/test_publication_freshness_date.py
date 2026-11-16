"""Publication date policy for deployment, manual and scheduled probes."""
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import publication_freshness

from publication_freshness_date import (expected_date, deployed_dates, WRITER_UTC_HOUR,
                                       BACKSTOP_UTC_HOUR, BACKSTOP_UTC_MINUTE)


class PublicationFreshnessDateTest(unittest.TestCase):
    def test_unrelated_deployments_use_the_last_due_writer_slot(self):
        cases = [
            ("2026-11-16T13:10:00+00:00", "2026-11-16"),  # 00:10 AEDT, before writer
            ("2026-06-16T14:10:00+00:00", "2026-06-16"),  # 00:10 AEST, before writer
            ("2026-11-16T19:59:59+00:00", "2026-11-16"),
            ("2026-11-16T20:00:00+00:00", "2026-11-17"),
            ("2026-11-16T20:30:00+00:00", "2026-11-17"),
            ("2026-06-16T20:00:00+00:00", "2026-06-17"),
            ("2026-11-17T01:00:00+00:00", "2026-11-17"),  # unrelated midday deploy
            ("2026-12-31T13:10:00+00:00", "2026-12-31"),  # local New Year, before writer
        ]
        for now, edition in cases:
            with self.subTest(now=now):
                self.assertEqual(expected_date("workflow_run", datetime.fromisoformat(now), {edition}), edition)

    def test_manual_and_schedule_keep_current_sydney_date(self):
        for event in ("workflow_dispatch", "schedule", ""):
            for now in ("2026-11-16T13:10:00+00:00", "2026-11-16T22:30:00+00:00"):
                with self.subTest(event=event, now=now):
                    self.assertEqual(expected_date(event, datetime.fromisoformat(now)), "2026-11-17")

    def test_clock_changes_do_not_advance_the_due_edition(self):
        cases = [
            ("2026-04-04T15:59:59+00:00", "2026-04-04"),  # before repeated hour
            ("2026-04-04T16:00:00+00:00", "2026-04-04"),  # after AEDT -> AEST
            ("2026-04-04T20:00:00+00:00", "2026-04-05"),
            ("2026-10-03T15:59:59+00:00", "2026-10-03"),  # before skipped hour
            ("2026-10-03T16:00:00+00:00", "2026-10-03"),  # after AEST -> AEDT
            ("2026-10-03T20:00:00+00:00", "2026-10-04"),
        ]
        for now, edition in cases:
            with self.subTest(now=now):
                self.assertEqual(expected_date("workflow_run", datetime.fromisoformat(now), {edition}), edition)

    def test_unrelated_or_queued_deployment_during_writer_window(self):
        old = {"2026-11-16"}
        for now in ("2026-11-16T20:01:00+00:00", "2026-11-16T20:10:00+00:00",
                    "2026-11-16T22:29:59+00:00"):
            with self.subTest(now=now):
                self.assertEqual(expected_date("workflow_run", datetime.fromisoformat(now), old),
                                 "2026-11-16")
        self.assertEqual(expected_date("workflow_run",
                         datetime.fromisoformat("2026-11-16T20:23:00+00:00"),
                         old | {"2026-11-17"}), "2026-11-17")
        self.assertEqual(expected_date("workflow_run",
                         datetime.fromisoformat("2026-11-16T22:30:00+00:00"), old),
                         "2026-11-17")

    def test_due_snapshot_entry_never_permits_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            # Even an unexpected directory entry is evidence of a due entry,
            # never grounds for silently falling back to the older edition.
            (root / "insider-picks-2026-11-17.md").mkdir()
            due = expected_date("workflow_run",
                                datetime.fromisoformat("2026-11-16T20:01:00+00:00"),
                                deployed_dates(root))
            self.assertEqual(due, "2026-11-17")
            invalid = root / "invalid.md"
            invalid.write_text("malformed due source", encoding="utf-8")
            with patch("sys.argv", ["publication_freshness.py", "--expected-date", due,
                                   "--article", str(invalid)]):
                self.assertEqual(publication_freshness.main(), 2)

    def test_missing_or_unreadable_snapshot_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError):
                deployed_dates(root / "missing")
            with patch.object(Path, "iterdir", side_effect=PermissionError("denied")):
                with self.assertRaises(PermissionError):
                    deployed_dates(root)

    def test_failed_writer_cannot_fall_back_to_an_older_valid_source(self):
        due = expected_date("workflow_run", datetime.fromisoformat("2026-11-16T22:30:00+00:00"))
        self.assertEqual(due, "2026-11-17")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            previous = root / "insider-picks-2026-11-16.md"
            previous.write_text(
                '---\npublishedAt: 2026-11-16\nlastVerified: 2026-11-16\nstatus: "published"\n---\n'
                + "verified word " * 150, encoding="utf-8")
            self.assertEqual(publication_freshness.source_failures(previous, "2026-11-16"), [])
            with patch("sys.argv", ["publication_freshness.py", "--expected-date", due,
                                   "--article", str(root / f"insider-picks-{due}.md")]):
                self.assertEqual(publication_freshness.main(), 2)

    def test_date_policy_stays_aligned_with_the_writer_schedule(self):
        writer = (Path(__file__).resolve().parents[1] / ".github/workflows/daily-content.yml").read_text()
        self.assertIn(f"- cron: '0 {WRITER_UTC_HOUR} * * *'", writer)
        workflow = (Path(__file__).resolve().parents[1] / ".github/workflows/publication-freshness.yml").read_text()
        self.assertIn(f"- cron: '{BACKSTOP_UTC_MINUTE} {BACKSTOP_UTC_HOUR} * * *'", workflow)

    def test_rejects_ambiguous_naive_time(self):
        with self.assertRaises(ValueError):
            expected_date("workflow_run", datetime(2026, 11, 16))


if __name__ == "__main__":
    unittest.main()
