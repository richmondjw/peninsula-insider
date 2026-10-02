# Set 7: Mantons Creek and Cape Retreat suite taxonomy

**Project:** Peninsula Insider\
**Owner:** Set 7 Stay implementation; release and live verification remain with the parent task.\
**Decision:** Adapt the two records and shared Stay taxonomy. Both operators describe guest suites, so continuing to label these properties as self-contained villas would mislead a stay decision.\
**Checked:** 1 October 2026 (Australia/Sydney). No commit, push, production data mutation or release in this subtask.

## Source findings

- [Mantons accommodation](https://mantonscreekestate.com.au/accommodation) advertises boutique vineyard-view accommodation and links to current direct bookings. Its [events page](https://mantonscreekestate.com.au/events-enquiry) calls the rooms four Guest Suites. The public copy now uses “guest suites” without asserting room amenities, age limits or fixed inventory.
- The [Mantons restaurant](https://mantonscreekestate.com.au/restaurant) currently publishes regular lunch service from 11:45 am Friday to Sunday with reservations essential. Its [cellar door](https://mantonscreekestate.com.au/mantons-creek-cellar-door) publishes a separate weekend schedule. No current operator page supports “Quattro”, breakfast-through-dinner service, the prior exact drive times or an adults-only guest policy.
- [The Cape Retreat home](https://www.thecaperetreat.com.au/) and [about page](https://www.thecaperetreat.com.au/about) both identify twelve guest suites and group-oriented facilities at 41 Trent Jones Drive, Cape Schanck. [Booking and enquiry](https://www.thecaperetreat.com.au/book) is the direct visitor path. The home and about pages conflict on total sleeping capacity (43 versus 37), so no capacity claim was retained. Individual-suite booking format remains unverified.

## Changes

- Mantons Creek Estate and The Cape Retreat are now suite stays, with corrected signatures, editorial notes, known-for labels, booking links and verification dates. Cape Schanck is classified in the ocean-coast zone. The Mantons record no longer promises adult-only rooms, private balconies, exact travel times, Quattro or dinner service. The Cape record no longer implies a self-contained villa or a confirmed individual-suite booking model.
- Added suite to the venue schema, Stay route predicate, visible card and detail labels, both booking-action label branches, Stay filters, map grouping, footer/subregion links, imagery fallback, content registry and entity-index routing. The new category still resolves to /stay/[slug]/, and its booking action says “Check availability.”
- Corrected Mantons assertions in the canonical /stay/vineyard-stays/ guide, its metadata and FAQ JSON-LD. The visible and structured first FAQ use the same Mantons sentence. The generic dinner itinerary now directs readers to check service before reserving. The canonical URL is unchanged.

## Checks

- npm run validate:content: passed.
- node scripts/test-facets.mjs: passed, including new assertions for both suite records and the Suites filter.
- npm run lint:taxonomy:strict: exited 0, zero errors; existing advisory warnings remain.
- Local Set 7 dev routes /stay/mantons-creek-estate/, /stay/cape-retreat/ and /stay/vineyard-stays/: HTTP 200. Rendered detail pages show Suite, the direct operator booking URL, “Check availability”, and LodgingBusiness schema. The vineyard guide retains its canonical link and the corrected FAQ JSON-LD.
- npx astro check: exits 1 amid 137 repository-wide diagnostics, including a missing optional @astrojs/vercel module and errors in draft pages. This is not a passing gate; the parent task's integrated build and generated-render assertions are still required.

## Remaining limits

- Both venue records use existing context images marked illustrative. No property-specific photo rights were established here.
- Room availability, inclusions and whether The Cape Retreat offers independently bookable suites require operator confirmation at booking time.
- next/src/content/articles/mantons-creek-vineyard.md still has stale “call ahead / keep lunch elsewhere” draft copy. It is status: draft, has no current built journal route and does not feed a public excerpt. Correct it against the current restaurant and cellar-door pages before publishing that article.
- Static search and any production entity index must be checked after the integrated build/release. The routing script has been updated for suite; no production database refresh was run in this subtask.- The secondary facts-rail booking action still says Book now for all venue types. On the new Suite details, the primary action says Check availability; the Cape URL opens an enquiry page. Align the secondary label before release if integrated QA confirms the inconsistency remains.
