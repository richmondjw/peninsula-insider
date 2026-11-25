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


class EventCoverage(unittest.TestCase):
    def test_urgency_peaks_in_window(self):
        self.assertEqual(se._event_urgency(30), 1.0)          # prime window
        self.assertLess(se._event_urgency(5), se._event_urgency(30))    # too soon
        self.assertLess(se._event_urgency(80), se._event_urgency(30))   # too far
        self.assertEqual(se._event_urgency(None), 0.0)
        self.assertEqual(se._event_urgency(-3), 0.0)

    def test_load_events_filters_window_and_significance(self):
        import tempfile, json as _json
        with tempfile.TemporaryDirectory() as d:
            dd = Path(d)
            (dd / "gala.json").write_text(_json.dumps({
                "slug": "gala", "title": "Winter Wine Gala", "startDate": "2026-07-26",
                "recurrence": "one-off", "freePaid": "Paid", "category": "food-wine"}))
            (dd / "market.json").write_text(_json.dumps({
                "slug": "mkt", "title": "Village Community Market", "startDate": "2026-07-20",
                "recurrence": "monthly", "freePaid": "Free", "category": "market"}))
            (dd / "past.json").write_text(_json.dumps({
                "slug": "past", "title": "Old Event", "startDate": "2026-01-01",
                "recurrence": "one-off", "freePaid": "Paid"}))
            (dd / "faraway.json").write_text(_json.dumps({
                "slug": "far", "title": "Next Year", "startDate": "2027-06-01",
                "recurrence": "one-off", "freePaid": "Paid"}))
            ev = se.load_events(dd, date(2026, 7, 6))
        slugs = {e["slug"]: e for e in ev["upcoming"]}
        self.assertIn("gala", slugs)          # upcoming, in window
        self.assertIn("mkt", slugs)            # upcoming market (kept, but not "major")
        self.assertNotIn("past", slugs)        # past — excluded
        self.assertNotIn("far", slugs)         # beyond window — excluded
        self.assertTrue(slugs["gala"]["major"])
        self.assertFalse(slugs["mkt"]["major"])  # recurring market is evergreen

    def test_only_major_events_become_opportunities(self):
        events = {"upcoming": [
            {"slug": "gala", "title": "Gala", "start": "2026-07-26", "days_until": 20,
             "major": True, "region": "Red Hill", "summary": "", "category": "food-wine"},
            {"slug": "mkt", "title": "Market", "start": "2026-07-20", "days_until": 14,
             "major": False, "region": "", "summary": "", "category": "market"},
        ]}
        opps = se.build_opportunities(
            {"ctr_opportunities": [], "striking_distance": [], "top_pages": [], "top_queries": []},
            {"stale": []}, {"gaps": []}, "winter", {"not_indexed": []}, events)
        ev_opps = [o for o in opps if o.kind == "event-coverage"]
        self.assertEqual(len(ev_opps), 1)
        self.assertIn("Gala", ev_opps[0].title)


class Health(unittest.TestCase):
    def _with_snaps(self, dates):
        import tempfile
        d = tempfile.mkdtemp()
        for ds in dates:
            (Path(d) / f"{ds}.json").write_text("{}")
        return Path(d)

    def setUp(self):
        self._orig = se.SNAPSHOT_DIR

    def tearDown(self):
        se.SNAPSHOT_DIR = self._orig

    def test_stalled_when_snapshot_old(self):
        se.SNAPSHOT_DIR = self._with_snaps(["2026-07-01"])
        h = se.check_health(date(2026, 7, 10), ["gsc-search-analytics", "gsc-coverage"], {})
        self.assertEqual(h["status"], "stalled")

    def test_ok_when_fresh_and_fed(self):
        se.SNAPSHOT_DIR = self._with_snaps(
            [f"2026-07-{d:02d}" for d in range(1, 8)])  # 7 consecutive days
        h = se.check_health(date(2026, 7, 7), ["gsc-search-analytics", "gsc-coverage"], {})
        self.assertEqual(h["status"], "ok")

    def test_degraded_without_performance_data(self):
        # No search data at all is at least as bad as stale search data, so it
        # reads degraded too. (It read "warning" before the staleness guard.)
        se.SNAPSHOT_DIR = self._with_snaps([f"2026-07-{d:02d}" for d in range(1, 8)])
        h = se.check_health(date(2026, 7, 7), [], {})  # no GSC input
        self.assertEqual(h["status"], "degraded")
        self.assertTrue(any("without performance signal" in n for n in h["notes"]))


class DeskRouting(unittest.TestCase):
    def test_routes(self):
        self.assertEqual(se.route_desk("/stay/hotel-sorrento/"), "escapes-desk")
        self.assertEqual(se.route_desk("/eat/polperro/"), "table-desk")
        self.assertEqual(se.route_desk("/wine/montalto/"), "table-desk")
        self.assertEqual(se.route_desk("/explore/best-walks/"), "field-desk")
        self.assertEqual(se.route_desk("/whats-on/mornington-cup-2026/"), "dispatch-desk")


class AutoExecutor(unittest.TestCase):
    """Guards the deterministic parts of the autonomous executor — a bug here
    would let it edit the wrong file or write malformed frontmatter live."""

    SAMPLE = ('---\ntitle: "Old Title"\ndek: "Old description here."\n'
              'author: "editorial"\nformat: "service"\n---\n\nBody stays.\n')

    def _aa(self):
        import auto_act as aa
        return aa

    def test_resolves_only_journal_articles(self):
        aa = self._aa()
        self.assertIsNone(aa.resolve_article_source("/stay/hotel-sorrento/"))
        self.assertIsNone(aa.resolve_article_source("/whats-on/x/"))
        self.assertIsNone(aa.resolve_article_source("/journal/definitely-not-a-real-slug-xyz/"))

    def test_frontmatter_roundtrip_preserves_body_and_other_keys(self):
        aa = self._aa()
        self.assertEqual(aa.get_fm_field(self.SAMPLE, "title"), "Old Title")
        out = aa.set_fm_field(self.SAMPLE, "title", "New Title")
        out = aa.set_fm_field(out, "dek", "A fresh, longer meta description.")
        self.assertEqual(aa.get_fm_field(out, "title"), "New Title")
        self.assertEqual(aa.get_fm_field(out, "dek"), "A fresh, longer meta description.")
        self.assertIn('author: "editorial"', out)   # untouched
        self.assertIn("Body stays.", out)            # body untouched

    def test_validate_accepts_good_and_rejects_bad(self):
        aa = self._aa()
        good_dek = "A concrete, useful meta description about dog-friendly beaches on the Peninsula today."
        self.assertIsNone(aa.validate("A Good Specific Title", good_dek))
        self.assertIsNotNone(aa.validate("x" * 80, good_dek))            # title too long
        self.assertIsNotNone(aa.validate("Title", "too short"))          # dek too short
        self.assertIsNotNone(aa.validate("A stunning title here", good_dek))  # prohibited word


class HouseStyleSanitizer(unittest.TestCase):
    """Guards the em-dash sanitizer in the orchestrator's style gate — an
    em-dash regression here silently breaks every content deploy."""

    def _sanitize(self, text: str) -> str:
        import tempfile
        import orchestrator as orch
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "a.md"
            p.write_text(text)
            orch.sanitize_house_style(p)
            return p.read_text()

    def test_replaces_spaced_em_dash(self):
        self.assertEqual(self._sanitize("winter menu — and the tart"),
                         "winter menu - and the tart")

    def test_replaces_bare_and_tight_em_dash(self):
        self.assertEqual(self._sanitize("A—B"), "A - B")

    def test_leaves_hyphen_rule_and_en_dash(self):
        # Markdown '---' rule and en-dashes (Thu–Sun) must survive untouched.
        out = self._sanitize("---\nOpen Thu–Sun\n---")
        self.assertIn("---", out)
        self.assertIn("Thu–Sun", out)

    def test_result_has_no_em_dashes(self):
        out = self._sanitize("Title — sub — end. Days — see site.")
        self.assertNotIn("—", out)


class AutoActScope(unittest.TestCase):
    def test_actionable_kinds(self):
        import auto_act as aa
        self.assertIn("ctr-fix", aa.ACTIONABLE_KINDS)
        self.assertIn("striking-distance", aa.ACTIONABLE_KINDS)
        self.assertNotIn("coverage-gap", aa.ACTIONABLE_KINDS)
        self.assertNotIn("indexation", aa.ACTIONABLE_KINDS)

    def test_query_aware_prompt(self):
        import auto_act as aa
        with_q = aa._draft_prompt("dog-friendly", "T", "D", query="dog beaches mornington")
        without_q = aa._draft_prompt("dog-friendly", "T", "D")
        self.assertIn("dog beaches mornington", with_q)
        self.assertNotIn("search query:", without_q)


class AlertPath(unittest.TestCase):
    def test_writes_alert_file(self):
        import os, tempfile
        from unittest import mock
        with tempfile.TemporaryDirectory() as d:
            with mock.patch.dict(os.environ, {"PI_REPO_ROOT": d}, clear=False):
                import importlib
                import alert
                importlib.reload(alert)  # pick up PI_REPO_ROOT
                r = alert.emit_alert("Test fail", "body here", "error", "unit-key")
                self.assertIsNotNone(r["file"])
                self.assertTrue(Path(r["file"]).exists())
                payload = __import__("json").loads(Path(r["file"]).read_text())
                self.assertEqual(payload["severity"], "error")
                self.assertEqual(payload["dedup_key"], "unit-key")

    def test_no_issue_without_token(self):
        import os
        from unittest import mock
        import alert
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(alert.open_or_reuse_issue("t", "b", "k"))


class LLMClient(unittest.TestCase):
    def test_sdk_skipped_without_key(self):
        import os
        from unittest import mock
        import llm
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(llm._try_sdk("hi", "", "claude-sonnet-5", 100, 5))

    def test_available_returns_valid_backend(self):
        import llm
        self.assertIn(llm.available(), {"sdk", "cli", "none"})


class VerifyGate(unittest.TestCase):
    """Guards the real factual verify gate — it can BLOCK a live publish, so its
    hard-fail logic must not silently regress."""

    def _run(self, body: str, *, slugs=("real-venue",), paths=("/eat/real-venue",)):
        import tempfile
        import verify_gate as vg
        with tempfile.TemporaryDirectory() as d:
            content = Path(d) / "content"
            (content / "venues").mkdir(parents=True)
            for s in slugs:
                (content / "venues" / f"{s}.json").write_text("{}")
            sitemap = Path(d) / "sitemap.xml"
            locs = "".join(f"<loc>https://peninsulainsider.com.au{p}/</loc>" for p in paths)
            sitemap.write_text(f"<urlset>{locs}</urlset>")
            f = Path(d) / "a.md"
            f.write_text(body)
            return vg.verify_content(f, content_dir=content, sitemap_path=sitemap)

    def test_clean_passes(self):
        body = ('---\ntitle: "x"\npublishedAt: 2026-07-06\nrelatedVenues: [real-venue]\n---\n'
                "A calm note with no dates or risky claims.")
        self.assertEqual(self._run(body)["result"], "PASS")

    def test_missing_venue_fails(self):
        body = ('---\npublishedAt: 2026-07-06\nrelatedVenues: [ghost-venue]\n---\nhi')
        r = self._run(body)
        self.assertEqual(r["result"], "FAIL")
        self.assertTrue(any("ghost-venue" in f for f in r["fails"]))

    def test_wrong_weekday_fails(self):
        # 26 July 2026 is a Sunday, not a Saturday.
        body = ('---\npublishedAt: 2026-07-06\n---\nJoin us Saturday 26 July.')
        r = self._run(body)
        self.assertEqual(r["result"], "FAIL")
        self.assertTrue(any("26 Jul" in f for f in r["fails"]))

    def test_correct_weekday_passes(self):
        # 26 July 2026 is a Sunday.
        body = ('---\npublishedAt: 2026-07-06\n---\nJoin us Sunday 26 July.')
        self.assertNotEqual(self._run(body)["result"], "FAIL")

    def test_unknown_section_link_fails(self):
        body = ('---\npublishedAt: 2026-07-06\nclusterLinks:\n  - href: "/made-up/x/"\n---\nhi')
        self.assertEqual(self._run(body)["result"], "FAIL")


class CancelledEventAdmission(unittest.TestCase):
    def test_cancellation_signals(self):
        from event_admission import is_cancelled_record
        for signal in ({"cancelled": True}, {"skipThis": True},
                       {"verificationStatus": "Updated after organiser cancellation notice"},
                       {"summary": "Cancelled: no festival"}):
            with self.subTest(signal=signal):
                self.assertTrue(is_cancelled_record(signal))
        self.assertFalse(is_cancelled_record({"cancelled": False, "summary": "Festival is on"}))

    def test_scan_and_collection_exclude_withdrawn_events(self):
        import json, tempfile
        from unittest.mock import patch
        import orchestrator as orch
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "reports").mkdir()
            events = root / "next/src/content/events"
            events.mkdir(parents=True)
            active = {"title": "Active festival", "status": "published", "startDate": "2026-10-18"}
            cancelled = dict(active, title="Cancelled festival", cancelled=True)
            skipped = dict(active, title="Skipped festival", skipThis=True)
            for i, rec in enumerate((active, cancelled, skipped)):
                (events / f"{i}.json").write_text(json.dumps(rec))
            scan = root / "reports/peninsula-whats-on.json"
            scan.write_text(json.dumps({"events": [cancelled, skipped, active]}))
            with patch.object(orch, "REPO_ROOT", root):
                picked, source = orch._load_event_intel("2026-10-14")
                self.assertEqual([r["title"] for r in picked], ["Active festival"])
                self.assertIn("reports/", source)
                scan.unlink()
                picked, source = orch._load_event_intel("2026-10-14")
                self.assertEqual([r["title"] for r in picked], ["Active festival"])
                self.assertIn("live collection", source)

    def test_gate_blocks_recommendation_but_allows_correction(self):
        import json, tempfile
        import verify_gate as gate
        with tempfile.TemporaryDirectory() as d:
            content = Path(d)
            (content / "events").mkdir()
            (content / "events/festival.json").write_text(json.dumps({
                "title": "Main Street Mornington Festival 2026", "cancelled": True}))
            for copy in ('title: "Main Street Mornington Festival"',
                         "## DISCOVERY - Main Street Mornington Festival, Sunday 18 October",
                         "Main Street Mornington Festival runs 11am to 5pm.",
                         "**Main Street Mornington Festival 2026**\nSunday 18 October, 11am to 5pm.",
                         '---\nfaq:\n  - question: "When is the Main Street Mornington Festival?"\n'
                         '    answer: "Sunday 18 October, 11am to 5pm."\n---\n'):
                self.assertTrue(gate.check_cancelled_event_references(copy, content))
            self.assertFalse(gate.check_cancelled_event_references(
                "Main Street Mornington Festival is cancelled for 2026.", content))
            self.assertEqual(gate.known_event_titles(content), set())

    def test_publish_gate_integration(self):
        import json, tempfile
        import verify_gate as gate
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            content = root / "next/src/content"
            (content / "events").mkdir(parents=True)
            (content / "events/festival.json").write_text(json.dumps({
                "title": "Main Street Mornington Festival 2026", "cancelled": True}))
            article = root / "article.md"
            article.write_text('---\npublishedAt: 2026-10-14\n---\n'
                               'Main Street Mornington Festival runs this Sunday.')
            result = gate.verify_content(article, content, root / "sitemap.xml")
            self.assertEqual(result["result"], "FAIL")
            self.assertTrue(any("Cancelled event" in f for f in result["fails"]))
            article.write_text('---\npublishedAt: 2026-10-14\nfaq:\n'
                               '  - question: "Has the Main Street Mornington Festival been cancelled?"\n'
                               '    answer: "Yes, it will not go ahead in 2026."\n---\n'
                               'Main Street Mornington Festival is cancelled for 2026.')
            self.assertNotEqual(gate.verify_content(article, content, root / "sitemap.xml")["result"], "FAIL")


# ═════════════════════════════════════════════════════════════════════════════
# Staleness guard, expired events, learning-loop re-measurement, feed contract.
#
# Background: from its first run on 2026-07-06 until late November the daily
# run published a strategy dated today from search data that ended on
# 2026-04-19, mostly with a green health badge, because the Search
# Console pull failed quietly every morning. These tests lock the four things
# that make that impossible to repeat:
#   1. an input past its age limit is named at the top of the brief, its
#      opportunities are withheld from the queue, and health is not "ok"
#   2. the page of an event that is over can never be commissioned
#   3. an actioned page is re-measured only against data newer than the action,
#      and can be measured even when it is nowhere near the top 25
#   4. the reports the feed scripts write are exactly what the engine parses
# ═════════════════════════════════════════════════════════════════════════════
import contextlib
import importlib.util
import json
import os
import tempfile
from unittest import mock

TODAY = date(2026, 11, 25)
SITE = "https://peninsulainsider.com.au"
REPO = Path(__file__).resolve().parent.parent
_SCRIPTS = REPO / "ops" / "scripts"
EM_DASH = chr(0x2014)

# A few checks below read the repository's own committed data (the real events
# calendar, the real reports) rather than fixtures. They belong on a pull
# request. They do not belong in the pre-flight gate of the daily publish: that
# gate guards against broken code, and a content record nobody anticipated
# should not be able to stop the morning's article. daily-content.yml sets
# PI_PREFLIGHT=1 to leave them out there.
repo_data_check = unittest.skipIf(
    os.environ.get("PI_PREFLIGHT") == "1",
    "repository-data check: runs on pull requests, not in the publish pre-flight")


def _load_script(filename: str):
    """Import a hyphenated ops/scripts module. No Google libraries needed: the
    feed scripts import those on first use, which is what keeps them testable."""
    if str(_SCRIPTS) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS))
    spec = importlib.util.spec_from_file_location(
        filename.replace("-", "_").removesuffix(".py"), _SCRIPTS / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


analytics = _load_script("gsc-search-analytics.py")
coverage_monitor = _load_script("gsc-coverage-monitor.py")
import gsc_client  # noqa: E402  (on sys.path once the scripts are loaded)


def _row(key, impressions, position, clicks=0):
    keys = list(key) if isinstance(key, (list, tuple)) else [key]
    return {"keys": keys, "impressions": impressions, "clicks": clicks,
            "ctr": clicks / impressions if impressions else 0, "position": position}


# One realistic pull, in the shape the Search Console API returns it. Note the
# dog-friendly guide arrives as two URL variants, and /about/ is a low-traffic
# page that would never make a top-25 table on the real site.
PAGE_ROWS = [
    _row(f"{SITE}/whats-on/old-cup-2026", 216, 7.5, 1),
    _row(f"{SITE}/journal/dog-friendly/", 73, 8.8),
    _row("http://peninsulainsider.com.au/journal/dog-friendly", 59, 18.6),
    _row(f"{SITE}/whats-on/summer-gala/", 40, 9.0),
    _row(f"{SITE}/", 15, 2.1, 9),
    _row(f"{SITE}/about/", 3, 41.0),
]
QUERY_ROWS = [
    _row("old cup 2026", 34, 8.1),
    _row("dog friendly guide", 17, 9.6),
    _row("wine | food pairing", 6, 5.0),
    _row("hotels far away", 7, 64.6),
]
PAGE_QUERY_ROWS = [
    _row([f"{SITE}/whats-on/old-cup-2026", "old cup 2026"], 34, 8.1),
    _row([f"{SITE}/journal/dog-friendly/", "dog friendly guide"], 12, 9.0),
    _row(["http://peninsulainsider.com.au/journal/dog-friendly", "dog friendly guide"], 5, 11.0),
    _row([f"{SITE}/eat/", "wine | food pairing"], 6, 5.0),
]


def _search_report(start: str, end: str, through: str | None = None) -> str:
    """A search report written by the real feed script's own writer."""
    pages = analytics.aggregate_pages(PAGE_ROWS)
    totals = analytics.property_totals([_row([], 400, 11.4, 10)], pages)
    return analytics.build_report(pages, QUERY_ROWS, totals,
                                  analytics.landing_pages(PAGE_QUERY_ROWS),
                                  start, end, through or end, f"{end} 20:05 UTC")


def _coverage_report(day: str, results=None) -> str:
    results = results or [
        {"url": f"{SITE}/about/", "verdict": "PASS", "coverage": "Submitted and indexed", "crawl": day},
        {"url": f"{SITE}/eat/", "verdict": "NEUTRAL",
         "coverage": "Discovered – currently not indexed", "crawl": "Never"},
        {"url": f"{SITE}/journal/x/", "verdict": "NEUTRAL",
         "coverage": "URL is unknown to Google", "crawl": "Never"},
    ]
    return coverage_monitor.build_report(results, {}, f"{day} 20:07 UTC")


def _sitemap(lastmod: str) -> str:
    urls = "".join(f"<url><loc>{SITE}{p}</loc><lastmod>{lastmod}</lastmod></url>"
                   for p in ("/", "/eat/", "/journal/dog-friendly/", "/whats-on/old-cup-2026/"))
    return f"<urlset>{urls}</urlset>"


EVENTS = {
    # Ended in April. Annual, so the registry has rolled a next date a year out
    # and the site still serves its page: exactly the Mornington Cup case.
    "archive/old-cup-2026.json": {
        "slug": "old-cup-2026", "title": "Old Cup 2026", "startDate": "2026-04-18",
        "endDate": "2026-04-18", "recurrence": "annual", "nextOccurrence": "2027-04-18",
        "status": "archived", "freePaid": "Paid"},
    "summer-gala.json": {
        "slug": "summer-gala", "title": "Summer Gala", "startDate": "2026-12-20",
        "endDate": "2026-12-21", "recurrence": "one-off", "freePaid": "Paid",
        "category": "food-wine", "status": "published"},
    # A future date does not make a retired listing live.
    "unconfirmed-carols.json": {
        "slug": "unconfirmed-carols", "title": "Unconfirmed Carols", "startDate": "2026-12-17",
        "recurrence": "one-off", "freePaid": "Paid", "status": "archived",
        "archivedReason": "Organiser page returned 404; date could not be confirmed."},
    "cancelled-fair.json": {
        "slug": "cancelled-fair", "title": "Cancelled Fair", "startDate": "2026-12-12",
        "recurrence": "one-off", "freePaid": "Paid", "cancelled": True},
}


@contextlib.contextmanager
def _sandbox(*, search_end: str | None, coverage_day: str | None = None,
             sitemap_day: str | None = None, events: dict | None = None, actioned=()):
    """Point the engine at a throwaway repo holding exactly the given inputs."""
    names = ("REPO_ROOT", "SITEMAP", "GSC_REPORT", "GSC_COVERAGE", "EVENTS_DIR",
             "COMPETITIVE_DIR", "STRATEGY_DIR", "SNAPSHOT_DIR", "STRATEGY_JSON",
             "STRATEGY_MD", "ACTIONED_LEDGER", "MODEL_WEIGHTS_FILE", "HEALTH_FILE")
    saved = {n: getattr(se, n) for n in names}
    saved_mult = se._KIND_MULT
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        se.REPO_ROOT = root
        se.SITEMAP = root / "sitemap.xml"
        se.GSC_REPORT = root / "ops/reports/gsc-search-analytics.md"
        se.GSC_COVERAGE = root / "ops/reports/gsc-coverage-report.md"
        se.EVENTS_DIR = root / "next/src/content/events"
        se.COMPETITIVE_DIR = root / ".claude/signals"
        se.STRATEGY_DIR = root / "ops/strategy"
        se.SNAPSHOT_DIR = se.STRATEGY_DIR / "snapshots"
        se.STRATEGY_JSON = se.STRATEGY_DIR / "content-strategy.json"
        se.STRATEGY_MD = se.STRATEGY_DIR / "content-strategy.md"
        se.ACTIONED_LEDGER = se.STRATEGY_DIR / "actioned.jsonl"
        se.MODEL_WEIGHTS_FILE = se.STRATEGY_DIR / "model-weights.json"
        se.HEALTH_FILE = se.STRATEGY_DIR / "health.json"
        for folder in (se.GSC_REPORT.parent, se.EVENTS_DIR / "archive", se.SNAPSHOT_DIR):
            folder.mkdir(parents=True)
        if search_end:
            start = (date.fromisoformat(search_end) - se._days(27)).isoformat()
            se.GSC_REPORT.write_text(_search_report(start, search_end), encoding="utf-8")
        if coverage_day:
            se.GSC_COVERAGE.write_text(_coverage_report(coverage_day), encoding="utf-8")
        if sitemap_day:
            se.SITEMAP.write_text(_sitemap(sitemap_day), encoding="utf-8")
        for rel, record in (EVENTS if events is None else events).items():
            (se.EVENTS_DIR / rel).write_text(json.dumps(record), encoding="utf-8")
        if actioned:
            se.ACTIONED_LEDGER.write_text(
                "".join(json.dumps(a) + "\n" for a in actioned), encoding="utf-8")
        try:
            yield root
        finally:
            for n, v in saved.items():
                setattr(se, n, v)
            se._KIND_MULT = saved_mult


FRESH = dict(search_end="2026-11-22", coverage_day="2026-11-25", sitemap_day="2026-11-24")
STALE = dict(search_end="2026-04-19", coverage_day="2026-04-22", sitemap_day="2026-07-05")
NO_CREDENTIALS = {"credentials": "none",
                  "refresh": {"search": "no-credentials", "coverage": "no-credentials"}}


def _kinds(queue) -> set:
    return {o["kind"] for o in queue}


class InputFreshness(unittest.TestCase):
    def _state(self, as_of, **kw):
        return se._input_freshness(True, as_of, TODAY, 14, kw.get("aging"))

    def test_states_by_age(self):
        self.assertEqual(self._state("2026-11-22")["state"], "fresh")          # 3 days: normal lag
        self.assertEqual(self._state("2026-11-11")["state"], "fresh")          # 14 days: at the limit
        self.assertEqual(self._state("2026-11-10")["state"], "stale")          # 15 days: over it
        self.assertEqual(self._state("2026-11-16", aging=7)["state"], "aging")
        self.assertTrue(self._state("2026-11-16", aging=7)["usable"])
        self.assertEqual(self._state("2026-04-19")["age_days"], 220)
        self.assertFalse(self._state("2026-04-19")["usable"])

    def test_fails_closed_when_age_cannot_be_trusted(self):
        """No date, a date after the run, or no input at all: never usable."""
        self.assertEqual(self._state("")["state"], "undated")
        self.assertFalse(self._state("")["usable"])
        self.assertEqual(self._state("2026-12-25")["state"], "future")
        self.assertFalse(self._state("2026-12-25")["usable"])
        missing = se._input_freshness(False, "2026-11-22", TODAY, 14)
        self.assertEqual(missing["state"], "missing")
        self.assertFalse(missing["usable"])

    def test_age_is_measured_from_the_newest_data_not_the_requested_period(self):
        """A pull can ask for a window Google has not filled yet."""
        gsc = {"available": True, "period_end": "2026-11-22", "data_through": "2026-11-05"}
        fresh = se.assess_freshness(gsc, {}, {}, TODAY)
        self.assertEqual(fresh["search"]["as_of"], "2026-11-05")
        self.assertEqual(fresh["search"]["state"], "stale")

    def test_legacy_report_period_is_dated(self):
        """The committed April report uses an arrow between its dates."""
        with tempfile.TemporaryDirectory() as d:
            gsc = se.load_gsc(_write(Path(d), "gsc.md", GSC_MD))
        self.assertEqual((gsc["period_start"], gsc["period_end"]), ("2026-03-23", "2026-04-19"))
        self.assertEqual(se.assess_freshness(gsc, {}, {}, TODAY)["search"]["state"], "stale")


class StalenessGuard(unittest.TestCase):
    """The reported fault, end to end, through build_state and the brief."""

    def test_stale_search_data_is_withheld_from_the_queue(self):
        with _sandbox(**STALE):
            state = se.build_state(TODAY, NO_CREDENTIALS)
        self.assertTrue(state["stale"])
        queued = _kinds(state["commissioning_queue"])
        for kind in ("ctr-fix", "striking-distance", "indexation", "freshness"):
            self.assertNotIn(kind, queued, f"{kind} was ranked from stale data")
        held = _kinds(w for w in state["withheld"] if w["withheld_class"] == "stale-input")
        self.assertEqual(held, {"ctr-fix", "striking-distance", "indexation", "freshness"})
        # What does not depend on the stale inputs still gets commissioned.
        self.assertIn("event-coverage", queued)
        self.assertIn("coverage-gap", queued)

    def test_stale_figures_are_not_published_as_current(self):
        """'Pages indexed by Google: 0' and April's clicks must not read as today's."""
        with _sandbox(**STALE):
            state = se.build_state(TODAY, NO_CREDENTIALS)
        for key in ("total_clicks", "total_impressions", "avg_position",
                    "pages_indexed", "pages_not_indexed"):
            self.assertIsNone(state["metrics"][key], key)
        self.assertEqual(state["last_known"]["search"]["as_of"], "2026-04-19")
        self.assertEqual(state["last_known"]["search"]["total_impressions"], 400)
        self.assertEqual(state["inputs_used"][0].split(":")[0], "events-calendar")
        self.assertTrue(any(i.startswith("gsc-search-analytics (2026-04-19)")
                            for i in state["inputs_stale"]))

    def test_health_is_degraded_and_says_why(self):
        with _sandbox(**STALE):
            health = se.build_state(TODAY, NO_CREDENTIALS)["health"]
        self.assertEqual(health["status"], "degraded")
        self.assertIn("2026-04-19", health["notes"][0])
        self.assertIn("220 days old", health["notes"][0])
        self.assertIn("GSC_TOKEN_JSON", health["cause"])
        self.assertIn("ops/gsc-auth/README.md", health["cause"])

    def test_brief_opens_with_the_warning(self):
        with _sandbox(**STALE):
            md = se.render_markdown(se.build_state(TODAY, NO_CREDENTIALS))
        lines = md.splitlines()
        self.assertTrue(lines[0].startswith("# "))
        self.assertIn("STALE DATA", lines[2])                      # first thing after the title
        self.assertLess(md.index("STALE DATA"), md.index("North star"))
        self.assertIn("ends 2026-04-19 and is 220 days old (limit: 14 days)", md)
        self.assertIn("🟠 degraded", md)
        self.assertNotIn("🟢", md)
        self.assertIn("(stale: 220 days old)", md)
        self.assertIn("## Withheld from the queue", md)
        ranked = md[md.index("## This cycle's commissioning queue"):md.index("## Withheld from the queue")]
        self.assertNotIn("[CTR", ranked)
        self.assertNotIn("[RANK", ranked)
        self.assertNotIn("[INDEX", ranked)

    def test_fresh_data_flows_through_untouched(self):
        with _sandbox(**FRESH):
            state = se.build_state(TODAY, {"credentials": "env-token",
                                           "refresh": {"search": "ok", "coverage": "ok"}})
            md = se.render_markdown(state)
        self.assertFalse(state["stale"])
        self.assertEqual(state["health"]["status"], "ok")
        self.assertEqual(state["health"]["cause"], "")
        self.assertEqual(state["inputs_stale"], [])
        self.assertEqual(state["metrics"]["total_impressions"], 400)
        self.assertEqual(state["metrics"]["pages_indexed"], 1)
        self.assertEqual(state["metrics"]["pages_inspected"], 3)
        self.assertEqual(state["gsc_period"], "2026-10-26 to 2026-11-22")
        self.assertTrue({"ctr-fix", "striking-distance", "indexation"} <= _kinds(state["commissioning_queue"]))
        self.assertNotIn("STALE DATA", md)
        self.assertIn("🟢 healthy", md)
        self.assertIn("| Tracked pages indexed by Google | 1 of 3 inspected on 2026-11-25 |", md)

    def test_aging_search_data_warns_before_it_is_withheld(self):
        """A working pull trails by ~3 days. Nine means it has been failing."""
        with _sandbox(search_end="2026-11-16", coverage_day="2026-11-25", sitemap_day="2026-11-24"):
            state = se.build_state(TODAY, {"credentials": "env-token",
                                           "refresh": {"search": "auth-failed", "coverage": "ok"}})
        self.assertEqual(state["health"]["status"], "warning")
        self.assertIn("9 days old", state["health"]["notes"][0])
        self.assertIn("rejected the stored token", state["health"]["cause"])
        self.assertIn("ctr-fix", _kinds(state["commissioning_queue"]))   # still usable

    def test_only_the_stale_input_is_withheld(self):
        """Fresh search data must not be held back by an old coverage snapshot."""
        with _sandbox(search_end="2026-11-22", coverage_day="2026-04-22", sitemap_day="2026-11-24"):
            state = se.build_state(TODAY, {"credentials": "env-token"})
        queued = _kinds(state["commissioning_queue"])
        self.assertIn("ctr-fix", queued)
        self.assertNotIn("indexation", queued)
        self.assertEqual(state["health"]["status"], "warning")
        self.assertIsNone(state["metrics"]["pages_indexed"])
        self.assertEqual(state["metrics"]["total_impressions"], 400)

    def test_missing_search_report_is_degraded(self):
        with _sandbox(search_end=None, coverage_day="2026-11-25", sitemap_day="2026-11-24"):
            state = se.build_state(TODAY, NO_CREDENTIALS)
            md = se.render_markdown(state)
        self.assertEqual(state["health"]["status"], "degraded")
        self.assertIn("STALE DATA", md)

    def test_stale_inventory_does_not_invent_freshness_work(self):
        """A sitemap that stopped being rebuilt makes every page look stale."""
        with _sandbox(search_end="2026-11-22", coverage_day="2026-11-25", sitemap_day="2026-07-05"):
            state = se.build_state(TODAY, {"credentials": "env-token"})
        self.assertNotIn("freshness", _kinds(state["commissioning_queue"]))
        self.assertIn("freshness", _kinds(state["withheld"]))
        self.assertEqual(state["health"]["status"], "warning")

    def test_day_over_day_does_not_report_a_trend_in_stale_numbers(self):
        prev = {"date": "2026-11-24", "gsc_period": "2026-03-23 to 2026-04-19",
                "metrics": {"total_clicks": 14, "avg_position": 15.2}, "commissioning_queue": []}
        stale = se.compute_diff(prev, {"total_clicks": None, "avg_position": None}, [],
                                "2026-03-23 to 2026-04-19", search_usable=False)
        self.assertTrue(any("stale" in n for n in stale["notes"]))
        self.assertFalse(any("Clicks" in n or "position" in n for n in stale["notes"]))
        same = se.compute_diff(prev, {"total_clicks": 14, "avg_position": 15.2}, [],
                               "2026-03-23 to 2026-04-19")
        self.assertTrue(any("Same search window" in n for n in same["notes"]))

    @repo_data_check
    def test_committed_inputs_can_no_longer_read_as_healthy(self):
        """Runs against the repository's own report: whatever is committed, a
        search period older than the limit must never produce a green brief."""
        gsc = se.load_gsc(REPO / "ops/reports/gsc-search-analytics.md")
        if not gsc["available"]:
            self.skipTest("no committed search report")
        fresh = se.assess_freshness(gsc, se.load_coverage(REPO / "ops/reports/gsc-coverage-report.md"),
                                    se.load_inventory(REPO / "sitemap.xml", date.today()), date.today())
        health = se.check_health(date.today(), [], {}, fresh)
        if not fresh["search"]["usable"]:
            self.assertIn(health["status"], ("degraded", "stalled"))
        else:
            self.assertLessEqual(fresh["search"]["age_days"], se.SEARCH_STALE_AFTER_DAYS)


class ExpiredEvents(unittest.TestCase):
    def _reason(self, **record):
        return se.event_block_reason(record, TODAY)

    def test_what_counts_as_over(self):
        self.assertEqual(self._reason(startDate="2026-04-18", recurrence="one-off"),
                         "event ended 2026-04-18")
        self.assertEqual(self._reason(startDate="2026-11-24"), "event ended 2026-11-24")
        self.assertEqual(self._reason(startDate="2026-11-25"), "")            # on today
        self.assertEqual(self._reason(startDate="2026-12-20"), "")            # upcoming
        self.assertEqual(self._reason(startDate="2026-11-01", endDate="2026-12-01"), "")  # running now
        # A year-specific annual page: this year's edition is done, the next is a year off.
        self.assertEqual(self._reason(startDate="2026-11-21", recurrence="annual",
                                      nextOccurrence="2027-11-21", status="published"),
                         "event ended 2026-11-21")
        # ...but an annual record with an edition inside the coverage window is live.
        self.assertEqual(self._reason(startDate="2025-12-20", recurrence="annual",
                                      nextOccurrence="2026-12-20"), "")
        # A rolling series never ends by date alone (the August 2026 markets bug).
        self.assertEqual(self._reason(startDate="2026-05-09", recurrence="monthly"), "")
        self.assertEqual(self._reason(startDate="2025-01-04", recurrence="weekly", status="published"), "")

    def test_retired_and_cancelled_listings_are_out_whatever_their_dates(self):
        self.assertEqual(self._reason(startDate="2026-12-17", status="archived"), "listing archived")
        self.assertEqual(self._reason(startDate="2026-12-17", status="expired"), "listing expired")
        self.assertEqual(self._reason(startDate="2026-12-12", cancelled=True), "event cancelled")
        self.assertEqual(self._reason(startDate="2026-12-12", recurrence="weekly", status="archived"),
                         "listing archived")

    def test_previews_are_only_commissioned_for_live_listings(self):
        with _sandbox(**FRESH):
            upcoming = {e["slug"]: e for e in se.load_events(se.EVENTS_DIR, TODAY)["upcoming"]}
        self.assertEqual(set(upcoming), {"summer-gala"})
        self.assertEqual(upcoming["summer-gala"]["end"], "2026-12-21")

    def test_index_covers_the_archive_folder(self):
        with _sandbox(**FRESH):
            index = se.load_event_index(se.EVENTS_DIR, TODAY)
        self.assertEqual(index["old-cup-2026"]["blocked"], "event ended 2026-04-18")
        self.assertEqual(index["summer-gala"]["blocked"], "")
        self.assertEqual(index["summer-gala"]["expires_on"], "2026-12-21")
        self.assertEqual(se.event_for_path("/whats-on/old-cup-2026", index)["title"], "Old Cup 2026")
        self.assertIsNone(se.event_for_path("/whats-on/this-weekend/", index))
        self.assertIsNone(se.event_for_path("/journal/old-cup-2026/", index))

    def test_expired_event_page_cannot_reach_the_queue_even_on_fresh_data(self):
        """The Mornington Cup case: Google still shows the page, the event is over."""
        with _sandbox(**FRESH):
            state = se.build_state(TODAY, {"credentials": "env-token"})
        targets = {o["target"] for o in state["commissioning_queue"]}
        self.assertNotIn("/whats-on/old-cup-2026/", targets)
        dropped = [w for w in state["withheld"] if w["withheld_class"] == "expired-event"]
        self.assertEqual({w["kind"] for w in dropped}, {"ctr-fix", "striking-distance"})
        self.assertEqual({w["target"] for w in dropped}, {"/whats-on/old-cup-2026/"})
        self.assertTrue(all("event ended 2026-04-18" in w["withheld_reason"] for w in dropped))
        # The query is matched to the page that really ranks for it, from the report.
        self.assertTrue(any(w["query"] == "old cup 2026" for w in dropped))

    def test_no_kind_of_opportunity_can_target_an_expired_event_page(self):
        index = {"old-cup-2026": {"title": "Old Cup 2026", "last_day": "2026-04-18",
                                  "blocked": "event ended 2026-04-18", "expires_on": ""}}
        opps = [se.Opportunity(kind=k, title=k, target="/whats-on/old-cup-2026/") for k in se.ALL_KINDS]
        queue, withheld = se.screen_opportunities(opps, None, index)
        self.assertEqual(queue, [])
        self.assertEqual(len(withheld), len(se.ALL_KINDS))

    def test_live_event_page_carries_its_expiry(self):
        with _sandbox(**FRESH):
            state = se.build_state(TODAY, {"credentials": "env-token"})
        gala = [o for o in state["commissioning_queue"] if o["target"] == "/whats-on/summer-gala/"]
        self.assertTrue(gala)
        self.assertEqual({o["expires_on"] for o in gala}, {"2026-12-21"})
        self.assertIn("ctr-fix", {o["kind"] for o in gala})       # search work on a live event is fine
        self.assertIn("event-coverage", {o["kind"] for o in gala})

    @repo_data_check
    def test_real_calendar_has_no_expired_event_in_the_queue(self):
        """Against the repository's real events, on fresh-as-can-be assumptions:
        nothing in the queue may point at an event page whose event is over."""
        events_dir = REPO / "next/src/content/events"
        if not events_dir.exists():
            self.skipTest("no events collection")
        today = date.today()
        index = se.load_event_index(events_dir, today)
        opps = se.build_opportunities(
            se.load_gsc(REPO / "ops/reports/gsc-search-analytics.md"), {"stale": []}, {"gaps": []},
            se.get_season(today.month), se.load_coverage(REPO / "ops/reports/gsc-coverage-report.md"),
            se.load_events(events_dir, today))
        queue, _ = se.screen_opportunities(opps, None, index)   # no staleness gate: events only
        for o in queue:
            event = se.event_for_path(o.target, index)
            self.assertFalse(event and event["blocked"], f"{o.target}: {event and event['blocked']}")
            if o.kind == "event-coverage":
                self.assertGreaterEqual(o.expires_on, today.isoformat())


class QueueReadGuard(unittest.TestCase):
    """A consumer may read a state file that is days old. The same rules apply
    again at the moment of reading, against today's date."""

    LEGACY = {  # the shape the engine wrote before this guard existed
        "date": "2026-11-24", "gsc_period": "2026-03-23 → 2026-04-19",
        "commissioning_queue": [
            {"kind": "ctr-fix", "target": "/whats-on/mornington-cup-2026/"},
            {"kind": "striking-distance", "target": "/journal/x/", "query": "x"},
            {"kind": "indexation", "target": "/eat/"},
            {"kind": "freshness", "target": "/eat/montalto/"},
            {"kind": "event-coverage", "target": "/whats-on/a/", "days_until": 0},
            {"kind": "event-coverage", "target": "/whats-on/b/", "days_until": 20},
            {"kind": "coverage-gap", "target": "wildflowers"},
        ]}

    def test_legacy_state_is_screened_on_read(self):
        """The file on main today: April-derived items must not be handed on."""
        queue = se.usable_queue(self.LEGACY, TODAY)
        self.assertEqual([o["target"] for o in queue], ["/whats-on/b/", "wildflowers"])

    def test_item_expires_between_writing_and_reading(self):
        state = {"date": "2026-11-25",
                 "freshness": {"search": {"as_of": "2026-11-22"}, "coverage": {"as_of": "2026-11-25"},
                               "inventory": {"as_of": "2026-11-24"}},
                 "commissioning_queue": [
                     {"kind": "event-coverage", "target": "/whats-on/gala/", "expires_on": "2026-12-21"},
                     {"kind": "ctr-fix", "target": "/whats-on/gala/", "expires_on": "2026-12-21"},
                     {"kind": "ctr-fix", "target": "/journal/y/"}]}
        self.assertEqual(len(se.usable_queue(state, TODAY)), 3)
        # Read on the event's last day, 29 days after the search data ends: the
        # preview is still good, both search-derived items are now stale.
        self.assertEqual([o["kind"] for o in se.usable_queue(state, date(2026, 12, 21))],
                         ["event-coverage"])
        self.assertEqual(se.usable_queue(state, date(2026, 12, 22)), [])   # and the event is over
        fresh_again = dict(state, freshness={**state["freshness"], "search": {"as_of": "2026-12-19"}})
        self.assertEqual([o["target"] for o in se.usable_queue(fresh_again, date(2026, 12, 22))],
                         ["/journal/y/"])

    def test_auto_executor_reads_through_the_guard(self):
        import auto_act as aa
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "content-strategy.json"
            path.write_text(json.dumps(self.LEGACY))
            with mock.patch.object(aa, "STRATEGY_JSON", path):
                kinds = {o["kind"] for o in aa.load_queue(TODAY)}
        self.assertFalse(kinds & aa.ACTIONABLE_KINDS, "would rewrite a title from April's data")

    def test_orchestrator_reads_through_the_guard(self):
        import orchestrator as orch
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "ops/strategy").mkdir(parents=True)
            (root / "ops/strategy/content-strategy.json").write_text(json.dumps(self.LEGACY))
            failed = mock.Mock(returncode=1, stderr="Traceback\nboom", stdout="")
            with mock.patch.object(orch, "REPO_ROOT", root), contextlib.redirect_stdout(None), \
                    mock.patch.object(orch.subprocess, "run", return_value=failed):
                result = orch.run_strategy_engine("2026-11-25", {"search": "no-credentials"})
        self.assertFalse(result["ok"])                    # engine did not write today's state
        self.assertEqual([o["target"] for o in result["queue"]], ["/whats-on/b/", "wildflowers"])


    def test_orchestrator_survives_an_unreadable_state_file(self):
        """The strategy step must never take the publish down with it."""
        import orchestrator as orch
        for corrupt in ("not json", "[1, 2, 3]", '{"commissioning_queue": "oops", "date": "2026-11-25"}',
                        '{"date": "2026-11-25", "health": "bad", "commissioning_queue": []}'):
            with tempfile.TemporaryDirectory() as d:
                root = Path(d)
                (root / "ops/strategy").mkdir(parents=True)
                (root / "ops/strategy/content-strategy.json").write_text(corrupt)
                with mock.patch.object(orch, "REPO_ROOT", root), contextlib.redirect_stdout(None), \
                        mock.patch.object(orch.subprocess, "run",
                                          return_value=mock.Mock(returncode=0, stderr="", stdout="")):
                    result = orch.run_strategy_engine("2026-11-25", None)
            self.assertEqual(result["queue"], [], corrupt)
            self.assertIsInstance(result["health"], dict, corrupt)


class LearningRemeasure(unittest.TestCase):
    """'Tracking 8 actioned item(s), 0 re-measured' for five months."""

    INDEXATION = {"date": "2026-07-06", "kind": "indexation", "target": "/about/", "query": "",
                  "baseline": {"impressions": None, "ctr": None, "avg_position": None}}

    def _gsc(self, start, end):
        with tempfile.TemporaryDirectory() as d:
            return se.load_gsc(_write(Path(d), "gsc.md", _search_report(start, end)))

    def _cov(self, day, results=None):
        with tempfile.TemporaryDirectory() as d:
            return se.load_coverage(_write(Path(d), "cov.md", _coverage_report(day, results)))

    def test_data_older_than_the_action_measures_nothing(self):
        """April's numbers cannot say whether a July fix worked."""
        res = se.evaluate_actioned([self.INDEXATION], self._gsc("2026-03-23", "2026-04-19"),
                                   self._cov("2026-04-22"))
        self.assertEqual(res["measurable"], 0)
        self.assertEqual(res["awaiting_search_data"], 1)
        self.assertIsNone(res["results"][0]["moved"])
        self.assertIn("search data ends 2026-04-19, before this action", res["results"][0]["detail"])
        self.assertEqual(res["hit_rate_by_kind"], {})

    def test_window_that_straddles_the_action_waits(self):
        ctr = {"date": "2026-11-10", "kind": "ctr-fix", "target": "/journal/dog-friendly/",
               "query": "", "baseline": {"impressions": 100, "ctr": 0.0, "avg_position": 20.0}}
        res = se.evaluate_actioned([ctr], self._gsc("2026-10-26", "2026-11-22"))
        self.assertEqual(res["measurable"], 0)
        self.assertEqual(res["results"][0]["waiting_on"], "post-action-window")

    def test_indexation_fix_measured_by_url_inspection(self):
        res = se.evaluate_actioned([self.INDEXATION], self._gsc("2026-03-23", "2026-04-19"),
                                   self._cov("2026-11-25"))
        self.assertEqual(res["measurable"], 1)                      # stale search data is no obstacle
        self.assertTrue(res["results"][0]["moved"])
        self.assertIn("indexed (inspected 2026-11-25)", res["results"][0]["detail"])
        self.assertEqual(res["hit_rate_by_kind"]["indexation"], {"wins": 1, "measured": 1})

    def test_indexation_fix_that_did_not_work_is_a_measured_miss(self):
        eat = dict(self.INDEXATION, target="/eat/")
        res = se.evaluate_actioned([eat], {}, self._cov("2026-11-25"))
        self.assertEqual(res["hit_rate_by_kind"]["indexation"], {"wins": 0, "measured": 1})
        self.assertIn("still not indexed", res["results"][0]["detail"])

    def test_inspection_from_before_the_action_does_not_count(self):
        res = se.evaluate_actioned([self.INDEXATION], {}, self._cov("2026-04-22"))
        self.assertEqual(res["measurable"], 0)

    def test_indexation_fix_measured_by_impressions_when_not_inspected(self):
        """Google only shows indexed pages, so impressions prove indexation.
        /about/ has 3 impressions: far outside any top-25, present in the full table."""
        res = se.evaluate_actioned([self.INDEXATION], self._gsc("2026-10-26", "2026-11-22"))
        self.assertTrue(res["results"][0]["moved"])
        self.assertIn("indexed and surfacing: 3 impressions", res["results"][0]["detail"])

    def test_no_evidence_either_way_stays_pending(self):
        unseen = dict(self.INDEXATION, target="/ethics/")
        res = se.evaluate_actioned([unseen], self._gsc("2026-10-26", "2026-11-22"),
                                   self._cov("2026-11-25"))
        self.assertEqual(res["measurable"], 0)
        self.assertEqual(res["results"][0]["waiting_on"], "index-evidence")

    def test_ctr_fix_measured_across_merged_url_variants(self):
        ctr = {"date": "2026-07-06", "kind": "ctr-fix", "target": "/journal/dog-friendly/",
               "query": "", "baseline": {"impressions": 100, "ctr": 0.0, "avg_position": 20.0}}
        res = se.evaluate_actioned([ctr], self._gsc("2026-10-26", "2026-11-22"))
        self.assertTrue(res["results"][0]["moved"])
        # 73 @ 8.8 and 59 @ 18.6 are one page: 132 impressions at 13.2.
        self.assertIn("position 20.0→13.2", res["results"][0]["detail"])

    def test_legacy_report_url_variants_are_one_page(self):
        """The April report lists a page once per URL variant. Read as separate
        pages, the last row silently overwrote the others."""
        legacy = {"top_pages": [
            {"path": "/journal/dog/", "impressions": 73, "clicks": 0, "ctr": 0.0, "avg_position": 8.8},
            {"path": "/journal/dog/", "impressions": 59, "clicks": 1, "ctr": 1.69, "avg_position": 18.6}],
            "ctr_opportunities": [
                {"path": "/journal/dog/", "impressions": 73, "ctr": 0.0, "avg_position": 8.8},
                {"path": "/stay/x/", "impressions": 59, "ctr": 0.0, "avg_position": 54.3}],
            "top_queries": [], "striking_distance": []}
        by_path, _ = se._metric_maps(legacy)
        self.assertEqual(by_path["/journal/dog/"],
                         {"impressions": 132, "clicks": 1, "ctr": 0.76, "avg_position": 13.2})
        self.assertEqual(by_path["/stay/x/"]["impressions"], 59)     # CTR-table-only page kept

    def test_page_that_vanished_from_a_complete_table_is_a_miss(self):
        gone = {"date": "2026-07-06", "kind": "ctr-fix", "target": "/journal/gone/", "query": "",
                "baseline": {"impressions": 50, "ctr": 1.0, "avg_position": 9.0}}
        complete = self._gsc("2026-10-26", "2026-11-22")
        self.assertEqual(se.evaluate_actioned([gone], complete)["hit_rate_by_kind"]["ctr-fix"],
                         {"wins": 0, "measured": 1})
        top_25_only = dict(complete, pages=[], pages_complete=False)
        self.assertEqual(se.evaluate_actioned([gone], top_25_only)["measurable"], 0)

    def test_missing_baseline_is_not_scored_as_a_loss(self):
        blank = {"date": "2026-07-06", "kind": "ctr-fix", "target": "/journal/dog-friendly/",
                 "query": "", "baseline": {"impressions": None, "ctr": None, "avg_position": None}}
        res = se.evaluate_actioned([blank], self._gsc("2026-10-26", "2026-11-22"))
        self.assertEqual(res["measurable"], 0)
        self.assertEqual(res["results"][0]["waiting_on"], "baseline")

    def test_query_baseline_is_compared_with_the_query_not_the_page(self):
        action = {"date": "2026-07-06", "kind": "striking-distance", "target": "/journal/dog-friendly/",
                  "query": "dog friendly guide", "baseline_level": "query",
                  "baseline": {"impressions": 10, "ctr": None, "avg_position": 14.0}}
        res = se.evaluate_actioned([action], self._gsc("2026-10-26", "2026-11-22"))
        self.assertIn("position 14.0→9.6", res["results"][0]["detail"])
        dropped = dict(action, query="a query nobody searches now")
        self.assertEqual(se.evaluate_actioned([dropped], self._gsc("2026-10-26", "2026-11-22"))
                         ["results"][0]["waiting_on"], "query-data")

    # The eight entries that sat at "not yet re-measured" from 2026-07-06, as
    # they are in ops/strategy/actioned.jsonl. Pinned here, not read from the
    # file, because the ledger grows with every action the loop takes.
    WAITING_SINCE_JULY = [
        {"date": "2026-07-06", "kind": "indexation", "target": target, "query": "",
         "baseline": {"impressions": None, "ctr": None, "avg_position": None}}
        for target in ("/about/", "/methodology/", "/our-approach/", "/editorial-approach/",
                       "/ethics/", "/corrections/", "/accessibility/", "/contact/")]

    def test_the_stuck_ledger_becomes_measurable_once_data_is_current(self):
        """This is the 'Done when' for the learning loop: the same eight items,
        unmeasurable on April's data, all measured on a current pull, and enough
        of them for the model weights to move for the first time."""
        ledger = self.WAITING_SINCE_JULY
        inspected = [{"url": f"{SITE}{a['target']}", "verdict": "PASS" if i < 6 else "NEUTRAL",
                      "coverage": "Submitted and indexed" if i < 6 else "Crawled - currently not indexed",
                      "crawl": "2026-11-20"} for i, a in enumerate(ledger)]
        stale = se.evaluate_actioned(ledger, self._gsc("2026-03-23", "2026-04-19"), self._cov("2026-04-22"))
        self.assertEqual((stale["measurable"], stale["awaiting_search_data"]), (0, 8))

        current = se.evaluate_actioned(ledger, self._gsc("2026-10-26", "2026-11-22"),
                                       self._cov("2026-11-25", inspected))
        self.assertEqual(current["measurable"], 8)
        self.assertEqual(current["hit_rate_by_kind"]["indexation"], {"wins": 6, "measured": 8})
        self.assertGreaterEqual(8, se.ADAPT_MIN_MEASURED)
        weights, notes = se.adapt_weights({k: 1.0 for k in se.ALL_KINDS},
                                          current["hit_rate_by_kind"], TODAY)
        self.assertGreater(weights["indexation"], 1.0)
        self.assertTrue(notes)

    def test_the_inspection_set_includes_every_actioned_page(self):
        """Otherwise an indexation fix on a quiet page is never inspected and
        its ledger entry waits forever."""
        with tempfile.TemporaryDirectory() as d:
            ledger = _write(Path(d), "actioned.jsonl",
                            json.dumps({"target": "/about/"}) + "\n" + "not json\n"
                            + json.dumps({"target": "seasonal topic, not a page"}) + "\n")
            actioned = coverage_monitor.actioned_paths(ledger)
        self.assertEqual(actioned, ["/about/"])
        urls = coverage_monitor.inspection_urls([f"{SITE}/eat", f"{SITE}/about"], actioned)
        # Canonical trailing-slash form, no duplicates: /eat would inspect a redirect.
        self.assertEqual(urls, [f"{SITE}/eat/", f"{SITE}/about/"])

    def test_record_action_notes_what_the_baseline_was_measured_against(self):
        with _sandbox(**FRESH):
            gsc, cov = se.load_gsc(se.GSC_REPORT), se.load_coverage(se.GSC_COVERAGE)
            page = se.record_action("/journal/dog-friendly/", "ctr-fix", "", "", gsc, TODAY, cov)
            query = se.record_action("/journal/dog-friendly/", "striking-distance",
                                     "dog friendly guide", "", gsc, TODAY, cov)
            unseen = se.record_action("/journal/never-shown/", "ctr-fix", "", "", gsc, TODAY, cov)
            indexed = se.record_action("/eat/", "indexation", "", "", gsc, TODAY, cov)
            self.assertEqual(len(se.load_actioned()), 4)
        self.assertEqual(page["baseline_level"], "page")
        self.assertEqual(page["baseline"]["impressions"], 132)
        self.assertEqual(page["baseline_as_of"], "2026-11-22")
        self.assertEqual(query["baseline_level"], "query")
        self.assertEqual(query["baseline"]["avg_position"], 9.6)
        self.assertEqual(unseen["baseline"]["impressions"], 0)     # complete table: it had none
        self.assertEqual(indexed["baseline"]["index_verdict"], "NEUTRAL")


class FeedReportContract(unittest.TestCase):
    """What the feed scripts write must be exactly what the engine reads. The
    coverage monitor used to write a layout the engine could not parse, so a
    successful pull would have reported zero indexed pages."""

    def test_search_report_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            gsc = se.load_gsc(_write(Path(d), "gsc.md",
                                     _search_report("2026-10-26", "2026-11-22", "2026-11-21")))
        self.assertEqual((gsc["period_start"], gsc["period_end"]), ("2026-10-26", "2026-11-22"))
        self.assertEqual(gsc["data_through"], "2026-11-21")
        self.assertEqual(gsc["summary"]["Total impressions"], "400")      # property totals, not a sum
        self.assertEqual(gsc["summary"]["Total clicks"], "10")
        self.assertEqual(gsc["summary"]["Avg position (imp-weighted)"], "11.4")
        self.assertEqual(gsc["summary"]["Pages with impressions"], "5")
        self.assertTrue(gsc["pages_complete"])
        pages = {p["path"]: p for p in gsc["pages"]}
        self.assertEqual(len(pages), 5)                                    # two variants merged
        self.assertEqual(pages["/journal/dog-friendly/"]["impressions"], 132)
        self.assertEqual(pages["/journal/dog-friendly/"]["avg_position"], 13.2)
        self.assertEqual(pages["/about/"]["impressions"], 3)
        self.assertEqual(gsc["top_pages"][0]["path"], "/whats-on/old-cup-2026/")
        self.assertEqual({r["path"] for r in gsc["ctr_opportunities"]},
                         {"/whats-on/old-cup-2026/", "/journal/dog-friendly/", "/whats-on/summer-gala/"})
        gaps = {g["query"]: g for g in gsc["striking_distance"]}
        self.assertEqual(set(gaps), {"old cup 2026", "dog friendly guide", "wine | food pairing"})
        self.assertEqual(gaps["old cup 2026"]["page"], "/whats-on/old-cup-2026/")
        self.assertEqual(gaps["dog friendly guide"]["page"], "/journal/dog-friendly/")
        self.assertEqual(gaps["wine | food pairing"]["page"], "/eat/")    # pipe survives the table
        self.assertEqual(len(gsc["top_queries"]), 4)

    def test_coverage_report_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            cov = se.load_coverage(_write(Path(d), "cov.md", _coverage_report("2026-11-25")))
        self.assertEqual(cov["as_of"], "2026-11-25")
        self.assertEqual(cov["indexed"], 1)
        self.assertEqual(cov["inspected"], 3)
        self.assertEqual({r["path"] for r in cov["not_indexed"]}, {"/eat/", "/journal/x/"})
        self.assertEqual(cov["by_path"]["/about/"]["verdict"], "PASS")

    def test_failed_inspections_are_not_counted_as_inspected(self):
        results = [{"url": f"{SITE}/about/", "verdict": "PASS", "coverage": "Submitted and indexed", "crawl": "x"},
                   {"url": f"{SITE}/eat/", "verdict": "ERROR", "coverage": "inspection failed (api-error)", "crawl": ""}]
        with tempfile.TemporaryDirectory() as d:
            cov = se.load_coverage(_write(Path(d), "cov.md", _coverage_report("2026-11-25", results)))
        self.assertEqual((cov["indexed"], cov["inspected"]), (1, 1))
        self.assertEqual(cov["not_indexed"], [])

    @repo_data_check
    def test_committed_reports_still_parse(self):
        """The legacy layouts on main today keep working until a pull replaces them."""
        cov = se.load_coverage(REPO / "ops/reports/gsc-coverage-report.md")
        gsc = se.load_gsc(REPO / "ops/reports/gsc-search-analytics.md")
        if not (cov["available"] and gsc["available"]):
            self.skipTest("no committed reports")
        self.assertTrue(cov["as_of"])
        self.assertTrue(gsc["period_end"])
        self.assertGreater(len(cov["by_path"]), 0)
        self.assertGreater(len(gsc["top_pages"]), 0)

    def test_older_monitor_layout_is_read_too(self):
        legacy = ("# Coverage Monitor\n\n_Run 2026-11-25 20:07 UTC_\n\n## Summary\n\n"
                  "| Metric | This run | Previous |\n|---|---|---|\n| Indexed (PASS) | **1** | 0 |\n\n"
                  "## Full Status\n\n| URL | Verdict | Coverage | Last Crawl |\n|---|---|---|---|\n"
                  "| `/about` | PASS | Submitted and indexed | 2026-11-20 |\n"
                  "| `/eat` | NEUTRAL | Crawled - currently not indexed | 2026-11-01 |\n")
        with tempfile.TemporaryDirectory() as d:
            cov = se.load_coverage(_write(Path(d), "cov.md", legacy))
        self.assertEqual((cov["as_of"], cov["indexed"], cov["inspected"]), ("2026-11-25", 1, 2))
        self.assertEqual([r["path"] for r in cov["not_indexed"]], ["/eat/"])

    def test_paths_are_normalised_one_way(self):
        n = gsc_client.norm_path
        self.assertEqual(n("http://peninsulainsider.com.au/stay/hotel-sorrento"), "/stay/hotel-sorrento/")
        self.assertEqual(n(f"{SITE}/eat/?utm=x#top"), "/eat/")
        self.assertEqual(n(SITE), "/")
        self.assertEqual(n(f"{SITE}/feed.xml"), "/feed.xml")
        self.assertEqual(gsc_client.canonical_url("/eat"), f"{SITE}/eat/")


class _Request:
    def __init__(self, fn):
        self._fn = fn

    def execute(self):
        return self._fn()


class _HttpError(Exception):
    def __init__(self, status):
        super().__init__(f"HttpError {status}")
        self.status_code = status


class _FakeSearchConsole:
    """Just enough of the Search Console client for the feed scripts."""

    def __init__(self, analytics_fn=None, inspect_fn=None):
        self._analytics, self._inspect, self.calls = analytics_fn, inspect_fn, 0

    def searchanalytics(self):
        return self

    def urlInspection(self):
        return self

    def index(self):
        return self

    def query(self, siteUrl, body):
        return _Request(lambda: self._analytics(body))

    def inspect(self, body):
        def run():
            self.calls += 1
            return self._inspect(body)
        return _Request(run)


def _analytics_answers(body):
    dims = tuple(body["dimensions"])
    return {"rows": {
        (): [_row([], 400, 11.4, 10)],
        ("date",): [_row("2026-11-20", 20, 10.0), _row("2026-11-21", 18, 10.0), _row("2026-11-22", 0, 0)],
        ("page",): PAGE_ROWS, ("query",): QUERY_ROWS, ("page", "query"): PAGE_QUERY_ROWS,
    }[dims]}


class FeedFailureHandling(unittest.TestCase):
    """A failed pull must fail loudly and leave the last good report alone. It
    used to print 'API error', carry on, and write an empty report."""

    @contextlib.contextmanager
    def _outputs(self, service, module, report_name):
        with tempfile.TemporaryDirectory() as d:
            report = Path(d) / report_name
            report.write_text("LAST GOOD REPORT\n", encoding="utf-8")
            patches = [mock.patch.object(gsc_client, "get_service", return_value=service),
                       mock.patch.object(gsc_client, "DATA_DIR", Path(d)),
                       mock.patch.object(module, "REPORT_FILE", report)]
            if module is coverage_monitor:
                patches += [mock.patch.object(module, "BASELINE_FILE", Path(d) / "baseline.json"),
                            mock.patch.object(module, "ACTIONED_FILE", Path(d) / "none.jsonl"),
                            mock.patch.object(module, "DELAY_S", 0),
                            mock.patch.object(gsc_client, "load_keep_improve_urls",
                                              return_value=[f"{SITE}/p{i}" for i in range(8)])]
            with contextlib.ExitStack() as stack, contextlib.redirect_stdout(None):
                for patch in patches:
                    stack.enter_context(patch)
                yield report

    def test_successful_pull_writes_a_report_the_engine_reads(self):
        with self._outputs(_FakeSearchConsole(_analytics_answers), analytics,
                           "gsc-search-analytics.md") as report:
            summary = analytics.run()
            gsc = se.load_gsc(report)
        self.assertEqual(summary["pages"], 5)
        self.assertEqual(gsc["summary"]["Total impressions"], "400")
        self.assertEqual(gsc["data_through"], "2026-11-21")       # newest day that has data
        self.assertTrue(gsc["pages_complete"])

    def test_api_error_raises_and_keeps_the_last_report(self):
        def refuse(body):
            raise _HttpError(403)
        with self._outputs(_FakeSearchConsole(refuse), analytics, "gsc-search-analytics.md") as report:
            with self.assertRaises(gsc_client.FeedError) as caught:
                analytics.run()
            self.assertEqual(report.read_text(), "LAST GOOD REPORT\n")
        self.assertEqual(caught.exception.reason, "api-error")
        self.assertIn("needs access to sc-domain:peninsulainsider.com.au", str(caught.exception))

    def test_rejected_credentials_are_an_auth_failure(self):
        def refuse(body):
            raise _HttpError(401)
        with self._outputs(_FakeSearchConsole(refuse), analytics, "gsc-search-analytics.md"):
            with self.assertRaises(gsc_client.FeedError) as caught:
                analytics.run()
        self.assertEqual(caught.exception.code, gsc_client.EXIT_AUTH_FAILED)

    def test_empty_answer_keeps_the_last_report(self):
        with self._outputs(_FakeSearchConsole(lambda body: {}), analytics,
                           "gsc-search-analytics.md") as report:
            with self.assertRaises(gsc_client.FeedError) as caught:
                analytics.run()
            self.assertEqual(report.read_text(), "LAST GOOD REPORT\n")
        self.assertEqual(caught.exception.reason, "no-data")

    def test_check_mode_writes_nothing(self):
        with self._outputs(_FakeSearchConsole(_analytics_answers), analytics,
                           "gsc-search-analytics.md") as report:
            totals = analytics.check()
            self.assertEqual(report.read_text(), "LAST GOOD REPORT\n")
        self.assertEqual((totals["impressions"], totals["clicks"]), (400, 10))

    def test_coverage_stops_early_when_every_inspection_fails(self):
        def refuse(body):
            raise _HttpError(403)
        service = _FakeSearchConsole(inspect_fn=refuse)
        with self._outputs(service, coverage_monitor, "gsc-coverage-report.md") as report:
            with self.assertRaises(gsc_client.FeedError):
                coverage_monitor.run(verbose=False)
            self.assertEqual(report.read_text(), "LAST GOOD REPORT\n")
        self.assertEqual(service.calls, coverage_monitor.FAIL_FAST_AFTER)   # not all 8

    def test_coverage_inspects_canonical_urls_and_reports_partial_failures(self):
        seen = []

        def inspect(body):
            seen.append(body["inspectionUrl"])
            if body["inspectionUrl"].endswith("/p3/"):
                raise _HttpError(500)
            return {"inspectionResult": {"indexStatusResult": {
                "verdict": "PASS", "coverageState": "Submitted and indexed",
                "lastCrawlTime": "2026-11-20T03:00:00Z"}}}
        with self._outputs(_FakeSearchConsole(inspect_fn=inspect), coverage_monitor,
                           "gsc-coverage-report.md") as report:
            summary = coverage_monitor.run(verbose=False)
            cov = se.load_coverage(report)
        self.assertTrue(all(u.endswith("/") for u in seen))
        self.assertEqual((summary["indexed"], summary["total"]), (7, 8))
        self.assertEqual((cov["indexed"], cov["inspected"]), (7, 7))
        self.assertEqual(cov["by_path"]["/p3/"]["verdict"], "ERROR")

    def test_orchestrator_reports_why_a_pull_did_not_refresh(self):
        """Exit codes become reasons. 'No credentials' was logged as a SKIP."""
        import orchestrator as orch
        codes = iter([0, 5])
        with mock.patch.object(orch, "REPO_ROOT", REPO), contextlib.redirect_stdout(None), \
                mock.patch.object(orch.subprocess, "run",
                                  side_effect=lambda *a, **k: mock.Mock(returncode=next(codes), stderr="x")):
            self.assertEqual(orch.run_gsc_refresh(), {"search": "ok", "coverage": "api-error"})
        with mock.patch.object(orch, "REPO_ROOT", REPO), contextlib.redirect_stdout(None), \
                mock.patch.object(orch.subprocess, "run",
                                  return_value=mock.Mock(returncode=3, stderr="No GSC credentials")) as run:
            self.assertEqual(orch.run_gsc_refresh(),
                             {"search": "no-credentials", "coverage": "no-credentials"})
            self.assertEqual(run.call_count, 1)                    # no second doomed attempt
        timeout = orch.subprocess.TimeoutExpired(cmd="x", timeout=1)
        with mock.patch.object(orch, "REPO_ROOT", REPO), contextlib.redirect_stdout(None), \
                mock.patch.object(orch.subprocess, "run", side_effect=timeout):
            self.assertEqual(orch.run_gsc_refresh(), {"search": "timeout", "coverage": "timeout"})

    def test_feed_status_reaches_the_engine_as_reason_codes(self):
        feed = se.detect_feed({"GSC_TOKEN_JSON": " ", "PI_GSC_REFRESH":
                               json.dumps({"search": "auth-failed", "coverage": "ok", "extra": "x"})})
        self.assertEqual(feed, {"credentials": "none",
                                "refresh": {"search": "auth-failed", "coverage": "ok"}})
        self.assertEqual(se.detect_feed({"GSC_TOKEN_JSON": "{}"})["credentials"], "env-token")
        self.assertEqual(se.detect_feed({"PI_GSC_REFRESH": "not json"}), {"credentials": "none"})
        self.assertIn("rejected the stored token", se.feed_cause(feed))
        self.assertEqual(se.feed_cause({"credentials": "env-token", "refresh": {"search": "ok"}}), "")


class HealthGate(unittest.TestCase):
    def _run(self, argv):
        with mock.patch.object(sys, "argv", ["strategy_engine.py", *argv]), \
                contextlib.redirect_stdout(None), self.assertRaises(SystemExit) as exit_:
            se.main()
        return exit_.exception.code

    def test_exit_code_tells_a_monitor_the_loop_is_not_healthy(self):
        with _sandbox(**STALE):
            self.assertEqual(self._run(["--health", "--date", "2026-11-25"]), 1)     # degraded
        with _sandbox(**FRESH):
            self.assertEqual(self._run(["--health", "--date", "2026-11-25"]), 0)
            (se.SNAPSHOT_DIR / "2026-11-20.json").write_text("{}")
            self.assertEqual(self._run(["--health", "--date", "2026-11-25"]), 2)     # stalled

    def test_alert_names_the_fix_and_is_raised_once(self):
        import alert
        with _sandbox(**STALE):
            state = se.build_state(TODAY, NO_CREDENTIALS)
            title, body = se.health_alert(state)
            with mock.patch.object(alert, "emit_alert") as emit, \
                    mock.patch.dict("os.environ", {"PI_GSC_REFRESH": json.dumps(NO_CREDENTIALS["refresh"])}):
                self._run(["--health", "--alert", "--date", "2026-11-25"])
        self.assertIn("degraded", title)
        for needle in ("GSC_TOKEN_JSON", "ops/gsc-auth/README.md", "gsc-search-analytics.py",
                       "withheld from the commissioning queue"):
            self.assertIn(needle, body)
        self.assertNotIn(EM_DASH, title + body)
        emit.assert_called_once()
        self.assertEqual(emit.call_args.kwargs["dedup_key"], "strategy-loop-health")
        self.assertTrue(emit.call_args.kwargs["quiet_reuse"])

    def test_no_alert_when_healthy(self):
        import alert
        with _sandbox(**FRESH), mock.patch.object(alert, "emit_alert") as emit:
            self._run(["--health", "--alert", "--date", "2026-11-25"])
        emit.assert_not_called()

    def test_open_issue_is_reused_without_a_comment_a_day(self):
        import alert
        issue = {"number": 7, "html_url": "https://example.test/7", "body": "<!-- pi-alert:k -->"}
        calls = []

        def fake(method, url, token, payload=None):
            calls.append((method, url))
            return [issue] if method == "GET" else {"html_url": "https://example.test/new"}
        env = {"GITHUB_TOKEN": "t", "GITHUB_REPOSITORY": "o/r"}
        with mock.patch.dict("os.environ", env), mock.patch.object(alert, "_gh_request", side_effect=fake):
            self.assertEqual(alert.open_or_reuse_issue("t", "b", "k", quiet_reuse=True), issue["html_url"])
            self.assertEqual([m for m, _ in calls], ["GET"])                 # no comment posted
            alert.open_or_reuse_issue("t", "b", "k")
            self.assertEqual([m for m, _ in calls], ["GET", "GET", "POST"])  # default still comments


class StrategyHouseStyle(unittest.TestCase):
    """No em-dashes on any surface, including the ones this engine writes."""

    def test_brief_and_state_carry_no_em_dash(self):
        events = dict(EVENTS, **{"dashed.json": {
            "slug": "dashed", "title": f"Twilight Concert {EM_DASH} Summer Series",
            "startDate": "2026-12-19", "recurrence": "one-off", "freePaid": "Paid"}})
        for inputs in (FRESH, STALE):
            with _sandbox(events=events, **inputs):
                state = se.build_state(TODAY, NO_CREDENTIALS)
                md = se.render_markdown(state)
            self.assertNotIn(EM_DASH, md)
            self.assertNotIn(EM_DASH, json.dumps(state, ensure_ascii=False))
            self.assertIn("Twilight Concert - Summer Series", md)

    def test_feed_reports_carry_no_em_dash(self):
        rows = QUERY_ROWS + [_row(f"red hill {EM_DASH} cheese", 9, 6.0)]
        pages = analytics.aggregate_pages(PAGE_ROWS)
        report = analytics.build_report(pages, rows, analytics.property_totals([], pages), {},
                                        "2026-10-26", "2026-11-22", "2026-11-22", "now")
        self.assertNotIn(EM_DASH, report)
        self.assertNotIn(EM_DASH, _coverage_report("2026-11-25"))


if __name__ == "__main__":
    verbosity = 1 if "--quiet" in sys.argv else 2
    argv = [a for a in sys.argv if a != "--quiet"]
    unittest.main(argv=argv, verbosity=verbosity)
