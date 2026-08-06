#!/usr/bin/env python3
"""Small, dependency-free regression tests for publication_freshness."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import publication_freshness


ARTICLE = """---
title: \"Insider Picks: 6 August 2026\"
publishedAt: 2026-08-06
lastVerified: 2026-08-06
status: \"published\"
---

""" + ("A considered, verified local recommendation. " * 70)


class PublicationFreshnessTest(unittest.TestCase):
    def test_accepts_a_current_published_article(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(ARTICLE, encoding="utf-8")
            self.assertEqual(publication_freshness.source_failures(path, "2026-08-06"), [])

    def test_rejects_stale_or_unpublished_article(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(ARTICLE.replace("2026-08-06", "2026-08-02").replace('"published"', '"draft"'),
                            encoding="utf-8")
            failures = publication_freshness.source_failures(path, "2026-08-06")
            self.assertTrue(any("publishedAt" in failure for failure in failures))
            self.assertTrue(any("status" in failure for failure in failures))


if __name__ == "__main__":
    unittest.main()
