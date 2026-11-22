import importlib.util
import json
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/publish-status.py'
spec = importlib.util.spec_from_file_location('publish_status', SCRIPT)
publish_status = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish_status)


def git(args, cwd):
    return subprocess.run(['git', *args], cwd=cwd, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE).stdout.decode().strip()


class PublishStatusTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.remote = root / 'remote.git'
        self.repo = root / 'checkout'
        git(['init', '--quiet', '--bare', str(self.remote)], root)
        git(['init', '--quiet', '-b', 'main', str(self.repo)], root)
        for key, value in (('user.name', 't'), ('user.email', 't@example.com'), ('commit.gpgsign', 'false')):
            git(['config', key, value], self.repo)
        (self.repo / 'tracked.txt').write_text('site\n')
        git(['add', 'tracked.txt'], self.repo)
        git(['commit', '--quiet', '-m', 'base'], self.repo)
        git(['remote', 'add', 'origin', str(self.remote)], self.repo)
        git(['push', '--quiet', 'origin', 'main'], self.repo)
        self.runs = root / 'runs'
        self.state = self.runs / 'state'
        self.state.mkdir(parents=True)

    def tearDown(self):
        self.tmp.cleanup()

    def put(self, name, value):
        (self.state / name).write_text(json.dumps(value))

    def accepted_run(self, run_id='2026-11-22-0530-incremental'):
        now = datetime.now(timezone.utc)
        self.put('latest-run.json', {'runId': run_id, 'completedAt': now.isoformat(), 'errors': []})
        self.put('step-latest.json', {'runId': run_id, 'terminal': True, 'engine': 'ok',
                                      'completed_step': 'release', 'release_status': 'no_changes',
                                      'change_count': 0, 'analytics': {'gsc': 'observed'}})
        (self.runs / run_id).mkdir(exist_ok=True)
        (self.runs / run_id / 'summary.json').write_text(json.dumps(
            {'system': {'decisionProvider': 'jev', 'decisionProbe': {'ok': True}, 'errors': []}}))
        (self.state / 'latest-report.txt').write_text(f'report {run_id}\n')
        return run_id

    def show(self, name):
        return git(['--git-dir', str(self.remote), 'show', f'geo-engine/status:{name}'], self.repo)

    def test_accepted_cycle_is_published_without_touching_the_checkout(self):
        run_id = self.accepted_run()
        head = git(['rev-parse', 'HEAD'], self.repo)
        publish_status.publish(self.state, self.runs, repo=self.repo)
        status = json.loads(self.show('status.json'))
        self.assertEqual(status['runId'], run_id)
        self.assertTrue(status['health']['ok'])
        self.assertTrue(status['decisionProbeOk'])
        self.assertIn(run_id, self.show('latest-report.txt'))
        # The runner refuses to continue on a dirty or moved checkout.
        self.assertEqual(git(['rev-parse', 'HEAD'], self.repo), head)
        self.assertEqual(git(['status', '--porcelain'], self.repo), '')
        self.assertEqual(git(['rev-parse', '--abbrev-ref', 'HEAD'], self.repo), 'main')
        # main on the remote is never written.
        self.assertEqual(git(['--git-dir', str(self.remote), 'rev-parse', 'main'], self.repo), head)

    def test_degraded_cycle_is_published_with_its_error_and_failing_health(self):
        self.accepted_run('2026-11-21-0530-incremental')
        self.put('step-latest.json', {'runId': None, 'terminal': True, 'engine': 'degraded',
                                      'completed_step': 'collect', 'release_status': 'not_started',
                                      'error': 'Fresh GSC evidence unavailable (timeout); see analytics-failed.json'})
        publish_status.publish(self.state, self.runs, repo=self.repo)
        status = json.loads(self.show('status.json'))
        self.assertEqual(status['engine'], 'degraded')
        self.assertIn('GSC', status['error'])
        self.assertFalse(status['health']['ok'])
        # Yesterday's audit stays identifiable as yesterday's.
        self.assertEqual(status['auditRunId'], '2026-11-21-0530-incremental')
        # An earlier run's report must not be presented as today's.
        with self.assertRaises(subprocess.CalledProcessError):
            self.show('latest-report.txt')

    def test_each_publication_extends_history(self):
        self.accepted_run('2026-11-21-0530-incremental')
        first, _ = publish_status.publish(self.state, self.runs, repo=self.repo)
        self.accepted_run('2026-11-22-0530-incremental')
        second, _ = publish_status.publish(self.state, self.runs, repo=self.repo)
        self.assertEqual(git(['--git-dir', str(self.remote), 'rev-parse', f'{second}^'], self.repo), first)

    def test_status_carries_no_report_text_or_paths(self):
        self.accepted_run()
        status = publish_status.build_status(self.state, self.runs)
        self.assertNotIn('report', status)
        self.assertNotIn('report_path', status)


if __name__ == '__main__':
    unittest.main()
