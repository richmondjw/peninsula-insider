#!/usr/bin/env python3
"""Re-verify source pages for published events with a distant next running.

This is deliberately a report-only check. A 200 response is not enough: many
tourism pages keep a shell alive after the event has been withdrawn, so the
response body is scanned for common unavailable/removed signals as well.

Usage: python next/scripts/check-event-source-freshness.py [--report PATH]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parents[2]
EVENTS_DIR = REPO_ROOT / 'next' / 'src' / 'content' / 'events'
UNAVAILABLE = re.compile(
    r'\b(?:event|festival|market|session|program(?:me)?)\b.{0,80}'
    r'\b(?:cancelled|canceled|postponed|no longer available|ended|closed)\b',
    re.IGNORECASE | re.DOTALL,
)


def parse_date(value: object) -> date | None:
    try:
        return date.fromisoformat(str(value)[:10]) if value else None
    except ValueError:
        return None


def source_url(data: dict) -> str | None:
    return data.get('primarySourceUrl') or data.get('officialEventUrl') or (data.get('organiser') or {}).get('website')


def check(url: str) -> dict:
    request = Request(url, headers={'User-Agent': 'PeninsulaInsiderSourceFreshness/1.0'})
    try:
        with urlopen(request, timeout=15) as response:
            body = response.read(500_000).decode('utf-8', errors='replace')
            matches = [m.group(0).strip()[:180] for m in UNAVAILABLE.finditer(body)][:3]
            return {'url': url, 'status': response.status, 'soft_unavailable': bool(matches), 'matches': matches}
    except HTTPError as error:
        return {'url': url, 'status': error.code, 'error': 'http error'}
    except (URLError, TimeoutError, OSError) as error:
        return {'url': url, 'error': str(error)[:180]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', default=None)
    parser.add_argument('--as-of', default=None, help='YYYY-MM-DD; defaults to UTC today')
    parser.add_argument('--horizon-days', type=int, default=30)
    args = parser.parse_args()
    today = date.fromisoformat(args.as_of) if args.as_of else datetime.utcnow().date()
    horizon = today + timedelta(days=args.horizon_days)
    findings = []
    checked = 0

    for path in sorted(EVENTS_DIR.glob('*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        if data.get('status') != 'published':
            continue
        next_date = parse_date(data.get('nextOccurrence') or data.get('startDate'))
        url = source_url(data)
        if not next_date or next_date <= horizon or not url or '|' in url:
            continue
        checked += 1
        result = check(url)
        if result.get('status', 0) >= 400 or result.get('soft_unavailable') or result.get('error'):
            findings.append({
                'slug': data.get('slug', path.stem),
                'title': data.get('title', path.stem),
                'nextOccurrence': next_date.isoformat(),
                'file': str(path.relative_to(REPO_ROOT)),
                **result,
            })

    report = {
        'checked_at': datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
        'horizon_days': args.horizon_days,
        'checked': checked,
        'findings': findings,
    }
    if args.report:
        target = Path(args.report)
        if not target.is_absolute():
            target = REPO_ROOT / target
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
