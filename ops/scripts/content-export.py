#!/usr/bin/env python3
"""
Peninsula Insider — Content Export Script
Generates structured CSVs from all content collections for editorial,
SEO, UX, and brand review.

Output: ops/exports/content-export-YYYY-MM-DD/
  - articles.csv
  - venues.csv
  - itineraries.csv
  - events.csv
  - experiences.csv
  - places.csv
  - summary.csv (one row per collection, counts + status breakdown)

Usage:
  python ops/scripts/content-export.py
  python ops/scripts/content-export.py --collection articles
  python ops/scripts/content-export.py --output-dir /custom/path
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = REPO_ROOT / "next" / "src" / "content"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "ops" / "exports" / f"content-export-{date.today().isoformat()}"

BASE_URL = "https://peninsulainsider.com.au"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_yaml_frontmatter(text: str) -> tuple[dict, str]:
    """Minimal YAML frontmatter parser — handles the subset used in PI articles."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_raw = text[3:end].strip()
    body = text[end + 4:].strip()
    data: dict = {}
    current_key = None
    current_list = None
    for line in fm_raw.splitlines():
        # Skip comment lines
        if line.strip().startswith("#"):
            continue
        # List item
        if line.startswith("  - ") or line.startswith("- "):
            val = line.strip().lstrip("- ").strip().strip('"').strip("'")
            if current_list is not None:
                current_list.append(val)
            continue
        # Key: value
        if ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if val == "" or val is None:
                # Possibly a list follows
                current_key = key
                current_list = []
                data[key] = current_list
            else:
                current_key = key
                current_list = None
                # Booleans
                if val.lower() == "true":
                    val = True
                elif val.lower() == "false":
                    val = False
                data[key] = val
        # Indented scalar (multi-line values — just append)
    return data, body


def word_count(text: str) -> int:
    return len(re.findall(r"\w+", text))


def excerpt(text: str, chars: int = 280) -> str:
    """First `chars` characters of body, stripped of markdown."""
    clean = re.sub(r"[#*`>\[\]!]", "", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    if len(clean) <= chars:
        return clean
    return clean[:chars].rsplit(" ", 1)[0] + "…"


def join_list(val) -> str:
    if isinstance(val, list):
        return " | ".join(str(v) for v in val)
    return str(val) if val else ""


def flatten_tags(tags) -> str:
    if isinstance(tags, dict):
        parts = []
        for k, v in tags.items():
            if isinstance(v, list):
                parts.append(f"{k}:{','.join(v)}")
            else:
                parts.append(f"{k}:{v}")
        return " | ".join(parts)
    return join_list(tags)


def hours_str(hours) -> str:
    if isinstance(hours, dict):
        return "  ".join(f"{k}: {v}" for k, v in hours.items())
    return str(hours) if hours else ""


def live_status(data: dict) -> str:
    if data.get("status") == "draft":
        return "draft"
    if data.get("sitemapExclude") is True:
        return "staging"
    return "live"


def fmt_date(val) -> str:
    if not val:
        return ""
    return str(val)


# ---------------------------------------------------------------------------
# Articles
# ---------------------------------------------------------------------------

ARTICLE_FIELDS = [
    "slug", "status_live", "content_type", "section", "format",
    "title", "dek", "author", "publish_date", "last_verified",
    "url", "tags", "featured", "reading_time_min",
    "hero_image_src", "hero_image_alt", "hero_credit",
    "word_count", "excerpt",
    "cluster_links", "faq_count",
    "related_venues", "pair_with",
    "sitemap_exclude",
]


def export_articles(output_dir: Path):
    src = CONTENT_DIR / "articles"
    rows = []
    for fp in sorted(list(src.glob("*.md")) + list(src.glob("*.mdx"))):
        raw = fp.read_text(encoding="utf-8")
        data, body = parse_yaml_frontmatter(raw)
        slug = fp.stem
        section = data.get("section", "journal")
        url = f"{BASE_URL}/journal/{slug}/" if section == "journal" else f"{BASE_URL}/plans/{slug}/"
        hero = data.get("heroImage") or {}
        if isinstance(hero, str):
            hero = {}
        tags_raw = data.get("tags", [])
        cluster = data.get("clusterLinks", [])
        cluster_str = join_list([c.get("label", "") if isinstance(c, dict) else c for c in cluster]) if isinstance(cluster, list) else ""
        faq = data.get("faq", [])
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "article",
            "section": section,
            "format": data.get("format", ""),
            "title": data.get("title", ""),
            "dek": data.get("dek", ""),
            "author": data.get("author", ""),
            "publish_date": fmt_date(data.get("publishedAt")),
            "last_verified": fmt_date(data.get("lastVerified")),
            "url": url,
            "tags": join_list(tags_raw),
            "featured": data.get("featured", False),
            "reading_time_min": data.get("readingTimeMinutes", ""),
            "hero_image_src": hero.get("src", "") if isinstance(hero, dict) else "",
            "hero_image_alt": hero.get("alt", "") if isinstance(hero, dict) else "",
            "hero_credit": hero.get("credit", "") if isinstance(hero, dict) else "",
            "word_count": word_count(body),
            "excerpt": excerpt(body),
            "cluster_links": cluster_str,
            "faq_count": len(faq) if isinstance(faq, list) else 0,
            "related_venues": join_list(data.get("relatedVenues", [])),
            "pair_with": join_list(data.get("pairWith", [])),
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "articles.csv", ARTICLE_FIELDS, rows)
    print(f"  articles:      {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Venues
# ---------------------------------------------------------------------------

VENUE_FIELDS = [
    "slug", "status_live", "content_type", "venue_type", "place", "zone",
    "name", "address", "price_band",
    "url", "website", "booking_url", "booking_provider",
    "phone", "email",
    "opening_hours",
    "signature", "why_we_go", "editor_note_excerpt", "if_only_one_thing",
    "best_for", "tags", "awards",
    "hero_image_src", "hero_image_alt", "hero_credit",
    "featured_partner", "last_verified", "publish_date",
    "pair_with", "sitemap_exclude",
]


def export_venues(output_dir: Path):
    src = CONTENT_DIR / "venues"
    rows = []
    for fp in sorted(src.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"    WARN: {fp.name} — {e}")
            continue
        slug = data.get("slug", fp.stem)
        vtype = data.get("type", "venue")
        url = f"{BASE_URL}/explore/{vtype}s/{slug}/"
        hero = data.get("heroImage") or {}
        authority = data.get("authority") or {}
        awards = join_list(authority.get("awards", [])) if isinstance(authority, dict) else ""
        note = data.get("editorNote", "") or ""
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "venue",
            "venue_type": vtype,
            "place": data.get("place", ""),
            "zone": data.get("zone", ""),
            "name": data.get("name", ""),
            "address": data.get("address", ""),
            "price_band": data.get("priceBand", ""),
            "url": url,
            "website": data.get("website", ""),
            "booking_url": data.get("bookingUrl", ""),
            "booking_provider": data.get("bookingProvider", ""),
            "phone": data.get("phone", ""),
            "email": data.get("email", ""),
            "opening_hours": hours_str(data.get("openingHours")),
            "signature": data.get("signature", ""),
            "why_we_go": data.get("whyWeGo", ""),
            "editor_note_excerpt": excerpt(note, 400),
            "if_only_one_thing": data.get("ifOnlyOneThing", ""),
            "best_for": join_list(data.get("bestFor", [])),
            "tags": flatten_tags(data.get("tags", {})),
            "awards": awards,
            "hero_image_src": hero.get("src", "") if isinstance(hero, dict) else "",
            "hero_image_alt": hero.get("alt", "") if isinstance(hero, dict) else "",
            "hero_credit": hero.get("credit", "") if isinstance(hero, dict) else "",
            "featured_partner": data.get("featuredPartner", False),
            "last_verified": fmt_date(data.get("lastVerified")),
            "publish_date": fmt_date(data.get("publishedAt")),
            "pair_with": join_list(data.get("pairWith", [])),
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "venues.csv", VENUE_FIELDS, rows)
    print(f"  venues:        {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Itineraries (Plans)
# ---------------------------------------------------------------------------

ITINERARY_FIELDS = [
    "slug", "status_live", "content_type",
    "title", "tagline", "mood", "duration", "group_size",
    "url", "tags", "hero_image_src",
    "stops_count", "sitemap_exclude",
]


def export_itineraries(output_dir: Path):
    src = CONTENT_DIR / "itineraries"
    rows = []
    for fp in sorted(src.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"    WARN: {fp.name} — {e}")
            continue
        slug = data.get("slug", fp.stem)
        hero = data.get("heroImage") or {}
        stops = data.get("stops", []) or data.get("days", []) or []
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "itinerary",
            "title": data.get("title", data.get("name", "")),
            "tagline": data.get("tagline", data.get("dek", "")),
            "mood": join_list(data.get("mood", [])),
            "duration": data.get("duration", ""),
            "group_size": join_list(data.get("groupSize", [])),
            "url": f"{BASE_URL}/plans/{slug}/",
            "tags": flatten_tags(data.get("tags", {})),
            "hero_image_src": hero.get("src", "") if isinstance(hero, dict) else "",
            "stops_count": len(stops),
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "itineraries.csv", ITINERARY_FIELDS, rows)
    print(f"  itineraries:   {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

EVENT_FIELDS = [
    "slug", "status_live", "content_type", "category",
    "title", "venue_name", "place", "zone",
    "start_date", "end_date", "recurrence",
    "url", "booking_url",
    "summary", "tags",
    "visitor_appeal_score", "family_friendly",
    "hero_image_src", "sitemap_exclude",
]


def export_events(output_dir: Path):
    src = CONTENT_DIR / "events"
    rows = []
    for fp in sorted(src.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"    WARN: {fp.name} — {e}")
            continue
        slug = data.get("slug", fp.stem)
        hero = data.get("heroImage") or {}
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "event",
            "category": data.get("category", ""),
            "title": data.get("title", data.get("name", "")),
            "venue_name": data.get("venueName", data.get("venue", "")),
            "place": data.get("place", ""),
            "zone": data.get("zone", ""),
            "start_date": fmt_date(data.get("startDate")),
            "end_date": fmt_date(data.get("endDate")),
            "recurrence": data.get("recurrence", data.get("recurring", "")),
            "url": f"{BASE_URL}/whats-on/{slug}/",
            "booking_url": data.get("bookingUrl", ""),
            "summary": data.get("summary", data.get("description", excerpt(data.get("body", ""), 280))),
            "tags": flatten_tags(data.get("tags", {})),
            "visitor_appeal_score": data.get("visitorAppealScore", ""),
            "family_friendly": data.get("familyFriendly", ""),
            "hero_image_src": hero.get("src", "") if isinstance(hero, dict) else "",
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "events.csv", EVENT_FIELDS, rows)
    print(f"  events:        {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Experiences
# ---------------------------------------------------------------------------

EXP_FIELDS = [
    "slug", "status_live", "content_type", "category",
    "title", "place", "zone",
    "url", "booking_url",
    "summary", "duration", "price_from",
    "tags", "hero_image_src", "sitemap_exclude",
]


def export_experiences(output_dir: Path):
    src = CONTENT_DIR / "experiences"
    rows = []
    for fp in sorted(src.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"    WARN: {fp.name} — {e}")
            continue
        slug = data.get("slug", fp.stem)
        hero = data.get("heroImage") or {}
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "experience",
            "category": data.get("category", data.get("type", "")),
            "title": data.get("title", data.get("name", "")),
            "place": data.get("place", ""),
            "zone": data.get("zone", ""),
            "url": f"{BASE_URL}/explore/experiences/{slug}/",
            "booking_url": data.get("bookingUrl", ""),
            "summary": data.get("summary", data.get("description", data.get("signature", ""))),
            "duration": data.get("duration", ""),
            "price_from": data.get("priceFrom", data.get("price", "")),
            "tags": flatten_tags(data.get("tags", {})),
            "hero_image_src": hero.get("src", "") if isinstance(hero, dict) else "",
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "experiences.csv", EXP_FIELDS, rows)
    print(f"  experiences:   {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Places
# ---------------------------------------------------------------------------

PLACE_FIELDS = [
    "slug", "status_live", "content_type",
    "name", "zone", "region",
    "url", "summary", "tags", "sitemap_exclude",
]


def export_places(output_dir: Path):
    src = CONTENT_DIR / "places"
    rows = []
    for fp in sorted(src.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"    WARN: {fp.name} — {e}")
            continue
        slug = data.get("slug", fp.stem)
        rows.append({
            "slug": slug,
            "status_live": live_status(data),
            "content_type": "place",
            "name": data.get("name", ""),
            "zone": data.get("zone", ""),
            "region": data.get("region", ""),
            "url": f"{BASE_URL}/explore/places/{slug}/",
            "summary": data.get("summary", data.get("description", data.get("intro", ""))),
            "tags": flatten_tags(data.get("tags", {})),
            "sitemap_exclude": data.get("sitemapExclude", False),
        })
    _write_csv(output_dir / "places.csv", PLACE_FIELDS, rows)
    print(f"  places:        {len(rows)} rows")
    return rows


# ---------------------------------------------------------------------------
# Summary sheet
# ---------------------------------------------------------------------------

def write_summary(output_dir: Path, all_rows: dict):
    fields = ["collection", "total", "live", "staging", "draft", "featured", "with_hero"]
    rows = []
    for name, rows_list in all_rows.items():
        rows.append({
            "collection": name,
            "total": len(rows_list),
            "live": sum(1 for r in rows_list if r.get("status_live") == "live"),
            "staging": sum(1 for r in rows_list if r.get("status_live") == "staging"),
            "draft": sum(1 for r in rows_list if r.get("status_live") == "draft"),
            "featured": sum(1 for r in rows_list if r.get("featured") is True or r.get("featured") == "True"),
            "with_hero": sum(1 for r in rows_list if r.get("hero_image_src")),
        })
    _write_csv(output_dir / "summary.csv", fields, rows)
    print(f"  summary:       {len(rows)} collections")


# ---------------------------------------------------------------------------
# CSV writer
# ---------------------------------------------------------------------------

def _write_csv(path: Path, fields: list, rows: list):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Peninsula Insider content export")
    parser.add_argument("--collection", choices=["articles", "venues", "itineraries", "events", "experiences", "places", "all"], default="all")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Exporting to: {output_dir}\n")

    col = args.collection
    all_rows = {}

    if col in ("articles", "all"):
        all_rows["articles"] = export_articles(output_dir)
    if col in ("venues", "all"):
        all_rows["venues"] = export_venues(output_dir)
    if col in ("itineraries", "all"):
        all_rows["itineraries"] = export_itineraries(output_dir)
    if col in ("events", "all"):
        all_rows["events"] = export_events(output_dir)
    if col in ("experiences", "all"):
        all_rows["experiences"] = export_experiences(output_dir)
    if col in ("places", "all"):
        all_rows["places"] = export_places(output_dir)

    if col == "all":
        write_summary(output_dir, all_rows)

    print(f"\nDone. Files written to:\n  {output_dir}")


if __name__ == "__main__":
    main()
