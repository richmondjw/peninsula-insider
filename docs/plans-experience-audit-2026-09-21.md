# Plans experience: design audit and independent brand review

Date: 21 September 2026. Scope: [Peninsula Insider Plans](https://peninsulainsider.com.au/explore/plans/), its itinerary details and My Trip handoff.

James requested a deep design, experience and interactive-development review, with a second agent assessing the ideas against the project's brand, vision and purpose. The initial review was read-only; implementation followed separate user approval. This document preserves the original findings and the reasoning behind the approved changes. Implementation statements describe the working changes, not proof of production deployment. See the [release record](plans-experience-release-2026-09-21.md) for validation and deployment status.

## Verdict

The core proposition is strong: let the reader borrow an editor's judgment and spend their Peninsula time well. The original experience promised a usable plan more consistently than it delivered one. The most valuable improvement is a trustworthy progression from recommendation to practical itinerary, with attractive presentation supporting that progression.

The brand reviewer provisionally rated the original experience **6/10**, and its potential **9/10**. These are qualitative expert judgments, not measured usability scores.

## Brand lens

- The [canonical brand operating system](peninsula-insider-brand-operating-system.md#12-the-positioning-statement) positions PI as the resident editor helping readers spend their weekend well. Its authority should reduce the reader's decision burden.
- The Local archetype explicitly owns plan-shaping copy. [BRAND-PI.md](../BRAND-PI.md) calls for specific recommendations and a clear choice, rather than several equally endorsed options. Character backstory is creative direction, not evidence of real-world visits.
- The [visual principles](peninsula-insider-brand-operating-system.md#layer-7-visual-identity-extension) favour a restrained, text-led publication: serif display, readable utility text, warm neutrals and photography that matches its subject. More cards or larger photographs are not inherently better.
- The public [About page](https://peninsulainsider.com.au/about/) says choices combine research, local knowledge and editorial judgment; businesses cannot buy recommendations or ranking. Match quality must not become paid priority.
- The [pocket-concierge strategy](peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md) supports turning editorial content into action using structured knowledge. It is historical strategy, not proof of a current deployed capability.
- Existing brand rules direct readers to operators for current prices and prohibit presenting generated atmosphere as documentary evidence of real places.

## What the original review observed

| Finding | Evidence and reader consequence |
|---|---|
| Itineraries and advice shared one promise | The [hub](https://peninsulainsider.com.au/explore/plans/) offered the same trip CTA on structured itineraries and articles such as school-holiday, wedding and corporate-retreat advice. The source adapter represented an article as a single article entry. Reading material was presented like an executable route. |
| Hub and detail actions behaved differently | Live testing imported the golf plan as seven stops over three days from the hub. The original detail button merged items into Saved instead. The two entrances did not deliver the same result. |
| Existing-trip handling was ambiguous | Adding a school-holiday article after a real itinerary appended an unscheduled article. The reader received neither a new itinerary nor an explicit explanation of how it affected the current one. |
| Choices mixed incompatible dimensions | Rainy day returned a school-holiday guide; choosing Couples replaced the rainy-day selection. Duration, audience, interest and weather could not be expressed coherently through that single-choice chip row. |
| Matching overstated suitability | The one-day/family/markets brief returned family-day, Point Nepean and picnic suggestions without a nearby explanation that market interest was unmet. The form sat far below the results. |
| The general recommendation was insufficiently justified | The default featured a specialist golf/group weekend. Source ranking favoured stop count, seasonal tagging and recency rather than an explicit editorial priority. |
| Claims exceeded their evidence | The hub promised tested routes and real drive times. Golf detail showed 120 minutes, while My Trip estimated about 85 minutes between mapped stops. These were different calculations, not verified live routing. The detail template also fell back from publication date to a “fact-verified” label. |
| Content and imagery sometimes contradicted the offer | The golf introduction promised hot springs absent from its seven stops. A picnic image description accompanied a vineyard image. A generic-looking coast image on Point Nepean needed location verification; appearance alone did not establish the wrong location. |
| Sharing had a substantive edge case | Code review found that the wellness itinerary's two visits to Lindenderry on different days collapsed into one on shared-trip import because deduplication used venue identity alone. |

Evidence came from the live page and guest interactions, the brand documents, itinerary JSON, and the original implementations of [plans-data](../next/src/components/v5/plans/plans-data.ts), [PiForkPlanButton](../next/src/components/PiForkPlanButton.astro), [itinerary detail](../next/src/pages/explore/plans/[slug].astro), [My Trip](../next/src/pages/me/trip.astro) and [shared import](../next/src/lib/trip-import.ts). These file links now point to the revised implementations; the release diff preserves before/after evidence. Browser observations are a dated snapshot, not claims about every subsequent release.

## Independent ranking

Scale requested by James: **1 = shitty; 10 = amazing**. Scores weigh reader value, brand fit and credibility, not engineering effort or predicted conversion. They were provided by the second, brand-focused agent.

| Rank | Proposal | Score | Decision and rationale |
|---:|---|---:|---|
| 1 | Distinguish ready-to-use itineraries from planning guides, with honest actions | 10 | Implemented. Repairs the central promise; guides have no pretend stop list. |
| 2 | Consistent real day-by-day import from hub and detail | 10 | Implemented by extending the existing capability. Existing trips receive add-days, replace and cancel choices; repeated imports do not duplicate the plan. |
| 3 | Editorial top pick and up to two alternatives, with match/miss explanations | 10 | Implemented. Reasons and stable editorial priority replace recency-driven authority. Do not manufacture suitable alternatives when none exists. |
| 4 | One optional matcher near the top, with separate duration, audience and interest choices | 9 | Implemented. A useful default remains available without completing a questionnaire; partial matches are explicit. |
| 5 | Compact route preview, pace, booking anchor and provenance | 9 | Implemented as a readable stop sequence and practical notes. A full interactive route map remains deferred. Only source-backed checks can earn a verification label. |
| 6 | Curated, geographically sensible stop swaps | 9 | Implemented narrowly for existing nearby Red Hill South dining records. Preserves day and position and explains booking implications. Wider swap coverage is deferred. |
| 7 | Suppress unrelated promotional overlays during planning | 9 | Implemented for the planning experience. Protects attention while the reader is making a decision. |
| 8 | Refine hierarchy, shorter display titles and supporting imagery | 8 | Implemented. Improves scanning without turning the page into a glossy card wall. Subject-matched imagery is a 10/10 requirement within this work. |
| 9 | Guest sharing and printing | 8 | Retained and made clearer; these already existed. Shared import now preserves repeated stays across days and checks write success. Personal notes are not included in the existing share-link format. |
| 10 | Location and live-weather personalisation | 6 | Deferred. Worth exploring after content coverage and matching are reliable; current live data and clear user controls are prerequisites. |
| 11 | AI chatbot as the primary entrance | 3 | Deferred. It asks readers to formulate a brief before PI demonstrates its judgment. Contextual assistance after selecting a plan is a separate, stronger possibility. |

Other rejected directions: a giant photographic card wall (4/10), native-app or gamification work as the immediate solution (2/10), and paid priority in editorial recommendations (1/10).

## Intended journey and acceptance standard

**See an editorial starting point → optionally describe the day → understand the recommendation and its trade-offs → inspect the ordered stops → use the itinerary → adjust a stop → share or print → book directly.**

A reader should be able to answer who a plan suits, what anchors it, how its stops fit together, what needs booking, what can change and how current the information is. A missing exact match should be stated before the reader mistakes a partial match for a complete answer.

The implemented import prepares the whole change before one trip-store write, checks that the existing trip has not changed during the decision, and preserves the original on cancellation or write failure. Existing guest storage, share links and printing remain the foundation. This is not a booking service: swaps do not cancel or transfer reservations, and planning estimates are not live traffic data.

## Evidence limits and deferred validation

- No analytics analysis, conversion experiment or moderated usability study was performed. There is no evidence here for a quantified lift in engagement, bookings or revenue.
- No operator availability, current menu, traffic feed or route-testing exercise was commissioned. Existing publication dates were not promoted to new verification dates.
- Automated tests exercise matching, import, cancellation, replacement, swaps and sharing. Production release and browser-validation results belong in the linked release record, not an assumed success statement here.
- The current six-itinerary corpus limits personalisation. Honest gaps are preferable to invented coverage. Further complete itineraries should be commissioned from actual demand and maintained evidence.
- The legacy cloud projection does not transport the new local plan-source metadata to a fresh device. Existing-trip choices still protect the reader from silent replacement; cross-device provenance is a separate future improvement.

The recommended next validation is a small observed reader exercise: ask people to choose a family day, recover from a no-match request, use an itinerary with an existing trip, change a meal and share the result. Record where they hesitate or misinterpret an action before commissioning broader personalisation.
