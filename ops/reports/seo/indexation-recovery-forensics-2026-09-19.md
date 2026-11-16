# Peninsula Insider — indexation recovery re-measurement

Date: 19 September 2026
Scope: Live re-check of the fixed 42-URL recovery cohort (`ops/reports/seo/recovery-cohort.json`,
established 18 Aug, last measured 22 Aug) plus the first Lighthouse/SiteOne evidence from the
newly-installed audit tooling (PR #447, merged 17 Sep).
Method: Google Search Console URL Inspection API, queried live per URL on 19 Sep. GSC Search
Analytics queried for site-wide and page-level trend comparison. Lighthouse/SiteOne evidence read
from GitHub Actions run `35397859501` (daily live audit, 18 Sep 21:39 UTC) via `remy.py report`.
Trigger: James asked directly why the site isn't appearing on page one for "peninsula insider" and
requested a full assessment (19 Sep).

---

## 0. Blocker B-1 is resolved

The tracker's critical-path blocker — GSC OAuth failing `unauthorized_client`, which prevented any
`LIVE_VERIFIED`/`GOOGLE_RECRAWLED`/`RECOVERED` state — is no longer reproducing. 42 live URL
Inspection calls and multiple Search Analytics queries succeeded without error on 19 Sep. This
re-measurement is the first since the blocker cleared; the 22 Aug cohort snapshot was itself
measured just before or at the point B-1 lifted, largely against stale (pre-fix) crawl data.

## 1. Site-wide visibility: real and severe, not a de-indexing event

| | 15 Apr–15 May (baseline) | 21 Aug–18 Sep (current) | Change |
|---|---:|---:|---:|
| Impressions | 14,745 | 1,764 | −88% |
| Clicks | 153 | 11 | −93% |
| Average position | 20.4 | 69.1 | off page 1–2 → page 7+ |

Individual URL Inspection on the homepage and `/eat/best-restaurants/` both return `verdict: PASS`,
`coverageState: Submitted and indexed`. The collapse is in ranking/visibility, not in whether Google
holds the pages in its index. The Sitemaps report's "0 indexed" of 628 submitted is not read as
literal — it contradicts per-URL inspection and is a known-unreliable GSC UI aggregate.

Queries containing "peninsula insider" returned only 5 total impressions across the entire
Apr–Sep window (19–26 Jun and 1–6 Jul only, mostly position 1). This is a brand-search-volume
question, separate from the ranking-collapse question, and should not be conflated with it.

## 2. Cohort re-measurement vs 22 Aug baseline, by group

**Group A — hidden by the 22/29 Apr bulk noindex, restored 7 Aug (10 URLs).** 2 of 10 have
recovered since 22 Aug: `/wine/onannon/` and `/stay/hotel-sorrento/`, both freshly recrawled
(18–19 Sep) and now `Submitted and indexed`. The other 8 are unchanged, still sitting on stale
May/June crawl timestamps — Google has not returned to recrawl them since before the fix landed.
20% recovery in the four weeks since last measurement; slow but moving in the right direction, and
consistent with the tracker's own caveat that recrawl lags remediation by weeks to months.

**Group B — URL migrations (5 pairs).** Mixed:
- `/explore/plans/the-one-night-escape/` and `/explore/bushrangers-bay-walk/` (winners): healthy,
  indexed, both freshly recrawled since 22 Aug.
- `/explore/plans/the-peninsula-orientation-drive/` and `/tour/wine-tours/` (winners): still not
  indexed at all (`Discovered — currently not indexed` / `Excluded by noindex tag`), unchanged
  since baseline. Migration has not landed for these two.
- **`/journal/the-producer-trail/` (the retired legacy URL) is now `Submitted and indexed`**
  (fresh 6 Sep crawl) while its declared replacement, `/explore/plans/the-producer-trail/`, is not
  indexed. `googleCanonical` on the legacy URL is self-referential — Google is not honouring the
  site's canonical/redirect signal toward the new URL. This is the opposite of the intended
  consolidation and is a new finding, not previously tracked.
- **Two pages resolve to an unrelated `googleCanonical`, `/explore/places/rosebud/`, instead of
  their intended target**: `/explore/bushrangers-bay/` (migration loser, expected target
  `/explore/bushrangers-bay-walk/`) and `/explore/plans/the-producer-trail/` (migration winner,
  expected self-canonical). Both carry an identical `lastCrawlTime` of `2026-06-28T05:03:01Z`,
  which is consistent with both resolving through the same redirect/canonical chain at the same
  crawl pass, but this is inferred from GSC data alone — it has not been checked against the live
  redirect map and should not be taken as a confirmed root cause.

**Group C — high-value pages awaiting index (8 URLs).** One new problem, found only because this
group's controls make it visible: `/explore/regions/ocean-coast/` was `Submitted and indexed` at
the 22 Aug baseline and is now `Crawled — currently not indexed`, **with no new crawl in between**
(`lastCrawlTime` identical, 11 Jun). Google re-evaluated the page's indexation eligibility without
re-fetching it and demoted it — an algorithmic/quality judgment, not a technical or crawl-budget
cause. `/explore/places/cape-schanck/` is the inverse case: `Discovered — not indexed` at baseline,
crawled and indexed today (19 Sep). `/map/` moved from entirely unknown to Google to `Discovered —
not indexed` — early-stage progress, not yet indexed.

**Group D — weak-signal candidates (8 URLs).** No change on any of the 8. This is the expected
behaviour for this control group (thin/weakly-linked pages Google is not prioritising either way)
and is itself evidence the measurement is behaving as designed.

**Group E — healthy controls (6 URLs).** All 6 remain indexed and stable, several with fresher
recrawls than baseline. Confirms the cohort methodology: not everything on the site is degraded,
and the measurement correctly distinguishes healthy from affected pages.

## 3. First hard Core Web Vitals evidence (new capability, PR #447/#448)

From the daily live audit (GitHub Actions run `35397859501`, 18 Sep 21:39 UTC, `status: passed`
under current thresholds — LCP/CLS are `warn`, not `error`, in policy):

| Page | LCP | Lighthouse performance score |
|---|---:|---:|
| `/` (homepage) | 5.09s | 70/100 |
| `/eat/` | 3.92s | 83/100 |
| `/eat/best-restaurants/` | 7.01s | 67/100 |

Google's "poor" LCP threshold is 4 seconds. The homepage and `/eat/best-restaurants/` both exceed
it substantially. This tooling did not exist before 17 Sep, so there is no pre-existing Lighthouse
baseline to compare against — it cannot confirm or date a specific regression. It does confirm the
performance problem is real, current, and large enough to plausibly be a contributing factor to
the ranking collapse, independent of the indexation/noindex story already tracked above.

A plausible but **unconfirmed** candidate timing correlation, noted for the record and not asserted
as fact: the site-wide average position (§1) falls from ~20 on 12 Jun to ~70 on 13 Jun and never
recovers, which sits immediately after a 5-phase homepage redesign merged 10–11 Jun (new hero
carousel, restructured section rows, sitewide responsive rework, PRs #242–#245). No before/after
CWV measurement exists for that change. This is worth a targeted check, not a conclusion.

## 4. Other finding from the same audit run (unrelated to indexation, logged for completeness)

SiteOne flagged **CRITICAL**: the live site still serves TLS 1.0 and TLS 1.1 (deprecated, insecure
protocols) across all 7 checked pages. Security category score 6.5/10 ("Fair"). This does not
affect indexation directly but is a genuine current finding from the new tooling and is not
tracked anywhere else in this document set.

## 5. What this changes about next actions

1. Check the live redirect/canonical map directly for `/journal/the-producer-trail/` →
   `/explore/plans/the-producer-trail/` and for the two `rosebud` canonical resolutions (R-6/R-8
   below) — GSC data alone cannot diagnose the mechanism.
2. `/explore/regions/ocean-coast/`'s demotion (R-7) is not fixable by re-crawling; it needs content
   or quality-signal investigation, not a technical fix.
3. Homepage/`/eat/best-restaurants/` LCP (R-9) is ordinary performance engineering, not a ranking
   mystery, and is now measured on every daily audit going forward — future runs will show whether
   it moves.
4. TLS 1.0/1.1 (R-10) is a host/CDN configuration change, unrelated to the above.
5. Re-run this same 42-URL check in 2–4 weeks; Group A's 20% recovery rate this cycle sets the
   baseline pace to compare against.
