# `src/data/`  -  Peninsula Insider content layer

This directory is the **source of truth** for every atomic entity on Peninsula Insider. No page on the site is authored in HTML. Every venue, experience, place, article, itinerary, event, and author lives as a typed JSON or Markdown file here, validated at build time against the schemas in `../content/config.ts`.

## Collections

| Directory | Entity | Schema |
|---|---|---|
| `venues/` | Restaurants, wineries, cafes, bakeries, pubs, breweries, distilleries, producers, markets, hotels, villas, cottages, glamping, farm-stays, spas | `venues` |
| `experiences/` | Walks, beaches, wellness, tours, attractions, galleries, parks, lookouts, markets, workshops | `experiences` |
| `places/` | Towns, villages, zones, ridges, beaches, capes | `places` |
| `articles/` | The Insider's Journal long-form pieces | `articles` |
| `itineraries/` | Curated multi-stop trip plans | `itineraries` |
| `events/` | Dated events (festivals, tastings, openings) | `events` |
| `authors/` | Contributor / editor profiles | `authors` |

## Authoring workflow

**AI-first, not GUI-first.** Research subagents produce validated JSON records directly into these directories. Every commit goes through Zod validation at build time  -  if the file is malformed, the build fails. This is the whole point.

### Creating a venue

1. Pick a slug in kebab-case: `tedesca-osteria`, `ten-minutes-by-tractor`, `jackalope-hotel`.
2. Write `venues/{slug}.json` following the schema in `../content/config.ts`.
3. Author the `editorNote` as 2–3 opinionated paragraphs. Never neutral summary.
4. Populate `heroImage` and `gallery` from commissioned or licensed sources. Respect the image license vocabulary.
5. Set `lastVerified` and `publishedAt` to today's date (ISO 8601).
6. Commit. The build will fail if any required field is missing.

### Creating an article

Articles use Astro's `content` type, so they're Markdown files with YAML front-matter:

```
articles/
  2026-05-07-long-lunch-list.md
```

### Creating a place hub

Places are the lowest-effort entity to create but the highest leverage  -  a single place file triggers an auto-generated hub page (`/places/red-hill/`, etc.) that aggregates every venue tagged to that place.

## Slug rules

- Kebab-case, lowercase only: `cape-schanck`, `red-hill-plateau`, `peninsula-hot-springs`.
- No abbreviations: `point-nepean`, not `pt-nepean`.
- Place slugs match natural search queries: `red-hill`, `sorrento`, `flinders`.
- Venue slugs include the business name but not the category: `tedesca-osteria`, not `restaurant-tedesca-osteria`.

## What NOT to do

- **Don't edit HTML.** The legacy `eat.html`, `wine.html`, `stay.html` pages live in the parent directory. They will be 301-redirected on cutover. Do not touch them from here.
- **Don't create ad-hoc JSON fields** that aren't in the schema. If you need a new field, add it to `../content/config.ts` first, with types and a comment.
- **Don't use stock imagery without a license field.** Every image reference must include a `license` enum value.
- **Don't set `lastVerified` to a future date.** It's the day a human last confirmed the venue still exists and the details are current.

## Migration status

This is a **Phase 1 scaffold**. As of 9 April 2026:

- Schemas: ✅ locked
- Directories: ✅ created (each with a README)
- First venue record: ⏳ to be authored in Week 1 as the scaffold seed
- First 30 venue migration: ⏳ Week 2–3 per roadmap § 4.4
- Article collection: ⏳ Week 5 (first Journal piece)

See `../../../docs/roadmap-2026-04-09.md` for the full Phase 1 plan.
