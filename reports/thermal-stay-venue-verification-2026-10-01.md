# Thermal stay venue truth and directions

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Correct five site-level pins, the Alba contact and the Sanctuary image and stay details in the next bounded release.
**Review date:** 1 October 2026

## Baseline and hypothesis

The public Sanctuary detail page used a generic massage photograph while its alt text called it Sanctuary accommodation. Its stored coordinate pointed about 6 km from the published Fingal address. The Alba springs listing and three Peninsula Hot Springs records also held pins several kilometres from their stated addresses. The hypothesis is that a truthful setting image, accurate room distinctions and site-level visitor pins will improve trust and make the onward trip workable.

The public Sanctuary page returned HTTP 200 at 320, 390 and 1365 px with no browser errors or overflow, but its first-visit privacy card obscured lower phone copy. The original 320 px action began around y677, below a 568 px first view. The venue reviewer gave a provisional baseline of about 72/100 across the 23 page lenses. A comparable post-change visual grade awaits the integrated build; this baseline is an expert estimate, not measured visitor behaviour.

## Corrected records

| Record | Previous problem | New site-level point |
| --- | --- | --- |
| Sanctuary at Alba | Generic hero and pin near -38.444, 144.867 | Alba address point -38.39219, 144.84614 |
| Alba Thermal Springs | Pin near -38.3502, 144.9456; stale telephone | Alba address point -38.39219, 144.84614; +61 3 5985 0900 |
| Peninsula Hot Springs | Pin near -38.4639, 144.8932; Cape Schanck place label | Shire point -38.40693, 144.84273; Fingal place label |
| Peninsula Hot Springs Eco Lodges | Pin near -38.4542, 144.8661 | Shire point -38.40693, 144.84273 |
| Peninsula Hot Springs Glamping | Pin near -38.4542, 144.8661 | Shire point -38.40693, 144.84273 |

These are visitor site points at the published addresses, not individual accommodation entrances. Guests should follow their booking instructions for on-site parking. The Alba point was cross-checked against its current 282 Browns Road address and an address-level map record; the Peninsula Hot Springs point comes from Mornington Peninsula Shire's map for 140 Springs Lane. The old pins missed the address-level destinations by about 5.6 to 10 km, depending on the record.

Sanctuary now distinguishes five villas from two rooms, identifies the published single private-pool upgrade instead of implying a plunge pool at each unit, and directs readers to book extra spa treatments separately. The new Visit Victoria aerial depicts Alba's estate, not the rooms; its caption, alt and illustrative status disclose that distinction. The placement ledger records this venue use of asset vv-163821 and the stay-hub use of Eco Lodge photo vv-172319. Both had rights records before selection.

The nearby luxury stay guide also removed an unsupported claim that Sanctuary has five private-pool villas. Its modification date now reflects this source correction.

## Source and QA record

- Alba's current [Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/), [villa](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/), [room](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/rooms/) and [contact](https://albathermalsprings.com.au/get-in-touch/) pages support the accommodation and telephone facts.
- The [Alba address map](https://mapcarta.com/N12774850601) gives an address-level location consistent with 282 Browns Road. The point is an inference from a mapped address, not a room entrance supplied by Alba.
- Peninsula Hot Springs' [visitor information](https://www.peninsulahotsprings.com/plan-your-visit) gives 140 Springs Lane, Fingal. [Mornington Peninsula Shire's mapped event](https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/Seek-the-Heat-at-Peninsula-Hot-Springs) gives the site point used here.
- The existing Visit Victoria catalogue and the two new rows in the placement ledger record image rights and where-used provenance.

Before the integrated build, JSON parsing, coordinate-bound checks, exact five-record assertions, image-licence checks, a zero-missing-placement scan and intended diff checks passed. Public route, media, responsive presentation and map-action checks remain release gates. A venue pin is not proof of a correct turn-by-turn route; the destination should be tested in normal mapping software as well.

## Remaining issues and evaluation

Eco Lodges still displays as a Glamping type because the current venue taxonomy has no lodge value and the glamping directory explicitly includes it. That needs a separate category and detail-template correction. No rights-recorded photograph of the actual Peninsula Hot Springs glamping tents was found among the available images, so no substitute was invented. Peninsula Hot Springs sources disagree on accommodation minimum age; this set avoids a fixed age claim and directs readers to the current booking terms. Yurt Hideaway's separate record still carries unverified price, rating and timing claims and was removed from the refreshed hot-springs hub.

By **8 October 2026**, verify live map-link destinations, reader corrections, image rendering, operator contact and booking inclusions. Revert the bounded venue data if the published map or image points readers to the wrong place. Independent post-change grading and real visitor outcomes are required before any 99% claim.


## Independent integrated check

The final integrated build exited 0. Independent artifact review found no route, image or map-interaction blocker at 320, 390 or 1365 px. The five corrected map rows had the intended coordinates, and row-to-pin peeks worked on phone and desktop. The Sanctuary page scored **86.6/100** on applicable independent expert lenses. Its mobile action remains below the first fold at 320 px, the estate image is illustrative and disclosed, the venue-level lastVerified value remains older than this scoped source check, and generic related cards dilute the detail page. This set does not treat the scoped address and accommodation check as a full venue re-verification. Public deployment and visitor outcomes remain unverified here.
