"""
GSC Search Analytics: pulls the last 28 days of page and query data.

Produces:
  ops/data/gsc-analytics-pages.json       raw page-level rows      (gitignored)
  ops/data/gsc-analytics-queries.json     raw query-level rows     (gitignored)
  ops/data/gsc-analytics-page-query.json  raw page+query rows      (gitignored)
  ops/reports/gsc-search-analytics.md     formatted analysis       (committed)

The report is the one contract with engine/strategy_engine.py, which parses it
by heading and column name. engine/test_strategy_engine.py builds a report with
build_report() and parses it back, so the two cannot drift apart unnoticed.

Analysis surfaces:
  - Property totals, from a query with no dimensions (what the Search Console
    UI shows; summing page rows over-counts)
  - Top pages by impressions (demand proxy when clicks are low)
  - Keyword gaps: queries at avg position 4-20 (near-miss, worth targeting),
    each with the page that actually ranks for it
  - CTR opportunities: pages with >=20 impressions but CTR < 2%
  - Every page with impressions, so an actioned page can be re-measured even
    when it is nowhere near the top 25

Failure behaviour: any credential, API or empty-result failure exits non-zero
with a reason (see gsc_client) and leaves the previous report in place. It never
writes an empty report over a good one.

Usage:
  python ops/scripts/gsc-search-analytics.py           pull and write the report
  python ops/scripts/gsc-search-analytics.py --check   authenticate, pull the
                                                       property totals, print
                                                       them, write nothing
"""

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gsc_client as gsc

WINDOW_DAYS = 28
DATA_LAG_DAYS = 3          # final Search Console data trails by about 3 days
GAP_MIN_POSITION = 4
GAP_MAX_POSITION = 20
GAP_MIN_IMPRESSIONS = 5
CTR_MIN_IMPRESSIONS = 20
CTR_MAX_PERCENT = 2.0
TOP_PAGES = 25
TOP_QUERIES = 30
TOP_GAPS = 30
TOP_CTR = 20
REPORT_FILE = gsc.REPORTS_DIR / "gsc-search-analytics.md"


def window(today: date) -> tuple[str, str]:
    end = today - timedelta(days=DATA_LAG_DAYS)
    start = end - timedelta(days=WINDOW_DAYS - 1)
    return start.isoformat(), end.isoformat()


def query_analytics(service, dimensions: list[str], start: str, end: str,
                    row_limit: int = 1000) -> list[dict]:
    """All rows for one dimension set. Raises gsc.FeedError on any API failure."""
    rows = []
    start_row = 0
    label = "+".join(dimensions) or "totals"
    while True:
        resp = gsc.execute(
            service.searchanalytics().query(
                siteUrl=gsc.SITE_URL,
                body={
                    "startDate": start,
                    "endDate": end,
                    "dimensions": dimensions,
                    "rowLimit": row_limit,
                    "startRow": start_row,
                },
            ),
            what=f"search analytics ({label})",
        )
        batch = resp.get("rows", [])
        rows.extend(batch)
        if len(batch) < row_limit:
            break
        start_row += row_limit
    return rows


# ── Pure analysis (no API, no clock): unit-tested from engine/ ───────────────
def aggregate_pages(page_rows: list[dict]) -> list[dict]:
    """One row per canonical path, most impressions first. Search Console lists
    http/https and slash/no-slash variants of one page as separate rows; left
    apart they split a page's demand and understate it everywhere downstream."""
    merged: dict[str, dict] = {}
    for r in page_rows:
        path = gsc.norm_path(r["keys"][0])
        impressions = r.get("impressions", 0)
        m = merged.setdefault(path, {"path": path, "clicks": 0, "impressions": 0, "_weighted": 0.0})
        m["clicks"] += r.get("clicks", 0)
        m["impressions"] += impressions
        m["_weighted"] += r.get("position", 0) * impressions
    pages = []
    for m in merged.values():
        impressions = m["impressions"]
        pages.append({
            "path": m["path"],
            "clicks": int(m["clicks"]),
            "impressions": int(impressions),
            "ctr": round(m["clicks"] / impressions * 100, 2) if impressions else 0.0,
            "position": round(m["_weighted"] / impressions, 1) if impressions else 0.0,
        })
    pages.sort(key=lambda p: (-p["impressions"], p["path"]))
    return pages


def landing_pages(page_query_rows: list[dict]) -> dict[str, str]:
    """query -> the canonical path earning most of its impressions."""
    best: dict[str, dict[str, int]] = {}
    for r in page_query_rows:
        keys = r.get("keys") or []
        if len(keys) < 2:
            continue
        path, query = gsc.norm_path(keys[0]), keys[1]
        per_query = best.setdefault(query, {})
        per_query[path] = per_query.get(path, 0) + r.get("impressions", 0)
    return {q: sorted(paths.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
            for q, paths in best.items()}


def property_totals(total_rows: list[dict], pages: list[dict]) -> dict:
    """Property totals from the no-dimension query. Falls back to summing the
    page rows (and says so) only if that query returned nothing."""
    if total_rows:
        r = total_rows[0]
        impressions = int(r.get("impressions", 0))
        clicks = int(r.get("clicks", 0))
        return {
            "clicks": clicks,
            "impressions": impressions,
            "ctr": round(clicks / impressions * 100, 2) if impressions else 0.0,
            "position": round(r.get("position", 0), 1),
            "basis": "property",
        }
    impressions = sum(p["impressions"] for p in pages)
    clicks = sum(p["clicks"] for p in pages)
    weighted = sum(p["position"] * p["impressions"] for p in pages)
    return {
        "clicks": clicks,
        "impressions": impressions,
        "ctr": round(clicks / impressions * 100, 2) if impressions else 0.0,
        "position": round(weighted / impressions, 1) if impressions else 0.0,
        "basis": "sum of page rows",
    }


def newest_data_day(date_rows: list[dict], fallback: str) -> str:
    """The latest day that actually has data. The requested end date is only a
    request: this is what the staleness guard downstream must be measured from."""
    days = sorted(r["keys"][0] for r in date_rows if r.get("keys") and r.get("impressions", 0) > 0)
    return days[-1] if days else fallback


def keyword_gaps(query_rows: list[dict]) -> list[dict]:
    gaps = [r for r in query_rows
            if GAP_MIN_POSITION <= r.get("position", 0) <= GAP_MAX_POSITION
            and r.get("impressions", 0) >= GAP_MIN_IMPRESSIONS]
    gaps.sort(key=lambda r: (-r.get("impressions", 0), r["keys"][0]))
    return gaps


def ctr_opportunities(pages: list[dict]) -> list[dict]:
    return [p for p in pages if p["impressions"] >= CTR_MIN_IMPRESSIONS and p["ctr"] < CTR_MAX_PERCENT]


def build_report(pages: list[dict], query_rows: list[dict], totals: dict,
                 landing: dict[str, str], start: str, end: str,
                 data_through: str, generated: str) -> str:
    """The committed report. Headings and column names are parsed by the
    strategy engine: change them only together with engine/strategy_engine.py."""
    gaps = keyword_gaps(query_rows)
    ctr_opps = ctr_opportunities(pages)
    top_queries = sorted(query_rows, key=lambda r: (-r.get("impressions", 0), r["keys"][0]))[:TOP_QUERIES]
    c = gsc.cell

    lines = [
        "# Peninsula Insider: Search Analytics",
        "",
        f"_Period: {start} to {end}_",
        f"_Data through: {data_through}_",
        f"_Generated: {generated}_",
        f"_Source: Search Console API, property {gsc.SITE_URL}, final data_",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Total clicks | {totals['clicks']:,} |",
        f"| Total impressions | {totals['impressions']:,} |",
        f"| CTR | {totals['ctr']}% |",
        f"| Pages with impressions | {len(pages)} |",
        f"| Avg position (imp-weighted) | {totals['position']:.1f} |",
        f"| Keyword gaps (pos 4–20) | {len(gaps)} |",
        f"| CTR opportunities | {len(ctr_opps)} |",
        f"| Totals basis | {totals['basis']} |",
        "",
        "## Top Pages by Impressions",
        "",
        "| Page | Impressions | Clicks | CTR | Avg Pos |",
        "|---|---|---|---|---|",
    ]
    for p in pages[:TOP_PAGES]:
        lines.append(f"| `{c(p['path'])}` | {p['impressions']:,} | {p['clicks']} | {p['ctr']}% | {p['position']} |")

    lines += [
        "",
        "## Top Queries",
        "",
        "| Query | Impressions | Clicks | CTR | Avg Pos |",
        "|---|---|---|---|---|",
    ]
    for r in top_queries:
        lines.append(
            f"| {c(r['keys'][0])} | {r.get('impressions', 0):,} | {r.get('clicks', 0)} "
            f"| {round(r.get('ctr', 0) * 100, 2)}% | {round(r.get('position', 0), 1)} |"
        )

    if gaps:
        lines += [
            "",
            "## Keyword Gaps (Position 4–20, ≥5 impressions)",
            "",
            "Queries where we're near-ranking. Small content improvements could push them to page 1.",
            "",
            "| Query | Impressions | Avg Pos | Clicks | Top page |",
            "|---|---|---|---|---|",
        ]
        for r in gaps[:TOP_GAPS]:
            q = r["keys"][0]
            page = landing.get(q, "")
            lines.append(
                f"| {c(q)} | {r.get('impressions', 0):,} | {round(r.get('position', 0), 1)} "
                f"| {r.get('clicks', 0)} | {'`' + c(page) + '`' if page else 'unknown'} |"
            )

    if ctr_opps:
        lines += [
            "",
            "## CTR Opportunities (≥20 impressions, <2% CTR)",
            "",
            "Pages Google is surfacing but users aren't clicking: a title or description problem.",
            "",
            "| Page | Impressions | CTR | Avg Pos |",
            "|---|---|---|---|",
        ]
        for p in ctr_opps[:TOP_CTR]:
            lines.append(f"| `{c(p['path'])}` | {p['impressions']:,} | {p['ctr']}% | {p['position']} |")

    lines += [
        "",
        "## All Pages With Impressions",
        "",
        "Every page Google showed in the period, URL variants merged. Complete, so a",
        "page missing from this table had no impressions.",
        "",
        "| Page | Impressions | Clicks | CTR | Avg Pos |",
        "|---|---|---|---|---|",
    ]
    for p in pages:
        lines.append(f"| `{c(p['path'])}` | {p['impressions']:,} | {p['clicks']} | {p['ctr']}% | {p['position']} |")

    return "\n".join(lines) + "\n"


# ── Runner ───────────────────────────────────────────────────────────────────
def check() -> dict:
    """Prove the credentials work: authenticate and pull the property totals.
    Writes nothing."""
    start, end = window(date.today())
    print(f"Search Analytics check: {start} to {end}")
    service = gsc.get_service()
    rows = query_analytics(service, [], start, end)
    if not rows:
        raise gsc.FeedError(
            gsc.EXIT_NO_DATA,
            f"authenticated, but {gsc.SITE_URL} returned no rows for {start} to {end}. "
            "Check the token's Google account can see the property.",
        )
    totals = property_totals(rows, [])
    print(f"  OK: {totals['impressions']:,} impressions, {totals['clicks']:,} clicks, "
          f"avg position {totals['position']} ({start} to {end})")
    return totals


def run() -> dict:
    start_str, end_str = window(date.today())

    print(f"Search Analytics: {start_str} to {end_str}")
    service = gsc.get_service()
    gsc.ensure_output_dirs()

    print("  Pulling property totals...")
    total_rows = query_analytics(service, [], start_str, end_str)
    date_rows = query_analytics(service, ["date"], start_str, end_str)

    print("  Pulling page-level data...")
    page_rows = query_analytics(service, ["page"], start_str, end_str)
    print(f"  {len(page_rows)} page rows found")

    if not page_rows:
        # An authorised but empty answer is far more likely a wrong property or
        # account than a site with no impressions. Keep the last good report.
        raise gsc.FeedError(
            gsc.EXIT_NO_DATA,
            f"{gsc.SITE_URL} returned no page rows for {start_str} to {end_str}; "
            "the previous report was left in place.",
        )

    print("  Pulling query-level data...")
    query_rows = query_analytics(service, ["query"], start_str, end_str)
    print(f"  {len(query_rows)} queries found")

    print("  Pulling page+query mapping...")
    pq_rows = query_analytics(service, ["page", "query"], start_str, end_str)
    print(f"  {len(pq_rows)} page+query combinations found")

    for name, rows in (("gsc-analytics-pages.json", page_rows),
                       ("gsc-analytics-queries.json", query_rows),
                       ("gsc-analytics-page-query.json", pq_rows)):
        gsc.DATA_DIR.joinpath(name).write_text(json.dumps(rows, indent=2), encoding="utf-8")

    pages = aggregate_pages(page_rows)
    totals = property_totals(total_rows, pages)
    data_through = newest_data_day(date_rows, end_str)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    report = build_report(pages, query_rows, totals, landing_pages(pq_rows),
                          start_str, end_str, data_through, generated)
    gsc.write_report(REPORT_FILE, report)
    print(f"\n  Report: ops/reports/gsc-search-analytics.md (data through {data_through})")
    return {"pages": len(pages), "queries": len(query_rows), "gaps": len(keyword_gaps(query_rows))}


def main() -> None:
    parser = argparse.ArgumentParser(description="Pull Search Console search analytics")
    parser.add_argument("--check", action="store_true",
                        help="authenticate and print the property totals; write nothing")
    args = parser.parse_args()
    if args.check:
        check()
        return
    result = run()
    print(f"\nDone: {result}")


if __name__ == "__main__":
    gsc.run_cli(main)
