#!/usr/bin/env python3
"""V2 staging audit — broken images, broken hrefs, within-page dupes,
section/venue coverage."""
from __future__ import annotations
import re, sys, json
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).parent
V2 = ROOT / "next" / "dist" / "v2-staging"
SOURCED = V2 / "images" / "sourced"
HEALTH = V2 / "_health"


def main():
    HEALTH.mkdir(exist_ok=True)
    pages = sorted(p for p in V2.rglob("index.html") if "_health" not in p.parts)
    print(f"V2 pages: {len(pages)}")

    image_files = {p.name for p in SOURCED.glob("*.webp")}
    print(f"V2 images on disk: {len(image_files)}")

    # 1. Broken image refs
    broken_imgs: dict[str, list[str]] = defaultdict(list)
    img_ref_count: Counter = Counter()
    within_page_dupes: list[tuple[str, str, int]] = []

    # 2. Broken internal hrefs
    broken_hrefs: dict[str, list[str]] = defaultdict(list)
    href_resolved: dict[str, str] = {}

    # Build href resolution map
    page_dirs = {p.relative_to(V2).as_posix() for p in V2.rglob("*") if p.is_dir()}
    page_files = {p.relative_to(V2).as_posix() for p in V2.rglob("*.html")}

    for p in pages:
        rel = p.relative_to(V2).as_posix()
        h = p.read_text(encoding="utf-8", errors="ignore")

        # Image refs
        imgs = re.findall(r"/images/sourced/([\w\-]+\.webp)", h)
        for img in imgs:
            img_ref_count[img] += 1
            if img not in image_files:
                broken_imgs[img].append(rel)
        # Within-page dupes (skip aggregator hubs)
        is_hub = rel.count("/") <= 1 or rel in {
            "wine/best-wineries-mornington-peninsula/index.html",
            "wine/cellar-doors/index.html",
        }
        if not is_hub:
            c = Counter(imgs)
            for fname, n in c.items():
                if n > 1:
                    within_page_dupes.append((rel, fname, n))

        # Internal hrefs (only absolute /...; ignore # and externals)
        for m in re.finditer(r'href="(/[^"#?]*)"', h):
            href = m.group(1)
            if href.startswith(("/_astro/", "/assets/", "/images/", "/favicon")):
                continue
            target = href.lstrip("/").rstrip("/")
            if not target:
                continue
            target_index = (target + "/index.html") if not target.endswith(".html") else target
            if target_index not in page_files:
                # Maybe it's a directory index that exists as a dir
                if target not in page_dirs:
                    broken_hrefs[href].append(rel)

    print(f"\nBroken image refs: {len(broken_imgs)} unique missing files")
    for img, where in sorted(broken_imgs.items())[:10]:
        print(f"  {img}  on {len(where)} pages, e.g. {where[0]}")

    print(f"\nWithin-page image duplicates: {len(within_page_dupes)} occurrences "
          f"on {len({r for r,_,_ in within_page_dupes})} pages")
    for rel, fname, n in within_page_dupes[:5]:
        print(f"  {rel}: {fname} ×{n}")

    print(f"\nBroken internal hrefs: {len(broken_hrefs)} unique targets")
    for href, where in sorted(broken_hrefs.items())[:10]:
        print(f"  {href}  ({len(where)} pages, e.g. {where[0]})")

    # Save full report
    HEALTH.mkdir(exist_ok=True)
    (HEALTH / "audit.json").write_text(json.dumps({
        "pages": len(pages),
        "images_on_disk": len(image_files),
        "broken_images": {k: v for k, v in broken_imgs.items()},
        "within_page_duplicates": within_page_dupes,
        "broken_hrefs": {k: v for k, v in broken_hrefs.items()},
    }, indent=2), encoding="utf-8")
    print(f"\nFull audit: next/dist/v2-staging/_health/audit.json")


if __name__ == "__main__":
    main()
