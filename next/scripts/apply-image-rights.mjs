#!/usr/bin/env node
/**
 * apply-image-rights.mjs - the writing half of PI-013, and it has not been run.
 *
 * WHAT IT DOES
 * ------------
 * Takes the provenance in next/public/images/sourced/LICENSES.md, checks each
 * entry against the committed source ledger, and writes creator, sourceUrl,
 * permission, depicts and the coarse licence bucket onto the image records
 * that use those images, plus rightsStatus: recorded and a rights date.
 *
 * WHAT IT WILL NOT DO WITHOUT BEING TOLD TWICE
 * --------------------------------------------
 * Nothing. The default is a dry run: it prints every planned write and every
 * refusal, emits a patch a person can read, and touches no file in
 * src/content. Only `--confirm` writes, and `--confirm` still requires
 * `--checked-on` and `--checked-by` to be supplied, because a rights claim
 * with no date and nobody's name on it is not a record of anything.
 *
 * THE DIVISION OF LABOUR
 * ----------------------
 * The deciding lives in media-rights/plan.mjs, which imports nothing from
 * node:fs and therefore cannot write whatever anybody does to this file. This
 * file does the reading and, under --confirm, the writing. That is the shape
 * PI-006's verification loop settled on, and scripts/media-rights.test.mjs
 * asserts it by reading plan.mjs's own source rather than by trusting a
 * comment.
 *
 * THE DATE RULE
 * -------------
 * `rightsEstablishedOn` takes `--checked-on`, which is the date the person
 * running this actually checked. It is never the date on LICENSES.md, which is
 * 11 April 2026 and records when somebody assembled a file rather than when
 * anybody verified it, and it is never the system clock, which would record
 * this command's convenience as a person's diligence. There is no default.
 *
 * WHAT TO DO AFTER A CONFIRMED RUN
 * --------------------------------
 * Writing `sourceUrl` onto a record adds a citation, and `sourceUrl` is one of
 * the fields audit-link-health.mjs counts. Its `unledgeredSourceUrl` metric
 * ratchets, so a confirmed run must be followed by
 *
 *   npm run probe:link-health
 *
 * and a commit of ops/records/link-health/probe-ledger.json, or the next
 * build fails on citations nobody probed. That is the gate working, not a
 * problem with it. This command prints the same reminder when it finishes.
 *
 * Usage:
 *   node scripts/apply-image-rights.mjs --checked-on YYYY-MM-DD
 *                                       --checked-by "Name"
 *                                       [--only substring] [--only ...]
 *                                       [--patch path] [--confirm]
 *                                       [--licences path] [--ledger path]
 *                                       [--content-dir path]
 *
 * `--only` narrows the run to records whose image path contains the substring,
 * and may be repeated. It is how a first pass covers the handful of shared
 * hero images that front most of the corpus without touching anything else.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { parseLicences } from './media-rights/licences.mjs';
import { readImageRecords } from './media-rights/corpus.mjs';
import { planRecord } from './media-rights/plan.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const getAll = (flag) => {
  const out = [];
  for (const [i, arg] of args.entries()) if (arg === flag && args[i + 1]) out.push(args[i + 1]);
  return out;
};

const CONFIRM = args.includes('--confirm');
const CHECKED_ON = getArg('--checked-on', null);
const CHECKED_BY = getArg('--checked-by', null);
const ONLY = getAll('--only');
const LICENCES = path.resolve(getArg('--licences', path.join(NEXT, 'public', 'images', 'sourced', 'LICENSES.md')));
const CONTENT = path.resolve(getArg('--content-dir', path.join(NEXT, 'src', 'content')));
const LEDGER = path.resolve(
  getArg('--ledger', path.join(REPO, 'ops', 'reports', 'media', 'image-rights-source-ledger.json'))
);
const PATCH_OUT = path.resolve(
  getArg('--patch', path.join(REPO, 'ops', 'reports', 'media', '2026-09-14-image-rights-dry-run.patch'))
);

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
const out = (text) => process.stdout.write(`${text}\n`);

/**
 * The patch header.
 *
 * Not decoration. A patch that arrives without who prepared it, from what, on
 * what date and against which ledger is a diff somebody has to research before
 * they dare run it, and a reviewer who has to research a patch will eventually
 * stop reading and just run it.
 */
function patchHeader({ checkedOn, checkedBy, ledger, planned, refused }) {
  return [
    '# PI-013 image rights backfill',
    '#',
    `# Prepared from  ${rel(LICENCES)}`,
    `# Source ledger  ${rel(LEDGER)}, probed ${ledger?.probedOn ?? 'never'}`,
    `# Checked by     ${checkedBy}`,
    `# Checked on     ${checkedOn}`,
    `# Records        ${planned} planned, ${refused} refused`,
    '#',
    '# Every value below is copied from the licences file, never inferred, and',
    '# only onto a record that had nothing in that field. A record whose source',
    '# the ledger does not corroborate is refused rather than written.',
    '#',
    '# READ THE "Checked by" LINE ABOVE BEFORE YOU RUN THIS. Applying this patch',
    `# asserts ${planned} rights claims in that person's name. If it does not name a`,
    '# person who actually opened these source pages, the patch is a specimen of',
    '# what the apply path would do and not a change anybody has signed.',
    '#',
    '# Nothing has applied this. Read it, then apply it yourself:',
    '#',
    '#   git apply <this file>',
    '#',
    '',
  ].join('\n');
}

async function run() {
  if (!CHECKED_ON || !CHECKED_BY) {
    out('Refusing to run.');
    out('');
    out('  --checked-on YYYY-MM-DD   the date a person checked these rights');
    out('  --checked-by "Name"       who that person was');
    out('');
    out('Both are required, in a dry run as much as a confirmed one. A rights');
    out('date is a record of when somebody looked, so it cannot come from a');
    out('clock or from the heading of a file written in April.');
    process.exitCode = 2;
    return;
  }

  const { entries } = parseLicences(await readFile(LICENCES, 'utf8'));
  const bySrc = new Map(entries.map((entry) => [entry.src, entry]));

  let ledger = null;
  try {
    ledger = JSON.parse(await readFile(LEDGER, 'utf8'));
  } catch {
    ledger = null;
  }
  const ledgerByUrl = new Map((ledger?.rows ?? []).map((row) => [row.sourceUrl, row]));

  const records = await readImageRecords(CONTENT);
  const selected = records.filter((record) => {
    const src = record.image?.src ?? '';
    if (!bySrc.has(src)) return false;
    return ONLY.length === 0 || ONLY.some((needle) => src.includes(needle));
  });

  // Records are grouped by file so a file carrying two image blocks is planned
  // against the text the previous block already changed, rather than against
  // the text on disk twice.
  const byFile = new Map();
  for (const record of selected) {
    if (!byFile.has(record.file)) byFile.set(record.file, []);
    byFile.get(record.file).push(record);
  }

  const planned = [];
  const refused = [];
  const diffs = [];
  const written = new Map();

  for (const [file, group] of [...byFile.entries()].sort()) {
    const abs = path.join(CONTENT, file);
    let text;
    try {
      text = await readFile(abs, 'utf8');
    } catch (error) {
      for (const record of group) refused.push({ file, field: record.field, code: 'unreadable-file', why: String(error.message) });
      continue;
    }
    const original = text;

    for (const record of group) {
      const entry = bySrc.get(record.image.src);
      const plan = planRecord({
        record: { ...record, text },
        entry,
        ledgerRow: entry?.sourceUrl ? ledgerByUrl.get(entry.sourceUrl) ?? null : null,
        checkedOn: CHECKED_ON,
        recordPath: `next/src/content/${file}`,
      });
      if (!plan.ok) {
        refused.push({ file, field: record.field, code: plan.code, why: plan.why });
        continue;
      }
      text = plan.after;
      planned.push({ file, field: record.field, src: record.image.src, writes: plan.writes });
    }

    if (text !== original) {
      written.set(abs, text);
      const { unifiedDiff } = await import('./verification-loop/apply.mjs');
      diffs.push(
        unifiedDiff(original.replace(/\r\n/g, '\n'), text.replace(/\r\n/g, '\n'), {
          path: `next/src/content/${file}`,
        })
      );
    }
  }

  // -- report -------------------------------------------------------------
  out(`${CONFIRM ? 'CONFIRMED RUN' : 'DRY RUN, nothing will be written'}`);
  out('');
  out(`Records the licences file covers${ONLY.length > 0 ? ` and --only matches` : ''}: ${selected.length}`);
  out(`Planned: ${planned.length}    Refused: ${refused.length}    Files touched: ${written.size}`);
  out('');

  const byCode = new Map();
  for (const item of refused) {
    if (!byCode.has(item.code)) byCode.set(item.code, []);
    byCode.get(item.code).push(item);
  }
  if (byCode.size > 0) {
    out('Refusals');
    for (const [code, items] of [...byCode.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out(`  ${String(items.length).padStart(4)}  ${code}`);
      out(`        ${items[0].why}`);
    }
    out('');
  }

  const fieldCounts = new Map();
  for (const item of planned) {
    for (const write of item.writes) fieldCounts.set(write.field, (fieldCounts.get(write.field) ?? 0) + 1);
  }
  if (fieldCounts.size > 0) {
    out('Fields that would be written');
    for (const [field, count] of [...fieldCounts.entries()].sort((a, b) => b[1] - a[1])) {
      out(`  ${String(count).padStart(4)}  ${field}`);
    }
    out('');
  }

  const patch = `${patchHeader({
    checkedOn: CHECKED_ON,
    checkedBy: CHECKED_BY,
    ledger,
    planned: planned.length,
    refused: refused.length,
  })}${diffs.join('')}`;

  await mkdir(path.dirname(PATCH_OUT), { recursive: true });
  await writeFile(PATCH_OUT, patch, 'utf8');
  out(`Patch written to ${rel(PATCH_OUT)}. Read it.`);

  if (!CONFIRM) {
    out('');
    out('Nothing was written. To apply, read the patch first, then re-run with --confirm,');
    out('or apply the patch by hand with: git apply ' + rel(PATCH_OUT));
    return;
  }

  for (const [abs, text] of written) await writeFile(abs, text, 'utf8');
  out('');
  out(`Wrote ${written.size} files.`);
  out('');
  out('Now run `npm run probe:link-health` and commit the ledger. Every sourceUrl this');
  out('just added is a new citation, and audit-link-health.mjs fails the build on a');
  out('citation nobody has probed. That is the gate working.');
}

run().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
