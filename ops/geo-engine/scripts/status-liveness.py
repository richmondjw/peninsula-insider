#!/usr/bin/env python3
"""Read-only: is the published daily status fresh and healthy?

Reads the status document publish-status.py writes to the geo-engine/status
branch. It judges the publication time as well as the engine's own verdict, so
a cycle that never fired fails here just as a cycle that fired and degraded.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def assess(text, now=None, max_age_hours=36):
    now = now or datetime.now(timezone.utc)
    if text is None:
        return False, 'no status has ever been published'
    try:
        status = json.loads(text)
        published = datetime.fromisoformat(status['publishedAt'].replace('Z', '+00:00'))
    except (ValueError, KeyError, TypeError):
        return False, 'published status is unreadable'
    age = (now - published).total_seconds() / 3600
    if age < 0 or age > max_age_hours:
        return False, f'last status is {age:.0f}h old (limit {max_age_hours}h): run {status.get("runId")}'
    health = status.get('health') or {}
    if not health.get('ok'):
        reasons = '; '.join(health.get('problems') or []) or status.get('error') or 'no reason recorded'
        return False, f'engine={status.get("engine")} run {status.get("runId")}: {reasons}'
    return True, f'{health.get("label")} published {age:.0f}h ago'


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    text = path.read_text() if path and path.exists() else None
    ok, detail = assess(text)
    print(('OK' if ok else 'FAIL') + ' PI SEO/GEO status: ' + detail)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
