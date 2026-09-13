/**
 * Tests for the paid-placement labelling rule (PI-021).
 *
 * The site's advertising stance is that the firewall is "enforced by
 * labelling, not absence". Before this rule existed, that enforcement was a
 * sentence in a component comment reading "never ship this component without
 * the partner label visible" - with nothing stopping anyone doing exactly
 * that, and a default label of "Partner" that does not tell a reader money
 * changed hands even when it is visible.
 *
 * These assert the rule, not the current contents of whats-on-partner.json.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DISCLOSURE_LABEL,
  isDisclosingLabel,
  assertDisclosingLabel,
} from './partner-slot.ts';

const SLOT_DATA = fileURLToPath(new URL('../data/whats-on-partner.json', import.meta.url));

test('the vocabulary a reader can be expected to understand as paid', () => {
  for (const label of [
    'Sponsored',
    'SPONSORED',
    'Advertisement',
    'Paid partnership',
    'Partner content',
    'Promoted',
    'Sponsored by Someone',
  ]) {
    assert.ok(isDisclosingLabel(label), `"${label}" should read as a paid disclosure`);
  }
});

test('NEGATIVE: labels a reader could take as editorial are refused', () => {
  // "Partner" was the shipped default. It is the reason this rule exists: a
  // reader can take it as a collaborator, a supplier, or simply a venue the
  // publication rates.
  for (const label of ['Partner', 'Featured', 'Our friends', 'Recommended', 'Spotlight', '', null]) {
    assert.equal(
      isDisclosingLabel(label),
      false,
      `${JSON.stringify(label)} must not pass as a paid disclosure`
    );
  }
});

test('NEGATIVE: a live placement with an editorial-sounding label throws', () => {
  assert.throws(
    () => assertDisclosingLabel('Partner', { live: true, surface: 'PartnerSlot' }),
    /does not disclose a paid placement/,
    'a commercial card must not render unlabelled'
  );
});

test('a live placement with a disclosing label is allowed through', () => {
  assert.doesNotThrow(() => assertDisclosingLabel('Sponsored', { live: true, surface: 'X' }));
});

test('a placement that renders to nobody is not held to the rule', () => {
  // Disabled or half-filled slots show no reader anything, so failing the
  // build over their wording would be noise rather than enforcement.
  assert.doesNotThrow(() => assertDisclosingLabel('Partner', { live: false, surface: 'X' }));
  assert.doesNotThrow(() => assertDisclosingLabel(null, { live: false, surface: 'X' }));
});

test('the default label discloses, so an author who sets none still discloses', () => {
  assert.ok(
    isDisclosingLabel(DEFAULT_DISCLOSURE_LABEL),
    'the fallback label must itself be a disclosure, or the rule has a hole in it'
  );
});

test('the shipped partner slot obeys its own rule', () => {
  // The one place this file looks at real data. It asserts a property, not a
  // value: whatever label the slot carries must be one the rule accepts, so an
  // editor cannot quietly set it back to "Partner".
  return readFile(SLOT_DATA, 'utf8').then((raw) => {
    const slot = JSON.parse(raw);
    assert.ok(
      isDisclosingLabel(slot.label ?? DEFAULT_DISCLOSURE_LABEL),
      `whats-on-partner.json carries the label ${JSON.stringify(slot.label)}, which does not disclose`
    );
    assert.ok(
      'sponsoredUrl' in slot,
      'the destination must be named sponsoredUrl so the firewall gate can see this surface'
    );
    assert.ok(!('url' in slot), 'the old neutral field name must not linger alongside the new one');
  });
});
