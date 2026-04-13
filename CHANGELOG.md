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
