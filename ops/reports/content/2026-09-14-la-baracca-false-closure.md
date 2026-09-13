# La Baracca at T'Gallant is trading. The closure was wrong.

PI-007 (GitHub issue #368), register item A6, second half. Branch `pi/007-la-baracca`.
All checks performed 2026-09-14 (Australia/Melbourne). Verifier: automated desk pass, operator
primary sources, no contact made with the business.

## The finding, first

**La Baracca at T'Gallant is open.** It trades daily, 10:00-17:00, as a named dining room inside
T'Gallant Vineyard at the address this record already carries. The `permanently-closed` marker
written in May 2026 was wrong, and the brief for this pass — retire the venue, strip the
recommendations, redirect the page — would have delisted a trading restaurant.

This pass therefore does the opposite of what it was scoped to do. Nothing was retired. The false
closure was lifted, and the contact details that had gone stale were corrected. No editorial prose
was rewritten and no page was redirected.

## Why this was urgent rather than merely wrong

From May to September 2026 the marker was inert: `operatingStatus` was not in the venue schema, Zod
stripped it on load, and the page kept rendering as a live restaurant. That is the defect PI-007
item A6 was raised against, and it was real.

It stopped being inert yesterday. PI-008 (#414) declared `operatingStatus` in
`next/src/content.config.ts`, added `isPermanentlyClosed` / `isListableVenue` to
`next/src/lib/editorial.ts`, and shipped `audit-closed-venue-leaks.mjs` to keep closed venues off
listing surfaces. All three are correct. Their combined effect on this record, from the moment they
landed, is that a restaurant which is open every day was delisted from every listing surface on the
site and its detail page began rendering a closure notice with the booking action suppressed.

So the live state before this change was not "a closed venue being recommended". It was the
inverse: **a trading business publicly marked permanently closed by this site.** Fixing the schema
turned a latent bad record into an active false statement about a real operator.

## Evidence

| # | Source | What it establishes | Checked |
|---|---|---|---|
| 1 | `https://www.tgallant.com.au/` returns HTTP 301 to `https://tgallantvineyard.com.au/` (HTTP 200) | The domain on this record was not abandoned. It redirects to the operator's current site. | 2026-09-14 |
| 2 | Operator site, T'Gallant Vineyard (https://tgallantvineyard.com.au/) | Lists La Baracca by name as one of six current spaces (La Baracca, Spuntino Bar, Cantina Felice, The Barrel Room, Cellar Door, Outdoor Tables). Describes it verbatim as "A fun and bright dining room accommodating our larger group bookings or walk-ins." | 2026-09-14 |
| 3 | Operator contact page (https://tgallantvineyard.com.au/contact/) | Address `1385 Mornington-Flinders Rd, Main Ridge VIC 3928` — an exact match for the address already on this record. Phone `(03) 5989 6188`. "Open daily 10:00 am to 5:00 pm." | 2026-09-14 |
| 4 | Operator FAQ (https://tgallantvineyard.com.au/faq/) | Trading daily 10:00-17:00. "We welcome walk ins, however we highly recommend bookings on weekends to ensure your spot." Groups of 13+ book direct. | 2026-09-14 |
| 5 | Operator menu (https://tgallantvineyard.com.au/menu/) | Woodfired pizzas (7+ varieties), pasta in Mains (Spaghetti Marinara, Rigatoni Pork Ragu), and four T'Gallant Pinot Grigios by glass/bottle (Encore 13/53, Cape Schanck 14/58, Juliet 14/58, Grace 15/63). | 2026-09-14 |
| 6 | Operator bookings page (https://tgallantvineyard.com.au/bookings/) | Live reservations via Now Book It, plus phone booking on the number in row 3. La Baracca named as a bookable space. | 2026-09-14 |
| 7 | Tripadvisor, T'Gallant Vineyard (https://www.tripadvisor.com/Restaurant_Review-g2055778-d26701225-Reviews-T_Gallant_Vineyard-Main_Ridge_Mornington_Peninsula_Victoria.html) | Open, with current reviews, same locality. | 2026-09-14 |
| 8 | OpenTable, T'Gallant Vineyard Main Ridge (https://www.opentable.com/r/tgallant-vineyard-main-ridge) | Bookable listing at the same address. Recorded by the PI-007 pass on 2026-09-13; a re-fetch on 2026-09-14 timed out, so this row is corroboration only and nothing here rests on it. | 2026-09-13 |

Confidence: **high**. Rows 2-6 are the operator's own site, they agree with each other, and row 3
matches the address already on this record, so the possibility that this is a different business
with a similar name is excluded rather than assumed away.

### What the May 2026 editor probably saw

Commit `7a0056d7dc` (2026-05-19, "remove La Baracca from T'Gallant — concept discontinued, new menu
confirmed May 2026") is the origin. The estate did rebrand: `tgallant.com.au` became
`tgallantvineyard.com.au`, standalone "La Baracca Trattoria" listings on directory sites went stale,
and the menu changed. The editor read a rebrand as a closure. The dining room kept its name
throughout, and is on the operator's site under that name today.

## Changes made

One content file. `next/src/content/venues/la-baracca-tgallant.json`:

- `operatingStatus: "permanently-closed"` — **removed.** The schema comment is explicit that the
  marker is omitted for active venues, and the enum has no value meaning "checked, and open".
- `closureNote` — **removed.** It documented a closure that did not happen. What was checked and
  when is recorded here, which is what a report is for; leaving a stale narrative of a non-event on
  the record would re-seed the same mistake for the next editor who reads it.
- `phone`: `+61 3 5989 6565` to `+61 3 5989 6188` (evidence row 3).
- `website`: `https://www.tgallant.com.au` to `https://tgallantvineyard.com.au/` (row 1).
- `bookingUrl`: `https://www.tgallant.com.au` to `https://tgallantvineyard.com.au/bookings/` (row 6).
- `lastVerified`: `2026-04-09` to `2026-09-14`.

Net effect: `status` is absent and defaults to `active`, `isPermanentlyClosed` is false, the venue
returns to listing surfaces, and its detail page renders normally with a working booking link.

## Deliberately not done

- **No retirement.** No redirect stub, and no removal of the venue from
  `articles/three-italian-dinners.md` (`relatedVenues`), `pages/eat/paddock-to-plate.astro`
  (`slugs`), or the `pairWith` arrays in `venues/kooyong.json`, `venues/main-ridge-estate.json` and
  `venues/ten-minutes-by-tractor.json`. Those references are correct and stay.
- **No correction line on any published edition.** No edition published a false claim: the site said
  the restaurant was open, and it is open.
- **No editorial rewrite.** See the follow-ups below; each needs an editor, not this pass.

## Follow-ups for an editor

1. **`venues/t-gallant.json` was collaterally damaged by the same May commit** and has not been
   corrected here. That commit stripped "La Baracca and Spuntino Bar" from the dining description,
   removed `"La Baracca at T'Gallant"` from `pairWith`, rewrote the `editorNote` to say the dining
   "has evolved from the old La Baracca trattoria format into a new menu concept", and replaced the
   FAQ answer to "Does T'Gallant have a restaurant?" with a generic one. Both rooms are on the
   operator's site today under those names. This is prose, so it is filed rather than rewritten.
2. **"by the carafe"** appears in this record's `signature`, `editorNote` and `knownFor`
   ("T'Gallant Pinot Grigio by the Carafe"). The current menu prices Pinot Grigio by the glass and
   the bottle and shows no carafe. Weak evidence — a menu page need not list every format — so it is
   flagged, not cut.
3. **`sitemapExclude: true`** is left as found. It predates the May closure (it is present in the
   record before commit `7a0056d7dc`), so it was not set by the closure and lifting it is a separate
   indexing decision. Only three venues in the corpus carry it: this one,
   `maxs-red-hill-estate.json` and `ouest-france-bistro.json`. The other two are closure-related,
   which makes this one look like a straggler worth a deliberate answer.
4. **`venues/ouest-france-bistro.json`** remains the open contradiction PI-007 logged: recorded
   `status: permanently_closed` while the public record says it trades. Not touched here. It is now
   delisted by the same live predicate, so it carries the same class of risk this report describes.

## Second-order finding: the closed-venue predicate has no brake

`isPermanentlyClosed` is a one-way gate. A single wrong word in one field of one JSON file removes a
business from the entire site and publishes a closure notice on its page, and nothing in the
pipeline asks for a source, a date or a second opinion before that happens.
`audit-closed-venue-leaks.mjs` guards the direction that recommends a closed venue. Nothing guarded
this direction, and this record sat wrong for four months, caught only because the field it was
written in happened to be broken.

A lint cannot decide whether a restaurant is open. What it can do is refuse to let a closure hide
where the build cannot see it — see `next/scripts/lint-unschemad-closure-signals.mjs`, added on this
branch, and the corpus survey in
`ops/reports/content/2026-09-14-unschemad-closure-signals.md`.
