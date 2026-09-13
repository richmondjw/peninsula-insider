# Closure and status tier, verification pass

PI-007 (GitHub issue #368), tier 1 of the content verification queue. Branch `pi/007-closure-tier`.
All checks performed 2026-09-13 (Australia/Melbourne). Verifier: automated desk pass, no contact made
with any business.

## Method

The tier was reconstructed from the corpus rather than taken on trust, using the three membership
rules in the brief:

- **A. Primary domain no longer resolves.** Every URL in every content record was extracted, the
  primary URL of each record (`website`, else `bookingUrl`, else `url`) reduced to a hostname, and
  all 231 distinct hostnames resolved. 21 returned NXDOMAIN. Each was re-checked against Cloudflare
  1.1.1.1 to rule out a local resolver fault; all 21 failed both. Where the failing host carried a
  `www.` prefix the apex was checked separately, so a missing `www.` record is not mistaken for a
  dead domain.
- **B. Operational review marker.** Records carrying `operatingStatus`. Three.
- **C. Closure or status asserted by the record's own text.** `status` in
  `closed` / `paused` / `permanently_closed`, or closure, ownership change, reopening or renaming
  language in any string field.

That yields **39 records**: 23 by rule A (20 entity records, 3 evidence records), 3 by rule B,
and 16 by rule C, with 3 records qualifying under more than one rule. The inventory comment on #368
sized this tier at 38; the difference is one record and does not change the shape of the queue.

## Evidence standard applied

A lapsed domain was treated as weak evidence throughout and never as evidence of closure. Closure
was recorded only where an operator, a news outlet or a review platform states it. Where the
public record is silent or contradictory the verdict is **cannot tell**, written into the record
rather than guessed past.

**No record had its published `status` changed by this pass.** Confirmed closures are recorded and
listed below; delisting a page needs a redirect decision that is not taken here. Two records marked
closed by the desk are now contradicted by public sources; those are flagged, not reversed.

## Summary

| Verdict | Count |
|---|---|
| Closed, confirmed | 1 |
| Renamed or absorbed | 1 |
| Wrong URL, business trading | 13 |
| Verified as recorded, no change | 8 |
| Cannot tell | 16 |
| **Total** | **39** |

---

## Confirmed closures

Each needs an editorial pass over the articles that recommend it, and a redirect decision.

| Record | Verdict | Evidence | Checked | Confidence |
|---|---|---|---|---|
| `venues/maxs-red-hill-estate.json` (Max's at Red Hill Estate) | **Closed.** Concluded service at the end of February 2026 after 31 years. | RPP FM, "Passing of Mornington Peninsula culinary legend" (https://rppfm.com.au/2026/02/passing-of-mornington-peninsula-culinary-legend/); The Coast, "Farewell to Max's, a Peninsula legacy" (https://thecoast.com.au/blog/farewell-to-maxs-a-peninsula-legacy) | 2026-09-13 | High |

Written to the record: `operatingStatus: permanently-closed`, `closureNote` with both sources.
`closedDate` was already present at month precision (`2026-02`) and was left at month precision,
because no exact final service date was published. `status` was already `permanently_closed` and
was not touched.

**Second-order finding.** `venues/red-hill-estate.json` carries the sentence "With Max's restaurant
now closed, the cellar-door tasting room becomes the primary reason to make the trip." The closure
half of that is correct. The consequence is now out of date: Red Hill Estate trades as an Italian
winery and restaurant with a lawn-side dining area, per its own site
(https://www.redhillestate.com.au/) and OpenTable (https://www.opentable.com/r/red-hill-estate-red-hill).
Editorial, not a status change, so it is filed here rather than rewritten.

---

## Renamed or absorbed

| Record | Verdict | Evidence | Checked | Confidence |
|---|---|---|---|---|
| `venues/la-baracca-tgallant.json` (La Baracca at T'Gallant) | **Renamed or absorbed**, not cleanly closed. The estate dining room trades as T'Gallant Vineyard; La Baracca survives as the name of one dining room inside it. | Recorded domain `tgallant.com.au` now 301s to `tgallantvineyard.com.au` (verified); OpenTable listing for T'Gallant Vineyard, Main Ridge (https://www.opentable.com/r/tgallant-vineyard-main-ridge); Tripadvisor T'Gallant Vineyard (https://www.tripadvisor.com/Restaurant_Review-g2055778-d26701225-Reviews-T_Gallant_Vineyard-Main_Ridge_Mornington_Peninsula_Victoria.html); older standalone La Baracca Trattoria listings marked closed | 2026-09-13 | Medium |

The desk's May 2026 `permanently-closed` marker was left in place and the recheck appended to the
existing `closureNote` rather than overwriting it. No `closedDate`: none was published. This is the
record the build was previously discarding (the `operatingStatus` key now exists in the schema, so
it survives validation); what it discards is worth an editor's decision, because "closed" and
"renamed" call for different treatment of the three venue records that recommend it as a pairing.

---

## Contradictions worth an editor

| Record | Verdict | Evidence | Checked | Confidence |
|---|---|---|---|---|
| `venues/ouest-france-bistro.json` (Ouest France Bistro) | Recorded `status: permanently_closed`, **and the public record says it is trading.** | Tripadvisor, open with reviews into 2026 (https://www.tripadvisor.com/Restaurant_Review-g552216-d25217948-Reviews-Ouest_France_Bistro-Mornington_Mornington_Peninsula_Victoria.html); OpenTable, bookable (https://www.opentable.com/r/ouest-france-bistro-mornington); AGFG (https://www.agfg.com.au/restaurant/ouest-france-bistro-124964). Those sources place it at 180 Main Street, Mornington, not the address recorded here. No operator closure notice found. | 2026-09-13 | Medium-high |

`operatingStatus: verify-open` and a `closureNote` were written. The `status` field was **not**
reversed: turning a closed record back on is as consequential as turning one off, and the address
discrepancy means the possibility of two different businesses has not been excluded. The record was
last touched 2026-09-12, one day before this check, which is worth knowing before anyone reverses it.

---

## Wrong URL, business trading

Corrected `website` / `bookingUrl` written in place. The business in each case is trading; only the
recorded address was wrong.

| Record | Recorded URL | Corrected to | Evidence | Confidence |
|---|---|---|---|---|
| `venues/sorrento-hotel.json` (The Sorrento Hotel) | `thesorrento.com.au` (NXDOMAIN) | `https://hotelsorrento.com.au/` | Operator site, HTTP 200, same address 5-15 Hotham Rd; Visit Victoria (https://www.visitvictoria.com/regions/mornington-peninsula/places-to-stay/hotels/hotel-sorrento) | High |
| `venues/two-bays-brewing.json` (Two Bays Brewing Co) | `twobaysbrewingco.com.au` (NXDOMAIN) | `https://www.twobays.beer/` | Operator site, HTTP 200; Visit Victoria (https://www.visitvictoria.com/regions/mornington-peninsula/eat-and-drink/breweries-and-distilleries/breweries/twbays-brewing-co); The Crafty Pint (https://craftypint.com/brewery/465/twobays-brewing-co) | High |
| `venues/somers-general.json` (Somers General) | `somersgeneral.com.au` (NXDOMAIN) | `https://www.thesomersgeneral.com.au/` | Operator site, HTTP 200; Tripadvisor (https://www.tripadvisor.com/Restaurant_Review-g2462769-d2477031-Reviews-The_Somers_General-Somers_Victoria.html) | High |
| `venues/barragunda-dining.json` (Barragunda Dining) | `www.barragundadining.com.au` (NXDOMAIN) | `https://www.barragunda.com.au/` | Broadsheet (https://www.broadsheet.com.au/mornington-peninsula/cape-schanck/restaurants/barragunda-dining); AGFG (https://www.agfg.com.au/restaurant/barragunda-dining-137199), both giving barragunda.com.au. Operator site returns 403 to automated clients but resolves and serves | High |
| `venues/mornington-peninsula-chocolates.json` | `morningtonpeninsulachocolates.com.au` (NXDOMAIN) | `https://www.mpchoc.com.au/` | Operator site, HTTP 200; Visit Victoria (https://www.visitvictoria.com/regions/mornington-peninsula/eat-and-drink/local-produce/the-chocolateries-mornington-peninsula); Tripadvisor | High |
| `venues/peninsula-fresh-organics.json` | `peninsulafreshorganics.com.au` (NXDOMAIN) | `https://www.peninsulafresh.com/` | Operator site, HTTP 200, "certified organic vegetables, Baxter VIC"; Organic Angels grower profile (https://www.organicangels.com/blog/post/meet-the-grower-peninsula-fresh) | Medium-high |
| `experiences/flinders-golf-club.json` | `www.flindersgolf.com.au` (NXDOMAIN) | `https://www.flindersgolfclub.com.au/` | Club site, HTTP 200; Visit Victoria (https://www.visitvictoria.com/regions/mornington-peninsula/see-and-do/outdoor-and-adventure/golf/flinders-golf-club) | High |
| `venues/the-continental-sorrento.json` (The Continental) | `continentalsorrento.com.au` (resolves, but TLS chain fails: self-signed certificate in chain, reproduced by two independent clients) | `https://thecontinentalsorrento.com.au/` and `/stay` | Operator site, HTTP 200, branded "The Continental Sorrento", 1-21 Ocean Beach Road, showing September 2026 events and live booking | High |
| `tour-operators/arthurs-seat-eagle.json` | `www.arthursseat.com.au` (resolves, but returns HTTP 436 / connection reset) | `https://aseagle.com.au/` | Operator site, HTTP 200; Wikipedia (https://en.wikipedia.org/wiki/Arthurs_Seat_Eagle); Visit Mornington Peninsula | High |
| `events/archive/faux-snow-flurries-arthurs-seat-eagle-2026.json` | `www.arthursseateagle.com.au` (NXDOMAIN) | `https://aseagle.com.au/` | As above. Record is archived; the URL was still wrong | High |
| `events/trivia-jetty-road-brewery-winter-2026.json` | `jettyroadbrewery.com.au` (NXDOMAIN) | `https://www.jettyroad.com.au/` | Operator site, HTTP 200, Dromana brewery; Visit Mornington Peninsula listing | High |
| `events/chocolaterie-junior-chocolatier.json` | `morningtonpeninsulachocolates.com.au` (NXDOMAIN) | `https://www.mpchoc.com.au/` | Operator site lists the Junior Chocolatier class | High |
| `tours/moonlit-sanctuary-twilight-tour.json` | `moonlitsanctuary.com.au/twilight-tour/` (301s to the homepage, so the recorded page is gone) | `https://moonlitsanctuary.com.au/night-tours/` | Operator page, HTTP 200, the same product now named Night Tours; Visit Melbourne (https://www.visitmelbourne.com/regions/melbourne/see-and-do/tours/nature-and-wildlife-tours/moonlit-sanctuary-night-tours/moonlit-sanctuary-night-tour) | High |

**Address discrepancies noticed while checking, filed not fixed** (outside this tier's remit):
Mornington Peninsula Chocolates is recorded at 50 Cook St, Flinders and public listings give 45 Cook St;
Peninsula Fresh Organics is recorded at 170 Baxter-Tooradin Rd and the operator gives 6 Henderson Road,
Baxter for the farm with a separate farmgate store on Baxter-Tooradin Rd.

---

## Verified as recorded, no change

| Record | Verdict | Evidence | Confidence |
|---|---|---|---|
| `venues/crittenden-villas.json` | The record's claim that Stillwater at Crittenden is permanently closed and the estate restaurant now trades under a different name is **correct**, and the villas are trading. | Tripadvisor and Yelp both carry Stillwater at Crittenden as permanently closed (https://www.tripadvisor.com.au/Restaurant_Review-g552161-d738113-Reviews-Stillwater_at_Crittenden-Dromana_Mornington_Peninsula_Victoria.html); recorded URL `lakesidevillas.com.au` HTTP 200 and confirms Crittenden Cellar Door and Crittenden Restaurant on site | High |
| `venues/polperro-villas.json` | Restaurant and cellar door closed Mondays and Tuesdays, as recorded. | Operator cellar door page (https://www.polperrowines.com.au/cellar-door/): open Wednesday to Sunday | High |
| `venues/red-hill-estate.json` | Trading. Cellar door open seven days. | Operator site (https://www.redhillestate.com.au/pages/cellar-door) | High |
| `venues/stonier-wines.json` | Trading, and the ownership-change claim is correct: acquired by Circe (three local families) from Accolade in December 2022. | Winetitles (https://winetitles.com.au/mornington-peninsula-producer-circe-acquires-stonier-from-accolade-wines/); operator site HTTP 200 | High |
| `venues/t-gallant.json` | Trading. Recorded domain `tgallantvineyard.com.au` HTTP 200; Treasury Wine Estates ownership as recorded. | Operator site; OpenTable listing for T'Gallant Vineyard | High |
| `signature-events/main-street-mornington-festival.json` | Cancellation for 2026 is correct and correctly cited in the record. | Mornington Peninsula News, 11 August 2026 (https://www.mpnews.com.au/2026/08/11/main-street-mornington-festival-cancelled-for-2026/): Northern Mornington Peninsula Tourism cancelled the event, unable to secure the funding needed | High |
| `signature-events/portsea-polo.json` | Returned in 2026 under new ownership after a hiatus, as recorded. Not a closure. | Operator site `portseapolo.com.au` HTTP 200 | Medium |
| `tours/ricks-mornington-peninsula-wine-tour.json` | Trading. Recorded URL HTTP 200 and the Mornington Peninsula product page is live. | https://rickswinetours.com.au/mornington-peninsula-wine-tours/ | High |

---

## Cannot tell

Recorded in the record itself as `operatingStatus: verify-open` plus a dated `closureNote` giving
what was checked and what was found, except where the collection has no such field (noted).

| Record | What is known | What is not known | Confidence in "unresolved" |
|---|---|---|---|
| `venues/pier-street-flinders.json` (Pier Street Kitchen) | Desk recorded `status: closed`. `pierstreetflinders.com.au` NXDOMAIN. No operator page, council listing or review-platform entry for a Pier Street Kitchen at Flinders exists. Tripadvisor and AGFG carry Pier Provedore at 38 Cook St, Flinders instead (https://www.agfg.com.au/restaurant/pier-provedore-49770) | Whether the venue closed, or was never separately listed. No closure announcement exists to cite | High |
| `venues/phaedrus-estate.json` | `phaedrusestate.com` NXDOMAIN, and `phaedrusestate.com.au` does not exist either. The winery appears to be trading: listed with an operating cellar door by Visit Mornington Peninsula and the Australian Wine Companion (https://winecompanion.com.au/wineries/victoria/mornington-peninsula/phaedrus-estate), at 232 Red Hill Road | No current operator domain could be found, so no corrected URL was written | High |
| `venues/villa-mallorca.json` | `villamallorca.com.au` NXDOMAIN. Still carried by Booking.com (https://www.booking.com/hotel/au/villa-mallorca.html) and Victoria Tourism | Whether it is still taking bookings, and under what URL. OTA inventory lags | Medium |
| `venues/balnarring-pub.json` | `balnarringhotel.com.au` NXDOMAIN. No business trading as The Balnarring Pub at the recorded number. The village pub is The Heritage Balnarring at 3059 Frankston-Flinders Rd (https://www.theheritagebalnarring.com.au/); Yelp carries a separate closed listing for Heritage 3059 (https://www.yelp.com/biz/heritage-3059-balnarring-2) | Whether this record is The Heritage under an earlier name, or a business that no longer exists | Medium |
| `venues/via-boffe.json` | `viaboffe.com.au` NXDOMAIN. A Via Boffe trades as a cafe at 59 Main Street, Mornington (https://via-boffe.square.site/) | The record describes a trattoria at Main Ridge. Different locality, different format. Not recorded as a correction | Medium |
| `venues/lightfoot-wines.json` | `lightfootwines.com.au` NXDOMAIN. The Lightfoot label that trades is Lightfoot and Sons in the Gippsland Lakes district (https://winecompanion.com.au/wineries/victoria/gippsland/lightfoot-wines) | The record places it at Main Ridge. No Main Ridge winery of this name found. The Gippsland URL was deliberately not recorded | Medium |
| `venues/small-stone-pantry.json` | `smallstonepantry.com.au` NXDOMAIN. No trace of the business in web search, review platforms or shire listings | Everything. Absence of a listing is not evidence of closure | High |
| `venues/mornington-farmers-market.json` | `mpfm.com.au` NXDOMAIN. The shire markets page (https://www.mornpen.vic.gov.au/Things-to-do/Markets) lists a Mornington Racecourse Market but no farmers market at Mornington Park or The Esplanade. A Yelp listing under the same name gives a Bittern address | Whether a monthly bayfront market still runs at Mornington Park | Medium |
| `venues/driftaway-on-dundas.json` | Already carried `operatingStatus: verify-open`. Domain resolves but every path returns HTTP 404, including pages still in search-engine indexes. Still carried by Tripadvisor and Google Hotels | Whether the business is trading behind a broken site | Medium |
| `venues/garagiste.json` | Already carried `operatingStatus: verify-open`. The label is trading: current on the Australian Wine Companion and stocked by several retailers. `garagiste.com.au` returned HTTP 503 on the day of checking | Whether the by-appointment visiting described in the record is still offered. Marker retained | Medium |
| `tour-operators/temptation-sailing.json` | `temptationsailing.com` NXDOMAIN. The only Temptation Sailing in the public record is a dolphin-swim catamaran operating from Glenelg, South Australia (https://dolphinboat.com.au/, https://southaustralia.com/products/adelaide/tour/temptation-sailing) | The record describes Sorrento Pier departures on Port Phillip Bay. No Peninsula operator of that name could be found. The `tour-operators` collection has no `operatingStatus` field, so this is recorded here only | Medium-high |
| `tours/temptation-sailing-bay-cruise.json` | Same operator, same dead domain | Same. `tours` has no `operatingStatus` field | Medium-high |

### Evidence records with dead source URLs

Three evidence records point at domains that no longer resolve. Their URLs were **not** rewritten:
an evidence record is a dated statement about what was read on a given day, and silently repointing
it at a different URL would manufacture a check that never happened. The correct operator URL is
given here so the desk can re-evidence the claim properly.

| Record | Dead URL | Operator URL that should be used on re-check | Evidence |
|---|---|---|---|
| `evidence/quick-notes/2026-05-01-laura-sunday-lunch-windows/booking-86be36c5.json` | `laurarestaurant.com.au` (NXDOMAIN) | `https://www.ptleoestate.com.au/dine/laura/` | Pt Leo Estate dining pages; Relais & Chateaux listing for Laura at Pt Leo Estate (https://www.relaischateaux.com/us/restaurant/laura/) |
| `evidence/quick-notes/2026-05-05-cellar-door-wet-day/booking-7be8827e.json` | `www.mainridgeestate.com.au` (NXDOMAIN, apex too) | `https://mre.com.au/` | Operator site; Visit Victoria and Australian Wine Companion both give mre.com.au |
| `evidence/quick-notes/2026-05-05-cellar-door-wet-day/booking-f05eec09.json` | `www.redhellestate.com.au` (NXDOMAIN) | `https://www.redhillestate.com.au/` | Transparently a typo of Red Hill Estate, whose domain resolves and serves HTTP 200. The typo is also present in the record's preserved `legacy.value`, so it predates migration |

---

## What would resolve the rest

Of the 16 unresolved records, the blockers fall into three groups.

1. **No operator presence at all** (Small Stone Pantry, Pier Street Kitchen, The Balnarring Pub).
   Nothing further is available from open sources. These need either the Victorian business names
   register / ABN lookup, or a shire business directory query, or a site visit. They cannot be
   settled by search.
2. **Entity identity in doubt** (Via Boffe, Lightfoot Wines, Temptation Sailing, Mornington
   Farmers' Market). A trading business with the same name exists in each case, in the wrong
   locality or the wrong format. Someone has to decide whether the record was always about that
   business and carries a wrong address, or is about something else. That is an editorial
   judgement on the record's provenance, not a research task.
3. **Operator site down, third-party inventory alive** (Driftaway on Dundas, Villa Mallorca,
   Phaedrus Estate, Garagiste). A direct booking attempt or a look at the operator's social account
   would settle each of these in minutes. Contact was out of scope for this pass.

## Changes made

24 content records edited. No record deleted, moved, renamed or de-collected. No published `status`
value changed. No editorial prose rewritten.

- 13 records: corrected `website` / `bookingUrl` / `officialEventUrl`.
- 1 record: `operatingStatus: permanently-closed` plus sourced `closureNote` (Max's).
- 10 records: `operatingStatus: verify-open` plus a dated, sourced `closureNote`.
- 2 records: `closureNote` added or appended to an existing note, without changing the marker
  (Pier Street Kitchen, La Baracca).
