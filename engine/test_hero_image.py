#!/usr/bin/env python3
"""Dependency-free regression tests for hero_image: licensed photographs of the
pick itself beat stand-ins, galleries join the pool only when verified, and a
stamped hero keeps its caption and provenance."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from datetime import date
from pathlib import Path

import hero_image

VV_REF = {
    "alt": "Dining room at Trofeo Estate",
    "credit": "Courtesy of Visit Victoria",
    "license": "visit-victoria",
    "caption": "Trofeo Estate, Dromana, Mornington Peninsula.",
    "depictionStatus": "actual",
    "sourceUrl": "Victoria Content Hub asset 169287, downloaded 2026-09-28",
    "permission": "Licensed at download (2026-09-28).",
    "permittedUses": ["website", "social"],
    "rightsHolder": "Visit Victoria",
    "rightsEstablishedOn": "2026-09-29",
    "rightsStatus": "recorded",
    "provenanceReview": "verified",
}

ARTICLE = """---
title: "Insider Picks: 1 October 2026"
heroImage:
  src: "/images/sourced/placeholder.webp"
  alt: "placeholder"
  credit: "Peninsula Insider"
  license: "other-licensed"
publishedAt: 2026-10-01
---

## EAT - Trofeo Estate, Dromana

Lunch among the amphorae.
"""


class HeroImageTests(unittest.TestCase):
    def setUp(self):
        # A three-file fixture is always "starved"; never write a real alert.
        self._alert = os.environ.get("PI_HERO_COVERAGE_ALERT")
        os.environ["PI_HERO_COVERAGE_ALERT"] = "0"
        self.tmp = tempfile.TemporaryDirectory()
        root = self.root = Path(self.tmp.name)
        (root / hero_image.VENUES).mkdir(parents=True)
        (root / hero_image.EXPERIENCES).mkdir(parents=True)
        (root / hero_image.ARTICLES).mkdir(parents=True)
        for rel in ("images/sourced/place-dromana-01.webp",
                    "images/visit-victoria/vv-169287-trofeo-estate.webp",
                    "images/visit-victoria/vv-169294-trofeo-estate.webp"):
            f = root / hero_image.PUBLIC / rel
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(b"x")
        self.record = {
            "slug": "trofeo-estate", "name": "Trofeo Estate", "type": "winery", "place": "dromana",
            "heroImage": {"src": "/images/sourced/place-dromana-01.webp", "alt": "A pier",
                          "credit": "Peninsula Insider", "license": "other-licensed",
                          "depictionStatus": "illustrative"},
            "gallery": [dict(VV_REF, src="/images/visit-victoria/vv-169287-trofeo-estate.webp")],
        }
        self._write_record()
        self.article = root / hero_image.ARTICLES / "2026-10-01-insider-picks.md"
        self.article.write_text(ARTICLE)

    def tearDown(self):
        self.tmp.cleanup()
        if self._alert is None:
            os.environ.pop("PI_HERO_COVERAGE_ALERT", None)
        else:
            os.environ["PI_HERO_COVERAGE_ALERT"] = self._alert

    def _write_record(self):
        (self.root / hero_image.VENUES / "trofeo-estate.json").write_text(json.dumps(self.record))

    def test_licensed_photograph_of_the_pick_beats_its_stand_in(self):
        res = hero_image.select(self.article, root=self.root, today=date(2026, 10, 1))
        self.assertTrue(res["ok"])
        self.assertEqual(res["src"], "/images/visit-victoria/vv-169287-trofeo-estate.webp")
        self.assertIn("licensed photograph of the pick itself", res["reason"])

    def test_unverified_gallery_image_never_enters_the_pool(self):
        self.record["gallery"] = [dict(VV_REF, src="/images/visit-victoria/vv-169294-trofeo-estate.webp",
                                       provenanceReview="unreviewed")]
        self._write_record()
        res = hero_image.select(self.article, root=self.root, today=date(2026, 10, 1))
        self.assertEqual(res["src"], "/images/sourced/place-dromana-01.webp")

    def test_stamp_carries_caption_and_provenance(self):
        hero_image.stamp(self.article, root=self.root, today=date(2026, 10, 1))
        fm, _ = hero_image.split_frontmatter(self.article.read_text())
        self.assertIn('caption: "Trofeo Estate, Dromana, Mornington Peninsula."', fm)
        self.assertIn('license: "visit-victoria"', fm)
        self.assertIn('rightsStatus: "recorded"', fm)
        self.assertIn('  permittedUses:\n    - "website"\n    - "social"\n', fm)
        self.assertNotIn("depictionStatus", fm)
        self.assertEqual(fm.count("heroImage:"), 1)
        self.assertIn('title: "Insider Picks: 1 October 2026"', fm)
        self.assertIn("publishedAt: 2026-10-01", fm)


if __name__ == "__main__":
    unittest.main()
