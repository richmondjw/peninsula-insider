# Peninsula Insider — indexation recovery forensics

Date: 18 August 2026
Scope: Phase 0 reconciliation, Phase 1 URL ledger, Phase 2 incident reconstruction, Phase 3–5 corpus audit
Method: measurement of the deployed artefact (`gh-pages` @ `968f3b8`) and of full `main` history, plus a rebuilt `next/dist`

---

## 1. Headline corrections to the brief

Three of the programme's stated premises do not survive measurement. All three
change what should be worked on.

### 1.1 The bulk noindex incident was 22 April, not 10 May

The brief names a "10 May bulk indexation incident" applying `sitemapExclude`
to ~105 pages. The commit that actually did this is **`a8239fe132`, 22 April
2026**, "seo: noindex 130 thin pages — remove from sitemap, add noindex meta".
It added `sitemapExclude: true` to 129 content files and, in the same commit,
wired six templates to pass `noindex` to `BaseLayout`. Its own message records
the intended effect: "~312 submitted URLs -> ~126".

The 10 May commit cited downstream as the cause, `051381e0fa`, is an **automated
deploy of built HTML to the repo root**. It contains **zero** `sitemapExclude`
changes; its diff is a correction-note component. The only substantive 10 May
source change is `40e29db06e`, the `/escape/` → `/plans/` section rename — a
deliberate, correctly-executed migration (32 files, 4 noindex, all intentional
redirect stubs).

The misattribution appears to originate in the 7 August remediation commit
`c19f8d9c96`, which names `051381e0fa` as the source of the flags. That commit's
*remediation* was correct and its content analysis was sound; only its causal
attribution was wrong.

Measured in the built artefact, page counts carrying `content="noindex, nofollow"`:

| Date | Commit | Pages with noindex | Sitemap URLs |
|---|---|---:|---:|
| 21 Apr | `b22d2d9f` | 0 | 352 |
| 23 Apr | `19b1ee46` | 0 | 349 |
| **30 Apr** | `de6fe298` | **126** | **240** |
| 5 May | `d9a82a89` | 126 | 364 |
| 11 May | `ff1c5a2d` | 119 | 392 |
| 20 May | `17c293f4` | 110 | 411 |
| 1 Jun | `302e15db` | 106 | 407 |

The deploy that carried it live is `b27af9fa37` (29 April): **+127 pages** gained
`noindex, nofollow` in one commit. The reversal is `4ff89be1f3` (7 August):
**−114 pages**.

**Exposure window: 29 April → 7 August 2026, approximately 100 days.**

Root-tree figures are only reliable to 1 June, when root auto-deploys stopped
(last: `d9a2f653b4`). After that the deployed artefact is the `gh-pages` branch.

### 1.2 The mechanism in the brief is correct; only the date is wrong

Everything else in the brief's account holds and is confirmed:

- `sitemapExclude` did drive `noindex,nofollow`, not merely sitemap omission.
- The affected pages were legitimate self-canonical published editorial. The
  7 August commit tested and rejected three justifications with data: pairwise
  6-gram Jaccard across all 86 gave median 0.002 / max 0.019 (not duplicates);
  median prose 235w excluded vs 229w indexed (not thinner than what stayed
  indexed); `featuredPartner` false on 86 of 86 (not commercial withholding).
- Google processed it progressively on recrawl, which is why indexed counts kept
  rising into mid-May before declining later. The 16 May snapshot shows only 25
  URLs excluded by noindex against ~127 actually emitting it — Google had seen
  roughly a fifth of the damage at that point. The late-May/June/July staircase
  is that backlog landing.

So the hypothesis survives in substance and fails on date. **Anchor the timeline
at 22 April (source) / 29 April (production).**

### 1.3 GSC's 655 submitted URLs is stale, and the current figure is 611

- Repo-root `sitemap.xml`: 408 URLs — a **stale leftover** of the retired
  root-deploy model, not production. It has misled at least one prior count.
- Deployed `gh-pages` at audit time: **610**.
- Current build after this work: **611**.

The 13 August audit's "655" was accurate then; the 16 August plans/events
consolidation (`44a31fa`) reduced it legitimately.

---

## 2. Production was frozen — nothing could reach Google

`Build and Deploy` has failed on **every run since 17 Aug 19:37 UTC** (runs
`32061421402`, `32150413304`). Last successful deploy: `e2c4057` at 17 Aug
14:38. Main was four commits ahead of production, including SEO-relevant work.

Cause, in the Content admission gate: `insider-picks-2026-08-17.md` carried
`heroImage.license: "editorial"`, which is not in the schema enum, so
`validate:content` threw and the gate exited before Build ran. The same file also
pointed `heroImage.src` at a non-existent asset and carried six em-dashes that
would have failed the next gate.

This outranked every SEO defect: while it held, no remediation could reach
Google at all. Fixed in `4a25626`.

---

## 3. What prior work is genuinely complete — verified in the artefact

Measured, not taken on trust. The prior programme delivered more than the brief credits.

| Prior recommendation | Status | Evidence |
|---|---|---|
| Remove bulk `sitemapExclude` | **RECOVERED (production)** | 3 flags remain in content, all deliberate; −114 pages lost noindex on 7 Aug |
| Sitemap contains no noindex URL | **LIVE_VERIFIED** | 0 of 610 |
| Sitemap all self-canonical | **LIVE_VERIFIED** | 0 violations; the three named on 13 Aug are fixed |
| Sitemap contains no redirects | **LIVE_VERIFIED** | 0 |
| No indexable canonical losers | **LIVE_VERIFIED** | 0 |
| No redirect chains / loops / canonical loops | **LIVE_VERIFIED** | 0 of each |
| Repoint internal links off migration losers | **LIVE_VERIFIED (bulk)** | 1,348 → 4; 1,331 → 15; 1,308 → 0; 743 → 12; 672 → 0; 654 → 1; 654 → 0 |
| Cloudflare edge 301s | Documented, unverifiable here | Egress policy blocks the live domain |
| Fix `Astro.redirect` migration stubs | **Was NOT started** — now FIXED | Still in source at audit time; see §4 |

The internal-link remediation in particular is done and holding. **Do not redo it.**

---

## 4. What was genuinely broken today

### P0-1 — Deploy frozen (fixed, `4a25626`)
See §2.

### P0-2 — 24 migration stubs emitting `noindex` + foreign canonical (fixed, `1301050`)
23 `/journal/<plan>/` URLs plus `/journal/mornington-peninsula-winery-tour/`
shipped `noindex` alongside a canonical to their destination. Both came from
`Astro.redirect(..., 301)`, which under static prerendering emits a redirect
*document* carrying noindex rather than an HTTP 301.

This is the precise combination that destroys migration equity: Google treats
noindex+foreign-canonical as contradictory, drops the page and ignores the
canonical. It was verified in production on 8 August for `/places/sorrento/`,
where `googleCanonical` resolved to the page itself.

Flagged P1 on 13 August. Never implemented. Still present in source and
production until this commit. Now uses the repository's existing
`consolidate` pattern. Measured: noindex+foreign-canonical **26 → 2**, the two
remainders being robots-disallowed account hops.

### P0-3 — 1,644 internal links to hard 404s (fixed, `bde2894`) — not previously known
`VenueCard` built `href` as `${hrefPrefix}/${slug}/`. `VenueDetailTemplate`
passes `sectionHref`, which is `"/wine/"` — correct for the breadcrumb and
back-link it also feeds. Every related-venue card on every venue detail page
therefore emitted `/wine//<slug>/`.

**1,644 links across 138 pages, resolving to 40 URLs that do not exist.** The
three worst targets carried 184 inbound links each.

No prior audit caught this, and none could have: it is invisible to source
review because every literal caller passes a clean prefix, and the existing
lint checks declared routes rather than emitted hrefs. Measured: **1,644 → 0**.

### P0-4 — No gate could detect any of this (fixed, `242c057`)
`lint:seo-architecture` checks trailing slashes, route existence and eight
hardcoded loser paths. It passed throughout the 100-day incident. The new gate
reads `next/dist` after pruning — the exact bytes that deploy.

---

## 5. Current corpus against the URL constitution

Deployed artefact, 946 pages / 610 sitemap URLs (rebuilt: 953 / 611).

| Constitution rule | Violations (live) | After fixes |
|---|---:|---:|
| Sitemap URL is noindex | 0 | 0 |
| Sitemap URL not self-canonical | 0 | 0 |
| Sitemap URL is a redirect | 0 | 0 |
| Sitemap URL has no built page | 0 | 0 |
| noindex + foreign canonical | 26 | **2** (documented) |
| Indexable canonical loser | 0 | 0 |
| Redirect chain > 1 hop | 0 | 0 |
| Redirect loop / canonical loop | 0 | 0 |
| Canonical → missing page | 0 | 0 |
| Malformed internal href | 40 targets / 1,644 links | **0** |

The canonical/redirect graph is, with the above fixed, **clean**. This corpus is
in materially better shape than the GSC headline implies — which is consistent
with GSC reporting historical state.

### Remaining, ranked (Impact × Confidence ÷ Effort)

| ID | Defect | Scale | Sev | Conf |
|---|---|---|---|---|
| R-1 | Internal links to canonical losers (tail) | 86 targets / 711 links | P1 | High |
| R-2 | Indexable orphans with no sitemap/exclusion policy | 20 pages | P1 | High |
| R-3 | Utility pages absorbing sitewide link equity (`/me/saved/` 1,799, `/search/` 1,400, `/account/` 1,256) | 4 targets | P2 | Med |
| R-4 | Zero-editorial-inbound indexable pages | 83 of 628 | P2 | High |
| R-5 | `lastmod` defaults to build date, weakening crawl prioritisation | ~151 URLs | P3 | High |

R-1 is now ratcheted in CI: the count may fall, not rise.

---

## 6. Competing explanations, and what would disprove the main one

The programme is required to attempt disproof, not confirmation.

**Primary (high confidence):** the 22 April bulk `sitemapExclude` → 100 days of
`noindex,nofollow` on ~127 published pages is the dominant cause of the
indexation decline, processed progressively by Google on recrawl.

Supporting: exact page counts at both edges of the window; direct mechanism in
one commit; the excluded set demonstrably not thin or duplicated; the observed
lag between the change and GSC's noindex count.

**Competing explanations not yet excluded:**

1. *Migration equity destruction is co-primary, not secondary.* 141 legacy URLs
   used noindex+canonical, the same equity-destroying pattern, and 24 were still
   doing it today. If decline concentrates in migrated route families rather
   than in the 127 hidden pages, this outranks the bulk event.
   **Test:** split the decline by route family — `/journal/` and `/escape/`→
   `/plans/` versus `/eat/`, `/wine/`, `/stay/`.
2. *Crawl-budget starvation.* 83 of 628 indexable pages have zero editorial
   inbound links; utility pages absorb ~5,600 sitewide links. Discovery may have
   been throttled independently of noindex.
   **Test:** the 242 "Discovered, currently not indexed" — if they skew to
   zero-inbound pages, this is doing independent work.
3. *Quality reassessment.* A site-level quality signal would depress even
   well-linked, never-noindexed pages.
   **Test:** Cohort E controls. If they decline in step with Cohorts A–D, the
   cause is not the noindex event.
4. *The 1,644 hard 404s degraded crawl efficiency.* Present since at least the
   deployed artefact; duration unknown.
   **Test:** git-archaeology on `VenueDetailTemplate`'s related-venue block.

**What would disprove the primary hypothesis:** Cohort A pages failing to regain
indexation after Google recrawls them post-7-August, while Cohort E holds steady.
That would mean removing the noindex was not sufficient, and the cause lies
elsewhere.

---

## 7. Blockers requiring James

1. **Search Console access — the critical path.** No Google-side verdict can be
   read. The local OAuth client has failed with `unauthorized_client` since at
   least 13 August. Until it is restored, every conclusion here is production
   state, never Google state, and no issue can legitimately move past
   `LIVE_VERIFIED`. This is the single highest-value unblock.
2. **Live-domain egress is blocked from this environment** (403 on CONNECT to
   `peninsulainsider.com.au`). I measured `gh-pages`, which is what GitHub Pages
   serves, so the artefact conclusions hold — but **Cloudflare edge behaviour,
   real HTTP status codes and redirect headers are unverified**. The 141-URL
   Cloudflare 301 estate is documented but untested here.
3. **Decision — repo-root leftovers.** ~90 stale directories plus a 408-URL
   `sitemap.xml` sit at the repo root from the retired root-deploy model. They
   are not served, but they have already caused at least one wrong measurement.
   Recommend deletion in a standalone commit.

---

## 8. Artefacts

| Path | Contents |
|---|---|
| `ops/scripts/seo/build-url-ledger.mjs` | Ledger builder + `--assert` CI gate |
| `ops/scripts/seo/build-recovery-cohort.mjs` | Fixed cohort selector |
| `ops/reports/seo/ledger/url-ledger.{json,csv}` | Per-URL ledger, all fields |
| `ops/reports/seo/ledger/link-graph.json` | Inbound/outbound graph, click depth |
| `ops/reports/seo/recovery-cohort.json` | 42-URL fixed cohort, baselined |
| `ops/reports/seo/link-loser-baseline.json` | R-1 ratchet baseline |
| `ops/reports/seo/indexation-recovery-tracker.md` | Master tracker |
