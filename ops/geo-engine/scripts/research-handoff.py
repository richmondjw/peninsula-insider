#!/usr/bin/env python3
"""Idempotent detected-only PI editorial intake; never approves or publishes."""
import json
import math
import os
from pathlib import Path
import sys
import uuid


def intake(item):
    signals = item.get('signals', {})
    confidence = float(item.get('confidence', 0))
    if item.get('status') != 'research_required' or signals.get('provider') != 'jev' or not math.isfinite(confidence) or not .8 <= confidence <= 1:
        return None
    key = item['key']
    ident = str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://peninsulainsider.com.au/seo-research/' + key))
    return {'id': ident, 'kind': 'story', 'state': 'detected',
            'title': ('SEO/GEO research: ' + item['readerQuestion'])[:240],
            'desk': 'seo-geo', 'format': 'research_brief', 'responsible_agent': 'remy',
            'risk_class': 'amber', 'confidence': round(confidence, 2),
            'content_ref': 'ops/geo-engine/.runs/state/research-queue.json#' + ident}


def handoff(items, request, dry_run=False):
    out = []
    for item in items:
        payload = intake(item)
        if payload is None:
            continue
        if len(out) >= 3:
            break
        route = '/rest/v1/pi_work_items?id=eq.' + payload['id'] + '&select=id,kind,state,format,content_ref'
        status, rows = request('GET', route, None)
        if status != 200 or not isinstance(rows, list):
            raise RuntimeError('Editorial intake read unavailable')
        existing = rows[0] if rows else None
        if existing and (existing.get('format') != payload['format'] or existing.get('content_ref') != payload['content_ref']):
            raise RuntimeError('Existing editorial identity does not match; preserved')
        if not existing and not dry_run:
            status, response = request('POST', '/rest/v1/pi_work_items', payload)
            if status == 409:
                status, response = request('GET', route, None)
            if status not in (200, 201) or not isinstance(response, list) or not response:
                raise RuntimeError('Editorial intake not confirmed; retry by stable ID')
            existing = response[0]
            if existing.get('id') != payload['id'] or existing.get('content_ref') != payload['content_ref']:
                raise RuntimeError('Editorial intake identity mismatch')
        if existing:
            item['externalWorkItem'] = payload['id']
            item['status'] = 'rejected' if existing.get('state') == 'killed' else 'handed_off'
        out.append({'id': payload['id'], 'created': bool(existing and not rows), 'dryRun': dry_run,
                    'state': existing.get('state') if existing else 'would_detect'})
    return out


def main():
    state = Path(os.environ.get('PI_GEO_STATE_DIR', str(Path(__file__).resolve().parents[1] / '.runs/state')))
    file = state / 'research-queue.json'
    queue = json.loads(file.read_text()) if file.exists() else {'items': []}
    # Reuse the installed PI-specific resolver and its fixed project guard. No credential output.
    sys.path.insert(0, '/home/node/.openclaw/bin')
    from pi_asana_transition import supa
    from pi_asana_mirror import resolve_supabase
    base, key = resolve_supabase()
    result = handoff(queue['items'], lambda method, route, body: supa(base, key, method, route, body), '--dry-run' in sys.argv)
    if '--dry-run' not in sys.argv and file.exists():
        temporary = file.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(queue, indent=2))
        temporary.replace(file)
    print(json.dumps({'status': 'ok', 'handoffs': result, 'publicationAuthorised': False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'status': 'unavailable', 'errorType': type(error).__name__, 'publicationAuthorised': False}))
        sys.exit(2)
