/** Journal imagery must survive missing records, files, and failed downloads. */

export function journalImageTheme(data = {}) {
  const topic = [data.title, data.format, ...(data.tags ?? [])].join(' ').toLowerCase();
  if (/gallery|exhibition|\bart\b|paper|culture/.test(topic)) return 'art';
  if (/wine|winery|vineyard|cellar/.test(topic)) return 'wine';
  if (/food|eat|restaurant|breakfast|lunch|pantry|seafood/.test(topic)) return 'food';
  if (/stay|hotel|accommodation|escape/.test(topic)) return 'stay';
  if (/boat|moor|berth|sail/.test(topic)) return 'boating';
  return 'coast';
}

export const journalIllustration = {
  src: '/images/editorial/journal-backstop.svg',
  alt: 'Original illustration of layered coastal hills, vineyard rows and a sailboat under a warm sun',
  credit: 'Peninsula Insider',
  caption: 'Original editorial illustration. A conceptual coastal scene, not a photograph of a named place or event.',
  depicts: 'a conceptual coastal landscape',
  depictionStatus: 'illustrative',
  license: 'other-licensed',
  creator: 'Peninsula Insider',
  permission: 'Original SVG artwork authored for Peninsula Insider on 8 October 2026.',
  permittedUses: ['website', 'social'],
  rightsHolder: 'Peninsula Insider',
  rightsEstablishedOn: '2026-10-08',
  rightsStatus: 'recorded',
  provenanceReview: 'verified',
  decorative: false,
};

export function selectJournalImage(hero, data, fallback, available, rightsEstablished = (_source) => false) {
  const source = hero.override ?? data.heroImage;
  const usable = source?.src === hero.src && available(hero.src) && (hero.alt?.trim() || hero.decorative) && source?.credit?.trim() && rightsEstablished(source);
  const image = usable
    ? { src: hero.src, alt: hero.alt, credit: source.credit, caption: source.caption ?? '', provenance: hero.override ? null : source, decorative: hero.decorative }
    : { ...fallback, provenance: fallback, decorative: false };
  if (!available(image.src)) Object.assign(image, journalIllustration, { provenance: journalIllustration });
  if (!available(image.src)) throw new Error('Journal image policy: no available image or original illustration');
  return {
    ...hero, ...image,
    override: usable ? hero.override : undefined,
    fallback: !usable,
    recovery: [fallback, journalIllustration].filter((r, i, rows) => available(r.src) && rows.findIndex(x => x.src === r.src) === i),
  };
}

export function journalCredit(image) {
  // Reviewed credit identifies raster artwork too. A format or an
  // illustrative depiction status alone does not make a context photo art.
  if (/^Illustration\s*[:·]/i.test(image.credit?.trim() ?? '')) return image.credit.trim();
  // The HTML cache stamper also versions this constant when the recovery
  // script is inlined, so compare both identities without cache parameters.
  if (image.src?.split(/[?#]/)[0] === journalIllustration.src.split(/[?#]/)[0]) return `Illustration · ${image.credit}`;
  return image.credit?.trim().toLowerCase() === 'jem' ? 'Photograph by jem' : `Photo · ${image.credit}`;
}

export function journalRecoveryAttrs(image) {
  return { 'data-journal-image': '', 'data-journal-recovery': JSON.stringify(image.recovery), 'data-pi-requires-image-metadata': 'true' };
}
