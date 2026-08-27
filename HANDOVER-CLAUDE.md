# Peninsula Insider — Handover Brief for Local Claude Agent

> **Status (reviewed 2026-08-27): PARTIALLY SUPERSEDED. Read the [project wiki](https://github.com/richmondjw/peninsula-insider/wiki) first.**
>
> Sections 1 to 11 are an **April 2026 work queue and SEO brief**, largely completed or overtaken. Treat them as history, not as a task list.
>
> **Section 12 (CMS Integrity) is still a live constitution** and remains binding, with one correction noted inline there.
>
> For current orientation use the wiki: [Architecture](https://github.com/richmondjw/peninsula-insider/wiki/Architecture), [Developer Guide](https://github.com/richmondjw/peninsula-insider/wiki/Developer-Guide), [Editorial Operations](https://github.com/richmondjw/peninsula-insider/wiki/Editorial-Operations), [Runbooks](https://github.com/richmondjw/peninsula-insider/wiki/Runbooks).
>
> **Paths below are container-absolute** (`/home/node/.openclaw/workspace/peninsula-insider/...`) and will not resolve from a normal clone. Read them as repo-relative.

Date: 2026-04-13
Prepared by: Remy
Project: Peninsula Insider
Repo: `/home/node/.openclaw/workspace/peninsula-insider`
Astro app: `/home/node/.openclaw/workspace/peninsula-insider/next`
Live domain: `https://peninsulainsider.com.au`

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

## 12. CMS Integrity — non-negotiable rules

The inline CMS (right-click image replace, contenteditable text) is governed
by a referential-integrity system established 2026-05-11 after a
shared-image bug let one click overwrite many venues at once. The full
spec is in [`docs/cms-architecture.md`](docs/cms-architecture.md). The
non-negotiables for any Claude session touching cards, CMS, or content:

1. **Never key overrides on filenames.** Every editable image must call
   `editableImage({ entityType, entitySlug, fieldPath, ... })`. The
   `entityType` must be one of: `article, page, event, place, venue,
   experience, itinerary, tour, tour-operator, tour-package`. No
   exceptions; new kinds require a coordinated DB migration.
2. **Every new card component must pass the enforcer.** Before committing
   a new `*Card.astro`, run `node scripts/check-editable-coverage.mjs`.
   The CI also runs it; do not push expecting CI to be the first check.
3. **Adding a new content collection** means three coordinated changes:
   (a) the directory under `next/src/content/`, (b) an entry in
   `COLLECTIONS` in `scripts/refresh-content-registry.mjs`, (c) the
   matching kind in the database CHECK constraints if it's new.
4. **The DB trigger is the floor, not the ceiling.** `pi.assert_content_
   registry_match` refuses writes for unknown entities. If you see
   `foreign_key_violation` on CMS save, the entity is genuinely not in
   `pi.content_registry` — fix the slug or refresh the registry, do
   not bypass the trigger.

   **Corrected 2026-08-27:** this rule used to say "wait for a deploy
   refresh." **There is no longer a deploy refresh to wait for.**
   `refresh-content-registry.mjs` runs only from
   `.github/workflows/pi-data-refresh.yml`, which is manual dispatch only.
   Dispatch **PI Data Refresh**, then retry the save. See
   [`docs/ARCHITECTURE.md` section 8](docs/ARCHITECTURE.md#the-supabase-refresh-gap-open-decision).
5. **Stale followup (2026-05-11), no longer actionable as written:** the
   original item was to rotate the `SUPABASE_SERVICE_KEY` repo secret
   against the active CMS database, then remove `continue-on-error: true`
   from the registry-refresh step in `.github/workflows/deploy.yml`.
   **That workflow and that step no longer exist.** Whether the service
   key is correct for the active CMS database is still worth confirming;
   the second half of the item is void.

For the editor-facing version of these rules, see
[`docs/cms-editorial-guide.md`](docs/cms-editorial-guide.md).

## Social Publishing

Skills and process docs for social media publishing live at `ops/skills/`:

| File | Contents |
|------|----------|
| `ops/skills/social-publishing.md` | Full end-to-end process: copy → image upload → Buffer API push → verification |

Weekly social packs are stored at `social/week-of-YYYY-MM-DD/`. The `push-buffer.sh` script in each week's folder is the reference implementation for that week's publish run.

**Channels:** LinkedIn `69e58e43031bfa423c20f0bf` · Facebook `69e5913b031bfa423c20f7cf` · Instagram `69e5d3b7031bfa423c21c0d8`

**Image hosting:** Upload Instagram PNGs to Supabase bucket `social/ig/` before pushing — GitHub Pages URLs work but Supabase is more reliable for Buffer's image fetcher.
