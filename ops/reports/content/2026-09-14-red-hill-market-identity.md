# The market that closed and the market that took its ground

Register item A25. Branch `pi/market-identity-evidence`. Companions:
`2026-09-14-venue-contact-reachability.md` (A27, which found that all six markets in the corpus
have no contact route at all), `2026-09-14-la-baracca-false-closure.md` (the error in the other
direction), `2026-09-13-venue-identity-corrections.md`, and
`ops/records/link-health/probe-ledger.json`, which holds every fetch behind every citation here.

**This report decides nothing.** It does not edit an article, a venue record, an event record or a
template. Which market this site should publish at the Red Hill Recreation Reserve is James's call
and it is already on his register. The job here was to make that call take five minutes.

---

## Recommendation, first

**Retire `venues/red-hill-market` as a trading venue and publish the market at that reserve under
its actual name, Hill & Ridge Community Market, operated by the Red Hill Agricultural &
Horticultural Society.** Keep the slug and the URL; a rename with `previousSlug` is already a
supported move in the schema and 17 articles' worth of internal links keep working.

**Confidence: high on the facts, high on the direction, moderate on the mechanics.** Four
independent publishers, including the operator of the closed market and the council that owns the
ground, agree on what happened. What is *not* settled is whether the two are the same market
renamed — and the answer to that changes the copy but not the recommendation.

**Cost of being wrong, each way.**

| If we act and the premise is wrong | If we do not act and the premise is right |
|---|---|
| We would have renamed a running market to another running market's name. The reader still arrives at Red Hill Recreation Reserve, on a first Saturday, between 9am and 2pm, at a market that is happening. Wrong label, right morning. | A reader drives an hour, on a Saturday, to a market our own structured data tells Google is running, that the operator says has not run at that ground since 7 September 2024. In winter, our pages say it runs when the season is closed either way. This is the failure mode a weekend market is uniquely good at producing. |
| Recoverable in one commit. The evidence to reverse it would be the same evidence to make it. | Not recoverable. The drive already happened. |
| Blast radius: 19 articles, 18 templates, 12 content records. Mechanical. | Blast radius: every reader who trusts a first Saturday. |

The asymmetry is the whole argument. There is no version of acting on this evidence that sends a
reader somewhere nothing is happening; there is a clear version of not acting that does.

---

## 1. What the corpus actually holds

Not, as the register item supposed, two venue records. **They are not held symmetrically, and that
asymmetry is itself part of the problem.**

| | Red Hill Market | Hill & Ridge Community Market |
|---|---|---|
| Venue record | `venues/red-hill-market.json` | **none** |
| Venue page | `/eat/red-hill-market/`, plus a consolidating redirect from `/explore/red-hill-market/` | none |
| Event record | `events/red-hill-market-first-saturday.json` (recurring, undated) | `events/hill-ridge-community-market-september-2026-restart.json` (one dated instance) |
| In the markets guides | ranked first on both `/eat/markets/` and `/explore/markets/` | **absent from both** |
| Articles that recommend it | 17 | 0 |
| Referenced by other records | 10 | 0 |
| Claims in the registry (before today) | 0 | 5 |

So the market our evidence says is running has one dated event record and no venue, no venue page,
no guide entry and no article. The market our evidence says is closed is the site's signature
weekend recommendation. The corpus is exactly upside down.

### The two records, side by side

| Field | `venues/red-hill-market` | `events/hill-ridge-…-restart` |
|---|---|---|
| Name | Red Hill Market | Hill & Ridge Community Market, September 2026 (Restart) |
| Ground | "Red Hill Recreation Reserve" | "Red Hill Recreation Reserve" |
| Street address | **172 Arthurs Seat Rd** | **184 Arthurs Seat Road** |
| Coordinates | −38.3625, 145.055 | −38.377, 145.084 |
| Day | first Saturday | first Saturday |
| Season | September–May (`signature`, `editorNote`); `tags.season` spring/summer/autumn | September–May (`recurrenceNote`) |
| Hours | none carried. `editorNote` says "arrive by 9am" | 09:00–14:00 |
| Operator | none carried | "Red Hill Agricultural Society" |
| Website | retired 2026-09-13 (dead) | `hillandridgemarket.com.au` |
| Next occurrence | **2026-10-03** | **2026-10-03** |
| Scale | "more than 200 stalls" | not stated |

**Where they agree:** the ground by name, the day, the monthly cadence, the season, and — to the
day — the next occurrence. Two records, one reserve, the same Saturday.

**Where they contradict:**

1. **The street number.** 172 versus 184. Only one can be the reserve.
2. **The pin.** The two coordinate pairs are **3.0 km apart**. Both are inside the coordinate
   lint's bounding box, so nothing catches it. A reader following the map on one page and the map
   on the other ends up in two different places, and at most one of them is a market.
3. **The name and the operator.** One record names an operator; the other names none.
4. **The hours.** One says 9–2; the other says nothing and implies a morning.

Note what the shared `nextOccurrence: 2026-10-03` means in practice: **this site currently
publishes two different markets happening at the same reserve on the same Saturday morning**, and
tells the reader to go to the one whose operator says it is closed.

### One more contradiction, unrelated to identity and worth fixing anyway

`tour-packages/long-weekend.json` states that Red Hill Market "runs the third Saturday of each
month only." Every other record in the corpus, and every external source, says first Saturday. That
is a straight internal contradiction that predates and is independent of this question.

---

## 2. Where our own prose already says they are not the same thing

Three places, all of them published.

**`articles/insider-picks-2026-09-05.md`** — the clearest statement, in the body:

> The Hill & Ridge Market is not the Red Hill Market. That distinction matters. Red Hill Market on
> the first Saturday of the month draws two hundred-plus stalls and a car park queue that starts
> before eight. Hill & Ridge, also at Red Hill Recreation Reserve, runs on the first Saturday of a
> smaller monthly schedule and operates at a pace that makes it possible to actually talk to the
> producers.

Read against the evidence in section 4, the first sentence is defensible and the rest is not: it
describes two markets running side by side at one reserve on one Saturday, which no source
supports. "A smaller monthly schedule" describes nothing the organiser publishes.

**`events/hill-ridge-community-market-september-2026-restart.json`**, `editorVerdict`:

> Hill & Ridge is the quieter sibling to Red Hill Market: same ridge, fewer crowds, more winemakers
> in attendance.

Same claim, in a structured field: two markets, both running.

**`venues/red-hill-market.json`**, `sourceStatusNote` — the PI-007 editor note written on
2026-09-13, which says the opposite:

> The Red Hill Community Market's own site now reads "The Red Hill Community Market is temporarily
> closed" and serves only a history archive. The market trading at Red Hill Recreation Reserve on
> the first Saturday September–May is the Hill & Ridge Community Market, run by the Red Hill
> Agricultural & Horticultural Society. This site holds them as two separate things and says so in
> prose.

So the corpus contains both the error and the diagnosis of the error, filed one day apart in two
fields nothing reconciles. The diagnosis is in a field no reader sees.

---

## 3. What could not be read

Recorded first, plainly, rather than substituted with something weaker.

| Source | What happened | Consequence |
|---|---|---|
| `www.redhillmarket.com.au` | `ECONNREFUSED` on 443, both today and in the 2026-09-13 probe. The disposition note from that probe says it answered 200 with a two-word "Not found" body from a NetRegistry redirector. **Not re-observed today.** | The corpus's own retired website for this venue cannot be read at all. |
| `www.redhillcommunitymarket.org` | `Could not resolve host`. Search results attribute pages on this domain to the Hill & Ridge site, with titles like "/about — Hill & Ridge Community Market". **That attribution is not evidence and is not relied on anywhere below.** If it were true it would be the single strongest signal for the "same market renamed" reading, and it could not be verified. | Recorded `dead` in the probe record; deliberately not cited. |
| `visitmelbourne.com` (Visit Victoria listing for Hill & Ridge) | HTTP 403, Cloudflare interstitial ("Just a moment…"). | Scored `blocked`, which this repo treats as an honest unknown and never as a fault. A person with a browser very likely gets through. |
| Mornington Peninsula Shire | **Answered.** Register item A18 records that the council refuses automated reads; it did not refuse this one, and the probe record shows ten `mornpen.vic.gov.au` rows verdict `ok` on 2026-09-13. | Reported as observed. A18 may be narrower than it reads, or the behaviour may vary; that is not resolved here. |
| Any operator, by phone or email | Not attempted. | A27's finding stands: this is the category we cannot ring. Hill & Ridge is the exception that proves it — it publishes a phone number, a mobile and an email, and our record for it carries none of them. |

No page was cited that was not fetched. Every URL below carries a row in
`ops/records/link-health/probe-ledger.json`, written by `scripts/probe-link-health.mjs` on
2026-09-14 as a separate deliberate command, per `ops/records/README.md`.

---

## 4. What the sources actually publish

### 4.1 The Red Hill Community Market, from its own site

`https://www.redhillcommunitymarket.com.au/` — read 2026-09-14. The **page title recorded by the
probe** is itself the finding:

> Red Hill Community Market® – The Red Hill Community Market® is temporarily closed.

The page presents as a "History Archive" and states:

- "The Red Hill Community Market® is temporarily closed and not running until a new location is
  found."
- it is "no longer running at the Red Hill Recreation Reserve & Showgrounds"
- it ran "from September to May from 1975 to 2024", having begun "on the first Saturday of
  September, 1975"
- "The Mount Martha Briars Market runs on the first Saturday of the month from September to May,
  taking over the regular Red Hill Market® schedule."
- "Both Red Hill Community Market® and Red Hill Market® are trademarked and owned by Craft Markets
  Australia."

That last line matters more than it looks. **"Red Hill Market" is not a generic description of the
market at the reserve; it is a registered trading name belonging to a specific market holder**, and
that holder says the market is closed and has moved its schedule to Mount Martha.

`https://www.craftmarkets.com.au/red-hill-community-market` — read 2026-09-14. Probe-recorded page
title: "Red Hill Community Market® - Temporarily closed". The page gives status only: no location,
no schedule, no return date.

Two pages, one operator, agreeing. This is the highest-precedence source class the precedence table
defines for a trading-status claim (`venue-site`, authority `operator`).

### 4.2 The Hill & Ridge Community Market, from its own site

`https://www.hillandridgemarket.com.au` and `/faqs` — read 2026-09-14.

- "First Saturday of each month (Sept - May) | 9am-2pm"
- "Red Hill Recreation Reserve & Showgrounds, 184 Arthurs Seat Road, Red Hill 3937"
- operator: the Red Hill Agricultural & Horticultural Society
- 2026–27 dates: 5 September, 3 October, 7 November, 5 December, 2 January, 6 February, 3 April,
  1 May
- "NO MARKET ON THE 6 MARCH - IT'S THE RED HILL SHOW"
- free entry; "$5 fee" for parking, taken by the Red Hill Lions Club
- contact: `hello@hillandridgemarket.com.au`, (03) 5989 2357, text 0490 774 621
- "the market runs in all weather. If conditions are deemed unsafe, we may cancel for safety
  reasons."

And the FAQ, which is the organiser answering the exact question this report is about:

> **Did the market at Red Hill close?**
> Not ours. Hill & Ridge Community Market kicks off Season 3 at Red Hill Recreation Reserve this
> September – first Saturday of the month, September–May.

Two things fall out of that sentence. **"Not ours"** distinguishes this market from one that did
close, without naming it — the organiser is evidently being asked. And **"Season 3"**, in September
2026, dates this market's own tenure at that reserve to three seasons: 2024–25, 2025–26, 2026–27.
Season one began the season after the Red Hill Community Market's last.

### 4.3 The council that owns the ground

`https://www.mornpen.vic.gov.au/Things-to-do/Markets` — read 2026-09-14. The Shire's market
directory lists eight markets. The Red Hill entry is:

> Hill & Ridge Community Market, Red Hill — "A gathering of good things in the heart of Red Hill",
> 184 Arthurs Seat Road

**No market named Red Hill Market or Red Hill Community Market appears anywhere on the page.** The
Mount Martha Briars Market is listed separately, at 450 Nepean Highway — corroborating the
relocation the closed market's own site describes.

An absence is reported here as an absence. The council does not state that the Red Hill Community
Market is closed, and nothing about it is inferred from its not being listed.

### 4.4 Third-party corroboration, dated

| Source | Read | What it publishes |
|---|---|---|
| ATDW (Australian Tourism Data Warehouse), the national tourism distribution record | 2026-09-14 | "Hill and Ridge Community Market", "184 Arthurs Seat Road Red Hill Victoria 3937", Red Hill Recreation Reserve, first Saturday Sept–May, 09:00–14:00, dates 3 Oct 2026 → 1 May 2027 |
| MPNEWS (Mornington Peninsula News Group), published **31 October 2025** | 2026-09-14 | "The Red Hill Agricultural & Horticultural Society – proud custodians of the Red Hill Show since 1922" took over management "in 2024"; first Saturday monthly at the Red Hill Recreation Reserve, 9am–2pm, free entry |
| Markets & Festivals Victoria, "What happened to the Red Hill Community Market 2024" | 2026-09-14 | "The Mornington Peninsula Shire Council has chosen not to renew the tender for Craft Markets Australia, leading to the conclusion of this iconic market"; final event at the reserve **7 September 2024**; the market relocated to Seawinds Gardens from 26 October; "The Hill and Ridge Community Market" took over at the original location |
| Markets & Festivals Victoria, "Hill and Ridge Community Market Takes Over Red Hill Market" | 2026-09-14 | "This exciting new market, the Hill and Ridge Community Market, celebrates everything that made the Red Hill Community Market special, but with a fresh twist!"; "proudly brought to you by the Red Hill Agricultural and Horticultural Society"; 2024–25 season from 5 October 2024 |

Neither Markets & Festivals article carries an explicit publication date. Their content places them
in September and October 2024 respectively, and that is reported rather than asserted.

One inconsistency, recorded rather than smoothed: the trade-press account has the closed market
relocating to **Seawinds Gardens** from October 2024, while the operator's own site today says it is
closed "until a new location is found" and points at **Mount Martha Briars**. Those are statements
made two years apart. The operator's current statement is the one that counts, and both agree the
market is not at Red Hill Recreation Reserve.

---

## 5. The three possibilities

**(a) They are the same market, renamed.** *The evidence does not support this.* Different legal
operator (Craft Markets Australia, a commercial market holder, versus the Red Hill Agricultural &
Horticultural Society, a 1922 community body). Different trading name, and the old one is a
registered trademark the new operator does not hold. The old operator describes itself as closed
and looking for a location, which a renamed market would not say. The new operator says "Not ours"
of the closure. A rename does not leave the original entity alive, trademarked, and publishing a
history archive.

**(b) They are two different markets and one has closed.** **This is what the evidence supports.**
The Red Hill Community Market® ran at the reserve from 1975 to September 2024, lost the ground when
the Shire did not renew Craft Markets Australia's tender, and is now temporarily closed. The Hill &
Ridge Community Market, a different market run by a different body, has run at the same reserve on
the same first-Saturday September–May pattern since the 2024–25 season, and is now in its third.
Four publishers agree, including the closed market's own operator and the council. **Confidence:
high.**

**(c) They are two different markets, both running, at different places or times.** *The evidence
does not support this, and it is what the corpus currently publishes.* No source places a Red Hill
Market or Red Hill Community Market at the reserve, or anywhere else, on any date. The Shire's
directory lists one market at Red Hill. Our own two records put them on the same ground on the same
Saturday, which is the reading (c) requires and which no source corroborates.

The nuance that makes (b) less tidy than it sounds, and worth stating because it is what the copy
has to get right: **the ground has a continuous first-Saturday market; the brand does not.** A
reader who turns up at 184 Arthurs Seat Road on a first Saturday in October finds a market. A
reader who searches for "Red Hill Market" and follows our page finds our page. The harm is not
"nothing is happening there" — it is that we publish a name, an operator, an address, a pin and an
hours implication that are all wrong, with no contact route to correct any of it, as the site's
single most-repeated weekend recommendation.

### What would settle it

1. **One phone call.** (03) 5989 2357 or 0490 774 621, published by the organiser. Ask the Red Hill
   Agricultural & Horticultural Society two questions: is the market at the reserve the continuation
   of the market that ran there before 2024, or a new market; and does anything called Red Hill
   Market trade at that reserve. Ten minutes, and it converts high confidence to settled.
   **A27's finding is that this is the one market category we cannot ring — and this is the one
   market in it we can.**
2. **The Shire's tender record.** The non-renewal is the mechanism the whole account turns on, and
   it is a council decision with a paper trail. Not attempted here.
3. **`redhillcommunitymarket.org`.** If that domain resolves for anyone else and serves the Hill &
   Ridge site, reading (a) becomes live again. It does not resolve from here.

---

## 6. The blast radius, itemised

### 6.1 The 19 articles, and which 17 are the exposure

Every article in the corpus that names the market. **Seventeen recommend it. Two mention it only in
contrast and need nothing.**

| # | Article | How it carries the market | If the recommendation is accepted |
|---:|---|---|---|
| 1 | `the-market-saturday.md` | `relatedVenues` + `relatedExperiences`; **dek names "the Red Hill Community Market"**; 3 body/summary assertions including "the most visited single-morning event on the Peninsula" | Heaviest edit. Dek, three summary bullets, the sequencing advice ("8am is early enough, 10am is too late" against published 9–2), and the ref. |
| 2 | `how-to-build-a-red-hill-saturday.md` | `relatedVenues` + `relatedExperiences`; body "Start at Red Hill Market if it is on" | Rename in body and ref. "If it is on" survives a rename unchanged. |
| 3 | `peninsula-this-weekend-april-26.md` | 9 mentions: dek, tag, **2 FAQ answers**, an H2 anchor section, 3 body paragraphs | Heaviest prose edit. Dated weekend piece; consider whether it is edited or left as a dated artefact with a correction note. |
| 4 | `the-peninsula-picnic.md` | `relatedVenues` + `relatedExperiences`; 2 body assertions | Rename ×2, refs ×2. |
| 5 | `the-peninsula-pantry.md` | `relatedVenues`; body planning note; **an inline link `/explore/red-hill-market/`** | Rename ×2, ref, and the inline href. |
| 6 | `the-spring-peninsula.md` | `relatedVenues` + `relatedExperiences` | Refs only. |
| 7 | `autumn-weekend-edit.md` | `relatedExperiences`; **FAQ answer** stating first Saturday Sept–May | Ref + one FAQ answer. The schedule in it is correct for Hill & Ridge. |
| 8 | `how-to-plan-a-peninsula-weekend.md` | `relatedExperiences`; body list item "first Saturday of the month only (1–2 hours)" | Ref + rename. "1–2 hours" is an editorial estimate, not an hours claim. |
| 9 | `the-birthday-weekend.md` | `relatedExperiences` | Ref only. |
| 10 | `the-easter-peninsula.md` | `relatedExperiences` | Ref only. |
| 11 | `the-four-hour-peninsula.md` | `relatedExperiences` | Ref only. |
| 12 | `the-peninsula-orientation-drive.md` | `relatedExperiences` | Ref only. |
| 13 | `the-school-holidays-survival-guide.md` | `relatedExperiences`; one summary bullet | Ref + rename. |
| 14 | `the-peninsula-with-kids.md` | summary bullet | Rename. |
| 15 | `first-time-peninsula.md` | body, hinterland orientation paragraph | Rename. |
| 16 | `free-things-to-do-mornington-peninsula.mdx` | body: "first Saturday of the month, September to May, Red Hill Showgrounds. Entry free" | Rename. Schedule and free entry are both correct for Hill & Ridge. |
| 17 | `the-one-booking-peninsula-day.md` | body: "The Red Hill market loop" | Rename. |
| — | `insider-picks-2026-09-05.md` | **contrast only**, and the article that states the two are different | **Nothing required by the rename.** Its factual content is a separate question — see below. |
| — | `peninsula-this-weekend-jun-13.md` | **contrast only**: "Less visible than the Red Hill market" ×2 | **Nothing required.** Comparative, lowercase, no recommendation. |

Of the 17, **nine carry the market only as a `relatedExperiences` entry** — and that entry points
at the slug `red-hill-market`, for which **no record exists in the `experiences` collection**.
`resolveRefs` matches nothing, so those nine references render nothing today. They cost nothing to
fix and are not part of the reader-facing exposure. Worth knowing before anyone budgets the work.

Nine articles are pure reference updates. Five need one sentence. Three need real editing.

**`insider-picks-2026-09-05.md` needs a decision of its own,** and it is not a rename. It is the
only article that tells the reader the two markets are different, and it does so by describing both
as running at the same reserve. If reading (b) is accepted, that passage is wrong in a more
interesting way than the other 17 — it is wrong on purpose, with reasoning. Correcting it is an
editorial act, not a find-and-replace, and it should not be batched with the rest.

### 6.2 Ten other content records

| Record | What it says |
|---|---|
| `places/red-hill.json` | "Signature experience: cellar door Saturday followed by the Red Hill Market"; `bestDay` "Red Hill Market at 9am" |
| `places/red-hill-south.json` | intro, a signature-experience line and `bestDay`, three separate assertions, including "genuinely the best market on the Peninsula" |
| `tour-packages/long-weekend.json` | `bookingSequence` and an FAQ question. **States "third Saturday of each month only"** — wrong independently of this report |
| `itineraries/ridge-to-sea-two-night-escape.json` | a day slot keyed `experience: red-hill-market` |
| `events/red-hill-market-first-saturday.json` | the recurring event record itself: "By 12:30 it's over" against published 9–2 |
| `events/mornington-peninsula-winter-wine-weekend-2026.json` | `nearbyAttractions` names it — **at a winter event, outside the Sept–May season** |
| `events/peninsula-hot-springs-allara-briggs-pattison.json` | `editorNote` builds a day around it |
| `venues/balnarring-market.json` | `editorNote` ×2 and `whyWeGo`, all positioning Balnarring against "the Red Hill crowd" |
| `venues/red-hill-bakery.json` | `knownFor: ["Red Hill Market", …]` |
| `editorial_blocks/day-trips-intro.md`, `rainy-day-intro.md` | two reusable blocks, injected into multiple pages |

### 6.3 Eighteen templates — and this is the part that reaches machines

Hand-written `.astro` pages naming the market in prose. Two things here are worse than the article
exposure, because they are structured data rather than prose.

**`/eat/markets/`** emits a `FAQPage` block and a `CollectionPage` description. Its published
answers:

> **When is Red Hill Market?** Red Hill Market runs on the first Saturday of **every month** at the
> Red Hill Showgrounds. **Gates open 8am, most stalls wind down by 1pm.**

> **What is the best market on the Mornington Peninsula?** Red Hill Market … is the Peninsula's
> largest and most established market

**`/explore/markets/`** emits a second `FAQPage`:

> **When is the Red Hill Market?** The first Saturday of **every month, 8am–1pm**, at Red Hill
> Showgrounds.

> **What is the best market on the Mornington Peninsula?** **Red Hill Community Market** — for
> variety, quality, and atmosphere.

> **Are the markets suitable for visiting in winter?** Yes. Red Hill, Balnarring, Mornington, and
> Mount Eliza markets **run year-round.**

Four separate errors, in markup built to be lifted verbatim into a search result or an AI answer:

1. **"every month" / "year-round"** — the season is September to May on the organiser's site *and
   on our own venue record*. This is not merely unsourced; it contradicts the corpus.
2. **"8am–1pm" / "Gates open 8am, most stalls wind down by 1pm"** — the organiser publishes
   9am–2pm. We are an hour early at both ends.
3. **"Red Hill Community Market"** — the exact registered trading name of the market that is
   temporarily closed, offered as the answer to "what is the best market on the Peninsula".
4. Neither guide lists Hill & Ridge at all.

**`/explore/family-friendly/` and `/explore/things-to-do/`** each emit an `ItemList` of
`TouristAttraction` entries containing `{ name: 'Red Hill Community Market', path:
'/eat/red-hill-market/' }` — the closed name, as a named machine-readable attraction, in two more
places.

**`/journal/mornington-peninsula-in-winter/`** states "Red Hill Market still runs on the first
Saturday of each month" in a page about winter. On the corpus's own season that is false for June,
July and August regardless of which market is meant.

The remaining templates (`day-trips`, `rainy-day`, `weekend-trips`, `map`, `places/[slug]`,
`guides/spring`, `guides/easter-long-weekend`, `stay/cottages`, `wine/balnarring`,
`journal/mornington-peninsula-in-autumn`, `journal/mornington-peninsula-with-kids`,
`journal/free-things-to-do-…`, `components/InsiderPlans`) are prose renames.

### 6.4 Totals

| | |
|---|---:|
| Articles naming the market | 19 |
| — recommending it (the exposure) | **17** |
| — contrast only, needing nothing | 2 |
| Other content records | 10 |
| Templates naming it in prose | 18 |
| — emitting it inside structured data | **4** |
| The market's own records | 2 (one venue, one event) |
| Internal links to `/eat/red-hill-market/` or `/explore/red-hill-market/` | present in 9 templates and 1 article |

A rename that keeps the slug leaves every one of those links working. That is the single strongest
argument for `previousSlug` over a delisting.

---

## 7. What was filed, and what it cost

Eight records, under `next/src/content/`. No corpus record was edited.

**One claim, disputed by everything attached to it:**

`claims/venues/red-hill-market/trading-status.json` — *"Red Hill Market trades at the Red Hill
Recreation Reserve on the first Saturday of each month from September to May."* Written exactly as
the corpus makes it, not as the evidence leaves it, because that is the assertion 17 articles carry.
`assertedBy` names the six records that carry it in a field or in prose an editor can point at.

Four standing evidence rows, **all `disputes`, none `supports`**:

| Row | Publisher kind | Source |
|---|---|---|
| `trading-status-operator-2026-09-14` | `venue-site` | the market's own site — temporarily closed, no longer at that ground |
| `trading-status-craftmarkets-2026-09-14` | `venue-site` | Craft Markets Australia — "Temporarily closed" |
| `trading-status-shire-2026-09-14` | `gov` | the Shire directory — lists Hill & Ridge at 184, and no other Red Hill market |
| `trading-status-press-2026-09-14` | `press` | Markets & Festivals — tender non-renewal, final market 7 Sept 2024 |

**Four supporting rows on the existing Hill & Ridge claims**, so the market that *is* running
gathers evidence rather than only the one that is not: the organiser FAQ ("Did the market at Red
Hill close?" / "Not ours … Season 3"), the Shire directory, ATDW, and MPNEWS dating the handover to
2024.

### The ceiling this moved, and why

`audit-claim-support.mjs` counts a claim `unbacked` when no standing evidence row supports it. The
`trading-status` ceiling was **0** — thirty-five claims, every one backed — set there deliberately
after PR #417 delisted a trading restaurant for a day on a four-month-old desk judgement, so that
the next status claim landing with nothing behind it would fail the build.

**One landed. It is this one, and the ceiling went to 1.**

That is the gate working, not the gate being worked around. Zero was reachable by exactly two
routes and both are the failure the registry exists to prevent: decline to file the finding, or
soften the claim statement until the evidence appears to back it. *A monthly artisan market trades
at that reserve on the first Saturday* would have passed cleanly and been true — and would have
quietly deleted the entire finding, which is about the **name** and the **operator**, not about
whether anything happens there.

What the 1 still buys: the **second** unbacked `trading-status` claim fails the build; this one is
named by `claimId` in the JSON report; and the ceiling returns to 0 the moment the A25 decision is
taken, with no re-seed needed. The rationale is written into the gate's own header where the next
person will read it, not only here.

### What was deliberately not filed

The **address** discrepancy (172 versus 184) and the **coordinates** discrepancy (3.0 km) are real,
sourced, and would each need a claim whose only evidence disputes it — pushing two more ceilings
that were itemised only this morning by the PI-005 address pilot. Both are recorded here and both
should be picked up by that pilot's queue, where the class already has a home and a method. Filing
them from this branch would have moved three ceilings for one finding.

---

## 8. What this report cannot tell you

- **Whether a market trades at that reserve on any particular Saturday.** Nothing here is
  time-driven; the season is reported as a date range and never evaluated against a clock. The
  organiser publishes eight dates for 2026–27 and one published exception — no market on 6 March,
  for the Red Hill Show — which our Hill & Ridge record does not carry.
- **Whether the Red Hill Community Market will return.** Its operator says "until a new location is
  found". That is a statement about intent, not a date, and it is the reason the claim above is
  written as disputed rather than retired.
- **Which street number is the reserve.** Every external source says 184. Our venue record says 172.
  This report establishes the disagreement, not the answer; nobody stood at the gate.
- **Whether the 200-stall figure ever applied to Hill & Ridge.** It is carried on the Red Hill
  Market record and attributed to nothing. No source read today gives a stall count for either
  market. If the rename proceeds, that figure and the "Victoria's Largest Artisan Craft Market"
  award string travel with a record whose subject has changed, and neither has a source.
- **Whether any of this is visible to a reader.** The `sourceStatus: unsourced` flag and the
  editor's note have been on the venue record since 2026-09-13. Whether the venue page surfaces
  that to a reader, or renders as normal, was not tested here.

---

## 9. The recommendation, stated for the register

**Recommendation.** Treat the Red Hill Community Market® and the Hill & Ridge Community Market as
two different markets, of which one has closed at that ground. Rename `venues/red-hill-market` to
the Hill & Ridge Community Market, operated by the Red Hill Agricultural & Horticultural Society,
keeping the slug and setting `previousSlug` so the 17 articles' links and both guide pages keep
resolving. Correct the address to 184 Arthurs Seat Road, the hours to 9am–2pm, the season to
September–May, and add the organiser's website, email and phone — which closes one of A27's
thirteen unreachable venues and the only one of the six markets that can be closed today. Fold the
one-instance Hill & Ridge event record into the recurring one. Fix "third Saturday" in
`tour-packages/long-weekend.json` and "year-round" and "8am–1pm" in the two market guides whatever
else is decided, because those are wrong against our own corpus independently of the identity
question. Handle `insider-picks-2026-09-05.md` separately and by hand.

**Confidence.** High. Four publishers, including the closed market's own operator and the council
that owns the ground, agree; no source read today places a market of that name at that reserve; and
the organiser of the market that is there answers the question directly in its own FAQ. The residual
uncertainty is about lineage — whether Hill & Ridge is legally a continuation — and it changes the
copy, not the recommendation.

**What would settle it.** One phone call to (03) 5989 2357. Ask whether the market at the reserve is
a continuation or a new market, and whether anything called Red Hill Market trades there. The number
is published, and it is the number A27 says this whole category does not have.

**Cost of being wrong.** Acting on it and being wrong misnames a running market and still lands the
reader at a market that is happening, on the right morning, and is reversible in one commit. Not
acting and being wrong sends readers an hour down the highway, on a Saturday, on the strength of
`FAQPage` markup built to be quoted by a search engine, to a market its operator says has not been
there since 7 September 2024 — and, because all six markets in this corpus have no contact route,
with nobody to ring when they get there.

---

## The method

No tool was written and no gate was added. This is an inventory of a state of the world, and the
world is allowed to be in a bad state without turning the build red.

Every count above is a property of the files on disk. The article inventory is
`grep -ril "red hill market\|red-hill-market" src/content/articles/`, classified by hand into
recommendation and contrast; the template inventory is
`grep -rlE "Red Hill (Community )?[Mm]arket" src/pages src/components src/lib`. The 3.0 km is a
haversine between the two coordinate pairs the two records carry. Nothing here reads a clock: the
season is reported as a range and never evaluated against today, per the standing rule that nothing
time-driven may be asserted.

Ten URLs were probed on 2026-09-14 by `scripts/probe-link-health.mjs`, as a separate deliberate
command that is never part of a build. Eight answered, one is bot-walled and one does not resolve.
The two that did not answer are named in section 3 and cited nowhere. Nothing in this report rests
on a page that was not fetched.
