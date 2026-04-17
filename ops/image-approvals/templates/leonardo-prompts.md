# Peninsula Insider — Leonardo Prompt Library

**Status:** ready for use. No generations have been run yet.
**Authoritative style direction:** `docs/reports/peninsula-insider-generative-image-style-2026-04-09.md`
**Authoritative slot mapping:** `docs/reports/peninsula-insider-tier-a-image-plan-2026-04-09.md` §10
**Scope:** Tier A generative slots only (slots 6, 7, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50).

---

## 0. How to use this file

1. Look up the slot ID in the table of contents.
2. Copy the **Prompt** block into Leonardo's positive prompt field.
3. Copy the **Negative prompt** block into Leonardo's negative prompt field.
4. Set **Model** to the specified Leonardo model (default: **Phoenix**).
5. Set **Preset style**, **Contrast** and **Guidance** as specified.
6. Set **Aspect ratio** as specified.
7. Generate **6 variants**. No more, no less.
8. Log the variant URLs + seeds in `ops/image-approvals/generative-log/{slot-id}.jsonl`.
9. Apply the seven-point acceptance test from generative style direction §12 before building the Step 1 shortlist.
10. At most 3 variants per slot proceed to the shortlist.

**Do not freelance on prompts.** If a prompt is not producing good outputs, flag it in the calibration note and request a prompt update in this file — do not silently modify prompts during a sprint.

---

## 0.1 Standard Peninsula Insider negative prompt

This negative prompt is reused verbatim on every slot unless the slot-specific block adds to it.

```text
stock photo lifestyle, influencer pose, smiling diners, smiling models, people as the main subject, HDR, drone view, aerial perspective, hyperreal CGI, cluttered composition, bright tropical palette, visible branding, visible text, impossible architecture, warped glassware, broken cutlery, melting objects, surreal distortions, plastic sheen, overprocessed skin, cartoon, anime, fantasy aesthetic, neon, chrome, marble excess, resort brochure, travel advertising, Instagram aesthetic, Pinterest aesthetic, luxury property marketing, golden hour spectacle, sunset cliche
```

## 0.2 Standard Leonardo defaults (unless overridden per slot)

- **Model:** Phoenix
- **Preset style:** Cinematic
- **Alchemy:** off
- **Prompt Magic:** off
- **Contrast:** 3 (medium)
- **Guidance:** 6
- **Grain / filmic feel:** on where available
- **Number of variants per generation:** 6

## 0.3 Style-reference discipline

When Leonardo's Style Reference (image upload) is used, the reference image itself must be:

- A Peninsula Insider-approved sourced image already in `/next/public/images/sourced/` **or**
- A mood reference explicitly logged in `ops/image-approvals/style-references/` with a human-readable description of what the reference contributes (palette, mood, composition, texture).

The reference is never a third-party copyrighted image.

---

## Table of contents

- [#escape-hub-hero-01](#escape-hub-hero-01) — Slot 6
- [#journal-hub-hero-01](#journal-hub-hero-01) — Slot 7
- [#journal-long-lunch-01](#journal-long-lunch-01) — Slot 15 (fallback only)
- [#escape-flinders-and-cape-reset-01](#escape-flinders-and-cape-reset-01) — Slot 41
- [#escape-ridge-to-sea-two-night-escape-01](#escape-ridge-to-sea-two-night-escape-01) — Slot 42
- [#home-feature-01](#home-feature-01) — Slot 43
- [#home-this-weekend-autumn](#home-this-weekend-autumn) — Slot 44 (autumn variant)
- [#home-this-weekend-winter](#home-this-weekend-winter) — Slot 44 (winter variant)
- [#home-this-weekend-spring](#home-this-weekend-spring) — Slot 44 (spring variant)
- [#home-this-weekend-summer](#home-this-weekend-summer) — Slot 44 (summer variant)
- [#newsletter-block-bg-01](#newsletter-block-bg-01) — Slot 45
- [#journal-feature-01](#journal-feature-01) — Slot 46
- [#eat-hub-secondary-01](#eat-hub-secondary-01) — Slot 47
- [#stay-hub-secondary-01](#stay-hub-secondary-01) — Slot 48
- [#explore-hub-secondary-01](#explore-hub-secondary-01) — Slot 49
- [#wine-hub-secondary-01](#wine-hub-secondary-01) — Slot 50

---

## escape-hub-hero-01

**Slot 6** · base template A · Escape hub hero

**Prompt:**

```text
A long, slow lunch winding down at a cool-climate wine-country restaurant, linen tablecloth with soft shadows, two half-empty pinot noir glasses, one ceramic plate with crumbs and herb stems, warm late-afternoon sidelight entering from a timber-framed window, hints of vine leaves visible outside but deliberately out of focus, the moment after conversation has slowed, Mornington Peninsula-adjacent editorial mood, cream and burgundy and olive palette, off-centre composition with negative space in the upper left for a headline, soft filmic grain, illustrative rather than documentary, no people in frame, no logos, no signage, no glossy advertising aesthetic
```

**Negative prompt:** standard
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 16:9 (2400 × 1350)
**Contrast:** 3
**Guidance:** 6

---

## journal-hub-hero-01

**Slot 7** · base template F · Journal hub hero

**Prompt:**

```text
An abstract editorial texture in the tone of a premium independent travel quarterly, soft linen folds with tactile weave detail, one out-of-focus wine-glass rim at the edge of the frame, warm cream and olive palette with a touch of burgundy shadow, pale sea-fog grey in the background, a calm negative space for a word-mark to sit, soft morning side light, restrained contrast, subtle grain, illustrative and architectural rather than photographic, no people, no text, no logos, no signage
```

**Negative prompt:** standard + `"strong focal subject, high contrast"`
**Model:** Phoenix
**Preset style:** Illustrative
**Aspect ratio:** 16:9
**Contrast:** 2.5
**Guidance:** 5.5

---

## journal-long-lunch-01

**Slot 15** · **FALLBACK ONLY** · base template A · Use only if sourced candidates from Unsplash/Pexels are all cliché. Preferred source is documentary sourcing.

**Prompt:**

```text
A single editorial still of a long-lunch moment, one plate with minimal styling, a wine glass at the corner of the frame, late afternoon sidelight, linen and timber, the look of a meal that has been going for three hours, asymmetrical composition with negative space above, cream and burgundy palette, soft filmic grain, editorial illustration rather than food photography, no hands, no people, no logos, no text
```

**Negative prompt:** standard + `"top-down flatlay, overhead hands"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 16:9
**Contrast:** 3
**Guidance:** 6

---

## escape-flinders-and-cape-reset-01

**Slot 41** · base template E · Flinders and Cape itinerary

**Prompt:**

```text
A quiet, wintery coastal wine-country mood, wet basalt rocks, soft sea mist drifting across dune grass, pale overcast sky, muted stone and fog-blue palette with warm cream highlights, abstract enough to feel editorial rather than postcard, wide but intimate framing, one strong textural rhythm running through the middle of the frame, premium travel quarterly tone, illustrative not documentary, no people in frame, no horizon-heavy composition, no dramatic sunset, no drone perspective
```

**Negative prompt:** standard + `"sunset, golden hour, drone shot, horizon line"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 16:9
**Contrast:** 3
**Guidance:** 6

---

## escape-ridge-to-sea-two-night-escape-01

**Slot 42** · blended template A + D · Ridge-to-Sea itinerary

**Prompt:**

```text
A two-night-escape atmospheric cover, a breakfast table near a window that opens onto soft vineyard fog, one open book, one ceramic cup with visible steam, a stone fruit, warm side light from the left, cream and oxblood and olive palette, hints of coast visible in the far distance through the fog, off-centre composition with negative space in the upper right for a headline, soft filmic grain, editorial still-life tone, illustrative rather than documentary, no people in frame, no logos, no text, no glossy advertising look
```

**Negative prompt:** standard
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 16:9
**Contrast:** 3
**Guidance:** 6

---

## home-feature-01

**Slot 43** · base template A (feature-article variant)

**Prompt:**

```text
An editorial still of a long-lunch moment in a cool-climate wine region, a wooden table edge with linen napkin, the rim of one half-filled wine glass catching light, warm late-afternoon light, shallow depth of field, vineyard visible but deliberately out of focus in the background, cream and burgundy and olive palette, asymmetrical composition with negative space to the right for a feature-article headline, soft filmic grain, illustrative editorial tone, no people, no branding, no text, no glossy advertising aesthetic
```

**Negative prompt:** standard
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 3:2 (2100 × 1400)
**Contrast:** 3
**Guidance:** 6

---

## home-this-weekend-autumn

**Slot 44** · autumn variant · base template D

**Prompt:**

```text
An autumn afternoon mood on the Mornington Peninsula, a damp timber deck at the edge of a vineyard, one ceramic cup of coffee with visible steam, a linen throw folded at the edge of the frame, overcast diffused light, vineyard leaves in the distance turning copper and gold but muted rather than vibrant, soft grey-blue sky, editorial travel-quarterly tone, calm negative space on the right for a small caption, soft grain, illustrative and atmospheric rather than photographic, no people, no text, no branding
```

**Negative prompt:** standard + `"vibrant autumn colour, Vermont foliage, orange saturation"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 21:9 (3200 × 1350)
**Contrast:** 3
**Guidance:** 6

---

## home-this-weekend-winter

**Slot 44** · winter variant · base template B

**Prompt:**

```text
A winter afternoon mood on the Mornington Peninsula, a fogged window looking out onto wet vineyard rows, a dark timber table in the foreground, one ceramic cup of coffee, a folded paperback, diffuse grey daylight, muted fog-blue and charcoal palette with warm cream highlights, intimate framing, one clear focal point, soft grain, illustrative travel-quarterly tone, no people, no text, no branding, no cosy-cabin excess
```

**Negative prompt:** standard + `"cosy cabin cliche, warm orange fire glow, Christmas"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 21:9
**Contrast:** 3
**Guidance:** 6

---

## home-this-weekend-spring

**Slot 44** · spring variant · base template E

**Prompt:**

```text
A spring morning mood on the Mornington Peninsula, soft sea mist drifting through dune grass and low coastal scrub, pale overcast sky giving way to a single patch of warm light, muted olive and fog-blue palette, one small curving track in the middle distance, wide and intimate framing, editorial travel-quarterly tone, calm negative space to the right, soft grain, illustrative and atmospheric, no people, no text, no branding, no spring flower spectacle
```

**Negative prompt:** standard + `"wildflower meadow spectacle, cherry blossom, bright green, saturated spring"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 21:9
**Contrast:** 3
**Guidance:** 6

---

## home-this-weekend-summer

**Slot 44** · summer variant · base template A-adapted

**Prompt:**

```text
A late-summer afternoon mood on the Mornington Peninsula, a linen tablecloth on a timber table at the edge of a garden, one glass of pale white wine with condensation, olive leaves moving in a soft breeze, warm diffuse light rather than hard midday sun, muted cream and olive palette, intimate framing with negative space to the right, soft filmic grain, editorial travel-quarterly tone, no people, no text, no branding, no beach party, no bright tropical blues
```

**Negative prompt:** standard + `"beach, swimwear, tropical blue, hard midday sun"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 21:9
**Contrast:** 3
**Guidance:** 6

---

## newsletter-block-bg-01

**Slot 45** · base template F · newsletter background

**Prompt:**

```text
A very subtle editorial background texture, folded cream linen with shallow morning shadow, a hint of out-of-focus vine leaf at the corner of the frame, warm soft morning light, negative space dominant, designed to sit behind small body copy without competing, muted cream and olive palette, restrained low contrast, soft grain, abstract rather than scenic, no people, no text, no logos, no focal drama
```

**Negative prompt:** standard + `"strong focal subject, high contrast, dramatic composition"`
**Model:** Phoenix or Leonardo Diffusion XL
**Preset style:** Illustrative
**Aspect ratio:** 16:9
**Contrast:** 2
**Guidance:** 5

---

## journal-feature-01

**Slot 46** · base template A adapted for feature card

**Prompt:**

```text
An editorial cover still for a travel journal feature, a timber table edge with linen, one ceramic bowl with visible steam, warm late-afternoon light, subtle hints of vineyard outside an out-of-focus window, cream and burgundy and olive palette, asymmetrical composition with negative space on the right for a feature headline, soft filmic grain, illustrative rather than documentary, no people, no logos, no text, no glossy advertising look
```

**Negative prompt:** standard
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 3:2
**Contrast:** 3
**Guidance:** 6

---

## eat-hub-secondary-01

**Slot 47** · base template A · secondary module

**Prompt:**

```text
A close editorial still of a hand-thrown ceramic plate with one simple element on it, warm sidelight, a linen napkin at the edge, wooden table grain visible, cream and olive and burgundy palette, shallow depth of field, asymmetrical composition with negative space above, soft filmic grain, illustrative rather than food photography, no hands, no people, no text, no branding
```

**Negative prompt:** standard + `"top-down flatlay, overhead hands, chef holding"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 4:5
**Contrast:** 3
**Guidance:** 6

---

## stay-hub-secondary-01

**Slot 48** · base template C adapted for interior · secondary module

**Prompt:**

```text
An intimate interior corner of a design-led country hotel, warm timber and matte plaster, one linen-covered reading chair, pale light through a timber-framed window, a book and a ceramic cup on a side table, cream and olive palette with charcoal accents, composition with strong negative space, soft filmic grain, editorial still-life tone, illustrative rather than marketing photography, no people, no logos, no text
```

**Negative prompt:** standard + `"infinity pool, chrome, luxury ad, hotel bed staged"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 4:5
**Contrast:** 3
**Guidance:** 6

---

## explore-hub-secondary-01

**Slot 49** · base template E · secondary module

**Prompt:**

```text
A coastal texture study, wet basalt rock edge, sea mist drifting low, dune grass in the foreground, pale overcast light, abstract enough to sit as a secondary editorial module, muted stone and fog-blue palette, strong textural rhythm, soft grain, illustrative travel-quarterly tone, no people, no horizon drama, no sunset, no text, no branding
```

**Negative prompt:** standard + `"sunset, dramatic horizon, drone, golden hour"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 4:5
**Contrast:** 3
**Guidance:** 6

---

## wine-hub-secondary-01

**Slot 50** · base template D · secondary module

**Prompt:**

```text
A very close editorial texture study of a cool-climate vine leaf at first light, soft fog in the background, damp earth just visible, muted olive with a touch of burgundy from a fruit bud, pale sky, shallow depth of field, intimate framing, soft grain, illustrative travel-quarterly tone, restrained contrast, no people, no text, no branding, no postcard spectacle
```

**Negative prompt:** standard + `"harvest imagery, bunches of grapes, postcard spectacle"`
**Model:** Phoenix
**Preset style:** Cinematic
**Aspect ratio:** 4:5
**Contrast:** 3
**Guidance:** 6

---

## Appendix — modifier dials (global)

Apply these to any prompt by appending to the end, **one at a time**. Never stack modifiers.

### Mood dials
- ` more autumnal`
- ` quieter and more editorial`
- ` less romantic, more grounded`
- ` slightly more rustic`
- ` more wine-country than seaside`
- ` more sea-fog than sunshine`
- ` more negative space for typography`

### Composition dials
- ` closer crop with more tactile material detail`
- ` wider frame with fewer objects`
- ` reduce to one dominant form`
- ` add soft foreground blur`

### Palette dials
- ` reduce saturation by twenty percent`
- ` shift toward oat, olive, burgundy, fog-grey`
- ` remove bright blues and bright greens`
- ` warmer highlights, cooler shadows`

### Anti-cliché dials
- ` avoid resort imagery`
- ` avoid staged lifestyle`
- ` avoid social media travel aesthetic`
- ` avoid sunset spectacle`
- ` avoid Instagram brunch styling`

---

*Prepared 9 April 2026. Aligned with the generative style direction document (§9–§11) and the Tier A image plan (§10). Update this file only via a calibration note that explains why.*
