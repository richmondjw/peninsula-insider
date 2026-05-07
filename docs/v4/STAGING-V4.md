# V4 Staging — Mega-menu lift on V2 chrome

**Branch:** `claude/optimistic-chatelet-c6e355`
**Routes:** `/v4/`, `/v4/eat/`, `/v4/wine/`, `/v4/stay/`, `/v4/explore/`, `/v4/escape/`, `/v4/whats-on/`, `/v4/journal/`
**All:** `noindex`, isolated from production. V2 production routes untouched.

---

## What this is

V4 takes the V3 mega-menu strategy and applies it to the **existing V2 visual language** — same paper, ochre, gold, sage, same Cormorant + Outfit type, same restraint. No design-language reset.

The lift is two things:

1. The **7-pillar IA** (Eat & Drink, Wine, Stay, Explore, Plans, What's On, Journal), replacing the current 8-item nav row + chevron-More menu.
2. A **proper editorial mega-panel system** (image rail + 3 columns + intro line + Ask-PI footer), with documented tokens, components, voice rules, and behaviour contract.

V4 is mounted on the home plus the seven pillar index pages so the menu can be hover-tested from any section. Sub-page deep links inside the mega menu still point at live V2 URLs — V4 is a chrome lift, not a content rebuild.

---

## How to review

```bash
cd next
npm run dev
# open http://localhost:4321/v4/
```

Hover the seven pillars in the masthead. Each opens an editorial mega panel:
- 280 px image rail (editor's pick this issue, with verdict line)
- One-line intro explaining the panel's framing
- Three columns (intent / place / voice — or pillar-specific variants)
- Ask-PI line at the bottom

Click any pillar label → goes to the pillar root.
Click any column item → goes to the live URL on V2.
Tab through the masthead → panel opens on focus, Escape closes it.
Resize to mobile → burger replaces the nav row, drawer opens with accordion pillars.

### Key things to look at

1. **Does the mega panel feel native to V2's voice?** Same paper, same hairlines, same Cormorant — but with editorial discipline the V2 More menu never had.
2. **The 7th pillar.** What's On is now a peer to the others, with a temporal banner inside its panel. Worth checking on `/v4/whats-on/`.
3. **The Wine pillar.** Wine kept its own pillar (vs being folded into Eat & Drink). Column 1 is by venue type per the brief.
4. **Plans column 3.** Weddings + corporate live there now, not in the footer.
5. **The image rail.** Each pillar's rail is the *issue's current pick*, not a generic hub image.
6. **Hover-test from a sub-page.** Visit `/v4/eat/` and hover Wine — make sure the menu pops, the rail loads, the columns are editorial-tight.

---

## File map

```
next/src/
├── styles/v4.css                         # NEW — additive tokens + V4 component styles
├── lib/v4-nav.ts                         # NEW — 7-pillar data, mega-panel content, image-rail picks
├── layouts/v4/V4BaseLayout.astro         # NEW — fork of BaseLayout, mounts V4 chrome
├── components/v4/
│   ├── V4Masthead.astro                  # NEW — 7 pillars, mega-panel parent, search/Ask/Subscribe
│   ├── V4MegaPanel.astro                 # NEW — panel container with intro + columns + Ask-PI line
│   ├── V4MegaColumn.astro                # NEW — eyebrow + ≤6 items
│   ├── V4MegaRail.astro                  # NEW — image rail (editor's pick per pillar)
│   ├── V4PillarLink.astro                # NEW — top-row pillar trigger
│   ├── V4PillarTopBanner.astro           # NEW — temporal banner inside What's On panel
│   └── V4MobileDrawer.astro              # NEW — accordion mobile menu
└── pages/v4/
    ├── index.astro                       # NEW — V2 home content under V4 chrome
    ├── eat/index.astro                   # NEW
    ├── wine/index.astro                  # NEW
    ├── stay/index.astro                  # NEW
    ├── explore/index.astro               # NEW
    ├── escape/index.astro                # NEW
    ├── whats-on/index.astro              # NEW
    └── journal/index.astro               # NEW

docs/v4/
├── PILLAR-MAP.md                         # every current URL accounted for
├── DESIGN-SYSTEM-V4.md                   # tokens, components, behaviour, voice
└── STAGING-V4.md                         # this file
```

V2 production files: untouched.
V3 staging at `/v3/`: untouched, still reviewable.

---

## Decisions captured

- **Wine** kept as its own pillar (D1 ✓).
- **Wine column 1** by venue type, not grape variety (D3 ✓).
- **Weddings + Corporate** in Plans column 3 "By the occasion", not footer-only (D2 ✓).
- **What's On** elevated to its own seventh pillar (D4 ✓).
- **Sub-page hover-test surface** — V4 masthead on the 7 pillar index pages (D5 ✓).
- **Image rail picks** — chosen by me, autumn 2026 issue (D6 ✓).

---

## Out of scope (not in this release)

- No homepage block resequencing (V3 covers that).
- No card-system collapse (the 9 V2 card types stay — V4 only changes chrome).
- No URL migrations.
- No production promotion. V4 is `noindex` until you say go.
- No save-to-trip wiring.
- No deep sub-page coverage (e.g. `/eat/laura/` still uses V2 chrome — only the 7 pillar index pages get V4 masthead in this release).

If V4 is approved, promotion is documented in `DESIGN-SYSTEM-V4.md` section 7 — estimated 30-minute chrome swap with no data-layer changes.
