#!/usr/bin/env python3
"""
pi_draw.py - run (or rehearse) the "Where in the Peninsula is PI?" prize draw.

The ledger is pi.draw_entries in Supabase (service role only). A draw is one
weighted random pick over all valid entries in a window, recorded once in
pi.draw_results with the seed used, so anyone can re-run it and get the same
winner.

    # Rehearsal (default): prints the pool and the would-be winner, writes nothing.
    python ops/scripts/pi_draw.py --period 2026-10

    # The real draw: records the result. Refuses to run twice for one period.
    python ops/scripts/pi_draw.py --period 2026-10 --commit \
        --partner "Doot Doot Doot, Jackalope" --prize "$250 to dine"

    # Redraw (winner unreachable after 14 days): excludes the first winner.
    python ops/scripts/pi_draw.py --period 2026-10 --commit --redraw --exclude <entry uuid>

Env: SUPABASE_URL (default: the PI project) and SUPABASE_SERVICE_ROLE_KEY.
Nothing here touches Beehiiv; contact the winner by hand, then announce.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DEFAULT_URL = "https://tjjhpvslpysfklwpqmgz.supabase.co"


def rest(method: str, path: str, body=None, prefer: str | None = None):
    url = os.environ.get("SUPABASE_URL", DEFAULT_URL).rstrip("/") + "/rest/v1/" + path
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        sys.exit("SUPABASE_SERVICE_ROLE_KEY is not set (service role, never the anon key).")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept-Profile": "pi",
        "Content-Profile": "pi",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> {e.code}: {e.read().decode()[:400]}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Run the PI prize draw for one window.")
    ap.add_argument("--period", required=True, help="draw window key, e.g. 2026-10")
    ap.add_argument("--commit", action="store_true", help="record the result (default is a rehearsal)")
    ap.add_argument("--partner", default="Doot Doot Doot, Jackalope")
    ap.add_argument("--prize", default="$250 to dine")
    ap.add_argument("--redraw", action="store_true", help="replace an unclaimed result for this period")
    ap.add_argument("--exclude", action="append", default=[], help="entry uuid to exclude (repeatable)")
    ap.add_argument("--seed", help="override the seed (rehearsals only; the real draw derives it)")
    args = ap.parse_args()

    existing = rest("GET", f"draw_results?period=eq.{urllib.parse.quote(args.period)}&select=*")
    if existing and args.commit and not args.redraw:
        sys.exit(f"A result already exists for {args.period} (drawn {existing[0]['drawn_at']}). Use --redraw to replace it.")

    rows = rest(
        "GET",
        "draw_entries?select=id,email,first_name,case_id,entries,rank,seats,created_at"
        f"&period=eq.{urllib.parse.quote(args.period)}&consent_marketing=eq.true&order=created_at.asc",
    ) or []
    rows = [r for r in rows if r["id"] not in set(args.exclude)]
    if not rows:
        sys.exit(f"No eligible entries for {args.period}.")

    # One person, many rows: weight = total entries across their cases.
    people: dict[str, dict] = {}
    for r in rows:
        p = people.setdefault(r["email"], {"email": r["email"], "name": r["first_name"], "weight": 0, "rows": []})
        p["weight"] += int(r["entries"] or 1)
        p["rows"].append(r)
    pool = sorted(people.values(), key=lambda p: p["email"])
    total_entries = sum(p["weight"] for p in pool)

    # Seed: deterministic from the frozen pool (ids in order) plus the period,
    # so the draw is reproducible from the ledger alone. Recorded in draw_results.
    fingerprint = args.period + "|" + ",".join(sorted(r["id"] for r in rows))
    seed = args.seed if (args.seed and not args.commit) else hashlib.sha256(fingerprint.encode()).hexdigest()[:16]
    rng = random.Random(seed)
    winner = rng.choices(pool, weights=[p["weight"] for p in pool], k=1)[0]
    # Attribute the win to the person's earliest entry row.
    winner_row = sorted(winner["rows"], key=lambda r: r["created_at"])[0]

    print(f"Window {args.period}: {len(pool)} people, {total_entries} weighted entries, {len(rows)} rows")
    for p in pool:
        print(f"  {p['weight']:>3}  {p['name'] or ''} <{p['email']}>  cases {','.join(r['case_id'] for r in p['rows'])}")
    print(f"Seed {seed}")
    print(f"{'WINNER' if args.commit else 'Would win'}: {winner['name']} <{winner['email']}>  entry {winner_row['id']}")

    if not args.commit:
        print("Rehearsal only. Re-run with --commit to record.")
        return

    result = {
        "period": args.period,
        "partner": args.partner,
        "prize": args.prize,
        "seed": seed,
        "winner_entry": winner_row["id"],
        "total_entries": total_entries,
        "total_people": len(pool),
        "drawn_at": datetime.now(timezone.utc).isoformat(),
        "notes": ("redraw; excluded " + ", ".join(args.exclude)) if args.redraw else None,
    }
    if existing and args.redraw:
        rest("PATCH", f"draw_results?period=eq.{urllib.parse.quote(args.period)}", result, prefer="return=minimal")
    else:
        rest("POST", "draw_results", [result], prefer="return=minimal")
    print("Recorded in pi.draw_results. Contact the winner by email within two business days.")


if __name__ == "__main__":
    main()
