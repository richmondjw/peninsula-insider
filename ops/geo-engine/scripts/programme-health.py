#!/usr/bin/env python3
"""Read-only output assertion for the PI SEO/GEO daily programme."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def read(path):
    return json.loads(path.read_text())


def assess(state, runs, now=None, max_age_hours=36):
    now = now or datetime.now(timezone.utc)
    problems = []
    try:
        latest = read(state / 'latest-run.json')
        completed = datetime.fromisoformat(latest['completedAt'].replace('Z', '+00:00'))
        age_hours = (now - completed).total_seconds() / 3600
        if age_hours < 0 or age_hours > max_age_hours:
            problems.append(f'audit age {age_hours:.1f}h exceeds {max_age_hours}h')
        if latest.get('errors'):
            problems.append('latest audit has errors')
        run_id = latest['runId']
        summary = read(runs / run_id / 'summary.json')
        decision = summary.get('system', {})
        if decision.get('decisionProvider') != 'jev' or not decision.get('decisionProbe', {}).get('ok'):
            problems.append('latest audit lacks a successful Jev probe')
        if decision.get('errors'):
            problems.append('latest audit summary has errors')
        step = read(state / 'step-latest.json')
        if step.get('runId') != run_id or not step.get('terminal') or step.get('engine') != 'ok':
            problems.append('latest audit has no matching terminal engine receipt')
        elif step.get('release_status') not in ('verified', 'no_changes'):
            problems.append(f"release status {step.get('release_status')} is not terminal acceptance")
        report_path = state / 'latest-report.txt'
        if not report_path.exists():
            problems.append('executive report missing')
        elif run_id not in report_path.read_text():
            problems.append('executive report does not match latest run')
        label = f'{run_id} age={age_hours:.1f}h release={step.get("release_status")}'
    except (OSError, KeyError, ValueError, TypeError, json.JSONDecodeError) as error:
        problems.append(f'evidence unreadable: {type(error).__name__}')
        label = 'no valid audit receipt'
    return not problems, label, problems


def main():
    root = Path(__file__).resolve().parents[1]
    runs = root / '.runs'
    state = runs / 'state'
    if len(sys.argv) > 1:
        state = Path(sys.argv[1]); runs = state.parent
    ok, label, problems = assess(state, runs)
    print(('OK' if ok else 'FAIL') + ' PI SEO/GEO ' + label
          + ('' if not problems else ': ' + '; '.join(problems)))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
