/**
 * The decisive test: a full build cannot admit a citation nobody has probed.
 *
 * Every other test in scripts/audit-link-health.test.mjs runs the gate
 * directly against a fixture tree. That is where the rules belong, and it is
 * also exactly what missed the 2026-09-14 defect: the gate was correct in
 * isolation, and what went wrong happened around it, at the scale of a whole
 * local run.
 *
 * Precisely what went wrong, because it is worth being exact. `npm run build`
 * never wrote the ledger itself. But probing was a flag on the gate -
 * `audit-link-health.mjs --probe` - so one command fetched the URLs, wrote the
 * verdicts, and then validated the corpus against the verdicts it had just
 * written, in one process. The remedy the gate printed when it failed was to
 * run that command, and `npm run probe:link-health` was an alias for it. The
 * ledger was filed in ops/reports/, the directory this repo reverts wholesale
 * as build output. Five evidence rows citing URLs nobody had ever fetched went
 * green locally; reverting the "build artefacts" and re-running is what
 * exposed them.
 *
 * So the fixture tests cannot see it, because in a fixture the gate and the
 * prober are already two processes. Only a full run can.
 *
 * So this file does the expensive thing on purpose: it puts an unprobed URL
 * into the real corpus, runs the real `npm run build`, and asserts the build
 * fails and the probe record is byte-identical afterwards. It is slow because
 * the failure it guards is only visible at that scale.
 *
 * It is deliberately NOT wired into `npm run build` (which would recurse) or
 * into the fast test lane. It has its own script, `npm run
 * test:link-health:build`, and its own CI job.
 *
 * Nothing here pins a date or demands the corpus contain a particular record.
 * The citation it borrows is whichever evidence row sorts first and carries a
 * URL - a property of the corpus having citations at all, which is the
 * precondition for this gate existing.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const NEXT = fileURLToPath(new URL('..', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const RECORD = join(REPO, 'ops', 'records', 'link-health', 'probe-ledger.json');
const CONTENT = join(NEXT, 'src', 'content');

/** A URL no probe can ever have recorded: .invalid is reserved and unresolvable. */
const UNPROBED = 'https://never-fetched.invalid/pi-007-build-independence';

const sha = (text) => createHash('sha256').update(text).digest('hex');

async function walkJson(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) await walkJson(abs, out);
    else if (entry.name.endsWith('.json')) out.push(abs);
  }
  return out;
}

/**
 * The first evidence row carrying a top-level http url.
 *
 * Borrowing an existing citation rather than adding a new record keeps every
 * other metric in the build identical: same number of rows, same dates, same
 * text. Exactly one thing changes - one URL becomes one nobody has probed -
 * so a failure can only be the gate under test.
 */
async function findDonor() {
  const evidenceDir = join(CONTENT, 'evidence');
  let files;
  try {
    files = await walkJson(evidenceDir);
  } catch {
    return null;
  }
  for (const abs of files) {
    let data;
    try {
      data = JSON.parse(await readFile(abs, 'utf8'));
    } catch {
      continue;
    }
    if (typeof data?.url === 'string' && /^https?:\/\//.test(data.url)) return { abs, data };
  }
  return null;
}

test(
  'a full build refuses a citation that has never been probed, and does not probe it itself',
  { timeout: 1_800_000 },
  async (t) => {
    const donor = await findDonor();
    if (!donor) {
      t.skip('no evidence row carries a URL, so there is no citation for the gate to guard');
      return;
    }

    const original = await readFile(donor.abs, 'utf8');
    const recordBefore = sha(await readFile(RECORD, 'utf8'));
    const relDonor = relative(REPO, donor.abs).split('\\').join('/');

    let result;
    try {
      await writeFile(donor.abs, JSON.stringify({ ...donor.data, url: UNPROBED }, null, 2) + '\n');

      try {
        const { stdout, stderr } = await run('npm', ['run', 'build'], {
          cwd: NEXT,
          maxBuffer: 64e6,
          env: { ...process.env, CI: '1' },
        });
        result = { code: 0, out: `${stdout}${stderr}` };
      } catch (error) {
        result = { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
      }
    } finally {
      await writeFile(donor.abs, original);
      // The build rewrites its own reports and the media registry. Restoring
      // them is the caller's courtesy, not part of the assertion - and note
      // that the probe record is deliberately NOT in this list any more,
      // because it is not a build artefact.
      await run('git', ['checkout', '--', 'ops/reports', 'next/public/admin/media-registry.json'], {
        cwd: REPO,
      }).catch(() => {});
    }

    assert.notEqual(
      result.code,
      0,
      `the build passed with an unprobed citation in ${relDonor}. This is the 2026-09-14 defect.\n\n${result.out.slice(-4000)}`
    );
    assert.match(
      result.out,
      /unrecordedSourceUrl/,
      `the build failed, but not on the link-health gate:\n\n${result.out.slice(-4000)}`
    );
    assert.match(result.out, new RegExp(UNPROBED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    // The heart of it. The build was given a citation it could have silently
    // legitimised by writing one row. It must not have written anything.
    assert.equal(
      sha(await readFile(RECORD, 'utf8')),
      recordBefore,
      'the build wrote to the probe record it is judged against'
    );

    // And the message has to be actionable, or the gate is correct and unusable.
    assert.match(result.out, /npm run probe:link-health/);
  }
);
