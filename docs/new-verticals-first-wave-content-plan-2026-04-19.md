# Peninsula Insider — New Verticals: First-Wave Content Implementation Plan

**Date:** 19 April 2026  
**Status:** Build-ready  
**Scope:** Weddings · Corporate Events · Walks/Hikes  
**Purpose:** Immediate build queue — first 2–3 support pages per hub, with slugs, intent, editorial angle, and internal-link targets. Complements the three strategy docs (same date).

---

## How to Read This Doc

Each vertical has:
1. **Hub URL** — the root page (stub registered below, full build follows separately)
2. **First-wave support pages** — the 2–3 pages to build immediately after (or alongside) the hub
3. Per page: slug · search intent · editorial angle · internal-link targets

"First-wave" means: high-intent, low-conflict with existing content, and useful from day one even if the hub is thin. These pages can and should link back to the hub as a cluster anchor even before the hub is fully built.

**Do not conflict with the live hub build lane.** Pages in the `next/src/pages/` tree that are already being built by an active Claude worktree should not be touched here. This document governs new-to-repo pages only.

---

## 1. WEDDINGS

**Hub URL:** `/weddings/`  
**Strategy doc:** `docs/peninsula-insider-weddings-hub-strategy-2026-04-19.md`  
**Content stubs location:** `next/src/content/articles/` (article format) + `next/src/pages/weddings/` (hub pages)

### 1.1 Winery Wedding Venues

| Field | Value |
|---|---|
| **URL slug** | `/weddings/winery-wedding-venues-mornington-peninsula/` |
| **Page type** | Hub sub-page (Astro page, not article) |
| **Search intent** | Informational → decision-making. Primary term: "winery wedding venues Mornington Peninsula". Volume tier: high. Couples shortlisting venue style. |
| **Editorial angle** | Not a directory. A genuinely selective guide to what a winery wedding on the Peninsula actually means — what you get (setting, character, food-and-wine integration, estate feel) and what you give up (accommodation scale, indoor-backup quality, guest logistics). Distinguish winery-only ceremony/reception venues from winery estates with hotel or cottage accommodation. Be honest about guest capacity limits. The PI lens: the food and wine standard matter as much as the vineyard view. |
| **Internal-link targets** | `/weddings/` (hub anchor) · `/wine/` (cellar door edit) · `/stay/` (guest accommodation) · `/eat/` (rehearsal dinner options) · `/places/red-hill` · `/places/main-ridge` · `/explore/best-walks` (weekend-building signal) |
| **Key entities to reference** | Montalto, Polperro, Ten Minutes by Tractor, Lindenderry at Red Hill, Paringa Estate, Merricks General Wine Store, Red Hill Estate — editorially characterised, not just listed |
| **Differentiator content blocks** | "Best for" summaries per venue · "What winery weddings do well / don't do well" framing block · Guest accommodation and transport notes · Seasonal considerations (summer heat, winter drama) |
| **Status** | Stub file registered → `next/src/pages-drafts/weddings/winery-wedding-venues-mornington-peninsula.astro` |

---

### 1.2 Where Guests Should Stay for a Mornington Peninsula Wedding

| Field | Value |
|---|---|
| **URL slug** | `/weddings/where-guests-stay-mornington-peninsula-wedding/` |
| **Page type** | Planning editorial (article → `next/src/content/articles/`) |
| **Search intent** | Planning/utility. "where to stay for a Mornington Peninsula wedding", "accommodation for wedding guests Mornington Peninsula". High-consideration, transactional adjacent. |
| **Editorial angle** | The question couples most often fail to answer until too late. PI's angle: this is a logistics problem before it is a preference question. Match accommodation areas to venue location. Red Hill wedding → which towns have rooms within a 10-min drive? Sorrento/Portsea wedding → how does the Portsea end-of-road geography affect guest logistics? Be concrete. Give actual accommodation tier guidance without pretending every couple's guests can afford a boutique hotel. |
| **Internal-link targets** | `/weddings/` · `/stay/` (accommodation hub) · `/weddings/winery-wedding-venues-mornington-peninsula/` · `/places/sorrento` · `/places/mornington` · `/places/red-hill` · `/eat/` (morning-after brunch) |
| **Key entities to reference** | Lindenderry, Jackalope, Peppers Moonah Links, Lancemore, The Continental Sorrento, Seahaven Portsea, plus cottage and self-catering clusters for larger guest groups |
| **Differentiator content blocks** | "Match your wedding venue area to where guests should stay" table · Transportation time-and-cost reality check · Options for different guest budget bands |
| **Article stub file** | `next/src/content/articles/weddings-where-guests-stay-mornington-peninsula.md` |

---

### 1.3 How to Plan a Mornington Peninsula Wedding Weekend

| Field | Value |
|---|---|
| **URL slug** | `/weddings/how-to-plan-a-mornington-peninsula-wedding-weekend/` |
| **Page type** | Planning editorial (article → `next/src/content/articles/`) |
| **Search intent** | Planning/research. "Mornington Peninsula wedding weekend", "planning a Peninsula wedding weekend for guests". Couples in early-to-mid planning phase. High LLM retrieval value. |
| **Editorial angle** | The whole weekend, not just the day. Friday arrival rhythm → Saturday ceremony/reception → Sunday morning recovery. For each phase: where does this actually happen on the Peninsula, what venues carry the sequence, and where do the logistics break down (transport after late-night reception, Sunday brunch availability in smaller towns, etc.). Honest about the difference between a "destination wedding weekend" and a day event with a few hotel rooms. |
| **Internal-link targets** | `/weddings/` · `/weddings/where-guests-stay-mornington-peninsula-wedding/` · `/eat/` (rehearsal dinner + recovery brunch) · `/stay/` · `/wine/` (Friday cellar door pre-event) · `/explore/` (guest Saturday before ceremony) |
| **Differentiator content blocks** | "Arrival day, wedding day, morning after" framework · Rehearsal dinner venue options by area · Recovery brunch venue options by area · Guest activity ideas for the afternoon before a late ceremony |
| **Article stub file** | `next/src/content/articles/weddings-mornington-peninsula-weekend-planning.md` |

---

## 2. CORPORATE EVENTS

**Hub URL:** `/corporate-events/`  
**Strategy doc:** `docs/peninsula-insider-corporate-events-hub-strategy-2026-04-19.md`  
**Content stubs location:** `next/src/content/articles/` + `next/src/pages-drafts/corporate-events/`

### 2.1 Best Corporate Retreat Venues on the Mornington Peninsula

| Field | Value |
|---|---|
| **URL slug** | `/corporate-events/best-corporate-retreat-venues-mornington-peninsula/` |
| **Page type** | Hub sub-page (Astro page) |
| **Search intent** | Decision/shortlisting. "best corporate retreat venues Mornington Peninsula", "executive retreat venues Mornington Peninsula". EAs, founders, people-team leads. |
| **Editorial angle** | Not a function-venue list. PI's value: distinguish retreat feel from conference-room availability. A conference room in a beautiful winery is not the same as a purpose-configured leadership retreat venue. Structure by use case: small executive team (6–15) vs leadership group (15–40) vs large delegate event (40+). For each, call out which venues actually work and which ones look good in photos but fail on breakout flow, AV, or delegate comfort. |
| **Internal-link targets** | `/corporate-events/` (hub anchor) · `/stay/` · `/eat/` (team dinners) · `/wine/` (winery offsites) · `/spa/` (wellness add-ons) · `/places/red-hill` · `/places/sorrento` |
| **Key entities to reference** | Lindenderry at Red Hill (retreat + conference), The Continental Sorrento (coastal precinct, large group), RACV Cape Schanck (scale + golf + spa), Jackalope (boutique executive), Montalto (winery offsite potential), Peninsula Hot Springs (wellness adjacent) |
| **Differentiator content blocks** | Use-case matrix (group size × format type → venue) · "What this venue does well / watch out for" per entry · Locality: Red Hill vs Sorrento vs Cape Schanck comparison · Transport from Melbourne: realistic times and options |
| **Status** | Stub file registered → `next/src/pages-drafts/corporate-events/best-corporate-retreat-venues-mornington-peninsula.astro` |

---

### 2.2 How to Plan a Mornington Peninsula Corporate Retreat

| Field | Value |
|---|---|
| **URL slug** | `/corporate-events/how-to-plan-a-mornington-peninsula-corporate-retreat/` |
| **Page type** | Planning editorial (article → `next/src/content/articles/`) |
| **Search intent** | Planning/research. "how to plan a corporate retreat Mornington Peninsula", "Peninsula offsite planning". Mid-to-late planning phase. High LLM retrieval value. |
| **Editorial angle** | An actual planning sequence, not a venue pitch. Day 1 check-in and orientation activity → Day 1 strategy session → dinner → Day 2 structured morning → free afternoon. For each slot: what the Peninsula does well (long lunch is a structural strength; wellness add-on is easy; informal winery dinner beats a hotel restaurant for group cohesion), what to avoid (overstuffing the agenda, ignoring travel time), and where the format breaks down at different group sizes. Avoid MICE jargon. Write for the person who has never run an offsite but needs to run a good one. |
| **Internal-link targets** | `/corporate-events/` · `/corporate-events/best-corporate-retreat-venues-mornington-peninsula/` · `/stay/` · `/eat/` · `/spa/` · `/wine/` (winery dinner) · `/explore/` (team activity options) |
| **Differentiator content blocks** | Day-by-day framework for a one-night Peninsula offsite · "Moments that actually build team cohesion on the Peninsula" (concrete examples: long winery lunch, morning thermal soak, shared cooking, informal coastal walk) · Budget reality check by group size · "Daytrip vs overnight: when each makes sense" |
| **Article stub file** | `next/src/content/articles/corporate-events-how-to-plan-peninsula-retreat.md` |

---

### 2.3 Red Hill and Sorrento: Choosing the Right Peninsula Base for Your Corporate Event

| Field | Value |
|---|---|
| **URL slug** | `/corporate-events/red-hill-vs-sorrento-corporate-events/` |
| **Page type** | Planning editorial (article → `next/src/content/articles/`) |
| **Search intent** | Comparative/planning. "Red Hill corporate retreat", "Sorrento corporate events", "where to hold a Peninsula offsite". Long-tail but high-intent. Strong LLM-retrieval target. |
| **Editorial angle** | The honest locality comparison planners actually need. Red Hill/hinterland: food-and-wine-led, quieter, retreat atmosphere, better for groups that want immersion and distance from city energy, weaker on precinct feel for non-drivers. Sorrento: stronger precinct (walking between venues), coastal energy, better for groups that want a Town feel and maritime hospitality, can feel busy in summer. Cape Schanck: resort-scale infrastructure, best for larger delegate events or groups that want spa + golf + meetings in one complex, feels less boutique. Who each suits. |
| **Internal-link targets** | `/corporate-events/` · `/corporate-events/best-corporate-retreat-venues-mornington-peninsula/` · `/corporate-events/how-to-plan-a-mornington-peninsula-corporate-retreat/` · `/places/red-hill` · `/places/sorrento` · `/stay/` |
| **Differentiator content blocks** | Direct locality comparison table (access, venue character, accommodation density, dining quality, activity options) · "Group type to locality" match guide |
| **Article stub file** | `next/src/content/articles/corporate-events-red-hill-vs-sorrento.md` |

---

## 3. WALKS / HIKES

**Hub URL:** `/walks/`  
**Strategy doc:** `docs/peninsula-insider-walks-hikes-hub-strategy-2026-04-19.md`  
**Content stubs location:** `next/src/content/articles/` + `next/src/pages-drafts/walks/`  
**Note:** `/explore/best-walks` already exists as a live page. The new `/walks/` vertical is a separate top-level hub. Walks-vertical pages must not duplicate or conflict with `/explore/best-walks`. The existing articles (`the-peninsulas-best-late-afternoon-walks.md`, `the-point-nepean-half-day.md`) remain in place and can be cross-linked from the new hub.

### 3.1 Easy Walks on the Mornington Peninsula

| Field | Value |
|---|---|
| **URL slug** | `/walks/easy-walks-mornington-peninsula/` |
| **Page type** | Hub sub-page (Astro page) |
| **Search intent** | Decision/shortlisting. "easy walks Mornington Peninsula", "flat walks Mornington Peninsula", "walks for families Mornington Peninsula". Very high volume tier. First entry point for most new-to-walking readers. |
| **Editorial angle** | Define "easy" honestly up front: flat or near-flat, under 2 hours, no scrambling, suitable for most fitness levels. But do not flatten all easy walks into the same recommendation. The Cape Schanck boardwalk, the Mornington foreshore, and the Sorrento back-beach approach are all "easy" but they serve completely different Peninsula days. Route each reader to the right easy walk for their day, not just a ranked list. |
| **Internal-link targets** | `/walks/` (hub anchor) · `/explore/` · existing experience pages: `cape-schanck-boardwalk`, `mornington-foreshore-walk`, `cape-schanck-lighthouse-walk` · `/eat/` (post-walk food near each walk) · `/spa/` (Peninsula Hot Springs for Cape Schanck area) · `/places/sorrento` · `/places/mornington` · `/places/cape-schanck` |
| **Walk entities to feature** | Cape Schanck boardwalk · Mornington foreshore walk · Arthurs Seat short circuit · Kings Waterfall Circuit · Sorrento back-beach and Coppins approach · Farnsworth Track (short but exposed — honest note needed) · Mornington Peninsula Walk easy sections |
| **Differentiator content blocks** | "Best for" framing per walk · "What you get after" links (food, wine, spa per walk area) · Dog-access honesty (NP restrictions flagged) · Accessibility notes where relevant |
| **Status** | Stub file registered → `next/src/pages-drafts/walks/easy-walks-mornington-peninsula.astro` |

---

### 3.2 The Bushrangers Bay Walk: Complete Guide

| Field | Value |
|---|---|
| **URL slug** | `/walks/bushrangers-bay-walk/` |
| **Page type** | Trail guide (article → `next/src/content/articles/`) |
| **Search intent** | Informational/planning. "Bushrangers Bay walk", "Cape Schanck walk", "Bushrangers Bay Cape Schanck how long". High volume, high-intent. Top trail-specific page to build first. |
| **Editorial angle** | The walk PI already knows and has experience entity data for — build the definitive editorial trail guide. Not Parks Victoria. Character, conditions, timing, crowd notes, what to do before and after. The basalt-and-sand bay framing. Honest about: this is 5km return and moderate — the descent is comfortable but the return climb is a genuine effort in summer heat. Best done autumn/winter/spring. Morning or late afternoon beat midday. What to combine it with: lunch at The Boatyard (Flinders), Cape Schanck lighthouse, Peninsula Hot Springs (25 minutes north). |
| **Internal-link targets** | `/walks/` · `/walks/easy-walks-mornington-peninsula/` · `/explore/bushrangers-bay-walk` (experience entity) · `/places/cape-schanck` · `/spa/` (Peninsula Hot Springs) · `/eat/` (Flinders General Store, The Boatyard area) · existing article: `the-peninsulas-best-late-afternoon-walks.md` |
| **Content from experience entity** | Build on `experiences/bushrangers-bay-walk.json` — extend into full editorial trail guide form (not just the experience card). This is complementary: the experience entity stays, this article is the long-form guide. |
| **Differentiator content blocks** | Quick-stats block (distance · grade · duration · parking · dog rules · best season) · Walk description with directional flow · "Best for whom" · Crowd and timing notes · "After the walk" section with PI-linked food/spa/wine options · FAQ block (for LLM retrieval) |
| **Article stub file** | `next/src/content/articles/walks-bushrangers-bay-walk-guide.md` |

---

### 3.3 Walk + Hot Springs: The Cape Schanck Day

| Field | Value |
|---|---|
| **URL slug** | `/walks/walk-hot-springs-cape-schanck/` |
| **Page type** | Experience editorial (article → `next/src/content/articles/`) |
| **Search intent** | Experience/planning. "Cape Schanck walk and hot springs", "Mornington Peninsula walk and hot springs day". Moderate volume but very high intent and PI-brand aligned. Strong LLM target: "what to do near Peninsula Hot Springs" and "Mornington Peninsula day trip ideas" queries. |
| **Editorial angle** | One of Peninsula Insider's most distinctive possible pages — the walk-then-spa day that no competitor writes well. The pairing: Bushrangers Bay walk (morning, 2 hours) → The Boatyard or Flinders General Store (lunch, 45 min drive south) or something in Cape Schanck area → Peninsula Hot Springs (afternoon soak, 25 min from Cape Schanck) → drive home. Or the shorter version: Cape Schanck boardwalk/lighthouse (45 min) → Peninsula Hot Springs. Be honest about the drive between venues. This is a planning page as much as an inspiration page. |
| **Internal-link targets** | `/walks/` · `/walks/bushrangers-bay-walk/` · `/spa/` · `/places/cape-schanck` · `/eat/` · existing article: `mornington-peninsula-stay-and-soak.md` |
| **Differentiator content blocks** | Day itinerary in concrete sequence with timing · Walk choice (short vs half-day) with honest recommendations · Booking notes for Peninsula Hot Springs (pre-book always) · Lunch options between walk and spa |
| **Article stub file** | `next/src/content/articles/walks-cape-schanck-hot-springs-day.md` |

---

## 4. Build Notes

### Routing conflict check

- `/explore/best-walks` — live, do not touch
- `/explore/[slug]` — live, do not touch  
- All new pages are under `/weddings/`, `/corporate-events/`, `/walks/` — new top-level dirs, no conflict
- Article stubs in `next/src/content/articles/` use new slug names, no conflict with existing articles

### Page stub files

Six Astro hub sub-pages are registered as stubs in `next/src/pages-drafts/`:

```
next/src/pages-drafts/
  weddings/
    winery-wedding-venues-mornington-peninsula.astro
  corporate-events/
    best-corporate-retreat-venues-mornington-peninsula.astro
    red-hill-vs-sorrento-corporate-events.astro (article-format, not hub)
  walks/
    easy-walks-mornington-peninsula.astro
```

Six article stubs are registered in `next/src/content/articles/`:

```
weddings-where-guests-stay-mornington-peninsula.md
weddings-mornington-peninsula-weekend-planning.md
corporate-events-how-to-plan-peninsula-retreat.md
corporate-events-red-hill-vs-sorrento.md
walks-bushrangers-bay-walk-guide.md
walks-cape-schanck-hot-springs-day.md
```

### Build priority order

| Priority | File | Hub |
|---|---|---|
| 1 | `walks-bushrangers-bay-walk-guide.md` | Walks |
| 2 | `easy-walks-mornington-peninsula.astro` | Walks |
| 3 | `walks-cape-schanck-hot-springs-day.md` | Walks |
| 4 | `weddings-where-guests-stay-mornington-peninsula.md` | Weddings |
| 5 | `weddings-mornington-peninsula-weekend-planning.md` | Weddings |
| 6 | `winery-wedding-venues-mornington-peninsula.astro` | Weddings |
| 7 | `corporate-events-how-to-plan-peninsula-retreat.md` | Corporate Events |
| 8 | `best-corporate-retreat-venues-mornington-peninsula.astro` | Corporate Events |
| 9 | `corporate-events-red-hill-vs-sorrento.md` | Corporate Events |

Walks first: the vertical has the broadest existing editorial base (experience entities, existing articles, image assets), lowest editorial-research burden to launch well, and the highest-volume search entry points available immediately.

### Internal-linking discipline

When any stub is built into full content:
- link to the hub (`/walks/`, `/weddings/`, `/corporate-events/`) as primary cluster anchor
- link to at least 2 existing PI pages (eat, stay, wine, spa, places, or explore)
- link to at least 1 other page in the same new vertical
- no orphan pages

---

*Prepared by Remy | 19 April 2026 | For James Richmond / Peninsula Insider build queue*
