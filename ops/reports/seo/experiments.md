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

## Queued experiments

### 2026-05-02-01 — Fix duplicate broken `/places/undefined` canonical

- **PR**: pending (to be opened 2026-05-02)
- **Pages affected**: all 20 pages under `/places/*` (sorrento, red-hill, flinders, mornington, rye, etc.)
- **Hypothesis**: removing the broken second canonical tag from `PlaceDetailTemplate.astro` will allow Google to resolve canonical signals correctly on all place pages, moving at least 5 of the 9 currently "Discovered – not indexed" priority place URLs into the index within 14 days. Specifically: by 2026-05-16, indexed priority URL count rises from 2/14 to ≥7/14.
- **Mechanism**: `next/src/components/PlaceDetailTemplate.astro:62` builds `canonical` from `place.slug` which is `undefined` (correct property is `place.id`). The template then emits `<link rel="canonical" href=".../places/undefined">` via `Fragment slot="head"`. Meanwhile `next/src/pages/places/[slug].astro:115` separately passes a correct canonical to `BaseLayout`. Result: every place page has two `<link rel="canonical">` tags, the second pointing to a non-existent URL. Conflicting canonicals weaken Google's confidence in which URL to index. Removing the duplicate (and broken) canonical from the template should resolve the conflict.
- **Mechanism alternative considered**: just fix `place.slug` → `place.id`. Rejected because two canonicals on one page is itself a violation, and the BaseLayout-driven canonical already covers this case.
- **Measurement**: read the indexation status block in the daily log on 2026-05-09 (7d) and 2026-05-16 (14d). Cross-reference with the JSON snapshots. Headline metric: priority URL indexed count and `places/*` indexation status in `urlInspection`.
- **Outcome (filled later)**: _pending_

## Completed experiments

_(none yet)_

## Completed experiments

_(none yet)_
