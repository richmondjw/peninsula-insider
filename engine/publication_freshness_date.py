"""Select the edition due for a freshness probe without anticipating the writer."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SYDNEY = ZoneInfo("Australia/Sydney")
# daily-content.yml publishes at this fixed UTC hour in both AEST and AEDT.
WRITER_UTC_HOUR = 20


def expected_date(event: str, now: datetime) -> str:
    if now.utcoffset() is None:
        raise ValueError("now must include a timezone")
    if event != "workflow_run":
        # Preserve manual and scheduled probes' current Sydney date.
        return now.astimezone(SYDNEY).date().isoformat()
    utc = now.astimezone(timezone.utc)
    slot = utc.replace(hour=WRITER_UTC_HOUR, minute=0, second=0, microsecond=0)
    if utc < slot:
        slot -= timedelta(days=1)
    # Unrelated overnight deployments still validate the edition already due,
    # rather than requiring the next writer's not-yet-due source record.
    return slot.astimezone(SYDNEY).date().isoformat()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", default="")
    args = parser.parse_args()
    print(expected_date(args.event, datetime.now(timezone.utc)))


if __name__ == "__main__":
    main()
