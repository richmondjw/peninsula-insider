# Venue mailing-list subscriptions — working pack

Goal: get **remy@peninsulainsider.com.au** and **emma@peninsulainsider.com.au**
onto as many Peninsula venue mailing lists as possible.

## What's here
- **`venue-newsletter-register.csv`** — every venue in our directory that has a
  website (145 of them). Your checklist. Columns:
  - `newsletter_signup_url` — paste the signup page/box URL once you find it
  - `contact_email` — the venue's real contact address (only 1 was on file)
  - `likely_email_guess` — `info@<domain>` convention, **unverified** — confirm
    before sending so you don't bounce or hit the wrong inbox
  - `remy_subscribed` / `emma_subscribed` — tick (`y`) when each is on
  - `method` — `website form` / `email` / `mailchimp link`
- **`mailing-list-request-email.md`** — ready-to-send draft emails (one for
  remy, one for emma, one combined) for venues with no public signup box.

## Why this is a manual pack, not auto-done
Signing up programmatically wasn't possible from this environment:
1. Newsletter signups are JS form/widget submits (Mailchimp, Klaviyo) — no
   way to drive a browser here.
2. Most have a **double opt-in** — a confirm link lands in the remy@/emma@
   inbox and must be clicked, which only the inbox owner can do.
3. Direct site fetching was blocked by the network policy, so live signup
   links / contact emails couldn't be harvested automatically.

So this pack does the legwork that remains: the full venue list, a tracking
sheet, and the emails — turning it into a quick tick-through job.

## Suggested workflow
1. Open the CSV in a spreadsheet.
2. Per venue, open the `website`, look for a footer **Newsletter / Join /
   Subscribe** box. Submit remy@, then emma@. Tick the columns.
3. No box? Send Draft C from `mailing-list-request-email.md` to the venue's
   contact address (or paste into their contact form). Tick `method = email`.
4. Watch both inboxes for **confirm/opt-in** emails and click them.
5. Wineries (42) and restaurants (31) are the highest-value lists for events —
   start there.
