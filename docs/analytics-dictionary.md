# Analytics dictionary

**Peninsula Insider - the measurement contract. PI-024, 2026-09-13.**

This is the source of truth for what the site records, what it deliberately does not
record, and why. If an event is not in this file it is not part of the contract; if a
dashboard reports a number this file cannot explain, the dashboard is wrong.

Three rules govern everything below.

1. **No personal data, ever.** Not a name, not an email address, not a phone number, not
   message text, not a raw search string, not a URL carrying parameters. Enforced in code
   by `sanitiseParams()` in `next/src/lib/analytics-contract.ts` and tested in
   `next/src/lib/analytics-contract.test.mjs`.
2. **Log completion only after the operation succeeds.** A start is not a success. A click
   is not a conversion. A handoff to a mail client is not a submission.
3. **One exit.** Every contract event is built by `emit()` in
   `next/src/lib/analytics-events.ts` and dispatched through `trackEvent()` in
   `next/src/lib/v5-analytics.ts`, which is consent-gated. Nothing else may call `gtag` or
   push to `dataLayer`.

---

## 1. The envelope

Every contract event carries these fields in addition to its own parameters. They are
prefixed `pi_` so they can never collide with a call-site parameter and can be selected as
a group in a GA4 exploration.

| Field | Type | Meaning |
|---|---|---|
| `pi_event` | string | The event name, repeated inside the payload so an exported row is self-describing. |
| `pi_event_id` | string | Per-event id (`crypto.randomUUID()`, with a timestamp fallback). Deduplicates at the warehouse. Never a user id. |
| `pi_ts` | ISO 8601 | Client clock at the moment of the event. |
| `pi_page` | string | Path only. The query string is stripped by `safePagePath()`, because `/search/?q=` is where reader text lives. |
| `pi_release` | string | First 12 characters of the build's `PUBLIC_RELEASE_SHA`. `unreleased` on a local or preview build, which is the truth rather than a plausible lie. |
| `pi_consent` | `granted` / `denied` / `unknown` | The stored consent record at the moment of the event. `unknown` means the reader has not answered the banner. |
| `pi_schema` | number | `ANALYTICS_SCHEMA_VERSION`. Bump when the envelope changes in a way a consumer must notice. |
| `pi_component` | string, optional | The component or surface that owns the call site. |
| `pi_redacted` | number, optional | How many parameters the sanitiser removed. Present only when it removed something. A non-zero value on a live event is a bug report: something upstream tried to send personal data. |

### What the sanitiser removes

Applied to every payload, every time, with no opt-out:

- Any key in `FORBIDDEN_PARAM_KEYS` (`email`, `name`, `contact_name`, `message`, `notes`,
  `phone`, `q`, `query`, `search_term`, and the rest of the list), matched
  case-insensitively.
- Any string value shaped like an email address.
- Any string value shaped like a phone number (eight or more digits with separators).
- Any string value containing a query string (`?key=` or `&key=` anywhere). This is what
  stops the `/itinerary/` share link, which encodes stops and the day labels the reader
  typed themselves, and which is short enough to clear every other rule.
- Any string longer than `MAX_PARAM_STRING_LENGTH` (120). Free text does not belong in a
  payload and length is the cheapest reliable tell.
- Any object or array. Nested shapes cannot be audited at a glance.

Describing text without transmitting it: use `lengthBucket()`
(`empty` / `xs` / `s` / `m` / `l` / `xl`). Attributing an outbound link without
transmitting it: use `destinationHost()`, which returns the bare host with `www.` stripped.

### Consent

`emit()` never decides whether to send. It records the consent state in the envelope and
hands off to `trackEvent()`, which gates: `gtag` exists only after the reader opts in via
`CookieBanner`, and the `dataLayer` fallback checks the stored record. Call sites must not
branch on a reader's consent choice.

### Deduplication

`makeDeduper()` in `analytics-contract.ts` provides the primitive; `emit()` applies it when
a call site passes `dedupKey`. Keys identify the **intent**, not the element, so a booking
click from a sticky bar and one from an inline CTA still count separately. Default window
is 1000 ms. Per-event dedup rules are in the tables below; where a row says "none", a
repeat click is a repeat event by design.

---

## 2. Events implemented

### `booking_outbound_clicked`

The closest thing on the site to a commercial outcome, and until PI-024 it was not
measured at all.

| | |
|---|---|
| **Fires when** | A reader clicks an anchor that was marked at render time with `data-pi-book="<kind>"` and whose href is an absolute `http(s)` URL on a host other than this site. Capture phase, so it survives a same-tab navigation. |
| **Does not fire when** | The link is internal; the href is relative, `tel:`, `mailto:` or a fragment; or the link was never marked. **A plain "visit website" or "official site" link is deliberately not marked** - a homepage carries no reservation intent, and counting it would inflate the one number the commercial gates read. |
| **Dedup** | `booking:<destination_host>:<entity_id>:<surface>`, 1000 ms. Guards a double click and a listener that rebinds across an Astro view transition. |
| **Payload** | `booking_kind` (`booking` or `tickets`), `destination_host`, `entity_type`, `entity_id`, `surface`, `provider` (where the content model records one). |
| **Failure counterpart** | **None, and none is possible.** Once the browser follows the link this page learns nothing. There is no `booking_outbound_failed` and there must never be a `booking_confirmed` derived from this event. |

**Marked surfaces** (`data-pi-book`):

| Surface value | File |
|---|---|
| (from `BookingControl`) | `next/src/components/v5/BookingControl.astro` - covers every `Card`, `TheSix`, `DirectoryRows` and `/stay/` listing booking action |
| `venue-booking-bar` | `next/src/components/VenueDetailTemplate.astro` |
| `venue-facts-rail` | `next/src/components/VenueDetailTemplate.astro` |
| `venue-appointment-note` | `next/src/components/VenueDetailTemplate.astro` |
| `venue-visiting` | `next/src/components/VenueDetailTemplate.astro` |
| `venue-restaurant` | `next/src/components/VenueDetailTemplate.astro` |
| `venue-card` | `next/src/components/VenueCard.astro` |
| `dispatch-pick-card` | `next/src/components/DispatchPickCard.astro` |
| `event-detail` | `next/src/pages/whats-on/[slug].astro` (only when `eventBookingTarget()` returns `tickets` or `booking`; the `organiser` branch is a homepage and is not marked) |
| `tour-detail` | `next/src/pages/tour/[slug].astro` |
| `tour-package` | `next/src/pages/tour-packages/[slug].astro` |
| `golf-card` | `next/src/pages/explore/golf.astro` |
| `charter-hero`, `charter-footer` | `next/src/pages/fishing/charters/[slug].astro` |
| `boat-hire-hero`, `boat-hire-footer` | `next/src/pages/boating/hire/[slug].astro` |

The charter and hire links keep their existing `bf_charter_click` / `bf_hire_click` events
as well. Those are bubble-phase and same-tab, so they lose beacons;
`booking_outbound_clicked` is capture-phase and does not. Neither event was renamed.

**Known coverage gap on `/stay/`.** `next/src/pages/stay/index.astro` falls back to
`data.website` when a stay has no `bookingUrl`, so a "Book" button can point at a homepage
and still count. Fixing it properly means changing what that page renders, which is a
product decision, not an instrumentation one.

### `search_submitted`

| | |
|---|---|
| **Fires when** | A search is **committed** on `/search/` and the results have settled: the form is submitted, a kind chip is applied to a live query, or the page loads with `?q=` in the URL. Emitted after the answer set is known so it can carry an honest `result_count`. |
| **Does not fire when** | The reader is typing. `/search/` re-runs on a 100 ms input debounce and the overlay on 80 ms; one event per keystroke would make every downstream rate meaningless. **It also does not fire from the search overlay at all** - the overlay's form submit navigates to `/search/`, which records the submission there with a real result count. Counting both would double every search. |
| **Dedup** | None. The `commitTrigger` latch is the gate: it is set only by an explicit commit and consumed by the first run that follows. |
| **Payload** | `surface` (`search_page`), `trigger` (`submit` / `url` / `filter`), `engine` (`rpc` / `pagefind`), `kind_filter`, `query_length` (bucket), `result_count`, `zero_results`. |
| **Never** | The query string itself. Only its length bucket travels. |

### `search_failed`

| | |
|---|---|
| **Fires when** | Every search path has failed. On `/search/` that is the Pagefind catch after the RPC has already fallen through; in the overlay the same. The reader sees nothing, so this event is the only record that it happened. |
| **Does not fire when** | The RPC returns zero hits and Pagefind then answers. That is a fallback working, not a failure. |
| **Dedup** | Overlay: `search-failed:overlay`, 5000 ms, because a broken engine fails on every keystroke. Search page: none. |
| **Payload** | `surface`, `trigger`, `engine`, `kind_filter`, `query_length`, `reason`. |

### `result_selected`

| | |
|---|---|
| **Fires when** | A reader clicks a search result: a `.search-card` on `/search/`, or a `.site-search-overlay__result-link` in the overlay. Capture phase on both. |
| **Does not fire when** | The reader clicks the "see all results" CTA, a default suggestion chip, or any other link on the page. |
| **Dedup** | None. The click navigates away. |
| **Payload** | `surface` (`search_page` / `overlay`), `position` (1-based, read from rendered order so it stays correct after pagination), `result_count`, `kind_filter` (search page), `query_length`, `entity_type`. |
| **Never** | The result URL or title. `position` plus `entity_type` is what a ranking question needs. |

### `filter_applied`

| | |
|---|---|
| **Fires when** | Filter state is committed, from the single write path `commit()` in `next/src/lib/v5-filter-state.ts`. That covers chips, the filter sheet's Apply, Clear, a deep link with `?place=`, and a back-navigation restore. On `/search/` the kind chips emit it directly with `surface: 'search_page'`. |
| **Does not fire when** | An individual option inside the filter sheet is toggled before Apply. Sort and map-view changes have their own legacy events (`sort_change`, `map_toggle`) and were not renamed. |
| **Dedup** | `filter:<noun>:<source>:<keys>:<value count>`, 250 ms. A chip click that also lands inside a sheet Apply in the same tick counts once. |
| **Payload** | `source` (`chip` / `sheet` / `clear` / `url` / `restore`), `noun`, `filter_keys` (active facet keys joined by `|`), `filter_count` (number of selected values), `results_shown`, `results_total`, `cleared`. |
| **Note** | Facet values are slugs from a closed taxonomy (`place`, `cat`, `mood`, `price`, `party`, `date`), not reader input, so they are safe to transmit. `source: 'url'` is included on purpose: a filter applied by a shared link is still a filter applied, and treating it as invisible is how a referral channel comes to look like it converts nothing. |
| **Failure counterpart** | **None. Not applicable.** Filtering is pure client state with no I/O, so there is nothing that can fail. A `filter_failed` event would have no trigger. |
| **Relationship to `filter_apply`** | The pre-existing `filter_apply` click event is unchanged and unrenamed. It fires on chip clicks only, carries no payload (`data-key` and `data-value` are not in the delegated listener's attribute list), and counts a deselect as an apply. `filter_applied` supersedes it for analysis. |

### `plan_context_changed`

| | |
|---|---|
| **Fires when** | A reader clicks a context chip on `/explore/plans/` that is not already selected. Measured by a delegated listener in `analytics-events.ts` keyed off the existing `data-plan-context` and `aria-pressed` markup, because `PlanContextEngine.astro` is owned by other work in flight and was not edited. |
| **Does not fire when** | The clicked chip is already active (that is not a change), or a context is restored from `?context=` on page load (no click happened). The load case is a known gap, recorded here rather than faked. |
| **Dedup** | `plan-context:<context_id>`, 1000 ms. |
| **Payload** | `context_id`, `previous_context_id`, `surface` (`explore-plans`). |

### `trip_copy_started` / `trip_copy_succeeded` / `trip_copy_failed`

| | |
|---|---|
| **Fires when** | `started`: the reader presses "Copy share link" on `/itinerary/`. `succeeded`: **only after `navigator.clipboard.writeText()` resolves**. `failed`: the clipboard promise rejects, or the Clipboard API is unavailable and the reader is dropped into a `window.prompt` they must copy out of by hand. |
| **Does not fire when** | Any other `/itinerary/` toolbar action runs (print, clear, import, add day, pull from shortlist - all still unmeasured). |
| **Dedup** | None. All three share an `attempt_id` so the trio joins as one attempt. |
| **Payload** | `attempt_id`, `surface` (`itinerary`), `stop_count`, `day_count`, `method` (`clipboard` / `prompt`), plus `reason` on failure. |
| **Never** | The share URL. It encodes stop slugs and the day labels the reader typed into a prompt, which are sensitive trip details by any reading. The sanitiser's query-string rule is the backstop. |
| **Not covered** | `/me/trip/` fires the pre-existing `trip_share` event and `/account/saved/` fires `pi_plan_share`. Both files are owned by other work in flight and were not touched. See "Not reached" below. |

### `save_succeeded` / `save_failed`

| | |
|---|---|
| **Fires when** | `succeeded`: the saves store confirms an **add** (`result.ok` and the item was not previously saved). `failed`: the store refuses the write - private mode, quota - which previously showed "Not saved" to the reader and recorded nothing at all. |
| **Does not fire when** | The action was an unsave. An unsave is not a save; it gets `unsave_succeeded` / `unsave_failed` so no dashboard can quietly add the two together. |
| **Dedup** | `save:<entity_type>:<entity_id>`, 1000 ms. |
| **Payload** | `entity_type`, `entity_id`, `section`, `surface` (`card`), plus `reason` on failure. |
| **Note** | `reason` is always `store-rejected`. `SaveWriteResult` reports `ok` and `saved` and no cause; distinguishing private mode from quota needs a change to `next/src/lib/saves/store.ts`, which this ticket must not touch. |
| **Not covered** | Only `PiSaveActions.astro` is instrumented. The v5 `SaveControl` path writes through `v5-store.ts`, which is owned by other work in flight. The legacy `pi_save` / `pi_unsave` events still fire from `PiSaveActions` and were not renamed. |

### `partner_enquiry_started` / `partner_enquiry_handoff`

Read this entry before adding anything to the partner form.

The form at `next/src/pages/partners/index.astro` **does not submit**. Its action is
`https://formspree.io/f/peninsula-insider-partners`, which is not a real Formspree
endpoint (Formspree ids are 8-character hashes, not slugs), and the submit handler carries
`var ENDPOINT_LIVE = false`, so 100 percent of submissions are intercepted and turned into
a `mailto:` handoff. Once the browser hands off to a mail client, this page learns nothing:
not whether a message was composed, not whether it was sent, not whether the reader closed
the compose window. A success event here would be a lie, and the most expensive lie
available, because partner enquiries are a commercial decision input.

| | |
|---|---|
| `partner_enquiry_started` | Fires when the reader presses "Send enquiry". Payload: `attempt_id`, `surface` (`partners-page`), `business_category`, `interest`, `has_website` (boolean), `notes_length` (bucket), `fields_provided` (count). |
| `partner_enquiry_handoff` | Fires immediately before `window.location.href` is set to the `mailto:`. Payload: `attempt_id`, `surface`, `delivery` (`mail_client`), `outcome` (`unknown`), `business_category`, `interest`. `outcome: 'unknown'` is in the payload as well as in this document so nobody building a funnel from event names alone mistakes it for a completed enquiry. |
| **Never** | `business_name`, `contact_name`, `email`, the website or handle, or the note text. Only the closed-vocabulary `<select>` values, a boolean, a length bucket and a count. `partnerEnquiryShape()` in `analytics-contract.ts` is the tested reference implementation of this reduction, including the rule that a field added to the form later is treated as identifying until proven otherwise. |

`/partners/apply.astro`, `/partners/claim.astro` and `/partners/update.astro` post to a
real API and remain unmeasured. They are separate forms with a real success signal and
should get `partner_enquiry_submitted` properly; see "Reserved" below.

### `correction_channel_opened`

| | |
|---|---|
| **Fires when** | A reader clicks a `mailto:corrections@peninsulainsider.com.au` link that is marked `data-pi-intent="correction"`. |
| **Marked surfaces** | `article-note` (`CorrectionNote.astro`, rendered on evergreen journal articles only, and only where the format is evergreen), `corrections-policy`, `about`, `editorial-approach`, `contact`, `terms`. |
| **Not marked** | The live site footer. `next/src/components/Footer.astro` has a corrections address but has no importers and is dead code; the footer that actually renders, `next/src/components/v5/chrome/V5Footer.astro`, carries no corrections link at all. So the site-wide corrections affordance does not exist, which is worth knowing before reading anything into the volume of this event. |
| **Dedup** | `correction:<surface>`, 1000 ms. |
| **Payload** | `surface`. Nothing else: there is nothing else to know. |
| **This is not `correction_submitted`** | It records a reader reaching for the channel. Whether a correction was ever sent is unobservable from this site. See "Reserved" below. |

---

## 3. Reserved: named in the contract, deliberately not emitted

These names exist in the contract and are **not** wired. Emitting any of them today would
record a success that did not happen.

| Event | Why not, and what has to be true first |
|---|---|
| `correction_submitted` | There is no corrections form anywhere on the site. Every correction affordance is a `mailto:` anchor. A real corrections queue is being built on a separate branch; **this event belongs to that branch**. When it lands it should fire on the queue's confirmed write, carry the page path being corrected and a category, and never the reader's message text or address. `correction_channel_opened` is the honest measure of the current state and should be kept alongside it as the top of that funnel. |
| `correction_failed` | Same. No submission path, no failure path. |
| `partner_enquiry_submitted` | The partner form has no working endpoint. Whoever provisions Formspree (or replaces it) should flip `ENDPOINT_LIVE`, POST with `fetch` rather than a native form submit so the result is observable, and fire this event **only on a 2xx response**, carrying the same `attempt_id` as `partner_enquiry_started`. The `/partners/apply.astro` form already has a real endpoint and a real `data.success` flag; it is the better first home for this event. |
| `partner_enquiry_failed` | Fires on a non-2xx or a network error from that same fetch. Today there is no fetch. |
| `booking_outbound_failed` | Structurally impossible. Once the browser follows an outbound link this page is gone. |
| `filter_failed` | Structurally impossible. Filtering is pure client state with no I/O. |
| `plan_context_failed` | Structurally impossible for the same reason. |
| `result_selected` failure | A click that navigates has no failure state distinct from the destination 404ing, which is a server-log question. |

---

## 4. Pre-existing events, unchanged

None of these were renamed, because consumers of the old names could not be ruled out. They
are listed so a dashboard author knows what is legacy and what is contract.

| Event | Where | Note |
|---|---|---|
| `book_out` | `BookingControl.astro` via the `[data-evt]` listener | Superseded for analysis by `booking_outbound_clicked`, which also covers the other thirteen booking surfaces. Both fire on a `BookingControl` click. |
| `card_click`, `save_add`, `save_remove`, `plan_fork`, `trip_add`, `filter_apply`, `filter_open`, `filter_clear`, `sort_change`, `map_toggle`, `wo_date_change`, `ask_open`, `search_open`, `dispatch_submit`, `empty_state_cta`, `error_retry`, `alert_dismiss`, `pi_play_promo` | `[data-evt]` delegated listener, `v5-analytics.ts` | Payload limited to the eight attributes in `PARAM_ATTRS`. `sort_change` sits on a `<select>` and is bound to `click`, so it fires when the select opens, not when the value changes. |
| `pi_save`, `pi_unsave`, `pi_share_item`, `pi_plan_share`, `pi_plan_print`, `pi_plan_clear`, `pi_plan_fork` | `saves/analytics.ts` | Now consent-gated (see below). |
| `bf_charter_click`, `bf_hire_click`, `bf_species_view`, `bf_ramp_view`, `bf_tide_lookup`, `bf_licence_click`, `bf_tackle_click`, `bf_comparison_click`, `bf_cross_vertical_click`, `bf_eat_cross_link`, `bf_scroll_depth_50`, `bf_scroll_depth_80` | `BfAnalytics.astro`, fishing and boating pages only | Bubble phase, so a same-tab outbound click can lose the beacon. Now consent-gated. |
| `trip_share`, `trip_shared_fork`, `trip_day_add`, `trip_print` | `/me/trip/` | File owned by other work in flight. |

---

## 5. Consent finding

**The gtag loader has always been gated correctly.** `BaseLayout.astro` injects
`gtag.js` only when `localStorage['pi-consent-v1'].analytics` is true, and re-checks on the
`pi:consent-changed` event. `trackEvent()` in `v5-analytics.ts` gates its `dataLayer`
fallback the same way.

**Two other dispatchers did not.** `track()` in `next/src/lib/saves/analytics.ts` and
`emit()` in `next/src/components/BfAnalytics.astro` both pushed to `window.dataLayer`
unconditionally when `gtag` was absent. A reader who had refused analytics, or who had
never answered the banner, still had every save, unsave, share, fork, print, clear, charter
click and hire click buffered into `window.dataLayer`.

**Nothing was transmitted.** The site loads `gtag.js` directly with a `G-` measurement id
and has no GTM container. `gtag.js` ignores object-form `dataLayer` pushes
(`{event: name, ...}`), which is the form both shims used, so the buffered entries were
never read by anything. This was a loaded gun rather than a live leak: adding a GTM
container - a one-line change somebody will eventually make - would have flushed the whole
pre-consent buffer on the next pageview.

**Fixed in this ticket.** Both now read the same consent record before touching
`dataLayer`. The new contract events were consent-gated from the start, by construction:
they have no path to `gtag` or `dataLayer` except through `trackEvent()`.

**Still outstanding, and the more serious of the two.** Search query logging is **not**
consent-gated and is a real network request, not a buffer.
`next/src/components/SearchOverlay.astro` and `next/src/pages/search.astro` both POST the
**raw query string** to `pi.site_search_queries` in Supabase on every search, for every
reader, regardless of the stored consent record:

```
next/src/components/SearchOverlay.astro  logSearch()  -> POST /rest/v1/site_search_queries
next/src/pages/search.astro              logSearch()  -> POST /rest/v1/site_search_queries
```

The table (`ops/migrations/2026-05-07-site-search-queries.sql`) stores `query`,
`result_count`, `kind_filter`, `surface`, `page_path`, `session_id` and, when signed in,
`user_id`. Free-text search queries are reader-authored content and can contain anything a
reader chooses to type. PI-024 did not change this behaviour in either direction - the new
`search_submitted` event carries only a length bucket and goes through the consented path -
but it is the largest open consent question on the site and needs a decision from James:
gate it on consent, drop the raw `query` column in favour of a normalised form, or document
it in the privacy policy as strictly-necessary product telemetry.

**Also unmeasured: consent itself.** The banner fires no event on accept or reject. There
is no `consent_granted` / `consent_denied`, which means the denominator for every GA4
number on the site is unknown. Worth adding; out of scope here because it changes what the
consent surface does.

---

## 6. D3 baseline: the Pass waitlist

What can be established **from the repository** as of 2026-09-13. No number below is
guessed; where a number needs dashboard access it is named as such and left blank.

### Signup path

`/pass/` (`next/src/pages/pass.astro`) renders two forms, `data-pass-tier="insider"` and
`data-pass-tier="founders"`. Two controllers compete for them:

1. **Stripe mode.** Active only when `isStripeEnabled()` is true, which requires
   `PUBLIC_STRIPE_PUBLISHABLE_KEY` plus at least one `PUBLIC_STRIPE_PRICE_*` id. It
   rewrites the forms into Checkout buttons. **These variables are not set in
   `.github/workflows/build-and-deploy.yml`**, so on the deployed site Stripe mode is off.
2. **Waitlist mode (what is actually live).** Intercepts submit and POSTs
   `{ email, tags: ['pass-interest-<tier>'], source: 'pass-page' }` to
   `https://tjjhpvslpysfklwpqmgz.supabase.co/functions/v1/pi-newsletter-subscribe`.

### What is measurable, and where

| Quantity | Where it lives | Reachable from the repo? |
|---|---|---|
| Waitlist signups by tier | Beehiiv, as subscribers tagged `pass-interest-insider` / `pass-interest-founders` | **No. Dashboard only.** The `pi-newsletter-subscribe` edge function is not in this repo (`ops/edge-functions/` contains only `create-pass-checkout-session`, `create-pass-billing-portal` and `stripe-webhook`), so whether it also writes a Supabase row cannot be determined from the code here. Someone with Supabase function access must read it. |
| Waitlist signups in GA4 | Nowhere | **No. Not instrumented.** The Pass forms fire no analytics event of any kind. There is no funnel from a `/pass/` pageview to a submission. |
| Paid Pass subscriptions | `pi.pass_subscriptions` (`ops/migrations/2026-05-05-pass-membership.sql`): Stripe subscription id, status, tier, current period end, written by the `stripe-webhook` function using the service-role key | **Schema yes, count no.** Dashboard or SQL access required. Expect zero: Stripe mode is not enabled in the deployed build. |
| Members | `pi.profiles.is_member` and `pi.profiles.pass_active_until`, with an `is_active_member(uuid)` helper | **Schema yes, count no.** Dashboard only. |
| Consent records | `localStorage['pi-consent-v1']` on each reader's own device: `{ version: 1, necessary: true, analytics: boolean, ts: ISO }` | **Not centrally countable at all.** Consent is per-device and is never transmitted, so there is no consent-rate number anywhere, for the Pass or for anything else. The only way to get one is to add a `consent_granted` / `consent_denied` event. |
| Search demand for the Pass | `pi.site_search_queries` (raw query text, `result_count`, `surface`, `page_path`) | **Schema yes, count no.** Dashboard or the `ops/scripts/search-queries-report.mjs` script with credentials. Note the consent finding above before building anything on this table. |

### Existing obligations attached to the waitlist

- **An email address is collected and sent to a third party** (Beehiiv, via the Supabase
  edge function) on a page that makes a commercial promise: "We'll write when the `<tier>`
  tier opens." That promise is an obligation to the people on the list.
- **The email is collected under a strictly-necessary posture**, not an analytics one. The
  cookie banner gates analytics only; the waitlist POST is unrelated to it and fires
  regardless. That is defensible for a form the reader deliberately submitted. It must stay
  that way: **no analytics event on this page may ever carry the email address.** The
  sanitiser's `email` key rule and email-shape rule both cover it, and both are tested.
- **`/pass/` still names tiers.** Nothing in this ticket touches that, but any future event
  on this page must not carry a price, per the house rule.

### What James needs to decide

1. Someone with Supabase access should read the `pi-newsletter-subscribe` function and
   confirm whether waitlist signups land anywhere other than Beehiiv. Until that is known,
   the signup count is a Beehiiv dashboard number, not a repo number.
2. Whether to instrument `/pass/`. The contract in this ticket has no Pass event, so one
   was not added. The honest shape would mirror the partner form: a `started` event on
   submit and a `succeeded` event **only** on a 2xx from the subscribe endpoint, with the
   tier as the only payload and never the address.
3. The search-query consent question in section 5.

---

## 7. Not reached

Surfaces this ticket could not instrument because the files are owned by other work in
flight, listed so the gaps are known rather than discovered later.

| File | What is unmeasured or partly measured there |
|---|---|
| `next/src/lib/saves/store.ts` | The write result carries no failure cause, so `save_failed` cannot distinguish private mode from quota. |
| `next/src/lib/v5-store.ts` | The v5 trip and save store. `save_succeeded` covers `PiSaveActions` only. |
| `next/src/pages/saved.astro` | A clipboard copy with no event at all. |
| `next/src/pages/account/saved.astro` | Plan share fires the legacy `pi_plan_share` with no success or failure distinction. |
| `next/src/pages/me/trip.astro` | Trip share fires the legacy `trip_share` at click time, before the clipboard write resolves, so a failed copy is recorded as a share. This is exactly the pattern `trip_copy_succeeded` exists to replace. |
| `next/src/pages/me/*` | `trip_day_add`, `trip_print`, `trip_shared_fork`. |
| `next/src/components/v5/plans/PlanContextEngine.astro` | Instrumented from outside via delegated listener; the `?context=` page-load case cannot be reached that way. |
| `next/src/content.config.ts` | Holds every `bookingUrl` / `ticketingUrl` / `affiliateUrl` / `aggregator*` field definition. No markup, so nothing to instrument, but it is where a future `bookingProvider` on tours and events would be declared. |

Reachable but deliberately left alone, with reasons:

- **Plain "visit website" and "official site" links** (`VenueDetailTemplate` website row,
  `explore/[slug].astro`, `tour/operators/[slug].astro`, `explore/markets.astro`,
  `explore/spas-and-wellness.astro`, `events/[slug].astro` official site,
  `whats-on/[slug].astro` organiser website, and the hardcoded links in
  `stay/wellness-retreats.astro`, `explore/getting-here.astro` and the journal). Not
  booking clicks. Marking them would inflate the commercial number.
- **`PartnerSlot.astro`** - the only affiliate slot renderer, has zero call sites and its
  data file has `"enabled": false`. Inert.
- **`v2/V2VenueDetail.astro`, `v2/V2EventDetail.astro`, `_archive/*`, `pages-drafts/*`** -
  dead or unrouted.
- **The article "Copy link" button** (`BaseLayout.astro`) and the `PiSaveActions` share
  button's clipboard-failure branch - both silent, both share-not-trip, both outside the
  contract's event list.

---

## 8. Adding an event

1. Put the pure part in `next/src/lib/analytics-contract.ts` and test it in
   `next/src/lib/analytics-contract.test.mjs` (`npm run test:analytics-contract`). If a
   decision rule can be stated without a DOM, it belongs there.
2. Dispatch through `emit()` in `next/src/lib/analytics-events.ts`, or
   `window.piTrack(...)` from an `is:inline` script. Never call `gtag` or push to
   `dataLayer`.
3. Name the truth. If you cannot observe the outcome, the name must say so
   (`_handoff`, `_started`, `_channel_opened`), not imply a success.
4. Add a row to this file, including what the event does **not** do and its dedup rule.
5. No new analytics dependency and no new provider.
