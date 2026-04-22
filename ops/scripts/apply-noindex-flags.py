"""
Reads ops/reports/seo-classification.csv and adds "sitemapExclude": true
to every KEEP_NOINDEX JSON content file.

Collection mapping:
  eat / wine / stay  -> next/src/content/venues/{slug}.json
  explore            -> next/src/content/experiences/{slug}.json
  places             -> next/src/content/places/{slug}.json
  escape             -> next/src/content/itineraries/{slug}.json
  journal            -> standalone .astro page — skipped (patched manually)
"""

import csv
import json
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
CSV  = BASE / "ops" / "reports" / "seo-classification.csv"

SECTION_TO_COLLECTION = {
    "eat":     "venues",
    "wine":    "venues",
    "stay":    "venues",
    "explore": "experiences",
    "places":  "places",
    "escape":  "itineraries",
}

patched = 0
skipped = 0
missing = 0

with CSV.open(newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["bucket"] != "KEEP_NOINDEX":
            continue

        section = row["section"]
        url = row["url"].rstrip("/")
        slug = url.split("/")[-1]

        collection = SECTION_TO_COLLECTION.get(section)
        if collection is None:
            print(f"  SKIP  {section}/{slug}  (no JSON collection)")
            skipped += 1
            continue

        json_path = BASE / "next" / "src" / "content" / collection / f"{slug}.json"
        if not json_path.exists():
            print(f"  MISS  {json_path.relative_to(BASE)}")
            missing += 1
            continue

        data = json.loads(json_path.read_text(encoding="utf-8"))
        if data.get("sitemapExclude") is True:
            skipped += 1
            continue

        data["sitemapExclude"] = True
        json_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8"
        )
        print(f"  OK    {collection}/{slug}.json")
        patched += 1

print()
print(f"Patched: {patched}  |  Skipped/already set: {skipped}  |  Missing: {missing}")
