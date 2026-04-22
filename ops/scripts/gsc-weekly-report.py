"""
GSC Weekly Report — master runner.

Runs coverage monitor + search analytics, combines into a single
dated weekly summary at ops/reports/gsc-weekly-YYYY-WNN.md.

Designed to be invoked by Windows Task Scheduler every Sunday.
"""

import importlib.util
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

_SCRIPTS = Path(__file__).parent
sys.path.insert(0, str(_SCRIPTS))
import gsc_client as gsc


def _load(fname):
    spec = importlib.util.spec_from_file_location(fname, _SCRIPTS / fname)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

analytics = _load("gsc-search-analytics.py")
coverage  = _load("gsc-coverage-monitor.py")


def run():
    now      = datetime.now(timezone.utc)
    iso_week = f"{now.year}-W{now.isocalendar()[1]:02d}"
    out_file = gsc.REPORTS_DIR / f"gsc-weekly-{iso_week}.md"

    print(f"=== Peninsula Insider GSC Weekly Report — {iso_week} ===\n")

    # ── Coverage ──────────────────────────────────────────────────────────────
    print("── Coverage monitor ──────────────────────────────")
    cov_summary = coverage.run(verbose=True)

    # ── Search analytics ──────────────────────────────────────────────────────
    print("\n── Search analytics ──────────────────────────────")
    ana_summary = analytics.run()

    # ── Combine into weekly file ──────────────────────────────────────────────
    cov_report = (gsc.REPORTS_DIR / "gsc-coverage-report.md").read_text(encoding="utf-8")
    ana_report = (gsc.REPORTS_DIR / "gsc-search-analytics.md").read_text(encoding="utf-8")

    lines = [
        f"# Peninsula Insider — GSC Weekly Report {iso_week}",
        f"",
        f"_Generated {now.strftime('%Y-%m-%d %H:%M UTC')}_",
        f"",
        f"## Week at a Glance",
        f"",
        f"| Metric | Value |",
        f"|---|---|",
        f"| Pages indexed | {cov_summary['indexed']} / {cov_summary['total']} |",
        f"| Newly indexed this week | {cov_summary['newly_indexed']} |",
        f"| Regressions | {cov_summary['regressed']} |",
        f"| Total impressions (28d) | {ana_summary.get('pages', 0)} pages with data |",
        f"| Keyword gaps (pos 4–20) | {ana_summary.get('gaps', 0)} |",
        f"",
        f"---",
        f"",
    ]

    # Inline the two component reports (strip their H1 headers to avoid duplication)
    def strip_h1(text: str) -> str:
        lines = text.splitlines()
        return "\n".join(l for l in lines if not l.startswith("# "))

    lines.append(strip_h1(cov_report))
    lines.append("\n---\n")
    lines.append(strip_h1(ana_report))

    out_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n=== Weekly report: ops/reports/gsc-weekly-{iso_week}.md ===")


if __name__ == "__main__":
    run()
