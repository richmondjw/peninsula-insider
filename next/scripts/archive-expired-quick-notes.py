#!/usr/bin/env python3
"""
archive-expired-quick-notes.py - daily cron job 4 from the events registry design.

For each quick note whose `expiresAt` is already in the past, flip
`status: published` to `status: archived`. Quick notes are the daily-cadence
briefs rendered on /quick-note/ across three horizons (now / today / week);
once the window has lapsed the note should drop off the live page instead of
sitting there stale.

Only `published` notes are touched. `draft` notes are left alone (they were
never live) and `archived` notes are already done. Editor can flag
`keepLive: true` in the frontmatter to opt out of auto-archive (handy when a
closure or safety note needs to outlive its stated window).

The script rewrites only the `status:` line of the YAML frontmatter, in place,
byte-for-byte otherwise: line endings, key order, quoting and body are all
preserved. Diff is committed by the GitHub Actions workflow.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

NOTE_DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'quick-notes'
# Quick-note frontmatter carries explicit offsets (+10:00). This is only the
# fallback for a naive value: the Peninsula runs on Melbourne time.
SITE_TZ = timezone(timedelta(hours=10))
FRONTMATTER_FENCE = '---'


def parse_datetime(s: str | None) -> datetime | None:
    if not s:
        return None
    value = s.strip().strip('"').strip("'")
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SITE_TZ)
    return dt


def split_frontmatter(lines: list[str]) -> tuple[int, int] | None:
    """Return (start, end) indices of the frontmatter body, fences excluded."""
    if not lines or lines[0].strip() != FRONTMATTER_FENCE:
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == FRONTMATTER_FENCE:
            return 1, i
    return None


def read_scalar(lines: list[str], start: int, end: int, key: str) -> str | None:
    """Read a top-level frontmatter scalar. Nested keys are ignored."""
    prefix = f'{key}:'
    for i in range(start, end):
        line = lines[i]
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return None


def find_line(lines: list[str], start: int, end: int, key: str) -> int | None:
    prefix = f'{key}:'
    for i in range(start, end):
        if lines[i].startswith(prefix):
            return i
    return None


def main() -> int:
    now = datetime.now(timezone.utc)
    archived = []
    skipped_keep_live = []
    skipped_no_expiry = []

    for path in sorted(NOTE_DIR.glob('*.md')):
        try:
            # Bytes, not read_text: three notes are CRLF and universal-newline
            # translation would rewrite every line of them for no reason.
            raw = path.read_bytes().decode('utf-8')
        except Exception as e:
            print(f"SKIP (read error) {path.name}: {e}")
            continue

        lines = raw.splitlines(keepends=True)
        bounds = split_frontmatter(lines)
        if bounds is None:
            print(f"SKIP (no frontmatter) {path.name}")
            continue
        start, end = bounds

        status = read_scalar(lines, start, end, 'status')
        if status is None or status.strip('"').strip("'") != 'published':
            continue
        if read_scalar(lines, start, end, 'keepLive') == 'true':
            skipped_keep_live.append(path.stem)
            continue

        expires = parse_datetime(read_scalar(lines, start, end, 'expiresAt'))
        if expires is None:
            skipped_no_expiry.append(path.stem)
            continue
        if expires > now:
            continue

        index = find_line(lines, start, end, 'status')
        if index is None:
            continue
        # Preserve whatever line ending this file uses.
        ending = lines[index][len(lines[index].rstrip('\r\n')):]
        lines[index] = f'status: archived{ending}'
        path.write_bytes(''.join(lines).encode('utf-8'))
        archived.append(path.stem)

    print(f"Archived: {len(archived)}")
    for slug in archived[:20]:
        print(f"  - {slug}")
    if len(archived) > 20:
        print(f"  ... and {len(archived) - 20} more")
    print(f"Skipped (keep-live flag): {len(skipped_keep_live)}")
    print(f"Skipped (no expiresAt): {len(skipped_no_expiry)}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
