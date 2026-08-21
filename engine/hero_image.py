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
calls and no provider dependency, so it cannot become a source of drift. When
the image-intelligence search index is still an empty zero-asset baseline (as
it is until a vision provider is configured and metadata is approved), the
selector falls back to the entity/place rules below with no behaviour change.

How selection works
-------------------
1. Read the picks that were actually written (H2 headings and the bolded
   footer lines), so the hero follows the column rather than preceding it.
2. Resolve those to venue / experience records and take that record's OWN
   `heroImage` block. Alt text, credit and licence come from the record, so
   the hero cannot be captioned as a venue it does not show. (24, 25 and 27
   July shipped a generic wedding barn captioned as the Ten Minutes by
   Tractor dining room and credited to Peninsula Insider.)
3. Drop anything used as a hero inside the active cooldown. The cooldown is
   adaptive: 45 days while the usable pool is tight, up to 90 days once the
   distinct on-disk asset pool can support a quarter-year without repetition.
4. Score the survivors: lead pick beats second beats third, an entity match
   beats a zone match beats a generic seasonal asset. Approved image-
   intelligence metadata (when present) adds subject/season/orientation
   signals without ever becoming required.
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

# Sized against the pool the way recency.py sizes its cooldowns. 45 days is
# the safe floor; the selector moves toward 90 days when the distinct usable
# pool has enough assets to support it without starving the fresh pool.
HERO_COOLDOWN_DAYS = 45
HERO_MIN_COOLDOWN_DAYS = 45
HERO_TARGET_COOLDOWN_DAYS = 90
HERO_MIN_FRESH_POOL = 12
HERO_LOOKBACK_ARTICLES = 120
IMAGE_INTELLIGENCE_INDEX = "next/src/data/image-intelligence-search-index.json"

# Weights. A hero that shows the lead pick is worth more than one that shows
# the third, and any entity match is worth more than a generic seasonal shot.
SLOT_WEIGHT = {0: 100, 1: 60, 2: 40}
ENTITY_MATCH = 50
ZONE_MATCH = 15
SEASON_MATCH = 10
INTEL_ENTITY_MATCH = 35
INTEL_SUBJECT_MATCH = 25
INTEL_SEASON_MATCH = 10
INTEL_ORIENTATION_MATCH = 5

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
                "place": rec.get("place") or "",
                "type": rec.get("type") or "",
                "tags": rec.get("tags") or {},
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


# ── Optional image intelligence ─────────────────────────────────────────────

def _load_image_intelligence(root: Path) -> dict[str, dict]:
    """Approved, rights-known semantic asset metadata keyed by canonical URI.

    The pilot writes a zero-asset index until a provider is configured and a
    human approves metadata. That is a valid state: return an empty map and let
    deterministic entity/place selection carry the run.
    """
    path = root / IMAGE_INTELLIGENCE_INDEX
    try:
        data = json.loads(path.read_text())
    except Exception:
        return {}
    out: dict[str, dict] = {}
    for asset in data.get("assets") or []:
        src = asset.get("canonicalUri")
        if not src:
            continue
        if asset.get("metadataState") != "approved" or asset.get("rightsStatus") != "known":
            continue
        out[src] = asset
    return out


_INTEL_SUBJECT_TERMS = {
    "subject.food-dining": {"eat", "food", "restaurant", "dining", "cafe", "bakery", "bar", "pub", "hotel", "coffee", "pizza", "italian", "seafood", "brewery"},
    "subject.vineyard-cellar-door": {"wine", "winery", "vineyard", "cellar", "estate", "tasting"},
    "subject.coast-beach": {"beach", "coast", "ocean", "bay", "pier", "foreshore", "lighthouse", "ferry", "swim", "surf"},
    "subject.thermal-wellness": {"spa", "thermal", "springs", "wellness", "bathhouse"},
    "subject.walk-nature": {"walk", "track", "trail", "hike", "nature", "park", "garden", "maze", "lookout", "view", "cycling"},
    "subject.market-produce": {"market", "produce", "producer", "farm", "dairy", "cheese", "organics", "strawberry"},
    "subject.golf": {"golf", "links"},
    "subject.art-culture": {"art", "gallery", "sculpture", "museum", "mprg"},
    "subject.accommodation": {"hotel", "retreat", "tents", "accommodation", "villa", "cottage", "glamping"},
}


def _entity_text(ent: dict) -> str:
    tags = ent.get("tags") or {}
    tag_text = " ".join(" ".join(v) for v in tags.values() if isinstance(v, list))
    return _norm(" ".join(str(x or "") for x in [
        ent.get("slug"), ent.get("name"), ent.get("type"), ent.get("zone"), ent.get("place"), tag_text
    ]))


def _intel_boost(ent: dict, src: str, intel: dict[str, dict], pick_text: str, season: str) -> tuple[int, list[str]]:
    asset = intel.get(src)
    if not asset:
        return 0, []
    boost = 0
    reasons: list[str] = []
    ent_slug = _norm(ent.get("slug") or "").replace(" ", "-")
    asset_slugs = {_norm(s).replace(" ", "-") for s in asset.get("entitySlugs") or []}
    if ent_slug and ent_slug in asset_slugs:
        boost += INTEL_ENTITY_MATCH
        reasons.append("approved image-intelligence entity match")

    taxonomy = set(asset.get("taxonomy") or [])
    text_words = set((_entity_text(ent) + " " + pick_text).split())
    subject_matches = []
    for tax_id, terms in _INTEL_SUBJECT_TERMS.items():
        if tax_id in taxonomy and text_words & terms:
            subject_matches.append(tax_id.removeprefix("subject."))
    if subject_matches:
        boost += INTEL_SUBJECT_MATCH
        reasons.append("image-intelligence subject match: " + ", ".join(sorted(subject_matches)))
    if f"season.{season}" in taxonomy:
        boost += INTEL_SEASON_MATCH
        reasons.append(f"image-intelligence season match: {season}")
    if (asset.get("orientation") or "").lower() in {"landscape", "wide", "horizontal"}:
        boost += INTEL_ORIENTATION_MATCH
        reasons.append("landscape orientation")
    return boost, reasons


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


# ── Coverage / starvation guard ────────────────────────────────────────────

def _usable_sources(root: Path) -> set[str]:
    on_disk = root / PUBLIC
    return {
        ent["hero"]["src"]
        for ent in (_load_entities(root) + _generic_assets(root))
        if ent.get("hero", {}).get("src") and (on_disk / ent["hero"]["src"].lstrip("/")).exists()
    }


def resolve_cooldown_days(root: Path) -> int:
    """Move from the 45-day floor toward 90 days only when the pool supports it."""
    if os.environ.get("PI_HERO_COOLDOWN_DAYS"):
        return max(1, int(os.environ["PI_HERO_COOLDOWN_DAYS"]))
    target = max(HERO_MIN_COOLDOWN_DAYS, int(os.environ.get("PI_HERO_TARGET_COOLDOWN_DAYS", HERO_TARGET_COOLDOWN_DAYS)))
    min_fresh = max(1, int(os.environ.get("PI_HERO_MIN_FRESH_POOL", HERO_MIN_FRESH_POOL)))
    return target if len(_usable_sources(root)) >= target + min_fresh else HERO_MIN_COOLDOWN_DAYS


def _coverage(candidates: list[tuple[int, str, dict, str]], used: dict[str, date], cutoff: date, root: Path) -> dict:
    on_disk = root / PUBLIC
    distinct = {src for _score, src, _ent, _why in candidates if (on_disk / src.lstrip("/")).exists()}
    fresh = {src for src in distinct if not (src in used and used[src] > cutoff)}
    min_fresh = max(1, int(os.environ.get("PI_HERO_MIN_FRESH_POOL", HERO_MIN_FRESH_POOL)))
    return {
        "usable_assets": len(distinct),
        "fresh_assets": len(fresh),
        "minimum_fresh_assets": min_fresh,
        "starved": len(fresh) < min_fresh,
        "shortfall": max(0, min_fresh - len(fresh)),
    }


def _emit_coverage_alert(result: dict) -> None:
    coverage = result.get("coverage") or {}
    if not coverage.get("starved") or os.environ.get("PI_HERO_COVERAGE_ALERT", "1") == "0":
        return
    try:
        import alert
        alert.emit_alert(
            title="PI hero image fresh pool starvation",
            body=(
                f"Hero selector has {coverage.get('fresh_assets')} fresh asset(s), "
                f"below the minimum {coverage.get('minimum_fresh_assets')}. "
                f"Usable pool: {coverage.get('usable_assets')}; cooldown: "
                f"{result.get('cooldown_days')} days. Source more assets or lower the "
                "cooldown before a repeat ships."
            ),
            severity="warning",
            dedup_key="hero-image-pool-starvation",
        )
    except Exception as e:
        print(f"  hero coverage alert failed: {e}", file=sys.stderr)


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
    intel = _load_image_intelligence(root)
    used = hero_usage(root, today, exclude=Path(article_path))
    cooldown_days = resolve_cooldown_days(root)
    cutoff = today - timedelta(days=cooldown_days)
    pick_text = _norm(" ".join(picks))

    def cooling(src: str) -> bool:
        return src in used and used[src] > cutoff

    candidates: list[tuple[int, str, dict, str]] = []

    # 1. Picks resolved to their own records. Approved semantic metadata can
    # strengthen the match, but the record-owned asset remains the source of
    # truth for alt/credit/licence.
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
                why = f"{ent['kind']} {ent['slug']} matched pick slot {slot + 1}"
                boost, boost_reasons = _intel_boost(ent, ent["hero"]["src"], intel, pick_text, season)
                if boost:
                    score += boost
                    why += "; " + "; ".join(boost_reasons)
                candidates.append((score, ent["hero"]["src"], ent, why))

    # 1b. Approved intelligence assets linked to a featured slug, even when the
    # content record has not been updated to point at them yet. With the current
    # zero-asset baseline this adds nothing; with approved metadata it lets the
    # corpus improve selection without a content-schema migration.
    for src, asset in intel.items():
        for slot, slug in enumerate(asset.get("entitySlugs") or []):
            s = _norm(slug).replace(" ", "-")
            if s and s in pick_text.replace(" ", "-"):
                ent = {
                    "kind": "intelligence",
                    "slug": s,
                    "name": slug.replace("-", " "),
                    "zone": "",
                    "place": "",
                    "type": "",
                    "tags": {},
                    "hero": {
                        "src": src,
                        "alt": asset.get("altText") or asset.get("caption") or "",
                        "credit": "Peninsula Insider",
                        "license": "other-licensed",
                    },
                }
                score = SLOT_WEIGHT.get(slot, 20) + ENTITY_MATCH + INTEL_ENTITY_MATCH
                boost, boost_reasons = _intel_boost(ent, src, intel, pick_text, season)
                why = f"approved image-intelligence asset for {s}"
                if boost:
                    score += boost
                    why += "; " + "; ".join(boost_reasons)
                candidates.append((score, src, ent, why))

    # 2. Same zone as a resolved pick, so the hero is at least the right place.
    zones = {e["zone"] for _, _, e, _ in candidates if e.get("zone")}
    for ent in entities:
        if ent.get("zone") and ent["zone"] in zones:
            score = ZONE_MATCH
            why = f"same zone ({ent['zone']}) as a featured pick"
            boost, boost_reasons = _intel_boost(ent, ent["hero"]["src"], intel, pick_text, season)
            if boost:
                score += boost
                why += "; " + "; ".join(boost_reasons)
            candidates.append((score, ent["hero"]["src"], ent, why))

    # 3. Seasonal generics, so there is always something in date.
    for ent in _generic_assets(root):
        hints = SEASON_HINTS.get(season, ())
        if any(h in ent["slug"] for h in hints):
            score = SEASON_MATCH
            why = f"seasonal asset for {season}"
            boost, boost_reasons = _intel_boost(ent, ent["hero"]["src"], intel, pick_text, season)
            if boost:
                score += boost
                why += "; " + "; ".join(boost_reasons)
            candidates.append((score, ent["hero"]["src"], ent, why))

    # 4. Anything at all, least recently used.
    for ent in _generic_assets(root):
        score = 1
        why = "least-recently-used asset"
        boost, boost_reasons = _intel_boost(ent, ent["hero"]["src"], intel, pick_text, season)
        if boost:
            score += boost
            why += "; " + "; ".join(boost_reasons)
        candidates.append((score, ent["hero"]["src"], ent, why))

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
        "cooldown_days": cooldown_days,
        "coverage": _coverage(candidates, used, cutoff, root),
        "image_intelligence_assets": len(intel),
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
    _emit_coverage_alert(res)
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


def stamp_loose_markdown(markdown_path: Path, root: Path = REPO_ROOT, today: date | None = None) -> dict:
    """Attach a selected hero to non-article markdown (newsletter drafts).

    Newsletter markdown is an email draft, not an Astro content entry, so adding
    YAML frontmatter would leak into the rendered email. A single HTML comment
    carries the same selected asset metadata for the newsletter assembly step.
    """
    res = select(markdown_path, root=root, today=today)
    if not res.get("ok"):
        return res
    _emit_coverage_alert(res)
    p = Path(markdown_path)
    text = p.read_text()
    if "<!-- heroImage:" in text[:1000]:
        res["stamped"] = False
        res["reason"] += "; hero metadata already present"
        return res
    hero = res["hero"]
    alt = hero.get("alt") or f"{res['picks'][0] if res['picks'] else 'Mornington Peninsula'}, Mornington Peninsula"
    comment = (
        "<!-- heroImage: "
        f"src=\"{hero['src']}\" | alt=\"{str(alt).replace(chr(34), chr(39))}\" | "
        f"credit=\"{str(hero.get('credit') or 'Peninsula Insider').replace(chr(34), chr(39))}\" | "
        f"license=\"{hero.get('license') or 'other-licensed'}\" -->"
    )
    lines = text.splitlines()
    insert_at = 1 if lines and lines[0].startswith("#") else 0
    lines.insert(insert_at, comment)
    p.write_text("\n".join(lines) + "\n")
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
            print(f"  cooldown: {res.get('cooldown_days')} days | fresh pool: {res.get('fresh_pool')} | intelligence assets: {res.get('image_intelligence_assets')}")
        else:
            print(f"✗ {res.get('reason')}", file=sys.stderr)
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
