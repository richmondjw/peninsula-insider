# Peninsula Insider Change Log

This changelog records meaningful structural, content, SEO, and operational changes to the Peninsula Insider site.

## Standard for entries
For each meaningful change, include:
- Date
- Agent / operator
- Summary
- Files changed
- Pages affected
- Why it matters
- Follow-up / open issues

---

## 2026-04-13 — Remy (Claude Code, local session, continued)

### Town hub expansion (5 towns)
- Sorrento, Red Hill, Flinders, Mornington, Rye: keyword-targeted titles, handcrafted meta descriptions, 3 FAQ Q&As each (15 new structured answers total)
- Other place pages retain generic title template — enhancement is scoped to priority towns

### Internal linking improvements
- VenueCard: place label now links to /places/{slug} (every venue card site-wide)
- ExperienceCard: place label now links to /places/{slug}
- PlaceDetailTemplate: eat, wine, stay sections now link to best-of editorial ranking pages

### What's On mood filter fix
- "Browse by mood" chips (Family Saturday, Rainy Day, Worth The Drive, etc.) linked to #lens-{key} anchors that didn't exist — counts were shown but sections weren't rendered
- Added event sections for each non-empty lens filter with full EventCard grids

### Files changed
- `next/src/pages/places/[slug].astro` — title overrides, description overrides, FAQ schema for 5 towns
- `next/src/components/VenueCard.astro` — place label → clickable link
- `next/src/components/ExperienceCard.astro` — place label → clickable link
- `next/src/components/PlaceDetailTemplate.astro` — best-of ranking links in eat/wine/stay sections
- `next/src/pages/whats-on/index.astro` — lens event sections rendered

### Follow-up
- Build output (`dist/`) has not been copied to live site root — next deploy should sync these
- The mobile-fixes, newsletter-enhance, and scroll-animations CSS/JS are only in the built output, not in the Astro build pipeline yet
- Consider adding FAQ schema to remaining town pages as they become priority

---

## 2026-04-13 — Remy (Claude Code, local session)

### Summary
SERP snippet optimisation pass + domain correction + GA tag + mobile UX fixes + scroll animations + newsletter UX.

### SEO: Domain correction (critical)
- Fixed `peninsularinsider.com.au` → `peninsulainsider.com.au` across 613 built HTML files + 27 Astro source files
- All canonical URLs, OG tags, schema breadcrumbs, and article URLs were pointing to a non-existent domain
- Sitemap corrected and accepted by Google Search Console

### SEO: Homepage rewrite
- Title: "Peninsula Insider — The Mornington Peninsula, as insiders know it" → "Mornington Peninsula Guide 2026 — Best Restaurants, Wineries & Things to Do | Peninsula Insider"
- Description rewritten with target keywords + freshness signal
- Added FAQPage schema (3 Qs: what MP is known for, distance from Melbourne, best time to visit)

### SEO: FAQ schema added to 4 pages
- `/explore/best-walks` — best walk, easy walks, coastal walking
- `/stay/best-accommodation` — best place to stay, cost, Sorrento vs Red Hill
- `/journal/mornington-peninsula-in-autumn` — autumn visit, what to do, swimming
- `/journal/dog-friendly-mornington-peninsula` — dogs on beaches, cafes, staying with dogs

### GA tag: `G-0MR9YVZ9NW` → `G-DBL14DE975` (all pages + BaseLayout.astro)

### UX: Mobile hamburger menu
- `backdrop-filter` on `.masthead` trapped `position:fixed` mobile nav — moved nav outside `<header>` in DOM
- Created `_astro/mobile-fixes.css`: `overflow-x:clip` on html, fixed header on mobile, overflow containment

### UX: Newsletter subscribe
- Replaced Beehiiv iframe with native form + SVG checkmark confirmation animation
- `_astro/newsletter-enhance.js` + `.css` — auto-upgrades all embeds, graceful iframe fallback

### UX: Scroll animations
- `_astro/scroll-animations.js` + `.css` — Intersection Observer reveals, staggered cards, hero parallax
- `prefers-reduced-motion` fully respected

### Files changed
- `next/src/layouts/BaseLayout.astro`, `next/src/pages/index.astro`, `next/src/pages/explore/best-walks.astro`, `next/src/pages/stay/best-accommodation.astro`, `next/src/pages/journal/mornington-peninsula-in-autumn.astro`, `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`, 27 source files (domain), 600+ built HTML files

### Follow-up
- Town hub pages need FAQ schema + stronger intros (Sorrento, Red Hill, Flinders, Mornington, Rye)
- Internal linking pass: venue↔town, best-of↔venue, journal↔places
- Integrate mobile-fixes, newsletter-enhance, scroll-animations into Astro build pipeline
- Copy `dist/` output to live site root to sync source and deployed output

---

## 2026-04-13 — Remy
### Summary
Created a formal handover brief for a local Claude agent and established a systematic changelog requirement for all future work on Peninsula Insider.

### Files changed
- `HANDOVER-CLAUDE.md`
- `CHANGELOG.md`

### Why it matters
This creates continuity across multiple agents and makes SEO, structural, and content work traceable over time.

### Follow-up
- Ensure all future site work updates this changelog
- Mirror meaningful work notes into the knowledge vault

## 2026-04-12 — Remy
### Summary
Completed the major SEO foundation pass across the Astro rebuild: metadata, schema, sitemap, crawl/index improvements, best-of pages, practical pages, and site-index support. Kept the site static, repaired broken local dependency state, and removed the active Resend newsletter path in favour of Beehiiv.

### Files changed
Representative core files:
- `next/src/layouts/BaseLayout.astro`
- `next/src/pages/sitemap.xml.ts`
- `next/src/pages/site-index.astro`
- `next/src/pages/eat/best-restaurants.astro`
- `next/src/pages/wine/best-cellar-doors.astro`
- `next/src/pages/explore/best-walks.astro`
- `next/src/pages/stay/best-accommodation.astro`
- `next/src/pages/journal/mornington-peninsula-day-trip.astro`
- `next/src/pages/journal/mornington-peninsula-in-autumn.astro`
- `next/src/pages/journal/mornington-peninsula-with-kids.astro`
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`
- `robots.txt`
- `next/package.json`
- `next/src/pages/api/subscribe.ts`

### Pages affected
- homepage
- section hubs
- venue pages
- place pages
- journal pages
- event pages
- new best-of pages
- new practical and seasonal pages
- sitemap and site index

### Why it matters
This materially improved crawlability, canonical clarity, structured data coverage, and search-intent surface area.

### Follow-up
- do a SERP snippet optimisation pass for top pages
- deepen town hubs
- strengthen internal linking architecture
- fully standardise Beehiiv-only newsletter handling
