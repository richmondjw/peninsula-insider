# Plans experience release

James approved design, implementation, commit, merge and publication on 21 September 2026 after a live experience and independent brand review.

## Reader outcome

Plans should help a reader choose a published itinerary, understand why it fits, inspect its real sequence, and take that sequence into My Trip. Advice remains discoverable as planning guides, with a different action and no implied ready-made itinerary.

## Scope

- One optional matcher above the recommendations, with duration, companions, interests and wet-weather preferences kept independent.
- One editorial recommendation and up to two alternatives, each with explicit matches and missing preferences.
- Short display titles, practical previews and responsive editorial hierarchy, using the existing site design tokens.
- Separate ready-made itineraries and planning guides, preserving all existing canonical detail URLs.
- One shared itinerary import path for the hub and detail pages, with day grouping, repeat protection and explicit handling of existing trips.
- Source-backed dining alternatives that preserve a stop's day and position; no booking changes are performed.
- Clear scope for travel estimates, original verification dates, and corrections to summaries that promised absent stops.
- Uninterrupted planning pages, with normal navigation and footer links retained.

## Deliberately deferred

Live-weather or location personalisation and a chatbot entrance were low-ranked future ideas, not requirements for this release. No routing-provider integration, new account requirement, payment flow or automatic booking is introduced.

## Acceptance

1. All itinerary calls to action create the actual stops and days in the same trip store.
2. Guides cannot be imported as pretend itineraries.
3. A repeated import is idempotent; cancellation preserves the existing trip; append preserves existing days; replace is an explicit reader choice.
4. Matcher choices survive navigation and do not erase independent preferences; missing preferences are described at the result.
5. Mobile layouts fit at 390px and controls remain keyboard operable.
6. Route/detail/preview claims use source data and do not acquire invented verification dates.
7. Build gates, scoped regression tests and real browser journeys pass before merge; production provenance and live interactions are verified after deployment.

## Release safety

Work starts from production source `af560f8a3b65635c8438986203cab8d58251744b` in an isolated worktree. The existing dirty checkout is not part of the release. Revert the resulting merge commit to roll back through the normal build and deploy workflow; existing saved trips remain compatible.
