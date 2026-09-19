# Peninsula Insider — indexation recovery master tracker

Single source of truth for the recovery programme. One row per defect.

**Status ladder — an issue may only advance one rung at a time:**
`DIAGNOSED → FIXED → DEPLOYED → LIVE_VERIFIED → GOOGLE_RECRAWLED → RECOVERED`

Rules:
- `FIXED` means committed. It is not evidence of anything reaching users.
- `LIVE_VERIFIED` requires measuring the deployed artefact, not source or CI.
- `GOOGLE_RECRAWLED` and `RECOVERED` require Search Console evidence. **No issue
  may enter these states while the GSC blocker (B-1) is open.** Nothing below is
  marked recovered today, and that is correct rather than pessimistic.

Last updated: 2026-09-19.

---

## Active defects

| ID | Target | Issue | Evidence | Root cause | Sev | Conf | Status | Commit |
|---|---|---|---|---|---|---|---|---|
| P0-1 | Build pipeline | Deploy failed on every run since 17 Aug 19:37; production frozen at `e2c4057` | Runs `32061421402`, `32150413304` | `heroImage.license: "editorial"` not in schema enum → `validate:content` threw | P0 | Certain | **FIXED** | `4a25626` |
| P0-2 | 24 migration stubs | `noindex` + canonical to destination — destroys rather than transfers equity | Deployed artefact `968f3b8`: 26 URLs; `/places/sorrento/` googleCanonical self-resolved (8 Aug) | `Astro.redirect(...,301)` prerenders a noindex redirect document on static hosting | P0 | Certain | **FIXED** | `1301050` |
| P0-3 | 138 venue pages | 1,644 internal links to 40 non-existent URLs (`/wine//slug/`) | Deployed artefact: 1,644 occurrences; 184 links each to worst 3 targets | `VenueCard` joined `sectionHref` (`"/wine/"`) with `/${slug}/` | P0 | Certain | **FIXED** | `bde2894` |
| P0-4 | CI | No gate could observe artefact-level indexation defects; bulk noindex survived 100 days | `lint:seo-architecture` passed throughout | Lint asserted source declarations, never built output | P0 | Certain | **FIXED** | `242c057` |
| R-1 | 86 targets / 711 links | Internal links from indexable pages to redirect stubs and canonical losers | `ops/baselines/link-loser-baseline.json` | Residual tail of the bulk link remediation | P1 | High | DIAGNOSED (ratcheted in CI) | — |
| R-2 | 20 pages | Indexable, self-canonical, absent from sitemap, zero inbound — no declared policy | Ledger `indexableOrphans` | No lifecycle rule forcing an explicit sitemap/exclusion decision | P1 | High | DIAGNOSED | — |
| R-3 | 4 utility targets | `/me/saved/` 1,799, `/search/` 1,400, `/account/` 1,256, `/me/trip/` 1,172 sitewide links | Ledger `allLinkedLosers` | Global nav links utility surfaces from every page | P2 | Med | DIAGNOSED | — |
| R-4 | 83 of 628 | Indexable pages with zero editorial inbound links | Build link-graph report | Hub/spoke coverage gaps | P2 | High | DIAGNOSED | — |
| R-5 | ~151 URLs | `lastmod` falls back to build date, overstating change frequency | 13 Aug audit | Sitemap generator fallback | P3 | High | DIAGNOSED | — |
| R-6 | `/journal/the-producer-trail/` vs `/explore/plans/the-producer-trail/` | Migration inverted: Google indexed the retired legacy URL (self-canonical, fresh 6 Sep crawl); the declared replacement is not indexed | GSC URL Inspection, 19 Sep re-measurement | Google not honouring the site's canonical/redirect signal toward the new URL — mechanism unconfirmed | P1 | High | DIAGNOSED | — |
| R-7 | `/explore/regions/ocean-coast/` | Indexed at 22 Aug baseline, now `Crawled — currently not indexed`, with **no new crawl in between** (`lastCrawlTime` unchanged, 11 Jun) | GSC URL Inspection, 19 Sep vs 22 Aug baseline in `recovery-cohort.json` | Algorithmic/quality re-evaluation, not a crawl or technical cause | P1 | Med | DIAGNOSED | — |
| R-8 | `/explore/bushrangers-bay/`, `/explore/plans/the-producer-trail/` | `googleCanonical` resolves to an unrelated URL, `/explore/places/rosebud/`, instead of each page's declared target | GSC URL Inspection, 19 Sep; both carry identical `lastCrawlTime` 28 Jun 05:03:01 | Unknown — not checked against the live redirect map; do not assume cause from GSC data alone | P1 | Low (mechanism unconfirmed) | DIAGNOSED | — |
| R-9 | Homepage, `/eat/best-restaurants/` | LCP 5.09s / 7.01s — both above Google's 4s "poor" threshold | Lighthouse CI, GH run `35397859501`, 18 Sep | Unconfirmed; candidate correlation with the 10–11 Jun homepage redesign (PRs #242–#245) — no pre-redesign Lighthouse baseline exists | P1 | Med | DIAGNOSED | — |
| R-10 | Whole site | TLS 1.0 / 1.1 still served — SiteOne flags CRITICAL; security score 6.5/10 | SiteOne crawl, GH run `35397859501`, 18 Sep | Server/CDN TLS config not restricted to 1.2+ | P2 | High | DIAGNOSED | — |

## Verified complete (do not redo)

| Item | Status | Evidence |
|---|---|---|
| Bulk `sitemapExclude` removal | RECOVERED (production) | −114 pages lost noindex 7 Aug; 3 deliberate flags remain |
| Sitemap: no noindex / no redirects / all self-canonical | LIVE_VERIFIED | 0 violations of each across 610 URLs |
| No indexable canonical losers | LIVE_VERIFIED | 0 |
| No redirect chains, redirect loops, canonical loops | LIVE_VERIFIED | 0 of each |
| Bulk internal-link repointing | LIVE_VERIFIED | 1,348→4, 1,331→15, 1,308→0, 743→12, 672→0, 654→1, 654→0 |

## Blockers

| ID | Blocker | Impact | Owner |
|---|---|---|---|
| B-1 | Search Console OAuth fails `unauthorized_client` | **RESOLVED 19 Sep** — 42 live URL Inspection calls and multiple Search Analytics queries succeeded with no auth error. Downstream states (`LIVE_VERIFIED`, `GOOGLE_RECRAWLED`, `RECOVERED`) can now be pursued. | James |
| B-2 | Live domain blocked by egress policy from this environment (403 CONNECT) | Cloudflare edge redirects, real HTTP codes and headers unverified. Artefact conclusions unaffected (`gh-pages` measured directly) | James / infra |
| B-3 | Repo-root leftovers from the retired root-deploy model, incl. a 408-URL stale `sitemap.xml` | Not served, but has already produced one wrong measurement | Decision needed |

## Next actions, ranked by Impact × Confidence ÷ Effort

1. **Merge and deploy this branch.** Unblocks production and lands P0-1..P0-4. Then confirm `gh-pages` moves and re-measure.
2. **Restore GSC access (B-1).** Everything downstream of `LIVE_VERIFIED` is gated on it.
3. **R-2**: give all 20 orphans an explicit state — sitemap, redirect, noindex, or 410.
4. **R-1**: burn the 86-target tail down; lower the ratchet with each pass.
5. **Baseline the cohort in GSC** the day access returns, before further change.
6. **R-4**: hub/spoke linking for the 83 zero-inbound indexable pages.

## Monitoring

Fixed cohort: `ops/reports/seo/recovery-cohort.json` — 42 URLs.

| Group | n | Question it answers |
|---|---:|---|
| A restored from bulk noindex | 10 | Do the pages hidden for 100 days regain indexation? |
| B migration loser | 5 | Does Google accept consolidation, or retain the legacy URL? |
| B migration winner | 5 | Does legacy equity actually arrive? |
| C high-value awaiting index | 8 | Do substantial pages earn indexation on merit? |
| D weak-signal candidates | 8 | Which thin/weakly-linked pages stay crawled-not-indexed? |
| E healthy controls | 6 | Is any movement sitewide rather than remediation-driven? |

Cohort membership is fixed. Changing it destroys comparability; record any change
and its reason in `recovery-cohort.json`.

**Leading indicators** (readable now): constitution violations, orphan count,
link-loser count, click depth, sitemap size.
**Lagging indicators** (blocked on B-1): indexed URLs, discovered/crawled-not-indexed,
median crawl age, canonical mismatches, impressions, clicks.

Do not read normal Google processing delay as remediation failure. The April
event took roughly a fortnight to become visible in GSC and months to fully land;
the reversal will lag comparably.

## Re-measurement log

- **2026-09-19** — First cohort re-check since B-1 cleared (previous snapshot: 22 Aug, largely
  against stale pre-fix crawls). Group A: 2 of 10 recovered (`/wine/onannon/`,
  `/stay/hotel-sorrento/`), 8 unchanged/stale. Group B: 2 of 5 winner pages healthy, 2 stalled
  not-indexed, 1 migration inverted (R-6). Group C: 1 new indexation (`/explore/places/cape-schanck/`),
  1 new demotion with no recrawl (R-7). Group D: no change (expected). Group E: fully stable.
  First Lighthouse/SiteOne evidence recorded LCP and TLS findings (R-9, R-10). Full detail:
  `ops/reports/seo/indexation-recovery-forensics-2026-09-19.md`.
