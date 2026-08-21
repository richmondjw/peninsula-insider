# Peninsula Insider — 90-Day Roadmap, Developer Tickets & Monitoring Framework

Companion to `00-findings-register.md`. That document establishes *what is wrong and how
confident we are*. This one establishes *what gets built, in what order, and how we know
it stayed fixed*.

Written 2026-08-17. Finding IDs (F1–F17) refer to §C of the register.

---

## I. 90-DAY ROADMAP

The 30-day plan in §F of the register is the first third of this. It is repeated here in
compressed form so the shape of the quarter is legible in one place.

### Month 1 — stop the bleeding, fix what is cheap and wrong

Objective: every page that should be indexable is indexable, in the sitemap, and telling
the truth about itself. No new capability. Correctness only.

| Week | Work | Finding | Owner |
|---|---|---|---|
| 1 | Un-archive gate; breadcrumbs; lastmod; preview noindex | F4 F7 F10 | **Done, deployed 17 Aug** |
| 1 | Manual index requests, 10 highest-volume `/places/` stubs | F1 | **James** (GSC UI) |
| 1 | Import the 46 reconciled redirects — *not* the 2 stale rows, *not* CSV row 14 | F15 | **James** (Cloudflare UI) |
| 2 | Collapse the 42 remaining duplicate slug pairs | F6 | Remy |
| 2 | Expired-event architecture + sitemap reconciliation | F8 F11 | Remy |
| 2 | Resolve the `/plans/` vs `/explore/plans/` direction split | F16 | Remy |
| 3 | CSS `background-image` → real `<img>`/`<picture>` | F2 | Remy |
| 3 | Build-time CMS image resolution, truthful `ImageObject` | F5 | Remy |
| 3 | `@id` entity identity layer | F3 | Remy |
| 4 | Re-crawl, re-measure the funnel, confirm F1 fetches landed | — | Remy |
| 4 | Restore GA4; obtain a PageSpeed API key | F17 | **James** |

**Month 1 exit criteria.** Sitemap and indexability agree on 100% of routes. Zero duplicate
slugs. Every `ImageObject` resolves to the image actually on the page. Every named entity
carries a stable `@id`. Measurement restored.

### Month 2 — internal linking and the entity graph

Objective: the site stops being a collection of pages and starts being a structure Google
and AI retrieval systems can traverse.

- **F9 — demand-weighted editorial linking.** 57 indexable pages have zero editorial inbound
  links and 59 are unreachable from the homepage. This is already scoped as Phase 2 of the
  internal-linking plan (`docs/`, committed 8bfb64d). It is the single biggest lever on the
  weakest sub-score (Internal linking, 55/100) and it is editorial work, not engineering.
- **Entity graph completion.** Month 1 adds `@id`. Month 2 adds the *relationships*:
  `containedInPlace` from venue to town, `about`/`mentions` from journal pieces to venues,
  `isPartOf` from detail to hub. An `@id` with no edges is a node in an empty graph.
- **`llms-full.txt` regeneration** against the corrected entity layer, so the AI-retrieval
  signposting reflects real `@id`s rather than the pre-fix state.
- **Image sitemap** — deliberately held until F2 lands. Submitting a manifest of images
  that do not exist as markup is worse than submitting nothing.

**Month 2 exit criteria.** Zero orphan indexable pages. Every venue reachable from its town
page and vice versa. Entity graph traversable end to end for at least the 12 towns and the
138 wineries.

### Month 3 — compounding and defence

Objective: lock the gains in with automation, then spend the remaining effort on the two
things that actually move traffic — content depth and demand capture.

- **Monitoring framework live** (§K below) — every invariant this audit established becomes
  a build-time assertion, so the next regression fails a build instead of being discovered
  by an audit three months later.
- **F12 — `astro:assets` adoption.** 144 source files, 38.3 MB, zero build-time
  optimisation. AVIF/WebP derivatives, `width`/`height` on every tag, content-hashed
  filenames, and a Cloudflare Cache Rule at `max-age=31536000, immutable`. **No vendor
  spend** — Cloudflare Images and Polish are paid and unnecessary for 144 curated files.
- **Second measurement pass.** Re-run the full audit method against the live site and
  compare the funnel to the 17 Aug baseline. This is the only honest way to know whether
  any of the above worked.
- **Content depth on the three 93k/mo towns** — once they are crawlable (F1), the constraint
  moves from technical to editorial, and technical SEO has nothing further to contribute.

**Month 3 exit criteria.** Health score re-measured. Every finding in this register either
closed, explicitly deferred with a reason, or refuted.

### What is deliberately NOT in the 90 days

- **Cloudflare paid tiers.** Not needed. See F12 reasoning.
- **FAQPage remediation.** Google restricted FAQ rich results to government and health sites
  in 2023. 77 template blocks with non-visible Q&A are technically a mismatch and
  commercially moot.
- **A CMS migration.** The May Sanity round-trip is the direct cause of §21's redirect debt.
  The file-based collections work. Do not do that again.
- **Backlink acquisition.** Out of scope for a technical audit and a different discipline.

---

## J. DEVELOPER TICKETS — P0 AND P1

Written to be actionable without re-reading the audit. Each carries the acceptance test
that will be used to verify it, because on this codebase **a fix can be correct, committed,
deployed, and still do nothing** (see register §H, correction 3).

### P0 — blocking, do first

---

**TICKET-01 · F6 · Collapse duplicate event slug sources of truth**
*Priority 2.00 · Severity High · Effort 2*

42 duplicate slug basenames remain across `next/src/content/events/` and
`next/src/content/events/archive/`. Astro's content loader warns `Duplicate id … later
items overwrite earlier ones` and the archived twin wins the route, keeping the live record
out of `loadLiveEvents`, `upcoming.json` and the sitemap.

This is not a filing problem. It is an active suppression mechanism that silently defeats
other fixes — it already ate the F4 restore until four pairs were removed in `bc98b89bd1`.

- **Do:** establish the authoritative copy per collision, delete the shadow, keep the
  deletion in its own revertible commit with every removed path listed in the message.
- **Do not:** guess on ambiguous pairs. Leave them and report.
- **Accept when:** `grep`-level basename collision count across both directories is 0, AND
  a build emits zero `Duplicate id` warnings, AND every previously-shadowed record appears
  in the built sitemap.

---

**TICKET-02 · F8 + F11 · Expired-event architecture**
*Priority 1.50/1.00 · Severity Medium · Effort 2*

72 expired `/whats-on/` pages are indexable, orphaned, absent from the sitemap, and still
serving `EventScheduled` schema asserting an event is upcoming when it finished months ago.
Excluding them from the sitemap never removed them from the crawl — they are cross-linked
from other pages, so the sitemap strategy was defeated from the start.

- **Do:** recurring series convert to evergreen pages carrying their next occurrence.
  Genuine one-offs get `noindex` on expiry and leave the sitemap. Schema must stop asserting
  `EventScheduled` for finished events.
- **Then:** make the sitemap match — everything indexable is in it, nothing `noindex` is.
- **Do not:** regress the git-sourced `lastmod` shipped in `288cddc127` by build-stamping.
- **Accept when:** zero pages emit `EventScheduled` with a past `endDate`; sitemap URL set
  equals the indexable page set exactly; 610+/610+ URLs still carry a real `lastmod` across
  a plausible spread of distinct dates (66 as of 17 Aug — a collapse to 1 means build-stamping
  has returned).

---

**TICKET-03 · F2 · Convert CSS background heroes to real markup**
*Priority 1.33 · Severity High · Effort 3*

732 of 952 pages contain zero `<img>` elements. 436 render photography entirely as CSS
`background-image`. Confirmed affected: `/eat/`, `/wine/`, `/stay/`, `/journal/`,
`/whats-on/`. Pattern lives in `PlaceDetailTemplate.astro:189`,
`RegionDetailTemplate.astro:36`, `EditorsLetter.astro:104`, `PlaceMap.astro:246`.

A CSS background is structurally invisible to Google Images, cannot carry alt text, and
gives AI crawlers nothing to attribute. This is the real image-SEO finding — F13 (alt text)
was retracted precisely because you cannot have missing alt text on markup that does not
exist.

- **Do:** `<img>`/`<picture>` with `object-fit: cover`. Visually identical, semantically real.
- **Author alt text as part of this conversion**, not as a later audit.
- **LCP hero specifically:** `fetchpriority="high"` and a `<link rel="preload">`. Do **not**
  lazy-load it. The homepage already does this correctly — copy that, do not invent.
- **Accept when:** every one of the six templates emits at least one `<img>`; every new
  `<img>` has a non-empty `alt` unless genuinely decorative; explicit `width`/`height` on
  all of them; **and a visual diff on mobile Safari confirms no layout regression** — a 200
  proves routing, not rendering (standing rule, learned 2026-04-17).

---

### P1 — high value, sequence after P0

---

**TICKET-04 · F5 · Resolve CMS image overrides at build time**
*Priority 1.50 · Severity Medium · Effort 2*

All 833 `ImageObject` nodes across 952 pages point at one URL:
`/images/sourced/home-cover.webp`. Every winery, restaurant and town tells Google and every
AI crawler that its representative image is the homepage cover.

Root cause is build order, not data: JSON-LD is written at build time, real photography is
hydrated client-side from Supabase (`pi.cms_image_slots` via `lib/cms/api.ts`) afterwards.
The visible page is right; the machine-readable layer is wrong. The photos exist.

- **Do:** fetch the overrides during the Astro build (`lib/cms/server.ts`) so HTML, JSON-LD
  and the rendered picture agree. Note `scripts/export-cms-image-overrides.mjs` already
  exists — extend it rather than writing a second export path.
- **Must:** degrade gracefully to current behaviour if Supabase credentials are absent at
  build time. A missing secret should not fail the build.
- **Accept when:** distinct `ImageObject` URL count across the build is > 100 (it is
  currently **1**), and a sample of 20 pages shows the `ImageObject` URL matching the image
  actually rendered on that page.
- **Bonus:** removes a client-side dependency from the LCP path.

---

**TICKET-05 · F3 · Entity `@id` identity layer**
*Priority 1.33 · Severity High · Effort 3*

1,438 entity declarations carry no `@id`: Winery 138, Restaurant 37, TouristAttraction 89,
TouristDestination 43, GolfCourse 11. Montalto declared on the Red Hill town page and
Montalto declared on a wineries listing are two unrelated objects to a machine.

**62 nodes already do carry an `@id`** (44 `LocalBusiness`, 18 `Place`). Adopt their existing
convention. Do not introduce a second scheme.

This is the strategic one. Stable `@id`s turn 1,438 islands into a Mornington Peninsula
knowledge graph. Entity naming is already consistent across URL, title, H1 and body on all
12 sampled towns and venues — the data is right, only the identity layer is missing.
Competitors on WordPress plugin schema cannot retrofit this easily.

- **Do:** canonical-URL-derived `@id` on every named entity type. Never invent entity data.
- **Accept when:** zero nodes of those five types lack an `@id`; the same real-world entity
  resolves to one `@id` across every page it appears on; the existing 62 are unchanged.

---

**TICKET-06 · F16 · Resolve the `/plans/` direction split**
*Priority 0.67 · Severity Medium · Effort 3*

Detail pages already declare `/explore/plans/<slug>/` canonical. A live Cloudflare Page Rule
sends `/escape/*` → `/explore/plans/*`. The July redirect CSV row 14 asserts the **opposite**
direction and **must never be imported** — it would create a two-hop chain landing on a page
that points back at the middle hop.

- **Decision, already taken:** `/explore/plans/<slug>/` is canonical. Implement that direction.
- **Accept when:** no page declares a canonical pointing away from `/explore/plans/`; index
  and listing pages agree; no redirect chain exceeds one hop.

---

**TICKET-07 · F17 · Restore measurement**
*Priority 2.00 · Severity Medium · Effort 1 · **Owner: James***

GA4 is dead and there is no PageSpeed API key. The audit ran blind on field data and had to
rely on lab measurement, which is why §12 is recorded as "PASS, lab-only" rather than PASS.

Related correction worth carrying: **the GSC Sitemaps API `indexed` field is deprecated and
returns 0 unconditionally.** The "0 indexed pages" figure quoted repeatedly before 17 Aug
was never a measurement. Real indexation must be read from the Coverage report manually
until an alternative is wired up.

- **Accept when:** GA4 returns organic sessions for the trailing 28 days, and a PageSpeed
  key returns CrUX field data for the homepage.

---

## K. MONITORING FRAMEWORK

### The principle

This codebase already has a strong build-time gate set. `npm run build` runs, in order:
`clear-content-cache` → `media:registry` → `lint:no-pricing` → `lint:region-images` →
`lint:surfaces` → `lint:nav-budget` → `lint:css-budget` → `astro build` →
`lint:seo-architecture` → `lint:filter-chips` → `audit:agent-readiness` →
`assert:link-graph`.

**So the monitoring framework is not a new system. It is a set of additions to the gates
that already exist.** Building a parallel monitoring stack alongside a working one is how
you end up with two things nobody trusts.

The governing rule, learned expensively during this audit: **assert the artefact, not the
change.** Three of the four corrections in register §H were invisible in source diffs and
only surfaced in built or live output. A green build step that checks source proves nothing.

### K1 — New build-time assertions (fail the build)

Extend `lint-seo-architecture.mjs`, which already runs post-`astro build` against `dist/`
and is therefore already looking at the right artefact.

| Assertion | Guards | Fails when |
|---|---|---|
| **No duplicate content slugs** | F6 | Any basename appears in both `events/` and `events/archive/` |
| **No `Duplicate id` loader warnings** | F6 | `astro build` emits the warning at all |
| **Sitemap ≡ indexable set** | F8 | A page is indexable and absent from sitemap, or `noindex` and present |
| **Every sitemap URL has `lastmod`** | F10 | Coverage < 100% |
| **`lastmod` spread is plausible** | F10 | Distinct `lastmod` date count < 10 — catches build-stamping regression, the exact bug fixed 13 Aug |
| **No stale `EventScheduled`** | F11 | Any page asserts `EventScheduled` with an `endDate` in the past |
| **`ImageObject` diversity** | F5 | Distinct `ImageObject` URL count < 100 across the build |
| **Entity `@id` completeness** | F3 | Any Winery/Restaurant/TouristAttraction/TouristDestination/GolfCourse node lacks `@id` |
| **Exactly one BreadcrumbList** | F7 | Any page emits 0 or ≥2 |
| **Canonical present on every indexable page** | F14 | An indexable page emits no canonical |
| **Robots meta on raw `public/*.html`** | new | A hand-authored HTML file under `public/` lacks `noindex` — the gap that let `/preview/welcome.html` reach production indexable |
| **No lazy-loaded LCP hero** | F2/F12 | The above-fold hero carries `loading="lazy"` |

Two of these deserve emphasis because they are anti-regression guards for bugs *already
fixed once*: the `lastmod` spread check and the raw-`public/`-HTML check. Both defects were
introduced by a change that looked correct.

### K2 — Post-deploy live checks (warn, do not block)

`live-agent-readiness.yml` already runs on `workflow_run` after every deploy plus a
schedule. Extend it. These check the **live edge**, not the build, because CDN and edge
config can differ from `dist/`.

- Canonical, robots and schema on a rotating sample of 20 live URLs.
- Redirect chain depth — no chain longer than one hop, no chain ending on a page that
  canonicalises back into the chain (the F16 failure mode).
- AI crawler access: `OAI-SearchBot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `CCBot`,
  `Googlebot`, `bingbot` all return 200. This passed on 16 Aug and is worth keeping green —
  an accidental robots.txt or WAF change here is silent and expensive.
- Sitemap fetches, parses, and its URL count has not moved by more than ±10% since the
  previous run.

**Warn, do not block:** a live check failing after deploy cannot un-deploy anything, and a
blocking gate on a flaky network call trains people to ignore it.

### K3 — Weekly measurement

One scheduled job, one report, appended to `ops/reports/seo/`:

- The funnel: routes built → in sitemap → crawled → indexed. **Indexed must come from the
  Coverage report, not the Sitemaps API `indexed` field**, which is deprecated and returns 0.
- Core Web Vitals field data from CrUX (blocked until TICKET-07).
- Organic sessions from GA4 (blocked until TICKET-07).
- Delta against the previous week, with anything moving more than 10% called out.

### K4 — Quarterly

Re-run the full audit method and re-score. Sub-scores as of 17 Aug, to compare against:

| Dimension | Score |
|---|---|
| Rendering | 95 |
| Performance | 85 |
| Crawlability | 82 |
| Architecture | 80 |
| Indexability | 74 |
| Structured data | 62 |
| Machine readability | 58 |
| **Internal linking** | **55** |
| **Overall** | **72/100** |

### What monitoring cannot do

It cannot tell you whether the content is any good. Every finding in this register is a
correctness or structure defect, and fixing all of them makes the site *legible* — it does
not make it *worth reading*. The three towns at 93k/mo will rank on editorial quality once
they are crawlable, and no assertion in §K1 has an opinion about that.

---

*Companion documents: `00-findings-register.md` (findings, scoring, execution record),
`ws1`–`ws5` workstream reports.*
