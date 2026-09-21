import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import time
import unittest

spec = importlib.util.spec_from_file_location('gateway_step', Path(__file__).parents[1] / 'scripts/gateway-step.py')
step = importlib.util.module_from_spec(spec)
spec.loader.exec_module(step)


class GatewayStepTests(unittest.TestCase):
    def test_matching_fresh_checkpoint_can_resume(self):
        step.assert_resumable({'started_epoch': 100, 'fingerprint': 'a'}, 'a', 200)

    def test_checkout_change_stops_resume(self):
        with self.assertRaisesRegex(RuntimeError, 'checkout changed'):
            step.assert_resumable({'started_epoch': 100, 'fingerprint': 'a'}, 'b', 200)

    def test_interrupted_step_is_not_replayed(self):
        with self.assertRaisesRegex(RuntimeError, 'interrupted'):
            step.assert_resumable({'started_epoch': 100, 'inflight': True}, 'a', 200)

    def test_stale_pipeline_is_not_published(self):
        with self.assertRaisesRegex(RuntimeError, 'expired'):
            step.assert_resumable({'started_epoch': 100}, 'a', 7400)

    def test_timeout_reaps_own_process(self):
        start = time.monotonic()
        with open(os.devnull, 'w') as log:
            with self.assertRaises(subprocess.TimeoutExpired):
                step.execute([sys.executable, '-c', 'import time; time.sleep(10)'], os.environ.copy(), log, timeout=.05)
        self.assertLess(time.monotonic() - start, 2)


if __name__ == '__main__':
    unittest.main()
