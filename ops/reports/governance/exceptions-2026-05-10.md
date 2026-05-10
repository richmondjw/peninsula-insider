# Peninsula Insider — Governance Audit Exceptions
**Date:** 2026-05-10
**Tool:** `ops/scripts/governance-audit.mjs`
**Scope:** structured content collections (`next/src/content/*`)

## Summary

| Severity | Count |
|---|---|
| ERROR | 0 |
| WARN  | 214  |
| INFO  | 0  |
| Files with findings | 197 |

## Rules

- `lastVerified-missing` (ERROR) — required field absent on a collection that requires it
- `lastVerified-stale` (ERROR) — last verified > 365 days ago
- `lastVerified-aging` (WARN) — last verified > 180 days ago
- `heroImage-missing` / `heroImage-src-missing` / `heroImage-credit-missing` (ERROR)
- `heroImage-license-unknown` / `gallery-license-unknown` (ERROR) — license value not in the allowed set
- `heroImage-license-temporary` / `gallery-license-temporary` (WARN) — `tmp-*` placeholder license
- `heroImage-alt-thin` (WARN) — alt text < 10 chars
- `heroImage-placeholder-path` (WARN) — image path contains "placeholder" or "tmp"
- `gallery-credit-missing` (ERROR) — gallery item without credit
- `article-status-unknown` (WARN), `article-future-publish` (INFO)

## articles

### `heroImage-license-temporary` (WARN) — 144 occurrences

- `next/src/content/articles/a-flinders-weekend.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/a-winter-peninsula-weekend.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-dromana.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-flinders.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-main-ridge.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-merricks.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-mornington.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-portsea.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-red-hill.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/area-guide-sorrento.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/autumn-weekend-edit.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/avani-syrah-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/baillieu-vineyard-red-hill.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/balnarring-vineyard-quealy-wines.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/barak-estate-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/barmah-park-wines-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/barrymore-estate-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/bayview-estate-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/bdarra-estate-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/beckingham-wines-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/best-golf-courses-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/best-wineries-red-hill.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/blue-range-estate-wines.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/bluestone-lane-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/boneo-plains-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/box-stallion-winery.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/breakfast-before-the-crowds.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/brimsmore-park-winery.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/bristol-farm-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/cooralook-wines-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/craig-avon-vineyard.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/darling-park-winery.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/dog-daycare-boarding-groomers-pet-shops-mornington-peninsula.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/dog-friendly-accommodation-mornington-peninsula.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/dromana-valley-wines.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/dunns-creek-estate.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/elan-vineyard-balnarring.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/emergency-vet-pet-help-mornington-peninsula.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/even-keel-polperro-wines.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/first-time-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/frogspond-winery-mornington.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/gibson-estate-mornington.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/handpicked-wines-mornington.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/harlow-park-estate.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/hatted-restaurants-mornington-peninsula-2025.mdx` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/hickinbotham-of-dromana.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/how-to-build-a-red-hill-saturday.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/how-to-plan-a-peninsula-weekend.md` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/articles/hpr-wines-mornington-peninsula.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/articles/hurley-vineyard-balnarring.md` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- _… +94 more_

### `article-status-unknown` (WARN) — 1 occurrence

- `next/src/content/articles/best-wineries-red-hill.md` — status="review"

### `heroImage-placeholder-path` (WARN) — 1 occurrence

- `next/src/content/articles/st-andrews-beach-golf-course.md` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder

## experiences

### `heroImage-license-temporary` (WARN) — 36 occurrences

- `next/src/content/experiences/balnarring-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/bushrangers-bay.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/cape-schanck-lighthouse-walk.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/coastal-walk-cape-schanck.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/coppins-track.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/dromana-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/eagle-ridge-golf-course.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/farnsworth-track.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/flinders-golf-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/greens-bush-two-bays-section.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/gunnamatta-ocean-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/montalto-sculpture-trail.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/moonah-links.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/mornington-foreshore-walk.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/mornington-golf-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/mornington-peninsula-walk.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/mount-martha-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/point-nepean-fort-walk.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/point-nepean-national-park.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/portsea-front-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/portsea-golf-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/racv-cape-schanck-golf-course.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/red-hill-hinterland-cycling.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/red-hill-market.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/rosebud-country-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/rye-ocean-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/safety-beach-foreshore.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/sea-search-encounters.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/sorrento-back-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/sorrento-ferry.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/sorrento-golf-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/st-andrews-beach-golf-course.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/summit-circuit-arthurs-seat.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/the-dunes-golf-links.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/the-national-golf-club.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/experiences/two-bays-walking-track.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license

### `heroImage-placeholder-path` (WARN) — 12 occurrences

- `next/src/content/experiences/eagle-ridge-golf-course.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/flinders-golf-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/montalto-sculpture-trail.json` — heroImage.src="/images/placeholder-montalto-sculpture-trail.jpg" — looks like a placeholder
- `next/src/content/experiences/moonah-links.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/mornington-golf-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/portsea-golf-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/racv-cape-schanck-golf-course.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/rosebud-country-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/sorrento-golf-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/st-andrews-beach-golf-course.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/the-dunes-golf-links.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder
- `next/src/content/experiences/the-national-golf-club.json` — heroImage.src="/images/placeholder-golf.svg" — looks like a placeholder

## places

### `heroImage-license-temporary` (WARN) — 10 occurrences

- `next/src/content/places/balnarring.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/blairgowrie.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/dromana.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/hastings.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/places/moorooduc.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/mount-martha.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/rosebud.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/rye.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/safety-beach.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/places/shoreham.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license

### `heroImage-placeholder-path` (WARN) — 3 occurrences

- `next/src/content/places/blairgowrie.json` — heroImage.src="/images/placeholder.webp" — looks like a placeholder
- `next/src/content/places/hastings.json` — heroImage.src="/images/placeholder-hastings.jpg" — looks like a placeholder
- `next/src/content/places/shoreham.json` — heroImage.src="/images/placeholder-shoreham.jpg" — looks like a placeholder

## venues

### `heroImage-license-temporary` (WARN) — 7 occurrences

- `next/src/content/venues/dexter-wines.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/venues/jackalope.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/venues/lindenderry.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/venues/mornington-peninsula-chocolates.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/venues/mornington-peninsula-cider.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
- `next/src/content/venues/ocean-eight.json` — heroImage.license="tmp-wikimedia" — temporary placeholder, replace with permanent license
- `next/src/content/venues/sunny-ridge-strawberry-farm.json` — heroImage.license="tmp-unsplash" — temporary placeholder, replace with permanent license
