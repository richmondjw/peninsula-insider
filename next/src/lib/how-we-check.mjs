/**
 * how-we-check.mjs  -  PI-014, the derived half of the public method page.
 *
 * /how-we-check/ tells a reader how this publication decides what a fact is:
 * what counts as a source, who wins when two sources disagree, how long a
 * fact stays good, and what the page does when it stops being good. Every one
 * of those answers already exists in code and in data, and the page is only
 * credible if it is the SAME answer.
 *
 * So nothing on that page about the mechanism is typed by hand. The source
 * order comes out of src/data/source-precedence.json, the re-check intervals
 * come out of the same file, and the standing of the record comes out of the
 * claim and evidence corpus read through src/lib/claim-state.mjs, which stays
 * the only place a fact's standing is worked out. Reorder the table and the
 * page reorders. Add a kind of fact and the page grows a row. The one thing
 * that cannot happen is the page going on saying something the code stopped
 * doing, which on a page about verification would be the worst possible
 * defect: an unchecked claim about checking.
 *
 * WHAT THIS MODULE WILL NOT DO.
 *
 * It will not soften a number. The corpus is in the state it is in: most of
 * what is on file was carried over from what records already said rather than
 * freshly confirmed, most of it is past its re-check date, and whole parts of
 * the site have nothing on file at all. Those are returned as counts, the
 * page publishes them, and they move on their own as the calendar moves. A
 * rounded-up adjective would have to be re-earned every day by a person, and
 * would not be.
 *
 * READER WORDS, NOT MACHINE WORDS. The corpus names a source kind
 * 'regional-body' and a fact kind 'trading-status'. A reader is owed English.
 * PUBLISHER_LABELS is the whole translation layer, and how-we-check.test.mjs
 * fails the build if a kind reaches the page without one, so a new kind
 * cannot ship as a raw token.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import {
  deriveClaimState,
  indexEvidenceByClaim,
  isExpired,
  publisherRank,
  toDate,
} from './claim-state.mjs';

/**
 * Every publisher kind in plain English, in the reader's terms rather than
 * ours. Keyed by the value that appears on disk.
 *
 * 'unknown' is the one that matters most. It is a real, common value: it
 * means the fact was carried over from an older record that never said where
 * it came from. Labelling it honestly is the difference between a record and
 * a performance of one.
 */
export const PUBLISHER_LABELS = Object.freeze({
  'venue-site': 'The business, on its own website',
  phone: 'The business, by phone',
  email: 'The business, by email',
  visit: 'Our own notes from being there',
  press: 'A news report',
  social: 'The business, on its own social account',
  gov: 'A government or public authority',
  partner: 'A commercial partner of this publication',
  organiser: 'The people running the event',
  ticketing: 'The ticket seller',
  'regional-body': 'A tourism board or industry association',
  importer: 'An automatic sweep of public listings',
  unknown: 'Not recorded',
});

/**
 * Round intervals into the words a person uses. The fallback is deliberate:
 * an interval nobody anticipated comes out as a plain number of days rather
 * than as nothing, so a table edit can never empty a cell on the page.
 */
const INTERVAL_WORDS = Object.freeze({
  7: 'a week',
  14: 'a fortnight',
  30: 'a month',
  60: 'two months',
  90: 'three months',
  120: 'four months',
  180: 'six months',
  365: 'a year',
});

export function intervalInWords(days) {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return null;
  return INTERVAL_WORDS[days] ?? days + ' days';
}

/**
 * How many of the leading sources to name in the table. Three is the point
 * where the column stops being readable, and the full order is in the data
 * for anyone who wants it.
 */
const LEAD_SOURCES = 3;

/**
 * One row per kind of fact, ordered most perishable first.
 *
 * Ordering by re-check interval rather than alphabetically is an editorial
 * call and a derived one: it puts today's tide and this weekend's event at
 * the top, where a reader planning a visit is looking, and it re-sorts itself
 * if an interval is ever changed.
 */
export function factKinds(precedence) {
  const classes = precedence?.classes ?? {};
  return Object.entries(classes)
    .map(([id, entry]) => {
      const order = entry?.precedence ?? [];
      const days = entry?.expiryDays ?? precedence?.defaultExpiryDays;
      return {
        id,
        /** The table's own label. Kept there so one edit moves both. */
        label: entry?.label ?? id,
        /** Who is believed first, in order, in reader words. */
        leadSources: order.slice(0, LEAD_SOURCES).map(labelFor),
        /** The whole order, for anything that wants it. */
        sourceOrder: order.slice(),
        recheckDays: days,
        recheck: intervalInWords(days),
      };
    })
    .sort((a, b) => (a.recheckDays ?? 0) - (b.recheckDays ?? 0) || a.id.localeCompare(b.id));
}

/** Reader words for one publisher kind. Never returns a raw token. */
export function labelFor(kind) {
  return PUBLISHER_LABELS[kind] ?? PUBLISHER_LABELS.unknown;
}

/**
 * The kinds of source that can be recorded at all, in the order the table
 * lists them, with 'unknown' moved to the end where it belongs in prose: it
 * is the absence of a source, not one of them.
 */
export function sourceKinds(precedence) {
  const kinds = (precedence?.publisherKinds ?? []).filter((k) => k !== 'unknown');
  return [...kinds, 'unknown'].map((kind) => ({ kind, label: labelFor(kind) }));
}

/**
 * A worked example of precedence, derived rather than asserted.
 *
 * The page needs to show a reader what "one source outranks another" means,
 * and a hand-written example is a claim that can quietly stop being true.
 * This reads the pair back out of the table and returns null if the ordering
 * it wants to illustrate is no longer there, so the page loses a paragraph
 * rather than publishing a falsehood.
 */
export function precedenceExample(precedence, { claimClass = 'event-status', over = 'ticketing' } = {}) {
  const entry = precedence?.classes?.[claimClass];
  const order = entry?.precedence ?? [];
  const winner = order[0];
  if (!winner || !order.includes(over)) return null;
  if (publisherRank(winner, claimClass, precedence) >= publisherRank(over, claimClass, precedence)) {
    return null;
  }
  return {
    claimClass,
    label: entry?.label ?? claimClass,
    winner,
    winnerLabel: labelFor(winner),
    loser: over,
    loserLabel: labelFor(over),
  };
}

/**
 * Which part of the site a subject type belongs to, in reader words. The
 * corpus names a directory; a reader knows the thing.
 *
 * A type with no entry here is still counted and still shown, under its own
 * name, because silently dropping a part of the site from a coverage figure
 * would be the exact dishonesty this page exists to avoid.
 */
export const AREA_LABELS = Object.freeze({
  events: "What's on",
  'signature-events': 'The big annual events',
  'quick-notes': 'Short notes from the week',
  venues: 'Places to eat, drink and stay',
  experiences: 'Things to do',
  places: 'Towns and villages',
  regions: 'Parts of the Peninsula',
  species: 'Fish and what you may catch',
  'fishing-locations': 'Fishing spots',
  'fishing-charters': 'Fishing charters',
  'boat-ramps': 'Boat ramps',
  'boat-hire': 'Boat hire',
  tours: 'Tours',
  'tour-operators': 'Tour operators',
  'tour-packages': 'Tour packages',
  articles: 'Guides and journal pieces',
  itineraries: 'Planned days out',
  'weekend-picks': 'Weekend picks',
  'insiders-thirty': 'The Insiders Thirty',
  'local-secrets': 'Local secrets',
  'daily-insights': 'Daily notes',
  'data-facts': 'Background facts about the region',
});

/**
 * Directories that are not a body of reader-facing entries: the record
 * itself, and the reusable blocks and bylines that assemble other pages.
 * Excluded from coverage so the figure counts things a reader can open.
 */
export const INTERNAL_TYPES = Object.freeze(['claims', 'evidence', 'authors', 'editorial_blocks']);

export function areaLabel(type) {
  return AREA_LABELS[type] ?? type;
}

/**
 * What the record actually holds, as at `now`.
 *
 * Counts only. No adjective, no threshold and no verdict: which of these
 * numbers is acceptable is an editorial judgement, and this module has no
 * business making it. `standing` comes from claim-state.mjs rather than from
 * a second opinion computed here.
 */
export function recordStanding(claims, evidence, { now, precedence } = {}) {
  const at = toDate(now) ?? new Date();
  const rows = (evidence ?? []).map((entry) => entry?.data ?? entry);
  const facts = (claims ?? []).map((entry) => entry?.data ?? entry);
  const byClaim = indexEvidenceByClaim(rows);

  let current = 0;
  let lapsed = 0;
  let replaced = 0;
  let disagreeing = 0;
  for (const row of rows) {
    if (row?.supersededBy) replaced += 1;
    else if (isExpired(row, at)) lapsed += 1;
    else current += 1;
    if (row?.stance === 'disputes') disagreeing += 1;
  }

  let disputed = 0;
  let retired = 0;
  let carriedOver = 0;
  const areas = new Map();
  for (const fact of facts) {
    const state = deriveClaimState(fact, byClaim.get(fact?.claimId) ?? [], { now: at, precedence });
    if (state === 'disputed') disputed += 1;
    if (state === 'retired') retired += 1;
    if ((fact?.origin ?? 'authored') === 'migrated') carriedOver += 1;

    const type = fact?.subject?.type;
    if (!type) continue;
    if (!areas.has(type)) areas.set(type, { type, label: areaLabel(type), facts: 0, subjects: new Set() });
    const area = areas.get(type);
    area.facts += 1;
    if (fact?.subject?.slug) area.subjects.add(fact.subject.slug);
  }

  return {
    facts: facts.length,
    sources: rows.length,
    current,
    lapsed,
    replaced,
    disagreeing,
    disputed,
    retired,
    carriedOver,
    areas: [...areas.values()]
      .map((a) => ({ type: a.type, label: a.label, facts: a.facts, subjects: a.subjects.size }))
      .sort((a, b) => b.facts - a.facts || a.type.localeCompare(b.type)),
  };
}

/**
 * Coverage, part of the site by part of the site.
 *
 * `sizes` is the entry count per content directory, read off the corpus by
 * the caller. This is the table that makes the page honest: a part of the
 * site with many entries and almost no sources on file says so in its own
 * row, and keeps saying so until somebody does the work. A prose summary of
 * the same thing would go stale the first time anyone else touched the
 * corpus, which is the failure this whole module is arranged against.
 *
 * Entries the record has never reached are included with a zero rather than
 * omitted. Dropping them would turn this into a report on its own best work.
 */
export function coverageByArea(standing, sizes) {
  const bySubjectType = new Map((standing?.areas ?? []).map((a) => [a.type, a]));
  const rows = [];
  for (const [type, records] of Object.entries(sizes ?? {})) {
    if (!records || INTERNAL_TYPES.includes(type)) continue;
    const area = bySubjectType.get(type);
    rows.push({
      type,
      label: areaLabel(type),
      records,
      withSources: area?.subjects ?? 0,
      facts: area?.facts ?? 0,
    });
  }
  // Types held in the record that have no directory of their own, such as the
  // background facts, still belong in the table.
  for (const area of standing?.areas ?? []) {
    if (rows.some((row) => row.type === area.type)) continue;
    if (INTERNAL_TYPES.includes(area.type)) continue;
    rows.push({
      type: area.type,
      label: area.label,
      records: area.subjects,
      withSources: area.subjects,
      facts: area.facts,
    });
  }
  return rows.sort((a, b) => b.records - a.records || a.type.localeCompare(b.type));
}

/** Plain plural, so the page reads as a sentence rather than as a form. */
export function plural(count, one, many) {
  return count === 1 ? one : (many ?? one + 's');
}
