"""
Peninsula Insider — GSC Indexing Report & Sitemap Submission

Actions:
  1. OAuth2 desktop auth (browser popup on first run, token cached in ops/tokens/)
  2. Submit/refresh the corrected sitemap
  3. Inspect all KEEP_IMPROVE URLs via URL Inspection API
  4. Write a coverage report to ops/reports/gsc-coverage-report.md

Usage:
  py ops/scripts/gsc-index-report.py [--inspect-only] [--sitemap-only]

Requirements:
  pip install google-auth-oauthlib google-api-python-client
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE         = Path(__file__).resolve().parents[2]
CLIENT_FILE  = BASE / "ops" / "config" / "gsc-client-secret.json"
TOKEN_FILE   = BASE / "ops" / "tokens" / "gsc-token.json"
REPORT_FILE  = BASE / "ops" / "reports" / "gsc-coverage-report.md"
CSV_FILE     = BASE / "ops" / "reports" / "seo-classification.csv"

TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────
SITE_URL    = "sc-domain:peninsulainsider.com.au"   # domain property format
SITEMAP_URL = "https://peninsulainsider.com.au/sitemap.xml"

SCOPES = [
    "https://www.googleapis.com/auth/webmasters",           # sitemap submit
    "https://www.googleapis.com/auth/webmasters.readonly",  # inspection
]

# Top KEEP_IMPROVE URLs to inspect (ordered by word count from classification)
TOP_URLS = [
    "https://peninsulainsider.com.au/explore",
    "https://peninsulainsider.com.au/places",
    "https://peninsulainsider.com.au/eat",
    "https://peninsulainsider.com.au/journal",
    "https://peninsulainsider.com.au/wine",
    "https://peninsulainsider.com.au/places/cape-schanck",
    "https://peninsulainsider.com.au/journal/the-producer-trail",
    "https://peninsulainsider.com.au/journal/the-birthday-weekend",
    "https://peninsulainsider.com.au/journal/the-sorrento-weekend",
    "https://peninsulainsider.com.au/journal/the-easter-peninsula",
    "https://peninsulainsider.com.au/journal/first-time-peninsula",
    "https://peninsulainsider.com.au/journal/the-peninsula-beach-swimming-guide",
    "https://peninsulainsider.com.au/journal/the-dog-friendly-peninsula",
    "https://peninsulainsider.com.au/journal/a-winter-peninsula-weekend",
    "https://peninsulainsider.com.au/journal/the-spring-peninsula",
    "https://peninsulainsider.com.au/journal/the-market-saturday",
    "https://peninsulainsider.com.au/journal/the-four-hour-peninsula",
    "https://peninsulainsider.com.au/journal/the-peninsula-picnic",
    "https://peninsulainsider.com.au/eat/best-restaurants",
    "https://peninsulainsider.com.au/wine/best-cellar-doors",
    "https://peninsulainsider.com.au/explore/best-walks",
    "https://peninsulainsider.com.au/places/mornington",
    "https://peninsulainsider.com.au/places/sorrento",
    "https://peninsulainsider.com.au/places/dromana",
    "https://peninsulainsider.com.au/stay",
    "https://peninsulainsider.com.au/escape",
]


# ── Auth ──────────────────────────────────────────────────────────────────────
def get_credentials() -> Credentials:
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing OAuth token...")
            creds.refresh(Request())
        else:
            if not CLIENT_FILE.exists():
                sys.exit(f"Client secret not found: {CLIENT_FILE}")
            print("Opening browser for Google OAuth authorisation...")
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
        print(f"Token saved to {TOKEN_FILE.relative_to(BASE)}")
    return creds


# ── Sitemap ───────────────────────────────────────────────────────────────────
def submit_sitemap(service) -> dict:
    print(f"\nSubmitting sitemap: {SITEMAP_URL}")
    try:
        # Delete old stale sitemap entries first (the broken V2 one if present)
        try:
            sitemaps = service.sitemaps().list(siteUrl=SITE_URL).execute()
            for sm in sitemaps.get("sitemap", []):
                path = sm.get("path", "")
                if "V2" in path or "peninsularinsider" in path:
                    print(f"  Deleting stale sitemap: {path}")
                    service.sitemaps().delete(siteUrl=SITE_URL, feedpath=path).execute()
        except HttpError:
            pass  # old sitemaps may not exist

        service.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
        print(f"  Submitted OK")
        return {"status": "submitted", "url": SITEMAP_URL}
    except HttpError as e:
        msg = str(e)
        print(f"  Error: {msg}")
        return {"status": "error", "error": msg}


# ── URL Inspection ────────────────────────────────────────────────────────────
def inspect_url(sc_service, url: str) -> dict:
    try:
        result = sc_service.urlInspection().index().inspect(body={
            "inspectionUrl": url,
            "siteUrl": SITE_URL,
            "languageCode": "en-AU",
        }).execute()

        isr = result.get("inspectionResult", {}).get("indexStatusResult", {})
        return {
            "url": url,
            "coverage":      isr.get("coverageState", "Unknown"),
            "indexing":      isr.get("indexingState", "Unknown"),
            "robots_txt":    isr.get("robotsTxtState", "Unknown"),
            "last_crawl":    isr.get("lastCrawlTime", "Never"),
            "crawled_as":    isr.get("crawledAs", "—"),
            "verdict":       isr.get("verdict", "Unknown"),
        }
    except HttpError as e:
        return {"url": url, "coverage": f"API error: {e}", "verdict": "ERROR"}


# ── Report ────────────────────────────────────────────────────────────────────
def write_report(sitemap_result: dict, inspections: list[dict]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Peninsula Insider — GSC Coverage Report",
        f"",
        f"_Generated {now}_",
        f"",
        f"## Sitemap Submission",
        f"",
        f"| Field | Value |",
        f"|---|---|",
        f"| URL | `{SITEMAP_URL}` |",
        f"| Status | {sitemap_result.get('status', '—')} |",
    ]
    if "error" in sitemap_result:
        lines.append(f"| Error | {sitemap_result['error']} |")

    lines += [
        f"",
        f"## URL Inspection Results",
        f"",
        f"| URL | Verdict | Coverage | Last Crawl |",
        f"|---|---|---|---|",
    ]

    for r in inspections:
        slug = r["url"].replace("https://peninsulainsider.com.au", "") or "/"
        verdict  = r.get("verdict", "—")
        coverage = r.get("coverage", "—")
        crawl    = r.get("last_crawl", "—")
        if crawl and crawl != "Never" and "T" in crawl:
            crawl = crawl.split("T")[0]
        lines.append(f"| `{slug}` | {verdict} | {coverage} | {crawl} |")

    # Summary
    verdicts = [r.get("verdict", "") for r in inspections]
    indexed   = sum(1 for v in verdicts if v == "PASS")
    not_indexed = sum(1 for v in verdicts if v in ("FAIL", "NEUTRAL"))
    errors    = sum(1 for v in verdicts if v == "ERROR")

    lines += [
        f"",
        f"## Summary",
        f"",
        f"- Indexed (PASS): **{indexed}**",
        f"- Not indexed: **{not_indexed}**",
        f"- API errors: **{errors}**",
        f"- Total inspected: **{len(inspections)}**",
        f"",
        f"### Next actions",
        f"",
        f"Pages with verdict FAIL or NEUTRAL and no robots/noindex block:",
        f"→ Use GSC URL Inspection → 'Request Indexing' for each.",
        f"→ Prioritise journal/ and explore/ pages with 1000w+ content.",
    ]

    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nReport written: ops/reports/gsc-coverage-report.md")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--sitemap-only", action="store_true")
    args = parser.parse_args()

    creds   = get_credentials()
    service = build("searchconsole", "v1", credentials=creds)

    sitemap_result = {}
    if not args.inspect_only:
        sitemap_result = submit_sitemap(service)

    inspections = []
    if not args.sitemap_only:
        print(f"\nInspecting {len(TOP_URLS)} URLs via URL Inspection API...")
        print("(Rate limit: ~2 000 req/day — inserting 0.5s delay between calls)\n")
        for i, url in enumerate(TOP_URLS, 1):
            slug = url.replace("https://peninsulainsider.com.au", "") or "/"
            result = inspect_url(service, url)
            verdict = result.get("verdict", "?")
            coverage = result.get("coverage", "?")
            print(f"  [{i:2d}/{len(TOP_URLS)}] {slug:<55} {verdict:<10} {coverage}")
            inspections.append(result)
            if i < len(TOP_URLS):
                time.sleep(0.5)

    write_report(sitemap_result, inspections)


if __name__ == "__main__":
    main()
