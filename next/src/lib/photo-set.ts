/**
 * The photograph rule for detail pages. One function so venue, explore, tour,
 * tour-operator and place pages make the same decision.
 *
 *   1. Opening. With three or more verified photographs of the place, the page
 *      opens on a photo stage: a large lead with its caption and credit, and a
 *      filmstrip that browses the rest. With fewer, the single hero stays.
 *   2. In the text. One photograph breaks the text after the first paragraph
 *      (four or more photographs), and a pair sits after the third paragraph
 *      when there are seven or more photographs and at least four paragraphs.
 *   3. No trailing grid. Every photograph is reachable from the stage or the
 *      full-screen viewer, so nothing is dumped at the foot of the page.
 *   4. Photographs change only when the reader asks.
 *
 * "Verified" is the bar the templates already used for galleries: rights
 * recorded and provenance checked by a person. A stand-in marked illustrative
 * never enters the set, so the stage can only ever claim to show the place.
 * An editor's CMS upload replaces the hero with a file that has no record, so
 * when one is published the single hero stays and the set only feeds the text
 * and the viewer.
 */

export interface PhotoRef {
  src: string;
  alt?: string;
  credit?: string;
  caption?: string;
  depictionStatus?: string;
  rightsStatus?: string;
  provenanceReview?: string;
  decorative?: boolean;
  [key: string]: unknown;
}

export const STAGE_MIN = 3;
const INLINE_MIN = 4;
const PAIR_MIN = 7;
const PAIR_MIN_PARAGRAPHS = 4;

export function isVerifiedPhoto(image: PhotoRef | null | undefined): image is PhotoRef {
  return Boolean(
    image?.src &&
      image.rightsStatus === 'recorded' &&
      image.provenanceReview === 'verified' &&
      image.depictionStatus !== 'illustrative',
  );
}

/** Verified photographs of the entity, hero first when it qualifies, no duplicates. */
export function verifiedPhotos(data: { heroImage?: PhotoRef | null; gallery?: PhotoRef[] | null }): PhotoRef[] {
  const seen = new Set<string>();
  const out: PhotoRef[] = [];
  for (const image of [data.heroImage, ...(data.gallery ?? [])]) {
    if (!isVerifiedPhoto(image) || seen.has(image.src)) continue;
    seen.add(image.src);
    out.push(image);
  }
  return out;
}

export interface PhotoPlan {
  /** Photographs for the stage and viewer, in order; empty when there are none. */
  photos: PhotoRef[];
  /** True when the opening should be the stage rather than the single hero. */
  stage: boolean;
  /** Viewer index of the photograph after the first paragraph, or null. */
  afterFirst: number | null;
  /** Viewer indexes of the pair after the third paragraph, or null. */
  pair: [number, number] | null;
}

export function photoPlan(
  data: { heroImage?: PhotoRef | null; gallery?: PhotoRef[] | null },
  options: { override?: boolean; paragraphs?: number } = {},
): PhotoPlan {
  const photos = verifiedPhotos(data);
  const n = photos.length;
  const paragraphs = options.paragraphs ?? 0;
  // The in-text photographs skip the lead and the frame beside it, which the
  // reader has just seen at the top, and take the next ones in editorial order.
  const afterFirst = n >= INLINE_MIN && paragraphs >= 1 ? 2 : null;
  const pair: [number, number] | null =
    n >= PAIR_MIN && paragraphs >= PAIR_MIN_PARAGRAPHS ? [4, 5] : null;
  return { photos, stage: !options.override && n >= STAGE_MIN, afterFirst, pair };
}

/** Split editor prose the way every template already does. */
export function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}
