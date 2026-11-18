# Collaboration enquiry MVP

This candidate expands `/partners/` and `/partners/enquire/` while retaining the free Add my business and Manage my listing paths and the existing AUD99 enhanced-page enquiry. Recommendations, rankings and Insider Picks remain independent. No giveaway, booking, payment, contract or acceptance workflow is activated.

## Scope and reconciliation

Started from c21712fe942eb08ad15760e4c4364a4b3040dbe0 in an isolated clone, confirmed the interrupted first edit had not run, then fast-forwarded the clean branch to main 690ab482814e296e999e3f22d63eb067741738b9. No changes to the partner files were present in that main update. Open PR searches found no duplicate collaboration implementation. Emma's separate publication refinement concerns About, Dispatch, Contact, Journal, Photography, shared language and policies; those remain outside this candidate. Existing CMS edit attributes and enhanced-page copy/price are preserved. A final main fetch found a6bdc1fba011aac6e835845a3cd68c8fda3b6975: only the scheduled 18 November Insider Picks article and strategy files were newer than the tested base, with no overlap in partner files or package scripts. Parent must reconcile those releases before merging.

## Data and outcome contract

- Native optional multi-select checkboxes preserve every selected interest. A valid legacy primary interest is retained, including enhanced-page query preselection.
- All interests, optional details and exact acknowledgement/update-preference wording version share the existing 2000-character notes limit. Over-limit input is rejected before any request, without truncation.
- Acknowledgement is required in the UI. It is submitted text, not verified authority or a new server security boundary. Optional marketing preference starts unchecked and is recorded for operator review only; no subscription or marketing request is made.
- Dedicated enquiry/contact writes use existing tables and separate personal contact columns. Only a definite PGRST205/404 uses private submissions, preserving both export-exclusion markers. No schema, migration or security changes.
- Server errors, thrown/returned transport errors and response loss are uncertain outcomes. The same request ID/reference is retained; the form blocks duplicate writes and directs reference-based follow-up. Non-PII session receipts survive router navigation/reload where storage is available. A definite contact rejection is partial, never success.
- Initial HTML controls are disabled until the handler is installed; POST is defense in depth against a default-GET privacy leak. Email fallback remains available when JavaScript is unavailable.

## Validation record

89 focused unit/privacy/analytics tests pass. Both connected full `npm run build` runs passed, including the final source candidate. The restricted run failed two event-collection tests before compilation; all 336 event tests passed with normal approved network access. `astro check` reports 241 repository-wide errors, with no diagnostics in the changed enquiry files; this is not a clean type-check claim.

The initial 12 new browser tests and 12 existing site-simplification journeys passed. Independent review found a no-JavaScript GET leak, a test wait race and an inherited 320px enhanced CTA clipping issue. Fixes were made, and the CTA bounds regression failed against the earlier build as expected. The final aggregate build and all 24 browser journeys pass (zero skipped), including CTA bounds, keyboard controls and email-link contrast. Independent source and refreshed visual review found no remaining scoped blocker; exact-commit sign-off is recorded in the PR handoff.

Enquiry screenshots show one selected interest with optional details expanded; consent remains unchecked. Screenshots: [partners 320](partners-320.png), [partners 768](partners-768.png), [partners 1440](partners-1440.png), [enquiry 320](enquire-320.png), [enquiry 768](enquire-768.png), [enquiry 1440](enquire-1440.png).

No current production intake/readback was performed. Mocked acceptance and historical September receipts are not current backend acceptance. Parent owns reconciliation with competing releases, final release gates and any supported synthetic production acceptance. No merge to main, deploy or outreach occurred.

## 18 November reconciliation and acceptance plan

Merged main `7162dce5f9` into this isolated branch after the operator corrections, Iluka correction and public catalogue retry releases. The only merge conflict was `next/package.json`; both the operator-correction build/journey tests and collaboration tests are retained. No collaboration page or library source changed during reconciliation. Earlier screenshots remain representative; the reconciled build and tests are recorded in the handoff.

Read-only production metadata on 18 November confirms that `pi.submissions` has only a BEFORE UPDATE timestamp trigger, with no INSERT trigger. The project has neither pg_cron nor pg_net installed, and submissions is not in a publication. The two deployed Edge Functions are newsletter-subscribe and draw-enter; this form calls neither. These checks do not rule out an external polling integration and do not prove current write acceptance.

The smallest supported acceptance test is one coordinated, clearly labelled `PI RELEASE QA - DO NOT PUBLISH` enquiry through the exact candidate's normal anonymous form, using `pi-collaboration-qa@example.invalid`, no uploads, and optional updates unchecked. An existing authorised inbox reviewer must first confirm that external integrations will not reply or market to the record. Retain the generated ID/reference, read back only that ID in the existing authorised Supabase review route, verify every selected interest, the valid legacy interest, separate contact fields, consent-off wording and private markers, then verify anonymous invisibility. Do not approve, publish, subscribe, retry an uncertain outcome, or use privileged INSERT to substitute for visitor-path acceptance. No synthetic write has been made.

Reconciliation checks: 56 focused unit/privacy/analytics/operator/baseline tests and all 28 affected browser journeys passed (zero skipped). The independent reviewer also ran 52 combined unit checks and approved the refreshed 320px screenshot and acceptance plan. The first browser attempt could not launch Chromium inside the restricted environment; the approved run passed.

The reconciled full `npm run build` completed successfully, including all post-build gates. Logs are retained in the task workspace evidence directory; CI for the resulting merge commit must be checked separately.
