# Stay Set10 Resorts and Retreats review — 1 October 2026

**Project:** Peninsula Insider\
**Owner:** Resorts guide agent; root owns integration and release.\
**Decision:** adapt the guide into three booking decisions.\
**State:** source and dev preview verified. Integrated static build, commit, push and public deployment remain with root.

## Baseline and change

The previous page mixed three thermal accommodation records with The Cape Retreat in one generic card grid. Its first useful action at 320 × 568 appeared at y=1,294–1,314, more than two short screens below the opening. The old H1 occupied y=315–433. Some generic cards could present illustrative imagery without a visible subject caveat.

The revised page begins with three linked choices: a resort room at RACV Cape Schanck, accommodation on a Fingal thermal estate, or a group retreat venue at The Cape Retreat. The thermal choice hands readers to the dedicated Hot Springs Accommodation guide rather than repeating its three listings. RACV has no overnight venue record in the current PI catalogue, so the page links to the official room comparison instead of inventing an internal property route. The Cape Retreat retains its internal notes and operator enquiry paths.

Booking dependencies are explicit: One Spa treatments need a separate booking, thermal inclusions depend on the room and package, and a group venue does not itself establish a facilitated program.

## Primary sources and image truth

Sources were checked 1 October 2026. Accommodation inventory and booking terms can change.

| Page claim | Primary source and limit |
|---|---|
| RACV Cape Schanck offers rooms, suites and separate villas, plus dining, a pool, golf and One Spa | [RACV accommodation](https://www.racv.com.au/travel-experiences/resorts/cape-schanck/accommodation.html) and [resort overview](https://www.racv.com.au/travel-experiences/resorts/cape-schanck.html). The guide promises no specific room view and tells readers to arrange spa treatments. |
| Peninsula Hot Springs offers Eco Lodges and glamping at Fingal | [Operator accommodation overview](https://www.peninsulahotsprings.com/accommodation). Detailed package comparison stays in the PI hot springs guide. |
| Alba offers villas and rooms at The Sanctuary | [Alba accommodation](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/). Detailed inclusions stay in the PI hot springs guide. |
| The Cape Retreat has 12 guest suites and shared living, dining and meeting spaces; markets for retreats, meetings and celebrations | [Operator home](https://www.thecaperetreat.com.au/) and [stay detail](https://www.thecaperetreat.com.au/stay). Operator pages disagree on total guest capacity, so the guide makes no occupancy claim. Individual suite versus group booking is left for confirmation. |
| Hero is a Cape Schanck destination image | Visit Victoria asset 143799 by Peter Tarasiuk, with website rights recorded in the Cape Schanck place record. The subject caveat appears before the image. It does not depict RACV or The Cape Retreat. |
| Thermal image is one Peninsula Hot Springs Eco Lodge room | Existing Visit Victoria asset with rights recorded in the Eco Lodges venue record. The caption says it is not Alba or every springs room. |

Final image placement fields for the shared where-used ledger:

| Visit Victoria ID | Page image field | Asset and subject | Visible credit/caveat | Rights record |
|---|---|---|---|---|
| 143799 | Hero `img src`, `alt`, `width`, `height`, `fetchpriority` | `/images/visit-victoria/vv-143799-cape-schanck.webp`; alt: `Scrubby Cape Schanck cliffs above a rocky shore and sunlit sea, with the lighthouse on the headland`; 1280 x 853; high priority | Caption: `Cape Schanck coast and lighthouse. Destination photograph, not a view from a resort room or retreat suite. Peter Tarasiuk, courtesy of Visit Victoria.` | `next/src/content/places/cape-schanck.json`: `license: visit-victoria`, `depictionStatus: actual`, `rightsStatus: recorded`, `provenanceReview: verified`, `permittedUses: [website, social]`. |
| 172319 | Thermal `img src`, `alt`, `width`, `height`, `loading` | `/images/visit-victoria/vv-172319-eco-lodges-peninsula-hot-springs.webp`; alt: `A guest sits beside a bush-view window in an Eco Lodge room at Peninsula Hot Springs`; 1280 x 853; lazy load | Caption: `An Eco Lodge room at Peninsula Hot Springs. This shows one thermal format, not Alba or every springs room. Courtesy of Visit Victoria.` | `next/src/content/venues/peninsula-hot-springs-eco-lodges.json`: `license: visit-victoria`, `depictionStatus: actual`, `rightsStatus: recorded`, `provenanceReview: verified`, `permittedUses: [website, social]`. |

The initial draft hero was an existing Peninsula Insider-credited image whose article record still used `license: tmp-unsplash`. It was replaced before source freeze so this page does not depend on that ambiguous record.

No shared image-placement ledger, venue record, shared component or Stay hub was edited.

## Dev QA

Fresh first-visit browser contexts showed the cookie notice at each viewport. The dev route at http://localhost:4363/stay/resorts/ returned HTTP 200 with no page errors or horizontal overflow.

| Viewport | H1 y bounds | Three choices y bounds | Result |
|---|---:|---:|---|
| 320 × 568 | 265–342 | 353–497 | All choices visible with 71px remaining. |
| 390 × 844 | 287–380 | 396–552 | All choices visible; image caption begins at y=690. |
| 1365 × 768 | 314–462 | 490–694 | All choices visible; image caption begins at y=314. |

At 320px, activating each choice placed the target H2 at y=193, clear of sticky chrome. Five checked internal guide/detail routes returned HTTP 200. Both final Visit Victoria images decoded at their recorded 1280 x 853 dimensions. Three visible FAQs and JSON-LD answers matched. Keyboard Tab reached the choice links with a solid 3px focus outline. External booking completion and real-device performance were not tested.

The final source passed Impeccable detect with no findings and a scoped Git whitespace check. It has one H1, no em dash and no price symbol.

## 23-lens diagnostic

These are single-reviewer provisional scores of the old source/preview and revised dev preview. They are not independent scores, user research, accessibility certification, production proof or evidence of 99/100.

| Lens | Before | Revised | Evidence or remaining limit |
|---|---:|---:|---|
| First-screen promise | 45 | 92 | Three real booking formats visible immediately. |
| Category scope | 30 | 92 | Resort room, thermal accommodation and group venue separated. |
| Format distinction | 35 | 91 | Room/villa, on-site springs and group suites distinguished. |
| Booking dependencies | 30 | 87 | Separate spa, package and facilitator checks stated; engines untested. |
| Factual traceability | 55 | 93 | New claims tied to operator pages. |
| Freshness disclosure | 45 | 87 | Dated source note; terms remain changeable. |
| Copy economy | 30 | 88 | Generic opening replaced by decisions and short checks. |
| Hierarchy and scanning | 35 | 91 | Three choices lead into three clear sections. |
| Wayfinding | 30 | 93 | Working anchors and related guides. |
| Link integrity | 55 | 88 | Five internal routes checked; external transaction not completed. |
| Mobile reflow | 65 | 91 | No overflow at 320 or 390. |
| 320px first visit | 20 | 91 | Choices end at y=497 with cookie notice visible. |
| Desktop composition | 35 | 90 | Editorial split and balanced section rhythm. |
| Typography | 72 | 89 | Existing Sora/Figtree system and bounded measures. |
| Contrast | 78 | 84 | Dark section visually legible; computed audit pending. |
| Tap targets | 65 | 90 | 48px mobile choice rows and primary actions. |
| Keyboard and focus | 70 | 90 | Choice links keyboard reachable with 3px outline. |
| Semantics and headings | 75 | 92 | One H1, labelled nav, ordered headings. |
| State and feedback | 55 | 85 | Native navigation; no booking completion proof. |
| Image truth | 30 | 93 | Subject caveats visible for area and property imagery. |
| Media and performance | 60 | 82 | Both images decoded; Core Web Vitals not measured. |
| Motion and stability | 75 | 90 | Explicit dimensions, no new animation dependency. |
| Newsletter fit | 80 | 88 | Newsletter retained after guidance. |
| **Unweighted diagnostic mean** | **50.9** | **89.4** | **Provisional dev-source reading only.** |

## Handoff

Root should include the page in the Set10 integrated build, recheck 320/390/1365 first visit on the exact static artifact, and request independent visual and factual review before a final grade. A future RACV overnight venue record could add an internal notes route after separate source and image-rights review.
