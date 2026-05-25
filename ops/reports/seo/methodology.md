# Peninsula Insider, SEO methodology

The operating rhythm we run every week, month, and quarter so the work compounds instead of decaying. This document does not replace `daily-log.md`, `experiments.md`, `backlog.md`, `baseline.md`, or `url-inventory.md`. Those remain the source of truth. This document defines **when** to read each one, **what** to update, and **how to decide** what to fix, refresh, consolidate, or kill.

Adopted 2026-05-08.

## Why this exists

The daily loop (defined in `README.md`) is excellent for tactical execution: pull GSC, diff, ship one experiment, log it. It is not enough on its own. Without longer cadences:

- Technical health (Core Web Vitals, schema gaps, internal-linking depth) drifts unwatched.
- Content clusters lose coherence as new articles are added without a cluster strategy.
- Competitive moves go unnoticed.
- Conversion paths stay broken because no one is asked to look at them.
- Reports never roll up into "is the work compounding".

The cadences below close those gaps without fragmenting the daily loop.

## The four cadences

| Cadence | Owner | Time budget | Output |
|---|---|---|---|
| **Daily (weekday morning)** | Claude | 15 min | One entry in `daily-log.md`, one experiment shipped or one diagnosis recorded |
| **Weekly (Monday)** | Claude | 30 min | A weekly review block at the top of `daily-log.md`; backlog re-prioritised |
| **Monthly (1st business day)** | Claude + James | 2-3 h Claude, 30 min James | New `audit-YYYY-MM/` folder; executive summary read by James |
| **Quarterly (1st of new quarter)** | James + Claude | 1-2 h | Strategic review: kill / continue / pivot decisions on clusters and the commercial model |

The daily loop is the only one that runs against fresh GSC data. Weekly and monthly use accumulated daily-log data plus targeted lab tools (PSI, schema validators, competitor SERP checks). Quarterly is judgement-led, not data-led.

## Daily, already documented

See `README.md`. Five steps: pull, diagnose, cross-reference experiments, pick 2-3 backlog actions, ship via PR + log experiment.

The only addition this methodology makes to the daily loop:

- **End-of-day check**: was the experiment hypothesis specific and measurable? If not, edit it before logging. Vague hypotheses are dead weight at the monthly review.

## Weekly review (Monday morning, 30 min)

Run after the Monday daily pull. Output is a 100-200 word block at the top of that day's `daily-log.md` entry, headed `## Weekly review, week of YYYY-MM-DD`.

### Checklist

1. **Read the last 7 entries in `daily-log.md`** (the orchestrator already loads context from yesterday and today; the rest you re-read once a week).
2. **Tally the week's deltas**:
   - Clicks WoW Δ
   - Impressions WoW Δ
   - Indexed-URL count Δ (re-run `discover-unindexed.mjs` weekly, not daily)
   - Position Δ on PRIORITY_URLS
3. **Mark experiment outcomes** that hit their measurement date this week. Open `experiments.md`, write the Outcome block, mark CONFIRMED / REFUTED / PARTIAL. No outcome should sit in "pending" past its measurement date by more than 2 days.
4. **Re-prioritise `backlog.md`**:
   - Promote anything blocking on James's manual GSC actions if the URL has now been crawled
   - Demote anything where the diagnosis has changed (e.g. a CTR target that no longer earns impressions)
   - Add anything new from the week's daily entries that wasn't logged at the time
5. **One question for James** (write at the bottom of the weekly review block). Examples: "Should I treat the Mornington Cup pages as evergreen-with-yearly-refresh or 410 after the race?", "Do you want me to noindex the address-string legacy pages or 410 them?".

### Decision rules, when to escalate to a monthly action

- 7 days with no experiment shipped → escalate to monthly: investigate why we're stuck.
- An experiment was REFUTED with strong evidence → log a new experiment that tests an alternative hypothesis. Don't ship the same change again.
- 7 days where indexed-URL count drops → not noise, run a regression check on recent template/canonical changes.
- 14 days where weekly clicks Δ is flat-or-down → escalate to monthly: cluster-level analysis required.

## Monthly audit (first business day, 2-3 hours)

The monthly audit is the operation's quality gate. It produces a dated artefact in `ops/reports/seo/audit-YYYY-MM/` that future audits diff against.

### When

First business day of each calendar month. Audit covers the prior calendar month plus what's changed since the last audit.

### Inputs

- All `daily-log.md` entries for the prior month
- The current `experiments.md` outcomes
- A fresh `discover-unindexed.mjs` run
- A fresh PageSpeed Insights run on 7 representative URLs (one per template)
- A fresh competitive SERP scan on 8 priority queries
- GA4 conversion data (once authed)
- Last month's audit folder for diffing

### Standard folder structure

```
ops/reports/seo/audit-YYYY-MM/
  00-executive-summary.md      # for James, top of every audit
  01-technical-health.md
  02-content-clusters.md
  03-competitive-gap.md
  04-conversion-paths.md
  05-authority-trust.md
  06-opportunity-matrix.md
  07-30-60-90.md
  08-content-roadmap.md
```

Every audit uses this same structure so diffs are clean.

### What each section covers

| File | Purpose | Length |
|---|---|---|
| 00-executive-summary | What changed since last audit, biggest risks, biggest opportunities, asks for James | 1-2 pages |
| 01-technical-health | Core Web Vitals per template, schema audit, robots/sitemap quality, internal-linking depth | 800-1500 lines |
| 02-content-clusters | Cluster-by-cluster URL count, indexed %, top performers, gaps; intent alignment matrix; classification of unindexed URLs (keep / refresh / consolidate / delete) | 600-1000 lines |
| 03-competitive-gap | Per-competitor profile, head-to-head SERP comparison, content formats to adopt, backlink-target list | 600-1200 lines |
| 04-conversion-paths | Each commercial goal mapped from organic visitor to action, weakest step per funnel, indexable conversion-surface SEO | 400-700 lines |
| 05-authority-trust | E-E-A-T scoring per template (0-3), about/contact/authors audit, PR/citation hooks | 400-700 lines |
| 06-opportunity-matrix | Every recommendation in a table: impact × effort × speed × commercial × confidence | 1 file, scannable |
| 07-30-60-90 | Concrete, named experiments mapped onto 30, 60, 90 day windows with measurement dates | 1 file |
| 08-content-roadmap | Articles to build / refresh / consolidate / kill, with target queries, cluster slots, effort | 1 file |

### After writing the audit

1. Update `backlog.md` with the new opportunities, scored against the matrix.
2. Open a single PR for the audit folder + backlog update so James can review in one diff.
3. After James reviews `00-executive-summary.md`, the monthly cycle is closed.

### Diffing against the prior audit

When writing audit N+1, the technical-health and content-cluster sections must explicitly diff against audit N. Each section opens with a "What changed since last audit" block. This is how we catch drift.

## Quarterly review (first of new quarter, 1-2 hours)

Strategic, not tactical. James leads. Claude prepares.

### Inputs

- All three monthly audits in the quarter
- A 90-day clicks/impressions/indexed trajectory chart (Claude generates from `ops/data/seo/`)
- The Pass / Operator / Concierge / Awards / Newsletter / Partner conversion totals (once GA4 + commercial dashboards exist)

### Decisions to make

1. **Cluster strategy**, which clusters keep getting investment, which go on maintenance, which get killed?
2. **Commercial-goal priority order**, does the order (currently Pass → Operator → Concierge → Awards → Newsletter → Partner) still match revenue reality?
3. **Competitor watchlist**, add or drop competitors based on who's actually showing up in PI's SERPs.
4. **Operating-rhythm fit**, is this methodology adding value or has it become ritual? Cut what isn't paying.

### Output

Three to seven decisions logged in `ops/reports/seo/quarterly-YYYY-Q.md`. Each decision: what, why, what changes in the operating rhythm or backlog as a result.

## Decision rules, fix / refresh / consolidate / delete / expand

These are the rules that turn diagnostic data into action. They run in the monthly audit (when classifying unindexed URLs and underperforming pages) and in the daily loop (when triaging a new query that's earning impressions but no clicks).

### Fix
A page that should rank but has a structural defect.

**Triggers**:
- Indexed but 0% CTR with ≥30 impressions over 28 days at position ≤10 → snippet failure (title/meta rewrite)
- Indexed but earning impressions for queries the page doesn't actually answer → intent mismatch (rewrite intro / add FAQ block / restructure H2s)
- Discovered-not-indexed but well-linked (≥3 inbound internal links, no canonical or quality issue) → request manual reindex
- Has an obvious technical defect (duplicate canonical, missing schema, broken image, slow LCP) → fix the defect

**Don't fix** if the page hasn't been earning impressions for 60+ days at any meaningful volume, it doesn't matter yet.

### Refresh
A page that ranked once, still has demand, but content is stale.

**Triggers**:
- Was earning ≥10 clicks/month, now <3, position has dropped 5+ places
- Last-modified date is 6+ months old and content is dated (e.g. "best restaurants 2025" article showing in 2026 searches)
- Topic is seasonal and we are in the next iteration of the season (e.g. autumn-weekend-edit going into spring)
- Competitor has shipped a stronger piece on the same query

**What "refresh" means**: rewrite at least 30% of body copy, update images if older than 12 months, update internal links, bump the publish date in front-matter, ship via PR with a changelog note.

### Consolidate
Two or more pages competing for the same query.

**Triggers**:
- GSC shows two URLs ranking for the same query (cannibalisation)
- Two articles cover overlapping topics with one materially weaker
- Slash-variant or HTTP-variant duplicates (already-known case)

**What "consolidate" means**: pick the stronger URL as canonical, 301 the others to it, merge the best content from the killed pages into the survivor, update internal links to point at the survivor.

### Delete (410 or noindex)
A page that costs more than it earns.

**Triggers**:
- Programmatic page with thin content (auto-generated venue stub with no editorial)
- Address-string queries earning impressions for legacy directory pages that have no editorial content (already flagged in `backlog.md`)
- Test/preview/draft pages accidentally indexed
- Outdated event pages where the event has passed and won't recur (one-off race, pop-up that closed)

**410 vs noindex**: use 410 (Gone) when the URL should never come back; use `noindex,follow` when the page should remain but not show in search (e.g. operator-only pages, search results, account pages).

### Expand
A query the site nearly ranks for, where a deeper article would push it onto page 1.

**Triggers**:
- Existing page earns impressions for a related query at position 11-30, but the page doesn't deeply answer the query
- A cluster gap identified in the monthly audit that an existing page could partially absorb if expanded

**What "expand" means**: add 500-1000 new words to the existing page targeted at the related-query intent, add new H2s, internal-link from the cluster spine, do not create a new URL.

### Default
If none of the triggers fire, do nothing. The biggest waste in SEO operations is fiddling with pages that are working. The monthly opportunity matrix is the place to argue for an exception.

## Operating roles

Who does what.

### Claude (autonomous, no per-task approval needed)

- Daily GSC pull (when running locally) and `daily-log.md` updates
- Weekly review block in `daily-log.md`
- Monthly audit folder generation
- Quarterly briefing pack
- Snippet rewrites (titles, meta descriptions, intro paragraphs) shipped via PR
- Schema additions (Article, BreadcrumbList, FAQPage, LocalBusiness, Event) shipped via PR
- Internal-linking changes (related-articles, cluster spines, contextual body links) shipped via PR
- Sitemap and robots.txt fixes
- New article drafts when commissioned by James (the editorial pipeline is separate; SEO work flags articles for commissioning)
- Updating `backlog.md` and `experiments.md`

### James (manual, blocking)

- GSC URL Inspection requests for newly-shipped pages (Claude lists URLs in the daily log; James submits)
- Final approval on content commissioning briefs
- Quarterly cluster decisions
- Approving anything destructive (consolidate, delete) before PR merge

### Boundaries

- Claude does not write new editorial articles unilaterally. SEO work commissions articles; an editor (or James) drafts them.
- Claude does not contact external sites for backlinks. SEO work generates the pitch list; James (or whoever runs PR) reaches out.
- Claude does not modify the commercial model (Pass pricing, paywall behaviour, Operator claim flow). SEO work surfaces conversion-path issues; commercial decisions live elsewhere.

## Tooling, what runs, where, when

| Tool | Runs | Output | Frequency |
|---|---|---|---|
| `ops/scripts/seo/pull.mjs` | local or cron | appends to `daily-log.md`, snapshot in `ops/data/seo/` | weekday morning |
| `ops/scripts/seo/diff.mjs` | local | compares two daily snapshots | as-needed inside daily loop |
| `ops/scripts/seo/inspect-page.mjs` | local | full query + trend for a single URL | as-needed |
| `ops/scripts/seo/discover-unindexed.mjs` | local | fresh URL inventory | weekly + monthly |
| `ops/scripts/ga4/pull.mjs` | local (after auth) | GA4 conversion data per landing page | daily once authed |
| PageSpeed Insights API | local | CWV per URL | monthly (7 representative URLs) |
| Schema validators (Schema.org, Google Rich Results) | manual or scripted | schema validity report | monthly |
| Competitive SERP scan | scripted (WebSearch via Claude) | rankings on 8 priority queries | monthly |

## Glossary of "done"

A monthly audit is **done** when:

- All 9 files exist in `audit-YYYY-MM/`
- The opportunity matrix has at least 20 ranked items
- The 30-60-90 plan has named experiments with measurement dates
- The content roadmap has at least 10 specific articles or pages
- `backlog.md` has been updated and the new top-priority items are clearly the highest-leverage actions from the matrix
- The PR is open and James has read `00-executive-summary.md`

A weekly review is **done** when:

- All experiments at their measurement date have outcomes recorded
- `backlog.md` reflects the week's learning
- The single question for James is in the daily log

A daily entry is **done** when:

- The headline metrics are pulled and diffed vs prior day
- At least one experiment is shipped, or a deliberate "no experiment today, here's why" line is logged
- Action items for James are explicit

## Open questions for the operating model

These are the unresolved bits we discover and revise as we go. Do not delete; supersede.

1. **GA4 integration**, once authed, what's the daily metric set worth pulling, and what stays monthly-only? (Likely: daily = sessions / engaged-sessions / conversions per source-medium; monthly = full path analysis.)
2. **Editorial-SEO interface**, how does the editorial calendar (Otto research gate, Sunday dispatch) consume the SEO content roadmap? Right now they are separate; they should not be.
3. **Awards-as-traffic-engine**, does the annual Awards process generate enough monthly search traffic to deserve cluster-spine status, or is it a once-a-year peak? Decide at first quarterly review with Awards in flight.
4. **Pass / Concierge as SEO surfaces**, should /pass/ and /ask/ be primarily indexable destinations or primarily on-site CTAs? Currently both, by accident. Decide at the first monthly audit review with conversion data.
