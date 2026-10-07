#!/usr/bin/env python3
"""Generate a page-quality register from a public sitemap snapshot.

Existing review states are retained by URL. Removed URLs go to removed.csv for
canonical/redirect review rather than silently disappearing.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

HOST = "peninsulainsider.com.au"
FIELDS = [
    "url", "path", "tier", "family", "state", "baseline_score",
    "current_score", "hard_gate", "last_reviewed", "next_action",
]
T1_EXACT = {
    "/", "/eat/", "/stay/", "/wine/", "/explore/", "/explore/plans/",
    "/explore/places/", "/explore/regions/", "/journal/", "/whats-on/",
    "/whats-on/this-weekend/", "/dog-friendly/", "/weddings/",
    "/corporate-events/", "/fishing/", "/boating/", "/tour/", "/awards/",
    "/guides/", "/ask/", "/map/", "/about/", "/editorial-approach/",
    "/how-we-check/", "/explore/golf/",
}
T3_PREFIXES = (
    "/whats-on/this-weekend/archive/", "/whats-on/by-mood/",
    "/whats-on/", "/events/", "/fishing/", "/boating/", "/tour/",
    "/tour-packages/", "/awards/", "/insiders-30/", "/quick-note/",
)
T3_EXACT = {"/tour-packages/", "/insiders-30/", "/quick-note/"}


def classify(path: str) -> tuple[str, str]:
    if path in T1_EXACT or path.startswith("/explore/places/"):
        tier = "T1"
    elif path in T3_EXACT or path.startswith(T3_PREFIXES):
        tier = "T3"
    else:
        tier = "T2"

    if path == "/":
        family = "home"
    elif path in T1_EXACT:
        family = "hub"
    elif path.startswith("/explore/places/"):
        family = "place"
    elif path.startswith("/explore/plans/"):
        family = "plan"
    elif path.startswith("/journal/"):
        family = "journal"
    elif path.startswith(("/eat/", "/stay/", "/wine/")):
        family = path.strip("/").split("/")[0]
    elif path.startswith(("/whats-on/", "/events/")):
        family = "event"
    elif path.startswith(("/fishing/", "/boating/", "/tour/", "/tour-packages/")):
        family = "specialist"
    elif path.startswith("/awards/"):
        family = "award"
    else:
        family = "guide-utility"
    return tier, family


def read_csv(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {row["url"]: row for row in csv.DictReader(handle)}


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sitemap", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    xml_bytes = args.sitemap.read_bytes()
    root = ET.fromstring(xml_bytes)
    urls: set[str] = set()
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1] != "loc" or not node.text:
            continue
        parsed = urlparse(node.text.strip())
        if parsed.scheme != "https" or parsed.netloc != HOST or parsed.query or parsed.fragment:
            raise ValueError(f"Unexpected sitemap URL: {node.text}")
        path = parsed.path
        if not path.startswith("/") or (path != "/" and not path.endswith("/")):
            raise ValueError(f"Noncanonical path form: {node.text}")
        urls.add(f"https://{HOST}{path}")

    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    previous = read_csv(out_dir / "register.csv")
    rows: list[dict[str, str]] = []
    for url in sorted(urls, key=lambda u: (classify(urlparse(u).path)[0], u)):
        path = urlparse(url).path
        tier, family = classify(path)
        old = previous.get(url, {})
        row = {
            "url": url, "path": path, "tier": tier, "family": family,
            "state": old.get("state") or "unscored",
            "baseline_score": old.get("baseline_score", ""),
            "current_score": old.get("current_score", ""),
            "hard_gate": old.get("hard_gate", ""),
            "last_reviewed": old.get("last_reviewed", ""),
            "next_action": old.get("next_action") or "Baseline page",
        }
        rows.append(row)
    # Retain earlier scope-review history across repeated sitemap snapshots.
    # A URL that re-enters the live sitemap leaves the removed ledger.
    historical_removed = read_csv(out_dir / "removed.csv")
    removed_by_url = {
        url: dict(row) for url, row in historical_removed.items() if url not in urls
    }
    for url, old in previous.items():
        if url in urls:
            continue
        row = dict(old)
        row["state"] = "scope-review"
        row["next_action"] = "Check live status, redirect and canonical before removal"
        removed_by_url[url] = row
    removed = sorted(removed_by_url.values(), key=lambda row: (row["tier"], row["url"]))
    write_csv(out_dir / "register.csv", rows)
    write_csv(out_dir / "removed.csv", removed)
    metadata = {
        "sitemapUrl": f"https://{HOST}/sitemap.xml",
        "snapshotFile": str(args.sitemap.name),
        "sha256": hashlib.sha256(xml_bytes).hexdigest(),
        "processedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "urlCount": len(rows),
        "tierCounts": {tier: sum(row["tier"] == tier for row in rows) for tier in ("T1", "T2", "T3")},
        "removedCount": len(removed),
    }
    (out_dir / "source.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
