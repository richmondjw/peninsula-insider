# Polperro owner corrections, 7 September 2026

## Authority and scope

James explicitly requested review of all Polperro coverage and publication of corrections supplied by Lauren, Farmhouse & Villa Reservations, Polperro. Her message is the primary authority for villa quantity, capacity, facilities, cooking appliances, Monday/Tuesday closures and accommodation booking destination. The received-message date was not supplied; 7 September is the date of this correction work.

The coordinator independently checked the official Escape, Hours, Cellar Door and The Deck pages. Those checks corroborate accommodation details, trading days, the Polperro/Even Keel labels and the no-pets policy. Cooking-appliance details follow Lauren's direct correction.

Sources:
- https://www.polperrowines.com.au/escape/
- https://www.polperrowines.com.au/hours/
- https://www.polperrowines.com.au/cellar-door/
- https://www.polperrowines.com.au/dine/the-deck/
- https://www.polperrowines.com.au/weddings/
- https://www.polperrowines.com.au/wine-making/

## Corrected claims

- Four villas total; each sleeps two, with a king-size bed, indoor spa, open fireplace and vineyard views.
- No outdoor baths in the vines. No hotplates; the convection oven and microwave are both suitable for preparing meals.
- Restaurant and cellar door closed Mondays and Tuesdays. Removed the retreat itinerary's Monday tasting and unverified evening/sunset tasting promises.
- Accommodation website and booking destination: https://www.polperrowines.com.au/escape/.
- Removed unsupported two-bedroom-house, no-neighbours, north-facing-villa preference, exact walk duration and full-kitchen claims from Polperro coverage.
- Corrected Main Ridge/Merricks location references to Red Hill using the supplied business address.
- Removed Polperro's erroneous Pennon Hill attribution; use Polperro and Even Keel, without inferred price/value positioning.
- Corrected dog-friendly/unknown-policy statements to no pets, following the official venue FAQ.
- Corrected the retreat reservation phone to the supplied (03) 5989 2471, the Farmhouse address to 64 Donaldsons Road, and its separation from the winery/villas. Removed unverified winery coordinates from the Farmhouse event; event coordinates are optional. Both event organiser contact fields now use the supplied reservations phone, and the retreat itinerary-pairing and nearby-attractions metadata no longer promise Monday tasting or place Many Little on the same estate.
- Replaced inaccurate Polperro wedding limits with format/season-dependent capacity guidance, including FAQ/schema, venue eyebrow and draft instructions. The official range is 6 to 120 depending on format and season; readers are directed to confirm their specific plans.
- Removed unsupported winery fireplace-season and tasting-room-capacity assertions. Scoped the 2019 organic/biodynamic certification to Talland Hill rather than the whole business.
- Synchronized winery and villa hero fallbacks with their existing published CMS assets after coordinator visual inspection. Winery image shows a wine bottle on a table; villa image shows an indoor spa and fireplace. Removed erroneous Sorrento/coastal descriptions.

## Inventory and boundaries

The source search found 102 files under `next/src` containing Polperro, including references, event archives and the separate Polperro Dolphin Swims business. 37 source files were changed during the text-correction pass. Changes cover data shared by venue cards and detail pages, editorial articles and FAQs, rendered-page FAQ/schema copy, practical stay/visit guides, itinerary and event guidance, facts used by future content, and a location comment in an unpublished draft. Passing references with no contradictory claim remain.

Polperro Dolphin Swims is a different business and its content was left intact. Historical event source URLs were retained as event sources. Retired root-level deployed HTML was not edited. The coordinator visually checked the existing published CMS hero assets; source fallbacks now use those exact assets. Existing article-wide verification dates remain unchanged because this pass does not verify every unrelated claim. The villa record date reflects the corrected facilities supplied by the owner; the winery record retains its earlier overall verification date.

This is correction provenance, not evidence of a completed production deployment. Build, schema checks, regression checks and live verification are performed separately by the coordinator.

## Files changed in the text-correction pass

- `next/src/content/articles/dog-friendly-wineries-mornington-peninsula.mdx`
- `next/src/content/articles/mornington-peninsula-winery-guide.mdx`
- `next/src/content/articles/the-cellar-door-short-list.md`
- `next/src/content/articles/the-couples-weekend.md`
- `next/src/content/articles/the-easter-peninsula.md`
- `next/src/content/articles/the-one-booking-peninsula-day.md`
- `next/src/content/articles/the-sorrento-weekend.md`
- `next/src/content/articles/the-sunset-drink.md`
- `next/src/content/articles/the-sunset-hour.md`
- `next/src/content/articles/the-thermal-springs-weekend.md`
- `next/src/content/articles/the-vineyard-villa-weekend.md`
- `next/src/content/articles/where-to-stay-mornington-peninsula.mdx`
- `next/src/content/editorial_blocks/rainy-day-intro.md`
- `next/src/content/events/polperro-cellar-table-private-dining-experience.json`
- `next/src/content/events/restore-pamper-retreat-at-polperro-farmhouse.json`
- `next/src/content/itineraries/ridge-to-sea-two-night-escape.json`
- `next/src/content/venues/polperro-villas.json`
- `next/src/content/venues/polperro.json`
- `next/src/data/facts/accommodation.json`
- `next/src/data/facts/food.json`
- `next/src/data/facts/wine.json`
- `next/src/pages-drafts/weddings/winery-wedding-venues-mornington-peninsula.astro`
- `next/src/pages/explore/day-trips.astro`
- `next/src/pages/explore/rainy-day.astro`
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`
- `next/src/pages/journal/mornington-peninsula-day-trip.astro`
- `next/src/pages/journal/mornington-peninsula-in-autumn.astro`
- `next/src/pages/journal/mornington-peninsula-in-winter.astro`
- `next/src/pages/journal/mornington-peninsula-wedding-venues.astro`
- `next/src/pages/stay/couples-retreats.astro`
- `next/src/pages/stay/index.astro`
- `next/src/pages/stay/villas.astro`
- `next/src/pages/stay/vineyard-stays.astro`
- `next/src/pages/stay/winery-accommodation.astro`
- `next/src/pages/weddings/index.astro`
- `next/src/pages/weddings/winery-wedding-venues-mornington-peninsula.astro`

## Source-search inventory

- `next/src/data/facts/food.json`
- `next/src/data/facts/accommodation.json`
- `next/src/data/facts/things-to-do.json`
- `next/src/data/facts/wine.json`
- `next/src/content/tours/temptation-sailing-bay-cruise.json`
- `next/src/content/tours/polperro-dolphin-swim.json`
- `next/src/content/articles/the-spring-peninsula.md`
- `next/src/content/articles/where-to-stay-for-a-two-night-escape.md`
- `next/src/content/articles/the-couples-weekend.md`
- `next/src/content/articles/the-vineyard-villa-weekend.md`
- `next/src/content/articles/the-sunset-hour.md`
- `next/src/content/articles/first-time-peninsula.md`
- `next/src/content/articles/dog-friendly-wineries-mornington-peninsula.mdx`
- `next/src/content/articles/where-to-eat-mornington-peninsula.mdx`
- `next/src/content/articles/the-sunset-drink.md`
- `next/src/content/articles/mornington-peninsula-winery-guide.mdx`
- `next/src/content/articles/a-winter-peninsula-weekend.md`
- `next/src/content/articles/the-one-booking-peninsula-day.md`
- `next/src/content/articles/the-easter-peninsula.md`
- `next/src/content/articles/the-sorrento-weekend.md`
- `next/src/content/articles/how-to-plan-a-peninsula-weekend.md`
- `next/src/content/articles/even-keel-polperro-wines.md`
- `next/src/content/articles/hatted-restaurants-mornington-peninsula-2025.mdx`
- `next/src/content/articles/things-to-do-mornington-peninsula.mdx`
- `next/src/content/articles/best-wineries-red-hill.md`
- `next/src/content/articles/the-thermal-springs-weekend.md`
- `next/src/content/articles/the-four-hour-peninsula.md`
- `next/src/content/articles/the-cellar-door-short-list.md`
- `next/src/content/articles/the-chardonnay-case.md`
- `next/src/content/articles/area-guide-red-hill.md`
- `next/src/content/articles/where-to-stay-mornington-peninsula.mdx`
- `next/src/content/articles/how-to-build-a-red-hill-saturday.md`
- `next/src/content/articles/the-market-saturday.md`
- `next/src/content/articles/the-birthday-weekend.md`
- `next/src/content/venues/polperro.json`
- `next/src/content/venues/many-little.json`
- `next/src/content/venues/mantons-creek-estate.json`
- `next/src/content/venues/cassis.json`
- `next/src/content/venues/polperro-villas.json`
- `next/src/content/venues/_accuracy_pass.py`
- `next/src/content/events/mornington-peninsula-winter-wine-weekend-winter-wine-festival.json`
- `next/src/content/events/wild-mushroom-forage-lunch-with-the-kitchen.json`
- `next/src/content/events/tall-poppy-melbourne-design-week-exhibition.json`
- `next/src/content/events/winter-wine-weekend-winter-wine-festival-red-hill-showgrounds.json`
- `next/src/content/events/soil-cellar-flinders-truffles-x-polperro-winery.json`
- `next/src/content/events/mornington-peninsula-winter-wine-weekend-2026.json`
- `next/src/content/events/restore-pamper-retreat-at-polperro-farmhouse.json`
- `next/src/content/events/winter-wine-weekend-full-3-day-peninsula-program.json`
- `next/src/content/events/sound-circle-full-moon-sound-journey-at-peninsula-hot-springs.json`
- `next/src/content/events/red-hill-truffles-winter-truffle-hunt-season.json`
- `next/src/content/events/polperro-cellar-table-private-dining-experience.json`
- `next/src/content/events/red-hill-brewery-secret-stash-weekend.json`
- `next/src/content/events/hill-ridge-community-market-september-2026-restart.json`
- `next/src/content/events/flinders-truffles-winter-truffle-hunt-season.json`
- `next/src/content/itineraries/ridge-to-sea-two-night-escape.json`
- `next/src/content/insiders-thirty/2026.json`
- `next/src/content/tour-operators/temptation-sailing.json`
- `next/src/content/tour-operators/polperro-dolphin-swims.json`
- `next/src/content/editorial_blocks/long-lunch-intro.md`
- `next/src/content/editorial_blocks/cellar-door-lunch-intro.md`
- `next/src/content/editorial_blocks/best-restaurants-intro.md`
- `next/src/content/editorial_blocks/rainy-day-intro.md`
- `next/src/content/events/archive/winter-wine-weekend-june.json`
- `next/src/content/venues/__pycache__/_accuracy_pass.cpython-311.pyc`
- `next/src/pages-drafts/weddings/winery-wedding-venues-mornington-peninsula.astro`
- `next/src/pages/stay/winery-accommodation.astro`
- `next/src/pages/stay/couples-retreats.astro`
- `next/src/pages/stay/vineyard-stays.astro`
- `next/src/pages/stay/luxury.astro`
- `next/src/pages/stay/villas.astro`
- `next/src/pages/stay/index.astro`
- `next/src/pages/stay/red-hill.astro`
- `next/src/pages/walks/easy-walks-mornington-peninsula.astro`
- `next/src/pages/journal/mornington-peninsula-wedding-venues.astro`
- `next/src/pages/journal/mornington-peninsula-in-autumn.astro`
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`
- `next/src/pages/journal/mornington-peninsula-day-trip.astro`
- `next/src/pages/journal/mornington-peninsula-in-winter.astro`
- `next/src/pages/weddings/index.astro`
- `next/src/pages/weddings/winery-wedding-venues-mornington-peninsula.astro`
- `next/src/pages/wine/wine-region.astro`
- `next/src/pages/wine/chardonnay.astro`
- `next/src/pages/wine/merricks.astro`
- `next/src/pages/wine/pinot-noir.astro`
- `next/src/pages/wine/main-ridge.astro`
- `next/src/pages/wine/index.astro`
- `next/src/pages/wine/red-hill.astro`
- `next/src/pages/wine/balnarring.astro`
- `next/src/pages/eat/hatted-restaurants.astro`
- `next/src/pages/eat/[slug].astro`
- `next/src/pages/eat/long-lunch.astro`
- `next/src/pages/eat/fine-dining.astro`
- `next/src/pages/eat/date-night.astro`
- `next/src/pages/eat/cellar-door-lunch.astro`
- `next/src/pages/eat/best-restaurants.astro`
- `next/src/pages/eat/index.astro`
- `next/src/pages/guides/easter-long-weekend.astro`
- `next/src/pages/guides/winter.astro`
- `next/src/pages/explore/rainy-day.astro`
- `next/src/pages/explore/day-trips.astro`
- `next/src/pages/explore/things-to-do.astro`
- `next/src/pages/explore/places/[slug].astro`

## Verification and remaining audit findings

The complete live sitemap was fetched on 7 September 2026: 617 URLs checked, zero request errors, 100 pages containing the word Polperro (including the unrelated dolphin operator and indirect card references). Source search covered 102 files under next/src, including historical events and unpublished drafts. Build output was additionally scanned beyond the live sitemap. The final archived Winter Wine Weekend recommendation now avoids an unsupported Monday visit.

Independent QA checked Lauren's concerns in visible copy, metadata, links and shared facts. Full build:search and content validation passed; 25 targeted built-output assertions passed before final encoding and archival-Monday fixes. Final checks and production provenance are recorded in the delivered audit.

Two event records need organiser reconfirmation: Cellar Table's cited page advertises September-October 2025, which does not support a May 2026-April 2027 booking window; Restore & Pamper is an on-request package, not evidence for fixed public dates over that same year. This correction does not claim those event dates are verified. See https://www.polperrowines.com.au/end-of-year-events-at-polperro-and-many-little/ and https://www.polperrowines.com.au/restore-pamper-retreat-at-polperro-farmhouse/. Historic ratings, the precise current maximum cellar-room group size (official pages differ), and other time-sensitive claims not covered by Lauren remain subject to direct re-verification.

Additional source file corrected during final QA: `next/src/content/events/mornington-peninsula-winter-wine-weekend-2026.json`.
