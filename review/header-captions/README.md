# Weekend hero and image caption review

The requested header is the `/whats-on/` page hero, not the global masthead. Before screenshots are from the public site on 13 October 2026; after screenshots are from the isolated local build. Navigation and content dates were retained. No production deployment was performed.

The hero now has balanced columns, the complete 3:2 illustration, clear title/date/description hierarchy and a readable caption below the image. At phone widths, copy and artwork stack without a fade or text over the illustration. The global masthead is unchanged.

Journal and event templates previously added a provenance paragraph after an existing caption/credit. They now render one short description with attribution. Nine Coastal Punch assets were personally inspected and their captions rewritten to describe visible objects. Context photos retain an explicit context label; credits, licence links, adaptations, alt text and original rights/generation fields remain. The provenance audit now recognises the verified consolidated renderer chain, without changing its ratchet ceilings.

## Evidence

| View | Before | After |
| --- | --- | --- |
| Weekend, desktop | [Before](before-weekend-1440.png) | [After](after-weekend-1440.png) |
| Weekend, phone | [Before](before-weekend-390.png) | [After](after-weekend-390.png) |
| Breakfast caption | [Before](before-breakfast-figure-390.png) | [After](after-breakfast-figure-390.png) |

Additional checks: [event illustration](after-event-figure-390.png), [context image](after-context-figure-390.png), [browser receipts](browser-qa.json), [71 focused tests](focused-tests.log), [full build](build-review.log), and [type-check comparison](typecheck-comparison.json).

## Validation

- Full `npm run build` passed, including the existing source, rights, publication, provenance and reader-boundary gates, and the new rendered-caption gate. It built 1,024 pages. Local verification used the repository's existing `PI_SKIP_CMS_LIVE_READS=1` option with its baked overrides; it does not certify newly changed live CMS rows.
- Caption admission against `origin/main` passed with zero changed-image failures. Rendered caption validation passed on 1,022 reader pages with zero failures.
- 71 focused tests passed, covering provenance, caption rendering/admission, recovery imagery and event publication behaviour.
- Browser verification passed at 320, 390, 768, 1,024 and 1,440px: no page overflow; image loads; caption below artwork; 3px keyboard focus; calendar-link Enter activation; three menu open/Tab/Escape cycles plus the close button at each mobile/tablet width. Header text contrast is at least 8.49:1. At 390px/DPR2 the selected artwork is 1,536 pixels wide for a 358px frame.
- `astro check` reports 225 existing errors in both the baseline and candidate. All 225 emitted diagnostics, including configuration files outside `src`, are counted in the comparison; file/error-code counts are unchanged. The production build succeeds; this PR does not claim a clean repository-wide type check.

## Ongoing maintenance and manual review

The [caption standard](../../docs/IMAGE-CAPTION-STANDARD.md), shared formatter, changed-image admission gate and rendered regression gate are integrated into the existing content/build checks. CI checkouts retain two commits so admission can compare source changes. The curated Visit Victoria page-image importer uses the same caption formatter; illustration production instructions require reviewed kind and descriptive captions.

[caption-review.json](caption-review.json) inventories 2,087 legacy metadata issues across 1,259 image records. These are mostly the newly required image-kind field (1,259), missing depiction status (360) and missing useful caption (461); seven source captions retain old boilerplate. They require asset-by-asset editorial review, not automatic relabelling. Unchanged historical records are report-only; new or edited image records with these gaps fail admission. CMS authoring remains a manual review boundary: formatting live display text does not establish image identity or rights.

To repeat the local browser receipt, run `node ../review/header-captions/browser-qa.mjs` from `next/` after building and starting the preview on port 4322. Set `PUPPETEER_EXECUTABLE_PATH` if using a locally installed Chromium; `PI_CAPTION_PREVIEW_URL` can select a different local preview URL.


## Review corrections

The selected event-listing gate now checks the actual visible description plus explicit image kind and Illustration credit instead of requiring the word “illustration” inside descriptive prose. Positive and negative fixtures cover missing/generic credits, missing kind, empty captions and caption-only markers. Full content admission and the actual Mornington Racecourse Market listing assertion pass.

The planning article again says “Illustrated map, not for navigation”, with an actual-record regression. String-only CMS caption normalisation preserves medium/context qualifiers; metadata-aware formatting removes only redundant labels with an equivalent visible Illustration credit. Unknown-kind itinerary/plan and Journal CMS credits use neutral “Credit”; explicit attribution and licences remain. Fixtures cover both actual itinerary/plan consumers, generic credits and captions with no metadata. Baked CMS overrides are empty; no affected live row is claimed.

The built gate now also checks known standalone event, card and itinerary caption paragraphs for boilerplate, excluding scripts/styles. Duplicate-description checks remain scoped to figures and the consolidated Journal path. New arbitrary caption classes and live CMS edits still need editorial/browser review.

[Repair validation](review-fixes.log) and [Journal recovery/browser journey](journal-journey.log) retain the repair receipts.

Journal selection also retains image kind from the matching selected source, so a reviewed illustration with generic attribution remains labelled “Illustration”. A selected CMS replacement does not inherit the prior image's kind. An integration regression checks both cases through selection and credit rendering.
