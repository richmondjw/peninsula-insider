# Peninsula Insider — Editorial & Digital Publishing Audit
**Date:** May 2026  
**Author:** Remy (acting as editorial copywriter, travel journalist, digital publishing strategist)  
**Scope:** Holistic review — entity structure, editorial tone, SEO, AI readability, UX, hierarchy  
**Status:** For James + Emma review and prioritisation

---

## Executive Summary

Peninsula Insider is operating at a significantly higher editorial standard than most comparable regional guides. The destination-first architecture, the schema richness, and the editorial voice are genuine competitive assets. The biggest opportunities are not structural redesigns — they are places where the content model is ahead of the content, where internal linking language is lazier than the editorial voice, and where AI retrieval is leaving structural advantage on the table.

Three findings stand out as most urgent:

1. **`aiSummary` is populated on 2 of 174 articles (1%).** The concierge is reading raw article bodies rather than curated summaries. This is the biggest gap between schema ambition and execution.
2. **Internal linking language on place pages is generic** ("All venues →", "All wine →") — it doesn't reinforce the entity relationship and undersells the editorial hierarchy established elsewhere.
3. **Venue pages have no link back to their parent destination guide.** The hierarchy flows cleanly down (Peninsula → Places → Destination → Category → Venue) but not back up. Venue pages are currently dead ends.

---

## 1. Entity Structure

### Strengths
- The Peninsula → Place → Category guide → Venue hierarchy is clean and now consistently implemented through breadcrumbs, parent links, and the PLACE_SUBPAGES system.
- `places` collection schema is exceptionally rich: `bestFor`, `notFor`, `skip`, `bestDay`, `insiderNote`, `signature`, `stayDuration` — 95% populated across 22 places. This is a genuine AI retrieval advantage most comparable sites don't have.
- `venues` collection has `editorNote`, `signature`, `whyWeGo`, `bestFor`, `ifOnlyOneThing`, `pairWith` — strong schema depth.
- FAQ schema on 100% of articles is unusual and valuable for rich results.

### Issues

**🔴 Venue pages are hierarchy dead ends.**  
`VenueDetailTemplate.astro` shows: venue → articles → itineraries → related venues. It does not link to the parent place destination guide. A user on `/wine/paringa-estate/` has no path back to `/places/red-hill/`. The `PlaceDetailTemplate` now links to `/places/` (back-link) and has the Explore by Experience section. Venue pages need the equivalent.

*Recommendation:* Add a one-line parent link in `VenueDetailTemplate`: "Part of Red Hill → [Red Hill destination guide]" using `data.place?.id` to construct the href. Available on all 141 venues where `place` is set.

**🟡 `wineHubs` places filter in wine/index.astro is hardcoded.**  
The wine hub filters `['red-hill', 'main-ridge', 'merricks', 'balnarring', 'moorooduc', 'tuerong']` directly in source. As wine sub-pages are added or removed, this won't update automatically.

*Recommendation:* Add a `hasWineSubpage: boolean` field to the places schema (default false), set it on the 6 wine-hub places, and derive `wineHubs` dynamically.

**🟡 Stay hub `featuredStaySlugs` still hardcoded.**  
`stay/index.astro` has `['jackalope', 'hotel-sorrento', 'flinders-hotel']` hardcoded. The governance fix applied to Plans hub and Wine hub (editorPick flag) hasn't been applied here.

*Recommendation:* The `editorPick` field already exists on these three venues. Replace the hardcoded array with `venues.filter(v => v.data.editorPick && stayTypes.includes(v.data.type))`.

---

## 2. Page Hierarchy and Title Tags

### Strengths
- Title tag format is consistent across ~89% of pages: `[Page] · Mornington Peninsula · Peninsula Insider` or `[Page] · Peninsula Insider`.
- Hub pages use editorial h1 titles ("The dining rooms that justify the drive") while title tags are utilitarian ("Where to Eat on the Mornington Peninsula") — this is the correct approach: editorial voice on-page, search intent in the title.

### Issues

**🔴 Title separator inconsistency.**  
132 pages use `·`, 8 pages use `|`, 6 pages use `-`. The outlier pages include:
- `/dog-friendly/` — "Dog-Friendly Mornington Peninsula | Peninsula Insider"
- `/events/` — "Signature Events — the Peninsula calendar's anchor moments | Peninsula Insider"
- Several older journal articles

This inconsistency creates inconsistent search result presentation and undermines brand recognition in SERPs.

*Recommendation:* Batch-update the 14 outlier pages to use `·` as the separator. One-hour audit pass.

**🟡 `[slug].astro` place page title uses a dynamic construct that's correct but could be more specific.**  
Current pattern: "[Place] — The Peninsula Insider Guide". This is clean but the `—` separator differs from the `·` used elsewhere. Minor inconsistency.

**🟡 H1 / title relationship on some hub pages.**  
The eat hub h1 ("The dining rooms that justify the drive") is intentionally editorial and disconnected from the title tag. This is good. But some sub-pages have identical h1 and title constructs, which misses the opportunity to use the h1 for editorial voice while the title serves search intent.

---

## 3. Editorial Tone and Voice

### Strengths
- The destination card intros (tightened tonight) now have the right weight hierarchy — primary places carry more prose, secondary places carry less. This is correct.
- `signature` fields on venues are consistently strong and concise (67–178 chars, most in the 80–130 range).
- The `editorNote` fields on venues are editorial in voice — not tourism blurbs, not spec sheets. They read like notes from someone who visited.
- The `insiderNote` and `skip` fields on places are doing useful editorial work that most guides don't attempt.

### Issues

**🟡 Some venue `signature` fields are running too long.**  
The longest signatures (170–178 chars) are crossing from one-liner into mini-paragraph territory. `signature` should be a single sentence — the single strongest editorial reason to go. Anything over 140 chars is likely two ideas.

Flagged: `point-leo-estate-villas` (170), `port-phillip-estate-restaurant` (170), `two-bays-brewing` (170), `maxs-red-hill-estate` (173), `point-leo-wine-terrace` (178).

*Recommendation:* Light trim on these five — each to a single confident sentence under 130 chars.

**🟡 Opening rhythm variation needed across place intros.**  
Several place intros still follow near-identical sentence shapes:
- "Flinders sits on the wild southern edge..."
- "Blairgowrie is the quieter neighbour..."
- "Rye is the pivot point..."
- "Mornington was the gateway town..."

This is noted and partially addressed. Future editing passes should apply the same variational awareness to the remaining cards. Not urgent — just worth flagging as ongoing editorial housekeeping.

**🟡 Hub page section deks occasionally over-explain.**  
Some `places__sub` paragraph content on hub pages describes what the section is rather than adding editorial value. Example: "The Peninsula's strongest destinations, ordered by editorial importance. Each page is a complete guide — atmosphere, planning, best for, and the local category guides that go deeper."

This is explaining the product, not the place. Readers don't need to be told the page is "ordered by editorial importance." The curation should speak for itself.

*Recommendation:* Remove or significantly shorten section deks that explain the page's editorial logic. Let the content carry the argument.

---

## 4. Internal Linking Language

### Strengths
- Breadcrumbs are clean and consistently implemented.
- "← Red Hill destination guide" on wine sub-pages (added in recent sprint) is exactly the right language — specific, hierarchical, editorial.
- "← Explore more Peninsula destinations" on place pages is good.
- The "Explore by Experience" section names destination-specific guides correctly ("Red Hill Wine", "Red Hill Stays").

### Issues

**🔴 "All venues →", "All wine →", "All stays →" on place pages are generic and miss entity relationship reinforcement.**  
These appear in PlaceDetailTemplate after the venue grid sections. They link to `/eat/`, `/wine/`, `/stay/` — the category hub, not the place-filtered view. The link text doesn't reinforce that these venues are in Red Hill specifically.

*Recommendation:* Change link text to place-specific:
- "All Red Hill restaurants →" → `/eat/?place=red-hill`
- "All Red Hill cellar doors →" → `/wine/red-hill/` (the sub-page exists)
- "All Red Hill stays →" → `/stay/red-hill/`

This strengthens the entity relationship, improves crawl signaling, and aligns with the hierarchy the rest of the site has established.

**🔴 Venue pages have no hierarchy link to their place destination guide.**  
A user at `/wine/paringa-estate/` knows they're in Red Hill (it's in the breadcrumb), but there's no editorial link offering them the Red Hill destination guide. The breadcrumb is navigation; what's missing is a content relationship link.

*Recommendation:* Add to `VenueDetailTemplate`, below the editor note or in the facts aside:
"Part of the [Place] destination → [View the full Red Hill guide]"
Using `data.place?.id` to construct the link to `/places/[place-slug]/`.

**🟡 "Journal →" and "Plans →" as link labels on place pages are too bare.**  
In PlaceDetailTemplate, the cross-links to journal articles and itineraries use "Journal →" and "Plans →" as CTA labels. These are generic navigation terms, not editorial invitations.

*Recommendation:* Make place-specific: "Read in the Journal →" / "Plan a [Place] weekend →" — small change, clearer intent.

**🟡 `townReadSlugs` on the Places landing page is hardcoded.**  
Four journal article slugs hardcoded in `places/index.astro`. Same governance issue as other hardcoded arrays. Use article `featured: true` flag or a `section: places` + `format: hub-guide` filter instead.

---

## 5. AI Readability and Retrieval

### Strengths
- `aiSummary` and `faq` fields exist on the articles schema — correct forward-thinking architecture.
- FAQ data is 100% populated across 174 articles — this is exceptional and gives the concierge structured Q&A to retrieve.
- Place schema fields (`bestFor`, `notFor`, `skip`, `insiderNote`, `bestDay`) are 95% populated — these are precisely the fields an AI retrieval system needs to answer "which Peninsula town is best for X?" correctly.
- `editorial_blocks` collection pattern (hub copy as queryable content) is the right architectural direction.

### Issues

**🔴 `aiSummary` is populated on 2 of 174 articles (1%).**  
This is the most significant gap between schema ambition and execution on the site. `aiSummary` is designed to give the concierge a structured 3-5 point summary of each article for retrieval. Without it, the concierge reads raw article markdown — which works, but is less precise, less reliable for extraction, and harder to cite.

The two articles that have it presumably behave noticeably better in concierge responses. This gap should be filled systematically for the top articles by traffic and editorial importance.

*Recommendation:* Prioritise `aiSummary` population for the top 30 articles by search volume and topic coverage (at minimum: area guides, seasonal guides, the cellar-door shortlist, the long lunch piece, the one-night escape, the couples weekend). An AI-assisted batch-write of 3–5 bullet summaries per article is the right approach — each bullet one factual sentence for retrieval. This is a single sprint of structured content work, not editorial writing.

**🟡 `editorial_blocks` adoption is partial — hub copy still hardcoded in many pages.**  
Pages like `eat/index.astro` and `stay/index.astro` have editorial intro copy hardcoded in the .astro template rather than in `editorial_blocks` entries. This makes that copy invisible to the concierge.

*Recommendation:* Migrate hub intro copy for the top 5 hubs (Eat, Wine, Stay, Explore, Plans) to `editorial_blocks` entries. Each hub should have one block per season or one evergreen block.

**🟡 Venue `editorNote` and `signature` are not in the concierge corpus.**  
The concierge can retrieve articles and places, but venue-level editorial content (the richest and most specific content on the site) may not be fully indexed depending on corpus coverage.

*Recommendation:* Confirm venue content is in the Pagefind search index and in whatever corpus the concierge queries. If not, add venue pages to the corpus.

---

## 6. SEO and Search Intent

### Strengths
- The title tag pattern (`[Intent] · Mornington Peninsula · Peninsula Insider`) is well-matched to head terms.
- Destination pages use factual lede + editorial intro — the factual lede handles entity declaration, the intro handles voice. This is the right structure.
- FAQ schema on articles is a rich results opportunity that most competitors haven't implemented.
- The `lastVerified` field creates an honest verification culture that signals freshness.

### Issues

**🟡 `modifiedTime` on many pages is a static hardcoded date from the last content sprint.**  
Pages like `eat/markets.astro`, `eat/pubs.astro` etc all have `modifiedTime="2026-04-24"` hardcoded. As content is updated (venue additions, editorial edits), these dates don't update, potentially misrepresenting freshness to Google.

*Recommendation:* Either (a) compute `modifiedTime` from the most recently `lastVerified` venue on each hub, or (b) update the date on each content edit as a discipline. The former is technically cleaner.

**🟡 Faceted sub-pages (eat/brunch, eat/date-night etc) are useful but their meta descriptions are thinly differentiated.**  
Most eat sub-pages have descriptions that name 2-3 venues and a context line. This is fine. But some are templated to a degree that a searcher can't distinguish `eat/date-night` from `eat/cellar-door-lunch` from the SERP description alone.

*Recommendation:* The top 10 eat/wine/stay sub-pages by search volume should have descriptions that lead with the editorial angle, not just venue names. Example for date-night: not "The best restaurants for a date night..." but "Peninsula date nights don't need the predictable dinner reservation. These rooms — some hatted, some cellar-door, some almost accidentally candlelit — earn the occasion." Even half that as a description would differentiate.

**🟡 The `wineHubs` sub-region pages have strong Halliday-referenced content but thin local SEO signals.**  
`/wine/red-hill/` ranks for some Red Hill winery terms, but the page title "Red Hill Wineries · Mornington Peninsula · Peninsula Insider" competes with pages from Visit Victoria, various booking platforms, and individual wineries. The PI pages have superior editorial quality but could signal authority more clearly through:
- Winery count in the title ("Red Hill Wineries — 18 cellar doors, ranked")
- Or a factual authority signal in the meta description ("Mornington Peninsula's benchmark Pinot sub-region, reviewed by Peninsula Insider's editorial team.")

---

## 7. Planning Intelligence

### Strengths
- The `planShape` taxonomy (one-night / two-night / day-trip / seasonal) on articles is a genuinely smart planning primitive.
- The `weekend-picks` collection with required `editorVerdict` is a strong editorial gate.
- Quick Notes / Notebook pattern is distinctive and right — no comparable guide has this.
- `itineraries` schema with 7-axis taxonomy is rich and forward-looking.

### Issues

**🟡 Quick Notes are on What's On and Plans — but not on Wine, Eat, or Place pages.**  
A wine-specific seasonal note ("The vines are bare through July — the cellar doors are quieter and the lunches are longer") on `/wine/red-hill/` during winter would be the most valuable single line on that page for planning intelligence. Same for eat ("Red Hill Market moves inside during July and August — the Saturday rhythm is different").

*Recommendation:* Expand Quick Notes section surfacing to wine sub-pages and place pages. The infrastructure exists; this is a content-editorial decision, not a build decision.

**🟡 `bestDay` on place pages is rarely prominently surfaced in search results or AI responses.**  
The `bestDay` field exists and is beautifully structured ("Bakery at 8am, walk to the pier, lunch at the General Store, afternoon at the back beach"). This is the kind of itinerary intelligence that directly answers "how do I spend a day in Flinders?" — but it's formatted as a string, not a structured array of stops with times, which would be more retrievable.

*Recommendation:* For the top 10 place pages by traffic, consider evolving `bestDay` from a free-text string to an array of stops with time labels. This makes it directly citable by the concierge and potentially usable as a structured data signal.

**🟡 Itinerary content is schema-rich but the planning hub still surfaces articles not itineraries as the primary planning objects.**  
The Plans hub leads with planShape-grouped articles. The `itineraries` collection exists with rich 7-axis taxonomy, but itinerary cards are secondary on the Plans hub. For a user asking "give me a two-night Peninsula weekend itinerary," the structured itinerary content is more AI-retrievable than the article.

*Recommendation:* Review whether the planShape article groups should be supplemented by a structured itinerary rail at the top of Plans — the two coexist rather than one replacing the other.

---

## 8. Mobile Readability and Scan Patterns

### Strengths
- Cards are restrained — names and images carry the weight, as they should.
- The two-tier primary/secondary structure on Places is the right mobile hierarchy.
- Hub pages use eyebrows + strong h2s for section scanning.

### Issues

**🟡 Some CompareBlock rows are too dense on mobile.**  
The Plans hub CompareBlock (one night vs two nights) has 5 rows per column. On mobile this renders as a long scroll within each card. For orientation-level decisions, 3 rows is likely enough.

**🟡 Venue grid section headers on place pages use `h2` for "Where to eat and drink in Red Hill" — which is a long h2 for mobile.**  
These render at the same heading level as the editorial h2s elsewhere on the page, creating visual noise at the heading level on narrow viewports.

*Recommendation:* Consider using the `label label--accent` eyebrow pattern + a shorter h2 for these section headers ("Eat & drink" with the eyebrow handling the place context).

---

## 9. Priorities Summary

### 🔴 Urgent (do in next sprint)

| Issue | Impact | Effort |
|---|---|---|
| `aiSummary` — populate top 30 articles | High (AI retrieval quality) | Medium (structured content work) |
| Venue pages → parent place link | High (hierarchy completion) | Low (template change) |
| Title separator inconsistency (14 pages) | Medium (SERP consistency) | Low (batch find/replace) |
| "All venues →" → place-specific link text | Medium (entity signaling) | Low (template change) |

### 🟡 Refinement (next 4–8 weeks)

| Issue | Impact | Effort |
|---|---|---|
| `aiSummary` — remaining articles | High (AI retrieval) | High (content work) |
| Stay hub hardcoded `featuredStaySlugs` → `editorPick` | Low-medium (governance) | Low |
| `wineHubs` hardcoded → `hasWineSubpage` flag | Low-medium (governance) | Low |
| Hub section deks that explain rather than add value | Medium (editorial quality) | Low |
| 5 long venue signature fields (170+ chars) | Low (voice consistency) | Low |
| Quick Notes on wine sub-pages + place pages | High (planning intelligence) | Low (content work) |
| `modifiedTime` dynamic computation | Medium (SEO freshness signals) | Medium |
| `editorial_blocks` migration for top 5 hub intros | Medium (AI corpus) | Medium |

### 🔵 Future evolution (3–6 months)

| Idea | Rationale |
|---|---|
| `bestDay` → structured stop array | More AI-citable, better concierge responses |
| Itinerary rail on Plans hub | Structured planning objects alongside editorial articles |
| Faceted sub-page meta descriptions strengthened | Better SERP differentiation |
| Wine sub-region pages — stronger authority signals in title/meta | Competitive SEO signal for core Red Hill, Main Ridge queries |
| `townReadSlugs` on Places landing → schema-driven | Governance consistency |
| Venue editorNote + signature in confirmed concierge corpus | AI retrieval of venue-level editorial content |

---

## 10. What's Already Working Exceptionally Well

Worth naming explicitly — these should be protected and expanded, not disrupted:

1. **The place schema population rate (95% for insiderNote, bestDay, skip).** Most editorial guides have zero structured planning fields. PI has them on 21 of 22 places. This is a genuine moat.

2. **FAQ schema on 100% of articles.** No comparable Australian regional guide has this. Rich results opportunity and AI retrieval advantage.

3. **The `editorNote` quality on venues.** The notes read like a knowledgeable local, not a tourism board. This voice consistency across 141 venues is hard to achieve and harder to replicate.

4. **Destination-first architecture (locked tonight).** The hierarchy is now clean, scalable, and coherent for both human and AI navigation.

5. **The `weekend-picks` collection with required `editorVerdict`.** Editorial gate-keeping built into the schema — this prevents the drift that eventually turns curation into aggregation.

6. **The Quick Notes / Notebook pattern.** No other guide has this. It creates a real-time editorial voice signal that is small in cost and high in perceived value. Expand it; don't let it atrophy.

---

*Document location: `peninsula-insider/next/docs/EDITORIAL-AUDIT-2026-05-17.md`*  
*Total articles reviewed: 174 | Venues: 141 | Places: 22 | Collections: 21*
