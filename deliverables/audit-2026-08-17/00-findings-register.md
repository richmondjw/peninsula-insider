# Peninsula Insider — Technical SEO Audit: Findings Register & Scoring
**Date:** 2026-08-17 (compiled 2026-08-16 evening UTC)
**Scope:** 952 built HTML files, 690 indexable, 600 sitemap URLs. Live site behind
Cloudflare since 2026-08-16 15:05 UTC.

## Scoring method
`Priority = Impact x ConfidenceWeight / Effort`
Confidence weight: Confirmed 1.0 | High 0.8 | Probable 0.6 | Needs-investigation 0.3.
Impact and Effort both 1-5. Every finding below is **Confirmed** — measured directly
against the build or the live edge — unless stated. No estimates are presented as fact.

---

## A. EXECUTIVE DIAGNOSIS

**Technical SEO Health Score: 72/100**

| Dimension | Score | Note |
|---|---|---|
| Crawlability | 82 | robots clean, no crawl traps, no parameter sprawl |
| Indexability | 74 | canonicals correct post-Phase-0; gaps remain |
| Architecture | 80 | 513 of 690 indexable pages within 2 clicks |
| Internal linking | 55 | weakest dimension; demand-weighted allocation is wrong |
| Rendering | 95 | fully prerendered static — a genuine structural strength |
| Performance | 85 | static + CDN; only drag is image weight |
| Structured data | 62 | dense and valid, but no entity identity layer |
| Machine readability | 58 | AI crawlers open, text in HTML, images invisible |

**Is technical SEO materially constraining growth? Yes — but less than it was 10 days ago,
and the binding constraint has moved.**

Until 8 August the constraint was equity destruction: 141 migrated URLs carried
`noindex` + canonical simultaneously, so Google dropped the page AND ignored the
canonical. That is fixed. Until 16 August the constraint was that GitHub Pages cannot
emit a 301, so every consolidation was a hint Google could decline — and demonstrably
did. That is now fixed for 46 URLs via Cloudflare.

The constraint today is **crawl priority on commercially valuable pages**, and behind it
a second, quieter one: **the machine-readable layer disagrees with the human-readable
layer.** The site looks right and describes itself wrongly.

### The five biggest findings
1. Three town pages worth ~93,000 searches/month have **never been crawled**; `/boating/`
   has gone 107 days without a fetch.
2. **436 pages render photography as CSS `background-image`** — 732 of 952 pages contain
   zero `<img>`. The photography is structurally invisible to Google Images and to every
   AI crawler.
3. **1,438 entity declarations carry no `@id`.** Montalto on the Red Hill page and Montalto
   on the wineries listing are, to a machine, unrelated things. There is no entity graph.
4. **19 events with future dates are invisible sitewide** — a one-way archive gate in
   `recompute-occurrence.py:97` that nothing ever reverses.
5. **All 833 `ImageObject` nodes point at one file**, `/images/sourced/home-cover.webp`.

### Most likely root causes
- **A single build-order defect** explains findings 2 and 5: JSON-LD and HTML are written
  at build time; the real photography is hydrated client-side from Supabase afterwards.
  One cause, two of the audit's largest findings.
- **The May Sanity round-trip.** Reverting it left the site on GitHub Pages, which cannot
  serve 301s. Every redirect workaround since traces to that decision.
- **Absence of an identity layer**, never designed in rather than broken.

### Biggest opportunity
The incumbent, visitmorningtonpeninsula.org, has **zero structured data** and an
undeclared sitemap. PI already emits 1,618 valid JSON-LD blocks. Adding `@id` identity
and fixing the image layer would give PI a machine-readable entity graph for the
Mornington Peninsula that no competitor currently has any foundation for.

---

## B. CURRENT-STATE FUNNEL

| Stage | Count | Attrition |
|---|---|---|
| Built URLs (known) | 952 | — |
| Crawlable (200, not robots-blocked) | 952 | 0 |
| Indexable (self-canonical, no noindex, not a stub) | 690 | −262 (deliberate: 225 stubs, 62 noindex) |
| Submitted (sitemap) | 600 | **−90 indexable pages absent** |
| Indexed | not measurable | see note |
| Ranking | 17 keywords at organic 11–20; 0 in top 10 | — |
| Traffic | 5 clicks total since 5 Aug; 61.4 impressions/day | — |

**Note on "indexed": I cannot report it and neither can anyone else via API.** The GSC
Sitemaps API `indexed` field is deprecated and returns 0 unconditionally. I previously
quoted "0 indexed" as if it were a measurement. It is not. Treat that row as unknown
pending manual Coverage-report reading in the GSC UI.

**Abnormal attrition is at one stage only: indexable → submitted.** 90 pages, of which
72 are `/whats-on/` and 12 `/events/`.

---

## C. FINDINGS REGISTER (ranked by priority score)

| ID | Finding | Sev | Conf | I | E | **Priority** |
|---|---|---|---|---|---|---|
| F4 | 19 future-dated events invisible — one-way archive gate, `recompute-occurrence.py:97` | High | Confirmed | 3 | 1 | **3.00** |
| F1 | 3 towns (93k/mo) never crawled; `/boating/` 107 days stale | Critical | Confirmed | 5 | 2 | **2.50** |
| F7 | Breadcrumb schema absent on 161 of 183 `/eat/` + `/stay/` pages (UI renders it) | Medium | Confirmed | 2 | 1 | **2.00** |
| F10 | 148 of 600 sitemap URLs carry no `<lastmod>` | Low | Confirmed | 2 | 1 | **2.00** |
| F17 | GA4 dead, no PageSpeed API key — measurement blindness | Medium | Confirmed | 2 | 1 | **2.00** |
| F5 | All 833 `ImageObject` nodes point at `home-cover.webp` | Medium | Confirmed | 3 | 2 | **1.50** |
| F6 | 46 duplicate slug basenames (`events/` vs `events/archive/`) colliding at build | High | Confirmed | 3 | 2 | **1.50** |
| F8 | 90 indexable pages absent from sitemap (72 whats-on, 12 events) | Medium | Confirmed | 3 | 2 | **1.50** |
| F15 | 46 reconciled redirects ready to import, not yet live | Medium | Confirmed | 3 | 2 | **1.50** |
| F2 | 436 pages render photography as CSS background; 732/952 have zero `<img>` | High | Confirmed | 4 | 3 | **1.33** |
| F3 | 1,438 entity nodes carry no `@id` — no entity graph | High | Confirmed | 4 | 3 | **1.33** |
| F9 | 57 indexable pages with zero editorial inbound; 59 unreachable from homepage | High | Confirmed | 4 | 4 | **1.00** |
| F11 | 72 expired event pages indexable, orphaned, unsubmitted | Medium | Confirmed | 2 | 2 | **1.00** |
| F13 | 35 `<img>` missing alt (fishing + boating templates) | Low | Confirmed | 1 | 1 | **1.00** |
| F14 | 11 pages emit no canonical (`/access/`, `/preview/*`, 5 seasonal `/guides/*`) | Low | Confirmed | 1 | 1 | **1.00** |
| F12 | No build-time image optimisation; 1.17 MB heroes; 17/1471 with width+height | Medium | Confirmed | 2 | 3 | **0.67** |
| F16 | `/plans/` vs `/explore/plans/` canonical direction split | Medium | Confirmed | 2 | 3 | **0.67** |

---

## D. EXPLICIT CLEAN PASSES

Stated plainly rather than padded into findings:

- **Rendering (§7): PASS.** `output: 'static'`, everything prerendered. Title, meta,
  canonical, H1, body, links, schema and nav are all in raw HTML. No JS dependency,
  no hydration risk, no crawler exposure. This is a real architectural strength.
- **Taxonomies and pagination (§17): PASS by absence.** Zero tag, category, author or
  date-archive routes. Zero pagination anywhere. Nothing to consolidate or noindex.
- **JSON-LD syntax (§14): PASS.** All 1,618 blocks parse. Zero syntax failures.
- **Publisher identity (§14): PASS.** `Organization` / `NewsMediaOrganization` are
  correctly unconflicted. I suspected a conflict; there isn't one.
- **AI crawler access (§19): PASS as of 16 Aug 16:22 UTC.** OAI-SearchBot, GPTBot,
  ClaudeBot, PerplexityBot, CCBot all 200. Googlebot and bingbot unaffected throughout.
- **Mobile (§18): PASS.** Viewport, tap targets, nav parity, no interstitials.
- **Performance (§12): PASS, lab-only.** Static origin behind a CDN. Not the bottleneck.
- **Crawl traps (§3): PASS.** No infinite spaces, no faceted nav, no parameter sprawl,
  no session URLs, no calendars.
- **FAQPage (§14): NOT A FINDING.** 77 template blocks with non-visible Q&A are
  technically a mismatch, but Google restricted FAQ rich results to government and
  health sites in 2023. Commercially moot. Recorded, not prioritised.

---

## E. TOP 10 FIXES

1. **F4** — un-archive gate fix. One script, one condition. Recovers 19 live events
   including one four days out. Cheapest high-value item in the audit.
2. **F1** — manual index requests on the 10 highest-volume `/places/` stubs so Google
   fetches them and sees today's 301s.
3. **F15** — import the 46 reconciled redirects (NOT the 2 stale rows; NOT CSV row 14).
4. **F2** — convert CSS `background-image` heroes to real `<img>`/`<picture>`.
   Prerequisite for all image SEO.
5. **F3** — add `@id` to every entity node. Turns 1,438 isolated declarations into a graph.
6. **F5** — resolve Supabase image overrides at build time so `ImageObject` is truthful.
   Same root cause as F2.
7. **F6** — collapse the duplicate `events/` + `events/archive/` sources of truth.
8. **F8** — decide the expired-event architecture, then make the sitemap match it.
9. **F9** — demand-weighted editorial linking (this is Phase 2, already scoped).
10. **F7 + F10 + F13 + F14** — the cheap correctness batch. All four are ≤1 effort.

---

## F. 30-DAY REMEDIATION PLAN

**Week 1 — crawl and indexation defects**
F4 un-archive gate · F1 index requests · F15 redirect import · F14 canonicals ·
F10 lastmod completion.

**Week 2 — architecture and internal linking**
F9 editorial linking pass · F8 sitemap/events reconciliation · F6 duplicate slugs ·
F16 decide the `/plans/` direction.

**Week 3 — rendering, images, structured data**
F2 markup conversion · F5 build-order fix · F3 `@id` identity layer · F7 breadcrumbs ·
F13 alt text · F12 `astro:assets` adoption.

**Week 4 — validation and monitoring**
Re-crawl, re-measure the funnel, confirm F1 fetches landed, stand up the monitoring
framework, restore GA4 and a PageSpeed key (F17).

---

## G. METHOD AND LIMITATIONS

Measured against the local build at `next/dist` (952 files) and the live edge via
`curl` with an explicit UA (Cloudflare blocks default python UAs). Five parallel
workstream reports informed this register and are filed alongside it; **every
load-bearing claim was independently re-verified before entering this document.**

Three subagent claims were corrected during verification:
- WS1 claimed the sitemap has **no** `<lastmod>`. False — 452 of 600 have it.
- WS1 claimed competitors "completely block" AI crawlers. Overstated — Tripadvisor
  allows OAI-SearchBot and PerplexityBot; Broadsheet doesn't name OAI-SearchBot.
- WS2's breadcrumb-gap count (135) differed from mine (161) on indexable scope. Mine used.

One error of my own was corrected: I reported 725 of 1,471 images missing alt text.
The true figure is 35 of 809. My parser counted an HTML comment as markup.

**Unavailable:** CrUX field data (no PageSpeed API key), GA4 behaviour data (credential
gone), and GSC indexed counts (API field deprecated, returns 0 unconditionally).
