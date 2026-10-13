/**
 * Reader wording for the site's reviewed illustration labels. Apply only to
 * displayed image metadata, never to editorial prose or stored provenance.
 */
export function imagePresentationText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\bPeninsula Insider,\s+AI[-\s\u2010-\u2015](?:assisted|generated)\s+illustration\b/gi, 'Illustration: Peninsula Insider')
    .replace(/\bAI[-\s\u2010-\u2015](?:assisted|generated)\s+artwork\s+by\s+Peninsula Insider\b/gi, 'Illustration: Peninsula Insider')
    .replace(/\bAI[-\s\u2010-\u2015](?:assisted|generated)\s+artwork\s*·\s*Peninsula Insider\b/gi, 'Illustration · Peninsula Insider')
    .replace(/^(\s*)AI[-\s\u2010-\u2015](?:assisted|generated)\s+editorial\s+illustration(?=\s*(?:[.:;]|$))/i, '$1Editorial illustration');
}

/** Caption-only formatting. Never apply this to alt text, rights or stored history. */
export function imageCaptionText(value) {
  if (typeof value !== 'string') return '';
  return imagePresentationText(value).trim()
    .replace(/^This image shows\s+/i, '')
    .replace(/^Conceptual\s+/i, '')
    .replace(/^Editorial illustration\.\s*/i, '')
    .replace(/^Original editorial illustration\.\s*/i, '')
    .replace(/\s*Regional (?:coastal )?context photograph, not a depiction of every[^.]*\.?/i, '')
    .replace(/(?:[.;,]\s*|\s+)not (?:an? (?:exact )?)?(?:depiction|photograph) of (?:a named|a specific|the named|this event)[^.]*\.?$/i, '.')
    .replace(/\s+/g, ' ');
}

/** The visible description and distinction, without guessing from a URL or extension. */
export function imageCaption(image = {}) {
  image ??= {};
  const description = imageCaptionText(image.caption || image.depicts || '');
  const art = /^Illustration\s*[:\u00b7]/i.test(image.credit || '') || image.imageKind === 'illustration';
  if (image.depictionStatus === 'illustrative' && !art) {
    if (/^Context photograph\b/i.test(description)) return description;
    return `Context photograph${description ? `: ${description}` : '.'}`;
  }
  return description;
}

/** Editorial admission issues, separate from legal provenance checks. */
export function captionIssues(image = {}) {
  const issues = [];
  if (!['actual', 'illustrative', 'unverified'].includes(image.depictionStatus)) issues.push('Record depictionStatus for editorial review');
  if (image.depictionStatus === 'unverified') issues.push('Image identity requires editorial review');
  if (!['photograph', 'illustration'].includes(image.imageKind)) issues.push('Record imageKind after viewing the image');
  if (!image.decorative && !image.alt?.trim()) issues.push('Write useful alt text');
  if (!image.caption?.trim() || /^(?:image|illustration|conceptual coastal illustration)\.?$/i.test(image.caption.trim())) issues.push('Write a useful image description');
  if (!image.credit?.trim()) issues.push('Preserve attribution');
  if (/This image shows|It does not depict|not (?:an? (?:exact )?)?depiction|Conceptual oversized|Editorial illustration\./i.test(image.caption || '')) issues.push('Replace caption boilerplate with a description');
  if (image.imageKind === 'illustration' && image.depictionStatus === 'actual') issues.push('An illustration cannot assert documentary depiction');
  return issues;
}
