"""Publication date policy for deployment, manual and scheduled probes."""
import unittest
from datetime import datetime
from pathlib import Path

from publication_freshness_date import expected_date, WRITER_UTC_HOUR


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
                self.assertEqual(expected_date("workflow_run", datetime.fromisoformat(now)), edition)

    def test_manual_and_schedule_keep_current_sydney_date(self):
        for event in ("workflow_dispatch", "schedule", ""):
            for now in ("2026-11-16T13:10:00+00:00", "2026-11-16T22:30:00+00:00"):
                with self.subTest(event=event, now=now):
                    self.assertEqual(expected_date(event, datetime.fromisoformat(now)), "2026-11-17")

    def test_date_policy_stays_aligned_with_the_writer_schedule(self):
        writer = (Path(__file__).resolve().parents[1] / ".github/workflows/daily-content.yml").read_text()
        self.assertIn(f"- cron: '0 {WRITER_UTC_HOUR} * * *'", writer)

    def test_rejects_ambiguous_naive_time(self):
        with self.assertRaises(ValueError):
            expected_date("workflow_run", datetime(2026, 11, 16))


if __name__ == "__main__":
    unittest.main()
