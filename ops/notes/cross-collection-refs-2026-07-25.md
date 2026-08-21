# Cross-collection references removed from relatedVenues

Date: 2026-07-25

These four slugs were listed in article `relatedVenues` but are entries in the
`experiences` collection, not `venues`. `relatedVenues` is typed
`reference('venues')`, and `next/src/lib/related.ts` resolves by entry id then
drops anything unresolvable without warning, so they never rendered.

They have been removed so the reference check can pass. The editorial intent is
real and worth restoring by adding them to each article's `relatedExperiences`
instead. Precedent already exists: `the-rainy-day-peninsula-without-a-booking`
lists `sorrento-back-beach` correctly under `relatedExperiences`.

Recorded here so the links are not lost.

- `sunny-ridge-strawberry-farm` (removed from 6 articles) - experiences: Sunny Ridge Strawberry Farm
- `ashcombe-maze` (removed from 5 articles) - experiences: Ashcombe Maze & Lavender Gardens
- `red-hill-truffles` (removed from 1 article) - experiences: Red Hill Truffles
- `sorrento-back-beach` (removed from 1 article) - experiences: Sorrento Back Beach

Also worth an editor's eye: `sorrento-solstice-festival-2026-guide` has no
`relatedExperiences` field at all, and its `relatedVenues` is now a single
entry, so it is the thinnest of the eleven.
