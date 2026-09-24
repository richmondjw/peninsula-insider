# Top-level experience release acceptance — 24 September 2026

Scope: Home, Eat, Stay, Wine, Explore, Plans, What's On and Journal. Implements issue #495 and the approved 24 September audit. Base: ef1fa130. Asana initiative: 1218809435326778.

## Intended behaviour

- Category pages expose one early filter surface, complete server-rendered directories and immediate browse/map links. Filtered visitors go straight to results; clearing restores editorial material.
- Eat/Stay/Wine recommend one lead plus two compact alternatives; the other three choices are in a native keyboard-accessible disclosure.
- Stay compares four base areas; Wine separates tasting, lunch and appointment visits; Explore uses complete authored summaries and explicit practical-information limits.
- Home copyable alternatives only include itineraries with stops, and cover pager targets are at least 44px. Geographic orientation links lead into real town pages.
- Plans starts with its chooser open and shows ordered towns, booking dependencies and transport limits before adoption.
- Events retain actual closing dates and whole-run status when date selection clips the visible window. Recurring dates remain occurrence-specific.
- Journal distinguishes publication from editorial reselection and exposes an existing winemaker story without claiming a new interview.
- Save versus Add to trip is explained without introducing accounts or new state contracts.
- Factual changes are limited to Flinders Golf Club's 18 holes and Eagle Ridge's Boneo location, with primary-source evidence and committed successful link probes. Original broad check dates remain untouched.
- CMS overrides remain authoritative; illustrative/unverified source-image disclosures do not transfer to different override files.

## Verification receipt

- Existing navigation/search/saves/trips/planning suite: 56/56 pass.
- Discovery suite including new early-filter, directory restoration, itinerary-kind, touch-target and exhibition-range regressions: 12/12 pass.
- Explore summaries: 2/2 pass, now part of the build.
- Plans and event helper unit suites pass. Editable/card coverage passes.
- Independent code review: PASS after two introduced encoding defects were corrected.
- Impeccable: one final scan of 22 changed markup files returned no findings. This is a scoped code scan, not an accessibility certificate.
- Typecheck baseline on an isolated ef1fa130 worktree: 138 errors. Current tree: 137 errors; normalized diagnostics show only removal of the previous events phase-type error, no new diagnostic. Existing type debt is not concealed by a successful build.
- Full build/search, independent desktop/mobile visual review, CI and production verification are recorded in the canonical delivery receipt once complete.

## Boundaries

No Ask PI activation, guest-state migration, external outreach, spending or fabricated firsthand reporting. No claim that every venue, image or source in the database has been reverified. Exact opening days remain operator facts; an exhibition date range does not imply daily opening. Image acquisition and original interviews require genuine editorial work. Field performance, user confidence and commercial uplift require post-release measurement.

## Rollback

Revert this release through the normal PR/deploy pipeline. Existing URLs, storage keys and trip data shapes are retained. Do not clear saved or trip state.
