/**
 * media-provenance.ts - the one place that decides what an image claims.
 *
 * Evidence item A28 found named venues illustrated with representative
 * third-party photographs and no disclosure a sighted reader could see. The
 * alt text was accurate; 153 image records across the corpus already say
 * "representative image for <Name>" in their alt attribute. That is not the
 * fix. Alt text serves screen-reader users. A reader looking at a photograph
 * of somewhere else, captioned nothing, is being misled regardless of what
 * the alt attribute says.
 *
 * So the claim moves out of prose and into a field: `depictionStatus` on
 * imageRef (src/content.config.ts). This module is the only reader of it, and
 * it enforces one rule everywhere:
 *
 *   an unrecorded image is never an actual depiction.
 *
 * Absent, malformed, or `unverified` all collapse to "nobody has said". Only
 * the literal string `actual` asserts the photograph shows the entity, and
 * only the literal string `illustrative` renders the visible disclosure. The
 * safe direction is the default direction: getting this wrong by omission
 * produces silence, not a false claim.
 *
 * Evidence item A29 is the companion discipline: credits and source filenames
 * do not establish a licence. Nothing here infers a rights holder, a licence
 * or a permitted use from a credit string, a filename, or an alt attribute.
 * `hasRecordedProvenance` asks only whether the record itself says.
 */

export type DepictionStatus = 'actual' | 'illustrative' | 'unverified';

/**
 * The shape this module needs. Deliberately structural rather than an import
 * of the zod-inferred collection type: the same helpers run against parsed
 * content entries, against raw JSON in the audit script, and against CMS
 * override payloads, and those three do not share a nominal type.
 */
export interface ProvenanceImage {
  src?: string;
  alt?: string;
  credit?: string;
  license?: string;
  caption?: string;
  depicts?: string;
  depictionStatus?: string;
  creator?: string;
  sourceUrl?: string;
  permission?: string;
  permittedUses?: string[];
  provenanceReview?: string;
  rightsHolder?: string;
  rightsEstablishedOn?: string;
  rightsStatus?: string;
  decorative?: boolean;
}

export type RightsState = 'unrecorded' | 'unknown' | 'recorded';

const KNOWN_RIGHTS: ReadonlySet<string> = new Set<RightsState>([
  'unrecorded',
  'unknown',
  'recorded',
]);

/**
 * How far the rights record has got.
 *
 * Whitelisted the same way as `depictionStatusOf`, and for the same reason: a
 * typo must degrade to the weakest state, never to `recorded`. An unknown
 * string is not evidence of anything.
 */
export function rightsStateOf(image: ProvenanceImage | null | undefined): RightsState {
  const raw = typeof image?.rightsStatus === 'string' ? image.rightsStatus.trim() : '';
  return KNOWN_RIGHTS.has(raw) ? (raw as RightsState) : 'unrecorded';
}

/**
 * Is this image purely decorative?
 *
 * True only on an explicit boolean `true`. A truthy string, a `1`, or the
 * field being absent all read as false, because presenting an informative
 * image as decorative hides it from screen-reader users entirely - a failure
 * that is silent by construction and therefore the one to guard hardest.
 */
export function isDecorative(image: ProvenanceImage | null | undefined): boolean {
  return image?.decorative === true;
}

/**
 * The alt attribute to render, and whether to mark the image presentational.
 *
 * One function so that every surface answers the question the same way. The
 * `fallback` is what a template would otherwise have used - a venue name, an
 * article title - and it is applied ONLY to a non-decorative image with no
 * alt of its own. On a decorative image the fallback is deliberately dropped:
 * `alt={hero.alt || venueName}` is how an empty alt gets quietly refilled
 * with the venue's name, which re-asserts the exact claim the empty alt was
 * there to withdraw.
 */
export function altFor(
  image: ProvenanceImage | null | undefined,
  fallback?: string | null
): { alt: string; presentation: boolean } {
  if (isDecorative(image)) return { alt: '', presentation: true };
  const own = typeof image?.alt === 'string' ? image.alt.trim() : '';
  if (own) return { alt: own, presentation: false };
  const spare = typeof fallback === 'string' ? fallback.trim() : '';
  return { alt: spare, presentation: false };
}

const KNOWN: ReadonlySet<string> = new Set<DepictionStatus>([
  'actual',
  'illustrative',
  'unverified',
]);

/**
 * Resolve an image's depiction status.
 *
 * Anything not recognised reads as `unverified`. An unknown string must never
 * fall through to `actual` by accident, which is why this is a whitelist and
 * not a cast.
 */
export function depictionStatusOf(
  image: ProvenanceImage | null | undefined
): DepictionStatus {
  const raw = typeof image?.depictionStatus === 'string' ? image.depictionStatus.trim() : '';
  return KNOWN.has(raw) ? (raw as DepictionStatus) : 'unverified';
}

/** Does this image carry an explicit illustrative mark? */
export function isIllustrative(image: ProvenanceImage | null | undefined): boolean {
  return depictionStatusOf(image) === 'illustrative';
}

/**
 * May the page present this photograph as showing the entity?
 *
 * Only on an explicit `actual`. `unverified` returns false, which is the
 * whole point: the corpus is overwhelmingly unverified today, and none of it
 * may be asserted as a depiction on the strength of nobody having checked.
 */
export function assertsActualDepiction(
  image: ProvenanceImage | null | undefined
): boolean {
  return depictionStatusOf(image) === 'actual';
}

/**
 * Does the record itself say where the image came from?
 *
 * True only when at least one of creator / sourceUrl / permission is present.
 * `credit` is excluded on purpose. A credit is display text; the media debt
 * report of 2026-07-28 lists dozens of records crediting "Peninsula Insider"
 * on images licensed `other-licensed`, so treating a credit as provenance
 * would launder an attribution string into a rights claim. That is precisely
 * the failure A29 names.
 */
export function hasRecordedProvenance(
  image: ProvenanceImage | null | undefined
): boolean {
  const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  return filled(image?.creator) || filled(image?.sourceUrl) || filled(image?.permission);
}

/**
 * The sentence shown to a sighted reader beneath an illustrative image.
 *
 * Built only from what the record carries. When `depicts` is recorded the
 * reader is told what the photograph is of; when it is not, they are told
 * only that it is not the subject, because inventing the subject of a
 * photograph is the same class of error as inventing its licence.
 *
 * Returns null for anything not explicitly illustrative, so the caller cannot
 * accidentally render a disclosure onto an image that has not earned one.
 */
export function illustrativeDisclosure(
  image: ProvenanceImage | null | undefined,
  subject?: string | null
): { label: string; detail: string } | null {
  if (!isIllustrative(image)) return null;

  const depicts = typeof image?.depicts === 'string' ? image.depicts.trim() : '';
  const named = typeof subject === 'string' ? subject.trim() : '';
  const target = named || 'the place described on this page';

  return {
    label: 'Illustrative image',
    detail: depicts
      ? `This photograph shows ${depicts}. It is not a photograph of ${target}.`
      : `This photograph is not of ${target}.`,
  };
}
