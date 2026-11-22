#!/usr/bin/env python3
"""Publish the daily cycle's outcome where it can be read without gateway access.

The runner's evidence lives in the gitignored .runs directory on the gateway, so
a stalled or degraded engine is invisible from the repository. After every
terminal step this writes a small status document and the executive report to a
dedicated branch. It never touches main, the working tree, HEAD or the index:
the commit is assembled with plumbing and a temporary index, so the runner's
checkout fingerprint is unchanged.

A degraded cycle is published too; that is the case this exists for.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
ENGINE = REPO / 'ops/geo-engine'
BRANCH = 'geo-engine/status'


def read(path, default=None):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def build_status(state, runs, now=None):
    """Compact, secret-free summary of the latest terminal step."""
    now = now or datetime.now(timezone.utc)
    step = read(state / 'step-latest.json', {}) or {}
    latest = read(state / 'latest-run.json', {}) or {}
    run_id = step.get('runId')
    summary = read(runs / run_id / 'summary.json', {}) if run_id else {}
    system = (summary or {}).get('system', {})
    spec = importlib.util.spec_from_file_location('health', ENGINE / 'scripts/programme-health.py')
    health = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(health)
    ok, label, problems = health.assess(state, runs, now=now)
    return {
        'version': 1,
        'publishedAt': now.isoformat(),
        'runId': run_id,
        # The audit receipt can belong to an earlier run when today's cycle
        # failed before its audit; keep both so staleness is unambiguous.
        'auditRunId': latest.get('runId'),
        'auditCompletedAt': latest.get('completedAt'),
        'terminal': bool(step.get('terminal')),
        'engine': step.get('engine'),
        'completedStep': step.get('completed_step'),
        'releaseStatus': step.get('release_status'),
        'changeCount': step.get('change_count', 0),
        'pr': step.get('pr'),
        'liveVerified': bool(step.get('live_verified')),
        'analytics': step.get('analytics'),
        'researchHandoff': step.get('research_handoff'),
        'error': step.get('error'),
        'decisionProvider': system.get('decisionProvider'),
        'decisionProbeOk': bool((system.get('decisionProbe') or {}).get('ok')),
        'health': {'ok': ok, 'label': label, 'problems': problems},
    }


def git(args, cwd, env=None, data=None):
    return subprocess.run(['git', *args], cwd=cwd, env=env, input=data, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode().strip()


def commit_files(files, message, repo=REPO, branch=BRANCH, remote='origin'):
    """Commit {name: bytes} onto the status branch and push; returns the commit."""
    try:
        git(['fetch', '--quiet', remote, f'+refs/heads/{branch}:refs/remotes/{remote}/{branch}'], repo)
        parent = git(['rev-parse', '--verify', f'refs/remotes/{remote}/{branch}'], repo)
    except subprocess.CalledProcessError:
        parent = None  # first publication creates the branch
    with tempfile.TemporaryDirectory() as scratch:
        env = {**os.environ, 'GIT_INDEX_FILE': str(Path(scratch) / 'index'),
               'GIT_AUTHOR_NAME': 'peninsula-insider-bot', 'GIT_AUTHOR_EMAIL': 'bot@peninsulainsider.com.au',
               'GIT_COMMITTER_NAME': 'peninsula-insider-bot', 'GIT_COMMITTER_EMAIL': 'bot@peninsulainsider.com.au'}
        git(['read-tree', '--empty'], repo, env)
        for name, content in sorted(files.items()):
            blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=repo, input=content,
                                  check=True, stdout=subprocess.PIPE).stdout.decode().strip()
            git(['update-index', '--add', '--cacheinfo', f'100644,{blob},{name}'], repo, env)
        tree = git(['write-tree'], repo, env)
        commit = git(['commit-tree', tree, *(['-p', parent] if parent else []), '-m', message], repo, env)
    git(['push', '--quiet', remote, f'{commit}:refs/heads/{branch}'], repo)
    return commit


def publish(state, runs, repo=REPO, now=None):
    status = build_status(state, runs, now)
    files = {'status.json': (json.dumps(status, indent=2) + '\n').encode()}
    report = state / 'latest-report.txt'
    # Only attach the report that belongs to this run; an older one would read as current.
    if status['runId'] and report.exists() and status['runId'] in report.read_text():
        files['latest-report.txt'] = report.read_bytes()
    message = f"status: {status['runId'] or 'no-run'} engine={status['engine']} release={status['releaseStatus']}"
    return commit_files(files, message, repo=repo), status


def main():
    runs = ENGINE / '.runs'
    state = runs / 'state'
    if len(sys.argv) > 1:
        state = Path(sys.argv[1]); runs = state.parent
    commit, status = publish(state, runs)
    print(json.dumps({'published': commit, 'branch': BRANCH, 'healthOk': status['health']['ok']}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
