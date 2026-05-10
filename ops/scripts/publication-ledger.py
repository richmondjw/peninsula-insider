#!/usr/bin/env python3
"""Append and validate Peninsula Insider publication ledger records."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
LEDGER_DIR = ROOT / "ops" / "publication-ledger"
ENTRIES_DIR = LEDGER_DIR / "entries"
CSV_PATH = LEDGER_DIR / "index.csv"
SCHEMA_PATH = LEDGER_DIR / "publication-ledger.schema.json"

REQUIRED_FIELDS = [
    "timestamp",
    "job_name",
    "agent_or_owner",
    "content_type",
    "canonical_url_or_path",
    "change_summary",
    "risk_tier",
    "approval_mode",
    "publish_result",
    "verification_result",
]

CSV_COLUMNS = [
    "ledger_id",
    "timestamp",
    "job_name",
    "agent_or_owner",
    "content_type",
    "content_id",
    "canonical_url_or_path",
    "change_summary",
    "risk_tier",
    "approval_mode",
    "approved_by",
    "publish_result",
    "verification_result",
    "rollback_reference",
    "run_id",
    "notes",
]

ALLOWED_RISK_TIERS = {"low", "medium", "high"}
ALLOWED_APPROVAL_MODES = {
    "system-approved",
    "bulk-approved",
    "light-editorial-review",
    "founder-led-editorial-approval",
    "manual-approval",
    "no-publish",
}
ALLOWED_PUBLISH_RESULTS = {"published", "skipped", "blocked", "failed", "rolled-back"}
ALLOWED_VERIFICATION_RESULTS = {"passed", "failed", "pending", "not-required"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Peninsula Insider publication ledger tool")
    sub = parser.add_subparsers(dest="command", required=True)

    append_parser = sub.add_parser("append", help="Append a ledger entry")
    append_parser.add_argument("--entry-file", help="Path to a JSON file containing one ledger entry")
    append_parser.add_argument("--entry-json", help="Inline JSON string containing one ledger entry")
    append_parser.add_argument("--dry-run", action="store_true", help="Validate and print without writing")

    validate_parser = sub.add_parser("validate", help="Validate a ledger entry")
    validate_parser.add_argument("--entry-file", required=True, help="Path to a JSON file containing one ledger entry")

    return parser.parse_args()


def load_json_file(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text())


def load_entry(args: argparse.Namespace) -> dict[str, Any]:
    if args.entry_file:
        return load_json_file(args.entry_file)
    if args.entry_json:
        return json.loads(args.entry_json)
    raise SystemExit("Either --entry-file or --entry-json is required.")


def ensure_iso8601(timestamp: str) -> None:
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"timestamp must be ISO 8601: {timestamp}") from exc
    if dt.tzinfo is None:
        raise ValueError("timestamp must include timezone information")


def validate_entry(entry: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(entry, dict):
        raise ValueError("entry must be a JSON object")

    normalized = deepcopy(entry)

    missing = [field for field in REQUIRED_FIELDS if not normalized.get(field)]
    if missing:
        raise ValueError(f"missing required fields: {', '.join(missing)}")

    ensure_iso8601(str(normalized["timestamp"]))

    if normalized["risk_tier"] not in ALLOWED_RISK_TIERS:
        raise ValueError(f"invalid risk_tier: {normalized['risk_tier']}")
    if normalized["approval_mode"] not in ALLOWED_APPROVAL_MODES:
        raise ValueError(f"invalid approval_mode: {normalized['approval_mode']}")
    if normalized["publish_result"] not in ALLOWED_PUBLISH_RESULTS:
        raise ValueError(f"invalid publish_result: {normalized['publish_result']}")
    if normalized["verification_result"] not in ALLOWED_VERIFICATION_RESULTS:
        raise ValueError(f"invalid verification_result: {normalized['verification_result']}")

    if normalized["risk_tier"] == "high" and normalized["approval_mode"] != "founder-led-editorial-approval":
        raise ValueError("high-risk entries must use founder-led-editorial-approval")

    if normalized["approval_mode"] == "founder-led-editorial-approval" and not normalized.get("approved_by"):
        raise ValueError("founder-led approvals require approved_by")

    if not normalized.get("ledger_id"):
        normalized["ledger_id"] = build_ledger_id(normalized)

    for column in CSV_COLUMNS:
        normalized.setdefault(column, None)

    return normalized


def build_ledger_id(entry: dict[str, Any]) -> str:
    slug = str(entry.get("job_name", "publish")).strip().replace(" ", "-")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    suffix = uuid.uuid4().hex[:8]
    return f"{slug}-{stamp}-{suffix}"


def month_log_path(entry: dict[str, Any]) -> Path:
    dt = datetime.fromisoformat(str(entry["timestamp"]).replace("Z", "+00:00"))
    return ENTRIES_DIR / f"{dt.strftime('%Y-%m')}.jsonl"


def ensure_storage() -> None:
    ENTRIES_DIR.mkdir(parents=True, exist_ok=True)
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            writer.writeheader()


def append_entry(entry: dict[str, Any], dry_run: bool = False) -> None:
    ensure_storage()
    jsonl_path = month_log_path(entry)

    if dry_run:
        print(json.dumps(entry, indent=2, ensure_ascii=False))
        print(f"DRY RUN: would append JSONL to {jsonl_path}")
        print(f"DRY RUN: would append CSV row to {CSV_PATH}")
        return

    with jsonl_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writerow({k: value_to_csv(entry.get(k)) for k in CSV_COLUMNS})

    print(f"Appended ledger entry {entry['ledger_id']}")
    print(f"JSONL: {jsonl_path}")
    print(f"CSV: {CSV_PATH}")


def value_to_csv(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def main() -> int:
    args = parse_args()

    if args.command == "validate":
        try:
            entry = load_json_file(args.entry_file)
            validated = validate_entry(entry)
        except Exception as exc:  # noqa: BLE001
            print(f"Validation failed: {exc}", file=sys.stderr)
            return 1
        print(json.dumps(validated, indent=2, ensure_ascii=False))
        print("Validation passed")
        return 0

    if args.command == "append":
        try:
            entry = load_entry(args)
            validated = validate_entry(entry)
            append_entry(validated, dry_run=args.dry_run)
        except Exception as exc:  # noqa: BLE001
            print(f"Append failed: {exc}", file=sys.stderr)
            return 1
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
