# SEO experiments — Peninsula Insider

Every shipped SEO change is logged here as a hypothesis-driven experiment. Wins and losses both kept; failed experiments are as informative as successful ones.

## Format

```
## YYYY-MM-DD — short title
- **PR**: link
- **Pages affected**: list
- **Hypothesis**: specific, measurable. "If we do X then metric Y will move from A to B by date Z."
- **Mechanism**: why we expect it to work, in one sentence.
- **Measurement**: which line in `daily-log.md` we'll read on date Z to confirm or refute.
- **Outcome (filled later)**: what actually happened, hypothesis confirmed/refuted, what we learned.
```

## Active experiments

### 2026-05-01-01 — Remove duplicate broken `/places/undefined` canonical

- **Status**: shipped to worktree branch `claude/goofy-chaplygin-91fbed` 2026-05-01. Awaiting deploy to live site.
- **PR**: pending push (commit applied locally)
- **Pages affected**: all 20 pages under `/places/*` (sorrento, red-hill, flinders, mornington, rye, portsea, main-ridge, dromana, mount-martha, cape-schanck, balnarring, merricks, point-nepean, plus 7 others)
- **Hypothesis**: removing the duplicate `<Fragment slot="head">` block from `PlaceDetailTemplate.astro` will allow Google to resolve canonical signals correctly on all place pages, moving at least 5 of the 9 currently "Discovered – not indexed" priority place URLs into the index within 14 days. Specifically: by 2026-05-16, indexed priority URL count rises from 2/14 to ≥7/14.
- **Mechanism**: `PlaceDetailTemplate.astro:62-77` defined a `canonical` const built from `place.slug` (undefined; correct property is `place.id`), then emitted it via `<Fragment slot="head">` along with duplicate `<title>`, `<meta description>`, og: tags, and a JSON-LD `Place` schema. The parent page (`places/[slug].astro:290-298`) already passes correct title/description/canonical/ogImage to `BaseLayout` and emits its own `placeSchema` JSON-LD. Result: every place page had **two `<link rel="canonical">` tags** (one correct, one pointing to `/places/undefined`), two `<title>` tags, duplicate og: tags, and duplicate JSON-LD. Removed the entire `<Fragment slot="head">` block and the unused locals that fed it.
- **Verification** (2026-05-01): rebuilt locally with `npm run build` — 955 pages built in 19.56s, no errors. Spot-checked `dist/places/{red-hill,sorrento,flinders}/index.html`: each now has exactly one `<link rel="canonical">` pointing to the correct trailing-slash URL, exactly one `<title>` tag.
- **Measurement**: read the indexation status block in `daily-log.md` on 2026-05-09 (7d after deploy) and 2026-05-16 (14d). Cross-reference with the JSON snapshots in `ops/data/seo/`. Headline metric: priority URL indexed count and `places/*` indexation status in `urlInspection`.
- **Outcome (filled later)**: _pending — measure 2026-05-09 and 2026-05-16_

## Completed experiments

_(none yet)_

## Completed experiments

_(none yet)_
