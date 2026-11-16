# Consent note: first-visit content clearance

**Project:** Peninsula Insider
**Owner:** Peninsula Insider site team
**Decision:** Adapt the shared consent surface, subject to the integrated build and independent final review.
**Evaluation date:** 1 October 2026
**Scope:** CookieBanner and BaseLayout only; local dev preview on port 4337.

## Baseline, hypothesis and change

The previous fixed consent card intercepted the primary One Night action on a 320 × 568 first visit: the action occupied y430–474, but a centre-point hit test returned the cookie card. On desktop, the fixed card covered part of article hero photography or its credit. The hypothesis was that an immediately rendered, compact note in document flow before the page hero would preserve consent choice while letting visitors reach page content without an overlay.

The first-visit note now renders before breadcrumbs and `main`, with the existing explanation, privacy link and choices. Its initial mode is a full-width, in-flow strip. A valid saved `pi-consent-v1` choice hides it synchronously before following content is parsed. Explicit footer or programmatic reopening switches it to the compact fixed card. Existing Accept, Manage, Save, Reject, analytics toggle, event, Escape and Astro navigation behavior are retained. Desktop vertical padding is 4px; all action controls remain 44px high.

## Expert consent-experience grade

These are the implementer's provisional, equal-weight UX/accessibility judgments against the previous local card and the changed local preview. They are not a 23-layer page score, an independent review, field measurement or visitor outcome.

| Applicable criterion | Previous card | In-flow candidate |
| --- | ---: | ---: |
| Content and caption non-obstruction | 30 | 96 |
| First-fold CTA discoverability | 55 | 79 |
| Phone layout adaptation | 62 | 90 |
| Desktop composition | 65 | 89 |
| Privacy choice clarity | 84 | 87 |
| Touch targets and keyboard flow | 83 | 91 |
| Returning-visitor layout stability | 80 | 93 |
| Preferences and reopening continuity | 88 | 93 |
| Opt-in analytics behavior | 90 | 90 |
| **Equal-weight total** | **637/900 (70.8%)** | **808/900 (89.8%)** |

The largest improvement is the observed removal of CTA interception. The candidate remains below the requested 99%, notably because the One Night primary action still needs a short scroll on the smallest first-visit viewport.

## Local verification

At 320 × 568, 390 × 667 and 1365 × 768, ten routes returned HTTP 200: homepage, One Night, Spa Stays, Thermal Springs Weekend, Golf Stay and Play, School Holidays, JSON Golf Weekend, Map, Saved and My Trip. Each rendered the privacy link and 44px initial actions in flow before `main`; browser page errors were absent. The note did not cover the hero, caption or action. The map's horizontal chip strip briefly affected one 320px overflow snapshot; a repeat returned 320px document width, and the strip was unrelated to consent.

On One Night at 320 × 568, the in-flow note was 107px high and moved the primary action to y537–581. A 120px scroll placed it at y417–461 and its centre hit the action. Accept removed the note and returned that action to y430–474. At 390 × 667, the note was 122px and the action y531–575. At 1365 × 768, the 53px desktop strip left the Spa Stays primary action at y715–759, fully in the viewport. The strip remained the same height from DOMContentLoaded through 2.5 seconds; after a stored choice, its height was 0px both immediately and 2.5 seconds later.

Fresh visitors had no stored consent, an unchecked analytics toggle and no `window.gtag`. No Google Analytics request occurred before choice on localhost. Accept stored analytics:true; fresh Reject stored analytics:false; Manage showed the Save and Reject controls at 44px. Escape stored nothing and the note returned after an Astro page transition. Footer reopening worked after an Astro transition, focused Accept, and returned focus to the footer link on Escape. Programmatic reopening also worked.

## Limits, next gate and rollback

The localhost preview intentionally blocks production Google Analytics by hostname, so it does not prove production network gating. A public first-visit test and production analytics check remain required after the integrated build and independent artifact review. No `V5BottomBar` is mounted in this branch, so the Map, Saved and My Trip destinations were exercised but active bottom-tab collision could not be tested. At 320 × 568, One Night's action is partly below the first fold until the visitor scrolls or makes a consent choice.

If integrated or public verification finds a regression, revert only the two-file consent placement/style change while preserving the other concurrent page and data edits. The prior fixed card is the known fallback, with its documented content interception.


## Independent integrated check

The final integrated build exited 0. An independent reviewer exercised the generated artifact on Home, One Night, Spa Stays, Thermal and Hot Springs Stays at 320 × 568, 390 × 667, 1024 × 768 and 1365 × 768. All 20 page/width combinations returned 200, kept the notice in flow, exposed 44 px choices and left the tested hero actions pointer-clear. Accept and reload, Manage with analytics off and on, Reject, Escape without storing, and footer reopening/focus return passed. No horizontal overflow, page errors or pre-consent analytics requests appeared. The reviewer scored the interaction **96/100 provisionally**, with the remaining 13 px first-fold shortfall on One Night at 320 px and production analytics gating still to check. This score uses the consent-specific criteria, not the 23 page lenses.


## Public first-visit receipt

On the exact published Set 5 commit, a fresh 320 × 568 browser visit had no stored consent and no Google Analytics or Tag Manager request before choice. The in-flow note did not cover the accommodation hub action, and the page had no horizontal overflow. Accept stored analytics=true and then attempted one analytics request. The test intercepted that request before transmission to avoid recording a synthetic visit. This supports production consent gating for the tested path; other devices and assistive-technology sessions remain to be evaluated.
