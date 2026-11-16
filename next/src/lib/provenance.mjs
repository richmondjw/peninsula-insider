/**
 * provenance.mjs  -  PI-004, the read side of the provenance model.
 *
 * One date used to answer three questions. A record carried `lastVerified`,
 * a page rendered it as "Reviewed April 2026", structured data emitted it as
 * a modification date, and roughly forty pages simply hardcoded a date of
 * their own with nothing behind it at all. So a reader could not tell whether
 * a stamp meant "an editor read this copy", "a source was re-read and the
 * facts still stood", or "this was picked for a list this week".
 *
 * This module answers them separately, and it will not invent the answer it
 * does not have. The check date is the load-bearing one: it may come only
 * from an authored `editorialProvenance.checkedOn`, or from live evidence
 * in the PI-005 claim registry. A legacy `lastVerified` is NEVER promoted
 * into it. Eighty-eight of 138 venues share one bulk stamp and six
 * collections carry a single stamp applied inside 48 hours, so those dates
 * evidence that a batch job ran, not that any particular record was checked.
 * They remain what they always were, a review date, and they render as one.
 *
 * The honest case is the normal case. Most records are researched from
 * published sources, and the copy here says so plainly rather than
 * apologising for it.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import {
  deriveClaimState,
  indexEvidenceByClaim,
  liveEvidence,
  toDate,
  toIsoDay,
} from './claim-state.mjs';

export const PROVENANCE_METHODS = Object.freeze(['researched', 'visited', 'compiled']);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "April 2026". Month precision, because day precision overstates the rhythm. */
export function formatMonth(value) {
  const d = toDate(value);
  return d ? MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : null;
}

/** "30 April 2026". Used where a page already published day precision. */
export function formatLongDay(value) {
  const d = toDate(value);
  return d ? d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : null;
}

/**
 * The legacy date a record already carries. This is a REVIEW date and is
 * only ever read as one. The field order matches how the corpus names it
 * across collections.
 */
export function legacyReviewDate(data) {
  return toIsoDay(data?.lastVerified ?? data?.lastCheckedDate ?? data?.lastReviewed ?? null);
}

/** Registry subjects are a {type, slug} pair, deliberately not a reference(). */
export function subjectKey(type, slug) {
  return type + '::' + slug;
}

/**
 * Index the claim and evidence collections by the records they are about, so
 * a page reads the registry once however many records it lists. A claim is
 * indexed under its subject AND under everything in `assertedBy`: the point
 * of the registry is that one claim can be asserted by many records.
 */
export function buildProvenanceIndex(claimRecords, evidenceRecords) {
  const byClaimId = new Map();
  const bySubject = new Map();
  for (const entry of claimRecords ?? []) {
    const claim = entry?.data ?? entry;
    if (!claim?.claimId) continue;
    byClaimId.set(claim.claimId, claim);
    const subjects = [claim.subject, ...(claim.assertedBy ?? [])];
    for (const subject of subjects) {
      if (!subject?.type || !subject?.slug) continue;
      const key = subjectKey(subject.type, subject.slug);
      if (!bySubject.has(key)) bySubject.set(key, []);
      const bucket = bySubject.get(key);
      if (!bucket.includes(claim)) bucket.push(claim);
    }
  }
  const evidenceByClaim = indexEvidenceByClaim(
    (evidenceRecords ?? []).map((entry) => entry?.data ?? entry)
  );
  return { byClaimId, bySubject, evidenceByClaim };
}

const EMPTY_INDEX = { byClaimId: new Map(), bySubject: new Map(), evidenceByClaim: new Map() };

const EMPTY_REGISTRY = Object.freeze({
  claims: 0,
  evidenceOnFile: 0,
  evidenceLive: 0,
  checkedOn: null,
  disputed: false,
});

/**
 * What the registry knows about one record: the newest date a source was
 * actually read and still stands, plus whether there is anything on file at
 * all. `checkedOn` is null when every row has expired, which is the truth
 * the seeded corpus mostly tells: an expired row is unsupported, not deleted.
 */
export function registryProvenance(type, slug, { index = EMPTY_INDEX, now, precedence } = {}) {
  const claims = index.bySubject?.get(subjectKey(type, slug)) ?? [];
  let onFile = 0;
  let live = 0;
  let checkedOn = null;
  let disputed = false;
  for (const claim of claims) {
    const rows = index.evidenceByClaim?.get(claim.claimId) ?? [];
    onFile += rows.length;
    const standing = liveEvidence(rows, { now });
    live += standing.length;
    if (deriveClaimState(claim, rows, { now, precedence }) === 'disputed') disputed = true;
    for (const row of standing) {
      if ((row.stance ?? 'supports') !== 'supports') continue;
      const at = toIsoDay(row.retrievedAt);
      if (at && (checkedOn === null || at > checkedOn)) checkedOn = at;
    }
  }
  return { claims: claims.length, evidenceOnFile: onFile, evidenceLive: live, checkedOn, disputed };
}

/**
 * Derive one record's provenance.
 *
 * `basis` says where the check date came from, and is the field to look at
 * when the answer surprises you:
 *
 *   authored  the record carries an explicit editorialProvenance.checkedOn
 *   registry  live supporting evidence in the claim registry
 *   none      no check is on file. The default across the corpus today.
 */
export function recordProvenance(data, { type, slug, index, now, precedence } = {}) {
  const block = data?.editorialProvenance ?? null;
  const visitOn = toIsoDay(block?.visit?.occurredOn ?? null);
  // Defence in depth. The schema refuses 'visited' without a visit record;
  // if one ever reaches here anyway it reads as research, never as a visit.
  const declared = block?.method ?? 'researched';
  const method = declared === 'visited' && !visitOn ? 'researched' : declared;

  const authored = toIsoDay(block?.checkedOn ?? null);
  const registry = type && slug
    ? registryProvenance(type, slug, { index, now, precedence })
    : EMPTY_REGISTRY;

  const checkedOn = authored ?? registry.checkedOn ?? null;
  const basis = authored ? 'authored' : registry.checkedOn ? 'registry' : 'none';

  return {
    method,
    visitOn,
    checkedOn,
    basis,
    checkedBy: block?.checkedBy ?? 'desk',
    source: block?.source ?? null,
    reviewedOn: toIsoDay(block?.reviewedOn ?? null) ?? legacyReviewDate(data),
    evidenceOnFile: registry.evidenceOnFile,
    evidenceLive: registry.evidenceLive,
    disputed: registry.disputed,
  };
}

/** The earlier of two ISO days, treating null as "no date". */
const earlier = (a, b) => (a && b ? (a < b ? a : b) : a ?? b ?? null);

/**
 * Provenance for a page assembled from many records: a hub, a category list,
 * a best-of.
 *
 * Every date is the FLOOR across the set, never the newest. A page listing
 * twenty venues is only as checked as its least recently checked entry, so
 * the floor understates freshness and can never overstate it. `checkedOn` is
 * null unless EVERY record has a check on file, because one checked record
 * does not make the page checked.
 */
export function aggregateProvenance(records, options = {}) {
  const entries = records ?? [];
  const derived = entries.map((entry) => {
    const data = entry?.data ?? entry;
    return recordProvenance(data, {
      ...options,
      slug: options.slugOf ? options.slugOf(entry) : data?.slug ?? entry?.id,
    });
  });

  if (derived.length === 0) {
    return {
      method: 'compiled',
      visitOn: null,
      checkedOn: null,
      reviewedOn: null,
      basis: 'none',
      records: 0,
      evidenceOnFile: 0,
      evidenceLive: 0,
      disputed: false,
    };
  }

  let checkedOn = null;
  let everyChecked = true;
  let reviewedOn = null;
  let everyReviewed = true;
  let evidenceOnFile = 0;
  let evidenceLive = 0;
  let disputed = false;

  for (const d of derived) {
    if (d.checkedOn) checkedOn = earlier(checkedOn, d.checkedOn);
    else everyChecked = false;
    if (d.reviewedOn) reviewedOn = earlier(reviewedOn, d.reviewedOn);
    else everyReviewed = false;
    evidenceOnFile += d.evidenceOnFile;
    evidenceLive += d.evidenceLive;
    if (d.disputed) disputed = true;
  }

  return {
    method: 'compiled',
    visitOn: null,
    checkedOn: everyChecked ? checkedOn : null,
    reviewedOn: everyReviewed ? reviewedOn : null,
    basis: everyChecked && checkedOn ? 'registry' : 'none',
    records: derived.length,
    evidenceOnFile,
    evidenceLive,
    disputed,
  };
}

/**
 * The date a page may publish as a fact-check stamp, and nothing else may be
 * published as one. Null means no check is on file, and the caller must then
 * say so or say nothing, never fall back to a review date wearing the word
 * "verified".
 */
export function factCheckStamp(derived) {
  return derived?.checkedOn ?? null;
}

/**
 * The label a page may put in front of a date it publishes.
 *
 * The word 'fact-verified' is reserved for a check that was earned, and
 * this is the only place it is spelled. Everything else is a review, and a
 * review is a weaker claim that the copy has to make honestly. Keeping the
 * choice in one function is what lets a build gate assert that no page put
 * the stronger word next to a date of its own.
 */
export function stampLabel(derived) {
  return derived?.checkedOn ? 'Last fact-verified' : 'Last reviewed';
}

/**
 * The disclosure sentence.
 *
 * Order matters: the method comes first, because "researched" is the
 * publication's standard and not a caveat, and the dates follow it. What is
 * absent is stated rather than skipped, because a missing check date is the
 * single most useful thing a reader can be told about a stamp.
 *
 * `noun` names what the page is about ("venue", "entry") so an aggregate
 * line reads naturally. `scope` switches the aggregate wording on.
 *
 * `admitMissingCheck` is the one place the reader's line and the internal
 * line differ. Internally, "no source check is on file" is the most useful
 * sentence in this module and the audit wants it. Publicly it is noise: a
 * page that never claimed a check is not hiding one by staying quiet, and
 * the ambiguous wording it replaces has already gone. An expired source is
 * different and is always disclosed, because that claim was made and then
 * lapsed.
 */
export function disclosureLine(derived, { noun = 'entry', scope = 'record', admitMissingCheck = true } = {}) {
  if (!derived) return null;
  const parts = [];

  if (derived.method === 'visited' && derived.visitOn) {
    parts.push('Visited ' + formatMonth(derived.visitOn) + ' and researched from published sources.');
  } else {
    parts.push('Researched from published sources.');
  }

  if (derived.checkedOn) {
    parts.push(
      scope === 'set'
        ? 'Every ' + noun + ' listed was fact-checked ' + formatMonth(derived.checkedOn) + ' or later.'
        : 'Facts last checked ' + formatMonth(derived.checkedOn) + '.'
    );
  } else if (derived.reviewedOn) {
    const missing = admitMissingCheck ? ' No source check is on file.' : '';
    parts.push(
      scope === 'set'
        ? 'Every ' + noun + ' listed was reviewed ' + formatMonth(derived.reviewedOn) + ' or later.' + missing
        : 'Last reviewed ' + formatMonth(derived.reviewedOn) + '.' + missing
    );
  } else if (admitMissingCheck) {
    parts.push('No review or source check is on file.');
  }

  // The seeded registry is mostly expired, and hiding that would be the same
  // failure in a new coat.
  if (derived.evidenceOnFile > 0 && derived.evidenceLive === 0) {
    parts.push('The sources on file have expired and a recheck is due.');
  }
  if (derived.disputed) {
    parts.push('Sources disagree on at least one fact here and an editor is reviewing it.');
  }

  return parts.length ? parts.join(' ') : null;
}
