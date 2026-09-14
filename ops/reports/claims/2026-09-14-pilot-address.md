# PI-005: the address and coordinates claim classes, and a hand-sourced pilot

Fourth hand-sourced pilot of the claim registry, run on 14 September 2026 (UTC) against the branch
`pi/005-address-class`. The three before it were the Pt. Leo Estate sculpture park cluster
(`2026-09-13-pilot-pt-leo-sculpture-park.md`), the events migration
(`2026-09-13-pilot-events-migration.md`) and the venues collection
(`2026-09-13-pilot-venues.md`).

The venue pilot closed on a gap it could see and could not fill:

> **Address is asserted by every venue and has no claim class.** All 137 venue records carry a
> street address; `claimClass` has no value for it. Three addresses were confirmed against the
> operator in passing (Jetty Road, Montalto, Peninsula Hot Springs) and none could be filed.

This branch fills it. It adds two classes rather than one, sources ten venues by hand, and moves
both classes onto the build gate.

## Why two classes

`address` and `coordinates` are separate claims about the same thing and they fail separately.

The build already looks at coordinates, in `next/scripts/lint-coordinates.mjs`. It is a bounding box
around the Peninsula - latitude -38.6 to -38.1, longitude 144.6 to 145.35 - and its own header says
what it cannot do:

> This is a COARSE gate, not a land/water check. A coordinate can pass this script and still be in
> the bay - see the Point Nepean incident (2026-08-21): four entries were geocoded from a park-level
> address rather than the specific site, which was within bounds but landed pins in the water.

That box is roughly 70 km on its long axis. Any error smaller than that is invisible to it, and
every location error anyone has actually found here is smaller than that. A record can carry a
correct street address and a pin over seven kilometres from the door, and one of the ten venues
below does exactly that.

Folded into a single class, the operator's correct street line would have counted as standing
support for the wrong pin. That is not a hypothetical about the schema; it is how the gate's measure
works - a claim is backed when any standing row supports it. So: two classes, and the audit script's
test suite asserts that a supported address does not back that venue's coordinate.

The precedence orders differ at the top for the same reason.

| Rank | `address` | `coordinates` |
|---:|---|---|
| 1 | `venue-site` | `gov` |
| 2 | `visit` | `visit` |
| 3 | `gov` | `venue-site` |
| 4 | `phone` | `organiser` |
| 5 | `email` | `phone` |
| 6 | `organiser` | `email` |
| 7 | `partner` | `partner` |
| 8 | `regional-body` | `regional-body` |
| 9 | `press` | `press` |
| 10 | `ticketing` | `ticketing` |
| 11 | `social` | `social` |
| 12 | `importer` | `importer` |
| 13 | `unknown` | `unknown` |

**Address leads with the occupier.** A business publishes its own address and wants to be found; no
other party has both the knowledge and the motive. `visit` is second because someone stood at the
door, and a reading taken at the door cannot be a transcription of somebody else's listing. `gov` is
third and not first: a council or state address register is the only kind that can settle whether a
street exists in that town at all - which is a failure no other kind catches - but it lags a tenancy
change by months and routinely carries the owner's address rather than the trading name. `social` is
near the bottom because a profile's location field is usually a suburb or a landmark.

**Coordinates lead with the public authority,** and this is the inversion that matters. A state
address-point or cadastral dataset publishes a coordinate as a measured property of a parcel. Every
other kind publishes it as a byproduct of geocoding a string. `venue-site` therefore drops from
first to third: an operator's embedded map pin is very often a geocode of its own address line, no
better than ours. `importer` - our own pipeline - is second from the bottom on purpose, because that
geocode is where nearly every coordinate in this corpus came from, and geocoding a park-level
address is precisely what put four pins in the bay on 21 August.

**`partner` is seventh in both, deliberately.** It is ranked *second* for `trading-status`,
`opening-hours` and `access-restriction`, above a news report and above our own visit. That ranking
is decision A29 on James's register and is not settled. It has not been changed here and it has not
been copied here. A partner reporting its own address is as well informed as its own site, but
nothing distinguishes that report from its marketing copy, and PI-021's commercial firewall says a
commercial relationship may not buy precedence. The test suite asserts `partner` stays outside the
top three of both classes; it asserts nothing about the three existing classes, which are not this
branch's business.

## Why those expiry windows

**`address`: 180 days.** An address changes when a business moves, changes hands, or a street is
renumbered. That is rarer than whether the doors are open (`trading-status`, 90 days) and commoner
than a ramp or a bag limit (`accessibility` and `fishing-rule`, 365). 180 also costs nothing to
honour: the operator's own site is already being read twice a year for the classes above, and the
address is on the same page.

**`coordinates`: 365 days.** A coordinate for an unchanged address does not decay at all. The ground
does not move; the failure mode is being wrong from birth, which no expiry window can catch. So this
window is not a freshness measure - it is a re-check cadence against the address claim beside it,
and it is finite rather than absent so that a moved venue's pin cannot stay green for a second year.

**Neither window can fail a build, ever.** Expiry is computed, reported, and never asserted. The
gate's measure is whether a claim has standing supporting evidence *at all*, with expiry deliberately
excluded, so the same tree audited on any date returns the same numbers. `claim-class-location.test.mjs`
runs the same fixture with `--today` a decade apart and requires byte-identical gated output, plus a
counter-assertion that the reported half did move.

## What was written

Twelve claims and thirteen evidence rows, all `origin: authored`, across ten venues. Nine rows are
the operator's own site read first hand; two are Parks Victoria, which for the Discovery Tents is
both the occupier and the land manager.

| Claim | Class | Standing support | Derived state |
|---|---|---|---|
| `venues/montalto/address` | address | 1 supports | supported |
| `venues/peninsula-hot-springs/address` | address | 1 supports | supported |
| `venues/flinders-hotel/address` | address | 1 supports | supported |
| `venues/stringers-sorrento/address` | address | 1 supports | supported |
| `venues/arthurs-views/address` | address | 1 supports | supported |
| `venues/cassis/address` | address | 1 supports | supported |
| `venues/point-nepean-discovery-tents/address` | address | 1 supports | supported |
| `venues/woodman-estate/address` | address | 1 disputes | **unsupported** |
| `venues/iluka-retreat/address` | address | 2 disputes | **unsupported** |
| `venues/birch-creek/address` | address | 1 disputes | **unsupported** |
| `venues/point-nepean-discovery-tents/coordinates` | coordinates | 1 supports | supported |
| `venues/iluka-retreat/coordinates` | coordinates | 1 disputes | **unsupported** |

Ten publishers read on 14 September 2026 (UTC): `montalto.com.au`, `peninsulahotsprings.com`,
`flindershotel.com.au`, `stringerssorrento.com.au`, `arthursviews.com.au`, `cassisredhill.com.au`,
`parks.vic.gov.au`, `woodmanestate.com.au`, `birchcreek.com.au`, and `ilukaretreat.com.au` twice.

One citation was new to the corpus and was probed into the link-health ledger before it could be
cited: `https://www.ilukaretreat.com.au/contact`, verdict `ok`, HTTP 200, redirecting to
`ilukaretreat.com.au/contact-us/`. Every other URL cited here already carried an `ok` ledger row.

## What the evidence settled

**Iluka Retreat is filed under the wrong town, and its pin is 7.6 km from the operator's own.**
The record says `Red Hill South VIC 3937`. The operator's contact page says
`20 Shoreham Road, Shoreham, VIC. 3916`. Its home page says `20 Shoreham Rd, Red Hill South, VIC 3916` -
the record's locality carrying the contact page's postcode - and embeds a Google Maps link whose
place label is `20 Shoreham Road, Shoreham VIC 3916`. The operator publishes the street consistently
and the locality inconsistently; the only value all three of its own forms share is postcode 3916,
which is not the 3937 on the record. Both readings are filed, as two rows rather than one, because
merging or superseding either would erase the fact that the operator contradicts itself.

The coordinate is the sharper failure. The operator's own map link resolves to
`-38.417723, 145.034479`. The record stores `-38.486, 145.043`. That is **7.63 km apart**, 7.59 km of
it latitude. Both points are inside the bounding box `lint-coordinates.mjs` enforces, so that gate
passed on this record today, passed on it on every previous build, and would pass on it however far
the pin drifted inside the box.

**And this corpus already held the answer.** `next/src/data/facts/accommodation.json`, entity F012,
carries `20 Shoreham Road, Shoreham`. The orphaned fact layer - no page, no reader, no route - was
right. The venue record, which renders, emits `openingHours` and address into JSON-LD and supplies
the map its coordinate draws, was wrong. One claim, two records asserting it, disagreeing; the claim
names both in `assertedBy`. No per-record provenance field can represent that, which is the argument
for a sidecar registry restated by a single venue.

**Woodman Estate publishes a postcode the record does not use.** The operator gives
`136 Graydens Rd, Moorooduc, Victoria 3933`; the record carries `Moorooduc VIC 3931`. The locality
agrees and the postcode does not, and the operator is the party that would know its own. Filed as a
dispute, not applied as a correction: the operator establishes that 3931 is not what it publishes,
and deciding what the record should say instead is an editorial act with a name on it.

**Birch Creek publishes no street address at all.** The only location its site gives is
`Mornington Peninsula, Victoria 3936`, and the record carries 3937. That is not enough to say where
Birch Creek is, and it is enough to say the record is unconfirmed by its own operator. Filed as a
dispute rather than left unevidenced deliberately: "somebody looked and the operator disagreed" and
"nobody has looked" are different facts, and the registry is supposed to tell them apart. The report
keeps them in separate columns and both location classes read 0 under `unevidenced`.

**Four records carry an address a machine cannot resolve to a door, and in every case the operator
publishes the street.** Stringers Sorrento (`Sorrento VIC 3943`; operator
`2-8 Ocean Beach Rd`), Arthurs Views (`Arthurs Seat VIC 3936`; operator `10 Nestle Court`), Cassis
(`Red Hill VIC 3937`; operator `164 Arthurs Seat Road`), and Flinders Hotel, whose record gives a
junction - `Corner of Cook & Wood St` - where the operator gives `23 Cook St`. All four are filed as
supported, because the locality each record asserts is confirmed, with the omission written onto the
evidence row. The consequence is worth stating plainly: a coordinate stored beside a locality-only
address cannot have been derived from that address. Twenty-four of the 137 venue records are in this
shape.

**Montalto is the control.** Its record carries `33 Shoreham Rd, Red Hill South VIC 3937` and the
operator publishes it back word for word. A pilot made only of failures says nothing about whether
the class can hold a healthy claim.

## What could not be sourced, and why

**No coordinate has a primary source better than a mapping byproduct.** This is the honest blind
spot of the pilot and it is structural, not an omission. Of the ten venues read, exactly one
publishes anything resembling a coordinate for itself (Iluka's embedded map link, which is a geocode
of its own address string), and one public authority publishes one (Parks Victoria). Nobody else
publishes latitude and longitude anywhere. The kinds that could settle a coordinate properly are the
two at the top of the class's precedence and neither is available from a desk:

- `gov` - Vicmap Address and the state cadastre publish address points as measured parcel
  properties. They are not fetchable as a document; reaching them needs a spatial query against a
  GIS service, which is a piece of work, not a read.
- `visit` - a fix taken at the door. The class ranks it second precisely because it is the only kind
  that can catch an in-bounds pin on the wrong side of the water, and it is the only kind this
  pipeline categorically cannot produce.

So the `coordinates` class ships with two claims where `address` ships with ten, and that ratio is
the finding, not a shortfall in effort.

**The Parks Victoria coordinate supports its claim and cannot settle it.** Parks Victoria publishes
`-38.3131, 144.69` for the Discovery Tents; the record stores `-38.3127, 144.6934`, 300 m away. The
longitude is given to two decimal places, a rounding cell of plus or minus 0.005 degrees - about
550 m at this latitude - so the source is consistent with the record and cannot resolve anything
finer than roughly half a kilometre. The Point Nepean entries that landed in the bay on 21 August
were wrong by less than that. It is filed as support and bounded in the same breath on the row.
The best available remote kind, at the top of the class's precedence, still cannot see the failure
the class exists for. That is the argument for `visit` sitting second, written down where the next
person will find it.

**The other 127 venues.** This pilot sourced ten. The remaining 127 address assertions and 135
coordinate assertions are not claims yet - they are unfiled, which is a different state from
unsupported, and the registry cannot see them at all. Filing them without sourcing them would put
137 unbacked claims on the board and force the ceiling to 137, which would be worse than the silence
it replaced. See the open question below.

## What this does to the gate

| Class | Unbacked on `main` | Unbacked here | Baseline ceiling |
|---|---:|---:|---:|
| `accessibility` | 28 | 28 | 29 |
| `opening-hours` | 4 | 4 | 4 |
| **`address`** | n/a | **3** | **3** |
| `booking` | 2 | 2 | 2 |
| **`coordinates`** | n/a | **1** | **1** |
| `event-schedule` | 1 | 1 | 1 |

`address` is ceilinged at 3 and `coordinates` at 1, and both ceilings are **itemised, not
inherited**. Every claim in both classes was filed with an evidence row attached. The four that
count as unbacked are unbacked because the row *disputes* the record - a contradiction is not
support, and the gate is right to say so - and both classes read 0 in the `unevidenced` column,
which is the column that means "nobody looked".

Zero was available for both and would have been a lie. It was reachable only by declining to file
the four findings, which is the failure this whole programme exists to stop. What the non-zero
ceiling still buys is that the classes are now **listed**: the fourth unbacked `address` claim and
the second unbacked `coordinates` claim fail the build, and the four already here are named by
`claimId` in the JSON report every run.

Each of the four is one record edit from resolution, so these are the ceilings in the table most
likely to be wrong soonest. They should be tightened as each dispute is settled. Settling one does
not require re-seeding the baseline: a class may sit below its ceiling, and
`audit-claim-support.test.mjs` explains at length why demanding equality would turn every
improvement into a red build.

`accessibility` is left at 29 although the corpus now sits at 28. Tightening a class this branch did
not touch would be a gift to nobody and a trap for whoever merges next.

## Open questions

1. **Should the seed script mint address and coordinates claims for the whole corpus?**
   `scripts/seed-claim-registry.mjs` maps record fields to claim classes; adding `address` and
   `coordinates` to that map would file 137 of each in one run, every one unbacked, and force both
   ceilings to 137. Recommended default: **no.** File them as they are sourced, collection by
   collection, and keep the ceiling meaningful. The alternative view - that 274 visible unbacked
   claims are better than 274 invisible unfiled ones - is real, and it is James's call.
2. **The three disputed records.** Iluka Retreat, Woodman Estate and Birch Creek carry addresses
   their own operators contradict. This branch did not change them; it recorded the disagreement.
   Recommended default: correct Iluka to the operator's `20 Shoreham Road, Shoreham VIC 3916` and
   its coordinate to the operator's pin, since the fact layer already agrees and the record is over
   seven kilometres out; hold Woodman and Birch Creek for a phone call, because a postcode
   disagreement with no street attached is thinner evidence than a moved pin.
