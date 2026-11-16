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
