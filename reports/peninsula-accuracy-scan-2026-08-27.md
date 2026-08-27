# Peninsula Insider accuracy scan — 2026-08-27

## Status

Scan completed at 2026-08-27 20:20 UTC. No content edits or publishing performed.

## Summary

- 3 issues found
- 0 safe auto-fixes applied (scan is report-only)
- 3 need approval
- 0 needs verification

## Findings

### Needs approval

1. **Homepage front-door event/editorial links are stale** — `index.html` still promotes the MPRG school-holiday workshops, MPRG autumn exhibition, Sorrento Solstice Festival, and several dated winter/autumn event pages. These dates are past as of 27 August 2026. This needs an editorial replacement decision because changing featured emphasis is consequential.
2. **What's On front-door surface contains expired event cards** — `whats-on/index.html` links to completed winter/autumn and school-holiday events, including the MPRG workshops, Flinders truffle season, Soil Cellar event (25 July), Stonier winter lunch, and Youth Services school-holiday program. Removing/re-ranking these cards changes the live recommendation hierarchy.
3. **Current dispatch freshness is incomplete in the built surfaces** — the source contains `insider-picks-2026-08-27.md` (verified 27 August), but no newly dated `Peninsula This Weekend` source or built journal route is present for the upcoming 29–30 August weekend. The homepage still links to the 27 June dispatch. Editorial confirmation is needed before replacing the front-door weekend letter.

## Needs verification

None identified from the inspected source and built surfaces. External booking/status checks were not performed.

## Safe auto-fix candidates for the follow-up job

None. The observed changes affect featured emphasis or editorial framing, so they are held for approval under the scan policy.

## Scope checked

- `index.html`
- `whats-on/index.html`
- `next/src/content/events` (active source files and archive separation)
- `next/src/content/articles`
- current 27 August insider picks source
- no external requests

