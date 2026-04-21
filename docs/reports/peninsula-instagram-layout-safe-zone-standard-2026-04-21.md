# Peninsula Insider Instagram Layout Safe-Zone Standard

Date: 2026-04-21
Status: Locked working standard for current Peninsula Insider social production system

## Why this exists

During repeated live Instagram review, the main failure mode was not raw file dimension. The files were already 1080x1350. The failure mode was layout drift between:
- the single-post open view
- the Instagram profile grid / preview view

Text that looked acceptable in one view was visually too close to the edge, too low, or too wide in the other view.

The conclusion is simple:

**Instagram portrait assets must be designed against the tighter profile-grid-safe area, not only the open-post view.**

## Locked design rule

For Peninsula Insider 4:5 Instagram portrait covers:
- use full-image background photography
- use only a light dark tint / atmospheric overlay for readability
- do not use black text boxes or heavy dark panels
- do not use pale bottom panels under the image
- all text must sit inside a deliberately narrower centre-safe zone than the raw canvas suggests

## Layout principles

### 1. Grid-safe first
Design for the Instagram profile grid first.
If the text survives the tighter grid perception, it will survive the open-post view.

### 2. Larger optical margins than expected
The correct text area is materially narrower than the full image width.
The live iteration showed that the text needed to be pulled inward repeatedly.

### 3. Eyebrow / kicker separation
The eyebrow / kicker must never visually touch the headline.
There must be a clearly visible gap between:
- kicker line + kicker label
- headline start

If they visually merge in the profile grid, the layout fails.

### 4. Image should support, not carry, readability
The image is atmosphere and place signal.
The tint does the readability work.
Do not rely on lucky image brightness for text legibility.

### 5. Sorrento / place imagery rule
Do not use visually ambiguous overseas imagery or generic tourism harbour scenes for location-led Mornington Peninsula posts.
Use verified Peninsula-safe local imagery only.

## Current renderer-safe layout intent

The current renderer iteration is moving toward this operating standard:
- stronger left and right margins than a normal editorial layout
- headline block pulled significantly inward from the left edge
- support copy pulled significantly inward from the right edge
- tinted lower field enlarged to give the text a stable optical home
- headline size balanced against narrower measure, not maximised at the expense of edge safety

## QA checklist for every Instagram portrait asset

Before approving an asset, check:

1. Does the headline sit safely away from the left edge in grid view?
2. Does the support copy sit safely away from the right edge in grid view?
3. Does the eyebrow have obvious separation from the headline?
4. Does the text feel centred within a protected lower safe zone rather than hanging off the image edges?
5. Does the tint improve readability without looking like a box or block?
6. Does the image actually belong to the Mornington Peninsula / claimed place?
7. Does the asset still feel premium editorial, not like a tourism flyer?

## Operational rule for future runs

When a new Peninsula Insider Instagram cover is created:
- start from the locked safe-zone layout, not from a fresh composition
- only change image, copy, and small art-direction variables first
- do not widen text measures unless the asset is explicitly tested in profile-grid view
- if the grid view crops too close, pull text inward again rather than trying to rescue it with styling

## Recommendation

This standard should now be treated as part of the Peninsula social-production skill and the renderer’s default assumptions for Instagram portrait assets.
