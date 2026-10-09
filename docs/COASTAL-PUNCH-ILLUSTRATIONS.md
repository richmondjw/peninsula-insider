# Coastal Punch illustration language

Approved by James for website rollout on 9 October 2026. Keep the existing site structure, typography, navigation and factual venue photography.

## Palette and form

Deep navy `#102D42`, sea teal `#008F9C`, warm ivory `#FFF4DC`, coral `#F36B4F`, sunshine yellow `#F3C969`. Use broad areas of ivory and teal, navy for graphic shadows, and coral/yellow as concentrated accents. One dominant silhouette; gently exaggerated objects; sweeping shadows; elliptical eucalyptus leaves; broad stripes and scalloped canopies. Simplify rather than add texture or small detail. No embedded lettering or logos.

Create each artwork separately for its placement. Card and article masters are 3:2, with the main subject safe within a central 16:9 crop. Homepage art has its own wide composition and mobile crop. Supply alt text, conceptual captions and recorded rights metadata. Never imply an invented scene is a photograph of the named venue, event or road.

## Scoring rubric (100 points)

| Criterion | Points | Acceptance question |
| --- | ---: | --- |
| Recognition | 20 | Does it read as Peninsula Insider without a logo? |
| Simplification | 20 | Is the main idea legible at thumbnail size, with incidental detail removed? |
| Distinctive exaggeration | 15 | Does a memorable silhouette create emphasis without becoming surreal? |
| Fresh palette | 15 | Are ivory/teal airy, with controlled coral/yellow punch and strong navy contrast? |
| Placement and crop | 15 | Does the artwork work in its actual desktop/mobile dimensions? |
| Subject and locality honesty | 10 | Does it match the topic without inventing venue details or geography? |
| Production readiness | 5 | Are optimized media, alt text, credit, rights and social formats complete? |

Target: 99/100. A target is not an achieved score. Automated tests cannot certify aesthetic quality. These first approved wider-rollout illustrations retain some shaded surfaces and landscape detail; simplification remains the main improvement for future iterations. Factual, rights, crop or accessibility failures block release irrespective of score.

## Reusable generation direction

Create ONE standalone editorial illustration in the Coastal Punch house style for [subject], with [placement/aspect ratio]. Use only the five palette colours above. Strong simplified graphic shapes, one gently exaggerated hero object, bold navy shadows, airy ivory space and concentrated coral/yellow accents. No photorealism, lettering, logos, fine texture or ornamental detail. Maintain a central crop-safe subject. The scene is conceptual, not a representation of a specific venue or precise geographic location. Do not generate a collage.

## Provenance and scope

Seven independent AI-assisted originals: gin botanicals, yoga equipment, market produce, wrestling ring, breakfast, weekend planning and first visit. Original PNG masters remain in the Codex generated-image directory; optimized website WebP assets and the source inventory are recorded in `reports/coastal-punch-wide-assets-2026-10-09.json`.

The card fallback, shared event placeholder and What's On social graphic use authored SVG geometry and separately typeset text. They decorate existing media slots without simulating missing venue photographs. Keep the original artwork available for rollback. Content dates, cancellation states and editorial wording are unchanged.

## Production rules for every future image task

1. Start from the approved house language and an existing reference asset. Keep one dominant silhouette and a small number of large shapes. Remove incidental detail before increasing exaggeration. Avoid tropical resort imagery, decorative noise and photorealism.
2. Create separate generations for separate placements. Define aspect ratio, subject position, desktop/mobile crop and any overlay text area in the brief. Never supply a collage as individual production assets.
3. Keep lettering, logos, titles and buttons out of generated pixels. Typeset them separately with the existing site fonts and controls. Overlay colour or contrast adjustments may be scoped to the artwork; structural redesign requires its own scope.
4. Retain real photographs of named venues, accommodation, wineries, exhibitions and places. Use illustrations for conceptual editorial subjects, approved heroes and honest fallback media. A collection's `illustrative` metadata alone is not a reason to replace a context photograph.
5. Record meaningful alt text, conceptual caption and a public illustration credit, such as “Illustration: Peninsula Insider”. Keep generation provenance, creator, rights and permission metadata in the internal record. Preserve article facts, dates, prices, event states and cancellation warnings when replacing images.
6. Preserve the original master and an asset/prompt inventory; publish optimized WebP and responsive derivatives. For authored vector graphics, use SVG and render social previews with the actual site fonts.
7. Size responsive images for the full `object-fit: cover` crop, including height and device pixel ratio, rather than the visible column width alone. A 510 by 680 pixel frame using a 3:2 master needs about 1020 source pixels in width at DPR 1; the planning hero therefore requests a 1200px candidate. Never stretch a small derivative into a tall hero.
8. Score each candidate against the rubric and record deductions. Aim for 99/100 through iteration; do not invent a score or treat automated checks as aesthetic approval. A saved approval for one concept does not silently authorize a new site layout.
9. Verify the actual pages at desktop and 390px mobile widths, plus a high-density phone image check. Check loading, crop, text contrast, button readability, overflow, credits and CMS hydration. Complete applicable build/content/rights/reader-boundary checks. After an authorized release, confirm the public deployment SHA and the actual selected images before saying the work is live.

## Approved reference set

- Welcome hero: `next/public/images/generated/coastal-punch-hero.webp`.
- Market compositions: `coastal-punch-crib.webp`, `coastal-punch-mornington.webp` and `coastal-punch-produce.webp` in the same directory.
- Conceptual objects: `coastal-punch-gin.webp`, `coastal-punch-yoga.webp`, `coastal-punch-wrestling.webp` and `coastal-punch-breakfast.webp`.
- Planning and travel: `coastal-punch-planning.webp` and `coastal-punch-first-visit.webp`.

The first set is an approved direction, not a requirement to reproduce every shaded surface or landscape detail. Future generations should strengthen simplification and silhouette recognition while keeping this palette and visual family.
