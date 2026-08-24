# Peninsula Insider — Daily Accuracy Scan

**Date:** 22 August 2026 (UTC)  
**Job:** `pi-daily-accuracy-scan`  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`  
**Mode:** Report-only; no content edits or publish

## Summary

- Accuracy scan complete.
- 3 issues found.
- 0 safe auto-fixes applied (scan job is no-publish).
- 2 need approval.
- 1 needs verification.

## Findings

### Needs approval

1. **Homepage seasonal framing is stale.** `index.html` still presents `Winter Insider · July 2026` / `Winter · July 2026` edition markers on 22 August, and its primary What's On navigation pin promotes **MPRG school holiday workshops** with copy saying it starts 1 July. The recommendation and front-door framing require editorial replacement, not a mechanical date correction.

2. **Homepage cover and newsletter surfaces retain expired June copy.** The homepage promotes the Sorrento Solstice Festival as a current cover feature with “Saturday 20 June” and previews the `27 to 28 June` Peninsula This Weekend issue. The trusted event records mark the solstice festival archived (ended 21 June), so the stale prominence should be replaced through editorial judgment.

### Needs verification

3. **What's On rendered output contains past-dated event cards.** `whats-on/index.html` includes cards with dates from June and July (including 5, 10, 25 and 28 July) alongside future listings. Several source records are archived, but the rendered surface/source-to-build filtering relationship needs verification before determining whether these are intentionally historical listings or stale live cards. No change made.

## Checks performed

- Homepage: `index.html`
- What's On: `whats-on/index.html`
- Event source records: `next/src/content/events/*.json`
- Current dispatch surfaces: `journal/peninsula-this-weekend-*/index.html`
- Live build output and source dates compared against 2026-08-22 UTC.

## Disposition

No content edits, autofix, rebuild, publish, or ledger mutation performed. Approval and verification items are handed to the accuracy-autofix/editorial follow-up job.

*Report filed to repo and Mission Control Docs.*
