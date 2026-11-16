# Where to Stay guide: thermal and paused venue correction

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Maintain the shadowed MDX stay-guide source with corrected hot springs and glamping facts while preserving its older whole-guide verification date. Its legacy public URLs redirect to the canonical stay guide, which is being revised separately.
**Review date:** 1 October 2026

## Baseline and hypothesis

The shadowed MDX guide's structured FAQ and body said Peninsula Hot Springs had exactly ten tents and three Eco Lodges, treated all their room amenities as identical, described Alba Sanctuary as adults-only with a fixed minimum age, and claimed a complimentary Peppers shuttle. It promoted Yurt Hideaway despite the operator's current booking route failing and the venue record being paused. Several paragraphs also classified stays by implied price despite the Peninsula Insider no-price rule. The hypothesis was that splitting tents from enclosed lodge rooms, naming the current inclusion check, and withdrawing the uncertain stay would make the planning advice more trustworthy.

## Corrected passages

- The structured and visible hot-springs FAQs now distinguish Peninsula Hot Springs glamping from Eco Lodge rooms in shared lodges. They omit unsupported inventory counts, fixed drive times and the unverified shuttle. Both direct readers to check the exact room, bathing and guest terms before booking.
- The body now gives glamping and Eco Lodges separate entries under **Glamping and thermal lodge stays**. It names the operator's currently published Garden View, Lake View and Secluded Pavilion tent choices. For lodges, it separates the Springs Room's in-room hot spring bath from the Peninsula Suite's outdoor private hot spring. It presents site bathing and breakfast as current package inclusions, subject to the selected booking.
- The Alba paragraph and FAQ distinguish five villas from two premium rooms. They mention geothermal bathing each day and breakfast, with one private-pool upgrade in villa inclusions rather than a pool at every unit. The blanket adults-only claim is removed. Alba says its general springs welcome children with supervision, while private springs and spa experiences have distinct age conditions; Sanctuary occupancy must be confirmed for the actual room.
- Yurt Hideaway is no longer presented as a current stay choice. A short transparent note links to its paused detail record. This avoids quietly erasing the earlier recommendation while the booking state remains uncertain.
- The article's price-positioning phrases and a speculative weekend minimum were removed. No new prices or fixed drive times were added. The older `lastVerified` value remains **22 April 2026** because this was a bounded source correction, not a full recheck of the entire guide. A note in the MDX source dates this scoped correction; that note is not visitor-visible while the redirects remain.

## Primary source record

- [Peninsula Hot Springs glamping](https://www.peninsulahotsprings.com/accommodation/glamping) and [Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges), crawled 1 October 2026: separate accommodation categories, current room names, site bathing and package inclusions. Published packages can change.
- [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/), [villas](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/), [rooms](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/rooms/) and [Alba FAQs](https://albathermalsprings.com.au/faqs/), crawled in the preceding five days: five villas, two rooms, bathing/breakfast, one private-pool upgrade for villas and age rules for the different Alba experiences. The FAQ allows supervised children in general springs and lists room occupancy subject to arrangements, so it does not support a blanket 18+ accommodation claim.
- [Jackalope terms](https://jackalopehotels.com/terms-conditions/), crawled 1 October 2026: guests aged 12 and over. This supports the retained age distinction in the family FAQ.
- The Yurt Hideaway status and direct HTTP receipts are in [the companion review](./yurt-hideaway-verification-2026-10-01.md). No working booking route was verified on 1 October.
- Current [Moonah Links accommodation](https://www.moonahlinks.com.au/cms/hotel/accommodation-and-packages/) and [resort overview](https://www.moonahlinks.com.au/cms/moonah-links-3/) did not support the article's complimentary shuttle claim, so it was removed.

## Expert lenses and verification limits

| Applicable lens | Before | Candidate |
| --- | --- | --- |
| Option differentiation | Glamping tents and Eco Lodges collapsed into one amenity list | Separate format, room and bathing decisions |
| Booking readiness | Fixed inclusions and speculative shuttle/minimum | Current operator links and check-before-booking language |
| Guest-rule accuracy | Alba presented as 18+ throughout | Distinguishes general springs, private bathing, spa and accommodation |
| Freshness transparency | Old MDX date applied without scope | Older whole-guide date retained; bounded source correction dated, with no claim of a live-page update |
| Link and recommendation integrity | Paused Yurt appeared as a current choice | Explicit paused note, no active Yurt recommendation |
| House style | Price-positioning phrases | No price or rate language remains in this article |

No 23-layer visual percentage is assigned. The integrated build shows both `/journal/where-to-stay-mornington-peninsula/` and `/stay/where-to-stay-mornington-peninsula/` are redirect stubs to `/stay/best-accommodation/`. The revised MDX is therefore source maintenance only and does not alter the visitor-facing guide or prove a better reader task result. The canonical page is being revised separately by the Set 6 taxonomy owner.

The scoped diff check passed after a trailing-space repair. Focused content validation, house style and no-pricing checks passed after both the Yurt record and article edits. The release owner still needs final link gates and a fresh verification of the canonical guide after its separate revision. Other Jackalope, hotel, vineyard and family stay details in this long guide have not been reverified in this set. Some may be stale, so this correction should not be described as a complete article re-verification.

## Evaluation and rollback

By **8 October 2026**, confirm the canonical stay guide and operator click paths after that page's revision, then inspect mobile readability and current guest rules. Revert only this bounded MDX source copy if it creates a future factual or navigation regression; retain the Yurt pause until a live booking route and host confirmation exist. A separate set should complete a source-by-source refresh of the rest of this 2026-04-22 MDX before any direct publication.
