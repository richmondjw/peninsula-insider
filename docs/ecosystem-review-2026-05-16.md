# Peninsula Insider — Ecosystem Structural Review
**Date:** 16 May 2026  
**Author:** Remy (Architect)  
**Requested by:** Emma Richmond  
**Status:** For review — implementation pending sign-off

---

## Framing

This review treats Peninsula Insider as a growing editorial recommendation ecosystem, not a collection of website pages. The questions throughout are: does each surface have a clear job, does it own that job distinctly, does it strengthen or dilute the whole, and does it set up a commercial layer that feels editorial rather than transactional?

One structural truth runs through everything: Peninsula Insider is a planning publication. Readers arrive with a decision to make — where to eat on Saturday, what to do if it rains, whether the Peninsula is worth the drive this weekend. Every page should move them toward a confident decision or deepen their relationship with the Peninsula as a place. Pages that do neither are friction, not content.

---

## Structural Issues Identified Before Page Review

Three cross-site issues need calling out upfront because they affect almost every page.

**1. Plans vs Escape URL confusion**  
The footer navigation links "Plans" to `/escape/`. The main nav links to `/plans/`. Both directories exist and contain near-identical content. This is a live URL cannibalisation risk and a trust signal problem for search. One needs to be canonical; the other redirected. Recommendation: `/plans/` wins (it's the cleaner noun, matches the editorial framing). `/escape/` redirects.

**2. About + Methodology + Editorial Approach — three overlapping pages**  
`/about/` contains the old manifesto-style content ("The Peninsula deserves better than a brochure"). `/methodology/` contains process-focused content. `/editorial-approach/` is the new canonical page. About and Methodology are search-indexed duplicates. Both should redirect to `/editorial-approach/` or be deliberately repurposed (see About section below).

**3. Niche pages are orphaned**  
Golf, Spa, Fishing, Boating, Dog-friendly, Weddings, Corporate exist as separate pages in the footer but are structurally disconnected from the main nav. They have high SEO potential for specific-intent searches but are receiving no internal link equity from the pillar pages. They need a home — either integrated into Explore or explicitly positioned as "specialist guides."

---

## Page-by-Page Review

---

### 1. Homepage

**Current state:** Cinematic editorial cover + Peninsula This Weekend block + Places rail + Plans teasers + Editor's Letter + Newsletter.

**Editorial purpose — what it should do**  
The homepage is the cover. It sets the tone, signals the season, and routes visitors to the right section for their intent. It does not need to contain everything. A reader who understands the Peninsula after 10 seconds of scrolling the homepage is served better than a reader who sees a comprehensive directory.

What belongs: the editorial cover, the weekend brief (time-sensitive planning anchor), a fast route to each pillar, and one seasonal signal that says "this is what the Peninsula is right now." The Editor's Letter belongs — it's the editorial voice that distinguishes PI from a directory.

What should NOT belong: the full places rail at current depth, duplicate article cards that also appear in Journal, and planning widgets that belong in Plans. The homepage is not a directory index.

**User intent**  
Two primary intents arrive at the homepage: (1) "I'm visiting the Peninsula this weekend — what should I do?" and (2) "I keep hearing about the Peninsula — what is it actually like?" The first intent is served by the weekend brief and pillar nav. The second is served by the editorial cover and Editor's Letter. These two intents should be visible within the first two scrolls, not buried.

Confusion currently exists: the Places rail and Plans cards create a third intent pathway (research mode) that competes with both planning and inspiration before the reader has oriented.

**SEO/search role**  
The homepage should own: "Mornington Peninsula guide," "what to do Mornington Peninsula," "Mornington Peninsula weekend." It should not try to rank for individual venue or activity searches — those live on pillar pages. Strength here comes from topical authority signals: fresh content, clear editorial structure, strong internal linking to section hubs.

Current gap: the homepage meta description and H1 structure are editorially strong but do not include the geographic/planning search terms that pull high-intent weekend planners.

**AI discovery role**  
AI retrieval queries for the homepage type: "What is Peninsula Insider?", "What's on the Mornington Peninsula this weekend?", "Best guide to the Mornington Peninsula." The cinematic cover and editorial structure are good for brand impression but the AI-retrievable structured content (the weekend brief, section descriptions, editor's framing) needs to be in clean, extractable prose — not locked inside JavaScript render logic or JSON arrays. The `dispatchWeekend` and seasonal blurb fields are good; they need to be in the rendered HTML where crawlers and AI parsers reach them.

**Commercial / partnership role**  
The homepage is the highest-trust surface on the site. Commercial placement here must be invisible unless asked for. The right model is editorial sponsorship of a section, not a placed unit:

- *"Peninsula This Weekend — Autumn edition, presented with [Cellar Door Name]"* — seasonal contextual alignment, disclosed quietly, feels like a natural editorial partnership rather than an ad
- Seasonal cover swap: a long-form piece that features a partner venue as the editorial subject — disclosed as featured editorial
- No banners. No partner logos in the hero. No "brought to you by" header strips.

The homepage commercial model is: a small number of very high-quality seasonal editorial partnerships, surfaced exactly once, where they add genuine context.

**Design / UX refinement**  
The current hierarchy needs one adjustment: the Places rail should be thinned or removed from below the fold and replaced with a cleaner "Where are you going?" destination picker that routes faster to pillar content. The homepage should feel like a cover and a lobby — not a directory. The Editor's Letter works well but currently sits too far down the page for first-time readers to understand its role.

---

### 2. Eat & Drink

**Current state:** Hub page with venue directory, AudiencePicker, CompareBlock, ArticleCards, EventStrip, NewsletterBlock.

**Editorial purpose**  
Eat & Drink is the venue discovery surface for restaurants, cafes, bakeries, pubs and markets. Its job is to help a reader decide where to eat on a specific visit — filtered by occasion, party type, and mood. It is a selection guide, not a database.

What belongs: curated venue cards, occasion-based filtering (long lunch vs brunch vs date night vs family), a seasonal editorial pick, and the relevant articles from the Journal that answer the planning question. A CompareBlock (e.g. "Laura vs Port Phillip Estate for a long lunch") is exactly right — it provides decision guidance, not ranking.

What should NOT belong: every venue the site knows about, unfiltered. The VenueDirectory with all venue types creates a paradox of choice that undermines editorial trust. The reader should leave Eat & Drink knowing where to eat, not knowing every option. The EventStrip can stay but should surface food-occasion events only.

**User intent**  
Primary: "Where should we eat on Saturday?" Secondary: "What's the best long lunch on the Peninsula?" Overlap/confusion: the Eat hub pulls in wine venues (cafes at wineries, cellar door lunches) that partially duplicate the Wine hub. Cellar-door-lunch is already a sub-page at `/eat/cellar-door-lunch/`. The distinction between "eating at a winery" (Eat) and "visiting a cellar door" (Wine) is real but currently blurry in the navigation.

**SEO/search role**  
Owns: "best restaurants Mornington Peninsula," "where to eat Mornington Peninsula," "long lunch Mornington Peninsula," "hatted restaurants Mornington Peninsula." Individual venue pages carry the specific venue searches. The hub carries the category searches.

Current gap: the sub-pages (`/eat/long-lunch/`, `/eat/hatted-restaurants/`, `/eat/brunch/`) are good for long-tail SEO but may be thin in content depth — they need either richer editorial introductions or be merged into a strong filter on the hub page.

**AI discovery role**  
Queries: "best restaurants near me for a long lunch," "Mornington Peninsula fine dining," "where to eat with kids on the Peninsula." The AudiencePicker filter structure is actually good for AI — it provides structured facets. However the ArticleCards need clear editorial framing (not just image + title) so AI parsers understand why each recommendation exists.

**Commercial / partnership role**  
The Eat hub is the most natural home for editorial partnership surfaces:

- *Featured Long Lunch* — one curated seasonal long-lunch pick, a single named restaurant, editorially framed, disclosed as a featured partner. Sits above the venue grid, designed to read like editorial not advertising. Equivalent to a "recommended by the editor this autumn" placement.
- Seasonal campaign slots: a winter fire-and-feast restaurant partner appearing in the CompareBlock as a contextual recommendation for the "cold weekend" audience segment.
- AudiencePicker outcome: when a reader selects "Date night" or "Long lunch," the filtered result could surface a featured partner venue first — disclosed, editorially framed, relevant to the stated intent.

**Design / UX refinement**  
The AudiencePicker is the strongest UX element on the page. It should be more prominent — move it above the venue grid, not below the hero. Currently the first experience on the page is a list of venues sorted by authority score (hats). That's a directory entry point, not an editorial one. Lead with the decision-making tool, then show results.

---

### 3. Wine

**Current state:** Hub page with venue directory grouped by type (wineries / producers / breweries / distilleries), benchmark comparison, article cards, cellar door events strip.

**Editorial purpose**  
Wine is the Peninsula's most distinctive category — 200+ cellar doors, some of the best cool-climate pinot and chardonnay in Australia. The Wine hub should own the cellar door discovery and decision space completely. Its job: help a reader plan a cellar door day, understand the region's wine identity, and decide which stops are worth their time.

What belongs: curated cellar door cards with editorial verdicts, a regional map or regional breakdown (Red Hill ridge vs Dromana/Moorooduc), benchmarks (Pt Leo, Montalto, Paringa), occasion-based routing (cellar door lunch / tasting only / family-friendly cellar doors / appointment-only), and the Journal articles that frame the wine landscape.

What should NOT belong: producers and distilleries that aren't cellar-door experiences should not share equal footing with wineries. The current grouping treats a small-batch distillery the same as a landmark estate. These are different visitor experiences and should be framed differently — distilleries and breweries could be a secondary section or routed to Explore.

**User intent**  
Primary: "Which cellar doors are worth visiting this weekend?" Secondary: "What makes the Peninsula wine region distinctive?" The current hub does both but the transition between discovery-mode and context-mode isn't clean. Benchmark comparisons (Dexter vs Ocean Eight for lunch-forward visits) are strong here.

Overlap with Eat: cellar-door-lunch is a real overlap zone. Resolve by: cellar-door-lunch lives in Wine (the wine identity drives the experience), but cross-links to Eat for the restaurant-specific positioning. The rule: if the primary reason to visit is the wine, it's in Wine. If wine happens to be present but food is the reason, it's in Eat.

**SEO/search role**  
Owns: "Mornington Peninsula wineries," "cellar doors Mornington Peninsula," "Mornington Peninsula wine tour," "best pinot noir Mornington Peninsula." Strong topical authority here is the highest-value SEO territory on the whole site. 86 cellar-door-dispatch articles in the journal represent enormous latent authority that needs better internal linking to the Wine hub.

Current gap: the 86 cellar-door dispatches are mostly living in the Journal, which means the Wine hub isn't surfacing them efficiently. A dedicated "From the cellar door" editorial section on the Wine hub would pull these in and dramatically strengthen the hub's topical signal.

**AI discovery role**  
Queries: "best cellar doors for a long lunch on the Mornington Peninsula," "which wineries are good for families," "Mornington Peninsula wine trail recommendations." The venue card structure is good but the regional breakdown needs to be more prominent — AI retrieval works best when geographic + occasion facets are clear in the structure.

**Commercial / partnership role**  
Wine is the second most natural commercial surface after Eat:

- *Featured Cellar Door* — a seasonal featured cellar-door partner, framed as "the editor's cellar door pick this autumn," appearing in the rail above the venue grid. Single placement per season, editorially written, disclosed.
- Destination guide partner: a long-form "Red Hill Ridge in Autumn" guide, featuring a named cellar-door partner as the anchor experience. The guide is editorial; the partnership is the context it's published in.
- *Wine Weekends presented with [Partner]* — the Signature Events wine weekends surface is a natural home for a seasonal drinks partner (a producer, not a marketing board).

**Design / UX refinement**  
The benchmark comparison section (Pt Leo, Montalto, Paringa etc.) is the strongest editorial element — it should be earlier in the page. Currently it appears after a long venue list. Lead with benchmarks + editorial framing, then offer the full directory. The visitor who knows where to start trusts the recommendation more than the one who scrolls 200 cards.

---

### 4. Explore

**Current state:** Hub page with experiences, places rail, itinerary cards, article cards, event strip for nature/family/arts events.

**Editorial purpose**  
Explore is the catch-all for everything that isn't eating, drinking, or staying. Its job should be: outdoor experiences, Peninsula orientation, and the activities that define a day on the Peninsula. Walks, beaches, hot springs, kayaking, markets, arts.

What belongs: outdoor and activity experiences, the places rail (because exploration is place-based), orientation content (first-visit drive, where to base yourself), and seasonal activity recommendations.

What should NOT belong: content that belongs in the niche pages (golf, spa/wellness, fishing, boating). Currently Explore contains `/explore/spas-and-wellness/`, `/explore/golf/`, `/explore/markets/` — but separate `/spa/`, `/golf/`, and `/markets/` pages also exist. This is the primary cannibalisation risk for Explore. The niche pages need to be either consolidated into Explore as sections, or Explore should explicitly route to them as "specialist guides."

**User intent**  
Primary: "What should we do on the Peninsula that isn't eating or sleeping?" Secondary: "I've never been — where do I even start?" The CompareBlock on Explore is well-used (hinterland vs coast, rainy day vs sunny day routing). The itinerary cards are the right format here — they turn exploration intent into a plannable shape.

Overlap with Plans: both Explore and Plans surface itinerary cards. The distinction should be: Explore shows activities and day-shapes; Plans shows multi-day structured weekends with stays. This needs to be cleaner in how cards are presented and labelled.

**SEO/search role**  
Owns: "things to do Mornington Peninsula," "Mornington Peninsula activities," "Peninsula walks," "best beaches Mornington Peninsula." The keyword territory is enormous but fragmented across too many sub-pages. The current sub-page structure (`/explore/best-walks/`, `/explore/beaches/`, `/explore/hot-springs/`) is broadly correct for long-tail but needs stronger hub-level content to carry topical authority.

**AI discovery role**  
Queries: "what to do on the Mornington Peninsula this weekend," "rainy day activities Mornington Peninsula," "best walks near Sorrento." The `/explore/rainy-day/` sub-page is a strong AI retrieval target — rainy-day planning is a high-frequency question. It should have richer editorial framing and be more prominently linked from the Explore hub.

**Commercial / partnership role**  
Explore has natural surfaces for experience-based partnerships:

- *Rainy Day Rescue — presented with [Hot Springs / Indoor Experience Partner]* — the rainy-day section is a natural seasonal commercial surface. A hot springs partner appearing contextually when weather is poor is genuinely useful.
- *Walking Guide — supported by [Outdoor Gear or Visitor Centre Partner]* — a supporting partner on the walks content, disclosed, adding practical value (gear list, trail maps).
- Destination guide sponsorship: a seasonal "What to do in Flinders this winter" guide, featuring a partner experience as the anchor.

**Design / UX refinement**  
The Explore hub currently feels the most "everything goes here" of all the pillars. It needs a clearer information hierarchy: (1) Seasonal pick — what to do on the Peninsula right now, (2) By outdoor type (walks / beaches / water / markets / arts), (3) By mood (rainy day / sunny day / with kids / adventure). The places rail should move earlier — exploration is inherently place-based.

---

### 5. What's On

**Current state:** Event calendar with Signature Events rail, seasonal events, markets, weekly recurring events, and Peninsula This Weekend dispatch.

**Editorial purpose**  
What's On is the live planning surface. Its job: answer "what's happening this weekend?" with editorial opinion attached, not just a list. The nav intro is right: "the events calendar with an opinion attached, kids-graded, weather-flagged, worth-the-drive labelled." That is exactly the right framing and needs to be more visible in the page itself.

What belongs: the Peninsula This Weekend dispatch (the editorial opinion layer), the Signature Events rail, time-filtered upcoming events with editorial verdicts, and the community markets and recurring event rhythms that define Peninsula life. The "weather-flagged" and "worth the drive" judgements are strong editorial differentiators that should be more visible in the card design.

What should NOT belong: a comprehensive database of every event with no editorial weighting. Events without editorial verdicts should be in a secondary index, not the main feed. The editorial weight should come first.

**User intent**  
Primary: "What's on this weekend specifically?" Secondary: "Is there anything worth planning around in the next month?" Overlap/confusion: the Signature Events rail sits alongside regular events without clear hierarchy. A reader planning around the Portsea Polo (a major annual event) is in a different planning mode than someone looking for a Sunday market. These two intents need clearer visual separation.

**SEO/search role**  
Owns: "what's on Mornington Peninsula this weekend," "events Mornington Peninsula [month]," "markets Mornington Peninsula," "Portsea Polo [year]." The Signature Events pages are excellent long-tail SEO targets — annual events that readers search for repeatedly by name. These pages need to stay rich and be updated annually.

**AI discovery role**  
Queries: "what's happening on the Mornington Peninsula this weekend," "is there a market on this Sunday," "Peninsula events in May." The date-anchored structure is strong. The key gap: the Peninsula This Weekend dispatch is the richest editorial piece on this page but it's currently a separate article format — it should be structurally surfaced at the top of What's On, not just linked. AI retrievers looking for "this weekend" answers should hit this content immediately.

**Commercial / partnership role**  
What's On is underutilised for editorial commerce:

- *Peninsula This Weekend — presented with [Seasonal Partner]* — the weekend brief itself is a natural editorial sponsorship surface. A cellar door or restaurant appearing as the seasonal weekend anchor is contextually appropriate. One partner per seasonal edition (autumn, winter, spring, summer), disclosed in the dispatch header.
- Event category sponsorship: *Markets — curated by Peninsula Insider, supported by [Local Partner]* as an ongoing seasonal category.
- Signature Events: individual Signature Event pages are natural single-event sponsorship surfaces — *Portsea Polo 2026 coverage, presented with [relevant luxury partner]*.

**Design / UX refinement**  
The Peninsula This Weekend dispatch needs to be the editorial lead on What's On, not a card in a list. It should be a full-bleed section at the top: cover image, editorial intro, weekend picks, then the wider calendar below. Currently the page opens with the Signature Events rail — that's the right category hierarchy but wrong seasonal emphasis. In weeks when there's no major signature event, the opening section should default to the weekend brief.

---

### 6. Journal

**Current state:** Editorial hub with featured article, editor's picks, articles grouped by format (Peninsula This Weekend / Guides / Features / Reviews & Lists / Stay Notes), and Newsletter block.

**Editorial purpose**  
Journal is the long-form, depth-first editorial surface. Its job: carry the editorial voice and publish the pieces that make Peninsula Insider worth reading rather than just useful. Cornerstone guides, features, the Editor's Letter, stay notes, the cellar door shortlist.

What belongs: features, guides, stay notes, the cellar door shortlist, the Peninsula This Weekend dispatches (as an archive), the Editor's Letter, investigations. Deep editorial content that rewards re-reading and builds the publication's authority.

What should NOT belong: time-sensitive event content (that belongs in What's On), venue discovery content that belongs in Eat or Wine, or content that is too thin to carry the "Journal" label. Quick notes are a separate format and should have their own surface.

Key structural issue: 86 of the roughly 140 published articles are cellar-door dispatches. This means the Journal is predominantly a wine review archive, even though the framing suggests a broader editorial publication. This creates a mismatch between the Journal's editorial promise and its actual content weight. Recommendation: cellar-door dispatches should be primarily surfaced in the Wine hub (as a "From the cellar door" section), with the Journal hub showing the broader editorial range more prominently.

**User intent**  
Primary: "I want to read something good about the Peninsula." Secondary: "I'm looking for the specific piece about [topic/place]." Overlap with other sections: Plans articles live in the Journal URL structure (`/journal/[slug]`) even when they're flagged as `section: plans`. This routing confusion needs to be resolved — Plans content should eventually live at `/plans/[slug]/`.

**SEO/search role**  
The Journal carries long-tail editorial SEO: "mornington peninsula long lunch guide," "cape schanck guide," "what to do with kids on the mornington peninsula," "rainy day peninsula guide." The cornerstone articles (The Long Lunch, The One-Night Escape, The Cellar Door Shortlist) are the most valuable SEO assets on the site and need to be treated as canonical, continuously updated guides — not static articles.

**AI discovery role**  
The Journal is the richest AI retrieval surface on the site. Queries that should retrieve Journal content: "write a Peninsula Insider style recommendation for [venue]," "what does Peninsula Insider say about Sorrento," "Peninsula Insider rainy day ideas." The structured article format (headline, intro, body, verdict) is already well-formed for AI retrieval. Key gap: the guides and cornerstone articles need to be explicitly structured with FAQ-style subheadings so AI retrieval surfaces the right section.

**Commercial / partnership role**  
Journal is the highest-trust commercial surface but also the most sensitive:

- *Featured Insider Edition* — a seasonally commissioned long-read, featuring a partner venue or experience, written to PI voice standards and disclosed as "featured editorial." This is the flagship commercial product. One per quarter. Equivalent to a cover feature in a print magazine.
- *Fireplace Season guide — presented with [Accommodation Partner]* — a winter itinerary guide, editorially written, contextually aligned with a named accommodation partner. The partner adds value (exclusive reader offer, booking link); the editorial adds credibility.
- Cornerstone guide updates: annual refresh of cornerstone guides, each optionally supported by a category-appropriate partner.

**Design / UX refinement**  
The Journal hub needs a cleaner editorial hierarchy. Currently five format categories sit at equal weight below the featured article. The hierarchy should be: (1) Featured this issue (full-bleed), (2) This week's dispatch (Peninsula This Weekend), (3) Cornerstones (the permanent editorial anchors), (4) Everything else by format. The cornerstones are the highest-value returning-reader content and should be permanently prominent.

---

### 7. Plans

**Current state:** Hub page with itineraries grouped by length (one-night / two-night / longer), stay highlights, place highlights, Plans articles. URL confusion: both `/plans/` and `/escape/` exist.

**Editorial purpose**  
Plans is the pre-shaped weekend surface. Its job: give a reader a complete, opinionated weekend structure — where to stay, what to eat, what to do, in what order. It's the highest-intent planning surface on the site.

What belongs: itineraries (structured weekend shapes with named venues and activities), a stay recommendation for each plan, seasonal framing, and the Journal articles that function as planning guides rather than editorial features. Plans is where the editorial voice becomes most practically useful.

What should NOT belong: general exploration content (that belongs in Explore), or venue discovery without a shape around it (that belongs in Eat/Wine/Stay). Plans should only show content where the output is a complete, actionable weekend.

URL resolution required: `/plans/` is canonical. `/escape/` redirects to it. Footer and nav updated consistently. This is a quick fix with significant structural benefit.

**User intent**  
Primary: "Give me a weekend plan — I don't want to figure it all out myself." Secondary: "I want to plan a specific type of weekend (winter / romantic / family / quick escape)." This is the most high-value reader intent on the site — a reader who wants a plan is ready to book. The conversion opportunity here is strong.

**SEO/search role**  
Owns: "mornington peninsula itinerary," "weekend trip mornington peninsula," "one night mornington peninsula," "mornington peninsula winter weekend." The individual itinerary pages are strong long-tail targets. Current gap: the Plans hub needs a stronger editorial introduction and seasonal differentiation — "What kind of Peninsula weekend are you planning?" as the opening framing.

**AI discovery role**  
Queries: "plan me a weekend on the Mornington Peninsula," "what's a good two-night itinerary for the Peninsula," "family-friendly weekend mornington peninsula." Plans is the ideal AI retrieval target for structured itinerary queries. The itinerary content format (named venues, sequenced activities, stay recommendation) is exactly what AI planners pull for personalised trip construction. This content needs to stay richly detailed and venue-specific.

**Commercial / partnership role**  
Plans is the highest-value commercial surface from a conversion standpoint:

- *Winter Peninsula — presented with [Accommodation Partner]* — a seasonal winter weekend plan, with a named accommodation partner as the anchor. Editorial voice throughout; partner provides the booking link and potentially a reader offer. Disclosed clearly, adds genuine value.
- *The Long Weekend Plan — featured stay: [Partner Hotel]* — an itinerary that centres on a specific accommodation experience, editorially written, disclosed as a featured partner experience.
- Contextual booking integration: itinerary cards could carry a subtle "Book the stay" link when a commercial partnership exists for that accommodation. Never prominent; only where the stay is genuinely recommended.

**Design / UX refinement**  
The current grouping by night-length (one-night / two-night / longer) is functional but not editorial. Lead instead with mood/occasion groupings: *Quick escape / Long weekend reset / With kids / Romantic / Winter retreat / Summer coast.* The night-length filter can be secondary. A reader choosing a weekend plan is choosing a feeling, not a duration.

---

### 8. About

**Current state:** Old manifesto-style page with "The Peninsula deserves better than a brochure" opening. Outdated relative to the new editorial tone established across the site.

**Editorial purpose — current vs. recommended**  
The About page currently duplicates content that now lives better in Editorial Approach. Under the new page architecture, About needs a distinct role or it should redirect.

Recommended repositioning: **About** becomes the publication's founding story and human context — who built Peninsula Insider, why the Peninsula, what makes this different from tourism content. It's the "meet the publication" surface, not the "understand our editorial process" surface. That's Editorial Approach's job.

About should read like a short editor's note about the publication itself: why it exists, what the founders care about, what the Peninsula means to them as a place. This is warmer and more personal than Editorial Approach. It should not duplicate the four-principle cards or the coverage rules.

If this repositioning happens, `/about/` stays live as a distinct page with new content. If not, it redirects to `/editorial-approach/`.

**SEO/search role**  
The About page has minimal direct search value but carries trust signals for brand searches: "who runs Peninsula Insider," "is Peninsula Insider reliable." A human, personal About page strengthens brand E-E-A-T signals more than another version of the editorial principles.

---

### 9. Editorial Approach

**Current state:** Post-cleanup: calm publication philosophy, four principles, coverage rules, accuracy statement, commercial transparency, publication voice section. Much improved.

**Editorial purpose**  
Reader-facing trust page. Its job: reassure a reader that the editorial is independent, grounded in experience, and run by people who actually care about the Peninsula. It is not a process document, not a partner sales tool, not a manifesto.

What belongs: the four principles (reader-outcome focused), coverage decisions framed for readers (not internal process), accuracy and corrections, and a brief disclosure about commercial relationships. The publication voice section (The Insider, contact details) belongs here as the closing note.

What should NOT belong: internal process detail (that went with the old "Refused Practices" section), operator-framing, or business-facing commercial detail (that belongs on Partners).

Current state is close to correct after recent edits. One remaining watch item: the hero title "A thoughtful editorial guide to the Mornington Peninsula" is both the page H1 and the meta description's key phrase. Make sure the SEO title is differentiated enough to pull distinct search queries.

**AI discovery role**  
Queries: "is Peninsula Insider editorial independent," "how does Peninsula Insider choose venues," "Peninsula Insider editorial standards." The structured principles format (four cards, coverage rules) is good for AI retrieval of trust and methodology questions.

**Commercial note**  
No commercial placement on this page. Ever. It is the trust page.

---

### 10. Partner With Us

**Current state:** Post-cleanup: hero with vineyard image + Founders Prospectus link, pillar section, who-we-work-with, opportunities list, editorial independence section, selective-by-design section, enquiry form.

**Editorial purpose**  
Business-facing invitation page. Its job: convince the right Peninsula business that working with PI is a credible, premium option — and disqualify the wrong businesses quietly. It should read with quiet confidence, not a sales pitch.

What belongs: the value proposition for Peninsula businesses (reach planning-intent readers, editorial environment, selective by category), the opportunity types (without pricing), the editorial independence statement, and the enquiry form. The Founders' Prospectus link is the right addition — serious prospects go there for more detail.

What should NOT belong: reader-facing editorial principles (those are on Editorial Approach), pricing or tier matrices (those are in the post-enquiry conversation), or anything that reads like standard media kit copy.

Current state is close to correct. Gap: the enquiry form's Formspree endpoint is still a placeholder (`ENDPOINT_LIVE = false` in the JS). This is operational debt — a business making an enquiry gets a mailto: fallback, which is functional but unprofessional for a premium proposition. Provisioning Formspree or switching to a proper form handler is the next operational task.

**SEO/search role**  
Low direct search intent. The page is primarily reached through direct navigation or referral. SEO value comes from brand authority signals and potential searches like "advertise on Peninsula Insider," "partner with Peninsula Insider."

**Commercial note**  
This IS the commercial page — it should make the commercial model legible and appealing without being a brochure. The opportunities list (Featured Partner Profiles, Seasonal Campaigns, Event Promotion, Publication Partnerships, Offers, Destination Sponsorships) correctly names the categories without pricing. This is the right approach.

---

### 11. Contact

**Current state:** Post-May-15 update: editorial-first positioning, story tips card, venue coverage section, Peninsula Days section, The People Behind the Peninsula section. `stories@peninsulainsider.com.au` in use but not yet provisioned.

**Editorial purpose**  
Community input page. Its job: invite story tips, venue corrections, Peninsula Days photo contributions, and general editorial contact. It is the portal between the publication and the community it covers.

What belongs: story tips, venue corrections, the Peninsula Days photo contribution route, the community editorial series invitation.

What should NOT belong: partnership enquiries (those go to Partners), venue submission for listing (that has its own `/submit/` page). These routes should be clearly distinguished on the Contact page.

Operational note: `stories@peninsulainsider.com.au` needs provisioning. Google Workspace admin action required. Until that happens, all mailto links on Contact go to a dead address. This is the highest-priority operational fix on the site.

---

### 12. Footer / Place Architecture

**Current state:** Seven pillars + seven niche pages + About column (Editorial Approach / Partner With Us / Contact) + utility row (Map / Newsletter / Privacy / Cookies).

**Place architecture**  
The Places collection (21 towns/areas) is currently a supporting layer — places appear in rail elements across the site but `/places/` itself doesn't carry much editorial weight. This is an underutilised SEO asset.

Each place page (`/places/sorrento/`, `/places/red-hill/` etc.) is a natural anchor for location-specific search: "what to do in Sorrento," "best restaurants in Red Hill," "where to stay near Cape Schanck." These pages should carry: the essential planning context for that town, editorial curated venue picks (not a full directory), the best nearby walks/beaches/experiences, and links to relevant Journal content.

Currently the place pages feel like area guides but lack the editorial specificity that makes them genuinely useful as planning surfaces. Each place page should feel like the Journal piece the editor would write about that town — personal, specific, seasonal.

**Niche pages**  
Golf, Spa, Fishing, Boating, Dog-friendly, Weddings, Corporate are in the footer but disconnected from the main pillar structure. These represent high-intent, specific-purpose searches that PI could own strongly. Recommended architecture:

- Golf, Spa, Fishing, Boating → route through Explore as "specialist guides," cross-linked prominently from Explore hub. Each has a dedicated page that functions as the authoritative PI guide to that category.
- Dog-friendly → prominent feature of Explore and Plans (it's a planning modifier, not a standalone category). The `/dog-friendly/` page stays but is surfaced more visibly in Explore filters.
- Weddings, Corporate → these are distinct commercial audiences. They should be positioned in the Partners section or under a commercial/events umbrella, not in the editorial footer. Their SEO value for event planning searches is high.

**Footer structure recommendation**  
The current footer is correct but could be stronger with a seasonal editorial surface — one curated "This season on the Peninsula" row at the top of the footer, updated quarterly, linking to the current seasonal plan or editorial focus. This keeps the footer active and editorially alive rather than a static link index.

---

## Commercial Architecture — Scalable Editorial Model

The goal is a commercial layer that feels like editorial, not advertising. The model:

### Tier 1: Seasonal Editorial Partnerships (highest value, lowest volume)
One per season (4 per year) across the four main surfaces: Peninsula This Weekend, Plans, Journal, and Wine. Each is a named partner that contextually fits the season and section. Editorially written, clearly disclosed, designed to add reader value. Priced as premium editorial features, not ad placements. Examples:
- *Winter Peninsula — presented with Jackalope* (Plans)
- *Autumn cellar door season — curated with Pt Leo Estate* (Wine hub / dispatch)
- *Peninsula This Weekend — this edition supported by Peninsula Hot Springs* (What's On / dispatch)

### Tier 2: Destination Guide Partners (mid-tier, geography-anchored)
A curated destination guide (e.g., "Sorrento in winter") produced with one named partner whose experience anchors the guide. The guide is editorially genuine. The partner is the contextual anchor and booking reference. Published quarterly per destination. Disclosed as "featuring [partner]."

### Tier 3: Featured Category Spots (always-on, contextual)
One curated featured placement on each major hub page (Eat, Wine, Explore, Plans), rotating quarterly. Always editorially framed, category-appropriate, disclosed. Examples:
- *Featured Long Lunch* (Eat hub) — one restaurant, editorially written, sits above the venue directory
- *Featured Cellar Door* (Wine hub) — one winery, editorially written, above the venue grid
- *Rainy Day Rescue — this season* (Explore hub) — one experience recommended for wet weather
- *Featured Stay* (Plans hub) — one accommodation as the seasonal plans anchor

### Tier 4: Event Sponsorships (event-specific, disclosed)
Signature Event pages (Portsea Polo, Peninsula Film Festival, Wine Weekends) as single-event featured partnerships. One partner per event page, disclosed, contextually relevant. Low volume, high specificity.

### What this architecture produces
- 4 seasonal partnerships (major revenue, high editorial impact)
- 4 destination guides per quarter (medium revenue, strong SEO)
- 4 hub featured spots rotating quarterly (recurring, lower per-unit, high frequency)
- Variable event sponsorships (event-dependent)
- All disclosed. None dominant. All editorially grounded.

### What it never includes
- Banner ads in any format
- Partner logos in navigation or hero positions
- Sponsored search results styled as editorial
- "Top X" lists controlled by commercial relationships
- Programmatic ad units
- Off-Peninsula brands

---

## Duplication and Cannibalisation Risk Summary

| Risk | Pages affected | Recommendation |
|---|---|---|
| Plans vs Escape URL split | `/plans/` + `/escape/` | Canonical = `/plans/`, redirect `/escape/` |
| About vs Editorial Approach | `/about/` + `/editorial-approach/` | Reposition About as publication story; or redirect |
| Methodology orphan | `/methodology/` | Redirect to `/editorial-approach/` |
| Explore vs niche pages | `/explore/spas-and-wellness/` vs `/spa/` | Consolidate under Explore as specialist guides |
| Eat vs Wine (cellar door lunch) | `/eat/cellar-door-lunch/` | Own by Wine; cross-link from Eat |
| Journal vs Plans article routing | Articles with `section: plans` at `/journal/[slug]/` | Move Plans content to `/plans/[slug]/` routing |
| Cellar-door dispatches diluting Journal identity | 86 of ~140 articles are cellar-door format | Surface primarily in Wine hub; Journal shows broader range |
| Quick Notes without a public hub | 59 quick notes with no clear surface | Create a Quick Notes hub or integrate into relevant pillar pages |

---

## Priority Recommendations

**Immediate (this week)**  
1. Provision `stories@peninsulainsider.com.au` — live mailto links on Contact pointing to a dead address is the highest-priority operational fix  
2. Redirect `/escape/` to `/plans/` and update all internal links  
3. Redirect `/methodology/` to `/editorial-approach/`  
4. Provision Formspree for the Partners enquiry form  

**Near-term (next 2–4 weeks)**  
5. Reposition `/about/` as publication founding story (warm, human, distinct from Editorial Approach)  
6. Move cellar-door dispatch surfacing to Wine hub — "From the cellar door" editorial section  
7. Consolidate niche pages (spa, golf, fishing) under Explore as specialist guides  
8. Strengthen Plans hub editorial framing — lead with occasion/mood grouping, not night-length  
9. Make Peninsula This Weekend the editorial lead on What's On, not a card in a list  
10. Establish Featured Long Lunch and Featured Cellar Door as the first two editorial partnership surfaces — design, disclose, test  

**Medium-term (next 1–3 months)**  
11. Place architecture: deepen individual place pages to full editorial guide standard  
12. Cornerstone guide annual refresh programme — Long Lunch, Cellar Door Shortlist, Rainy Day guide treated as living documents  
13. Journal routing for Plans content — `/plans/[slug]/` becomes the canonical URL for itinerary-adjacent articles  
14. Quick Notes public hub — 59 pieces of editorial content with no clear public surface is wasted editorial weight  
15. First Seasonal Editorial Partnership — launch one, learn, refine the model  

---

## In Summary

Peninsula Insider already has the editorial foundations of a serious regional publication. The structural work ahead is about clarifying what each surface owns, reducing the noise between similar surfaces, and establishing a commercial layer that earns trust rather than spending it.

The site's single biggest opportunity: the 86 cellar-door dispatches and the 59 quick notes represent hundreds of thousands of words of Peninsula-specific editorial content that is structurally underserved. Getting these surfaces working harder — through better hub integration, stronger internal linking, and AI-retrievable formatting — is the highest-leverage editorial architecture move available without writing a single new word.

The commercial opportunity follows the editorial clarity. A reader who trusts the editorial will accept a tasteful, contextually appropriate commercial placement. A reader who experiences commercial placements before trust is established will not convert and will not return. Build the editorial surfaces right first; the commercial layer lands on top of them, not under them.

---

*Filed: 16 May 2026 | Remy — Architect, Peninsula Insider*
