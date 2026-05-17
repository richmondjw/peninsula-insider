# Peninsula Insider — Homepage Editorial System & Seasonal Publishing Framework

*Established: 2026-05-17 · Author: Emma Richmond · Keeper: Remy*

---

## Editorial Direction

The homepage should feel like a seasonal issue — a curated publication offering calm editorial guidance and intentionally selected stories.

**Not:** a news feed, latest-post blog, or algorithmic content stream.

**Homepage priority order:**
1. Identity
2. Atmosphere
3. Seasonal planning
4. Editorial authority
5. (then) Commercial intent

---

## Seasonal Layer — Quarterly

The site operates within four seasonal themes:

| Season | Theme |
|--------|-------|
| Autumn | Autumn on the Peninsula |
| Winter | Winter on the Peninsula |
| Spring | Spring Weekends |
| Summer | Summer by the Coast |

These themes influence: homepage tone, feature selection, imagery, newsletter framing, social storytelling, supporting guides.

The seasonal framework evolves quarterly.

---

## Homepage Cover Story (scenes[0]) — Monthly Rotation

Rotates approximately every **4 weeks** within the active season.

The cover story is the flagship editorial for that period. It should:
- feel atmospheric and emotionally driven
- visually define the current "issue"
- align with seasonal behaviour and travel patterns
- have strong imagery and editorial tone
- remain live long enough to build familiarity

**Do not rotate the cover too frequently.**

Example covers:
- The Other Peninsula Weekend
- The Winter Table
- Fireplaces, Red Wine & Long Lunches
- A Winter Peninsula Weekend
- The Long Lunch Season

---

## Supporting Stories (scenes[1–3]) — Weekly or Fortnightly Rotation

Supporting stories should rotate **weekly or fortnightly**. Their role:
- deepen exploration
- create freshness
- support SEO clustering
- surface different parts of the Peninsula
- broaden discovery

### Required editorial balance (4-story mix):

| Slot | Category |
|------|----------|
| Cover (scenes[0]) | Seasonal flagship |
| scenes[1] | Outdoor / walk story |
| scenes[2] | Food / wine story |
| scenes[3] | Destination / guide story |

**Rule:** Avoid all four stories focusing on the same category.

---

## Visual Continuity Rules

Homepage imagery and article hero imagery must feel directly connected. The reader should immediately feel: *"This is the same story I clicked into."*

- Homepage image and article hero should come from the same visual series/shoot where possible
- Maintain consistent light, colour palette, weather, tone and atmosphere
- Avoid unrelated hero images once the user lands inside the article

### Peninsula Insider visual language:
- Seasonal
- Restrained
- Atmospheric
- Place-led
- Calm editorial framing

---

## Headline & Title System

Homepage display headlines do not need to exactly match article H1 titles — but they must feel clearly connected.

| Surface | Style | Example |
|---------|-------|---------|
| Homepage display title | Short, emotional, editorial | "The other Peninsula weekend." |
| Article H1 / SEO title | Longer, clearer, search-aware | "A Flinders Weekend: The Case for the Quiet Side of the Peninsula" |

The homepage dispatch/deck bridges the connection.

---

## Editorial Taxonomy — Scene Labels

Standardised label system (replaces ad hoc labels like THE WALK, THE COVER STORY, THE COMPLETE GUIDE):

| Label | Use case |
|-------|----------|
| `FEATURE` | Long-form seasonal flagship |
| `GUIDE` | Complete destination or activity guide |
| `WEEKEND` | Weekend edit / itinerary piece |
| `WALK` | Walk or outdoor movement story |
| `INSIDER` | Editorial opinion / PI voice piece |
| `SLOW PENINSULA` | Off-season, quiet-side, anti-rush stories |

This taxonomy should become a recognisable Peninsula Insider publishing system over time.

---

## Commercial Positioning

The homepage remains editorial-first.

**Avoid on homepage:**
- Partner blocks
- Banner advertising
- Sponsorship clutter

**Commercial value surfaces naturally deeper within:**
- Guides
- Plans
- Itineraries
- Newsletters
- Place pages
- Seasonal collections

The homepage builds: trust, authority, atmosphere, audience loyalty, publication identity.

---

## Implementation Notes (Remy)

- Scene labels: update to taxonomy above in `next/src/pages/index.astro`
- Cover rotation: monthly, editorial decision, updated via CMS override or code
- Supporting rotation: weekly/fortnightly, requires editorial brief from Emma
- Cadence tracking: maintain in `docs/editorial/publishing-calendar.md`
- Visual continuity: flag to Emma when a story's homepage image doesn't match article hero
