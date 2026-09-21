import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('continuation', Path(__file__).parents[1] / 'scripts/release-continuation.py')
continuation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(continuation)


class ContinuationTests(unittest.TestCase):
    route = {'channel': 'telegram', 'account': 'default', 'target': '-1', 'threadId': 1}

    def test_one_shot_admitted_and_idempotently_identified(self):
        sequence, args = continuation.continuation_args({'stage': 'release', 'runId': 'run-1'}, self.route)
        self.assertEqual(sequence, 1)
        self.assertIn('--delete-after-run', args)
        self.assertIn('--declaration-key', args)
        self.assertIn('--release-only --release-run run-1', args[args.index('--message') + 1])
        self.assertNotIn('--every', args)
        self.assertNotIn('--cron', args)

    def test_no_analysis_or_unbounded_continuation(self):
        for pipeline in [{'stage': 'audit', 'runId': 'run'}, {'stage': 'release', 'runId': 'bad;command'},
                         {'stage': 'release', 'runId': 'run', 'continuationCount': 20}]:
            with self.assertRaises(RuntimeError):
                continuation.continuation_args(pipeline, self.route)

    def test_route_must_be_explicit(self):
        with self.assertRaises(RuntimeError):
            continuation.continuation_args({'stage': 'release', 'runId': 'run'}, {})

    def test_report_only_cannot_begin_new_cycle(self):
        _, args = continuation.continuation_args({'stage': 'release', 'runId': 'run'}, self.route, True)
        self.assertIn('--report-only --release-run run', args[args.index('--message') + 1])


if __name__ == '__main__':
    unittest.main()
