# Peninsula Insider accuracy scan — 2026-08-14

Run time: 2026-08-14 20:20 UTC  
Mode: detection and classification only; no content edits or publish actions.

## Summary

- 19 surface-level expired event-card instances found (18 unique cards on What’s On; 1 homepage card; duplicates are repeated modules).
- 19 safe auto-fix candidates: remove or de-prioritise expired cards using existing event end dates.
- 1 needs approval: the homepage/navigation editorial pick still promotes “MPRG school holiday workshops” with “Starts 1 July” framing, despite the event ending 10 July; replacing the pick changes editorial emphasis.
- 1 needs verification: no current `Peninsula This Weekend` article for the 14–16 August window was found in source articles; confirm whether the live dispatch is intentionally absent or unpublished before changing front-door editorial logic.

## Findings

### Safe auto-fix

The generated live surfaces contain expired cards as of 2026-08-14:

- Homepage: `mprg-autumn-exhibition` (ends 2026-06-30).
- What’s On: `dromana-community-market`, `emu-plains-market-balnarring`, `mornington-tourist-railway-school-holiday-special-runs`, `mornington-peninsula-regional-gallery-school-holiday-workshops`, `youth-services-school-holiday-program`, `boneo-community-market`, `pearcedale-community-market`, `soil-cellar-flinders-truffles-x-polperro-winery`, `mt-eliza-farmers-market`, and `stonier-fire-wine-winter-lunch` (ends 2026-08-09); several are repeated in multiple sections.

Recommended handoff to `pi-daily-accuracy-autofix`: remove/de-prioritise these cards from generated front-door surfaces, retaining source records unless their own lifecycle policy requires archival.

### Needs approval

The shared homepage/navigation editorial pick links to `mornington-peninsula-regional-gallery-school-holiday-workshops` and says “Starts 1 July in Mornington”. The structured/live card ends 2026-07-10. Updating the pick requires a new recommendation, so it is held for editorial approval.

### Needs verification

Source articles contain dated weekend dispatches through July and a Sorrento off-season article marked week 33, but no clearly current 14–16 August `Peninsula This Weekend` dispatch. Verify the intended current dispatch and whether any live build artifact is stale before changing editorial copy or routes.

## Scope checked

- `index.html`
- `whats-on/index.html`
- `journal/peninsula-this-weekend-*/index.html` (no matching current directory found)
- `next/src/content/events`
- `next/src/content/articles`

No content edits, autofixes, rebuilds, or publish actions were performed.
