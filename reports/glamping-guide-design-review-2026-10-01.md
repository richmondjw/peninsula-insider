# Glamping guide: choose the format before the booking

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Adapt the glamping guide into a sourced, decision-first comparison; hold publication for the coordinated release and independent review.
**Review date:** 1 October 2026

## Baseline, hypothesis and grade

The public guide begins with four long paragraphs. At 320 px, its first venue list starts about **1,769 px** below the top; at 1365 px it starts about **1,195 px** down. It presents unsupported 5am bathing access and claims Iluka is exclusively for groups, while the seven-card list treats Eco Lodges and caravans as glamping. The venue cards also inherit stale, unreviewed claims from individual records. The hypothesis is that explicit accommodation formats and a booking check beside each option will improve selection and reduce incorrect assumptions.

The following **single-author, provisional** 23-layer grade compares the public page captured on 1 October with the local revised preview. It is a design judgement, not a visitor outcome or an independent certification. Public baseline: **1,412/2,300 (61.39%)**. Local revised preview: **2,127/2,300 (92.48%)**. The requested 99% has not been reached.

| Criterion (100 each) | Public baseline | Local author review |
| --- | ---: | ---: |
| First-fold promise | 45 | 91 |
| Category scope | 47 | 95 |
| Format differentiation | 42 | 96 |
| Booking dependencies | 38 | 93 |
| Factual traceability | 40 | 94 |
| Freshness disclosure | 35 | 91 |
| Copy economy | 44 | 90 |
| Hierarchy and scanning | 55 | 93 |
| Wayfinding | 43 | 92 |
| Link integrity | 75 | 94 |
| Mobile reflow | 77 | 94 |
| 320 px first visit | 50 | 91 |
| Desktop composition | 70 | 92 |
| Typography | 76 | 93 |
| Contrast | 90 | 95 |
| Tap targets | 70 | 94 |
| Keyboard and focus | 75 | 94 |
| Semantics and headings | 72 | 95 |
| State and feedback | 82 | 84 |
| Image truth | 40 | 97 |
| Media and performance | 80 | 96 |
| Motion and stability | 88 | 95 |
| Newsletter fit | 78 | 78 |

The baseline and local grade use the same criteria, but remain subjective. Scores for interaction states, accessibility and performance are capped because no assistive-technology session, field data or final production build has been reviewed.

## What changed

- Replaced the long opening with a short editorial promise, a comparison action and a visible four-format navigation panel.
- Compared actual on-site glamping at Peninsula Hot Springs, Iluka's rural bell tents, Happy Glamper's mobile tents and Point Nepean's **pre-pitched park camping**, explicitly described as a simpler adjacent format.
- Put the practical reservation question beside each stay. In particular, Happy Glamper normally approves the tent request before the guest books a separate campsite; Point Nepean requires guests to bring bedding and supplies.
- Removed the unsupported 5am access, exclusivity, fixed guest-age and value claims. Separate Eco Lodges, Alba Sanctuary and retro caravans from canvas stays.
- Removed the seven venue cards from this guide because several linked venue records still contain unverified price, rating, time or exclusivity language. The revised page links to the operators' current information and to the separately verified Peninsula Hot Springs stay notes.
- Used a type-led hero without a photograph. The available local assets show bathing, lodge rooms or nearby places rather than these glamping tents, so a hero image would have risked a false depiction.

## Source and visual evidence

- [Peninsula Hot Springs glamping](https://www.peninsulahotsprings.com/accommodation/glamping) lists garden-view, lake-view and secluded pavilion packages and says its glamping packages include site bathing. Age restrictions and optional extras vary by package.
- [Iluka glamping](https://ilukaretreat.com.au/accommodation/glamping/) offers bell tents for couples and families, with unpowered tents and shared powered kitchen and bathrooms. Its [home page](https://ilukaretreat.com.au/) also describes group use, but does not make the tent stay group-only.
- [Happy Glamper FAQs](https://www.happyglamper.com.au/faqs-1) explain its request approval, usual separate campsite booking and Balnarring Deluxe exception; the [home page](https://www.happyglamper.com.au/) confirms mobile setup and packdown.
- [Parks Victoria Discovery Tents](https://www.parks.vic.gov.au/places-to-see/parks/point-nepean-national-park/where-to-stay/point-nepean-discovery-tents) confirms the September to April season, two- and four-person pre-pitched tents, shared facilities, bring-your-own list and accessible tent enquiry.
- [Peninsula Hot Springs Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges) is a separate enclosed-room offering. [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/) offers villas and rooms with a different thermal operator.

## Local verification and limits

A local Astro preview returned HTTP 200. At **320 × 568**, the primary comparison action measured about **178 × 44 px** at x16, y503, wholly within the first screen even with the first-visit privacy note. At **390 × 900**, it began y509. At **1365 × 900**, it began y605. No horizontal overflow appeared at 320, 390 or 1365 px. The action reached `#compare-glamping`; its heading landed at y148 on a 320 px phone and y246 on desktop, clear of the sticky header. The four operator destinations and two internal routes are explicit anchors in the source. The first dev-server capture briefly saw an Astro module refresh error while content was syncing; the next complete capture had no page errors at all three widths.

The Impeccable detector returned **zero findings** on the final page. The house-style and no-pricing checks passed, and `git diff --check` found no whitespace errors. The static page uses no new media, scripts, fonts or dependencies. The revised result has not yet been independently reviewed in a final integrated build, on an assistive-technology setup, or on the public site.

## Open work and decision

The venue records for Iluka, Happy Glamper, Yurt Hideaway, Point Nepean and Kanasta still need a separate fact and taxonomy pass. This page avoids rendering their unreviewed card copy; it does not silently correct those records. Eco Lodges are currently typed as `glamping` in the content schema, so a wider taxonomy fix is still needed.

By **8 October 2026**, review onward clicks, corrections, mobile Core Web Vitals and at least one independent reader task. Revert the bounded page file to its prior revision if factual or navigation regressions appear. Do not claim a 99% result without independent review and live visitor evidence.
