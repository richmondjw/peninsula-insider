#!/usr/bin/env python3
"""Regression test: consecutive sitemap snapshots retain scope-review history."""
from __future__ import annotations

import csv
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("generate-register.py")
HOST = "https://peninsulainsider.com.au"
FIELDS = [
    "url", "path", "tier", "family", "state", "baseline_score",
    "current_score", "hard_gate", "last_reviewed", "next_action",
]


def row(path: str, tier: str, family: str, state: str) -> dict[str, str]:
    return {
        "url": HOST + path, "path": path, "tier": tier, "family": family,
        "state": state, "baseline_score": "", "current_score": "",
        "hard_gate": "", "last_reviewed": "", "next_action": "Review",
    }


def write_rows(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def read_rows(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {entry["url"]: entry for entry in csv.DictReader(handle)}


def write_sitemap(path: Path, urls: list[str]) -> None:
    items = "".join(f"<url><loc>{HOST}{url}</loc></url>" for url in urls)
    path.write_text(f"<?xml version='1.0'?><urlset>{items}</urlset>", encoding="utf-8")


class RegisterReconciliationTest(unittest.TestCase):
    def test_consecutive_snapshots_preserve_and_reactivate_removed_urls(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            sitemap = root / "sitemap.xml"
            write_rows(root / "register.csv", [
                row("/eat/", "T1", "hub", "in-remediation"),
                row("/wine/old-producer/", "T2", "wine", "unscored"),
            ])
            write_rows(root / "removed.csv", [
                row("/stay/older-retired/", "T2", "stay", "scope-review"),
            ])

            def generate(urls: list[str]) -> None:
                write_sitemap(sitemap, urls)
                subprocess.run(
                    [sys.executable, str(SCRIPT), "--sitemap", str(sitemap),
                     "--out-dir", str(root)],
                    check=True, capture_output=True, text=True,
                )

            generate(["/eat/", "/journal/new-story/"])
            active = read_rows(root / "register.csv")
            removed = read_rows(root / "removed.csv")
            self.assertEqual(set(active), {HOST + "/eat/", HOST + "/journal/new-story/"})
            self.assertEqual(active[HOST + "/eat/"]["state"], "in-remediation")
            self.assertEqual(active[HOST + "/journal/new-story/"]["state"], "unscored")
            self.assertEqual(set(removed), {
                HOST + "/stay/older-retired/", HOST + "/wine/old-producer/",
            })

            generate(["/eat/", "/journal/new-story/"])
            self.assertEqual(set(read_rows(root / "removed.csv")), set(removed))

            generate(["/eat/", "/journal/new-story/", "/stay/older-retired/"])
            active = read_rows(root / "register.csv")
            removed = read_rows(root / "removed.csv")
            self.assertEqual(active[HOST + "/stay/older-retired/"]["state"], "unscored")
            self.assertEqual(set(removed), {HOST + "/wine/old-producer/"})


if __name__ == "__main__":
    unittest.main()
