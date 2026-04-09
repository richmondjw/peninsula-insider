# Peninsula Insider — Events Intelligence & Competitive Lane Report

**Prepared for:** James Richmond, Owner
**Prepared by:** Competitive & Events Intelligence (Remy, sub‑agent)
**Date:** 9 April 2026
**Scope:** Visit Mornington Peninsula and adjacent event surfaces → actionable editorial & product opportunities for The Peninsula Insider
**Read time:** 15 minutes
**Status:** Actionable — decisions, not options

---

## TL;DR

The Mornington Peninsula event space is **monitored by three legacy directories and no one else**. None of them are editorial. Two are unreadable on phones. All three publish the same raw list — markets, exhibitions, whatever's paid for a listing — with no point of view, no curation, no family/weather/adult‑escape framing, no "what's actually worth it" signal.

That is a category gap the size of a car park. Peninsula Insider is the only brand positioned to fill it, and the moat is not an event database — it's **editorial judgement at the event layer**. Nobody in this market ranks, cuts, or explains events. Do that and you own the high‑intent "what should we do this weekend on the Peninsula" query forever.

**The three decisions in this report:**
1. **Reposition the What's On page** from a calendar into a weekly editorial *Peninsula This Weekend* stream with a named editor, a hard opinion, and a "what to skip" block.
2. **Stand up a lightweight event‑monitoring workflow** (one cron, five sources, one inbox, one triage pass per week) — not a scraper platform, not a headless CMS, just a weekly editorial loop.
3. **Ship four utility angles competitors do not serve:** *Weekend Picker*, *Kids‑Grade*, *First‑Time Peninsula Filter*, and *Worth The Drive From Melbourne*. Each is one paragraph of editorial judgement on top of the existing event row data.

Everything else — ticketing, embeds, calendar feeds — is post‑12‑months. This is the minimum viable competitive lane.

---

## 1. What I scanned

| Source | URL | What it is | Strength | Weakness |
|---|---|---|---|---|
| **Visit Mornington Peninsula** | visitmorningtonpeninsula.org/whats-on | Official DMO calendar | Authoritative listings, most complete official source, has markets + live music category pages | No editorial voice, category filters mostly return "no events", no RSS, no filter by weekend/date, featured events hand‑picked by tourism board not editorially |
| **Mornington Peninsula Shire** | mornpen.vic.gov.au/.../Whats-on | Council event page | Has council‑run events (Briars, Eco Explorers, public holidays, civic programs) | Buried deep in shire navigation, unusable mobile, mostly operational notices |
| **Mornington Peninsula Beachside Tourism** | morningtonpeninsulatourism.com.au/upcoming-events | Regional tourism association | Lists sponsor events, accommodation specials, fishing charters, commercial entries | Editorial / advertorial blended, dates inconsistent (Sorrento Writers 2025 dates on 2026 page), no taxonomy |
| **Visitorsguide.com.au** | visitorsguide.com.au/events-calendar | Independent event directory with **public RSS feed** (critical) | RSS feed at `visitormaps.com.au/feeds/mornington-peninsula-events/` — genuine machine‑readable source | Data sparse, titles missing from RSS, needs enrichment |
| **Mornington Peninsula Magazine** | morningtonpeninsulamagazine.com.au/whats-on-events | Glossy regional lifestyle magazine | Community‑sourced, includes smaller local events | Pay‑to‑play listings bias, mostly image cards, no structured data |
| **Eventfinda AU** | eventfinda.com.au/whatson/events/mornington-peninsula | Ticketing aggregator | Ticketed cultural events, has structured dates/venues | Incomplete — misses council events, markets, exhibitions |
| **Eventbrite AU** | eventbrite.com.au | Ticketing | Workshops, classes, smaller cultural events | Peninsula filter is weak — defaults to Victoria |
| **Facebook Groups** | "What's On – Mornington Peninsula Events" (1M+ public group) | Community reporting | Real‑time event promotion, surface new events weeks before other sources | Noise‑to‑signal ratio is brutal, not scriptable |

**Key finding:** The only machine‑readable, stable source is the **visitormaps.com.au RSS feed**. Everything else is an HTML scrape job, which means editorial judgement is cheaper than engineering for the next 12 months — you do not need to build infrastructure to beat them, you need to read faster than them.

---

## 2. Competitive critique — what the incumbents actually do

### Visit Mornington Peninsula (the official DMO)
- Is the **category default** for anyone searching "what's on mornington peninsula" — still holds the top 3 SERP positions.
- Presents events as a **flat chronological list** with no "this weekend" pivot, no "good for kids" pivot, no "rainy day" pivot.
- Category filters exist (`/cat/markets`, `/cat/arts-culture`, `/cat/family-friendly`, `/cat/food-wine`) but **four of them return "Sorry, no events to display"** on a live check today (9 April 2026). Only `markets` and `Live-Music` are populated. The filter UI is decorative, not functional.
- "Unmissable Events" are clearly hand‑curated by a tourism staffer, not editorially ranked. They repeat the same four items for months at a time.
- No RSS, no iCal, no API, no search, no weekend view, no "next 48 hours" view.
- **Publishes whatever businesses submit.** Zero editorial filter — a paid sponsor workshop ranks next to Red Hot Summer Tour.

**What this tells us:** The category leader is structurally incapable of producing a "here is what's genuinely worth it this weekend" view. That is the wedge.

### Mornington Peninsula Shire (council)
- Civic/council events only. Buried so deep in navigation it is effectively invisible to visitors.
- Strong underlying content (Briars programming, Eco Explorers, youth art exhibitions, library events) that no other source surfaces well.
- **Opportunity:** these council events are highly family‑useful, underpublished, and free. A "Council Gems" sub‑angle on Peninsula Insider would have zero competition.

### Visitorsguide.com.au (the RSS feed)
- The only machine‑readable source. Feed is updated daily.
- RSS has dates, URLs, very thin titles. Needs enrichment.
- **Operationally the most valuable thing on the Peninsula event web**, and nobody is using it competitively.

### Mornington Peninsula Magazine & Beachside Tourism
- Advertorial blended with editorial. Not a credible signal for "is this worth going to."
- Worth scraping for **new event discovery**, not for quality filtering.

### Broadsheet / Urban List / Time Out Melbourne
- Treat the Peninsula as a **weekend escape sub‑section of Melbourne**, not a destination in its own right.
- Cover 1–3 Peninsula events per month at most, usually the obvious ones (Red Hot Summer, Sorrento Writers Festival, a pinot release).
- **Leaves 95% of the event surface uncovered by any editorial brand.** This is where Peninsula Insider wins by default if it just shows up every week.

### The aggregators (Eventfinda, Eventbrite)
- Good data, irrelevant to the brand play. Useful as a back‑end ingestion source, not as competition.

---

## 3. Event category taxonomy — what's on the Peninsula and what we currently cover

Current whats-on.html filters: **Music · Markets · Family · Arts · Wellness**.
That is five categories. The real landscape is more like eleven:

| # | Category | Peninsula evidence | We cover it? | Gap vs competitors |
|---|---|---|---|---|
| 1 | **Markets** (weekly/monthly) | 8+ recurring markets (Racecourse, Emu Plains, Red Hill, Hill & Ridge, Mount Martha Briars, Point Nepean, Soul Night, Main St) | ✅ Yes, decent depth | **We need to rank them.** No incumbent says "if you only go to one, go to X" |
| 2 | **Live music** (venue + festival) | Red Hot Summer, Peninsula Picnic, Winter Music Festival, ongoing Sunday Sessions at hot springs, St Andrews Beach Brewery, winery sessions | ⚠️ Thin — we list Red Hot Summer but not the ongoing venue sessions | **Massive gap.** There is no "live music this weekend on the Peninsula" page anywhere on the internet |
| 3 | **Racing & sport days** (Mornington Cup, Portsea Swim Classic, Coastrek, Mornington Running Festival, Sportsbet Mornington Cup) | None of the incumbents treat Mornington Cup (18 April 2026) as a what's-on anchor | ⚠️ Missed Mornington Cup entirely — this is a **genuine editorial miss** | **Editorial angle nobody runs: "racing weekend concierge"** |
| 4 | **Exhibitions & galleries** (MPRG, Lander‑Se, Dromana Creative Hub, Peninsula Hot Springs art programming) | 4+ long‑running exhibitions in any given month | ✅ Yes, basic coverage | **We're not ranking them or saying what's worth the drive** |
| 5 | **Writers/ideas festivals** (Sorrento Writers Festival April 23–26) | Once‑a‑year anchor | ✅ Featured | Fine |
| 6 | **School holiday programs** (Briars, Eco Explorers, Drive‑In, Moonlit Sanctuary, Chocolaterie, Sorrento CC pottery/silk screen) | 15+ programs per holiday block | ⚠️ Thin — we cover 3 of ~15 | **Biggest family‑utility gap on the site** |
| 7 | **Wellness & retreats** (Hot Springs sound baths, Fire & Ice, Alba Thermal retreats, Peninsula Retreat, sunrise bathing, cinema bathing, silent bathing) | 10+ recurring programs | ⚠️ Partial — Body Clay + Fire & Ice only | **Alba retreat programming is entirely missing** |
| 8 | **Wine & cellar door events** (tastings, winemaker dinners, release weekends, Pinot Noir Celebration biennial, Winter Wine Weekend June) | 20+ ad hoc events | ⚠️ Not currently covered as events | **This is your highest commercial category and we don't treat it as eventy** |
| 9 | **Civic & ANZAC‑type** (ANZAC dawn services, Australia Day, Remembrance Day, IWD public art launches) | 6–8 per year | ✅ ANZAC Day covered | Fine |
| 10 | **Nature & garden walks / wildlife programs** (RBGC autumn walks, ClimateWatch, Birds in the Garden, Bandicoots walks, Briars Sanctuary twilight) | 8+ ongoing | ✅ Partial | **We're not framing these as "best free Peninsula family outings" — which they are** |
| 11 | **Food & produce experiences** (Chocolaterie Junior Chocolatier classes, Sunny Ridge strawberry picking, cheese & wine pairings, cooking classes, Hawkes Farm Meet the Makers, Best Bites) | 20+ per month, highly seasonal | ❌ **Not covered at all** | **Ready‑made editorial category competitors ignore** |

**Net result:** We currently filter by 5 categories and effectively cover 4 of them at shallow depth. The real Peninsula event surface is 11 categories and nobody covers them editorially. Even adding the 6 missing categories at shallow depth immediately puts us ahead of every incumbent.

---

## 4. Differentiation — the four utility angles to own

The question is not "can we list more events than the DMO" (we can't, and shouldn't try).

The question is **"what does a Melbourne couple, a Peninsula local, a family of four, a first‑timer, or a winery weekender actually need to decide what to do next weekend"** — and that question has *five distinct answers*, and every incumbent collapses them into one flat list.

Own these four lenses:

### 4.1 Weekend Picker (the single biggest editorial weapon)
A three‑line weekly dispatch, published every **Wednesday 6pm**, structured as:
- **The pick.** One event per weekend, with reasoning. "Go here, skip everything else, and you'll have a great weekend."
- **The alternative.** One weather‑dependent backup.
- **The pass.** One thing locals or incumbents are hyping that you should actually skip, and why.

Nobody else on the Peninsula does an *opinionated* weekend pick. This is the single most valuable recurring editorial artefact on the site. It is also the perfect newsletter anchor and the cleanest way to say "The Insider" actually insides.

### 4.2 Kids‑Grade
Every event that says "family" gets a **Kids Grade (A/B/C)** on top of the existing category tag, with a sentence of context:
- **A** — "Bring a pram, bring a toddler, bring a teen, everyone will be happy."
- **B** — "One‑age‑range event — good if you've got a 5‑to‑10, risky otherwise."
- **C** — "Marketed as family but it's really for adults with tolerant kids."

This is ten minutes of editorial judgement on data we already have. Competitors will not copy it because they don't know their listings well enough to rank them. Parents will immediately bookmark the page.

### 4.3 First‑Time Peninsula Filter
A meta‑filter that surfaces only the 3–5 events a first‑time visitor should see, with the explicit framing: **"If you've never been, start here. You can do the weird cellar doors next trip."**

This solves the planning paralysis problem that every tourism website creates by showing 40 things at once. It is also the purest expression of the Insider brand promise — honest triage.

### 4.4 Worth The Drive From Melbourne
A simple binary badge on every event: **"Worth the 90‑minute drive"** or no badge. No hedging. No "depends." A published standard: worth the drive = you'd recommend it to a friend who isn't a Peninsula local.

This is the single most Googleable utility angle on the Peninsula event web ("is X worth the drive from melbourne") and no one owns it.

---

## 5. Editorial opportunities — immediate (next 14 days)

Ranked by leverage, not effort. Do the first three this week.

### 5.1 Ship the first **Peninsula This Weekend** dispatch (Wed 15 April 6pm)
- Format: 300–500 word editorial block at the top of `whats-on.html`, above the current calendar.
- Anchor: Mornington Cup (Sat 18 April) + Sorrento Writers Festival (23–26 April) + a weather contingency.
- Voice: named byline ("By The Peninsula Insider editor"), first person, a hard opinion, a thing to skip.
- Metadata: republish as the week's newsletter. First real editorial product the site has shipped.
- **Why first:** Mornington Cup is **this weekend and we don't currently cover it.** That is an immediate miss that will be fixed by shipping the dispatch.

### 5.2 Fix the Mornington Cup omission
- Mornington Cup — Sat 18 April 2026, Mornington Racecourse — is the biggest Peninsula racing day of the season and is currently missing from whats-on.html.
- Add as a feature row in the April calendar.
- Add a *Racing Weekend Concierge* sub‑block: "where to eat before/after, where to stay walkable, how to actually park."
- This single addition is worth more SEO than 20 generic winery paragraphs because "mornington cup" is a peak‑intent commercial query this month.

### 5.3 Add 6 missing school‑holiday events before Easter ends
Current coverage: 3. Available to add from today's scan: Moonlit Sanctuary 25 Year Anniversary Program, Chocolaterie Junior Chocolatier (kids 6–12), Sorrento CC Pottery/Silk Screen/Jewellery workshops, Briars Wildlife Eco Explorers (13–15 April), RBGC Explorer Bus, Sunny Ridge Strawberry Farm.
- Apply **Kids Grade A/B/C** at the same time.
- These are all verifiable from today's scan. Zero research debt.

### 5.4 Publish **Markets, Ranked** as a first "Insider rank" article
A 600‑word opinionated piece: "We've walked every recurring market on the Peninsula. Here's the ranked list."
- Rank 1–8 with a one‑line verdict on each.
- Explicitly call out the **overrated** one (every market ranking needs one — that's the credibility trade).
- Outbound links go back to whats-on.html and individual market listings.
- This is the first piece of content the site publishes that **cannot be copied by a competitor without doing the same legwork** — it's defensible editorial IP. It also lays the foundation for *Walks Ranked, Wineries Ranked, Cellar Door Experiences Ranked* which Eat and Wine pages already have structurally.

### 5.5 Add a **Wine Events** filter to whats-on.html
Zero competitors treat wine as an event category. Today the Peninsula has at least 20 cellar‑door experiences, seasonal releases, winemaker dinners, and tasting flights that qualify. We already own wine depth on the site. Surfacing them as events connects the strongest category on the site to the weakest page on the site.

### 5.6 Add a **"Skip this" / "Overrated"** block
One line per month. Something the rest of the Peninsula press will never say. This is the word "Insider" actually doing work.

---

## 6. Product opportunities — near‑term (next 30–60 days)

These are larger lifts but high leverage. Do them after the editorial wedge is in.

### 6.1 `events/[slug].html` atomic event pages
Currently every event is a div inside whats-on.html. No event has its own URL. This caps SEO on every event query and means we cannot rank for "mornington cup 2026 guide," "sorrento writers festival guide," "red hot summer mornington guide" etc — all of which are high‑intent queries **currently owned by the primary ticketing partners**, not the DMO, not Broadsheet, not us.
- Minimum spec: slug per event, 300–600 words editorial, tip block, "what to eat/stay near it" cross‑link into Eat/Stay pages, JSON‑LD Event schema, OG image.
- Start with 5 anchor events: Mornington Cup, Sorrento Writers Festival, Red Hot Summer (historical ref), ANZAC Day at Sorrento, Pinot Noir Celebration (next one).

### 6.2 Weekend Picker newsletter
The dispatch from §5.1 becomes the content. Publish Wednesday 6pm, the moment couples start planning a weekend. Competes with no one because nobody in this market has a Wednesday cadence.

### 6.3 Event monitoring dashboard (internal)
The workflow in §7 produces a triaged event pipeline. Publish the dashboard as a **private** editorial tool, not a public feature. Zero product surface change. Internal leverage only. Eventually becomes the data model for atomic event pages.

### 6.4 Rainy Day / Sunny Day toggle on whats-on.html
Binary filter: "Weather‑proof ideas" vs "Only worth it if the sun's out." Solves the #1 Peninsula planning anxiety. Two data attributes on existing event rows — a couple hours of work. Nobody else does this.

### 6.5 Sunday Sessions & Hot Springs live music feed
Peninsula Hot Springs Sunday Sessions alone is a weekly recurring live music product included with bathing and it is **not referenced on any competitor event page**. Scoop it. Add as its own sub‑block under music.

### 6.6 "Events near [X]" cross‑links
Under every restaurant, winery and stay, add a live "What's on nearby this weekend" block that auto‑pulls from whats-on.html. Starts as a manual block on the top 10 venues, becomes a template later. The site becomes *one navigable planning tool* instead of 8 isolated index pages.

---

## 7. Recommended event‑monitoring workflow

Deliberately boring. Do not build a scraper platform. Build a **weekly editorial loop** with one cron, one inbox, one triage pass, one output. Six months of this produces the best Peninsula event content on the internet.

### 7.1 Sources (in monitoring priority order)

| Priority | Source | Mode | Frequency | Purpose |
|---|---|---|---|---|
| P0 | `visitormaps.com.au/feeds/mornington-peninsula-events/` | RSS | Daily 06:00 AEDT | Machine‑readable spine of the pipeline |
| P0 | `visitmorningtonpeninsula.org/whats-on` | HTML scrape (title + date + url) | Daily 06:05 | DMO cross‑reference |
| P1 | `visitmorningtonpeninsula.org/Whats-On/cat/markets` and `Whats-On/Live-Music` | HTML scrape | Twice weekly (Tue/Fri) | Category‑specific events missed by main feed |
| P1 | `mornpen.vic.gov.au/Activities/Explore-Mornington-Peninsula/Whats-on/Whats-on` | HTML scrape | Weekly Tuesday | Council events — high family utility, under‑covered |
| P2 | `morningtonpeninsulatourism.com.au/upcoming-events` | HTML scrape | Weekly Wednesday | Commercial / advertorial — noise‑filtered |
| P2 | `morningtonpeninsulamagazine.com.au/whats-on-events` | HTML scrape | Weekly Thursday | Community‑sourced discovery |
| P3 | `eventfinda.com.au/whatson/events/mornington-peninsula` | HTML scrape | Weekly Friday | Ticketed cultural events |
| P3 | Peninsula Hot Springs programme page | HTML scrape | Weekly Monday | Wellness / music — unique to them |
| P3 | Sorrento Writers Festival, Sorrento CC, Moonlit Sanctuary, Briars, RBGC, Alba Thermal Springs | Targeted manual checks | Monthly (1st Monday) | Anchor venues — highest‑utility programming |

### 7.2 Pipeline (the actual loop)

**Daily (automated, ~2 minutes):**
1. Cron runs `scripts/events-ingest.sh` at 06:00 AEDT.
2. Fetches RSS feed, parses items, writes new entries to `data/events/incoming.ndjson`.
3. HTML scrape of Visit Mornington Peninsula homepage. New titles diffed against `data/events/seen.ndjson`. Any new entry appended to `incoming.ndjson`.
4. Slack/Telegram ping to the editorial Inbox group if ≥3 new entries found: `"N new Peninsula events detected — triage in queue."` No ping if zero.

**Weekly triage (manual, Tuesday 10:00 AEDT, ~25 minutes):**
5. Editor opens `incoming.ndjson`, reviews entries.
6. For each entry, one of four decisions:
   - **PROMOTE** → write 1‑line blurb, assign category, Kids Grade, Worth‑The‑Drive badge. Append to `data/events/curated.ndjson`.
   - **HOLD** → date far enough out to wait. Moves to `holding.ndjson`, re‑reviewed weekly.
   - **SKIP** → not a fit (commercial ad, too far out of region, too niche). Logged to `skipped.ndjson` with reason.
   - **FEATURE** → exceptional — flagged for that week's Weekend Picker dispatch.
7. At end of triage, `scripts/events-render.sh` regenerates the `whats-on.html` event rows from `curated.ndjson` using a template. Manual HTML editing ends.

**Wednesday 18:00 AEDT — Weekend Picker dispatch:**
8. Editor writes the 300–500 word dispatch using the FEATURED items from Tuesday triage.
9. Commits dispatch to `posts/weekend-picker/YYYY-MM-DD.md` and as injected block at top of `whats-on.html`.
10. Same content pushed to newsletter + optional social fan‑out later.

**Monthly review (first Monday, ~60 minutes):**
11. Review `skipped.ndjson` — any patterns we're systematically missing?
12. Review `curated.ndjson` — any events we PROMOTED that turned out to be misses? Add to a running *Calibration* file.
13. Review sources — any new discovery channels? Any sources producing only noise?

### 7.3 Minimal directory structure

```
peninsula-insider/
├── data/
│   └── events/
│       ├── incoming.ndjson      # from ingest
│       ├── curated.ndjson       # what we'll publish
│       ├── holding.ndjson       # wait-state
│       ├── skipped.ndjson       # reasoning log
│       └── seen.ndjson          # dedupe index
├── scripts/
│   ├── events-ingest.sh         # cron: daily 06:00
│   ├── events-render.sh         # weekly: regenerate whats-on.html rows
│   └── events-report.sh         # weekly: stats for triage
├── posts/
│   └── weekend-picker/
│       └── 2026-04-15.md        # first dispatch
└── docs/
    └── reports/
        └── peninsula-insider-events-intelligence-2026-04-09.md   ← this file
```

### 7.4 What this workflow deliberately does *not* do
- **No headless CMS.** Ndjson + shell + templated HTML is fine for <500 events/yr.
- **No scraper platform.** If a source breaks, we fix it in one script or manually source for a week. This is a newsroom, not a data company.
- **No public API surface.** Internal data model only. Public surface is the rendered HTML and the newsletter.
- **No real‑time.** Peninsula events don't move in real‑time. A 24‑hour freshness window is fine.

**Operational cost estimate:** 25–40 minutes of editor time per week for the weekly triage + dispatch; 5 minutes/day for automated health check. ~3 hours/month total. One afternoon to stand it up.

---

## 8. Minor site improvement identified

One tiny high‑value change found during the scan, not a rebuild:

**`whats-on.html` line ~156 — "Updated daily" badge claim is stronger than what we deliver.** The banner says "Updated daily — check back for the latest events." A careful visitor reading today would find Mornington Cup (18 April) missing and that badge loses credibility fast. Two options:

**Option A (fastest — 2 min):** Change badge copy to "Reviewed weekly · Last editorial pass [date]". Sets honest expectation, removes credibility risk.

**Option B (right answer — deferred):** Once the workflow in §7 is running, "Updated daily" becomes literally true. Keep the badge, make it honest.

**Recommendation:** Do **neither** right now as part of this sub‑agent pass. The editorial fix (adding Mornington Cup, shipping the first Weekend Picker dispatch) is more valuable than the badge edit. Flag this for the main editorial cron to address on its next pass. No site edit needed from this sub‑agent.

---

## 9. 30‑day decision checklist

Condensed to yes/no owner‑ready decisions.

- [ ] **Ship the first Weekend Picker dispatch by Wed 15 April 18:00 AEDT.** Yes/no. If yes: assign editor, format agreed.
- [ ] **Add Mornington Cup (18 April) to whats-on.html this week.** Yes/no.
- [ ] **Add 6 missing school‑holiday events before Easter ends.** Yes/no. Cut‑off: 15 April.
- [ ] **Publish "Markets of the Peninsula, Ranked" as first Insider rank article.** Yes/no. Cut‑off: 25 April.
- [ ] **Introduce Kids Grade (A/B/C) tag on family events.** Yes/no. Requires one style guide paragraph.
- [ ] **Introduce Worth‑The‑Drive badge on every event.** Yes/no. Requires one policy paragraph.
- [ ] **Introduce "Skip this" block in the April calendar.** Yes/no. Requires one editorial paragraph per month.
- [ ] **Add Wine Events filter to the filter bar.** Yes/no. ~30 min of site work.
- [ ] **Add Racing and Sport filter to the filter bar.** Yes/no. ~30 min of site work.
- [ ] **Stand up events‑ingest.sh cron on RSS feed.** Yes/no. ~2 hours of work. Deferred or now?
- [ ] **Ship `events/mornington-cup-2026.html` as first atomic event page.** Yes/no. First proof of atomic‑content pattern.
- [ ] **Expand whats-on.html filter bar from 5 → 8 categories (add Wine, Racing/Sport, Wellness‑retreats).** Yes/no.

---

## 10. What this report deliberately leaves alone

- **Atomic content rebuild.** Covered in the strategic review (9 April 2026). This report assumes the rebuild is still 6–12 months out and plays for leverage inside the current architecture.
- **Booking integration.** Not an events question. Covered separately.
- **SEO tooling for event schema.** Will matter when atomic event pages exist. Until then, rich results are irrelevant.
- **Cloning the DMO.** Explicitly not the play. We will never be the comprehensive list. We will always be the *rank + judgement* layer on top of the comprehensive list.
- **Scraper engineering.** See §7.4 — not needed for 12+ months at this traffic scale.

---

## 11. The bottom line

The Peninsula event web is a **curation‑free zone.** Every incumbent publishes a list and walks away. The only editorial brand in the market (us) currently publishes a list too. That is a wasted position.

The entire play in this lane is to **become the one site that has an opinion about every event.** Not every event needs a long review — most need one sentence of editorial judgement and a badge. But the one sentence and the badge are the entire moat, because nobody else in the market has the brand licence to be honest about what's good and what isn't.

Start shipping the Weekend Picker on Wednesday. Fix the Mornington Cup omission this week. Add four new categories to the filter bar. Stand up the ingest pipeline when it's convenient. Six weeks from now, "what's on mornington peninsula this weekend" looks like a Peninsula Insider query, and the gap to the DMO becomes unclosable without a brand they don't have.

**— End of report.**
