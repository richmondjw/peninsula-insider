# Peninsula Insider — Live Push Approval Note
**Date:** 2026-05-10
**Requested by:** Emma Richmond
**Approval required from:** James Richmond

## Proposed live change
Push the already-implemented evergreen correction CTA live.

## Change summary
Shared correction line added at template level:

> Business update or correction? Let us know: corrections@peninsulainsider.com.au

Applied to:
- venue / evergreen detail templates
- place templates
- evergreen-style journal guide surface

## Why this is low-risk
- template-level change, not page-by-page edits
- improves trust and correction handling
- no content restructuring required
- reversible

## Validation note
The new correction CTA itself is wired cleanly.

A broader Astro check still surfaces unrelated pre-existing repo issues elsewhere, so this should not be treated as a full-project green check.

## Approval ask
If approved by James:
- commit the current change set
- push to `main`
- allow normal deploy workflow to publish live
- verify live render after deploy

## Recommendation
Approve the live push for this correction CTA change.
