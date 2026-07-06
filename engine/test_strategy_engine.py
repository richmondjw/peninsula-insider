#!/usr/bin/env python3
"""
Self-test harness for the Content Strategy Brain.

A fully-automated daily loop is only trustworthy if its parsing and scoring
can't silently break. These tests lock the behaviour the brain depends on:
markdown-table parsing (the classic failure was matching a summary row instead
of a real heading), position-aware CTR classification, scoring monotonicity,
the learning loop's movement detection, day-over-day diffing, and graceful
degradation when an input is missing.

Run:  python3 engine/test_strategy_engine.py            # verbose
      python3 engine/test_strategy_engine.py --quiet     # dots only
Exit code is non-zero on any failure, so CI / a cron gate can fail loudly
instead of publishing a broken strategy.
"""

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import strategy_engine as se


# A realistic slice of the GSC report, including the trap: a Summary table whose
# "CTR opportunities" row must NOT be mistaken for the "## CTR Opportunities"
# section heading.
GSC_MD = """# Peninsula Insider — Search Analytics

_Period: 2026-03-23 → 2026-04-19_

## Summary

| Metric | Value |
|---|---|
| Total clicks | 14 |
| Total impressions | 630 |
| CTR opportunities | 6 |
| Avg position (imp-weighted) | 15.2 |

## Top Pages by Impressions

| Page | Impressions | Clicks | CTR | Avg Pos | In sitemap |
|---|---|---|---|---|---|
| `/whats-on/mornington-cup-2026` | 216 | 1 | 0.46% | 7.5 | — |
| `http://peninsulainsider.com.au/` | 15 | 9 | 60.0% | 2.1 | — |

## Top Queries

| Query | Impressions | Clicks | CTR | Avg Pos |
|---|---|---|---|---|
| peninsula cup 2026 | 34 | 0 | 0% | 8.1 |

## Keyword Gaps (Position 4–20, ≥5 impressions)

| Query | Impressions | Avg Pos | Clicks |
|---|---|---|---|
| peninsula cup 2026 | 34 | 8.1 | 0 |

## CTR Opportunities (≥20 impressions, <2% CTR)

| Page | Impressions | CTR | Avg Pos |
|---|---|---|---|
| `/whats-on/mornington-cup-2026` | 216 | 0.46% | 7.5 |
| `/stay/hotel-sorrento` | 59 | 0% | 54.3 |
"""

COVERAGE_MD = """# Coverage Report

_Generated 2026-04-22 04:19 UTC_

## URL Inspection Results

| URL | Verdict | Coverage | Last Crawl |
|---|---|---|---|
| `/eat` | NEUTRAL | Discovered – currently not indexed | Never |
| `/journal/x` | NEUTRAL | URL is unknown to Google | Never |

## Summary

- Indexed (PASS): **0**
"""


def _write(tmp: Path, name: str, body: str) -> Path:
    p = tmp / name
    p.write_text(body, encoding="utf-8")
    return p


class TableParsing(unittest.TestCase):
    def test_selects_heading_not_summary_row(self):
        """CTR Opportunities must parse the section table, not the summary row."""
        rows = se.parse_markdown_table(GSC_MD, r"^#+.*CTR Opportunities")
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["Page"], "/whats-on/mornington-cup-2026")

    def test_gsc_parse_full(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = _write(Path(d), "gsc.md", GSC_MD)
            gsc = se.load_gsc(p)
        self.assertTrue(gsc["available"])
        self.assertEqual(gsc["summary"].get("Total clicks"), "14")
        # CTR opps must be exactly the two real rows — not polluted by top pages.
        self.assertEqual(len(gsc["ctr_opportunities"]), 2)
        paths = {r["path"] for r in gsc["ctr_opportunities"]}
        self.assertEqual(paths, {"/whats-on/mornington-cup-2026/", "/stay/hotel-sorrento/"})
        # The 60%-CTR home page must NOT be a CTR opportunity.
        self.assertNotIn("/", paths)

    def test_coverage_parse(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = _write(Path(d), "cov.md", COVERAGE_MD)
            cov = se.load_coverage(p)
        self.assertTrue(cov["available"])
        self.assertEqual(cov["indexed"], 0)
        self.assertEqual(len(cov["not_indexed"]), 2)


class CtrClassification(unittest.TestCase):
    def test_page1_is_snippet_fix(self):
        gsc = {"ctr_opportunities": [{"path": "/a/", "impressions": 100, "ctr": 0.5, "avg_position": 7.0}],
               "striking_distance": [], "top_pages": [], "top_queries": []}
        opps = se.build_opportunities(gsc, {"stale": []}, {"gaps": []}, "winter", {"not_indexed": []})
        ctr = [o for o in opps if o.kind == "ctr-fix"][0]
        self.assertIn("Rewrite title", ctr.title)

    def test_deep_page_is_ranking_fix(self):
        gsc = {"ctr_opportunities": [{"path": "/b/", "impressions": 100, "ctr": 0.0, "avg_position": 54.0}],
               "striking_distance": [], "top_pages": [], "top_queries": []}
        opps = se.build_opportunities(gsc, {"stale": []}, {"gaps": []}, "winter", {"not_indexed": []})
        ctr = [o for o in opps if o.kind == "ctr-fix"][0]
        self.assertIn("Strengthen ranking", ctr.title)


class Scoring(unittest.TestCase):
    def _score(self, **kw):
        o = se.Opportunity(**kw)
        se.score_opportunity(o, {})
        return o.score

    def test_more_impressions_scores_higher(self):
        low = self._score(kind="ctr-fix", title="", target="/a/", impressions=10,
                          avg_position=8, ctr=0.0)
        high = self._score(kind="ctr-fix", title="", target="/b/", impressions=200,
                           avg_position=8, ctr=0.0)
        self.assertGreater(high, low)

    def test_indexation_hub_beats_deep(self):
        hub = self._score(kind="indexation", title="", target="/eat/")
        deep = self._score(kind="indexation", title="", target="/eat/foo/bar/")
        self.assertGreater(hub, deep)

    def test_closer_to_page1_scores_higher(self):
        near = self._score(kind="striking-distance", title="", target="/a/", impressions=20,
                          avg_position=5)
        far = self._score(kind="striking-distance", title="", target="/b/", impressions=20,
                         avg_position=25)
        self.assertGreater(near, far)


class LearningLoop(unittest.TestCase):
    GSC = {"top_pages": [{"path": "/win/", "impressions": 50, "clicks": 3, "ctr": 3.0, "avg_position": 6.0}],
           "ctr_opportunities": [], "top_queries": [], "striking_distance": []}

    def test_detects_improvement(self):
        actioned = [{"date": "2026-07-01", "kind": "ctr-fix", "target": "/win/", "query": "",
                     "baseline": {"impressions": 40, "ctr": 0.0, "avg_position": 12.0}}]
        res = se.evaluate_actioned(actioned, self.GSC)
        self.assertEqual(res["measurable"], 1)
        self.assertTrue(res["results"][0]["moved"])
        self.assertEqual(res["hit_rate_by_kind"]["ctr-fix"], {"wins": 1, "measured": 1})

    def test_pending_when_not_in_gsc(self):
        actioned = [{"date": "2026-07-01", "kind": "indexation", "target": "/about/", "query": "",
                     "baseline": {"impressions": None, "ctr": None, "avg_position": None}}]
        res = se.evaluate_actioned(actioned, self.GSC)
        self.assertEqual(res["measurable"], 0)
        self.assertIsNone(res["results"][0]["moved"])

    def test_regression_counts_as_no_win(self):
        gsc = {"top_pages": [{"path": "/slip/", "impressions": 30, "clicks": 0, "ctr": 0.0, "avg_position": 20.0}],
               "ctr_opportunities": [], "top_queries": [], "striking_distance": []}
        actioned = [{"date": "2026-07-01", "kind": "ctr-fix", "target": "/slip/", "query": "",
                     "baseline": {"impressions": 30, "ctr": 1.0, "avg_position": 10.0}}]
        res = se.evaluate_actioned(actioned, gsc)
        self.assertFalse(res["results"][0]["moved"])
        self.assertEqual(res["hit_rate_by_kind"]["ctr-fix"], {"wins": 0, "measured": 1})


class DayOverDay(unittest.TestCase):
    def test_first_run(self):
        d = se.compute_diff(None, {"total_clicks": 1}, [])
        self.assertTrue(d["first_run"])

    def test_detects_position_improvement(self):
        prev = {"date": "2026-07-05", "metrics": {"total_clicks": 9, "avg_position": 17.0},
                "commissioning_queue": []}
        d = se.compute_diff(prev, {"total_clicks": 14, "avg_position": 15.2}, [])
        self.assertFalse(d["first_run"])
        self.assertAlmostEqual(d["deltas"]["avg_position"], -1.8)
        self.assertTrue(any("improved" in n for n in d["notes"]))


class GracefulDegradation(unittest.TestCase):
    def test_missing_gsc_report(self):
        gsc = se.load_gsc(Path("/nonexistent/gsc.md"))
        self.assertFalse(gsc["available"])
        self.assertEqual(gsc["ctr_opportunities"], [])

    def test_missing_coverage_report(self):
        cov = se.load_coverage(Path("/nonexistent/cov.md"))
        self.assertFalse(cov["available"])

    def test_build_opportunities_with_no_inputs(self):
        # Empty GSC + no competitive + no coverage: still yields seasonal prompts, no crash.
        opps = se.build_opportunities(
            {"ctr_opportunities": [], "striking_distance": [], "top_pages": [], "top_queries": []},
            {"stale": []}, {"gaps": []}, "winter", {"not_indexed": []})
        self.assertTrue(all(o.kind == "coverage-gap" for o in opps))
        self.assertGreater(len(opps), 0)


class AdaptiveModel(unittest.TestCase):
    def _prev(self):
        return {k: 1.0 for k in se.ALL_KINDS}

    def test_holds_below_min_measured(self):
        """Fewer than the minimum measured outcomes → no adaptation (anti-noise)."""
        hit = {"ctr-fix": {"wins": 1, "measured": 1}}
        new, notes = se.adapt_weights(self._prev(), hit, date(2026, 7, 6))
        self.assertEqual(new["ctr-fix"], 1.0)
        self.assertEqual(notes, [])

    def test_rewards_winning_kind(self):
        hit = {"ctr-fix": {"wins": 8, "measured": 8}}  # 100% win rate
        new, notes = se.adapt_weights(self._prev(), hit, date(2026, 7, 6))
        self.assertGreater(new["ctr-fix"], 1.0)
        self.assertTrue(notes)

    def test_penalises_losing_kind(self):
        hit = {"freshness": {"wins": 0, "measured": 10}}  # 0% win rate
        new, _ = se.adapt_weights(self._prev(), hit, date(2026, 7, 6))
        self.assertLess(new["freshness"], 1.0)

    def test_stays_within_clamp(self):
        prev = {k: 1.3 for k in se.ALL_KINDS}
        hit = {"ctr-fix": {"wins": 20, "measured": 20}}
        new, _ = se.adapt_weights(prev, hit, date(2026, 7, 6))
        lo, hi = se.ADAPT_CLAMP
        self.assertLessEqual(new["ctr-fix"], hi)
        self.assertGreaterEqual(new["ctr-fix"], lo)

    def test_multiplier_changes_score(self):
        se._KIND_MULT = {"ctr-fix": 1.2}
        try:
            o = se.Opportunity(kind="ctr-fix", title="", target="/a/", impressions=100,
                              avg_position=8, ctr=0.0)
            se.score_opportunity(o, {})
            self.assertEqual(o.score_breakdown["learned_multiplier"], 1.2)
        finally:
            se._KIND_MULT = {}


class DeskRouting(unittest.TestCase):
    def test_routes(self):
        self.assertEqual(se.route_desk("/stay/hotel-sorrento/"), "escapes-desk")
        self.assertEqual(se.route_desk("/eat/polperro/"), "table-desk")
        self.assertEqual(se.route_desk("/wine/montalto/"), "table-desk")
        self.assertEqual(se.route_desk("/explore/best-walks/"), "field-desk")
        self.assertEqual(se.route_desk("/whats-on/mornington-cup-2026/"), "dispatch-desk")


if __name__ == "__main__":
    verbosity = 1 if "--quiet" in sys.argv else 2
    argv = [a for a in sys.argv if a != "--quiet"]
    unittest.main(argv=argv, verbosity=verbosity)
