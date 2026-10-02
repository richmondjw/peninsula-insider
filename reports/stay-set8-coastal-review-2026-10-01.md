# Stay Set8A Coastal Stays review — 1 October 2026

**Project:** Peninsula Insider\
**Outcome sought:** help a visitor choose an actual coastal base without mistaking an inland stay or an area photograph for a beachfront property.\
**Owner:** Set8 release lead (root); this page and report prepared by Coastal guide agent.\
**Decision:** adapt the guide. The prior automatic zone filter and long generic introduction made the category promise unreliable.\
**State:** first exact Set8A static artifact inspected at 320×568, 390×844 and 1365×768. A focused source reorder now puts stay rows before the area photograph on mobile; that final edit awaits a rebuilt static artifact. No commit, push or public deployment is claimed by this report.

## Baseline and bounded change

The Set8 scout assessed Coastal Stays at a **52–67/100 unweighted diagnostic range** across 23 lenses. In the inspected prior static page at 320px, the first guide action appeared near y=1,708 and the first venue image near y=1,757. Those positions describe the prior artifact, not this edited page.

The old filter listed any active non-spa stay in broad tip, ocean-coast and bay-coast zones. It included inland Fingal thermal accommodation and 18 source records, while copy promised shore access. The page also recommended a non-existent Sorrento Coastal Retreat detail route, called Flinders Hotel directly opposite/above the pier and supplied unsupported exact drive times in visible and structured FAQs.

The changed page curates **seven** bookable/checkable records into four visitor decisions: Sorrento village hotels; Rye/Capel Sound cottages; Flinders/Cape Schanck bases; and Point Nepean Discovery Tents. It sends the inland thermal decision to the Wellness Stays guide. A first-screen action jumps to the chooser. The FAQ JSON-LD and visible text render from the same data array. The card copy distinguishes beach access, coast outlook, room format and booking arrangement instead of treating them as interchangeable.

## Source checks and editorial limits

All sources below are operator or relevant public land manager pages inspected on 1 October 2026. Property inventory, guest conditions and openings can change.

| Page claim | Primary source and limit |
|---|---|
| InterContinental Sorrento is in the village and the Front Beach is a short walk | [Operator accommodation page](https://sorrento.intercontinental.com/accommodation) and [operator journey page](https://sorrento.intercontinental.com/plan-your-journey). No room view or ocean-beach adjacency is assumed. |
| Hotel Sorrento offers rooms/studios, with village and bay beach a short stroll | [Hotel Sorrento stay page](https://hotelsorrento.com.au/stay/). The same page currently reports daytime midweek construction and possible movement changes ahead of a 1 December expansion. The guide shows a dated advisory and links this live notice. |
| Blue Moon Cottages near Rye bay beach, pets across the cottages subject to terms | [Operator home](https://www.bluemooncottages.com.au/) and [operator FAQ](https://www.bluemooncottages.com.au/faq/). Its content record had the old Sandpiper-only pet claim; the Cottages agent is correcting that separately. |
| Mornington Peninsula Beach Club Cottages near Capel Sound bay beach, with studio/one/two-bedroom formats | [Operator site](https://mpcottages.com/). Its content record had an all-two-bedroom claim; the Cottages agent owns that correction. |
| Quarters sits behind Flinders Hotel at 23 Cook Street | [Flinders Hotel accommodation page](https://flindershotel.com.au/accommodation/). No pier frontage or exact walk time is claimed. |
| The Cape Retreat has suites and shared space; group-oriented booking, Cape Schanck outlook | [The Cape Retreat operator site](https://www.thecaperetreat.com.au/). Its marketing is group-oriented. The guide tells readers to confirm booking arrangement, room format and view; it does not promise standalone suite booking or beach frontage. |
| Point Nepean Discovery Tents are pre-pitched in the Quarantine Station precinct, seasonal September–April | [Parks Victoria tents page](https://www.parks.vic.gov.au/places-to-see/parks/point-nepean-national-park/where-to-stay/point-nepean-discovery-tents). The same page advises against swimming from park bay beaches and disallows ocean-coast swimming. |
| Sorrento Back Beach is distinct from the bay-side town | [Parks Victoria Sorrento Back Beach page](https://www.parks.vic.gov.au/places-to-see/sites/sorrento-back-beach). This is a separate outing, not the hotel's bay beach. |

**Time-bound receipt:** recheck the Hotel Sorrento works notice **by 30 November 2026**, or sooner if the operator changes its page. Update or remove the advisory once the operator's current notice no longer supports it. Do not infer a closure or claim the works affect every guest.

**Image truth:** the page intentionally uses destination photographs as contextual figures with visible captions saying that each is an area view, not a view from a listed room or tent. Property rows are text-led, avoiding the fourteen illustrative source heroes that the former generic card grid could have presented as accommodation imagery. The images are existing, in-project Peninsula Insider assets. The hero uses the PI-credited Cape Schanck boardwalk photograph already described in the published Insider Picks record; the south-coast group uses a different Cape Schanck headland image. The page does not introduce a new Visit Victoria placement.

## Static artifact inspection (before final DOM reorder)

The integrated `npm run build:search` artifact at `http://localhost:4358/stay/coastal-stays/` returned HTTP 200. Browser checks at 320×568, 390×844 and 1365×768 found no horizontal overflow or page errors. The first action was fully visible at **y=427–475** on the short phone viewport, y=469–517 at 390px and y=589–637 on desktop. Chooser and section anchors cleared the sticky chrome (144px offset on mobile, 208px on desktop). Actual Tab navigation gave the primary action and chooser links a solid 3px focus outline.

The page rendered seven intended stays, one H1 and matching visible/JSON-LD answers to all four FAQs. All seven local stay detail links returned HTTP 200. After scrolling, all five responsive destination images decoded with non-zero natural width; no local media request failed. Captions remained visibly attached. External booking-engine completion was not tested.

A mobile issue in that artifact: after selecting a coast, the large contextual image preceded the first property. The source has since been reordered to put stay rows before the image in DOM and mobile layout, retaining image-left desktop composition. **The final DOM change has not yet been rendered in an exact rebuilt artifact.**

## 23-lens diagnostic

These are **single-agent provisional diagnostic scores** for the inspected artifact, with the mobile reorder assessed in source only. They are not independent review, real-device testing, performance certification or evidence of 99/100. Scores may move after the final build.

| Lens | Provisional /100 | Evidence or remaining uncertainty |
|---|---:|---|
| First-screen promise | 93 | Primary action visible at y=427–475 on 320×568 first visit. |
| Category scope | 93 | Seven curated coastal bases; inland thermal excluded. |
| Format distinction | 90 | Hotel, cottage, group retreat and pre-pitched tent identified. |
| Booking dependencies | 85 | Operator actions present; final engine handoff not completed. |
| Factual traceability | 94 | Every new property claim tied to primary source. |
| Freshness disclosure | 87 | Provenance line and dated Hotel Sorrento notice; records have differing check dates. |
| Copy economy | 88 | Four compact choices and property-specific notes replace long generic prose. |
| Hierarchy and scanning | 90 | Chooser, four setting groups, concise rows and FAQ. |
| Wayfinding | 92 | Choice anchors, related wellness and full-stay paths. |
| Link integrity | 88 | All seven internal detail routes returned HTTP 200; external booking engines untested. |
| Mobile reflow | 86 | No overflow at 320/390; final stay-before-image source change awaits rendering. |
| 320px first visit | 88 | CTA fully visible at y=427–475 with first-visit cookie notice. |
| Desktop composition | 90 | Split hero and editorial groups inspected at 1365px. |
| Typography | 89 | Shared type tokens, bounded measures and reduced tracking. |
| Contrast | 83 | Semantic text tokens used; computed contrast pending. |
| Tap targets | 90 | Primary action measured at 48px; stay actions have 44px minimum in source. |
| Keyboard and focus | 91 | Tab navigation verified solid 3px focus outline on primary and chooser actions. |
| Semantics and headings | 92 | One H1, ordered H2/H3, labelled nav and sections. |
| State and feedback | 85 | Simple navigation with working local paths; external handoff untested. |
| Image truth | 94 | Explicit destination captions and no undisclosed property stand-ins. |
| Media and performance | 80 | All five responsive images decoded after scroll; transfer/performance not measured. |
| Motion and stability | 90 | Explicit image dimensions, no new motion dependency. |
| Newsletter fit | 88 | Newsletter component retained after practical guide. |
| **Unweighted mean** | **88.96** | **Provisional, before exact final rebuild and independent review.** |

## Checks and next action

- `impeccable detect --json next/src/pages/stay/coastal-stays.astro` returned `[]` on the final source, including the mobile DOM reorder. `git -c core.whitespace=cr-at-eol diff --check` also passed.
- The non-existent Sorrento Coastal Retreat, false Flinders pier adjacency, unsupported drive times and em-dashes are absent from the revised page.
- Root should build the final merged/rebased source, then confirm at 320×568 that choosing each setting exposes a stay rather than a photograph first. Reconfirm desktop image-left layout, all responsive images, anchors, FAQ parity, seven links and no overflow.
- Recheck Hotel Sorrento's dated operator notice by 30 November 2026. Have an independent reviewer assess the final artifact before declaring a final grade or release.
