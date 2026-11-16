# Peninsula Insider — Correction Handling Operating Loop
**Last reviewed:** 2026-09-14
**Authority:** Operating loop behind the public correction CTA. The CTA was added in commit `ea24895912` ("trust: add evergreen correction contact"). This file defines what happens after a correction lands.

## What the public sees

Two routes, both live, presented to readers as one desk.

**The form**, at `/corrections/`. Linked from the fine-print column of the
site-wide footer, so it is reachable from every page, and prompted inline by
`CorrectionNote.astro` on venue, place, journal, event, tour, tour-operator and
tour-package pages plus the stay, tour, tour-operator, spa and walks hubs. It
asks for four things — the page, what is wrong, what it should say, how the
reporter knows — and returns a case reference on screen.

**The mailbox**, `corrections@peninsulainsider.com.au`. Published in the prose
of `/corrections/`, `/about/`, `/contact/`, `/editorial-approach/` and
`/terms/`, beside every inline `CorrectionNote`, and — the one that reaches
machines rather than readers — as a `ContactPoint` with
`contactType: "corrections"` in the Organization JSON-LD that `BaseLayout`
emits on **every page**, alongside `correctionsPolicy`. Search engines and
answer engines read that as the publication's official corrections channel.

Older templates still carry the original line:

> Business update or correction? Let us know: corrections@peninsulainsider.com.au

## What happens after a correction is sent

### 1. Intake

**Via the form.** Writes `pi.corrections` (the case) and, where the reporter
gave an address, `pi.correction_reporters` (contact, deliberately a separate
table). Intake and every later status change are logged to
`pi.correction_events` by trigger, so the history holds even when the queue is
worked by hand in Supabase Studio. Editor access to all three is gated on
`pi.admin_user_allowlist` via `pi.is_cms_admin()`.

> **Not yet live.** `ops/migrations/2026-09-13-pi-corrections-queue.sql` is
> written and **has never been applied to any database**. Until it runs there
> is no queue: the form's insert fails, and the page tells the reporter plainly
> that nothing was recorded and to use the mailbox instead. Applying it is
> James's action (register item A2).

**Via the mailbox.** `corrections@peninsulainsider.com.au`. Unchanged, and
still the only route with no machine record behind it.

- **Triage owner:** Emma (default), James (backup)
- **Triage SLA:** within 24 hours of receipt
- **Action on triage:** decide one of: `accept`, `decline`, `needs-verification`

### 1a. What has to be true for the published promises to hold

The site makes five promises around this address. None of them can be verified
from this repository, because none of them is implemented in it. Recorded here
so the gap is a known quantity rather than an assumption.

| Promise | Where it is published | What must be true |
|---|---|---|
| The address receives mail at all | JSON-LD `ContactPoint` on every page; five pages of prose; every inline correction note | An MX record for `peninsulainsider.com.au` and a mailbox or alias behind it. **Nothing in this repository configures, references or tests mail for this domain.** Only James can confirm it. |
| Someone reads it | "we genuinely want to know" (`/terms/`), "we fix fast" (`/about/`) | A person checking it on a cadence. This file names Emma primary and James backup, and the check is **manual**: there is no corrections job in `ops/editorial-jobs.json` and no automated intake check anywhere. |
| "Reaches the same desk" | `/corrections/`, `/editorial-approach/` | The two intakes converge. **They do not converge mechanically.** The form writes a row; the mailbox writes an inbox; nothing joins them. The claim holds only while the same human works both and copies mail into the queue by hand. |
| "Typically within one business day" | `/corrections/` | Response time measured against receipt. Once the migration is applied the form half is measurable — `received_at` plus the event log. The mailbox half is not measurable from here at all, and it is the half with no record. |
| "We reply to the reader who flagged it" | `/corrections/` | Whoever replies can read `pi.correction_reporters`, i.e. holds a row in `pi.admin_user_allowlist`. Since 2026-09-14 an `is_editor` flag is no longer sufficient, and that is deliberate: the flag is self-writable. |

Two of these are answerable only by James sending one test correction to the
address and seeing where it lands. That is register item A2 and it is not a
thing code can settle.

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

- `/corrections/` is linked from the site-wide footer, so the affordance exists on every page. The inline CTA is additionally on venue, place, journal, event, tour, tour-operator and tour-package pages and five hubs.
- The mailbox needs a daily intake check. Currently this is **manual** — a near-term `pi-daily-corrections-intake-check` cron job is recommended (not yet in `ops/editorial-jobs.json`).
- The queue, once the migration is applied, is its own record: `pi.corrections` for state and `pi.correction_events` for the history, which is append-only and trigger-written so it cannot be bypassed by working the queue by hand.
- `docs/CHANGELOG-corrections.md` is the durable record of corrections **applied to pages**. It is a different thing from the queue: the queue records what was reported and decided, the changelog records what the reader can see changed. Audit weekly.

## Open issues

Closed by the corrections queue (PI-016, #396):

- [x] A reader reporting an error had no structured route — there is a form, and it returns a case reference.
- [x] No record of what was decided on a case — `pi.correction_events` is an append-only history of every transition.
- [x] Venue, event, tour and hub pages had no way to report an error — the footer link is site-wide and the inline note now covers those templates.

Still open:

- [ ] **The migration has never been applied.** Until it is, the form has nothing to write to and the mailbox is the only working intake. Register item A2.
- [ ] No automated mailbox check — mailbox corrections rely on Emma reading the inbox manually, and unlike the form they leave no record.
- [ ] Nothing joins the mailbox to the queue, so "reaches the same desk" is a human promise, not a mechanism.
- [ ] No dashboard view of correction volume / response time. The data will exist once the migration runs; nothing reads it.
- [ ] **No on-page indication when a page has been corrected.** No content schema in `next/src/content.config.ts` has a corrections field, no content file carries a correction note, and `docs/CHANGELOG-corrections.md` still contains only its own bootstrap entry. `/corrections/` promises corrections are made "on the page where the error appeared, and with a record of what changed"; that mechanism does not exist. Register item A9 — build it or change the copy. This is unaffected by PI-016, which built intake, not publication.
- [ ] `correction_submitted` / `correction_failed` are reserved in `docs/analytics-dictionary.md` and still unwired, so submission volume is unobservable even once the queue is live.
