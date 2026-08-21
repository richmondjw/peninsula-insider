# Workstream 1 — Competitor Technical Benchmark

**Audit:** Peninsula Insider (peninsulainsider.com.au) forensic technical SEO audit
**Section:** §23 — Competitor technical benchmark
**Date measured:** 2026-08-16 (UTC)
**Method:** Live `curl` requests only (UA `curl/8.5.0`), public sources. No paid SEO APIs, no rendering engine, no `site:` operator counts used as evidence.

---

## Scope and selection

Candidates named in the brief were tested for actual competitive relevance before being included in the benchmark, not assumed. Two were **dropped from the core set with evidence**:

- **mornington-peninsula.com.au** — does not resolve (`curl: (6) Could not resolve host`). Not a live site. Excluded.
- **winetourismaustralia.com(.au)** — resolves and has a working sitemap, but its own sitemap (14 pages + 14 posts) is entirely B2B trade content: winery *operator* training, direct-to-consumer sales consulting, "mystery shopping" services. Zero URLs reference Mornington Peninsula, Victoria, or any consumer destination. It is a wine-industry consultancy, not a wine-tourism discovery site, and does not compete for any of the target queries. Excluded as a **false-positive competitor**, kept here as a documented finding.

**visitvictoria.com** was attempted but is fully blocked at the edge (Cloudflare "Just a moment…" JS challenge, HTTP 403 on `robots.txt` itself) — no data could be measured. Retained in the table as "attempted, blocked" rather than silently dropped.

**tripadvisor.com.au** content pages are blocked by DataDome bot protection (HTTP 403 on direct page fetch); `robots.txt` itself was reachable and is the primary evidence source for this competitor.

Final benchmark set (6 measured + 1 blocked, reported honestly):

1. **visitmorningtonpeninsula.org** — primary editorial/DMO competitor
2. **broadsheet.com.au** — Melbourne-based editorial/hospitality publisher
3. **theurbanlist.com** — Melbourne-based listicle/guide publisher
4. **timeout.com** (Melbourne edition) — global city-guide publisher
5. **tripadvisor.com.au** — global UGC reviews/listings (robots.txt only; content blocked)
6. **visitvictoria.com** — state tourism body (blocked entirely, no data)

A baseline pull of **Peninsula Insider's own** `robots.txt`, `sitemap.xml`, and one representative page was taken for direct comparison — not as a self-audit (that's covered elsewhere in this audit), only to anchor the numbers below.

---

## Comparison table

| Site | Sitemap architecture | URLs measured (evidenced) | Town/place pages found | Click depth to town page | JSON-LD on sampled page | Rendering | Page weight (sampled page) | Blocks AI crawlers in robots.txt |
|---|---|---|---|---|---|---|---|---|
| **visitmorningtonpeninsula.org** | Single flat `urlset`, non-standard path (`/sitemap.aspx`, not `/sitemap.xml`) | 212 URLs total, all with `<lastmod>` | 18 (`Places-To-See/Towns-Villages/*`) | 3 clicks (Home → Places-To-See → Towns-Villages → Town) | **None found** (0 `@type` occurrences) | Server-rendered HTML (ASP.NET/DNN), content present in raw source | 192 KB (Sorrento) | No (no AI-bot rules at all; default open) |
| **broadsheet.com.au** | Sitemap index → per-city index → **6 content-type sub-sitemaps** (articles/guides/venue-profiles/events/suburb-guides/regional-guides) | Melbourne only: 125 suburb-guides + 42 guides + 5 events + 1,382 venue-profiles + 419 articles = **1,973 URLs** (other cities not sampled) | **0** genuine Mornington Peninsula town pages (0/125 suburb-guides; the 1 keyword hit was "Flinders **Lane**", a CBD street, not the town) | N/A — no MP coverage exists to measure depth | `BreadcrumbList`, `ListItem`, `Thing` only (suburb page) — no `LocalBusiness`/`Place` | Next.js (React Server Components streaming) | 259 KB (Northcote suburb page) | **Yes** — explicit block list: GPTBot, ChatGPT-User, Google-Extended, Claude-Web, Claudebot, anthropic-ai, cohere-ai, PerplexityBot, perplexity-ai, Meltwater, Seekr |
| **theurbanlist.com** | Sitemap index per city → category-sitemap + best-of-sitemap + 23 paginated listing sub-sitemaps | Melbourne: 22×100 + 76 = **~2,276** "A-List" guide/listicle URLs (verified P0=100, P2200=76; category-sitemap sampled, 0 MP hits) | **0** — no Mornington Peninsula category or listicle found | N/A | `WebSite` only — no `ItemList`/`Article` even on a ranked "best restaurants" page | Server-rendered, large text payload (31K chars stripped) | 109 KB ("Best Restaurants Melbourne") | No (general `Disallow: /system/*` only; no named AI bots) |
| **timeout.com** (Melbourne) | No working per-city HTML sitemap — `/melbourne/sitemap.xml` **301-redirects to the homepage**; global index is a single gzip file (`sitemap.xml.gz`); city "news sitemaps" exist but Melbourne's is **empty** (0 URLs) | Not countable within polite request budget; Melbourne news_sitemap confirmed 0 URLs | Not found (no Mornington Peninsula section identified) | N/A | `AdministrativeArea`, `ImageObject`, `Organization`, `Person`, `WebPage` — no `Place`/`LocalBusiness` | Server-rendered, readable text in raw HTML (~19.7K chars) | 251 KB (homepage) | No (bot blocklist is legacy: 80bot, MJ12bot, Nutch, etc. — zero modern AI-crawler entries) |
| **tripadvisor.com.au** | Multiple region-agnostic global sitemap indexes by content type (locations, photos, reviews, attractions, attraction reviews, business) + separate business sitemap | Not measurable — global scale, out of polite-request budget; robots.txt itself confirms the index structure | Confirmed to exist via search (e.g. Sorrento attractions page, 9,533 reviews) but **inaccessible to direct fetch** | Unmeasured (blocked) | Unmeasured (blocked) | Unmeasured (blocked — DataDome JS challenge, HTTP 403) | Unmeasured (blocked) | **Yes — total block**: `Disallow: /` for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Cohere-ai, GPTBot, Google-CloudVertexBot, Google-Extended, Img2dataset, PanguBot, PetalBot, SentiBot, YouBot, magpie-crawler, meta-externalagent, plus narrower rules for OAI-SearchBot/PerplexityBot |
| **visitvictoria.com** | **Unmeasured** — Cloudflare JS challenge blocks even `robots.txt` (HTTP 403, "Just a moment…" page) | Unmeasured | Unmeasured | Unmeasured | Unmeasured | Unmeasured | Unmeasured | Unmeasured — inferred likely, cannot confirm |
| **Peninsula Insider** *(baseline, not a competitor row)* | Single flat `sitemap.xml`, standard path, `changefreq`+`priority` but **no `<lastmod>`** | 600 URLs (matches known figure) | Dual taxonomy: 5 region hubs (`/explore/regions/*`) **and** individual town guides (`/journal/area-guide-*`) | 2 clicks to region/town hub from homepage nav | `Article`, `FAQPage`, `Place`, `Organization`, `NewsMediaOrganization`, `ImageObject`, `ContactPoint`, `Question`, `Answer` (9 types, area-guide page) | Astro static HTML | 146 KB (area-guide-portsea) | **No — explicitly open**, and references `llms.txt`/`llms-full.txt` in robots.txt |

---

## Per-competitor notes

### visitmorningtonpeninsula.org (primary DMO competitor)
- Legacy **DotNetNuke/ASP.NET** platform on IIS (confirmed via `App_Browsers`, `App_Code`, `App_GlobalResources` disallow paths in `robots.txt`, and IIS-style custom 404 page).
- Real XML sitemap exists but sits at the **non-standard path `/sitemap.aspx`**, not the canonical `/sitemap.xml` (that path 404s). Search engines that don't read it from `robots.txt` (it isn't declared there either — the `Sitemap:` directive is commented out in a template comment) would need to discover it by other means. This is a genuine discoverability weakness for a DMO site of this size.
- 212 total indexed URLs, every one carrying a `<lastmod>` date — reasonably disciplined for a flat sitemap, though `changefreq: daily` is applied uniformly regardless of actual update cadence (unverifiable claim, likely a CMS default rather than a real signal).
- 18 dedicated town/village pages exist, 3 clicks deep from the homepage, single taxonomy axis only (no cross-cut by activity type, e.g. no "wineries" or "beaches" filtered view that also surfaces per-town).
- **Zero structured data** of any kind was found on the sampled town page (Sorrento) — no `Place`, `LocalBusiness`, `BreadcrumbList`, nothing. For a government/RTO-funded destination site this is a significant, easily-exploitable gap.
- Content is genuinely server-rendered — the full body text is present in the raw `curl` response, so this is not a JS-rendering risk for crawlers, just a metadata gap.

### broadsheet.com.au
- The most **architecturally sophisticated** taxonomy of any site measured: a real sitemap index → per-city index → six content-type sitemaps (articles, guides, venue-profiles, events, suburb-guides, regional-guides). This is the shape a mature editorial+directory hybrid should have.
- Despite that sophistication, Broadsheet has **built no Mornington Peninsula presence whatsoever** — 0 of 125 Melbourne suburb-guides, 0 verified venue-profiles. It is not currently a real competitor for MP queries; it *could* become one only by adding an entirely new geographic branch to its CMS taxonomy, which is a multi-quarter content-ops decision for them, not a quick response.
- **Sitemap hygiene finding:** 3 of 3 venue-profile URLs sampled directly from Broadsheet's own live `venue-profiles` sitemap returned **HTTP 404** (`super-taco`, `el-columpio-st-kilda`, `frankies-tortas-and-tacos-fitzroy` — all confirmed dead via header check, not a transient error). If this rate holds across the full 1,382-URL venue-profiles sitemap, a meaningful share of it is stale.
- Explicitly blocks the full modern AI-crawler roster in `robots.txt` (GPTBot, Claude-Web/Claudebot, Google-Extended, PerplexityBot, anthropic-ai, cohere-ai, plus Meltwater/Seekr media-monitoring bots). This is a deliberate content-protection stance they are unlikely to reverse.
- Rendering is Next.js with RSC streaming (`self.__next_f.push` payloads present) — content is still present in raw HTML, not purely client-hydrated, but page weight is heavier than a static build (259 KB for a suburb page vs 146 KB for PI's comparable area-guide).

### theurbanlist.com
- Sitemap index is per-city, segmented into "best-of," "category," and 23 paginated listing sub-sitemaps for Melbourne alone (~2,276 A-List guide URLs, verified at both ends of the pagination range).
- Content model is **guides/listicles only** ("Best Restaurants Melbourne," "Best Things to Do Melbourne") — no evidence of individual venue detail pages in the sitemap structure sampled.
- No Mornington Peninsula category exists in Melbourne's category-sitemap.
- Structured data is minimal: only sitewide `WebSite` schema was found, even on a page that is *literally* a ranked list ("THE 15 BEST...") — no `ItemList`, no `Article`. This is a missed-schema opportunity a competitor would need to fix regardless of geography.
- No AI-crawler-specific rules in `robots.txt` — default open.

### timeout.com (Melbourne edition)
- The per-city HTML sitemap path (`/melbourne/sitemap.xml`) is **broken** — it 301-redirects straight to the Melbourne homepage rather than serving a sitemap. The only real sitemap surface declared in `robots.txt` is a single global gzip index plus per-city **Google News** sitemaps, and Melbourne's news sitemap is confirmed empty (0 URLs).
- This means Time Out's actual page inventory for Melbourne cannot be measured through any publicly declared sitemap mechanism — a real technical gap for a site of this scale and authority.
- No Mornington Peninsula section was found in navigation or JSON-LD sampled.
- Structured data on the homepage covers `Organization`/`WebPage`/`Person`/`ImageObject`/`AdministrativeArea` but no local-business or place-level schema.
- Legacy bot blocklist (80bot, MJ12bot, Nutch, OmniExplorer_Bot, etc.) with **no modern AI-crawler entries** — default open to GPTBot/ClaudeBot/PerplexityBot etc.

### tripadvisor.com.au
- Cannot be benchmarked on architecture beyond `robots.txt`, because content pages return HTTP 403 with a DataDome JS challenge to a plain `curl` request. This is itself a data point: Tripadvisor is hardened against exactly the kind of lightweight fetch that AI answer engines and simple scrapers use.
- `robots.txt` confirms Tripadvisor **completely blocks** essentially every named AI crawler (`Disallow: /` for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Cohere-ai, GPTBot, Google-CloudVertexBot, Google-Extended, Img2dataset, PanguBot, PetalBot, SentiBot, YouBot, magpie-crawler, meta-externalagent), with additional narrower disallow rules for OAI-SearchBot, PerplexityBot, and applebot on specific paths.
- A web search confirms individual Mornington Peninsula pages exist and rank well in traditional search (e.g. a Sorrento "Things to Do" page with 9,533 reviews) — Tripadvisor's authority here is real, but it is **structurally excluded from AI-answer-engine citation** by its own robots.txt. That is a durable, self-inflicted gap.

### visitvictoria.com
- Fully inaccessible to this audit: even `robots.txt` returns a Cloudflare "Just a moment…" interstitial (HTTP 403, `noindex,nofollow` on the challenge page itself). No sitemap, taxonomy, structured data, rendering model, or page weight could be measured.
- Reported here as **attempted and blocked**, not silently omitted. Any claim about this site's architecture would be pure inference and is deliberately not made.

---

## Where Peninsula Insider can build a technically superior architecture

These are structural opportunities evidenced by what was and wasn't found above — not imitation of any single competitor, and not things any of them can match without a multi-quarter platform or content-ops decision on their side.

**1. Systematic, multi-type structured data as the default, not the exception.**
PI's sampled area-guide page already carries 9 distinct JSON-LD `@type`s (`Article`, `FAQPage`, `Place`, `Organization`, `NewsMediaOrganization`, `ImageObject`, `ContactPoint`, `Question`, `Answer`). Every competitor measured has less — VMP has *zero*, theurbanlist has only sitewide `WebSite`, Broadsheet has only breadcrumb-level schema even on a dedicated suburb page. The opportunity is to make this depth **universal and consistent** across every venue, town, and region page (not just a flagship one) — `LocalBusiness`/`Restaurant`/`TouristAttraction` on every venue, `Place` + `FAQPage` on every town and region hub. None of the DMO or listicle competitors are positioned to do this cheaply: VMP's platform (DNN/ASP.NET) has no schema at all to build from, and Broadsheet/theurbanlist would need to add place-level schema to content types (venue-profiles, category pages) that currently ship without it.

**2. A taxonomy no competitor combines: geographic region + town + activity vertical, cross-linked.**
PI already runs a genuinely dual-axis structure — 5 geographic region hubs (`/explore/regions/*`) *and* individual town guides (`/journal/area-guide-*`) *and* activity verticals (`/eat/`, `/stay/`, `/wine/`, `/boating/`, `/fishing/`, `/dog-friendly/`). VMP has only the town axis (single dimension, 3 clicks deep, no vertical cross-cut). Broadsheet has the content-type axis but zero geographic presence here. Nobody in this set combines all three. The technical opportunity is to make this the site's internal-linking backbone — every venue page linking up to its town guide, its region hub, and its vertical index — which compounds crawl depth and topical authority in a way a single-axis competitor structurally cannot replicate without rebuilding its information architecture from scratch.

**3. Sitemap hygiene and standard-path discoverability as a differentiator.**
Two real defects were found in competitor sitemaps: VMP's sitemap lives at a non-standard, undeclared path (`/sitemap.aspx`, not linked from `robots.txt`), and Broadsheet's venue-profiles sitemap contains dead URLs (100% 404 in a 3-URL sample). PI's own sitemap is already at the standard path and URL count matches the known figure, but is missing `<lastmod>` on every entry — a fast, low-risk fix that would put PI ahead of every measured competitor on sitemap discipline simultaneously (standard path + accurate URL count + lastmod discipline + zero dead links, verified by crawl).

**4. First-mover position on AI-answer-engine citability.**
This is the sharpest, most durable gap. Broadsheet and Tripadvisor — the two most content-rich, highest-authority sites in this set — have **deliberately blocked** GPTBot, ClaudeBot, PerplexityBot, and Google-Extended in `robots.txt`. That is a considered brand/content-protection decision, not an oversight, and is unlikely to reverse. VMP, timeout.com, and theurbanlist are default-open but passive: no AI-specific signalling, no `llms.txt`. PI is already both open (no AI-bot blocks) **and** proactively signalling via `llms.txt`/`llms-full.txt` referenced directly in `robots.txt`. No competitor measured does this. For "things to do / where to eat / where to stay Mornington Peninsula" queries answered by AI Overviews, ChatGPT, Perplexity, or Copilot, PI is currently the only structurally-positioned source with both authority-adjacent content *and* an open, signposted door for those crawlers — a gap the two most likely long-term threats (Broadsheet, Tripadvisor) have closed on themselves.

**5. Static-render speed advantage, if kept disciplined.**
Every competitor page sampled server-renders via a heavier stack than PI's — VMP is legacy ASP.NET/DNN (192 KB, markup-heavy), Broadsheet is Next.js with RSC streaming (259 KB), theurbanlist and timeout.com both exceed 100–250 KB per page. PI's Astro static output sampled at 146 KB for a content-dense area-guide page, already competitive without any specific optimization pass. This should be verified quantitatively against Core Web Vitals field data in the relevant performance workstream, but the architectural starting point — static HTML generation vs. competitors' dynamic SSR/RSC stacks — is a structural advantage PI holds by default and should not give away as page complexity grows.

---

## Method and limitations

**What was fetched (all via `curl -sS -A "curl/8.5.0"`, UTC timestamps 2026-08-16 ~16:20–16:32):**
- `robots.txt` for: visitmorningtonpeninsula.org, mornington-peninsula.com.au (failed to resolve), visitvictoria.com, www.visitvictoria.com, broadsheet.com.au → www.broadsheet.com.au, timeout.com → www.timeout.com, theurbanlist.com → www.theurbanlist.com, winetourismaustralia.com.au → winetourismaustralia.com, tripadvisor.com.au → www.tripadvisor.com.au, peninsulainsider.com.au
- Sitemap index and sub-sitemap files for: visitmorningtonpeninsula.org (`/sitemap.aspx`, 212 URLs), broadsheet.com.au (city index + Melbourne 6 sub-sitemaps: articles, guides, venue-profiles, events, suburb-guides, regional-guides), theurbanlist.com (Melbourne index + category-sitemap + best-of-sitemap + P0 and P2200 pagination endpoints), winetourismaustralia.com (`sitemap_index.xml`, `page-sitemap.xml`, `post-sitemap.xml`), peninsulainsider.com.au (`sitemap.xml`, 600 URLs)
- One representative HTML page per measurable competitor: visitmorningtonpeninsula.org/Places-To-See/Towns-Villages/Sorrento, broadsheet.com.au/melbourne/northcote (town-equivalent) + 3 venue-profile URLs (all 404, headers confirmed via `-D`), theurbanlist.com/melbourne/a-list/best-restaurants-melbourne, timeout.com/melbourne (homepage, since the declared sitemap path redirected there), plus peninsulainsider.com.au/journal/area-guide-portsea/ for baseline
- One Tripadvisor content URL, located via a live web search (not guessed), fetched and confirmed blocked (HTTP 403, DataDome challenge)
- All JSON-LD `@type` values extracted by regex (`"@type"\s*:\s*"[^"]+"`) against raw response bodies; rendering assessed by stripping HTML tags and confirming substantive text volume in the raw `curl` output (no headless browser used, so this cannot distinguish "content present but styled by client-side CSS" from "content present and meant to be read" — it only confirms the text exists in the initial response, which is what matters for non-JS-executing crawlers).

**What could not be measured, and why:**
- **visitvictoria.com** — entirely blocked by a Cloudflare JS challenge at the edge, including `robots.txt`. No architecture data of any kind was obtained; nothing about this site should be assumed from this report.
- **tripadvisor.com.au page content** — blocked by DataDome bot protection (HTTP 403 JS challenge). Only `robots.txt` (which is not behind the same protection) was measured directly; page-level structured data, rendering model, and page weight for Tripadvisor are **unmeasured**, not zero.
- **timeout.com's true Melbourne URL count** — the declared per-city sitemap path is broken (redirects to homepage) and the global sitemap is a multi-gigabyte-scale gzip index covering dozens of cities; fully decompressing and filtering it was out of the polite-request budget set for this audit. The Melbourne news sitemap was checked directly and confirmed empty.
- **Broadsheet and theurbanlist national/full-network URL totals** — only the Melbourne city segment was sampled for each (both have 6–9 additional city segments each) to stay within a "few requests per host" politeness budget; totals above are explicitly scoped to "Melbourne only" and should not be read as site-wide figures.
- **Tripadvisor's actual Mornington Peninsula page count** — the sitemap architecture (multiple content-type indexes, global in scope) was confirmed structurally, but counting MP-specific URLs within it was not attempted; it would require deep pagination through a global-scale index, disproportionate to what one competitor benchmark section justifies.
- **No `site:` operator counts, no third-party SEO tool (Ahrefs/SEMrush/Moz) data, and no paid API calls were used anywhere in this section**, per the brief's constraint. Every count above is either a directly-observed `<loc>`/`<sitemap>` tally from a fetched XML file, or explicitly marked as unmeasured/inferred.
