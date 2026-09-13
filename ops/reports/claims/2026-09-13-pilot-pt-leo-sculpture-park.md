# PI-005 Stage 2 pilot: the Pt. Leo Estate sculpture park cluster

First pilot of the claim registry, run on 13 September 2026 against the branch `pi/005-pilot-ptleo`.
The subject is the Pt. Leo Estate sculpture park, chosen first because it is the only documented
case in this corpus of records contradicting each other across collections, so it exercises the
disagreement path on day one rather than on a happy path.

Nothing here is wired into the build. Enforcement is Stage 3 and it must be seeded from numbers
like the ones below, not before them.

## What was written

Nine claims and eighteen evidence rows, all `origin: authored`, covering six collections and the
orphaned fact layer.

| Claim | Class | Derived state | Rows |
|---|---|---|---:|
| `experiences/pt-leo-sculpture-park/rate-change` | rate-change | supported | 2 |
| `experiences/pt-leo-sculpture-park/opening-hours` | opening-hours | supported | 2 |
| `experiences/pt-leo-sculpture-park/offering` | offering | supported | 3 |
| `events/pt-leo-estate-sculpture-park/accessibility` | accessibility | supported | 2 |
| `data-facts/things-to-do/pt-leo-estate-sculpture-park/offering` | offering | **disputed** | 4 |
| `events/pt-leo-estate-local-complimentary-.../event-schedule` | event-schedule | supported | 2 |
| `events/pt-leo-estate-local-complimentary-.../rate-change` | rate-change | supported | 2 |
| `venues/pt-leo-estate/offering` | offering | supported | 1 |
| `venues/pt-leo-estate/opening-hours` | opening-hours | **unsupported** | 0 |

Five publishers were read on 13 September 2026: the operator (`ptleoestate.com.au`, three pages),
Visit Mornington Peninsula, Mornington Peninsula Shire, and one press listing dated 4 May 2022 that
is retained precisely because it is expired.

## What the evidence settled

**Entry is ticketed.** This was the live reader facing contradiction and it is now closed at the
claim level. The operator states entry into the sculpture park is ticketed, with an adult rate, a
concession rate and a family rate, and that children under 12 enter free. The 2022 press listing
states the same basis, which means the free assertions in this corpus were never supported by that
source either. No amount appears anywhere in the registry: the basis of entry is the claim, and this
site publishes no prices.

**The number of works is more than seventy, not sixty.** The operator and the regional body agree.
The sixty figure traces to the 4 May 2022 Time Out listing, which is also where the 330 acre
sculpture park figure corrected out of this corpus earlier the same day came from. That single
expired press row explains two separate families of wrong numbers, and it is the strongest argument
in this pilot for recording sources you disagree with rather than deleting them.

**The local resident offer started on 1 June 2026, not 1 July.** The operator and the Shire both
publish 1 June to 31 August, weekdays only, restricted to permanent residents of Mornington
Peninsula Shire or Frankston. The record carried 1 July.

**Hours are daily 11am to 5pm.** Two independent publishers agree. Only the operator states the
4:30pm last entry.

**Accessibility is better than the corpus says.** The operator publishes a positive statement, that
all pathways are on one level and the park is suited to prams and wheelchairs, with seating through
the grounds. The regional body records that it caters for people who use a wheelchair. All three
event records hedge with a variant of "check with the venue for specific needs". Being weaker than
the available evidence is a different defect from being wrong, and it is one the registry surfaces
for the first time.

## What stayed disputed

**The size of the park.** The operator disagrees with itself. Its sculpture park page gives 16.5
acres of landscaped grounds; its own local resident offer page gives 16 acres of native gardens, and
the Shire repeats 16. Precedence cannot settle it, because both live rows that disagree are
`venue-site`, which is the top ranked kind for this class, and `deriveClaimState` correctly returns
`disputed` on the tie. No record was changed on the strength of a dispute. An editor has to ask the
operator which figure is current.

This is worth dwelling on. The registry was built expecting disagreement between a good source and a
worse one. The first real case is a single publisher contradicting itself on two of its own pages,
which no precedence table can arbitrate. The design handles it correctly by refusing to pick, and
that is the behaviour to keep.

## The three empty classes

The Stage 1 seed drew zero evidence rows for opening hours, accessibility and rate changes. All
three are now populated, and all three turned out sourceable.

- **opening-hours**: sourceable, and easily. Two publishers, both explicit, one of them the
  operator. This is not structurally hard. The reason the class was empty is that the corpus had
  nowhere to put a source for it, not that no source exists.
- **accessibility**: sourceable, and better than expected. Both the operator and the regional body
  publish positive statements. The 365 day expiry in the precedence table looks right: access
  arrangements move slowly.
- **rate-change**: sourceable as a basis, which is the only form this site can carry. Whether entry
  costs money is publishable; the amount is not. The class works, provided every statement in it is
  written as a basis and never as a figure.

The honest caveat is that one subject is not a sample. A venue with a good website is the easy case.
The 28 venues publishing actual hours are the population that matters for the recurring cost model,
and this pilot says nothing about the ones that publish nothing.

## Records corrected, traceable to evidence

Four files, six field level changes, each one settled by a row on the claim it belongs to.

| File | Field | Was | Now |
|---|---|---|---|
| `content/experiences/pt-leo-sculpture-park.json` | `editorNote` | "Entry is free" | "Entry is ticketed" |
| `content/experiences/pt-leo-sculpture-park.json` | `editorNote` | "more than sixty significant works" | "more than seventy" |
| `content/events/pt-leo-estate-sculpture-park.json` | `summary` | "60+ contemporary works" | "more than 70" |
| `content/events/pt-leo-estate-sculpture-park.json` | `editorNote` | "over sixty contemporary sculptures" | "over seventy" |
| `content/events/pt-leo-estate-local-complimentary-...json` | `startDate`, `month` | 2026-07-01, July | 2026-06-01, June |
| `data/facts/things-to-do.json` | `pricing.note`, `hoursConfidence`, new `accessibility` | Jan 2026 stamp, medium, absent | 2026-09-13 basis, high, populated |

## Records still wrong, filed for an editor

These are prose across articles. Rewriting them is an editorial act, not a data correction, and it
is out of scope for the pilot.

| File | What it says |
|---|---|
| `articles/the-peninsula-picnic.md` (2 places) | "free entry", "The park is free to enter" |
| `articles/the-school-holidays-survival-guide.md` (2 places) | "is free entry", "sculpture parks (free)" |
| `articles/how-to-plan-a-peninsula-weekend.md` (2 places) | "free, coastal, contemplative", listed among activities that are free |
| `articles/the-birthday-weekend.md` | "free to walk through if you are staying on site", which is unsourced |

Two more, neither settled, both worth an editor's eye:

- `content/experiences/pt-leo-sculpture-park.json` names Antony Gormley, Emily Floyd and Marcus
  Tatton. None of the three appears on the operator's own list of major artists. The operator's list
  is prefixed "including", so their absence is not proof, and the claim was not written. It is the
  kind of assertion a reader would take as checked.
- `content/events/pt-leo-estate-local-complimentary-sculpture-park-winter-2026.json` carries
  `nextOccurrence: 2026-09-16`, sixteen days after the offer ended. The field is cron recomputed, so
  it was reported rather than edited. Any surface presenting this offer as available is wrong.

## Cost

Measured wall clock on 13 September 2026, one operator, machine assisted throughout.

| Phase | Minutes |
|---|---:|
| Read the design and the seed report, locate the registry, read the schema, precedence table and state lib | 7 |
| Map the cluster across six collections and the fact layer; confirm the morning's quantitative fix | 4 |
| Source retrieval: five publishers, six pages | 8 |
| Author nine claims and eighteen evidence rows; verify derived state | 5 |
| Apply and verify four record corrections | 4 |
| Full build | 6 |
| This report | 9 |
| **Total** | **43** |

Per unit, on the work that scales:

- **Per claim: about 1.9 minutes** (17 minutes of mapping, authoring and correcting, over nine claims).
- **Per evidence row: about 0.9 minutes** (16 minutes of retrieval and authoring, over eighteen rows).

Three things must be said about those numbers before anybody extrapolates them.

**They are not the design's units.** The design's 34 hour first pass and 46 hour annual recurring
figure are hand verification estimates. This pilot is machine assisted: the retrieval, the file
authoring and the state verification were all automated, and the only genuinely serial human shaped
cost was deciding which claims to write and how to phrase them. A like for like comparison would
need a hand run of the same subject.

**The setup cost is one off and large relative to the work.** Sixteen of the 43 minutes were spent
before a single claim was written. On the second and third pilots that falls close to zero, so the
marginal subject is nearer 25 minutes than 43.

**The easy case was chosen for a different reason.** Pt. Leo has a well maintained website, a
regional body listing and a council listing. It was selected for its contradiction, not its
sourceability, and it happens to be well sourced. A venue with a Facebook page and a phone number
will not run at two minutes a claim.

On that basis the honest extrapolation is a range, not a number. At this subject's rate, the 362
seeded claims would take roughly 11 hours to evidence; at a rate reflecting harder subjects and
unreachable sources it is several times that. The recurring cost, which is the decision that
determines whether this survives, still turns on the 90 day trading status cycle and not on this
pilot.

## What the method taught us

**The operator's own site could not be read first hand.** Every direct fetch of
`www.ptleoestate.com.au` returns a bot protection interstitial. Its page text was read through a
search engine index of those pages instead, and every affected row records that in its `method`
field rather than quietly claiming a first hand read. This matters more than it looks: `venue-site`
is the top ranked kind for six of the thirteen claim classes, so the most authoritative source in
the precedence table is also the one most likely to be unreachable by machine. PI-006 already found
that roughly 30 percent of this corpus cannot be read from its own citation. This pilot is a
worked example of why, and the fix is not more retries.

**A recommendation for Stage 3.** `publisher.kind` records who published; it should not silently
also mean how well we read it. Either the schema gains a retrieval confidence, or the gate treats a
row whose `method` records an indirect read as weaker than one fetched first hand. Putting it in a
free text `method` field, as this pilot did, is the honest minimum and not a durable contract.

**An expired row earned its keep on the first try.** The 2022 press listing is four years past its
expiry and contributed nothing to any claim's state. It is also the single most useful row in the
set, because it explains where two wrong numbers came from. "Expiry is a state transition, never a
deletion" stopped being a design principle and started being a result.

**The `assertedBy` array is where the value is.** The subject record is rarely the only place a
reader meets the claim. The entry basis claim is asserted by four records and contradicted by four
more, across three collections. No per record provenance field could have represented that, which is
the sidecar design's central bet, and it held.

**A claim with no evidence is a deliberate act, not a gap.** `venues/pt-leo-estate/opening-hours`
was written with zero rows attached, so it derives as `unsupported`. The estate's weekend close at
9pm is asserted by one record and nothing else. Writing the claim down is what makes that visible;
leaving it unwritten leaves an hours block on a venue page that nobody can trace. Stage 3 has to be
able to tell "nobody has looked" apart from "somebody looked and found nothing", and today's schema
cannot.

**Authored rows will show as orphans in the next seed run.** `seed-claim-registry.mjs` reports every
claim and evidence file it did not itself produce. It never deletes them, which is correct, but the
orphan list will grow by one per authored row and will need a filter on `origin` before it stops
being useful.

## For James

Nothing here is blocking.

1. **The park size needs one question to the operator.** Their two pages disagree, 16 against 16.5
   acres, and the registry will hold it as disputed until somebody asks. It is the only claim in the
   set that a source read cannot close.
2. **The six free entry assertions in article prose need an editor.** They are the reader facing
   half of the contradiction this pilot was chosen for, and correcting them is a voice decision.
3. **The ended offer may still be surfacing.** `nextOccurrence` on the local resident offer points
   at a date after the offer closed.
4. **Reachability is a programme level problem, not a subject level one.** If the highest precedence
   source kind is routinely unreadable by machine, the recurring cost model in the design needs a
   line for it before Stage 3 sets a threshold.

## Verification

Full build passes on this branch with `PUBLIC_ACCESS_GATE=off`: 982 pages, every gate green,
including `lint:no-pricing`, `assert:count-semantics`, `assert:provenance-dates` and
`assert:schema-drift`. Astro validated all nine claim files and all eighteen evidence files against
the Stage 0 schema. Derived state was checked independently against `src/lib/claim-state.mjs` as at
2026-09-13: one disputed, seven supported, one unsupported.
