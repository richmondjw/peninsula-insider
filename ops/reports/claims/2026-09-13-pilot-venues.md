# PI-005 Stage 2 pilot: venue claims

Third hand-sourced pilot of the claim registry, run on 13 September 2026 (UTC) against the branch
`pi/005-pilot-venues`. The first pilot took the Pt. Leo Estate sculpture park cluster
(`2026-09-13-pilot-pt-leo-sculpture-park.md`) and the second migrated the published events
collection (`2026-09-13-pilot-events-migration.md`). This one takes the `venues` collection and
the three classes it actually asserts: `trading-status`, `opening-hours` and `booking`.

Unlike the first two pilots, this branch also carries Stage 3: the gate that makes the registry
cost something (`next/scripts/audit-claim-support.mjs`). The numbers below are the ones the ratchet
baseline was seeded from.

## Why these five venues

Five venues were chosen to exercise the paths that matter rather than the paths that are easy:
one estate whose records were known to disagree with each other (Montalto), one venue whose
operator publishes a clean weekly pattern (Jetty Road), one whose operator publishes no hours at
all while the corpus publishes hours for it (Paradigm Hill), one large operator whose hours the
corpus subtly overstates (Peninsula Hot Springs), and one whose operator this pipeline cannot read
at all (Foxeys Hangout).

**On closure and status claims.** PR #417 delisted a trading restaurant for a day on a four-month
old desk judgement that turned out to be a rebrand. Two consequences for this pilot. First, every
`trading-status` claim here is backed by a read of the operator's own current site and nothing
else — no aggregator, no search summary, no directory. Second, no venue was marked closed, and no
`trading-status` claim was written where the operator's site carries no recency signal. Paradigm
Hill is the case: the site is live and states its cellar door policy in so many words, but its
newest content announces a 2022 vintage as the *next* release and its images carry 2023 asset
versions. That is enough to source a booking policy, which is stable, and not enough to assert
this week's trading, which is not. The claim was not written. An absent claim is a visible gap;
a thin one is a false clean bill of health.

## What was written

Twelve claims and nine evidence rows, all `origin: authored`. Every evidence row is a direct read
of the operator's own site — `venue-site`, the top of the precedence table for all three classes.

| Claim | Class | Standing support | Derived state |
|---|---|---|---|
| `venues/montalto/trading-status` | trading-status | 1 supports | supported |
| `venues/montalto/opening-hours` | opening-hours | 1 supports | supported |
| `venues/montalto/booking` | booking | 1 supports | supported |
| `venues/jetty-road-brewery/trading-status` | trading-status | 1 supports | supported |
| `venues/jetty-road-brewery/opening-hours` | opening-hours | 1 supports | supported |
| `venues/jetty-road-brewery/booking` | booking | none | **unsupported** |
| `venues/paradigm-hill/booking` | booking | 1 supports | supported |
| `venues/paradigm-hill/opening-hours` | opening-hours | 1 disputes | **unsupported** |
| `venues/peninsula-hot-springs/booking` | booking | 1 supports | supported |
| `venues/peninsula-hot-springs/opening-hours` | opening-hours | 1 disputes | **unsupported** |
| `venues/foxeys-hangout/opening-hours` | opening-hours | none | **unsupported** |
| `venues/foxeys-hangout/booking` | booking | none | **unsupported** |

Five publishers read on 13 September 2026 (UTC), all of them the operator:
`montalto.com.au` (two pages), `jettyroad.com.au`, `paradigmhill.com.au`,
`peninsulahotsprings.com` (two pages), and `foxeys-hangout.com.au`, which refused.

## What the evidence settled

**Montalto's cellar door hours were wrong on the record that renders.** Two records in this corpus
asserted different hours for the same cellar door. The orphaned fact layer already carried the
operator's split weekday and weekend hours; `venues/montalto.json`, which is the record that
renders and emits `openingHours` into JSON-LD, carried a flat 11am–5pm across all seven days. The
operator lists five venues on the estate separately, and the cellar door is weekdays
11.30am–4.30pm, weekends 11am–5pm. The venue record was corrected on this branch. The wider point
is on the evidence row: one `openingHours` field on one venue record cannot represent an estate
whose restaurant, piazza, cellar door, picnics and sculpture trail all keep different hours.

**Montalto's maximum tasting group is six, not eight.** The record's `tastingNote` and its FAQ both
said one to eight. The operator states one to six twice, once as the booking range and once as
"the maximum group size we can cater to for tastings is 6 people". Corrected on this branch, in
both places. Walk-ins are welcome and a booking is not required, which the record already had right.

**Jetty Road's hours are exactly what the record says.** Wednesday and Thursday midday–9pm, Friday
and Saturday midday–11pm, Sunday midday–8pm, Monday and Tuesday closed — the closure the record
expresses by omitting those days. The operator publishes current weekly hours, the street address
the record carries, and a July 2026 menu, which is also what backs the trading-status claim.

**Paradigm Hill requires an appointment, and publishes no hours at all.** The operator states, in
these words, that its cellar door is "open only by appointment", and gives a phone number and an
email to make one. The record's `bookingRequired: true` is right. Its `openingHours` array —
every Saturday and Sunday, midday to 5pm — is contradicted, and the evidence row is a `disputes`
row rather than a correction, because the operator saying there are no published hours does not
say what the hours are. The record also contradicts itself: its own `tastingNote` limits walk-in
access to the first weekend of each month, while the `openingHours` array beside it asserts every
weekend, and the array is the field that reaches JSON-LD.

**Peninsula Hot Springs is open later than a bath house is.** The opening times on the record match
the operator's Bath House exactly — 7am Monday to Friday, 5am at weekends — and so do the 11pm
closes on Monday to Thursday and Sunday. The 2am closes the record asserts for Friday and Saturday
do not: the operator publishes 2am only for Moonlit Bathing, a separate 10pm–2am ticketed session
on those two nights, while the Bath House still closes at 11pm. The record flattens a distinct
ticketed session into the venue's general opening hours. No record was changed, because deciding
what `openingHours` means for a site with four differently-timed facilities is an editorial call,
not a correction. Booking is recommended and not required: the operator prices a same-day booking
10% higher rather than refusing it.

## What could not be sourced, and why

**Foxeys Hangout — the operator is unreadable from here.** `foxeys-hangout.com.au`, its `www` host
and its apex all sit behind a challenge interstitial: a direct read returns HTTP 403 to one client
and an HTTP 202 CAPTCHA stub to another, with no page content in either. The state tourism body's
listing was refused the same way. No evidence row was written. A search engine's summary of a page
is not a reading of it, and the precedence table puts `venue-site` at the top of `opening-hours`
precisely so that a second-hand restatement cannot be filed as if it were the operator.

So the corpus publishes seven-days 11am–5pm hours and a no-bookings policy for a venue nobody here
has been able to read. The two claims are on disk and unsupported, which is the honest output. The
two records also disagree with each other: the fact layer says the kitchen runs Friday to Monday
with tastings daily, the venue record says seven days flat, and the fact layer cites a third domain
that is not the one the venue record links to.

That third domain is worse than unreachable, and it is the one finding on this venue that could be
established. `src/data/facts/wine.json` cites `https://www.foxeys.com.au` as its source for the
Foxeys Hangout entry. The host resolves, refuses TLS on 443 entirely, and over plain HTTP serves a
14-line frameset pointing at a Netregistry BizCard placeholder — a parked domain, not a site. So
the fact layer's hours for this venue are attributed to a citation that cannot have been read at
the address it names. No evidence row was written against the `trading-status` claim on that record
either: a parked *citation* says nothing whatsoever about whether the *venue* is trading, and
inferring closure from a dead link is the exact move that delisted a trading restaurant in PR #417.
Resolving Foxeys needs a phone call or a visit — both are publisher kinds the table already ranks
above everything but the site itself.

**Jetty Road's booking requirement.** The operator carries a "book now" link into SevenRooms and
says nothing anywhere about whether a booking is required. The record asserts
`bookingRequired: false`, which is a positive assertion to a reader planning a Friday night, and it
is asserted by that one record alone. The claim was written with no evidence attached rather than
backed by the absence of a statement.

**Address is asserted by every venue and has no claim class.** All 137 venue records carry a street
address; `claimClass` has no value for it. Three addresses were confirmed against the operator in
passing (Jetty Road, Montalto, Peninsula Hot Springs) and none could be filed. Adding a class is a
schema edit to `content.config.ts` plus a precedence entry, and it is out of scope here. Noted so
the gap is visible rather than silently absent.

**Accessibility was not touched.** The `venues` collection asserts nothing about access — the 29
unbacked `accessibility` claims in the registry are all on `events`. A venue pilot cannot source a
class its collection does not assert.

## What this does to the gate

The five unbacked claims above are the ratchet's seed, not a regression:

| Class | Unbacked on `main` | Unbacked here | Baseline ceiling |
|---|---:|---:|---:|
| `accessibility` | 29 | 29 | 29 |
| `opening-hours` | 1 | 4 | 4 |
| `booking` | 0 | 2 | 2 |
| `event-schedule` | 1 | 1 | 1 |
| `trading-status` | 0 | 0 | **0** |

`opening-hours` rises by three and `booking` by two. That is the price of writing an assertion down
before it can be sourced, and it is the right price: before this branch those five facts were being
published with nothing behind them *and* no record that anyone had noticed. `trading-status` — the
class PR #417 was about — stays at a ceiling of zero across all 35 claims, so the next
`trading-status` claim that lands without a source fails the build.
