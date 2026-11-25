"""
GSC Coverage Monitor: URL Inspection for the tracked pages.

Inspected set:
  - every KEEP_IMPROVE URL in ops/reports/seo-classification.csv
  - every page in the strategy attribution ledger (ops/strategy/actioned.jsonl),
    so an indexation fix can be re-measured by the learning loop instead of
    waiting forever on a page nobody inspects

Every URL is inspected in its canonical trailing-slash form. The site serves
trailing slashes only, so inspecting /eat reports on a redirect, not on the
page, and would read as "not indexed" whatever the real page's status.

Compares against the previous baseline to surface:
  - Newly indexed pages (NEUTRAL -> PASS)
  - Pages that regressed (PASS -> NEUTRAL/FAIL)

Produces:
  ops/data/gsc-coverage-baseline.json   updated baseline for next run (gitignored)
  ops/reports/gsc-coverage-report.md    summary, deltas and full status table

The report is one contract with engine/strategy_engine.py (the "Generated"
line, the "Indexed (PASS)" summary line and the "URL Inspection Results"
table). engine/test_strategy_engine.py builds a report with build_report() and
parses it back, because a report the engine could not read is how the strategy
came to print "Pages indexed by Google: 0" for months.

Failure behaviour: exits non-zero with a reason (see gsc_client) and leaves the
previous report in place when credentials are missing or every inspection
fails. A few failed inspections are reported in the table, not hidden.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gsc_client as gsc

BASELINE_FILE = gsc.DATA_DIR / "gsc-coverage-baseline.json"
REPORT_FILE   = gsc.REPORTS_DIR / "gsc-coverage-report.md"
ACTIONED_FILE = gsc.BASE / "ops" / "strategy" / "actioned.jsonl"
DELAY_S       = 0.2   # 300/min at most; the quota is 600/min and 2,000/day
FAIL_FAST_AFTER = 5   # stop when the opening inspections all fail the same way


def actioned_paths(ledger: Path | None = None) -> list[str]:
    """Site paths recorded in the strategy attribution ledger."""
    ledger = ledger or ACTIONED_FILE
    if not ledger.exists():
        return []
    paths = []
    for line in ledger.read_text(encoding="utf-8").splitlines():
        try:
            target = str(json.loads(line).get("target", ""))
        except (json.JSONDecodeError, AttributeError):
            continue
        if target.startswith("/") or target.startswith("http"):
            paths.append(gsc.norm_path(target))
    return paths


def inspection_urls(keep_improve: list[str], actioned: list[str]) -> list[str]:
    """Canonical URLs to inspect, de-duplicated, original order kept."""
    seen, urls = set(), []
    for candidate in list(keep_improve) + list(actioned):
        url = gsc.canonical_url(candidate)
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def inspect_url(service, url: str) -> dict:
    try:
        result = gsc.execute(
            service.urlInspection().index().inspect(body={
                "inspectionUrl": url,
                "siteUrl": gsc.SITE_URL,
                "languageCode": "en-AU",
            }),
            what="URL inspection",
        )
    except gsc.FeedError as e:
        if e.code == gsc.EXIT_AUTH_FAILED:
            raise  # every later call would fail the same way
        return {"url": url, "verdict": "ERROR", "coverage": f"inspection failed ({e.reason})",
                "crawl": "", "indexing": "", "robots": "", "error": str(e)}
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


def summarise(results: list[dict]) -> dict:
    return {
        "indexed": sum(1 for r in results if r["verdict"] == "PASS"),
        "not_indexed": sum(1 for r in results if r["verdict"] in ("NEUTRAL", "FAIL")),
        "errors": sum(1 for r in results if r["verdict"] in ("UNKNOWN", "ERROR")),
        "total": len(results),
    }


def build_report(results: list[dict], baseline: dict, generated: str) -> str:
    """The committed report. The "Generated" line, the "Indexed (PASS)" line and
    the "URL Inspection Results" table are parsed by the strategy engine."""
    counts = summarise(results)
    newly_indexed = [r for r in results if r["verdict"] == "PASS"
                     and baseline.get(r["url"], {}).get("verdict", "") not in ("", "PASS")]
    regressed = [r for r in results if r["verdict"] in ("FAIL", "NEUTRAL")
                 and baseline.get(r["url"], {}).get("verdict", "") == "PASS"]
    c = gsc.cell

    lines = [
        "# Peninsula Insider: Coverage Monitor",
        "",
        f"_Generated {generated}_",
        "",
        "## Summary",
        "",
        f"- Indexed (PASS): **{counts['indexed']}**",
        f"- Not indexed: **{counts['not_indexed']}**",
        f"- API errors: **{counts['errors']}**",
        f"- Total inspected: **{counts['total']}**",
    ]
    if baseline:
        prev_pass = sum(1 for v in baseline.values() if v.get("verdict") == "PASS")
        lines.append(f"- Indexed at the previous run: {prev_pass}")
    lines += [
        "",
        "Inspected set: KEEP_IMPROVE pages from the SEO classification plus every page",
        "in the strategy attribution ledger. This is a tracked sample, not a count of",
        "every page Google has indexed.",
    ]

    if newly_indexed:
        lines += ["", f"## Newly Indexed This Run ({len(newly_indexed)})", "",
                  "| URL | Last Crawl |", "|---|---|"]
        for r in newly_indexed:
            lines.append(f"| `{c(gsc.norm_path(r['url']))}` | {c(r['crawl'])} |")

    if regressed:
        lines += ["", f"## Regressions ({len(regressed)})", "",
                  "| URL | Current Status |", "|---|---|"]
        for r in regressed:
            lines.append(f"| `{c(gsc.norm_path(r['url']))}` | {c(r['coverage'])} |")

    lines += [
        "",
        "## URL Inspection Results",
        "",
        "| URL | Verdict | Coverage | Last Crawl |",
        "|---|---|---|---|",
    ]
    for r in sorted(results, key=lambda x: (x["verdict"] != "PASS", x["url"])):
        lines.append(
            f"| `{c(gsc.norm_path(r['url']))}` | {c(r['verdict'])} | {c(r['coverage'])} | {c(r['crawl'] or 'Never')} |"
        )
    return "\n".join(lines) + "\n"


def run(verbose: bool = True) -> dict:
    urls = inspection_urls(gsc.load_keep_improve_urls(), actioned_paths())
    service = gsc.get_service()
    gsc.ensure_output_dirs()

    baseline: dict[str, dict] = {}
    if BASELINE_FILE.exists():
        try:
            baseline = json.loads(BASELINE_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            baseline = {}

    print(f"Inspecting {len(urls)} URLs...")
    results = []
    for i, url in enumerate(urls, 1):
        r = inspect_url(service, url)
        results.append(r)
        if r["verdict"] == "ERROR" and len(results) == FAIL_FAST_AFTER \
                and all(x["verdict"] == "ERROR" for x in results):
            # The first calls all failed the same way (no access to the property,
            # API disabled, quota spent). The rest will too: stop, with the reason.
            raise gsc.FeedError(
                gsc.EXIT_API_ERROR,
                f"the first {FAIL_FAST_AFTER} URL inspections all failed ({r.get('error', r['coverage'])}); "
                "the previous report was left in place.",
            )
        if verbose:
            delta = ""
            prev = baseline.get(url, {}).get("verdict", "")
            if prev and prev != r["verdict"]:
                delta = f"  [{prev} -> {r['verdict']}]"
            print(f"  [{i:3d}/{len(urls)}] {gsc.norm_path(url):<55} {r['verdict']:<10}{delta}")
        if i < len(urls):
            time.sleep(DELAY_S)

    counts = summarise(results)
    if results and counts["errors"] == counts["total"]:
        # Nothing was learned. Writing this would replace real index data with
        # a table of errors and a count of zero indexed pages.
        raise gsc.FeedError(
            gsc.EXIT_API_ERROR,
            f"all {counts['total']} URL inspections failed ({results[0]['coverage']}); "
            "the previous report was left in place.",
        )

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    gsc.write_report(REPORT_FILE, build_report(results, baseline, generated))
    BASELINE_FILE.write_text(json.dumps({r["url"]: r for r in results}, indent=2), encoding="utf-8")
    print("  Report: ops/reports/gsc-coverage-report.md")

    newly = sum(1 for r in results if r["verdict"] == "PASS"
                and baseline.get(r["url"], {}).get("verdict", "") not in ("", "PASS"))
    regressed = sum(1 for r in results if r["verdict"] in ("FAIL", "NEUTRAL")
                    and baseline.get(r["url"], {}).get("verdict", "") == "PASS")
    print(f"\n  Indexed: {counts['indexed']}/{counts['total']}  |  New this run: {newly}"
          f"  |  Regressed: {regressed}  |  Errors: {counts['errors']}")
    return {
        "indexed": counts["indexed"],
        "not_indexed": counts["not_indexed"],
        "newly_indexed": newly,
        "regressed": regressed,
        "total": counts["total"],
    }


if __name__ == "__main__":
    gsc.run_cli(run)
