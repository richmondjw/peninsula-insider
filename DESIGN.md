---
"name": "Peninsula Insider"
"description": "A coastal editorial guide with integrated planning tools."
"colors":
  "harbour": "#10527E"
  "harbour-hover": "#0C4166"
  "harbour-deep": "#0B2E4A"
  "sand": "#F5C177"
  "sand-text": "#8A5620"
  "tide-text": "#1D6491"
  "background": "#FFFFFF"
  "paper": "#FDFCFA"
  "paper-warm": "#F2EFEA"
  "ink": "#14202A"
  "muted": "#4B5862"
  "rule": "#83857E"
  "control-rule": "#5C6B75"
  "error": "#C0392B"
"typography":
  "display":
    "fontFamily": "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif"
    "fontSize": "clamp(2.5rem, 1.6rem + 4vw, 4rem)"
    "fontWeight": 600
    "lineHeight": 1.02
    "letterSpacing": "-0.02em"
  "headline":
    "fontFamily": "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif"
    "fontSize": "clamp(1.75rem, 1.4rem + 1.6vw, 2.25rem)"
    "fontWeight": 600
    "lineHeight": 1.14
  "title":
    "fontFamily": "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif"
    "fontSize": "clamp(1.375rem, 1.2rem + 0.8vw, 1.625rem)"
    "fontWeight": 600
    "lineHeight": 1.23
  "body":
    "fontFamily": "'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif"
    "fontSize": "1.0625rem"
    "fontWeight": 400
    "lineHeight": 1.65
  "button":
    "fontFamily": "'Figtree', system-ui, -apple-system, 'Segoe UI', sans-serif"
    "fontSize": "0.9375rem"
    "fontWeight": 500
    "lineHeight": 1.4
    "letterSpacing": "normal"
  "compact-title":
    "fontFamily": "Georgia, serif"
    "fontSize": "clamp(2rem, 4vw, 3.5rem)"
    "fontWeight": 600
    "lineHeight": 1.08
    "letterSpacing": "-0.02em"
  "journal-headline":
    "fontFamily": "'Source Serif 4', Georgia, serif"
    "fontWeight": 400
    "lineHeight": 1.12
    "letterSpacing": "-0.025em"
  "journal-body":
    "fontFamily": "Inter, Arial, sans-serif"
    "fontSize": "16px"
    "fontWeight": 400
    "lineHeight": 1.55
"rounded":
  "s": "8px"
  "m": "16px"
  "l": "28px"
  "pill": "999px"
"spacing":
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
  "9": "6rem"
  "10": "8rem"
"components":
  "button-primary":
    "backgroundColor": "{colors.harbour}"
    "textColor": "{colors.paper}"
    "typography": "{typography.button}"
    "rounded": "{rounded.s}"
    "padding": "0.5rem 1.5rem"
  "button-primary-hover":
    "backgroundColor": "{colors.harbour-hover}"
    "textColor": "{colors.paper}"
  "button-ghost":
    "backgroundColor": "transparent"
    "textColor": "{colors.ink}"
    "typography": "{typography.button}"
    "rounded": "{rounded.s}"
    "padding": "0.5rem 1.5rem"
  "button-text":
    "backgroundColor": "transparent"
    "textColor": "{colors.harbour}"
    "typography": "{typography.button}"
    "rounded": "0"
    "padding": "0.25rem 0"
  "filter-chip":
    "backgroundColor": "{colors.paper}"
    "textColor": "{colors.ink}"
    "rounded": "{rounded.pill}"
    "padding": "0 1rem"
  "filter-chip-selected":
    "backgroundColor": "{colors.harbour}"
    "textColor": "{colors.paper}"
  "card":
    "backgroundColor": "{colors.paper}"
    "textColor": "{colors.ink}"
    "rounded": "{rounded.m}"
    "padding": "1rem"
  "search-field":
    "backgroundColor": "{colors.background}"
    "textColor": "{colors.ink}"
    "rounded": "{rounded.s}"
    "padding": "0.85rem 1rem"
  "compact-header":
    "backgroundColor": "{colors.paper}"
    "textColor": "{colors.ink}"
    "padding": "clamp(1.5rem, 3vw, 2.75rem) 0"
    "typography": "{typography.compact-title}"
---

# Design System: Peninsula Insider

## Overview

**Creative North Star: "A coastal editorial guide with integrated planning tools"**

Preserve Peninsula Insider’s Harbour identity: recognisable place photography, a clear masthead, restrained rules and useful local judgment. Editorial openings create interest; visible directory controls and practical comparison rows make the next choice easy.

This documents the implemented public defaults on 24 September 2026, including the approved category refinement. It is a source scan, not a new identity or a claim of complete accessibility certification. Existing Journal typography is deliberately distinct from the global UI.

**Key Characteristics:**
- Harbour blue structure, white paper and a restrained warm accent.
- Editorial hierarchy with compact practical controls.
- Place-specific imagery with honest provenance and check dates.
- Responsive comparison rows, visible focus and progressive disclosure.

Source order: `next/src/styles/v6-tokens.css` → `global.css` and `primitives.css` → `refinement.css` → component styles. The public shell and Journal add `editorial-shell.css`, `journal-fonts.css` and `journal-editorial.css`. Source declarations win if this descriptive snapshot drifts; update this file and its sidecar together. `PRODUCT.md` is unchanged.

## Colors

### Primary

Harbour blue carries links, selected filters and primary actions; Harbour hover deepens interactive state. Harbour deep grounds the masthead ribbon and inverse feature bands. Legacy `--evergreen` names resolve to Harbour, not green.

### Secondary

Sand is the warm accent on dark surfaces. Sand text is the darker cut used for links such as category comparisons; `--teal-text` currently resolves to this brown, despite its legacy name. Tide text is the blue support cut. Decorative bronze, tide and signal tokens remain in the source; they are not replacements for body text colors.

### Neutral

Background is white; paper is the slightly warm card ground; paper warm distinguishes alternating sections. Ink carries primary content, muted carries supporting copy, rule defines editorial divisions and control rule delineates controls. Use error for field feedback on light surfaces; the source provides a separate inverse error token.

Journal retains its scoped ink, muted, blue, sand and rule palette in `journal-editorial.css`; do not leak those page-local variables into shared components. The frontmatter describes the shared public palette. Sidecar tonal ramps are generated OKLCH previews for the design panel, not additional production palette tokens.

## Typography

Sora is the self-hosted global display and wordmark face. Figtree is the self-hosted body and UI face. Body uses the `body` role; secondary copy uses `--fs-300`, metadata `--fs-200`. Standard prose is capped at `--measure-prose` (68ch); standfirst and card measures are separately constrained.

Compact category headings intentionally use the existing Georgia serif fallback, via `var(--font-editorial, Georgia, serif)`. There is no global `--font-editorial` declaration. Do not silently add a new font download. The compact title measure is 24ch; its standfirst is 1rem/1.6, capped at 70ch.

Journal uses self-hosted Source Serif 4 for editorial headings and Inter for its body and shell UI. That scoped pairing is preserved. Category comparison headings and shared cards retain their own Sora hierarchy; the compact header does not replace every heading on the page.

Button labels use sentence case and normal tracking. Existing navigation uses its own compact uppercase treatment. Avoid importing navigation tracking into paragraphs or button labels.

## Layout

The shared frame is capped at 1280px with 40px side gutters. At 1100px and below the gutters become 24px; at 767px and below they become 16px. Prose stays narrower than the frame. The spacing scale is a 4px base with larger editorial intervals; use tighter spacing within a decision and more separation between sections.

Category controls follow the compact heading. `CategoryBrowse` supplies immediate directory and map links; the page supplies exactly one `FilterBar`. Selected facets are URL-backed. Editorial browsing yields to the filtered directory, so the count refers to the full result set rather than repeated feature cards.

`TheSix` initially renders one photographic lead and two compact alternatives. Three more choices remain in a native disclosure. At 64em the first group becomes a 1.2fr/1fr composition with the lead spanning two rows. Stay and Wine comparison rows collapse at 48em. FilterBar puts sort controls on a separate row at 560px and below. These are component thresholds, not one universal breakpoint scheme.

## Elevation & Depth

Cards use a single hairline and no resting shadow. Paper changes and rules carry most structural depth. Source elevation tokens remain available for raised utility surfaces and dialogs; the sidecar records their exact values. Do not add floating-card shadows to category comparison rows.

Focus is a functional outline, not decorative elevation: shared controls use the Harbour ring, and inverse controls use the Sand ring. Search has one wrapper focus indicator rather than two nested outlines. Most feedback uses short color and border transitions; token durations collapse under reduced motion, and the refinement disables reveal delays and perpetual image movement.

## Shapes

Shared buttons and fields use the small radius; image cards use the medium radius; panels and sheets use the large radius. Pills belong to filters and small controls. Native disclosure and comparison rows use rules rather than rounded containers. Journal’s square editorial images and compact archive rows are deliberate scoped exceptions.

## Components

### Buttons

Use solid for the main action, ghost for a secondary action and an underlined text action for inline navigation. Default boxed buttons have a 44px minimum height, token padding and a 2px focus outline with a 2px offset. Disabled buttons retain the existing reduced opacity and unavailable cursor. Text actions have a smaller source minimum; do not represent every existing link as a 44px control.

### Filters and search

Filter chips are 48px high, pill-shaped, outlined at rest and Harbour-filled when selected. Keep `aria-pressed`, the single polite results region, clear action and labelled filter sheet. Preserve horizontal scrolling and the end-of-row cue on narrow screens.

Search fields have a white ground and a rounded outlined wrapper. On focus, the wrapper changes its border and adds the existing translucent focus indicator. Use a visible label; placeholders are supporting copy. The mobile refinement keeps text-entry font sizes at least 1rem.

### Cards and comparison rows

Shared cards support venue, compact-row, guide and article variants. Use a short complete verdict, meaningful metadata, separate save/trip actions and a clear destination. Cards respect image replacements from the CMS. Show illustrative or unverified image captions only when they describe the image actually rendered; do not inherit provenance from a replaced file.

Stay compares atmosphere, evenings and transport. Wine compares tasting, lunch and appointments. Explore uses complete activity summaries and recorded time/effort fields. The visual comparison does not create new factual claims or imply that unknown facilities were checked.

### Navigation and progressive choices

Retain the Sora wordmark and the existing shell. Current navigation is marked semantically and visually; mobile navigation remains available before enhancement. Keep keyboard focus visible and preserve menu dismissal behavior.

The compact header owns the page H1. `TheSix` uses a native summary for the remaining choices; all directory links remain server-rendered. `PlanningHelp` explains Save versus Add to trip without requiring a modal or an account. “Check availability” opens a property or booking destination; saving never implies a reservation.

## Do's and Don'ts

### Do:
- **Do** use the existing semantic CSS variables and shared components.
- **Do** put a browse-all route and one labelled filter surface early on category pages.
- **Do** use a full lead choice with compact alternatives, and disclose additional editorial choices with native details.
- **Do** preserve visible focus, selected-state semantics, result announcements and reduced-motion behavior.
- **Do** distinguish a recorded factual check, publication date, illustrative image and unknown information.

### Don't:
- **Don’t** apply the dormant Magenta Stone admin palette or the superseded v5 token file as the public default.
- **Don’t** make a photographic hero compulsory when the category decision is better served by a compact text opening.
- **Don’t** duplicate FilterBar IDs or make a decorative selection determine the directory’s count.
- **Don’t** turn an absent field into confirmed suitability, current availability or a new verification date.
- **Don’t** gate reading behind animation or remove guest planning to simplify a layout.
