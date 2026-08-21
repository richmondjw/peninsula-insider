#!/usr/bin/env python3
"""Fail closed when the daily Insider Picks publication is stale or unverifiable.

This is deliberately independent of the scheduler's exit status.  It proves
that the dated source record exists, is marked published and verified for the
expected Melbourne date, and (when ``--url`` is supplied) that the same dated
page is live on the public site.
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path


def _frontmatter(text: str) -> str:
    match = re.match(r"^---\n(.*?)\n---", text, re.S)
    return match.group(1) if match else ""


def _field(frontmatter: str, name: str) -> str | None:
    match = re.search(rf"^{re.escape(name)}:\s*[\"']?([^\n\"']+)[\"']?\s*$",
                      frontmatter, re.M)
    return match.group(1).strip() if match else None


def source_failures(article: Path, expected_date: str) -> list[str]:
    if not article.is_file():
        return [f"missing daily publication: {article}"]
    text = article.read_text(encoding="utf-8")
    frontmatter = _frontmatter(text)
    failures: list[str] = []
    if not frontmatter:
        failures.append("article has no YAML frontmatter")
        return failures
    for field, required in (("publishedAt", expected_date),
                            ("lastVerified", expected_date),
                            ("status", "published")):
        actual = _field(frontmatter, field)
        if actual != required:
            failures.append(f"{field} is {actual!r}; expected {required!r}")
    body = re.sub(r"^---\n.*?\n---\s*", "", text, count=1, flags=re.S).strip()
    if len(re.findall(r"\b[\w’'-]+\b", body)) < 250:
        failures.append("article body is under the 250-word publication floor")
    return failures


def live_failure(url: str, expected_date: str) -> str | None:
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "PI-publication-freshness/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200:
                return f"live page returned HTTP {response.status}: {url}"
            html = response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, OSError) as exc:
        return f"could not verify live page {url}: {exc}"
    if f"insider-picks-{expected_date}" not in html:
        return f"live page does not identify the expected dated publication: {url}"
    if f'datetime="{expected_date}"' not in html:
        return f"live page does not expose the expected published date {expected_date}: {url}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-date", default=date.today().isoformat())
    parser.add_argument("--article", type=Path, required=True)
    parser.add_argument("--url", help="Optional deployed article URL to verify")
    args = parser.parse_args()

    source = source_failures(args.article, args.expected_date)
    live: list[str] = []
    if args.url:
        failure = live_failure(args.url, args.expected_date)
        if failure:
            live.append(failure)

    all_failures = source + live
    if all_failures:
        print("PUBLICATION FRESHNESS FAILED:", file=sys.stderr)
        for failure in all_failures:
            print(f"- {failure}", file=sys.stderr)
        # Exit 2 when the source record itself is missing or stale — this is
        # always a hard failure that retrying cannot fix.
        # Exit 1 when only the live page is unavailable — this is transient
        # (GitHub Pages deploy lag) and the caller may choose to retry.
        return 2 if source else 1
    print(f"Publication freshness passed: {args.article} ({args.expected_date})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
