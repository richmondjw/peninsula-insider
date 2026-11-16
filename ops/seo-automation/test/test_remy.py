import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import json
import tempfile

spec = importlib.util.spec_from_file_location("remy", Path(__file__).parents[1] / "remy.py")
remy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(remy)


def evidence(score=0.9, status="passed", profile="daily"):
    return {"state": "available", "run": {"url": "https://github.com/example/run"}, "summary": {"status": status, "target": "live", "profile": profile, "tools": {"lighthouseCI": "0.15.1"}, "lighthouse": [{"url": "https://peninsulainsider.com.au/", "categories": {"seo": score}}]}}


class ComparisonTests(unittest.TestCase):
    def test_failed_and_mismatched_runs_cannot_be_improvement_evidence(self):
        with self.assertRaises(RuntimeError):
            remy.compare(evidence(), evidence(status="failed"))
        with self.assertRaises(RuntimeError):
            remy.compare(evidence(), evidence(profile="weekly"))
        with self.assertRaises(RuntimeError):
            remy.compare({"state": "pending"}, evidence())

    def test_delta_is_technical_observation(self):
        result = remy.compare(evidence(0.9), evidence(1.0))
        self.assertEqual(result["changes"][0]["delta"], 0.1)
        self.assertIn("do not infer causality", result["interpretation"])

    def test_new_attempt_never_reuses_previous_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            prior = cache / "42" / "1"
            prior.mkdir(parents=True)
            (prior / "download.complete").write_text("complete")
            (prior / "summary.json").write_text(json.dumps({"schemaVersion": 1, "status": "passed", "id": "old"}))
            def fake_gh(*args):
                if args[1] == "view":
                    return json.dumps({"databaseId": 42, "attempt": 2, "status": "completed", "workflowName": "SEO Audit"})
                self.assertIn("seo-*-42-2", args)
                target = Path(args[args.index("--dir") + 1])
                (target / "summary.json").write_text(json.dumps({"schemaVersion": 1, "status": "failed", "id": "new"}))
                return ""
            with patch.object(remy, "gh", side_effect=fake_gh):
                self.assertEqual(remy.report(42, cache)["summary"]["id"], "new")


if __name__ == "__main__":
    unittest.main()
