# Set10 independent guide review — 1 October 2026

**Project:** Peninsula Insider\
**Pages:** `/stay/vineyard-stays/` and `/stay/resorts/`\
**Reviewer:** independent Set10 QA agent; Set10 lead owns implementation and release.\
**Decision:** **ADAPT / release eligible for these two guides.** No release blocker found in the final local artifact. The measured 23-lens means are **93.00** and **91.22**; neither supports a 99/100 claim.

## Scope and exact evidence

The Set10 lead reported that the final post-citation `npm run build:search` from commit `a2fd7df` exited 0, generated 1,012 HTML files and indexed 728 pages. I served that completed `next/dist` read-only at `http://localhost:4365/` and opened fresh browser pages at 320×568, 390×844 and 1365×768. The cookie notice was visible on first visit at all three widths. I reviewed source, operator pages, the four licensed images and where-used entries. I did not edit either guide or publish.

| Exact static check | Vineyard Stays | Resorts & Retreats |
| --- | --- | --- |
| First action, 320×568 | “Find your stay” y411–459, 48px, hit-clear | Three choices y353–497, each 48px and hit-clear |
| First action, 390×844 | CTA y433–481 | Three choices y396–552 |
| First action, 1365×768 | CTA y606–654 | Three choices y490–694 |
| Reflow and runtime | No horizontal overflow or page error at all three widths | Same |
| Anchors | Five targets land with section top y80; H2 y162–200, visible | Three targets land at section top y144 mobile / y208 desktop; H2 y193 mobile / y291–358 desktop |
| Detail routes and schema | Seven editorial detail routes returned 200, including the intended `/wine/port-phillip-estate/`; seven cards match the seven-item CollectionPage list | Three sampled local section routes returned 200; no artificial property-list schema |
| FAQs | Three visible questions and answers exactly match the three FAQ schema entries | Same |
| Images after scroll | Jackalope and Lindenderry photographs decoded; 480px WebP variants selected at 320, 390 and 1365 | Cape Schanck and Eco Lodge photographs decoded; 480px mobile and 800px desktop WebP variants selected |
| Action and state | Seven direct operator handoffs have `target="_blank"` and `rel="noopener noreferrer"`; first save button changed `aria-pressed` false→true; accepting cookies hid the notice | Both secondary text links measured 44px high; the operator enquiry link has safe new-tab attributes |
| Keyboard focus | Hero CTA showed visible 3px dark outline with keyboard modality | First choice showed visible 3px accent outline |

At 320px the Vineyard document is about 11,435px tall and Resorts about 7,346px. These are useful guides but still long mobile reads. The images, card age advice and direct Port Phillip guest-terms citation were present in the final rendered artifact.

## Source and visual truth

The six Vineyard on-estate stays are grouped as villas, suites and hotels; Cassis is explicitly a separate nearby base. Seven operator paths and their editorial routes are present. The [Polperro operator page](https://www.polperrowines.com.au/escape/villas/) supports four studio villas, fireplaces, spa baths and its “not suitable for infants and children under 16” wording. The [Port Phillip guest terms](https://www.portphillipestate.com.au/accommodation-terms-and-conditions/) are cited directly beside the page's operator source list for the 16+ and under-18 supervision check. The guide does not promise restaurant opening days, a particular room view or an unverified price. The older current-tense “one hat” claim in the Port Phillip detail record remains a separate freshness follow-up; this guide does not repeat it.

Vineyard's two hero subjects are Jackalope vineyard guests and Lindenderry's white homestead, with visible Peter Foster / Visit Victoria credit and an explicit room-view limit. Resorts' hero is **Cape Schanck coast**, explicitly labelled as a destination photograph rather than a resort-room or retreat view; its thermal photo is explicitly an **Eco Lodge room at Peninsula Hot Springs**, not Alba or every springs room. Alt text, visible captions and actual pixels agree. The Visit Victoria page-use entries and underlying property/place rights records were inspected; the lead separately reported a passing 787-use Visit Victoria gate.

The [RACV room catalogue](https://www.racv.com.au/travel-experiences/resorts/cape-schanck/accommodation.html), [Peninsula Hot Springs accommodation](https://www.peninsulahotsprings.com/accommodation), [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/) and [Cape Retreat stay page](https://www.thecaperetreat.com.au/stay) support Resorts' three distinct decisions. The guide correctly separates room, bathing/package, spa treatment and group-enquiry bookings. Booking engines, package availability and operator hours were not transacted or observed.

## Independent 23-lens diagnostic

Unweighted heuristic scores out of 100, assessed on the final static artifact. They are not a traveller study, field performance measurement or accessibility certificate. The source authors' earlier 93.13 and 89.4 scores were provisional and were not used as targets.

| Lens | Vineyard | Resorts | Basis or remaining limit |
| --- | ---: | ---: | --- |
| 1. First-screen promise | 94 | 93 | Clear accommodation decision and visible first action |
| 2. Category scope | 96 | 89 | Vineyard estate boundary is precise; Resorts spans resort, thermal stay and group venue |
| 3. Format distinction | 96 | 91 | Villa/suite/hotel and three resort-related paths separated |
| 4. Booking dependencies | 94 | 89 | Age, dining, spa, bathing and group-booking caveats; checkout untested |
| 5. Factual traceability | 94 | 92 | Operator sources and direct Port Phillip terms; changeable inventory |
| 6. Freshness disclosure | 92 | 89 | Dated source notes; live availability not observed |
| 7. Copy economy | 84 | 88 | Vineyard's seven cards make a long 320px journey |
| 8. Hierarchy and scanning | 93 | 92 | Strong H1, immediate chooser, grouped continuation |
| 9. Wayfinding | 93 | 94 | Working anchors and onward paths |
| 10. Link integrity | 95 | 92 | Seven Vineyard and three sampled Resorts local routes returned 200 |
| 11. Mobile reflow | 96 | 94 | No overflow at 320, 390 or 1365 |
| 12. 320px first visit | 95 | 95 | Primary choices fully visible with cookie notice |
| 13. Desktop composition | 92 | 92 | Balanced editorial split; Resorts hero is destination context |
| 14. Typography | 89 | 90 | Readable body; Vineyard small cues and long mobile run remain |
| 15. Contrast | 96 | 92 | Vineyard corrected eyebrow 6.00:1 and light/dark focus >7:1; sampled, not exhaustive |
| 16. Tap targets | 96 | 94 | 48px first actions, 44px Resorts secondary links |
| 17. Keyboard and focus | 92 | 91 | Visible 3px focus on sampled first controls; full AT session untested |
| 18. Semantics and headings | 95 | 94 | Single H1, visible/schema FAQ parity, appropriate list schema on Vineyard |
| 19. State and feedback | 92 | 85 | Vineyard save and privacy state observed; Resorts mainly navigates |
| 20. Image truth | 94 | 91 | All four actual subjects and caveats verified; no resort room photo |
| 21. Media and performance | 90 | 90 | Responsive WebP decoded; field Core Web Vitals unmeasured |
| 22. Motion and stability | 94 | 94 | No page errors, overflow or intrusive hero motion |
| 23. Newsletter fit | 87 | 87 | Opt-in follows decision content; conversion fit untested |
| **Unweighted mean** | **93.00** | **91.22** | **Neither reaches 99** |

## Nonblocking issue and next action

At the 1365px Vineyard `#winery-suites` anchor, the section begins at y80 while the sticky breadcrumb ends at y183. Its small section cue lies y161–179 behind that breadcrumb; the “Winery suites” H2 begins at y199 and all actionable content remains visible. Mobile cue and H2 are clear. The Set10 lead will carry this as a scoped anchor-offset polish in the next set, without delaying this release.

**Release decision for these two pages:** no blocking defect in the exact local artifact. The owner should complete deployment and public-route acceptance separately. A successful build, local 200 response and these heuristic grades are not production proof or a 99/100 certification.
