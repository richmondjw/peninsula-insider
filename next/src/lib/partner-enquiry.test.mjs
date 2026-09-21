/**
 * partner-enquiry tests (PI-015). Run from next/:
 *
 *   npm run test:partner-enquiry
 *   node --test src/lib/partner-enquiry.test.mjs
 *
 * Uses Node's native TypeScript type-stripping (Node >= 22.18) to import
 * partner-enquiry.ts directly. No framework, no build step - the same
 * arrangement as corrections.test.mjs and season.test.mjs.
 *
 * WHAT THIS GUARDS, AND WHY IT ASSERTS RULES RATHER THAN STRINGS.
 *
 * The defect PI-015 fixes was a form that recorded nothing and told the
 * reader nothing: it POSTed to an unprovisioned Formspree placeholder behind
 * a hardcoded `ENDPOINT_LIVE = false`, fell back to a `mailto:` handoff, and
 * had no way to know whether anything had happened. A business filling it in
 * believed it had contacted the publication.
 *
 * The way to reintroduce that defect in a new coat is a form that reports
 * success on an insert that did not happen. A snapshot test of the
 * confirmation copy would not catch that - the copy would be identical. So
 * the load-bearing test here is exhaustive over the state space:
 *
 *   "no combination of insert results produces a confirmation unless the
 *    enquiry row was confirmed AND the contact row was confirmed"
 *
 * plus the same rule read from the other end, over the messages themselves.
 * Everything else in this file supports that: the vocabulary the database
 * constrains, the row shape the RLS policy will reject if it drifts, and the
 * spam verdicts that must never resolve to 'ok'.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  ENQUIRY_INTERESTS,
  ENQUIRY_INTEREST_LABELS,
  ENQUIRY_REF_PATTERN,
  ENQUIRY_STATUSES,
  MIN_COMPOSE_MS,
  PARTNERSHIPS_EMAIL,
  REQUIRED_FIELDS,
  REQUIRED_FIELD_LABELS,
  buildContactRow,
  buildEnquiryRow,
  classifyOutcome,
  classifySubmission,
  describeMissingFields,
  generateEnquiryRef,
  isConfirmation,
  isEnquiryRef,
  isPlausibleEmail,
  missingRequiredFields,
  outcomeMessage,
} = await import('./partner-enquiry.ts');

/** Deterministic draw: always the first alphabet character. */
const zeros = (n) => new Array(n).fill(0);

/** A submission that should sail through everything. */
const GOOD = {
  business_name: '  Red Hill Cellar Door  ',
  contact_name: 'Jo Bennett',
  email: 'jo@redhillcellar.com.au',
  business_category: 'winery-cellar-door',
  website_or_instagram: '@redhillcellar',
  interest: 'seasonal-campaign',
  notes: 'Opening a new tasting room in November.',
  bot_trap: '',
};

const META = {
  id: '11111111-2222-4333-8444-555555555555',
  enquiryRef: 'PI-P-260914-ABC123',
  composeMs: 41000,
};

/* ==========================================================================
   THE RULE. No path to a confirmation without a confirmed insert.
   ========================================================================== */

test('no combination of insert results yields success without BOTH inserts confirmed', () => {
  const bools = [true, false];
  const seen = [];
  for (const enquiryInserted of bools) {
    for (const contactInserted of bools) {
      const outcome = classifyOutcome({ enquiryInserted, contactInserted });
      seen.push({ enquiryInserted, contactInserted, outcome });

      if (outcome === 'success') {
        assert.ok(
          enquiryInserted && contactInserted,
          `success reported for enquiryInserted=${enquiryInserted} contactInserted=${contactInserted}`,
        );
      }
      // Read from the other end: a confirmed pair must not be downgraded.
      if (enquiryInserted && contactInserted) assert.equal(outcome, 'success');
      // The enquiry row is the thing that must exist for anything to be kept.
      if (!enquiryInserted) assert.equal(outcome, 'failed');
    }
  }
  // The state space really was enumerated, and exactly one cell is success.
  assert.equal(seen.length, 4);
  assert.equal(seen.filter((s) => s.outcome === 'success').length, 1);
});

test('isConfirmation is true for exactly one outcome', () => {
  const outcomes = ['success', 'unanswerable', 'failed'];
  assert.deepEqual(outcomes.filter(isConfirmation), ['success']);
});

test('a non-success outcome never produces confirmation language', () => {
  // The failure mode this guards is copy drifting into optimism: an
  // "unanswerable" or "failed" message that reads like an acknowledgement is
  // the original defect wearing a new coat.
  const CONFIRMING = [
    /\bthanks\b/i,
    /\bthank you\b/i,
    /\bwe(?:'| a)?ll be in touch\b/i,
    /\breceived\b/i,
    /\bon its way\b/i,
    /\bsent\b(?!\s*,)/i,
  ];
  for (const outcome of ['unanswerable', 'failed']) {
    const message = outcomeMessage(outcome, META.enquiryRef);
    for (const pattern of CONFIRMING) {
      assert.ok(
        !pattern.test(message),
        `${outcome} message reads as a confirmation (${pattern}): ${message}`,
      );
    }
    // And it must always offer the reader somewhere else to go.
    assert.ok(
      message.includes(PARTNERSHIPS_EMAIL),
      `${outcome} message leaves the reader with no route: ${message}`,
    );
  }
});

test('the failed message says plainly that nothing was recorded', () => {
  // "Try again" is not enough. The reader has to know whether the first
  // attempt is sitting somewhere.
  const message = outcomeMessage('failed', META.enquiryRef);
  assert.match(message, /nothing was recorded/i);
  // A failure must not hand out a reference: there is nothing to reference.
  assert.ok(!message.includes(META.enquiryRef), 'failed message quotes a reference for a row that does not exist');
});

test('the unanswerable message carries the reference and names the gap', () => {
  const message = outcomeMessage('unanswerable', META.enquiryRef);
  assert.ok(message.includes(META.enquiryRef));
  assert.match(message, /contact details/i);
  assert.match(message, /no way to reply|cannot reply/i);
});

test('the success message carries the reference', () => {
  const message = outcomeMessage('success', META.enquiryRef);
  assert.ok(message.includes(META.enquiryRef));
});

/* ==========================================================================
   Spam control. Honeypot plus timing, no third party.
   ========================================================================== */

test('classifySubmission: a filled honeypot is never ok, whatever the timing', () => {
  for (const composeMs of [0, 1, MIN_COMPOSE_MS, 10_000, 9_999_999]) {
    assert.equal(
      classifySubmission({ honeypot: 'http://spam.example', composeMs }),
      'honeypot',
    );
  }
  // Whitespace is not a fill; a browser autofilling a space must not be
  // treated as a bot.
  assert.equal(classifySubmission({ honeypot: '   ', composeMs: 10_000 }), 'ok');
});

test('classifySubmission: timing below the floor is never ok', () => {
  assert.equal(classifySubmission({ composeMs: 0 }), 'too-fast');
  assert.equal(classifySubmission({ composeMs: MIN_COMPOSE_MS - 1 }), 'too-fast');
  assert.equal(classifySubmission({ composeMs: MIN_COMPOSE_MS }), 'ok');
  assert.equal(classifySubmission({ composeMs: MIN_COMPOSE_MS + 1 }), 'ok');
});

test('classifySubmission: there is no upper bound on composition time', () => {
  // An operator who opens the form, serves a customer and comes back after
  // lunch is the most normal thing this form will see.
  const fourHours = 4 * 60 * 60 * 1000;
  assert.equal(classifySubmission({ composeMs: fourHours }), 'ok');
  assert.equal(classifySubmission({ composeMs: 30 * 24 * 60 * 60 * 1000 }), 'ok');
});

test('classifySubmission: a missing or unparseable stamp is its own verdict, not ok', () => {
  // A negative value is in here deliberately: it is what a clock that stepped
  // backwards mid-composition produces, and it is not evidence of a bot - but
  // it is not a usable measurement either, so it takes the same branch.
  for (const composeMs of [undefined, null, '', 'soon', NaN, -1, {}]) {
    assert.equal(
      classifySubmission({ composeMs }),
      'no-timing',
      `composeMs=${String(composeMs)} did not resolve to no-timing`,
    );
  }
  // A numeric string is what a hidden input actually yields, and must work.
  assert.equal(classifySubmission({ composeMs: '41000' }), 'ok');
  assert.equal(classifySubmission({ composeMs: '12' }), 'too-fast');
});

test('classifySubmission: the floor is overridable but defaults to the shared constant', () => {
  assert.equal(MIN_COMPOSE_MS, 2500);
  assert.equal(classifySubmission({ composeMs: 100, minComposeMs: 50 }), 'ok');
  assert.equal(classifySubmission({ composeMs: 100 }), 'too-fast');
});

/* ==========================================================================
   Validation
   ========================================================================== */

test('missingRequiredFields: a complete enquiry has nothing outstanding', () => {
  assert.deepEqual(missingRequiredFields(GOOD), []);
});

test('missingRequiredFields: whitespace does not satisfy a required field', () => {
  // `required` in the browser is satisfied by a space. This is the gap it
  // leaves.
  for (const field of REQUIRED_FIELDS) {
    const values = { ...GOOD, [field]: '   ' };
    assert.deepEqual(missingRequiredFields(values), [field], `whitespace passed for ${field}`);
  }
});

test('missingRequiredFields: an address that cannot be one is missing, not present', () => {
  for (const email of ['jo', 'jo@', '@example.com', 'jo@example', 'jo bennett@example.com']) {
    assert.deepEqual(missingRequiredFields({ ...GOOD, email }), ['email'], `accepted ${email}`);
  }
});

test('isPlausibleEmail: loose on purpose, but not a rubber stamp', () => {
  // Addresses that work in the wild and that stricter regexes wrongly reject.
  for (const ok of [
    'jo@example.com',
    'jo+partners@example.com.au',
    "o'brien@example.com",
    'jo.bennett@mail.example.co.uk',
    'JO@EXAMPLE.COM',
  ]) {
    assert.ok(isPlausibleEmail(ok), `rejected a real address: ${ok}`);
  }
  for (const bad of ['', '   ', 'jo', 'jo@example', 'two@@example.com', 'a b@example.com']) {
    assert.ok(!isPlausibleEmail(bad), `accepted: ${bad}`);
  }
});

test('missingRequiredFields: a category outside the vocabulary is missing', () => {
  // The database CHECK constraint would reject it; catching it here means the
  // reader is told which field, rather than shown a policy error.
  assert.deepEqual(
    missingRequiredFields({ ...GOOD, business_category: 'aerospace' }),
    ['business_category'],
  );
});

test('missingRequiredFields: reports every outstanding field, not just the first', () => {
  const missing = missingRequiredFields({ bot_trap: '' });
  assert.deepEqual(missing, [...REQUIRED_FIELDS]);
});

test('describeMissingFields: one sentence, in the words the form uses', () => {
  assert.equal(describeMissingFields([]), '');
  assert.equal(describeMissingFields(['email']), 'Still needed: an email address.');
  assert.equal(
    describeMissingFields(['business_name', 'email']),
    'Still needed: your business name and an email address.',
  );
  assert.equal(
    describeMissingFields(['business_name', 'contact_name', 'email']),
    'Still needed: your business name, a contact name and an email address.',
  );
});

test('every required field has a human label', () => {
  for (const field of REQUIRED_FIELDS) {
    assert.equal(typeof REQUIRED_FIELD_LABELS[field], 'string');
    assert.ok(REQUIRED_FIELD_LABELS[field].length > 0, `no label for ${field}`);
  }
});

/* ==========================================================================
   Row building. The RLS policy is unforgiving about what may be present.
   ========================================================================== */

test('buildEnquiryRow: commercial-state keys are ABSENT, not empty', () => {
  // The anonymous insert policy rejects a row carrying any of these, so a
  // stray key is not cosmetic: it is every enquiry on the site failing with a
  // policy violation. Asserting absence rather than falsiness is the point -
  // `owner: null` would pass an emptiness check and fail the policy.
  const row = buildEnquiryRow(GOOD, META);
  for (const key of [
    'status',
    'owner',
    'owner_notes',
    'decline_reason',
    'first_response_at',
    'resolved_at',
    'contact_provided',
    'received_at',
    'updated_at',
  ]) {
    assert.ok(!(key in row), `buildEnquiryRow emitted "${key}"; the RLS policy will reject the insert`);
  }
});

test('buildEnquiryRow: carries exactly the allowlisted keys', () => {
  const row = buildEnquiryRow(GOOD, META);
  assert.deepEqual(Object.keys(row).sort(), [
    'bot_trap',
    'business_category',
    'business_name',
    'client_token',
    'compose_ms',
    'enquiry_ref',
    'id',
    'interest',
    'notes',
    'source_surface',
    'user_id',
    'website_or_instagram',
  ]);
});

test('buildEnquiryRow: trims, and turns empty optionals into null rather than ""', () => {
  const row = buildEnquiryRow(
    { ...GOOD, website_or_instagram: '   ', notes: '', business_name: '  Two Bays  ' },
    META,
  );
  assert.equal(row.business_name, 'Two Bays');
  assert.equal(row.website_or_instagram, null);
  assert.equal(row.notes, null);
});

test('buildEnquiryRow: an unknown category or interest becomes null, never invented', () => {
  const row = buildEnquiryRow({ ...GOOD, business_category: 'aerospace', interest: 'skywriting' }, META);
  assert.equal(row.business_category, null);
  assert.equal(row.interest, null);
  // ...and the validator has already refused that submission, so the null can
  // only reach the database if someone skipped it - where NOT NULL stops it.
  assert.deepEqual(missingRequiredFields({ ...GOOD, business_category: 'aerospace' }), ['business_category']);
});

test('buildEnquiryRow: always emits bot_trap, so the database can enforce the honeypot', () => {
  const clean = buildEnquiryRow(GOOD, META);
  assert.equal(clean.bot_trap, '');
  assert.ok('bot_trap' in clean);
  // A filled trap is passed through verbatim rather than scrubbed: the CHECK
  // constraint is what rejects it, and scrubbing here would hide the attempt
  // from the one layer that a scripted POST cannot skip.
  const trapped = buildEnquiryRow({ ...GOOD, bot_trap: 'http://spam.example' }, META);
  assert.equal(trapped.bot_trap, 'http://spam.example');
});

test('buildEnquiryRow: compose_ms comes from meta, never from the form body', () => {
  // The form body is attacker-controlled in the same way every other field
  // is; the timing is measured by the page. A `compose_ms` key in the values
  // must not be able to override it.
  const row = buildEnquiryRow({ ...GOOD, compose_ms: 9_999_999 }, META);
  assert.equal(row.compose_ms, META.composeMs);
});

test('buildEnquiryRow: no contact detail leaks into the enquiry row', () => {
  const row = buildEnquiryRow(GOOD, META);
  const serialised = JSON.stringify(row);
  for (const personal of [GOOD.contact_name, GOOD.email]) {
    assert.ok(!serialised.includes(personal), `personal data "${personal}" reached pi.partner_enquiries`);
  }
  // The business name is deliberately NOT personal data and must survive:
  // an enquiry has to stay readable once the contact row is erased.
  assert.equal(row.business_name, 'Red Hill Cellar Door');
});

test('buildContactRow: keyed on the client-minted id, carries only contact fields', () => {
  const row = buildContactRow({ ...GOOD, phone: ' 03 5989 0000 ' }, META.id);
  assert.deepEqual(row, {
    enquiry_id: META.id,
    contact_name: 'Jo Bennett',
    contact_email: 'jo@redhillcellar.com.au',
    contact_phone: '03 5989 0000',
  });
});

test('buildContactRow: returns null rather than writing an unusable contact row', () => {
  assert.equal(buildContactRow({ ...GOOD, email: '' }, META.id), null);
  assert.equal(buildContactRow({ ...GOOD, email: 'not-an-address' }, META.id), null);
  assert.equal(buildContactRow({ ...GOOD, contact_name: '  ' }, META.id), null);
});

test('a null contact row can never be reported as a success', () => {
  // Ties the two halves together: buildContactRow returning null means there
  // is nothing to insert, which means contactInserted is false, which means
  // classifyOutcome cannot return success.
  const contact = buildContactRow({ ...GOOD, email: '' }, META.id);
  const contactInserted = contact !== null && true; // best case for the caller
  assert.equal(classifyOutcome({ enquiryInserted: true, contactInserted }), 'unanswerable');
});

/* ==========================================================================
   Reference minting
   ========================================================================== */

test('generateEnquiryRef: shape is PI-P-YYMMDD-XXXXXX', () => {
  const ref = generateEnquiryRef(new Date(2026, 8, 14), zeros);
  assert.equal(ref, 'PI-P-260914-000000');
  assert.match(ref, ENQUIRY_REF_PATTERN);
  assert.ok(isEnquiryRef(ref));
});

test('generateEnquiryRef: date segment is local, single digits padded', () => {
  assert.equal(generateEnquiryRef(new Date(2027, 0, 5), zeros), 'PI-P-270105-000000');
  assert.equal(generateEnquiryRef(new Date(2030, 11, 31), zeros), 'PI-P-301231-000000');
});

test('generateEnquiryRef: the alphabet excludes glyphs that get misread aloud', () => {
  for (let i = 0; i < 32; i++) {
    const ref = generateEnquiryRef(new Date(2026, 8, 14), () => new Array(6).fill(i));
    assert.match(ref, ENQUIRY_REF_PATTERN);
    const tail = ref.split('-')[3];
    for (const ch of tail) {
      assert.ok(!'ILOU'.includes(ch), `ambiguous glyph ${ch} in ${tail}`);
    }
  }
});

test('generateEnquiryRef: out-of-range indices still yield a legal reference', () => {
  // A future randomness source handing back raw bytes must not be able to
  // produce a reference that fails its own pattern.
  for (const n of [-1, -33, 32, 255, 1024]) {
    assert.match(generateEnquiryRef(new Date(2026, 8, 14), () => new Array(6).fill(n)), ENQUIRY_REF_PATTERN);
  }
});

test('generateEnquiryRef: a correction reference is not an enquiry reference', () => {
  // The two queues mint their own, and quoting one at the other must not
  // silently validate.
  assert.ok(!isEnquiryRef('PI-C-260913-ABC123'));
  assert.ok(!isEnquiryRef('PI-P-260914-ABCI23'), 'ambiguous glyph accepted');
  assert.ok(!isEnquiryRef('pi-p-260914-abc123'), 'lowercase accepted');
  assert.ok(!isEnquiryRef(''));
  assert.ok(!isEnquiryRef(null));
});

test('generateEnquiryRef: draws are distinct in practice', () => {
  const refs = new Set();
  for (let i = 0; i < 500; i++) refs.add(generateEnquiryRef());
  assert.ok(refs.size > 495, `only ${refs.size} distinct references in 500 draws`);
});

/* ==========================================================================
   Vocabulary. Must match the CHECK constraints in the migration.
   ========================================================================== */

test('every vocabulary value has a label, and every label a value', () => {
  assert.deepEqual(Object.keys(BUSINESS_CATEGORY_LABELS).sort(), [...BUSINESS_CATEGORIES].sort());
  assert.deepEqual(Object.keys(ENQUIRY_INTEREST_LABELS).sort(), [...ENQUIRY_INTERESTS].sort());
});

test('vocabularies are slug-shaped, so a label change cannot move a stored value', () => {
  for (const value of [...BUSINESS_CATEGORIES, ...ENQUIRY_INTERESTS, ...ENQUIRY_STATUSES]) {
    assert.match(value, /^[a-z][a-z0-9-]*$/, `${value} is not slug-shaped`);
  }
});

test('the lifecycle keeps a terminal declined state distinct from closed', () => {
  // "We said no" and "it went nowhere" are different commercial facts and the
  // queue has to be able to tell them apart.
  assert.ok(ENQUIRY_STATUSES.includes('declined'));
  assert.ok(ENQUIRY_STATUSES.includes('closed'));
  assert.equal(ENQUIRY_STATUSES[0], 'received', 'intake status must be the default the RLS policy pins');
});
