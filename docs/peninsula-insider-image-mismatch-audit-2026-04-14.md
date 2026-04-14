# Peninsula Insider — Image Mismatch Audit

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 14 April 2026  
**Status:** Review and recommendation report  
**Purpose:** Systematically review live Peninsula Insider imagery for image-to-title mismatch risk and recommend a pragmatic correction order.

---

## 1. Summary

Yes, there are enough image mismatches across the live site that this needs to be treated as a real quality pass, not just one-off cleanup.

The pattern is not random.
Most of the issues fall into one of four buckets:

1. **generic place image used for a specific event**
2. **generic landscape image used for a service/article title with a more concrete promise**
3. **wrong content-type image language** (for example, beach/landscape image on a golf or event card)
4. **image is technically Peninsula-relevant but semantically weak for the title**

This happened because speed won over semantic precision during the visual rollout, which was the correct decision at the time. But now the site is visible enough that the mismatches start undermining trust.

---

## 2. Audit method

This review looked across the current structured content image layer in:
- `next/src/content/articles`
- `next/src/content/events`
- `next/src/content/experiences`
- `next/src/content/places`
- `next/src/content/venues`

For each item, I compared:
- content title / name
- hero image source
- hero image alt text

Then I flagged likely mismatch cases where the visual semantics do not strongly support the title, especially on:
- What’s On/event cards
- service-style journal pieces
- golf content
- highly specific category titles

This was a semantic QA pass, not a pure licensing or resolution audit.

---

## 3. What is happening structurally

### A. Events are the weakest image layer
This is the clearest problem.
A number of event cards are using generic place images because we did not yet have event-specific visual inventory.

That creates cards that may be geographically relevant but do not read as the event being promoted.

### B. Service/editorial pieces have some semantic drift
Some article hero images are attractive and on-brand, but they do not sharpen the promise of the title.
They are not always wrong, but they are weaker than they should be.

### C. Place imagery is often doing double duty
Place images are currently being reused as stand-ins for:
- events
- themed articles
- specific experiences

That is fine in a prototype.
It is much less fine when the site is now reading as a real publication/product.

---

## 4. Highest-priority mismatches to fix first

## Priority 1 — Event cards on live discovery surfaces
These matter most because they sit on homepage / What’s On / event rails and immediately affect perceived freshness and trust.

### 1. `briars-eco-explorers-autumn.json`
**Current image:** `place-mount-martha-01.webp`  
**Alt:** `Mount Martha coastal bushland`

### Problem
This reads as a generic place image, not a family ecology / nature activity.
The title promises a specific program experience, but the image reads as location filler.

### Recommendation
Replace with one of:
- bushland trail / wildlife reserve imagery
- family-on-boardwalk / reserve-style imagery
- wetlands / woodland educational nature image

### 2. `chocolaterie-junior-chocolatier.json`
**Current image:** `place-flinders-01.webp`  
**Alt:** `Flinders village and pier`

### Problem
This is a strong mismatch.
The title is very specific, but the image is a location postcard with no chocolate / workshop / family activity signal.

### Recommendation
This should move immediately to:
- chocolate / workshop / confectionery visual
- kids activity / chocolatier bench visual
- venue-specific image if available

### 3. `red-hill-market-first-saturday.json`
**Current image:** `place-red-hill-01.webp`  
**Alt:** `Red Hill hinterland vineyard landscape`

### Problem
This is not catastrophic, but it does not read as a market.
The title says market. The image says countryside.

### Recommendation
Replace with:
- market stall imagery
- produce / crowd / baskets / tents
- even a strong regional farmers-market stand-in is better than vineyard landscape

---

## Priority 2 — Golf/event/service semantic mismatches
These are especially noticeable because the title expectation is concrete.

### 4. Remaining golf surfaces using non-golf images
Where any live golf article or golf discovery surface still uses coastal walking or generic Peninsula imagery, it weakens the category.

### Recommendation
All golf surfaces should use one of only three image types:
- fairway / dune links imagery
- golf-routing / landscape imagery
- clubhouse / course-edge imagery

No generic Cape walking image should remain on an active golf lead surface.

### 5. Thermal/wellness event cards using visually unrelated imagery
If a thermal event card or wellness card is represented by grapes, beach, or generic regional photography, it reads as sloppy fast.

### Recommendation
Thermal / wellness cards should use only:
- pools / bathing / spa architecture
- steam / thermal / wellness imagery
- calm interior/exterior wellness setting

---

## Priority 3 — Article/service pieces with weak semantic support
These are not always wrong, but they are weaker than the title deserves.

### Typical pattern
- title promises a concrete service answer
- image gives a beautiful but generic Peninsula landscape

### Recommendation
These should be improved after the event-card layer.
Priority examples include:
- breakfast / brunch pieces using unrelated place scenery
- family utility pieces using non-family imagery
- highly specific location guides using imagery from the wrong place cue

---

## 5. Correction framework

## Tier A — Must fix now
Criteria:
- on homepage / What’s On / event rails
- specific title + clearly generic or semantically wrong image
- likely to reduce trust immediately

Includes:
- Junior Chocolatier
- Briars Eco Explorers
- Red Hill Market
- any stale event card still using obviously unrelated image semantics

## Tier B — Fix next
Criteria:
- live journal or category surfaces
- title and image are only loosely aligned
- not deceptive, but weaker than publication standard

Includes:
- service guides with generic landscapes where the title promises specific utility
- family/kids guides using non-family/non-activity imagery
- golf pages with residual non-golf image language

## Tier C — Accept temporarily
Criteria:
- image is geographically correct and emotionally on-brand
- mismatch is mild rather than jarring
- low traffic or low-importance page

These can remain until we do the next bigger visual system pass.

---

## 6. Recommendations by policy

### 1. Stop using place images as default event images
That is the main source of visible mismatch.
If we do not have a better event image, we should prefer:
- a more semantically aligned generic event image
- or no image on the card
- rather than a misleading location postcard

### 2. Add image QA as a formal pre-publish check
The daily freshness system should include a simple question:

**Does the hero/card image actually support the title?**

This needs to sit alongside:
- date freshness
- link integrity
- surface consistency

### 3. Create a semantic image fallback library
Build approved fallback buckets such as:
- market
- family activity
- thermal/wellness
- golf
- winery/cellar door
- long lunch
- foreshore walk
- luxury stay
- rainy-day indoor

That way we can assign the *right kind* of placeholder when a perfect image does not exist.

### 4. Add an “image confidence” flag to source records
Suggested future field:
- `imageConfidence: strong | acceptable | weak`

This would let us systematically improve weak surfaces instead of finding them ad hoc.

---

## 7. Immediate action recommendation

### First pass to execute now
1. fix live event-card mismatches on What’s On and homepage rails
2. fix any remaining golf-image mismatches on lead surfaces
3. review all `event` hero images for semantic accuracy, not just beauty
4. produce a Tier A replacement list with exact proposed swaps

### Second pass
5. review service/article hero images on the Journal front door
6. tighten image-title alignment for family, breakfast, and utility pieces

### Third pass
7. build the semantic image fallback library and wire it into the daily QA/freshness workflow

---

## 8. Bottom line

The site has crossed the threshold where **good-enough generic imagery is no longer good enough everywhere**.

The highest-risk issue is not that images are ugly.
It is that some images are **saying the wrong thing** for the title sitting beside them.

That is a trust problem.

My recommendation is:
- fix event-card mismatches first
- then fix live category/service mismatches
- then institutionalise semantic image QA so this stops recurring

That will give Peninsula Insider a much more credible editorial finish.
