# 08, Content roadmap and implementation brief

Date: 2026-05-08
Scope: every content asset to build, refresh, consolidate, or delete in the next 90 days, with target queries, cluster slot, effort, and the existing PI surface that the work links from. This is the editorial-facing companion to `06-opportunity-matrix.md` and `07-30-60-90.md`.

The 20 content gaps in `02-content-clusters.md §4` are the source for the build list. The internal-link pairs in `02-content-clusters.md §6` and the cluster actions in §5 are the source for the refresh + consolidate + delete list.

## Content priorities at a glance

| Action | Count | Why |
|---|---:|---|
| Build (new article or page) | 6 | Highest-leverage gaps where queries exist and PI has no targeted page |
| Rebuild / refresh existing | 9 | Articles that exist but are stale, thin, or Discovered-not-indexed |
| Consolidate (301 to canonical) | 3 clusters of 2-3 URLs | Cannibalisation cases where multiple pages compete for the same intent |
| Delete (410 or noindex) | TBD per investigation | Address-string legacy pages, plus past one-off events |
| Internal-link sweep | 20 specific pairs | Push equity into Discovered URLs that are otherwise well-built |

The Otto research-gate cadence (per `feedback_pi_feature_research_gate.md`) applies: no piece reaches the slate without a verified Otto dossier first. The cadence is Fri/Sun research, ship via PR.

## Build list (6 new pages)

Each entry: target query, cluster, effort, internal-link sources, brief.

### B1, Stays Near Peninsula Hot Springs

- **Target query**: "accommodation near peninsula hot springs", "where to stay near peninsula hot springs". 19 impressions/week, position 67.8.
- **Cluster**: `/stay/`.
- **URL**: `/journal/stays-near-peninsula-hot-springs/` or `/stay/near-peninsula-hot-springs/`. Editorial preference for the `/journal/` slot per existing pattern.
- **Effort**: 2-3 days editorial. Otto dossier on accommodation within 5km of Peninsula Hot Springs and Alba; PI stay corpus filtered for proximity.
- **Internal links from**: `/journal/the-thermal-springs-weekend/`, `/stay/peninsula-hot-springs-glamping/`, `/journal/peninsula-hot-springs-vs-alba/`, `/places/rye/`, `/places/sorrento/`.
- **Schema**: Article + FAQPage + ItemList of stays.
- **Window**: 60-day (60D-04).

### B2, A Mornington Peninsula Day Trip (definitive)

- **Target query**: "mornington peninsula day trip" (most contestable of the 8 priority queries). Positioned for the editorial-day-plan SERP slot competitors haven't filled.
- **Cluster**: `/escape/`.
- **URL**: `/escape/day-trip-mornington-peninsula/`.
- **Effort**: 2-3 days editorial. ~2,500 words. Tested timings, locked-in dish recommendations, "what to skip" section, dog-friendly variant.
- **Internal links from**: `/places/sorrento/`, `/places/red-hill/`, `/places/flinders/`, `/explore/best-walks/`, `/journal/mornington-peninsula-itinerary/` (after consolidation, see C2 below).
- **Schema**: Article + FAQPage + ItemList of stops + TouristAttraction references via internal links.
- **Window**: 60-day (60D-04).

### B3, Best Walks Mornington Peninsula (graded walks rebuild)

- **Target query**: "best walks mornington peninsula", "mornington peninsula walks". Currently `/explore/best-walks/` ranks; competitive 03 §5 #6 shows Australian Traveller's graded structure as the entry-point benchmark.
- **Cluster**: `/explore/`.
- **URL**: rebuild `/explore/best-walks/` in place; 301 any old URL variants to it.
- **Effort**: 3 days editorial. 1,800-2,500 words, 12-15 walks each scored on grade (Easy / Medium / Hard), distance, time, dog rules, parking, post-walk dining adjacent.
- **Internal links from**: every `/explore/{walk-slug}/` page (the 32 newly-indexed walk pages from experiment 30D-02), plus `/journal/the-peninsulas-best-late-afternoon-walks/`, `/journal/walks-cape-schanck-hot-springs-day/`.
- **Schema**: Article + FAQPage + ItemList of walks.
- **Dependency**: experiment 30D-02 (walks cluster indexation push) should land first so the spokes are indexed before the spine refresh.
- **Window**: 60-day (60D-04).

### B4, Best Restaurants Mornington Peninsula (2026 rebuild)

- **Target query**: "best restaurants mornington peninsula", "best restaurants in mornington peninsula" (14 impressions/week, position 46.4). Broadsheet at #1 with Dec 2025 update is the bar.
- **Cluster**: `/eat/`.
- **URL**: rebuild `/eat/best-restaurants/` in place.
- **Effort**: 3-4 days editorial. ~24 restaurants ranked or curated, FAQ block, rich snippet markup, "what changed in May 2026" line under the dek.
- **Internal links from**: `/journal/where-to-eat-mornington-peninsula/`, `/journal/three-italian-dinners/`, `/journal/the-seafood-list/`, `/journal/hatted-restaurants-mornington-peninsula-2025/`, every `/places/{coastal town}/` hub.
- **Schema**: Article + ItemList (already partial; expand with full restaurant list) + FAQPage + Restaurant per item.
- **Window**: 60-day (60D-04).

### B5, The 2026 Mornington Peninsula Itinerary (canonical spine, after consolidation)

- **Target query**: "mornington peninsula itinerary", "things to do mornington peninsula 2 days", "mornington peninsula 3 days".
- **Cluster**: `/journal/`.
- **URL**: rebuild `/journal/mornington-peninsula-itinerary/` as the canonical spine. 301 `mornington-peninsula-day-trip` and `the-four-hour-peninsula` to it (see C2 below).
- **Effort**: 2-3 days editorial. ~1,800-2,500 words, day-by-day structure, links to /escape/ for multi-day, links to /places/ for town context, links to /eat/ and /wine/ for picks.
- **Internal links from**: `/escape/` and every `/escape/{plan}/` page, `/itinerary/` builder tool, `/places/{20 towns}/`.
- **Schema**: Article + FAQPage + ItemList of stops/days.
- **Window**: 90-day (90D-04 contender, can slip earlier if editorial bandwidth allows).

### B6, The Cellar-Door Price Index (data piece)

- **Target query**: "mornington peninsula winery prices", "cellar door fees mornington peninsula"; primary purpose is citation-bait, secondary is search.
- **Cluster**: `/journal/` (data piece). Could also live at `/wine/price-index/`.
- **URL**: `/journal/the-cellar-door-price-index/` or `/wine/price-index/`. Editorial slot preferred.
- **Effort**: 2-3 days build (data export + visual + article copy). Aggregates `priceBand` from `next/src/content/venues/*.json` filtered by `type: "winery"`. Sub-regional breakdown (Red Hill, Main Ridge, Balnarring, Merricks, Flinders).
- **Internal links from**: `/wine/best-cellar-doors/`, `/journal/the-cellar-door-short-list/`, `/journal/the-chardonnay-case/`, every `/wine/{venue}/` page (link from "Pricing" section if the schema has one).
- **Schema**: Article + Dataset + DataDownload (the CSV).
- **Outreach**: Halliday article team, RACV Royal Auto, Young Gun of Wine, Age and Herald Sun wine columns. Pitch the data, offer the chart as an embeddable iframe.
- **Window**: 90-day (90D-04).

## Rebuild / refresh list (9 items)

Each existing article that is Discovered-not-indexed or stale, with the smallest action that will unblock it.

| # | URL | Status today | Action | Effort | Internal-link push from |
|---|---|---|---|---|---|
| R1 | `/journal/hatted-restaurants-mornington-peninsula-2025/` | Discovered | Refresh dek + first paragraph for 2026 GFG; bump `lastVerified` | 1 day | `/eat/best-restaurants/`, `/journal/three-italian-dinners/` |
| R2 | `/journal/dog-friendly-beaches-mornington-peninsula/` | Indexed | Add a beach-by-beach data table + interactive map (the 90D-06 build); refresh for spring 2026 | 2 days | `/dog-friendly/`, every coastal `/places/{town}/` |
| R3 | `/journal/mornington-peninsula-winery-guide/` | Discovered | Refresh + push internal links from `/journal/the-chardonnay-case/` and `/wine/best-cellar-doors/` | 1 day | the chardonnay-case article (already top-of-page-1) |
| R4 | `/journal/best-brunch-mornington-peninsula/` | Discovered | Refresh dek; add 3-5 newly-opened brunch venues; structured FAQ | 1 day | `/places/sorrento/`, `/journal/three-italian-dinners/` |
| R5 | `/journal/best-spas-mornington-peninsula/` | Discovered | Refresh; structure with hot-springs, day-spa, lodge-spa categories | 1 day | `/journal/peninsula-hot-springs-vs-alba/`, future `/spa/` hub |
| R6 | `/journal/free-things-to-do-mornington-peninsula/` | Indexed (with the duplicate sitemap entry) | Refresh content; fix sitemap dedupe (also captured in matrix item #19); add FAQ | 1 day | `/explore/`, every `/places/{town}/` |
| R7 | `/journal/mornington-peninsula-stay-and-soak/` | Discovered | Refresh; this is the closest thing to B1 today; consider whether B1 supersedes or co-exists | 1 day | `/journal/the-thermal-springs-weekend/` |
| R8 | `/journal/the-spring-peninsula/` | Discovered | Refresh for spring 2026 (seasonal); rotate as the homepage seasonal pick | 1 day | seasonal homepage rotation, `/wine/` hub |
| R9 | `/journal/mornington-peninsula-in-winter/` (and `a-winter-peninsula-weekend`) | Discovered | Consolidate (see C3); bump for winter 2026 | 1 day | `/journal/the-thermal-springs-weekend/` |

Total rebuild/refresh effort: ~9 editorial days across the 90-day window. Spread at ~1 per week.

## Consolidate list (3 clusters)

| # | Canonical (winner) | URLs to 301 to canonical | Why |
|---|---|---|---|
| C1 | `/journal/the-rainy-day-peninsula/` (or pick the strongest of the three) | `the-rainy-day-peninsula-without-a-booking`, `rainy-day-peninsula`, partial overlap with `the-peninsula-with-kids` | Three articles competing for "rainy day mornington peninsula" intent |
| C2 | `/journal/mornington-peninsula-itinerary/` (B5 above) | `mornington-peninsula-day-trip`, `the-four-hour-peninsula` | Three articles competing for itinerary-shape queries |
| C3 | `/journal/where-to-eat-mornington-peninsula/` | `where-to-eat-without-a-booking` (might keep as separate sub-intent, decide editorially), `breakfast-before-the-crowds` (keep as sibling, different intent) | Mostly cluster the where-to-eat pieces; separate intent pieces remain separate |

Each consolidate operation:
1. Pick canonical (the strongest by current rank or content depth).
2. Merge best content from the killed pages into the canonical.
3. 301 the killed URLs to the canonical via `_redirects`-style routing or Astro middleware.
4. Update internal links to point at the canonical.
5. Log the experiment in `experiments.md`.

Consolidation is destructive; James approves before merge per project memory protocol.

## Delete (410 or noindex) list

Two patterns to investigate:

1. **Address-string legacy pages.** Top-10-by-impressions queries include `34 western parade point leo vic 3916` (46 impressions), `20 junction road merricks north vic 3926` (21 impressions), and others. These suggest legacy directory pages that exist outside the current sitemap. Investigation in matrix item #40. Likely action: 410 or noindex once located.

2. **Past one-off event pages.** `whats-on/[slug].astro` generates pages for every event but the sitemap excludes past events. Add a build-time `noindex` for past one-off events (i.e. events without a `recurringPattern`). Already in `01-technical-health.md §8 #16`. Effort: 30 minutes.

3. **Dispatch dispatch pages from old weekends.** `peninsula-this-weekend-april-24` and `peninsula-this-weekend-april-26` have aged out. Decide: consolidate into a "weekly archive" hub, 410, or accept them as evergreen breadcrumbs of editorial cadence. Editorial decision.

## Internal-link sweep (20 pairs)

The 20 source-page → target-page pairs from `02-content-clusters.md §6`. Implementation: edit the source article markdown to insert a one-sentence body paragraph linking to the target.

These are not 20 separate experiments. They are one batched PR: "internal-link sweep, May 2026". The PR description references the 20 pairs and the rationale. Ship after experiment 30D-02 lands so the link targets are indexed.

## Editorial pipeline integration

The audit assumes the existing editorial pipeline runs as documented:

- Otto research dossiers commissioned per piece (per `feedback_pi_feature_research_gate.md`).
- Editorial drafts; Claude does NOT write the articles.
- SEO loop commissions briefs and scores articles post-publish.

Claude's role on the content side is:
1. Maintain the brief library (this file).
2. Add SEO-required structured-data hooks to article frontmatter (heroImage, dek, lastVerified, faq) so templates render correctly.
3. Snippet rewrites (titles, meta descriptions, intros) post-publish based on GSC data, shipped via PR. This is the daily loop.
4. Internal-link sweeps. Batched PRs; not individual editorial decisions.

Claude does not unilaterally:
- Commission editorial briefs without James's approval.
- Edit article body copy (beyond the title/dek/intro snippet rewrites).
- Decide which articles to delete or consolidate. Surfaces the recommendation; James approves.

## Implementation brief (handoff format)

For each piece on the build / rebuild list, the brief format that goes to editorial is:

```
TITLE: <working title>
SLUG: <proposed URL>
TARGET QUERY: <primary>; <secondary 1>; <secondary 2>
WORD COUNT: <estimate>
WHY: <one paragraph: what gap this fills, what the data says>
SOURCES: <Otto dossier link>; <PI surfaces this links from>; <competitor pieces to study>
INTERNAL LINKS REQUIRED:
  - from <source PI URL>: insert link to this page in <section name> with anchor "<text>"
  - (3-5 inbound links)
INTERNAL LINKS OUTBOUND:
  - to <target PI URL>: anchor "<text>" in <section name>
  - (3-5 outbound)
SCHEMA: Article / FAQPage / ItemList / etc.
HERO IMAGE: <required spec, 1600w+>
HERO ALT: <one sentence describing the image, not the article>
DEK: <under 200 chars, SEO-optimised>
LAST VERIFIED: <date the editor visited or verified>
EXPERIMENT LOG: post-publish, log in `experiments.md` with hypothesis "by date Z, page earns X clicks/Y impressions for query Q"
```

## Cadence

Roughly one new piece per fortnight (B1-B6), one refresh per week (R1-R9). The internal-link sweep is a single batched PR. The 90-day total: 6 builds + 9 refreshes + 3 consolidations + 1 link sweep + ~5 delete-or-noindex actions = ~25 content actions over 13 weeks ≈ 2 per week. Within the existing editorial pipeline capacity.

## What this roadmap does NOT cover

- **The annual Insider's 30 list** (per matrix #20). This is a major editorial calendar event, not slotted into a 90-day SEO plan.
- **Major Awards 2026 content** (October-November cycle). Out of this 90-day window.
- **Programmatic suburb × intent pages.** Iceberg per project memory.
- **Newsletter content strategy.** Out of SEO scope.

---

End of file.
