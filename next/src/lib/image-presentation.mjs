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
    .replace(/\s+/g, ' ');
}

/** The visible description and distinction, without guessing from a URL or extension. */
export function imageCaption(image = {}) {
  image ??= {};
  let description = imageCaptionText(image.caption || image.depicts || '');
  const labelledArt = /^Illustration\s*[:\u00b7]/i.test(imagePresentationText(image.credit || ''));
  const art = labelledArt || image.imageKind === 'illustration';
  // A string-only CMS row cannot establish the medium. Remove redundant prose
  // only where the adjacent credit itself visibly identifies an illustration.
  if (labelledArt) description = description
    .replace(/^(?:Original )?Editorial illustration\.\s*/i, '')
    .replace(/(?:[.;,]\s*|\s+)not (?:an? (?:exact )?)?(?:depiction|photograph) of (?:a named|a specific|the named|this event)[^.]*\.?$/i, '.');
  if (image.depictionStatus === 'illustrative' && !art) {
    if (/^(?:Context (?:photograph|image)|(?:Original )?Editorial illustration)\b/i.test(description)) return description;
    description = description.replace(/\s*Regional (?:coastal )?context photograph, not a depiction of every[^.]*\.?/i, '');
    const label = image.imageKind === 'photograph' ? 'Context photograph' : 'Context image';
    return `${label}${description ? `: ${description}` : '.'}`;
  }
  return description;
}

/** Preserve explicit attribution wording; otherwise label unknown media neutrally. */
export function imageCreditText(value, imageKind) {
  const credit = imagePresentationText(value || '').trim();
  if (!credit || /^(?:Illustration|Photo(?:graph|grapher)?|Credit)\b/i.test(credit)) return credit;
  const label = imageKind === 'illustration' ? 'Illustration' : imageKind === 'photograph' ? 'Photo' : 'Credit';
  return `${label}: ${credit}`;
}

/** A reviewed image's public caption/credit must identify its medium or context. */
export function hasCaptionDistinction(image = {}) {
  if (image.depictionStatus !== 'illustrative' || !imageCaptionText(image.caption).trim() || /^(?:Original )?Editorial illustration\.?$/i.test(image.caption.trim())) return false;
  if (image.imageKind === 'illustration') return /^Illustration\s*[:\u00b7]/i.test(imagePresentationText(image.credit || ''));
  if (image.imageKind === 'photograph') return Boolean(image.credit?.trim()) && /^Context photograph\b/.test(imageCaption(image));
  return false;
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
