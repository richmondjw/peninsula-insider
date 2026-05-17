# Peninsula Insider — Production Design System
**Version:** 1.0 (May 2026)  
**Owner:** Remy (build) · Emma Richmond (editorial sign-off)  
**Scope:** Production site only — `src/pages/*` and `src/components/*` (root)

> **Rule 1:** When building a new page, use this document. If something you need isn't here, extend it here — don't create a parallel vocabulary.
> 
> **Rule 2:** New component variants go in the root `src/components/` directory. Do not create new versioned subdirectories (`v2/`, `v3/`, `v4/`). Experimental work lives in a feature branch.

---

## 1. Design Tokens

Defined in `src/styles/global.css` → `:root {}`. Use these everywhere. Do not hardcode colour hex values.

### Colours
```css
--bg:        #FFFFFF       /* page background */
--bg-alt:    #F6F2EA       /* warm off-white section alternation */
--bg-dark:   #1E1B18       /* dark editorial sections */
--text:      #2B2520       /* body copy */
--soft:      #7A726A       /* metadata, labels, secondary text */
--accent:    #8B4E3B       /* rust/terracotta — CTAs, links, accent marks */
--acc-h:     #6D3A2B       /* accent hover state */
--gold:      #B69A6B       /* editorial gold — rules, accents */
--dark:      #1E1B18       /* headings, dark backgrounds */
--white:     #FDFCFA       /* warm white */
--border:    #E5E0D6       /* hairlines, dividers */
--sage:      #7A8B6D       /* secondary editorial accent */
```

### Spacing / Layout
```css
--max-w:     1100px        /* site max-width (container) */
--prose-w:   680px         /* article/prose column max-width */
--ease:      cubic-bezier(0.25, 0.46, 0.45, 0.94)  /* shared easing */
--tile-image-radius: 10px  /* card image border-radius */
```

### Typography Fonts
- **Headings:** `'Cormorant Garamond', Georgia, serif` — editorial, high contrast
- **Body / UI:** `'Outfit', system-ui, sans-serif` — clean, readable

---

## 2. Typography

### Heading Scale
All headings use `font-family: 'Cormorant Garamond'`, `color: var(--dark)`, `line-height: 1.06`.

Use semantic heading levels. Do not skip levels. Do not use headings for styling purposes.

Italic emphasis (`<em>`) within headings renders in `var(--accent)` automatically.

### Body Copy
- Font: `'Outfit'`, weight 300, size `0.95rem`, line-height `1.75`
- Prose columns use `max-width: var(--prose-w)` for readability

### Label Class
```html
<span class="label">Section name</span>
<span class="label label--accent">Featured</span>
```
Renders as small-caps uppercase, `0.65rem`, `letter-spacing: 0.16em`. The `--accent` modifier colours it rust.

---

## 3. Layout System

### Container
```html
<div class="container">…</div>
```
Max-width `1100px`, centred, `padding: 0 clamp(1.25rem, 4vw, 3rem)`.
Use this on every full-width section. Do not invent alternative max-widths.

### Section Alternation
Alternate section backgrounds using `--bg` (white) and `--bg-alt` (warm off-white) to create visual rhythm without borders.

### Horizontal Rule
```html
<hr class="rule" />
```
1px solid `var(--border)`. No border-radius, no margin padding built in — add spacing via surrounding elements.

---

## 4. Navigation System (Canonical)

### Masthead — CANONICAL: V4Masthead
**File:** `src/components/v4/V4Masthead.astro`  
**Status:** Active canonical since 2026-05-06  
**Mounted by:** `layouts/BaseLayout.astro` (automatic — do not import separately)

Three-row structure:
1. **Utility row** — conditions strip (port, temp, sunset, water) · edition marker · login
2. **Brand row** — wordmark + italic tagline
3. **Nav row** — 7-pillar mega-menu (V4MegaPanel) + utility actions (Ask PI, save, search)

Props passed to BaseLayout:
```astro
<BaseLayout section="eat|stay|wine|explore|journal|places|escape|whats-on" title="..." description="..." />
```
The `section` prop drives `aria-current` highlighting in the masthead.

### Archived Masthead Variants (do not use)
| Component | Status |
|---|---|
| `src/components/Masthead.astro` | Legacy — unmounted, keep as historical reference |
| `src/components/v2/Masthead.astro` | Staging only (v2-staging layout) |
| `src/components/v3/V3Masthead.astro` | Prototype — archived |

### Mobile Navigation
**File:** `src/components/v4/V4MobileDrawer.astro`  
Mounted automatically by BaseLayout. Accordion pillar structure. Do not create alternatives.

### Footer
**File:** `src/components/Footer.astro`  
Mounted automatically by BaseLayout. Do not import separately.

### Breadcrumbs
**File:** `src/components/Breadcrumbs.astro`  
Import and use at the top of content pages (below masthead, above hero). Sticky offset from masthead is computed via `--masthead-h` CSS var (set by BaseLayout script).

---

## 5. Component Inventory

### Canonical Production Components (`src/components/`)

#### Page Structure
| Component | Purpose |
|---|---|
| `Breadcrumbs.astro` | Canonical breadcrumb trail for content pages |
| `SectionHero.astro` | Section landing page hero (eyebrow + title + dek + image) |
| `SubpageHero.astro` | Sub-category hero (lighter variant) |
| `GuideHero.astro` | Guide-format hub hero |
| `CoverHero.astro` | Full-bleed cover with editorial overlay |
| `SectionDivider.astro` | Visual break between major sections within a page |
| `PillarNav.astro` | Horizontal pillar quick-nav for hub pages |
| `NewsletterBlock.astro` | Newsletter CTA block (use on every content page above footer) |

#### Cards
| Component | Purpose | Use for |
|---|---|---|
| `VenueCard.astro` | Standard venue card (eat/stay/wine) | Restaurants, wineries, accommodation |
| `VenueCard.astro` (variant `--editorial`) | Article in venue-card shape | Articles surfaced in venue/place context |
| `PlaceCard.astro` | Place preview card (towns/villages) | Place hub, related places |
| `ArticleCard.astro` | Journal article card | Journal index, editorial surfaces |
| `ExperienceCard.astro` | Experience card (walks, beaches, etc.) | Explore hub, place pages |
| `ItineraryCard.astro` | Escape/itinerary card | Escape hub, place pages |
| `TourCard.astro` | Tour card | Tours hub |
| `TourOperatorCard.astro` | Operator card | Tour operators directory |
| `TourPackageCard.astro` | Package card | Tour packages directory |
| `EventCard.astro` | Event card (primary) | What's On hub |
| `EventStrip.astro` | Compact event strip (secondary surface) | Side-surface event listings |

#### Editorial Surface
| Component | Purpose |
|---|---|
| `EditorialSurface.astro` | Canonical article body renderer — use for all article content |
| `FeatureArticle.astro` | Feature-length article with pull-quotes and imagery |
| `EditorsLetter.astro` | Editor's letter format |
| `CompareBlock.astro` | Side-by-side comparison module |
| `WeekendPickerBlock.astro` | Weekend editorial picks surface |
| `AlertBlock.astro` | Editorial alert/notice block |
| `CorrectionNote.astro` | Published correction note |

#### Planning / Utility
| Component | Purpose |
|---|---|
| `PlaceDetailTemplate.astro` | **Canonical** place page template (V1+V2 merged) |
| `WineHubTemplate.astro` | Canonical wine hub template |
| `WineSubregionTemplate.astro` | Canonical wine subregion template |
| `PlaceMap.astro` | Lazy Leaflet map for place pages |
| `VenueDirectory.astro` | Filterable venue directory listing |
| `AudiencePicker.astro` | Audience/mood picker UI module |
| `ItineraryCard.astro` | Escape card (see Cards above) |
| `Shortlist.astro` | Numbered editorial shortlist |

#### User / Account
| Component | Purpose |
|---|---|
| `InsiderPlans.astro` | Insider Plans content rail (homepage) |
| `InsiderStripe.astro` | Compact insider CTA stripe |
| `InsiderAsk.astro` | Ask PI inline prompt |
| `PiForkPlanButton.astro` | Save/fork an escape plan |
| `PiSaveActions.astro` | Save/share action row |
| `PiArticleActions.astro` | Article-level actions (save, share, print) |
| `AskPICTA.astro` | Ask Peninsula Insider CTA block |
| `ConciergeDrawer.astro` | Concierge slide-in drawer (auto-mounted in BaseLayout) |
| `SearchOverlay.astro` | Pagefind search overlay (auto-mounted in BaseLayout) |

#### Wine Sub-components (`src/components/hub-guide/`)
| Component | Purpose |
|---|---|
| `CellarDoorList.astro` | Cellar door list module for wine hub pages |
| `SubregionGrid.astro` | Subregion navigation grid |
| `VarietyGuide.astro` | Variety description and pairing guide |
| `PracticalCallout.astro` | Practical info callout box |
| `DogPolicyTable.astro` | Dog-policy table for wine pages |

#### Admin (internal only)
| Component | Purpose |
|---|---|
| `admin/InlineEditor.astro` | Admin edit mode — auto-mounts in BaseLayout, inert for visitors |
| `EditableText.astro` | Editable text region (admin-only active) |
| `EditableImage.astro` | Editable image (admin-only active) |

---

### Archived Components — Do Not Use in New Work

| Component | Replacement |
|---|---|
| `src/components/Masthead.astro` (root) | V4Masthead (auto via BaseLayout) |
| `src/components/v2/Masthead.astro` | V4Masthead (auto via BaseLayout) |
| `src/components/v2/NewsletterBlock.astro` | `src/components/NewsletterBlock.astro` |
| `src/components/v2/UtilityBar.astro` | Part of V4Masthead |
| `src/components/v3/V3Masthead.astro` | V4Masthead (auto via BaseLayout) |
| `src/components/v3/V3Newsletter.astro` | `src/components/NewsletterBlock.astro` |
| `src/components/v3/V3EditorialCard.astro` | `ArticleCard.astro` |
| `src/components/PlaceDetailTemplateV2.astro` | `PlaceDetailTemplate.astro` (already merged) |
| `src/components/v2/V2VenueDetail.astro` | `VenueDetailTemplate.astro` |
| `src/components/v2/V2PlaceDetail.astro` | `PlaceDetailTemplate.astro` |
| `src/components/v2/V2ArticleDetail.astro` | `EditorialSurface.astro` |

> Note: v3/* and v4/* components that are _sub-components of the canonical masthead_ (V4MegaPanel, V4MegaColumn, V4MegaRail, V4MobileDrawer, V4PillarLink, V4PillarTopBanner) remain active — they are part of the canonical V4 masthead system.

---

## 6. Base Layout

**File:** `src/layouts/BaseLayout.astro`  
**Status:** Canonical for all production pages.

```astro
import BaseLayout from '../../layouts/BaseLayout.astro';

<BaseLayout
  title="Page Title — Peninsula Insider"
  description="One to two sentence page description."
  section="eat"          <!-- eat | stay | wine | explore | journal | places | escape | whats-on -->
  noindex={false}        <!-- set true for preview/staging pages -->
  canonical="/explicit/path/"  <!-- optional override -->
  ogImage="/images/sourced/hero.webp"  <!-- optional, defaults to home cover -->
  ogType="article"       <!-- optional, default "website" -->
  publishedTime="2026-05-16"  <!-- ISO date, articles only -->
  modifiedTime="2026-05-16"   <!-- ISO date, articles only -->
>
  <!-- page content -->
</BaseLayout>
```

BaseLayout automatically mounts: V4Masthead, V4MobileDrawer, Footer, ConciergeDrawer, SearchOverlay, AuthModal, ProfileDropdown, CookieBanner, SaveSiteController, CloudSync, InlineEditor.

**Do not import or render any of these manually inside a page.**

### Layout Variants (non-production — do not use for new pages)
| Layout | Location | Use |
|---|---|---|
| v2 BaseLayout | `src/layouts/v2/BaseLayout.astro` | v2-staging pages only |
| V3BaseLayout | `src/layouts/v3/V3BaseLayout.astro` | /v3/ staging only |
| V4BaseLayout | `src/layouts/v4/V4BaseLayout.astro` | /v4/ staging only |

---

## 7. Page Templates — Standard Patterns

### Section Hub Page
Anatomy: `SectionHero` → `PillarNav` (optional) → editorial shortlists → `VenueDirectory` or card grid → `NewsletterBlock`

### Article / Journal Page
Anatomy: `Breadcrumbs` → hero image → byline + metadata → `EditorialSurface` → `PiArticleActions` → related content rail → `NewsletterBlock`

### Place Detail Page
Use `PlaceDetailTemplate.astro` — canonical consolidated template.  
**Do not use PlaceDetailTemplateV2.astro** — it's been superseded and exists only in a noindexed preview page.

### Venue Detail Page
Use `VenueDetailTemplate.astro`.  
**Do not use `v2/V2VenueDetail.astro`** — staged variant, not production.

### Wine Hub / Subregion
Use `WineHubTemplate.astro` and `WineSubregionTemplate.astro`.  
Sub-components from `hub-guide/` are canonical for wine-specific modules.

---

## 8. CTA Hierarchy

Three levels — use the right level for the context.

### Primary CTA
Dark pill button. Used for the main conversion action on a section or card.
```html
<a href="/wine/cellar-doors/" class="venue-card__cta">Read notes</a>
```

### Secondary CTA
Outline or text link. Used for secondary actions or inline editorial links.
```html
<a href="/newsletter/" class="link--secondary">Join the list</a>
```

### Booking CTA
Booking-specific pill. Rendered alongside the primary CTA when a `bookingUrl` exists on a venue.
```html
<a href="https://..." class="venue-card__book" target="_blank">Book</a>
```

### Newsletter Block
Required on every content page (article, hub, venue, place, guide). Position: above the footer, after all content sections. Use `<NewsletterBlock />` from `src/components/NewsletterBlock.astro`.

---

## 9. Interaction Patterns

### Mega-menu
Handled by V4Masthead + V4MegaPanel. Hover/focus opens panel after 70ms; 220ms close delay on mouseleave. Keyboard: Escape closes. Do not build alternative navigation overlays.

### Mobile Drawer
Handled by V4MobileDrawer. Burger opens accordion drawer. Do not build alternative mobile nav.

### Concierge Drawer
Handled by ConciergeDrawer (auto-mounted in BaseLayout). Opens on `window.openConcierge()`. Wire any "Ask PI" CTA with `data-pi-trigger="true"` — the BaseLayout script handles the binding.

### Search Overlay
Handled by SearchOverlay (auto-mounted). Opens on `[data-open-search]` click or `/` keyboard shortcut.

### Smooth Scroll
Lenis smooth scroll is initialised in BaseLayout for desktop non-touch. Pages with scrollable overlays/drawers should dispatch `pi:lenis-stop` / `pi:lenis-start` events to pause/resume. Elements inside overlays can opt out with `data-lenis-prevent`.

### View Transitions
Astro ClientRouter is loaded in BaseLayout — page transitions are automatic. Scripts that need to re-initialise after navigation should listen for `document.addEventListener('astro:page-load', ...)`.

---

## 10. Editorial-Commercial Integration Rules

*Status: formal rules pending — document before any partner content goes live.*

**Current primitives (schema-level):**
- `featuredPartner: boolean` — flag on venues
- `affiliateNote: string` — disclosure text on venues
- `EditorialSurface` — article body renderer

**Declared principles (from editorial constitution):**
- Editorial leads; commercial supports — never the reverse
- Partner content must be disclosed, relevant, and additive
- Sponsored slots must never crowd, outweigh, or visually rival editorial picks
- When in doubt: editorial moves up, sponsored moves down

**Pending:** a visual design and implementation standard for partner disclosure badges, sponsored slot placement rules, and the partner dashboard integration path.

---

## 11. AI / Agent Integration Notes

The following schema fields are structured for AI retrieval — populate them on all content where relevant:

| Field | Collection | Purpose |
|---|---|---|
| `aiSummary` | articles | Array of summary sentences for concierge retrieval |
| `faq` | articles | Structured Q&A for concierge and search |
| `editorNote` | venues, experiences | Editorial voice annotation for AI surfacing |
| `signature` | venues, places | One-sentence editorial summary |
| `insiderNote` | places | One-line insider pick annotation |
| `bestFor` / `notFor` | places | Audience fit signals |
| `skip` | places | Anti-fit signal |

The `editorial_blocks` collection is the queryable corpus for hub-level editorial copy. New hub copy should be authored as an editorial_blocks entry, not hard-coded in the .astro page template.

---

## 12. Governance

### When to create a new component
Only when: (a) no existing component solves the pattern, and (b) the pattern will appear on at least 3 pages. Otherwise, extend an existing component via props.

### When to create a new page template
Only for genuinely new entity types. Check if the existing `PlaceDetailTemplate`, `VenueDetailTemplate`, or `EditorialSurface` + `BaseLayout` can serve the need first.

### When to create a new collection
Only when the entity type doesn't fit an existing collection and will have more than 10 entries within 3 months. Check `content.config.ts` first — look for an existing type enum that could be extended.

### Before adding any page to the production tree
- Confirm it uses `BaseLayout` from `src/layouts/BaseLayout.astro`
- Confirm `section` prop is correct
- If it's a preview/staging page: set `noindex={true}`
- If it's an admin/internal page: confirm it has auth protection

---

*This document is the authoritative reference for the Peninsula Insider production design system. Update it here when canonical decisions change — not in individual component comments.*
