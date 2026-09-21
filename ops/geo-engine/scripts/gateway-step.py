#!/usr/bin/env python3
"""One bounded foreground step per gateway tool call; never detach JEV work."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

REPO = Path(__file__).resolve().parents[3]
ENGINE = REPO / 'ops/geo-engine'
RUNS = ENGINE / '.runs'
STATE = RUNS / 'state'
PIPELINE = STATE / 'pipeline.json'


class Interrupted(Exception):
    pass


def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2))
    temporary.replace(path)


def fingerprint():
    parts = [subprocess.check_output(['git', *args], cwd=REPO)
             for args in [('rev-parse', 'HEAD'), ('diff', '--binary'), ('diff', '--cached', '--binary')]]
    return hashlib.sha256(b'\0'.join(parts)).hexdigest()


def execute(args, env, log, timeout=780, cwd=REPO, accepted=(0,)):
    # Own the full process group so abort/timeout cannot leave a build orphaned.
    process = subprocess.Popen(args, cwd=cwd, env=env, stdout=log, stderr=log,
                               start_new_session=True)
    try:
        rc = process.wait(timeout=timeout)
    except BaseException:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=10)
        except ProcessLookupError:
            pass
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=10)
        raise
    if rc not in accepted:
        raise RuntimeError(f'{Path(args[0]).name} exited {rc}')
    return rc


def assert_resumable(pipeline, actual, now):
    if pipeline.get('inflight'):
        raise RuntimeError('Previous step was interrupted; recover before a new cycle')
    if now - pipeline['started_epoch'] > 7200:
        raise RuntimeError('Pipeline evidence expired')
    if pipeline.get('fingerprint') and pipeline['fingerprint'] != actual:
        raise RuntimeError('Tracked checkout changed between steps; preserved')


def main():
    STATE.mkdir(parents=True, exist_ok=True)
    lock = (RUNS / 'cycle.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print(json.dumps({'terminal': True, 'engine': 'already_running', 'live_verified': False}))
        return 10
    env = os.environ.copy()
    env['PI_GEO_STATE_DIR'] = str(STATE)
    env['GSC_ANALYTICS_JSON'] = str(RUNS / 'analytics-live.json')
    env['PI_GEO_RELEASE_WAIT_MS'] = '300000'
    if env.get('SSL_CERT_FILE') and not env.get('GIT_SSL_CAINFO'):
        env['GIT_SSL_CAINFO'] = env['SSL_CERT_FILE']
    p = read(PIPELINE)
    if not p or p.get('terminal'):
        p = {'started_epoch': time.time(), 'stage': 'resume', 'terminal': False,
             'cycle': 'weekly' if datetime.now(ZoneInfo('Australia/Melbourne')).weekday() == 6 else 'incremental'}
    stage = p['stage']
    with (RUNS / 'step-cycle.log').open('a', buffering=1) as log:
        def run(args, **kwargs):
            return execute(args, env, log, **kwargs)
        try:
            assert_resumable(p, fingerprint(), time.time())
            p['inflight'] = True
            save(PIPELINE, p)
            if stage == 'resume':
                rc = run(['node', str(ENGINE / 'scripts/release-cycle.mjs'), 'resume'], timeout=350, accepted=(0, 10))
                p['stage'] = 'resume' if rc == 10 else 'collect'
            elif stage == 'collect':
                if subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO).strip():
                    raise RuntimeError('Tracked checkout is dirty; preserved')
                for args in [('fetch', 'origin', 'main:refs/remotes/origin/main'), ('switch', 'main'),
                             ('merge', '--ff-only', 'origin/main'), ('config', 'user.name', 'peninsula-insider-bot'),
                             ('config', 'user.email', 'bot@peninsulainsider.com.au')]:
                    run(['git', *args], timeout=90)
                legacy = REPO.parent / 'peninsula-insider/ops/scripts/seo'
                try:
                    run(['node', 'pull.mjs'], cwd=legacy, timeout=210)
                    p['legacy_gsc'] = 'ok'
                except (RuntimeError, subprocess.TimeoutExpired):
                    p['legacy_gsc'] = 'unavailable'
                analytics = RUNS / 'analytics-live.json'
                temporary = analytics.with_suffix('.json.tmp')
                with temporary.open('w') as output:
                    execute(['node', str(REPO.parent / 'peninsula-seo-geo/analytics-read.cjs')], env, output, timeout=240)
                data = read(temporary)
                if data.get('gsc', {}).get('status') != 'observed':
                    raise RuntimeError('Fresh GSC evidence unavailable')
                temporary.replace(analytics)
                p['analytics'] = {'gsc': data['gsc']['status'], 'ga4': data.get('ga4', {}).get('status')}
                run(['node', '--test', *map(str, (ENGINE / 'test').glob('*.test.mjs'))], timeout=90)
                p['stage'] = 'build'
            elif stage in ('build', 'validate'):
                dirty = subprocess.check_output(['git', 'diff', '--name-only', 'next/src'], cwd=REPO).strip()
                if stage == 'build' or dirty:
                    with (RUNS / ('build.log' if stage == 'build' else 'post-change-build.log')).open('w') as output:
                        execute(['npx', 'astro', 'build'], env, output, cwd=REPO / 'next')
                p['stage'] = 'audit' if stage == 'build' else 'release'
            elif stage == 'audit':
                audit_started = time.time()
                run(['node', str(ENGINE / 'run.mjs'), '--target=source', '--apply', '--cycle=' + p['cycle']], accepted=(0, 1))
                latest = read(STATE / 'latest-run.json')
                if not latest or datetime.fromisoformat(latest['completedAt'].replace('Z', '+00:00')).timestamp() < audit_started:
                    raise RuntimeError('No fresh audit receipt')
                p['runId'] = latest['runId']
                if latest['errors']:
                    raise RuntimeError('; '.join(latest['errors']))
                p['stage'] = 'validate'
            elif stage == 'release':
                outcome = read(STATE / 'latest-outcome.json', {}).get('release', {})
                if not p.get('submitted') and outcome.get('status') == 'no_changes':
                    p['terminal'] = True
                else:
                    rc = run(['node', str(ENGINE / 'scripts/release-cycle.mjs'),
                              'resume' if p.get('submitted') else 'submit'], timeout=350, accepted=(0, 10))
                    p['submitted'] = True
                    p['terminal'] = rc == 0
            else:
                raise RuntimeError('Unknown pipeline stage')
            p['engine'] = 'ok' if p['terminal'] else 'running'
        except Exception as error:
            p.update(terminal=True, engine='degraded', error=str(error))
            # Hash-guarded recovery touches only this pipeline's unchanged local patches.
            run(['node', str(ENGINE / 'scripts/recover-local.mjs'), str(p['started_epoch'])], timeout=30)
        finally:
            p['inflight'] = False
            p['fingerprint'] = fingerprint()
            p['updated_at'] = datetime.now(timezone.utc).isoformat()
            save(PIPELINE, p)
    outcome = read(STATE / 'latest-outcome.json', {}).get('release') or {}
    current = outcome.get('runId') == p.get('runId') and p.get('runId') is not None
    recovery = read(RUNS / 'local-recovery.json', {})
    restored = next((r.get('reverted', 0) for r in recovery.get('results', []) if r.get('runId') == p.get('runId')), 0)
    result = {'terminal': p['terminal'], 'engine': p['engine'], 'completed_step': stage,
              'next_step': None if p['terminal'] else p['stage'], 'runId': p.get('runId'),
              'change_count': max(0, len(outcome.get('changes', [])) - restored) if current else 0,
              'release_status': 'local_rolled_back' if restored else outcome.get('status') if current else 'not_started',
              'pr': outcome.get('prUrl') if current else None,
              'live_verified': bool(current and outcome.get('status') == 'verified'),
              'analytics': p.get('analytics'), 'error': p.get('error')}
    save(STATE / 'step-latest.json', result)
    print(json.dumps(result))
    return 0 if p['engine'] != 'degraded' else 2


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise Interrupted(f'Gateway execution interrupted by signal {signum}')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    sys.exit(main())
