# Peninsula Insider — Daily Accuracy Scan

**Date:** 23 August 2026 (UTC)  
**Job:** `pi-daily-accuracy-scan`  
**Spec:** `docs/peninsula-insider-daily-accuracy-scan-spec-2026-04-14.md`  
**Mode:** Report-only; no content edits or publish

## Summary

- Accuracy scan complete.
- 4 issues found.
- 0 safe auto-fixes applied (scan job is no-publish).
- 2 need approval.
- 2 need verification.

## Findings

### Needs approval

1. **Homepage and primary navigation still promote expired July framing.** `index.html` retains `Winter Insider · July 2026` / `Winter · July 2026` edition markers and promotes MPRG school holiday workshops as an editor’s pick, despite the trusted event record being archived after 10 July. Replacing the front-door emphasis is editorial judgment, not a mechanical date fix.

2. **What's On navigation and rendered surface retain expired school-holiday recommendations.** `whats-on/index.html` still links to MPRG school holiday workshops and labels them among the current “This weekend” pathways. The same surface also contains the expired railway special and youth-services school-holiday program. Removing or replacing those recommendations changes editorial hierarchy and needs approval.

### Needs verification

3. **What's On rendered output contains expired event cards.** `whats-on/index.html` includes cards with `data-date-end` values of 5 July, 10 July, 16 July and 9/15–16 August, including `mornington-tourist-railway-school-holiday-special-runs`, `mornington-peninsula-regional-gallery-school-holiday-workshops`, `youth-services-school-holiday-program`, `stonier-fire-wine-winter-lunch`, and `red-hill-brewery-secret-stash-weekend`. Their source records are archived or past-dated; verify the build filtering and intended historical-listing behaviour before changing content.

4. **What's On metadata is stale relative to the run date.** The rendered page declares `article:modified_time` as 2026-06-22 and still displays `Winter Insider · July 2026` in the masthead on 23 August. Confirm whether these are intentionally frozen edition labels or missed seasonal refresh output.

## Checks performed

- Homepage: `index.html`
- What's On: `whats-on/index.html`
- Event source records: `next/src/content/events/*.json` and `next/src/content/events/archive/*.json`
- Current dispatch surfaces and article source dates checked for stale weekend framing.
- Live build output and source dates compared against 2026-08-23 UTC.

## Disposition

No content edits, autofix, rebuild, publish, or ledger mutation performed. Approval and verification items are handed to the accuracy-autofix/editorial follow-up job.

*Report filed to repo and Mission Control Docs.*
