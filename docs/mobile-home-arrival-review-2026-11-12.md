# Mobile homepage arrival review

Draft, 12 November 2026. Not approved for publication.

## Fixed design rubric (100 points)
- Arrival and visual hierarchy: 25. A distinctive first screen, readable title, one clear primary route.
- Mobile usability: 20. 320/390px screens, visible CTA, no horizontal overflow, native planner and keyboard operation retained.
- Editorial brand: 20. Sora/Figtree and existing Harbour tokens; licensed/approved imagery, no invented claims or decorative clutter.
- Accessibility: 20. Stable readable ground, focus visible, one h1, image text alternative, 44px targets, no motion dependency.
- Performance and resilience: 15. No new script, video, dependencies or image; correct responsive image sizing and no-JS planner.

A critical accessibility, rights or core planning failure blocks release regardless of the score. Aesthetic scores are review judgements, not measured engagement or business results.

## Baseline (actual supplied phone screenshot)
The welcome title and calls to action are useful. A strong dark overlay flattens the approved Coastal Punch illustration into background texture. The image and typography compete, then the page presents a full-height sequence of form fields. Functional, but not a distinctive editorial arrival.

## Iteration 1: editorial cover
Separate text and illustration rather than darken both. Warm neutral typography panel, navy display type and existing blue action. Show the existing approved illustration in full colour. Desktop split cover; mobile title and actions first, short panoramic illustration second. No autoplay or added image requests. Preserve CMS override, metadata, native planner, content ordering and all established URLs.

## Iteration checks
Pending built browser review and regression suite. Do not assign a finished score until those checks complete. Further planner compression is deliberately deferred: the current full-width selects were chosen to prevent truncation and are a confirmed usability win. The first iteration addresses visual impact without sacrificing that gain.

## Iteration 2: focal point and rhythm
Browser inspection exposed inherited global section padding above/below the artwork, and the centre desktop crop clipped the human focal point. Explicitly reset cover padding to zero and use a left-aligned desktop crop. Retain the panoramic mobile crop. The heading/body now sit on an invariant solid ground rather than an image overlay.

Provisional browser measurements (first build plus exact iteration-2 CSS while final build runs): no overflow at 320, 390 or 1440px. Primary CTA bottom: 314, 314, 419px. Planner starts at 513, 480, 490px. All targets retained at 44px or above. Warm-ground contrast: navy heading 12.18:1, body 14.42:1, blue link 7.24:1. Actual image chosen: 480px AVIF on mobile and 800px AVIF at desktop DPR1. No claim of measured speed, conversion uplift or engagement.

First full build passed, and its eight homepage journey tests passed (first-visit geometry, keyboard anchor, native planner, no-JS submission, failed Journal image recovery, newsletter recovery, AVIF fallback, map labels and source/date disclosure). Final-build confirmation is recorded below when complete.

## Iteration 3: independent review response
Independent review found the first mobile screen still too form-led. Added one compact, existing editorial itinerary above the planner, using the same published title, summary, image and credit already selected for the homepage. Removed its duplicate from the lower list; the other two plans remain. No new destination claims or content records were introduced. Kept all three native selects and their original submission semantics. Reduced section-heading spacing on mobile.

The approved illustration is 2172 x 724. The parasol is clipped in the original artwork itself; no invented restoration. Desktop responsive sizes now account for its wide source being cropped into the split panel, so the browser does not choose an undersized rendition.

Preview tooling note: the repository's Astro dev mode encounters its existing Pagefind import-resolution problem. Final acceptance uses the built-site journey harness instead. The temporary local test fixture was removed and is not part of the patch.

## Accessibility iteration
A 200% root-text-size stress test at a 390px viewport exposed an intrinsic grid minimum causing the cover to clip its longest word. Fixed with zero-min grid tracks/content and emergency word wrapping; default typography is unchanged. The retest reports no document, cover or invitation overflow, with all form controls still labelled. This is a text-magnification/reflow test, not a claim of a complete assistive-technology audit.

## Final verification
- Full `npm run build`: passed, including image derivatives and downstream content/SEO/provenance gates, exit 0.
- Built-site homepage browser journeys: 10/10 passed. Includes first-visit 320/390/1440 layout, keyboard primary action, native planner, no-JavaScript submission, image fallback, newsletter error recovery (mock only), map labels, source dates, featured-plan keyboard navigation/no duplication, and 200% root text sizing.
- Responsive-image unit tests: 6/6 passed.
- Final browser selection at DPR1: 480px AVIF mobile; 1920px AVIF desktop for cropped artwork. Default screenshot geometry unchanged by zoom fix.
- New recommendation is visible before the native form inside the first 844px at 390px width. No introduced motion or client JavaScript.
- No publication, merge or production measurement. Draft needs James's design acceptance before release. No new media licence, spending or account changes.

Scope: two homepage components, two browser regressions, this review log. All source content and rights metadata were reused. Build-generated audit/registry changes are excluded from the patch.

## Independent final visual review
Reviewer assessed arrival 22/25, mobile hierarchy 18/20 and brand 18/20: 58/65 visually assessed. No material visual blocker. Real recommendation before inputs and crisp desktop art address prior critique. Accessibility and performance weights (35 total) were deliberately not independently scored; the automated checks above are evidence, not an independent accessibility audit or speed benchmark. Optional future polish: a small mobile invitation chevron and a less sparse desktop invitation. Neither is a release blocker. Do not convert the assessed 58/65 into an unsupported 100-point score.

## Direction C approved implementation

James approved the mobile Direction C concept with “Merge commit and publish” after viewing the cinematic preview. This supersedes the initial illustration-led direction for the homepage only.

- Full-bleed, already licensed Cape Schanck image with descriptive alt text and preserved photographer credit.
- Large Sora headline, single primary planning action, a real Flinders itinerary and four direct discovery routes.
- Native planning form, no-JavaScript navigation, CMS image/text override metadata and all other homepage sections retained.
- No video, animation, extra framework or new third-party dependency; responsive AVIF/WebP pipeline retained.
- Mobile crop exposes lighthouse; credit has an opaque navy backing above the scrim.
- Featured itinerary removed from lower cards to prevent duplicate promotion.
- AI concierge remains disabled; this release does not imply service readiness.

Independent prototype review: 59/65 visually assessed (arrival23/25, mobile18/20, brand18/20); accessibility20 and performance15 were not scored. Production implementation checks must be recorded separately; no overall score or real-world conversion outcome is claimed.

Release checks: final full build passed (deterministic checked-in CMS snapshot; two prior full live-read builds also passed). Final11/11 homepage journeys passed, including AVIF fallback, native/no-JavaScript planner, newsletter fixtures, keyboard navigation, 200% text reflow and320/390/1440 layouts. Editable coverage and diff whitespace checks passed. No production outcome claimed before deployment verification.
