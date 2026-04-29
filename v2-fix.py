#!/usr/bin/env python3
"""V2 staging fix — remap broken image refs, dedupe within pages,
unbreak internal hrefs."""
from __future__ import annotations
import re, sys
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
V2 = ROOT / "next" / "dist" / "v2-staging"
SOURCED = V2 / "images" / "sourced"

ALL = sorted(p.name for p in SOURCED.glob("*.webp"))


# ---- Broken-image remapping --------------------------------------------------
#
# When V1 content references an image that doesn't exist in V2's pool, map it
# to the closest existing alternative.

BROKEN_IMAGE_REMAP = {
    # Sorrento back beach → Portsea front beach (closest available)
    "beach-sorrento-back-01.webp": "explore-portsea-front-beach-01.webp",
    "place-arthurs-seat-01.webp": "explore-arthurs-seat-lookout-01.webp",
    "place-ashcombe-maze-01.webp": "place-main-ridge-01.webp",
    "place-greens-bush-01.webp": "explore-greens-bush-01.webp",
    "eat-the-baths-sorrento-01.webp": "category-restaurant-02.webp",
    "food-winery-lunch-01.webp": "category-restaurant-01.webp",
    "stay-jackalope-01.webp": "venue-jackalope-hotel-01.webp",
    "wine-stonier-cellar-door-01.webp": "category-winery-04.webp",
    "wine-vineyard-01.webp": "category-winery-01.webp",
}

# Category-aware pools for within-page dedupe rotation
def by_prefix(*prefixes: str) -> list[str]:
    return [a for a in ALL if any(a.startswith(p) for p in prefixes)]

POOLS: dict[str, list[str]] = {
    "winery":     by_prefix("category-winery-", "wine-vineyard-", "wine-cellar-",
                            "venue-paringa", "venue-ten-minutes", "venue-montalto",
                            "venue-wine-tasting", "wine-hub", "article-cellar-door",
                            "article-chardonnay", "article-vineyard"),
    "restaurant": by_prefix("category-restaurant-", "venue-dining-",
                            "venue-italian", "venue-tedesca",
                            "article-italian", "article-long-lunch",
                            "article-hatted", "article-couples", "article-seafood"),
    "cafe":       by_prefix("category-cafe-", "article-red-hill-saturday"),
    "pub":        by_prefix("category-pub-", "category-brewery-"),
    "bakery":     by_prefix("category-bakery-"),
    "market":     by_prefix("category-market-", "article-producer", "article-peninsula-pantry"),
    "producer":   by_prefix("category-producer-", "article-peninsula-pantry"),
    "hotel":      by_prefix("venue-jackalope", "venue-lindenderry", "venue-polperro",
                            "category-hotel", "category-cottage", "category-glamping",
                            "article-couples", "article-vineyard-villa",
                            "article-flinders-weekend", "article-sorrento-weekend"),
    "explore":    by_prefix("explore-"),
    "place":      by_prefix("place-"),
    "spa":        by_prefix("spa-"),
    "golf":       by_prefix("golf-"),
    "dog":        by_prefix("dog-"),
    "journal":    by_prefix("journal-", "article-"),
}

def categorise(img: str) -> str | None:
    for name, pool in POOLS.items():
        if img in pool:
            return name
    return None


def remap_broken_images(html: str) -> tuple[str, int]:
    n = 0
    for old, new in BROKEN_IMAGE_REMAP.items():
        if old in html:
            n += html.count(old)
            html = html.replace(old, new)
    return html, n


def dedupe_within_page(html: str) -> tuple[str, int]:
    """No image referenced twice on the same page — swap secondaries to other
    same-category images."""
    used: set[str] = set()
    swaps = 0

    def repl(m: re.Match) -> str:
        nonlocal swaps
        path = m.group(0)
        fname = m.group(1)
        if fname not in ALL:
            return path  # unresolvable; leave for the broken-image step
        if fname not in used:
            used.add(fname)
            return path
        cat = categorise(fname)
        candidates = POOLS.get(cat, []) if cat else ALL
        for cand in candidates:
            if cand != fname and cand not in used and cand in ALL:
                used.add(cand)
                swaps += 1
                return path.replace(fname, cand)
        return path  # exhausted

    new_html = re.sub(r"/images/sourced/([\w\-]+\.webp)", repl, html)
    return new_html, swaps


# ---- Broken href remap -------------------------------------------------------

HREF_REMAP = {
    "/v2-staging/journal/best-brunch-mornington-peninsula/": "/journal/best-brunch-mornington-peninsula/",
    "/v2-staging/journal/dog-friendly-mornington-peninsula/": "/journal/dog-friendly-mornington-peninsula/",
    "/v2-staging/journal/free-things-to-do-mornington-peninsula/": "/journal/free-things-to-do-mornington-peninsula/",
    "/v2-staging/journal/mornington-peninsula-day-trip/": "/journal/mornington-peninsula-day-trip/",
    "/v2-staging/journal/mornington-peninsula-in-winter/": "/journal/mornington-peninsula-in-winter/",
    "/v2-staging/": "/",
    "/escape/the-three-day-peninsula/": "/escape/mornington-peninsula-itinerary/",
    "/escape/the-weekend-peninsula/": "/escape/wellness-weekend/",
    "/stay/port-phillip-estate": "/wine/port-phillip-estate/",
    "/places/undefined/": "/places/",
}


def remap_hrefs(html: str) -> tuple[str, int]:
    n = 0
    for old, new in HREF_REMAP.items():
        if old in html:
            n += html.count(old)
            html = html.replace(old, new)
    # Strip any other /v2-staging/ prefixes that snuck through
    html2 = re.sub(r'href="/v2-staging/', 'href="/', html)
    if html2 != html:
        n += html.count('href="/v2-staging/')
        html = html2
    return html, n


def main():
    pages = sorted(p for p in V2.rglob("index.html") if "_health" not in p.parts)
    files_changed = 0
    img_remap_total = 0
    dedupe_total = 0
    href_total = 0
    for p in pages:
        h = p.read_text(encoding="utf-8", errors="ignore")
        original = h
        h, n1 = remap_broken_images(h)
        img_remap_total += n1
        h, n2 = dedupe_within_page(h)
        dedupe_total += n2
        h, n3 = remap_hrefs(h)
        href_total += n3
        if h != original:
            p.write_text(h, encoding="utf-8")
            files_changed += 1
    print(f"  files changed: {files_changed}")
    print(f"  broken-image remaps: {img_remap_total}")
    print(f"  within-page dedupe swaps: {dedupe_total}")
    print(f"  href remaps: {href_total}")


if __name__ == "__main__":
    main()
