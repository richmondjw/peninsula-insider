# Search Phase A Implementation Brief — Peninsula Insider

**Date:** 13 April 2026  
**Decision locked:** Phase A search = Pagefind  
**Purpose:** Define the implementation scope for the first search release on the current Astro platform.

---

## Recommendation
Use **Pagefind** as the first search layer for Peninsula Insider.

---

## Why Pagefind
- fits Astro well
- works with static hosting and GitHub Pages
- indexes rendered output rather than raw source
- low infrastructure overhead
- fastest route to a real search experience

---

## Scope for first release
Index these public content surfaces:
- homepage and key hubs
- articles / journal pieces
- venue detail pages
- place pages
- itinerary pages
- event pages
- experience pages

Do **not** overcomplicate first release with faceted discovery. That comes in Phase B.

---

## UX recommendation
Ship one of:
1. `/search` page in V2
2. or a global search modal linked from the masthead

Best path: do both eventually, but start with the easier surface if speed matters.

---

## Build / integration notes
- integrate Pagefind into the post-build flow after Astro output is generated
- verify it works cleanly under `/V2/`
- test path handling carefully because V2 is served from a subdirectory
- ensure search assets are deployed with the rest of V2 output

---

## Search quality rules
The first release should feel useful, not just present.

Test with real intents:
- best wineries mornington peninsula
- where to stay in sorrento
- mornington peninsula with kids
- what’s on this weekend
- long lunch red hill
- rainy day peninsula

If search cannot surface obviously relevant pages for these, it is not ready.

---

## SEO / scrape caution
When implementing search:
- understand what searchable index assets become publicly accessible
- do not expose more structured source data than necessary
- keep anti-scraping posture in mind

---

## Definition of done
- search UI exists in V2
- Pagefind index builds cleanly
- works under `/V2/`
- tested against real Peninsula search intents
- no major performance regression
- no broken deploy path behaviour
