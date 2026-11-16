/** Offline contract oracle. Never imported by the website or concierge API. */
import { createHash } from 'node:crypto';
import { selectEventPromotions } from '../../next/src/lib/event-discovery.mjs';
import { eventContentKind } from '../../next/src/lib/event-publication.mjs';
import { getAustralianSeasonLower } from '../../next/src/lib/season.ts';

export const EVALUATOR_VERSION = 'ask-pi-offline-1.1.0';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const instant = value => text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const identity = value => String(typeof value === 'object' ? value?.id ?? '' : value ?? '').trim().toLowerCase().replace(/\s+/g, '-');

export function validateFixture(f) {
  const errors = [];
  if (!object(f)) return ['fixture-schema'];
  if (f.schemaVersion !== 1 || !text(f.id) || !Array.isArray(f.tags) || !f.tags.length || f.tags.some(tag=>!text(tag))) errors.push('fixture-schema');
  if (!instant(f.now) || !f.now.endsWith('Z')) errors.push('trusted-clock');
  if (!text(f.query) || !Array.isArray(f.records) || !object(f.expected)) errors.push('fixture-input');
  if (!object(f.context) || f.context.timezone !== 'Australia/Melbourne' || typeof f.context.resolved !== 'boolean') errors.push('timezone-or-context');
  if (f.context?.resolved === true && (!day(f.context.start) || !day(f.context.end) || f.context.start > f.context.end || !text(f.context.place) || !text(f.context.yearBasis))) errors.push('date-window');
  if (f.sourceAvailable !== undefined && typeof f.sourceAvailable !== 'boolean') errors.push('source-availability-type');
  if (Array.isArray(f.records) && f.records.some(r=>!object(r)||!text(r.id)||!text(r.revision)||!object(r.data)||
    (r.verifiedAt!==null&&!instant(r.verifiedAt))||(r.validUntil!==undefined&&!instant(r.validUntil))||
    (r.liveAvailability!==undefined&&(!object(r.liveAvailability)||typeof r.liveAvailability.available!=='boolean'||!instant(r.liveAvailability.checkedAt)||!instant(r.liveAvailability.validUntil))))) errors.push('record-schema');
  const ids = Array.isArray(f.records) ? f.records.map(r => r?.id) : [];
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
  const fixtureErrors=validateFixture(f);
  if(fixtureErrors.length) return {pass:false,errors:fixtureErrors};
  if(!object(candidate)) return {pass:false,errors:['candidate-schema']};
  const allowedTop=new Set(['disposition','season','claims','actions','privateData']);
  if(Object.keys(candidate).some(k=>!allowedTop.has(k))||!['answer','abstain','clarify','unavailable'].includes(candidate.disposition)||
    (candidate.season!==undefined&&candidate.season!==null&&!['summer','autumn','winter','spring'].includes(candidate.season))||
    ['actions','privateData'].some(k=>candidate[k]!==undefined&&(!Array.isArray(candidate[k])||candidate[k].length>0))) return {pass:false,errors:['candidate-schema-or-side-effect']};
  const expected = resolveFixture(f), errors = [];
  if (!candidate || candidate.disposition !== expected.disposition) errors.push('task-disposition');
  if (candidate?.season != null && candidate.season !== expected.season) errors.push('season');
  const matches = new Map(expected.matches.map(r => [r.id, r]));
  const claims = candidate?.claims;
  if (!Array.isArray(claims)) return { pass: false, errors: [...errors, 'claims-schema'] };
  if (candidate.disposition === 'answer' && !claims.length) errors.push('answer-without-evidence');
  if (candidate.disposition !== 'answer' && claims.length) errors.push('unsupported-answer');
  for (const claim of claims) {
    if(!object(claim)||!text(claim.id)||!text(claim.revision)||!day(claim.occurrence)||!text(claim.href)||
      (claim.place!==undefined&&!text(claim.place))||
      ['startTime','endTime'].some(k=>claim[k]!==undefined&&claim[k]!==null&&(typeof claim[k]!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(claim[k])))||
      (claim.bookingAvailable!==undefined&&typeof claim.bookingAvailable!=='boolean')) {errors.push('claim-schema');continue;}
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
