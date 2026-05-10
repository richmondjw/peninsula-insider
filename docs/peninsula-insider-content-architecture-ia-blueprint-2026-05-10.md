# Peninsula Insider — Content Architecture IA Blueprint

## Decision
Peninsula Insider should operate on four distinct content jobs, surfaced through seven top-level navigation pillars:

- Eat
- Stay
- Wine
- Explore
- Plans
- What's On
- Journal

This is not a cosmetic nav change. It is the canonical content model for the site.

## Section roles

### 1. Eat / Stay / Wine / Explore
**Role:** evergreen reference infrastructure

These sections exist to help readers discover stable options and understand the landscape.

They should contain:
- venue pages
- suburb / locality pages
- category pages
- stable roundups with slow refresh cycles
- practical descriptors, opening context, amenities, suitability notes

They should not carry the burden of timely event utility, seasonal urgency, or itinerary logic unless those elements are secondary support modules.

### 2. Plans
**Role:** structured decision-making product

Plans is the site’s differentiation layer. It exists for readers who do not want more options; they want a good answer.

Plans should contain:
- full-day itineraries
- weekend itineraries
- themed escapes
- weather-based plans
- group-based plans
- seasonal sequencing guides
- “if you only have one day / one night / one rainy afternoon” products

Plans should synthesise reference content from Eat / Stay / Wine / Explore, not duplicate it.

### 3. What's On
**Role:** recurring utility and freshness layer

What’s On is the live curation engine. It should answer: what is actually worth doing right now on the Peninsula?

Primary hubs:
- This Weekend
- This Month
- Seasonal Highlights
- Major Events
- Local Picks

Supporting streams:
- Markets
- Festivals
- Live Music
- Seasonal Events
- School Holidays
- Openings
- Food & Wine Events

What’s On should be selective, not exhaustive.

### 4. Journal
**Role:** editorial storytelling and authority

Journal exists for perspective, taste, narrative, comparison, and cultural signal.

It should contain:
- features
- opinion pieces
- comparison stories
- local perspective pieces
- deeper profiles
- scene-setting editorial packages

Journal should not be forced to double as a listings engine or itinerary database.

## Taxonomy model

### Top level
- Eat
- Stay
- Wine
- Explore
- Plans
- What's On
- Journal

### Secondary taxonomy

#### Eat
- Best Restaurants
- Cafes
- Brunch
- Bakeries
- Long Lunches
- Casual Dining
- Special Occasion
- Family Friendly

#### Stay
- Luxury Stays
- Boutique Hotels
- Coastal Escapes
- Family Stays
- Romantic Stays
- Group Accommodation

#### Wine
- Wineries
- Cellar Doors
- Winery Lunches
- Tastings
- Wine Weekends
- New Openings

#### Explore
- Beaches
- Walks
- Villages
- Wellness
- Arts & Culture
- Boating
- Dog Friendly
- Family Activities

#### Plans
- One Day Plans
- Weekend Plans
- Seasonal Plans
- Weather-Based Plans
- Group Plans
- Food & Wine Plans
- Family Plans
- Romantic Plans

#### What's On
- This Weekend
- This Month
- Seasonal Highlights
- Major Events
- Local Picks
- Markets
- Festivals
- Live Music
- School Holidays
- Openings
- Food & Wine Events

#### Journal
- Features
- Opinion
- Comparisons
- Guides With Voice
- Local Notes
- Profiles

## Parent / child rules
- A page gets one **primary home** only.
- Cross-surfacing is allowed through modules, internal links, and “related” blocks.
- A Plan may feature venues from Eat / Stay / Wine / Explore but does not become a venue page.
- A What’s On item may point to a venue page or Plan but remains a timely utility page.
- A Journal story may reference an event, place, or plan, but its primary job is perspective.

## Page-intent rules

### Eat / Stay / Wine / Explore page intent
Use when the user is trying to answer:
- Where should I go for X?
- What are the best options in this category or area?
- What should I know about this venue / place?

Avoid:
- date-led language in core titles unless genuinely permanent
- excessive “this weekend / this winter / right now” framing
- rewriting the same roundup inside multiple sections

### Plans page intent
Use when the user is trying to answer:
- Just tell me what to do
- How should I structure a day or weekend?
- What is the best version of this experience for my context?

Avoid:
- long venue-by-venue reference copy
- exhaustive lists pretending to be a plan
- event-listing clutter

### What's On page intent
Use when the user is trying to answer:
- What is worth doing now?
- What is on this weekend / month / season?
- What has just opened or is happening soon?

Avoid:
- dead directory-style calendars
- generic aggregator behaviour
- stuffing evergreen category content into live utility pages

### Journal page intent
Use when the user is trying to answer:
- What is PI’s point of view?
- What is the deeper story here?
- What does a local editorial lens add?

Avoid:
- generic SEO listicles with no editorial angle
- carrying operational event listings
- duplicating a Plan just with more prose

## Overlap prevention rules
1. **One intent per page.** If a page is trying to rank, recommend, narrate, and list at once, split it.
2. **One canonical owner per theme.** Example: “winter weekend planning” belongs in Plans; “winter events this month” belongs in What’s On.
3. **No duplicate hero concepts across sections without a differentiated job.**
4. **Roundups must declare their role in the brief before drafting.**
5. **Cross-link instead of re-explaining.**

## Migration decision framework

### Keep
Keep pages that already have:
- clear user intent
- strong structure
- clean primary section fit
- low overlap

### Rewrite in place
Use when the page has value but the framing is wrong.
Example: a “best winter weekend on the Peninsula” article that should become a Plan.

### Move
Use when the page’s primary job belongs elsewhere.
Example: an event-heavy seasonal piece currently sitting in Journal that belongs under What’s On.

### Merge
Use when several pages are competing for the same intent.
Example: multiple long-lunch / winery-lunch / restaurant-day pages that can collapse into one stronger canonical page plus supporting links.

### Retire / redirect
Use when the page is thin, redundant, outdated, or structurally confusing.

## Canonical decision examples
- “Best restaurants in Mornington Peninsula” → Eat
- “A perfect winter weekend on the Mornington Peninsula” → Plans
- “What’s on this weekend on the Mornington Peninsula” → What’s On
- “Why the Peninsula’s dining scene is changing” → Journal
- “New cellar doors to know right now” → What’s On first, with links into Wine

## First implementation sequence
1. Lock this section-role model
2. Map all current major URLs to a primary role
3. Identify cannibalisation clusters
4. Define redirects / merges / rewrites
5. Update nav and section landing pages
6. Rebuild homepage around the new roles
7. Shift newsletter / social distribution to match

## Non-negotiable rule
Peninsula Insider should stop publishing against vague mixed intent. Every page must know whether it is reference, plan, utility, or editorial.
