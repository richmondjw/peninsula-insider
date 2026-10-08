# Eat flagship baseline: independent review two

URL: https://peninsulainsider.com.au/eat/. Observed 8 October 2026. Live deployment sourceSha `3d87e075433278392dec6c6ebb2b72200ce3ce97`, run `37732894566`, generated 05:42 UTC. Desktop 1440 × 1000 and mobile 390 × 1000/844, headless Chromium through Puppeteer. This reviewer did not read other reviewers' assessments.

Visitor task: choose a suitable Peninsula place for a meal or coffee, compare a manageable shortlist, then find practical information and book or plan a visit.

Score: **77.75/100, provisional**. No confirmed hard gate. Factual freshness and exhaustive rights verification are incomplete; this cannot certify 99. Screenshots captured in local temporary files `eat-review-two-1440.png` and `eat-review-two-390.png`. Full-page capture was made before scrolling, so lazy images appear blank in some screenshot regions; explicit eager-loading inspection subsequently confirmed all displayed images loaded. This distinction matters: the blank screenshot is not evidence of broken assets.

| Check | Rating /4 | Points | Independent evidence and deduction |
|---|---:|---:|---|
| VT1 Audience fit | 4 | 5 | Clear meal/coffee task, 52 places, occasions and towns; directly serves the intended visitor. |
| VT2 First-screen promise | 4 | 4 | H1 names region and task, standfirst describes options, browse-all and map links are immediate. |
| VT3 Decision structure | 2 | 2.5 | Six editorial choices distinguish occasions, but the 52-row list gives town/type/verdict without comparable price, dietary confidence, booking lead time or opening-day clues. Choosing still requires many detail visits. |
| VT4 Task completion | 3 | 3.75 | Venue detail links and guide lanes provide routes toward booking. Hub does not itself expose practical booking choice or clear cost expectations; authenticated save completion not verified. |
| FN1 Scannable hierarchy | 3 | 3 | Headings and grouping are coherent. Full list dominates an approximately 17,100px mobile page; repetitive row treatment weakens scanning. |
| FN2 Wayfinding | 4 | 4 | Map, ranked list, six best-of guides, Journal and clear site navigation provide relevant onward paths. |
| FN3 Discovery | 3 | 3 | With kids changes URL to `?party=family` and live status to Showing 32 of 52; category/town/mood sheet present. No venue-name query directly in this catalogue and no visible price/dietary controls. |
| ET1 Clear copy | 3 | 3 | Most verdicts are concrete and concise. Several unsupported superlatives persist, e.g. most serious roaster, best bread in town, best neighbourhood trattoria. |
| ET2 Local value | 3 | 3 | Farm, ridge, bay and village distinctions provide local character; some summaries lean on general praise instead of actionable trade-offs. |
| ET3 Freshness | 2 | 2.5 | Lead source lastVerified dates include Tedesca 15 May and Commonfolk/Merricks 9 April 2026. Broad claim checking against current menus/hours was not completed. Hub sensibly advises venue confirmation but does not show verification dates beside picks. |
| ET4 Sources/independence | 3 | 3.75 | Corrections and photography credits links are present; source code supports sponsored labels. Criteria/evidence underlying six choices and catalogue superlatives are not visible close to decisions. |
| VS1 Licensed imagery | 3 | 3.75 | Merricks record contains creator, VV permission, rights holder and date. Doot explicitly states Jackalope exterior is illustrative and not Doot. Source `cardImage` rejects photos lacking own rights evidence. Full corpus rights not independently revalidated; category tile lead and sparse photos reduce specificity. |
| VS2 Composition | 2 | 2 | Desktop lead is a large navy editorial tile beside small unevenly illustrated choices, then a long two-column text directory. Journal occupies large image zones. Mobile has a very long repetitive list and limited visual breaks. |
| VS3 Typography | 3 | 3 | Strong readable main hierarchy; lower-density desktop leaves small row text and long Journal titles less elegant. |
| VS4 Colour/contrast | 4 | 4 | Dark ink/navy on light surfaces, visible blue accents and solid focus outline observed; no visually supported contrast deduction. Numerical exhaustive contrast audit not claimed. |
| VS5 Consistency | 4 | 4 | Chips, row dividers, save circles, restrained palette and footer belong to a consistent publication. |
| MI1 Mobile/touch | 3 | 3.75 | At 390px document scrollWidth equals viewport width; rows and filter sheet reflow. Small secondary links and large vertical catalogue add mobile effort. |
| MI2 Feedback | 3 | 3 | Filter pressed state, URL and count update; duplicate Showing all 52 lines occur in rendered body text. Save action outcome was not positively confirmed in unauthenticated headless session. |
| MI3 Dialogs/recovery | 3 | 3 | Filters focus dialog panel, Tab reaches labelled close handle, Escape returns focus to Filters trigger. Save/auth recovery and form errors not established; no account data entered. |
| AT1 Keyboard/assistive tech | 3 | 3.75 | First Tab is visible Skip to content with solid outline. Filter dialog has aria-modal, labelled fieldsets, pressed options, and correct Escape return. Actual screen-reader speech and complete modal trapping not tested. |
| AT2 Speed | 3 | 3 | Navigation load sample ~181ms and DOM ~175ms on warm workstation connection; filters responsive after 400ms. No representative cold mobile network benchmark, so not excellent. |
| AT3 Stability/motion | 3 | 3 | No horizontal overflow; image placeholders and row layout maintain structure. Reduced-motion runtime behaviour and measured CLS not fully exercised. |
| AT4 Semantics/continuity | 4 | 4 | One main, one H1, correct title and self-canonical; family filter state encoded in URL, assistive live status updates accurately after settling. |

## Priority acceptance tests

1. Provide useful comparison signals without inventing prices, dietary guarantees or live availability; trace each claim to current venue evidence.
2. Make a coherent image-led editorial shortlist with licensed subject-specific imagery or clearly labelled original illustration. Retain honest illustrative disclosures.
3. Reduce mobile catalogue effort through category/search discovery and progressive disclosure while retaining accessible full catalogue content.
4. Verify unauthenticated save/trip outcomes, keyboard focus, exit and errors using real pointer/keyboard activation and appropriate asynchronous waits.
5. Recheck current factual claims, all shown image rights, cold mobile speed, motion and accessibility before a final grade.

Limitations: local source inspected at the audit worktree, not an assertion that every source line matches live deployed revision. No external source-wide editorial fact checking, authenticated login, real booking, screen-reader session or numerical contrast sweep was performed. No edits to implementation, external writes, deployment or additional delegation.

## Cross-hub typography observation requested during review

Computed styles measured on all eight live hubs at 1440px and 390px. These are additional observations; the independent Eat score above is unchanged.

| Hub | Desktop H1 | Mobile H1 | Body |
|---|---|---|---|
| Home | Sora 68px/600 | Sora 32px/600 | Figtree |
| Eat | Georgia 56px/600 | Georgia 32px/600 | Figtree |
| Stay | Sora 69.12px/650 | Sora 37.6px/650 | Figtree |
| Wine | Sora 72px/700 | Sora 39px/700 | Figtree |
| Explore | Georgia 64.8px/600 | Georgia 40px/600 | Figtree |
| Plans | Sora 76.8px/500 | Sora 42.4px/500 | Figtree |
| What's On | Sora 64px/600 | Sora 31.2px/600 | Figtree |
| Journal | Source Serif 4 64px/400 | Source Serif 4 58px/400 | Inter |

The complaint has a concrete basis. Eat mixes serif H1 with Sora section headings, while Explore extends Georgia into section headings. Journal replaces both display and body families, and its 58px mobile H1 is materially larger than every other mobile hub (31.2–42.4px). Within Sora hubs, weights range 500–700 (Stay asks for 650 although supplied font faces enumerate 600/700), tracking ranges roughly -2% to -4.5%, and section titles range 35.2–54.72px desktop. Wine's opening section H2 is 54.72px, versus common Six-module 36px. Plans section headings use weight 500, What's On 700, shared Six 600. This is accumulated page-specific hierarchy, not a font-loading outage.

Source causes: `v6-tokens.css` defines Sora/Figtree and maps legacy `--serif` to Sora. `HubStandfirst.astro:144` explicitly uses `var(--font-editorial, Georgia, serif)` for editorial variant; Explore page rules at lines 669/687 similarly specify undefined editorial fallback. Journal separately loads Inter/Source Serif 4 through `journal-fonts.css` and its own typography variables. PRODUCT.md lines 29–30 specify Sora/Figtree and Harbour palette.

Suggested enforceable rules: one Sora display family and Figtree body/UI family across hubs; shared hero/section/card type tokens with consistent weights, line-height and tracking; semantic variants can change composition and image treatment but cannot silently introduce font families; shared narrow-screen hero scale prevents Journal dwarfing the other hubs. Retain existing Harbour navy/cream/blue/sand roles. Remove per-page Georgia fallbacks and Journal font overrides or explicitly revise PRODUCT.md if a different editorial typography policy is approved. Add computed-style regression checks across these eight hubs at desktop/mobile, including font family, available font weight and hierarchy boundaries. Visual review must remain alongside the assertions because equal fonts alone do not unify composition.
