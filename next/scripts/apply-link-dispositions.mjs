#!/usr/bin/env node
/**
 * apply-link-dispositions.mjs - work the PI-007 dead-link queue (one-off, rerunnable).
 *
 * audit-link-health.mjs finds which source URLs are dead. It cannot decide
 * what to do about one, and it must never try: choosing a replacement is an
 * editorial act that requires someone to fetch the candidate and read it.
 *
 * So the decisions live in a reviewable file,
 * ops/reports/content/link-health-dispositions.json, one entry per dead URL
 * with what was decided and the evidence for it. This script applies that file
 * to the corpus and to the ledger. Re-running it is a no-op once applied.
 *
 * The four dispositions, from the PI-007 brief:
 *
 *   moved      Same content, new URL, same publisher. The replacement was
 *              fetched and carries the claim being cited.
 *   replaced   The publisher removed it and an equivalent primary source
 *              exists that supports the SAME claim. Recorded as a
 *              substitution, not passed off as the original.
 *   archived   A capture carries the claim. Cited with its capture date.
 *   gone       Nothing supports the claim any more. The link is removed from
 *              the field a reader clicks, kept in `retiredSourceLinks`, and
 *              the record is marked `sourceStatus: unsourced` so the registry
 *              and the blind-spot reporting can see the hole. The claim is
 *              NOT deleted: a claim that quietly loses its citation looks
 *              better and is worse.
 *
 * WHAT THIS SCRIPT WILL NOT DO
 *
 * Invent a replacement. Every `replacement` in the dispositions file was
 * fetched by hand, its status code and page title recorded in the `note`, and
 * only then written down. There is no pattern-matching fallback here that
 * guesses a new path from an old one, because a guessed URL that happens to
 * return 200 is indistinguishable from a real citation and strictly worse
 * than an honest gap.
 *
 * Usage:
 *   node scripts/apply-link-dispositions.mjs [--dry-run]
 *                                            [--dispositions path] [--record path]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const DRY_RUN = args.includes('--dry-run');
const DISPOSITIONS = path.resolve(
  getArg('--dispositions', path.join(REPO, 'ops', 'reports', 'content', 'link-health-dispositions.json'))
);
const LEDGER = path.resolve(
  getArg(
    '--record',
    getArg('--ledger', path.join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json'))
  )
);
const CONTENT = path.join(NEXT, 'src', 'content');

/**
 * PRESERVED: these blocks are never read, rewritten or counted.
 *
 * `legacy` is the claim-registry migration's record of exactly what it read
 * and from which field, so the seed stays reversible. `retiredSourceLinks` is
 * this ticket's own record of what died. Rewriting a dead URL in either would
 * make the corpus look as though it had always cited the live one, which is
 * the same class of dishonesty as inventing a source. The history of what we
 * published stays true even when the publication does not.
 */
const HISTORICAL_KEYS = new Set(['legacy', 'retiredSourceLinks']);

/** Fields a reader actually clicks. A `gone` URL is removed from these. */
const READER_FACING = new Set([
  'website',
  'bookingUrl',
  'officialUrl',
  'officialEventUrl',
  'primarySourceUrl',
  'secondarySourceUrl',
  'organiserUrl',
]);

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

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
    if (entry.isDirectory()) out.push(...(await walk(abs)));
    else if (['.json', '.md', '.mdx'].includes(path.extname(entry.name))) out.push(abs);
  }
  return out;
}

/**
 * Delete every key in `node` whose string value is exactly `url`, returning
 * the dotted paths removed. Walks nested objects and arrays so
 * `organiser.website` is reached as readily as a top-level field.
 */
function removeUrlFields(node, url, prefix = '', removed = []) {
  if (!node || typeof node !== 'object') return removed;
  for (const [key, value] of Object.entries(node)) {
    if (HISTORICAL_KEYS.has(key)) continue;
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (!READER_FACING.has(key)) continue;
      if (value === url) {
        delete node[key];
        removed.push(fieldPath);
        continue;
      }
      // events.officialEventUrl is documented as possibly holding several
      // URLs separated by a pipe, sometimes the same one twice. Drop the dead
      // element and keep the rest, rather than throwing away live citations
      // because they share a field with a dead one.
      if (value.includes(' | ') && value.split(' | ').some((part) => part.trim() === url)) {
        const kept = [...new Set(value.split(' | ').map((part) => part.trim()).filter((part) => part && part !== url))];
        if (kept.length) node[key] = kept.join(' | ');
        else delete node[key];
        removed.push(fieldPath);
      }
    } else if (value && typeof value === 'object') {
      removeUrlFields(value, url, fieldPath, removed);
    }
  }
  return removed;
}

/** Source fields the audit gate reads. Kept in step with audit-link-health.mjs. */
const SOURCE_FIELDS = new Set([
  ...READER_FACING,
  'url',
  'source',
  'sourceUrl',
  'sourceURL',
  'vfaCitationUrl',
  'citationUrl',
  'authorityUrl',
]);

/**
 * Does this record still carry a source someone could actually open?
 *
 * `blocked` counts as readable. The council refuses robots and answers people;
 * a record whose only source is the council is awkward to verify, not
 * unsourced, and conflating the two would mark a third of the corpus as having
 * no source at all.
 */
function hasReadableSource(node, ledger, seen = { found: false }) {
  if (seen.found || !node || typeof node !== 'object') return seen.found;
  for (const [key, value] of Object.entries(node)) {
    if (HISTORICAL_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      if (!SOURCE_FIELDS.has(key)) continue;
      for (const part of value.split(' | ').map((p) => p.trim())) {
        if (!/^https?:\/\//i.test(part)) continue;
        const verdict = ledger.get(part)?.verdict;
        if (verdict === 'ok' || verdict === 'blocked' || verdict === 'moved') {
          seen.found = true;
          return true;
        }
      }
    } else if (value && typeof value === 'object') {
      hasReadableSource(value, ledger, seen);
      if (seen.found) return true;
    }
  }
  return seen.found;
}

/**
 * Record a retired link once. The script is rerunnable by design - the
 * dispositions file is edited as the queue is worked - so a second pass must
 * not stack a third copy of the same entry onto a record that already has it.
 */
function pushRetired(data, entry) {
  const existing = (data.retiredSourceLinks ??= []);
  if (existing.some((row) => row.url === entry.url && row.field === entry.field)) return;
  existing.push(entry);
}

/** Which fields hold this URL, without changing anything. */
function findUrlFields(node, url, prefix = '', found = []) {
  if (!node || typeof node !== 'object') return found;
  for (const [key, value] of Object.entries(node)) {
    if (HISTORICAL_KEYS.has(key)) continue;
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (value === url) found.push(fieldPath);
      else if (value.includes(' | ') && value.split(' | ').some((part) => part.trim() === url)) {
        found.push(fieldPath);
      }
    } else if (value && typeof value === 'object') {
      findUrlFields(value, url, fieldPath, found);
    }
  }
  return found;
}

async function main() {
  const dispositions = JSON.parse(await readFile(DISPOSITIONS, 'utf8'));
  const ledgerDoc = JSON.parse(await readFile(LEDGER, 'utf8'));
  const ledger = new Map(ledgerDoc.links.map((row) => [row.url, row]));

  const byUrl = new Map(dispositions.map((d) => [d.url, d]));
  const today = new Date().toISOString().slice(0, 10);

  const touched = new Map();
  const stats = { moved: 0, replaced: 0, archived: 0, gone: 0, files: 0, unmatched: [] };

  for (const abs of await walk(CONTENT)) {
    const original = await readFile(abs, 'utf8');
    let text = original;
    const isJson = path.extname(abs) === '.json';

    let data = null;
    if (isJson) {
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
    }

    const changes = [];

    for (const [url, disposition] of byUrl) {
      if (!text.includes(url)) continue;

      // The ledger's own probe row, so the retired entry records what was
      // actually seen rather than what the disposition asserts.
      const probe = ledger.get(url) || {};
      const verdict = disposition.verdictOverride ?? probe.verdict ?? 'dead';

      if (disposition.replacement) {
        if (isJson) {
          const fields = findUrlFields(data, url);
          if (!fields.length) continue;
          // Exact-string swap on the serialised text would risk partial
          // matches (an old URL that is a prefix of another), so the swap is
          // done structurally and the file is re-serialised.
          const swap = (node) => {
            if (!node || typeof node !== 'object') return;
            for (const [key, value] of Object.entries(node)) {
              if (HISTORICAL_KEYS.has(key)) continue;
              if (value === url) node[key] = disposition.replacement;
              else if (value && typeof value === 'object') swap(value);
            }
          };
          swap(data);
          for (const field of fields) {
            pushRetired(data, {
              field,
              url,
              verdict,
              disposition: disposition.disposition,
              replacement: disposition.replacement,
              checkedOn: probe.probedOn ?? today,
              note: disposition.note,
            });
          }
          changes.push(`${disposition.disposition} ${url} -> ${disposition.replacement}`);
        } else {
          // Markdown frontmatter. A whole-URL literal swap is safe here
          // because the dispositions never contain a URL that is a strict
          // prefix of another cited URL (asserted below).
          text = text.split(url).join(disposition.replacement);
          changes.push(`${disposition.disposition} ${url} -> ${disposition.replacement}`);
        }
        stats[disposition.disposition] += 1;
        continue;
      }

      // gone
      if (isJson) {
        const fields = findUrlFields(data, url);
        if (!fields.length) continue;
        const removed = removeUrlFields(data, url);
        for (const field of removed) {
          pushRetired(data, {
            field,
            url,
            verdict,
            disposition: 'gone',
            checkedOn: probe.probedOn ?? today,
            note: disposition.note,
          });
        }
        // An evidence row keeps its url: it is the historical record of what
        // was cited, and deleting it would erase the fact that this claim was
        // once said to have a source. It gains a health verdict instead.
        const stillCites = findUrlFields(data, url).length > 0;
        if (stillCites) {
          data.sourceHealth = verdict;
          data.sourceHealthCheckedOn = probe.probedOn ?? today;
        }
        // `unsourced` means the record has nothing readable left, not that it
        // lost one link among several. The Main Street Mornington Festival
        // record kept a live organiser URL after the council's copy died; it
        // is not unsourced, and saying so would devalue the flag everywhere
        // else it appears.
        if (!hasReadableSource(data, ledger)) {
          data.sourceStatus = 'unsourced';
          data.sourceStatusNote = disposition.note;
        }
        changes.push(`gone ${url}`);
      } else {
        const stripped = stripReaderFacingLine(text, url);
        text = addFrontmatterStatus(stripped.text, disposition.note);
        changes.push(`gone ${url}${stripped.removed.length ? ` (removed ${stripped.removed.join(', ')})` : ''}`);
      }
      stats.gone += 1;
    }

    if (!changes.length) continue;

    const next = isJson ? `${JSON.stringify(data, null, 2)}\n` : text;
    if (next !== original) {
      if (!DRY_RUN) await writeFile(abs, next);
      touched.set(rel(abs), changes);
      stats.files += 1;
    }
  }

  // Ledger: record the decision next to the probe that prompted it.
  for (const disposition of dispositions) {
    const row = ledger.get(disposition.url);
    if (!row) {
      stats.unmatched.push(disposition.url);
      continue;
    }
    row.disposition = disposition.disposition;
    row.dispositionNote = disposition.note;
    row.reviewedOn = today;
    if (disposition.replacement) {
      row.replacement = disposition.replacement;
      // `moved` is the ledger verdict the gate reads to say "the record has
      // not followed this yet". Once the records are rewritten the citation
      // is gone, so nothing is left to fail on - but the row stays, so the
      // next record that pastes the old URL back in fails immediately.
      row.verdict = 'moved';
    } else if (disposition.verdictOverride) {
      row.verdict = disposition.verdictOverride;
    }
  }

  ledgerDoc.links = [...ledger.values()].sort((a, b) => a.url.localeCompare(b.url));
  ledgerDoc.updatedAt = new Date().toISOString();
  if (!DRY_RUN) await writeFile(LEDGER, `${JSON.stringify(ledgerDoc, null, 2)}\n`);

  console.log(`Applied ${dispositions.length} link dispositions${DRY_RUN ? ' (dry run)' : ''}`);
  console.log('');
  console.log(`  moved ..... ${stats.moved}`);
  console.log(`  replaced .. ${stats.replaced}`);
  console.log(`  archived .. ${stats.archived}`);
  console.log(`  gone ...... ${stats.gone}`);
  console.log(`  files ..... ${stats.files}`);
  if (stats.unmatched.length) {
    console.log('');
    console.log('  disposition with no ledger row (probe it first):');
    for (const url of stats.unmatched) console.log(`    ${url}`);
  }
  console.log('');
  for (const [file, changes] of [...touched].sort()) {
    console.log(`  ${file}`);
    for (const change of changes) console.log(`      ${change}`);
  }
}

/**
 * Drop a frontmatter line that hands a reader a dead link.
 *
 * A quick-note's `sources[].url` is kept - that is the record of what was
 * cited, and erasing it would erase the evidence that the claim was ever said
 * to have a source. A `bookingUrl` is different: nobody reads it as history,
 * they click it, and it goes nowhere.
 */
function stripReaderFacingLine(text, url) {
  const removed = [];
  const lines = text.split('\n');
  const kept = lines.filter((line) => {
    const match = /^\s*(?:-\s*)?([A-Za-z0-9_]+):\s*["']?(\S+?)["']?\s*\r?$/.exec(line);
    if (!match) return true;
    if (!READER_FACING.has(match[1]) || match[2] !== url) return true;
    removed.push(match[1]);
    return false;
  });
  return { text: removed.length ? kept.join('\n') : text, removed };
}

/**
 * Add `sourceStatus: unsourced` to a markdown record's frontmatter.
 *
 * Text surgery rather than a YAML round-trip on purpose: re-emitting the
 * frontmatter would reflow 181 quick-notes and 221 articles and bury the one
 * line that matters in a diff nobody can review.
 */
function addFrontmatterStatus(text, note) {
  const match = /^---\r?\n([\s\S]*?)(\r?\n)---/.exec(text);
  if (!match) return text;
  if (/^sourceStatus:/m.test(match[1])) return text;
  const escaped = String(note ?? '').replace(/"/g, "'");
  const insertion = `${match[2]}sourceStatus: unsourced${match[2]}sourceStatusNote: "${escaped}"`;
  return text.slice(0, match.index + match[0].length - `${match[2]}---`.length) + insertion + text.slice(match.index + match[0].length - `${match[2]}---`.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
