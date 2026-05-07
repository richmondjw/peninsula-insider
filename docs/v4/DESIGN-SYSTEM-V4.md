# V4 Design System

The mega-menu lift, applied natively to the V2 design language. Cream paper stays. Ochre, gold, sage stay. Cormorant + Outfit stay. Only chrome and behaviour change.

Built around four principles:

1. **Curation over coverage.** Every column capped at six items. The mega menu reads as edited, not exhaustive.
2. **The framing is the feature.** Every panel teaches the reader its three-axis structure (intent, place, voice) via a one-line intro and small-caps eyebrows. First-time readers don't have to guess.
3. **The rail is the editor's pin.** Each pillar's image rail is the *one thing* PI is sending you to right now. Refreshes when the issue refreshes.
4. **The Ask is the safety net.** Every panel ends with an "Ask PI" line in voice. The menu admits its limits and routes around them.

---

## 1. Tokens

V4 inherits V2's `:root`. New tokens are additive, scoped under `--v4-` so V2 components are unaffected.

```css
/* added to next/src/styles/v4.css */
:root {
  --v4-mega-w:           1240px;     /* mega panel max width */
  --v4-mega-rail-w:      280px;      /* image rail width */
  --v4-mega-col-gap:     40px;
  --v4-mega-row-h:       56px;       /* nav row height */
  --v4-mega-pad-y:       40px;       /* mega panel vertical padding */
  --v4-mega-open-delay:  70ms;
  --v4-mega-close-delay: 220ms;
  --v4-shadow-mega:      0 16px 40px -16px rgba(30, 27, 24, 0.18);
  --v4-shadow-mega-soft: 0 8px 24px -12px rgba(30, 27, 24, 0.12);

  --v4-link-underline:   1px solid rgba(139, 78, 59, 0.35);  /* matches V2 ochre */
  --v4-focus-ring:       0 0 0 3px rgba(139, 78, 59, 0.22);
  --v4-hairline-mega:    rgba(30, 27, 24, 0.10);
}
```

V2 colour tokens used by V4 components, unchanged:

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#FFFFFF` | masthead surface |
| `--bg-alt` | `#F6F2EA` | mega panel surface (subtle warmth vs nav row) |
| `--text` | `#2B2520` | menu link colour |
| `--soft` | `#7A726A` | meta + intro line colour |
| `--accent` | `#8B4E3B` | ochre — eyebrows, link hover, focus |
| `--gold` | `#B69A6B` | image rail caption underline |
| `--sage` | `#7A8B6D` | "live data" indicator dot on What's On |
| `--border` | `#E5E0D6` | hairline dividers |

---

## 2. Component anatomy

### V4Masthead

Three rows. Sticky on scroll. Matches V2 layout exactly — only the third row's structure changes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Vol 04 · Autumn 2026 · Updated weekly        Pass · Sign in / Save    │  Row 1: Utility (V2 black)
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│              Peninsula Insider · An editorial guide                     │  Row 2: Brand (V2 paper)
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Eat & Drink  Wine  Stay  Explore  Plans  What's On  Journal   🔍 Ask PI  Subscribe  │  Row 3: V4 nav
└─────────────────────────────────────────────────────────────────────────┘
```

Notes:
- Row 1 + Row 2 are V2 unchanged (utility + brand reuse `Masthead.astro` markup).
- Row 3 is wholly new — 7 pillars + 3 utility actions (search, Ask PI, Subscribe).
- Subscribe is the only ochre-coloured pill (V2 already does this).
- Ask PI is the only **dark-ink** pill, paired with the PI mark in a small disc — different colour treatment from Subscribe so the eye reads them as two different actions.
- Journal sits last in the row and stays italic Cormorant — magazine signature, kept from V2.
- On scroll, the brand row collapses to half-height and Row 1 hides; nav row stays visible.

### V4MegaPanel

Anchored to the nav row, full-width. Opens on hover (70 ms delay), closes on leave (220 ms delay), or on focus / keyboard / click-outside / Escape.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Three ways into Eat & Drink — pick the meal, the place, or the route. │  Intro line
├──────────────┬──────────────────┬──────────────────┬───────────────────┤
│              │                  │                  │                   │
│   IMAGE      │  BY THE MEAL     │  BY THE PLACE    │  IN VOICE         │
│   (rail,     │                  │                  │                   │
│   280px,     │  Long lunch      │  Red Hill        │  Editor's Table   │
│   4:5 ratio) │  Hatted dinner   │  Sorrento        │  The Shortlist    │
│              │  Breakfast       │  Flinders        │  Pantry & produce │
│  Italic      │  Cellar door     │  Mornington      │  Every venue      │
│  verdict     │  Cafe & bakery   │  Main Ridge      │                   │
│  line        │  Pantry & produce│  Merricks        │                   │
│  ↓ Open      │                  │                  │                   │
│              │                  │                  │                   │
├──────────────┴──────────────────┴──────────────────┴───────────────────┤
│        Looking for the back-roads version? Ask PI →                     │  Ask line
└──────────────────────────────────────────────────────────────────────────┘
```

Spacing:
- Vertical padding: `var(--v4-mega-pad-y)` (40 px) top and bottom.
- Column gap: `var(--v4-mega-col-gap)` (40 px).
- Image rail: 280 px fixed, aspect 4:5.
- Intro line: serif italic, 16 px, `--soft` colour, max 80 ch.
- Bottom Ask line: serif italic, 18 px, ochre on hover, full width centred.

Backdrop:
- Surface: `var(--bg-alt)` so the panel reads as a *paper page* below the nav row's white surface.
- Shadow: `var(--v4-shadow-mega)` for separation.
- Top hairline: 1 px `var(--border)` — no second hairline at bottom.

### V4MegaColumn

```html
<div class="v4-mega-col">
  <h3 class="v4-mega-col__eyebrow">By the meal</h3>
  <ul class="v4-mega-col__list">
    <li><a href="/journal/the-long-lunch/">Long lunch</a></li>
    ...
  </ul>
</div>
```

Eyebrow: Outfit, 11 px, 0.16 em letter-spacing, uppercase, ochre.
Items: Cormorant Garamond, 19 px, dark ink. Hover: ochre + 1 px underline lift. Focus: ochre + focus ring.

### V4MegaRail

The editor's pin per pillar. Different from a plain category tile — it's an editorial recommendation.

```html
<a class="v4-mega-rail" href="/eat/laura/">
  <img src="/images/sourced/eat-laura-01.webp" alt="Laura, Pt Leo Estate">
  <div class="v4-mega-rail__body">
    <p class="v4-mega-rail__eyebrow">Editor's pick · Autumn '26</p>
    <h3 class="v4-mega-rail__title">Laura</h3>
    <p class="v4-mega-rail__verdict">Sit at the bar, not the dining room. Better view, faster service. The kingfish is the order.</p>
    <span class="v4-mega-rail__cta">Open the verdict →</span>
  </div>
</a>
```

The rail's verdict line is the only place sentences live inside the menu, and it follows BRAND-PI.md voice rules to the letter.

### V4PillarTopBanner (used inside What's On)

Surfaces temporal context above the three columns:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📅  This weekend, Sat 10 – Sun 11 May          Read the dispatch →   │
└──────────────────────────────────────────────────────────────────────────┘
```

Sage indicator dot + bold dateline + ochre CTA. Applies only to What's On's mega panel.

### V4MobileDrawer

Replaces the V2 mobile-nav overlay when V4 is mounted. Each pillar is an accordion row:

```
┌──────────────────────────────────────────────┐
│  Eat & Drink                            ↓   │  ← tap to expand
├──────────────────────────────────────────────┤
│    BY THE MEAL                              │
│    Long lunch                               │
│    Hatted dinner                            │
│    ...                                      │
│                                             │
│    BY THE PLACE                             │
│    ...                                      │
│                                             │
│    IN VOICE                                 │
│    ...                                      │
│                                             │
│    Looking for the back-roads version?      │
│    Ask PI →                                 │
├──────────────────────────────────────────────┤
│  Wine                                   →   │
├──────────────────────────────────────────────┤
│  Stay                                   →   │
└──────────────────────────────────────────────┘
```

One pillar expanded at a time. Smooth-collapse animation honours `prefers-reduced-motion`.
The image rail is hidden on mobile (no room) — replaced by a single "Editor's pick →" line that links to the rail's URL.

---

## 3. Behaviour contract

| Trigger | Behaviour |
|---|---|
| Mouse enters pillar | Panel opens after 70 ms |
| Mouse leaves pillar AND panel | Panel closes after 220 ms |
| Mouse moves between two pillars | Old panel closes, new opens — same delays |
| Pillar receives focus (Tab) | Panel opens immediately |
| Tab inside open panel | Cycles through links, then exits to next utility action |
| Escape inside open panel | Closes panel, returns focus to its pillar trigger |
| Click outside open panel | Closes panel |
| Click pillar link itself | Navigates to pillar root URL |
| `prefers-reduced-motion: reduce` | Open/close = instant, no transition |
| Touch (mobile) | Mega panel never shown — V4MobileDrawer handles it |
| Browser back from a sub-page | Pillar matching `data-section` is `aria-current="page"` |

ARIA:
- Each pillar `<a>` has `aria-haspopup="true"`, `aria-expanded="false|true"` flipped by JS.
- Each mega panel has `role="menu"` with `aria-labelledby` pointing at the pillar.
- Each mega column link has `role="menuitem"`.
- Image rail link is the first focusable inside the panel.

---

## 4. Voice rules for menu copy

Inherits BRAND-PI.md. Tightened for nav:

- **Pillar labels**: noun phrase, max two words. *Eat & Drink, Wine, Stay, Explore, Plans, What's On, Journal*.
- **Column eyebrows**: prepositional phrase, "By the X" or "In voice". Title case, set as small caps via CSS.
- **Column items**: noun phrase, max three words. *Long lunch, Cellar door, Sunset moves, Group of six+*.
- **Intro line** (top of panel): one sentence, present tense, in PI voice. *Three ways into Wine — by the venue, by the place, or by the call.*
- **Image rail verdict**: 1–2 sentences, BRAND-PI.md rules to the letter (no em-dashes, no tourism adjectives, specific over generic).
- **Ask line** (bottom of panel): one sentence, ends in *"Ask PI →"*. Asks a real question PI could answer.

Forbidden:
- Em-dashes (use commas, periods, colons, parentheses).
- Tourism-board adjectives (no *stunning, must-visit, hidden gem, perfect for, breathtaking, idyllic*).
- Sentence-form column items ("Find the best long lunch" ✗ → "Long lunch" ✓).
- Generic catch-alls ("More" ✗ → "Every venue we cover" ✓).

---

## 5. Mobile pattern

V4MobileDrawer replaces V2's full-screen mobile-nav overlay when V4 chrome is mounted.
Burger icon stays top-right of the brand row.
Drawer opens from the top, full-screen, paper surface.
Pillars listed as accordion rows.
Tap to expand inline; one open at a time; smooth collapse animation.
Inside an expanded pillar:
- Three columns stack vertically with eyebrow + 6 items each.
- Image rail collapses to a single "Editor's pick →" line at the top.
- Ask PI line at the bottom of the expanded pillar.

Footer of the drawer (always visible):
- Search input.
- Sign in / Save trip.
- Subscribe pill.

---

## 6. Documentation deliverables

1. **PILLAR-MAP.md** — every URL accounted for, every panel content listed.
2. **DESIGN-SYSTEM-V4.md** — this file.
3. **STAGING-V4.md** — what's staged, how to review, promotion plan.
4. **MENU-VOICE.md** — voice rules, distilled. Lives inside DESIGN-SYSTEM-V4.md section 4 — no separate file unless we add to it.

---

## 7. Promotion checklist (when V4 is approved to go live)

1. Swap `Masthead.astro` import in `BaseLayout.astro` → `V4Masthead.astro`. Or:
2. Promote the V4 home: `pages/v4/index.astro` → `pages/index.astro` (with V2 home archived).
3. Verify all V4 mega-menu links 200 against live URLs — no redirect work needed because they already point at live V2 pages.
4. Remove `noindex` from `V4BaseLayout`.
5. Update `Footer.astro` to V4 layout (or fork to `V4Footer`).
6. Swap mobile nav script binding to `V4MobileDrawer`.
7. Delete V2 nav data from `lib/nav.ts` once nothing imports it.

Estimated promotion effort: **30 minutes**, because nothing in the data layer changes.
