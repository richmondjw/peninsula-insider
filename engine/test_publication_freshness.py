#!/usr/bin/env python3
"""Small, dependency-free regression tests for publication_freshness."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import publication_freshness


ARTICLE = """---
title: \"Insider Picks: 6 August 2026\"
publishedAt: 2026-08-06
lastVerified: 2026-08-06
status: \"published\"
---

""" + ("A considered, verified local recommendation. " * 70)

# Exactly 250 words in the body (each token is one word).
_250_WORD_BODY = " ".join(["word"] * 250)
ARTICLE_250_WORDS = """---
title: \"Insider Picks: 6 August 2026\"
publishedAt: 2026-08-06
lastVerified: 2026-08-06
status: \"published\"
---

""" + _250_WORD_BODY


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

    def test_rejects_missing_last_verified(self):
        """An article without lastVerified must fail the source check."""
        article_no_lv = ARTICLE.replace("lastVerified: 2026-08-06\n", "")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(article_no_lv, encoding="utf-8")
            failures = publication_freshness.source_failures(path, "2026-08-06")
            self.assertTrue(any("lastVerified" in f for f in failures),
                            f"Expected lastVerified failure, got: {failures}")

    def test_rejects_stale_last_verified(self):
        """lastVerified from yesterday must fail even when publishedAt is today."""
        stale = ARTICLE.replace("lastVerified: 2026-08-06", "lastVerified: 2026-08-05")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(stale, encoding="utf-8")
            failures = publication_freshness.source_failures(path, "2026-08-06")
            self.assertTrue(any("lastVerified" in f for f in failures),
                            f"Expected lastVerified failure, got: {failures}")

    def test_accepts_article_at_exactly_250_words(self):
        """Body at exactly the 250-word floor must pass."""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(ARTICLE_250_WORDS, encoding="utf-8")
            failures = publication_freshness.source_failures(path, "2026-08-06")
            self.assertFalse(any("250-word" in f for f in failures),
                             f"Unexpected word-count failure: {failures}")

    def test_rejects_article_under_250_words(self):
        """Body one word short of the floor must fail."""
        short_body = " ".join(["word"] * 249)
        article_short = """---
title: \"Insider Picks: 6 August 2026\"
publishedAt: 2026-08-06
lastVerified: 2026-08-06
status: \"published\"
---

""" + short_body
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(article_short, encoding="utf-8")
            failures = publication_freshness.source_failures(path, "2026-08-06")
            self.assertTrue(any("250-word" in f for f in failures),
                            f"Expected word-count failure, got: {failures}")

    def test_source_failure_exits_with_code_2(self):
        """main() must return 2 when the source record is missing."""
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "insider-picks-2026-08-06.md"
            with patch("sys.argv", ["publication_freshness.py",
                                    "--expected-date", "2026-08-06",
                                    "--article", str(missing)]):
                self.assertEqual(publication_freshness.main(), 2)

    def test_live_only_failure_exits_with_code_1(self):
        """main() must return 1 when source passes but the live page is unavailable."""
        import urllib.error
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "insider-picks-2026-08-06.md"
            path.write_text(ARTICLE, encoding="utf-8")
            with patch("sys.argv", ["publication_freshness.py",
                                    "--expected-date", "2026-08-06",
                                    "--article", str(path),
                                    "--url", "https://example.com/insider-picks-2026-08-06/"]):
                with patch("publication_freshness.live_failure",
                           return_value="could not verify live page: HTTP Error 404"):
                    self.assertEqual(publication_freshness.main(), 1)


if __name__ == "__main__":
    unittest.main()
