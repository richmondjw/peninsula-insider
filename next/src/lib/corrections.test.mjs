/**
 * corrections tests. Run from next/:
 *
 *   npm run test:corrections
 *   node --test src/lib/corrections.test.mjs
 *
 * Uses Node's native TypeScript type-stripping (Node >= 22.18) to import
 * corrections.ts directly. No framework, no build step - the same
 * arrangement as season.test.mjs.
 *
 * WHAT THIS GUARDS. The corrections page has no server behind it. The case
 * reference a reporter is shown is minted in their own browser and written
 * as part of the insert, because the anonymous role has INSERT and no SELECT
 * on pi.corrections and therefore cannot read a server-generated id back.
 * That makes two client-side functions load-bearing in a way they would not
 * be in an app with a backend:
 *
 *   - generateCaseRef, because a malformed or colliding reference is the
 *     reporter losing their only handle on the case, and a duplicate trips
 *     the UNIQUE constraint and loses the submission outright;
 *   - normaliseAffectedUrl, because the affected URL is the join between a
 *     correction and the page it is about, and an unnormalised one silently
 *     splits two reports of the same error into two cases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  CASE_REF_PATTERN,
  CORRECTIONS_EMAIL,
  classifyOutcome,
  isFiled,
  promisesReply,
  silenceIsReporterChoice,
  outcomeMessage,
  outcomeStatusKind,
  shouldResetForm,
  wantsReply,
  CORRECTION_CLASSES,
  CORRECTION_SEVERITIES,
  CORRECTION_STATUSES,
  REPORTER_RELATIONSHIPS,
  REQUIRED_FIELDS,
  REQUIRED_FIELD_LABELS,
  buildCorrectionRow,
  buildReporterRow,
  describeMissingFields,
  generateCaseRef,
  isCaseRef,
  missingRequiredFields,
  normaliseAffectedUrl,
} = await import('./corrections.ts');

/** Deterministic draw: always the first alphabet character. */
const zeros = (n) => new Array(n).fill(0);

test('generateCaseRef: shape is PI-C-YYMMDD-XXXXXX', () => {
  const ref = generateCaseRef(new Date(2026, 8, 13), zeros);
  assert.equal(ref, 'PI-C-260913-000000');
  assert.match(ref, CASE_REF_PATTERN);
  assert.ok(isCaseRef(ref));
});

test('generateCaseRef: date segment is local, single-digit month and day padded', () => {
  assert.equal(generateCaseRef(new Date(2027, 0, 5), zeros), 'PI-C-270105-000000');
  assert.equal(generateCaseRef(new Date(2030, 11, 31), zeros), 'PI-C-301231-000000');
  // Year 2100 wraps to 00 rather than growing the field. Documented, not a bug:
  // the date segment is a partition key for collisions, not a timestamp.
  assert.equal(generateCaseRef(new Date(2100, 5, 1), zeros), 'PI-C-000601-000000');
});

test('generateCaseRef: alphabet excludes the glyphs that get misread aloud', () => {
  // Draw every index once and check nothing ambiguous can come out.
  const all = generateCaseRef(new Date(2026, 8, 13), () => [0, 10, 18, 20, 24, 31]);
  const tail = all.split('-')[3];
  assert.equal(tail.length, 6);
  for (const ch of tail) {
    assert.ok(!'ILOU'.includes(ch), `ambiguous glyph ${ch} in ${tail}`);
    assert.ok(!/[a-z]/.test(ch), `lowercase glyph ${ch} in ${tail}`);
  }
  // Sweep the whole index space: every index maps to a legal character.
  for (let i = 0; i < 32; i++) {
    assert.match(generateCaseRef(new Date(2026, 8, 13), () => new Array(6).fill(i)), CASE_REF_PATTERN);
  }
});

test('generateCaseRef: out-of-range indices still yield a legal reference', () => {
  // A future randomness source handing back raw bytes must not be able to
  // emit an undefined character into a reporter's only handle on the case.
  assert.match(generateCaseRef(new Date(2026, 8, 13), () => [255, 128, 64, 32, 1, 0]), CASE_REF_PATTERN);
  assert.match(generateCaseRef(new Date(2026, 8, 13), () => [-1, -33, 0, 0, 0, 0]), CASE_REF_PATTERN);
});

test('generateCaseRef: real randomness produces distinct, well-formed refs', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const ref = generateCaseRef();
    assert.match(ref, CASE_REF_PATTERN);
    seen.add(ref);
  }
  // 32^6 per day. Two thousand draws colliding even once would mean the
  // randomness source had collapsed.
  assert.equal(seen.size, 2000);
});

test('isCaseRef: rejects near-misses', () => {
  assert.ok(isCaseRef('  PI-C-260913-K3X7QM  '), 'surrounding whitespace is trimmed');
  assert.ok(!isCaseRef('PI-C-260913-K3X7Q'), 'five-character tail');
  assert.ok(!isCaseRef('PI-C-260913-K3X7QMM'), 'seven-character tail');
  assert.ok(!isCaseRef('pi-c-260913-K3X7QM'), 'lowercase prefix');
  assert.ok(!isCaseRef('PI-C-260913-K3X7QI'), 'I is not in the alphabet');
  assert.ok(!isCaseRef('PI-C-260913-K3X7QO'), 'O is not in the alphabet');
  assert.ok(!isCaseRef('PI-C-26913-K3X7QM'), 'short date segment');
  assert.ok(!isCaseRef(''), 'empty');
  assert.ok(!isCaseRef(null), 'null');
  assert.ok(!isCaseRef(undefined), 'undefined');
  assert.ok(!isCaseRef(260913), 'number');
});

test('normaliseAffectedUrl: bare paths resolve against the site origin', () => {
  assert.equal(
    normaliseAffectedUrl('/journal/sorrento-off-season/'),
    'https://peninsulainsider.com.au/journal/sorrento-off-season/',
  );
  // No trailing slash on a directory URL: the site emits one, so add one,
  // or two reports of the same page become two cases.
  assert.equal(
    normaliseAffectedUrl('/eat/portsea-hotel'),
    'https://peninsulainsider.com.au/eat/portsea-hotel/',
  );
  // A file URL keeps its extension and gains no slash.
  assert.equal(normaliseAffectedUrl('/feed.xml'), 'https://peninsulainsider.com.au/feed.xml');
});

test('normaliseAffectedUrl: canonicalises scheme, www and port on PI URLs', () => {
  const expected = 'https://peninsulainsider.com.au/stay/';
  assert.equal(normaliseAffectedUrl('http://peninsulainsider.com.au/stay/'), expected);
  assert.equal(normaliseAffectedUrl('https://www.peninsulainsider.com.au/stay/'), expected);
  assert.equal(normaliseAffectedUrl('WWW.PeninsulaInsider.com.au/stay/'), expected);
  assert.equal(normaliseAffectedUrl('peninsulainsider.com.au/stay'), expected);
});

test('normaliseAffectedUrl: strips campaign tails and fragments, keeps real query', () => {
  assert.equal(
    normaliseAffectedUrl('https://peninsulainsider.com.au/whats-on/?utm_source=newsletter&utm_medium=email'),
    'https://peninsulainsider.com.au/whats-on/',
  );
  assert.equal(
    normaliseAffectedUrl('https://peninsulainsider.com.au/whats-on/?fbclid=abc#the-third-paragraph'),
    'https://peninsulainsider.com.au/whats-on/',
  );
  // A filter query can be the entire subject of the correction.
  assert.equal(
    normaliseAffectedUrl('https://peninsulainsider.com.au/search/?q=oysters&utm_campaign=spring'),
    'https://peninsulainsider.com.au/search/?q=oysters',
  );
});

test('normaliseAffectedUrl: keeps off-site URLs rather than discarding them', () => {
  // A correction about a syndicated copy is still a correction. Off-site
  // hosts are cleaned but not rewritten to the PI origin.
  assert.equal(
    normaliseAffectedUrl('https://www.example.com/PATH/'),
    'https://www.example.com/PATH/',
  );
  assert.equal(normaliseAffectedUrl('example.com/a'), 'https://example.com/a');
});

test('normaliseAffectedUrl: unwraps what mail clients add', () => {
  assert.equal(
    normaliseAffectedUrl('  <https://peninsulainsider.com.au/eat/>  '),
    'https://peninsulainsider.com.au/eat/',
  );
  assert.equal(
    normaliseAffectedUrl('"/eat/"'),
    'https://peninsulainsider.com.au/eat/',
  );
});

test('normaliseAffectedUrl: returns null rather than throwing on junk', () => {
  for (const junk of ['', '   ', '<>', null, undefined, 42, {}, [], 'javascript:alert(1)', 'mailto:a@b.c', 'not a url at all']) {
    assert.equal(normaliseAffectedUrl(junk), null, `expected null for ${JSON.stringify(junk)}`);
  }
});

test('missingRequiredFields: names every empty required field', () => {
  assert.deepEqual(missingRequiredFields({}), [...REQUIRED_FIELDS]);
  assert.deepEqual(
    missingRequiredFields({
      affected_url: '/eat/',
      claim: 'Hours are wrong',
      proposed_correction: 'Open until 9pm',
      evidence: 'Their own website',
    }),
    [],
  );
  // Whitespace is not an answer.
  assert.deepEqual(
    missingRequiredFields({
      affected_url: '/eat/',
      claim: '   ',
      proposed_correction: 'Open until 9pm',
      evidence: '',
    }),
    ['claim', 'evidence'],
  );
  // Optional fields never appear, present or not.
  assert.deepEqual(
    missingRequiredFields({
      affected_url: '/eat/',
      claim: 'x',
      proposed_correction: 'y',
      evidence: 'z',
      contact_email: '',
    }),
    [],
  );
});

test('vocabulary matches ops/correction-handling.md and the migration CHECK constraints', () => {
  // These four classes are the ones already written in the operating
  // procedure and already used by docs/CHANGELOG-corrections.md. If this
  // assertion needs changing, the procedure changes first.
  assert.deepEqual([...CORRECTION_CLASSES], ['factual', 'stale', 'framing', 'off-scope']);
  assert.deepEqual([...CORRECTION_SEVERITIES], ['urgent', 'normal', 'minor']);
  assert.deepEqual([...REPORTER_RELATIONSHIPS], [
    'reader',
    'operator',
    'subject',
    'representative',
    'other',
  ]);
  // 'closed' and 'reopened' both exist, and both are reachable repeatedly:
  // that is the acceptance criterion "editors can close or reopen a case".
  assert.ok(CORRECTION_STATUSES.includes('closed'));
  assert.ok(CORRECTION_STATUSES.includes('reopened'));
});
test('describeMissingFields: names the gaps in the form\'s own words', () => {
  assert.equal(describeMissingFields([]), '');
  assert.equal(describeMissingFields(['evidence']), 'Still needed: how you know.');
  assert.equal(
    describeMissingFields(['claim', 'evidence']),
    'Still needed: what is wrong and how you know.',
  );
  assert.equal(
    describeMissingFields([...REQUIRED_FIELDS]),
    'Still needed: the page it is on, what is wrong, what it should say and how you know.',
  );
  // Every required field has a label, so nothing can leak a raw column name
  // into a sentence a reporter reads.
  for (const name of REQUIRED_FIELDS) {
    assert.ok(REQUIRED_FIELD_LABELS[name], `no label for ${name}`);
    assert.ok(!describeMissingFields([name]).includes(name), `raw column name shown for ${name}`);
  }
});

/**
 * The anonymous insert policy on pi.corrections rejects a row that arrives
 * carrying editorial state. This is the assertion that stops a later edit
 * from adding `status: 'received'` for tidiness and breaking every
 * submission on the site with a policy violation nobody can see from here.
 */
test('buildCorrectionRow: emits no field the anon insert policy forbids', () => {
  const row = buildCorrectionRow(
    {
      affected_url: '/eat/portsea-hotel',
      claim: 'Hours are wrong',
      proposed_correction: 'Open until 9pm',
      evidence: 'Their own website',
      // Things a hand-built payload, or a hostile one, might try to carry.
      status: 'applied',
      correction_class: 'factual',
      owner: 'Emma',
      editor_notes: 'nope',
      decided_at: '2026-09-13',
      resolved_at: '2026-09-13',
      changelog_ref: 'x',
      ledger_ref: 'y',
      contact_provided: true,
      contact_email: 'reader@example.com',
    },
    { id: 'id-1', caseRef: 'PI-C-260913-K3X7QM', clientToken: 'tok-1' },
  );

  for (const forbidden of [
    'status',
    'correction_class',
    'owner',
    'editor_notes',
    'decided_at',
    'resolved_at',
    'changelog_ref',
    'ledger_ref',
    'contact_provided',
  ]) {
    assert.ok(!(forbidden in row), `${forbidden} must not be sent`);
  }
  // Contact never travels on the case row either - it has its own table.
  assert.ok(!('contact_email' in row));
  assert.ok(!('contact_name' in row));
});

test('buildCorrectionRow: normalises the URL, trims, and fills the defaults', () => {
  const row = buildCorrectionRow(
    {
      affected_url: '  https://www.peninsulainsider.com.au/eat/portsea-hotel?utm_source=news  ',
      claim: '  Hours are wrong  ',
      proposed_correction: 'Open until 9pm',
      evidence: 'Their own website',
      evidence_url: '   ',
    },
    { id: 'id-1', caseRef: 'PI-C-260913-K3X7QM', userId: null, clientToken: 'tok-1' },
  );
  assert.equal(row.affected_url, 'https://peninsulainsider.com.au/eat/portsea-hotel/');
  assert.equal(row.claim, 'Hours are wrong');
  assert.equal(row.evidence_url, null);
  assert.equal(row.user_id, null);
  assert.equal(row.id, 'id-1');
  assert.equal(row.case_ref, 'PI-C-260913-K3X7QM');
  assert.equal(row.client_token, 'tok-1');
  // Unset or junk enumerations fall back rather than tripping a CHECK.
  assert.equal(row.reporter_relationship, 'reader');
  assert.equal(row.severity, 'normal');
});

test('buildCorrectionRow: keeps an unparseable URL verbatim rather than losing the report', () => {
  const row = buildCorrectionRow(
    {
      affected_url: 'the piece about the pier, somewhere in Explore',
      claim: 'x',
      proposed_correction: 'y',
      evidence: 'z',
    },
    { id: 'id-2', caseRef: 'PI-C-260913-K3X7QN' },
  );
  assert.equal(row.affected_url, 'the piece about the pier, somewhere in Explore');
});

test('buildCorrectionRow: enumerations survive only if they are in the vocabulary', () => {
  const base = { affected_url: '/eat/', claim: 'x', proposed_correction: 'y', evidence: 'z' };
  const meta = { id: 'id-3', caseRef: 'PI-C-260913-K3X7QP' };
  for (const rel of REPORTER_RELATIONSHIPS) {
    assert.equal(buildCorrectionRow({ ...base, reporter_relationship: rel }, meta).reporter_relationship, rel);
  }
  for (const sev of CORRECTION_SEVERITIES) {
    assert.equal(buildCorrectionRow({ ...base, severity: sev }, meta).severity, sev);
  }
  assert.equal(
    buildCorrectionRow({ ...base, reporter_relationship: 'editor-in-chief' }, meta).reporter_relationship,
    'reader',
  );
  assert.equal(buildCorrectionRow({ ...base, severity: 'DROP TABLE' }, meta).severity, 'normal');
});

test('buildReporterRow: no contact means no personal-data row at all', () => {
  assert.equal(buildReporterRow({}, 'id-1'), null);
  assert.equal(buildReporterRow({ contact_email: '   ', contact_name: '' }, 'id-1'), null);

  assert.deepEqual(buildReporterRow({ contact_email: ' reader@example.com ' }, 'id-1'), {
    correction_id: 'id-1',
    contact_name: null,
    contact_email: 'reader@example.com',
    contact_preference: 'email',
  });

  // A name with no address is filed as a case that cannot be answered.
  assert.deepEqual(buildReporterRow({ contact_name: 'Jo' }, 'id-1'), {
    correction_id: 'id-1',
    contact_name: 'Jo',
    contact_email: null,
    contact_preference: 'none',
  });
});


/* ==========================================================================
   Outcome: the rule, not the wording

   These assert the RULE. A snapshot of the confirmation copy would not catch
   the defect being fixed here, because in the broken version the wording was
   IDENTICAL in the two cases that had to be told apart: a reporter who gave
   no address, and a reporter who gave one that we then failed to store. Both
   got "you gave no email address". So the tests below enumerate the state
   space and assert over predicates and over what the text is allowed to
   claim, never over the sentences themselves.
   ========================================================================== */

/** Every combination of the three facts classifyOutcome reads. */
function stateSpace() {
  const cells = [];
  for (const caseInserted of [true, false]) {
    for (const replyRequested of [true, false]) {
      for (const contactInserted of [true, false]) {
        const input = { caseInserted, replyRequested, contactInserted };
        cells.push({ input, outcome: classifyOutcome(input) });
      }
    }
  }
  return cells;
}

test('outcome: a reply is promised in exactly the states where one is possible', () => {
  // The load-bearing one. A reply is possible if and only if the case landed,
  // the reporter asked for one, and the contact row landed too. Any other
  // cell promising a reply is a promise we cannot keep.
  const promising = stateSpace().filter((c) => promisesReply(c.outcome));

  assert.equal(promising.length, 1, 'exactly one of the eight states may promise a reply');
  assert.deepEqual(promising[0].input, {
    caseInserted: true,
    replyRequested: true,
    contactInserted: true,
  });
});

test('outcome: "filed" is claimed in exactly the states where the row landed', () => {
  for (const { input, outcome } of stateSpace()) {
    assert.equal(
      isFiled(outcome),
      input.caseInserted,
      `isFiled disagreed with caseInserted for ${JSON.stringify(input)}`,
    );
  }
});

test('outcome: a lost contact row is never dressed up as the reporter’s choice', () => {
  // The actual defect. These two states are different things and must not
  // produce the same account of why no reply is coming.
  const gaveNothing = classifyOutcome({
    caseInserted: true, replyRequested: false, contactInserted: false,
  });
  const weLostIt = classifyOutcome({
    caseInserted: true, replyRequested: true, contactInserted: false,
  });

  assert.notEqual(gaveNothing, weLostIt);
  assert.equal(silenceIsReporterChoice(gaveNothing), true);
  assert.equal(silenceIsReporterChoice(weLostIt), false);

  // And the rule read from the other end, over the words: only the state the
  // reporter caused may attribute it to the reporter.
  const BLAMES_REPORTER = /you gave no email|no email address on the case|you did not/i;
  for (const { outcome } of stateSpace()) {
    const msg = outcomeMessage(outcome, 'PI-C-260914-ABC123');
    if (BLAMES_REPORTER.test(msg)) {
      assert.equal(
        silenceIsReporterChoice(outcome),
        true,
        `${outcome} attributes the silence to the reporter without that being true`,
      );
    }
  }

  // Where we lost it, the message has to own that, or the reporter has no
  // reason to do the one thing that recovers the case.
  const lostMsg = outcomeMessage(weLostIt, 'PI-C-260914-ABC123');
  assert.match(lostMsg, /did not save/i);
  assert.doesNotMatch(lostMsg, BLAMES_REPORTER);
});

test('outcome: only a promised reply may use reply language', () => {
  const PROMISES = /we will reply|we'll reply|we will be in touch|hear from us/i;
  for (const { outcome } of stateSpace()) {
    const msg = outcomeMessage(outcome, 'PI-C-260914-ABC123');
    if (PROMISES.test(msg)) {
      assert.equal(promisesReply(outcome), true, `${outcome} promises a reply it cannot make`);
    }
  }
  // and the one that can, does - otherwise the rule is vacuously satisfied
  // by copy that simply never says anything.
  assert.match(outcomeMessage('filed', 'PI-C-260914-ABC123'), PROMISES);
});

test('outcome: the reference is quoted if and only if the case exists', () => {
  const ref = 'PI-C-260914-ABC123';
  for (const { outcome } of stateSpace()) {
    const msg = outcomeMessage(outcome, ref);
    assert.equal(
      msg.includes(ref),
      isFiled(outcome),
      `${outcome} quotes a reference for a case that does not exist, or withholds one that does`,
    );
  }
});

test('outcome: every state that cannot end in a reply leaves a route out', () => {
  for (const { outcome } of stateSpace()) {
    if (promisesReply(outcome)) continue;
    assert.ok(
      outcomeMessage(outcome, 'PI-C-260914-ABC123').includes(CORRECTIONS_EMAIL),
      `${outcome} leaves the reporter with nowhere to go`,
    );
  }
});

test('outcome: styling and form reset follow the rule, not the copy', () => {
  for (const { outcome } of stateSpace()) {
    // A success style is only for a state where nothing we were asked to do
    // failed. 'filed-unanswerable' looks like a success and is not one.
    assert.equal(
      outcomeStatusKind(outcome) === 'success',
      outcome === 'filed' || outcome === 'filed-no-reply',
      `${outcome} is styled wrongly`,
    );
    // Clearing the form is only safe where the reporter has nothing left to
    // do with what they typed.
    assert.equal(
      shouldResetForm(outcome),
      outcomeStatusKind(outcome) === 'success',
      `${outcome} clears (or keeps) the form against the rule`,
    );
  }
  // Never clear a form whose correction was not recorded: that text is the
  // only copy of it left anywhere.
  assert.equal(shouldResetForm('failed'), false);
});

test('wantsReply: an address, not merely something typed', () => {
  assert.equal(wantsReply({}), false);
  assert.equal(wantsReply({ contact_email: '  ' }), false);
  // A name alone is a credit, not a reply route, and must not raise the
  // expectation of an answer - nor make a lost contact row look like our
  // failure to deliver one.
  assert.equal(wantsReply({ contact_name: 'Jo' }), false);
  assert.equal(wantsReply({ contact_email: ' reader@example.com ' }), true);
  assert.equal(wantsReply({ contact_name: 'Jo', contact_email: 'reader@example.com' }), true);
});

test('wantsReply agrees with buildReporterRow, so the page cannot drift from the row', () => {
  // The page asks wantsReply() what to expect and writes buildReporterRow().
  // If those two ever disagree about what counts as an address, the outcome
  // is decided against a row that was never written that way.
  const cases = [
    {},
    { contact_name: 'Jo' },
    { contact_email: 'reader@example.com' },
    { contact_name: 'Jo', contact_email: 'reader@example.com' },
    { contact_name: '  ', contact_email: '  ' },
  ];
  for (const values of cases) {
    const row = buildReporterRow(values, 'id-1');
    const expected = row !== null && row.contact_preference === 'email';
    assert.equal(wantsReply(values), expected, `disagreement on ${JSON.stringify(values)}`);
  }
});
