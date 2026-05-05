# V3 Staging — Release 1 + Release 2

**Branch:** `claude/optimistic-chatelet-c6e355`
**Route:** `/v3/` (noindex, isolated from production)
**Build status:** ✅ 1201 pages, no errors against the V3 surface

---

## What you're looking at

A complete fork of the Peninsula Insider homepage, masthead, and IA running at `/v3/`, built against the V3 strategy doc. Production `/index.astro`, masthead, footer, and the live nav lib (`lib/nav.ts`) are **untouched**. Run `npm run dev` and visit `http://localhost:4321/v3/` to review.

This stages **Release 1 (homepage rebuild)** and the structural half of **Release 2 (nav, IA, card system)** in a single, reviewable surface so you can decide what to promote.

---

## File map

```
next/src/
├── styles/
│   └── v3.css                            # NEW — V3 design tokens + all V3 component styles
├── lib/
│   └── v3-nav.ts                         # NEW — 5-pillar nav, mega-panel data, footer cols
├── layouts/v3/
│   └── V3BaseLayout.astro                # NEW — fork of BaseLayout, mounts V3 chrome
├── components/v3/
│   ├── V3Masthead.astro                  # NEW — utility + brand + 5-pillar nav + mega-panel
│   ├── V3Footer.astro                    # NEW — colophon footer
│   ├── V3HomeCover.astro                 # NEW — cinematic full-bleed cover with poster + loop
│   ├── V3AskBlock.astro                  # NEW — homepage Ask PI front-door
│   ├── V3PillarGrid.astro                # NEW — Stay/Explore/Plans/Tours, 4 cards w/ line icons
│   ├── V3WeekendHero.astro               # NEW — combined dispatch + 3-event strip
│   ├── V3EventCard.astro                 # NEW — compact event card w/ flags
│   ├── V3IntentGrid.astro                # NEW — 8 voice-led intent cards (chips upgraded)
│   ├── V3EditorialCard.astro             # NEW — unified editorial card (replaces ArticleCard)
│   ├── V3EntityCard.astro                # NEW — unified entity card (replaces 7 V2 card types)
│   ├── V3LateralSurfaces.astro           # NEW — 3-up: eat-now / stay-now / place-by-place
│   ├── V3EditorsLetter.astro             # NEW — drop-cap letter with 4:5 image
│   ├── V3Shortlist.astro                 # NEW — five picks with italic numerals
│   ├── V3InsiderStripe.astro             # NEW — vine-coloured Pass commercial moment
│   ├── V3Newsletter.astro                # NEW — compact dispatch sign-up
│   └── V3ConciergeDock.astro             # NEW — bottom-right Ask PI affordance, breathes
└── pages/v3/
    └── index.astro                       # NEW — V3 homepage, all 10 blocks wired

docs/v3/
└── STAGING-V3.md                         # this file (lives outside pages so it doesn't render as a route)
```

The production homepage at `next/src/pages/index.astro` is **byte-for-byte unchanged**.

---

## What was built (vs the strategy doc)

### Release 1 — Homepage rebuild ✅

| Block (per strategy doc) | Component | Status |
|---|---|---|
| 1. Cinematic Cover with poster + silent loop, dual CTA | `V3HomeCover` | ✅ uses `/videos/hero.mp4` + `/images/sourced/home-cover-bay-umbrella-01.webp`. Honours `prefers-reduced-motion` and `Save-Data`. Two CTAs: *Read the cover* and *Ask PI instead*. |
| 2. Ask PI block | `V3AskBlock` | ✅ Input + 3 voice-chip suggestions, posts to `/ask/?q=…`. Avatar with status dot. |
| 3. Pillar grid (Stay / Explore / Plans / Tours) | `V3PillarGrid` | ✅ 4 cards, line icons, hover lift. Copy in PI voice. |
| 4. Weekend hero | `V3WeekendHero` | ✅ Two-column: dispatch story + 3 weekend events. Date prominence. Pulls from real content collection. |
| 5. Intent grid (chips → cards) | `V3IntentGrid` | ✅ 8 cells, anchor image per cell, hover micro-affordance. Routes to existing journal pieces. |
| 6. Shortlist | `V3Shortlist` | ✅ Italic numerals, hairline rows, 12px slide on hover. Reads as a collectible artefact. |
| 7. Editor's Letter | `V3EditorsLetter` | ✅ 4:5 image left + drop-cap body right + pull quote. Image carries an italic caption overlay. |
| 8. Insider Stripe (Pass) | `V3InsiderStripe` | ✅ The single vine-coloured block on the page. Dual CTAs. |
| 9. Three lateral surfaces | `V3LateralSurfaces` | ✅ 3-up Eat / Stay / Places, each with one anchor entity card. |
| 10. Newsletter | `V3Newsletter` | ✅ Compact two-column. Form action stub points at Mailchimp. |
| Voice on chrome | masthead, CTAs, dock | ✅ "Get the dispatch", "Ask PI", "Open the rooms", "Open the moves", "Open the plans", "Open the operators", "Sign in / Save trip". No tourism adjectives. No em-dashes. |

### Release 2 — Nav, IA, card system ✅ (the structural half)

| Item | Implementation | Status |
|---|---|---|
| Collapse 10+ pillars to 5 | `lib/v3-nav.ts` exports `v3Pillars` with five: Eat & Drink, Stay, Explore, Plans, Journal | ✅ |
| Mega-panel nav (3-column editorial layout) | `V3Masthead.astro` renders mega-panel per pillar with intent / place / format / image rail | ✅ Hover, focus, and Esc-to-close all wired |
| Concierge in masthead | "Ask PI" pill in utility actions, plus mobile-row pill | ✅ |
| Three-card system | `V3EditorialCard` (articles/dispatches/shortlist) + `V3EntityCard` (any verdict-bearing thing) + `V3EventCard` (events) | ✅ Replaces 9 V2 card types with 3 |
| Concierge dock | `V3ConciergeDock` — appears after first scroll, breathes when idle | ✅ |
| Sticky-on-scroll masthead | V3BaseLayout adds `is-scrolled` class after 80px | ✅ Brand row condenses |
| Footer reorganised by V3 pillar | `V3Footer` w/ Departments + About + Read more cols | ✅ |

### What is **not** in this release (deliberate)

These are still in the Release 2 / Release 3 backlog and were excluded so V3 stays cleanly reviewable as a staged proposal:

- **No URL migrations.** No redirects from `/wine`, `/walks`, `/golf`, `/fishing`, `/boating`, `/spa`, `/dog-friendly`, `/corporate-events`, `/weddings`, `/tour-packages` into the new pillar pages. The mega-panel links land on existing live pages and querystring-filtered indexes that **already 200**.
- **No production page rebuilds.** `/eat/`, `/stay/`, `/explore/`, `/escape/`, `/journal/` are still V2. V3 only ships the homepage and chrome (masthead + footer) so far.
- **No save-to-trip wiring.** Designed in the spec, not yet implemented in V3 — the existing V2 `Shortlist` save flow needs separate wiring once the V3 EntityCard becomes the canonical type.
- **No Mailchimp credentials.** `V3Newsletter` form action carries a `PLACEHOLDER` you'll need to swap when promoting.
- **No new search index.** V3 page is `noindex` by default and excluded from the Pagefind body.

---

## How to review

```bash
cd next
npm run dev
# open http://localhost:4321/v3/
```

A full build (run already): `npx astro build` — succeeds, builds 1201 pages including `/v3/`.

### What to look at first

1. **The cover** at the top of `/v3/`. Does the silent loop play smoothly on your wifi? Does the poster carry the moment if it doesn't? Are the two CTAs (*Read the cover* / *Ask PI instead*) the right framing?
2. **Hover the masthead pillars** to open the mega-panels. Three columns each: by intent, by place, in voice. Does the curation feel right?
3. **Scroll past the cover.** The Ask block is the new front door. Type something or tap a chip — it should land on `/ask/?q=…`.
4. **Compare the rhythm** to live `/`. Same content, fewer competing sections, sharper sequencing.

---

## Known follow-ups before promoting

- [ ] Wire `V3Newsletter` form action to real Mailchimp endpoint (V2 has the credentials).
- [ ] Swap the cover loop for a 4–8 second silent loop authored specifically for the cover (current `hero.mp4` is the V2 hero, will work but is generic).
- [ ] Decide whether to honour the mobile burger overlay or rebuild it as `V3MobileNav` (currently V3 mobile shows the brand + Ask pill, no full menu).
- [ ] Add the V3 mega-panel keyboard navigation (currently mouse + focus + Esc; arrow-key navigation between columns is not wired).
- [ ] Decide whether `/v3/eat/`, `/v3/stay/`, `/v3/explore/`, `/v3/escape/`, `/v3/journal/` should ship next as Release 2.5 to stage the inside pages, or whether to promote V3 home + chrome over V2 first.
- [ ] Hook `V3ConciergeDock` `data-pi-trigger` into the existing `ConciergeDrawer` — currently the trigger fires the V2 drawer (which is mounted by V3BaseLayout), so the wiring works but should be smoke-tested.
- [ ] Image optimisation pass on the intent-card thumbnails (using existing `/images/sourced/article-*-01.webp` — fine for staging, want srcset variants for production).

---

## What changed in production

Nothing. Zero V2 files were modified. The only writes:

```
next/src/styles/v3.css
next/src/lib/v3-nav.ts
next/src/layouts/v3/V3BaseLayout.astro
next/src/components/v3/*.astro  (15 new files)
next/src/pages/v3/index.astro
next/src/pages/v3/STAGING-V3.md
```

Promotion plan when V3 is approved:

1. Move/rename `pages/v3/index.astro` → `pages/index.astro` (or set `pages/index.astro` to import the V3 layout).
2. Switch `Masthead`/`Footer` defaults in `BaseLayout.astro` to V3 components, **or** keep both and gate by section flag.
3. Migrate URL redirects from collapsed pillars (`/wine`, `/walks`, etc.) into the new structure.
4. Promote V3 nav lib to be the single source of truth (delete or alias the V2 `lib/nav.ts` exports).
5. Drop `noindex` from `V3BaseLayout`.

---

*Built against `BRAND-PI.md` voice rules: no em-dashes, no tourism-board adjectives, specific over generic, dry over effusive. Everything that ships text in PI's name follows the rule.*
