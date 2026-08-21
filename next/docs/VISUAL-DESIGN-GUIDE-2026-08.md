# Peninsula Insider — Visual Design Guide

**Version:** 2.0 — Harbour  
**Date:** 2026-08-06  
**Status:** Current source of truth — supersedes `DESIGN-SYSTEM.md` (v1.0, May 2026)  
**Maintained by:** Remy (build) · Emma Richmond (editorial sign-off)  
**Audience:** Agents, designers, developers, content contributors

> This guide reflects the live site as of the **Harbour palette adoption, 2026-07-25**. All prior references to Cormorant Garamond, Outfit, warm terracotta, cream grounds, or the v5 "warm-editorial" palette describe a superseded state. Do not use them.

---

## Source files (single source of truth)

| Role | File |
|------|------|
| Token layer | `next/src/styles/v6-tokens.css` |
| Core role definitions | `next/src/styles/global.css` (`:root {}`) |
| Button + card primitives | `next/src/styles/primitives.css` |
| Global typography, layout, modules | `next/src/styles/global.css` |
| Brand vault reference | `peninsula-insider-vault/02-brand/v6-evergreen-coast-design-system.md` |
| Brand foundation | `peninsula-insider-vault/02-brand/brand-foundation.md` |
| Voice and tone | `peninsula-insider-vault/02-brand/voice-and-tone.md` |

---

## 1. Design Philosophy

Peninsula Insider is a **destination discovery platform, not a generic travel magazine**. The visual language must do two things at once: convey editorial trust (a well-informed local guide) and platform utility (fast, scannable, action-oriented).

The current design generation — v6 "Harbour" — draws on the Destination Vancouver design language, tuned to the Mornington Peninsula's coastal identity. Key character decisions:

- **Blue structural ground, single warm pop.** Harbour blue carries CTAs, structure, and navigation. Sand (#F5C177) is the one warm accent — used sparingly on dark grounds only, never as body text on white.
- **Clean and flat, no grain.** The warm film-grain overlay from v5 is removed. Cards define themselves with a hairline border, not shadows.
- **Two typefaces only, no serif.** Sora (geometric display) + Figtree (humanist UI/body). Cormorant Garamond is gone.
- **Photography-led.** The design system creates a frame for Peninsula photography. The frame must not compete with the imagery.
- **Zero surprise motion.** No carousels, no auto-play, no animation except CSS transitions declared in the token layer.

---

## 2. Colour System

### Core palette — Harbour (adopted 2026-07-25)

These named tokens are defined in `v6-tokens.css`:

| Token | Hex | Role |
|-------|-----|------|
| `--harbour` | `#10527E` | Primary brand — CTAs, links on light |
| `--harbour-h` | `#0C4166` | Hover state for harbour |
| `--harbour-deep` | `#0B2E4A` | Signature dark ground — hero, footer, dark sections |
| `--sand` | `#F5C177` | The single warm pop — dark grounds only, never body text on white |
| `--sand-text` | `#8A5620` | AA-safe warm cut for text on light (6.12:1 on white) |
| `--bronze` | `#C2803A` | Secondary warm accent, decorative only |
| `--tide` | `#7FB2D4` | Light blue, decorative |
| `--tide-text` | `#1D6491` | AA-safe blue cut for text on light (6.39:1 on white) |
| `--slate` | `#2E4A63` | Tertiary cool accent |
| `--signal` | `#E2562F` | Live/now marker — high-visibility coral |
| `--signal-text` | `#A63A16` | AA-safe cut for text (6.49:1 on white) |
| `--wine` | `#4D0222` | Rare deep flourish |

### Semantic role tokens (defined in `global.css :root`)

These are the tokens components must use. Do not reference named palette tokens directly — use the role.

| Token | Resolves to | Role |
|-------|-------------|------|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-alt` | `#F2EFEA` | Warm paper tint — alternating section backgrounds, the one warm ground |
| `--bg-dark` | `var(--harbour-deep)` | Dark editorial sections, footer, newsletter band |
| `--text` | `#14202A` | Body copy — blue-black |
| `--soft` | `#4B5862` | Metadata, labels, secondary text — blue-grey |
| `--accent` | `var(--harbour)` | Primary CTA, links |
| `--acc-h` | `var(--harbour-h)` | Accent hover |
| `--gold` | `var(--bronze)` | Decorative rules/accents (formerly rust) |
| `--gold-text` | `var(--sand-text)` | AA-safe warm for text on light |
| `--sage` | `var(--tide)` | Decorative (formerly green) |
| `--sage-text` | `var(--tide-text)` | AA-safe blue for text on light |
| `--dark` | `var(--harbour-deep)` | Headings |
| `--white` | `#FDFCFA` | Warm white, card grounds |
| `--border` | `#83857E` | Hairlines — 3.74:1 on white, 3.26:1 on bg-alt (WCAG non-text pass) |
| `--border-strong` | `#5C6B75` | Hover border, stronger separation — 5.10:1 on white |

### Accessibility — computed contrast ratios

All text pairings meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI):

| Foreground | Background | Ratio | Use |
|-----------|-----------|-------|-----|
| `--white` on `--accent` | — | 8.00:1 | Solid button label |
| `--white` on `--acc-h` | — | 10.46:1 | Solid button hover label |
| `--text` on `--mint` (`--sand`) | — | 14.38:1 | Inverse solid button label |
| `--text` on `#FFFFFF` | — | 16.64:1 | Ghost button label |
| `--accent` on `#FFFFFF` | — | 8.17:1 | Text button / inline link |
| `#FFFFFF` on `--bg-dark` | — | 13.43:1 | Inverse ghost label |
| `--soft` on `#FFFFFF` | — | 7.26:1 | Card metadata, dek |
| `--border` on `#FFFFFF` | — | 3.74:1 | Card hairline (non-text, passes 3:1) |
| `--sand-text` on `#FFFFFF` | — | 6.12:1 | Warm accent text on light |
| `--error-text` `#C0392B` on `#FFFFFF` | — | 5.44:1 | Error messages |

**Colour don'ts:**
- `--sand` (`#F5C177`) is a non-text decorative colour. Never use it as text on white — it fails AA.
- `--tide` (`#7FB2D4`) is decorative. Use `--tide-text` (`#1D6491`) if you need blue text.
- `--border` (`#83857E`) is not a text colour — use `--soft` instead.
- Never hardcode a hex value. Every colour reference must be a CSS custom property.

---

## 3. Typography

### Typefaces

Two faces. Nothing else.

| Face | Token | Fallback stack | Role |
|------|-------|---------------|------|
| **Sora** | `--font-display` | `system-ui, -apple-system, 'Segoe UI', sans-serif` | Display headings, all `h1`–`h5` |
| **Figtree** | `--font-ui` | `system-ui, -apple-system, 'Segoe UI', sans-serif` | Body copy, UI, labels, buttons, nav |

Both are self-hosted from `/public/fonts/`. No Google Fonts link. Weights available:
- Sora: 400, 500, 600, 700, 800
- Figtree: 300, 400, 500, 600, 700

### Type scale — 9 tokens, `clamp()`-based

All sizes use `clamp()` to scale fluidly between viewport widths. The `rem` base tracks the reader's browser font-size preference.

| Token | Range | Intended role |
|-------|-------|--------------|
| `--fs-950` | 48px → 104px | Hero cover display |
| `--fs-900` | 40px → 64px | Section cover, big h1 |
| `--fs-800` | 34px → 48px | Page h1 |
| `--fs-700` | 28px → 36px | h2, section titles |
| `--fs-600` | 22px → 26px | h3, card titles |
| `--fs-500` | 19px → 21px | Deks, verdicts |
| `--fs-400` | 17px (fixed) | **Body copy** |
| `--fs-300` | 15px (fixed) | Secondary body, captions, nav |
| `--fs-200` | 13px (fixed) | Metadata, bylines, small buttons |
| `--fs-100` | 12px (fixed) | **Floor** — eyebrows and labels only |

### Line heights

| Token | Value | Use |
|-------|-------|-----|
| `--lh-display` | 1.02 | Hero display headings |
| `--lh-heading` | 1.14 | Section and page headings |
| `--lh-dek` | 1.45 | Deks and intro copy |
| `--lh-body` | 1.65 | Body copy (`body` element default) |
| `--lh-ui` | 1.4 | Buttons, labels, nav |
| `--lh-label` | 1.2 | Uppercase eyebrows and tags |

### Weights

| Token | Value | Use |
|-------|-------|-----|
| `--fw-display` | 600 | Display headings |
| `--fw-body` | 400 | Figtree body |
| `--fw-medium` | 500 | Nav, buttons, deks |
| `--fw-semibold` | 600 | Labels, table heads, UI emphasis |
| `--fw-bold` | 700 | CTA labels |

### Letter spacing

| Token | Value | Use |
|-------|-------|-----|
| `--ls-display` | −0.02em | Tight tracking for big geometric display |
| `--ls-eyebrow` | 0.12em | Uppercase eyebrows |

### Measure (max-width for text columns)

| Token | Value | Use |
|-------|-------|-----|
| `--measure-prose` | 68ch | Article body |
| `--measure-dek` | 52ch | Dek / intro |
| `--measure-card` | 38ch | Card dek |

### Typography rules

- **Headings:** always `font-family: var(--font-display)` (Sora). Colour is `var(--dark)`. Line-height `1.06` on the element, token-based on each size.
- **Body:** `font-family: var(--font-ui)` (Figtree), `--fs-400`, `--lh-body`, `--fw-body`.
- **Eyebrows:** `--font-ui`, `--fs-100`, `--fw-semibold`, `letter-spacing: var(--ls-eyebrow)`, `text-transform: uppercase`, `color: var(--soft)`.
- **Button labels:** sentence case. `text-transform: none` is pinned in the primitive. No tracked uppercase on button labels — ever.
- **Reader text scale:** the site offers a three-step text-size control (`data-text-scale` on `<html>`). At scale 2, the base is 108.75%; at scale 3, 118%. All sizing is `rem`-based so it inherits correctly.

**Typography don'ts:**
- No Cormorant Garamond. No serif faces.
- No Outfit (former body face). No Inter. No Google Fonts link.
- Do not hardcode `px` font sizes on type elements — use a scale token.
- Do not set `font-size` below `--fs-100` (12px).
- Do not use tracked uppercase on button labels.

---

## 4. Spacing

4px base scale, rem-based:

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-5` | 1.5rem (24px) |
| `--space-6` | 2rem (32px) |
| `--space-7` | 3rem (48px) |
| `--space-8` | 4rem (64px) |
| `--space-9` | 6rem (96px) |
| `--space-10` | 8rem (128px) |
| `--space-para` | 1.5rem | Between paragraphs |
| `--space-heading-above` | 2.75rem | Before a heading |
| `--space-heading-below` | 1rem | After a heading |

---

## 5. Shape and Elevation

### Radii — 4 tokens

| Token | Value | Use |
|-------|-------|-----|
| `--radius-s` | 8px | Chips, buttons, inputs, edition mark |
| `--radius-m` | 16px | **Dominant** — card media, tiles |
| `--radius-l` | 28px | Panels, sheets, modals, "door" tiles |
| `--radius-pill` | 999px | Pill buttons, icon buttons, tags |

### Elevation — 3 values, cool-tinted

Cards do **not** use box-shadow. Definition comes from the hairline border (`--border`, 3.74:1 on white). Shadows are reserved for overlays and modal contexts.

| Token | Value | Use |
|-------|-------|-----|
| `--elev-1` | `0 2px 10px rgba(0,54,44,0.06)` | Light lift (tooltips, date pickers) |
| `--elev-2` | `0 14px 28px -14px rgba(0,40,34,0.26)` | Drawer, popover |
| `--elev-3` | `0 26px 52px -18px rgba(0,40,34,0.34)` | Modal, overlay |

---

## 6. Motion

| Token | Value |
|-------|-------|
| `--dur-fast` | 120ms |
| `--dur-med` | 200ms |
| `--dur-slow` | 320ms |
| `--ease-enter` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| `--ease-exit` | `ease-in` |

At `prefers-reduced-motion: reduce`, all three durations collapse to 0ms. **Do not introduce animation outside these tokens.** No carousels, no auto-play, no keyframe animation on body content.

---

## 7. Components

### Buttons — `.pi-btn`

Source: `primitives.css`. Three variants, three sizes, three modifiers.

#### Base rules (all buttons)
- Min-height 44px (touch target floor)
- Font: `var(--font-ui)`, `var(--fs-300)`, `var(--fw-medium)`
- Text: sentence case, no letter-spacing (`text-transform: none`)
- Radius: `var(--radius-s)` (8px) — **except** icon buttons which use `--radius-pill`
- Focus: `outline: 2px solid var(--focus-ring-color)` with 2px offset

#### Variant: Solid (primary action)
```css
background-color: var(--accent);   /* --harbour blue */
border-color:     var(--accent);
color:            var(--white);     /* 8.00:1 */
```
Hover: `var(--acc-h)` (10.46:1).

#### Variant: Ghost (secondary action)
```css
background:   transparent;
border:       1px solid var(--border-strong);  /* 5.10:1 */
color:        var(--text);                      /* 16.64:1 */
```
Hover: border and text switch to `var(--accent)`.

#### Variant: Text (inline or card CTA)
```css
color:            var(--accent);               /* 8.17:1 */
text-decoration:  underline 1px;
text-underline-offset: 0.28em;
```
Min-height 24px (WCAG 2.5.8 AA).

#### Sizes
| Class | Min-height | Padding | Font |
|-------|-----------|---------|------|
| `.pi-btn--sm` | 36px | `--space-1` × `--space-3` | `--fs-200` |
| *(default)* | 44px | `--space-2` × `--space-5` | `--fs-300` |
| `.pi-btn--lg` | 52px | `--space-3` × `--space-6` | `--fs-400` |

#### Modifier: Inverse (on dark grounds)
```css
/* Solid inverse */
background-color: var(--mint);   /* --sand, the warm pop */
color:            var(--text);   /* 14.38:1 */

/* Ghost inverse */
border-color: #FFFFFF;
color:        #FFFFFF;           /* 13.43:1 on --bg-dark */
```

#### Button do/don't

✅ Do:
```html
<button class="pi-btn pi-btn--solid">Book now</button>
<a class="pi-btn pi-btn--ghost">Save venue</a>
<button class="pi-btn pi-btn--text">Read more</button>
```

❌ Don't:
```html
<!-- Uppercase tracked label — the primitive pins text-transform: none -->
<button style="text-transform: uppercase; letter-spacing: .1em">BOOK NOW</button>
<!-- Hardcoded background -->
<button style="background: #10527E; color: white">Book</button>
<!-- Below touch target -->
<button style="min-height: 28px">Save</button>
```

---

### Cards — `.pi-card`

Source: `primitives.css`. No box-shadow — definition is the `--border` hairline.

#### Structure
```html
<article class="pi-card">
  <div class="pi-card__media">
    <img src="…" alt="…">
  </div>
  <div class="pi-card__body">
    <span class="pi-card__eyebrow">Restaurants</span>
    <h3 class="pi-card__title"><a href="…">Venue Name</a></h3>
    <p class="pi-card__dek">Two-line summary, clamped.</p>
    <div class="pi-card__meta">Mornington · $$</div>
    <div class="pi-card__actions">
      <a class="pi-btn pi-btn--solid pi-btn--sm" href="…">Book</a>
    </div>
  </div>
</article>
```

#### Key specs
| Element | Rule |
|---------|------|
| Card border | `1px solid var(--border)` |
| Card hover border | `var(--border-strong)` |
| Card radius | `--radius-m` (16px) |
| Media aspect | `3 / 2` (standard), `16 / 9` (feature), `1 / 1` (compact) |
| Body padding | `var(--space-4)` (16px) |
| Body gap | `var(--space-2)` (8px) |
| Eyebrow | `--fs-100`, `--fw-semibold`, `--ls-eyebrow`, uppercase, `--soft` |
| Title | `--font-display`, `--fs-600`, `--fw-display`, `--ls-display`, `--text` |
| Dek | `--fs-300`, `--lh-dek`, `--soft`, 2-line clamp |
| Meta | `--font-ui`, `--fs-200`, `--soft`, pinned to card foot |

#### Variants
| Class | Change |
|-------|--------|
| `.pi-card--compact` | Horizontal row, 38% image left, square media |
| `.pi-card--feature` | 16/9 media, larger type, `--space-6` body padding |

#### Card do/don't

✅ Do — use the primitive, add eyebrow + title + dek + meta:
```html
<article class="pi-card pi-card--feature">…</article>
```

❌ Don't:
- Add `box-shadow` to a card — definition comes from the border
- Set card background to anything but `var(--white)`
- Skip the `pi-card__media` wrapper (the card clips its own corners)

---

## 8. Layout System

### Container

```html
<div class="container">…</div>
```

Max-width `var(--max-w)` (1100px), centred, `padding: 0 clamp(1.25rem, 4vw, 3rem)`.

Use on every full-width section. Do not introduce alternative max-widths.

### Section alternation

Alternate section backgrounds using `var(--bg)` (white) and `var(--bg-alt)` (#F2EFEA, warm paper tint) to create visual rhythm. Never use both on the same section.

### Prose column

Article and long-form content: `max-width: var(--prose-w)` (`var(--measure-prose)`, 68ch). This is the only content column width.

### Masthead structure

The masthead is a three-row sticky header (`position: sticky; top: 0; z-index: 9999`):

1. **Utility row** — edition stamp, conditions strip, sign-in. Faint blue-tinted background.
2. **Brand row** — wordmark (Sora 600, `clamp(1.85rem, 3vw, 2.35rem)`) + tagline (Sora, `0.95rem`, `var(--soft)`). Logo accent word coloured `var(--accent)`.
3. **Nav row** — section pillars (Figtree, `--fs-300`, uppercase `--ls-eyebrow`) + search icon + Subscribe.

A 2px gradient rule sits below the header (`::after`), providing the "magazine flag" signal without a hard border.

The masthead background is `var(--bg)` (white). No blur, no transparency. `border-bottom: none`.

---

## 9. Image Art Direction

Photography is the backbone of the Peninsula Insider visual identity. The design system exists to frame photography — not to substitute for it.

### Rules

- **Full-bleed place-led heroes.** Hero images must be real Mornington Peninsula photography. Generative imagery is permitted for atmosphere only — never as fake evidence of a real venue, event, or place.
- **Cool-light, coastal.** Favour images with natural coastal light: clear bay water, blue-grey skies, vineyard rows, cliffside walks, wintery hot springs steam. Avoid heavily filtered or oversaturated images that fight the Harbour palette.
- **Image integrity binding.** The image on a venue, article, or event page must match the actual subject of that page. A photo of a vineyard on a restaurant page is an integrity failure.
- **Media aspect ratios** (follow the card/component spec): 3:2 standard, 16:9 feature, 1:1 compact, full-bleed for heroes.
- **No photography of people's faces without consent.** Landscape and place photography only on public-facing cards and heroes.
- **Alt text is mandatory.** Every `<img>` and `<picture>` element must carry a meaningful `alt` attribute. Decorative images use `alt=""`.

### Image treatment

Standalone editorial images (outside a card) carry `border-radius: var(--tile-image-radius)` (`--radius-m`, 16px). Card images are clipped by the card's `overflow: hidden` — no additional radius needed on the `<img>` itself.

---

## 10. Responsive Rules

Breakpoints are fluid, not stepped. The type scale uses `clamp()` to scale with the viewport. Layout changes are handled in component and page CSS.

Key responsive rules:
- Mobile-first. All base styles are for small screens; media queries add complexity.
- The `.container` padding shrinks to `1.25rem` on narrow screens automatically (via `clamp`).
- `.pi-card--compact` media shrinks from 38% to 32% width at `max-width: 480px`.
- The masthead collapses its utility and nav rows on narrow viewports (handled in `global.css` mobile blocks).
- Reader text-scale control: `html[data-text-scale="2"]` → 108.75% base; `[data-text-scale="3"]` → 118%. All sizing must be `rem`-based to inherit.
- **Do not set explicit pixel widths on type containers.** Use `ch`-based `max-width` tokens (`--measure-prose`, `--measure-dek`, `--measure-card`).

---

## 11. Accessibility

### Focus system

```css
--focus-ring-color:         var(--evergreen);  /* = var(--harbour) on light */
--focus-ring-color-inverse: var(--mint);       /* = var(--sand) on dark */
--focus-ring: 2px solid var(--focus-ring-color);
```

- All interactive elements must show a visible focus ring on `:focus-visible`.
- Minimum contrast for the focus ring: 3:1 against adjacent colours.
- On dark grounds, the focus ring switches to `var(--focus-ring-color-inverse)` — 11.60:1 against `--bg-dark`.
- Icon buttons use `--radius-pill` and a 44px touch target.

### Minimum touch target

44×44px for primary actions. 24px height minimum for text-link actions (WCAG 2.5.8 AA).

### Skip link

A skip-to-content link is the first focusable element on every page. It is visually hidden until focused (`left: -9999px` → `0.5rem 0.5rem` on `:focus`).

### Colour alone is not sufficient

Never use colour alone to convey state (error, success, required). Pair with icon, text label, or pattern.

### `prefers-reduced-motion`

All CSS transition durations collapse to 0ms. No keyframe animation on body content.

---

## 12. Do / Don't Summary

| Do | Don't |
|----|-------|
| Use `var(--token)` for every colour and size | Hardcode hex values or pixel font sizes |
| Use Sora for headings, Figtree for body | Use any other typeface — including Cormorant, Outfit, Inter |
| Sentence case on all buttons | ALL CAPS or tracked-uppercase button labels |
| Hairline border for card definition | Box-shadow on cards |
| `--border` for hairlines, `--soft` for metadata text | Use `--border` as a text colour |
| `--sand` on dark grounds only, as decoration | `--sand` as text on white or light backgrounds |
| 44px min-height on primary buttons | Sub-44px primary tap targets |
| Alt text on every meaningful image | Empty or missing alt attributes |
| `clamp()`-based rem sizes from the scale | Raw pixel font sizes |
| Motion in token-declared transitions only | CSS `animation` or JS-driven motion on content |

---

## 13. Legacy Token Aliases

The following alias tokens are defined in `v6-tokens.css` to retarget legacy component references onto the Harbour palette without touching component markup. They are resolved at runtime but should **not** be used in new component code — use the canonical token instead.

| Legacy token | Resolves to | New canonical |
|-------------|-------------|--------------|
| `--evergreen` | `var(--harbour)` | `--accent` |
| `--teal` | `var(--bronze)` | `--gold` |
| `--mint` | `var(--sand)` | Use `--sand` directly on dark grounds |
| `--bg-deep` | `var(--harbour-deep)` | `--bg-dark` |
| `--ink` | `#14202A` | `--text` |
| `--paper` | `var(--white)` | `--white` |
| `--surface` | `var(--white)` | `--white` |
| `--serif` | `var(--font-display)` | `--font-display` (Sora) |
| `--sans` | `var(--font-ui)` | `--font-ui` (Figtree) |
| `--deep` | `var(--bg-dark)` | `--bg-dark` |
| `--cream` | `var(--bg-alt)` | `--bg-alt` |
| `--ochre` | `var(--accent)` | `--accent` |

The legacy aliases mean you will still see warm v5 names in component markup. They resolve correctly. Do not propagate them into new components.

---

*End of guide. Version 2.0 — Harbour. 2026-08-06.*
