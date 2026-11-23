# Peninsula Insider — ranking collapse: the password gate

Date: 23 November 2026
Scope: Why almost every content page sits at position 60–90, and what would show whether it is
recovering.
Method: Git history of `next/src/layouts/BaseLayout.astro` and `next/src/pages/access/`; the deployed
artefact on `gh-pages` at `f4d9907` (source `6b12a27`), audited directly; Search Console Search
Analytics for 9–21 November (via Supermetrics, which only returns data from 9 November on this
account); the DataForSEO snapshots in `seo/snapshots/`; the earlier forensics in this directory.
Not available: URL Inspection, the daily Search Analytics series for May–August, and the live
domain itself (egress policy, B-2). Statements that depend on those are marked.

---

## 1. Finding: for about 58 days, every page redirected Google to a noindex "Coming Soon" page

`BaseLayout.astro` carried this inline script on every page:

```js
var KEY = 'pi-access-v1';
if (localStorage.getItem(KEY) === '1') return;
var path = window.location.pathname;
if (path === '/access/' || path === '/access') return;
window.location.replace('/access/?r=' + encodeURIComponent(window.location.href));
```

`/access/` was titled "Peninsula Insider — Coming Soon" and carried
`<meta name="robots" content="noindex, nofollow">`.

A first-time visitor has no `pi-access-v1` key. Neither does Google's renderer. So for anything
that executes JavaScript, every URL on the site was a redirect to a page that says not to index it
and not to follow its links. Google treats a JavaScript `location.replace` as a redirect.

Deployed windows, UTC, from the commits that added and removed it:

| Window | From | To | Days |
|---|---|---|---:|
| On and off four times | 19 May 05:03 | 23 May 19:12 | (hours at a time) |
| Gate 1 | 24 May 00:47 (`53851ba`) | 11 Jun 11:12 (`5e05b82`, #249) | 18 |
| Gate 2 | 24 Jun 15:43 (`fd1d5ed`) | 3 Aug 01:22 (`932001b`) | 40 |

The gate is gone from the deployed artefact today: 0 of 1,165 HTML files contain `pi-access-v1`,
and `/access/` does not exist. The source was deleted in `b497afd` (20 September).

**None of the earlier forensics mention it.** The 19 September report attributes the 13 June
position cliff to a possible Core Web Vitals regression from the 10–11 June homepage redesign,
marked unconfirmed. The gate is a more direct explanation and was removed in the same two days.

## 2. Why this is the likely cause, and what is not proven

Evidence for:

1. **Timing of growth and collapse.** Weekly impressions were rising fast before the gate: 1,009
   (week to 1 May), 1,675 (4 May), 8,862 (16 May) per `daily-log.md`. The gate first went up on
   19 May. The 19 September report dates the average-position fall from about 20 to about 70 to
   12–13 June, after 18 days of gate 1.
2. **Continued decay after the "fix".** The DataForSEO footprint kept shrinking after the gate came
   down on 3 August: 510 ranked keywords on 8 August, 252 on 23 September; keywords in positions
   21–50 went from 179 to 4. That is what a slow reprocessing of 40 days of gate-2 fetches would
   look like. It is not what a one-off technical fix followed by recovery looks like.
3. **The unexplained canonicals (R-8) fit exactly.** `/explore/bushrangers-bay/` and
   `/explore/plans/the-producer-trail/` both resolved to the unrelated `/explore/places/rosebud/`,
   with an identical `lastCrawlTime` of 28 June 05:03:01. That is four days into gate 2. Pages that
   all render as the same redirect to the same Coming Soon page are duplicates of each other, and
   Google picks one canonical for a duplicate cluster. This was logged as "mechanism unknown".
4. **Uniformity.** A sitewide shift to position 60–90 across unrelated sections and queries, with
   the home page still ranking for the brand, points at a site-level signal, not page-level
   quality.

Not proven:

- The daily Search Analytics series around 19 May–13 June and 24 June–3 August has not been
  re-read against these dates. That is the direct test and needs the gateway's Search Console
  access.
- The April bulk `noindex` (22–29 April to 7 August, 114 pages) overlaps and contributes. The two
  cannot be separated from here.
- A Search Console manual action has not been ruled out. It can only be checked in the Search
  Console UI under Security & Manual Actions. **Check this first; it takes a minute.**
- Whether Google rendered and honoured the redirect on every URL is inferred from the mechanism
  and from R-8, not observed per URL.
- The windows are commit times. That each commit deployed promptly is assumed from the adjacent
  "trigger Vercel deploy" commits, not checked against deployment logs.

## 3. Current state

Search Console from 9 November: the property totals 566 impressions and 8 clicks across ISO weeks
46 and 47 (finalised data to 19 November, so the second week is partial). By page, 9–21 November:

| Page | Impressions | Clicks | Avg position |
|---|---:|---:|---:|
| `/eat/` | 196 | 0 | 68 |
| `/journal/mornington-peninsula-wedding-venues/` | 65 | 0 | 84 |
| `/stay/` | 50 | 0 | 77 |
| `/wine/` | 49 | 0 | 75 |
| `/` | 34 | 11 | 12 |
| `/explore/spas-and-wellness/` | 30 | 0 | 77 |

Compare 14,745 impressions and 153 clicks for 15 April–15 May, and 1,764 and 11 for 21 August–
18 September. Visibility has not recovered in the 16 weeks since the gate came down; if anything it
is lower.

The deployed artefact is technically clean, so there is no remaining on-site indexability defect
to blame:

| Check | Result |
|---|---|
| Indexable content pages | 693, of which 675 are in the sitemap |
| `noindex` URLs in the sitemap | 0 |
| Indexable pages with a non-self canonical | 0 |
| Sitemap duplicates | 0 |
| Broken internal links | 0 |
| Redirect stubs | 252 (JavaScript + meta refresh + canonical; 7 also `noindex`) |
| Median words, by section | journal 1,264; explore 1,177; wine 972; eat 796 |

## 4. Why it has probably not recovered

A page Google fetched during a gate window was recorded as a redirect to a `noindex` page. That
record only changes when Google fetches the page again, and Google revisits URLs it has filed as
redirected or excluded far less often. On 19 September, 8 of the 10 Group A cohort URLs were still
on May or June crawl timestamps, seven weeks after the gate came down.

Two things on the site give Google little reason to come back:

- **Sitemap `lastmod` says most pages have not changed since April.** In the deployed sitemap, 122
  URLs carry `2026-04-09`, 46 carry `2026-04-30` and 35 carry `2026-04-29`. Those dates are honest
  for the copy. They also predate the gate, so the sitemap tells Google nothing has happened since
  it last looked.
- **The 252 old URLs redirect by script, not by HTTP 301.** GitHub Pages cannot issue a 301.
  `ops/cloudflare-redirects.csv` exists for a Cloudflare cutover that has not happened.

## 5. The measurement that would settle it

`ops/scripts/seo/crawl-age-census.mjs` (new) URL-inspects every sitemap URL and reports the share
Google has re-fetched since 3 August, the share still on a gate-era fetch, the indexed share, and
every canonical Google has chosen that differs from the declared one. It needs the Search Console
token on the gateway and about 700 of the 2,000 daily inspections.

```sh
cd ops/scripts/seo && npm run crawl-age
```

Reading the result:

- **Most URLs last crawled before 3 August:** the gate is still the operative cause and the remedy
  is getting Google to re-fetch (section 6).
- **Most URLs re-crawled since, and indexed, but still at position 60–90:** the gate is no longer
  the constraint. The remaining explanations are authority and site-level quality assessment, and
  the work moves to links and content, not crawling.

Until this runs, the second case cannot be excluded.

## 6. Recommended actions, in order

1. **Check Search Console for a manual action.** One minute, and it changes everything else.
2. **Run the crawl-age census** and record the result in the tracker (R-11).
3. **Request indexing by hand for the 20–30 pages that matter most** (URL Inspection → Request
   indexing; roughly ten a day). Start with `/`, `/eat/`, `/wine/`, `/stay/`, `/explore/`,
   `/whats-on/`, the four "best of" pages and the town pages. This is the only direct way to make
   Google re-fetch a specific URL.
4. **Resubmit the sitemap** in Search Console after step 3.
5. **Decide the Cloudflare cutover** so the 252 old URLs return real 301s (B-2 and
   `ops/cloudflare-redirects.csv`). This also resolves the TLS 1.0/1.1 finding (R-10).
6. **Do not edit `lastmod` to dates that are not true** to attract a crawl. Where a page's content
   has genuinely changed since April, its `lastmod` should already say so; verify the generator
   picks those up (R-5).
7. **Never gate the site with a client-side redirect again.** A pre-launch or maintenance gate must
   be an HTTP 401/503 at the edge, or a staging hostname, never a script on the public pages. See
   the guard in section 7.

Title and meta-description rewriting is not on this list. At position 60–90 presentation is not
the constraint.

## 7. Guard

The gate survived twice because nothing checked for it. `assert:no-hidden-pages` and
`lint:seo-architecture` judge declared indexability; neither would notice a script that sends
every visitor elsewhere. A build assertion that fails when a layout emits an unconditional
`location.replace`/`location.href` away from the requested page (outside the declared redirect
stubs) would have caught both. This is proposed, not built here: it belongs in `next/scripts`
beside the existing architecture lints and needs the redirect-stub allowlist to be exact.
