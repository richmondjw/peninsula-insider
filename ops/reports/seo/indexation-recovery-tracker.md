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

Last updated: 2026-08-18 (post-deploy verification).

---

## Active defects

| ID | Target | Issue | Evidence | Root cause | Sev | Conf | Status | Commit |
|---|---|---|---|---|---|---|---|---|
| P0-1 | Build pipeline | Deploy failed on every run since 17 Aug 19:37; production frozen at `e2c4057` | Runs `32061421402`, `32150413304` | `heroImage.license: "editorial"` not in schema enum → `validate:content` threw | P0 | Certain | **LIVE_VERIFIED** | `4a25626` |
| P0-2 | 24 migration stubs | `noindex` + canonical to destination — destroys rather than transfers equity | Deployed artefact `968f3b8`: 26 URLs; `/places/sorrento/` googleCanonical self-resolved (8 Aug) | `Astro.redirect(...,301)` prerenders a noindex redirect document on static hosting | P0 | Certain | **LIVE_VERIFIED** | `1301050` |
| P0-3 | 138 venue pages | 1,644 internal links to 40 non-existent URLs (`/wine//slug/`) | Deployed artefact: 1,644 occurrences; 184 links each to worst 3 targets | `VenueCard` joined `sectionHref` (`"/wine/"`) with `/${slug}/` | P0 | Certain | **LIVE_VERIFIED** | `bde2894` |
| P0-4 | CI | No gate could observe artefact-level indexation defects; bulk noindex survived 100 days | `lint:seo-architecture` passed throughout | Lint asserted source declarations, never built output | P0 | Certain | **LIVE_VERIFIED** | `242c057` |
| R-1 | 86 targets / 711 links | Internal links from indexable pages to redirect stubs and canonical losers | `ops/reports/seo/link-loser-baseline.json` | Residual tail of the bulk link remediation | P1 | High | DIAGNOSED (ratcheted in CI) | — |
| R-2 | 20 pages | Indexable, self-canonical, absent from sitemap, zero inbound — no declared policy | Ledger `indexableOrphans` | No lifecycle rule forcing an explicit sitemap/exclusion decision | P1 | High | DIAGNOSED | — |
| R-3 | 4 utility targets | `/me/saved/` 1,799, `/search/` 1,400, `/account/` 1,256, `/me/trip/` 1,172 sitewide links | Ledger `allLinkedLosers` | Global nav links utility surfaces from every page | P2 | Med | DIAGNOSED | — |
| R-4 | 83 of 628 | Indexable pages with zero editorial inbound links | Build link-graph report | Hub/spoke coverage gaps | P2 | High | DIAGNOSED | — |
| R-5 | ~151 URLs | `lastmod` falls back to build date, overstating change frequency | 13 Aug audit | Sitemap generator fallback | P3 | High | DIAGNOSED | — |

## Deploy verification — 2026-08-18

PR #317 merged as `4c172ca3`. Deploy run `32184413517` succeeded at 20:52 UTC,
including the new SEO artefact integrity gate (step 11, pass). `gh-pages`
advanced `968f3b8` -> `8ec787c`.

Re-measured against the newly deployed artefact, not the build:

| Metric | Before (`968f3b8`) | After (`8ec787c`) |
|---|---:|---:|
| noindex + foreign canonical | 26 | **2** |
| Malformed internal hrefs | 40 targets / 1,644 links | **0** |
| Sitemap noindex / non-self-canonical | 0 / 0 | 0 / 0 |
| Redirect + canonical loops | 0 | 0 |
| Built pages | 946 | 946 |
| Sitemap entries | 610 | 611 |
| Indexable self-canonical | 628 | 628 |

The two remaining are `/account/likes/` and `/me/`, the documented utility hops.

`/journal/the-one-night-escape/` now serves meta-refresh plus a canonical to
`/explore/plans/the-one-night-escape/` with **no robots directive** — the
consolidation signal the migration needed.

P0-1..P0-4 are therefore `LIVE_VERIFIED`. They stop there: `GOOGLE_RECRAWLED`
and `RECOVERED` remain unreachable while B-1 is open.

### Correction to the P0-1 attribution

PR #316 merged separately and restored deploys at 20:23 UTC (run `32181936952`),
26 minutes before #317. The deploy freeze was already lifted by that change; the
P0-1 commit here diagnosed the same blocker independently but was redundant by
the time it landed. Recorded so the incident history stays accurate.

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
| B-1 | Search Console OAuth fails `unauthorized_client` | **Critical path.** No issue can pass `LIVE_VERIFIED`; no exclusion can be confirmed stale; recovery cannot be measured | James |
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
