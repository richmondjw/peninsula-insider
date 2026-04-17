# Peninsula Insider — Pet Owner Content Hub Plan

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 16 April 2026  
**Status:** Approved execution brief  
**Purpose:** Establish a Peninsula Insider content hub for pet owners, focused first on dogs, and run it through the standing editorial/content pipeline.

---

## 1. Recommendation

Yes, we should build this.

Not as one article.
Not as a side note.
As a real, practical **pet-owner hub**, starting with dogs.

The category works because it solves a real trip-planning problem:
- where can I go with the dog?
- what beaches actually allow dogs, and when?
- which cafés, pubs, stays, walks, and wineries are genuinely dog-friendly?
- what do I do if I need daycare, boarding, grooming, a pet shop, or a vet on the Peninsula?

This is highly useful, highly searchable, and very brand-compatible with Peninsula Insider’s editorial promise of practical local intelligence.

---

## 2. Strategic framing

### Working category name
**Dog-Friendly Peninsula**

### Better long-term framing
**Pet-Friendly Peninsula**

### Recommendation
Build **Dog-Friendly Peninsula** first, then expand outward into broader pet-owner utility if warranted.

Dogs are the clear dominant use case and the strongest content/search wedge.

---

## 3. Why this hub matters

### Audience value
It solves high-intent, real-world questions:
- dog-friendly beaches Mornington Peninsula
- dog-friendly wineries Mornington Peninsula
- dog-friendly cafes Mornington Peninsula
- dog-friendly accommodation Mornington Peninsula
- where can I leave my dog on the Peninsula
- emergency vet Mornington Peninsula
- rainy-day Peninsula with dog

### Product value
It deepens Peninsula Insider’s utility reputation.
This is not brochure content.
It is trip-shaping service content.

### Commercial value
Later opportunities include:
- dog-friendly stays
- featured daycare / grooming / pet retail partners
- dog-owner itinerary products
- seasonal dog beach / holiday utility guides

---

## 4. Hub structure

## Core hub page
### `/dog-friendly/`
Primary hub for all dog-owner utility.

This page should route users into:
- beaches
- stays
- cafés / pubs / wineries
- walks
- emergency/utility
- itineraries
- rainy-day backups

---

## 5. Stage 1 content package

### Pillar / hub page
1. **Dog-Friendly Mornington Peninsula: The Practical Guide**
   - primary hub
   - overview, categories, what matters, how to use the hub

### Service pages
2. **Dog-Friendly Beaches on the Mornington Peninsula**
3. **Dog-Friendly Cafés, Pubs and Wineries on the Mornington Peninsula**
4. **Dog-Friendly Accommodation on the Mornington Peninsula**
5. **Where to Walk the Dog on the Mornington Peninsula**
6. **Dog Daycare, Boarding, Groomers and Pet Shops on the Mornington Peninsula**
7. **Emergency Vet and Pet Help on the Mornington Peninsula**

### Utility/editorial pages
8. **A Dog-Friendly Peninsula Weekend That Actually Works**
   - likely evolves from or replaces the current dog-friendly article

9. **What to Do on the Peninsula With a Dog When It’s Wet or Busy**

10. **The Best Peninsula Towns to Base Yourself With a Dog**

---

## 6. Data model implications

We should extend venue / stay / experience records with dog-owner utility flags.

### Recommended new metadata fields
- `dogFriendly: true/false`
- `dogFriendlyNotes`
- `dogsAllowedOutdoorsOnly: true/false`
- `offLeashNearby: true/false`
- `waterAccessNearby: true/false`
- `dogAmenities`
  - bowl
  - outdoor seating
  - enclosed area
  - treats
  - dog menu
- `petStayPolicy`
- `petFeeNotes`
- `nearbyVet`
- `nearbyDaycare`
- `rainyDayDogSuitability`

These fields will make the hub materially more useful and later power search/filtering.

---

## 7. Pipeline integration

This should run through the existing editorial machine, not sit outside it.

### Immediate integration points

#### `pi-weekly-editorial-commissioning`
Add dog-friendly hub development as an active commissioning stream.

#### `pi-weekly-evergreen-expansion`
Use this job to deepen:
- beach rules
- café/pub/winery lists
- stay coverage
- town-by-town pet-owner utility

#### `pi-daily-venue-healthcheck`
Extend verification prompts to include dog-policy drift on priority listings.

#### `pi-daily-build-draft`
Allow pet-owner utility pieces to enter the queue when enough verified data is available.

---

## 8. Recommended team routing

### Lead desks
- **PI-places-desk** — towns, geography, beach logic
- **PI-field-desk** — practical local utility research
- **PI-verify-desk** — dog-policy accuracy, seasonal rule changes
- **PI-SEO-desk** — search-intent framing and internal link structure
- **PI-editor / publisher** — shape into useful hub rather than list sludge

### New repeated question for Verify
- are dogs allowed?
- on leash or off leash?
- seasonal restriction?
- outdoor only?
- policy confirmed from primary source?

---

## 9. First execution order

### Phase 1
1. create the hub plan and commissioning brief
2. identify all current dog-relevant content/assets already in repo
3. define dog-friendly data flags
4. commission the 4 highest-intent pages first

### Phase 2
5. publish `/dog-friendly/`
6. publish beaches / stays / food-drink / utility pages
7. connect internal linking from places and stays

### Phase 3
8. expand into itineraries and rainy-day / busy-day use cases
9. add filters/search later

### Execution note — 16 April 2026
The Stage 1 / Phase 2 hub build has now been seeded live with:
- `/dog-friendly/`
- beaches page
- cafés / pubs / wineries page
- accommodation page
- dog walks page
- daycare / boarding / groomers / pet shops page
- emergency vet / pet help page
- rainy-day / busy-day page
- best towns to base yourself with a dog page

Remaining work after this seed:
- venue/stay/experience dog-friendly metadata backfill
- deeper internal linking from places / stays / venues
- verified policy enrichment through the editorial pipeline

---

## 10. Priority pages to build first

### Top four
1. **Dog-Friendly Mornington Peninsula: The Practical Guide**
2. **Dog-Friendly Beaches on the Mornington Peninsula**
3. **Dog-Friendly Cafés, Pubs and Wineries on the Mornington Peninsula**
4. **Dog-Friendly Accommodation on the Mornington Peninsula**

These are the strongest search and utility layer.

---

## 11. Editorial stance

This hub should not become fluffy “bring your furry friend” copy.

It should be:
- practical
- clear about restrictions
- honest about tradeoffs
- useful for actual trip planning

### Tone rule
Write for owners trying to make a good Peninsula day work with a dog, not for Instagram dog-travel cliché.

---

## 12. Final recommendation

Build this as a real Peninsula Insider utility hub.

It is:
- useful
- searchable
- differentiating
- operationally compatible with the current system
- likely to deepen repeat use and trust

Recommended next move:
- seed the pipeline with the four-page Stage 1 dog-friendly package immediately
- then deepen it through the weekly evergreen and editorial jobs.
