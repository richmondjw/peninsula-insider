# Yurt Hideaway: paused listing and booking route

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Pause the Yurt Hideaway recommendation until the host confirms that stays and a booking route have resumed.
**Review date:** 1 October 2026

## Baseline and decision

The public venue record sent its booking action to the operator's homepage while naming Airbnb as the booking provider. It presented a fixed 4.97 rating, a 100% recommendation claim, a multi-night discount, a five-minute drive, a separate "en-suite" bathroom and a peak-season booking instruction. Several claims were stale, contradicted the operator's own description or had no useful current booking evidence. The hero photograph depicts a bay beach rather than the yurt, although the record already labels it illustrative.

The hypothesis was that removing the false certainty and active booking path would prevent a visitor from planning around accommodation whose current availability cannot be verified. This is a protective editorial change, not a claim that the venue has permanently closed.

## Source of record and freshness

- A direct HTTP check on **1 October 2026** returned **503** for the [operator homepage](https://yurthideaway.com.au/), [book-now page](https://yurthideaway.com.au/book-now/) and [contact page](https://yurthideaway.com.au/contact/). The response resembled a maintenance page. A 503 can be temporary.
- A search-engine copy of the operator's [book-now page](https://yurthideaway.com.au/book-now/), last crawled about two months before this review, explicitly said bookings were closed until further notice. The older [operator homepage](https://yurthideaway.com.au/) and [amenities page](https://yurthideaway.com.au/about/) still promoted stays and described the six-metre yurt, private garden, outdoor kitchenette and separate bathroom. Their marketing and booking states therefore cannot be treated as current together.
- The exact [Airbnb listing](https://www.airbnb.com.au/rooms/18571659) was available to the search engine's older crawl, but returned **410** in the direct HTTP check on 1 October. This is a failed destination in our check, not proof of closure or removal for every visitor.
- The older [operator terms](https://yurthideaway.com.au/terms-conditions/) say no pets and a maximum of two guests. The [Airbnb description](https://www.airbnb.com.au/rooms/18571659) and operator amenities page both state that the bathroom is a few steps from the yurt, **not ensuite**. Ratings and offers differ between cached pages and can change without notice. None is retained as a current recommendation claim.
- No host contact or completed booking-flow check was available, so trading and availability remain unresolved.

## Bounded change

The venue JSON now has `status: paused`, `sourceStatus: unsourced` for the **current booking claim**, and `sitemapExclude: true`. The existing listing predicate removes that combination from recommendations and maps while preserving the detail route. The website and booking URL were withdrawn, with their previous destinations recorded in `retiredSourceLinks`. The booking provider is `none` and the detail page has no booking action. The page copy leads with the paused state, then separates documented historic amenity details from unresolved availability. It removes rating, discount, drive-time, peak-booking and unsupported uniqueness claims. The bathroom is correctly described as separate. The source-status note records the 1 October HTTP checks and the restoration requirement. The venue-level `lastVerified` remains **7 May 2026** because the current operation and all amenity details were not freshly verified; `sourceHealthCheckedOn` dates only the scoped link and availability check.

The accommodation facts registry also carried Yurt as an `open` Glamping tier example. It now removes Yurt from active tier examples, retains record F013 for recovery, and marks current availability unverified and editorial status paused. The registry retains its older file-wide update date; F013 alone carries the 1 October availability check. A scan of direct stay pages and articles found no other Yurt recommendation beyond the connected MDX source, which now points to the paused listing. Both legacy article routes redirect to the canonical `/stay/best-accommodation/` page; that public page does not mention Yurt.

No rights-recorded photo of the actual yurt was found in the local Visit Victoria placement catalogue or sourced image filenames. The JSON beach image remains an **illustrative** fallback; its alt text is empty and `decorative: true`. The integrated build instead uses a published CMS override showing the actual yurt interior, confirmed in a preview screenshot by the release owner. Its CMS slot stores URL, alt, caption and credit but no license or rights record found in this review. The illustrative beach disclosure must not be applied to this different image. The shared template now takes credit from the CMS override when it exists, so the fallback beach credit cannot be falsely inherited.

## Review lenses and verification

| Applicable lens | Before | Candidate |
| --- | --- | --- |
| Booking honesty | Homepage link presented as a booking action, provider labelled Airbnb | No active booking action while live destinations fail |
| Freshness transparency | Old review date and fixed rating/offer assertions | Dated pause and exact unresolved source state |
| Factual accuracy | Separate bathroom described as en-suite; fixed drive time and unverified uniqueness | Correct separate-bathroom wording; unstable claims removed |
| Image truth and accessibility | Source beach image had descriptive alt that could be heard as a venue image | Decorative fallback alt; actual-yurt CMS override stays unlabelled as illustrative, with its own credit if present. Override rights documentation still needs review |

This scoped record received **no new 23-layer visual percentage**. Its page composition and common venue template were not changed here, and a visual score without the integrated build would be false precision. The Impeccable source detector found two pre-existing side-border patterns in the shared venue template; they are outside this record edit. The URL detector could not run because this WSL installation lacks a Chromium binary. The built detail was inspected for paused-state content, booking and search signals. My computer-use session could not start because of a sandbox error, but the release owner captured 320px and 1365px static screenshots and the independent reviewer checked 320px, 390px and 1365px without overflow or JavaScript errors. A final integrated rebuild remains pending after the shared price-display and CMS-credit changes.

The JSON parsed after edit. Focused content validation, house style, no-pricing and image-rights checks passed (49 image-rights tests); the scoped diff check passed. The record is no longer eligible for active listing under `isListableVenue`. The integrated HTML confirms the paused notice, no Yurt booking action or price band, `noindex, nofollow`, Pagefind exclusion, and no `LodgingBusiness` schema. A focused rendered test passes on this artifact; related active stay cards may still contain their own booking links.

## Restoration gate, evaluation and rollback

Recheck by **8 October 2026** and then on the normal venue-freshness cadence. Restore active status only after a live primary booking/contact route works and the host or booking calendar confirms stays are accepted. Revalidate amenity and house-rule details, correct the booking provider and destination together, and document the rights and attribution for the current CMS yurt photograph, or replace it with a rights-recorded photo, before presenting the place as a current recommendation again. If the source recovers but bookings remain closed, keep the pause. If this change hides a verified available stay, the prior record is recoverable from Git, but do not restore its stale rating, discount or ensuite wording.
