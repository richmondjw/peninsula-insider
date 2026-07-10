# Peninsula Insider — Content Strategy

**North star:** Become the number-1 destination — for people and AI agents — for what's on, and where to stay, eat, drink and explore on the Mornington Peninsula.

**Loop health:** 🟢 healthy — Actions recorded but none re-measured yet — learning signal not flowing (expected until GSC re-crawls the actioned pages).

**Generated:** 2026-07-11 07:07 AEST  
**Season:** Winter  
**Inputs used:** gsc-search-analytics, gsc-coverage, sitemap-inventory, events-calendar:5-upcoming, seasonal-calendar:winter  

## Where we stand

| Metric | Value |
|---|---|
| Search period | 2026-03-23 → 2026-04-19 |
| Total clicks | 14 |
| Total impressions | 630 |
| Avg position | 15.2 |
| Pages indexed by Google | 0 |
| Pages known-not-indexed | 26 |
| Pages in sitemap | 408 |
| Open opportunities | 53 |

## Day-over-day (is the strategy improving?)

_Compared with 2026-07-10._

- Average position held by 0.00.
- Clicks flat 0 vs last snapshot.

## Did our fixes work? (learning loop)

Tracking 8 actioned item(s), 0 re-measured against GSC:

- ⏳ [indexation] /about/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /methodology/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /our-approach/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /editorial-approach/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /ethics/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /corrections/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /accessibility/ — not yet re-measured _(since 2026-07-06)_
- ⏳ [indexation] /contact/ — not yet re-measured _(since 2026-07-06)_

## Model self-tuning

The scoring model nudges its per-fix-type weights toward what demonstrably works on this site (only after ≥4 measured outcomes, so early noise can't swing it):

- `indexation` × 1.000 (at baseline)
- `event-coverage` × 1.000 (at baseline)
- `ctr-fix` × 1.000 (at baseline)
- `striking-distance` × 1.000 (at baseline)
- `coverage-gap` × 1.000 (at baseline)
- `freshness` × 1.000 (at baseline)

## This cycle's commissioning queue (ranked)

Ranked by the strategy model (performance + season + coverage + effort). The orchestrator commissions from the top down.

### 1. [CTR · score 4.689] Rewrite title & meta description for /whats-on/mornington-cup-2026/
- **Desk:** dispatch-desk
- **Why:** Google surfaces this at avg position 8 on 216 impressions but CTR is 0.46% — a snippet problem, not a ranking problem.
- **Do:** Rewrite the <title> and meta description to match query intent and add a benefit/number; add a direct-answer first line under the H1.

### 2. [CTR · score 4.023] Rewrite title & meta description for /journal/dog-friendly-mornington-peninsula/
- **Desk:** field-desk
- **Why:** Google surfaces this at avg position 9 on 73 impressions but CTR is 0.00% — a snippet problem, not a ranking problem.
- **Do:** Rewrite the <title> and meta description to match query intent and add a benefit/number; add a direct-answer first line under the H1.

### 3. [CTR · score 4.002] Rewrite title & meta description for /journal/the-chardonnay-case/
- **Desk:** table-desk
- **Why:** Google surfaces this at avg position 6 on 29 impressions but CTR is 0.00% — a snippet problem, not a ranking problem.
- **Do:** Rewrite the <title> and meta description to match query intent and add a benefit/number; add a direct-answer first line under the H1.

### 4. [RANK · score 3.434] Push 'peninsula cup 2026' onto page 1
- **Desk:** dispatch-desk
- **Query:** `peninsula cup 2026`
- **Why:** 'peninsula cup 2026' ranks avg position 8.1 on 34 impressions — small, targeted improvement could reach page 1 and start earning clicks.
- **Do:** Strengthen the ranking page for this exact query: expand the relevant section, add an FAQ answer, tighten the H1/intro, add internal links from related hub pages.

### 5. [CTR · score 3.298] Strengthen ranking + snippet for /stay/hotel-sorrento/
- **Desk:** escapes-desk
- **Why:** Surfaced on 59 impressions but stuck at avg position 54 with 0.00% CTR — real demand, weak page. Needs to climb before the snippet matters.
- **Do:** Deepen the page (content, schema, internal links) to climb toward page 1, then sharpen the title/meta for the winning query.

### 6. [RANK · score 3.139] Push 'mornington cup 2026 date' onto page 1
- **Desk:** dispatch-desk
- **Query:** `mornington cup 2026 date`
- **Why:** 'mornington cup 2026 date' ranks avg position 8.8 on 23 impressions — small, targeted improvement could reach page 1 and start earning clicks.
- **Do:** Strengthen the ranking page for this exact query: expand the relevant section, add an FAQ answer, tighten the H1/intro, add internal links from related hub pages.

### 7. [EVENT · score 2.992] Preview: Stonier Fire & Wine Winter Lunch (29d out)
- **Desk:** dispatch-desk
- **Why:** Stonier Fire & Wine Winter Lunch is 29 days out (2026-08-09, Merricks) — prime window. Advance-planning searches build now; a preview page needs lead time to index and rank by event week.
- **Do:** Ensure a dedicated, indexable preview page exists with dates, booking link, what-to-expect and internal links from the town hub and What's On — published now, not event week.

### 8. [EVENT · score 2.992] Preview: Red Hill Brewery Secret Stash Weekend (35d out)
- **Desk:** dispatch-desk
- **Why:** Red Hill Brewery Secret Stash Weekend is 35 days out (2026-08-15, Other Mornington Peninsula) — prime window. Advance-planning searches build now; a preview page needs lead time to index and rank by event week.
- **Do:** Ensure a dedicated, indexable preview page exists with dates, booking link, what-to-expect and internal links from the town hub and What's On — published now, not event week.

### 9. [RANK · score 2.883] Push 'dog friendly guide mornington peninsula' onto page 1
- **Desk:** field-desk
- **Query:** `dog friendly guide mornington peninsula`
- **Why:** 'dog friendly guide mornington peninsula' ranks avg position 9.6 on 17 impressions — small, targeted improvement could reach page 1 and start earning clicks.
- **Do:** Strengthen the ranking page for this exact query: expand the relevant section, add an FAQ answer, tighten the H1/intro, add internal links from related hub pages.

### 10. [INDEX · score 2.868] Get /journal/a-winter-peninsula-weekend/ indexed
- **Desk:** dispatch-desk
- **Why:** Google reports 'Discovered – currently not indexed' (last crawl: Never). This page that isn't indexed cannot rank for anything — the single highest-leverage fix.
- **Do:** Ensure it's in sitemap.xml with a strong priority, add internal links from already-indexed pages, confirm it isn't noindex, add unique above-the-fold content, then Request Indexing in GSC.

### 11. [INDEX · score 2.868] Get /wine/best-cellar-doors/ indexed
- **Desk:** table-desk
- **Why:** Google reports 'Discovered – currently not indexed' (last crawl: Never). This page that isn't indexed cannot rank for anything — the single highest-leverage fix.
- **Do:** Ensure it's in sitemap.xml with a strong priority, add internal links from already-indexed pages, confirm it isn't noindex, add unique above-the-fold content, then Request Indexing in GSC.

### 12. [RANK · score 2.845] Push 'a dog-friendly guide mornington peninsula' onto page 1
- **Desk:** field-desk
- **Query:** `a dog-friendly guide mornington peninsula`
- **Why:** 'a dog-friendly guide mornington peninsula' ranks avg position 8.3 on 10 impressions — small, targeted improvement could reach page 1 and start earning clicks.
- **Do:** Strengthen the ranking page for this exact query: expand the relevant section, add an FAQ answer, tighten the H1/intro, add internal links from related hub pages.

## Coverage snapshot

- `/journal/` — 101 pages
- `/explore/` — 86 pages
- `/whats-on/` — 86 pages
- `/fishing/` — 34 pages
- `/eat/` — 31 pages
- `/stay/` — 25 pages
- `/wine/` — 23 pages
- `/boating/` — 11 pages
- `/tour/` — 2 pages
- `/(home)/` — 1 pages
- `/dog-friendly/` — 1 pages
- `/weddings/` — 1 pages

---
*Generated by the Peninsula Insider Strategy Brain (`engine/strategy_engine.py`). This file is machine-owned; edit the model, not the output.*
