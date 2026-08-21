import crypto from 'node:crypto';

export const TAXONOMY = new Set([
  'geo.mornington-peninsula', 'geo.not-verifiable',
  'subject.coast-beach', 'subject.vineyard-cellar-door', 'subject.food-dining',
  'subject.market-produce', 'subject.thermal-wellness', 'subject.golf',
  'subject.walk-nature', 'subject.art-culture', 'subject.family',
  'subject.accommodation', 'subject.boating-fishing', 'subject.event-crowd-performance',
  'composition.landscape', 'composition.portrait', 'composition.square',
  'people.none', 'people.visible', 'people.child-likely', 'people.crowd',
  'accessibility.text-in-image', 'rights.review-required', 'rights.logo-visible',
]);

export function stableId(value) {
  const hex = crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function validateProposal(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['proposal must be an object'] };
  if (!Array.isArray(value.labels)) errors.push('labels must be an array');
  for (const [index, label] of (value.labels ?? []).entries()) {
    if (!TAXONOMY.has(label?.id)) errors.push(`labels[${index}].id is not controlled`);
    if (!Number.isFinite(label?.confidence) || label.confidence < 0 || label.confidence > 1) errors.push(`labels[${index}].confidence must be 0..1`);
    if (!['observed', 'contextual'].includes(label?.evidenceType)) errors.push(`labels[${index}].evidenceType is invalid`);
  }
  if (typeof value.altText !== 'string' || value.altText.trim().length < 8) errors.push('altText must be a factual proposal');
  if (!Array.isArray(value.flags)) errors.push('flags must be an array');
  return { ok: errors.length === 0, errors };
}

export function policyOutcome(proposal) {
  const labels = proposal.labels ?? [];
  const low = labels.filter((label) => label.confidence < 0.6);
  if (low.length) return { state: 'held', priority: 'hold', reasons: [`confidence below 0.60: ${low.map((x) => x.id).join(', ')}`] };
  const mandatoryIds = new Set(['people.child-likely', 'accessibility.text-in-image', 'rights.review-required', 'rights.logo-visible']);
  const mandatory = labels.some((label) => mandatoryIds.has(label.id)) || (proposal.flags ?? []).length > 0 || Boolean(proposal.altText);
  if (mandatory) return { state: 'pending_review', priority: 'mandatory', reasons: ['semantic metadata and alt text are proposal-only', ...(proposal.flags ?? [])] };
  return { state: 'pending_review', priority: labels.some((x) => x.confidence >= 0.85) ? 'suggested' : 'standard', reasons: ['semantic metadata is review-only during the pilot'] };
}

export function scorePlacement(placement, approvedMetadata, siblingAssetIds = []) {
  const expected = new Set(placement.expectedTaxonomy ?? []);
  const actual = new Set(approvedMetadata?.taxonomy ?? []);
  const overlap = [...expected].filter((id) => actual.has(id)).length;
  const semantic = expected.size ? overlap / expected.size : 0.5;
  const place = actual.has('geo.mornington-peninsula') ? 1 : 0.5;
  const orientation = approvedMetadata?.orientation;
  const surfaceFit = placement.surface === 'hero' ? (orientation === 'landscape' ? 1 : 0.35) : 0.75;
  const collision = siblingAssetIds.filter((id) => id === placement.assetId).length > 1 ? 0.35 : 1;
  const mood = semantic;
  const overall = Number(((semantic + semantic + place + mood + surfaceFit + collision) / 6).toFixed(3));
  return {
    objectScore: semantic,
    categoryScore: semantic,
    placeScore: place,
    moodScore: mood,
    surfaceScore: surfaceFit,
    collisionScore: collision,
    overall,
    state: overall < 0.6 ? 'low_match_review' : 'candidate',
    reasons: [`${overlap}/${expected.size || 0} expected taxonomy terms matched`, `surface=${placement.surface}`, collision < 1 ? 'duplicate rail collision' : 'no duplicate rail collision'],
  };
}

export function searchApprovedAssets(index, query, filters = {}) {
  const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return (index ?? [])
    .filter((asset) => asset.metadataState === 'approved' && asset.rightsStatus === 'known')
    .filter((asset) => !filters.orientation || asset.orientation === filters.orientation)
    .filter((asset) => !filters.noPeople || !(asset.taxonomy ?? []).some((id) => id.startsWith('people.') && id !== 'people.none'))
    .map((asset) => {
      const haystack = [asset.altText, asset.caption, ...(asset.taxonomy ?? []), ...(asset.entitySlugs ?? [])].join(' ').toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { ...asset, score };
    })
    .filter((asset) => terms.length === 0 || asset.score > 0)
    .sort((a, b) => b.score - a.score || String(a.canonicalUri).localeCompare(String(b.canonicalUri)));
}
