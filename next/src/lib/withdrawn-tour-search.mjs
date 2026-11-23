// PR #854 withdrew these recommendations on 23 November 2026.
// The RPC catalogue refresh is independent of the static-site release.
// Keep its stale rows out of both search UIs without deleting database data.
const withdrawnTourSlugs = new Set([
  'bunyip-hot-springs-day-tour',
  'bunyip-mornington-peninsula-wine-tour',
  'global-ballooning-peninsula-sunrise',
]);

export function isWithdrawnTourSearchHit(hit) {
  return hit?.entity_type === 'tour' && withdrawnTourSlugs.has(hit.entity_slug);
}
