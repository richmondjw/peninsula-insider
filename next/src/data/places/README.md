# `places/` — place hubs

One JSON file per place (town, village, zone, ridge, beach, cape). Schema: `places` in `../../content/config.ts`.

Places are the lowest-friction, highest-leverage collection on the site. A single place file triggers an auto-generated hub page that lists every venue and experience tagged to that place.

## Naming convention

Match the natural-language search query, not the formal postcode name.

- ✅ `red-hill`
- ❌ `red-hill-vic` or `red-hill-3937`
- ✅ `sorrento`
- ❌ `sorrento-mornington-peninsula`
- ✅ `merricks-north`
- ❌ `north-merricks` or `merricks-nth`

## The six Phase 1 seed places

The first place hubs to create, aligned to the first 30 venues migration:

```
places/
  red-hill.json
  merricks.json          # includes Merricks, Merricks North, Merricks Beach
  sorrento.json
  flinders.json
  dromana.json
  cape-schanck.json
```

Each one needs a ~200-word `intro` — opinionated and place-specific. This is where the editor establishes the *character* of the place, not just its coordinates.

## Intro voice guide

The place intro should answer:

1. **What the place is actually known for** (not the tourism board answer)
2. **Who it's for** — and who it isn't
3. **When it's best** — time of day, day of week, time of year
4. **The thing locals know and visitors don't**

Example tone (do not copy verbatim):

> **Red Hill**
> Red Hill is the Peninsula's cellar-door plateau and, on a good Sunday in November, it's also the Peninsula's worst traffic problem. The hinterland's real rewards — the Pinot Noirs that got the place on the world map, the kitchens cooking from the back paddock — belong to anyone willing to come up midweek or in the shoulder seasons. Come for the view from Arthurs Seat, stay for the three or four cellar doors that still remember when this was farmland, and leave before the weekend crowd arrives.

## Zones (parent grouping)

Every place belongs to one of six zones, used for regional filtering on the map and in intent pages:

- `bayside` — the Port Phillip side (Mount Eliza, Mornington, Mount Martha, Dromana)
- `hinterland` — the inland ridge (Main Ridge, Red Hill, Merricks North, Balnarring)
- `red-hill-plateau` — explicit grouping for the core wine country
- `ocean-coast` — the Bass Strait side (Flinders, Cape Schanck, Rye Ocean Beach)
- `back-beaches` — Sorrento back beach, Portsea back beach, St Andrews
- `tip` — Sorrento, Portsea, Point Nepean (the tip of the peninsula)

Places may belong to exactly one zone. If a place feels liminal, the `relatedPlaces` field lets you link to adjacent hubs without duplicating.
