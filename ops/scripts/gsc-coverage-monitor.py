"""
GSC Coverage Monitor — inspects all 126 KEEP_IMPROVE URLs.

Compares against previous baseline to surface:
  - Newly indexed pages (NEUTRAL → PASS)
  - Pages that regressed (PASS → NEUTRAL/FAIL)
  - Pages newly discovered by Google

Produces:
  ops/data/gsc-coverage-baseline.json   updated baseline for next run
  ops/reports/gsc-coverage-report.md    full status table + delta summary
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gsc_client as gsc

from googleapiclient.errors import HttpError

BASELINE_FILE = gsc.DATA_DIR / "gsc-coverage-baseline.json"
REPORT_FILE   = gsc.REPORTS_DIR / "gsc-coverage-report.md"
DELAY_S       = 0.6   # stay well under 2000/day rate limit


def inspect_url(service, url: str) -> dict:
    try:
        result = service.urlInspection().index().inspect(body={
            "inspectionUrl": url,
            "siteUrl": gsc.SITE_URL,
            "languageCode": "en-AU",
        }).execute()
        isr = result.get("inspectionResult", {}).get("indexStatusResult", {})
        crawl = isr.get("lastCrawlTime", "")
        if crawl and "T" in crawl:
            crawl = crawl.split("T")[0]
        return {
            "url":      url,
            "verdict":  isr.get("verdict", "UNKNOWN"),
            "coverage": isr.get("coverageState", "Unknown"),
            "crawl":    crawl or "Never",
            "indexing": isr.get("indexingState", "Unknown"),
            "robots":   isr.get("robotsTxtState", "Unknown"),
        }
    except HttpError as e:
        return {"url": url, "verdict": "ERROR", "coverage": str(e), "crawl": "", "indexing": "", "robots": ""}


def run(verbose: bool = True) -> dict:
    urls    = gsc.load_keep_improve_urls()
    service = gsc.get_service()

    # Load previous baseline
    baseline: dict[str, dict] = {}
    if BASELINE_FILE.exists():
        baseline = json.loads(BASELINE_FILE.read_text(encoding="utf-8"))

    print(f"Inspecting {len(urls)} KEEP_IMPROVE URLs...")
    results = []
    for i, url in enumerate(urls, 1):
        r = inspect_url(service, url)
        results.append(r)
        if verbose:
            delta = ""
            prev = baseline.get(url, {}).get("verdict", "")
            if prev and prev != r["verdict"]:
                delta = f"  [{prev} -> {r['verdict']}]"
            print(f"  [{i:3d}/{len(urls)}] {gsc.slug(url):<55} {r['verdict']:<10}{delta}")
        if i < len(urls):
            time.sleep(DELAY_S)

    # Build new baseline
    new_baseline = {r["url"]: r for r in results}
    BASELINE_FILE.write_text(json.dumps(new_baseline, indent=2), encoding="utf-8")

    # Compute deltas
    newly_indexed  = [r for r in results if r["verdict"] == "PASS"
                      and baseline.get(r["url"], {}).get("verdict", "") != "PASS"]
    regressed      = [r for r in results if r["verdict"] in ("FAIL", "NEUTRAL")
                      and baseline.get(r["url"], {}).get("verdict", "") == "PASS"]
    now_discovered = [r for r in results if "currently not indexed" in r["coverage"]
                      and baseline.get(r["url"], {}).get("verdict", "") == "UNKNOWN"]

    total_pass    = sum(1 for r in results if r["verdict"] == "PASS")
    total_neutral = sum(1 for r in results if r["verdict"] == "NEUTRAL")
    total_unknown = sum(1 for r in results if r["verdict"] in ("UNKNOWN", "ERROR"))

    write_report(results, baseline, newly_indexed, regressed, now_discovered,
                 total_pass, total_neutral, total_unknown)

    summary = {
        "indexed": total_pass,
        "not_indexed": total_neutral,
        "newly_indexed": len(newly_indexed),
        "regressed": len(regressed),
        "total": len(results),
    }
    print(f"\n  Indexed: {total_pass}/{len(results)}  |  New this run: {len(newly_indexed)}  |  Regressed: {len(regressed)}")
    return summary


def write_report(results, baseline, newly_indexed, regressed, now_discovered,
                 total_pass, total_neutral, total_unknown):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    prev_pass = sum(1 for v in baseline.values() if v.get("verdict") == "PASS")
    lines = [
        f"# Peninsula Insider — Coverage Monitor",
        f"",
        f"_Run {now}_",
        f"",
        f"## Summary",
        f"",
        f"| Metric | This run | Previous |",
        f"|---|---|---|",
        f"| Indexed (PASS) | **{total_pass}** | {prev_pass if baseline else '—'} |",
        f"| Not indexed | {total_neutral} | — |",
        f"| Unknown/Error | {total_unknown} | — |",
        f"| Total inspected | {len(results)} | — |",
    ]

    if newly_indexed:
        lines += [
            f"",
            f"## Newly Indexed This Run ({len(newly_indexed)})",
            f"",
            f"| URL | Last Crawl |",
            f"|---|---|",
        ]
        for r in newly_indexed:
            lines.append(f"| `{gsc.slug(r['url'])}` | {r['crawl']} |")

    if regressed:
        lines += [
            f"",
            f"## Regressions ({len(regressed)})",
            f"",
            f"| URL | Current Status |",
            f"|---|---|",
        ]
        for r in regressed:
            lines.append(f"| `{gsc.slug(r['url'])}` | {r['coverage']} |")

    lines += [
        f"",
        f"## Full Status",
        f"",
        f"| URL | Verdict | Coverage | Last Crawl |",
        f"|---|---|---|---|",
    ]
    for r in sorted(results, key=lambda x: (x["verdict"] != "PASS", x["url"])):
        lines.append(
            f"| `{gsc.slug(r['url'])}` | {r['verdict']} | {r['coverage']} | {r['crawl']} |"
        )

    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  Report: ops/reports/gsc-coverage-report.md")


if __name__ == "__main__":
    run()
