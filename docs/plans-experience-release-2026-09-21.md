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

## Validation evidence

- Focused planning model/store/import suite: 41/41 passed.
- Full browser regression suite: 56/56 passed, including the new six-test Plans experience coverage.
- Separate event/discovery/business browser suite: 9/9 passed.
- Commercial-firewall regression tests: 23/23 passed; ordering baseline unchanged.
- Media-provenance regression tests: 35/35 passed. A Windows CRLF parser defect was reproduced and corrected; the actual unknown-licence count remains one and no rights record or baseline was changed.
- Content schema, declared fields, claims, editorial style, source listener hygiene and the production build's other content gates passed locally. The static build generated 996 pages. Its first post-build media check hit the CRLF defect above; that check and the remaining gates were rerun successfully after the fix.
- Manual browser review covered desktop and 390px phone layout, an honest one-day/family/markets partial match, responsive image changes, and importing the family plan into four real ordered stops in My Trip.
- Repository-wide Astro diagnostics still report 136 errors in other files; the final diagnostic output contains no error headers for changed files. This is not a claim that the repository-wide type check is clean.

The exact committed Linux build and browser results are published in [pull request 459 checks](https://github.com/richmondjw/peninsula-insider/pull/459/checks). The merged release must pass those checks and the deployment workflow. [Production provenance](https://peninsulainsider.com.au/deployment.json) records the source commit actually served; the final task response records the verified release outcome.
