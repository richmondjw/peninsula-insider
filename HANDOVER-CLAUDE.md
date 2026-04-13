# Peninsula Insider — Handover Brief for Local Claude Agent

Date: 2026-04-13
Prepared by: Remy
Project: Peninsula Insider
Repo: `/home/node/.openclaw/workspace/peninsula-insider`
Astro app: `/home/node/.openclaw/workspace/peninsula-insider/next`
Live domain: `https://peninsularinsider.com.au`

## 1. Context

Peninsula Insider is being developed into an intent-led organic growth engine for the Mornington Peninsula.

Recent SEO foundation work has already been completed, including:
- password gate removed
- robots.txt improved
- canonical, OG, and Twitter metadata added
- schema markup introduced across key page types
- dynamic sitemap endpoint added
- best-of and practical pages added
- HTML site index page added
- site remains static Astro, not Vercel
- newsletter stack simplified toward Beehiiv

Your job is to continue improving the site systematically, with a strong focus on:
- search intent coverage
- crawl clarity
- CTR/snippet quality
- internal linking
- town hub depth
- content freshness
- structured operational documentation

## 2. Important operating constraints

- **Do not switch to Vercel or hybrid/SSR output.** Keep the site static unless explicitly instructed otherwise.
- **Do not reintroduce Resend or custom email plumbing.** Newsletter should remain Beehiiv-led.
- **Do not make silent structural changes without logging them.**
- Keep buildability intact at all times.

## 3. Current strategic direction

Remy owns the strategy.
A future Program Runner will own execution traffic control.
Your role here is as a local implementation agent helping move the build forward.

Priority strategic direction:
1. improve SERP snippets and CTR
2. expand town hubs
3. build seasonal and practical intent pages
4. improve internal linking architecture
5. maintain a systematic changelog and vault notes

## 4. Immediate recommended work queue

### A. SERP snippet optimisation pass
Prioritise the top pages and improve:
- title tags
- meta descriptions
- first 100 to 150 words
- FAQ sections
- direct answer blocks under H1s

Best candidates:
- homepage
- /eat/best-restaurants
- /wine/best-cellar-doors
- /explore/best-walks
- /stay/best-accommodation
- /journal/mornington-peninsula-day-trip
- /journal/mornington-peninsula-in-autumn
- /journal/mornington-peninsula-with-kids
- /journal/dog-friendly-mornington-peninsula
- top town pages (Sorrento, Red Hill, Flinders, Mornington, Rye)

### B. Expand town hub pages
Turn key place pages into proper search hubs with:
- stronger intro answering the core query fast
- best restaurants in [town]
- where to stay
- things to do
- who it suits
- ideal timing/season
- FAQ block
- internal links to supporting pages

Start with:
- Sorrento
- Red Hill
- Flinders
- Mornington
- Rye

### C. Internal linking improvements
Make the site more crawlable and more useful by adding stronger lateral links between:
- venue pages ↔ town hubs
- best-of pages ↔ venue pages
- journal service pages ↔ relevant places/venues
- seasonal pages ↔ best-of pages
- practical pages ↔ core section pages

## 5. Build / technical instructions

### App location
Main app is in:
- `/home/node/.openclaw/workspace/peninsula-insider/next`

### Build
Run from:
- `cd /home/node/.openclaw/workspace/peninsula-insider/next && npm run build`

### Static output
Keep Astro output static.
Do not add Vercel adapters or SSR unless explicitly instructed.

## 6. Documentation and knowledge-vault requirements

This is important.

Every time you complete meaningful work, you must record it in **two places**:

### A. Repo changelog
Update:
- `/home/node/.openclaw/workspace/peninsula-insider/CHANGELOG.md`

Add a dated entry covering:
- what changed
- why it changed
- which pages/templates/files were affected
- any SEO consequence or rationale
- any unresolved follow-up items

### B. Knowledge vault note
Create or update a note in the vault at:
- `/home/node/.openclaw/workspace/JWR_PKM_2026/90-system/peninsula-insider/`

If that folder does not exist, create it.

Recommended files:
- `JWR_PKM_2026/90-system/peninsula-insider/change-log.md`
- `JWR_PKM_2026/90-system/peninsula-insider/seo-operations.md`
- `JWR_PKM_2026/90-system/peninsula-insider/work-notes-YYYY-MM.md`

Minimum requirement after each meaningful work session:
- append a dated note describing what you changed
- include files/pages touched
- include strategic reason
- include follow-up recommendations

This is required so future agents and Remy can resume cleanly.

## 7. Change log standard

For every meaningful change, log:
- Date
- Agent / operator
- Summary
- Files changed
- Pages affected
- Why it matters
- Follow-up / open issues

Suggested format:

```md
## 2026-04-13 — Claude local agent
### Summary
Improved title tags and meta descriptions for top 10 pages, and added direct-answer intros to 5 service pages.

### Files changed
- next/src/pages/index.astro
- next/src/pages/eat/best-restaurants.astro
- next/src/pages/journal/mornington-peninsula-day-trip.astro

### Why it matters
Improves CTR potential and snippet quality in Google.

### Follow-up
- Expand FAQ schema across town pages
- Review internal linking on Sorrento and Red Hill hubs
```

## 8. Recommended operating habit

At the end of every session:
1. run build
2. update repo changelog
3. update vault note
4. note unresolved items
5. if relevant, commit changes with a clear message

## 9. My recommendation on the changelog

Yes, we should absolutely have a systematic changelog.

This is the right move because:
- multiple agents may touch the site
- SEO changes compound over time and need traceability
- it makes rollback and diagnosis easier
- it gives Remy continuity without relying on memory
- it creates a usable audit trail between repo work and strategy

So the standard going forward should be:
- **every meaningful site change gets logged in the repo changelog**
- **every meaningful work session gets summarised in the vault**

## 10. Definition of done for your work

Your task is only complete when:
- the site still builds successfully
- the repo changelog is updated
- the knowledge-vault note is updated
- the change is clear enough for another agent to continue from

## 11. Immediate first task recommendation

Start with a **SERP snippet optimisation pass** on the highest-leverage pages:
- rewrite titles and meta descriptions
- improve direct answer intros
- strengthen FAQ content
- log all work in both changelog and vault

That is the fastest next SEO win.
