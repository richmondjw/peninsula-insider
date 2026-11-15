"""Exercise the actual freshness workflow run block under GitHub's Bash -e."""
from __future__ import annotations

import os
import re
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/publication-freshness.yml"


def retry_script():
    workflow = WORKFLOW.read_text(encoding="utf-8")
    step = workflow.split("- name: Verify current source and live Insider Picks page", 1)[1]
    block = step.split("        run: |\n", 1)[1].split("\n      - name:", 1)[0]
    return textwrap.dedent(block)


class PublicationFreshnessRetryTest(unittest.TestCase):
    def run_sequence(self, statuses, expected_status, attempts, sleeps, message):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            probe = root / "python"
            probe.write_text("""#!/usr/bin/env bash
count=0
if [ -f "$ATTEMPT_LOG" ]; then read -r count < "$ATTEMPT_LOG"; fi
count=$((count + 1))
printf '%s\\n' "$count" > "$ATTEMPT_LOG"
read -r -a codes <<< "$FRESHNESS_EXIT_CODES"
exit "${codes[count-1]:-99}"
""", encoding="utf-8")
            sleep = root / "sleep"
            sleep.write_text("#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" >> \"$SLEEP_LOG\"\n",
                             encoding="utf-8")
            probe.chmod(0o755)
            sleep.chmod(0o755)
            env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ["PATH"],
                       ATTEMPT_LOG=str(root / "attempts"), SLEEP_LOG=str(root / "sleeps"),
                       FRESHNESS_EXIT_CODES=" ".join(map(str, statuses)))
            result = subprocess.run(["bash", "-e", "-c", retry_script()], env=env,
                                    cwd=ROOT, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, expected_status, result.stdout + result.stderr)
            self.assertEqual(int((root / "attempts").read_text()), attempts)
            waits = (root / "sleeps").read_text().splitlines() if (root / "sleeps").exists() else []
            self.assertEqual(waits, ["300"] * sleeps)
            self.assertIn(message, result.stdout)
            self.assertEqual(len(re.findall(r"Freshness check attempt", result.stdout)), attempts)

    def test_immediate_success(self):
        self.run_sequence([0], 0, 1, 0, "passed on attempt 1")

    def test_transient_then_success(self):
        self.run_sequence([1, 0], 0, 2, 1, "passed on attempt 2")

    def test_permanent_transient_exhaustion(self):
        self.run_sequence([1, 1, 1], 1, 3, 2, "persists after 3 attempts")

    def test_fatal_source_failure(self):
        self.run_sequence([2], 2, 1, 0, "Source record failure (exit 2)")

    def test_unexpected_failure_is_not_retried(self):
        self.run_sequence([3], 3, 1, 0, "Unexpected freshness failure (exit 3)")


if __name__ == "__main__":
    unittest.main()
