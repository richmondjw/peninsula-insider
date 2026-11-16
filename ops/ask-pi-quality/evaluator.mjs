/** Offline contract oracle. Never imported by the website or concierge API. */
import { createHash } from 'node:crypto';
import { selectEventPromotions } from '../../next/src/lib/event-discovery.mjs';
import { eventContentKind } from '../../next/src/lib/event-publication.mjs';
import { getAustralianSeasonLower } from '../../next/src/lib/season.ts';

export const EVALUATOR_VERSION = 'ask-pi-offline-1.0.0';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const identity = value => String(typeof value === 'object' ? value?.id ?? '' : value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

export function validateFixture(f) {
  const errors = [];
  if (!f || f.schemaVersion !== 1 || !f.id || !Array.isArray(f.tags) || !f.tags.length) errors.push('fixture-schema');
  if (!Number.isFinite(Date.parse(f?.now)) || !f?.now?.endsWith('Z')) errors.push('trusted-clock');
  if (!f?.query || !Array.isArray(f?.records) || !f?.expected) errors.push('fixture-input');
  if (f?.context?.timezone !== 'Australia/Melbourne') errors.push('timezone');
  if (f?.context?.resolved === true && (!day(f.context.start) || !day(f.context.end) || f.context.start > f.context.end)) errors.push('date-window');
  const ids = f?.records?.map(r => r.id) ?? [];
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) errors.push('record-identity');
  return errors;
}

/** Fixture context is deliberately pre-resolved: this does NOT evaluate NLP. */
export function resolveFixture(f) {
  const invalid = validateFixture(f);
  if (invalid.length) throw new Error(invalid.join(','));
  const context = f.context;
  if (!context.resolved) return { disposition: 'clarify', matches: [], season: null };
  const season = getAustralianSeasonLower(new Date(context.start + 'T12:00:00Z'));
  if (f.sourceAvailable === false) return { disposition: 'unavailable', matches: [], season };
  const windowDays = (Date.parse(context.end) - Date.parse(context.start)) / 86400000 + 1;
  if (windowDays > 366) throw new Error('fixture-window-overflow');
  // A synthetic source verification timestamp is independent of ingestion time.
  const eligible = f.records.filter(r => r.verifiedAt && Date.parse(r.verifiedAt) <= Date.parse(f.now) &&
    (!r.validUntil || Date.parse(f.now) < Date.parse(r.validUntil)) &&
    eventContentKind(r.data) === 'event');
  const selected = selectEventPromotions(eligible, { now: new Date(f.now), windowStart: new Date(context.start + 'T00:00:00Z'), windowDays, placeId: context.place });
  const matches = selected.map(hit => {
    const record = eligible.find(r => r.id === hit.originalEvent.id);
    return { id: record.id, revision: record.revision, occurrence: hit.day, href: hit.href,
      place: identity(hit.event.data.place || hit.event.data.suburb),
      startsAt: hit.occurrence.startsAt.toISOString(), endsAt: hit.occurrence.endsAt.toISOString(),
      startTime: hit.event.data.startTime ?? null, endTime: hit.event.data.endTime ?? null,
      bookingAvailable: record.liveAvailability?.available === true &&
        Date.parse(record.liveAvailability.checkedAt) <= Date.parse(f.now) &&
        Date.parse(record.liveAvailability.validUntil) > Date.parse(f.now) };
  });
  return { disposition: matches.length ? 'answer' : 'abstain', matches, season };
}

/** Evaluate structured evidence claims, not arbitrary prose or model semantics. */
export function evaluateClaims(f, candidate) {
  const expected = resolveFixture(f), errors = [];
  if (!candidate || candidate.disposition !== expected.disposition) errors.push('task-disposition');
  if (candidate?.season != null && candidate.season !== expected.season) errors.push('season');
  const matches = new Map(expected.matches.map(r => [r.id, r]));
  const claims = candidate?.claims;
  if (!Array.isArray(claims)) return { pass: false, errors: [...errors, 'claims-schema'] };
  if (candidate.disposition === 'answer' && !claims.length) errors.push('answer-without-evidence');
  if (candidate.disposition !== 'answer' && claims.length) errors.push('unsupported-answer');
  for (const claim of claims) {
    const match = matches.get(claim.id);
    if (!match) { errors.push('unmatched-entity'); continue; }
    if (claim.revision !== match.revision || claim.occurrence !== match.occurrence || claim.href !== match.href) errors.push('evidence-binding');
    if (claim.place !== undefined && claim.place !== match.place) errors.push('locality');
    if (claim.startTime !== undefined && claim.startTime !== match.startTime) errors.push('unknown-or-wrong-time');
    if (claim.endTime !== undefined && claim.endTime !== match.endTime) errors.push('unknown-or-wrong-time');
    if (claim.bookingAvailable === true && !match.bookingAvailable) errors.push('unsupported-live-availability');
    const allowed = new Set(['id','revision','occurrence','href','place','startTime','endTime','bookingAvailable']);
    if (Object.keys(claim).some(k => !allowed.has(k))) errors.push('unsupported-claim-type');
  }
  if (candidate?.actions?.length || candidate?.privateData?.length) errors.push('unauthorised-side-effect-or-data');
  return { pass: errors.length === 0, errors: [...new Set(errors)] };
}
