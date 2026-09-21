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
- Durable research briefs preserve rejected items and external work-item references; they do not publish articles. The staged runner hands at most three qualified JEV-backed briefs to the existing PI work-item table as `detected`/amber research briefs. Stable IDs prevent duplicates, existing killed work stays rejected, and no approval/publishing transition is invoked.
- Identical inputs within a decision batch reuse one typed response, preserving output order and isolated result objects. This avoids spending the remote allowance repeatedly on identical severity/risk inputs.
- Exact patches retain problem, before-scores and a technical hypothesis through deployment. Sparse baselines are labelled technical-only, not a potential measured search win.
- Release completion reconciles the full executive report. The gateway terminal result contains that report for delivery.
- Dashboard JSON exposes the dated underlying evidence without inventing a new dashboard application.

## AI visibility boundary

`scripts/import-visibility.mjs INPUT.json` validates and retains actual AI-answer receipts. Each record requires `questionId`, exact `query`, `kind: ai_answer`, named `surface`, `observedAt`, actual `answer`, collection `receipt`, and `citations: [{url, context}]`. Context must occur verbatim in the answer. Import is for an authorised collector/operator and must not overlap a running cycle. Search-result URLs are not answer citations. Receipt authenticity remains the collector's responsibility; schema validation alone cannot prove provenance.

The weekly cycle attempts three rotating benchmark questions through the existing gateway `web_search` provider. It accepts only the provider's explicit `kind: answer` shape as a grounded AI answer, retaining exact response receipts and answer-level citation context. `kind: results` is stored separately as competitor search evidence, never converted into AI citations. A failed provider stops the sample and reports unavailable; it does not block independent evidence-backed technical analysis. No tool exposure, model/account or credential is changed. The commissioning probe returned HTTP500, so actual answer visibility is still unproven and remains `not_yet_measurable` until real receipts arrive. This observes the configured OpenClaw search surface, not consumer ChatGPT/Gemini usage or all AI platforms.

## Remaining acceptance work

Observe the new staged runner under the real protected JEV gateway. Exercise production rollback only through a separately scoped controlled drill, never by deliberately breaking the live site. Calibrate model recommendations against labelled human judgements before changing thresholds. Existing PI work-item reads and schema have been verified; a new live handoff is only demonstrated when a genuinely qualified brief exists, never by inserting a fake test story. Gateway logs at 2026-09-21T11:04 and 11:05 identify the search HTTP500 as the configured account's usage limit; wait for normal availability or obtain separate authority for paid/account changes. Rich competitor page-format/entity-depth research remains beyond recording source domains. No paid service or credential change is silently introduced.

## Verification

`npm --prefix ops/geo-engine test` includes benchmark retention/rotation, gap wiring, weak confidence rejection, analytics aggregation, research deduplication, observation rejection, report shape and entity evidence tests. Audit-only replay can use `PI_GEO_STATE_DIR` pointing to a fresh temporary directory; it must not be described as live JEV validation when run outside protected gateway execution.
