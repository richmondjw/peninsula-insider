# 04, Conversion paths: organic visitor → commercial action

Date: 2026-05-08
Author: Claude (audit-2026-05)
Inputs: `next/src/pages/{pass,newsletter,ask,submit,itinerary,partners,awards}/*`, `next/src/components/{ConciergeDrawer,NewsletterBlock,Masthead,Footer}.astro`, `next/src/lib/{nav,v4-nav,stripe}.ts`, plus the empirical SEO data in `ops/reports/seo/baseline.md`, `daily-log.md`.

The site has six conversion surfaces. Five are indexable; one (operator dashboards) is correctly noindex. **None of them are well-linked from the editorial layer.** That's the headline finding: the Pass, Awards, Partners, Submit and (until very recently) the Concierge hub are structurally orphaned from the article surfaces that earn organic traffic. Conversion happens when readers can find the door; right now most of these doors are at the back of the building.

GA4 is not authed for this audit. Wherever the funnel question requires conversion data, the section is marked **QUANTIFY ON GA4 AUTH** rather than guessed.

Commercial-goal priority order from the orchestrator's brief: **Pass → Operator claims → Concierge → Awards → Newsletter → Partner**.

---

## 1. The conversion surfaces (inventory)

| # | Surface | URL | Action | Indexable? | Footer link? | Masthead link? | Body-link from articles? |
|---|---|---|---|---|---|---|---|
| 1 | Pass landing | `/pass/` (`next/src/pages/pass.astro`) | Subscribe (free / paid / founders-waitlist) | Yes (canonical set, line 31) | Indirect, `v4FooterAbout` points to `/preview-insider-plans/` not `/pass/` (`next/src/lib/v4-nav.ts:470`) | No | No |
| 2 | Newsletter landing | `/newsletter/` (`next/src/pages/newsletter.astro`) | Email signup → Beehiiv | Yes | Yes (`v4FooterAbout`, label "The Dispatch") | "Subscribe" button anchors to `/#newsletter` instead of `/newsletter/` (`Masthead.astro:58`) | Embedded `NewsletterBlock` at the foot of most articles |
| 3 | Concierge | `/ask/` (`next/src/pages/ask.astro`) + global drawer | Ask LLM, get recommendations | Yes (and Discovered per `url-inventory.md:257`) | No | "Ask" pill in mobile masthead row (`Masthead.astro:91-100`); drawer trigger always present in `BaseLayout.astro:234` | No (drawer trigger but no inline body link) |
| 4 | Awards landing | `/awards/` (`next/src/pages/awards/index.astro`) | Nominate / vote (seasonal) | Yes (canonical set, `awards/index.astro:46`) | No | No | None observed in grep |
| 5 | Submit landing | `/submit/` (`next/src/pages/submit.astro`) | Reader submission form | Yes (canonical set, line 50) | No | No | None observed in grep |
| 6 | Partners landing | `/partners/` (`next/src/pages/partners/index.astro`) + sub-pages | Operator enquiry / claim / advertising kit | Yes (`/partners/`, `/partners/apply/`, `/partners/advertising-kit/`, `/partners/founders-prospectus/`) | Yes (`v4FooterAbout` label "Partner with us") | No | One link from `/about/` (`about.astro:146`) and an aside on `/partners/index.astro:50-55` |
| 6b | Operator claim | `/partners/claim/` (`next/src/pages/partners/claim.astro:33`) | Auth-gated claim | **noindex** (correct) | No | No | Indirectly via `/partners/index.astro` aside |
| 6c | Operator dashboard | `/partners/dashboard/` (`partners/dashboard.astro:56`) | Auth-gated venue management | **noindex** (correct) | No | No | Indirectly |
| 6d | Founders prospectus | `/partners/founders-prospectus/` | Request the prospectus | (not in inventory; verify) | No | No | Per the page comment "request-only, never linked publicly" |
| 7 | Itinerary builder | `/itinerary/` (`next/src/pages/itinerary.astro`) | Build personalised itinerary | Yes | No | "Itinerary" link in masthead utility row, hidden by default (`Masthead.astro:56`) | None, items are added via venue/article save buttons |
| 8 | Alerts | `/alerts/` | Subscribe to event alerts | Yes | No | "Alerts" in masthead utility (`Masthead.astro:57`) | None |
| 9 | Account dashboards | `/account/*` | Saved/Likes/Pass member | **noindex** (correct, all four files use `noindex={true}`) | No | No | n/a |

**Top-level finding**: 7 of 9 indexable conversion surfaces have **zero contextual body-links from the editorial layer**. The two that do (newsletter via embedded block, partners via /about) are the two that are also in the footer About column.

The Pass, Awards, Submit, Itinerary, Concierge, Alerts: each is technically indexable, technically built, technically reachable from the homepage or footer if you know where to look, and none have any editorial-context body link that a reader (or Google) would follow naturally.

---

## 2. Funnel-by-funnel trace

### 2.1 Pass subscription (priority 1)

The product: three tiers (Reader free, Insider paid waitlist, Founders waitlist) at `/pass/`. Stripe checkout is wired in `next/src/lib/stripe.ts` with `successUrl=/account/pass/?welcome=1`, but the public page has fallback waitlist email-capture until the live Stripe price IDs are configured.

**Funnel as it stands**:
1. Organic visitor lands on `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (the highest-clicks article, 3 clicks/week per `daily-log.md:594`).
2. Reader scrolls to the foot of the article. Sees `NewsletterBlock` (subscribe to "Peninsula This Weekend").
3. Reader does NOT see any reference to the Pass on the article page. Grep confirms: no `/pass/` href anywhere in `next/src/components/*` (only on the pass.astro page itself and in `account/pass.astro`).
4. Reader navigates to the Footer "Colophon" column. Sees "The Pass" label, link goes to `/preview-insider-plans/`, a preview page (`v4-nav.ts:470`).
5. Or reader uses Masthead. Pass is not present in the masthead nav (`nav.ts:34-43`) or the More dropdown (`nav.ts:55-66`).

**Click-through rate from organic article → /pass/**: QUANTIFY ON GA4 AUTH. Without GA4 the funnel is unmeasurable, but the structural state is: the only path to /pass/ for an organic visitor is to type the URL or guess "preview-insider-plans" from a footer label.

**Gaps**:
- Footer label "The Pass" does not link to /pass/. Either the live page or the preview should win; this footer link is wrong.
- Pass is missing from the masthead nav and More menu.
- The article surface, where 90%+ of organic readers arrive, has zero Pass CTAs.
- The "Why a Pass" pitch (`pass.astro:48-52`) is editorial gold but only visible to readers who already found the page.

**Weakest funnel step**: step 3 (article → /pass/). There is no link.

**Specific fix**:
- File `next/src/components/PassCallout.astro` (new component): a single editorial paragraph that fits the article voice. Headline: "Reader-funded editorial. The Pass keeps this independent." Body: 2 sentences. CTA: a text link "Read about the Pass →" pointing to /pass/.
- Mount in `next/src/pages/journal/[slug].astro` between the `<Content />` block (line 186) and the `<ClusterLinks>` block (line 190). Render conditionally: only on articles where `article.data.format === 'cellar-door-dispatch'` or `format === 'service'` to start (the editorial-leaning shapes), then expand. Avoid on weekend-picker dispatches (those have their own newsletter pitch).
- Update `v4-nav.ts:470` to link `/pass/` not `/preview-insider-plans/`. Remove the preview reference.

**Indexable conversion-surface SEO checklist for /pass/**:
- Title: "The Peninsula Insider Pass" (line 28). Adequate but could include a value clause: "The Peninsula Insider Pass, reader-funded editorial for the Mornington Peninsula." 60 chars, fits.
- Meta description: "The membership that funds the editorial. Free, paid, or founders, pick the tier that fits." (line 29). Includes em-dash; project rule violation. **Rewrite without em-dash**.
- Canonical: yes (line 31).
- JSON-LD schema: none. Add `Product` or `Service` schema with the three tiers as `Offer` entries (will help GSC parse the tier pricing once Stripe is live).
- Voice fits the editorial. Don't change.

**Editorial-voice conflict**: per the project memory `feedback_dispatch_cadence.md` and the advertising firewall rule, the Pass is reader-funded and should be promoted as the financial-independence lever. A small editorial CTA in articles is consistent with the labelled-not-absent advertising principle.

### 2.2 Operator claim (priority 2)

The product: `/partners/claim/` is auth-gated. An operator signs in via Supabase, claims their venue from the dropdown, editorial approves manually, then the operator can manage hours/photos via `/partners/dashboard/`.

**Funnel as it stands**:
1. A venue owner Googles their own venue, lands on `/eat/{their-venue}/` or `/wine/{their-venue}/`.
2. The venue page (per `VenueDetailTemplate.astro`) has the editor note, hero image, address, hours.
3. There is **no "Is this your venue? Claim it." CTA** on the venue page.
4. Owner finds `/partners/index.astro:50-55` only if they navigate to /partners/. There is an "Already a Peninsula venue we cover?" banner that says "Open the operator dashboard". This is the only public discovery path for the claim flow.

**Click-through rate from organic venue page → /partners/claim/**: QUANTIFY ON GA4 AUTH.

**Weakest funnel step**: step 3. Owners don't know the claim system exists when they're on their own venue page.

**Specific fix**:
- Add a small, polite "Is this your venue?" link to `next/src/components/VenueDetailTemplate.astro` near the editor note. One line of text, not a button. Link to `/partners/claim/`.
- Owner-flow page should also be linked from `/contact/` (currently `/contact/` lists email addresses only).
- The `/partners/claim/` page is correctly noindex which is right: claim flow shouldn't compete with the venue page in search.

**Indexable conversion-surface SEO**: claim page is correctly noindex. No SEO action.

### 2.3 Concierge usage (priority 3)

Two surfaces: the global drawer (`ConciergeDrawer.astro`, mounted in `BaseLayout.astro:234`) and the full-page `/ask/` page.

**Drawer**: present on every page except `/ask/` itself. Bottom-right "Ask The Insider" pill, slide-in panel, conversational LLM with venue tile rail.

**/ask/ page**: full-page version with hero, sample queries, persistent dialog. It is **Discovered, not indexed** in GSC (`url-inventory.md:257`), Google knows about it but hasn't crawled it.

**Funnel as it stands**:
1. Reader on any article sees the floating "Ask The Insider" pill bottom-right.
2. Reader clicks → drawer opens with greeting + 6 sample queries (Cellar door lunch, Rainy day with kids, etc.).
3. Reader types or clicks a chip → LLM returns 3 venue tiles + follow-on chips.
4. Reader clicks a tile → lands on `/eat/{venue}/` or `/wine/{venue}/`.

That's the engagement funnel. The conversion goal, what does Concierge convert to? Right now it's a soft surface that boosts time-on-site and venue-page views. There is no "Save these to my itinerary" CTA at the end of a Concierge response, and no "Sign up to save your chat history" prompt. So Concierge is currently a content-quality amplifier, not a conversion mechanism.

**Indexable concierge landing page**: `/ask/` exists. Title: "Ask The Insider, Your Peninsula Concierge" (`ask.astro:13`). Meta: "Ask Peninsula Insider anything about the Mornington Peninsula. Cellar doors, dining, stays, rainy days, dog-friendly spots. Local knowledge, editorial taste." (line 14). The page is NOT in the inventory so probably not surfaced via sitemap to GSC; verify and submit.

**Search opportunity for /ask/**:
- Target queries: "ask mornington peninsula", "mornington peninsula ai guide", "mornington peninsula concierge", "where to go mornington peninsula" (broader). None currently in the impression list per `daily-log.md`. ASSUMPTION: low search volume in Australia for "ai concierge mornington peninsula"; the surface is more useful as a converter for visitors who arrive via journal.

**Weakest funnel step**: step 4 (concierge response → venue → action). There's no way for a user to save what the concierge recommended without manually saving each venue card.

**Specific fix**:
- Add a "Save all to itinerary" button at the bottom of every Concierge response with at least 3 recommendations. File: `next/src/pages/ask.astro:243-291` (the renderTile function and surrounds).
- Add a 1-line link in the drawer post-response: "Want a 2-day plan around these? → /itinerary/".
- The /ask/ page should be linked from at least 5 articles. Pattern: at the foot of every "best X" listicle, append "Looking for something specific? Ask The Insider →".
- For SEO: confirm /ask/ is in `sitemap.xml.ts` with priority 0.8. Currently it's listed in `url-inventory.md` as Discovered, so Google is aware but hasn't crawled. Per experiment 2026-05-05-01, James was asked to manually reindex /ask/.

**Editorial-voice conflict**: the Concierge is the most "feature-software" surface on a publication that prides itself on editorial restraint. The pi-drawer pill should remain understated; the in-article CTA should be one line of text, not a banner.

### 2.4 Awards engagement (priority 4)

The product: 9 categories, August nominations, September voting, October results. `/awards/index.astro` defines `DEFAULT_CATEGORIES` (line 29-39) including "Restaurant of the Year", "Cellar Door of the Year", "Stay of the Year", "Walk of the Year", "Best New Opening", "Best Family Day", "Locals' Choice", "Worth-the-Drive", "Editorial Discovery".

**Funnel as it stands**: there is no funnel. The Awards cluster is structurally orphaned (see `02-content-clusters.md` Section 2.12). It has no internal link from the editorial layer, no masthead nav slot, no footer entry. A reader cannot find Awards from anywhere on the site except by typing /awards.

**Click-through rate**: zero observable, because there's no source page sending traffic.

**Weakest funnel step**: every step from step 0. The Awards surface is unreachable.

**Specific fix (highest single-action leverage on this priority list)**:
- Add Awards to `mastheadMoreNav` in `next/src/lib/nav.ts:55-66`. Slot ordering: insert between "The Insider's 30" (line 57) and "Tours" (line 58). Label: "Awards 2026". Dek: "Editor selections + reader voting. The Peninsula at its best."
- Add Awards to `v4FooterAbout` in `next/src/lib/v4-nav.ts:465-474`. Insert above "The Pass" entry.
- Once nominations open in August, add a homepage rail (`index.astro` after the editor's letter section) promoting nominate-now.
- Add an "Award won by this venue" badge to `VenueDetailTemplate` for venues that win categories (uses `data.authority.awards` per `VenueDetailTemplate.astro:26`). When a venue wins, the badge links back to /awards/{category}/.

**Indexable conversion-surface SEO for /awards/**:
- Title: "The Peninsula Insider Awards" (`awards/index.astro:43`). Adequate but lacks year. Recommend "The Peninsula Insider Awards 2026, Editorially Gated, Reader-Voted" (60 chars).
- Meta: "An annual editorial moment combining editor selections and reader voting. The Peninsula at its best, named, ranked, and credited." Acceptable.
- Canonical: yes (line 46).
- JSON-LD schema: **add `Event` schema** for the cycle dates (August nominations open, September voting, October results). This helps Google show date pins in search. Each category page (`awards/[slug].astro`) can use `Event` or `Article` depending on whether voting is open.
- The 9 category pages are individual indexable URLs; each should have its own JSON-LD `Event` or `WebPage` with `BreadcrumbList`.

**ASSUMPTION**: Awards is currently pre-launch (the cycle starts August 2026). Pre-launch SEO is about earning crawls; promotion comes later. Worst case: lift the cluster into nav now, accept low search demand until August.

### 2.5 Newsletter signup (priority 5)

The product: weekly "Peninsula This Weekend" dispatch via Beehiiv. Endpoint: `https://tjjhpvslpysfklwpqmgz.supabase.co/functions/v1/pi-newsletter-subscribe` (`NewsletterBlock.astro:33`).

**Funnel as it stands**:
1. Organic visitor lands on a journal article.
2. Reads to bottom. Sees `NewsletterBlock` (`next/src/components/NewsletterBlock.astro`, title "The briefing that arrives weekly").
3. Reader enters email, hits Subscribe, lands on a thank-you state.

This is the cleanest of the 6 funnels. NewsletterBlock is embedded at the foot of most pages including all journal articles, the homepage, every place hub via the hub templates, and the dedicated `/newsletter/` page (`newsletter.astro:22-40` has a hero with `SubscribeForm`).

**Click-through rate from article → newsletter signup**: QUANTIFY ON GA4 AUTH (need Beehiiv subscriber attribution by source param; the form already sends `source` per `NewsletterBlock.astro:48`).

**Weakest funnel step**: step 1. The masthead "Subscribe" link goes to `/#newsletter` (`Masthead.astro:58`) which is a homepage anchor, not the dedicated `/newsletter/` page that exists. The dedicated page has stronger conversion architecture (hero with social proof, "3,500 Peninsula readers", sample dispatch, four numbered promises). Masthead "Subscribe" should point to /newsletter/.

**Specific fix**:
- Edit `next/src/components/Masthead.astro:58`: change `href="/#newsletter"` to `href="/newsletter/"`.
- Add `data-auth-anonymous` is currently set; verify this still works correctly after the URL change.

**Indexable conversion-surface SEO for /newsletter/**:
- Title: "The Insider's Dispatch · Subscribe, Peninsula Insider" (`newsletter.astro:13`). Strong.
- Meta: "The weekly dispatch from the Mornington Peninsula. One pick, one weather-proof backup, one thing to skip. Written by editors who live on the Peninsula." (line 14). Strong.
- Canonical: yes (line 16).
- JSON-LD: missing. Add `WebPage` with `mainEntity: NewsArticle` listing recent issues (or `Newsletter` if the schema becomes available). At minimum add `Organization` with `email` for tips@/corrections@/hello@ contacts (already in `/contact/`).
- og:image is set (line 17), strong.

### 2.6 Partner enquiry (priority 6)

The product: `/partners/` landing + `/partners/apply/` (operator submission) + `/partners/advertising-kit/` (rate card request) + `/partners/founders-prospectus/` (request-only).

**Funnel as it stands**:
1. A potential advertiser/operator is referred to /partners/ via the footer "Partner with us" link (`v4-nav.ts:469`) or from /about/ (link at `about.astro:146`).
2. They land on `/partners/index.astro`. Read the pitch (modern newsroom, three rules, audience stats). See three tiers (Founders' Circle, Editorial Feature, Listing Surface).
3. They click "Request the prospectus" or "Enquire" CTA at the foot. Form posts to ... (need to confirm the partner-apply form endpoint).

**Click-through rate from organic → partners**: QUANTIFY ON GA4 AUTH. Likely tiny, partners is direct/referral discovery, not SEO-driven for a B2B funnel of this scale.

**Weakest funnel step**: step 1. There is no link from the editorial layer. An operator who reads a venue page about a competitor doesn't see "Want similar coverage? Partner with us →".

**Specific fix**:
- Already partly fixed: `partners/index.astro:50-55` aside ("Already a Peninsula venue we cover?") points operators at `/partners/dashboard/` and `/partners/update/`.
- Add a footer link from venue pages: a single line at the bottom of `VenueDetailTemplate` saying "Operator? Update your listing → /partners/update/".
- Don't promote partners aggressively from articles. The editorial firewall says we don't push partner-acquisition mid-article.

**Indexable conversion-surface SEO for /partners/**:
- Title: "Partner with Peninsula Insider" (`partners/index.astro:12`). Strong.
- Meta: "A modern newsroom for the Mornington Peninsula. We work with Peninsula businesses we admire. Local writing. Original photography. Disclosed by default." Strong.
- Canonical: not set in the layout, verify `BaseLayout` defaults to current URL. Recommend explicit `canonical="https://peninsulainsider.com.au/partners/"`.
- Schema: none. Add `Organization` schema with sameAs to Instagram, plus `Service` schema with the three tier offerings.
- The "Founders' Prospectus" page is request-only by editorial decision; correct to not link publicly.

---

## 3. Cross-funnel structural issue: the editorial → commercial bridge

The publication's structural problem is that its 172 articles (the demand engine) and its 9 conversion surfaces are separated by no body links. The **footer + masthead alone do not carry conversion weight**, readers convert on the page they're already on, when the CTA is contextually relevant.

The fix pattern: build a small library of in-article CTA components (one per conversion surface) and mount them conditionally in `[slug].astro` based on article format/tags.

| Article shape | Best mid-article CTA | Best end-of-article CTA |
|---|---|---|
| `format: cellar-door-dispatch` | (none) | "Reader-funded editorial · the Pass" |
| `format: service` | (none) | NewsletterBlock + "Save these to your itinerary" |
| `format: insider-edit` | (none) | NewsletterBlock + Awards-nominate (when open) |
| `format: weekend-picker` | (none) | NewsletterBlock (specifically "Subscribe to next week's dispatch") |
| Articles tagged `dogs` | (none) | "Got a dog-friendly spot? Tell us → /submit/" |
| Articles tagged `peninsula-itinerary` or shape "weekend" | (none) | "Build this as your itinerary → /itinerary/" |

Each CTA is a 1-2 line editorial paragraph plus a text link, not a banner. This is consistent with the labels-not-absence advertising principle and the editorial firewall.

---

## 4. Indexable conversion-surface SEO summary table

| Surface | Title good? | Meta good? | Canonical set? | Schema present? | Recommendation |
|---|---|---|---|---|---|
| `/pass/` | Yes | Has em-dash (rule violation) | Yes | None | Rewrite meta without em-dash; add Service+Offer schema |
| `/newsletter/` | Yes | Yes | Yes | None (og only) | Add WebPage + recent-issues NewsArticle |
| `/ask/` | Yes | Yes | Default | None | Add WebPage + sameAs; verify in sitemap |
| `/awards/` | Adequate (no year) | Yes | Yes | None | Add Event schema for cycle; promote year in title |
| `/awards/{category}/` | Per category | Per category | Yes | None | Add Event or Award schema per category |
| `/submit/` | Yes | Yes | Yes | None | Add HowTo or AcceptAction schema for the submission flow |
| `/partners/` | Yes | Yes | Default (verify) | None | Add Organization + Service schema |
| `/itinerary/` | Per file (verify) | Per file (verify) | Default | None | Tool-style page; add WebApplication schema |
| `/account/*` | n/a | n/a | n/a | n/a | Correctly noindex |
| `/partners/claim/` | n/a | n/a | n/a | n/a | Correctly noindex |
| `/partners/dashboard/` | n/a | n/a | n/a | n/a | Correctly noindex |

---

## 5. Specific fixes (consolidated, file:line references)

| # | Surface | File:line | Change | Expected impact |
|---|---|---|---|---|
| 1 | Pass | `next/src/lib/v4-nav.ts:470` | Change href from `/preview-insider-plans/` to `/pass/` | Footer Pass link points to live page |
| 2 | Pass | `next/src/pages/pass.astro:29` | Remove em-dash from meta description; replace with comma | Project rule compliance + cleaner SERP snippet |
| 3 | Pass | new component + `next/src/pages/journal/[slug].astro:188` | Mount `<PassCallout />` after `<Content />` for relevant article formats | Add the missing editorial → Pass body link path |
| 4 | Pass | `next/src/pages/pass.astro` | Add `Service` + `Offer` JSON-LD with three tiers | Better SERP rendering once Stripe pricing live |
| 5 | Newsletter | `next/src/components/Masthead.astro:58` | Change `href="/#newsletter"` to `href="/newsletter/"` | Sends top-bar Subscribe traffic to the higher-converting page |
| 6 | Newsletter | `next/src/pages/newsletter.astro` | Add `WebPage` JSON-LD + recent-issues `NewsArticle` snippet | SERP enrichment |
| 7 | Awards | `next/src/lib/nav.ts:55-66` | Insert "Awards 2026" entry into `mastheadMoreNav` between insiders-30 and tour | First nav surface for the cluster |
| 8 | Awards | `next/src/lib/v4-nav.ts:465-474` | Insert Awards entry into `v4FooterAbout` above Pass | Footer presence |
| 9 | Awards | `next/src/pages/awards/index.astro:43` | Update title to include "2026" | Year freshness signal in SERP |
| 10 | Awards | `next/src/pages/awards/index.astro` | Add `Event` JSON-LD for cycle dates (Aug nominations, Sep voting, Oct results) | Date-pin SERP rendering |
| 11 | Awards | `next/src/components/VenueDetailTemplate.astro` (where awards/hats render) | Award badge links to `/awards/{category}/` (not just static text) | Outbound link building venue → awards |
| 12 | Submit | `next/src/pages/journal/[slug].astro` | Add conditional "Got a tip? → /submit/" CTA on articles tagged `local-secrets`, `community`, or specific town slugs | First inbound link path for /submit/ |
| 13 | Concierge (Ask) | `next/src/pages/ask.astro:425-428` | Add "Save all to itinerary" + "Build a 2-day plan" CTA after concierge response | Conversion link out of the chat surface |
| 14 | Concierge | `next/src/pages/journal/[slug].astro` end of `<Content />` block | "Looking for something specific? → Ask The Insider" 1-line link | First editorial → /ask/ link |
| 15 | Operator | `next/src/components/VenueDetailTemplate.astro` (near editor note) | Small "Is this your venue? Claim it." link → /partners/claim/ | First venue → claim path |
| 16 | Partner | `next/src/components/VenueDetailTemplate.astro` (footer) | "Operator? Update your listing → /partners/update/" link | Second venue → partner path |
| 17 | Itinerary | `next/src/pages/journal/[slug].astro` | Conditional "Build this as your itinerary →" CTA on weekend-shape articles | First inbound link for /itinerary/ |
| 18 | Itinerary | `next/src/pages/itinerary.astro` (verify SEO) | Confirm canonical, title, description; consider WebApplication schema | Index quality |
| 19 | Address-string queries | known address pages (per `backlog.md:21`) | noindex or 410 these legacy directory pages | Reduces low-quality SERP impressions |

---

## 6. Editorial-voice conflicts to weigh

The project memory `feedback_no_em_dashes.md` and the labels-not-absent advertising rule (`project_pi_advertising_pivot.md`) are the binding constraints. Each of the 19 fixes above can be implemented inside those rules. The two cases worth flagging:

1. **Pass CTA on every article**: tempting to mount on every journal article. Risk: the page starts to feel like Substack. Recommendation: condition on `format` and skip on weekend-picker dispatches and short quick-notes. Audit the visual frequency on a fresh build.

2. **Operator-claim CTA on every venue page**: the venue-page surface is where readers form an editorial impression of the venue. An aggressive "Claim this listing" pill at the top would feel directory-like. Recommendation: small text link near the editor note, not a banner. The aside at `partners/index.astro:50` shows the right tone.

3. **Awards promotion before nominations open**: do not put a "Vote in the Awards →" CTA until August. Pre-launch promotion should be lift-into-nav only, not lift-into-articles.

---

## 7. What we cannot answer without GA4 (mark as QUANTIFY ON GA4 AUTH)

- Pass-page conversion rate (visitor → waitlist signup).
- Newsletter signup rate per article (which articles convert best to subscribers?).
- Concierge engagement rate per article (does the drawer pill get clicked from articles?).
- Operator-claim conversion rate (visitor → claim form started → claim submitted).
- Partner-enquiry conversion rate (visitor → enquiry form filled).
- Itinerary builder usage (saved items → itinerary built → printed/shared).
- Bounce rate on `/pass/` itself (is the tier copy converting or losing readers at the price block?).

GSC + sitemap audit gives us the indexation and reach picture. GA4 gives us the conversion picture. The next audit cycle should authenticate GA4 and re-run this section with numbers.

---

End of file.
