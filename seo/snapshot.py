#!/usr/bin/env python3
"""
Peninsula Insider — weekly DataForSEO ranking snapshot.

Writes seo/snapshots/YYYY-MM-DD.json and prints a human summary with deltas
against the most recent prior snapshot.

Why this exists: GSC only surfaces keywords that earned impressions in its
window, which hid ~95% of PI's ranking footprint (25 pages vs 533 keywords).
DataForSEO sees the whole index position set with no 2-3 day reporting lag,
so it is the only source that can answer "did positions actually move?" at
PI's current traffic volume. GSC remains the source for clicks, impressions,
indexation and crawl state — DataForSEO cannot see any of those.

Usage:
    python3 seo/snapshot.py [--date YYYY-MM-DD] [--dry-run]

Credentials: /home/node/.openclaw/credentials/dataforseo/env
             (DATAFORSEO_AUTH_B64, mode 600)

Cost: ~$0.29/run at current volumes (1 competitors_domain + 4 ranked_keywords).
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

API = "https://api.dataforseo.com/v3"
CRED = pathlib.Path("/home/node/.openclaw/credentials/dataforseo/env")
ROOT = pathlib.Path(__file__).resolve().parent
SNAP_DIR = ROOT / "snapshots"

TARGET = "peninsulainsider.com.au"

# Tracked rivals. visitmorningtonpeninsula.org is the real editorial
# competitor (441 shared keywords, owns the town-name cluster); the other two
# are the closest topical specialists.
RIVALS = [
    "visitmorningtonpeninsula.org",
    "theninch.com.au",
    "morningtonpeninsulawineries.com.au",
]

# The 37 towns PI has place pages for. This cluster is the strategic priority:
# VMP holds top-20 on 289 town-name keywords worth ~1.93M searches/month.
TOWNS = [
    "arthurs seat", "balnarring", "bittern", "blairgowrie", "boneo",
    "cape schanck", "capel sound", "crib point", "dromana", "fingal",
    "flinders", "hastings", "main ridge", "mccrae", "merricks",
    "merricks beach", "merricks north", "moorooduc", "mornington",
    "mount eliza", "mount martha", "mt martha", "point leo", "point nepean",
    "portsea", "red hill", "red hill south", "rosebud", "rye",
    "safety beach", "shoreham", "somers", "sorrento", "st andrews beach",
    "stony point", "tootgarook", "tuerong", "tyabb",
]

# Weather and tide terms are deliberately excluded from the town cluster.
# VMP ranks for ~96 of them (903k/mo combined) because Google surfaces a
# weather box; PI cannot win those and does not want the traffic.
CLUSTER_EXCLUDE = ("weather", "forecast", "tide", "temperature", "rainfall")


def auth() -> str:
    if os.environ.get("DATAFORSEO_AUTH_B64"):
        return os.environ["DATAFORSEO_AUTH_B64"]
    if not CRED.exists():
        sys.exit(f"missing credentials: {CRED}")
    for line in CRED.read_text().splitlines():
        if line.startswith("DATAFORSEO_AUTH_B64="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit(f"DATAFORSEO_AUTH_B64 not found in {CRED}")


def post(path: str, payload: list, token: str) -> dict:
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": "Basic " + token,
            "Content-Type": "application/json",
            # DataForSEO sits behind Cloudflare; the urllib default UA gets a
            # 1010 block, same trap as the Railway and Supabase mgmt APIs.
            "User-Agent": "curl/8.5.0",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def ranked(domain: str, token: str, max_pos: int = 100, limit: int = 1000) -> tuple[dict, float]:
    """Best position per keyword for a domain. Returns ({kw: {...}}, cost)."""
    payload = [{
        "target": domain,
        "location_name": "Australia",
        "language_name": "English",
        "limit": limit,
        "order_by": ["keyword_data.keyword_info.search_volume,desc"],
        "filters": [["ranked_serp_element.serp_item.rank_absolute", "<=", max_pos]],
        "item_types": ["organic"],
    }]
    d = post("/dataforseo_labs/google/ranked_keywords/live", payload, token)
    task = d["tasks"][0]
    if task.get("status_code") != 20000:
        raise RuntimeError(f"{domain}: {task.get('status_message')}")
    result = (task.get("result") or [{}])[0]
    out: dict[str, dict] = {}
    for item in result.get("items") or []:
        kw = item["keyword_data"]["keyword"]
        info = item["keyword_data"].get("keyword_info") or {}
        serp = item["ranked_serp_element"]["serp_item"]
        pos = serp["rank_absolute"]
        prev = out.get(kw)
        if prev and prev["pos"] <= pos:
            continue
        out[kw] = {
            "pos": pos,
            "volume": info.get("search_volume") or 0,
            "url": serp.get("relative_url") or "",
        }
    return out, float(d.get("cost") or 0)


def competitors(token: str, limit: int = 25) -> tuple[list, float]:
    payload = [{
        "target": TARGET,
        "location_name": "Australia",
        "language_name": "English",
        "limit": limit,
        "item_types": ["organic"],
    }]
    d = post("/dataforseo_labs/google/competitors_domain/live", payload, token)
    result = (d["tasks"][0].get("result") or [{}])[0]
    rows = []
    for item in result.get("items") or []:
        m = (item.get("metrics") or {}).get("organic") or {}
        rows.append({
            "domain": item["domain"],
            "intersections": item.get("intersections"),
            "keywords": m.get("count"),
            "etv": round(m.get("etv") or 0),
            "top10": (m.get("pos_1") or 0) + (m.get("pos_2_3") or 0) + (m.get("pos_4_10") or 0),
        })
    return rows, float(d.get("cost") or 0)


def in_town_cluster(kw: str) -> bool:
    k = kw.lower()
    if any(x in k for x in CLUSTER_EXCLUDE):
        return False
    return any(k == t or k.startswith(t + " ") or (" " + t) in k for t in TOWNS)


def buckets(rows: dict) -> dict:
    b = {"1-3": 0, "4-10": 0, "11-20": 0, "21-30": 0, "31-50": 0, "51-100": 0}
    for r in rows.values():
        p = r["pos"]
        if p <= 3: b["1-3"] += 1
        elif p <= 10: b["4-10"] += 1
        elif p <= 20: b["11-20"] += 1
        elif p <= 30: b["21-30"] += 1
        elif p <= 50: b["31-50"] += 1
        else: b["51-100"] += 1
    return b


def build(token: str, date: str) -> dict:
    cost = 0.0
    pi, c = ranked(TARGET, token); cost += c
    comp_rows, c = competitors(token); cost += c

    rivals: dict[str, dict] = {}
    for r in RIVALS:
        try:
            rows, c = ranked(r, token, max_pos=20)
            cost += c
            rivals[r] = rows
        except Exception as e:  # a rival failing must not lose the PI snapshot
            print(f"  warn: rival {r} failed: {e}", file=sys.stderr)

    vmp = rivals.get("visitmorningtonpeninsula.org", {})
    cluster_keys = {k for k in set(pi) | set(vmp) if in_town_cluster(k)}
    cluster = {
        k: {
            "volume": (pi.get(k) or vmp.get(k, {})).get("volume", 0),
            "pi": (pi.get(k) or {}).get("pos"),
            "vmp": (vmp.get(k) or {}).get("pos"),
            "url": (pi.get(k) or {}).get("url", ""),
        }
        for k in cluster_keys
    }

    striking = {
        k: v for k, v in pi.items()
        if 11 <= v["pos"] <= 30 and v["volume"] >= 100
    }

    return {
        "date": date,
        "target": TARGET,
        "location": "Australia",
        "cost_usd": round(cost, 4),
        "totals": {
            "keywords": len(pi),
            "etv": round(sum(v["volume"] for v in pi.values() if v["pos"] <= 10)),
            "buckets": buckets(pi),
        },
        "competitors": comp_rows,
        "town_cluster": {
            "keywords_tracked": len(cluster),
            "volume_total": sum(v["volume"] for v in cluster.values()),
            "pi_top10": sum(1 for v in cluster.values() if v["pi"] and v["pi"] <= 10),
            "pi_top30": sum(1 for v in cluster.values() if v["pi"] and v["pi"] <= 30),
            "vmp_top10": sum(1 for v in cluster.values() if v["vmp"] and v["vmp"] <= 10),
            "items": cluster,
        },
        "striking_distance": striking,
        "keywords": pi,
    }


def latest_prior(date: str) -> dict | None:
    if not SNAP_DIR.exists():
        return None
    prior = sorted(p for p in SNAP_DIR.glob("*.json") if p.stem < date)
    return json.loads(prior[-1].read_text()) if prior else None


def summarise(snap: dict, prior: dict | None) -> str:
    L: list[str] = []
    t, b = snap["totals"], snap["totals"]["buckets"]
    L.append(f"Peninsula Insider — DataForSEO snapshot {snap['date']}")

    if prior:
        pt = prior["totals"]
        L.append(f"  vs {prior['date']}")
        L.append(f"  keywords {t['keywords']} ({t['keywords'] - pt['keywords']:+d})")
        for k in b:
            L.append(f"    pos {k:<7} {b[k]:>4} ({b[k] - pt['buckets'].get(k, 0):+d})")
    else:
        L.append(f"  keywords {t['keywords']} (no prior snapshot — this is the baseline)")
        for k in b:
            L.append(f"    pos {k:<7} {b[k]:>4}")

    c = snap["town_cluster"]
    L.append(f"  town cluster: {c['keywords_tracked']} keywords, "
             f"{c['volume_total']:,} searches/mo")
    L.append(f"    PI top-10 {c['pi_top10']} · PI top-30 {c['pi_top30']} · "
             f"VMP top-10 {c['vmp_top10']}")
    if prior:
        pc = prior["town_cluster"]
        L.append(f"    delta: PI top-30 {c['pi_top30'] - pc['pi_top30']:+d}, "
                 f"VMP top-10 {c['vmp_top10'] - pc['vmp_top10']:+d}")

    sd = sorted(snap["striking_distance"].items(),
                key=lambda kv: -kv[1]["volume"])[:10]
    L.append(f"  striking distance (11-30, vol>=100): {len(snap['striking_distance'])}")
    for kw, v in sd:
        move = ""
        if prior:
            p = prior["keywords"].get(kw)
            if p:
                d = p["pos"] - v["pos"]
                move = f"  ({d:+d})" if d else "  (=)"
            else:
                move = "  (new)"
        L.append(f"    {v['volume']:>7}/mo  p{v['pos']:<3} {kw}{move}")

    L.append(f"  api cost ${snap['cost_usd']}")
    return "\n".join(L)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=dt.date.today().isoformat())
    ap.add_argument("--dry-run", action="store_true",
                    help="print the summary without writing a snapshot file")
    args = ap.parse_args()

    snap = build(auth(), args.date)
    prior = latest_prior(args.date)

    if not args.dry_run:
        SNAP_DIR.mkdir(parents=True, exist_ok=True)
        out = SNAP_DIR / f"{args.date}.json"
        out.write_text(json.dumps(snap, indent=2, sort_keys=True) + "\n")
        print(f"wrote {out}")

    print(summarise(snap, prior))


if __name__ == "__main__":
    main()
