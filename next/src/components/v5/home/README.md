# Homepage design and publication rules

The homepage helps a visitor choose a useful Peninsula outing. PRODUCT.md and the shared anchor-page typography remain authoritative. For conceptual artwork, follow docs/COASTAL-PUNCH-ILLUSTRATIONS.md, including disclosure, provenance and crop rules.

- Keep one static, credited welcome image and one h1. Do not add automatic video, rotating copy, carousels or reveal animations.
- Six sections, each said once (2026-11-10): welcome, Plan your day, This weekend, Three ways into the Peninsula, one Journal feature, the Insider Note. The welcome carries one primary action (harbour blue, the same colour and name as the planner's submit: "Find my plan") and one text link; no eyebrow.
- Plan your day is the single planning route: the optional native chooser sits directly above three plan cards in the same section, with "See all plans" in the heading row and no intro or footer copy. The selects stack full width below 48em so no value truncates. It submits to the existing Plans matcher; do not create a second planning state or fabricate results.
- Derive audience and interest choices from published usable itineraries. Retain an optional blank choice, the full catalogue, keyboard operation and use without JavaScript.
- The town diagram uses recorded coordinates, names its limitations and links to the full map. Never infer road routes, drive times or distances from the diagram.
- Weekend date eligibility and cancellations come from the shared publication model, not hardcoded homepage dates. Each pick keeps its recorded check date and organiser link on one quiet line under the card; Save and + Trip live on the event page.
- Plans and weekend events share one card anatomy: 3:2 image, title, one line, one meta line, then the photo credit as one quiet closing line; the whole card is the link. Below 64em both rows scroll sideways with a visible peek. Booking considerations and Copy plan live on the plan pages. Section "more" links sit in the heading row in one text style. A photograph appears once per page.
- Use Sora headings, Figtree copy and shared Harbour colour tokens. Cap the homepage h1 at 64px on desktop and 32px on mobile. Keep form controls at least 48px high and avoid horizontal page overflow at 320px.
- A replacement photograph must carry its own alt text, credit and applicable rights record. Never inherit the previous image's caption or imply that a contextual or generated image depicts an actual event.
- Journal imagery uses the shared rights, availability and recovery policy. A failed photograph must recover with the replacement's matching caption and credit, ending with the original editorial illustration if necessary.
- AVIF is an opt-in delivery derivative, with a native WebP source and a failed-download recovery path. Preserve the CMS original. Editor replacements must discard both the former srcset and AVIF source.
- Do not label an article or format preview as a sent email. A real issue requires a delivery receipt.
- Run the homepage acceptance journeys and full publication gates after material changes. Record all 23 rubric checks, revision, desktop/mobile evidence and limitations. A Lighthouse score is not the page-quality score; automated checks do not certify spoken assistive-technology use or independent review.

Validation: `npm run build:search`, `npm run test:discovery-journeys`, and `npm run test:journeys` from `next/`. The homepage suite checks first visits, native matching, use without scripts, Journal recovery, AVIF recovery and newsletter error/retry fixtures. Public acceptance must match the deployed revision.
