# Eat flagship final local build: independent review one

Independent reviewer one, fixed rubric v1.0, submitted before other scores. Observed final local built http://127.0.0.1:4332/eat/ on 8 October 2026 at 1440x1000 and 390x844. This is pre-release evidence, not deployed certification. **90.75/100, provisional.** No observed hard gate failure in the changed hub. Full factual, assistive-technology and cold performance evidence is absent; 99 is not established.

## Direct final evidence

- Captures: `C:/Users/James/AppData/Local/Temp/eat-final-one-desktop.png`, `C:/Users/James/AppData/Local/Temp/eat-final-one-mobile.png`, and venue first-screen `C:/Users/James/AppData/Local/Temp/eat-final-one-venue-mobile.png`.
- Combined restaurant + Merricks + General gives Merricks General Wine Store only. Clicking its directory link reaches the proper venue page through actual browser navigation. Venue offers Reserve a table and telephone, photographed gallery and its own Save button. No external booking performed.
- Keyboard Enter on hub Save Merricks gives aria-pressed=true. Keyboard Enter on Add Merricks to trip writes one anonymous browser-only trip entry. Navigating to /me/trip/ renders My Trip (1), Merricks General Wine Store and Move/Remove actions. No account/database changes made. This establishes successful add, not an exhaustive trip-edit test.
- Filter pointer opening focuses the dialog; Tab reaches Close filters; Escape returns to Filters. Settled live count from previous combined discovery check is accurate after 650ms debounce. No serious keyboard blocker observed. No screen-reader run performed.
- Progressive catalogue initially exposes eight rows, Show more exposes sixteen; all 52 remain server-rendered and visible with JavaScript disabled. No-script finder controls are now hidden, preventing a nonfunctional filtering promise.
- Desktop 5,546px high; mobile 8,685px, no horizontal overflow. Main mobile h2 values are 28px, finder22.32px. All images loaded after forcing eager; visually inspected final mobile confirms real Journal photographs rather than empty media gaps.
- Breweries and Distilleries now spelled correctly. Shortlist reasons restored: Merricks breakfast/lunch, Commonfolk roastery/courtyard, Tedesca farm/fixed menu. These are materially more useful than generic check-with-venue copy.
- Final long-lunch image explicitly identifies Montalto as regional context, not every named venue. Secondary shortlist stays text-only instead of inheriting an uncleared photo. This is a defensible rights boundary but still an uneven visual treatment.
- Source records Commonfolk lastVerified2026-04-09, Tedesca2026-05-15 and Merricks2026-04-09 were inspected. I did not independently recertify operator facts in this review. Hub makes the scope caveat; it does not claim every detail was freshly checked. Journal “three hatted restaurants” and directory hat/chef facts remain outside this review's factual certification.

## Fixed rubric scores

| ID | Weight | Rating | Points | Evidence / deduction |
|---|---:|---:|---:|---|
| VT1 | 5 | 4 | 5 | Food, coffee, destination and town choices fit visitor task. |
| VT2 | 4 | 4 | 4 | Clear promise, destination photograph and discovery actions. |
| VT3 | 5 | 3 | 3.75 | Good occasion distinctions, but shared price/booking/duration comparisons still limited. |
| VT4 | 5 | 4 | 5 | Discovery to correct venue, keyboard save and persisted trip entry verified. |
| FN1 | 4 | 4 | 4 | Finder, shortlist, progressive directory, Journal, FAQ legible hierarchy. |
| FN2 | 4 | 4 | 4 | Venue, map, guides, methods, corrections and trip paths available. |
| FN3 | 4 | 4 | 4 | Combined filters, progressive display and no-script full list verified. |
| ET1 | 4 | 4 | 4 | Correct category plurals, concise useful shortlisted descriptions. |
| ET2 | 4 | 4 | 4 | Specific village/farm/roastery reasons restored. |
| ET3 | 5 | 2 | 2.5 | Scope transparent; individual facts and older record dates not fully recertified. |
| ET4 | 5 | 3 | 3.75 | Visible no-pay-for-coverage/method/correction links; no complete source audit. |
| VS1 | 5 | 4 | 5 | Named licensed subjects and truthful contextual disclosure; no false venue photo substitutions observed. |
| VS2 | 4 | 3 | 3 | Strong hero and lead image; text-only secondaries still less balanced. |
| VS3 | 4 | 4 | 4 | Explicit readable type sizes, mobile h2 capped28; clear hierarchy. |
| VS4 | 4 | 4 | 4 | Legible PI navy, white, warm neutral and accent treatment. |
| VS5 | 4 | 4 | 4 | Coherent native selects, buttons, sections and brand. |
| MI1 | 5 | 4 | 5 | No overflow, reflow and progressive browse work; mobile controls and type usable. |
| MI2 | 4 | 4 | 4 | Debounced settled count, Save state and trip persistence verified. |
| MI3 | 4 | 4 | 4 | Dialog focus/Escape and honest no-script fallback observed. |
| AT1 | 5 | 3 | 3.75 | Keyboard primary controls succeed; full screen-reader/focus-trap audit absent. |
| AT2 | 4 | 3 | 3 | Local interactions responsive; cold throttled LCP/INP absent. |
| AT3 | 4 | 3 | 3 | No disruptive motion observed; measured CLS/reduced-motion assessment absent. |
| AT4 | 4 | 4 | 4 | Main heading, canonical, normal links, persisted state and directory semantics. |

## Remaining priorities

- To approach99, supply independently reviewed current evidence for high-risk venue and Journal facts; do not confuse new shortlist copy research with a complete article/directory recheck.
- Complete assistive-tech and cold performance/CLS/reduced-motion evidence. These are evidence gaps, not demonstrated regressions.
- Broaden supported comparisons where operator evidence permits; do not invent price or booking details.
- Consider rights-cleared secondary imagery or restrained conceptual art if a future layout pass can improve balance without inaccurate venue depictions.

No source edits were made by this reviewer. The temporary browser script was removed; only this assessment persists.

## Targeted rebuild verification

Following the final typography/link/guidance correction, a fresh real Chromium visit to preview4332 confirmed every desktop main h2 computes32px. At390px main section h2 values remain<=28px (finder22.32px); no horizontal overflow. All five observed main paragraph links (method, correction, saved, trip, What's On) compute text-decoration-line:underline, providing a cue beyond colour. Shortlist guidance now reads “Six ways to spend your day. Choose the setting that suits you, then check the venue’s current menu and availability.” The earlier record-process wording is removed.

Score remains90.75/100: VS3/VS4/ET1 already received4 in this independent scorecard. These corrections substantiate those ratings but do not remove the separately recorded factual, complete assistive-tech or cold-performance evidence gaps. No rounding or score inflation applied.
