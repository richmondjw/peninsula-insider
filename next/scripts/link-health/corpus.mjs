/**
 * link-health/corpus.mjs - reading the corpus and the probe record.
 *
 * Shared by the gate (audit-link-health.mjs) and the prober
 * (probe-link-health.mjs). It contains no network code and never writes the
 * probe record, so importing it can never give a caller the ability to do
 * either. That separation is the whole point of the split: see the header of
 * audit-link-health.mjs.
 */

import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import YAML from 'yaml';

/**
 * A source is a URL the corpus offers as evidence, or as the operator's own
 * canonical page. heroImage.credit is not a source; officialEventUrl is. The
 * list is deliberately explicit rather than "any http string": a gate that
 * fires on every outbound link in prose is a gate people disable.
 */
export const SOURCE_FIELD_LEAVES = new Set([
  'url',
  'source',
  'sourceUrl',
  'sourceURL',
  'officialUrl',
  'officialEventUrl',
  'primarySourceUrl',
  'secondarySourceUrl',
  'website',
  'bookingUrl',
  'vfaCitationUrl',
  'citationUrl',
  'authorityUrl',
  'organiserUrl',
]);

/**
 * Blocks that record a URL as history rather than cite it.
 *
 * `retiredSourceLinks` holds the dead URL a record used to carry, on purpose.
 * `legacy` is the claim-registry migration's record of exactly what it read.
 * Counting either as a live citation would mean the act of writing down that a
 * link died fails the gate for the link having died, and the only way to pass
 * would be to erase the history.
 */
export const HISTORICAL_BLOCKS = new Set(['retiredSourceLinks', 'legacy']);

const leafOf = (fieldPath) => fieldPath.split('.').pop().replace(/\[\d+\]$/, '');
export const isSourceField = (fieldPath) => SOURCE_FIELD_LEAVES.has(leafOf(fieldPath));

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export function normaliseUrl(raw) {
  const out = [];
  // Several records pack two or three URLs into one string with a pipe.
  for (const piece of String(raw).split(/[\s|,]+/)) {
    const candidate = piece.trim().replace(/[),.;]+$/, '');
    if (!/^https?:\/\//i.test(candidate)) continue;
    try {
      new URL(candidate);
    } catch {
      continue;
    }
    out.push(candidate);
  }
  return out;
}

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
      out.push(...(await walk(abs)));
    } else if (['.json', '.md', '.mdx'].includes(path.extname(entry.name))) {
      out.push(abs);
    }
  }
  return out;
}

function collect(node, filePath, prefix, sink) {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (HISTORICAL_BLOCKS.has(key)) continue;
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (!isSourceField(fieldPath)) continue;
      for (const url of normaliseUrl(value)) sink.push({ url, file: filePath, field: fieldPath });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') {
          if (!isSourceField(fieldPath)) return;
          for (const url of normaliseUrl(item)) {
            sink.push({ url, file: filePath, field: `${fieldPath}[${i}]` });
          }
        } else {
          collect(item, filePath, `${fieldPath}[${i}]`, sink);
        }
      });
    } else {
      collect(value, filePath, fieldPath, sink);
    }
  }
}

/**
 * Every source citation in the corpus, with the record and field it sits in.
 *
 * `rel` turns an absolute path into the repo-relative one used in output, so
 * the caller decides what the paths are relative to.
 */
export async function collectCitations(contentDirs, rel) {
  const citations = [];
  const records = new Map();
  for (const dir of contentDirs) {
    for (const abs of await walk(dir)) {
      const relPath = rel(abs);
      let text;
      try {
        text = await readFile(abs, 'utf8');
      } catch {
        continue;
      }
      let data = null;
      if (path.extname(abs) === '.json') {
        try {
          data = JSON.parse(text);
        } catch {
          continue;
        }
      } else {
        const m = FRONTMATTER.exec(text);
        if (!m) continue;
        try {
          data = YAML.parse(m[1]);
        } catch {
          continue;
        }
      }
      if (!data || typeof data !== 'object') continue;
      records.set(relPath, data);
      collect(data, relPath, '', citations);
    }
  }
  return { citations, records };
}

/* ------------------------------------------------------------------ */
/* The probe record                                                    */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is this row the record of an actual probe?
 *
 * A row is admissible only if it carries who probed it and on what date. This
 * is not a freshness test - the date is never compared to the clock, because a
 * gate that failed as a date passed would fail a build no commit could fix.
 * It is a provenance test: `{"url": "...", "verdict": "ok"}` typed by hand is
 * indistinguishable from a fetch unless the fetch is required to say so, and a
 * record that admits hand-typed verdicts is not a record of anything.
 */
export function isProbeRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (typeof row.url !== 'string' || !row.url) return false;
  if (typeof row.verdict !== 'string' || !row.verdict) return false;
  if (typeof row.probedOn !== 'string' || !ISO_DATE.test(row.probedOn)) return false;
  if (typeof row.probedBy !== 'string' || !row.probedBy) return false;
  return true;
}

export class ProbeRecordError extends Error {}

/**
 * Read the probe record, strictly.
 *
 * Fails closed on anything it cannot read. The previous implementation
 * swallowed every error and returned an empty list, which reads as "no URL has
 * ever been probed" - technically a failure, since every citation then counts
 * as unrecorded, but one whose message sends the reader hunting through 1,400
 * citations instead of at the one broken file.
 *
 * Returns the rows AND the bytes' digest, so a caller can prove the file did
 * not change under it while it ran.
 */
export async function readProbeRecord(recordPath) {
  let text;
  try {
    text = await readFile(recordPath, 'utf8');
  } catch (error) {
    throw new ProbeRecordError(`cannot read the probe record at ${recordPath} - ${error.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ProbeRecordError(`the probe record at ${recordPath} is not valid JSON - ${error.message}`);
  }
  const links = parsed?.links;
  if (!Array.isArray(links)) {
    throw new ProbeRecordError(`the probe record at ${recordPath} has no "links" array`);
  }
  const rows = [];
  const malformed = [];
  for (const row of links) {
    if (isProbeRow(row)) rows.push(row);
    else malformed.push(row);
  }
  return { rows, malformed, digest: digestOf(text), raw: parsed };
}

export function digestOf(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** The digest of the file as it currently stands on disk, or null if unreadable. */
export async function digestOfFile(filePath) {
  try {
    return digestOf(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}
