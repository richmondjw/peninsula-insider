# Peninsula Insider — Image Relevance Operating Model

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 14 April 2026  
**Status:** Approved execution model  
**Purpose:** Institutionalise how Peninsula Insider sources, grades, audits, fixes, and continuously maintains image relevance so visuals always match the content they sit with.

---

## 1. Decision

Peninsula Insider will treat imagery as a **semantic editorial system**, not decoration.

That means every image must be judged against:
- the title
- the object/category
- the place
- the mood
- the surface it appears on
- neighbouring images in the same rail

This is now part of the publication operating model.

---

## 2. The problem we are solving

The current failure pattern is consistent:
- grapes on strawberry content
- beachsides on thermal springs cards
- generic place postcards on specific event/activity cards
- repeat images across different live event cards
- attractive Peninsula imagery that does not actually support the title beside it

The issue is not simply visual quality.
The issue is **image-to-content mismatch**.

That is a trust problem.

If the card title says one thing and the image says another, the product feels careless.

---

## 3. Core principle

### The rule
**An image must match the promise of the content it represents.**

Not just the region.
Not just the mood.
Not just the brand palette.

It must support the specific thing being shown.

---

## 4. New dedicated role

## Recommended desk / agent
Create a dedicated visual relevance desk:

# **PI-image-desk**

### Role
Own image-to-content relevance across Peninsula Insider.

### Mandate
- grade image relevance
- detect duplicate-image collisions
- recommend stronger semantic replacements
- maintain fallback image buckets by content type
- stop mismatched visuals from reaching or staying on live surfaces

### Scope
- event cards
- article hero images
- experience hero images
- venue/stay hero images where needed
- homepage / What’s On / Journal / discovery rails

### Working relationship
- **Pixel** owns visual execution and design quality
- **PI-image-desk** owns semantic image relevance
- **Verify / QA** owns the gate that checks whether the image is actually right before publish

This should not sit only with Pixel.
Pixel should help implement and source, but the problem is partly editorial semantics, not just design.

---

## 5. Recommended ownership model

### PI-image-desk owns
- image relevance scoring
- duplicate detection
- replacement recommendations
- fallback bucket assignment
- live mismatch audits

### Pixel owns
- visual quality and consistency
- crop quality
- image presentation
- implementation of approved swaps
- visual coherence across rails

### Editorial desks own
- whether the chosen image supports the actual editorial promise
- context nuance for events, golf, family, long lunch, etc.

### Verify / QA owns
- final publish gate check:
  - does the image match the card title?
  - does it match the type of thing?
  - is there a duplicate collision nearby?

---

## 6. Relevance scoring system

Every image is graded as:

## High match
Criteria:
- clearly depicts the thing or a strong visual equivalent
- supports title, place, and category well
- no noticeable semantic dissonance

Examples:
- golf article with links/fairway image
- thermal springs event with pools / bathing / spa architecture
- market event with stalls / produce / crowd
- strawberry farm with strawberries / picking / farm rows

Action:
- leave live

## Medium match
Criteria:
- image is regionally or emotionally relevant but not specific enough
- no obvious false cue, but the title deserves a stronger match

Examples:
- generic vineyard image on a wine-weekend card
- nice Peninsula landscape on a service article that promises something very specific

Action:
- queue for refinement
- not urgent unless on a top surface

## Low match
Criteria:
- image shows the wrong object/category
- image strongly misleads or feels obviously off
- duplicate usage creates poor trust or cheapens the rail

Examples:
- grapes on strawberry farm card
- beach on thermal springs card
- place postcard on chocolatier class
- identical image repeated on different event types in same rail

Action:
- urgent replacement on live surfaces

---

## 7. Duplicate-image collision rules

### Rule 1
No repeated hero image across distinct live **event cards** on the same active rail.

### Rule 2
No repeated image across homepage + What’s On lead event modules unless the event is genuinely the same product family and the reuse is intentional.

### Rule 3
If the image is semantically weak **and** duplicated, it becomes immediate Tier A replacement.

---

## 8. Image audit criteria

The image desk should score every image against five checks.

## A. Object match
Does the image show the thing the title is about?

## B. Category match
Does the image match the content type?
Examples:
- event
- market
- golf
- thermal/wellness
- family activity
- chocolatier class
- winery / cellar door
- long lunch

## C. Place match
If the title is place-led, does the image reinforce the place appropriately?

## D. Mood match
Does the image suit the emotional/editorial promise?

## E. Surface fit
Is the image good enough for the surface it is on?
Homepage and What’s On require a much higher bar than archive pieces.

---

## 9. Fallback image bucket system

To avoid bad stand-ins, build semantic fallback libraries for:
- **thermal / wellness**
- **market / produce**
- **family activity**
- **wildlife / sanctuary**
- **strawberry / farm produce**
- **chocolate / workshop**
- **golf**
- **winery / cellar door**
- **long lunch / dining**
- **coastal walk**
- **luxury stay**
- **rainy-day indoor**

### Rule
If the exact image is missing, use the correct **category fallback**, not a generic place postcard.

---

## 10. Ongoing cron model

## New jobs to add

### 1. `pi-daily-image-relevance-scan`
**Purpose:** audit live/source image relevance every morning

Checks:
- low/medium/high score per live card/image
- duplicate-image collisions
- wrong-object mismatches
- high-risk homepage / What’s On / Journal front-door issues

Outputs:
- `reports/peninsula-image-relevance-scan-YYYY-MM-DD.md`
- Mission Control doc
- Telegram summary to this thread

### 2. `pi-daily-image-relevance-autofix`
**Purpose:** apply safe image corrections where approved fallbacks already exist

Auto-fix scope:
- duplicate event cards with approved replacement images
- low-match event images where a semantic fallback is already assigned
- homepage/What’s On image swaps that are factual/content-safe and already approved by the desk policy

Hold scope:
- any image change that materially alters editorial framing without a stronger validated replacement

Outputs:
- `reports/peninsula-image-relevance-autofix-YYYY-MM-DD.md`
- Mission Control doc
- Telegram summary

---

## 11. Daily workflow order

Recommended morning order:
1. `pi-daily-accuracy-scan`
2. `pi-daily-accuracy-autofix`
3. `pi-daily-image-relevance-scan`
4. `pi-daily-image-relevance-autofix`
5. `pi-daily-events-scan`
6. `pi-daily-venue-healthcheck`
7. `pi-daily-seasonality-refresh`
8. `pi-daily-build-draft`
9. `pi-daily-qa-and-publish`

This makes visual trust part of the publication hygiene layer, not an occasional design clean-up.

---

## 12. QA gate update

Before publish, every image on active surfaces must pass this check:

- Does the image match the title?
- Does it match the object/category?
- Is there a duplicate image conflict nearby?
- Is it high / medium / low match?
- If medium, is this acceptable for this surface?
- If low, stop and replace before publish

This becomes a formal publish question, not a nice-to-have.

---

## 13. Immediate execution recommendation

### Tier A — act now
Create a swift-action queue for obvious low-match live surfaces, especially:
- thermal cards using beach/grape imagery
- strawberry content using grape imagery
- chocolatier content using coastal imagery
- wildlife/family activity using unrelated place postcards
- duplicate event cards on What’s On

### Tier B — next pass
- golf/category/service surfaces with weaker semantic fit
- Journal/front-door medium-match images

### Tier C — ongoing
- archive and lower-priority pages where the image is acceptable but not ideal

---

## 14. Best operating approach

### Short version
- create **PI-image-desk**
- run a **daily image relevance scan**
- grade all images high / medium / low
- auto-fix low-risk low-match cases where approved fallbacks exist
- fail publish on low-match front-door/event surfaces
- stop using place images as generic event defaults

---

## 15. Final recommendation

This should be treated as a permanent part of the Peninsula Insider operating system.

The publication already has:
- editorial desks
- verify / QA
- SEO gate
- daily freshness logic

It now needs the same discipline for images.

Because the rule is simple:

**if the image does not match the content, the publication feels less trustworthy than it is.**

The right move is to institutionalise image relevance as its own desk, its own scoring system, and its own daily maintenance loop.
