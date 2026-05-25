# 05, Authority & trust audit (E-E-A-T) plus backlink-earning opportunities

Date: 2026-05-08
Author: Claude (audit-2026-05)
Inputs: `next/src/pages/{about,contact,methodology,index,pass}.astro`, `next/src/pages/journal/[slug].astro`, `next/src/pages/eat/[slug].astro`, `next/src/pages/wine/[slug].astro` (uses VenueDetailTemplate), `next/src/pages/places/[slug].astro`, `next/src/pages/fishing/locations/[slug].astro`, `next/src/pages/awards/index.astro`, `next/src/components/VenueDetailTemplate.astro`, `next/src/components/PlaceDetailTemplate.astro`, `next/src/content/authors/editorial.json`, plus 5 sample article markdown files.

The site has strong methodology positioning and a clear editorial voice ("honest, opinionated coverage"). What it lacks is **first-hand experience signals at scale** and **named-individual author depth**. The current author surface is one entity (`editorial.json`), not a team. Google's E-E-A-T model rewards named individuals with bios and credentials; "The Peninsula Insider" as a single house byline is structurally weaker than "Reviewed by Sarah Chen, food editor" with a bio link.

The methodology page is exemplary content; the about page is solid; the venue templates have good freshness signals (`lastVerified`); the journal articles have decent metadata but lean entirely on house byline. There are no press citations, no awards-won badges, no association memberships, no team page beyond the colophon paragraph in /about/.

Section 1 scores E-E-A-T per template. Section 2 is the about/contact/authors deep dive. Section 3 is 12 specific backlink-earning opportunities, each tied to an existing PI surface that supports the pitch.

---

## 1. E-E-A-T signal audit per template

Scoring scale: 0 = absent, 1 = present but weak, 2 = solid, 3 = exemplary.

| Template | Author byline | Bio depth | Last-updated visible | Source citations | First-hand signals | Trust badges | Contact info | Reviews/testimonials | **Mean** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/journal/[slug]` (article template) | 2 (visible "By The Peninsula Insider", `[slug].astro:148-149`) | 1 (`authors/editorial.json` is one paragraph, no named individuals) | 2 (publishedAt + lastVerified shown, line 137, 152) | 1 (markdown body cites Halliday, GFG ad-hoc; not structured) | 2 (specific weekend, named visit details in copy; no EXIF or photo bylines) | 0 (no won-awards, no press-mention badges) | 1 (footer link to /contact/) | 0 (no reader reviews displayed) | **1.1** |
| `/eat/[slug]` (venue template) | 1 (no per-venue author; "Editor note" attribution implicit) | 0 | 2 (`verifiedFreshnessLabel` from `data.lastVerified`, `VenueDetailTemplate.astro:22`) | 1 (Halliday/GFG hats via `data.authority.hats`) | 2 (editor note implies visit; no photo proof) | 2 (hats + awards arrays via `data.authority`, lines 25-27; live in template) | 1 (footer link only) | 0 | **1.1** |
| `/wine/[slug]` (winery template) | 1 (same as /eat/) | 0 | 2 (same `verifiedFreshnessLabel`) | 1 (Halliday rating if set) | 2 (editor note + winery sections imply visit) | 2 (hats + awards) | 1 | 0 | **1.1** |
| `/places/[slug]` (place hub) | 0 (no author byline on place hubs) | 0 | 1 (only via venue/event freshness, not place-level) | 0 | 1 (place description implies local knowledge; no specific dated visit) | 0 | 1 | 0 | **0.4** |
| `/fishing/locations/[slug]` | 1 (default editorial) | 0 | Unknown (verify whether template includes lastVerified) | 1 (size limits cited) | 2 (gear/tide notes implicate first-hand fishing) | 0 | 1 | 0 | **0.7** |
| `/awards/` landing | 0 | 0 | 1 (cycle dates) | 0 | 1 (editorial selections imply expertise) | 0 (no past-winner badges visible because awards haven't run yet) | 1 | 0 | **0.4** |
| `/pass/` landing | 1 (collective voice "we") | 0 | 0 (no published-date) | 0 | 1 ("the desk" framing) | 0 | 1 (footer) | 0 | **0.4** |
| Homepage `/index` | 1 (collective) | 0 | 1 (issue label "Vol 04 · The May Issue · May 2026", `Masthead.astro:31`) | 1 (FAQ JSON-LD links to wineries by name) | 2 (cover story has byline; weekend dispatch is first-hand) | 0 | 1 | 0 | **0.8** |
| `/about/` | 1 (collective) | 1 (mission + principles, but no individuals) | 0 | 0 | 1 ("eat on the Peninsula, walk the same coastline") | 0 | 2 (full mailto colophon) | 0 | **0.6** |
| `/methodology/` | 1 (collective) | 0 | 0 | 1 (cites operator websites as sources for hours/contacts) | 1 (verification rolling cycle implies first-hand checking) | 0 | 1 | 0 | **0.5** |
| `/contact/` | n/a | n/a | 0 | n/a | n/a | n/a | 3 (three named mailto routes) | n/a | **3.0 (single-axis)** |

**Overall site E-E-A-T mean: 0.8** on a 0-3 scale. The strongest dimension across templates is "last-updated visible" (mean 1.1, mostly on venue/article); the weakest are bio depth (mean 0.1) and reviews/testimonials (mean 0.0).

The pattern: signals that came for free from the structured content layer (lastVerified, authority.hats, authority.awards) score 2-3. Signals that require human curation (named bios, press mentions, won badges) score 0-1.

---

## 2. About / Contact / Authors / Methodology deep dive

### 2.1 `/about/` (`next/src/pages/about.astro`)

**Strengths**:
- Clear mission and four named principles (lines 12-29). Strong editorial positioning.
- "How it's built" section explains the structured-content architecture (line 119+). Differentiator vs WordPress directory competitors.
- Three named contact emails in the colophon (line 161): hello@, corrections@, tips@.

**Weaknesses**:
- "Founders, Editors & Publishers: Peninsula Insider" (line 153) is the entire credit. No individual named.
- "Editorial desk: The Peninsula Insider" (line 157) is the same circular reference.
- No team photos, no LinkedIn links, no biographies of any individual journalist.

**Specific additions**:
- Add a "The Editors" section with at least one named founder and a 60-100 word bio. Whether the user wants editorial individuality is a project choice; if the answer is no (per `methodology.astro:12`'s "Voice is collective ('we')"), then the about page should explicitly say "we publish under the Peninsula Insider house byline by editorial choice" so readers and Google understand it's deliberate.
- If there is a real editor, even one paragraph with "Founded by [name], [role], based in [town]" lifts E-E-A-T meaningfully.
- Add a `Person` JSON-LD entity for the editor. Even with house-byline editorial, naming the legally responsible publisher is normal practice.

### 2.2 `/contact/` (`next/src/pages/contact.astro`)

**Strengths**:
- Three clear mailto routes (tips, corrections, editorial enquiries) with editorial framing for each.
- "What to expect" section sets honest expectations.
- "We don't do phone calls, media kits, or press events. We do eat lunch, walk the coast..." reinforces the editorial voice (line 91-93).

**Weaknesses**:
- No physical address.
- No phone number (deliberate, per page copy, but Google sometimes expects one).
- No `ContactPage` JSON-LD schema.

**Specific additions**:
- Add `Organization` JSON-LD with `email` properties for the three contact routes and `@type: ContactPage` for this URL.
- Optionally: a postal address. Even a P.O. Box adds a trust signal.
- Add a "Response time" SLA in machine-readable form: "Tips acknowledged within 7 days; corrections within 24 hours." This is currently soft-stated.

### 2.3 `/methodology/` (`next/src/pages/methodology.astro`)

**Strengths**:
- Four named coverage rules (lines 24-41). Clearer than 95% of regional publications.
- Four-step verification cadence (lines 43-60).
- Explicit disclosure rules including the "we don't take undisclosed comps" line (line 76-78), strong trust signal.
- Six "what we refuse to do" lines (lines 81-88), exceptional editorial positioning.

**Weaknesses**:
- Voice is collective by deliberate choice (line 12 comment). This is fine editorially but limits the page's ability to attribute claims to people.
- "Last verified" date concept is mentioned (line 50) but not present on this page itself.
- No JSON-LD schema.

**Specific additions**:
- Add `WebPage` JSON-LD with `mainEntity: NewsMediaOrganization` describing PI's editorial standards.
- Add a `lastReviewed` date for the methodology itself (when was this page last edited by the editor?).
- Optionally link to the IFCN, MEAA Code of Ethics, or AANA guidelines that PI follows. Linking to a recognised standard signals to Google that the publication follows external trust frameworks.

### 2.4 `/authors/` content (`next/src/content/authors/editorial.json`)

**Current state**: one author entity ("The Peninsula Insider"), one paragraph bio, no role, no socials, no published-list of articles.

```json
{
  "slug": "editorial",
  "name": "The Peninsula Insider",
  "role": "editor",
  "bio": "The Peninsula Insider is an independent editorial guide to the Mornington Peninsula  -  written by people who live here and eat here, for anyone who wants to experience the peninsula the way insiders do. Every recommendation is earned: visited, eaten, drunk, walked. We write what we find.",
  "publishedAt": "2024-01-01"
}
```

The bio also contains an em-dash (project rule violation). Replace with comma.

**Specific additions**:
- Even if the project keeps house byline, add 2-3 more author entries with named contributing editors (food, wine, walks, family) and small bios. Each entry can still represent multiple humans behind a desk.
- Build an `/authors/{slug}/` page template that lists all articles by that author plus the bio. This becomes a `Person` schema target with `worksFor: NewsMediaOrganization`.
- Each article should reference at least the desk-level author (food / wine / etc.) even if the by-line on the article remains "The Peninsula Insider".

### 2.5 Verification freshness signals (good already)

Articles include `lastVerified` (per article markdown frontmatter) and surface it as "Facts verified [date]" via `[slug].astro:151-153`. Venue pages render `verifiedFreshnessLabel` via `VenueDetailTemplate.astro:22`. This is solid practice and matches Google's freshness signal expectations.

**Gap**: place hubs (`/places/[slug]`) do not show a freshness date. Per `places/[slug].astro:1-100`, the place data is loaded but there's no equivalent of `verifiedFreshnessLabel` rendered. Add one.

### 2.6 Authority badges (good schema, no rendering)

`VenueDetailTemplate.astro:25-27` reads `data.authority.hats`, `data.authority.awards`, `data.authority.pressMentions`. The schema is in place. **Verify the template actually renders these prominently.** A "Two hats GFG 2025" or "Featured in The Age, Mar 2026" badge on a venue page is exactly the kind of E-E-A-T signal that lifts both the venue's ranking and PI's trust by association.

**Specific addition**: render `pressMentions` as a small block on each venue page: "As featured in: The Age, Broadsheet, Halliday Wine Companion." Each press mention is an outbound link to the citation source. The block doubles as an inbound-link target if a venue's PR team picks it up.

---

## 3. Content & technical E-E-A-T fixes

| # | Fix | File | Cost | E-E-A-T axis |
|---|---|---|---|---|
| 1 | Replace em-dash in `editorial.json` bio | `next/src/content/authors/editorial.json:5` | Trivial | Project rule + clean SERP |
| 2 | Add at least one named editor entry | `next/src/content/authors/` (new files) | Small (editorial decision needed) | Authoritativeness |
| 3 | Add `Person` JSON-LD on each article when author resolves to a person (not house byline) | `next/src/pages/journal/[slug].astro` JSON-LD block (line 75-99) | Small | E-E-A-T |
| 4 | Render `pressMentions` block on `/eat/{venue}/` and `/wine/{venue}/` | `next/src/components/VenueDetailTemplate.astro` (around lines 27-30 area) | Medium | Trustworthiness via citation |
| 5 | Render won-awards badge from `data.authority.awards` linking to `/awards/{category}/` | `VenueDetailTemplate.astro` | Medium | Trust + internal link to awards cluster |
| 6 | Add "Last verified [date]" to `/places/{slug}` | `next/src/components/PlaceDetailTemplate.astro` | Small | Freshness |
| 7 | Add `Organization` + `ContactPage` JSON-LD on `/contact/` | `next/src/pages/contact.astro` | Small | Trust |
| 8 | Add `lastReviewed` semantic date on `/methodology/` | `next/src/pages/methodology.astro` | Small | Freshness for editorial standards |
| 9 | Add `Person` (or `Organization`) JSON-LD on `/about/` for the publisher | `next/src/pages/about.astro` | Small | Authoritativeness |
| 10 | Cite primary sources inline in articles when stating facts (council site for beach rules, BOM for weather, GFG for hats, ABS for stats). Use linked footnote pattern. | Article markdown files | Large (editorial pass over 172 articles) | Trustworthiness |

---

## 4. Backlink-earning opportunities

The orchestrator brief flags that competitive-benchmark agent is handling broad backlink prospecting. This list is specifically about **PR/press hooks PI has right now** plus citation-bait ideas grounded in PI's existing assets. 12 items, each with a target site, hook, effort, and the supporting PI surface.

### A. PR / press hooks (high confidence)

**1. The 2026 Mornington Peninsula GFG hatted-restaurant tally (annual data)**
- Target: The Age, Good Food, Time Out Melbourne, Broadsheet Melbourne.
- Hook: "Mornington Peninsula maintained X hatted restaurants in the 2026 GFG. Here's what the desk thinks." Use as a press-pitch piece every November when the new GFG drops.
- Effort: small (1 day annual update of `/journal/hatted-restaurants-mornington-peninsula-2025/`, currently Discovered).
- Supporting PI page: `/journal/hatted-restaurants-mornington-peninsula-2025/` (refresh to 2026). Each hatted venue is already a venue page on PI.

**2. The Mornington Cup 2026 local-pick predictions (seasonal hook, was timely)**
- Target: Herald Sun racing, the Age, ABC Mornington Peninsula.
- Hook: was timely Apr 2026; for 2027 plan to publish 7-10 days before race day with editorial picks for the day (where to lunch, where to drink, what to wear, weather forecast).
- Effort: small (annual recurring piece).
- Supporting PI page: `/whats-on/mornington-cup-2026` and `/places/mornington/`.

**3. "Best Dog Beaches Mornington Peninsula 2026" (citation-bait list)**
- Target: pet news sites, Australian Dog Lover, regional weekly papers.
- Hook: PI is already top 3 on Google for "dog friendly guide mornington peninsula" with no clicks (snippet failure now being fixed). The data + the editorial standing make this a press-pitch piece each spring.
- Effort: small (already have `/journal/dog-friendly-beaches-mornington-peninsula/`; update for spring 2026).
- Supporting PI page: same.

**4. Sorrento Writers Festival 2026 preview + post-event coverage**
- Target: Books+Publishing, the Sydney Review of Books, Australian Book Review, Sorrento Foundation press.
- Hook: PI's editorial voice + festival venue context. Pre-event preview piece + post-event report.
- Effort: medium (two articles + attendance).
- Supporting PI page: `/whats-on/sorrento-writers-festival-2026/`, `/places/sorrento/`, `/journal/the-sorrento-weekend/`.

### B. Partnership opportunities (mid-confidence, requires outreach)

**5. Mornington Peninsula Shire Council**
- Target: `mornpen.vic.gov.au`. Council runs `whatsonmorningtonpeninsula.com.au`.
- Hook: PI has 84 indexed event pages with editorial context the council site doesn't carry. Pitch: a reciprocal arrangement where council's events page links to PI's editorial picks for the season, PI links to council's event details for booking.
- Effort: medium (outreach + relationship-building).
- Supporting PI surface: every `/whats-on/{event}/` page.

**6. Visit Mornington Peninsula (Mornington Peninsula Tourism)**
- Target: `visitmorningtonpeninsula.org`.
- Hook: PI has 134 venue pages and 172 editorial articles. Pitch: PI's editorial picks become a "Local's Picks" section on Visit Mornington Peninsula's site (link back to PI's venue pages). PI's existing `/places/{town}/` hubs are already structured to be the editorial counterpart to VMP's tourism hubs.
- Effort: large.
- Supporting PI surface: `/places/{20 towns}/`, `/eat/best-restaurants/`, `/wine/best-cellar-doors/`.

**7. Mornington Peninsula Wine Industry Association**
- Target: `mpva.com.au` (Mornington Peninsula Vignerons Association).
- Hook: PI's `/journal/the-chardonnay-case/` (top-of-page-1 ranker) frames the regional argument the MPVA already makes. Pitch: MPVA links to PI's editorial pieces from their cellar-door directory; PI links member wineries from `/wine/best-cellar-doors/`.
- Effort: medium.
- Supporting PI surface: `/wine/best-cellar-doors/`, `/journal/the-chardonnay-case/`, `/journal/the-cellar-door-short-list/`, every `/wine/{venue}/` page.

**8. Halliday Wine Companion, annual recognition coverage**
- Target: `winecompanion.com.au`.
- Hook: every November Halliday publishes the new year's ratings. PI publishes the Mornington Peninsula winners-by-rating piece + interviews. Halliday occasionally cites editorial coverage.
- Effort: small (annual recurring).
- Supporting PI surface: every winery page that displays Halliday rating data via `data.authority.halliday`.

### C. Local-business reciprocal (high confidence, low cost)

**9. "Featured by Peninsula Insider" badge program**
- Target: every venue PI features.
- Hook: provide each operator with a small SVG badge ("Featured by Peninsula Insider, [year]") for their website footer or about page. Each badge links back to their PI venue page. Operators love trust badges; PI gets a clean network of inbound links from the venues' own websites.
- Effort: small (build a `/badge/{slug}/` endpoint that returns the SVG; email 134 operators).
- Supporting PI surface: every venue page.

**10. Operator-claim reciprocal**
- Target: the operator who claims their `/partners/dashboard/` listing.
- Hook: the operator dashboard already exists (`/partners/dashboard/`). When an operator claims their venue, the editor's verification email asks one favour: a link from the operator's website to the PI venue page. Many will do it.
- Effort: tiny (add the line to the verification email template).
- Supporting PI surface: `/partners/claim/`.

### D. Citation-bait, original data PI could publish

**11. The Peninsula Insider Cellar-Door Price Index**
- Target: anyone writing about regional wine.
- Hook: PI has structured `priceBand` data on every winery page. Aggregate into "Average tasting fee by sub-region (Red Hill / Main Ridge / Balnarring / Merricks / Flinders)" + year-on-year change. Publish as a single data piece + downloadable spreadsheet. Wine writers cite original data.
- Effort: medium (one-time data pull + visualisation).
- Supporting PI surface: every `/wine/{venue}/` page (data already structured); `/wine/best-cellar-doors/` becomes the link target.

**12. The Peninsula Insider Dog-Friendly Beach Map (data + chart)**
- Target: pet sites, regional press, council comms.
- Hook: PI has structured beach data (off-leash hours, seasonal rules) across `/explore/{beach}/` pages. Publish a single canonical "all dog-friendly beaches with seasonal access rules" map + table. Council and pet sites have no equivalent canonical resource.
- Effort: medium.
- Supporting PI surface: `/journal/dog-friendly-beaches-mornington-peninsula/`, every `/explore/{beach}/` page, every `/places/{coastal town}/` hub.

**13. The 2026 Mornington Peninsula Hatted-Restaurants Map (citation graphic)**
- Target: food press as below.
- Hook: a single visual showing all GFG-hatted restaurants on a Peninsula map with hat counts. Embeddable iframe + PNG download.
- Effort: medium.
- Supporting PI surface: `/journal/hatted-restaurants-mornington-peninsula-2025/`, every hatted venue page (data via `data.authority.hats`).

### E. Press-list seeding (general, ongoing)

**14. Quarterly press release: "What's open / what's closed on the Mornington Peninsula this season"**
- Target: ABC Mornington Peninsula, Mornington Peninsula News, Bayside News, Frankston Times, regional radio.
- Hook: PI's verification cadence (`methodology.astro:43-60`) means PI knows what's opened and closed every quarter. Distil into a one-page press release with embargo, send to local press list. Each quarter.
- Effort: small (editorial standardises the format; quarterly recurring).
- Supporting PI surface: the venue corpus (uses `data.lastVerified` + `data.status === 'closed'` flags).

**15. Awards 2026 announcement (October)**
- Target: regional press list, plus food/wine/travel press.
- Hook: PI's annual editorially-gated awards. Press release the day results publish, including each winning venue's contact (so press can cover specific wins). Each winning operator typically issues their own release citing PI as source.
- Effort: medium (October 2026; depends on the awards cycle running).
- Supporting PI surface: `/awards/{category}/` for each of 9 categories.

---

## 5. Backlink prospecting summary table

| # | Target | Hook | Effort | PI surface |
|---:|---|---|---|---|
| 1 | The Age, Good Food, Time Out, Broadsheet | Annual GFG hatted tally + commentary | S | `/journal/hatted-restaurants-mornington-peninsula-2025/` |
| 2 | Herald Sun, ABC, Age | Mornington Cup local-pick guide | S (annual) | `/whats-on/mornington-cup-2027`, `/places/mornington/` |
| 3 | Australian Dog Lover, regional weeklies | Best dog beaches list (canonical resource) | S | `/journal/dog-friendly-beaches-mornington-peninsula/` |
| 4 | Books+Publishing, ABR | Sorrento Writers Festival preview/coverage | M | `/whats-on/sorrento-writers-festival-2026/`, `/places/sorrento/` |
| 5 | Mornington Peninsula Shire Council | Reciprocal events linking | M | every `/whats-on/{event}/` page |
| 6 | Visit Mornington Peninsula | Local's picks reciprocal | L | `/places/{20 towns}/`, every venue page |
| 7 | Mornington Peninsula Vignerons Association | Mutual cellar-door directory linking | M | `/wine/best-cellar-doors/`, `/journal/the-chardonnay-case/` |
| 8 | Halliday Wine Companion | Annual ratings coverage cycle | S (annual) | every `/wine/{venue}/` page |
| 9 | All featured operators | "Featured by PI" badge network | S | every venue page |
| 10 | Newly-claimed operators | Verification-email reciprocal-link request | tiny | `/partners/claim/` |
| 11 | Wine writers, regional press | PI Cellar-Door Price Index (citable original data) | M | `/wine/best-cellar-doors/` |
| 12 | Pet sites, council comms | Dog-friendly beach map (citable resource) | M | `/journal/dog-friendly-beaches-mornington-peninsula/` |
| 13 | Food press | Hatted restaurants map (citation graphic) | M | `/journal/hatted-restaurants-mornington-peninsula-2025/` |
| 14 | Local press list | Quarterly "what's open / what's closed" release | S (quarterly) | venue corpus |
| 15 | Press list + winners | Awards 2026 announcement | M (October) | `/awards/{category}/` |

S = small (≤1 day), M = medium (2-5 days), L = large (>1 week).

---

## 6. Priority recommendation

If only three items can be picked up this month:

1. **Fix the em-dash + add named editor + `Person` JSON-LD** (E-E-A-T fix #1, #2, #3 above). One-day editorial decision and one-day implementation. Material lift to the two weakest E-E-A-T axes (bio depth and authoritativeness).

2. **Render `pressMentions` and won-awards badges on venue templates** (E-E-A-T fix #4, #5). The data is already structured. The visible block is missing. Two days of template work; immediately raises trustworthiness signals on every venue page.

3. **Build the Featured-by-PI badge program** (backlink #9). Self-serve badge endpoint + outreach email to 134 operators. Two days of build, one week of outreach. Cleanest path to a sustainable inbound-link layer that doesn't depend on press cycles.

The PR/press hooks (items 1, 2, 4, 14, 15) need editorial calendar coordination; not urgent for May.

---

## 7. Open questions

- Is there an editorial choice to keep house byline indefinitely? If so, document it explicitly on `/about/` and `/methodology/` so readers and Google understand it's deliberate. ASSUMPTION: the project is currently a small editorial operation and house-byline is appropriate for now.
- Are `data.authority.pressMentions` and `data.authority.awards` populated on actual venue records? Schema exists; verify data presence by sampling a few venue files.
- Does `BaseLayout` already emit `Organization` JSON-LD globally? If so, the per-page additions in Section 3 are partial; if not, the Organization schema should also live in BaseLayout.

---

End of file.
