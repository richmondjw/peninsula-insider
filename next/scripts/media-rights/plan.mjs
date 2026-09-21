/**
 * plan.mjs - the module that decides what would be written, and cannot write.
 *
 * WHY IT STOPS AT A PLAN
 * ----------------------
 * Writing a licence or a creator onto an image record is making a rights
 * claim, and a wrong one is a legal problem rather than a content problem.
 * Register item A15 is unresolved and James has not ruled on it. So this
 * ticket does not backfill rights; it makes the backfill possible, decidable
 * and safe, and the line between those two is this file.
 *
 * The shape is the one next/scripts/verification-loop/apply.mjs settled on and
 * for the same stated reason: the impossibility is structural, not policy.
 * This module imports nothing from node:fs. It has no parameter that could
 * carry a destination. There is no flag in it and no branch anybody can take.
 * It receives the text of a record and returns the text the record would have,
 * and the only thing that turns that into an edit is a person running the
 * apply command with --confirm. scripts/media-rights.test.mjs asserts the
 * no-filesystem property by reading this file's own source rather than by
 * trusting this comment.
 *
 * The diff, the style detection and the structural set are imported from
 * PI-006's apply.mjs rather than reimplemented. Two unified-diff writers in
 * one repository is two sets of off-by-one bugs, and that one is already
 * tested against the corpus.
 *
 * WHAT IT REFUSES, AND WHY EACH REFUSAL IS THERE
 * ---------------------------------------------
 * A refusal is a value, not an exception, so a caller working a queue can
 * report every one rather than stopping at the first.
 *
 *   no-entry                    LICENSES.md says nothing about this image.
 *   unprobed-source             the source URL has no row in the ledger.
 *                               Nobody has fetched it, so the citation is an
 *                               assertion. This is the rule the link-health
 *                               gate already enforces on the corpus, applied
 *                               before the write rather than after it.
 *   source-unreachable          the ledger says the source did not answer.
 *   source-contradicts-file     the source names a different grant from the
 *                               one the file wrote down. One of them is
 *                               wrong; a machine may not pick.
 *   licence-not-established     the source named no licence this probe could
 *                               read. Absence of evidence, and the honest
 *                               response to it is to write nothing.
 *   creator-not-corroborated    the source does not corroborate the
 *                               photographer the file names. Attribution is
 *                               the condition of every CC-BY grant here, so a
 *                               name nobody has confirmed is the one field
 *                               that must never be guessed.
 *   no-bucket                   the file's licence line maps to no value of
 *                               the schema enum.
 *   record-holds-another-grant  the record already names a specific grant and
 *                               it is not this one. A conflict about a legal
 *                               right, for a person.
 *   rights-already-recorded     the record says its rights are recorded. An
 *                               established right is never overwritten by a
 *                               batch.
 *   nothing-to-write            every field this would set is already set.
 *   unreadable-record           the record could not be read as its own format.
 *
 * WHAT IT WRITES, AND THE ONE DATE RULE
 * -------------------------------------
 * creator, sourceUrl, permission, depicts and the coarse license bucket, each
 * only where the record has nothing, plus rightsStatus: recorded and
 * rightsEstablishedOn.
 *
 * `rightsEstablishedOn` is the date of the HUMAN CHECK, passed in by the
 * caller, and never the date on the licences file and never a clock. The point
 * of the field is knowing when a person last confirmed the right, so a date
 * copied off an April file heading would record a check that did not happen,
 * and a date read from Date.now() would record the machine's convenience as a
 * person's diligence. There is no default: a caller that does not supply one
 * gets a refusal.
 *
 * `permittedUses` is deliberately never written. Deciding which channels a
 * CC-BY-SA grant covers for a commercial publication is a legal judgement, and
 * an empty list already means unrecorded rather than forbidden.
 *
 * `depictionStatus` is never written either. Whether a photograph shows the
 * entity is a different claim from who took it, and a rights backfill has no
 * standing to answer it.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import { styleOf, serialiseRecord, unifiedDiff, segmentsOf, valueAt, withValueAt } from '../verification-loop/apply.mjs';

/** A refusal is a value. */
function refusal(code, why) {
  return { ok: false, code, why };
}

/** Buckets that assert no grant, and so may be replaced by one that does. */
export const REPLACEABLE_LICENCES = new Set([
  'unknown',
  'other-licensed',
  'tmp-unsplash',
  'tmp-wikimedia',
  'tmp-pexels',
]);

/** The shape a rights date must take. A format check, never a freshness one. */
export const RIGHTS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const filled = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * The fields an entry would set on a record, in the order they are written.
 *
 * Returns `{ ok: true, writes }` or a refusal. `writes` is
 * `[{ field, from, to }]` and may be empty, which the caller reads as
 * nothing-to-write.
 */
export function planFields({ image, entry, ledgerRow, checkedOn }) {
  if (!entry) return refusal('no-entry', 'the licences file says nothing about this image');
  if (!filled(checkedOn) || !RIGHTS_DATE_RE.test(checkedOn)) {
    return refusal(
      'no-check-date',
      'a rights date is the date a person checked, so it has to be supplied. There is no default ' +
        'and nothing here reads a clock.'
    );
  }

  if (!ledgerRow) {
    return refusal(
      'unprobed-source',
      `nothing has fetched ${entry.sourceUrl ?? 'the source'}, so the citation is an assertion. ` +
        'Run scripts/probe-image-rights-sources.mjs and commit the ledger.'
    );
  }
  if (ledgerRow.verdict !== 'ok') {
    return refusal('source-unreachable', `the ledger records this source as ${ledgerRow.verdict}`);
  }
  if (ledgerRow.licenceAgrees === 'differs') {
    return refusal(
      'source-contradicts-file',
      `the file says ${entry.permission} and the source says ${ledgerRow.sourceLicence}. One of the ` +
        'two is wrong and a machine may not choose between them.'
    );
  }
  if (ledgerRow.licenceAgrees !== 'matches') {
    return refusal(
      'licence-not-established',
      'the source named no licence this probe could read, so nothing about its terms is established'
    );
  }
  if (ledgerRow.creatorAgrees === 'not-established') {
    return refusal(
      'creator-not-corroborated',
      `the file names ${entry.creator ?? 'nobody'} and the source names ` +
        `${ledgerRow.sourceCreator ?? 'nobody'}. Attribution is the condition of this grant, so the ` +
        'name is the one field that must never be guessed.'
    );
  }
  if (entry.bucket === null || entry.bucket === undefined) {
    return refusal('no-bucket', `${entry.permission} maps to no value of the schema licence enum`);
  }

  const held = filled(image.license) ? image.license.trim() : null;
  if (held !== null && held !== entry.bucket && !REPLACEABLE_LICENCES.has(held)) {
    return refusal(
      'record-holds-another-grant',
      `the record says ${held} and the file says ${entry.bucket}. That is a conflict about a legal ` +
        'right, and it is a person to resolve it.'
    );
  }
  if (filled(image.rightsStatus) && image.rightsStatus.trim() === 'recorded') {
    return refusal('rights-already-recorded', 'this record already states that its rights are recorded');
  }

  const writes = [];
  const set = (field, to) => {
    const from = image[field] === undefined ? null : image[field];
    if (to === null || to === undefined) return;
    if (String(from ?? '') === String(to)) return;
    writes.push({ field, from: from ?? null, to });
  };

  // Only ever into an empty field. Somebody may have corrected one of these by
  // hand, and a batch that overwrote a correction would be the worst kind of
  // regression: silent, plausible and about a legal right.
  if (!filled(image.creator)) set('creator', entry.creator);
  if (!filled(image.sourceUrl)) set('sourceUrl', entry.sourceUrl);
  if (!filled(image.permission)) set('permission', entry.permission);
  if (!filled(image.depicts)) set('depicts', entry.depicts);
  if (held === null || REPLACEABLE_LICENCES.has(held)) set('license', entry.bucket);

  if (writes.length === 0) {
    return refusal('nothing-to-write', 'every field this would set is already set on the record');
  }

  set('rightsStatus', 'recorded');
  set('rightsEstablishedOn', checkedOn);

  return { ok: true, writes };
}

/* ------------------------------------------------------------------ */
/* Turning writes into text                                            */
/* ------------------------------------------------------------------ */

/**
 * Quote a value for YAML the way this corpus already writes them.
 *
 * Every imageRef scalar in src/content is double-quoted, so matching that is
 * both correct and invisible in a diff. The escaping is the minimum YAML
 * double-quoted style requires: backslash and double quote.
 */
export function yamlScalar(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Apply writes to an imageRef block inside Markdown frontmatter.
 *
 * Line-based on purpose. Re-emitting the frontmatter through a YAML serialiser
 * would reflow quoting, key order and multi-line strings across the whole
 * document, and a patch that rewrites a file to change two fields is a patch
 * nobody reads. So: find the block, replace the lines whose key is being set,
 * append the ones that are new after the block's last line, and leave every
 * other byte alone.
 *
 * Returns the new text, or null when the named block cannot be found.
 */
export function writeIntoFrontmatter(text, blockName, writes) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;

  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const head = text.slice(0, end);
  const tail = text.slice(end);
  const lines = head.split(/\r?\n/);

  let start = -1;
  let indent = 0;
  for (const [i, line] of lines.entries()) {
    const header = line.match(/^(\s*)([A-Za-z0-9_]+):\s*$/);
    if (header && header[2] === blockName) {
      start = i;
      indent = header[1].length;
      break;
    }
  }
  if (start === -1) return null;

  let last = start;
  const childIndex = new Map();
  for (let j = start + 1; j < lines.length; j += 1) {
    const field = lines[j].match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field || field[1].length <= indent) break;
    childIndex.set(field[2], j);
    last = j;
  }
  if (last === start) return null; // an empty block is not an imageRef

  const childIndent = lines[start + 1].match(/^(\s*)/)[1];
  const out = lines.slice();
  const appended = [];
  for (const write of writes) {
    const rendered = `${childIndent}${write.field}: ${yamlScalar(write.to)}`;
    if (childIndex.has(write.field)) out[childIndex.get(write.field)] = rendered;
    else appended.push(rendered);
  }
  out.splice(last + 1, 0, ...appended);

  return out.join(eol) + tail;
}

/**
 * Apply writes to an imageRef inside a JSON record, addressed by the field
 * path the corpus reader produced, for example `images[0]` or `heroImage`.
 */
export function writeIntoJson(text, fieldPath, writes) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const base = fieldPath === '(root)' ? [] : segmentsOf(fieldPath);
  if (base === null && fieldPath !== '(root)') return null;

  let next = data;
  for (const write of writes) {
    const segments = [...(base ?? []), write.field];
    if (valueAt(next, segments.slice(0, -1)) === undefined) return null;
    next = withValueAt(next, segments, write.to);
  }
  return serialiseRecord(next, styleOf(text));
}

/**
 * Plan one record end to end: the writes, the text before, the text after and
 * a unified diff between them.
 *
 * `recordText` is the file exactly as it sits on disk, read by the caller.
 * Nothing in this module reads it.
 */
export function planRecord({ record, entry, ledgerRow, checkedOn, recordPath }) {
  const fields = planFields({ image: record.image ?? {}, entry, ledgerRow, checkedOn });
  if (!fields.ok) return fields;

  const text = record.text;
  const isJson = recordPath.endsWith('.json');
  const after = isJson
    ? writeIntoJson(text, record.field, fields.writes)
    : writeIntoFrontmatter(text, record.field, fields.writes);

  if (after === null) {
    return refusal(
      'unreadable-record',
      `${recordPath} could not be read as ${isJson ? 'JSON' : 'Markdown frontmatter'} carrying ` +
        `an image block at ${record.field}`
    );
  }

  const diff = unifiedDiff(text.replace(/\r\n/g, '\n'), after.replace(/\r\n/g, '\n'), { path: recordPath });
  if (diff.length === 0) return refusal('no-op', 'the edit produces no change to the file');

  return { ok: true, path: recordPath, writes: fields.writes, before: text, after, diff };
}
