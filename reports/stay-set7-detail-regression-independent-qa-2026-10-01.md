# Set 7 venue-detail regression: independent QA

**Review date:** 1 October 2026 (Australia/Sydney)\
**Scope:** `VenueDetailTemplate.astro`, Port Phillip Estate actions, and paused Villa Mallorca. Source review plus the exact Set 7 `build:search` artifact served locally at `http://localhost:4357/`. This is independent acceptance evidence, not public deployment certification.

## Port Phillip Estate

The generated `/wine/port-phillip-estate/` page returned 200. Its operator actions matched the live first-party destinations:

| Visible action | Generated href | Result |
| --- | --- | --- |
| Check suite availability (booking bar and facts rail) | `https://www.portphillipestate.com.au/book-accommodation/` | Correct accommodation diary |
| Explore tastings | `https://www.portphillipestate.com.au/cellar-door-tastings/` | Correct tasting page |
| Reserve a table | `https://www.portphillipestate.com.au/reservations/` | Correct dining reservations page |

The operator [accommodation diary](https://www.portphillipestate.com.au/book-accommodation/), [tastings](https://www.portphillipestate.com.au/cellar-door-tastings/) and [dining reservations](https://www.portphillipestate.com.au/reservations/) pages support those destinations. The generic visiting-section “Reserve a tasting” action is gated by `bookingRequired`; Port Phillip's value is false, so that action is not rendered. Its fallback href has also been corrected in source to the operator's tastings page.

**Factual defect found and corrected during review:** the first final artifact and venue record showed cellar-door hours Monday–Sunday, 11:00–17:00. The operator publishes Wednesday–Monday, 11:00–17:00. Tuesday was falsely shown as open and also entered winery JSON-LD through `buildWinerySchema`. The venue record now excludes Tuesday. The final `build:search` exited 0. Its exact generated page visibly renders “Mon, Wed to Sun 11am–5pm” and “Tue Closed”; the winery `OpeningHoursSpecification` lists Monday and Wednesday–Sunday at 11:00–17:00, with no Tuesday.

## Paused Villa Mallorca

The generated `/stay/villa-mallorca/` historical detail returned 200 and had `robots: noindex, nofollow`, `data-pagefind-ignore`, a clear paused notice, and no `LodgingBusiness` JSON-LD. It contained no booking action tagged for `villa-mallorca` and no live link to the retired operator domain. Three booking actions elsewhere on the page belonged to unrelated suggested venues. The Mallorca route was absent from the generated sitemap and from the Stay hub, Villas, Luxury, Cottages and map listing artifacts. The former current-tense Cottages host endorsement was removed from source; a dormant `bnbSlugs` entry is filtered out by `isListableVenue`.

The generated Pagefind index returned no direct Villa Mallorca detail result for exact or partial name queries. It did return one unrelated journal result through fuzzy matching. In the browser, `window.PISearchRpc.search({q: 'Villa Mallorca', entityTypes: ['venue']})` returned zero after the new client-side paused-slug filter; a Port Phillip Estate positive control returned five venue results.

**Operational follow-up:** a separate read-only query of the public raw `pi.search` RPC still returned one `venue/villa-mallorca` row before browser filtering. The static build and Pagefind step do not refresh `pi.entity_index`. The browser guard prevents an immediate visible search result, but the backend row should be pruned through the coordinated entity-index refresh workflow after deployment and the raw RPC query repeated to confirm zero.

## Limits and disposition

The corrected final build passed scoped local acceptance for hours, CTAs, paused-page behavior, sitemap, active listings, Pagefind and browser RPC filtering. This is local release evidence; public deployment and backend index pruning have not been verified in this report. No implementation files were edited by the independent reviewer.
