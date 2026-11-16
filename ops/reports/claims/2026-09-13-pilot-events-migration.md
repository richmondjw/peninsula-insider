# PI-005 Stage 2 pilot: the published events collection

Second pilot of the claim registry, run on 13 September 2026 against the branch `pi/005-pilot-events`.

The first pilot asked what a claim costs to research. This one asks the question the programme
actually turns on: what a claim costs when the corpus already carries a source URL and a date, and
the human is confirming rather than researching. The subject was chosen for volume and for being
mostly scriptable.

Nothing here is wired into the build. Enforcement is Stage 3.

## The real set, which is not the set the brief assumed

The brief said "roughly 41 published events, most of which already carry a source URL, a
last-checked date and accessibility notes". The corpus disagrees in a way that matters.

| | Count |
|---|---:|
| Event JSON files on disk, including `events/archive/` | 119 |
| Records whose `status` resolves to `published` | **52** |
| of those, carrying an explicit `status` key | 41 |
| of those, published only because the Zod default says so | **11** |
| Carrying `primarySourceUrl` | 40 |
| Carrying `lastCheckedDate` | 40 |
| Carrying `accessibilityNotes` | 40 |
| Carrying all three | **40** |
| Carrying `secondarySourceUrl` | 21 |
| Carrying the full importer triple (`provenance` + `source` + `sourceUrl`) | 11 |
| Carrying a `verification` enum value | **0** |
| Carrying free-text `verificationStatus` with no enum | **13** |

Where 41 comes from is worth stating, because it is the same defect the ticket was opened about.
Forty-one records carry an explicit `status`; eleven more are published by schema default, exactly
as 136 venues assert "this business is trading" by omission. The eleven are the importer's, and
they are a different population: no `status`, no `primarySourceUrl`, no `lastCheckedDate`, no
`accessibilityNotes`, a `discoveredAt` instead, and a ticketing URL rather than an organiser one.
The corpus has two kinds of event record and one status field that cannot tell them apart.

The free-text verification count is 13, not 12. Two of the thirteen express a cancellation, which
is the trap the brief warned about, and one of those two is worse than the brief knew. See below.

## What was written

| | Claims | Evidence rows |
|---|---:|---:|
| Migrated by `scripts/migrate-event-claims.mjs` | 127 | 149 |
| Deferred to rows the first pilot had already authored | 3 | 4 |
| Authored by hand in this pilot | 5 | 7 |
| **Total added on this branch** | **132** | **160** |

The migration covers four claim classes, chosen because the Stage 1 seed could not reach them: the
fields that assert them are not the fields that carry a URL. `event-status` is untouched, because
the seed already emits it for every event carrying a source.

| Class | Claims | Rows | Derived state at 13 Sep 2026 |
|---|---:|---:|---|
| `event-schedule` | 39 | 69 | 28 unsupported, 11 supported |
| `booking` | 30 | 41 | 28 unsupported, 2 supported |
| `rate-change` | 29 | 39 | 29 supported |
| `accessibility` | 29 | **0** | 29 unsupported |

**Eighty-four of the 149 migrated rows, 56 percent, were already expired the moment they were
written.** Expiry is computed from the date the record itself carried, not from the run date, and
the corpus's own dates are mostly 4 May 2026. The seed found the same thing at 69 percent. This
pilot confirms it on a second, differently shaped population.

State does not track the class evenly, and the reason is the precedence table rather than the
corpus. `rate-change` evidence lasts 180 days and every rate row is still live; `booking` lasts 60
and almost none is. Whether a booking requirement really goes stale in sixty days while a rate
basis survives a hundred and eighty is a question the table answers by assertion. It should be
revisited before Stage 3 sets a gate, because those two numbers alone move 28 claims across the
supported line.

## Accessibility: the class the corpus cannot source

Forty published records publish an access note. **Not one of them cites a source for it.**

The migration writes the claim and attaches nothing. That is deliberate and it is the most
important line in this report. An event listing is evidence for the event's dates by construction;
it is not evidence that somebody read an access statement on it. Attaching the record's listing URL
anyway would have produced 29 sourced-looking accessibility claims in about a second, and every one
of them would have been manufactured. The claims therefore derive as `unsupported`, which is the
honest answer and the one that makes the gap countable.

The first pilot found accessibility sourceable for one subject with a good website. That still
holds. What this pilot adds is the scale of the gap: the corpus states access for 40 events and
cites nothing for any of them, so the class is empty for a reason no migration can fix.

## What the script refused, and why refusing is the deliverable

Ten of the 52 published records were held back with no claim written, and two more had a single
class held back. None of these is a script fault.

| Record | Why |
|---|---|
| `main-street-mornington-festival-2026` | `cancelled` flag set, and prose confirms it |
| `mornington-racecourse-market` | prose carries a cancellation signal that nothing else in the build can see |
| `emu-plains-market` | hedged prose ("Tentative"), and a near-duplicate |
| `emu-plains-market-balnarring` | near-duplicate of the above: same primary source, near-identical title |
| `peninsula-summer-music-festival-2027` | self-flagged possible duplicate, and a near-duplicate |
| `peninsula-summer-music-festival-2027-save-the-date` | the other half of that pair |
| `peninsula-hot-springs-daily-studio-yoga` | self-flagged possible duplicate |
| `peninsula-hot-springs-hot-springs-yoga-complimentary` | the other half of that pair |
| `red-hill-brewery-secret-stash-weekend` | prose says the 2026 dates are estimated from the annual pattern |
| `the-bloody-long-walk-mornington-peninsula-2026` | prose holds an unresolved date disagreement |
| `pst-art-exhibition-opening-night-2026` | `event-schedule` only: its hours live in `summary`, not in `startTime` |
| `red-hill-market-first-saturday` | `event-schedule` only: its hours live in `editorNote`, not in `startTime` |

**The cancellation trap is real and it is worse than the brief stated.** `mornington-racecourse-market`
carries `verificationStatus: "Updated after organiser cancellation notice"`. The repo's own shared
reader, `isCancelledRecord` in `src/lib/event-occurrence.mjs`, tests `/cancelled/i`. The string
"cancellation" does not match "cancelled", so **the site currently treats that record as running**,
and a bulk migration would have written "Mornington Racecourse Market runs on 14 June 2026, 9am to
2pm" with a council citation attached to make it look checked.

The migration reads cancellation deliberately wider than the site does, matching the stem `cancel`,
because the two decisions have opposite failure costs. The site's reader decides what to delist and
a false positive hides a live event. This one decides what to assert, and a false negative publishes
a sourced claim that a cancelled event is running. A false positive here costs one held-back record
and a line in this table. No content record was changed and the regex in `event-occurrence.mjs` was
not touched: whether that market is cancelled is an editorial question, and it is in the list for
James below.

## Four published records rest on one third-party page

An earlier version of the hold-back rule treated any shared primary source as a duplicate and held
back four market records that are not duplicates at all. They simply all cite the same aggregator.
The rule now requires a near-identical title as well, and the shared-source groups are reported
instead.

| Records | Shared primary source |
|---:|---|
| 4 | `https://peninsulakids.com.au/markets-3/` |
| 2 | `https://www.mornpen.vic.gov.au/Events-Activities/Emu-Plains-Market-3` |
| 2 | `https://www.peninsulafestival.com.au` |
| 2 | `https://www.peninsulahotsprings.com/bathe/wellness-activities` |

Crib Point, Rosebud, Mt Eliza and Tootgarook are four separate markets whose only cited source is
one page on a third-party parenting site. That is not a duplication defect; it is a concentration
risk, and it is invisible until you ask the registry the question.

## How much of the existing citation I actually verified, stated plainly

Two different numbers, and conflating them would be the easiest way to overstate this pilot.

**Reachability was measured across the whole set, by machine.** The 52 published records cite 77
distinct URLs. Every one was fetched on 13 September 2026.

| Result | URLs |
|---:|---|
| 51 | Returned substantive server-rendered text |
| 13 | HTTP 403, bot protection. Nine of the thirteen are `mornpen.vic.gov.au` |
| 7 | HTTP 202 with an all but empty body, a client-rendered shell |
| 3 | HTTP 200 with an all but empty body, the same thing by another route |
| 1 | HTTP 400 (a Facebook page) |
| 1 | Connection failed outright (`www.redhillmarket.com.au`) |
| 1 | **HTTP 404. The citation is dead** |

**Twenty-six of 77, 33.8 percent, cannot be read first hand by machine.** PI-006 put that figure at
roughly 30 percent across the corpus. This is an independent measurement on a different collection
and it lands in the same place.

`mornpen.vic.gov.au` is the single most-cited host in the collection, at 21 citations, and it is
403 to everything. The council is the top-ranked publisher kind for `access-restriction` and it
sits fourth for `event-schedule`. The pattern from the first pilot repeats exactly: the most
authoritative source available is the one least reachable.

The dead one is `https://events.humanitix.com/pub-carols-thursday-17th-december`, cited by
`pub-carols-thursday-17th-december`. Its migrated evidence row says `supports` and points at a 404.
Nothing in the schema can express that today.

**Content comparison was a spot-check and it was small.** I read the published text of **4 of the 77
cited URLs, 5 percent**, covering **7 of the 52 published records, 13 percent**. Three further
sources were read that the corpus does not cite, used as substitutes where the record's own citation
could not be read. Every other migrated row transcribes a citation a human once wrote down, without
anybody in this pilot re-reading the page it points at. That is the correct description of what a
migration is, and it is not the same thing as verification.

## What the spot-check found

Four records out of seven were wrong, unsettled, or answerable, which is a high strike rate for a
sample of seven and an argument for a larger one.

**The Peninsula Summer Music Festival ends a day earlier than we publish.** The organiser's own home
page publishes "Save the date: 2-10 January 2027". Both records carry 2 January to **11** January.
The start agrees, the end does not. The claim is written with a single `disputes` row and derives
`unsupported`, because nothing supports the end date we publish. No record was changed on a dispute.

**The Main Street Mornington Festival cancellation is confirmed, first hand, today.** The organiser
states the 2026 festival will not go ahead and that the funding could not be secured. The same page
announces the next festival as Sunday 17 October 2027 and confirms the usual third-Sunday-of-October
pattern and the 11am to 5pm hours, which match the record. The seeded `event-status` claim carried
an August date; an authored supporting row now carries a September one.

**The hot springs "possible duplicate" pair is not a duplicate.** Both records carry an
`internalNotes` asking whether the other is the same offering. The operator's own wellness
activities page lists "studio yoga" and "hot springs yoga" as two separate entries on two different
bases. Two claims written, two supporting rows, question closed. The `internalNotes` were not
edited, because correcting editorial prose is not a registry act.

**The Bloody Long Walk date disagreement is settled in the record's favour.** Its `internalNotes`
record 25 October against 18 October and ask for confirmation before publishing. A listing read
first hand on 13 September publishes "Oct 25, 2026 - Sunday", 35k, at Safety Beach. The record is
right. The organiser's own page answers a direct fetch with a ten-character body, so this is the
strongest source that could actually be read, and the row says so in its `method`.

## What stayed disputed

**The Mornington Racecourse Market hours.** Two third-party listings, read first hand on the same
day, disagree with each other: one publishes 9am to 2pm, agreeing with the record; the other
publishes 10am to 3pm. The operator's own site returns a client-rendered shell with no readable
text, so the top-ranked source for this class cannot arbitrate. Both disagreeing rows are
`unknown` kind, so precedence ties and `deriveClaimState` correctly returns `disputed`.

This is a different dispute shape from the first pilot's and it is the more common one. Pilot one
found a publisher contradicting itself, which no precedence table can settle. This one finds two
weak sources contradicting each other while the strong source is unreadable, which precedence could
settle if only the strong source could be fetched. The first is a governance problem. The second is
a retrieval problem, and it is the same retrieval problem as the 26 unreachable URLs.

## Cost, split as the brief asked

Measured wall clock on 13 September 2026, one operator, machine assisted throughout.

### The scripted portion

| Phase | Minutes |
|---|---:|
| Read the design, the issue comments, the first pilot's PR and report, the registry schema, the precedence table and the state lib | 12 |
| Establish the real set: five scan passes over the corpus for counts, field coverage, duplicate candidates and citation hosts | 10 |
| Write `migrate-event-claims.mjs` | 18 |
| Two corrections after the first real run: defer to authored rows rather than failing, and stop the shared-source rule firing on an aggregator | 7 |
| Write `migrate-event-claims.test.mjs`, and repair the Stage 1 seed test the first pilot had already broken | 14 |
| **Total, one-off** | **61** |

Running it is not in that table because running it does not cost anything worth measuring. The
script reads 119 files and writes 280 in about a second. **127 claims and 149 evidence rows across
42 records, at a marginal human cost of zero.**

Amortised over what it produced, the script cost **0.48 minutes per claim** for this collection. It
is events-specific and the next collection will not reuse it verbatim, but the shape will: read the
fields, refuse the traps, anchor expiry to the record's own date.

### The human portion

| Phase | Minutes |
|---|---:|
| Source retrieval: 12 targeted status probes, a 77-URL reachability sweep, 9 attempted content reads of which 7 returned usable text | 16 |
| Author 5 claims and 7 evidence rows by hand, and verify their derived state | 6 |
| **Total, on 6 held-back records** | **22** |

- **Per held-back record: about 3.7 minutes.**
- **Per hand-authored claim: about 4.4 minutes.**
- **Per hand-authored evidence row: about 3.1 minutes.**

**That is worse per unit than the first pilot's 1.9 minutes per claim, and the reason is the whole
finding.** The script does not reduce the average cost of a claim. It removes the cheap claims from
the human's queue entirely and leaves the residue, which is by construction the contradictory,
hedged, duplicated and cancelled records. Per-unit human cost goes up because the mix got harder.

### What that means for the corpus

Across the 52 published records: 42 migrated at zero marginal human cost, 10 needed a human. At
3.7 minutes each, the human cost of evidencing this entire collection is **about 37 minutes**,
against the 61 minutes it took to write the tool. The tool pays for itself inside two collections.

Expressed per record across the whole set, the human cost is **about 0.7 minutes**, against the
first pilot's 25 minutes for a marginal hand-researched subject. That is a factor of roughly 35.

**Three caveats, and they are not small.**

1. **It buys a weaker guarantee.** The first pilot's minutes bought a page somebody read. These
   minutes buy a transcription of a citation somebody wrote down at some point, checked at 5 percent.
   A migrated row asserts that the record cited this URL for this field, not that the URL says what
   the record says. Anyone quoting 0.7 minutes per record has to quote that sentence with it.
2. **Fifty-six percent of what it produced was already expired.** The migration made the corpus's
   staleness visible; it did not make the corpus fresher. Refreshing those 84 rows is the recurring
   cost, and this pilot did not measure it.
3. **The residue does not shrink.** Ten of 52 needed a human this time. That ratio is a property of
   the corpus, not of the script, and it will not improve as the tool gets better.

## What this says about the question the pilot was run to answer

**Can the importer emit evidence natively? Yes, for three of the four classes, with one condition
that has to be honoured.**

`event-schedule`, `booking` and `rate-change` come out of fields the importer already writes,
carrying the source the importer already records and the date it already stamps. There is no
research step, and the marginal cost is a rounding error. An importer emitting these at write time
is a smaller change than this migration was.

`accessibility` cannot, and the reason is instructive rather than technical. The importer has no
source for it because the corpus has no source for it. Emitting a row anyway would be the failure
mode, not the feature.

The condition is the refusal logic. **An importer that emits evidence must also be able to decline
to.** Thirteen of these 52 records carry their verification state as prose with no enum behind it,
and two of those express a cancellation that no field records. An emitter without a hold-back rule
would have written sourced-looking assertions for both. The value of this pilot is not the 149 rows;
it is the ten records the script would not touch.

## Method notes for Stage 3

**Retrieval confidence is now asked for twice.** The first pilot recommended it after finding one
unreadable operator site. This pilot measured it: 33.8 percent of the collection's citations cannot
be read by machine, one of them is a 404, and both of this pilot's disputes are downstream of it.
`publisher.kind` records who published. It should not silently also mean how well we read them, and
a free-text `method` field is not a contract a gate can read.

**A migrated row and a verified row are not the same object.** Both carry `origin` and both derive
identically. Stage 3 will need to weigh them differently, or the 56 percent expired figure becomes
the only signal it has.

**The seed's orphan assertion was already broken and is now fixed.** `seed-claim-registry.test.mjs`
asserted zero orphans, which stopped being true the moment the first pilot authored a row by hand;
it was failing on main before this branch. It now asserts the narrower thing it was always for:
nothing the seed itself wrote has gone missing. The first pilot predicted this exactly.

**Deferring beats failing.** The migration's first run against the real corpus refused outright
because three of the ids it wanted belonged to the first pilot's hand-authored rows. Failing the
whole run the moment anyone confirms anything by hand makes a migration nobody can use twice. The
authored row now wins, the migrated row is dropped, and the deferral is reported. There is a test
for it.

## For James

Nothing here is blocking.

1. **Is the Mornington Racecourse Market cancelled?** Its `verificationStatus` says the record was
   updated after an organiser cancellation notice, and the site's cancellation reader does not match
   that wording, so the event is currently listed as running. One question to the organiser settles
   it. Separately, its hours are disputed, 9am to 2pm against 10am to 3pm, and the operator's site
   cannot be read.
2. **The Peninsula Summer Music Festival end date is one day out.** The organiser publishes 2 to 10
   January 2027; both our records say 2 to 11. A one-character content fix, but it is a factual field
   and no record was changed on the strength of a dispute.
3. **Four near-duplicate pairs need an editorial decision**, none of which a script may make: the two
   summer music festival records, the two Emu Plains market records, and the two hot springs yoga
   records, which the evidence says are genuinely two different activities and should probably stop
   flagging each other.
4. **One citation is dead.** `pub-carols-thursday-17th-december` cites a Humanitix listing that
   returns 404.
5. **Two expiry windows in the precedence table look arbitrary.** Sixty days for a booking
   requirement against a hundred and eighty for a rate basis is the difference between 28 claims
   being supported and unsupported today. Worth a decision before Stage 3 reads those numbers.
6. **The council is unreadable and it is our most-cited source.** Twenty-one citations to
   `mornpen.vic.gov.au`, all 403. This is a programme-level problem and it will not be solved by
   retrying.

## Verification

Full build passes on this branch with `PUBLIC_ACCESS_GATE=off`, page count unchanged at 982, every
gate green including `lint:no-pricing`, `lint:house-style`, `assert:event-safeguards`,
`assert:provenance-dates`, `assert:schema-drift` and `assert:count-semantics`. Astro validated all
132 new claim files and all 160 new evidence files against the Stage 0 schema.

`npm run test:event-claims` passes, 10 tests. `npm run test:claim-registry` passes, 8 tests, having
failed on main before this branch.

Derived state was checked independently against `src/lib/claim-state.mjs` as at 13 September 2026.
Every evidence row in the registry joins a claim, and every stored `expiresAt` matches what
`computeExpiresAt` produces from that row's own `retrievedAt` and the precedence table.

No content record was created, changed, moved or deleted by this pilot. The registry is additive
and every migrated row names the file and field it came from.
