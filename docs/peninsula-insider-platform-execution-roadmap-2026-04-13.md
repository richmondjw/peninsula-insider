# Peninsula Insider — Platform Execution Roadmap

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 13 April 2026  
**Status:** Action memo  
**Purpose:** Translate the platform architecture recommendation into a practical execution roadmap with clear timing, priorities, and deferrals.

---

## 1. Executive recommendation

Do not try to build search, chat, app packaging, and anti-scraping all at once.

The right execution order is:

1. **Harden the current public platform**
2. **Add search**
3. **Deepen the structured corpus**
4. **Launch concierge/chat on web**
5. **Make it installable**
6. **Only then evaluate store packaging**

This keeps the roadmap matched to the current maturity of the product.

---

## 2. This week — highest-priority moves

These are the immediate moves with the best ROI.

### A. Put the site behind Cloudflare
**Why now:** highest-value anti-scraping and control improvement with minimal build risk.

**Actions:**
- route DNS through Cloudflare proxy
- enable Bot Fight Mode
- preserve current GitHub Pages deployment behind the edge
- confirm no asset/path regressions on `/V2/`

**Outcome:**
- hides origin more effectively
- adds bot friction now
- creates platform control surface for future search/chat

---

### B. Add crawler policy and legal layer
**Actions:**
- create/update `robots.txt`
- block known AI training crawlers where appropriate
- allow useful citation/search crawlers selectively
- create Terms of Use / anti-extraction page

**Outcome:**
- low-cost friction layer
- clearer legal posture
- better control over AI crawler behaviour

---

### C. Decide the search implementation path and lock it
**Decision to lock this week:**
- **Phase A search = Pagefind**
- **Phase B discovery = MiniSearch**

**Actions:**
- confirm search will be built on rendered content, not raw source exports
- define initial search scope: articles, venues, places, experiences, itineraries, events
- decide where search lives in UX: modal, `/search`, or both

**Outcome:**
- removes ambiguity
- lets implementation start cleanly

---

### D. Tighten metadata discipline in content production
Before search ships, content needs stronger search-ready metadata.

**Actions:**
- ensure new content includes SEO review block
- begin consistently capturing:
  - target phrase
  - search intent
  - title/meta draft
  - internal link targets
  - structured tags (season, audience, mood, zone, price)

**Outcome:**
- makes search rollout much stronger
- prepares the future concierge layer

---

## 3. This month — build the next real product layer

### A. Ship Phase A search
**Recommendation:** build and ship Pagefind this month.

**Actions:**
- integrate Pagefind into the build pipeline
- create search UI in V2
- index the existing corpus
- test relevance on real user intents:
  - wineries
  - long lunch
  - where to stay in Sorrento
  - what’s on this weekend
  - family beaches

**Success criteria:**
- users can actually find things faster
- no obvious performance or path issues
- search feels useful, not hollow

---

### B. Strengthen structured content fields
Search and concierge quality will depend on metadata quality.

**Actions:**
- normalise content attributes across key records:
  - mood
  - audience
  - zone / geography
  - season
  - price band
  - authority signals
- prioritise venues, places, and experiences first

**Outcome:**
- enables MiniSearch later
- improves recommendation quality
- supports better internal linking and SEO

---

### C. Build the discovery model, not just the search box
Once Pagefind is live, start designing the next layer.

**Actions:**
- define faceted discovery model for venues and experiences
- design filter clusters like:
  - town / zone
  - mood
  - couples / family / first-time visitor
  - rainy day / sunny day
  - long lunch / quick stop / worth the drive
  - price band

**Outcome:**
- moves Peninsula Insider toward a genuinely useful discovery experience
- avoids search being just a utility feature

---

### D. Improve the operational content corpus
The concierge and app layer only becomes strong if the corpus becomes stronger.

**Actions this month:**
- keep increasing coverage depth in:
  - stays
  - family / field content
  - place pages
  - occasion-based itineraries
- reduce thin or weakly differentiated content
- continue freshness via Dispatch and seasonal jobs

**Outcome:**
- builds the trust base for future chat

---

## 4. Next 60–90 days — new product surface

### A. Launch Ask the Peninsula Insider on web
**This is the next real product move after search.**

**Recommended first version:**
- public web concierge
- grounded only in trusted Peninsula Insider content
- positioned as editorial concierge, not chatbot

**Use cases:**
- one-night trip planning
- where to eat after a winery visit
- best beach for families this weekend
- rainy-day alternatives
- where to stay near Red Hill / Sorrento / Flinders

**Requirements before launch:**
- stronger corpus depth
- search/discovery functioning well
- clear retrieval logic
- guardrails for uncertainty and stale facts

---

### B. Make the site installable as a PWA
**Why:** low-friction app-like value without store overhead.

**Actions:**
- add manifest
- add install prompts where appropriate
- create icon/splash assets
- think through saved-state or return-use experience

**Outcome:**
- users can treat Peninsula Insider like an app before it is one

---

### C. Add stronger mediated utility
This is where the moat starts deepening.

**Potential features:**
- saved itineraries
- save/favourite venues
- trip planning session memory
- location-aware suggestions later
- newsletter-linked personalised recommendation flows

**Outcome:**
- makes the platform harder to clone
- gives users a reason to return

---

## 5. Defer for now

These are the things not worth doing yet.

### A. Full native app build
**Defer.**

Why:
- too early
- too much cost and complexity
- current product has not yet earned that architecture

---

### B. React Native rewrite
**Reject for now.**

Why:
- rebuild for the sake of rebuild
- breaks momentum
- diverts energy from actual product value

---

### C. Algolia / heavy hosted search infra
**Defer.**

Why:
- current scale doesn’t justify it
- static-first search is enough for now

---

### D. Aggressive anti-scraping overengineering
**Defer.**

Why:
- public static content remains public
- effort is better spent on moat-building, freshness, and gated future utility

---

### E. App Store push before concierge/PWA/product depth
**Defer.**

Why:
- too likely to be thin
- especially risky on iOS

---

## 6. Practical decision framework

When deciding what to build next, use this order of priority:

### Question 1
Does this improve the current web product for real users right now?

### Question 2
Does it strengthen discoverability, usability, or trust?

### Question 3
Does it compound the content model rather than bypass it?

### Question 4
Does it increase defensibility over time?

If the answer is “no” to most of these, it probably isn’t the next move.

---

## 7. Recommended execution sequence

### Sequence
1. Cloudflare + robots.txt + ToS
2. Lock search architecture decision
3. Ship Pagefind
4. Strengthen structured metadata
5. Design/build faceted discovery model
6. Deepen corpus in Stay / Field / Places / Itineraries
7. Launch web concierge
8. Add PWA
9. Reassess app-store packaging later

---

## 8. Owner map

### James
Owns:
- final product direction
- taste authority
- strategic calls on positioning and premium/gated value

### Remy
Owns:
- orchestration
- roadmap execution
- documentation
- editorial + product systems integration
- cron and operating-system discipline

### Product / build lanes to activate next
- **search lane** — implement Pagefind and search UX
- **metadata lane** — improve structured attributes on content records
- **field/stay lane** — deepen underdeveloped content categories
- **concierge planning lane** — design first web-based ask experience
- **protection lane** — Cloudflare, robots, ToS, edge controls

---

## 9. Final recommendation

### Do this now
- harden the public platform
- add search
- deepen the structured corpus

### Do this next
- launch concierge on web
- make it installable

### Do this later
- app wrappers
- stronger gating / premium utility layers
- more complex infra only when justified by actual usage and value

The right move is not to chase app optics too early.

The right move is to make Peninsula Insider more useful, more discoverable, and more defensible on the web first — then turn that into an app-shaped product once it has earned it.
