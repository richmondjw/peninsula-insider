/** Original-art release evidence, separate from presentation heuristics.
 * A generated filename or display credit alone never establishes rights.
 * Keep the underlying permission record intact; this does not certify legal rights.
 */
import { createHash } from 'node:crypto';
const fields = [
  'src', 'alt', 'credit', 'license', 'depicts', 'depictionStatus', 'creator',
  'permission', 'permittedUses', 'rightsHolder', 'rightsEstablishedOn',
  'rightsStatus', 'provenanceReview', 'decorative',
];
const filled = value => typeof value === 'string' && value.trim().length > 0;

export function originalArtProvenance(image) {
  if (!image || image.licenseUrl || image.licenceUrl) return null;
  const day = image.rightsEstablishedOn;
  const validDay = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
    && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
  if (!/^\/images\/(?:generated|editorial)\/[a-z0-9][a-z0-9_-]*\.(?:webp|png|svg)$/i.test(image.src ?? '')
    || !filled(image.alt) || !/\b(?:conceptual|illustration|artwork)\b/i.test(image.alt)
    || !/^(?:Illustration|Artwork)\s*[:·]\s*Peninsula Insider$/.test(image.credit ?? '')
    || image.license !== 'other-licensed'
    || !filled(image.depicts) || image.depictionStatus !== 'illustrative'
    || !/^Peninsula Insider(?:, AI-assisted)?$/.test(image.creator ?? '')
    || !filled(image.permission) || !/\boriginal\b/i.test(image.permission)
    || !/\b(?:artwork|illustration)\b/i.test(image.permission)
    || !/Peninsula Insider/.test(image.permission) || !/\bwebsite\b/i.test(image.permission)
    || !Array.isArray(image.permittedUses) || !image.permittedUses.includes('website')
    || !image.permittedUses.every(use => typeof use === 'string')
    || image.rightsHolder !== 'Peninsula Insider' || !validDay
    || image.rightsStatus !== 'recorded' || image.provenanceReview !== 'verified'
    || image.decorative !== false) return null;
  // Only a fingerprint is published. Creator, permission and generation notes
  // stay in the source record and are independently checked by the release gate.
  const record = Object.fromEntries(fields.map(field => [field, image[field]]));
  return 'sha256:' + createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

/** Bind recorded evidence to the image actually rendered, not a neighbouring card. */
function withoutBuildVersion(src, pageUrl) {
  if (typeof src !== 'string') return null;
  try {
    const url = new URL(src, pageUrl);
    const versions = url.searchParams.getAll('v');
    if (versions.length === 1 && /^[a-f0-9]{8}$/.test(versions[0])) url.searchParams.delete('v');
    return url.href;
  } catch { return null; }
}

export function matchesOriginalArtProvenance(fingerprint, rendered, image, pageUrl) {
  const expected = originalArtProvenance(image);
  return expected !== null && fingerprint === expected
    // This hero currently uses its original image. Derivatives require a
    // manifest-bound contract; an asserted original-src alone is not evidence.
    && !rendered?.['data-pi-image-original-src'] && !rendered?.srcset
    && withoutBuildVersion(image.src, pageUrl) !== null
    && withoutBuildVersion(image.src, pageUrl) === withoutBuildVersion(rendered?.src, pageUrl)
    && image.alt === rendered?.alt;
}
