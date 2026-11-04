# Image descriptions, alt text and attribution

For each new or changed image, an editor views the actual image and records `imageKind` (`photograph` or `illustration`), `depictionStatus`, a short caption, useful alt text and the existing credit/rights fields. Never derive identity from a filename, the article title, a generation prompt or a credit. If the subject is unknown, keep `unverified` and send it for editorial review; do not publish a guess.

Captions describe what a reader sees, normally one short sentence: “Coffee and a croissant by the bay.” The adjacent credit makes the medium clear: “Illustration: Peninsula Insider.” Do not add “This image shows”, “Conceptual oversized”, or a second badge and disclaimer repeating the caption. Illustrations must not claim to show a named cafe, its menu or a specific event. A photograph of another place uses “Context photograph: [verified subject]”. Keep essential warnings such as a map being non-navigational, historic dates, adaptations and licence conditions.

Alt text describes visual information needed to understand the image. Preserve meaningful detail and do not replace it with the caption or article title. Explicitly decorative images retain empty alt text. Credits, licences, source links and rights history remain separate from descriptive prose and stay attached to the correct image.

## One rendering path

String-only CMS captions retain medium, context and navigational qualifiers because these rows do not establish image kind or depiction status. Only metadata-aware rendering removes a redundant illustration prefix when the adjacent credit visibly says “Illustration”. Unknown-kind CMS credits use “Credit”, preserving explicit photo/illustration and licence-required attribution wording. Itinerary cards and plan detail pages use this same credit formatter.

`next/src/lib/image-presentation.mjs` provides `imageCaption` and caption-only normalisation. Journal images, including recovery choices, use it once; they do not also render a provenance badge. Shared provenance notes use the same description for contextual images on other detail/card surfaces. CMS read boundaries normalise display captions without rewriting stored source metadata. Image kind is explicit or established by a reviewed illustration credit, never inferred merely from a generated directory or an SVG extension. Existing raw provenance fields and generation history remain in the source record.

## Admission and ongoing maintenance

`npm run lint:image-captions` runs regression tests, validates changed image records against the comparison base, and writes `next/reports/image-caption-review.json` for unresolved legacy metadata. The same gate runs in `npm run build` and `npm run validate:content`. `npm run assert:image-captions` checks built reader figures for duplicate descriptions and machine-like boilerplate after Astro builds. Set `PI_CAPTION_BASE` to the reviewed base commit when importing a batch or checking a whole PR. PR CI uses the event’s base commit SHA; local/release runs default to `HEAD^`. The comparison commit must be available. A missing comparison is an error, not silent approval.

New or edited image records fail admission if image kind, depiction status, description, alt or attribution is missing; unverified identity and boilerplate also fail. An unrelated text edit does not retroactively certify an unchanged legacy image. The full review inventory includes these older gaps so editors can address them in batches after viewing each asset. This is a metadata and wording gate, not automated proof of identity, permission or visual quality; the existing rights gates remain required.

All importers and image-generation tasks must supply these fields before running admission. In particular, the event-source adapters, Visit Victoria page-image sync and image-intelligence pilot must preserve factual identity, credits and licences; generated candidates remain unapproved until viewed. Their existing review/admission flow owns approval. This task introduces no scheduled publisher or new service. For a new renderer, add a regression case and use the shared caption formatter rather than constructing disclaimer prose in the template.

## Review checklist

The built gate checks duplicate descriptions within figures and known standalone caption paragraphs (`event-image-credit`, `pi-card__image-note`, `itinerary-card__photo-credit`, `itinerary-detail__image-credit`) for boilerplate. It excludes scripts, styles and metadata. Arbitrary future caption classes and live CMS updates still need source regression coverage and editorial/browser review; this gate is not proof of universal live CMS coverage.

View desktop and phone output, including image failure/recovery and client navigation. Check that one image has one description, attribution is readable and present, captions do not overlap artwork, alt text survives, and contextual imagery cannot be mistaken for evidence of a named business/event. Run the existing image-rights and content checks as well as the caption gate. Publication follows the existing human approval process.
