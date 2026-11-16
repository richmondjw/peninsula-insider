/**
 * The corrections queue contract (PI-016). Run from next/:
 *
 *   npm run test:corrections-queue
 *   node --test scripts/corrections-queue-contract.test.mjs
 *
 * ops/migrations/2026-09-13-pi-corrections-queue.sql has never been applied to
 * a database, so nothing about it is observable at runtime and nothing ever
 * will be until James runs it. That is exactly when a file is easiest to break:
 * it can be edited for a year with no feedback of any kind.
 *
 * Three rules, each of which failed or nearly failed once already, and each
 * stated over the rule rather than the text. None of them is a snapshot: every
 * one is derived from the file, so the migration may be reformatted, re-worded
 * or extended freely and only a change in MEANING trips it.
 *
 *   A. No RLS policy here gates on pi.profiles.is_editor.
 *
 *      scripts/rls-editor-gate.test.mjs is FORWARD-ONLY from 2026-09-14 and
 *      says so; this file is dated 2026-09-13 and it cannot reach it. The
 *      original four policies did gate on the flag, which is a column its own
 *      owner may UPDATE - so any signed-in reader could grant themselves the
 *      names and addresses in pi.correction_reporters. It was fixed while the
 *      migration was still unapplied. Nothing but this test stops it coming
 *      back, because the dated guard never will.
 *
 *   B. A table that can have rows DELETED must have its derived state
 *      maintained on delete.
 *
 *      pi.corrections.contact_provided exists so the queue can see whether a
 *      case can be answered without reading personal data, and erasing a
 *      reporter's details is the documented reason the contact table is
 *      separate at all. The maintenance trigger originally fired on insert and
 *      update only: erase the contact row and the flag stayed true forever,
 *      with nothing in the append-only log to say it had happened.
 *
 *   C. Nothing the client writes may be a column the anonymous insert policy
 *      refuses.
 *
 *      The policy's with-check rejects any row arriving pre-triaged,
 *      pre-classified, pre-owned, pre-resolved or claiming contact. A stray
 *      key in buildCorrectionRow is therefore not a cosmetic bug - it is every
 *      submission on the site failing with a policy violation, on a page whose
 *      subject is trust. corrections.ts says so in a comment. This reads the
 *      forbidden column list out of the SQL and checks the object the browser
 *      actually sends against it, so the two cannot drift apart.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(NEXT_DIR, '..');
const MIGRATION = path.join(
  REPO_DIR, 'ops', 'migrations', '2026-09-13-pi-corrections-queue.sql',
);

/** Drop -- line comments and block comments, so prose about a pattern is not the pattern. */
function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

const RAW = fs.readFileSync(MIGRATION, 'utf8');
const SQL = stripSqlComments(RAW);

/** Statements, comments already gone. Dollar-quoted bodies stay whole. */
function statements(sql) {
  const out = [];
  let rest = sql;
  // Pull dollar-quoted function bodies out first so their semicolons do not split.
  const bodies = [];
  rest = rest.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    bodies.push(m);
    return `$BODY${bodies.length - 1}$`;
  });
  for (const s of rest.split(';')) {
    const restored = s.replace(/\$BODY(\d+)\$/g, (_, i) => bodies[Number(i)]);
    if (restored.trim()) out.push(restored.trim());
  }
  return out;
}

const STATEMENTS = statements(SQL);

test('A. no policy in the corrections migration gates on the self-writable editor flag', () => {
  const offenders = STATEMENTS
    .filter((s) => /\bcreate\s+policy\b/i.test(s) && /\bis_editor\b/i.test(s))
    .map((s) => (/create\s+policy\s+"?([A-Za-z0-9_]+)"?/i.exec(s) || [, '(unnamed)'])[1]);

  assert.deepEqual(
    offenders,
    [],
    'These policies gate on pi.profiles.is_editor, a column on a row its own ' +
      'owner may UPDATE, so they grant whatever a signed-in reader decides to ' +
      `grant themselves:\n  ${offenders.join('\n  ')}\n\n` +
      'Gate on pi.admin_user_allowlist instead, via pi.is_cms_admin(). Note ' +
      'that scripts/rls-editor-gate.test.mjs is forward-only from 2026-09-14 ' +
      'and does NOT cover this file - this test is the only thing that does.',
  );

  // And positively: the editor policies exist and are gated on the allowlist,
  // so rule A cannot be satisfied by a migration that simply has no gate.
  const editorPolicies = STATEMENTS.filter(
    (s) => /\bcreate\s+policy\b/i.test(s) && /_editor_/i.test(s),
  );
  assert.ok(editorPolicies.length >= 4, 'expected the four editor policies to still be here');
  for (const p of editorPolicies) {
    assert.match(
      p, /pi\.is_cms_admin\(\)/i,
      `an editor policy with no allowlist gate at all:\n${p}`,
    );
  }
});

test('B. derived state is maintained on every way a row can disappear', () => {
  // pi.correction_reporters is granted DELETE, and a row of it drives
  // pi.corrections.contact_provided. So the trigger that maintains that flag
  // has to fire on delete, or the flag outlives the thing it describes.
  const grantsDelete = STATEMENTS.some(
    (s) => /^grant\b/i.test(s) && /\bdelete\b/i.test(s) && /pi\.correction_reporters\b/i.test(s),
  );
  assert.ok(grantsDelete, 'expected pi.correction_reporters to still grant DELETE (erasure)');

  const trigger = STATEMENTS.find(
    (s) => /create\s+trigger\s+correction_reporters_mark_contact/i.test(s),
  );
  assert.ok(trigger, 'the contact-flag trigger is missing');

  const events = (/\bafter\s+([a-z\s]+?)\s+on\b/i.exec(trigger) || [, ''])[1].toLowerCase();
  for (const op of ['insert', 'update', 'delete']) {
    assert.ok(
      events.includes(op),
      `pi.correction_reporters grants DELETE but its contact-flag trigger does ` +
        `not fire on ${op} (fires on: ${events.trim() || 'nothing'}). Erasing a ` +
        `reporter's details would leave pi.corrections.contact_provided saying ` +
        `the case can still be answered.`,
    );
  }

  // An erasure is also an editorial decision, so it has to reach the
  // append-only log the queue advertises as complete.
  const fn = (/create\s+or\s+replace\s+function\s+pi\.correction_reporters_mark_contact[\s\S]*/i
    .exec(SQL) || [''])[0];
  assert.match(
    fn.slice(0, fn.indexOf('$$', fn.indexOf('$$') + 2)),
    /insert\s+into\s+pi\.correction_events/i,
    'an erasure must be recorded in pi.correction_events',
  );
});

test('C. the browser never sends a column the anonymous insert policy refuses', async () => {
  const { buildCorrectionRow } = await import('../src/lib/corrections.ts');

  const policy = STATEMENTS.find(
    (s) => /create\s+policy\s+"?corrections_anonymous_insert"?/i.test(s),
  );
  assert.ok(policy, 'the anonymous insert policy is missing');

  const check = policy.slice(policy.toLowerCase().indexOf('with check'));

  // Every column the policy constrains to a fixed value. Read out of the SQL
  // rather than listed here, so adding a clause to the policy automatically
  // extends what the client is forbidden to send.
  const constrained = new Set();
  for (const m of check.matchAll(/\b([a-z_][a-z0-9_]*)\s+is\s+null\b/gi)) constrained.add(m[1]);
  for (const m of check.matchAll(/\b([a-z_][a-z0-9_]*)\s*=\s*(?:'[^']*'|true|false)/gi)) {
    constrained.add(m[1]);
  }
  assert.ok(
    constrained.size >= 8,
    `only parsed ${constrained.size} constrained columns out of the policy; ` +
      'the parse has probably drifted from the SQL',
  );

  // A maximal payload: every field the form has, all filled, plus a few an
  // attacker or a careless edit might add.
  const row = buildCorrectionRow(
    {
      affected_url: 'https://peninsulainsider.com.au/eat/',
      claim: 'x', proposed_correction: 'y', evidence: 'z',
      evidence_url: 'https://example.com/',
      reporter_relationship: 'operator', severity: 'urgent',
      contact_name: 'Jo', contact_email: 'jo@example.com',
      status: 'applied', correction_class: 'factual', owner: 'Emma',
      editor_notes: 'n', changelog_ref: 'c', ledger_ref: 'l',
      contact_provided: true, decided_at: 'now', resolved_at: 'now',
    },
    { id: 'id-1', caseRef: 'PI-C-260914-ABC123', userId: null, clientToken: 't' },
  );

  const sent = Object.keys(row).filter((k) => constrained.has(k));
  assert.deepEqual(
    sent,
    [],
    `buildCorrectionRow emits ${sent.join(', ')}, which the anonymous insert ` +
      'policy constrains. Postgres evaluates the with-check against the final ' +
      'row, so sending any of these is not a cosmetic bug: it is every ' +
      'correction submitted on the site failing with a policy violation.',
  );

  // The row is built by allowlist, so a forbidden key must be ABSENT, not
  // merely empty - `status: undefined` still serialises as a key.
  for (const name of constrained) {
    assert.ok(
      !(name in row),
      `${name} is present as a key on the insert payload, even if empty`,
    );
  }
});
