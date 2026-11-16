import quarantine from '../data/cms-image-quarantine.json' with { type: 'json' };

/** Owner-directed restoration, 2026-11-15, ONLY /eat/#the-six.
 * These are the exact historical CMS uploads, not rights-cleared replacements.
 * Permission, creator and rights-holder records remain unresolved. Never copy
 * provenance from the unrelated content fallbacks or accept arbitrary CMS URLs.
 * Evidence: ops/page-quality/assessments/eat-featured-restoration-2026-11-15.json.
 */
const originals = new Map([
  ['commonfolk-coffee', {
    file: 'heroImage-1780004538243.jpg',
    alt: 'Two people crouch beside drying coffee cherries beneath a timber-framed shelter',
    caption: 'Coffee production',
  }],
  ['tedesca-osteria', {
    file: 'heroImage-1781253504049.jpg',
    alt: 'A timber-lined dining room with white-clothed tables and a central wood-burning fireplace',
  }],
  ['barragunda-dining', {
    file: 'heroImage-1780004515078.jpg',
    alt: 'Pale timber tables and chairs beside full-height windows looking onto trees',
  }],
  ['portsea-hotel', {
    file: 'hero-1778598174247.jpg',
    alt: 'Dining tables on a white-columned terrace overlooking blue water',
  }],
]);

export function eatFeaturedRestoration(slug, surface, holds = quarantine.quarantined) {
  if (surface !== '/eat/#the-six') return undefined;
  const original = originals.get(slug);
  if (!original) return undefined;
  const storagePath = `venue/${slug}/${original.file}`;
  // An explicit asset hold wins even over this narrowly scoped exception.
  if (holds.some((hold) => hold.storagePath === storagePath)) return undefined;
  return {
    src: `https://tjjhpvslpysfklwpqmgz.supabase.co/storage/v1/object/public/cms-assets/${storagePath}`,
    alt: original.alt,
    ...(original.caption ? { caption: original.caption } : {}),
  };
}
