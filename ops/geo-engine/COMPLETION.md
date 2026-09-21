# Intelligence and measurement completion tranche — 21 September 2026

This extends the commissioned bounded publisher, not its authority. Policy, maximum batch size, factual restrictions, existing CI and exact-patch confidence threshold remain unchanged.

## Implemented

- Incremental benchmark sampling keeps the whole question set and rotates oldest/unassessed questions; existing observations survive assessment.
- Full graph nodes and evidence-bearing edges persist, rather than statistics alone.
- GSC poor-fit opportunities reach gap classification; low-confidence or fallback content/link verdicts cannot become accepted recommendations.
- Link judgements receive source/destination lead passages and titles. This is a bounded excerpt, not a claim of whole-document understanding.
- Current/previous GSC demand signals, property totals, device evidence and possible multi-page query competition are retained separately from query-row totals. Privacy filtering and export caps remain limitations.
- GA4 organic sessions and engagement join the inventory. Users are deliberately not summed across landing-page variants.
- Existing SiteOne/Lighthouse artifacts are collected by the staged runner. Freshness, source release mismatch and failures are explicit. No duplicate crawl scheduler is installed.
- Event timing/missing evidence and venue completeness/possible duplicates form a verification queue. No automatic URL deletion, invented recurrence or inferred opening-hour freshness.
- Durable research briefs preserve rejected items and external work-item references; they do not publish articles.
- Exact patches retain problem, before-scores and a technical hypothesis through deployment. Sparse baselines are labelled technical-only, not a potential measured search win.
- Release completion reconciles the full executive report. The gateway terminal result contains that report for delivery.
- Dashboard JSON exposes the dated underlying evidence without inventing a new dashboard application.

## AI visibility boundary

`scripts/import-visibility.mjs INPUT.json` validates and retains actual AI-answer receipts. Each record requires `questionId`, exact `query`, `kind: ai_answer`, named `surface`, `observedAt`, actual `answer`, collection `receipt`, and `citations: [{url, context}]`. Context must occur verbatim in the answer. Import is for an authorised collector/operator and must not overlap a running cycle. Search-result URLs are not answer citations. Receipt authenticity remains the collector's responsibility; schema validation alone cannot prove provenance.

No consumer AI-answer provider or recurring competitor-research collector has been commissioned by this change. Without real receipts the dashboard remains `not_yet_measurable`. Stored observations do not imply fresh sampling of every platform.

## Remaining acceptance work

Observe the new staged runner under the real protected JEV gateway. Exercise production rollback only through a separately scoped controlled drill, never by deliberately breaking the live site. Calibrate model recommendations against labelled human judgements before changing thresholds. Connect research briefs to the existing PI work-item state machine once its current intake contract is verified. Real recurring AI-surface and competitor collection requires a verified accessible source. No paid service or credential change is silently introduced.

## Verification

`npm --prefix ops/geo-engine test` includes benchmark retention/rotation, gap wiring, weak confidence rejection, analytics aggregation, research deduplication, observation rejection, report shape and entity evidence tests. Audit-only replay can use `PI_GEO_STATE_DIR` pointing to a fresh temporary directory; it must not be described as live JEV validation when run outside protected gateway execution.
