# Peninsula Insider Daily Accuracy Scan — 2026-08-08

Job: pi-daily-accuracy-scan · Mode: read-only detection, no publish · Scanned as of 2026-08-08 20:20 UTC.

Surfaces checked: `index.html`, `whats-on/index.html`, `journal/peninsula-this-weekend-*/index.html`, `next/src/content/events/`, `next/src/content/articles/`.

## Summary

- **Total issues found: 15**
- Bucket 1 (safe auto-fix): 0
- Bucket 2 (needs approval): 4
- Bucket 3 (needs verification): 1 (plus 85 governance staleness flags rolled up below, counted separately from the 15 content issues)

Good news: the structured event data itself (`next/src/content/events/*.json`) is clean — every event whose end date has passed has already been correctly moved to `status: "archived"` (or into `next/src/content/events/archive/`). The problems are all in the **static HTML surfaces** (homepage nav, What's On hub) that have not been regenerated since those events were archived, so they still render expired events as live.

## Issues

### 1. Homepage/global masthead shows stale edition stamp
- **Where:** `index.html`, `whats-on/index.html` — shared header (`masthead__edition-label`, `v4-edition-stamp`)
- **Found:** `Winter Insider · July 2026`
- **Today:** 2026-08-08 (August, not July)
- **Bucket 2** — masthead edition label is editorial framing, needs approval to update to "August 2026" (or current winter framing); not a pure factual auto-fix.

### 2. What's On mega-menu "Editor's pick" points to a finished event
- **Where:** `index.html` and `whats-on/index.html`, nav mega-menu ("Editor's pick · Winter '26" + "This weekend" section)
- **Event:** `mornington-peninsula-regional-gallery-school-holiday-workshops` — ran 1–10 July 2026 (already archived in `next/src/content/events/archive/`)
- **Problem:** Nav still calls it "This weekend" and copy says "Starts 1 July," a month after it ended.
- **Bucket 2** — editor's pick selection/framing needs a human call on the replacement, not just a date swap.

### 3. Homepage weekend-picker links to a 6-week-old dispatch
- **Where:** `index.html`, `.weekend-picker__title` block
- **Found:** links to `/whats-on/this-weekend/` labeled "Peninsula This Weekend – 27 to 28 June" (`peninsula-this-weekend-jun-27`)
- **Today:** weekend of 8–9 August; the last static weekend-dispatch directory built is `journal/peninsula-this-weekend-may-30/` and even the nav pointer (jun-27) is stale relative to that. Daily `insider-picks-2026-08-*` articles exist and are current, but the homepage "This Weekend" module has not been repointed to them.
- **Bucket 2** — stale "coming up this weekend" section; content selection/framing decision, needs approval.

### 4. What's On hub lists 9 expired events as live listings
- **Where:** `whats-on/index.html` event-card grid (`data-event-slug` / `data-date-end` attributes)
- **Expired events still rendered as live cards** (end date < 2026-08-08):
  - `dromana-community-market` (ended 2026-06-28)
  - `emu-plains-market-balnarring` (ended 2026-06-20)
  - `boneo-community-market` (ended 2026-06-20)
  - `pearcedale-community-market` (ended 2026-06-20)
  - `mt-eliza-farmers-market` (ended 2026-06-24)
  - `mornington-tourist-railway-school-holiday-special-runs` (ended 2026-07-05)
  - `mornington-peninsula-regional-gallery-school-holiday-workshops` (ended 2026-07-10)
  - `youth-services-school-holiday-program` (ended 2026-07-10)
  - `soil-cellar-flinders-truffles-x-polperro-winery` (ended 2026-07-25)
- **Bucket 2** — this is a structured listing built from static HTML that has drifted from the archived JSON source; regenerating it changes what's visually featured on the hub, so treat as editorial-adjacent even though the underlying fix is mechanical (needs a rebuild/republish decision, not a hand-edit).

### 5. Homepage event card for MPRG Autumn Exhibition slightly stale
- **Where:** `index.html`, event-card grid
- **Event:** `mprg-autumn-exhibition`, ended 2026-06-30, still shown as a homepage card.
- **Bucket 3** — low confidence on whether this card is decorative/evergreen placement vs. a live listing; needs a human check of intent before classifying further.

## Governance

```
Governance:
- 85 articles with stale/missing lastVerified (missing entirely, or lastVerified before 2026-05-10)
- 0 articles with unresolved tmp-placeholder images
- 0 articles with pricing but no disclaimer
```

Note: all 85 flagged articles carry `status: published` and either have no `lastVerified` field or one dated 2026-04-22 through 2026-05-07 (i.e., older than the 90-day/2026-05-10 cutoff). Full list of affected files is in the scan working output; representative sample: `a-flinders-weekend.md`, `area-guide-dromana.md`, `arthurs-seat-eagle-visitor-guide.mdx`, `the-pub-guide.md`, `where-to-stay-mornington-peninsula.mdx`, and most of the evergreen guide corpus. These are largely evergreen reference guides (area guides, "best of" lists, walk guides) that likely just need a `lastVerified` refresh pass rather than content rewrites — Bucket 2 by the spec's governance-gate rule, but mechanically low-risk once someone signs off on a batch re-verification pass.

## Notes / non-issues confirmed clean

- All expired events in `next/src/content/events/*.json` are correctly `status: archived` or moved to `next/src/content/events/archive/` — the structured data layer is accurate.
- No dead internal links found across `/whats-on/`, `/journal/`, `/explore/` hrefs checked in `index.html` and `whats-on/index.html` (139 unique internal links checked, 0 broken).
- No `tmp-placeholder` image licenses found (some `tmp-unsplash` / `tmp-wikimedia` licenses exist but those are not the governance-gate value and were correctly excluded per spec).
- No pricing-disclaimer gaps — no article currently contains inline `$` figures.
- Partner-disclosure gate skipped — no `partnerContent` field or partners list found in the article corpus (best-effort, per spec).

This is a **detection-only report**. No files were edited as part of this scan.
