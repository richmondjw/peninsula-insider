# Stay Set8 scouting — 1 October 2026

**Decision:** improve **Cottages + Coastal Stays** next, then **Boutique Hotels + Wellness Stays**. This scout changed no Set8 source, commit or release state.

## Evidence and limits

Reviewed the four Astro guides, venue JSON, VenueCard and Stay-hub teasers; checked current operator pages linked below. Inspected complete static HTML on local port 4357 at 320 × 768 and 1365 × 768 with screenshots, element positions and overflow checks. That artifact predates a late Set7 Cottages text correction. **Current source already removes the historical Villa Mallorca host recommendation and blanket B&B breakfast/room-count claim.** No horizontal overflow appeared. Impeccable's rendered detector found recurring small functional text and edge-padding issues in shared UI; those merit separate design-system work.

These 23-lens grades are **single-reviewer provisional diagnostic ranges**, not independent scores, user research, accessibility certification or evidence of 99/100. Keyboard/focus, media performance and completed booking paths require direct testing.

| Lens | Boutique | Coastal | Cottages | Wellness |
|---|---:|---:|---:|---:|
| First-screen promise | 45–60 | 40–55 | 35–50 | 55–70 |
| Category scope | 62–75 | 30–48 | 20–40 | 75–88 |
| Format distinction | 40–60 | 40–60 | 20–40 | 80–92 |
| Booking dependencies | 55–70 | 40–60 | 25–45 | 80–92 |
| Factual traceability | 50–65 | 30–50 | 20–40 | 75–88 |
| Freshness disclosure | 40–60 | 35–50 | 30–45 | 80–90 |
| Copy economy | 75–85 | 40–55 | 35–50 | 70–82 |
| Hierarchy and scanning | 55–70 | 45–58 | 40–55 | 72–85 |
| Wayfinding | 50–65 | 45–62 | 40–55 | 70–85 |
| Link integrity | 80–90 | 60–75 | 45–65 | 75–90 |
| Mobile reflow | 70–83 | 65–80 | 65–80 | 70–85 |
| 320px first visit | 35–50 | 25–42 | 20–38 | 45–60 |
| Desktop composition | 50–65 | 45–60 | 45–60 | 60–75 |
| Typography | 75–85 | 75–85 | 75–85 | 75–85 |
| Contrast | 80–90 | 80–90 | 80–90 | 80–90 |
| Tap targets | 65–80 | 65–80 | 65–80 | 65–80 |
| Keyboard and focus | 65–80 | 65–80 | 65–80 | 65–80 |
| Semantics and headings | 75–88 | 70–82 | 65–80 | 75–88 |
| State and feedback | 65–80 | 65–80 | 65–80 | 65–80 |
| Image truth | 70–85 | 25–45 | 15–35 | 50–70 |
| Media and performance | 65–80 | 60–75 | 60–75 | 65–80 |
| Motion and stability | 80–90 | 80–90 | 80–90 | 80–90 |
| Newsletter fit | 75–85 | 75–85 | 75–85 | 75–85 |
| **Unweighted diagnostic mean** | **62–76** | **52–67** | **47–63** | **70–83** |

## Priority findings

### Cottages — format and booking truth

The current opening still treats dog access, wood fire, kitchen and fenced garden as universal cottage features, says both formats outperform a hotel, and asserts a high repeat-visitor share without evidence. The Set7 source patch has already removed the Villa Mallorca host and blanket breakfast/room-count claims; avoid duplicate work.

[Plantation House](https://plantationhouse.com.au/) calls itself a B&B but advertises five named rooms/suites while its venue record is typed cottage. [Arthurs Views](https://arthursviews.com.au/contact-us/faq/) says it has five suites and optional breakfast while its record is also typed cottage. Distinguish room format from hosted service. The MP Beach Club record says five two-bedroom cottages in Rye, whereas [the operator](https://mpcottages.com/) lists studio, one-bedroom and two-bedroom units near Capel Sound beach. The Blue Moon record singles out Sandpiper as dog friendly, whereas [the operator FAQ](https://www.bluemooncottages.com.au/faq/) says all its cottages accept pets with secure outdoor areas.

Three currently recommended records (Orchard, Driftaway, Hideaways) lack a source booking URL. This proves missing direct booking paths in our data, **not** operator closure. Eleven selected, listable source JSON heroes are marked illustrative; shared guide cards show no visible disclosure. CMS overrides can change the rendered image, so verify actual provenance before changing captions.

On the inspected prior artifact at 320px, H1 ended near y=418, the first article action (an unrelated dog-friendly guide) appeared near **y=1,923**, and the first venue image near **y=1,971**. The final Set7 correction will reduce those positions somewhat, but the opening still postpones the cottage-versus-suite decision.

### Coastal Stays — category promise and images

The guide includes every active non-spa stay in three broad zones: **18 records** in source, including inland Fingal thermal accommodation. The Stay-hub teaser promises “Bases within earshot of the water, Sorrento to Flinders.” Neither the filter nor teaser reliably expresses beach access. Separate bay-village, ocean-beach and inland thermal intents.

The article recommends **Sorrento Coastal Retreat**, yet there is no matching venue record/detail route. It calls Flinders Hotel directly opposite the pier, while [Flinders Hotel](https://flindershotel.com.au/accommodation/) places Quarters behind the hotel at 23 Cook Street; the pier relationship and exact FAQ drive times need verification or removal. Keep visible FAQ and JSON-LD in parity. Fourteen of the 18 eligible source JSON hero images are marked illustrative, but guide cards do not show that status; inspect CMS overrides and use actual rights-recorded property imagery or visible destination-context captions.

At 320px, the inspected first guide action was a Sorrento link near **y=1,708**, and the first venue image near **y=1,757**.

### Boutique Hotels — choice architecture

Five cards have useful detail paths and mostly actual property imagery, but “worth prioritising” lacks stated selection criteria or a comparison of village hotel, vineyard estate and design hotel. An inline Flinders detail link appears near **y=621** at 320px; the first card is near **y=1,096**. Add a compact style/location chooser and first-screen action. The Stay hub has no direct teaser. Recheck operator room and dining status before fresh property claims.

### Wellness Stays — surface package dependency

This is the soundest grouping: on-site bathing, hotel treatments, off-site bathing package and separate hotel base are distinguished. [Peninsula Hot Springs](https://www.peninsulahotsprings.com/accommodation/stay-local/flinders-hotel-stay-and-bathe) confirms Quarters at Flinders Hotel's package includes Bath House bathing. Put the official package path beside that off-site option and add an early “on-site, package, or separate base” jump. The day-spa diversion was the first article action near **y=907** at 320px; first venue image near **y=1,320**. Two of six source heroes are marked illustrative. The Stay hub has no direct teaser. Keep changeable inclusions and blackout terms out of evergreen copy unless continuously verified.

## Next bounded sets

**Set8A — Cottages + Coastal.** Own those two guides, directly affected venue records, the Coastal Stay-hub teaser, and only image disclosure changes whose effect across existing guide cards can be verified. Preserve URLs, canonicals and browse-all routes. Reconcile operator inventory and booking paths; remove unsupported rankings, amenities, repeat-visitor and proximity claims; present concise visitor choices and an actionable jump inside a **320 × 568 first screen**. Use truthful captioned images. Verify visible and structured FAQs, selected venue inventory, rights/provenance, links, exact static build and 320/1365 rendering. Acceptance: no unsupported claim, undisclosed illustrative property image or dead recommendation; every selected stay has a clear book-or-check-current path.

**Set8B — Boutique + Wellness.** Add format/package comparisons and early actions; then add relevant Stay-hub teasers. Preserve Wellness's correct on-site/off-site distinctions. Verify operator links, image provenance, keyboard/focus behaviour and 320/1365 rendering. Regrade through independent review and direct booking-path checks; this scout cannot self-certify 99.
