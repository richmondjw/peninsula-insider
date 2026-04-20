# Peninsula Insider weekly social pack

**Week of:** 2026-04-20  
**Status:** Premium editorial source system and SVG export set  
**Source payload:** `tools/social-assets/examples/peninsula-insider-week-of-2026-04-20.json`  
**Renderer:** `tools/social-assets/render.js`

## What is here

- `masters/` pinned source inputs used for this run
- `exports/ig` Instagram 4:5 feed assets
- `exports/fb` Facebook adaptations
- `exports/li` LinkedIn adaptations
- `publishing/` copy-and-paste platform handoff sheets
- `manifest.json` asset manifest with metadata
- `posting-manifest.json` day/platform posting sheet
- `index.html` premium review board with captions beside creative
- `source-images/manifest.json` image usage map

## Production system

This weekly pack is built as one coherent editorial system across five template families:

1. Editorial cover
2. Recommendation hero
3. Utility sequence
4. Editorial comparison
5. Atmosphere single

## Asset count

- **Total assets:** 36
- **Instagram:** 23
- **Facebook:** 7
- **LinkedIn:** 6

## Day breakdown

- **Monday** · 7 assets · editorial-cover
- **Tuesday** · 5 assets · recommendation-hero
- **Wednesday** · 6 assets · utility-sequence
- **Thursday** · 6 assets · editorial-comparison
- **Friday** · 7 assets · editorial-cover
- **Saturday** · 2 assets · atmosphere-single
- **Sunday** · 3 assets · atmosphere-single

## Re-render

Run from repo root:

```bash
node tools/social-assets/render.js
```

Then open `social/week-of-2026-04-20/index.html` for review, or use `social/week-of-2026-04-20/publishing/` for copy handoff.

## Known upgrade slots

- Tuesday and Friday would both improve with a stronger shoulder-season Sorrento streetscape or heritage facade image to replace the softer harbour hero if sourced later.
- Wednesday lunch frame currently uses a place-led image rather than a true table-side lunch still, so that slot is production-ready but still upgradeable.
- Saturday is intentionally atmosphere-led but would benefit from a fresher same-week observational still if the newsroom begins collecting live weekend imagery.
