/**
 * material-change.mjs  -  PI-022, the mechanical half.
 *
 * One question, answered from the data alone: what has genuinely changed here
 * since a given date?
 *
 * The editorial half of PI-022 is not in this file and must not leak into it.
 * How often the site should speak to a returning reader, in what voice, and
 * what earns a place in that surface are editorial calls. This module exists
 * so that when those calls are made, the answer they need is already
 * computable and nobody has to go and instrument the corpus first. There is no
 * copy here, no cadence, no threshold and no page.
 *
 * THE DISTINCTION THIS MODULE EXISTS FOR.
 *
 * A claim re-verified with the SAME value is a reassurance, not a change. A
 * claim whose value MOVED is a change. Conflating the two produces a "what has
 * changed" surface full of nothing, which is the precise failure PI-022 was
 * raised to avoid: most of what happens to this registry is a re-check of a
 * fact that did not move, and a surface that counted those would announce
 * activity and deliver no information. So the two come back in separate
 * buckets, from one pass, and `classifyClaimSince` will only ever put a claim
 * in one of them.
 *
 * WHERE A MOVED VALUE SHOWS UP IN THE DATA.
 *
 * A claim's `statement` is immutable by the registry's own contract: PI-005
 * models a moved value as a NEW claim carrying `supersedes`, never as an edit,
 * because superseding is additive and retirement is a state transition rather
 * than a deletion. So a value move is visible three ways, and this module
 * looks for all three:
 *
 *   1. a claim created in the window whose `supersedes` names this claim
 *   2. new evidence whose `legacy.value` differs from what an earlier row
 *      observed for the same field: the same source field, read again,
 *      reading differently
 *   3. evidence arriving with `stance: 'disputes'`, or a retirement
 *
 * The one thing it cannot see is a `statement` edited in place, because that
 * leaves no trace outside git. That is a violation of the registry contract
 * rather than a gap here, and saying so is cheaper than pretending otherwise.
 *
 * POINT IN TIME IS RECONSTRUCTED, NEVER STORED.
 *
 * Derived state is never persisted in this codebase (see claim-state.mjs: "a
 * migration every time the calendar moved"). So there is no changelog table
 * and this module writes nothing. It reconstructs the past instead, which the
 * registry supports precisely because it is append-only: an expired row stays
 * on disk with its dates, a superseded row stays, a retired claim stays. The
 * state as at any past date is therefore the state derived from the rows that
 * had been retrieved by then, and `claimStateAt` is that and nothing more. It
 * does not re-derive supported/unsupported/disputed/retired; it asks
 * claim-state.mjs, which remains the only place those four words are computed.
 *
 * House rules: no em-dashes, no exclamation marks, no figures.
 */

import {
  deriveClaimState,
  indexEvidenceByClaim,
  toDate,
  toIsoDay,
} from './claim-state.mjs';

/**
 * What kind of change an entry reports. These are machine labels for the
 * editorial layer to route on. None of them is reader copy.
 */
export const CHANGE_KINDS = Object.freeze([
  'claim-verified',       // we now stand behind something we never did before
  'claim-value-changed',  // the fact moved: superseded, or read again differently
  'claim-disputed',       // sources started disagreeing
  'claim-withdrawn',      // the claim was retired
  'claim-lapsed',         // nothing moved; our evidence aged out
  'event-added',
  'event-cancelled',
  'event-postponed',
  'venue-opened',
  'venue-closed',
]);

/** The bucket that is deliberately NOT a change. One kind, by design. */
export const REASSURANCE_KINDS = Object.freeze(['claim-reverified']);

/**
 * The second axis, and the one an editorial decision will actually turn on.
 *
 *   value        the fact a reader is told moved
 *   arrival      something exists now that did not exist before
 *   confidence   the fact did not move; our evidence position did
 *   reassurance  re-checked, same value. Never a change.
 *
 * Kept as a field rather than baked into a filter because which natures earn
 * a place in a returning-reader surface is exactly the editorial call this
 * module refuses to make.
 */
export const NATURES = Object.freeze(['value', 'arrival', 'confidence', 'reassurance']);

const KIND_NATURE = Object.freeze({
  'claim-verified': 'arrival',
  'claim-value-changed': 'value',
  'claim-disputed': 'value',
  'claim-withdrawn': 'value',
  'claim-lapsed': 'confidence',
  'claim-reverified': 'reassurance',
  'event-added': 'arrival',
  'event-cancelled': 'value',
  'event-postponed': 'value',
  'venue-opened': 'arrival',
  'venue-closed': 'value',
});

/**
 * Severity order, used to pick ONE entry per claim. A claim that was both
 * superseded and disputed in the same window is one thing that happened to a
 * reader, not two, and counting it twice would inflate any surface built on
 * this. Lower sorts first.
 */
const KIND_RANK = Object.freeze({
  'claim-withdrawn': 0,
  'claim-value-changed': 1,
  'claim-disputed': 2,
  'claim-verified': 3,
  'claim-lapsed': 4,
  'claim-reverified': 5,
});

const supportsRow = (row) => (row?.stance ?? 'supports') === 'supports';

/** Strictly after `since`, on or before `now`. A date equal to `since` was already known. */
function inWindow(value, since, now) {
  const d = toDate(value);
  if (!d) return false;
  return d.getTime() > since.getTime() && d.getTime() <= now.getTime();
}

function knownBy(value, at) {
  const d = toDate(value);
  return d ? d.getTime() <= at.getTime() : false;
}

/**
 * The evidence set as it stood on a given day.
 *
 * Two things are undone, and only two. A row retrieved after `at` did not
 * exist yet, so it is dropped. A supersession recorded by a row that did not
 * exist yet had not happened yet, so the `supersededBy` pointer is cleared
 * rather than honoured. Expiry needs no unwinding: it is a function of
 * `expiresAt` against the date being asked about, and claim-state.mjs already
 * takes that date.
 */
export function evidenceKnownAt(rows, at) {
  const when = toDate(at) ?? new Date();
  const known = (rows ?? []).filter((row) => knownBy(row?.retrievedAt, when));
  const ids = new Set(known.map((row) => row?.evidenceId).filter(Boolean));
  return known.map((row) =>
    row?.supersededBy && !ids.has(row.supersededBy) ? { ...row, supersededBy: undefined } : row
  );
}

/**
 * The claim's state as at a date, or 'absent' when the claim had not been
 * created yet. 'absent' is a fifth word that claim-state.mjs deliberately does
 * not have, because a claim that does not exist has no state; it is needed
 * here only to tell a first verification apart from a re-established one.
 */
export function claimStateAt(claim, rows, { at, precedence } = {}) {
  const when = toDate(at) ?? new Date();
  if (!knownBy(claim?.createdAt, when)) return 'absent';
  return deriveClaimState(claim, evidenceKnownAt(rows, when), { now: when, precedence });
}

/**
 * What each evidence row observed, as a field-to-value map drawn from
 * `legacy`. This is an observation the row recorded, not derived state, and it
 * is the only place the corpus records the VALUE a source carried rather than
 * the fact that a source was read.
 */
export function observedValues(rows) {
  const byField = new Map();
  for (const row of rows ?? []) {
    const field = row?.legacy?.field;
    const value = row?.legacy?.value;
    if (!field || value == null) continue;
    if (!byField.has(field)) byField.set(field, new Set());
    byField.get(field).add(String(value));
  }
  return byField;
}

/**
 * Did a re-read of the same field come back different?
 *
 * Only fields present on BOTH sides are compared. A newly recorded field is
 * not a value that moved, it is a value we did not have, and treating the two
 * alike is how a "what has changed" surface fills up with nothing.
 */
export function observedValueMoved(priorRows, newRows) {
  const before = observedValues(priorRows);
  const after = observedValues(newRows);
  for (const [field, values] of after) {
    const was = before.get(field);
    if (!was) continue;
    for (const value of values) if (!was.has(value)) return true;
  }
  return false;
}

const isoOrNull = (value) => toIsoDay(value);

const newest = (values) => {
  const days = (values ?? []).map(isoOrNull).filter(Boolean).sort();
  return days.length ? days[days.length - 1] : null;
};

/**
 * Classify what happened to ONE claim across the window, as at most one entry.
 *
 * This is the function the whole module is about, and the rule it encodes is
 * the rule PI-022 turns on:
 *
 *   new supporting evidence + a value that did not move  ->  reassurance
 *   new supporting evidence + a value that did move      ->  change
 *
 * Returns null when nothing worth reporting happened, which is the common case
 * and must stay the common case.
 */
export function classifyClaimSince(claim, rows, { since, now, precedence, supersededByClaim } = {}) {
  const from = toDate(since);
  const at = toDate(now) ?? new Date();
  if (!from || !claim?.claimId) return null;

  const all = rows ?? [];
  const prior = all.filter((row) => knownBy(row?.retrievedAt, from));
  const fresh = all.filter((row) => inWindow(row?.retrievedAt, from, at));
  const freshSupport = fresh.filter(supportsRow);
  const freshDisputes = fresh.filter((row) => !supportsRow(row));

  const before = claimStateAt(claim, all, { at: from, precedence });
  const after = claimStateAt(claim, all, { at, precedence });

  const base = {
    subject: { type: claim.subject?.type ?? null, slug: claim.subject?.slug ?? null },
    claimId: claim.claimId,
    claimClass: claim.claimClass ?? null,
    statement: claim.statement ?? null,
    previousStatement: null,
  };

  const entry = (kind, when, detail, extra = {}) => ({
    kind,
    nature: KIND_NATURE[kind],
    ...base,
    ...extra,
    at: isoOrNull(when),
    detail,
  });

  // 1. Withdrawn. A retirement in the window outranks everything else that
  //    happened to the claim, because there is nothing left to say about it.
  if (after === 'retired' && before !== 'retired' && inWindow(claim.retiredAt, from, at)) {
    return entry('claim-withdrawn', claim.retiredAt, claim.retiredReason ?? 'claim retired');
  }

  // 2. The value moved. Superseding claim first, because it carries the new
  //    statement; a re-read that came back different second. Neither applies
  //    to a claim that did not exist at `since`: a value cannot have moved
  //    away from something a reader was never told.
  const existed = before !== 'absent';
  const successor = supersededByClaim ?? null;
  if (existed && successor && inWindow(successor.createdAt, from, at)) {
    return entry('claim-value-changed', successor.createdAt, 'superseded by a later claim', {
      statement: successor.statement ?? null,
      previousStatement: claim.statement ?? null,
      supersededBy: successor.claimId ?? null,
    });
  }
  if (existed && freshSupport.length > 0 && observedValueMoved(prior, freshSupport)) {
    return entry(
      'claim-value-changed',
      newest(freshSupport.map((row) => row.retrievedAt)),
      'source re-read and the recorded value differs'
    );
  }

  // 3. Sources started disagreeing.
  if (after === 'disputed' && before !== 'disputed') {
    return entry(
      'claim-disputed',
      newest(freshDisputes.map((row) => row.retrievedAt)) ?? newest(fresh.map((row) => row.retrievedAt)),
      'live evidence now disagrees'
    );
  }

  // 4. First verification. "First" is measured against whether ANY supporting
  //    evidence was on file at `since`, not against whether any was still
  //    live. A claim that lapsed and was re-checked has not been verified for
  //    the first time; it has been re-verified, and that is case 6.
  //
  //    A claim that did not exist at `since` is always a first verification,
  //    however old its evidence is. The migration seeded rows carrying dates
  //    the corpus already held, some of them years old, onto claims created on
  //    the day of the seed; reading those as re-verifications would reassure a
  //    reader about something we had never told them.
  const hadSupportOnFile = before !== 'absent' && prior.some(supportsRow);
  if (after === 'supported' && !hadSupportOnFile) {
    return entry(
      'claim-verified',
      newest(freshSupport.map((row) => row.retrievedAt)) ?? claim.createdAt,
      before === 'absent' ? 'claim created and verified' : 'first supporting evidence on file'
    );
  }

  // 5. Lapsed. Nothing about the fact moved; our position on it did.
  if (before === 'supported' && after === 'unsupported') {
    return entry(
      'claim-lapsed',
      newest(prior.filter(supportsRow).map((row) => row.expiresAt)),
      'every supporting source has expired'
    );
  }

  // 6. Re-verified, same value. The reassurance, and the reason this module
  //    exists. It is returned so a caller can COUNT it, and bucketed so a
  //    caller cannot accidentally publish it as news.
  if (after === 'supported' && freshSupport.length > 0) {
    return entry(
      'claim-reverified',
      newest(freshSupport.map((row) => row.retrievedAt)),
      'source re-read and the value still stands'
    );
  }

  return null;
}

/**
 * Lifecycle changes carried by the content records themselves.
 *
 * Every date read here is a date an editor wrote onto the record, never an
 * mtime and never a build stamp. `publishedAt` is when the record appeared on
 * the site rather than when a door opened in the world, and the kind names say
 * published rather than opened for exactly that reason.
 */
export function classifyRecordSince(record, { since, now } = {}) {
  const from = toDate(since);
  const at = toDate(now) ?? new Date();
  if (!from || !record) return null;
  const data = record.data ?? record;
  const subject = { type: record.type ?? null, slug: record.slug ?? data?.slug ?? null };

  const entry = (kind, when, detail) => ({
    kind,
    nature: KIND_NATURE[kind],
    subject,
    claimId: null,
    claimClass: null,
    statement: data?.name ?? data?.title ?? subject.slug ?? null,
    previousStatement: null,
    at: isoOrNull(when),
    detail,
  });

  if (record.type === 'events') {
    if (data?.cancelled === true && inWindow(data?.cancelledOn, from, at)) {
      return entry('event-cancelled', data.cancelledOn, 'event cancelled');
    }
    if (data?.postponed === true && inWindow(data?.postponedOn, from, at)) {
      return entry('event-postponed', data.postponedOn, 'event postponed');
    }
    // An event that appeared and was then delisted is not an arrival a reader
    // can act on, so a record has to still be publishable to count as one.
    const expires = toDate(data?.expiresAt);
    const listed =
      String(data?.status ?? 'published') === 'published' &&
      data?.cancelled !== true &&
      !(expires && expires.getTime() < at.getTime());
    if (listed && inWindow(data?.publishedAt, from, at)) {
      return entry('event-added', data.publishedAt, 'event published');
    }
    return null;
  }

  if (record.type === 'venues') {
    const closed =
      data?.operatingStatus === 'permanently-closed' ||
      data?.status === 'closed' ||
      data?.status === 'permanently_closed';
    if (closed && inWindow(data?.closedDate, from, at)) {
      return entry('venue-closed', data.closedDate, 'venue recorded closed');
    }
    if (!closed && String(data?.status ?? 'active') === 'active' && inWindow(data?.publishedAt, from, at)) {
      return entry('venue-opened', data.publishedAt, 'venue published');
    }
    return null;
  }

  return null;
}

/** Astro entries, or plain objects, or a corpus Map. All three end up the same shape. */
function normaliseClaims(claims) {
  return [...(claims ?? [])].map((entry) => entry?.data ?? entry).filter((claim) => claim?.claimId);
}

function normaliseEvidence(evidence) {
  return [...(evidence ?? [])].map((entry) => entry?.data ?? entry).filter(Boolean);
}

function normaliseRecords(records) {
  if (!records) return [];
  const list = records instanceof Map ? [...records.values()] : [...records];
  return list.filter((record) => record?.type);
}

/**
 * Turn Astro collections into the record shape this module reads. Exported so
 * a page can call it rather than reinventing the mapping, and so the mapping
 * is asserted in one place.
 */
export function recordsFromCollections({ events = [], venues = [] } = {}) {
  const shape = (type) => (entry) => ({
    type,
    slug: entry?.data?.slug ?? entry?.id ?? entry?.slug ?? null,
    data: entry?.data ?? entry,
  });
  return [...events.map(shape('events')), ...venues.map(shape('venues'))];
}

const subjectKeyOf = (entry) => `${entry?.subject?.type}/${entry?.subject?.slug}`;

const sortEntries = (a, b) => {
  if (a.at !== b.at) return String(b.at ?? '').localeCompare(String(a.at ?? ''));
  const rank = (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9);
  if (rank !== 0) return rank;
  return subjectKeyOf(a).localeCompare(subjectKeyOf(b));
};

const tally = (entries, key) =>
  entries.reduce((acc, item) => ((acc[item[key]] = (acc[item[key]] ?? 0) + 1), acc), {});

/**
 * Everything that materially changed after `since`, and separately everything
 * that was merely re-confirmed.
 *
 * Inputs are the collections and the precedence table, passed in. This module
 * does no IO: a build-time caller passes getCollection results, a script
 * passes what verification-loop/corpus.mjs already loaded, and a test passes
 * fixtures. That is also why it cannot accidentally persist anything.
 *
 * `now` exists so every caller and every test can pin the calendar. A gate
 * whose result moves on a day nobody chose is a failure this repo has written
 * down more than once.
 */
export function materialChangesSince({
  since,
  now,
  claims = [],
  evidence = [],
  records = [],
  precedence,
} = {}) {
  const from = toDate(since);
  const at = toDate(now) ?? new Date();
  if (!from) throw new Error(`materialChangesSince needs a since date, got: ${since}`);

  const claimRows = normaliseClaims(claims);
  const evidenceRows = normaliseEvidence(evidence);
  const byClaim = indexEvidenceByClaim(evidenceRows);

  const successors = new Map();
  for (const claim of claimRows) {
    if (claim.supersedes) successors.set(claim.supersedes, claim);
  }

  const changes = [];
  const reassurances = [];

  for (const claim of claimRows) {
    const found = classifyClaimSince(claim, byClaim.get(claim.claimId) ?? [], {
      since: from,
      now: at,
      precedence,
      supersededByClaim: successors.get(claim.claimId) ?? null,
    });
    if (!found) continue;
    (found.nature === 'reassurance' ? reassurances : changes).push(found);
  }

  for (const record of normaliseRecords(records)) {
    const found = classifyRecordSince(record, { since: from, now: at });
    if (found) changes.push(found);
  }

  changes.sort(sortEntries);
  reassurances.sort(sortEntries);

  return {
    since: toIsoDay(from),
    now: toIsoDay(at),
    changes,
    reassurances,
    counts: {
      changes: changes.length,
      reassurances: reassurances.length,
      byKind: tally(changes, 'kind'),
      byNature: tally(changes, 'nature'),
    },
  };
}
