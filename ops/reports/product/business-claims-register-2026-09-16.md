# Business pathway and commercial claims register

Date: 16 September 2026. Scope: approved business-pathway and commercial-copy implementation. Status: source changes in an isolated worktree; deployment and live intake delivery are separate verification steps.

## Claims reviewed

No analytics export, audience research, attribution study or campaign performance evidence supporting the claims below was supplied or inspected for this change. This is an absence of supporting evidence in the reviewed material, not a finding that every claim is false.

| Surface | Removed or qualified claim | Replacement |
| --- | --- | --- |
| `/partners/` | Audience arrives with planning intent and trust; readers return across seasons and rely on PI; partnership presence compounds; sustained presence produces the strongest outcomes. | Describe practical listing support, optional labelled placement formats and the information a proposal should contain. Request current figures with a source and measurement period. No promise of audience growth, bookings, sales or return. |
| `/partners/advertising-kit/` | Readers come for trusted recommendations; early pricing implies future scale; lasting presence described as a benefit; search indexing promised as a deliverable. | Describe commercial production and labelling, request measured audience information, and agree deliverables, duration and reporting before commitment. Hosting and annual refresh terms are preserved; on-site discovery links do not guarantee external indexing or ranking. |
| `/partners/founders-prospectus/` | Definitive regional voice and indefinite centrality; audience tripling and fifty thousand newsletter subscribers presented as future facts. | Identify the publication as early-stage, scope placements explicitly, and state that future audience size and commercial return are not guaranteed. |
| `/partners/apply/` | Every submission lands, nothing is ignored, and a fitting venue will receive a visit. | Editorial may follow up; submission guarantees neither publication nor a partnership. Provide free correction and update routes. |
| `/partners/update/` and `/partners/claim/` | Direct management, verbatim publication and fixed build-time promises could imply automatic changes. | Claims establish a verified association; changes and event proposals require editorial review. Receipt is not publication. |

## Business route

`/partners/` is the existing destination, now labelled **For Peninsula businesses** in the footer and linked from Contact. It presents free corrections, verified listing claims, free updates and optional partnerships in that order. No account, claim or payment is needed for a correction.

Unlisted businesses use `/partners/update/#new-business`, choosing **Other** in the existing form. This reuses the existing `venue_change_requests` insert, `__pending__` marker for an unresolved venue, and free-text venue name; it does not create a commercial lead or promise inclusion. The existing migration accepts the `other` type and an anonymous insert. No schema or permission change was made. Live database delivery has not been proven by these source checks.

The shared footer remains visible on mobile: its layout becomes two columns, links have a minimum 44px height and the business label can wrap. No additional navigation item was added; existing navigation budgets remain satisfied. This is source/layout verification, with browser verification to follow in the integrated review.

## Guardrails and verification

- Factual corrections remain free and independent of commercial status, with editorial verification.
- Paid placements remain clearly labelled; buying one does not buy editorial rankings or recommendation language.
- No guaranteed commercial outcome remains in the reviewed claims. Quoted future audience sizes are removed.
- No forms were submitted, accounts changed, migrations applied or outbound messages sent.
- Existing partner-enquiry, corrections and navigation suites: 86 passed. Existing corrections-queue and listener-hygiene checks: 10 passed. Navigation and CSS budgets passed.
- Existing hosting durations, refresh timing and prices were not renegotiated. No matching partner, founder or advertising PDFs exist in `next/public/downloads`, so there is no current download to regenerate. Previously distributed private copies are outside this repository change.

## Final cadence and audience review

The kit and founders prospectus now describe The Insider Note as occasional editions, consistent with the current editorial contract. Fixed weekly publication and Journal-cover promises were removed; agreed partner deliverable counts, hosting and refresh terms are unchanged. The kit also no longer presents age, household income, repeat travel or social growth as measured facts: these lacked supporting evidence in this review. Intended readership is identified as editorial intent, and requests for current reach and subscriber information ask for a measurement period/date.
