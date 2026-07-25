---
title: "Visual Design & Brand Aesthetic Review — peninsulainsider.com.au"
type: design-review
status: proposal
version: 1.0
established: 2026-07-25
reviewed-build: "v6 Evergreen Coast (next/src @ 973b94a), rendered locally at 1440×900 and 390×844"
extends:
  - docs/peninsula-insider-brand-operating-system.md
  - BRAND-PI.md
  - next/src/styles/v6-tokens.css
tags: [peninsula-insider, design, brand, visual-identity, review]
---

# Visual Design & Brand Aesthetic Review

**Reviewed:** 25 July 2026 · v6 "Evergreen Coast" · desktop (1440) + mobile (390)
**Surfaces reviewed:** home, Eat & Drink hub, Stay hub, Wine hub, Journal hub, venue detail (Allis Wine Bar), stay detail (Alba), feature article (A Flinders Weekend), plan (Red Hill Saturday), What's On, About, The Insider Note, Pass, Partner, Awards.

---

## 1. Executive summary

Peninsula Insider has a **top-decile brand strategy and a mid-tier visual identity**, and the gap between them is now the single biggest constraint on how the masthead is perceived.

The Brand Operating System is genuinely excellent. The positioning — *"the resident editor of the Mornington Peninsula"* — is sharp, defensible, and correctly defined by refusal. The competitive map names tourism boards as cluster #1 and states plainly: *"Every editorial decision is a refusal to drift into any of the clusters above."* The copy on the live site honours it. "41 cellar doors, ranked by the pour, not the view." "36 stays, from shack to cliff house." "One lunch that works with children (the brewery), and one beach that forgives everything." That is writing no competitor in this market is producing.

The visual identity does the opposite. The v6 design generation is described in its own token file as:

> *"A faithful lift of the Destination Vancouver design system, tuned to the Mornington Peninsula."*

Destination Vancouver is a destination marketing organisation. It is, structurally, the exact category the BOS defines the brand against. The masthead now **writes like a publisher and looks like a tourism board.** Every other finding in this review is downstream of that one.

Three compounding problems:

1. **The palette describes the wrong place.** Forest evergreen `#00362C`, electric mint `#A7FFEB`, and Pacific teal are Pacific Northwest colours. The Mornington Peninsula is warm-temperate maritime: limestone, moonah scrub, ti-tree, golden sand, basalt, kelp, salt haze. The site's own best photograph — the back-beach aerial on `/about/` — is warm sand against ocean teal, and it fights the chrome around it.

2. **Removing the serif removed the masthead.** v6 states "No serif. No grain." The serif wordmark was the single strongest signal separating Peninsula Insider from a DMO. Sora + Figtree is the default startup pairing of the last three years. It is a competent, invisible, unattributable choice.

3. **The migration deleted the two most ownable assets on the site.** The v5 build carried a live conditions strip — `SORRENTO 16°C · SUNSET 5:48 PM · BAY GLASSY, TIDE LOW` — and an issue line, `WINTER INSIDER · JULY 2026`. Nothing any competitor has. Both components still exist in the codebase (`components/UtilityBar.astro`, `components/Masthead.astro`); they are simply no longer rendered. That is the most valuable, lowest-effort recovery available.

Underneath the skin, the build is **v5 component architecture wearing a v6 token coat** (`BaseLayout.astro` renders `V5Masthead`, `V5Footer`, `V5BottomBar`). That is why it reads as a reskin rather than a design: 17,444 lines of CSS across 12 files, four surviving token generations, 42 distinct button/CTA class families, and no shared `.btn` or `.card` primitive anywhere in `global.css`.

**The good news:** the hard part is done. Positioning, voice, editorial standards, information architecture, and accessibility are all in good shape. What is missing is art direction. This is a recoverable problem, and most of the value sits in the first two tiers of the roadmap.

---

## 2. Scores

| Dimension | Score | Rationale |
|---|---|---|
| **Overall aesthetic** | **5.5 / 10** | Clean, competent, well-spaced, accessible. Also anonymous. Nothing is broken; nothing is memorable. |
| **Brand consistency** | **4 / 10** | The visual system contradicts the brand's own positioning document. Warm and cool palettes coexist on a single scroll. Four token generations live simultaneously. |
| **Premium perception** | **4.5 / 10** | Typography and spacing say "considered." Photography says "SEO travel blog." The photography sets the ceiling and it is set low. |
| **Distinctiveness** | **3 / 10** | Self-declared lift of another organisation's design system. Remove the wordmark and this could be any regional tourism site on earth. |

**Where it sits, ordinary → exceptional:** roughly the **55th percentile** of regional travel/lifestyle publishing. Above council and real-estate content. Below Broadsheet — its named competitor — on craft. Nowhere near the mastheads the positioning implies (Monocle, Cereal, The Gourmand, Wallpaper City Guides, FT Weekend).

The copy, judged alone, is an **8.5**. That spread is the whole problem.

---

## 3. Visual strengths

Worth protecting through any redesign.

- **Voice-in-layout.** Section labels and taglines carry real editorial personality: "THE SHORT LIST", "THE SIX · THIS MONTH", "Six tables worth planning around this month", "Everything on this weekend →". This is the brand doing its job.
- **Accessibility is genuinely strong.** Measured contrast: mint on deep evergreen 11.6:1; ink on mint 14.4:1; evergreen on white 8.2:1; metadata `#4A5A57` on white 7.3:1 and on `--bg-alt` 6.4:1. AA-safe text cuts are pre-computed (`--gold-text`, `--signal-text`, `--sage-text`). Focus ring system is tokenised with a light/dark inverse. Reduced-motion collapses durations to zero. Reader text-scale control respects browser font size. This is better than most commercial sites.
- **The About page headline** — *"The opinionated guide to the Mornington Peninsula."* set two-tone in ink and evergreen — is the single best piece of design on the site. It is what the homepage headline should be.
- **The eyebrow-plus-hairline motif** (`— SLOW PENINSULA | 4 APRIL 2026 | 7 MIN READ`) is properly magazine-like.
- **Caption-over-image treatment** (`PENINSULA INSIDER · THE BACK BEACH`) is restrained and correct.
- **The Insider Note module** — dark ground, stacked preview card, honest sub-copy ("No sponsors in the copy, no affiliate links") — is the most convincing commercial surface on the site.
- **Type scale and spacing tokens are well built.** Nine clamped sizes, a 4px spacing scale, sensible measures (68ch prose, 52ch dek, 38ch card). The system is sound; the styling on top of it is not.

---

## 4. Visual weaknesses

### 4.1 The identity is borrowed

- Self-declared lift of a DMO design system, in direct contradiction of the BOS competitive map.
- Fonts are open substitutes for the reference's licensed faces ("Sora for the Nohemi-style display, Figtree for the Proxima-style body"). The brand is wearing a copy of a costume.
- `"The Mornington Peninsula, sorted."` is a tourism-board headline: a claim of comprehensiveness rather than a point of view. The masthead's actual differentiator is the opposite — selection and verdict.
- **No visual motifs exist.** Not one. No repeating graphic device, no ownable rule, no mark, no texture, no pattern. This is the clearest structural reason the site would not be recognisable without the logo.

### 4.2 Photography — the single largest drag on premium perception

- **Mixed provenance, no grade.** Stock, supplier images, and phone snapshots sit side by side untouched.
- **Colour temperature clashes with the palette.** A magenta spa towel and an amber-lit wedding barn both appear full-bleed against an evergreen/mint system. The warm apricot "25–26 July" chip on mobile is a further palette leak.
- **Flagship slots carry weak images.** The "Featured plan" hero is an Arthurs Seat snapshot including a car park, powerlines and a bin, shot in harsh midday light. The Flinders feature hero is a flat blue-sky phone photo with a metal handrail in the corner.
- **Wrong subjects.** The Stay door tile shows a restaurant dining room. The Wine tile is a grape close-up — the most clichéd wine image available.
- **Mid-day blue-sky dominates.** The Peninsula's actual light is low, raking and salted. The library shows almost none of it.
- **Missing images render as empty cards** inside flagship modules (the third card in "Six tables worth planning around").

### 4.3 Layout and composition

- **Chronic dead canvas at desktop.** Venue detail uses ~43% of a 1440px viewport with the entire right half empty. "Featured plan" renders as a single 540px card floating in a 1440px field. Article heroes leave ~100px of unexplained space between breadcrumb and eyebrow.
- **Axis breaks mid-page.** Article heroes are a left-weighted split; the body switches to a centred column. The page has no spine.
- **The dark-scrim hero is used on every hub.** Home, Eat, Stay, Wine, Journal all open with a photograph drowned under a flat evergreen wash. On the Eat hub the image is unreadable — it contributes noise, not atmosphere. Repetition has turned the site's signature gesture into monotony.
- **Footer columns are wildly unequal** (7 items / 4 / 4 / 2), producing a tall, sparse, bottom-heavy close.
- **The cookie banner consumes ~15% of every first impression** and is the first thing rendered over the hero.

### 4.4 Components and craft

- **42 distinct button/CTA class families**, including live `v3-btn`, `v3-btn--ghost`, `v3-btn--vine`, `v4-iconbtn`, `v4-subscribe-cta` alongside per-component one-offs (`.venue-detail__book-btn`, `.venues__more-btn`, `.article__share-btn`). **No shared `.btn` or `.card` primitive exists.**
- **Three button languages on one journey.** Home: mint fill, sentence case, 8px radius. Home secondary: white ghost, 999px pill. Venue: solid evergreen, UPPERCASE LETTERSPACED, near-square. The uppercase-letterspaced button reads distinctly 2016.
- **The phone-number button on venue pages looks disabled** — bordered box, grey text, no affordance.
- **Card hairlines are effectively invisible.** `--border: #D6DDDB` is 1.38:1 against white. Cards float without definition, which is why the layout reads flat.
- **Card bottoms don't resolve.** Deks run 3–5 lines unclamped; metadata rows carry inconsistent fields (one card shows a date, one shows "Free", one shows nothing), producing ragged internal spacing.
- **16px radii everywhere is a SaaS tell**, and it is applied inconsistently — article hero images are square-cornered while cards are rounded.
- **The "WORTH KNOWING" panel is unresolved**: squared left edge with an evergreen border, rounded right edge with a shadow.
- **Redundant labelling.** Three cards in an events module each stamped "EVENT".
- **A visible content bug ships to the page:** venue "FILED UNDER" renders `First Date · Slow · Solo · All Year · Couples · Solo` — "Solo" twice.

### 4.5 Motion

- ScrollReveal fades essentially all below-fold content in on scroll. It is the generic "fade up 20px" pattern, it is fragile (a full-page render captures blank regions), and it references nothing about the brand.
- No motion anywhere expresses the subject: water, tide, horizon, weather, light.

### 4.6 Article reading experience

Long-form runs as an unbroken single column of 17px Figtree with evergreen subheads. **No drop caps, no pull quotes, no marginalia, no inline images, no rules, no verdict treatment.** For a masthead whose core differentiator is the verdict, the verdict has no visual form at all. The reading experience is plainer than a default Substack.

---

## 5. Would it be recognisable without the logo?

**No.** Tested honestly against the criteria:

| Criterion | Verdict |
|---|---|
| Unique visual language | ✗ Explicitly borrowed from a named DMO system |
| Recognisable design system | ✗ Four token generations, 42 button families, no primitives |
| Strong visual motifs | ✗ None exist |
| Consistent colour and type | ~ Type is consistent; colour leaks warm in three places |
| Memorable personality | ✗ In the copy, not in the design |
| Premium finish | ✗ Photography sets the ceiling |
| Differentiated from competitors | ✗ Reads as the category it defines itself against |

The site is a well-executed template. The tell is not any single element — it is the **absence of anything that could only be Peninsula Insider.**

---

## 6. Before → after design rationale

| | **Now (v6 Evergreen Coast)** | **Proposed (Salt & Limestone)** | **Why** |
|---|---|---|---|
| **Ground** | White + sea-fog grey `#EEF1F1` | Limestone paper `#F4F0E8` | Paper reads as publication. White reads as software. The cliffs are literally limestone. |
| **Primary** | Forest evergreen `#00362C` | Bass Strait `#123A3A` | Keeps a cool anchor but moves it oceanic rather than alpine. |
| **Accent** | Electric mint `#A7FFEB` | Ti-tree rust `#A0541F` | Mint is the most Vancouver element in the system. Rust was the v5 accent and it was right. Retire mint entirely. |
| **Secondary** | Teal `#079EA5` | Moonah `#6F7A5E` | Grey-green coastal scrub. Nobody else in the category owns it. |
| **Display type** | Sora (geometric sans) | Editorial serif — Fraunces (variable, optical sizing, low wonk) | The serif is the masthead. Removing it removed the argument. |
| **Body type** | Figtree | Figtree, demoted to UI only; long-form set in the serif's text optical size | Articles should read as printed, interface should read as software. |
| **Hero** | Full-bleed photo under flat dark wash, on every hub | Type-led on limestone paper; photography as a full-bleed *break* mid-page | Type-led openings are what separate mastheads from DMOs. |
| **Motifs** | None | Tide rule · conditions strip · issue stamp · verdict mark · coastline contour | Recognisability is built from repeated devices, not from a logo. |
| **Radii** | 16px everywhere | 2px on media, 0 on panels | Near-square reads printed. 16px reads SaaS. Committing fully in either direction beats splitting. |
| **Buttons** | 42 class families, 3 visual languages | One primitive, three variants, sentence case | Consistency is the cheapest premium signal available. |
| **Motion** | Fade-up on everything | Ken-burns on hero only; tide-line draw on dividers; horizon wipe on transition | Motion should reference water and horizon, or not exist. |

---

## 7. The creative direction — "Salt & Limestone"

**One line:** *A printed regional masthead that happens to live on the web.*

Peninsula Insider should feel like picking up a well-made quarterly that someone who actually lives on the Peninsula edits — not like browsing a destination portal. Reference points for craft and register, not for copying: **Monocle** (masthead furniture, dense but calm), **The Gourmand** (art direction as argument), **Cereal** (restraint, photographic discipline), **Wallpaper City Guides** (verdict-led service journalism), **FT Weekend** (paper ground, serif authority, useful density).

### Palette — "Salt & Limestone"

| Role | Token | Hex | Use |
|---|---|---|---|
| Paper | `--limestone` | `#F4F0E8` | Primary ground. Replaces white and sea-fog. |
| Ink | `--ink` | `#14140F` | Masthead, headlines, body. Near-black, green cast. |
| Deep | `--bass-strait` | `#123A3A` | Dark grounds, footer, night sections. |
| Signal | `--ti-tree` | `#A0541F` | The single warm accent. Verdicts, live/now, one key CTA. |
| Secondary | `--moonah` | `#6F7A5E` | Grey-green scrub. Rules, metadata, quiet fills. |
| Depth | `--kelp` | `#2C3A2E` | Deep neutral for panels and image scrims. |
| Salt | `--salt` | `#FFFFFF` | Card grounds and reversed type only. |

**Retire:** mint `#A7FFEB` entirely, and the sea-fog grey `#EEF1F1` as a section ground. **Rule:** one warm accent, one cool ground, everything else neutral. No third accent.

### Typography

- **Display / masthead:** **Fraunces** — variable, free, optical sizing, and a "wonk" axis that gives it a hand-cut quality suited to a coastal masthead. Set at low wonk and high optical size for headlines. (Licensed alternatives if budget allows: GT Sectra, Editorial New.)
- **Long-form body:** Fraunces at text optical size, 18px, 1.6.
- **UI / navigation / metadata:** Figtree stays, demoted to interface only.
- **Kill Sora.** It is the single clearest tell that this is a template.
- **Kill uppercase-letterspaced buttons.** Reserve letterspaced caps for eyebrows and the conditions strip only.

### Visual motifs — the missing layer

1. **The tide rule.** A hairline section divider that isn't straight — a shallow sine curve, 1px, in moonah. Used at every section break. Ownable, printable, scales to any width, costs nothing.
2. **The conditions strip.** Reinstate and elevate. `SORRENTO 16° · SUNSET 5:48 · BAY GLASSY, TIDE LOW`, set in serif small caps as the first element on every page. **Live, local, sensory data as masthead furniture is something no competitor has.** This single element does more for recognisability than a logo redesign would.
3. **The issue stamp.** `WINTER INSIDER · JULY 2026` as a corner dateline. Makes the site an *edition* rather than a database.
4. **The verdict mark.** The Critic archetype needs a visual form. A small letterpress-style ti-tree bracket that appears wherever the masthead stakes a call. Turns the brand's core differentiator into a repeatable graphic asset.
5. **Coastline contour.** The Peninsula's outline is one of the most recognisable shapes in Victoria. Use it debossed as background texture, as section transitions, and as the map affordance.

### Photography direction

The highest-leverage change on this list.

- **One grade, applied to the entire library.** Warm highlights, cool-green shadows, lifted blacks, desaturated greens, sand protected.
- **Light discipline.** Golden hour and overcast only. Ban harsh midday blue-sky.
- **Subject rules.** People at human scale — backs, hands, mid-action, never posed. Shoot the *specific* thing the copy names (the table, the bar, the gravel road), not the wide establishing shot. The writing is specific; the photography must match it.
- **Kill every stock image.** A stock spa photo with a magenta towel destroys more brand equity than a missing image does.
- **Crop discipline.** 4:5 cards, 3:2 features, 21:9 section breaks. No squares.
- **Never ship an empty image slot in a flagship module.** Fall back to a typographic card on limestone.

### Layout principles

- **One full-bleed hero per page, maximum.** Hubs open type-led on limestone; photography arrives as a full-bleed break mid-page where it lands with force.
- **Move to a 12-column asymmetric grid with a live outer margin.** Captions, verdicts, conditions and datelines hang in the outer column. This solves the dead-canvas problem and reads as designed rather than templated.
- **Editorial rhythm for long-form:** standfirst → drop cap → body → pull quote → verdict block → image break → body.
- **Cap the prose measure at 68ch** (already tokenised) but let images, verdicts and pull quotes break the measure.

### Component styling

- One `.btn` primitive, three variants: **solid ink**, **ghost**, **text-link-with-rule**. One size scale. Sentence case throughout.
- Cards: raise hairlines to a visible limestone rule (target ≥3:1), **drop shadows entirely**, let the paper ground separate content.
- Clamp card deks to two lines so bottoms align. Normalise metadata to a fixed field set.
- Radii: 2px media, 0 panels.

### Motion

- No entrance animation on text. Text should be present when the page is.
- Slow ken-burns on hero imagery only.
- Tide-line draw on section dividers.
- Page transitions wipe on the horizontal axis — a horizon line.

### Emotional tone

**Salt-aired, low-lit, unhurried, certain.** The feeling of someone who lives here putting a hand on your shoulder and saying "not that one — this one." Confident without volume. Warm without gush. Specific enough that you trust it.

---

## 8. Prioritised roadmap

### Tier 1 — Quick visual wins (days)

| # | Change | Why it matters | Perception impact | Effort |
|---|---|---|---|---|
| 1 | **Reinstate the conditions strip and issue stamp.** Components already exist (`UtilityBar.astro`, `Masthead.astro`); wire into `V5Masthead`. | Recovers the two most ownable assets on the site, deleted in the v6 migration. | **Very high** | **Very low** |
| 2 | **Retire mint `#A7FFEB`.** Replace with ti-tree rust as the single accent. | Mint is the most identifiably borrowed element in the system. | High | Very low |
| 3 | **Fix the palette leaks.** Warm-dark newsletter band `#221810` → `--bass-strait`; warm apricot date chip → limestone/rust. | Two colour worlds on one scroll reads as unfinished. | Medium | Very low |
| 4 | **Raise `--border` to a visible rule** (≥3:1) and drop card shadows. | Cards currently float without definition; this is the flatness. | Medium | Very low |
| 5 | **Clamp card deks to 2 lines; normalise card metadata fields.** | Ragged card bottoms are the most visible craft failure in every grid. | Medium | Low |
| 6 | **Remove the duplicate "Solo" tag** and audit `FILED UNDER` for repeats. | A visible data bug on a flagship template. | Low | Very low |
| 7 | **Shrink the cookie banner to a corner toast.** | It currently consumes ~15% of every first impression. | Medium | Low |
| 8 | **Delete the third "EVENT" eyebrow** where the section already declares the type. | Redundant labelling reads as automated. | Low | Very low |

### Tier 2 — Medium complexity (1–3 weeks)

| # | Change | Why it matters | Perception impact | Effort |
|---|---|---|---|---|
| 9 | **Swap the palette to Salt & Limestone.** Retarget the seven core role tokens in `global.css :root`; existing legacy aliases carry ~185 references automatically. | Moves the identity to the actual landscape. The token architecture already supports a single-point swap. | **Very high** | Medium |
| 10 | **Reinstate a serif for display.** Fraunces variable, self-hosted alongside Figtree. | The serif is the masthead. This is the difference between "publication" and "portal". | **Very high** | Medium |
| 11 | **Collapse 42 button classes to one primitive + three variants.** Sentence case, single size scale. | Consistency is the cheapest premium signal available. | High | Medium |
| 12 | **One image grade across the entire library.** Golden-hour/overcast selection pass; cull every stock image. | Photography is the current ceiling on premium perception. | **Very high** | Medium–High |
| 13 | **Fix desktop dead canvas** on venue detail and Featured Plan — move to the asymmetric grid with a live outer margin. | Currently ~57% of a 1440px viewport is empty on key templates. | High | Medium |
| 14 | **Break up the article body:** drop cap, pull quotes, verdict block, inline images. | The verdict — the brand's core differentiator — currently has no visual form. | High | Medium |
| 15 | **Replace ScrollReveal fade-up** with no-animation text + hero ken-burns. | Removes a generic pattern and a rendering fragility at once. | Medium | Low–Medium |

### Tier 3 — Major design enhancements (1–2 months)

| # | Change | Why it matters | Perception impact | Effort |
|---|---|---|---|---|
| 16 | **Build the motif system:** tide rule, verdict mark, issue stamp, coastline contour. | The single structural reason the site isn't recognisable. Motifs, not logos, create recall. | **Very high** | High |
| 17 | **Rebuild hub heroes type-led on limestone**, photography as a mid-page break. Retire the universal dark scrim. | Removes the most DMO-like gesture on the site. | **Very high** | High |
| 18 | **Retire the v3/v4/v5 component generations.** Consolidate `V5*` chrome onto v6 tokens properly; delete dead stylesheets. | 17,444 lines across 12 files and four token generations is why consistency drifts. | Medium (high internally) | High |
| 19 | **Commission a Peninsula photography shoot** — 150–200 frames, one photographer, one grade, shot to the subject rules. | Ends stock dependency permanently and locks the art direction. | **Very high** | High |
| 20 | **Rework the homepage headline** from "The Mornington Peninsula, sorted." to a verdict-led line in the register of the About page. | The current line makes a tourism-board claim; the brand's differentiator is selection. | High | Low (copy) / Medium (design) |

### Tier 4 — Long-term brand evolution (3–12 months)

| # | Change | Why it matters |
|---|---|---|
| 21 | **Commission a custom or licensed display face** (GT Sectra, Editorial New, or a bespoke masthead cut). Type ownership is the most durable identity asset a publication can hold. |
| 22 | **Design the print edition.** The Insider Note as a quarterly. Print forces art-direction discipline that flows back to the web, and it makes "masthead" literal. |
| 23 | **Give PI a proper visual system.** The character spec is strong and the marks exist (`pi-avatar.svg`, `pi-mark.svg`); PI currently has no presence in the v6 design language. |
| 24 | **Extend Salt & Limestone across newsletter, social, partner kit, awards, and Pass** so the system is provable off-site. |
| 25 | **Formalise a design system doc + Figma library** with the motif set, so the next generation is an evolution rather than another lift. |

---

## 9. The one-paragraph vision

Peninsula Insider should look like the thing it already sounds like: **a coastal masthead with a point of view.** Limestone paper, salt-washed photography shot in low raking light, a serif with enough character to be recognised at a glance, and a warm ti-tree accent used sparingly enough that it always means something. It opens with the weather and the tide because someone who actually lives here would tell you that first. It carries an issue date because it is an edition, not a database. Its section breaks are drawn like a tide line. Where it stakes a verdict, it marks it. The photography is disciplined enough that you would recognise a Peninsula Insider frame in someone else's feed. Nothing on the page performs enthusiasm; the confidence is in the restraint and the specificity. It should feel less like a destination portal and more like a well-made quarterly you would keep — and it should be impossible to mistake for anyone else, with or without the logo.

---

## 10. Appendix — evidence

**Method.** `next/` built and served locally via `astro dev`; access gate bypassed via `localStorage['pi-access-v1']`; 16 routes captured at 1440×900 and 390×844, plus progressive scroll capture of 8 templates. Contrast ratios computed from token values in `v6-tokens.css` and `global.css :root`.

**Key measurements.**

- CSS: 17,444 lines across 12 stylesheets (`global.css` alone is 11,041).
- Token generations live: v3, v4, v5 aliases, v6.
- Button/CTA class families: 42. Shared `.btn` primitive: none. Shared `.card` primitive: none.
- Active chrome: `V5Masthead`, `V5Footer`, `V5BottomBar`, `V5MobileDrawer` — v5 components on v6 tokens.
- Orphaned assets: `components/UtilityBar.astro`, `components/Masthead.astro` (conditions strip + issue stamp).
- `--border #D6DDDB` on white: **1.38:1** — effectively invisible.
- Venue detail content width at 1440px: ~620px (~43% of viewport).
- Contrast passes: mint/deep 11.6:1 · ink/mint 14.4:1 · evergreen/white 8.2:1 · soft/white 7.3:1 · soft/bg-alt 6.4:1 · teal-text/white 5.05:1.

**Repo note (not a design finding).** The site deploys `next/dist` → `gh-pages` via CI, so the live site is correctly v6. The committed build artefacts at the repo root are a stale v5-era copy (root `index.html` still carries the "Sorrento Solstice Festival" hero and a warm `#A0541F` palette). Worth pruning or refreshing to avoid future reviews auditing the wrong build — as this one initially did.
