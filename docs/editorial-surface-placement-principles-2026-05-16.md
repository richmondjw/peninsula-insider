# Peninsula Insider — Editorial Surface Placement Principles
**Version:** 1.0  
**Date:** 16 May 2026  
**Author:** Remy (Architect), informed by Emma Richmond  
**Status:** Locked — governs all editorial surface implementation

---

## The Governing Principle

> The surfaces should shape behaviour, not interrupt it.

Editorial surfaces are orientation tools. They help readers understand what matters this season, where to begin, and how to think about the Peninsula. They are not promotional overlays, not ad units, not hero replacements. A reader who encounters an editorial surface should feel guided — not sold to.

---

## Two-Phase Architecture

The surface system is built in two clearly separated phases:

**Phase 1 — Editorial Infrastructure**  
Build the UX pattern, visual language, placement logic, and editorial hierarchy. Use PI's own curatorial voice throughout. No partner language. The surfaces prove themselves editorially before any commercial evolution is introduced.

**Phase 2 — Commercial Evolution**  
The same structures, unchanged in design and placement, evolve to carry partner context where appropriate. The underlying system is not redesigned — a partner label is introduced in a defined position within an already-established editorial frame.

The reason this sequencing matters: the first implementation of these surfaces will define the reader's expectation of what they are. If that expectation is editorial, the commercial layer that follows will feel like contextual alignment. If the expectation is commercial from the start, it cannot be recovered.

---

## Phase 1 Labelling System

All editorial surfaces in Phase 1 use PI's curatorial voice:

| Surface | Phase 1 label |
|---|---|
| Eat hub | Featured Long Lunch |
| Wine hub | Featured Cellar Door |
| Explore hub | Rainy Day Rescue / Rainy Day Pick |
| Plans hub | This Weekend's Plan / Slow Weekend |
| What's On | Peninsula This Weekend |
| Homepage seasonal | Selected by Peninsula Insider |

Labels are short, noun-led, editorial in register. They attribute curation to Peninsula Insider, not to a third party. No sponsor language, no "presented by," no partner names until Phase 2.

---

## Phase 2 Evolution (future)

When a commercial partner is introduced into an established surface, the label pattern is:

| Phase 1 | Phase 2 example |
|---|---|
| Featured Long Lunch | Featured Long Lunch · in partnership with [Venue] |
| Featured Cellar Door | Featured Cellar Door · presented with [Winery] |
| Peninsula This Weekend | Peninsula This Weekend · this autumn with [Partner] |

The structural slot is identical. The editorial content is identical in format and voice. The partner context appears in a defined, restrained position — not as the lead, not as the headline, not as a visual override.

---

## Placement Logic

### Position in page hierarchy

```
Page structure:
  ├── Hero / GuideHero
  ├── Editorial surface (one per hub — positioned here)
  └── Venue/content grid, filters, directory
```

The surface sits **after the hero, before the grid**. It is not the hero — the hero remains the PI editorial intro and seasonal framing. It is not inside the grid — it is not one card among many. It occupies the transitional zone between editorial orientation and browsing, which is exactly where curation is most useful.

### One per hub. Maximum.

Each hub page carries at most one active editorial surface at any time. Scarcity is structural, not incidental. Two surfaces on a single page halves the authority of both. If a seasonal surface needs to be retired or rotated, the slot is updated — a second slot is not added.

### Hierarchy behaviour within the surface

```
Surface structure:
  ├── Eyebrow label (e.g. "Featured Long Lunch")
  ├── Venue/experience name (prominent, not hero-scale)
  ├── Editorial verdict (1–3 sentences, PI voice)
  ├── Secondary context (season, occasion, why now)
  └── Single action link (low-key — "Read more" or destination link)
```

The venue name is prominent but not dominant — it reads at heading weight, not cover-headline weight. The editorial verdict is the primary content. The action link is available but not aggressive.

---

## Visual Weight Rules

These rules prevent editorial surfaces from feeling like advertising:

1. **No full-bleed takeover.** The surface has clear boundaries — it does not replace the hero or span the full viewport. It reads as an editorial card or feature block within the page, not as an interruption above it.

2. **No distinct visual language.** The surface uses the same typographic system as the rest of the page — Cormorant Garamond for headings, Outfit for body, the editorial colour palette. No special backgrounds, borders, or containers that visually signal "this is different from the editorial." It is not different. It is editorial.

3. **No icons, badges, or promotional markers.** Stars, featured badges, "best of" icons, and similar markers belong to ad inventory, not editorial surfaces. The only permitted label is the eyebrow text.

4. **Image presence is optional.** Where an image is used, it follows the same image treatment as editorial content elsewhere on the page. No stock photography. No lifestyle images sourced for the purpose. Only PI-standard editorial imagery.

5. **Disclosed, quietly.** In Phase 2, when a partner is present, the disclosure is in the eyebrow line alongside the surface label. Minimum required disclosure, maximum editorial restraint. Never a logo. Never a "sponsored" badge.

---

## Pacing Rules Across the Platform

To maintain the scarcity and premium feel of the surface system:

- **One surface per hub page** — Eat, Wine, Explore, Plans, What's On each have one slot
- **Homepage** — one seasonal surface maximum, below the hero fold, above the places rail
- **Journal** — no permanent editorial surface slot; surfaces may appear as commissioned editorial features (long-reads, seasonal pieces) but not as a recurring structural module
- **Sub-pages** (e.g. `/eat/long-lunch/`, `/wine/cellar-door-lunch/`) — no surface slots; surfaces live on hub pages only
- **Mobile** — the surface renders as a full-width card, same content, slightly reduced vertical padding; no separate mobile-only content
- **Rotation** — surfaces update on the seasonal editorial calendar (approximately quarterly), not on individual article publish cycles

---

## The Reader Expectation Being Built

By implementing Phase 1 consistently before introducing any commercial context, the reader's mental model of these surfaces becomes:

> "When Peninsula Insider features something here, it's because they've decided this is worth my attention this season."

That mental model is the commercial asset. It is more valuable than any individual placement. It is built over months of editorial consistency, not weeks of commercial activation. Protecting it means moving slowly and deliberately in Phase 2, and never using the slot for anything that wouldn't be published editorially on its own merits.

---

## Checklist Before Building Any Surface

Before implementing any editorial surface on a hub page, confirm:

- [ ] The surface has a canonical editorial definition (in editorial-surfaces-system-2026-05-16.md)
- [ ] The Phase 1 label is defined (PI curatorial voice, no partner language)
- [ ] The placement position is confirmed (post-hero, pre-grid)
- [ ] The visual weight is consistent with surrounding editorial content
- [ ] The surface is the only surface on that page
- [ ] The initial content for the surface is genuine editorial (a PI pick, not a placeholder)
- [ ] The Phase 2 evolution path is documented but not implemented

---

*Filed: 16 May 2026 | Remy — Architect, Peninsula Insider*  
*Governs implementation of: Featured Long Lunch, Featured Cellar Door, Rainy Day Rescue, Peninsula This Weekend (elevated), Slow Weekend/Family Escape (Plans), Homepage seasonal surface*
