/**
 * reconcile.mjs - set the licences file against the image records and say,
 * field by field, which of them knows anything and whether they agree.
 *
 * WHAT A RECONCILIATION IS FOR
 * ----------------------------
 * There are two written statements about where this site's photographs came
 * from. One is public/images/sourced/LICENSES.md, which names a photographer,
 * a licence and an original URL. The other is the image records in
 * src/content, which carry a coarse `license` bucket and, on the provenance
 * fields added by PI-013, nothing at all.
 *
 * Three answers matter, and the third is the one people skip:
 *
 *   file-only   the file knows something the record does not. This is the
 *               backfill queue, and it is the cheerful case.
 *   conflict    both know something and they disagree. This is the important
 *               case, because a disagreement about a legal right means one of
 *               the two written statements is wrong, and until somebody says
 *               which, neither can be relied on. Every one is listed
 *               individually, never summarised.
 *   neither     nobody has recorded anything. Honest, and most of the corpus.
 *
 * WHAT THIS MODULE WILL NOT DO
 * ----------------------------
 * It does not decide. It produces a reading of two documents, and every
 * judgement it makes is a comparison of values that are already written down.
 * It never fills a gap from a neighbour, a filename, a credit string or an alt
 * text. `credit` in particular is display text and is excluded from every
 * comparison here, which is the discipline audit-media-provenance.mjs already
 * enforces on the gate side: a credit reading "Peninsula Insider" on a
 * third-party photograph is a formatting choice, not a rights claim.
 *
 * Pure: values in, findings out. No filesystem, no clock, no network.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

/**
 * The fields the file can speak to, in the order the report prints them.
 *
 * `depicts` is included but is never a rights field. The file's Source line is
 * a Wikimedia file title and a record's `depicts` is a written description of
 * the frame; the two say different kinds of thing about the same photograph,
 * so a difference between them is reported and is deliberately not counted as
 * a rights conflict.
 */
export const COMPARED_FIELDS = ['creator', 'sourceUrl', 'permission', 'license', 'depicts'];

/** Fields where a disagreement is a disagreement about a legal right. */
export const RIGHTS_FIELDS = new Set(['creator', 'sourceUrl', 'permission', 'license']);

/**
 * Licence buckets that assert no grant.
 *
 * `unknown` is the schema default and means nobody has said. `tmp-*` is an
 * admitted stand-in. `other-licensed` names a category and no actual grant.
 * A record holding one of these is not contradicting the file, it is confessing
 * that it does not know, which is a different finding and a much cheaper one
 * to resolve.
 */
export const NON_ASSERTING_LICENCES = new Set([
  'unknown',
  'other-licensed',
  'tmp-unsplash',
  'tmp-wikimedia',
  'tmp-pexels',
]);

const text = (value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);

/**
 * Compare one field.
 *
 * Verdicts:
 *   neither       nobody wrote anything down
 *   file-only     the file has a value, the record does not
 *   record-only   the record has a value, the file does not
 *   agree         both have the same value
 *   placeholder   both have a value, the record's names no grant, and the
 *                 file's does. Only reachable for `license`
 *   conflict      both have a value and they differ
 */
export function compareField(field, fileValue, recordValue) {
  const a = text(fileValue);
  const b = text(recordValue);
  if (a === null && b === null) return { field, file: null, record: null, verdict: 'neither' };
  if (b === null) return { field, file: a, record: null, verdict: 'file-only' };
  if (a === null) return { field, file: null, record: b, verdict: 'record-only' };
  if (a === b) return { field, file: a, record: b, verdict: 'agree' };
  if (field === 'license' && NON_ASSERTING_LICENCES.has(b)) {
    return { field, file: a, record: b, verdict: 'placeholder' };
  }
  return { field, file: a, record: b, verdict: 'conflict' };
}

/**
 * Reconcile one image record against the licences entry for its `src`, or
 * against nothing when the file does not cover it.
 *
 * The record-level verdict is the worst thing found on it, in this order:
 * conflict, placeholder, file-only, agree, record-only, neither. A record with
 * one conflicting field and four agreeing ones is a conflict, because the
 * conflicting one is the reason a person has to look.
 */
export function reconcileRecord(record, entry) {
  const image = record.image ?? {};
  const fields = COMPARED_FIELDS.map((field) =>
    compareField(field, entry ? entry[field === 'license' ? 'bucket' : field] : null, image[field])
  );

  const verdicts = new Set(fields.filter((f) => RIGHTS_FIELDS.has(f.field)).map((f) => f.verdict));
  const order = ['conflict', 'placeholder', 'file-only', 'agree', 'record-only', 'neither'];
  const verdict = order.find((v) => verdicts.has(v)) ?? 'neither';

  return {
    file: record.file,
    collection: record.collection,
    field: record.field,
    src: image.src ?? null,
    entry: entry ? entry.filename : null,
    verdict,
    fields,
    // Reported, never counted as a rights conflict. See COMPARED_FIELDS.
    depicts: fields.find((f) => f.field === 'depicts') ?? null,
  };
}

/**
 * Reconcile the whole corpus.
 *
 * Returns `{ rows, totals, conflicts, placeholders, fileOnly, neither,
 * unmatchedEntries, fileSelfConflicts }`.
 *
 * `unmatchedEntries` is the other direction of the same question: entries in
 * the file that no record uses. An entry naming rights for an image nothing
 * renders is not a defect, but it is the difference between what the file
 * covers and what the file can usefully answer, and a coverage number that
 * hides it overstates the file.
 *
 * `fileSelfConflicts` is the file disagreeing with itself: two entries citing
 * one original URL and naming different photographers or different licences.
 * The file is one document, so this cannot be resolved by preferring a source;
 * somebody has to read the original.
 */
export function reconcileCorpus({ records, entries }) {
  const bySrc = new Map(entries.map((entry) => [entry.src, entry]));
  const rows = records.map((record) => reconcileRecord(record, bySrc.get(record.image?.src) ?? null));

  const usedSrc = new Set(records.map((record) => record.image?.src));
  const unmatchedEntries = entries.filter((entry) => !usedSrc.has(entry.src));

  const bySourceUrl = new Map();
  for (const entry of entries) {
    if (!entry.sourceUrl) continue;
    if (!bySourceUrl.has(entry.sourceUrl)) bySourceUrl.set(entry.sourceUrl, []);
    bySourceUrl.get(entry.sourceUrl).push(entry);
  }
  const fileSelfConflicts = [];
  for (const [url, group] of bySourceUrl) {
    if (group.length < 2) continue;
    for (const field of ['creator', 'permission']) {
      const values = new Set(group.map((entry) => entry[field]));
      if (values.size > 1) {
        fileSelfConflicts.push({ sourceUrl: url, field, entries: group.map((e) => e.filename), values: [...values] });
      }
    }
  }

  const pick = (verdict) => rows.filter((row) => row.verdict === verdict);
  const totals = {
    imageRecords: rows.length,
    distinctSources: new Set(records.map((r) => r.image?.src)).size,
    licenceEntries: entries.length,
    entriesMatchingNoRecord: unmatchedEntries.length,
    recordsTheFileCanSpeakTo: rows.filter((row) => row.entry !== null).length,
    recordsTheFileCannot: rows.filter((row) => row.entry === null).length,
    fileOnly: pick('file-only').length,
    agree: pick('agree').length,
    conflict: pick('conflict').length,
    placeholder: pick('placeholder').length,
    recordOnly: pick('record-only').length,
    neither: pick('neither').length,
    fileSelfConflicts: fileSelfConflicts.length,
  };

  return {
    rows,
    totals,
    conflicts: pick('conflict'),
    placeholders: pick('placeholder'),
    fileOnly: pick('file-only'),
    neither: pick('neither'),
    unmatchedEntries,
    fileSelfConflicts,
  };
}

/**
 * How many entity records a single source image fronts.
 *
 * PI-013 opened on a finding from PR #421: a small number of photographs are
 * the hero of a large number of named entities, so a small number of rights
 * decisions would settle a large part of the corpus. This computes that
 * shape from the records rather than restating the number, because the corpus
 * has moved since and a restated number is a number nobody measured.
 */
export function sharedHeroes({ records, entries, collections }) {
  const covered = new Set(entries.map((entry) => entry.src));
  const wanted = new Set(collections);
  const byImage = new Map();
  for (const record of records) {
    if (!wanted.has(record.collection)) continue;
    const src = record.image?.src;
    if (!src) continue;
    if (!byImage.has(src)) byImage.set(src, new Set());
    byImage.get(src).add(record.file);
  }
  const shared = [...byImage.entries()]
    .filter(([, users]) => users.size > 1)
    .map(([src, users]) => ({ src, entities: users.size, covered: covered.has(src) }))
    .sort((a, b) => b.entities - a.entities || a.src.localeCompare(b.src));

  return {
    shared,
    totals: {
      distinctImages: byImage.size,
      sharedImages: shared.length,
      entitiesOnSharedImages: shared.reduce((sum, row) => sum + row.entities, 0),
      sharedImagesCovered: shared.filter((row) => row.covered).length,
      entitiesCovered: shared.filter((row) => row.covered).reduce((sum, row) => sum + row.entities, 0),
    },
  };
}
