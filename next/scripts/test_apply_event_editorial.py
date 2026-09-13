#!/usr/bin/env python3
"""Regression tests for apply-event-editorial.

The first test in this file is the whole of PI-004's first deliverable: apply
an editorial field to a record carrying a known old check date, and assert the
check date did not move. Until 2026-09-13 the script stamped it to today on
every run, so applying a blurb silently republished the claim "we checked this
event today". Nobody had.

Dependency-free, and it never touches the real corpus: every case runs against
a temporary events directory passed through the script's --events-dir
test-harness override.

Run from the repo root or from next/:

    python next/scripts/test_apply_event_editorial.py

The module under test is hyphenated (it is a CLI entry point, not a package),
so it is loaded by path rather than imported by name.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

_MODULE_PATH = Path(__file__).resolve().parent / "apply-event-editorial.py"
_spec = importlib.util.spec_from_file_location("apply_event_editorial", _MODULE_PATH)
apply_event_editorial = importlib.util.module_from_spec(_spec)
# @dataclass resolves annotations through sys.modules, so the module has to be
# registered before it is executed.
sys.modules[_spec.name] = apply_event_editorial
_spec.loader.exec_module(apply_event_editorial)

OLD_CHECK_DATE = "2026-01-05"
NEW_BLURB = "A new blurb that the editor wrote today."


def event(**overrides) -> dict:
    """A minimal event record carrying a check date that is comfortably old."""
    base = {
        "slug": "a-market",
        "title": "A Market",
        "summary": "A market on the Peninsula.",
        "category": "market",
        "status": "published",
        "startDate": "2026-12-05",
        "endDate": "2026-12-05",
        "venueName": "Somewhere Hall",
        "lastCheckedDate": OLD_CHECK_DATE,
        "whyWeCare": "The old blurb, which this run replaces.",
    }
    base.update(overrides)
    return base


class ApplyEditorialTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.events = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def write(self, record: dict) -> Path:
        path = self.events / (record["slug"] + ".json")
        path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        return path

    def read(self, slug: str) -> dict:
        return json.loads((self.events / (slug + ".json")).read_text(encoding="utf-8"))

    def apply(self, slug: str, editorial: dict):
        return apply_event_editorial.apply_to_event(
            slug, editorial, dry_run=False, events_dir=self.events
        )

    # -- the rule ---------------------------------------------------------

    def test_applying_editorial_copy_does_not_advance_the_check_date(self):
        """Applying a blurb is not a factual check, so the date must not move."""
        self.write(event())

        report = self.apply("a-market", {"whyWeCare": NEW_BLURB})

        self.assertTrue(report.ok, report.errors)
        after = self.read("a-market")
        self.assertEqual(after["whyWeCare"], NEW_BLURB)
        self.assertEqual(after["lastCheckedDate"], OLD_CHECK_DATE)

    def test_a_record_with_no_check_date_does_not_gain_one(self):
        """The absence of a check date is information. Do not fill it in."""
        record = event()
        del record["lastCheckedDate"]
        self.write(record)

        report = self.apply("a-market", {"whyWeCare": NEW_BLURB})

        self.assertTrue(report.ok, report.errors)
        self.assertNotIn("lastCheckedDate", self.read("a-market"))

    def test_the_script_reads_no_wall_clock(self):
        """A stamp cannot come back in under a different spelling of today()."""
        source = _MODULE_PATH.read_text(encoding="utf-8")
        # Comments are allowed to name the thing they forbid.
        code = [line for line in source.splitlines() if not line.lstrip().startswith("#")]
        code = " ".join(code)
        for forbidden in ("date.today(", "datetime.now(", "datetime.today(", "time.time("):
            self.assertNotIn(forbidden, code, forbidden + " is back in the publish path")

    # -- visits -----------------------------------------------------------

    def test_an_undocumented_visit_is_refused(self):
        self.write(event())

        report = self.apply("a-market", {"editorVisited": True})

        self.assertFalse(report.ok)
        self.assertTrue(any("editorialProvenance.visit" in e for e in report.errors), report.errors)
        self.assertNotIn("editorVisited", self.read("a-market"))

    def test_a_documented_visit_is_applied(self):
        self.write(event(editorialProvenance={"method": "visited", "visit": {"occurredOn": "2026-03-02"}}))

        report = self.apply("a-market", {"editorVisited": True})

        self.assertTrue(report.ok, report.errors)
        after = self.read("a-market")
        self.assertTrue(after["editorVisited"])
        self.assertEqual(after["lastCheckedDate"], OLD_CHECK_DATE)


if __name__ == "__main__":
    unittest.main()
