"""Select a due edition without treating unrelated in-flight builds as publication."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

SYDNEY = ZoneInfo("Australia/Sydney")
WRITER_UTC_HOUR = 20
BACKSTOP_UTC_HOUR = 22
BACKSTOP_UTC_MINUTE = 30


def expected_date(event: str, now: datetime, deployed_dates=()) -> str:
    if now.utcoffset() is None:
        raise ValueError("now must include a timezone")
    if event != "workflow_run":
        return now.astimezone(SYDNEY).date().isoformat()
    utc = now.astimezone(timezone.utc)
    slot = utc.replace(hour=WRITER_UTC_HOUR, minute=0, second=0, microsecond=0)
    if utc < slot:
        slot -= timedelta(days=1)
    due = slot.astimezone(SYDNEY).date().isoformat()
    deadline = slot.replace(hour=BACKSTOP_UTC_HOUR, minute=BACKSTOP_UTC_MINUTE)
    if utc < deadline and due not in deployed_dates:
        # This deployment did not contain the new edition. The writer/deployer
        # may still be running; validate the previous edition, without skipping.
        return (slot - timedelta(days=1)).astimezone(SYDNEY).date().isoformat()
    # A deployment containing the due source, or the publication deadline,
    # requires the due edition. Never fall back after the backstop.
    return due


def deployed_dates(root: Path) -> set[str]:
    if not root.is_dir():
        raise ValueError("workflow_run requires the deployed source snapshot")
    # Inspect entry names only. A due entry of any type prevents fallback;
    # source validity remains the existing default-branch validator's job.
    return {p.name.removeprefix("insider-picks-").removesuffix(".md")
            for p in root.iterdir()
            if p.name.startswith("insider-picks-") and p.name.endswith(".md")}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", default="")
    parser.add_argument("--deployed-source-root", type=Path)
    args = parser.parse_args()
    dates = set()
    if args.event == "workflow_run":
        try:
            if args.deployed_source_root is None:
                raise ValueError("workflow_run requires the deployed source snapshot")
            dates = deployed_dates(args.deployed_source_root)
        except (OSError, ValueError) as exc:
            parser.error(str(exc))
    print(expected_date(args.event, datetime.now(timezone.utc), dates))


if __name__ == "__main__":
    main()
