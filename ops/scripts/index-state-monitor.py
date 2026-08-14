#!/usr/bin/env python3
"""
index-state-monitor.py — standing crawl/index-state instrument for Peninsula Insider.

Why this exists
---------------
Through August 2026 every claim about crawl state came from inspecting a handful of
URLs by hand, inconsistently, and comparing against memory. That produced at least
three wrong calls (the /places/ stub misdiagnosis, the "five town pages have zero
inbound links" error, and two consecutive misreads of impression movement). GSC's
own sitemap "indexed" count is a lagging metric and has been correctly ignored —
but nothing replaced it, so there was no instrument telling us what is actually
indexed or how often each page gets fetched.

This sweeps a FIXED panel of URLs through the URL Inspection API and commits the
result as JSON. Run weekly. Because the panel is fixed and the output is committed,
crawl frequency per page becomes a diffable trend rather than a spot sample — and
crawl frequency is the metric that actually predicts recovery on this site.

Usage
-----
  python3 ops/scripts/index-state-monitor.py                 # sweep + write snapshot
  python3 ops/scripts/index-state-monitor.py --diff          # also diff vs previous
  python3 ops/scripts/index-state-monitor.py --panel-only    # print the panel, no API

Output: ops/reports/seo/index-monitor-YYYY-MM-DD.json

Auth: reuses the GSC OAuth refresh token at
/home/node/.openclaw/credentials/gsc/application_default_credentials.json
(scope webmasters.readonly is sufficient — inspection is a read).

NOTE ON WHAT THIS CANNOT DO: there is no public API for "Request Indexing".
Google's Indexing API only accepts JobPosting and BroadcastEvent. Forcing a
recrawl of ordinary pages is a manual action in the Search Console UI. This
script measures; it cannot submit.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

CREDS = Path("/home/node/.openclaw/credentials/gsc/application_default_credentials.json")
# The GSC property is a DOMAIN property. Passing the https:// prefix form here
# returns 403 for every URL — the property simply does not exist under that key.
SITE_PROPERTY = "sc-domain:peninsulainsider.com.au"
SITE_URL = "https://peninsulainsider.com.au/"  # used to build inspectionUrl only
REPORT_DIR = Path(__file__).resolve().parents[1] / "reports" / "seo"
INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"

# ---------------------------------------------------------------------------
# The panel. Fixed on purpose — changing it breaks the trend.
# Grouped so a diff can be read by intent, not just by URL.
# ---------------------------------------------------------------------------
PANEL: dict[str, list[str]] = {
    # The pages the whole recovery argument rests on: high volume, unfetched.
    "never_crawled_towns": [
        "/explore/places/mount-eliza/",
        "/explore/places/mount-martha/",
        "/explore/places/hastings/",
    ],
    # Legacy stubs still holding ranking equity, highest search volume first.
    "legacy_town_stubs": [
        "/places/mornington/",
        "/places/sorrento/",
        "/places/mount-martha/",
        "/places/mount-eliza/",
        "/places/red-hill/",
        "/places/rosebud/",
        "/places/hastings/",
        "/places/rye/",
        "/places/dromana/",
        "/places/arthurs-seat/",
    ],
    # Canonical town pages for the same towns — the URLs that should be winning.
    "canonical_towns": [
        "/explore/places/mornington/",
        "/explore/places/sorrento/",
        "/explore/places/red-hill/",
        "/explore/places/rosebud/",
        "/explore/places/rye/",
        "/explore/places/dromana/",
    ],
    # Commercial hubs. /boating/ is the long-stale control.
    "commercial_hubs": [
        "/",
        "/boating/",
        "/eat/",
        "/eat/best-restaurants/",
        "/stay/best-accommodation/",
        "/wine/best-cellar-doors/",
        "/explore/hot-springs/",
        "/spa/",
        "/explore/walks/",
        "/explore/things-to-do/",
        "/whats-on/",
        "/plans/",
    ],
    # URLs collapsed to stubs on 15 Aug. Watching these confirms the
    # consolidation is being seen, and that we did not deindex something live.
    "phase0_consolidated": [
        "/eat/montalto/",
        "/eat/pt-leo-estate/",
        "/wine/cellar-doors/",
        "/wine/best-wineries-mornington-peninsula/",
        "/stay/where-to-stay-mornington-peninsula/",
        "/explore/plans/",
        "/explore/best-walks/",
    ],
    # Pages ranking in the top 10 — the controls. If these degrade, something
    # in the consolidation went wrong and we need to know which week.
    "ranking_controls": [
        "/dispatch/",
        "/explore/plans/the-birthday-weekend/",
        "/explore/mount-martha-beach/",
        "/eat/moorooduc-estate/",
    ],
}

FIELDS = (
    "coverageState",
    "indexingState",
    "lastCrawlTime",
    "googleCanonical",
    "userCanonical",
    "robotsTxtState",
    "pageFetchState",
    "crawledAs",
)


def access_token() -> str:
    if not CREDS.exists():
        sys.exit(f"GSC credentials not found at {CREDS}")
    c = json.loads(CREDS.read_text())
    body = urllib.parse.urlencode(
        {
            "client_id": c["client_id"],
            "client_secret": c["client_secret"],
            "refresh_token": c["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode()
    req = urllib.request.Request(
        c.get("token_uri", "https://oauth2.googleapis.com/token"),
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "curl/8.5.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["access_token"]


def inspect(token: str, path: str) -> dict:
    payload = json.dumps(
        {
            "inspectionUrl": urllib.parse.urljoin(SITE_URL, path),
            "siteUrl": SITE_PROPERTY,
            "languageCode": "en-AU",
        }
    ).encode()
    req = urllib.request.Request(
        INSPECT_ENDPOINT,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            result = json.load(r)
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:200]}"}
    except Exception as e:  # noqa: BLE001 - report, never abort the sweep
        return {"error": str(e)}
    idx = result.get("inspectionResult", {}).get("indexStatusResult", {})
    return {k: idx.get(k) for k in FIELDS}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--diff", action="store_true", help="diff against the previous snapshot")
    ap.add_argument("--panel-only", action="store_true", help="print panel and exit")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    flat = [(g, p) for g, paths in PANEL.items() for p in paths]
    if args.panel_only:
        for g, p in flat:
            print(f"{g:24} {urllib.parse.urljoin(SITE_URL, p)}")
        print(f"\n{len(flat)} URLs")
        return

    token = access_token()
    snapshot: dict = {"date": date.today().isoformat(), "site": SITE_PROPERTY, "urls": {}}
    for group, path in flat:
        row = inspect(token, path)
        row["group"] = group
        snapshot["urls"][path] = row
        state = row.get("error") or row.get("coverageState") or "?"
        crawled = (row.get("lastCrawlTime") or "never")[:10]
        print(f"  {path:52} {state[:44]:46} {crawled}")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = Path(args.out) if args.out else REPORT_DIR / f"index-monitor-{snapshot['date']}.json"
    out.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"\nSnapshot -> {out}")

    if args.diff:
        prior = sorted(
            p for p in REPORT_DIR.glob("index-monitor-*.json") if p.name != out.name
        )
        if not prior:
            print("No previous snapshot to diff against.")
            return
        prev = json.loads(prior[-1].read_text())
        print(f"\nDiff vs {prior[-1].name}:")
        changed = 0
        for path, now in snapshot["urls"].items():
            was = prev.get("urls", {}).get(path)
            if not was:
                print(f"  NEW      {path}")
                changed += 1
                continue
            for field in ("coverageState", "lastCrawlTime", "googleCanonical"):
                if now.get(field) != was.get(field):
                    print(f"  {field:16} {path}\n      {was.get(field)} -> {now.get(field)}")
                    changed += 1
        if not changed:
            print("  no change in coverageState, lastCrawlTime or googleCanonical")


if __name__ == "__main__":
    main()
