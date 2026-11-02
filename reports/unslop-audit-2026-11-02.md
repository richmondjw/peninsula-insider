# Peninsula Insider: unslop audit, 2 November 2026

Owner: Remy. Project: Peninsula Insider. Decision: polish, not redesign.

## Scope and evidence

Inspected the live Home, Eat, Stay, Wine, Explore, Plans, What's On and Journal anchor pages at desktop and a narrow mobile viewport. Checked the current source against `PRODUCT.md`, the anchor-page design rules, Coastal Punch rules and the `unslop` signs list. The production site was not changed.

## Direction

- Product: An independent local guide that helps visitors and locals choose a Mornington Peninsula day, stay or story.
- Character: Local, exact, welcoming.
- World: Harbour, ridge, coastline and real venues.
- Moments: The Coastal Punch home illustration and credited place photography.
- Signature detail: A reason for each recommendation, with source and image provenance visible.

## Audit

The eight anchor pages have an established, product-specific design rather than template-like AI styling. The approved Sora/Figtree typography, harbour-blue/cream palette, restrained sand accent and Coastal Punch hero are coherent. No emoji-label system, purple gradients, gradient headings, glass cards or meaningless decorative blobs were found in the tested anchor experience. The home hero's image gradient is a legibility scrim over approved artwork, not a hue-gradient surface. The Play mark is a purpose-made character asset, not an emoji. Header and category labels use approved short uppercase editorial labels, so replacing them to conform mechanically to `unslop` would weaken the site's identity and conflict with the project rules.

At the tested narrow viewport, all eight pages had a document scroll width smaller than the viewport, with first-screen discovery actions present. These observations do not certify every interaction or every detail page.

One polish defect was confirmed: the Plans h1 rendered as `Don’t plan.Pick one of ours.` in extracted text because its visual line break lacked a space. The source now includes the space while retaining the visual line break.

## Verification and limits

The built Plans HTML now extracts as `Don’t plan. Pick one of ours.`. The repository build passed its test and lint stages and generated the pages, then was interrupted during prolonged responsive-image processing; the full build gate is not claimed as passed. No production deployment or publishing occurred. This audit did not cover every venue/article/detail page or independently certify image rights and factual accuracy.

`unslop` by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0.
