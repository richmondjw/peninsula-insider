import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("recompute", Path(__file__).with_name("recompute-occurrence.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CancelledEditionTest(unittest.TestCase):
    def test_daily_maintenance_preserves_cancelled_edition_and_advances_live_series(self):
        cancelled = {"slug": "cancelled-market", "status": "published", "cancelled": True,
                     "recurrence": "monthly", "recurrenceNote": "First Saturday", "startDate": "2026-10-03"}
        with TemporaryDirectory() as directory:
            root = Path(directory)
            withdrawn = root / "cancelled.json"
            withdrawn.write_text(json.dumps(cancelled))
            live = root / "live.json"
            live.write_text(json.dumps({**cancelled, "cancelled": False}))
            with patch.object(module, "EVENT_DIR", root), patch("sys.argv", ["recompute-occurrence.py"]):
                self.assertEqual(module.main(), 0)
            self.assertEqual(json.loads(withdrawn.read_text()), cancelled)
            self.assertGreater(json.loads(live.read_text())["nextOccurrence"], module.date.today().isoformat())


class MultiDayWeeklyExhibitionTest(unittest.TestCase):
    def test_freshness_uses_each_open_day_and_stops_at_exhibition_end(self):
        exhibition = {
            "slug": "national-works-on-paper-2026-nwop",
            "status": "published", "recurrence": "weekly",
            "recurrenceNote": "Tuesday to Sunday, 11am to 4pm",
            "startDate": "2026-09-05", "endDate": "2026-11-22",
            "nextOccurrence": "2026-10-10",
        }
        with TemporaryDirectory() as directory:
            root = Path(directory)
            file = root / 'national-works-on-paper-2026-nwop.json'
            file.write_text(json.dumps(exhibition))
            with patch.object(module, 'EVENT_DIR', root), patch('sys.argv', [
                'recompute-occurrence.py', '--today', '2026-10-07'
            ]):
                self.assertEqual(module.main(), 0)
            self.assertEqual(json.loads(file.read_text())['nextOccurrence'], '2026-10-08')
            with patch.object(module, 'EVENT_DIR', root), patch('sys.argv', [
                'recompute-occurrence.py', '--today', '2026-11-22'
            ]):
                self.assertEqual(module.main(), 0)
            self.assertNotIn('nextOccurrence', json.loads(file.read_text()))

    def test_single_weekday_cadence_keeps_its_original_anchor(self):
        start = module.date.fromisoformat('2026-10-03')
        today = module.date.fromisoformat('2026-10-07')
        self.assertEqual(module.next_weekly(start, today), module.date.fromisoformat('2026-10-10'))


if __name__ == "__main__":
    unittest.main()
