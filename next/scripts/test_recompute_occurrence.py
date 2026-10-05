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


if __name__ == "__main__":
    unittest.main()
