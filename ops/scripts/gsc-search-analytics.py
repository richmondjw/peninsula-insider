"""
GSC Search Analytics — pulls last 28 days of page and query data.

Produces:
  ops/data/gsc-analytics-pages.json    raw page-level rows
  ops/data/gsc-analytics-queries.json  raw query-level rows
  ops/reports/gsc-search-analytics.md  formatted analysis

Analysis surfaces:
  - Top pages by impressions (demand proxy when clicks are low)
  - Keyword gaps: queries at avg position 4-20 (near-miss, worth targeting)
  - CTR opportunities: pages with >20 impressions but CTR < 2%
  - Query-to-page mapping for KEEP_IMPROVE pages
"""

import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gsc_client as gsc

from googleapiclient.errors import HttpError


def query_analytics(service, dimensions: list[str], start: str, end: str,
                    row_limit: int = 1000) -> list[dict]:
    rows = []
    start_row = 0
    while True:
        try:
            resp = service.searchanalytics().query(
                siteUrl=gsc.SITE_URL,
                body={
                    "startDate": start,
                    "endDate": end,
                    "dimensions": dimensions,
                    "rowLimit": row_limit,
                    "startRow": start_row,
                },
            ).execute()
        except HttpError as e:
            print(f"  API error: {e}")
            break
        batch = resp.get("rows", [])
        rows.extend(batch)
        if len(batch) < row_limit:
            break
        start_row += row_limit
    return rows


def run():
    end_date   = date.today() - timedelta(days=3)   # GSC has ~3-day lag
    start_date = end_date - timedelta(days=27)       # 28 days
    start_str  = start_date.isoformat()
    end_str    = end_date.isoformat()

    print(f"Search Analytics: {start_str} to {end_str}")
    service = gsc.get_service()

    # ── Page-level data ───────────────────────────────────────────────────────
    print("  Pulling page-level data...")
    page_rows = query_analytics(service, ["page"], start_str, end_str)
    gsc.DATA_DIR.joinpath("gsc-analytics-pages.json").write_text(
        json.dumps(page_rows, indent=2), encoding="utf-8"
    )
    print(f"  {len(page_rows)} pages found")

    # ── Query-level data ──────────────────────────────────────────────────────
    print("  Pulling query-level data...")
    query_rows = query_analytics(service, ["query"], start_str, end_str)
    gsc.DATA_DIR.joinpath("gsc-analytics-queries.json").write_text(
        json.dumps(query_rows, indent=2), encoding="utf-8"
    )
    print(f"  {len(query_rows)} queries found")

    # ── Page+Query mapping ────────────────────────────────────────────────────
    print("  Pulling page+query mapping...")
    pq_rows = query_analytics(service, ["page", "query"], start_str, end_str)
    gsc.DATA_DIR.joinpath("gsc-analytics-page-query.json").write_text(
        json.dumps(pq_rows, indent=2), encoding="utf-8"
    )
    print(f"  {len(pq_rows)} page+query combinations found")

    # ── Analysis ──────────────────────────────────────────────────────────────
    keep_improve = set(gsc.load_keep_improve_urls())

    # Page-level enriched
    pages = []
    for r in page_rows:
        url = r["keys"][0]
        pages.append({
            "url":         url,
            "slug":        gsc.slug(url),
            "clicks":      r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr":         round(r.get("ctr", 0) * 100, 2),
            "position":    round(r.get("position", 0), 1),
            "keep":        url in keep_improve,
        })
    pages.sort(key=lambda x: x["impressions"], reverse=True)

    # Keyword gaps: queries at position 4-20 (near miss)
    gaps = [
        r for r in query_rows
        if 4 <= r.get("position", 0) <= 20 and r.get("impressions", 0) >= 5
    ]
    gaps.sort(key=lambda x: x["impressions"], reverse=True)

    # CTR opportunities: >20 impressions, <2% CTR
    ctr_opps = [
        p for p in pages
        if p["impressions"] >= 20 and p["ctr"] < 2.0
    ]

    # Top queries overall
    top_queries = sorted(query_rows, key=lambda x: x.get("impressions", 0), reverse=True)[:30]

    # ── Report ────────────────────────────────────────────────────────────────
    write_report(pages, gaps, ctr_opps, top_queries, start_str, end_str)
    return {"pages": len(pages), "queries": len(query_rows), "gaps": len(gaps)}


def write_report(pages, gaps, ctr_opps, top_queries, start_str, end_str):
    lines = [
        f"# Peninsula Insider — Search Analytics",
        f"",
        f"_Period: {start_str} → {end_str}_",
        f"",
    ]

    total_clicks      = sum(p["clicks"] for p in pages)
    total_impressions = sum(p["impressions"] for p in pages)
    avg_position      = (
        sum(p["position"] * p["impressions"] for p in pages if p["impressions"])
        / max(sum(p["impressions"] for p in pages if p["impressions"]), 1)
    )

    lines += [
        f"## Summary",
        f"",
        f"| Metric | Value |",
        f"|---|---|",
        f"| Total clicks | {total_clicks:,} |",
        f"| Total impressions | {total_impressions:,} |",
        f"| Pages with impressions | {len(pages)} |",
        f"| Avg position (imp-weighted) | {avg_position:.1f} |",
        f"| Keyword gaps (pos 4–20) | {len(gaps)} |",
        f"| CTR opportunities | {len(ctr_opps)} |",
        f"",
    ]

    lines += [
        f"## Top Pages by Impressions",
        f"",
        f"| Page | Impressions | Clicks | CTR | Avg Pos | In sitemap |",
        f"|---|---|---|---|---|---|",
    ]
    for p in pages[:25]:
        keep = "Yes" if p["keep"] else "—"
        lines.append(
            f"| `{p['slug']}` | {p['impressions']:,} | {p['clicks']} | {p['ctr']}% | {p['position']} | {keep} |"
        )

    lines += [
        f"",
        f"## Top Queries",
        f"",
        f"| Query | Impressions | Clicks | CTR | Avg Pos |",
        f"|---|---|---|---|---|",
    ]
    for r in top_queries:
        q   = r["keys"][0]
        imp = r.get("impressions", 0)
        clk = r.get("clicks", 0)
        ctr = round(r.get("ctr", 0) * 100, 2)
        pos = round(r.get("position", 0), 1)
        lines.append(f"| {q} | {imp:,} | {clk} | {ctr}% | {pos} |")

    if gaps:
        lines += [
            f"",
            f"## Keyword Gaps (Position 4–20, ≥5 impressions)",
            f"",
            f"Queries where we're near-ranking — small content improvements could push to page 1.",
            f"",
            f"| Query | Impressions | Avg Pos | Clicks |",
            f"|---|---|---|---|",
        ]
        for r in gaps[:30]:
            q   = r["keys"][0]
            imp = r.get("impressions", 0)
            pos = round(r.get("position", 0), 1)
            clk = r.get("clicks", 0)
            lines.append(f"| {q} | {imp:,} | {pos} | {clk} |")

    if ctr_opps:
        lines += [
            f"",
            f"## CTR Opportunities (≥20 impressions, <2% CTR)",
            f"",
            f"Pages Google is surfacing but users aren't clicking — title/description problem.",
            f"",
            f"| Page | Impressions | CTR | Avg Pos |",
            f"|---|---|---|---|",
        ]
        for p in ctr_opps[:20]:
            lines.append(f"| `{p['slug']}` | {p['impressions']:,} | {p['ctr']}% | {p['position']} |")

    out = gsc.REPORTS_DIR / "gsc-search-analytics.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n  Report: ops/reports/gsc-search-analytics.md")


if __name__ == "__main__":
    result = run()
    print(f"\nDone: {result}")
