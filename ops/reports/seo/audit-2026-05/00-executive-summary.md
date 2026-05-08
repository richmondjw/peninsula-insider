# 00, Executive summary, May 2026 monthly SEO audit

Date: 2026-05-08
Author: Claude (PI SEO desk)
For: James (and Emma, if it ever matters)
Read time: 5 minutes
Read the rest only if a section's claim seems wrong or you want the receipts.

## In one paragraph

Indexation is largely solved. The site went from 39 indexed URLs (May 1) to 233 (May 5) and 14 of 14 priority URLs are PASS. The technical chassis is materially better than the click numbers suggest. **The two structural problems left are: hero images are CSS backgrounds (invisible to Google Images), and seven of nine commercial conversion surfaces have zero contextual links from the editorial layer.** Fix those two things and a third (snippet rewrites on the chardonnay-case and pub-guide pages) and the next monthly audit should show clicks materially up. The longer plan layers on a content cadence aimed at three winnable SERPs (dog-friendly, day-trip, cellar-doors), a graded-walks rebuild, and the start of a sustainable inbound-link layer via a Featured-by-PI badge program.

## Where we stand (data, not opinion)

Last 28 days, ending 2026-05-02 (per `daily-log.md` 2026-05-04 entry):

| Metric | Value | vs Day-1 baseline (2026-05-01) |
|---|---:|---:|
| Clicks | 29 | +6 (+26%) |
| Impressions | 2,873 | +1,093 (+61%) |
| CTR | 1.01% | down from 1.29% (more impressions on long-tail at lower position) |
| Avg position | 16.8 | barely moved |
| Indexed URLs (full inventory) | 233 / 418 (56%) | from 39 / 349 (11%) |
| Indexed PRIORITY URLs | 14 / 14 (100%) | from 2 / 14 (14%) |

The 233-from-39 indexation jump came largely from one experiment (2026-05-01-01, the duplicate-canonical fix on place pages). That single template fix unblocked the entire spine.

## The five things that matter most this month

These are the top items from `06-opportunity-matrix.md`. Each has a measurable outcome and a small effort estimate. Composite scores in brackets.

1. **Fix the orphaned conversion-surface links** (composite 30, score-leader). The Pass page is linked from a footer label that points to `/preview-insider-plans/` instead of `/pass/` (`next/src/lib/v4-nav.ts:470`). Awards is missing from masthead, More menu, and footer entirely. Two trivial edits in two files; structural orphans become reachable.

2. **Add Awards to masthead More menu and footer About column** (composite 28). Same theme as #1. The Awards cluster has zero internal links from any indexable surface.

3. **Render `pressMentions` and won-awards on `VenueDetailTemplate`** (composite 26). The data is already structured in venue files (`data.authority.pressMentions`, `data.authority.awards`); the visual block is missing. One PR lifts trust signals across 134 venue pages and creates dozens of new internal links into the Awards cluster.

4. **Add a "Is this your venue? Claim it." link to `VenueDetailTemplate`** (composite 26). First venue-page → operator-claim path. Polite text link near the editor note, not a banner. Operator-claim is the priority-2 commercial surface and currently has no discovery path.

5. **Convert journal/place/venue heroes from CSS `background-image` to `<img>`** (composite 23). The single highest-leverage technical fix. Right now every editorial hero image is invisible to Google Images, has no alt text for image-search, can't use `loading="lazy"`, and is unlikely to be Discover-eligible. Affects 200+ pages. Half-day to ship; weeks to compound.

## The biggest risks

1. **PageSpeed Insights / Core Web Vitals data is missing.** PSI v5 quota was exhausted before this audit ran. Field data is also assumed unavailable (site is below CrUX threshold at 23 clicks/28d). We are flying blind on real-user performance until `psi-pull.mjs` (matrix #11) and the `web-vitals` RUM reporter (matrix #32) are wired up. Both are scheduled for the 60-day window.

2. **Bio depth and reviews/testimonials score 0.1 and 0.0 respectively on the E-E-A-T scale.** Site mean is 0.8 / 3.0. The single `editorial.json` author with no named individuals is the structural cap. Google rewards named expertise, and right now PI has structured-content advantages but human-authority disadvantages. Section 05 lays out a path that respects the editorial-collective voice while still adding signal.

3. **`/whats-on/` HTML payload is 460KB**, three times the homepage. Renders 90+ event cards inline. Likely a TBT/LCP risk on mobile. PROXY-flagged; PSI confirmation pending.

4. **The `dog-friendly-mornington-peninsula.astro` page is the site's #1 query magnet** (5 of top 10 queries by impressions are dog-friendly variants) and it is the most structurally weak journal page on the site: hand-coded outside the article collection, hardcoded no-trailing-slash canonical and `mainEntityOfPage`, falls back to generic `og:image`, contains 17 em-dashes (project rule violation). Migration to the article collection is matrix #9, scheduled for the 60-day window.

## Where PI can realistically win in the next 90 days

From the competitive analysis (`03-competitive-gap.md §5`), three SERPs are winnable in the next 90 days:

- **"best cellar doors mornington peninsula"**, already at position 4. Push to 1-2 with refresh frequency (already verified Apr 2026), comparison table, and structured FAQ.
- **"dog friendly mornington peninsula"**, PI has the right product and voice. Build out hub sub-pages (daycare, vets, weather contingencies) and link from the hub.
- **"mornington peninsula day trip"**, most contestable SERP. Top 5 is independent travel blogs of varying quality, none of which are MP specialists. A single 2,500-word editorial day plan is the play.

Three SERPs are deliberately deprioritised:

- "things to do mornington peninsula", five tourism / government domains in top 5.
- "where to stay mornington peninsula", booking-intent SERP owned by OTAs.
- "mornington peninsula weekend", head-term event-intent; rebuild as `/whats-on/this-weekend/` instead of chasing.

## What I need from you

**This week (manual, blocking)**:
- Submit `sitemap.xml` to GSC → Sitemaps (already in backlog).
- Submit reindex requests for the 5 niche-hub URLs from experiment 2026-05-05-01 (`/dog-friendly/`, `/whats-on/`, `/corporate-events/`, `/ask/`, `/explore/golf/`).
- After dog-friendly snippet rewrite deploys: submit reindex for `/journal/dog-friendly-mornington-peninsula/`.
- Approve the daily-log "tomorrow's queue" plan that emerged from this audit (next experiment is the chardonnay-case snippet rewrite, then the orphan conversion-link fixes from item #1 above).

**This month (decision)**:
- Editorial decision: is the house byline ("The Peninsula Insider") indefinite? If yes, document it on `/about/` and `/methodology/` so it's deliberate. If no, name at least one editor and add a `Person` JSON-LD entity. Either way, the bio-depth axis lifts.
- Confirm the four winnable / contestable / difficult query verdicts above match commercial intent. If "where to stay" is too important to deprioritise, the plan changes.
- Approve the consolidate list (3 clusters of competing URLs, see `08-content-roadmap.md`). Consolidations are 301s, James approves before merge.

**This quarter (decision)**:
- Whether to keep house byline or name editors.
- Whether the 90-day plan's targeted clicks (≥ 200 by 2026-08-06) is the right ambition or if you want to push harder.
- Whether to commission an editorial slate for the 6 new content pieces in the build list.

## How this audit was made

- Two parallel research agents (technical health, competitive benchmark) and one combined agent (content / conversion / E-E-A-T).
- Real GSC data from `daily-log.md` and `baseline.md`.
- Live HTML pulls of 15 representative URLs.
- Source-code review of the Astro templates.
- Live SERP comparison via WebSearch + WebFetch on 8 priority queries.
- Competitive page-level comparison against 8 sites (Visit MP, Broadsheet, Time Out, Concrete Playground, Australian Traveller, Halliday, The Urban List, The Ninch).
- GA4 is not authed for this audit. 7 conversion-funnel questions are explicitly marked QUANTIFY ON GA4 AUTH; the next monthly audit will fill them in.

## What's in the rest of this audit folder

| File | What it is |
|---|---|
| `00-executive-summary.md` | this file |
| `01-technical-health.md` | 24 prioritised technical fixes, file:line, effort, severity |
| `02-content-clusters.md` | 14-cluster map, intent alignment, 20 content gaps, 20 internal-link pairs |
| `03-competitive-gap.md` | 8-competitor profiles, head-to-head SERP comparison, 15 backlink targets |
| `04-conversion-paths.md` | 9-surface inventory, funnel traces, 19 file-level fixes |
| `05-authority-trust.md` | E-E-A-T scoring across 11 templates, About/Contact/Methodology audit, 15 backlink opportunities |
| `06-opportunity-matrix.md` | 45 ranked opportunities scored on impact/effort/speed/commercial/confidence |
| `07-30-60-90.md` | 17 named experiments mapped to 30, 60, 90-day windows with measurement dates |
| `08-content-roadmap.md` | 6 builds, 9 refreshes, 3 consolidations, 20 internal-link pairs, editorial-pipeline brief |
| `methodology.md` (parent dir) | The operating rhythm. Daily, weekly, monthly, quarterly. Decision rules for fix / refresh / consolidate / delete / expand |

## Diff vs prior audit

This is the first monthly audit. There is no prior audit to diff against. Future audits open with a "What changed since last audit" block in this file.

## Confidence and caveats

- The matrix scores are evidence-based but not infallible. Item ranks may shift as experiments confirm or refute hypotheses; the 30/60/90 plan has explicit dependency notes for what to reconsider on REFUTED outcomes.
- The "three winnable SERPs" claim assumes Google's ranking signals stay stable across the next 90 days. SERP volatility is a real risk; the daily loop catches sudden shifts.
- The 90-day click target of ≥ 200 (vs 29 today) is ambitious but grounded: it requires only that the structural unblocks (item 1 above) and the snippet rewrites compound at the rate they did in May (clicks went 23 → 29 in 4 days from the canonical fix alone).
- GA4 is the missing piece. Once authed (deferred from this audit), the conversion-path numbers fill in and the priority order may shift.

---

End of executive summary. The full audit folder is dense; no need to read it cold. Pick a section based on the question you have, e.g.:

- "what's the biggest technical fix?" → `01-technical-health.md §0` (TL;DR)
- "what should we ship next week?" → `06-opportunity-matrix.md` top 5 + `07-30-60-90.md` 30-day window
- "what content do I need to commission?" → `08-content-roadmap.md` build list
- "who are we actually competing with?" → `03-competitive-gap.md §2`
- "how does this work as an ongoing operation?" → `methodology.md` (parent dir)
