# Acceptance receipt

Candidate baseline: `e0cdb6eb9610fc3982e65d4479788ebe8402ea29`, the production source SHA observed on 11 October 2026.

- `npm ci --prefer-offline`: passed.
- `npm run build:search`: passed all existing build gates and generated the search index (719 indexed pages).
- `node scripts/check-search-opportunities.mjs`: all four page contracts passed. Checks canonical metadata, actual document title rather than SVG titles, internal destinations/fragments, visible FAQ/schema parity, ItemList canonical destinations and image alt attributes without treating decorative empties as missing attributes.
- `node scripts/check-search-opportunities-browser.mjs`: eight phone/desktop page checks and two real-link navigation journeys passed, at 390px and 1440px. The test waits for link hit-testing after Astro view transitions. Screenshots were inspected for the new choices and dog-dining copy and remain in ignored private evidence.
- `npm run test:journeys`: 87 passed, zero failed on the completed build. An earlier run made before responsive-image processing finished failed its AVIF-source assertion; the completed-build run resolves that failure.
- `npm run check`: 225 errors. An untouched baseline has the same 225 diagnostic messages after removing shifted line/column numbers, with no added or removed error messages. No clean typecheck is claimed.
- `git diff --check`: passed. Build-generated registry/audit changes were restored; private Search Console rows are ignored.

Source dates are field-specific and derived from `next/src/data/search-opportunity-evidence.json`. Original dog-guide verification dates remain intact. The implementation README documents supporting unchanged guide records. This receipt confirms local acceptance, not production publication or ranking uplift.
