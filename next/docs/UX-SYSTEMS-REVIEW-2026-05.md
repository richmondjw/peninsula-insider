# Peninsula Insider — Template Purpose & Interaction Review
**Date:** May 2026  
**Author:** Remy  
**Status:** For James + Emma review  
**Companion to:** `docs/ARCHITECTURE-REVIEW-2026-05.md`

---

## Strategic Frame

The brief asks each template to answer: *"What is the primary job this experience performs?"*

Before the system-by-system review, one cross-cutting observation:

**The content model is consistently ahead of the interaction model.** The schema has bestFor, notFor, skip, insiderNote, signature, mood, audience, planShape — all the primitives for opinionated, intentional editorial surfaces. The templates have not yet caught up to this richness. The work is not to add features; it is to *let the schema speak* through cleaner hierarchy and quieter secondary modules.

---

## 1. Place Experience System

**Primary job:** *Help me understand this place and decide if it's right for my trip.*

### What works well
- The schema is excellent — `bestFor`, `notFor`, `skip`, `bestDay`, `insiderNote`, `signature`, `stayDuration`, `bestSeason` are exactly the right editorial primitives.
- The chapter navigation structure is the right idea — gives the reader a mental map of a deep page before they commit to scrolling.
- Cinematic hero with full-bleed image and editorial overlay creates the right tone of arrival.
- Fit panel (bestFor/notFor/skip) is a genuinely distinctive PI pattern — no tourism directory does this.

### What feels misaligned or conflicted
- **Scope creep at depth.** The template currently pulls: eat venues, wine venues, stay venues, experiences, itineraries, articles, events, map, related places. That is 8 data layers. Each is individually justified; together they make the page feel like a hub-within-a-hub. The reader who arrived to understand "is Red Hill right for me?" gets a mini-directory by the time they reach the lower sections.
- **The downstream venue listings are directory behaviour.** Showing up to 6 eat venues + 6 wine venues + 4 stay venues as cards is a listing pattern. For a place guide, editorial curation (2–3 picks with actual editorial reasoning) would be more consistent with the PI voice.
- **The map competes for primary attention.** A Leaflet map near the bottom of a long editorial page is utility content at the wrong depth. For most readers, the map is a post-decision tool — "I've decided Red Hill, now where exactly is everything?" It should feel like a practical footer, not a section of its own.

### What should be simplified or removed
- Venue card count in downstream sections: **cut to 3 per category maximum**, with a "See all → /eat/?place=red-hill" link for readers who want more.
- The events integration at place level: a single EventStrip is correct; full event cards feel like another hub competing for attention.
- "Reader submission CTA" at the bottom: correct in principle but currently feels like a generic form link. Either make it feel like a genuine editorial invitation or remove it until it has the right treatment.

### What should become more prominent
- **The fit panel (bestFor/notFor/skip)** — this is the most distinctively PI element on any place page. It should appear earlier and with more visual weight. It answers the reader's real question: "Is this place for me?"
- **The signature line and insiderNote** — currently present in the schema but may be underweighted visually. These are the editor's voice on the place. They should feel like a pull-quote, not metadata.
- **"A Perfect Day" structure** — when populated, this is the most useful planning content on the page. It should be treated as the editorial centrepiece of the lower half, not just one section among many.

### Recommended interaction model
1. Arrive → cinematic hero orients the reader to the place
2. Editorial lede + at-a-glance sidebar → understand the place quickly
3. Fit panel (bestFor/notFor/skip) → *decide* if this place is right for you
4. Perfect Day → *imagine* a day there
5. Chapter nav → *navigate deeper* if you've decided yes
6. 2–3 curated picks per category (eat / wine / stay) → *shortlist, not directory*
7. Itinerary cards → *take the next planning step*
8. Map + related places → *orient geographically*

### Risks if left unresolved
Every new venue/experience added to the system makes the downstream sections longer without editorial intervention. Within 12 months, place pages at data-rich locations (Sorrento, Red Hill) will have 30+ venue cards below the fold — indistinguishable from a tourism directory.

### Priority
**High.** The place template is the most-trafficked editorial surface. Its interaction model sets the tone for the entire platform.

---

## 2. Wine Experience System

**Primary job:** *Help me discover the Peninsula's wine country and plan my cellar door experience.*

### What works well
- Subregion navigation (Main Ridge, Red Hill, Merricks, Moorooduc/Tuerong, Balnarring, Flinders) is the right structural frame — wine on the Peninsula is fundamentally about geography and terroir.
- Mood navigation exists and is correct in principle — "not every visitor wants a formal tasting" is an editorial insight worth building into the UX.
- Hub-guide sub-components (`CellarDoorList`, `SubregionGrid`, `VarietyGuide`) are well-conceived and wine-specific.
- The hub page has editorial surface area (hub copy, editorial blocks) that other sections lack.

### What feels misaligned or conflicted
- **Individual cellar door pages use `VenueDetailTemplate`** — the same template as restaurants and accommodation. This is structurally efficient but editorially diluting. A cellar door experience is fundamentally different from a dinner booking. Halliday score, appointment-only status, cellar door lunch vs tasting-only, vintage notes, winemaker's story — these are wine-specific editorial signals that currently sit alongside the same "Book" button and price band used for a pub. The template doesn't know what to do with `hallidayScore` and `authority` in a distinctively wine way.
- **The "appointment producers" pattern** exists as a page (`/wine/appointment-producers.astro`) but is not systematically surfaced in the hub or individual venue pages. This is valuable editorial curation that is currently buried.
- **Mood navigation** is partially built but the mood enum mismatch (venue mood enum is 22 values; itinerary mood is different) means a reader who filters by "long-lunch" mood in the wine hub may not see the same venues that appear under "long-lunch" on the plans hub.

### What should be simplified or removed
- The generic "Book" CTA on wine venue pages should become context-specific: "Book a tasting," "Reserve lunch," "Call ahead" (for appointment-only) — or no booking CTA at all for estate producers who don't take bookings.
- Dog-policy table (`DogPolicyTable.astro`) on wine pages: correct intent, but should be a lightweight inline signal on the cellar door page, not a standalone table that competes with editorial content.

### What should become more prominent
- **The winemaker's story and editorial voice** on individual cellar door pages — currently the `editorNote` and `signature` fields are the richest editorial content in the wine schema. They should feel like the centrepiece of the page, with venue logistics (hours, booking, address) as supporting service information below.
- **Appointment-only producers** deserve their own visual treatment — they are editorially significant and completely different in visit pattern from a standard cellar door.
- **The seasonal and vintage dimension** — wine on the Peninsula is deeply seasonal. "This is the season for..." editorial editorial context should appear on the wine hub. The `season` and `bestSeason` primitives exist in the schema; they should surface here.

### Recommended interaction model
**Hub:** Arrive → editorial frame ("what is Mornington Peninsula wine country?") → subregion navigation (where are you going?) → mood filter (what kind of wine experience?) → curated shortlist → seasonal context → newsletter
**Individual page:** Winemaker/estate story → editor's note → at-a-glance card (Halliday, style, what to expect) → practical planning (hours, booking, address) → pair-with (articles, itineraries, nearby)

### Risks if left unresolved
The wine vertical is one of PI's highest-intent sections. If cellar door pages feel like restaurant listings with a grape emoji, the editorial authority of the platform in this category erodes. Wine buyers are comparatively research-intensive — they will go elsewhere if the pages don't justify their trust.

### Priority
**Medium-high.** Wine is a core pillar and has the schema richness to become a genuinely distinctive vertical. The main work is a wine-specific `VenueDetailTemplate` variant (or a clearly differentiated wine section of the existing template) that surfaces wine-specific editorial signals.

---

## 3. Editorial / Journal System

**Primary job:** *Immersive reading — editorial authority delivered in a calm, unhurried environment.*

### What works well
- The **hub guide detection** (`HUB_GUIDE_FORMATS`) is genuinely smart — the system already knows that a hub-guide article (regional reference, trail guide, service piece) should render differently from an editorial feature. This is ahead of most CMS-driven publishing platforms.
- Plans articles redirect to `/plans/` — the routing is clean.
- Peninsula This Weekend dispatches redirect to `/whats-on/this-weekend/archive/` — correct.
- `aiSummary` and `faq` frontmatter fields exist and are structured for concierge retrieval — this is the right investment.
- `ClusterLinks` for internal linking is the right pattern for SEO without cluttering the prose.

### What feels misaligned or conflicted
- **The downstream sections after the article body** — related venues, related experiences, related articles — are currently appended to every article regardless of format. A 600-word editor's letter does not benefit from 6 venue cards below it. An investigation piece does not need an `AudiencePicker` beneath it. The downstream sections are data-driven but not format-aware.
- **Reading flow interruptions.** `PiArticleActions` (save, share, print) is useful but currently appears at the same level of visual hierarchy as the article body. For long-form editorial, action elements should be clearly secondary — never competing with the prose.
- **The `VenueCard` inside journal articles** — when an article references venues, the current system can surface venue cards inside the article page. This is technically correct but visually disruptive mid-article. Venue references should render as inline editorial links, not card components, within the prose.

### What should be simplified or removed
- **Remove or gate the downstream venue/experience card sections** on editorial formats (editors-letter, slow-peninsula, interview, investigation). Keep them for hub-guide and service formats only.
- **The hub guide TOC** (`HubGuideTOC.astro`) is correct for service/trail-guide formats. Remove it from editorial feature articles — TOCs destroy reading immersion for prose that isn't reference material.
- **Related articles rail** — currently shows articles sorted by date. Should be editorially curated (via `relatedArticles` schema field) or not shown at all. Algorithm-sorted "related content" is directory behaviour.

### What should become more prominent
- **Typography and white space** — the editorial reading experience lives or dies on these. The `--prose-w: 680px` constraint is correct; verify that nothing inside an article body exceeds it.
- **The editor's note / byline as editorial voice** — in premium editorial publications, the byline section is a statement. On PI it should carry weight: author name, context ("local writer, Red Hill"), maybe a one-line bio. Currently it may be under-treated.
- **Pull-quotes and image captions** as editorial signals — these are the moments that tell the reader "this is a magazine, not a blog."

### Recommended interaction model
**Editorial formats (editors-letter, interview, slow-peninsula, investigation):**
Hero → byline → prose body (full-width to prose-w) → share/save (quiet) → newsletter → *end*. No downstream cards.

**Hub-guide formats (hub-guide, service, trail-guide, venue-guide):**
Hero → breadcrumbs → TOC → 2-col grid body (prose + sticky TOC) → curated venue/experience cards → cluster links → newsletter

**Weekend-picker / dispatch:**
→ Redirect to /whats-on/this-weekend/ (already implemented)

### Risks if left unresolved
Every downstream section added to every article format increases the visual noise threshold. Over time, readers stop reading the articles and scroll to the card section — at which point the editorial brand is indistinguishable from a listicle site. The reading experience is the moat.

### Priority
**High.** The journal is where editorial authority is built. Every interruption to reading immersion is an erosion of that authority.

---

## 4. Dispatch / Timely Content System (What's On)

**Primary job:** *Help me quickly orient to what's happening on the Peninsula right now.*

### What works well
- The `weekend-picks` collection with `editorVerdict` required per pick is the right editorial gate — it forces curation rather than aggregation.
- `visitorAppealScore` on events for ranking is the correct signal — it ensures the most relevant events surface first, not the most recently created.
- Separation between recurring events (weekly/monthly/ongoing) and dated events is structurally correct.
- Quick Notes (`quickNotes` collection) as a "Notebook" surface is a genuinely distinctive pattern — a low-commitment editorial voice that no tourism site has.

### What feels misaligned or conflicted
- **The What's On hub currently pulls:** events + dispatches + signature events + quick notes + mood filter. That is four competing editorial streams on one page. The reader asking "what's on this weekend?" has to parse multiple content types before getting to an answer.
- **Signature Events on the What's On hub** are evergreen content on a timely page. Portsea Polo is not "what's on this weekend" — it's planning context. Mixing evergreen anchor events with timely upcoming events creates calendar confusion.
- **The dispatch/weekend-picker article format** was correctly migrated to `/whats-on/this-weekend/` — but the What's On hub still surfaces the current dispatch as editorial content alongside events. This creates duplication: the dispatch *is* the curated view of what's on, and yet it sits next to a raw event list that duplicates some of its recommendations.

### What should be simplified or removed
- **Separate timely from evergreen clearly.** On the What's On hub: timely events at top (what's actually on this weekend/this week); signature events as a secondary "anchor your year" section clearly labelled as such, below the fold.
- **The mood-by-mood event filter** (`/whats-on/by-mood/[mood].astro`) is SEO infrastructure masquerading as editorial UX. It should be a background system, not a primary navigation surface.
- **The dispatch/Peninsula This Weekend article on the What's On hub** — if the hub already surfaces curated weekend picks, the dispatch article card is redundant. The dispatch should be the *editorial voice* of the hub, not a linked article *within* the hub.

### What should become more prominent
- **The Quick Note / Notebook pattern** — this is the most distinctively PI element on What's On. A one-line editorial observation ("The snapper are running early this year. Check the pier.") is the voice of a trusted local. It should be at the top of the page, not buried.
- **This weekend's picks** — the `weekend-picks` collection with `editorVerdict` is excellent. These should be the hero of the What's On page, not one section among five.

### Recommended interaction model
Arrive → Quick Note (one-line editorial voice from the Notebook) → This Weekend's Picks (3–5 picks with editorVerdict) → Upcoming events (ranked by visitorAppealScore, timely only) → Signature Events section (below fold, clearly labelled as anchor annual events) → Newsletter

### Risks if left unresolved
The What's On page becomes an aggregator rather than an editorial guide. The distinction between "here are all events happening on the Peninsula" and "here is what Peninsula Insider recommends this weekend" gets lost. The former is what tourism Victoria does. The latter is PI's actual job.

### Priority
**Medium.** The schema and data architecture are correct. This is primarily a hierarchy and curation problem, not a systems problem.

---

## 5. Planning / Utility Layer (Plans Hub)

**Primary job:** *Help me plan a Peninsula trip — duration, mood, intent — with confidence.*

### What works well
- The `planShape` taxonomy (one-night, two-night, day-trip, seasonal) is exactly the right editorial frame for a planning hub. This directly answers the reader's primary question: "How long have I got?"
- The 7-axis itinerary schema (duration, theme, occasion, mood, audience, budget, fitness) is genuinely rich and is structurally ready for a filtering UI.
- The redirect from `/escape/` to `/plans/` is clean — the naming is now correct.
- Plans articles as a `section: plans` filter on the articles collection is the right lightweight architecture for now (avoid a second URL structure until the content volume justifies it).

### What feels misaligned or conflicted
- **The 16 hardcoded mood guide links** in `plans/index.astro` are the most significant misalignment on the platform. These are static HTML links to journal articles and section pages, rendered as a grid. This is an SEO linking pattern dressed as editorial UX. The reader landing on the Plans hub who sees 16 undifferentiated links (Eat & Drink / Wineries / Long Lunches / Live Music / Family Friendly / Wellness & Spas / Walks & Trails / Markets / Beaches / Dog Friendly / Arts & Culture / Scenic Stops / Golf / Fishing / On the Water / Weekend Stays) is looking at an index page, not a planning product. This pattern belongs in a sitemap, not the hero of a planning hub.
- **The planShape groups** (one-night / two-night / day-trip / seasonal articles) are editorially correct but currently may appear below the 16-link grid, which means the actual planning content is buried under an SEO module.
- **Venue cards on the Plans hub** (stayHighlights: Jackalope, Hotel Sorrento, Flinders Hotel hardcoded) are random and will go stale. If stay is to be surfaced on the Plans hub, it should be as "where to base yourself" editorial guidance, not a venue shortlist.

### What should be simplified or removed
- **The 16 mood guide links grid** — replace with the planShape groups as the primary surface. Let the editorial articles carry the reader forward, not a link index.
- **Hardcoded venue highlights** — remove until there is a systematic editorial mechanism for surfacing them (e.g. `featuredPartner: true` + editorial note, or a curatorial editorial_blocks entry).
- **Place highlight cards** (Red Hill, Cape Schanck, Sorrento hardcoded) — same problem. Curate via schema or editorial_blocks, not hardcoded slugs.

### What should become more prominent
- **planShape groups as the hero of the Plans hub** — four clear editorial lanes (One Night / Two Nights / Day Trip / Seasonal) with 3–4 article cards per lane. Clean. Editorial. Scannable.
- **A mood or intent filter** — the 7-axis schema can power a lightweight filter that lets the reader say "weekend + wine + couple + $$$" and see matching itineraries. This is the planning product promise. It doesn't need to be fully built immediately, but the visual affordance should be present.
- **The Quick Note for planning context** — a seasonally relevant one-liner at the top of the hub ("Autumn is the quietest window for hinterland stays. Book directly — most properties don't list on platforms.") sets the editorial tone without adding complexity.

### Recommended interaction model
Arrive → editorial frame / Quick Note ("what's the best kind of Peninsula trip right now?") → four planShape lanes (One Night / Two Nights / Day Trip / Seasonal) → mood/intent filter (lightweight, optional) → newsletter

The destination from the Plans hub should always be an article, not a venue card or a link grid.

### Risks if left unresolved
The Plans hub is PI's strongest claim to being a *planning product* rather than a content site. If it looks like a link directory, the product identity collapses into "editorial guide that also has a links page." The 16-link grid is the most urgent thing to remove from the entire platform.

### Priority
**High.** This is the surface that most directly expresses the "planning product" layer of PI's three-layer architecture.

---

## 6. Commercial / Partner Layer

**Primary job:** *Surface commercial relationships transparently without undermining editorial trust.*

### What works well
- **Schema primitives are correct** — `featuredPartner: boolean` and `affiliateNote: string` on venues are the right lightweight flags.
- **Editorial firewall principle is clear** in the editorial constitution — editorial leads, commercial supports, never dominant.
- **Partners section is not yet publicly linked** — a deliberate hold while the design rules are established. This is the right decision.

### What feels misaligned or conflicted
- **No visual design standard for partner disclosure.** The `featuredPartner` flag and `affiliateNote` text field exist in the schema, but there is no defined visual treatment for how these appear on venue pages. Without a design standard, each page that surfaces a featured partner will improvise — leading to inconsistency and potential trust erosion.
- **No clear editorial/commercial firewall at the template level.** The rule "editorial moves up, sponsored moves down" is correct but is currently a principle without an implementation. When a page renders a `featuredPartner: true` venue, nothing in the template currently enforces where it appears relative to editorial picks.
- **The partner portal** (apply / dashboard / update / claim) exists as pages but the workflow is not defined. A partner who submits an application doesn't yet have a clear journey.

### What should be simplified or removed
- Nothing should be removed — the schema and hidden partner pages are the right foundation. The missing piece is the design rules, not the infrastructure.

### What should become more prominent
- **A clear, elegant disclosure pattern.** A subtle "Partner" label on featured venues — editorially restrained (small, lowercase, never a badge or banner) — is how PI maintains trust while acknowledging commercial relationships. The disclosure should feel like a byline note, not an advertisement flag.
- **The editorial justification for partnership.** A `affiliateNote` like "Jackalope is a Peninsula Insider recommended partner. Our editorial team visits independently." is far more trust-building than a "Sponsored" label alone.
- **The partner portal** — once the commercial layer is designed, this should be a clean partner-facing CMS experience, not just a form page. A partner should be able to update their own venue information, see their editorial status, and understand what PI's editorial process means for their listing.

### Recommended interaction model
**Reader-facing:** featured partner venues appear in editorial lists at the position their editorial quality warrants — never artificially elevated. A subtle, inline "Partner" disclosure appears on the venue card and venue detail page. The `affiliateNote` text renders as a one-line footnote on the venue page.

**Partner-facing:** a clean dashboard (currently stubbed at `/partners/dashboard`) where a partner can see their PI listing, update practical information (hours, booking URL), and understand their editorial status.

### Risks if left unresolved
The longer the partner layer goes without design rules, the more likely it is to be built inconsistently when it does go live. One page with a heavy "SPONSORED" banner is enough to damage editorial trust that took months to build. Define the visual rules before the first partner goes live.

### Priority
**Medium — but urgent before any partner launch.** The schema is ready. The design rules are not. Write them before anything goes live.

---

## Cross-Cutting Observations

### The "Everything Page" Pattern
The most common structural issue across templates is the accumulation of secondary modules that individually justify their presence but collectively overwhelm the primary job. Each template has a clear primary job; the fix is discipline about what is secondary and what is removed.

Practical rule: **if a module could appear on any PI page, it is a secondary module**. Secondary modules go below the fold and are visually quieter than primary content. If a module is specific to this template's job, it earns prominence.

### Quick Notes Are Underused
The `quickNotes` collection is a genuinely distinctive editorial pattern — a low-effort, high-trust voice that no tourism site replicates. It currently surfaces on What's On and Plans, but it could appear on Wine, Eat, Explore, and Place pages as a "from the editor's notebook" callout. One well-crafted seasonal note on the Red Hill page ("The vines are bare through July. The cellar doors are quieter and the lunches are longer.") does more editorial work than six venue cards.

### Hardcoded Slug Arrays Are a Governance Risk
`plans/index.astro` has `['jackalope', 'hotel-sorrento', 'flinders-hotel']` and `['red-hill', 'cape-schanck', 'sorrento']` hardcoded. The `wine/index.astro` has a `benchmarkSlugs` array. These are editorial decisions frozen in code. When editorial priorities change, these arrays won't update themselves. Move curatorial decisions into `editorial_blocks` entries or schema flags (`featured: true`), where editors can update them without touching code.

### The Newsletter Block Is Correct — Protect Its Position
`NewsletterBlock` at the bottom of every content page is correct. The only risk is adding more modules between the content and the newsletter, progressively burying it. Resist this.

---

## Recommended Sequencing

### This sprint (before adding new surface features)
1. **Plans hub** — remove the 16-link grid; make planShape groups the hero
2. **Place pages** — cap downstream venue sections at 3 cards each; move map to a quieter lower position
3. **Journal article pages** — gate downstream card sections to hub-guide formats only; remove from editorial formats
4. **Commercial design rules** — write the partner disclosure visual standard before any partner goes live

### Next sprint
5. **Wine detail pages** — add wine-specific editorial signals to the venue detail template (or create a wine variant)
6. **What's On hub** — elevate weekend picks; separate timely from evergreen; Quick Note to the top
7. **Replace hardcoded slug arrays** with editorial_blocks or schema-flag curatorial decisions

### Defer
8. Planning filter UI (mood/duration/intent) — schema is ready, build when article volume justifies it
9. Partner portal UX — design the workflow once commercial rules are defined
10. Quick Notes expansion to more surfaces — correct direction, low cost, do after core templates are stable

---

## Summary Table

| System | Primary Job | Main Risk | Priority |
|---|---|---|---|
| Place pages | Destination planning + editorial place guide | Directory accumulation below fold | 🔴 High |
| Wine system | Wine country discovery + cellar door planning | Generic venue-template dilutes wine editorial | 🟡 Med-High |
| Journal / Editorial | Immersive reading, editorial authority | Format-agnostic downstream modules break immersion | 🔴 High |
| What's On / Dispatch | Orient quickly to what's happening now | 4 competing content streams vs. 1 clear answer | 🟡 Medium |
| Plans hub | Trip planning with editorial confidence | 16-link grid undermines planning product identity | 🔴 High |
| Commercial layer | Transparent partner integration | No visual design rules = inconsistent disclosure | 🟡 Medium (urgent before launch) |

---

*Document location: `peninsula-insider/next/docs/UX-SYSTEMS-REVIEW-2026-05.md`*
