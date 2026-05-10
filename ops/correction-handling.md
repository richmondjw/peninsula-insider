# Peninsula Insider — Correction Handling Operating Loop
**Last reviewed:** 2026-05-10
**Authority:** Operating loop behind the public correction CTA. The CTA was added in commit `ea24895912` ("trust: add evergreen correction contact"). This file defines what happens after a correction lands.

## What the public sees

Across venue / evergreen / place / journal-guide templates:

> Business update or correction? Let us know: corrections@peninsulainsider.com.au

## What happens after a correction is sent

### 1. Intake
- **Mailbox:** `corrections@peninsulainsider.com.au`
- **Triage owner:** Emma (default), James (backup)
- **Triage SLA:** within 24 hours of receipt
- **Action on triage:** decide one of: `accept`, `decline`, `needs-verification`

### 2. Triage classification

| Class | Definition | SLA to live correction |
|---|---|---|
| **Factual error** | Verifiable factual claim is wrong (hours, address, ownership, price, accreditation). | 48 hours from acceptance |
| **Stale information** | Was correct at last verification but is now outdated. | 7 days |
| **Disputed framing** | Subject disagrees with editorial framing or recommendation. | Editorial decision; reply within 7 days |
| **Off-scope** | Not about a PI surface, or about advertising/partnership. | Reply with redirect within 7 days |

### 3. Corrections workflow (factual + stale)

For factual or stale corrections accepted into editorial:

1. **Verify** — independently confirm the claim against a primary source (operator's own site, public registry, direct phone confirmation, photo). Record the source.
2. **Edit** — make the smallest change that resolves the issue. Update `lastVerified` to today.
3. **Log** — add an entry to `docs/CHANGELOG-corrections.md` with date, surface, what changed, source, who applied.
4. **Notify** — if the correction came from the operator, reply confirming the change is live and link to the page.
5. **Ledger** — write a publication ledger entry tagged `correction` so the change is traceable in `ops/publication-ledger/`.

### 4. Disputed-framing path

PI's editorial position is that recommendations are editorial judgement, not facts. Disputed framing does not get auto-corrected. Process:

1. **Review** the framing internally. Is the recommendation still defensible against the original methodology?
2. **Decide** — `keep`, `soften`, `revise`, or `withdraw`.
3. **Reply** — explain the decision in plain language. If `keep`, point at the methodology. If `soften`/`revise`, action that change.
4. **Log** — even decisions to `keep` go in `docs/CHANGELOG-corrections.md` with a note explaining why no change was made (this prevents the same dispute being re-raised cold).

### 5. Off-scope path

Reply with the right channel:
- Advertising / partnership: `partners@peninsulainsider.com.au`
- General contact: `hello@peninsulainsider.com.au` (or whatever the live contact channel is)
- Press: `editorial@peninsulainsider.com.au`

## Ownership matrix

| Concern | Owner |
|---|---|
| Reading the inbox | Emma (primary), James (backup) |
| Triage decision | Emma |
| Verification of factual claims | The desk responsible for the surface (see `ops/editorial-jobs.json` for desk list) |
| Editorial decisions on framing | James (founder-led editorial) |
| Updating `docs/CHANGELOG-corrections.md` | Whoever applies the edit |
| Replying to the correspondent | Triage owner |
| Ledger entry | Whoever publishes the change |

## Volume expectation

This is a small editorial publication. Realistic expected volume:
- 0–3 corrections per week initially
- Spikes around dispatch publish (Sunday) and around regional events
- If volume exceeds 10/week consistently, revisit triage capacity

## Known anti-patterns

These have hurt PI before or are explicit risks:

- **Silent fix.** Quietly editing without logging. Breaks trust if operator follows up. **Always log.**
- **Tone drift on reply.** Correction reply that argues editorial position rather than addressing the factual claim. **Address the claim first; defer framing.**
- **Stale CTA.** Correction CTA visible but mailbox unread. **Triage SLA is the trust promise.**
- **Auto-replies.** Don't auto-reply with anything beyond a brief receipt confirmation. The reply is the operating signal.

## Audit / observability

- The CTA is on every venue, evergreen, place, and journal-guide template.
- The mailbox needs a daily intake check. Currently this is **manual** — a near-term `pi-daily-corrections-intake-check` cron job is recommended (not yet in `ops/editorial-jobs.json`).
- `docs/CHANGELOG-corrections.md` is the durable record. Audit weekly.

## Open issues

- [ ] No automated mailbox check — corrections rely on Emma reading the inbox manually.
- [ ] No dashboard view of correction volume / response time.
- [ ] No on-page indication when a page has been corrected (the SEO and trust signal of "Corrected on X" is currently lost).
