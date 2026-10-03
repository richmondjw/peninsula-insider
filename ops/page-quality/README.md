# Peninsula Insider page quality programme

**Project:** Peninsula Insider. **Decision:** improve every public canonical T1, T2 and T3 page until it has an evidence-backed score of at least 99/100. **Owner:** James for product and editorial decisions; Codex for audit, implementation, verification and release. **Version:** 1.0, 3 October 2026.

## Outcome and scope

Every page in the public sitemap enters the register. Tiers set work order, not a lower standard. A sitemap entry is checked for live status and self-canonical status during audit. Redirects, internal tools, account pages and previews are outside the register unless specifically promoted.

The first live sitemap snapshot has 618 URLs. The checked-in root sitemap has 408 and is stale relative to the public sitemap. The public sitemap is the inventory source. Source retrieval time and hash appear in source.json. A second public snapshot after Eat detail batch 4 has 615 URLs: four previous URLs moved to `removed.csv` for scope review, and one new Journal URL entered unscored. The linked `/eat/la-baracca-tgallant/` page is marked `sitemapExclude` and is tracked in the Eat assessment as a scope question rather than silently added to this sitemap-based register.

## Continuous page loop

1. **Baseline:** state the visitor task. Capture desktop (1440px) and mobile (390px), keyboard path, factual and image provenance, primary action, technical diagnostics and revision. Grade all 23 checks. Missing evidence remains unverified.
2. **Triage:** record each deduction as an issue with severity, family, owner and acceptance test. Address hard gates and blocked tasks first, then high-weight deductions. Fix shared templates before repeated page workarounds.
3. **Execute:** for material changes record baseline, hypothesis, bounded change, expected metric, rollback and evaluation date. Implement the smallest coherent family change and run relevant checks.
4. **Independent review:** T1 uses three graders; T2 and T3 use two, with a third when scores differ by over five points or a hard gate is disputed. Graders submit before seeing each other's score.
5. **Verify and repeat:** rescore the built page, release, then verify the actual public URL and deployment revision. Close only at 99/100 or above with hard gates clear and required evidence present. Otherwise return to triage.

## Reporting and release gates

- Untested mobile, keyboard, factual support or image rights means provisional. Automated results cannot certify 99.
- Blocked primary task, materially misleading claim or image, absent image rights or serious accessibility barrier fails regardless of score.
- Report by tier: unscored, provisional, blocked, below 90, 90-94, 95-98 and verified 99+. Include the worst pages and age of issues.
- Reconcile sitemap changes after each release. New URLs start unscored. Removed URLs receive a scope/redirect check.

## Working files

- rubric-v1.md: 23 checks, weights and rating anchors.
- generate-register.py: sitemap-to-register classifier.
- register.csv: URL inventory and workflow status. Empty score cells mean no grade has been established.
- scorecard-template.json: single-page assessment structure; save evidence in assessments/.
- source.json: provenance for the first live sitemap.
- pilot-triage.md: observations, proposed fixes and acceptance tests from the first independent reviewers.

## Pilot and order

Calibrate on four different pages per tier. Start with /, /eat/, /stay/ and /whats-on/this-weekend/ for T1; a venue, plan, guide and Journal article for T2; an event, fishing/boating detail, tour and awards page for T3. Then apply shared-template fixes and visit every registered URL, with T1 first and hard gates from any tier immediately.

This inventory is a baseline. It does not claim 618 pages have been graded or improved.
