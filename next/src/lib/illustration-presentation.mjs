/** Presentation only: never strip source records or third-party photo credits.
 * Depiction status alone is insufficient: a context photograph can be illustrative.
 */
export function isOriginalIllustration(image) {
  if (!image || image.licenceUrl || image.licenseUrl) return false;
  return /^\/images\/(generated|editorial)\//.test(image.src ?? '') ||
    /^(?:Illustration|Artwork)\s*[:·]/i.test(image.credit?.trim() ?? '');
}
export function visibleImageCaption(image) {
  return isOriginalIllustration(image) ? '' : image?.caption ?? '';
}
