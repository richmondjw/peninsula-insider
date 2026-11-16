# Search opportunity implementation, 11 October 2026

## Scope

Improve the existing restaurant, Rosebud and dog-friendly guides. Keep the current site architecture, factual photographs and verification history. No new visitor data collection, Ads campaign or paid activity.

Openrush sampled 20 of 592 discovered URLs. Its search-index rankings and traffic estimates are directional, not measured visits. Its competitor gap list needed regional filtering. The homepage long-title warning concatenated the HTML document title and the SVG map title. The alt warning also needs DOM-aware review: decorative empty alt text is intentional, and an `img` string inside a script comment is not an image element.

## Measured baseline

The existing Search Console connector successfully read `sc-domain:peninsulainsider.com.au` with owner access. Final web data covers 10 September to 7 October 2026, excluding the latest preliminary days. Store receipts in the ignored `.private/` directory. Query rows omit anonymised queries and must not be treated as complete property totals. Openrush itself remains disconnected; its dashboard OAuth connection is separate from this working connector.

Assess the same three canonical page groups over the first 28 complete days after publication, against this window. Record clicks, impressions, CTR and impression-weighted position; compare query intent and page together. Low counts make short-term ranking changes noisy. No uplift is claimed before observation.

## Implementation

- Restaurants: visible evening-session comparison, official booking sources, shorter introduction and early links into dinner and dog-friendly dining. Winery cards and ItemList schema use canonical venue routes.
- Rosebud: short-outing, golf-day and weather-alternative choices, with time allowances explicitly editorial. Distinguish nearby Fingal hot springs from Rosebud itself. Replace unsupported camping-availability and swimming assurances in the FAQ with source-bound activity and pier-access guidance.
- Dogs: move the meal-versus-tasting distinction and dining link to the opening of the winery article. Add restaurant intent and evening-table questions to the existing dining article. Preserve `lastVerified`; the October `updatedAt` reflects copy and navigation changes only.
- Contextual links from Mornington, Rosebud and Eat. Site-wide graph repair remains in separate PR #661.

## Sources and bounds

- The Rocks contact page: https://www.therocksmornington.com.au/contact-us/ . Published dinner Wednesday to Monday, 5.30pm to 9pm; Tuesday closure and winter Sunday-evening closure. Read 11 October 2026.
- Many Little contact page: https://www.manylittle.com.au/contact . Dinner Thursday to Sunday from 5pm; weekend bar walk-ins are a separate service. Read 11 October 2026.
- Parks Victoria Rosebud Pier: https://www.parks.vic.gov.au/places-to-see/sites/rosebud-pier . Jetty Road location, playground, picnic setting, leashed dogs and no jumping/diving. Read 11 October 2026.
- Existing Rosebud Country Club record and published guide supply the golf comparison; no new whole-record verification date is assigned.
- Existing dog guide retains its September policy checks. October edits do not imply a fresh check of every venue policy or assistance-animal rule.

Existing linked-guide support was read during implementation: `next/src/content/articles/dog-friendly-cafes-pubs-wineries-mornington-peninsula.md` records the official Green Olive, Flinders Hotel and St Andrews Beach Brewery policies and seating limits; `next/src/content/experiences/rosebud-country-club.json` records the North/South courses and public booking URL; the Peninsula Hot Springs and Alba venue records locate both in Fingal; `rainy-day-peninsula.md` includes indoor dining and cellar-door options alongside thermal bathing. These references support the new navigation summaries, not a claim that every underlying record was reverified today.

No claim of a first-hand visit or current availability is added. Operator calendars remain the source for booking a specific date.

## Release

Implementation is isolated from dirty Windows and WSL checkouts. Validation and exact revision are recorded in the acceptance receipt. Publication status must be confirmed separately from source/build success.
