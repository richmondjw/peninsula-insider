---
description: Old-class to new-class mapping for the .pi-btn and .pi-card primitives (P3-1, P3-2, P3-3, P3-4). Verification surface for the markup migration.
tags: [patch, design-system, migration]
date: 2026-07-25
---

# Component migration map - buttons and cards

Companion to `next/src/styles/primitives.css`. Covers review section 4.4
("42 distinct button/CTA class families... no shared `.btn` or `.card`
primitive exists") and plan items **P3-1, P3-2, P3-3, P3-4**.

## How to read this

Every legacy selector below is **grouped onto the primitive declaration**
in `primitives.css`. It is **not deleted**. Old markup and new markup both
render correctly while the markup migration is in flight.

`primitives.css` is imported from `global.css` immediately after
`v6-tokens.css`, so it is the first rule source in the cascade. That means
any surviving legacy rule at equal specificity would win. The legacy base
blocks have therefore been stripped to their genuinely distinct residue
(placement, occurrence-specific sizing, state). The **Residue kept** column
records what is left behind and why.

Migration is complete for a row when the markup carries the primitive
classes and the legacy class can be dropped from both the markup and the
alias list in `primitives.css`.

---

## 1. The primitive API

### `.pi-btn`

| Layer | Classes |
|---|---|
| Base | `.pi-btn` |
| Variants (3) | `.pi-btn--solid`, `.pi-btn--ghost`, `.pi-btn--text` |
| Sizes (3) | `.pi-btn--sm`, *(no modifier = medium)*, `.pi-btn--lg` |
| Modifiers (3) | `.pi-btn--block`, `.pi-btn--inverse`, `.pi-btn--icon` |

Base: `inline-flex`, centred, `gap: var(--space-2)`, `font-family:
var(--font-ui)`, `font-weight: var(--fw-medium)`, `border-radius:
var(--radius-s)`, `min-height: 44px`, pointer cursor, tokenised transition,
`:focus-visible` using `var(--focus-ring)` at `outline-offset: 2px`.

**Sentence case.** `text-transform` and `letter-spacing` are pinned to
`none` / `normal` rather than merely omitted, so the uppercase-letterspaced
pattern the review flagged as dated cannot leak back in through a surviving
declaration. Labels in markup should be written in sentence case.

### `.pi-card`

| Layer | Classes |
|---|---|
| Base | `.pi-card` |
| Elements (6) | `__media`, `__body`, `__eyebrow`, `__title`, `__dek`, `__meta`, `__actions` |
| Variants (2) | `.pi-card--compact` (horizontal row), `.pi-card--feature` (larger) |

Base: flex column, `background: var(--white)`, `1px solid var(--border)`,
`border-radius: var(--radius-m)`, `overflow: hidden`, **no `box-shadow`**.
`__media` defaults to `aspect-ratio: 3/2` with `object-fit: cover`.
`__dek` is a 2-line clamp whose height reservation is
`min-height: calc(2em * var(--lh-dek))` - **em**, not px or rem, so it
tracks the element's own font-size and keeps working under the reader
text-scale control (`html[data-text-scale]`). `__meta` is pinned to the
foot with `margin-top: auto` so card bottoms resolve on a common baseline.

---

## 2. Button and CTA families (50 families aliased)

### 2.1 To `.pi-btn--solid`

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.venue-detail__book-btn` | global | `.pi-btn .pi-btn--solid .pi-btn--lg` | none |
| `.venue-card__cta` | global | `.pi-btn .pi-btn--solid .pi-btn--sm` | `margin-top: auto` (card foot) |
| `.venue-card__book` | global | `.pi-btn .pi-btn--solid .pi-btn--sm` | none |
| `.itinerary-detail__cta` | global | `.pi-btn .pi-btn--solid` | none |
| `.news-close__cta` | global | `.pi-btn .pi-btn--solid .pi-btn--lg` | none |
| `.mobile-nav__cta` | global | `.pi-btn .pi-btn--solid .pi-btn--block` | `min-height: 48px` (drawer tap target) |
| `.itinerary-empty__cta` | global | `.pi-btn .pi-btn--solid` | none |
| `.submit-form__button` | global | `.pi-btn .pi-btn--solid` | `:disabled { cursor: progress }` |
| `.guide-card__form-button` | global | `.pi-btn .pi-btn--solid .pi-btn--sm` | `:disabled { cursor: progress }` |
| `.tour-cta-primary` | global | `.pi-btn .pi-btn--solid` | `margin-top: var(--space-4)` |
| `.newsletter__submit` | global | `.pi-btn .pi-btn--solid` | joined-field corners `0 var(--radius-s) var(--radius-s) 0` |
| `.subscribe-pill` | global | `.pi-btn .pi-btn--solid .pi-btn--sm` | **see 4.1** |
| `.v2-account-page__cta` | account | `.pi-btn .pi-btn--solid` | `:active { transform: scale(0.98) }` |
| `.v2-account-page__save` | account | `.pi-btn .pi-btn--solid` | `justify-self: start` (grid placement) |
| `.v3-btn--solid` | *(v3.css deleted)* | `.pi-btn .pi-btn--solid` | none |
| `.v3-btn--vine` | *(v3.css deleted)* | `.pi-btn .pi-btn--solid` | none |
| `.v3-subscribe-cta` | *(v3.css deleted)* | `.pi-btn .pi-btn--solid .pi-btn--sm` | none |
| `.v4-subscribe-cta` | *(v4.css emptied)* | `.pi-btn .pi-btn--solid .pi-btn--sm` | none |

### 2.2 To `.pi-btn--solid .pi-btn--inverse` (dark grounds)

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.newsletter__cta-button` | global | `.pi-btn .pi-btn--solid .pi-btn--inverse` | none. Old two-stop gradient + drop shadow replaced by a flat `--mint` fill with a `--text` label (14.38:1). |

### 2.3 To `.pi-btn--ghost`

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.venue-detail__phone-btn` | global | `.pi-btn .pi-btn--ghost .pi-btn--lg` | none. **This is P3-3** - see 3.1. |
| `.article__share-btn` | global | `.pi-btn .pi-btn--ghost .pi-btn--sm` | `.is-copied` success state; mobile padding |
| `.save-button` | global | `.pi-btn .pi-btn--ghost .pi-btn--sm` | `[aria-pressed="true"]` saved state |
| `.masthead__cta` | global | `.pi-btn .pi-btn--ghost .pi-btn--sm` | `flex-shrink: 0` |
| `.facts__cta` | global | `.pi-btn .pi-btn--ghost .pi-btn--block` | `margin-top: var(--space-5)` |
| `.venues__more-btn` | global | `.pi-btn .pi-btn--ghost` | none |
| `.weekend-picker__cta` | global | `.pi-btn .pi-btn--ghost` | none |
| `.weekend-picker__cta--ghost` | global | `.pi-btn .pi-btn--ghost` | none (collapsed into the base - the old pair drew two different border colours for one control) |
| `.itinerary-empty__cta--ghost` | global | `.pi-btn .pi-btn--ghost` | none |
| `.site-search-overlay__cta` | search | `.pi-btn .pi-btn--ghost .pi-btn--sm` | `margin-top: 0.85rem` |
| `.search-page-v2__pager-btn` | search | `.pi-btn .pi-btn--ghost .pi-btn--sm` | `.is-active` current-page state |
| `.ask-dialog__reset` | concierge | `.pi-btn .pi-btn--ghost .pi-btn--sm` | none |
| `.v3-btn--ghost` | *(v3.css deleted)* | `.pi-btn .pi-btn--ghost .pi-btn--inverse` | none |

### 2.4 To `.pi-btn--ghost .pi-btn--inverse` (dark grounds)

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.search-page-v2__fallback-cta` | search | `.pi-btn .pi-btn--ghost .pi-btn--inverse` | none. 40%-alpha border replaced by a full-strength white rule (13.43:1). |
| `.ed-cover__cta` | edition | `.pi-btn .pi-btn--ghost .pi-btn--inverse` | arrow-glyph nudge on hover; mobile full-width block |

### 2.5 To `.pi-btn--icon`

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.typeahead__close` | global | `.pi-btn .pi-btn--ghost .pi-btn--icon .pi-btn--sm` | none |
| `.v3-iconbtn` | *(v3.css deleted)* | `.pi-btn .pi-btn--ghost .pi-btn--icon .pi-btn--sm` | none |
| `.v4-iconbtn` | *(v4.css emptied)* | `.pi-btn .pi-btn--ghost .pi-btn--icon .pi-btn--sm` | none |

`.pi-btn--icon` requires an `aria-label` (or a visually-hidden label span).

### 2.6 To `.pi-btn--text`

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.feature__cta` | global | `.pi-btn .pi-btn--text` | none |
| `.experience-card__cta` | global | `.pi-btn .pi-btn--text` | `margin-top: auto` (card foot) |
| `.itinerary-card__cta` | global | `.pi-btn .pi-btn--text` | none |
| `.event-card__cta` | global | `.pi-btn .pi-btn--text` | `margin-top: auto` (card foot) |
| `.tour-card__cta` | global | `.pi-btn .pi-btn--text` | `margin-top: auto` (card foot) |
| `.where-you-sleep__cta` | global | `.pi-btn .pi-btn--text` | none |
| `.map-popup__cta` | global | `.pi-btn .pi-btn--text` | `align-self: flex-start` |
| `.place-submit-cta__link` | global | `.pi-btn .pi-btn--text` | none |
| `.masthead__cta-mobile` | global | `.pi-btn .pi-btn--text` | `display: none` until the mobile breakpoint |
| `.ask-itinerary-cta__link` | concierge | `.pi-btn .pi-btn--text` | `margin-top`, `align-self: flex-start` |
| `.ed-notebook__cta` | edition | `.pi-btn .pi-btn--text` | none |
| `.v3-pillarcard__cta` | *(v3.css deleted)* | `.pi-btn .pi-btn--text` | none |
| `.v3-weekend__cta` | *(v3.css deleted)* | `.pi-btn .pi-btn--text` | none |
| `.v4-pin__cta` | *(v4.css emptied)* | `.pi-btn .pi-btn--text` | none |
| `.v4-mega__top-banner-cta` | *(v4.css emptied)* | `.pi-btn .pi-btn--text` | none |

### 2.7 To `.pi-btn--text .pi-btn--inverse` (dark grounds)

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.ed-builder__slot-cta` | edition | `.pi-btn .pi-btn--text .pi-btn--inverse` | parent-hover handoff (`.ed-builder__slot:hover` sets the colour) |
| `.v4-drawer__pillar-banner-cta` | *(v4.css emptied)* | `.pi-btn .pi-btn--text .pi-btn--inverse` | none |

### 2.8 Base only

| Legacy class | Sheet | New classes |
|---|---|---|
| `.v3-btn` | *(v3.css deleted)* | `.pi-btn` (variant supplied by a modifier) |

---

## 3. Notable corrections landed by the aliasing

### 3.1 P3-3, the phone-number button

`.venue-detail__phone-btn` drew `color: var(--soft)` on a `1px solid
var(--border)` hairline with `font-weight: 400`. The review: *"The
phone-number button on venue pages looks disabled - bordered box, grey
text, no affordance."* As `.pi-btn--ghost` it now carries a `var(--text)`
label (16.64:1) on a `var(--border-strong)` rule (5.10:1) at
`--fw-medium`, identical to every other secondary action. **No separate
fix was needed; the primitive is the fix.**

### 3.2 Three button languages on one journey

Home mint fill, home secondary white 999px pill, and venue solid-evergreen
UPPERCASE-LETTERSPACED near-square all resolve to the same three variants
at `--radius-s`, sentence case, no tracking.

### 3.3 Contrast improvements (none regress)

| Control | Before | After |
|---|---|---|
| `.venue-detail__phone-btn` label | `--soft` 7.26:1 | `--text` 16.64:1 |
| `.ask-dialog__reset` border | `rgba(11,90,72,.18)` ~1.3:1 | `--border-strong` 5.10:1 |
| `.search-page-v2__fallback-cta` border | `rgba(251,247,242,.4)` on dark | `#FFFFFF` 13.43:1 |
| `.ed-builder__slot-cta` label | `rgba(246,242,234,.6)` on dark, below AA | `--mint` 11.60:1 |

---

## 4. Legacy rules deliberately NOT folded into a primitive

| Class | Sheet | Why it stays |
|---|---|---|
| `.subscribe-pill` (placement block) | global | A floating affordance, not an inline button. `position: fixed`, safe-area-aware offset, `z-index: 90`, a drop shadow (it floats over page content, so it needs lift the flat cards deliberately do not have), and a translate/opacity reveal animation. The primitive supplies ground, radius, type and hover; the rest cannot be expressed as a button variant. |
| `.map-page__entry-button` | global | Not a button in the design sense: a full-width, left-aligned, bottom-ruled list row inside the map sidebar. Forcing it onto `.pi-btn` would give it a box, a centred label and a 44px pill. Left as a local rule. |
| `.search-page-v2__pager-step` | search | A page **number**, not an action. Split away from `.search-page-v2__pager-btn` (which is now `.pi-btn--ghost --sm`) and retuned onto the tokens and the radius scale in place. |
| `.article__share-btn.is-copied` | global | Success state. The primitive has no success state. |
| `.save-button[aria-pressed="true"]` | global | Toggle state. The primitive has no toggle state. |
| `.search-page-v2__pager-btn.is-active` | search | Selected state. The primitive has no selected state. |
| `.v2-account-page__cta:active` | account | Press-down affordance specific to the account surface. |
| `.ed-builder__slot:hover .ed-builder__slot-cta` | edition | Parent-hover handoff. The primitive cannot express "colour changes when an ancestor is hovered". |
| `.ed-cover__cta svg` transform | edition | Arrow-glyph nudge on hover, a cover-specific flourish. |

---

## 5. Card families (7 families aliased)

| Legacy class | Sheet | New classes | Residue kept |
|---|---|---|---|
| `.venue-card` | global | `.pi-card` | `padding: 0 0 3.25rem` + `gap: 0` - reserves the zone for the floating Save/Share pills |
| `.event-card` | global | `.pi-card` | `gap: 0.85rem` (stacks its own rows) |
| `.itinerary-card` | global | `.pi-card` | none |
| `.tour-card` | global | `.pi-card` | none |
| `.place-card` | global | `.pi-card` | none |
| `.experience-card` | global | `.pi-card` | none |
| `.guide-card` | global | `.pi-card` | none |

Sub-element mapping for the markup migration:

| Legacy sub-element pattern | Primitive element |
|---|---|
| `*__image`, `*__hero`, `*__media`, `*__visual` | `.pi-card__media` |
| `*__body`, `*__content`, `*__inner` | `.pi-card__body` |
| `*__zone`, `*__kicker`, `*__label`, `*__eyebrow` | `.pi-card__eyebrow` |
| `*__name`, `*__title`, `*__headline` | `.pi-card__title` |
| `*__dek`, `*__excerpt`, `*__summary` | `.pi-card__dek` |
| `*__meta`, `*__date`, `*__footer` | `.pi-card__meta` |
| `*__actions`, `*__cta-row` | `.pi-card__actions` |

Notes:

- `.place-card` and `.experience-card` previously carried **no ground and
  no hairline**. They now take the shared 3.45:1 rule. This is the intended
  correction for *"card hairlines are effectively invisible... cards float
  without definition."*
- `.place-card` and `.tour-card` were removed from the shared
  `--tile-image-radius` group in `global.css`. As `.pi-card` they take
  `--radius-m` from the primitive, which also clips their media via
  `overflow: hidden`. The group now only carries standalone images that are
  not inside a card.
- **Deks must move to `.pi-card__dek`** to get the 2-line clamp. The review's
  *"deks run 3-5 lines unclamped"* and *"card bottoms don't resolve"* are
  fixed by `__dek` (clamp) plus `__meta` (`margin-top: auto`), not by the
  card container.
- Redundant labelling (*"three cards in an events module each stamped
  EVENT"*) is a **markup** decision. `.pi-card__eyebrow` should be omitted
  when the module heading already states the type.

---

## 6. Radius policy (P3-7)

The scale is unchanged. What changed is that it is now applied
consistently, and **every raw px radius under `next/src/styles/` is gone**
(105 declarations rewritten; 0 remain).

| Token | Value | Applies to |
|---|---|---|
| `--radius-s` | 8px | buttons, inputs, chips, kbd, badges |
| `--radius-m` | 16px | cards, card media, tiles, **and all editorial images including the article hero** |
| `--radius-l` | 28px | panels, sheets, modals, drawers |
| `--radius-pill` | 999px | genuinely pill-shaped tags, count bubbles, icon buttons, scrollbar thumbs |

The review's *"article hero images are square-cornered while cards are
rounded"* is fixed: `.article__hero` moved from `2px` to `var(--radius-m)`,
alongside `.cover__visual`, `.section-hero__visual`,
`.subpage-hero__visual`, `.article-hero__image`, `.venue-detail__hero`,
`.place-detail__hero`, `.experience-detail__hero`,
`.itinerary-detail__hero`, `.letter__image`, `.home-cover__rotator`,
`.guide-hero__image` and `.search-card__hero`.

---

## 7. Sheet removals (P3-5)

| Sheet | Before | After | Note |
|---|---|---|---|
| `v3.css` | 1,535 lines | **deleted** | `V3BaseLayout` was imported by zero pages. `src/layouts/v3/` had already been removed, so no dangling import remains. |
| `v4.css` | 905 lines | **1-line stub** | Audited rule by rule: no `.v4-*` class is rendered by any component, and the only non-`.v4-`-namespaced rule (`body[data-v4="true"] .masthead { position: sticky; top: 0; z-index: 9999 }`) is an exact duplicate of the `.masthead` rule already in `global.css`. **Nothing needed folding.** The `import '../styles/v4.css'` line in `BaseLayout.astro` can now be removed by the layout owner. |

CSS budget: **17,611 -> 15,311 lines** (target is under 10,000; the
remaining reduction comes from P3-6 and the v5 chrome consolidation).
