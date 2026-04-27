# Eat & Drink — image audit

**Status:** in progress (started 2026-04-27)
**Scope:** 59 venues with `type` in {`restaurant`, `cafe`, `bakery`, `pub`, `market`}, plus eat-related articles and events.
**Starting state:** 58/59 venues on `tmp-unsplash`, 1/59 on `tmp-wikimedia`. Zero on `venue-media-kit`.

## Type breakdown

| Type | Count |
|---|---:|
| restaurant | 30 (1 wikimedia, 29 unsplash) |
| cafe | 12 |
| pub | 8 |
| bakery | 6 |
| market | 3 |
| **Total** | **59** |

## Tier 1 venues (16) — homepage / eat-hub features

| Slug | Type | Place | Status |
|---|---|---|---|
| barmah-park | cafe | — | pending audit |
| barragunda-dining | restaurant | — | pending audit |
| commonfolk-coffee | cafe | — | pending audit |
| flinders-general-store | cafe | flinders | pending audit |
| laura-pt-leo | restaurant | merricks | pending audit |
| many-little | restaurant | — | pending audit |
| martha-s-table | restaurant | mt-martha | pending audit |
| merricks-general-wine-store | restaurant | merricks | pending audit |
| rare-hare | restaurant | merricks | pending audit |
| rocker | cafe | — | pending audit |
| small-stone-pantry | cafe | — | pending audit |
| somers-general | cafe | somers | pending audit |
| sorrento-gelato | cafe | sorrento | pending audit |
| store-ten | cafe | — | pending audit |
| stringers-mornington | cafe | mornington | pending audit |
| tedesca-osteria | restaurant | red-hill-area | pending audit |

## Tier 2 — vetted-category fallback

The remaining ~43 venues. After Tier 1 is closed, mass-update each venue's `heroImage.src` to point at a vetted fallback per the cleared shortlist:

- `restaurant` → rotate across `category-restaurant-01/03/04.webp`
- `cafe` → rotate across `category-cafe-02/03.webp`
- `pub` → all use `category-pub-02.webp`
- `bakery` → rotate across `category-bakery-01/02.webp`
- `market` → rotate across `category-market-01/02.webp`

Rotation by hash of slug so the assignment is stable and reproducible.

## Tier 3 — sourcing backlog

Every Eat & Drink venue not on `venue-media-kit` will be appended to `sourcing-backlog.md` after Tier 2 completes.

## Decisions log

- 2026-04-27: Method = "Tier by visibility" (option B). Confirmed by James.
- 2026-04-27: Fallback library audited; 5 of 16 Eat-relevant category images flagged as **do-not-use** (restaurant-02, restaurant-06, cafe-01, cafe-04, pub-01, pub-03).
