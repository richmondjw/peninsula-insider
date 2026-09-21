# Source links and contradictions: the PI-007 queue, worked

Date checked: 2026-09-14. Ticket PI-007, issue
[#368](https://github.com/richmondjw/peninsula-insider/issues/368). Companions:
`2026-09-13-closure-and-status-tier.md`, `2026-09-13-venue-identity-corrections.md`, and the
PI-005 pilot at `ops/reports/claims/2026-09-13-pilot-pt-leo-sculpture-park.md`.

Every URL below was fetched. Where a replacement was written into a record, the replacement was
fetched too, and its status code and page title are recorded here. Nothing in this document is a
guess about what a URL probably became; where I could not establish it, it says so and the claim
is marked unsourced rather than quietly repointed.

Machine-readable companions, all committed:

| File | What it holds |
|---|---|
| `ops/records/link-health/probe-ledger.json` | One row per source URL: verdict, HTTP code, page title, date probed, who probed it. Moved out of `ops/reports/` on 2026-09-14: it is evidence, not output, and the reports directory is the one this repo reverts wholesale |
| `ops/reports/content/link-health-dispositions.json` | One row per dead URL: what was decided, and the evidence |
| `ops/baselines/link-health-baseline.json` | The ratchet ceilings the build asserts against |

## Headline

| | |
|---|---|
| Distinct source URLs in the corpus | 459 |
| Dead or unfetchable on 2026-09-14 | **53** (45 dead, 7 TLS-faulted, 1 parked behind a 200) |
| Resolved to a fetched replacement | **16 URLs, 55 citations** |
| Marked gone and unsourced | **37 URLs** |
| Invented, guessed or pattern-matched | **0** |
| Contradictions: mechanical, fixed | **11 passages** across 3 claims |
| Contradictions: editorial, written up below | **9** |
| Contradictions: unresolvable, flagged | **2** |

Two findings are larger than anything in the link queue and are in section 5.

## 1. Method, and the two things it corrects

The inventory that produced "45 of 331" committed no artefact, so the list was re-derived rather
than inherited. `next/scripts/probe-link-health.mjs` (then a `--probe` flag on the gate itself;
split out on 2026-09-14) extracts every URL sitting in a
source field across all 22 collections and fetches each one with a browser user agent. That found
459 distinct URLs, a superset of the original 331 because it counts `website` and `bookingUrl`
alongside evidence rows — a booking link that goes nowhere is the same defect as a dead citation
and a worse experience.

The first probe read only status lines, and got two classes wrong in the direction that hides a
defect. Both were corrected before any record was touched.

**HTTP 202 is a captcha, not a page.** Cloudflare answers a robot with 202 and a challenge body.
Thirty-five source URLs came back 202 and were filed healthy; nobody has read the source behind
any of them. They are now `blocked`, which is an honest unknown.

**HTTP 200 is not proof of life.** `www.arthursseat.com.au/book/` returns 200 from a
domain-for-sale lander titled "This website is for sale!". `www.redhillmarket.com.au` returns 200
from a NetRegistry redirector whose entire body is the words "Not found". Every status-code link
checker on earth calls both healthy. They are now `parked`, counted dead, because a 200 that sends
a reader to an advertisement is worse than a 404 that tells them.

One URL that the first probe called dead — `rickswinetours.com.au` — was a thirty-second timeout
and resolves cleanly on a second read. That single row is the argument for why a live probe may
never be the thing CI asserts on.

### Final verdict distribution, 2026-09-14

| Verdict | URLs | Meaning |
|---|---:|---|
| ok | 327 | 2xx or 3xx carrying a real page |
| blocked | 91 | the host refuses automation; not a fault |
| moved | 16 | dead here, alive at a fetched replacement |
| dead | 34 | nothing here, no equivalent found |
| tls-fault | 3 | reachable, certificate does not match the hostname |

**Register item A18 is confirmed and quantified.** 91 of 459 source URLs, 20 percent, cannot be
read by machine at all: the council, Pt Leo Estate, Foxeys Hangout, Polperro, the VFA, Humanitix,
Tripadvisor and Facebook among them. That is a programme constraint, not a bug, and the gate
treats it as one — `blocked` is its own verdict and never counts toward the dead metric. A checker
that folded the two together would demand deleting a fifth of this site's provenance over a robots
policy.

## 2. Resolved: 16 URLs, each replacement fetched and read

| Was | Now | Evidence for the replacement |
|---|---|---|
| `bom.gov.au/explore/places/vic/main-ridge/forecast/` | `bom.gov.au/places/vic/main-ridge/forecast/` | 200, "Main Ridge Forecast - Bureau of Meteorology". BoM dropped one path segment |
| `aseagle.com.au/book` | `aseagle.com.au/tickets/` | 200, "Eagle Cable Car Tickets \| Soar Above Arthurs Seat" |
| `www.arthursseat.com.au/book/` | `aseagle.com.au/tickets/` | old URL is a domain-for-sale lander; new one is the operator's own |
| `www.marthastable.com.au/reservations` | `www.marthastable.com.au/book-a-table/` | 200, "BOOKINGS - Martha's Table" |
| `www.peninsulahotsprings.com/bathing` | `www.peninsulahotsprings.com/bathe` | 200, "Bath House Spa Experiences \| Peninsula Hot Springs" |
| `www.portphillipestate.com.au/dine` | `www.portphillipestate.com.au/dining-room/` | 200, "Dining Room - Port Phillip Estate" |
| `www.stonier.com.au/visit/events/` | `www.stonier.com.au/visit` | 200, "Stonier - Visit". Parent page; the events subpage is gone |
| `www.foxeys.com.au` | `foxeys-hangout.com.au/` | old domain refuses TLS on a NetRegistry parking address; new one is live and named as official by Wine Companion and Visit Victoria |
| `morningsunvineyard.com.au` (and `/visit`) | `foxeys-hangout.com.au/Morning-Sun/About-Morning-Sun` | the operator's own server redirects there once certificate verification is relaxed |
| `www.mpchocolaterie.com.au` | `www.mpchoc.com.au/` | 200, "The Chocolateries Mornington Peninsula \| Chocolate, Cafe & Events" |
| `trofeoestate.com` | `trofeoestate.com.au/` | the .com serves a self-signed certificate; the .com.au serves the site |
| `trofeoestate.com/visit` | `www.trofeoestate.com.au/visit-us/` | operator's own redirect chain |
| `manylittle.com.au/book` | `www.manylittle.com.au/` | /book 404s on the operator's own site; homepage is 200 |
| `imaginefrankston.com.au/…/mornington-peninsula-regional-gallery` | `mprg.mornpen.vic.gov.au/` | 200, "Home - Mornington Peninsula Regional Gallery" |
| `mornpen.vic.gov.au/Arts-Culture/Mornington-Peninsula-Regional-Gallery` | `mprg.mornpen.vic.gov.au/` | the council's own 404 renders at the old URL; the gallery has its own subdomain |

The BoM fix is the largest single restoration in the ticket: one removed path segment brings back
32 citations across 16 quick-notes and their evidence rows.

## 3. Refused: substitutes that existed and were not used

These are the entries that matter most, because each one is a place where a plausible URL was
available and taking it would have manufactured support.

**`lightfootwines.com.au` (Lightfoot Wines).** Does not resolve. `lightfootwines.com` is live — and
is Lightfoot & Sons of Calulu, East Gippsland, roughly 250km from the "110 Myers Rd, Main Ridge"
on this record. Same name, different winery, different region. Refused.

**`viaboffe.com.au` (Via Boffe).** Does not resolve. `via-boffe.square.site` is live, but at 59
Main Street Mornington on (03) 5976 8158, while the record says 200 Main Ridge Rd, Main Ridge on
+61 3 5989 6111. Two different addresses and two different phone numbers is not identity. Refused.

**`www.redhellestate.com.au`.** Does not resolve, and never has. It is a misspelling of Red Hill
Estate, and it was cited on 5 May 2026 as the source establishing that venue's Tuesday-to-Sunday
trading. `redhillestate.com.au` is live — but pointing the row at it would assert that a source was
read which demonstrably was not. Refused; the row is marked unsourced.

**`www.mainridgeestate.com.au`.** Same shape, same date, same quick-note. Does not resolve.

Those last two are worth stating plainly. **A quick-note published on 5 May 2026 asserted the
trading days of two wineries and cited, as its sources, two URLs that do not exist.** The claim was
never sourced. This is the defect class the whole programme was convened for, caught here by
accident while checking links.

**`www.kooyong.com/cellar-door`.** 404 on the operator's own site; `kooyong.com` now redirects to
Port Phillip Estate, which has no Kooyong cellar-door page. Sending a reader to the Port Phillip
Estate cellar door would assert Kooyong tastings happen there. Refused.

**`parks.vic.gov.au/…/cape-schanck`.** 404. The Mornington Peninsula National Park page is live but
covers the whole park, not Cape Schanck. Not an equivalent source. Refused.

**The council, eleven URLs.** Every `/Events-Activities/` path renders the council's own
"Page not found - Mornington Peninsula Shire". Listings now live under
`/Things-to-do/Events/Whats-on/`; one page under that structure was fetched successfully
(Hill & Ridge Community Market, 200) before the host began returning "Access Denied" to this
address. Our own corpus independently corroborates the new structure: a daily-insights capture from
22 August already carries a working `/Things-to-do/Events/Whats-on/` URL. **The pattern is known and
the eleven replacements were still not constructed**, because a URL assembled from a pattern and
never fetched is indistinguishable from a citation and strictly worse than an honest gap. They are
the top of the editor queue in section 6.

## 4. Marked gone: 37 URLs

The link is removed from the field a reader clicks and recorded in the record's
`retiredSourceLinks` with the verdict, the date and the reasoning. Where nothing readable is left,
the record carries `sourceStatus: unsourced`. **No claim was deleted.** A claim that quietly loses
its citation looks better and is worse; unsourced is a state the registry and the blind-spot
reporting can see.

Domains that no longer resolve (11): `laurarestaurant.com.au`, `lightfootwines.com.au`,
`mpfm.com.au`, `phaedrusestate.com`, `smallstonepantry.com.au`, `viaboffe.com.au`,
`villamallorca.com.au`, `www.mainridgeestate.com.au`, `www.mpchocolaterie.com.au`,
`www.redhellestate.com.au`, `www.temptationsailing.com`.

Parked or expired behind a success code (3): `www.redhillmarket.com.au` (NetRegistry redirector),
`www.driftawayondundas.com` ("Squarespace - Website Expired"), `www.ouestfrance.com.au`
("ConnectYourDomain Error", venue separately recorded as permanently closed).

Certificate faults, reachable but not safely (3): `tucksridge.com.au` (self-signed;
`www.tucksridge.com.au` refuses connection and `tucks.com.au` is an industrial packings company),
`www.balnarringmarket.com.au` (hostname mismatch; plain HTTP answers 200, and publishing an
`http://` link for a market is a downgrade this ticket is not authorised to make),
`www.the-orchard.com.au` (TLS handshake failure).

Past or removed event listings (9): the Humanitix listings for Pub Carols and the Sorrento
Solstice Festival, the Chocolaterie's Rocky Road Festival page, the library's Science Week page,
and five council event pages for events that have passed.

Live sites whose page is gone (3): `www.kooyong.com/cellar-door`,
`www.globalballooning.com.au/mornington-peninsula/`, `www.racv.com.au/…/cape-schanck-resort.html`.

Council restructure, unresolvable today (11): see section 3.

## 5. The two findings larger than a link

### 5.1 The Red Hill Market this site recommends may not exist

`redhillcommunitymarket.com.au`, fetched 2026-09-14, is titled
**"The Red Hill Community Market® is temporarily closed"** and serves only a history archive of a
market that began in 1975.

The market trading at Red Hill Recreation Reserve is the **Hill & Ridge Community Market**, run by
the Red Hill Agricultural & Horticultural Society. Its own site, fetched the same day, publishes:
first Saturday of each month, **September to May**, **9am–2pm**, at
**184 Arthurs Seat Road, Red Hill 3937**, with 2 January 2027 listed as a market date and no market
on 6 March 2027 because of the Red Hill Show.

This corpus carries both as separate venues, gives them different addresses (172 against 184),
different buildings ("Red Hill Community Centre" against "Red Hill Recreation Reserve") and
different hours (8am–1pm against 9am–2pm), and in `articles/the-market-saturday.md` states outright
that "The Hill & Ridge Market is not the Red Hill Market."

Red Hill Market is recommended as an anchor across seventeen articles. Whether it is one market
that was renamed or two markets one of which is closed decides whether those seventeen articles are
fine or are recommending a closed market. **That is James's call, and it is the single highest-value
item in this report.** Nothing has been merged or retired on my judgement.

### 5.2 Global Ballooning may no longer fly the Peninsula

`tours/global-ballooning-peninsula-sunrise.json` sells a Peninsula sunrise flight. The operator's
Peninsula page 404s on their own live site and no Peninsula page was found anywhere on it. There is
an unmerged branch `origin/chore/remove-global-ballooning` upstream, which suggests this is already
known. Selling a flight an operator may not offer is a commercial exposure, not a link defect.

## 6. The editor queue

Ordered by reader risk.

| # | Item | What is needed |
|---|---|---|
| 1 | Red Hill Market against Hill & Ridge Community Market | Decide whether they are one entity. 17 articles depend on the answer (section 5.1) |
| 2 | Eleven council event citations | Someone who can open `mornpen.vic.gov.au` in a browser to capture the `/Things-to-do/Events/Whats-on/` URL for each |
| 3 | Global Ballooning Peninsula sunrise tour | Confirm with the operator whether the product exists (section 5.2) |
| 4 | `venues/lightfoot-wines.json` | Record places a winery at Main Ridge; the only Lightfoot Wines found is in East Gippsland. Region may be wrong, not just the link |
| 5 | `venues/phaedrus-estate.json` | Record says "220 Mornington-Flinders Rd, Red Hill", place `dromana`. Visit Victoria and Wine Companion both say 220 Mornington-Tyabb Road, **Moorooduc**. The street number matches and nothing else does |
| 6 | `venues/via-boffe.json` | Two candidate businesses, two addresses, two phone numbers (section 3) |
| 7 | `venues/tucks-ridge.json` | No fetchable operator site exists. Is Tuck's Ridge still trading? |
| 8 | `venues/balnarring-market.json` | Certificate does not match the hostname; ask the operator to fix it rather than publishing `http://` |
| 9 | Alba Thermal Springs pool count | Our venue record says thirty-one, two articles say twenty-two, the operator publishes no figure |
| 10 | Nine venues with no web presence at all | `laurarestaurant`, `small-stone-pantry`, `villa-mallorca`, `mornington-farmers-market`, `driftaway-on-dundas`, `the-orchard-red-hill`, `temptation-sailing`, `many-little` (booking), `kooyong` (booking) |

## 7. Contradictions

The inventory's 52 could not be re-derived: it committed no list, and the issue comment carries
only four worked examples. What follows is an honest account of what was triaged, not a claim to
have reproduced that set. The four named examples are all here; the bucket counts are for what was
examined.

### Mechanical — fixed, 11 passages across 3 claims

**Pt Leo Estate sculpture park: entry is ticketed, not free.** Settled 13 September by the PI-005
pilot against the operator and a 2022 press listing, and recorded as a supported claim in
`content/claims/experiences/pt-leo-sculpture-park/rate-change.json`. The pilot corrected the data
records and filed the prose "for an editor". It is not an editorial matter — a reader plans a free
afternoon and arrives at a ticket desk — so the seven remaining passages are corrected here, with
no amount, since this site publishes no prices.

- `articles/the-peninsula-picnic.md` ×2
- `articles/the-school-holidays-survival-guide.md` ×2
- `articles/how-to-plan-a-peninsula-weekend.md` ×2
- `articles/the-birthday-weekend.md` ×1 (also dropped an unsourced "free if you are staying on site")

**Alba Thermal Springs: not adults-only.** Alba's own FAQ, fetched 2026-09-14: *"Are there age
restrictions? Everyone is welcome, however people under 16 must be accompanied by an adult around
the springs. Infants are required to wear a swim nappy while bathing."* Two passages in
`articles/things-to-do-mornington-peninsula.mdx` said "adults-only (18+)". This is the one the
register called decision-determining for a family booking, and the site was answering it wrongly on
a high-traffic page. The "22 pools" figure attached to one of those sentences was removed rather
than corrected — see the editor queue.

**Red Hill Market: season.** Three mutually exclusive answers were in circulation — "September
through May", "first Saturday of the month (except January)", and "the first Saturday of each month
year-round". The operator at that reserve publishes first Saturday, September to May, and lists
2 January as a market date. Both outliers corrected, in
`articles/free-things-to-do-mornington-peninsula.mdx` and `articles/autumn-weekend-edit.md`. The fix
holds whichever way the naming question in section 5.1 is resolved, which is why it was safe to
make.

### Editorial — not fixed, written up

1. Red Hill Market against Hill & Ridge (section 5.1). **Recommended default:** treat them as one
   market renamed, retire the `red-hill-market` record in favour of `hill-ridge`, and keep the slug
   as a redirect — but only on James's word, because the corpus currently asserts the opposite.
2. "adults-first", "adults-focused", "adults-only pacing" for Alba. Characterisation, not
   eligibility. **Default:** keep, now that the hard eligibility claim is corrected.
3. Alba pool count, 22 against 31. **Default:** publish no count until the operator states one.
4. `articles/the-market-saturday.md` places the Red Hill market at the Community Centre, 8am–1pm.
   Conditional on item 1.
5. Lightfoot Wines' region. **Default:** leave the record, flag it, do not move a winery 250km on a
   third-party listing.
6. Phaedrus Estate's address and suburb. **Default:** as above.
7. Via Boffe's identity. **Default:** as above.
8. Whether to publish `http://www.balnarringmarket.com.au/`. **Default:** no.
9. Whether the Global Ballooning Peninsula product should stay on sale. **Default:** it stays until
   the operator is asked, because removing a tour is a commercial act.

### Unresolvable — flagged, no winner picked

1. **Pt Leo Estate park size.** The operator contradicts itself: its sculpture park page says 16.5
   acres, its own local-resident offer page says 16, and the Shire repeats 16. Both live sources are
   `venue-site`, the top-ranked kind, so precedence cannot arbitrate and `deriveClaimState` correctly
   returns `disputed`. Already recorded by the PI-005 pilot; nothing changed here.
2. **Alba pool count.** Two figures inside our own corpus, no operator figure to settle it. Marked
   for an editor rather than resolved by preferring the newer record.

### A negative result worth recording

A mechanical sweep for the same named entity carrying two different street addresses, phone numbers
or coordinate pairs across the corpus found **zero** genuine conflicts. Three candidates surfaced
and all three were false positives — neighbouring businesses on the same street (Flinders Sourdough
at 48 Cook St, Mornington Peninsula Chocolates at 50, Red Hill Truffles at 1180
Mornington-Flinders Road). The corpus's address data is internally consistent. Its problem, where
it has one, is being wrong against the world rather than wrong against itself, which is a different
defect and a harder one.

## 8. What now stops this recurring

`next/scripts/audit-link-health.mjs`, wired into `npm run build` and into the content gate on every
branch and pull request.

It makes **no network request**. It compares the content tree against the committed probe ledger and
a ratchet baseline, so it can only fail on a change someone made in this repository. A link checker
that dialled out from CI would go red at 3am with no code change, everyone would learn to ignore it,
and the next real failure would be ignored too. Refreshing the ledger is a deliberate act
(`npm run probe:link-health`) and lands as a reviewable diff.

Three gated metrics:

| Metric | Ceiling | Why |
|---|---:|---|
| `unledgeredSourceUrl` | 0 | A citation that has never been probed fails the build. This is the one that ratchets the corpus forward rather than merely holding it |
| `deadSourceUrlCited` | 1 | Inherited, documented, cannot grow |
| `staleRedirectCited` | 0 | The ledger knows where a moved URL went and the record has not followed |

The permitted dead citation is a past event listing inside `daily-insights/2026-08-22.json`, a dated
capture of what the research desk saw that day. Editing it would falsify the snapshot, so it is held
at the ceiling rather than rewritten.

Nine tests in `next/scripts/audit-link-health.test.mjs` assert the behaviours that matter, including
the two that would do real damage if they regressed: that a blocked host is never counted dead, and
that a missing baseline fails closed rather than reading as "no regression".

## 9. What this did not do

- **Re-derive the inventory's 52 contradictions.** No list was committed and the issue comment
  carries four examples. Section 7 reports what was triaged, not a reproduction of that set.
- **Read any source behind a bot wall.** 91 URLs, including the council and Pt Leo Estate, refuse
  automated reads. Retries do not fix this and none were attempted beyond one.
- **Verify that a live URL still carries the claim citing it.** HTTP 200 is not evidence of support.
  That is the PI-005 registry's job and this gate says so in its own header rather than implying
  otherwise.
- **Resolve any of the nine editorial items.** Each has a recommended default and none was acted on.
