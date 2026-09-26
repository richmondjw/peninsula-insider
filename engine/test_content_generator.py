#!/usr/bin/env python3
"""Focused regression tests for content_generator rotation safeguards."""

from __future__ import annotations

import unittest
from unittest.mock import patch
import builtins
from datetime import date
from pathlib import Path

import content_generator
import recency


BAD_ARTICLE = """---
title: "Insider Picks — 25 September"
dek: "The Continental at warm dusk, a coastal loop, and a market run before lunch."
author: "editorial"
publishedAt: 2026-09-25
format: "insider-edit"
tags: [insider-picks, spring]
---

**The Continental**

Shoulder-season Sorrento light, rooftop drinks, and a village-first plan.
"""

GOOD_ARTICLE = """---
title: "Insider Picks — 25 September"
dek: "Bass & Flinders Distillery for a spring tasting flight, a coastal loop, and a market run before lunch."
author: "editorial"
publishedAt: 2026-09-25
format: "insider-edit"
tags: [insider-picks, spring]
---

**Bass & Flinders Distillery**

Spring light, a tighter cellar-door stop, and a venue that clears today's rotation.
"""


class ContentGeneratorRotationRepairTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        repo_root = Path(__file__).resolve().parent.parent
        cls.rotation = recency.build_ledger(repo_root, date.fromisoformat("2026-09-25"))

    def test_repairs_blocked_venue_with_single_revision(self):
        prompts: list[str] = []

        def fake_complete(prompt: str, *, system: str, max_tokens: int) -> str:
            prompts.append(prompt)
            self.assertIn("REVISION REQUIRED", prompt)
            self.assertIn("The Continental", prompt)
            return f"```markdown\n{GOOD_ARTICLE}```"

        repaired = content_generator._repair_rotation_violations(
            BAD_ARTICLE,
            date_str="2026-09-25",
            prompt="Base prompt",
            rotation=self.rotation,
            llm_complete=fake_complete,
        )

        self.assertEqual(len(prompts), 1)
        self.assertNotIn("```", repaired)
        self.assertFalse(content_generator._rotation_failures(repaired, "2026-09-25"))

    def test_skips_revision_when_article_already_clears_rotation(self):
        def fail_complete(*_args, **_kwargs):
            self.fail("llm_complete should not be called for a clean draft")

        repaired = content_generator._repair_rotation_violations(
            GOOD_ARTICLE,
            date_str="2026-09-25",
            prompt="Base prompt",
            rotation=self.rotation,
            llm_complete=fail_complete,
        )

        self.assertEqual(repaired, GOOD_ARTICLE)

    def test_rejects_revision_that_still_violates_rotation(self):
        def fake_complete(*_args, **_kwargs) -> str:
            return BAD_ARTICLE

        repaired = content_generator._repair_rotation_violations(
            BAD_ARTICLE,
            date_str="2026-09-25",
            prompt="Base prompt",
            rotation=self.rotation,
            llm_complete=fake_complete,
        )

        self.assertEqual(repaired, BAD_ARTICLE)

    def test_rotation_failures_falls_back_when_verify_gate_import_is_unavailable(self):
        original_import = builtins.__import__

        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == "verify_gate":
                raise ImportError("verify_gate unavailable")
            return original_import(name, globals, locals, fromlist, level)

        with patch("builtins.__import__", side_effect=guarded_import):
            failures = content_generator._rotation_failures(BAD_ARTICLE, "2026-09-25")

        self.assertTrue(any("The Continental" in failure for failure in failures))


if __name__ == "__main__":
    unittest.main()
