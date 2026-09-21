import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('worker', Path(__file__).parents[1] / 'scripts/release-worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ReleaseWorkerTests(unittest.TestCase):
    def test_cannot_run_jev_or_start_another_cycle(self):
        for pipeline in [{'stage': 'audit', 'runId': 'a', 'submitted': True},
                         {'stage': 'release', 'runId': 'b', 'submitted': True},
                         {'stage': 'release', 'runId': 'a'}]:
            with self.assertRaises(RuntimeError):
                worker.assert_release(pipeline, 'a')

    def test_chunking_preserves_full_report(self):
        text = 'A useful line\n' * 1000
        chunks = worker.split_report(text)
        self.assertEqual(''.join(chunks), text)
        self.assertTrue(all(len(chunk) <= 3500 for chunk in chunks))

    def test_delivery_is_once_and_uncertain_send_is_not_replayed(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            worker.save(state / 'release-delivery.json', {'channel': 'telegram', 'account': 'default', 'target': '-1', 'threadId': 1})
            result = {'terminal': True, 'runId': 'a', 'engine': 'ok', 'report': 'Real report'}
            calls = []
            def send(args, **kwargs):
                calls.append(args)
                return subprocess.CompletedProcess(args, 0, '{"messageId":"test"}')
            self.assertEqual(worker.deliver(state, result, send)['status'], 'delivered')
            worker.deliver(state, result, send)
            self.assertEqual(len(calls), 1)
            receipt = worker.read(state / 'release-delivery-a.json')
            receipt.update(status='pending', parts=[{'status': 'sending'}])
            worker.save(state / 'release-delivery-a.json', receipt)
            with self.assertRaisesRegex(RuntimeError, 'uncertain'):
                worker.deliver(state, result, send)
            self.assertEqual(len(calls), 1)

    def test_unfinished_report_cannot_be_sent(self):
        with self.assertRaisesRegex(RuntimeError, 'unfinished'):
            worker.deliver(Path('/unused'), {'terminal': False})


if __name__ == '__main__':
    unittest.main()
