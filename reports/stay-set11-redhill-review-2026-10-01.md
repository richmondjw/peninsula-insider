# Stay Set11: Red Hill and Brewer's Cottage review

Date: 1 October 2026\
Status: local source and development preview verified; integrated static build, independent review, release and public acceptance pending\
Owner: Red Hill page implementation agent\
Project: Peninsula Insider

## Decision and outcome

The old Red Hill page mixed Red Hill and Red Hill South with Jackalope in Merricks North and Peninsula Hot Springs Glamping in Fingal. The new guide makes the local choice explicit: estate room or villa, versus a private villa or cottage. Merricks North and Fingal remain useful alternatives in a separately labelled section.

The Red Hill Brewery operator currently states that Brewer's Cottage is closed for short stays because it is rented for 2026. The cottage is therefore paused as a short-stay listing. The brewery itself has not been marked closed, and no conclusion about cottage availability after 2026 is made. The preserved cottage detail explains this directly.

## Changes

- Rebuilt `/stay/red-hill/` with two first-screen choice links, six geographically accurate local properties, exact-locality labels, practical booking checks, and separate Merricks North/Fingal alternatives.
- Used actual Lindenderry exterior and Polperro winery grounds photography. The Polperro caption explicitly says the picture does not show its villas.
- Set Brewer's Cottage to `status: paused`, removed its booking URL, added a time-bounded operator-confirmed notice, and excluded it from sitemap and search.
- Removed the cottage card and booking action from `/stay/cottages/`, retaining a dated reader-facing correction.
- Extended listing eligibility to exclude all paused venues. Before the change, all three existing paused venue records had `sourceStatus: unsourced` and were already excluded; the change removes zero other existing records.
- Preserved the cottage's direct detail route as a 200 page with a specific notice, no booking action, no LodgingBusiness schema and `noindex`.
- Added two regression journeys for Red Hill first-visit choices and the cottage's negative booking paths.

## Source evidence checked

- Brewer's Cottage operator page, fetched directly on 1 October 2026: https://www.redhillbrewery.com.au/brewers-cottage/ . Current HTML contains the notice "CURRENTLY CLOSED FOR SHORT STAYS - PERMANENTLY RENTED FOR 2026". A search engine cache of the page omitted the current notice, so the direct operator response was treated as current.
- Red Hill locality and property addresses from operator pages: https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/accommodation/ , https://www.polperrowines.com.au/escape/villas/ , https://www.portphillipestate.com.au/book-accommodation/ , https://www.cassisredhill.com.au/ , https://www.birchcreek.com.au/ , https://treetopsatredhill.com.au/ .
- Visit Victoria catalogue and annotations: `vv-25061209` is Lindenderry, credited to Peter Foster; `vv-143752` is Polperro Winery grounds, credited to Peter Tarasiuk. Root integration must record the two new page placements in `ops/records/visit-victoria/placements.json`.

## Local verification

At 320 x 568 with the first-visit cookie notice visible, both primary choice links end at y561, are 78px high, and fit within the viewport. At 390 and 1365 pixels, there is no horizontal overflow or page error. Both images have accurate alt text; the lazy Polperro image decoded after scrolling into view. The 12 distinct same-origin page links checked from Red Hill returned 200. Sampled text contrast ratios were 7.13:1 to 16.13:1. The estate anchor puts its heading at y223 on the 320px viewport, clear of the sticky header.

The cottage negative path was checked in development preview at `/stay/`, `/stay/best-accommodation/`, `/stay/cottages/`, `/stay/red-hill/`, `/stay/vineyard-stays/`, `/stay/winery-accommodation/`, and `/explore/places/red-hill/`: all returned 200, none had a link to the paused cottage. Cottages and Red Hill carry the dated explanatory note. The direct cottage detail returned 200 with a noindex/nofollow marker, the exact short-stay notice, zero cottage booking links, and no LodgingBusiness schema. The dynamic sitemap omitted the cottage and retained the Red Hill guide.

## Author review across 23 lenses

| Lens | Finding |
| --- | --- |
| 1. Intent match | Estate versus private stay is clear on arrival. |
| 2. First-visit utility | Both choice links fit 320 x 568 with cookie notice visible. |
| 3. Information hierarchy | Choice, context, properties, alternatives and final checks follow decision order. |
| 4. Heading hierarchy | One H1, section H2s and named card H3s. |
| 5. Typography | Sora display and Figtree body follow site tokens. |
| 6. Colour | Harbour brand blue and neutral ground keep a coherent tone. |
| 7. Contrast | Sampled foreground/background ratios exceed 7:1. |
| 8. Spacing | Choice cards and property cards have separate visual rhythms. |
| 9. Photography | Actual Lindenderry and Polperro subjects, with no text overlay. |
| 10. Image truth | Exterior and winery grounds are labelled, with no room/view implication. |
| 11. Mobile composition | 320 and 390 widths have no horizontal overflow. |
| 12. Desktop composition | 1365px split hero and three-column comparison are balanced. |
| 13. Touch targets | First-screen choices measure 78px high; card actions have 44px minimum height. |
| 14. Keyboard use | Links have focus-visible treatment; anchor targets clear the sticky header. |
| 15. Navigation | Red Hill, wine estate and specialist thermal routes are explicit. |
| 16. Geography | Red Hill, Red Hill South, Merricks North and Fingal are separated. |
| 17. Property facts | Key formats and room-specific caveats trace to operator pages. |
| 18. Booking handoff | Six current choices have direct operator paths; paused cottage has none. |
| 19. Trust and corrections | Dated cottage note states precise scope and source. |
| 20. Accessibility copy | Image alt and visible captions identify what each image depicts. |
| 21. Structured data | Collection and FAQ text correspond to visible content; paused cottage emits no lodging node. |
| 22. Search hygiene | Canonical Red Hill page remains indexed; paused cottage is noindex and out of sitemap. |
| 23. Resilience | Current 200 detail remains readable while availability is withheld; integrated build and public checks remain pending. |

Author provisional assessment: 92-94/100, subject to independent review and the exact release build. This is not a 99/100 result or a live acceptance claim.

## Remaining gates

1. Add the two Visit Victoria placement ledger entries for the new guide.
2. Run the integrated static build and the new regression journeys on the release source.
3. Obtain independent 23-lens review, adjust any material findings, then run CI and public browser acceptance after release.
