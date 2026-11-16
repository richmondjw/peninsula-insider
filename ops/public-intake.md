# Public intake after the September 2026 simplification

The shared Contact form uses `general`, `correction` and `accessibility` types.
General and accessibility messages enter the existing private `pi.submissions`
inbox with a `CONTACT (...)` title and `Intake type:` body marker. New business
requests use `BUSINESS SUBMISSION:` and `Intake type: new-business`. These are
private operational requests, not reader stories. `export-local-secrets.mjs`
rejects either marker even if a row was mistakenly marked approved. Do not
remove both markers or copy these messages into public content.

Corrections continue to use `pi.corrections` and the separate private
`pi.correction_reporters` table. Anonymous corrections remain possible.
Listing updates remain in `pi.venue_change_requests`, with multiple requested
changes in one `proposed_change` payload. Photo paths refer to the existing
`submissions` storage bucket and require rights confirmation. The request is
not reported received if an attachment upload or main insert fails.

Commercial enquiries continue through `pi.partner_enquiries` and
`pi.partner_enquiry_contacts`. The USD99 enhanced page is an enquiry offer;
no checkout, charge, recurring term or payment authority is created here.

All intake remains review-only. Business facts and assets cannot alter Picks,
verdicts, rankings or recommendations. No record is published by submission.
No database permissions or automatic external replies were added. Retain the
existing verification records and correction handling process internally.

## Deployment compatibility (20 September 2026)

Read-only production checks found the September `corrections` and `partner_enquiries` tables absent from the REST schema cache (PGRST205). Both forms use the existing private `pi.submissions` inbox **only** for this definite missing-table error. Generic server failures and uncertain network outcomes do not trigger fallback; partial contact failure never creates a second enquiry. Contact names and emails stay in the dedicated submitter columns. The retained reference is included in title/body for editorial triage. Corrections and partner-enquiry markers are barred from local-secrets export even if a request is accidentally approved.

Synthetic authorised release QA confirmed HTTP 201 for general/correction/commercial private intake, HTTP 200 for a one-pixel private photo upload, and HTTP 201 for its listing-change request. A known-created private intake row remained invisible to anonymous SELECT. Test rows are explicitly marked `PI RELEASE QA - DO NOT PUBLISH`, use `example.invalid`, and request no reply or listing change. This verifies backend acceptance separately from mocked browser tests; it does not claim an editorial response or physical iPhone test.
