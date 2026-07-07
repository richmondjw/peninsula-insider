#!/usr/bin/env python3
"""
Peninsula Insider — non-silent alert path.

The operating surface's single highest-impact gap: mutating jobs fail silently.
This gives the autonomous loop a voice. `emit_alert` ALWAYS writes a structured
alert file under ops/alerts/, and when running in CI (GITHUB_TOKEN +
GITHUB_REPOSITORY present) it also opens — or reuses — a deduplicated GitHub
issue so a human is actually notified. Stdlib-only; never raises (an alerting
failure must not mask the original failure).

Usage (CLI, e.g. from a workflow `if: failure()` step):
  python engine/alert.py --title "Daily run failed" --body "..." --dedup daily-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(os.environ.get("PI_REPO_ROOT", str(Path(__file__).resolve().parent.parent)))
ALERTS_DIR = REPO_ROOT / "ops/alerts"
ISSUE_LABEL = "pi-alert"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "alert"


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def write_alert_file(title: str, body: str, severity: str, dedup_key: str) -> Path:
    ALERTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
    path = ALERTS_DIR / f"{stamp}-{_slug(dedup_key)}.json"
    path.write_text(json.dumps({
        "title": title, "body": body, "severity": severity,
        "dedup_key": dedup_key, "created": _now(),
    }, indent=2), encoding="utf-8")
    return path


def _gh_request(method: str, url: str, token: str, payload: dict | None = None) -> dict | list | None:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "peninsula-insider-alert")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def open_or_reuse_issue(title: str, body: str, dedup_key: str) -> str | None:
    """Open a GitHub issue (or reuse an existing open one carrying the same dedup
    marker). Returns the issue URL, or None if not in CI / on any failure."""
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        return None
    marker = f"<!-- pi-alert:{dedup_key} -->"
    full_body = f"{marker}\n\n{body}\n\n_Emitted by the Peninsula Insider content engine at {_now()}._"
    try:
        # Reuse an open alert issue with the same marker to avoid a pile-up.
        existing = _gh_request(
            "GET", f"https://api.github.com/repos/{repo}/issues?state=open&labels={ISSUE_LABEL}&per_page=50", token)
        if isinstance(existing, list):
            for issue in existing:
                if marker in (issue.get("body") or ""):
                    num = issue["number"]
                    _gh_request("POST", f"https://api.github.com/repos/{repo}/issues/{num}/comments",
                                token, {"body": f"Recurred at {_now()}.\n\n{body}"})
                    return issue.get("html_url")
        created = _gh_request("POST", f"https://api.github.com/repos/{repo}/issues", token,
                              {"title": title, "body": full_body, "labels": [ISSUE_LABEL]})
        return created.get("html_url") if isinstance(created, dict) else None
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError, OSError) as e:
        print(f"  alert: GitHub issue failed ({e}) — alert file still written")
        return None


def emit_alert(title: str, body: str, severity: str = "error",
               dedup_key: str | None = None) -> dict:
    """Record an alert (file always; GitHub issue in CI). Never raises."""
    dedup_key = dedup_key or _slug(title)
    result = {"title": title, "severity": severity, "file": None, "issue": None}
    try:
        result["file"] = str(write_alert_file(title, body, severity, dedup_key))
    except OSError as e:
        print(f"  alert: could not write alert file ({e})")
    result["issue"] = open_or_reuse_issue(title, body, dedup_key)
    where = result["issue"] or result["file"] or "(nowhere)"
    print(f"  ALERT [{severity}] {title} -> {where}")
    return result


def main():
    ap = argparse.ArgumentParser(description="Emit a Peninsula Insider alert")
    ap.add_argument("--title", required=True)
    ap.add_argument("--body", default="")
    ap.add_argument("--severity", default="error")
    ap.add_argument("--dedup", default=None)
    args = ap.parse_args()
    emit_alert(args.title, args.body, args.severity, args.dedup)


if __name__ == "__main__":
    main()
