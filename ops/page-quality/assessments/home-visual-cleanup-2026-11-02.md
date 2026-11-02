# Homepage visual cleanup review candidate

Base revision: `d0d65d4347e9e8ea3bc6d1ac14f8e26d87ff79df`. Branch: `codex/home-visual-cleanup-20261102`.
Local assessment: 2 November 2026, 1440px and 390px screenshots; browser layout checks also cover 320px and 768px. This is a draft review candidate, not a live deployment or a certified 99/100 score.

## Implemented scope

- Original illustrations have no visible disclosure badges, captions or illustration credit sentences. Shared cards, journal recovery, event credits, category heroes, mobile hero copy and planning guide heroes follow the rule. Accessible descriptions and original content rights records remain. Context photographs keep truthful subject notes and required photographer/licence attribution.
- Three original, repository-authored Coastal Punch SVG scenes: sailboat morning, parasol afternoon, lighthouse evening. IANA `Australia/Melbourne` selects 06:00, 12:00 and 18:00 boundaries, with evening overnight. No external scheduler. Motion has pause/resume and OS reduced-motion support. Without JavaScript, morning remains static. A valid CMS photograph replacement retains its own accessible description and credit.
- Mornington, Red Hill and Sorrento each have one native SVG link covering both marker and name, matching the adjacent verified route. Focus is visible and hit rectangles exceed 44 CSS pixels even at 320px. The Geoscience Australia CC BY 4.0 credit remains.
- Compact homepage weekend grid supports up to six eligible picks with the existing publication/date/cancellation model. Current content yields two; no invented filler. Today, Tomorrow, Next weekend and All events use existing discovery URLs. Source checks, dates, organiser links, Save and Trip remain.
- Closed prize promotion removed from shared game configuration and all consuming site promotions. The game stays enabled, with its case URLs and neutral invitation. No entrant records, draw result, historical terms or unrelated Jackalope editorial coverage changed. The separately hosted game and its terms are outside this repository; this change does not certify their current entry UI or invent a result.

## Original vector provenance

`next/src/components/v5/home/HomeCoastalArt.astro` contains original authored SVG geometry and CSS, created for this request on 2 November 2026. Rights holder: Peninsula Insider. Website use authorised by James's request. No stock image, paid generation, dependency, embedded lettering or precise geographic claim. The background is decorative and excluded from the accessibility tree; the page offer and actions remain semantic HTML. Existing source images and their provenance are retained for rollback.

## Evidence and validation

- Full `npm run build:search` includes source, rights, reader-boundary, SEO, link, schema, event, responsive-image and publication gates.
- Builds use the repository-supported `PI_SKIP_CMS_LIVE_READS=1` checked-in snapshot mode. They do not certify live CMS changes made after the snapshot.
- Final focused unit/source run: 58 passed. Final discovery browser suite: 61 passed. Final general journey suite: 89 passed.
- Time tests cover summer/winter boundaries, midnight, and both DST transition days. Eligibility tests cover zero, one, two and eight available fixtures capped at six, excluding expired content.
- Browser checks cover first-visit actions, native/no-script chooser, fallback imagery, newsletter recovery, pause/resume, reduced motion, no-script art, town link targets, native Tab focus, marker/name activation, touch rectangles, source dates and organiser links.
- `scripts/audit-visual-copy.mjs` scans rendered text rather than alt attributes, JSON or script strings. A campaign production brief's discussion of an illustration is an explicit non-disclosure match and is retained.
- Before/after captures are in the task's `review-assets` directory. Reproduce section captures with `node scripts/visual-review-local.mjs` after a build. Preview captures omit the cookie note for comparison; the first-screen captures retain navigation chrome. Separate first-visit tests retain the visible cookie note. Section captures hide fixed chrome to avoid screenshot overlap. Desktop hero height remains 537.83px and mobile 470.55px, matching the baseline captures.

Library previews:

- Morning: `libfile_7be1aa54d5c4819181e649a97f1ec64f`
- Afternoon: `libfile_4ef4f4b5c8b08191bcce531084a5e8c9`
- Evening: `libfile_c5e264d4e9948191b6fa47ac8a523ebe`
- Mobile first screen: `libfile_7b9fa4cf202c81919f02fb748f3f93a2`
- Weekend before: `libfile_6e09171cb7948191a046a77a95564774`
- Weekend after desktop: `libfile_5d5a3ba0b1e8819188023f593855152b`
- Weekend after mobile: `libfile_ac4c44507a6c8191a1f9938183d3e1d0`
- Mobile town map: `libfile_c1a14b6e1e5c8191bce050652f87105a`

## Rubric coverage, provisional

No numeric quality score is claimed. These are implementation observations for the independent reviewers, not independent scorecards.

| ID | Observation or remaining assessment |
| --- | --- |
| VT1 | Existing outing/visitor intent retained; no new audience assumptions. |
| VT2 | Same headline, promise and three primary discovery actions; first-visit checks pass. |
| VT3 | Same chooser and plans; compact weekend dates and locations remain. |
| VT4 | Chooser, town labels/markers, event links and game navigation exercised. |
| FN1 | Single h1 retained; compact card titles use the existing Sora hierarchy. |
| FN2 | Map destinations match adjacent links; view-all and date shortcuts remain clear. |
| FN3 | Existing discovery URLs and filtering model retained. |
| ET1 | Only illustration disclosure and closed-prize copy removed; event reasons retained. |
| ET2 | Existing local editorial picks and reasons retained without filler. |
| ET3 | Shared event eligibility and source-check dates retained; no new factual claims. |
| ET4 | Photographer/map credits and organiser links retained; no entrant/result claims. |
| VS1 | Original vector rights recorded; source imagery and third-party credits preserved. |
| VS2 | Desktop/mobile captures inspected; mobile artwork crop and compact type refined once. Independent aesthetic review pending. |
| VS3 | Existing Sora/Figtree retained; compact title 18px, description 15px and metadata 13px. |
| VS4 | Navy text protection behind white hero text, existing Harbour links and focus colours retained. No full contrast audit certification claimed. |
| VS5 | Existing components, controls and Coastal Punch palette retained. |
| MI1 | No horizontal overflow at 320/390/768/1440; town hit areas tested at least 44px. |
| MI2 | Pause/resume state, reduced-motion response, Save and Trip controls retained. |
| MI3 | Existing chooser/no-script and newsletter recovery browser checks retained. |
| AT1 | Native keyboard focus and activation tested; spoken assistive-technology assessment pending. |
| AT2 | No added dependencies, image requests or video; SVG is about 4KB. No independent field-performance measurement claimed. |
| AT3 | Static no-script fallback, OS motion preference and pause/resume tested; control positioned without growing hero layout. |
| AT4 | Semantic links/list/headings retained; canonical/SEO/link gates run. |

## Release status

Draft PR only. Do not merge or deploy on prior event-work approval. T1 independent scorecards required by `ops/page-quality/rubric-v1.md`, spoken assistive-technology assessment and James's explicit approval remain pending. A numeric 99/100 score or live status must not be inferred from automated checks.
