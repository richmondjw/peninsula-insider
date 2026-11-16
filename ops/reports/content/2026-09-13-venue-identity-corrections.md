# Venue identity corrections: Pier Street Kitchen, The Balnarring Pub, Balnarring Bakehouse

Date checked: 2026-09-13. Follows `2026-09-13-closure-and-status-tier.md` (PI-007), which left
all three venue records unresolved. Raised while fact-checking a game chapter.

The earlier pass asked "is this business still trading?" and could not answer, because two of
the three businesses never existed under the details recorded. This pass asked a different
question: "which real business, if any, is this record describing?" That question can be
settled from public sources.

## Outcomes

| Record | Finding | Action |
|---|---|---|
| `venues/pier-street-flinders.json` (Pier Street Kitchen, Flinders) | Does not exist as recorded | Retired: record deleted, redirect stub, references removed from 12 files |
| `venues/balnarring-pub.json` (The Balnarring Pub) | Real business, wrong name, number, domain, phone and coordinates | Corrected in place to The Heritage Balnarring; slug and URL kept |
| `venues/balnarring-bakehouse.json` | Real listing; address was right; phone and coordinates wrong; trading unconfirmed | Coordinates corrected, unverified phone removed, `verify-open` marker with dated note |
| `places/balnarring.json` | Bookshop and "Thursday farmers' market" claims unsupported | Replaced with the verified market and pub |

## 1. Pier Street Kitchen, Flinders: retired

**What the record claimed.** A one-hat bistro at 39 Cook St, Flinders, Good Food Guide 2024,
Flinders Pier oysters, website `pierstreetflinders.com.au`.

**Evidence.**

- `pierstreetflinders.com.au` does not resolve (NXDOMAIN against 1.1.1.1, rechecked 2026-09-13).
- A business called Pier Street Kitchen does exist, but it is a daytime cafe at 19 Pier St,
  **Dromana**, with a Mediterranean and Middle Eastern breakfast and lunch menu, open to 4pm:
  https://www.pierstreetkitchen.com.au/, https://www.agfg.com.au/restaurant/pier-street-kitchen-36476,
  https://www.theninch.com.au/post/pier-street-kitchen. It is not hatted, not in Flinders, and not a
  dinner bistro, so it is not the business the record describes.
- OpenStreetMap has no Pier Street in Flinders (Nominatim structured query, street=Pier Street,
  city=Flinders, returns nothing). The Pier Street in the region is in Dromana.
- The Flinders cafe near the recorded address is Pier Provedore at 38 Cook St:
  https://www.agfg.com.au/restaurant/pier-provedore-49770,
  https://www.tripadvisor.com/Restaurant_Review-g552171-d5812255-Reviews-Pier_Provedore-Flinders_Mornington_Peninsula_Victoria.html.
  The breakfast article's "small sit-down cafe across from the Flinders pier" most likely
  garbled this business, but its menu details (mushrooms on toast, berry friand) are not
  evidenced for Pier Provedore either.

**Action.**

- Deleted the record (precedent: Thai Orchid Mornington and Azuma Japanese, removed 2026-05-29
  as "does not exist").
- `src/pages/eat/pier-street-flinders.astro` redirects `/eat/pier-street-flinders/` to
  `/explore/places/flinders/`. Not `consolidate`: the page was already `noindex` and out of the
  sitemap, and the place page is not the same entity.
- References removed from: `a-winter-peninsula-weekend`, `area-guide-flinders` (the "key lunch
  booking" section), `breakfast-before-the-crowds` (section 4 and cheat-sheet line; now four
  rooms), `the-easter-peninsula`, `the-seafood-list` and `the-sunset-hour` (`relatedVenues`),
  `eat/seafood.astro` (listing, description, two FAQ answers and body copy calling it the
  hatted seafood room), `nazaaray-estate` `pairWith`, `_accuracy_pass.py`, and the URL lists in
  `ops/scripts/seo-audit.py` and `seo-classify.py`.
- `peninsula-notes-june-2026` and `why-winter-works-on-the-peninsula` described a "Pier Street
  precinct" and "Pier Street bakeries" in Flinders. There is no such street there; both now say
  "village".

**No replacement added.** Pier Street Kitchen (Dromana) and Pier Provedore (Flinders) are both
verifiable, but a venue record needs editorial copy (signature, editor note, what to order) that
would have to be written without a source. Both are listed below as candidates.

## 2. The Balnarring Pub: corrected to The Heritage Balnarring

**What the record claimed.** "The Balnarring Pub", 3050 Frankston-Flinders Rd, phone
03 5983 5258, website `balnarringhotel.com.au`, open fires, shaded beer garden, counter meals,
Peninsula-brewery taps, Sunday roast.

**Why this is a correction, not a retirement.** No business trades as The Balnarring Pub. The
pub in Balnarring village is The Heritage Balnarring, three street numbers away, and the parts of
the record that can be checked (village pub, open fires, beer garden, Sunday roast) match it.

**Evidence (operator site, all read 2026-09-13).**

- About, https://www.theheritagebalnarring.com.au/about: 1930s heritage home, original open fires,
  sunny deck, large beer garden, two-acre property, grass area and sandpit, live music most
  Sundays on the deck, "we unfortunately don't allow pets into the venue", call to book.
- Visit, https://www.theheritagebalnarring.com.au/visit: 3059 Frankston-Flinders Road, Balnarring
  3926; 03 5983 2597; Monday and Tuesday closed, Wednesday to Sunday 11:30 to late.
- Menu, https://www.theheritagebalnarring.com.au/eat: pub favourites (chicken parmigiana or
  schnitzel, pub-style fish and chips, cheeseburger), specials board, Sunday roast through winter
  until sold out.
- Functions, https://www.theheritagebalnarring.com.au/functions: private dining April to September.
  Sitemap lastmod 2026-09-05, so the site is actively maintained.
- Coordinates: OpenStreetMap node "The Heritage - Balnarring" (-38.3744, 145.1235). The old point
  was about 1.4 km east of the village.

**Is it open?** Yes. The Yelp listing marked closed, "Heritage 3059"
(https://www.yelp.com/biz/heritage-3059-balnarring-2), carries the same phone and website as the
live business, and Publocation's copy of that listing
(https://publocation.com.au/pubs/vic/balnarring/heritage-3059) shows the same details. It reads as
a stale duplicate. Yelp also carries a separate current listing
(https://www.yelp.com/biz/the-heritage-balnarring), and the operator site was updated this month.

**Action.**

- Record corrected in place: name, address, phone, website, booking URL, coordinates, signature,
  editor note, why-we-go, best-for, if-only-one-thing, known-for, hero alt. `operatingStatus:
  verify-open` removed; `closureNote` now records the resolution; `editorialProvenance` records a
  researched check on 2026-09-13 against the operator site.
- **Slug kept** (`balnarring-pub`, `/eat/balnarring-pub/`). The URL is indexed and in the sitemap,
  and CMS overrides and the content registry are keyed by slug. Renaming it to
  `the-heritage-balnarring` with a consolidating redirect is a reasonable follow-up, not done here.
- Removed from the copy because the operator contradicts or does not support it: counter service,
  "order at the counter", a small room, Peninsula-brewery taps, steak sandwich, a north-east-facing
  garden, "no bookings", "lunch and dinner daily", `balnarringpub.com.au`, and **2 Coolart Road**
  (the address both Insider Picks editions published).
- **Dog-friendly claims reversed.** The site told readers in nine places, across five pages, that this pub's beer garden
  welcomes dogs. The operator says pets are not allowed. Removed from
  `dog-friendly-cafes-pubs-wineries-mornington-peninsula`, `the-dog-friendly-peninsula` (listing and
  the 7pm dinner in the dog weekend plan), `dog-friendly-accommodation-mornington-peninsula`,
  `the-pub-guide` FAQ and section, and `eat/pubs.astro` (two FAQ answers). The pub guide and pubs hub
  now say plainly that it does not allow pets.
- Removed from the no-booking guide (`where-to-eat-without-a-booking`, and `eat/no-booking.astro`),
  because the operator asks guests to call to book.
- Renamed with corrected details across: `the-pub-guide`, `the-pub-crawl`, `the-friday-night-arrival`,
  `the-winter-long-lunch`, `the-easter-peninsula`, `the-couples-weekend`, `the-four-hour-peninsula`,
  `the-market-saturday`, `the-peninsula-beach-swimming-guide`, `the-school-holidays-survival-guide`,
  `the-producer-trail`, `eat/pubs.astro`, `journal/mornington-peninsula-in-autumn.astro`,
  `journal/mornington-peninsula-in-winter.astro`, `venues/balnarring-market.json`,
  `venues/balnarring-bakehouse.json`, `fix_venue_images.cjs`.
- `insider-picks-2026-08-10` and `insider-picks-2026-09-04` are dated editions that published a wrong
  address, a non-existent website, walk-in and daily-opening claims. Both were corrected and carry a
  dated italic correction line saying what they originally said.

## 3. Balnarring Bakehouse: flagged, not retired

**The shared 3050 address is not suspicious after all.** 3050 Frankston-Flinders Rd is the street
address of the Balnarring Village Shopping Centre
(https://balnarring-vic.aussiestoresonline.com/balnarring-village-shopping-centre/), which is why
Yelp lists several businesses there. The pub record was wrong to use it; the bakehouse record was not.

**Evidence the business exists.** Tripadvisor lists Balnarring Bakehouse Bakery and Cafe, Russell
Street, Balnarring Village Shopping Centre
(https://www.tripadvisor.com.au/Restaurant_Review-g1066997-d15767989-Reviews-Balnarring_Bakehouse_Bakery_and_Cafe-Balnarring_Mornington_Peninsula_Victoria.html),
and a centre store directory lists a Balnarring Bakehouse
(https://www.australia-shoppings.com/malls-centres/victoria/balnarring/balnarring-village-shopping-centre,
dated December 2022).

**Why trading is not confirmed.** No operator site exists. The phone on that listing, 03 5983 1494,
is also carried by a Balnarring Takeaway (formerly listed as Conroys Bakehouse) at Shop 9 of the same
centre (https://restaurantguru.com/Conroys-Bakehouse-Balnarring), whose newest reviews are about three
years old. That could be the same shop renamed, or two businesses. It cannot be told from public
sources. The Red Hill Baker trades at 1/3000 Frankston-Flinders Rd
(https://www.redhillbaker.com.au/) and is a different business.

**Action.** Coordinates moved to the OpenStreetMap address node for 3050 Frankston-Flinders Rd (the
old point was about 1.2 km east). The recorded phone, 03 5983 5060, could not be tied to the business
and was removed rather than replaced. Address now names the shopping centre. `operatingStatus:
verify-open` added with a dated `closureNote`. Listing status unchanged.

**Open.** The record's menu details (beef-and-mushroom pie, custard tart, vanilla slice, Saturday
breakfast sandwich) and the article copy that repeats them are not evidenced by any source found.
The bakehouse is also an Insider's 30 pick (`insiders-thirty/2026.json`). Both need an editor, or a
phone call to the centre.

## 4. Balnarring place page

- "a bookshop that has outlasted all reasonable expectations": the only Balnarring bookseller found,
  The Stray Dog Booksellers, describes itself as principally an online bookshop, with a PO Box address,
  (https://biblio.com.au/bookstore/the-stray-dog-booksellers-balnarring). Removed from the intro and
  the TL;DR.
- "a Thursday morning farmers' market" (intro, TL;DR, best day): no source for any Thursday market.
  The Balnarring market is Emu Plains Market, typically the third Saturday of the month, October to
  April, at Emu Plains Reserve, Coolart Road
  (https://www.emuplainsmarket.com.au/frequently-asked-questions). That matches the page's own
  `factualLede` ("the monthly Emu Plains Market") and the `balnarring-market` venue record.
- "with the best bakehouse on the bay side": Balnarring is on Western Port, not the bay, and the
  bakehouse's trading status is unconfirmed. Signature rewritten without the bakery claim.

## Follow-ups not done here

1. **`venues/pier-street-seafood.json` ("Pier Street Fresh Seafood", 34 Pier St, Dromana).** No
   business of this name was found. The Dromana fishmonger is Peninsula Fresh Seafood, 2/10 Thomson
   Terrace (https://peninsulafreshseafood.com.au/). Separately, `the-seafood-list` and
   `the-peninsula-pantry` place "Pier Street Seafood" **in Flinders** at the pier, which cannot be
   right, since Pier Street is in Dromana. Needs the same identity check.
2. **Candidate replacement venues, verifiable but not written:** Pier Provedore, 38 Cook St, Flinders
   (cafe, breakfast and lunch); Pier Street Kitchen, 19 Pier St, Dromana (cafe). Both need editorial
   copy with a source behind it.
3. **Slug rename** `balnarring-pub` to `the-heritage-balnarring`, with a consolidating redirect,
   once the CMS content registry refresh is healthy.
4. **Balnarring market records disagree with each other.** `venues/balnarring-market.json` says the
   Balnarring Village Green; `insider-picks-2026-09-07` and `-09-12` describe a "Balnarring Farmers
   Market" at Balnarring Recreation Reserve, 8am to 12:30pm; the Emu Plains Market operator says Emu
   Plains Reserve, 9am to 2pm. Not reconciled here.
5. **Other Balnarring Bakehouse claims** in `red-hill-market.json` (a "Balnarring Bakehouse stall"),
   `the-producer-trail` (sourdough supplied to Peninsula Fresh Organics), and several articles are
   unevidenced.
6. `next/docs/INSTAGRAM-EDITORIAL-*.md` still name "The Balnarring Pub". These are strategy docs, not
   published copy, and were left alone.
