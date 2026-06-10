# Site-wide Fact-Check Audit — Findings Report

Audit started 2026-06-10. Companion to `tracker.md`. Each section is appended
as a verification batch completes. "Updated" items had high-confidence
corrections applied to content JSON; "flag" items need human review.

Note on method: direct HTTP fetches are blocked from the build sandbox
(egress proxy 403s), so URL liveness was established via current
search-engine indexing of each domain rather than direct fetches.

---

## Batch 1a — Signature events (11/11 complete, 2026-06-10)

**Updated (2):**

- `main-street-mornington-festival` — the page still framed 2026 as
  unconfirmed ("seeking sponsors") after the 2025 funding cancellation. The
  official site now confirms the festival returns **Sunday 19 October 2026**
  (28th year). `summary`, `whatItIs`, `editorialNotes`, `lastReviewed`
  updated; the "subject to funding confirmation" recurrence wording kept
  deliberately. Sources: mainstreetfestival.com.au, mornpen.vic.gov.au.
- `sailing-regattas` — `officialUrl` pointed at a dead SSCBC deep link
  (`/coutaboats/`, not in the site's current index). Switched to the
  verified club homepage `https://sscbc.com.au/`. Fleet/racing-season
  claims (largest Couta Boat fleet, 120+ boats, Nov–June racing) confirmed.

**Verified accurate (9):** annual-festivals, mornington-winter-music-festival,
peninsula-film-festival, portsea-polo, portsea-swim-classic,
portsea-twilight, sorrento-writers-festival, wine-weekends,
winter-wine-weekend. Key confirmations: Portsea Polo's Feb 2026 return under
F3Polo after a five-year hiatus; Sorrento Writers Festival 2026 ran 23–26
April (founder Corrie Perkin, ~6,000 visitors 2025); Winter Wine Weekend 2026
ran 6–8 June at Red Hill Showgrounds; Portsea Twilight 2027 announced for
9 Jan 2027.

**Optional enrichment suggestions (human, non-blocking):**

- `peninsula-film-festival` — page never names Rosebud, the festival's
  long-standing home venue; `relatedPlaces` lists mornington/sorrento only.
- `wine-weekends` — organiser's consumer-facing domain is now
  morningtonpeninsulawine.com.au; mpva.com.au still live and valid.
- `mornington-winter-music-festival` — official site still titles itself
  "Queen's Birthday"; our "King's Birthday" wording is the current correct
  name. No action needed.

---

## Batch 1b — June 2026 events (12/12 complete, 2026-06-10)

**Updated (4):**

- `emu-plains-market-balnarring` — listed for 20 June, but the market does
  **not run in winter** (official season is October–April; 2026 dates: 17
  Jan, 21 Feb, 21 Mar, 18 Apr, 17 Oct, 21 Nov, 19 Dec). Rolled to 17 Oct
  2026, season/month corrected, recurrenceNote now states the Oct–Apr
  season. Sources: emuplainsmarket.com.au, visitmorningtonpeninsula.org.
- `mt-eliza-farmers-market` — startDate 2026-06-24 was a **Wednesday**; the
  market runs 4th Sundays, corrected to 28 June. officialEventUrl switched
  from a peninsulakids.com.au listing to mtelizafarmersmarket.com.au.
- `dromana-community-market` — file had Sunday 28 June 9am–1pm at "Dromana
  Park"; official site says **Saturday 27 June, 8am–1:30pm at Dromana
  Community Park**, Point Nepean Rd. Corrected date/time/venue/address and
  replaced the vicfomo.com aggregator URL with dromanamarket.org.au.
- `mornington-racecourse-market` — date correct but season/month fields
  said autumn/May against a 14 June date; corrected to winter/June.

**Verified accurate (5):** soul-night-market-mornington (12 Jun, Peninsula
Community Theatre), mornington-racecourse-monthly-market-june-2026 (14 Jun),
sorrento-solstice-festival-2026 and -fire-night (20–21 Jun, free ticketed
via Humanitix), boneo-community-market (3rd Sat, 8am–1pm).

**Flagged for human review (3):**

- `ninch-nabs-samples-seconds-makers-market` — no source anywhere confirms a
  June 2026 market; only a documented Nov 2025 event (which ran 8am–2pm,
  not the listed 9am). Confirm with organiser or archive.
- `pearcedale-community-market` — date/venue verified, but opening hours
  conflict across sources (8am–12pm vs 9am–1pm). Check the market's
  Facebook page.
- `winter-camp-2026-the-ranch` — Winter Camp 2026 exists ("Hit the Switch"
  theme), but the exact dates (file: 30 Jun–2 Jul; a camps-association
  listing suggests 29 Jun–3 Jul) and the $675 price could not be
  authoritatively confirmed. Check theranchmp.com.au/winter-camp/.

---

## Batch 1c — Stale "published" events triage (24/24 complete, 2026-06-10)

**Archived (6):** the King's Birthday weekend one-offs ended 8 June:
`winter-wine-weekend-june`, `crittenden-wines-king-s-birthday-wine-weekend-events`,
`mornington-peninsula-winter-wine-weekend-winter-wine-festival`,
`stonier-pies-pinot-king-s-birthday-weekend`,
`winter-wine-weekend-full-3-day-peninsula-program`,
`winter-wine-weekend-winter-wine-festival-red-hill-showgrounds`.
Plus `red-hill-market-first-saturday` — the original Red Hill Community
Market is **closed** (per craftmarkets.com.au) and superseded by the Hill &
Ridge Community Market, which the site already covers separately.

**Updated (2):**

- `bass-flinders-gin-masterclass` — street address fixed: "166 Tucks Road"
  → "40 Collins Road" (official site + Visit Victoria).
- `flinders-truffles-winter-truffle-hunt-season` — 2026 season verified as
  13 June–30 August, Sat & Sun 10:30am–1:30pm; dates and recurrenceNote
  corrected.

**Verified still running (13):** MPRG autumn exhibition (to 30 Jun), the
five Peninsula Hot Springs recurring offerings, Pt Leo Estate sculpture
park (hours/prices confirmed exactly), Polperro Restore & Pamper retreat,
Ten Minutes by Tractor terroir masterclass, Mornington Wednesday market,
Hastings Thursday market, Red Hill Truffles hunts, PHS Sunday Sessions.

**Flagged for human review (2):**

- `foxeys-hangout-vegetable-feast-morning-sun-vineyard` — no evidence the
  Vegetable Feast series still runs in 2026; dates were only ever announced
  via Instagram. Check @foxeyshangout.
- `polperro-cellar-table-private-dining-experience` — no current source for
  the $295 Cellar Table offering; officialEventUrl is an old blog post.
  Also: Tripadvisor lists Polperro's phone as 03 5989 2471 vs our 5989 2871.

**Duplicate cluster (editor action before the 2027 edition):** five files
covered the same 6–8 June Winter Wine Weekend alongside the canonical
`mornington-peninsula-winter-wine-weekend-2026` (MP-EVT-0044). MP-EVT-0045
and MP-EVT-0048 are near-identical records of the same Saturday festival
(they disagree on 35 vs 38 wineries and 185 vs 184 Arthurs Seat Rd). All
now archived; consolidate to one canonical record before 2027.

**Price-drift notes (non-blocking):** Red Hill Truffles packages now ~$195
pizza hunt / $125 standard / $199 hunt+lunch / $179 hunt+brunch (file:
$189); Bass & Flinders masterclass possibly $89/2hr vs file's $175/3hr —
conflicting snippets, verify directly. Crittenden/Stonier archived files
carry a wrong `nextOccurrence: 2027-06-06` (King's Birthday 2027 is 12–14
June) — irrelevant while archived, relevant if cloned for 2027.

---

## Interim note — agent capacity interruption (2026-06-10 ~18:30 UTC)

Venue batches 1–4 and the Jul 2026–Jan 2027 events batch were interrupted by
a session usage limit (resets 22:40 UTC). Partial Jul–Dec event work was
kept (Bloody Long Walk date conflict resolved to 25 Oct 2026 per official
site; Main Street Festival 2026 record URL cleanup). Batches relaunch after
reset.

Verified inline meanwhile:

- `venues/alba-thermal-springs` — **address was wrong** ("890
  Mornington-Flinders Rd, Fingal" → **282 Browns Rd, Fingal VIC 3939**),
  **phone was wrong** (+61 3 5911 2100 → **+61 3 5985 0900**), and
  coordinates pointed ~8 km away near Red Hill (fixed to Browns Rd,
  Fingal). Sources: albathermalsprings.com.au/get-in-touch, Visit
  Victoria, Fresha listing.
