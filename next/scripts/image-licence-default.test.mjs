/**
 * Image licence default contract (action register A15). Run from next/:
 *
 *   node --test scripts/image-licence-default.test.mjs
 *
 * Until 2026-09-14 `imageRef.license` defaulted to `venue-media-kit`. Every
 * image record that omitted the field was therefore parsed as covered by a
 * venue media-kit grant that nobody had recorded - a legal claim manufactured
 * by a schema default. The 2026-07-28 media debt report is the same failure
 * seen from the other end: images crediting Peninsula Insider while carrying a
 * licence naming no grant. A credit string is not a licence, a filename is not
 * a licence, and neither is a default.
 *
 * The rule, stated so it survives the enum being extended:
 *
 *   1. The licence enum must offer a value that asserts nothing.
 *   2. The default must be that value. Absence of a recorded licence means
 *      nobody has said, which is not "permitted".
 *   3. "Nobody has said" must be visible to the build, not silent - so the
 *      media provenance audit must count it AND assert on it, and the ratchet
 *      baseline must list it among the asserted metrics.
 *
 * Rule 3 is what stops `unknown` becoming the new silent pass: a default that
 * claims nothing is only an improvement if somebody is counting how many
 * records are sitting on it.
 *
 * These are source-structure assertions. content.config.ts imports
 * `astro:content`, which only resolves inside an Astro build, so the schema
 * cannot be imported here and exercised directly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(NEXT_DIR, '..');
const CONFIG = path.join(NEXT_DIR, 'src', 'content.config.ts');
const AUDIT = path.join(NEXT_DIR, 'scripts', 'audit-media-provenance.mjs');
const BASELINE = path.join(REPO_DIR, 'ops', 'baselines', 'media-provenance-baseline.json');

/**
 * Licence values that assert nothing about what is permitted.
 *
 * Anything NOT in this set is treated as a grant-asserting value, including
 * values added to the enum after this file was written. That direction is
 * deliberate: a new licence bucket is presumed to assert something until
 * somebody comes here and says otherwise.
 */
const ASSERTS_NOTHING = new Set(['unknown']);

/** The metric name the audit uses for records sitting on the empty default. */
const UNKNOWN_METRIC = 'licenceUnknown';

const config = () => fs.readFileSync(CONFIG, 'utf8');

/** Members of the `imageLicense` z.enum([...]) literal. */
function licenceEnumMembers(src) {
  const match = /const\s+imageLicense\s*=\s*z\.enum\(\[([\s\S]*?)\]\)/.exec(src);
  assert.ok(match, 'content.config.ts no longer declares an imageLicense z.enum');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** The default applied to `license` on the shared imageRef object. */
function licenceDefault(src) {
  const match = /license:\s*imageLicense\.default\(\s*'([^']+)'\s*\)/.exec(src);
  assert.ok(
    match,
    'content.config.ts no longer applies a literal .default() to imageRef.license. ' +
      'If the default moved, re-point this rule at its new home; do not delete it.',
  );
  return match[1];
}

test('the licence enum offers a value that asserts nothing', () => {
  const members = licenceEnumMembers(config());
  const empty = members.filter((m) => ASSERTS_NOTHING.has(m));
  assert.ok(
    empty.length > 0,
    `imageLicense offers no value meaning "nobody has recorded a licence". ` +
      `Members: ${members.join(', ')}. Without one, every record must claim ` +
      'something, and records that have nothing to claim will claim it anyway.',
  );
});

test('the default licence asserts nothing', () => {
  const src = config();
  const members = licenceEnumMembers(src);
  const fallback = licenceDefault(src);

  assert.ok(
    members.includes(fallback),
    `imageRef.license defaults to "${fallback}", which is not a member of the ` +
      'imageLicense enum.',
  );
  assert.ok(
    ASSERTS_NOTHING.has(fallback),
    `imageRef.license defaults to "${fallback}", which asserts a right the ` +
      'publication may not hold. A record that says nothing about its licence ' +
      'must parse as unknown, never as permitted. If "' + fallback + '" really ' +
      'asserts nothing, add it to ASSERTS_NOTHING in this file and say why.',
  );
});

test('an unknown licence is a state the build counts', () => {
  const audit = fs.readFileSync(AUDIT, 'utf8');
  assert.match(
    audit,
    new RegExp(`\\b${UNKNOWN_METRIC}\\b`),
    `scripts/audit-media-provenance.mjs does not measure ${UNKNOWN_METRIC}. ` +
      'An unknown licence that nothing counts is the same silence the old ' +
      'default provided, with a more honest name.',
  );
});

test('an unknown licence is a state the build asserts on', () => {
  const audit = fs.readFileSync(AUDIT, 'utf8');
  const asserted = /const\s+ASSERTED_METRICS\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(audit);
  assert.ok(asserted, 'audit-media-provenance.mjs no longer declares ASSERTED_METRICS');
  assert.ok(
    asserted[1].includes(`'${UNKNOWN_METRIC}'`),
    `${UNKNOWN_METRIC} is measured but not asserted, so the pool of ` +
      'unknown-licence images can grow without failing a build.',
  );

  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  assert.ok(
    Array.isArray(baseline.assertedMetrics) && baseline.assertedMetrics.includes(UNKNOWN_METRIC),
    `${UNKNOWN_METRIC} is missing from assertedMetrics in the ratchet baseline.`,
  );
  assert.equal(
    typeof baseline.ceilings?.[UNKNOWN_METRIC],
    'number',
    `${UNKNOWN_METRIC} has no ceiling in the ratchet baseline, so the ratchet ` +
      'is not actually holding it.',
  );
});
