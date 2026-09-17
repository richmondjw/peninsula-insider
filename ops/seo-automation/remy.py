#!/usr/bin/env python3
"""Bounded Remy CLI for the PI GitHub SEO worker; uses existing gh authentication."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
from urllib.parse import urlparse

REPO = "richmondjw/peninsula-insider"
WORKFLOW = "seo-audit.yml"
ACTIVE = {"queued", "in_progress", "requested", "pending", "waiting"}


def gh(*args):
    result = subprocess.run(["gh", *args, "--repo", REPO], capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError(result.stderr.strip()[:1500])
    return result.stdout


def runs():
    return json.loads(gh("run", "list", "--workflow", WORKFLOW, "--branch", "main", "--limit", "15", "--json", "databaseId,status,conclusion,createdAt,headSha,url,event"))


def report(run_id, cache):
    run = json.loads(gh("run", "view", str(run_id), "--json", "databaseId,attempt,status,conclusion,createdAt,headSha,url,workflowName"))
    if run["workflowName"] not in {"SEO Audit", "Build and Deploy — Peninsula Insider"}:
        raise RuntimeError("Run is not a PI SEO workflow")
    if run["status"] != "completed":
        return {"run": run, "state": "pending", "summary": None}
    # GitHub reruns retain run ID but replace evidence. Never serve a prior attempt.
    attempt = int(run["attempt"])
    destination = cache / str(run_id) / str(attempt)
    if not destination.exists():
        destination.mkdir(parents=True, mode=0o700)
        try:
            gh("run", "download", str(run_id), "--pattern", f"seo-*-{run_id}-{attempt}", "--dir", str(destination))
        except Exception:
            # Preserve partial data for inspection; no success marker is created.
            raise
        (destination / "download.complete").write_text("complete\n")
    if not (destination / "download.complete").exists():
        raise RuntimeError(f"Incomplete artifact download at {destination}; inspect before retry")
    candidates = list(destination.glob("**/summary.json"))
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one audit summary, found {len(candidates)}; workflow may have failed before collection")
    raw = candidates[0].read_bytes()
    summary = json.loads(raw)
    if summary.get("schemaVersion") != 1 or summary.get("status") not in {"passed", "failed"}:
        raise RuntimeError("Invalid audit summary")
    return {"run": run, "state": "available", "summary": summary, "artifact": str(candidates[0]), "sha256": hashlib.sha256(raw).hexdigest(), "searchPerformance": "Use Remy's existing Search Console connector; crawler/Lighthouse results are not rankings or traffic."}


def compare(before, after):
    for evidence in (before, after):
        if evidence.get("state") != "available":
            raise RuntimeError("Both runs must have completed reports")
        if evidence["summary"]["status"] != "passed":
            raise RuntimeError("A failed run is diagnostic evidence, not a valid improvement baseline")
    first, second = before["summary"], after["summary"]
    if first["target"] != second["target"] or first["profile"] != second["profile"] or first["tools"] != second["tools"] or first.get("policySha256") != second.get("policySha256"):
        raise RuntimeError("Compare matching target, profile, policy and tool versions only")
    def medians(summary):
        grouped = {}
        for row in summary["lighthouse"]:
            for category, score in row["categories"].items():
                if score is not None:
                    grouped.setdefault((urlparse(row["url"]).path, category), []).append(score)
        return {key: statistics.median(values) for key, values in grouped.items()}
    old, new = medians(first), medians(second)
    if old.keys() != new.keys():
        raise RuntimeError("Lighthouse coverage changed; direct comparison is invalid")
    return {"before": before["run"]["url"], "after": after["run"]["url"], "changes": [{"path": key[0], "category": key[1], "before": old[key], "after": new[key], "delta": round(new[key] - old[key], 4)} for key in sorted(old)], "interpretation": "Technical observations only. Check source/deployment and lab variability. Assess GSC outcomes after recrawl over 28-56 days; do not infer causality from low-volume daily changes."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path(os.environ.get("PI_SEO_CACHE", Path.home() / ".cache/pi-seo")))
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("status")
    start = commands.add_parser("run")
    start.add_argument("--profile", choices=["daily", "weekly"], default="daily")
    get = commands.add_parser("report")
    get.add_argument("run_id", type=int)
    diff = commands.add_parser("compare")
    diff.add_argument("before", type=int)
    diff.add_argument("after", type=int)
    args = parser.parse_args()
    if args.command == "status":
        result = {"repository": REPO, "workflow": WORKFLOW, "runs": runs()}
    elif args.command == "run":
        active = [run for run in runs() if run["status"] in ACTIVE]
        if active:
            result = {"submitted": False, "reason": "An audit is already queued or running", "runs": active}
        else:
            gh("workflow", "run", WORKFLOW, "--ref", "main", "-f", f"profile={args.profile}")
            result = {"submitted": True, "submittedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "profile": args.profile, "next": "Use status to obtain the provider run ID; submission is not completion."}
    elif args.command == "report":
        result = report(args.run_id, args.cache)
    else:
        result = compare(report(args.before, args.cache), report(args.after, args.cache))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
