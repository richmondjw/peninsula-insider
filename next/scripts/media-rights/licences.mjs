/**
 * licences.mjs - read next/public/images/sourced/LICENSES.md, and nothing else.
 *
 * WHAT THIS MODULE IS FOR
 * -----------------------
 * A file has been sitting in public/images/sourced/ since 11 April 2026 saying
 * who photographed some of this site's images and under what terms. Nothing in
 * the build has ever read it. Every image record in src/content carries no
 * provenance at all, and part of the answer was already in the repository the
 * whole time.
 *
 * This module turns that prose into structured entries. It does not decide
 * anything and it does not write anything: text in, entries out, no
 * filesystem, no clock, no network. The caller reads the file.
 *
 * WHY IT IS SO LITERAL
 * --------------------
 * Every value here ends up, if a person runs the apply path, in a field that
 * states a legal right. So the parser carries what the file says, verbatim,
 * and records what it could not read rather than guessing. A line it does not
 * recognise becomes a reported anomaly, never a silently dropped field and
 * never a field filled in from the shape of its neighbours.
 *
 * The one piece of interpretation in this file is LICENCE_BUCKETS, and it is a
 * lookup table rather than a rule. `license` on an image record is a coarse
 * enum, and a free-text licence line has to land in one of its values or in
 * none of them. The table maps only exact, whole strings, and only where the
 * host the image came from agrees with the bucket name. Anything the table
 * does not hold comes back as null, which the apply path treats as "do not
 * write a licence for this one". A partial match, a fuzzy match or a match on
 * a substring would be the same thing as inventing a licence, and this ticket
 * exists because a schema default once did exactly that.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

/**
 * The exact licence strings this file uses, mapped to the coarse enum in
 * src/content.config.ts, together with the host that must have served the
 * image for the mapping to hold.
 *
 * `host: null` would mean the bucket names no host, so any host is allowed.
 * Nothing maps to `venue-media-kit`, `visit-victoria` or
 * `original-commissioned`: those describe a grant made to this publication,
 * and no grant made to this publication can be established by a file that only
 * records what a photographer published somewhere else.
 */
export const LICENCE_BUCKETS = [
  { text: 'CC0 (Public Domain)', bucket: 'wikimedia-cc0', host: 'commons.wikimedia.org' },
  { text: 'CC-BY-2.0', bucket: 'wikimedia-cc-by', host: 'commons.wikimedia.org' },
  { text: 'CC-BY-3.0', bucket: 'wikimedia-cc-by', host: 'commons.wikimedia.org' },
  { text: 'CC-BY-4.0', bucket: 'wikimedia-cc-by', host: 'commons.wikimedia.org' },
  { text: 'CC-BY-SA-3.0', bucket: 'wikimedia-cc-by-sa', host: 'commons.wikimedia.org' },
  { text: 'CC-BY-SA-4.0', bucket: 'wikimedia-cc-by-sa', host: 'commons.wikimedia.org' },
  {
    text: 'Unsplash License (free for commercial use, attribution appreciated)',
    bucket: 'tmp-unsplash',
    host: 'unsplash.com',
  },
];

/** The field labels the file uses, mapped to what they mean on a record. */
const FIELD_LABELS = new Map([
  ['source', 'depicts'],
  ['photographer', 'creator'],
  ['licence', 'permission'],
  ['original', 'sourceUrl'],
  ['used for', 'usageNote'],
  ['used on', 'usageNote'],
]);

/** The host of a URL, or null if it is not one. */
export function hostOf(url) {
  try {
    return new URL(String(url)).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Which coarse licence bucket a licence line and a source URL together
 * establish, or null when the pair is not in the table.
 *
 * Both halves have to agree. A line reading CC-BY-SA-4.0 against a URL on a
 * stock-photo site is not a Wikimedia licence, and the honest answer to a pair
 * the table does not hold is that nobody has established one.
 */
export function bucketFor(permission, sourceUrl) {
  const text = String(permission ?? '').trim();
  const host = hostOf(sourceUrl);
  for (const entry of LICENCE_BUCKETS) {
    if (entry.text !== text) continue;
    if (entry.host !== null && entry.host !== host) continue;
    return entry.bucket;
  }
  return null;
}

/**
 * The site-root path an entry's heading names, for example
 * `/images/sourced/home-cover.webp`.
 *
 * The headings are bare filenames. The directory is not in the file, it is in
 * the file's own location, so the caller passes it rather than this module
 * assuming it.
 */
export function srcForFilename(filename, dir) {
  const clean = String(filename).trim();
  const base = String(dir).replace(/\/+$/, '');
  return `${base}/${clean}`;
}

/**
 * Parse the licences file.
 *
 * Returns `{ entries, anomalies }`.
 *
 * An entry is `{ filename, src, depicts, creator, permission, sourceUrl,
 * usageNote, bucket, line }`, with every field a string or null, and `bucket`
 * the coarse licence enum value or null.
 *
 * An anomaly is `{ line, kind, text, filename }` and names something the file
 * does that this parser will not act on. The kinds, all of which the report
 * prints:
 *
 *   unreadable-line     a bullet under an entry that is not `- **Label:** value`
 *   unknown-label       a labelled bullet whose label this parser does not know
 *   orphan-line         a bullet before the first heading
 *   duplicate-heading   the same filename appears twice
 *   missing-field       an entry with no creator, no permission or no source URL
 *   unbucketed-licence  a licence and host pair the table above does not hold
 *
 * None of these is repaired. A file that cannot be read cleanly is a finding,
 * and a parser that quietly patched it would be asserting a right nobody wrote
 * down.
 */
export function parseLicences(text, { dir = '/images/sourced' } = {}) {
  const entries = [];
  const anomalies = [];
  const seen = new Map();

  let current = null;
  const lines = String(text ?? '').split(/\r?\n/);

  const finish = () => {
    if (!current) return;
    for (const field of ['creator', 'permission', 'sourceUrl']) {
      if (current[field] === null) {
        anomalies.push({
          line: current.line,
          kind: 'missing-field',
          text: field,
          filename: current.filename,
        });
      }
    }
    current.bucket = bucketFor(current.permission, current.sourceUrl);
    if (current.bucket === null && current.permission !== null) {
      anomalies.push({
        line: current.line,
        kind: 'unbucketed-licence',
        text: `${current.permission} at ${hostOf(current.sourceUrl) ?? 'no host'}`,
        filename: current.filename,
      });
    }
    entries.push(current);
    current = null;
  };

  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    const heading = /^##\s+(.+?)\s*$/.exec(raw);
    if (heading) {
      finish();
      const filename = heading[1];
      if (seen.has(filename)) {
        anomalies.push({
          line,
          kind: 'duplicate-heading',
          text: `first seen at line ${seen.get(filename)}`,
          filename,
        });
      } else {
        seen.set(filename, line);
      }
      current = {
        filename,
        src: srcForFilename(filename, dir),
        depicts: null,
        creator: null,
        permission: null,
        sourceUrl: null,
        usageNote: null,
        bucket: null,
        line,
      };
      continue;
    }

    if (!raw.trimStart().startsWith('- ')) continue;

    if (!current) {
      anomalies.push({ line, kind: 'orphan-line', text: raw.trim(), filename: null });
      continue;
    }

    const bullet = /^\s*-\s+\*\*([^*]+?):\*\*\s*(.*)$/.exec(raw);
    if (!bullet) {
      anomalies.push({ line, kind: 'unreadable-line', text: raw.trim(), filename: current.filename });
      continue;
    }

    const label = bullet[1].trim().toLowerCase();
    const value = bullet[2].trim();
    const field = FIELD_LABELS.get(label);
    if (!field) {
      anomalies.push({ line, kind: 'unknown-label', text: bullet[1].trim(), filename: current.filename });
      continue;
    }
    // A later bullet with the same label does not overwrite an earlier one.
    // The first statement of a right is the one the file made; a second is an
    // inconsistency for the report, not a correction.
    if (current[field] === null) current[field] = value.length > 0 ? value : null;
  }

  finish();
  return { entries, anomalies };
}
