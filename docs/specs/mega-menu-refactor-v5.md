# Mega Menu Refactor — V5 Typographic Edition

**Spec version:** 1.0  
**Status:** Ready for implementation  
**Branch target:** `feat/mega-menu-v5-typographic`  
**Estimated effort:** 2–3 days (1 developer)  
**Depends on:** None — standalone PR, no schema or routing changes required  
**Followed by:** Phase 5 nav restructure (Places + Plans → Explore)

---

## Overview

This PR removes the image rail from the V4 mega menu and replaces it with a pure-typographic editorial pin block. The motivation is editorial and brand clarity: the mega menu is a navigation surface, not a magazine spread. Images in navigation compete with content, slow perceived performance, and require editorial overhead (seasonal rotation, override management) that belongs on content pages, not chrome.

The reference aesthetic is the Tate Modern digital identity: compressed grotesque at commanding scale, whitespace as layout device, weight and proportion doing the full visual argument without imagery.

No routing changes, no schema changes, no Supabase work. This is a self-contained component and CSS change that ships ahead of the Phase 5 IA restructure.

---

## Pillar Structure Changes

The current `v4-nav.ts` has 8 pillars. This PR also implements the approved navigation restructure: Plans and Places are absorbed into Explore, reducing the nav to 6 pillars.

### Before (8 pillars)
```
What's On · Plans · Eat & Drink · Wine · Stay · Places · Explore · Journal
```

### After (6 pillars)
```
Eat & Drink · Stay · Wine · Explore · What's On · Journal
```

**Rationale for ordering:** Category pillars (intent-driven discovery) lead. Explore handles Places, Plans, and experiences as the umbrella. What's On and Journal trail as editorial/temporal surfaces.

### Pillar removals

**Delete the `escape` (Plans) pillar object** from `v4Pillars`. Its content migrates into the Explore pillar columns.

**Delete the `places` pillar object** from `v4Pillars`. Its content migrates into the Explore pillar columns.

### `v4-nav.ts` — Explore pillar replacement

Replace the current Explore pillar with the following. This is the complete new object:

```ts
{
  key: 'explore',
  label: 'Explore',
  href: '/explore/',
  intro: "Every move on the Peninsula that isn't a meal or a bed.",
  topBanner: {
    text: "The whole Peninsula, on one screen.",
    ctaLabel: 'Open the map',
    ctaHref: '/map/',
    icon: 'peninsula-map',
  },
  rail: {
    eyebrow: "Editor's pick · Autumn '26",
    title: 'Bushrangers Bay walk',
    verdict: 'Two hours, almost nobody on it after lunch, and the wildflowers come out late April. Park at Cape Schanck, not Boneo.',
    href: '/explore/bushrangers-bay-walk/',
    cta: 'Plan the walk',
    // image field removed — not rendered in V5
  },
  columns: [
    {
      eyebrow: 'Places',
      items: [
        { key: 'sorrento',    label: 'Sorrento',          href: '/explore/places/sorrento/' },
        { key: 'red-hill',    label: 'Red Hill',           href: '/explore/places/red-hill/' },
        { key: 'flinders',    label: 'Flinders',           href: '/explore/places/flinders/' },
        { key: 'mornington',  label: 'Mornington',         href: '/explore/places/mornington/' },
        { key: 'all-places',  label: 'All places →',       href: '/explore/places/' },
      ],
    },
    {
      eyebrow: 'Regions',
      items: [
        { key: 'wine-country',  label: 'Red Hill & Merricks',     href: '/explore/regions/red-hill-wine-country/' },
        { key: 'peninsula-tip', label: 'Sorrento & Portsea',      href: '/explore/regions/peninsula-tip/' },
        { key: 'mornington-bay','label': 'Mornington & the Bay',  href: '/explore/regions/mornington-bay-coast/' },
        { key: 'ocean-coast',   label: 'Flinders & Ocean Coast',  href: '/explore/regions/ocean-coast/' },
        { key: 'all-regions',   label: 'All regions →',           href: '/explore/regions/' },
      ],
    },
    {
      eyebrow: 'Plans & moves',
      items: [
        { key: 'one-night',   label: 'One night',          href: '/explore/plans/one-night-escape/' },
        { key: 'weekend',     label: 'Two-day weekend',    href: '/explore/plans/' },
        { key: 'wellness',    label: 'Wellness weekend',   href: '/explore/plans/wellness-weekend/' },
        { key: 'walks',       label: 'Walks & trails',     href: '/explore/walks/' },
        { key: 'beaches',     label: 'Beaches',            href: '/explore/beaches/' },
        { key: 'map',         label: 'Open the map →',     href: '/map/' },
      ],
    },
  ],
  askLine: 'Not sure which part of the Peninsula fits? Ask PI →',
},
```

### `v4-nav.ts` — Eat & Drink pillar: update place hrefs

The "Where to eat" column currently points to `/places/[slug]/`. Update to `/explore/places/[slug]/`:

```ts
// Old                              // New
href: '/places/red-hill/'       →   href: '/explore/places/red-hill/'
href: '/places/sorrento/'       →   href: '/explore/places/sorrento/'
href: '/places/flinders/'       →   href: '/explore/places/flinders/'
href: '/places/mornington/'     →   href: '/explore/places/mornington/'
href: '/places/merricks/'       →   href: '/explore/places/merricks/'
```

### `v4-nav.ts` — Wine pillar: update place hrefs

The "By the place" column currently points to `/wine/[place]/`. These are category+place intersection pages — leave hrefs unchanged. No updates needed.

### `v4-nav.ts` — Re-order `v4Pillars` array

After deletions and updates, reorder the array to:
```
[eat, stay, wine, explore, whats-on, journal]
```

### `v4-nav.ts` — Remove `image` + `imageAlt` fields from `V4MegaRail` interface

```ts
// Before
export interface V4MegaRail {
  eyebrow: string;
  title: string;
  verdict: string;
  image: string;      // ← remove
  imageAlt: string;   // ← remove
  href: string;
  cta?: string;
}

// After
export interface V4MegaRail {
  eyebrow: string;
  title: string;
  verdict: string;
  href: string;
  cta?: string;
}
```

Also remove `image` and `imageAlt` fields from all remaining pillar `rail:` objects in `v4Pillars`.

---

## New Component: `V4MegaPin.astro`

Create `/next/src/components/v4/V4MegaPin.astro`.

This replaces `V4MegaRail.astro` in the panel grid. It carries the same editorial function — "the one thing PI is sending you to in this pillar right now" — through pure typography: no image, no card border, no hover transform.

```astro
---
/**
 * V4 MegaPin — typographic editorial pin inside a mega panel.
 *
 * Replaces V4MegaRail (image card) with a pure-type block.
 * Carries the editor's pick verdict in Space Grotesk + Instrument Serif.
 * No image. No card border. Weight and scale carry the argument.
 *
 * The pin occupies the leftmost column of the mega grid, same position
 * as the old rail — 200px wide on desktop, hidden at ≤920px where the
 * grid falls to 2 columns and the columns carry the panel alone.
 */
import type { V4MegaRail } from '../../lib/v4-nav';

export interface Props {
  rail: V4MegaRail;
}
const { rail } = Astro.props;
---

<a class="v4-pin" href={rail.href}>
  <p class="v4-pin__eyebrow">{rail.eyebrow}</p>
  <h3 class="v4-pin__title">{rail.title}</h3>
  <p class="v4-pin__verdict">{rail.verdict}</p>
  <span class="v4-pin__cta">{rail.cta ?? 'Read the verdict'}</span>
</a>
```

**Note:** No `editableImage` call. No `loadOverrides` call. No `pillarKey` prop. The pin has no image override surface — editorial updates are made by editing the `rail.title` and `rail.verdict` fields in `v4-nav.ts` directly.

---

## Modified Component: `V4MegaPanel.astro`

Replace the `V4MegaRail` import with `V4MegaPin`. The grid logic simplifies because the pin has no "wide rail" variant.

```astro
---
import type { V4Pillar } from '../../lib/v4-nav';
import V4MegaColumn from './V4MegaColumn.astro';
import V4MegaPin from './V4MegaPin.astro';  // ← replaces V4MegaRail

export interface Props {
  pillar: V4Pillar;
  triggerId: string;
}

const { pillar, triggerId } = Astro.props;
const cols = pillar.columns.length;  // 2 or 3
const panelClass = [
  'v4-mega',
  cols === 2 ? 'v4-mega--cols-2' : 'v4-mega--cols-3',
].filter(Boolean).join(' ');
// Note: v4-mega--rail-wide class removed — no longer needed
---

{pillar.columns?.length > 0 && (
<div
  class={panelClass}
  role="menu"
  aria-labelledby={triggerId}
  data-v4-mega
>
  <div class="v4-mega__container">
    {pillar.topBanner && <V4PillarTopBanner banner={pillar.topBanner} />}
    <div class="v4-mega__grid">
      <V4MegaPin rail={pillar.rail} />
      {pillar.columns.map((col) => <V4MegaColumn column={col} />)}
    </div>
  </div>
</div>
)}
```

**Also add:** `import V4PillarTopBanner from './V4PillarTopBanner.astro';` — the topBanner render was previously missing from the panel template and needs to be wired in.

---

## Modified Component: `V4MegaColumn.astro`

No structural changes. One type-system update: item font-family changes from Cormorant Garamond to Space Grotesk (handled in CSS — no template change needed).

---

## CSS Changes: `v4.css`

### 1. Update CSS custom properties

```css
:root {
  --v4-mega-w:           1240px;
  --v4-mega-pin-w:       200px;      /* replaces --v4-mega-rail-w: 280px */
  --v4-mega-col-gap:     48px;       /* increased from 40px — more air with pin replacing image */
  --v4-mega-row-h:       56px;
  --v4-mega-pad-y:       44px;       /* slightly increased from 40px */
  --v4-mega-open-delay:  70ms;
  --v4-mega-close-delay: 220ms;

  --v4-shadow-mega:      0 16px 40px -16px rgba(30, 27, 24, 0.18);
  --v4-shadow-mega-soft: 0 8px 24px -12px rgba(30, 27, 24, 0.12);
  --v4-focus-ring:       0 0 0 3px rgba(139, 78, 59, 0.22);
  --v4-hairline-mega:    rgba(30, 27, 24, 0.10);
  --v4-ease:             cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

Remove `--v4-mega-rail-w` entirely.

### 2. Update mega grid

```css
/* Remove the rail-wide modifier (no longer needed): */
/* DELETE: .v4-mega--rail-wide { ... } */
/* DELETE: .v4-mega--rail-wide .v4-mega__grid { ... } */

.v4-mega__grid {
  display: grid;
  grid-template-columns: var(--v4-mega-pin-w) repeat(var(--v4-cols, 3), 1fr);
  gap: var(--v4-mega-col-gap);
  align-items: start;
}
.v4-mega--cols-2 { --v4-cols: 2; }
.v4-mega--cols-3 { --v4-cols: 3; }

@media (max-width: 1080px) {
  .v4-mega__grid {
    grid-template-columns: 180px repeat(var(--v4-cols, 3), 1fr);
    gap: 28px;
  }
}

/* At ≤920px: drop the pin, show columns only in a 2-up grid */
@media (max-width: 920px) {
  .v4-mega__grid { grid-template-columns: 1fr 1fr; }
  .v4-pin { display: none; }
}
```

### 3. Remove all `.v4-mega__rail` CSS

Delete the entire "MEGA RAIL" block (lines 370–434 in the current file):

```css
/* DELETE this entire block: */
.v4-mega__rail { ... }
.v4-mega__rail:hover { ... }
.v4-mega__rail-image { ... }
.v4-mega__rail-image img { ... }
.v4-mega__rail:hover .v4-mega__rail-image img { ... }
.v4-mega__rail-body { ... }
.v4-mega__rail-eyebrow { ... }
.v4-mega__rail-title { ... }
.v4-mega__rail-verdict { ... }
.v4-mega__rail-cta { ... }
```

### 4. Add `.v4-pin` CSS (new block — insert where rail block was removed)

```css
/* =========================================================
   MEGA PIN (typographic editorial block — replaces image rail)
   ---------------------------------------------------------
   Tate Modern reference: compressed grotesque at hierarchy-
   defining scale. No card. No border. No image. Weight and
   proportion carry the full visual argument.
   ========================================================= */

.v4-pin {
  display: flex;
  flex-direction: column;
  gap: 0;
  text-decoration: none;
  color: var(--text);
  padding: 0;
  /* Vertical alignment: pin top aligns with first column eyebrow */
  padding-top: 0;
}

.v4-pin__eyebrow {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 10px 0;
  /* Match the eyebrow baseline of adjacent columns */
  padding-bottom: 8px;
  border-bottom: 1px solid var(--v4-hairline-mega);
}

.v4-pin__title {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: clamp(22px, 2vw, 28px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 14px 0 12px 0;
  /* No text-transform. The title carries the weight through mass, not case. */
}

.v4-pin__verdict {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.45;
  color: var(--soft);
  margin: 0 0 16px 0;
  /* Max 2 lines at pin width. Title must be ≤3 words for this to hold. */
}

.v4-pin__cta {
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  /* No arrow. No uppercase. The underline is the whole signal. */
  margin-top: auto;
}

/* Hover state: title colour only — no transform, no shadow, no border */
.v4-pin:hover .v4-pin__title { color: var(--accent); }
.v4-pin:hover .v4-pin__cta {
  color: var(--accent);
  text-decoration-color: var(--accent);
}

/* Focus state */
.v4-pin:focus-visible {
  outline: none;
  box-shadow: var(--v4-focus-ring);
  border-radius: 2px;
}

/* Reduced motion: no transition needed — there are no animated properties on pin */
```

### 5. Update `.v4-mega__col-list a` font-family

The column item links currently use Cormorant Garamond at 19px. For the Tate Modern treatment, shift to Space Grotesk at a slightly reduced size for better scan readability at this scale:

```css
.v4-mega__col-list a {
  font-family: 'Space Grotesk', system-ui, sans-serif;  /* was Cormorant Garamond */
  font-size: 16px;                                        /* was 19px */
  font-weight: 400;
  line-height: 1.3;
  color: var(--text);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid transparent;
  transition: color var(--v4-mega-open-delay) var(--v4-ease),
              border-color var(--v4-mega-open-delay) var(--v4-ease);
}
.v4-mega__col-list a:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 500;                 /* weight shift replaces colour change as primary signal */
}
```

**Rationale:** Cormorant Garamond at 19px reads as decorative in a navigation context. Space Grotesk at 16px is more legible at speed and signals "navigation" rather than "editorial prose." The column eyebrows (Outfit, uppercase) remain unchanged — the typographic contrast between eyebrow and item is preserved.

### 6. Remove `.v4-mega__intro` CSS

The intro field was previously removed from the template (2026-05-13). Clean up the orphaned CSS:

```css
/* DELETE: */
.v4-mega__intro { ... }
```

---

## Breakpoint Behaviour Summary

| Viewport | Pin | Columns | Grid layout |
|---|---|---|---|
| ≥1081px | 200px fixed | 2 or 3 × `1fr` | `200px repeat(N, 1fr)`, gap 48px |
| 921px–1080px | 180px fixed | 2 or 3 × `1fr` | `180px repeat(N, 1fr)`, gap 28px |
| 761px–920px | Hidden | 2 × `1fr` | `1fr 1fr`, gap 28px |
| ≤760px | — | — | Desktop mega hidden; mobile drawer active |
| ≤380px | — | — | Drawer tightened (existing behaviour, no change) |

---

## Hover States — Complete Reference

| Element | Default | Hover |
|---|---|---|
| Pillar trigger link | `color: var(--text)`, `border-bottom: 2px transparent` | `color: var(--accent)`, `border-bottom: 2px var(--accent)` |
| Chevron | Neutral rotation | `rotate(180deg)` on `.is-open` |
| Pin block (`.v4-pin`) | — | `.v4-pin__title` → `color: var(--accent)` |
| Pin CTA | `color: var(--text)`, underline | `color: var(--accent)`, `text-decoration-color: var(--accent)` |
| Column item link | `color: var(--text)`, `border-bottom: 1px transparent` | `color: var(--accent)`, `border-bottom: 1px var(--accent)`, `font-weight: 500` |
| Live indicator dot | Sage, pulsing | No change |
| Top banner CTA | `color: var(--accent)`, no underline | `text-decoration: underline` |

**No hover transforms anywhere in the menu panel.** The image rail's `translateY(-2px)` on hover is removed with the rail. Navigation elements do not animate vertically — that was a card interaction pattern, not a nav one.

---

## Accessibility Requirements

### Keyboard navigation

No changes to the existing keyboard handling in the V4 BaseLayout inline script. The existing behaviour — `Escape` closes the open panel, `Tab` navigates through items, arrow keys not required for WCAG AA — is preserved.

Verify:
- Every pillar trigger (`V4PillarLink`) retains `aria-haspopup="true"` and `aria-expanded`
- Every mega panel retains `role="menu"` and `aria-labelledby={triggerId}`
- Every column item retains `role="menuitem"`
- `V4MegaPin` anchor has no `role` — it is a standard link within the menu container, not a menuitem

### Focus ring

All interactive elements use `var(--v4-focus-ring)` on `:focus-visible`. The pin block adds this:

```css
.v4-pin:focus-visible {
  outline: none;
  box-shadow: var(--v4-focus-ring);
  border-radius: 2px;
}
```

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .v4-mega { transition: none; transform: none; }
  /* Pin has no animated properties — no additional rule needed */
  /* Live dot pulse already handled by existing rule */
}
```

### Contrast

- `var(--text)` on `var(--bg)` (cream): passes WCAG AA at all sizes used in the pin
- `var(--soft)` on `var(--bg)` for the verdict line: verify passes 4.5:1 — if not, bump to `var(--text)` on the verdict specifically
- `var(--accent)` (ochre) on `var(--bg)`: eyebrow uses uppercase + letter-spacing which reduces minimum contrast threshold — acceptable at 10–11px uppercase per existing brand system

### Screen reader experience

The typographic pin renders as a standard `<a>` containing four text nodes. No `aria-label` needed — the link text (eyebrow + title + verdict + CTA) is fully descriptive in sequence. Verify with VoiceOver: the link should announce as "[title], [verdict], Read the verdict, link."

---

## Mobile Drawer: No Changes

`V4MobileDrawer.astro` is already typographic. The `Editor's pick: {title} →` line inside each expanded pillar body is a plain text link — no image, no card. It is already the Tate Modern approach.

The drawer `rail` field access (`pillar.rail.title`) continues to work after the `V4MegaRail` interface update because `title`, `verdict`, and `href` are all retained.

---

## Files Changed

| File | Action |
|---|---|
| `src/lib/v4-nav.ts` | Remove `image`/`imageAlt` from `V4MegaRail` interface; remove from all `rail:` objects; delete `escape` pillar; delete `places` pillar; add new `explore` pillar; reorder array; update Eat & Drink place hrefs |
| `src/components/v4/V4MegaPanel.astro` | Replace `V4MegaRail` import with `V4MegaPin`; remove `wideRail` logic; add `V4PillarTopBanner` wiring; remove `v4-mega--rail-wide` class |
| `src/components/v4/V4MegaPin.astro` | **New file** — typographic pin component |
| `src/components/v4/V4MegaRail.astro` | **Delete** — replaced by V4MegaPin |
| `src/styles/v4.css` | Update `--v4-mega-rail-w` → `--v4-mega-pin-w`; remove rail CSS block; add pin CSS block; update column item font-family and size; remove `.v4-mega__intro` orphan; remove `--rail-wide` modifier rules |
| `src/components/v4/V4MobileDrawer.astro` | No change |
| `src/components/v4/V4MegaColumn.astro` | No change |
| `src/components/v4/V4PillarLink.astro` | No change |
| `src/components/v4/V4PillarTopBanner.astro` | No change |
| `src/components/v4/V4Masthead.astro` | No change |

---

## Font Loading

`Space Grotesk` is used by the pin title and the updated column item links. Confirm it is already loaded in `V4BaseLayout.astro` (or equivalent font loading). If `Space Grotesk` is not in the current font stack, add to the font loading link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
>
```

`Space Mono` is used for the pin CTA. Confirm it is loaded. The font is already used in the broader PI design system; this is a new usage site for it in the nav layer.

If either font is served locally (in `/public/fonts/`), no change needed.

---

## Testing Checklist

### Desktop (≥1081px)
- [ ] All 6 pillars render in correct order: Eat & Drink · Stay · Wine · Explore · What's On · Journal
- [ ] Explore panel shows 3 columns: Places / Regions / Plans & moves
- [ ] Pin renders in leftmost position: eyebrow → title → verdict → CTA
- [ ] Pin title is at least 22px, bold, tight tracking
- [ ] Verdict line is italic Cormorant Garamond, max 2 lines at pin width
- [ ] CTA is Space Mono, underlined, no arrow
- [ ] No images anywhere in the mega panel
- [ ] Column items render in Space Grotesk 16px (not Cormorant Garamond 19px)
- [ ] Column eyebrows remain Outfit uppercase ochre
- [ ] Hover on pin: title and CTA shift to `var(--accent)`, no translateY
- [ ] Hover on column item: accent colour + weight 500 + underline
- [ ] No card border or shadow on pin
- [ ] Panel border-top: 1px `var(--border)` (unchanged)
- [ ] Panel box-shadow intact

### Breakpoint 921px–1080px
- [ ] Pin narrows to 180px, remains visible
- [ ] Gap reduces to 28px
- [ ] No layout overflow

### Breakpoint 761px–920px
- [ ] Pin hidden (`.v4-pin { display: none }`)
- [ ] Grid falls to 2-column: `1fr 1fr`
- [ ] Both columns visible and readable
- [ ] No orphaned rail image placeholder

### Mobile (≤760px)
- [ ] Desktop mega panel not rendered
- [ ] Mobile drawer opens correctly
- [ ] Drawer Explore pillar expands to show Places / Regions / Plans & moves columns
- [ ] `Editor's pick: Bushrangers Bay walk →` link renders in expanded Explore body
- [ ] Plans and Places pillars no longer appear as standalone drawer items

### Accessibility
- [ ] Tab through all pillar triggers — focus ring visible on each
- [ ] Escape closes open panel and returns focus to trigger
- [ ] VoiceOver: pin announces as link with title + verdict + CTA text
- [ ] Column items announce as `role="menuitem"` links
- [ ] Verify `prefers-reduced-motion`: no animation on panel open/close when set

### Regression
- [ ] Journal pillar still renders as `v4-pillars__link--journal` (italic, no chevron)
- [ ] What's On pillar topBanner renders (the live conditions banner)
- [ ] Explore pillar topBanner (Peninsula map CTA) renders
- [ ] Live indicator dots on What's On column items still pulse
- [ ] Subscribe CTA in masthead action cluster unchanged
- [ ] Footer nav (`v4FooterDepartments`) still lists all pillars — update if Places or Plans rows appear

### Footer update

`v4FooterDepartments` in `v4-nav.ts` currently lists Places and Plans (escape) as separate entries. After this PR:

```ts
export const v4FooterDepartments: V4NavItem[] = [
  { key: 'eat',      label: 'Eat & Drink', href: '/eat/' },
  { key: 'stay',     label: 'Stay',        href: '/stay/' },
  { key: 'wine',     label: 'Wine',        href: '/wine/' },
  { key: 'explore',  label: 'Explore',     href: '/explore/' },
  { key: 'whats-on', label: "What's On",   href: '/whats-on/' },
  { key: 'journal',  label: 'Journal',     href: '/journal/' },
];
```

Remove the `places` and `escape` entries. Explore covers both.

---

## What This PR Does Not Do

To be explicit — the following are out of scope for this PR and belong to later phases:

- **URL changes.** `/places/[slug]` and `/plans/[slug]` still resolve. This PR only removes them from the navigation surface. The 301 redirects and content migration belong to Phase 5.
- **Region pages.** `/explore/regions/` links in the new Explore column will return 404 until Phase 6. This is acceptable — the nav links can be added now; the pages follow.
- **VenueDetailTemplate or PlaceDetailTemplate changes.** Those are Phase 5–6 work.
- **Article breadcrumb updates.** Phase 5.
- **Supabase or search index changes.** None required.

---

## Visual Reference: The Tate Modern Principle

The Tate Modern nav strips imagery from navigation entirely. Type at commanding scale — often just a section name at 28–32px compressed grotesque — carries the full wayfinding argument. Whitespace is generous and intentional. Colour is monochrome or near-monochrome in the chrome layer, with accent colour used only for active states and calls to action.

Applied to PI: the mega panel becomes a table of contents, not a magazine layout. The pin title at 28px bold does the work the image used to do. The italic verdict line is PI voice in one sentence. The monospace CTA is functional, not decorative. The column items are readable nouns, not small-text links buried under imagery.

The result: a faster-scanning, lower-maintenance, more editorially authoritative navigation layer.

---

*Spec authored: Sunday 31 May 2026. Author: James Richmond / Peninsula Insider editorial.*  
*For questions during implementation, refer to `BRAND-PI.md` for voice rules and `v4.css` for existing token values.*
