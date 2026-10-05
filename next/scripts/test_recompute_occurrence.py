"""Regression checks for the daily occurrence updater."""

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name('recompute-occurrence.py')
SPEC = importlib.util.spec_from_file_location('recompute_occurrence', SCRIPT)
recompute = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(recompute)


class CancelledOccurrenceTest(unittest.TestCase):
    def test_cancelled_editions_do_not_acquire_future_occurrences(self):
        with tempfile.TemporaryDirectory() as directory:
            event_dir = Path(directory)
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            for name, cancelled_field in (
                ('cancelled-flag', {'cancelled': True}),
                ('cancelled-status', {'verificationStatus': 'cancelled'}),
            ):
                (event_dir / f'{name}.json').write_text(json.dumps({
                    'startDate': yesterday,
                    'recurrence': 'monthly',
                    'status': 'published',
                    **cancelled_field,
                }), encoding='utf-8')

            with patch.object(recompute, 'EVENT_DIR', event_dir), \
                 patch.object(sys, 'argv', [str(SCRIPT)]), \
                 contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(recompute.main(), 0)

            for path in event_dir.glob('*.json'):
                self.assertNotIn('nextOccurrence', json.loads(path.read_text(encoding='utf-8')))


if __name__ == '__main__':
    unittest.main()
