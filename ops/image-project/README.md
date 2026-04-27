# Peninsula Insider Image Sourcing Project

A pillar-by-pillar audit and remediation of every visible image on the v2 site, working left-to-right across the masthead nav.

## Why this exists

As of 2026-04-27, **159 of ~270 content files** carry a `tmp-unsplash` (or `tmp-wikimedia`) license. These were placeholder stock photos. At least three were geographically or thematically wrong on the live site:

- `category-market-01.webp` — stock photo of African children on the Red Hill Market card
- `place-red-hill-01.webp` — generic blue-grape closeup with no Peninsula context
- `category-cafe-01.webp` — Berlin café with German menu (in fallback library; not yet attached to a live page but available for fallback)

These are not isolated bugs. They're the visible tip of an editorial debt that needs systematic clearance.

## Method (agreed 2026-04-27)

**Tier-by-visibility audit per pillar:**

- **Tier 1 — high visibility:** venues/pages referenced from homepage, hub pages, featured rails. Hand-audit each; replace with a credible image (real venue photo, vetted category fallback, or place hero). No stock photos on Tier 1.
- **Tier 2 — detail-page-only:** point `heroImage.src` at a vetted category fallback (`/images/sourced/category-{type}-0X.webp` from the cleared shortlist).
- **Tier 3 — sourcing backlog:** every venue still on a placeholder gets logged in `ops/image-project/sourcing-backlog.md` so editorial can commission/source proper photos over time.

Pillar order: **Eat & Drink → Stay → Wine Country → Explore → Golf → Spa → Escape → What's On → Journal**.

## Fallback library — cleared shortlist

These category images have been visually verified and are safe to use as Tier 2 fallbacks:

| Category | Verified safe | Skip |
|---|---|---|
| restaurant | `-01`, `-03`, `-04` | `-02` (chain interior), `-06` (Bali/SE-Asia) |
| cafe | `-02`, `-03` | `-01` (Berlin café, German menu), `-04` (bean texture, too abstract) |
| pub | `-02` | `-01` (cocktail bar), `-03` (phone-on-laptop tech stock) |
| bakery | `-01`, `-02` | — |
| market | `-01` (replaced with produce 2026-04-27), `-02` | — |
| winery | not yet audited | — |
| brewery | not yet audited | — |
| producer | not yet audited | — |

**Bad stock photos already neutralised** (replaced in-place with category-appropriate content):
- `category-market-01.webp` — was African-children stock, now produce stall
- `place-red-hill-01.webp` — was blue-grape closeup, now Montalto vineyard landscape

## Per-pillar tracker files

- [eat-and-drink.md](eat-and-drink.md) — in progress
- stay.md — pending
- wine-country.md — pending
- explore.md — pending
- golf.md — pending
- spa.md — pending
- escape.md — pending
- whats-on.md — pending
- journal.md — pending

## Sourcing backlog

- [sourcing-backlog.md](sourcing-backlog.md) — every venue still on a placeholder, queued for real photography

## Mechanics

- Edits target `next/src/content/**/*.json` and `next/src/content/**/*.md` (source of truth — see `project_pi_v2_source_of_truth.md`)
- File-content swaps for category fallbacks (`category-*-0X.webp`) cascade automatically to every reference, no JSON edits needed
- After each pillar: rebuild via `./build-live.sh`, commit, push to `main` for GitHub Pages deploy
