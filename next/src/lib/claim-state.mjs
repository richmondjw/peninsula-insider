/**
 * claim-state.mjs  -  the derived half of the PI-005 claim registry.
 *
 * State is computed, never stored. A claim is supported, unsupported,
 * disputed or retired as a function of its evidence set and today's date, and
 * none of those four words appears as a field on disk. Storing them would
 * mean a migration every time the calendar moved, which is precisely the
 * failure the existing bulk verification stamps already demonstrate: 88 of
 * 138 venues carry the identical lastVerified date, and records edited in
 * August still publish an April verification claim.
 *
 * Expiry is a state transition, not a deletion. An expired row stays on disk,
 * keeps its dates, and moves the claim to `unsupported`. Superseding is the
 * same: the superseded row stays, and git is the audit trail.
 *
 * Nothing in the build imports this yet. Stage 3 wires enforcement, and it
 * extends the ratchet in scripts/audit-event-safeguards.mjs rather than
 * introducing a second gate.
 */

/** Milliseconds in a day. Dates in this registry are day-resolution. */
const DAY_MS = 24 * 60 * 60 * 1000;

export const CLAIM_STATES = Object.freeze(['supported', 'unsupported', 'disputed', 'retired']);

/** Coerce anything date-shaped to a Date, or null. Day resolution only. */
export function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO day string, which is the form every date takes on disk. */
export function toIsoDay(value) {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * How long evidence for this claim class stays good, in days. Falls back to
 * the table's own default rather than to a number hard-coded here, so the
 * expiry policy lives in one place: src/data/source-precedence.json.
 */
export function expiryDaysFor(claimClass, precedence) {
  const entry = precedence?.classes?.[claimClass];
  const days = entry?.expiryDays ?? precedence?.defaultExpiryDays;
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) {
    throw new Error(`no expiry defined for claim class '${claimClass}'`);
  }
  return days;
}

/**
 * retrievedAt plus the class expiry. Note what this does NOT take: the
 * current date. A migrated row's expiry is anchored to the date the corpus
 * already carried, so a migration cannot claim more freshness than there was.
 */
export function computeExpiresAt(retrievedAt, claimClass, precedence) {
  const from = toDate(retrievedAt);
  if (!from) throw new Error(`retrievedAt is not a date: ${retrievedAt}`);
  return new Date(from.getTime() + expiryDaysFor(claimClass, precedence) * DAY_MS);
}

/** Has this row aged out as at `now`? Expiry is inclusive of the last day. */
export function isExpired(row, now) {
  const expires = toDate(row?.expiresAt);
  const at = toDate(now) ?? new Date();
  if (!expires) return true;
  return expires.getTime() < at.getTime();
}

/**
 * Rank of a publisher kind for a claim class: lower is more authoritative.
 * An unlisted kind sorts last rather than throwing, because an unrecognised
 * publisher is a reason to look, not a reason to fail a read.
 */
export function publisherRank(kind, claimClass, precedence) {
  const order = precedence?.classes?.[claimClass]?.precedence ?? [];
  const at = order.indexOf(kind);
  return at === -1 ? order.length : at;
}

/** Evidence rows still standing: not expired, not superseded. */
export function liveEvidence(rows, { now } = {}) {
  return (rows ?? []).filter((row) => !row?.supersededBy && !isExpired(row, now));
}

/**
 * Derive the claim's state.
 *
 *   retired     the claim carries a retiredAt on or before now
 *   disputed    live evidence disagrees, and the disagreement is not settled
 *               by precedence (the top-ranked kind on each side is equal)
 *   supported   at least one live supporting row, no unsettled dispute
 *   unsupported everything else, including a claim whose every source has
 *               expired. Expired is not deleted; it is unsupported.
 */
export function deriveClaimState(claim, rows, { now, precedence } = {}) {
  const at = toDate(now) ?? new Date();
  const retiredAt = toDate(claim?.retiredAt);
  if (retiredAt && retiredAt.getTime() <= at.getTime()) return 'retired';

  const live = liveEvidence(rows, { now: at });
  const supports = live.filter((row) => (row.stance ?? 'supports') === 'supports');
  const disputes = live.filter((row) => row.stance === 'disputes');

  if (supports.length === 0) return 'unsupported';
  if (disputes.length === 0) return 'supported';

  const best = (set) =>
    Math.min(...set.map((row) => publisherRank(row?.publisher?.kind, claim?.claimClass, precedence)));
  // Precedence settles the disagreement only when one side is strictly more
  // authoritative. A tie is a real dispute and an editor has to look at it.
  return best(supports) < best(disputes) ? 'supported' : 'disputed';
}

/** Group evidence rows by claimId, so a caller reads the corpus once. */
export function indexEvidenceByClaim(rows) {
  const byClaim = new Map();
  for (const row of rows ?? []) {
    const key = row?.claim;
    if (!key) continue;
    if (!byClaim.has(key)) byClaim.set(key, []);
    byClaim.get(key).push(row);
  }
  return byClaim;
}
