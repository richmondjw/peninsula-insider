# Small product tests: homepage decisions and What's changed

Approved scope: items 13 and 14 of the 16 September 2026 audit. These are tests, not claims of improved conversion or retention.

## Homepage decision test

The hero now offers This weekend, Plan a trip and Search the Peninsula, using existing destinations and services. Eat / Stay / Wine / Explore remain below. The category heading is Explore by interest, rather than asserting these are the site's only four ways in.

Existing consent-gated analytics attributes identify `surface=home-intents` and `variant=three-intents`; weekend and plans use card_click, search uses search_open. No new analytics service or personal identifiers are added. Release attribution uses the existing release contract. Consent-denied visitors still get the same navigation; clicks must not require analytics.

Before release: check all three journeys with and without JavaScript; mobile at 390px and 320px; keyboard and visible focus; no overflow; search overlay close/return; cookie notice present and dismissed. Existing plans must remain copyable and venues searchable. Record failures, not merely click totals.

After release: compare an equal weekday/weekend mix with the previous period, excluding internal traffic and noting campaign/source changes. Click rate is a diagnostic only. Primary questions: can someone find a suitable upcoming event, choose a plan and find a named venue? Observe a small mix of first-time visitors and regulars completing those tasks; record success, wrong turns and time. Do not claim statistical uplift from a small convenience sample. Retain or adjust based on task success and the available traffic; rollback is the HomeCover link block and HomeDoors label in this change.

## What's changed: editorial pilot, no new publication

Recommended home: a clearly labelled section in the Insider Note with existing quick-note detail links. No separate publication, automated email campaign, town-filter feature or empty public page is introduced.

Before the first edition, the PI editorial desk must name an owner and confirm its available checking time. The pilot runs for four editions, with up to three useful changes per edition; no minimum quota and no invented filler. Final scheduling follows the single newsletter contract rather than introducing another send promise.

Each candidate needs:

| Field | Required evidence |
|---|---|
| What changed | Concrete before/after or a genuinely new opening/booking opportunity |
| Town | Confirmed locality, manually labelled initially |
| Effective date | When the real-world change occurs, distinct from publication/review date |
| Checked date | Actual source-check date |
| Source | Operator or authoritative notice, with URL and exact supporting passage |
| Reader implication | What to book, do differently, avoid or check |
| Expiry/recheck | When the item stops being current and who checks it |

Reuse quickNotes sources, verifiedAt, verifiedBy, publishedAt, expiresAt and relatedVenue. The body can carry effective date and town during this editorial trial, avoiding a schema expansion before need is proven. Keep the claim registry and venue/event records authoritative; a quick note is a presentation of that evidence, not a replacement database.

Never convert record creation, first verification, evidence expiry or a disputed fact into 'newly opened' or 'recently changed'. Do not announce every routine event as a change. A booking item needs an actual new booking opportunity, not an evergreen booking URL. Corrections to PI's own records should be labelled as corrections when there is no real-world change.

## Baseline intake run

The existing materialChangesSince helper was run on the clean current-main corpus for 9–16 September 2026. The saved candidate snapshot is `2026-09-16-changes-pilot-candidates.json` alongside this document.

It reported 59 first-verified claims, 13 lapsed claims, 2 disputed claims and 7 reassurances. **None qualified as an eligible real-world change signal for this pilot.** This proves the need for an editorial intake, not that nothing changed in the region. The initial registry output is not suitable for automatic publication.

The separately researched Red Hill market identity is still an explicit publishing decision in its source report. It is not silently repurposed as a newly opened business or resolved by this pilot.

## Evaluation

For each edition record useful actions (verified detail/booking-link clicks where consent permits), direct reader feedback, checking time and expired/corrected items. Compare repeat usage with the available pre-pilot baseline without treating correlation as causation. Advance to town filtering only if the number of useful verified updates makes it necessary. Stop or reduce the pilot if maintaining accuracy costs more than the usefulness readers demonstrate.

Status: homepage prototype implemented for verification; pilot protocol and initial intake complete. No participant study, live email send, demand validation or retention result is claimed.
