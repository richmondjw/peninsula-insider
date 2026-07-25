---
title: "Salt & Limestone — Visual Identity Correction Project Plan"
type: project-plan
status: active
version: 1.0
established: 2026-07-25
last-reviewed: 2026-07-25
owner: James Richmond
extends:
  - docs/visual-design-brand-review-2026-07-25.md
  - docs/peninsula-insider-brand-operating-system.md
tags: [peninsula-insider, design, brand, project-plan, tracking]
---

# Salt & Limestone — Project Plan

**A correction to v6's skin, not a v7.**

v6 "Evergreen Coast" shipped 2026-07-13. Its bones are sound: the nine-step clamped type scale, the 4px spacing scale, the radius and elevation tokens, and the accessibility work all stay. What changes is the palette layer, the display typeface, and the missing motif layer. Framing this as a correction rather than a new generation keeps the cost proportionate and the story honest.

Source of findings: [`docs/visual-design-brand-review-2026-07-25.md`](./visual-design-brand-review-2026-07-25.md). Item IDs below cross-reference that document's roadmap numbers as `Review #n`.

---

## Status at a glance

| Phase | Name | Gate | Status | Target |
|---|---|---|---|---|
| **P0** | Zero-regret fixes | none | 🟡 In progress | Week 1 |
| **P1** | Direction proof | **G1, G2** | 🟡 In progress | Week 1–2 |
| **P2** | Photography | G2 | ⬜ Not started | Week 2–10 (calendar-driven) |
| **P3** | Architecture | G2 | 🟡 In progress | Week 3–5 |
| **P4** | Skin | G2 + P3 | ⬜ Not started | Week 5–8 |
| **P5** | Brand evolution | P4 | ⬜ Not started | Month 3–12 |

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⏸️ Blocked · ❌ Dropped

**Update cadence:** review this file at the weekly heartbeat. Update the `last-reviewed` frontmatter date and the status column. Do not create a second tracking surface.

---

## Decision gates

Work does not cross a gate until the decision is recorded here with a date.

| Gate | Decision | Owner | Blocks | Status |
|---|---|---|---|---|
| **G1** | **Serif or no serif for display.** Move off Sora to an editorial serif (Fraunces proposed), or keep the geometric sans. | James | P4 entirely; P1 proof is built to answer this | ⬜ Open |
| **G2** | **Adopt Salt & Limestone as the v6.1 correction**, or keep Evergreen Coast and act on craft items only. | James | P2, P3 scope, P4 entirely | ⬜ Open |
| **G3** | **Commission the photography shoot** (budget + photographer). | James | P2-5, P2-6 | ⬜ Open |
| **G4** | **Licence a display face** or stay on the open variable (Fraunces). | James | P5-1 | ⬜ Open |

> **G1 and G2 are the only decisions that block the critical path.** Both are answered by the P1 proof. Everything in P0 proceeds regardless.

---

## Phase 0 — Zero-regret fixes

**Why now:** every item here is correct under Evergreen Coast, under Salt & Limestone, and under any future direction. There is no outcome where these are regretted. Ship them before any gate.

**Definition of done:** all items merged to `main` and live; homepage first impression no longer obstructed by the cookie banner; conditions strip visible on every page.

| ID | Item | Review # | Effort | Depends on | Status |
|---|---|---|---|---|---|
| P0-1 | **Reinstate the conditions strip** (`SORRENTO 16° · SUNSET 5:48 · BAY GLASSY, TIDE LOW`). Wire orphaned `components/UtilityBar.astro` into `V5Masthead`. | #1 | 0.5d | — | ⬜ |
| P0-2 | **Reinstate the issue stamp** (`WINTER INSIDER · JULY 2026`) from `components/Masthead.astro`. | #1 | 0.5d | P0-1 | ⬜ |
| P0-3 | **Fix palette leaks.** Newsletter band `#221810` → `--bg-dark`; warm apricot date chip → palette-native. | #3 | 0.5d | — | ⬜ |
| P0-4 | **Raise `--border` to ≥3:1** against white (currently `#D6DDDB`, 1.38:1) and drop card shadows. | #4 | 0.5d | — | ⬜ |
| P0-5 | **Clamp card deks to 2 lines**; normalise card metadata to a fixed field set so card bottoms align. | #5 | 1d | — | ⬜ |
| P0-6 | **Fix duplicate `FILED UNDER` tags** (venue pages render "Solo" twice); add a dedupe guard. | #6 | 0.25d | — | ⬜ |
| P0-7 | **Shrink the cookie banner to a corner toast.** Currently consumes ~15% of every first impression. | #7 | 0.5d | — | ⬜ |
| P0-8 | **Remove redundant eyebrows** where the section already declares the type (three "EVENT" stamps in one module). | #8 | 0.25d | — | ⬜ |
| P0-9 | **Backfill missing card images** or fall back to a typographic card. No empty slots in flagship modules. | #12 (partial) | 0.5d | — | ⬜ |

**Phase effort:** ~4.5 days.

---

## Phase 1 — Direction proof

**Why this shape:** v6 was adopted as a wholesale lift before anyone saw it carrying Peninsula Insider's own content. This phase exists so that mistake is not repeated. Decide from an artefact, not from a document.

**Definition of done:** G1 and G2 both recorded with a date and a rationale.

| ID | Item | Review # | Effort | Depends on | Status |
|---|---|---|---|---|---|
| P1-1 | **Build `docs/design-explorations/salt-limestone-home-2026-07-25.html`** — self-contained, real copy, Fraunces + Figtree self-hosted, conditions strip + tide rule + issue stamp in place, 3–4 library images regraded to the proposed treatment. | #16, #17 | 1d | — | ⬜ |
| P1-2 | **Build a second variant holding Sora** but taking the palette and motifs, so G1 is isolated from G2. | #10 | 0.5d | P1-1 | ⬜ |
| P1-3 | **Side-by-side review** against the current homepage at 1440 and 390. | — | 0.25d | P1-1, P1-2 | ⬜ |
| P1-4 | **Record G1 and G2** in the gate table above with date and rationale. | — | — | P1-3 | ⬜ |

**Phase effort:** ~2 days.

> If G2 lands as "keep Evergreen Coast", the project reduces to P0 + P2 + P3 and closes. That is a legitimate outcome and the plan should survive it without rework.

---

## Phase 2 — Photography

**Why in parallel:** photography is the ceiling on premium perception *and* the only workstream with a calendar dependency. Low raking winter light is available now and will not be in three months. The audit and grade work is useful under either G2 outcome.

**Definition of done:** every image on a flagship surface is on-grade, on-subject, and non-stock; the grade and subject rules are documented and enforced in editorial ops.

| ID | Item | Review # | Effort | Depends on | Status |
|---|---|---|---|---|---|
| P2-1 | **Audit the full image library.** Tag every asset: keep / regrade / cull. Flag all stock. | #12 | 2d | — | ⬜ |
| P2-2 | **Cull every stock image** from flagship surfaces. A missing image costs less than a wrong one. | #12 | 1d | P2-1 | ⬜ |
| P2-3 | **Define the grade** as a reusable preset: warm highlights, cool-green shadows, lifted blacks, desaturated greens, sand protected. | #12 | 1d | — | ⬜ |
| P2-4 | **Regrade the keepers** and re-export to the crop ratios (4:5 cards, 3:2 features, 21:9 breaks). | #12 | 3d | P2-1, P2-3 | ⬜ |
| P2-5 | **Write the shoot brief.** Golden hour and overcast only; people at human scale; shoot the specific thing the copy names. | #19 | 0.5d | P2-3 | ⬜ |
| P2-6 | **Winter shoot** — 150–200 frames, one photographer, one grade. | #19 | ~5d elapsed | **G3**, P2-5 | ⬜ |
| P2-7 | **Codify subject and crop rules** into the editorial ops checklist so new content cannot regress. | #12 | 0.5d | P2-5 | ⬜ |
| P2-8 | **Replace the weak flagship images** — Featured Plan hero (car park, powerlines, bin), Flinders feature hero, Stay door tile (currently a dining room), Wine tile (grape close-up). | #12 | 1d | P2-4 | ⬜ |

**Phase effort:** ~9 days of work, ~10 weeks elapsed (shoot scheduling).

---

## Phase 3 — Architecture

**Why before the skin:** if a new palette is applied on top of four token generations and 42 button families, it will drift exactly the way v6 drifted. This phase is the reason the correction sticks.

**Definition of done:** one `.btn` primitive with three variants; one `.card` primitive; v3 and v4 stylesheets deleted; total CSS under 10,000 lines.

| ID | Item | Review # | Effort | Depends on | Status |
|---|---|---|---|---|---|
| P3-1 | **Build the `.btn` primitive** — three variants (solid, ghost, text-link-with-rule), one size scale, sentence case. | #11 | 2d | — | ⬜ |
| P3-2 | **Migrate all 42 button/CTA class families** onto the primitive. Includes `v3-btn*`, `v4-iconbtn`, `.venue-detail__book-btn`, `.venues__more-btn`, `.article__share-btn`. | #11 | 3d | P3-1 | ⬜ |
| P3-3 | **Fix the phone-number button affordance** on venue pages (currently reads as disabled). | #11 | 0.25d | P3-1 | ⬜ |
| P3-4 | **Build the `.card` primitive** and migrate the card variants onto it. | #11 | 2d | — | ⬜ |
| P3-5 | **Delete v3 and v4 stylesheets** (`v3.css` 1,535 lines, `v4.css` 905 lines) and their orphaned components. | #18 | 1d | P3-2, P3-4 | ⬜ |
| P3-6 | **Consolidate `V5*` chrome onto v6 tokens properly** — `V5Masthead`, `V5Footer`, `V5BottomBar`, `V5MobileDrawer`. | #18 | 3d | P3-5 | ⬜ |
| P3-7 | **Resolve radius inconsistency.** Commit to one language: near-square (2px media / 0 panels) if G2 passes, or a single generous radius if not. | #11 | 0.5d | **G2** | ⬜ |
| P3-8 | **Add a CSS budget check to CI** so the sheet cannot regrow past 10,000 lines. | #18 | 0.5d | P3-5 | ⬜ |

**Phase effort:** ~12 days.

---

## Phase 4 — Skin

**Gated on G1, G2 and Phase 3.** This is the visible change.

**Definition of done:** Salt & Limestone live across all templates; no Evergreen Coast tokens remaining; the site is recognisable without the wordmark.

| ID | Item | Review # | Effort | Depends on | Status |
|---|---|---|---|---|---|
| P4-1 | **Retarget the core role tokens** in `global.css :root` to Salt & Limestone. Existing legacy aliases carry ~185 references automatically. | #9 | 1d | **G2**, P3 | ⬜ |
| P4-2 | **Retire mint `#A7FFEB` entirely**; ti-tree rust becomes the single warm accent. | #2 | 0.5d | P4-1 | ⬜ |
| P4-3 | **Self-host Fraunces**; wire `--font-display`; keep Figtree demoted to UI. | #10 | 1d | **G1** | ⬜ |
| P4-4 | **Set long-form in the serif's text optical size**, 18px / 1.6. | #10 | 0.5d | P4-3 | ⬜ |
| P4-5 | **Build the motif system** — tide rule, verdict mark, issue stamp, coastline contour. | #16 | 4d | P4-1 | ⬜ |
| P4-6 | **Rebuild hub heroes type-led on limestone**; retire the universal dark scrim; photography becomes a mid-page break. | #17 | 4d | P4-1, P2-4 | ⬜ |
| P4-7 | **Move to the 12-column asymmetric grid with a live outer margin.** Fixes venue detail (~43% of a 1440px viewport) and the orphaned Featured Plan card. | #13 | 3d | P4-1 | ⬜ |
| P4-8 | **Break up the article body** — drop cap, pull quotes, inline images, and a visual form for the verdict. | #14 | 3d | P4-3, P4-5 | ⬜ |
| P4-9 | **Replace ScrollReveal fade-up** with no-animation text, hero ken-burns, tide-line draw on dividers, horizon wipe on transitions. | #15 | 2d | P4-5 | ⬜ |
| P4-10 | **Rework the homepage headline** off "The Mornington Peninsula, sorted." into the verdict-led register of the About page. | #20 | 0.5d | — | ⬜ |
| P4-11 | **Re-run the accessibility pass.** Salt & Limestone must hold the contrast ratios v6 achieved (this is currently a genuine strength; do not lose it). | — | 1d | P4-1 | ⬜ |

**Phase effort:** ~20.5 days.

---

## Phase 5 — Brand evolution

Post-correction. Not scheduled; revisited at the quarterly strategic heartbeat.

| ID | Item | Review # | Status |
|---|---|---|---|
| P5-1 | Licence or commission a custom display face (GT Sectra, Editorial New, or bespoke). Gated on **G4**. | #21 | ⬜ |
| P5-2 | Design the print edition. The Insider Note as a quarterly. Print forces art-direction discipline that flows back to the web. | #22 | ⬜ |
| P5-3 | Give PI a proper visual system. Character spec and marks exist; PI has no presence in the current design language. | #23 | ⬜ |
| P5-4 | Extend Salt & Limestone to newsletter, social, partner kit, awards and Pass. | #24 | ⬜ |
| P5-5 | Formalise a design system doc + Figma library so the next generation is an evolution, not another lift. | #25 | ⬜ |

---

## Success criteria

Re-score against the review's four dimensions once Phase 4 ships. Targets:

| Dimension | Baseline (2026-07-25) | Target |
|---|---|---|
| Overall aesthetic | 5.5 | **8.0** |
| Brand consistency | 4.0 | **8.5** |
| Premium perception | 4.5 | **8.0** |
| Distinctiveness | 3.0 | **8.0** |

Supporting measures:

- **The logo test.** Cover the wordmark. A reader familiar with the category should identify the site. Currently fails.
- **CSS budget.** 17,444 lines → under 10,000.
- **Button families.** 42 → 1 primitive, 3 variants.
- **Token generations live.** 4 → 1.
- **Stock images on flagship surfaces.** Some → zero.
- **Accessibility held.** Every contrast pair that passes today still passes.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Plan becomes another document in a folder of forty.** | High | Single tracking surface. Reviewed at the weekly heartbeat. Status column updated or the phase is declared stalled. |
| **Skin applied before architecture; new palette drifts like v6.** | Medium | P4 is hard-gated on P3. Do not reorder. |
| **G1/G2 stall and P0 stalls with them.** | Medium | P0 is explicitly ungated. Ship it regardless. |
| **Photography slips past the winter light window.** | Medium | G3 is the earliest decision on the calendar. P2-6 has a hard seasonal dependency. |
| **Scope creep into a full v7.** | Medium | The framing is a skin correction. v6's type scale, spacing, radii, elevation and accessibility work are explicitly out of scope. |
| **Accessibility regresses during the palette swap.** | Low | P4-11 is a blocking item, not a follow-up. |
| **Agentic content engine reintroduces off-brand images.** | Medium | P2-7 codifies subject and crop rules into the editorial ops checklist. |

---

## Effort summary

| Phase | Effort | Elapsed |
|---|---|---|
| P0 Zero-regret | 4.5d | Week 1 |
| P1 Direction proof | 2d | Week 1–2 |
| P2 Photography | 9d | Week 2–10 |
| P3 Architecture | 12d | Week 3–5 |
| P4 Skin | 20.5d | Week 5–8 |
| **Total (P0–P4)** | **~48 days** | **~8 weeks, photography running long** |

Phase 5 is unscheduled.

---

## Change log

| Date | Change |
|---|---|
| 2026-07-25 | Plan created from `visual-design-brand-review-2026-07-25.md`. All phases not started; G1–G4 open. |
