# Home cover slideshow - spec and implementation plan

**Date:** 18 September 2026
**Branch:** `feat/home-cover-slideshow-v2` (off origin/main; see 14)
**Owner:** James
**Status:** Built on branch, not merged (see 13)
**Reference:** Klook homepage hero (full-bleed photograph, fixed copy and
search bar, edge arrows, timed rotation)

---

## 1. Intent

The homepage cover is one still photograph. Make the photograph rotate - a Klook-style cross-fade between a small deck of Peninsula frames - while
the cover copy stays exactly where it is.

**Decided up front (18 Sep):**

| Question | Decision |
|---|---|
| What changes between slides | **Photograph only.** Statement, date line and both CTAs are fixed. |
| Behaviour | **Autoplay + arrows + dot pager**, swipe on touch. |
| Where the plan lives | This spec, on a working branch, implemented against it. |

Photo-only is the deliberately conservative read of the reference: Klook
keeps its heading and search bar nailed down and rotates the scene behind
them. It also keeps one stable `<h1>` on the page, which protects the
homepage's search surface.

---

## 2. Current state (verified in code, 18 Sep 2026)

`next/src/components/v5/home/HomeCover.astro` - block 2 of the v5 eight-block
homepage (`next/src/pages/index.astro`).

- A single `<img class="home-cover__media">`, absolutely positioned,
  `object-fit: cover`, `object-position: center 38%`.
- Default photograph `/images/sourced/home-cover-cape-schanck-rainbow-01.webp`,
  overridable through the inline CMS image slot `page/home → cover.image`
  (`editableImage` + `loadOverrides`).
- A slow CSS-only Ken Burns zoom added 2026-08-17: `scale(1) → scale(1.08)`
  over 36s, alternating, disabled under `prefers-reduced-motion`.
- Over it: a two-axis scrim, the season eyebrow, the single `<h1>` cover
  statement (CMS slot `cover.statement`, ≤18 words), the date line, and two
  CTAs ("See this weekend", "Search").
- No client JS in this component today.

### Prior art already in the repo

`next/src/components/HomeHeroCarousel.astro` (243 lines) is a **complete,
working cover carousel** from the pre-v5 homepage: prev/next arrows, dash
pager, touch swipe, 10s autoplay, `inert` handling on inactive slides,
idempotent re-init across `astro:page-load`. It was orphaned by the v5
homepage rebuild (`ca76d820d2 feat(v5): 8-block Edition homepage (T-401)`)
and is referenced by no page or layout. Its `.cover*` CSS (21 rules) still
sits in `next/src/styles/global.css`.

**This is therefore a port, not a greenfield build.** The controller logic
is proven in production and can be lifted, minus the article-deck and
masthead-sizing parts that no longer apply.

### The doctrine conflict, stated plainly

The header comment in `index.astro` reads: *"No carousels, no auto-motion,
no reveal animations."* This change breaks that line. The precedent for
overriding it already exists - James approved the Ken Burns zoom on
2026-08-17 for exactly this reason ("visual buzz on the masthead"). The
comment must be amended in the same commit rather than quietly contradicted,
or the next person to read it will revert this work.

---

## 3. Scope

### In

- Multi-frame photograph deck behind the existing cover, cross-faded.
- Prev/next arrows, dot pager, touch swipe, timed autoplay.
- Pause rules: hover, keyboard focus, hidden tab, off-screen.
- `prefers-reduced-motion` behaviour.
- Per-slide CMS image slots so each frame stays editor-replaceable.
- Feature flag so the whole thing can be switched off without a revert.

### Out

- Per-slide headlines, deks or CTAs (that is the "hybrid" option, not chosen).
- Reviving `HomeHeroCarousel.astro` as a component or its `.cover*` CSS.
- The Hero Editor deck document / Supabase deck path.
- Any change to title, meta, canonical or the `<h1>` text.
- Any other page's hero (`CoverHero`, `GuideHero`, `SubpageHero` untouched).

---

## 4. Behaviour spec

| Property | Value | Note |
|---|---|---|
| Slides | 4 | 3 minimum, 5 ceiling - past that, weight beats interest |
| Transition | Cross-fade, 900ms `ease` | No slide/translate: the copy must not appear to move |
| Interval | 7,000ms | Klook sits near 5s; 7s suits a slower editorial read |
| Arrows | Left/right, vertically centred at the viewport edges | Klook parity |
| Pager | Dots, bottom-right | Statement and CTAs own the lower-left; dots go opposite |
| Swipe | ≥48px horizontal, and horizontal travel > 1.5× vertical | Lifted from the existing controller |
| Pause | On hover, on `focus-within`, on `visibilitychange` hidden, when the cover scrolls out of view | The last two are new; the old controller ran blind |
| Restart | Any manual advance resets the timer | Existing behaviour |
| Reduced motion | No autoplay, no Ken Burns, instant swap on manual advance; arrows and dots still work | |
| Ken Burns | Applies to the active slide only, restarting per slide | Drop it if it reads as fighting the cross-fade - judgement call at Phase 2 |

---

## 5. Data model

New file `next/src/data/home-cover-deck.json`:

```json
[
  {
    "id": "cape-schanck-rainbow",
    "src": "/images/sourced/home-cover-cape-schanck-rainbow-01.webp",
    "alt": "A rainbow arcs over the bay at Cape Schanck on a still winter morning, Mornington Peninsula",
    "focal": "center 38%"
  }
]
```

Rules:

- Entry 1 **must** be today's live photograph, so an empty or missing deck
  degrades to exactly the current cover.
- `id` is stable and unique; the build fails on duplicates.
- `focal` is optional, defaulting to `center 38%` (today's framing).
- Resolution order per slide: published CMS image override → deck JSON entry.
- CMS slots: slide 1 keeps `cover.image` (backwards-compatible with any
  override an editor has already published); slides 2–n use `cover.image.2`,
  `cover.image.3`, `cover.image.4`.
- **To verify at Phase 4:** whether `ops/cms-promotion-manifest.json` needs
  the new slots registered for them to promote, or whether arbitrary
  `fieldPath` values pass through.

The array shape deliberately leaves room for optional per-slide copy later
without a migration, should the hybrid option ever be wanted.

---

## 6. Accessibility

- Deck wrapper: `role="group"`, `aria-roledescription="carousel"`,
  `aria-label="Cover photographs"`.
- Each slide: `role="group"`, `aria-roledescription="slide"`,
  `aria-label="2 of 4"`; inactive slides carry `aria-hidden="true"`.
  No focusable content lives inside a slide, so `inert` is belt-and-braces
  but cheap - keep it.
- Arrows: "Previous photograph" / "Next photograph". Dots: "Show photograph 2",
  with `aria-current` on the active dot.
- A visually-hidden live region (`aria-live="polite"`) announces the new
  photograph's alt text **only on manual advance**. Announcing every autoplay
  tick would make the homepage unusable with a screen reader.
- Controls are ≥44px touch targets and keyboard-reachable in DOM order after
  the CTAs.
- **WCAG 2.2.2 (Pause, Stop, Hide)** - open decision. Auto-updating content
  over 5s needs a pause mechanism. Hover/focus pause plus reduced-motion
  support is the common practice reading; a dedicated visible pause/play
  button is the strict one. Recommendation: ship hover/focus pause in Phase 2
  and add the button only if the a11y pass flags it.

---

## 7. Performance

Current LCP on `/` is the cover photograph. It must not regress.

- Slide 1: `fetchpriority="high"`, eager, unchanged markup position.
- Slides 2–n: `loading="lazy"`, `decoding="async"`, no preload.
- Zero CLS: every slide is absolutely positioned inside the existing
  `.home-cover`; the copy block does not move.
- Cross-fade is `opacity` only - compositor-only, like the existing zoom.

**Asset weight is the real risk.** Current candidates in
`next/public/images/sourced/`:

| File | Size |
|---|---|
| `home-cover-cape-schanck-rainbow-01.webp` | 306 KB (live today) |
| `home-cover-bay-umbrella-01.webp` | 396 KB |
| `home-cover-south-coast-rainbow-01.webp` | 614 KB |
| `home-cover-back-beach-horses-01.jpg` | 764 KB |
| `home-cover-sunset-bay-01.jpg` | 978 KB |
| `home-cover-flinders-pier-steps-01.jpg` | 1,171 KB |
| `home-cover-sorrento-pier-01.jpg` | 1,171 KB |

Four slides at JPEG weights is ~4 MB of cover. Budget: **≤400 KB per slide,
≤1.4 MB for the deck**, which means converting the chosen JPEGs to WebP at
2400px before they go anywhere near the homepage.

---

## 8. Gates and risks

| Gate / risk | Position |
|---|---|
| `lint:css-budget` | Not affected. It counts `next/src/styles/*.css` only (ceiling 16,100 lines); the slideshow CSS stays scoped inside `HomeCover.astro`. |
| `lint:surfaces`, `lint:seo-architecture`, `audit:agent-readiness`, `assert:link-graph` | No new routes, no new links, no copy change - expected clean. Run the full `npm run build` chain regardless. |
| `media:registry` | Regenerates when new files land in `public/images/`. Commit the regenerated registry. |
| **Image licensing** | `public/images/sourced/LICENSES.md` has **no entry** for any `home-cover-*` file - including the one live on the homepage right now. Three more photographs above the fold triples that exposure. Provenance must be recorded before Phase 1 merges. |
| LCP regression | Guarded by the eager/lazy split and the weight budget; measured at Phase 3. |
| Motion doctrine | Amend the `index.astro` header comment in the same commit. |
| Class-name collision | Use `.home-cover__*` only. The legacy `.cover*` rules in `global.css` belong to the retired carousel - do not reuse those names. |

---

## 9. Files touched

```
next/src/components/v5/home/HomeCover.astro     markup, scoped CSS, controller
next/src/data/home-cover-deck.json              new - the deck
next/src/lib/features.ts                        new flag SHOW_HOME_COVER_SLIDESHOW
next/src/pages/index.astro                      amend the "no carousels" comment
next/public/images/sourced/*.webp               converted frames, if new
next/public/images/sourced/LICENSES.md          provenance for every cover frame
next/public/admin/media-registry.json           regenerated
docs/specs/home-cover-slideshow-2026-09-18.md   this spec
```

Reference only, not modified: `next/src/components/HomeHeroCarousel.astro`
(controller source), `next/src/lib/inline-edit/attrs.ts`.

---

## 10. Implementation plan

Six phases, each independently reviewable. Estimate ~6 hours of build.

**Phase 0 - Assets and licences (~45 min)**
Choose four frames. Convert JPEGs to WebP at 2400px, ≤400 KB each. Set a
focal point per frame against the scrim (the statement sits lower-left; a
frame with a bright lower-left corner is rejected). Write a LICENSES.md
entry for every frame, including the one already live. *Gate: nothing merges
until provenance is recorded.*

**Phase 1 - Deck and cross-fade, flag off (~2 h)**
Add `SHOW_HOME_COVER_SLIDESHOW = false` to `features.ts`. Add the deck JSON.
Refactor `HomeCover.astro` from one `<img>` to a slide layer, resolution
order CMS → JSON, entry 1 eager. Cross-fade CSS. Autoplay only, no controls.
Verify with the flag on locally that the copy block does not shift by a pixel.

**Phase 2 - Controls (~1.5 h)**
Port the controller from `HomeHeroCarousel.astro`: arrows, dots, swipe,
timer restart, `astro:page-load` idempotency. Add the pause rules
(hover, focus-within, `visibilitychange`, `IntersectionObserver`). Decide the
Ken Burns question by looking at it.

**Phase 3 - Verification (~1 h)**
Keyboard pass, screen-reader pass on the live region, axe clean. Lighthouse
on `/` before and after: LCP within 5% of baseline, CLS 0. Full
`npm run build` gate chain green. Mobile check at 360px - arrows must not
overlap the statement.

**Phase 4 - CMS slots (~45 min)**
Confirm right-click replace works on each slide in edit mode and that an
override survives a rebuild. Check the promotion manifest question from §5.

**Phase 5 - Ship (~30 min)**
Flip the flag to `true`, amend the doctrine comment, merge to `main`.
`build-and-deploy.yml` fires on `next/src/**`. Watch the run, then post-deploy
QA on the live homepage: rotation, arrows, dots, swipe on a real phone,
reduced-motion setting honoured.

Rollback is one line: `SHOW_HOME_COVER_SLIDESHOW = false`, same pattern as
the Ask PI flag in `47c8d0f18f`.

---

## 11. Acceptance criteria

1. The cover cross-fades through four photographs at 7s intervals.
2. Statement, date line and CTAs never move, and the `<h1>` text is unchanged.
3. Arrows, dots and swipe all advance the deck and reset the timer.
4. Rotation pauses on hover, on keyboard focus, on a hidden tab, and when the
   cover is scrolled out of view.
5. Under `prefers-reduced-motion`, nothing moves on its own; controls still work.
6. LCP on `/` within 5% of the pre-change baseline; CLS 0; deck ≤1.4 MB.
7. Every cover photograph has a LICENSES.md entry.
8. Full `npm run build` gate chain passes.
9. Each slide is replaceable through the inline CMS and the override survives
   a rebuild.
10. The flag returns the cover to today's behaviour exactly.

---

## 12. Open questions

- 7s interval, or faster at 5s to match the reference more closely?
- Keep the Ken Burns zoom per slide, or let the cross-fade carry the motion
  on its own?
- Dedicated pause button, or is hover/focus pause enough (§6)?
- Four frames at launch, or start with three and add as photography lands?

---

## 13. Build log - 18 September 2026

Implemented on this branch in commit `646ae762f6`. Status: **built, gates
run as far as this environment allows, not yet merged**.

### Shipped as specced

Photo-only rotation, 7s autoplay, edge arrows, dot pager, swipe. Pauses on
hover, keyboard focus, hidden tab, off-screen, and edit mode.
`prefers-reduced-motion` disables autoplay and the Ken Burns zoom while
leaving the controls live. Four frames, 1.35MB total, each under 400KB:
cape-schanck-rainbow (LCP, unchanged), sorrento-pier, back-beach-horses,
sunset-bay. The three new frames were converted from JPEG to WebP at 2400px.

### Deviations from the spec

1. **Slides are `.home-cover__plate`, not `.home-cover__slide`.** Both
   `.home-cover__slide` and `.home-cover__frame` already carry global rules
   from the retired pre-v5 `HomeCover` (global.css ~5000), including
   `filter: saturate(0.92) contrast(1.02)`, which would have silently
   tinted every cover photograph. Caught by reading the rendered CSS, not
   by looking at the page.
2. **Licence entries skipped** at James's direction (18 Sep). The gap in
   `LICENSES.md` for every `home-cover-*` file, including the frame that
   was already live, is unchanged and still open.
3. **No dedicated pause button.** Hover/focus pause plus reduced-motion
   support only, per §6. Revisit if an a11y pass calls it.

### Editing, as built

- Right-click any cover photograph in edit mode to replace it. Rotation
  stops while edit mode is on and the arrows stay visible, so the job is:
  step to the frame you want, right-click it.
- A hint line under the CTAs shows "Photo 2 of 4" in edit mode only.
- The three new frames were added to `public/admin/media-registry.json`,
  which is what the editor's image picker reads, so they can be chosen
  for any other slot on the site too.
- Adding, removing or reordering slides is a JSON edit in
  `src/data/home-cover-deck.json`; the rules are in the file's own readme.

### Verified here

- `lint:no-pricing`, `lint:house-style`, `lint:region-images`,
  `lint:surfaces`, `lint:nav-budget`, `lint:css-budget` - all pass.
  (House style caught em-dashes in the new deck readme; fixed.)
- `astro build` compiles and generates 975 pages with no errors.
- Rendered homepage, dev and dist: four plates, one active, three
  `aria-hidden`, four distinct photographs, one `<h1>`, dots and arrows
  present, controller script present.
- Flag off: one plate, no controls, no client JS, no root attribute -
  the pre-slideshow cover exactly.

### Not verified here, and why

The post-build gates (`lint:no-hidden-pages`, `lint:filter-chips`,
`lint:seo-architecture`, `audit:agent-readiness`, `assert:link-graph`,
`assert:event-safeguards`) scan the whole 975-page `dist` over a mounted
filesystem and exceed the 180s command ceiling of the environment this was
built in. Run `cd next && npm run build` locally for the full chain; CI
runs it on the merge to `main` regardless.

`lint:seo-architecture` did complete once and reported
`imageobject-diversity: floor dropped to 47, baseline requires 59`. **That
is the build environment, not this change.** The local build ran without
Supabase credentials (`PI_SKIP_CMS_LIVE_READS=1`), so published CMS image
overrides never resolved and their URLs are missing from the schema graph.
Evidence the change is not implicated: the homepage emits exactly one
`ImageObject` (`home-cover.webp`) both before and after, identical to the
live site; and the live site rebuilt from `main` through this same gate on
the morning of 18 September, so `main` passes it in CI today.

### Still open

Interval (7s as shipped, 5s matches the reference more closely), whether
the Ken Burns zoom earns its place now that the cross-fade carries motion,
and the WCAG 2.2.2 pause-button question.

---

## 14. Ported onto origin/main - 18 September 2026

The first implementation was built on this checkout's local `main`, which
turns out to share **no common ancestor** with `origin/main`: 2,821 commits
here that GitHub does not have, 10 there that are not here, 2,066 files
different, and a local tip that stops on 1 September. Real work in this repo
happens in worktrees cut from `origin/main`; the local `main` branch is a
vestigial history. Merging the original branch would have reverted 17 days
of work on the live site.

Re-applied on top of `origin/main` as `feat/home-cover-slideshow-v2`,
carrying forward everything the cover had gained in the meantime:

- the three-intent CTA nav (`This weekend` / `Plan a trip` / `Search the
  Peninsula`) with its `home-intents` analytics attributes
- `getAustralianSeasonLower` from `lib/season`, replacing `getSeason`
- `data-pi-responsive="100vw"`, now on every slide, so each frame gets its
  own `srcset` from the responsive-image integration. This also softens the
  weight budget in section 7: the browser picks from 480/800/1280/1920
  derivatives rather than the 2400px original.
- the current cover padding and statement type scale
- `features.ts` keeps the PI-008 event-occurrence model; the slideshow flag
  is appended to it

One deliberate reversal: the Ken Burns zoom, which `origin/main` had removed
in favour of a static landscape, is restored per slide at James's direction
(18 September).

Not verified against `origin/main` locally: the ported branch was assembled
from git objects without a working tree, because checking out 5,957 files
over the device bridge exceeds the command ceiling. The full gate chain runs
in `build-and-deploy.yml` on the merge; a gate failure fails the build before
the deploy step, so the live site holds rather than breaks.
