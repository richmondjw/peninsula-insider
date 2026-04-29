#!/usr/bin/env python3
"""V1 → V2 content migration.

For each page in V2 staging, find its V1 equivalent and port:
  • the editorial prose body  (<div class="prose">  → <div class="letter__prose v2-article-body">)
  • the hero image            (<div class="*__hero"> bg-image  → <img class="hero__image">)
  • the venue/article meta facts (price, hours, address, byline)
  • the headline / dek (if V2's is shorter or generic)

Idempotent — safe to re-run; checks for v2-article-body class to skip already-migrated pages
unless --force is passed.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DIST = Path(__file__).parent / "next" / "dist"
V1_ROOT = DIST                          # V1 lives at the dist root
V2_ROOT = DIST / "v2-staging"           # V2 staging beneath


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")


def write(p: Path, s: str) -> None:
    p.write_text(s, encoding="utf-8")


# --- Extractors (V1) -------------------------------------------------------

def extract_prose(v1_html: str) -> str | None:
    """Return inner HTML of the V1 article body — concatenates multiple V1
    content sections so V2 captures the full editorial scope, not just the
    first prose block."""
    parts: list[str] = []

    # 1. Primary prose
    primary = _balanced_div(v1_html, 'prose')
    if primary and len(primary.strip()) > 80:
        parts.append(primary.strip())

    # 2. Place-detail sub-sections (TL;DR, body, etc.) — appear after prose
    for cls in ('place-detail__tldr', 'place-detail__body',
                'place-detail__ataglance', 'place-detail__essential'):
        chunk = _balanced_div(v1_html, cls)
        if chunk and len(chunk.strip()) > 80:
            parts.append(f'<section class="v2-mig-section v2-mig-{cls}">{chunk.strip()}</section>')

    # 3. Experience-index — the structured "what to do here" listing on
    # experience-detail and place pages
    m = re.search(r'<section\s+class="experience-index"[^>]*>(.*?)</section>',
                  v1_html, re.DOTALL)
    if m and len(m.group(1)) > 200:
        parts.append(f'<section class="v2-mig-experience-index">{m.group(1).strip()}</section>')

    # 4. Escape callout (CTA-style block)
    m = re.search(r'<section\s+class="escape-callout"[^>]*>(.*?)</section>',
                  v1_html, re.DOTALL)
    if m and len(m.group(1)) > 200:
        parts.append(f'<section class="v2-mig-escape-callout">{m.group(1).strip()}</section>')

    # 5. Article-body alternate location
    if not parts:
        m = re.search(
            r'<div class="article__body"[^>]*>(.*?)</div>\s*(?:<aside|<section class="newsletter|<section class="related|</article>)',
            v1_html, re.DOTALL)
        if m and len(m.group(1).strip()) > 200:
            parts.append(m.group(1).strip())

    if not parts:
        return None
    return '\n'.join(parts)


def _balanced_div(html: str, class_name: str) -> str | None:
    """Find <div class="{class_name}">...</div> with proper brace-balancing."""
    pat = re.compile(
        r'<div class="' + re.escape(class_name) + r'(?:\s[^"]*)?"[^>]*>',
        re.IGNORECASE,
    )
    m = pat.search(html)
    if not m:
        return None
    start = m.end()
    depth = 1
    i = start
    div_open = re.compile(r'<div\b', re.IGNORECASE)
    div_close = re.compile(r'</div>', re.IGNORECASE)
    while depth and i < len(html):
        next_open = div_open.search(html, i)
        next_close = div_close.search(html, i)
        if not next_close:
            return None
        if next_open and next_open.start() < next_close.start():
            depth += 1
            i = next_open.end()
        else:
            depth -= 1
            i = next_close.end()
            if depth == 0:
                return html[start: i - len('</div>')]
    return None


def extract_hero_image(v1_html: str) -> str | None:
    """Find the V1 hero image source."""
    # 1. background-image url(...)  on a *__hero element
    m = re.search(
        r'class="[^"]*(?:venue-detail|article|place-detail|experience-detail|itinerary-detail)__hero[^"]*"[^>]*style="[^"]*background-image:\s*url\(([^)]+)\)',
        v1_html,
    )
    if m:
        return m.group(1).strip("'\"")
    # 2. <img class="*hero*" src="...">
    m = re.search(r'<img[^>]*class="[^"]*hero[^"]*"[^>]*src="([^"]+)"', v1_html)
    if m:
        return m.group(1)
    # 3. og:image meta
    m = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', v1_html)
    if m:
        url = m.group(1)
        # strip absolute domain
        url = re.sub(r'^https?://[^/]+', '', url)
        return url
    return None


def extract_headline(v1_html: str) -> str | None:
    # Article headline (V1 often uses .article__title or .venue-detail__title)
    for pat in (
        r'<h1[^>]*class="[^"]*(?:article|venue-detail|place-detail|experience-detail|itinerary-detail)__title[^"]*"[^>]*>(.*?)</h1>',
        r'<h1[^>]*>(.*?)</h1>',
    ):
        m = re.search(pat, v1_html, re.DOTALL)
        if m:
            return m.group(1).strip()
    return None


def extract_dek(v1_html: str) -> str | None:
    for pat in (
        r'<p[^>]*class="[^"]*(?:article|venue-detail|place-detail|experience-detail|itinerary-detail)__dek[^"]*"[^>]*>(.*?)</p>',
        r'<p[^>]*class="[^"]*__lede[^"]*"[^>]*>(.*?)</p>',
    ):
        m = re.search(pat, v1_html, re.DOTALL)
        if m:
            return m.group(1).strip()
    return None


def extract_facts(v1_html: str) -> list[tuple[str, str]] | None:
    """Pull (label, value) pairs out of V1's <aside class="facts">."""
    m = re.search(r'<aside class="facts"[^>]*>(.*?)</aside>', v1_html, re.DOTALL)
    if not m:
        return None
    block = m.group(1)
    facts = []
    # Try the common patterns: <div class="facts__row">  <dt>/<dd>  <li class="facts__item">
    for fm in re.finditer(
        r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>',
        block, re.DOTALL,
    ):
        facts.append((re.sub(r'<[^>]+>', '', fm.group(1)).strip(),
                      re.sub(r'<[^>]+>', '', fm.group(2)).strip()))
    if facts:
        return facts
    for fm in re.finditer(
        r'<div class="facts__label[^"]*"[^>]*>(.*?)</div>\s*<div class="facts__value[^"]*"[^>]*>(.*?)</div>',
        block, re.DOTALL,
    ):
        facts.append((re.sub(r'<[^>]+>', '', fm.group(1)).strip(),
                      re.sub(r'<[^>]+>', '', fm.group(2)).strip()))
    return facts or None


# --- Injectors (V2) --------------------------------------------------------

def inject_prose(v2_html: str, prose: str) -> tuple[str, bool]:
    """Replace V2's letter__prose contents with V1's prose."""
    # Always tag with v2-article-body so reading-mode CSS kicks in.
    new_block = (
        '<div class="letter__prose v2-article-body" data-migrated="v1">'
        + prose +
        '</div>'
    )
    new_html, n = re.subn(
        r'<div class="letter__prose[^"]*"[^>]*>.*?</div>(?=\s*(?:<aside class="letter__side"|<div class="letter__sig|</div>\s*</div>\s*</section>))',
        new_block, v2_html, count=1, flags=re.DOTALL,
    )
    if n:
        return new_html, True
    # Fallback: simpler match — first letter__prose
    new_html, n = re.subn(
        r'<div class="letter__prose[^"]*"[^>]*>.*?</div>',
        new_block, v2_html, count=1, flags=re.DOTALL,
    )
    return new_html, bool(n)


def inject_hero_image(v2_html: str, src: str) -> tuple[str, bool]:
    if not src:
        return v2_html, False
    # Replace the existing <img class="hero__image"> src
    new_html, n = re.subn(
        r'(<img class="hero__image"[^>]*src=")[^"]+(")',
        lambda m: m.group(1) + src + m.group(2),
        v2_html, count=1,
    )
    return new_html, bool(n)


FACTS_CARD = (
    '<div class="facts-card" data-migrated="v1">'
    '<div class="facts-card__title">At a glance</div>'
    '<dl class="facts-card__list">{items}</dl>'
    '</div>'
)


def inject_facts(v2_html: str, facts: list[tuple[str, str]]) -> tuple[str, bool]:
    if not facts:
        return v2_html, False
    items = "".join(
        f'<dt>{label}</dt><dd>{value}</dd>' for label, value in facts
    )
    block = FACTS_CARD.format(items=items)
    # Try to replace existing facts-card
    if 'class="facts-card"' in v2_html:
        new_html, n = re.subn(
            r'<div class="facts-card"[^>]*>.*?</div>(?=\s*</aside>|\s*</div>)',
            block, v2_html, count=1, flags=re.DOTALL,
        )
        return new_html, bool(n)
    # Otherwise inject inside letter__side aside
    if '<aside class="letter__side"' in v2_html:
        new_html, n = re.subn(
            r'(<aside class="letter__side"[^>]*>)',
            r'\1' + block, v2_html, count=1,
        )
        return new_html, bool(n)
    return v2_html, False


# --- Driver ----------------------------------------------------------------

def migrate(v2_rel: str, force: bool = False) -> str:
    """Migrate a single V2 page. Returns status string."""
    v2_path = V2_ROOT / v2_rel
    v1_path = V1_ROOT / v2_rel
    if not v1_path.exists():
        return "no-v1"
    v2 = read(v2_path)
    if not force and 'data-migrated="v1"' in v2:
        return "skip-already-migrated"
    v1 = read(v1_path)

    prose = extract_prose(v1)
    image = extract_hero_image(v1)
    facts = extract_facts(v1)

    actions: list[str] = []
    if prose:
        v2, ok = inject_prose(v2, prose)
        if ok: actions.append("prose")
    if image:
        v2, ok = inject_hero_image(v2, image)
        if ok: actions.append("img")
    if facts:
        v2, ok = inject_facts(v2, facts)
        if ok: actions.append(f"facts({len(facts)})")
    if not actions:
        return "nothing-to-migrate"
    write(v2_path, v2)
    return "+".join(actions)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", default=None,
                    help="restrict to this section (eat/stay/wine/...)")
    ap.add_argument("--force", action="store_true",
                    help="re-migrate already-migrated pages")
    ap.add_argument("--limit", type=int, default=0,
                    help="stop after N pages (for testing)")
    args = ap.parse_args()

    pages = []
    for p in V2_ROOT.rglob("index.html"):
        rel = p.relative_to(V2_ROOT).as_posix()
        if args.section and not rel.startswith(args.section + "/"):
            continue
        # Skip the v2 root itself and special dirs
        if rel.startswith(("_health/", "DESIGN-SYSTEM/", "preview-hero/")):
            continue
        pages.append(rel)
    pages.sort()
    if args.limit:
        pages = pages[: args.limit]

    print(f"Migrating {len(pages)} pages "
          + (f"in /{args.section}/" if args.section else "(all)"))
    counts: dict[str, int] = {}
    for i, rel in enumerate(pages, 1):
        status = migrate(rel, force=args.force)
        counts[status] = counts.get(status, 0) + 1
        if i % 25 == 0 or i == len(pages):
            print(f"  [{i}/{len(pages)}] last: {rel}  {status}")
    print()
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {v:5}  {k}")


if __name__ == "__main__":
    main()
