/**
 * RLS editor-gate contract (action register A5). Run from next/:
 *
 *   node --test scripts/rls-editor-gate.test.mjs
 *
 * pi.profiles.is_editor is a column on a row its own owner may UPDATE:
 * 2026-05-05-CONSOLIDATED-phases-3-and-4.sql grants table-level UPDATE on
 * pi.profiles to `authenticated`, and `profiles_self_update` scopes that to
 * the caller's own row. RLS scopes rows, never columns, so nothing in that
 * pair stops a signed-in reader setting their own flag.
 *
 * 2026-05-11-pi-cms-strict-allowlist-gate.sql documented this in its own
 * header and moved the two CMS gate functions onto pi.admin_user_allowlist.
 * Everything else kept gating on the flag - and on 2026-09-13 the corrections
 * queue added four more policies doing exactly that, sixteen months after the
 * hole was written down. A rule nobody enforces is a rule nobody remembers.
 *
 * So, forward only:
 *
 *   A migration dated 2026-09-14 or later may not create an RLS policy that
 *   gates on pi.profiles.is_editor. Gate on pi.admin_user_allowlist instead,
 *   via pi.is_cms_admin() / pi.can_publish_cms().
 *
 * Nothing is asserted about the migrations that came before. They are history,
 * they are hand-applied, and whether the live database even has them is the
 * open question this rule's companion script answers. This test only stops the
 * pattern spreading further.
 *
 * SQL comments are stripped before matching, so a file may quote the old
 * pattern while explaining it - as the verification script does at length.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(NEXT_DIR, '..');
const MIGRATIONS_DIR = path.join(REPO_DIR, 'ops', 'migrations');

/**
 * Migrations dated on or after this must not gate on the self-writable flag.
 * The date this rule landed; everything before it is inherited.
 */
const CUTOFF = '2026-09-14';

/** The live-database check this rule exists alongside. */
const VERIFICATION_SCRIPT = path.join(
  MIGRATIONS_DIR,
  'verification',
  '2026-09-14-verify-profiles-privilege-escalation.sql',
);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.sql')) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(REPO_DIR, file).split(path.sep).join('/');

/** Drop -- line comments and block comments. */
function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** ISO date prefix on the filename, or null for an undated file. */
function migrationDate(file) {
  const match = /^(\d{4}-\d{2}-\d{2})-/.exec(path.basename(file));
  return match ? match[1] : null;
}

/**
 * Each `create policy ...;` statement in a script, comments already gone.
 * Split on the statement terminator: policy bodies contain no semicolons of
 * their own, and the do-block wrappers in this corpus quote theirs inside
 * dollar-quoted strings, which this deliberately treats as one statement.
 */
function createPolicyStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /\bcreate\s+policy\b/i.test(s));
}

test('the verification script for the live check is still here', () => {
  // The static half of A5 is this rule; the live half is that script. If it
  // is deleted, the only record of what to run against the database goes with
  // it, and this rule starts looking like the whole answer. It is not.
  assert.ok(
    fs.existsSync(VERIFICATION_SCRIPT),
    `${rel(VERIFICATION_SCRIPT)} is missing. It is the runnable check for ` +
      'whether the live database actually has the escalation path; this ' +
      'source rule cannot answer that and does not try.',
  );
});

test('no new migration gates RLS on the self-writable editor flag', () => {
  const offenders = [];

  for (const file of walk(MIGRATIONS_DIR)) {
    const date = migrationDate(file);
    if (date === null || date < CUTOFF) continue;

    const sql = stripSqlComments(fs.readFileSync(file, 'utf8'));
    for (const statement of createPolicyStatements(sql)) {
      if (!/\bis_editor\b/i.test(statement)) continue;
      const name = /create\s+policy\s+"?([A-Za-z0-9_]+)"?/i.exec(statement);
      offenders.push(`${rel(file)}: policy ${name ? name[1] : '(unnamed)'}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'RLS policies gating on pi.profiles.is_editor, in migrations dated ' +
      `${CUTOFF} or later:\n  ${offenders.join('\n  ')}\n\n` +
      'That flag sits on a row the user may UPDATE themselves, so the policy ' +
      'grants whatever any signed-in reader decides to grant themselves. Gate ' +
      'on pi.admin_user_allowlist instead - pi.is_cms_admin() or ' +
      'pi.can_publish_cms(). See ' +
      'ops/migrations/2026-05-11-pi-cms-strict-allowlist-gate.sql.',
  );
});
