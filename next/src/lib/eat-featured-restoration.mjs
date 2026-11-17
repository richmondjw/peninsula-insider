import quarantine from '../data/cms-image-quarantine.json' with { type: 'json' };

/** Historical restoration candidates recorded on 2026-11-15.
 *
 * These files are retained here only so the public fail-closed rule is
 * regression-testable. None has a creator, rights holder or website-use grant,
 * so none may be returned to a human-facing surface. An owner request to reuse
 * historical pixels does not establish publication rights or exact subject
 * identity. Evidence: ops/page-quality/assessments/eat-featured-restoration-2026-11-15.json.
 */
const originals = new Map([
  ['commonfolk-coffee', {
    file: 'heroImage-1780004538243.jpg',
    alt: 'Two people crouch beside drying coffee cherries beneath a timber-framed shelter',
    caption: 'Coffee production',
    websiteUseGrant: null,
  }],
  ['tedesca-osteria', {
    file: 'heroImage-1781253504049.jpg',
    alt: 'A timber-lined dining room with white-clothed tables and a central wood-burning fireplace',
    websiteUseGrant: null,
  }],
  ['barragunda-dining', {
    file: 'heroImage-1780004515078.jpg',
    alt: 'Pale timber tables and chairs beside full-height windows looking onto trees',
    websiteUseGrant: null,
  }],
  ['portsea-hotel', {
    file: 'hero-1778598174247.jpg',
    alt: 'Dining tables on a white-columned terrace overlooking blue water',
    websiteUseGrant: null,
  }],
]);

export function eatFeaturedRestoration(slug, surface, holds = quarantine.quarantined) {
  if (surface !== '/eat/#the-six') return undefined;
  const original = originals.get(slug);
  if (!original) return undefined;
  // Fail closed. A future restoration must first carry an attributable,
  // asset-specific website-use grant; never borrow a venue fallback's credit.
  if (!original.websiteUseGrant) return undefined;
  const storagePath = `venue/${slug}/${original.file}`;
  // An explicit asset hold wins even over this narrowly scoped exception.
  if (holds.some((hold) => hold.storagePath === storagePath)) return undefined;
  return {
    src: `https://tjjhpvslpysfklwpqmgz.supabase.co/storage/v1/object/public/cms-assets/${storagePath}`,
    alt: original.alt,
    ...(original.caption ? { caption: original.caption } : {}),
  };
}
