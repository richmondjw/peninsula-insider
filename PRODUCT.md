# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The eight public anchor pages follow [the anchor-page design rules](docs/ANCHOR-PAGE-DESIGN-RULES.md). Shared fonts, responsive heading scales, colours and controls are enforced across Home, Eat & Drink, Stay, Wine, Explore, Plans, What's On and Journal.

## Users

Two related audiences. (1) Visitors and locals on the Mornington Peninsula using peninsulainsider.com.au to decide where to eat, drink, stay, and go, by season and mood, not a generic top-10 list. (2) Existing email subscribers who receive "The Insider Note" (renamed from "Field Notes" 2026-08-03), the weekly newsletter distilling that week's picks, currently issue No. VI.

## Product Purpose

Peninsula Insider is a complete, independent guide to the Mornington Peninsula, and a weekly email that surfaces the best of it. The site and the email exist so someone can trust a recommendation without wondering who paid for it or whether the writer actually went.

## Positioning

"We live here." Most Peninsula guides are written by people who visited once and repeat the same ten wineries and three beaches. Peninsula Insider's picks are based on real visits, re-verified on a rolling basis, with no pay-for-coverage and a public corrections process. Errors get fixed fast (see the Avani/Elgee Park mixup caught and corrected in the No. VI production cycle).

## Operating Context

- Site: Astro v6 static build ("v6 Harbour" chrome, adopted 2026-07-25), file-based content collections (JSON/MD/MDX), Supabase for auth/saves/CMS overrides. No image-based logo mark anywhere on the live site; the brand identity is a text wordmark only (see Brand Commitments).
- Email: "The Insider Note," weekly, produced against a standing brief (`ops/email/INSIDER-NOTE-PROCESS.md`) with a fixed 11-module order, a hard no-em-dash/no-price copy rule, and a Mon-Wed production rhythm ending in James's Wednesday review and explicit send approval. (Corrected 2026-08-27: this file previously said Mon-Thu / Thursday. `INSIDER-NOTE-PROCESS.md` is the source of truth and specifies Wednesday.)
- Email delivery: beehiiv, non-Enterprise plan. The programmatic Create Post API is plan-gated (confirmed via live 403); email HTML must go in through beehiiv's manual "HTML Snippet" block, and beehiiv strips `<style>`/`<link>` tags on import, so every visual rule must survive as an inline style with no reliance on embedded CSS or web fonts.

## Capabilities and Constraints

- Site wordmark (ground truth for "the logo"): "Peninsula" in `--text` (#14202A, blue-black) + "Insider" in `--accent`/`--harbour` (#10527E), both `--font-display` (Sora, weight 700), no icon or symbol. Source: `next/src/components/v5/chrome/V5Masthead.astro` + `next/src/styles/v6-tokens.css`.
- Palette/type: Sora (display) + Figtree (body), navy #0B2E4A / cream #F2EFEA ground, harbour blue #10527E accent, sand #F5C177 secondary accent. Established in the newsletter rebuild (`ops/email/weekly-picks-2026-08-03.html`).
- Email client constraint: table-based layout, inline styles only, MSO/Outlook fallback fonts, dark-mode and mobile media queries are a bonus (survive in normal email clients, lost on beehiiv HTML-snippet import).

## Brand Commitments

- Name: Peninsula Insider (site), "The Insider Note" (the newsletter itself, masthead name locked per the standing brief, renamed from "Field Notes" 2026-08-03).
- Voice: direct, locally verified, corrects itself in public, never a press-release voice.
- Locked by James's standing brief and not to change without his sign-off: the masthead name, module order, palette, sign-off line, and reply prompt.
- No em-dashes anywhere on any PI surface. Event listings may display prices only with current verified source evidence and a bounded expiry; all other surfaces retain the no-price rule.

## Evidence on Hand

- Live site chrome and design tokens (`next/src/components/v5/`, `next/src/styles/v6-tokens.css`).
- The full Insider Note standing brief and No. VI revision brief (`ops/email/INSIDER-NOTE-PROCESS.md`, `ops/email/field-notes-no-vi-revision-brief-2026-08-01.md` (kept under its original filename as historical record)).
- The current No. VI build (`ops/email/weekly-picks-2026-08-03.html`).
- Venue records (`next/src/content/venues/*.json`) used as the factual source for this issue's picks.

## Product Principles

- Verified over convenient: every factual claim traces to a source (venue record or fact sheet), never invented.
- Correct fast, in public, rather than quietly.
- Independent: no pay-for-coverage, ever.
- Design is the final gate on factual/image claims for the email; it comes back rather than shipping unsourced.

Every published Journal article has an associated image. Image-bearing Journal cards and article heroes always render an available, credited image, with licensed context photography and original illustration as fallbacks. The source and built-image gates enforce this rule. See [Journal image policy](docs/JOURNAL-IMAGE-POLICY.md).

## Editorial Illustration Rules

Coastal Punch is the approved default for conceptual editorial illustrations, including generative heroes and fallback artwork. Read [the canonical illustration rules](docs/COASTAL-PUNCH-ILLUSTRATIONS.md) before design work. They define the fresh coastal palette, simplified exaggerated forms, separate generations per placement, 100-point rubric, truthful captions/rights and desktop/mobile acceptance checks.

This approved illustration palette is scoped to artwork and necessary overlay styling. Preserve the existing site structure, typography, controls and factual venue photography. Older muted illustration guidance does not override this approval. Responsive source resolution must account for the entire cover crop and device pixel ratio, including tall planning heroes.

## Reader and Agent Boundary


Reader pages must contain reader-facing editorial content only. Agent retrieval instructions and machine directory links belong in `/agents/`, JSON, Markdown, `llms.txt`, or HTML head metadata. Do not add them to page bodies, shared navigation, footers, hidden elements, or accessibility labels. `next/scripts/assert-reader-boundary.mjs` scans every built reader HTML page and blocks the build and publish when this boundary is crossed.

## Accessibility & Inclusion

No project-specific accessibility requirement established beyond standard web/email practice (alt text on every image, sufficient contrast in both light and dark mode).
