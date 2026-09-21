#!/usr/bin/env python3
"""Bounded post-JEV release completion. Never collect, audit, or start a new cycle."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone

REPO = Path(__file__).resolve().parents[3]
STATE = REPO / 'ops/geo-engine/.runs/state'


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2))
    temporary.replace(path)


def assert_release(pipeline, run_id):
    if pipeline.get('runId') != run_id or pipeline.get('stage') != 'release':
        raise RuntimeError('Not the same release; worker cannot run analysis or another cycle')
    if not pipeline.get('submitted'):
        raise RuntimeError('Release has not been submitted')


def split_report(text, limit=3500):
    chunks = []
    while text:
        cut = min(len(text), limit)
        if len(text) > limit:
            newline = text.rfind('\n', 0, limit)
            if newline > 0:
                cut = newline + 1
        chunks.append(text[:cut])
        text = text[cut:]
    return chunks


def deliver(state, result, sender=subprocess.run):
    if not result.get('terminal'):
        raise RuntimeError('Cannot deliver an unfinished report')
    run_id = result['runId']
    config = read(state / 'release-delivery.json')
    if config.get('channel') != 'telegram' or not re.fullmatch(r'-?\d+', config.get('target', '')):
        raise RuntimeError('Invalid approved delivery route')
    if not str(config.get('threadId', '')).isdigit() or not config.get('account'):
        raise RuntimeError('Explicit account and topic required')
    report = result.get('report') or 'No fresh report was produced.'
    text = (f"SEO/GEO completion: {result.get('engine')}; release: {result.get('release_status')}; "
            f"live verified: {result.get('live_verified')}.\n{result.get('pr') or ''}\n\n{report}")
    receipt_path = state / f'release-delivery-{run_id}.json'
    digest = hashlib.sha256(text.encode()).hexdigest()
    receipt = read(receipt_path) if receipt_path.exists() else {'runId': run_id, 'parts': [], 'reportHash': digest}
    if receipt.get('reportHash') != digest:
        raise RuntimeError('Report changed after delivery began; refusing mismatched replay')
    if receipt.get('status') == 'delivered':
        return receipt
    if any(p['status'] == 'sending' for p in receipt['parts']):
        raise RuntimeError('Prior send outcome uncertain; refusing duplicate delivery')
    chunks = split_report(text)
    for index, chunk in enumerate(chunks):
        if index < len(receipt['parts']) and receipt['parts'][index]['status'] == 'delivered':
            continue
        part = {'status': 'sending', 'index': index, 'at': datetime.now(timezone.utc).isoformat()}
        receipt['parts'].append(part)
        save(receipt_path, receipt)  # Before send: an interrupted send is never blindly replayed.
        args = ['openclaw', 'message', 'send', '--channel', config['channel'], '--account', config['account'],
                '--target', config['target'], '--thread-id', str(config['threadId']), '--message', chunk, '--json']
        response = sender(args, capture_output=True, text=True, timeout=60, check=True)
        part.update(status='delivered', response=json.loads(response.stdout))
        save(receipt_path, receipt)
    receipt.update(status='delivered', completedAt=datetime.now(timezone.utc).isoformat())
    save(receipt_path, receipt)
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--deliver-existing', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', args.run_id):
        raise RuntimeError('Invalid run identifier')
    lock = (STATE / 'release-worker.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print(json.dumps({'status': 'already_running'}))
        return
    deadline = time.monotonic() + 3600
    while True:
        pipeline = read(STATE / 'pipeline.json')
        assert_release(pipeline, args.run_id)
        if pipeline.get('terminal'):
            result = read(STATE / 'step-latest.json')
            if result.get('runId') != args.run_id or not result.get('terminal'):
                raise RuntimeError('Terminal receipt does not match pipeline')
            print(json.dumps(deliver(STATE, result)))
            return
        if args.deliver_existing:
            raise RuntimeError('Existing release is not terminal')
        if time.monotonic() >= deadline:
            raise RuntimeError('Release completion deadline exceeded; checkpoint retained')
        if pipeline.get('inflight'):
            time.sleep(2)
            continue
        child = subprocess.Popen([sys.executable, str(Path(__file__).with_name('gateway-step.py')), '--release-only'],
                                 start_new_session=True)
        try:
            rc = child.wait(timeout=min(400, max(1, deadline - time.monotonic())))
        except BaseException:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait(timeout=10)
            raise
        if rc not in (0, 2, 10):
            raise RuntimeError(f'Release step exited {rc}')
        time.sleep(2)


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise RuntimeError(f'Release worker interrupted by signal {signum}')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        main()
    except Exception as error:
        save(STATE / 'release-worker-error.json', {'at': datetime.now(timezone.utc).isoformat(), 'error': str(error)})
        # A worker failure is material: alert the same approved route, never invent completion.
        try:
            pipeline = read(STATE / 'pipeline.json')
            if pipeline.get('runId'):
                deliver(STATE, {'terminal': True, 'runId': pipeline['runId'] + '-worker-failure',
                                'engine': 'degraded', 'release_status': 'completion_failed', 'live_verified': False,
                                'report': f'Release worker stopped: {error}. Checkpoint retained; do not assume deployment succeeded.'})
        except Exception:
            pass  # Delivery/auth uncertainty remains in the receipt; never retry blindly.
        print(str(error), file=sys.stderr)
        sys.exit(2)
