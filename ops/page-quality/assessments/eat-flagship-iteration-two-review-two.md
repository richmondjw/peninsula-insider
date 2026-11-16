# Eat flagship iteration two: independent review two

Candidate: http://127.0.0.1:4332/eat/, observed 8 October 2026, desktop 1440 × 900 and mobile 390 × 900/844. Local built candidate, not a deployed release. No root iteration log or other reviewer assessment consulted. Rubric v1 fixed 23 checks. Task: choose a suitable place to eat/drink and move toward a practical visit.

**85.75/100, provisional; no observed hard gate.** Freshness, exhaustive image provenance, assistive technology, cold speed and motion evidence remain incomplete. This is a substantial improvement, not a 99 certification.

| ID | Rating | Points | Evidence and remaining deduction |
|---|---:|---:|---|
| VT1 | 4 | 5 | Explicit regional meal/coffee task, occasion-led copy and 52-place catalogue serve audience. |
| VT2 | 4 | 4 | Desktop photograph and concise promise with browse, shortlist and map actions; mobile actions all visible by ~540px including cookie banner. |
| VT3 | 3 | 3.75 | Category/town/search and editorial starting points improve choice. No supported cost/dietary/booking-commitment comparison at hub level. |
| VT4 | 4 | 5 | Search commonfolk returns one actual venue, detail route and visible save work. Keyboard Enter toggles visible save aria-pressed=true without requiring sign-in. |
| FN1 | 4 | 4 | Eight-row initial catalogue with Show more/Show all replaces long initial 52-row mobile wall. Clear section hierarchy. |
| FN2 | 4 | 4 | Guides, shortlist anchor, map, directory, Journal and footer destinations clear. |
| FN3 | 4 | 4 | Labelled name/town/type search, category count select, town select and sort; commonfolk updates URL `?find=commonfolk` and announced Showing 1 of 52. |
| ET1 | 3 | 3 | New lead copy direct. Select has spelling errors Brewerys/Distillerys. Shortlist says Details-check dates belong to the venue record, an editorial process explanation instead of visitor benefit. |
| ET2 | 3 | 3 | Village/ridge/farm distinctions remain helpful. Shortlist is now more cautious but less distinctive; catalogue still contains generic unsupported strongest/best claims. |
| ET3 | 2 | 2.5 | One visible September checked date does not prove entire catalogue current. Inherited source records include April/May dates; no independent current venue/menu fact check performed. |
| ET4 | 4 | 5 | Near-shortlist independence, selection-method and change-report links plus credits provide clear accountability. |
| VS1 | 3 | 3.75 | Trofeo photo honestly identifies location; Merricks photograph credit visible. Journal imagery has credit/caption. Wikimedia Commons credit alone is not creator/licence evidence; full rights/source corpus needs audit. |
| VS2 | 3 | 3 | Desktop photo-led hero is balanced and significantly stronger. Shortlist still mixes photo-led large lead with text-only side choices; mobile hero photograph omitted. |
| VS3 | 4 | 4 | Eat Sora H1 48px desktop/32px mobile and Figtree text form readable, restrained hierarchy. |
| VS4 | 4 | 4 | Navy/blue on light background and solid 2px skip focus visible. No visually supported contrast defect; numerical full contrast not claimed. |
| VS5 | 3 | 3 | Families now unify across eight hubs, but hero/section hierarchy still diverges substantially (see measured table). |
| MI1 | 4 | 5 | 390px scrollWidth equals390; stacked form and large Show places target work; native selects safely clip long selected value without overflow. |
| MI2 | 3 | 3 | Search count and save pressed state give positive feedback. Duplicate Showing all52 in body text persists; saved button still accessible label Save Commonfolk Coffee after pressed=true, less explicit than Remove saved. |
| MI3 | 3 | 3 | Filters modal focuses labelled close on Tab; Escape returns Filters trigger. Form error/auth/network recovery not fully exercised. |
| AT1 | 3 | 3.75 | Skip link first focus with 2px solid outline; labelled input/select, live count, filter Escape, keyboard save tested. No actual screen-reader speech or exhaustive focus-trap review. |
| AT2 | 3 | 3 | Local interactions settle within500ms and browser renders readily. No representative cold-network mobile measurement. |
| AT3 | 3 | 3 | All eight hubs reflow without horizontal overflow. No measured CLS or full reduced-motion exercise. |
| AT4 | 4 | 4 | Search state expressed in URL, matching result correct, semantic form controls and sections retained. |

## Cross-hub computed typography and reflow

All eight URLs tested at 1440px and390px; every heading sampled is now Sora. No page exceeded viewport scrollWidth. Remaining type scales are separate page-specific systems:

| Hub | H1 desktop | H1 mobile | Notable section |
|---|---:|---:|---|
| Home |104px|41.2px|common H2 36/28.64px |
| Eat |48px|32px|discovery26/22.32px, main H2 36/28.64px |
| Stay |69.12px|37.6px|opening H2 38.4/28px |
| Wine |72px|39px|opening H2 54.72/36.8px |
| Explore |64.8px|40px|opening H2 43.2/24px |
| Plans |76.8px|42.4px|H2 35.2/26.4px |
| What's On |48px|32px|H2 36/28.64px |
| Journal |48px|32px|lead story H2 44/37px, sidebar29px |

Family correction is real. However Journal mobile story H2 37px exceeds its32px H1, Wine opening H2 nearly equals H1 on mobile, and Home104px versus Eat48px desktop gives very different visual authority. Some composition-specific variation is reasonable, but document a common hierarchy and explicit hero variant boundaries rather than declaring all headings unified through font family alone.

## Next iteration acceptance priorities

1. Correct category plurals and rewrite process-heavy shortlist disclaimer in visitor language; keep honest operator confirmation guidance.
2. Check high-risk food/menu/opening claims and remove unsupported catalogue superlatives. Show verified dates only when backed by actual information-check evidence.
3. Establish a shared cross-hub hierarchy for H1/H2, available weights, tracking and narrow-screen limits, while preserving legitimate composition variants. Revisit Journal H2 larger than H1.
4. Add useful comparable, sourced decision signals rather than filling fields speculatively.
5. Verify Commons image creator/licence and every image shown; capture cold performance, reduced motion and full keyboard/assistive evidence before final grading.

Evidence limitations: screenshots are viewport captures in temporary `eat-iteration2-review2-1440.png` and `eat-iteration2-review2-390.png`. A first save attempt selected a hidden shortlist button after filtering; that result was discarded. The visible directory save was then focused and activated with real keyboard Enter, and its state changed. No account data entered, external writes or deployment performed.
