# Set 7 Luxury and Villas: independent design and facts QA

**Date:** 1 October 2026\
**Reviewer:** independent Set 7 QA agent\
**Scope:** read-only review of next/src/pages/stay/luxury.astro, next/src/pages/stay/villas.astro, their rendered local routes, linked venue records and operator evidence. No implementation file was edited by this reviewer. Scores below are manual design judgments, not user-test results or a verified industry percentile. The local build is not proof of a public deployment.

## Provisional 23-lens score

The pre-change public baseline was approximately 63–69 for Luxury and 60–66 for Villas, mainly because the pages made incorrect format/pool claims and delayed the stay decision. The scores below assess the revised local pages. A defensible 99/100 would require independent reader, assistive-technology, booking and production-performance evidence.

| Lens | Luxury | Villas |
| --- | ---: | ---: |
| First-fold promise | 92 | 92 |
| Category scope | 94 | 93 |
| Format differentiation | 93 | 96 |
| Booking dependencies | 90 | 92 |
| Factual traceability | 90 | 91 |
| Freshness disclosure | 88 | 88 |
| Copy economy | 90 | 90 |
| Hierarchy and scanning | 92 | 93 |
| Wayfinding | 92 | 93 |
| Link integrity | 96 | 96 |
| Mobile reflow | 94 | 94 |
| 320px first visit | 92 | 92 |
| Desktop composition | 93 | 91 |
| Typography | 94 | 93 |
| Contrast | 94 | 94 |
| Tap targets | 93 | 93 |
| Keyboard and focus | 91 | 91 |
| Semantics and headings | 93 | 93 |
| State and feedback | 90 | 90 |
| Image truth | 95 | 95 |
| Media and performance | 88 | 88 |
| Motion and stability | 96 | 96 |
| Newsletter fit | 86 | 86 |
| **Equal-weight mean** | **92.00** | **92.17** |

## Measured local behavior

- At 320×568 with the cookie notice present, the Luxury and Villas primary CTAs are visible and hit-clear at y475–523. At 390×844 both are y515–563. At 1365×900 Luxury is y628–676 and Villas y707–755. The original Luxury desktop image-height bug put its CTA below the fold; an explicit image height corrected it.
- The 320px choice-card continuation is legible on both pages. Luxury shows four two-column decisions; Villas shows two full-width decisions, followed by the first venue group. Scroll reveal was allowed to settle before visual inspection.
- At 320, 390 and 1365, both pages returned HTTP 200 in the generated static artifact served at http://localhost:4357/ and document width equalled viewport width. No browser page errors were observed in the final complete-card pass.
- Nine Luxury venue cards and four Villas venue cards rendered, and every image loaded after scrolling. All 15 unique internal destinations across the guides and related paths returned HTTP 200 from the generated static artifact, including Port Phillip Estate's direct wine route.
- Keyboard Tab reached each primary CTA with a visible 2px solid focus outline (11 Tabs at phone widths, 27 at desktop from page start). After the sticky-header offset fix, all 12 primary and first-group anchor checks landed with their headings below the masthead and breadcrumb at 320, 390 and 1365. Every heading remained hit-clear.
- JSON-LD parsed as CollectionPage, BreadcrumbList and FAQPage on both routes. The ItemList enumeration is the valid Schema.org ItemListUnordered; Luxury declares nine entries and Villas four, matching rendered venue cards. Port Phillip Estate's Luxury ListItem uses /wine/port-phillip-estate/.

## Factual and image checks

- Luxury and Villas now distinguish Cassis' two mineral-plunge-pool villas from the three outdoor-bath villas, matching the [Cassis operator accommodation page](https://www.cassisredhill.com.au/accommodation).
- Villas describes Alba's daily thermal bathing plus one upgrade to a separate private-pool experience, matching the [Alba Sanctuary villa offer](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/). The pages do not promise a pool attached to every Alba villa.
- Port Phillip Estate is correctly treated as [six suites](https://www.portphillipestate.com.au/quiet-luxury/), not a villa. Villas separates it and Mantons Creek from the primary villa list. The current [Mantons Creek accommodation page](https://mantonscreekestate.com.au/accommodation) does not state a room count, so that should not be treated as a current booking guarantee.
- Luxury's hero visibly depicts guests with wine overlooking the Jackalope vineyard, matching its alt text and caption. The image is recorded in the Visit Victoria placement ledger for pages/stay/luxury and credited to Peter Foster. Villas' hero visibly depicts a Polperro villa interior with an indoor spa; the Polperro venue record credits Polperro and marks the image venue-media-kit. The asset and record support the on-page captions. This review did not audit the underlying licence agreements.
- Each page asks readers to check the exact room, bathing, dining and guest conditions before booking. Operator availability and package inclusions were not tested for individual dates.

## Limits and remaining work

The shared dev server briefly rendered empty venue collections while a concurrent build cleared Astro's content cache. Final responsive, image, card, link, anchor, focus and JSON-LD checks above were repeated on the generated static artifact, so that transient does not affect these receipts. The overall build generated 1008 pages but failed a separate operator link-health probe-ledger gate; this page acceptance is not release clearance. A full screen-reader session, colour-contrast measurement, real user comprehension test, production Core Web Vitals, conversion and booking-path completion were outside this bounded review.
