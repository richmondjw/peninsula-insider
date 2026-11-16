# Planning, Journal and event-date acceptance

Implementation owner: PI engineering, delegated by Remy. Project: Peninsula Insider. Decision: adapt the existing interfaces under James's approved top-level experience implementation. Root delivery owns independent integration review and release verification.

## Behaviour

- Plans opens its existing chooser on arrival. Recommendations and catalogue rows show route geography from ordered stop references and booking dependencies before an itinerary is adopted. Consecutive stops in one town collapse; return visits and day boundaries survive. No new drive-time estimate is generated. Existing guest import, partial matches and the distinction between six itineraries and 23 reading guides remain.
- Journal labels publication dates explicitly. The 24 September selection note distinguishes reselection from factual checking. The published 20 September school-holidays story leads while eligible; its existing promotion expiry is honoured, with the evergreen spring story as fallback. The existing Quealy cellar-door story appears under Behind the wine. This is existing editorial coverage, not a new interview or visit.
- What's On uses a compact date-first opening and explains its Friday-to-Sunday weekend. Both server and client use `whatson-listing.mjs` for full run labels. A selection ending on 27 September cannot relabel an exhibition's 22 November ending. A range's clock status uses its actual start/end, including the Melbourne daylight-saving transition; a recurring event's clock state still belongs to the specific occurrence. Opening hours and days remain separate from an event's overall run.

## Scoped factual corrections

Sources read using web page retrieval on 24 September 2026; the retrieval service reported cached crawls from the preceding week. Claim/evidence records preserve that access method and date.

- Flinders Golf Club: `golf.holes` changed from 9 to 18 and the contradictory repeat-nine-hole instruction removed from `editorNote`. [Official course tour](https://www.flindersgolfclub.com.au/cms/golf/course-tour/) enumerates holes 1 to 18.
- Eagle Ridge: `place` changed from Balnarring to Boneo, matching the [operator's contact address](https://eagleridge.com.au/contact-us/).

Neither correction refreshes record-wide `lastVerified`. Other coordinates, imagery, opinions, duration estimates and access claims were outside these two checks.

## Regression coverage

- `npm run test:plans-experience`: includes ordered route preview plus the existing partial matching, guide exclusion, guest import and repeat-import checks.
- `npm run test:event-occurrence`: includes the full date-label/occurrence regressions through `whatson-listing.test.mjs`: clipped selection, one-day/recurring distinction, actual end, Melbourne DST and year boundary.
- `node --test tests/journeys/plans-experience.test.mjs tests/journeys/event-discovery.test.mjs`: built-site behaviour including visible chooser, updated route/booking copy after matching, date loading/history/failure recovery and a rendered full-run closing date.
- Content guards: claim-support ratchet, no-pricing, house style and unsupported first-hand claims.

Full build and browser receipts belong to the integrated release evidence; a unit test is not a production receipt. Rollback is the bounded source change, preserving original publication and source-evidence dates. No external messages, booking actions or publication actions are part of these tests.
