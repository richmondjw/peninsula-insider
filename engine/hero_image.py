#!/usr/bin/env python3
"""
Peninsula Insider, hero image selection for Insider Picks.
===========================================================================
Why this exists
---------------
`content_generator.HERO_IMAGES` was a four-entry season -> single-file map.
Winter is a three-month season, so every winter column was told to use
`/images/sourced/venue-ten-minutes-by-tractor-01.jpg`. Seven of the last
twelve Insider Picks shipped with that same photograph, and the three
non-winter values all pointed at one lighthouse shot. The image had no
relationship to the picks underneath it: the 2 August column led on gnocchi
in Mornington and a Flinders cliff walk under a Main Ridge vineyard hero.

That is the same class of failure `recency.py` fixed for the picks
themselves: a generator with no memory, asked an identical question daily,
returning the identical highest-prior answer.

This module is the image-side equivalent. Deterministic, stdlib only, no API
calls and no provider dependency, so it cannot become a source of drift and
does not wait on the image-intelligence vision backend (whose search index is
still an empty zero-asset baseline until a provider is configured).

How selection works
-------------------
1. Read the picks that were actually written (H2 headings and the bolded
   footer lines), so the hero follows the column rather than preceding it.
2. Resolve those to venue / experience records and take that record's OWN
   `heroImage` block. Alt text, credit and licence come from the record, so
   the hero cannot be captioned as a venue it does not show. (24, 25 and 27
   July shipped a generic wedding barn captioned as the Ten Minutes by
   Tractor dining room and credited to Peninsula Insider.)
3. Drop anything used as a hero in the last HERO_COOLDOWN_DAYS of articles.
4. Score the survivors: lead pick beats second beats third, an entity match
   beats a zone match beats a generic seasonal asset.
5. Break ties by least-recently-used, then by filename, so the choice is
   reproducible for a given repo state and date.

Usage:
    python engine/hero_image.py --article next/src/content/articles/x.md --apply
    python engine/hero_image.py --article ... --json      # dry run, no write
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(os.environ.get("PI_REPO_ROOT", Path(__file__).resolve().parents[1]))

ARTICLES = "next/src/content/articles"
VENUES = "next/src/content/venues"
EXPERIENCES = "next/src/content/experiences"
PUBLIC = "next/public"

# Sized against the pool the way recency.py sizes its cooldowns: 139 venues
# and 44 experiences carry a heroImage, so 45 days of hero cooldown is
# comfortably satisfiable and cannot paint the selector into a corner.
HERO_COOLDOWN_DAYS = 45
HERO_LOOKBACK_ARTICLES = 60

# Weights. A hero that shows the lead pick is worth more than one that shows
# the third, and any entity match is worth more than a generic seasonal shot.
SLOT_WEIGHT = {0: 100, 1: 60, 2: 40}
ENTITY_MATCH = 50
ZONE_MATCH = 15
SEASON_MATCH = 10

SEASONS = {
    12: "summer", 1: "summer", 2: "summer",
    3: "autumn", 4: "autumn", 5: "autumn",
    6: "winter", 7: "winter", 8: "winter",
    9: "spring", 10: "spring", 11: "spring",
}

# Generic fallbacks are matched on filename, not on a hand-maintained map, so
# adding an asset to /images/sourced/ makes it eligible with no code change.
SEASON_HINTS = {
    "winter": ("winter", "fire", "hinterland", "cellar", "long-lunch", "pier"),
    "spring": ("spring", "garden", "vine", "walk", "bloom"),
    "summer": ("summer", "beach", "swim", "coast", "picnic", "boat"),
    "autumn": ("autumn", "vine", "harvest", "hinterland", "market"),
}

_WORD = re.compile(r"[^a-z0-9]+")


def _norm(s: str) -> str:
    return _WORD.sub(" ", (s or "").lower()).strip()


def get_season(month: int) -> str:
    return SEASONS.get(month, "summer")


# ── Reading what the column actually says ──────────────────────────────────

def split_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter, body). Frontmatter excludes the --- fences."""
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]


def extract_picks(body: str) -> list[str]:
    """The names the column actually featured, in slot order.

    Two independent signals so a reformatted column still resolves: the H2
    headings ("## EAT - Mr Vincenzo's, Mornington") and the bolded footer
    lines ("**Tar Barrel** - Bungower Road, Mornington.").
    """
    # Columns have used H2 headings ("## EAT - Mr Vincenzo's") and bolded
    # lines ("**DRINK - Avani Wines, Red Hill**") for the same job across the
    # run, so both forms are read and both get the slot label stripped.
    label = re.compile(r"^[A-Z][A-Z/ &]{1,20}\s*[-–—:]\s*")
    names: list[str] = []
    for line in body.splitlines():
        line = line.strip()
        m = re.match(r"^##+\s+(.*)$", line) or re.match(r"^\*\*(.+?)\*\*", line)
        if not m:
            continue
        head = label.sub("", m.group(1)).strip()
        if head:
            names.append(head)
    # Keep first occurrence order, cap at the three slots plus footer echoes.
    seen, ordered = set(), []
    for n in names:
        k = _norm(n)
        if k and k not in seen:
            seen.add(k)
            ordered.append(n)
    return ordered


# ── The pool ───────────────────────────────────────────────────────────────

def _load_entities(root: Path) -> list[dict]:
    out = []
    for kind, rel in (("venue", VENUES), ("experience", EXPERIENCES)):
        d = root / rel
        if not d.is_dir():
            continue
        for f in sorted(d.glob("*.json")):
            try:
                rec = json.loads(f.read_text())
            except Exception:
                continue
            hero = rec.get("heroImage") or {}
            if not hero.get("src"):
                continue
            out.append({
                "kind": kind,
                "slug": rec.get("slug") or f.stem,
                "name": rec.get("name") or rec.get("title") or f.stem,
                "zone": rec.get("zone") or rec.get("place") or "",
                "hero": hero,
            })
    return out


def _generic_assets(root: Path) -> list[dict]:
    """Every sourced image, usable when no pick resolves to a record."""
    d = root / PUBLIC / "images" / "sourced"
    if not d.is_dir():
        return []
    out = []
    for f in sorted(d.iterdir()):
        if f.suffix.lower() not in (".webp", ".jpg", ".jpeg", ".png"):
            continue
        out.append({
            "kind": "generic",
            "slug": f.stem,
            "name": f.stem.replace("-", " "),
            "zone": "",
            "hero": {
                "src": f"/images/sourced/{f.name}",
                "alt": "",
                "credit": "Peninsula Insider",
                "license": "other-licensed",
            },
        })
    return out


# ── Recency ────────────────────────────────────────────────────────────────

_HERO_SRC = re.compile(r"^\s*src:\s*[\"']?(/images/[^\"'\s]+)", re.M)


def hero_usage(root: Path, today: date, exclude: Path | None = None) -> dict[str, date]:
    """src -> most recent publish date it was used as a hero on."""
    used: dict[str, date] = {}
    d = root / ARTICLES
    if not d.is_dir():
        return used
    files = sorted(d.glob("*.md"), reverse=True)[:HERO_LOOKBACK_ARTICLES]
    for f in files:
        if exclude and f.resolve() == exclude.resolve():
            continue
        try:
            fm, _ = split_frontmatter(f.read_text())
        except Exception:
            continue
        m = _HERO_SRC.search(fm)
        if not m:
            continue
        src = m.group(1)
        dm = re.search(r"(\d{4}-\d{2}-\d{2})", f.stem) or re.search(
            r"^\s*publishedAt:\s*(\d{4}-\d{2}-\d{2})", fm, re.M)
        try:
            used_on = date.fromisoformat(dm.group(1)) if dm else today
        except Exception:
            used_on = today
        if src not in used or used[src] < used_on:
            used[src] = used_on
    return used


# ── Selection ──────────────────────────────────────────────────────────────

def select(article_path: Path, root: Path = REPO_ROOT, today: date | None = None) -> dict:
    text = Path(article_path).read_text()
    fm, body = split_frontmatter(text)
    if today is None:
        dm = re.search(r"(\d{4}-\d{2}-\d{2})", Path(article_path).stem)
        today = date.fromisoformat(dm.group(1)) if dm else date.today()
    season = get_season(today.month)

    picks = extract_picks(body)
    entities = _load_entities(root)
    used = hero_usage(root, today, exclude=Path(article_path))
    cutoff = today - timedelta(days=HERO_COOLDOWN_DAYS)

    def cooling(src: str) -> bool:
        return src in used and used[src] > cutoff

    candidates: list[tuple[int, str, dict, str]] = []

    # 1. Picks resolved to their own records.
    for slot, pick in enumerate(picks[:6]):
        p = _norm(pick)
        if not p:
            continue
        for ent in entities:
            n = _norm(ent["name"])
            if not n:
                continue
            if n in p or p.startswith(n) or _norm(ent["slug"]).replace(" ", "") in p.replace(" ", ""):
                score = SLOT_WEIGHT.get(slot, 20) + ENTITY_MATCH
                candidates.append((score, ent["hero"]["src"], ent,
                                   f"{ent['kind']} {ent['slug']} matched pick slot {slot + 1}"))

    # 2. Same zone as a resolved pick, so the hero is at least the right place.
    zones = {e["zone"] for _, _, e, _ in candidates if e.get("zone")}
    for ent in entities:
        if ent.get("zone") and ent["zone"] in zones:
            candidates.append((ZONE_MATCH, ent["hero"]["src"], ent,
                               f"same zone ({ent['zone']}) as a featured pick"))

    # 3. Seasonal generics, so there is always something in date.
    for ent in _generic_assets(root):
        hints = SEASON_HINTS.get(season, ())
        if any(h in ent["slug"] for h in hints):
            candidates.append((SEASON_MATCH, ent["hero"]["src"], ent,
                               f"seasonal asset for {season}"))

    # 4. Anything at all, least recently used.
    for ent in _generic_assets(root):
        candidates.append((1, ent["hero"]["src"], ent, "least-recently-used asset"))

    on_disk = root / PUBLIC
    fresh = [c for c in candidates
             if not cooling(c[1]) and (on_disk / c[1].lstrip("/")).exists()]
    pool = fresh or [c for c in candidates if (on_disk / c[1].lstrip("/")).exists()]
    if not pool:
        return {"ok": False, "reason": "no hero candidate resolved to a file on disk"}

    def sort_key(c):
        score, src, _ent, _why = c
        last = used.get(src)
        age = (today - last).days if last else 9999
        return (-score, -age, src)

    pool.sort(key=sort_key)
    score, src, ent, why = pool[0]
    hero = dict(ent["hero"])
    hero["src"] = src
    return {
        "ok": True,
        "src": src,
        "hero": hero,
        "score": score,
        "reason": why,
        "picks": picks[:3],
        "cooled_out": sorted({c[1] for c in candidates if cooling(c[1])}),
        "fresh_pool": len(fresh),
        "recycled": not fresh,
    }


# ── Stamping ───────────────────────────────────────────────────────────────

_HERO_BLOCK = re.compile(r"^heroImage:\s*\n(?:[ \t]+\S.*\n?)*", re.M)


def _yaml_q(v: str) -> str:
    return '"' + str(v).replace('\\', '\\\\').replace('"', '\\"') + '"'


def stamp(article_path: Path, root: Path = REPO_ROOT, today: date | None = None) -> dict:
    """Rewrite the article's heroImage block with the selected asset.

    Runs AFTER generation on purpose. The model is not asked to choose the
    image, so it cannot invent alt text for a photo it never saw; alt and
    credit are copied from the entity record that owns the asset.
    """
    res = select(article_path, root=root, today=today)
    if not res.get("ok"):
        return res
    p = Path(article_path)
    text = p.read_text()
    fm, body = split_frontmatter(text)
    hero = res["hero"]
    alt = hero.get("alt") or f"{res['picks'][0] if res['picks'] else 'Mornington Peninsula'}, Mornington Peninsula"
    block = (
        "heroImage:\n"
        f"  src: {_yaml_q(hero['src'])}\n"
        f"  alt: {_yaml_q(alt)}\n"
        f"  credit: {_yaml_q(hero.get('credit') or 'Peninsula Insider')}\n"
        f"  license: {_yaml_q(hero.get('license') or 'other-licensed')}\n"
    )
    if _HERO_BLOCK.search(fm):
        new_fm = _HERO_BLOCK.sub(lambda _m: block, fm, count=1)
    else:
        new_fm = fm.rstrip("\n") + "\n" + block
    p.write_text("---" + new_fm.rstrip("\n") + "\n---" + body)
    res["stamped"] = True
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description="PI Insider Picks hero image selector")
    ap.add_argument("--article", required=True)
    ap.add_argument("--repo-root", default=str(REPO_ROOT))
    ap.add_argument("--date", default=None)
    ap.add_argument("--apply", action="store_true", help="write the selection into the file")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root)
    today = date.fromisoformat(args.date) if args.date else None
    fn = stamp if args.apply else select
    res = fn(Path(args.article), root=root, today=today)
    if args.json:
        print(json.dumps(res, indent=2, default=str))
    else:
        if res.get("ok"):
            flag = " (RECYCLED, whole pool inside cooldown)" if res.get("recycled") else ""
            print(f"{'stamped' if args.apply else 'selected'}: {res['src']}")
            print(f"  why: {res['reason']}{flag}")
            print(f"  picks: {', '.join(res['picks']) or '(none resolved)'}")
        else:
            print(f"✗ {res.get('reason')}", file=sys.stderr)
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
