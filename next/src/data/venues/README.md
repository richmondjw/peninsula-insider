# `venues/` — atomic venue records

One JSON file per venue. Schema: `venues` in `../../content/config.ts`.

Types covered: `restaurant | winery | cafe | bakery | pub | brewery | distillery | producer | market | hotel | villa | cottage | glamping | farm-stay | spa`

## Example file layout

```
venues/
  tedesca-osteria.json
  ten-minutes-by-tractor.json
  jackalope-hotel.json
  pt-leo-estate.json
  ...
```

## Required fields

Every record must include:

- `slug` — kebab-case, unique, matches filename
- `name` — display name
- `type` — one of the enum values above
- `place` — slug of the parent place (e.g. `red-hill`, `merricks-north`)
- `zone` — `bayside | hinterland | red-hill-plateau | ocean-coast | back-beaches | tip`
- `coordinates` — `{ lat, lng }`
- `address` — single-line display address
- `priceBand` — `$ | $$ | $$$ | $$$$`
- `signature` — one-sentence signature dish/wine/room
- `editorNote` — 2–3 opinionated paragraphs (not neutral summary)
- `tags` — `{ mood, season, audience }` arrays (see schema for allowed enums)
- `heroImage` — `{ src, alt, credit, license, caption? }`
- `lastVerified` — ISO date when the record was last human-confirmed
- `publishedAt` — ISO date of first publish

## Optional fields worth including

- `website`, `phone`, `bookingUrl`, `bookingProvider`
- `authority` — `{ hats, hallidayScore, awards, pressMentions }` — the trust block that renders in the right rail on venue pages
- `gallery` — array of `imageRef` objects
- `featuredPartner` — boolean, only true for properties under the Featured Partner program (Phase 3+)
- `affiliateNote` — disclosure text, required if `bookingUrl` uses an affiliate parameter

## The editorial rule

The `editorNote` field is the heart of every venue page. It is **not** a description. It is an opinion. Look at what's different about this place, what it's *for*, what it's *not* for, who it is for and who it isn't. Strong house voice or strong James voice — never a neutral paragraph.

Examples of wrong `editorNote` language:
- "Located in the heart of Red Hill…"
- "Offering guests a world-class dining experience…"
- "One of the Peninsula's most celebrated wineries…"

Examples of right `editorNote` language:
- "Tedesca is a 30-seat dining room built around one idea, cooked by one person, and worth driving 90 minutes for. Book the early sitting; the late one runs long and the kitchen is tired by then."
- "Ten Minutes by Tractor is the Peninsula's most serious kitchen. The degustation is correctly expensive; the à la carte on the terrace is the best-value hour on the whole peninsula."

## Seeds

The first 30 venues to author are listed in roadmap § 4.4. Author them in the order specified there — restaurants first, then wineries, then stays, then experiences.
