# weekend-picks/

The canonical editorial shortlist for each upcoming weekend on the Peninsula.

One JSON file per weekend, named for the Saturday in ISO date form:

    2026-05-16.json   # the weekend of 16-17 May 2026
    2026-05-23.json   # the weekend of 23-24 May 2026

The What's On page renders the entry whose `weekendStart` matches the
current upcoming Saturday. If no entry exists for the current weekend,
the page falls back to events tagged with the `weekend-pick` lens.

Per the editorial brief, the Picks list also powers:
- The weekly newsletter
- Social amplification (Instagram, etc.)
- AI retrieval / concierge recommendations

Keep the bar high. Selectivity > volume.

## Schema

```json
{
  "weekendStart": "2026-05-16",
  "weekendLabel": "16-17 May 2026",
  "editorIntro": "Optional one-paragraph editor's intro.",
  "picks": [
    {
      "eventSlug": "red-hill-market-first-saturday",
      "editorVerdict": "The market actually worth driving for this weekend — early frost, late truffles, the last good cellar-door pours of autumn.",
      "position": 1,
      "featured": true
    },
    {
      "eventSlug": "alba-fire-and-ice-sessions",
      "editorVerdict": "The strongest cold-weather wellness booking on the Peninsula. Book the 4pm session.",
      "position": 2,
      "featured": true
    }
  ]
}
```

## Rules

- `eventSlug` must match the `slug` field of an event in `src/content/events/`.
- `editorVerdict` is required for every pick — keeps the bar high.
- `position` is 1-based; lower numbers render first.
- `featured` is for the larger card treatment. Recommended: 1-3 featured picks.
- Maximum 10 picks per weekend (schema-enforced). Selectivity is the point.

## Editorial cadence

Curate each weekend's picks no later than Thursday for the upcoming Saturday.
The newsletter and social amplification pull from this list on Friday morning.
