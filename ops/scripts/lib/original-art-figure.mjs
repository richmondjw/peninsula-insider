import { matchesOriginalArtProvenance } from '../../../next/src/lib/original-art-provenance.mjs';

// Read quoted attributes, including Astro's escaped alt text, without matching
// evidence in captions, comments or a different element. Duplicate keys fail closed.
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/\s([^\s=<>/]+)\s*=\s*(["'])(.*?)\2/gs)) {
    const name = match[1].toLowerCase();
    if (Object.hasOwn(result, name)) return null;
    result[name] = match[3].replace(/&(?:quot|apos|amp|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
      const named = { '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>' };
      if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
      const code = /^&#x/i.test(entity) ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\uFFFD';
    });
  }
  return result;
}

export function hasOriginalArtProvenance(figure, image, pageUrl) {
  const markup = String(figure).replace(/<!--[\s\S]*?-->/g, '');
  const figureTag = markup.match(/^\s*<figure\b(?:[^"'>]|"[^"]*"|'[^']*')*>/i)?.[0];
  const images = [...markup.matchAll(/<img\b(?:[^"'>]|"[^"]*"|'[^']*')*>/gi)];
  if (!figureTag || images.length !== 1 || /<source\b/i.test(markup)) return false;
  try {
    const fingerprint = attributes(figureTag)?.['data-pi-original-art'];
    return matchesOriginalArtProvenance(fingerprint, attributes(images[0][0]), image, pageUrl);
  } catch { return false; }
}
