# Eat flagship iteration two: independent review one

Independent rubric-v1 review, submitted before other scores. Local built URL: http://127.0.0.1:4332/eat/, 8 October 2026. Chromium desktop 1440x1000 and mobile 390x844. This is a local built artifact, not a deployed verification. **86.25/100, provisional.** Facts and performance are not independently recertified; no 99 certification.

Evidence captures: `C:/Users/James/AppData/Local/Temp/eat-iteration-two-one-desktop.png` and `C:/Users/James/AppData/Local/Temp/eat-iteration-two-one-mobile.png`.

## Observed user tasks

- Hero is now a clear title, evocative standfirst, browse/shortlist/map links and a credited Trofeo interior photograph. Lead Merricks photo has a named credit. Main composition is materially more inviting and editorial than baseline.
- Desktop height 5,509px; mobile 8,637px, no horizontal overflow. Eight initial directory rows become sixteen through Show more. Show all remains available. Without JavaScript all 52 rows are visible, with a normal GET finder form.
- Combined category=cafe, town=Mornington, text=Commonfolk yields exactly Commonfolk. After 650ms settlement the aria-live announces “Showing 1 of 52 places”; progress says “1 of 1 matching places shown”. An earlier immediate stale status was the deliberate debounce, not a bug.
- Real pointer click opens Filters; focus enters panel. Tab reaches Close filters. Escape returns focus to Filters. Programmatic click produced misleading zero-size results and was discarded. Save Merricks toggles to aria-pressed=true and Saved. Trip click was exercised, but no convincing resulting trip state was captured; task completion remains partly unverified.
- All images load after lazy images explicitly activate. Credits identify regional subjects. The actual small article photographs are not visible in the initial full-page screenshot before scrolling lazy media into view; not broken files. Shortlist Commonfolk/Tedesca remain text-only.
- Typographical defects in category dropdown: “Brewerys (5)” and “Distillerys (1)”. Drawer uses correct Breweries/Distilleries.
- Editorial copy is less overstated than baseline, and no-pay-for-coverage method/corrections are now visible. However specificity was lost: Commonfolk copy is generic “read our venue notes”; Tedesca says check current menu/availability. The lead choices still lack shared comparative price, booking effort, meal duration or who each is best for.
- Only one initial directory row shows Details checked September 2026; most give no visible date. The hub carefully says dates belong to venue records, but that does not reverify claims. Journal titles/standfirst retain “three hatted restaurants” and strong comparative superlatives which require factual support.

## All fixed rubric checks

| ID | Weight | Rating | Points | Evidence / remaining deduction |
|---|---:|---:|---:|---|
| VT1 | 5 | 4 | 5 | Meal/coffee/town discovery serves visitor task. |
| VT2 | 4 | 4 | 4 | Clear first-screen promise and three useful actions, food destination photograph. |
| VT3 | 5 | 3 | 3.75 | Occasion/category/town now compare well; common decision facts still absent. |
| VT4 | 5 | 3 | 3.75 | Find and save work; trip outcome not independently established. |
| FN1 | 4 | 4 | 4 | Finder, shortlist, progressive list, Journal, FAQ coherent hierarchy. |
| FN2 | 4 | 4 | 4 | Maps, guides, venue routes, source-method and corrections links. |
| FN3 | 4 | 4 | 4 | Combined matching, progressive results, no-script full list observed. |
| ET1 | 4 | 3 | 3 | Concise but two plurals wrong and repeated generic check-with-operator phrasing. |
| ET2 | 4 | 3 | 3 | Distinct destinations, yet weaker specific recommendation reasons in new shortlist. |
| ET3 | 5 | 2 | 2.5 | Freshness context transparent; supporting venue/Journal facts not recertified. |
| ET4 | 5 | 3 | 3.75 | Visible independence/method/corrections; no detailed claim source audit. |
| VS1 | 5 | 4 | 5 | Truthful credited subjects, no observed misleading substitutions; rights evidence remains source-level. |
| VS2 | 4 | 3 | 3 | Much better hero/lead; text-only secondary shortlist and large blank lazy Journal regions still uneven. |
| VS3 | 4 | 4 | 4 | Clear consistent headings and compact readable hierarchy. |
| VS4 | 4 | 4 | 4 | Brand contrast and visual priorities legible. |
| VS5 | 4 | 4 | 4 | Controls/cards now coherent across hub. |
| MI1 | 5 | 3 | 3.75 | No overflow and useful native selects; still 8.6k px page with long Journal panels. |
| MI2 | 4 | 4 | 4 | Settled live count, progressive count, pressed/save label all correct. |
| MI3 | 4 | 4 | 4 | Filter opens, focus enters, Escape returns to opener; no-script recovery exists. |
| AT1 | 5 | 3 | 3.75 | Named controls, actual keyboard recovery verified; full assistive-tech path not tested. |
| AT2 | 4 | 3 | 3 | Responsive browser interactions; no throttled cold load/LCP evidence. |
| AT3 | 4 | 3 | 3 | Stable observed view; measured CLS/reduced motion not fully assessed. |
| AT4 | 4 | 4 | 4 | Main heading, directory semantics, state and normal onward links. |

## Priorities for next meaningful iteration

1. Add supported, genuinely useful decision facts to the shortlist, or restore specific editorial reasons without unverified assertions. Do not fill cards with invented price/booking facts.
2. Reverify the first six venue recommendations and high-risk Journal claims against operator/current award evidence. Display precisely what was checked and when; separate site record dates from full editorial rechecks.
3. Fix dropdown plurals. Reduce the explanatory admin-like sentence “Details-check dates belong to the venue record” into simple reader wording.
4. Confirm complete trip add/manage/remove journey and full keyboard/screen-reader path. Obtain cold throttled speed, CLS and reduced-motion evidence before closing the quality gate.
5. Consider more balanced shortlist secondary visuals only from rights-cleared assets or clearly conceptual illustration. Keep the truthful-image boundary intact.
