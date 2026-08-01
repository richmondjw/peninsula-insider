import test from 'node:test';
import assert from 'node:assert/strict';
import { policyOutcome, scorePlacement, searchApprovedAssets, validateProposal } from './lib/pilot-core.mjs';

const valid = { labels: [{ id: 'subject.coast-beach', confidence: 0.9, evidenceType: 'observed' }], altText: 'A sandy beach beside calm blue water.', flags: [] };

test('validates controlled structured output', () => assert.equal(validateProposal(valid).ok, true));
test('rejects uncontrolled taxonomy', () => assert.equal(validateProposal({ ...valid, labels: [{ id: 'venue.somewhere', confidence: 1, evidenceType: 'observed' }] }).ok, false));
test('queues all semantic pilot metadata for review', () => assert.equal(policyOutcome(valid).state, 'pending_review'));
test('holds confidence below 0.60', () => assert.equal(policyOutcome({ ...valid, labels: [{ ...valid.labels[0], confidence: 0.59 }] }).state, 'held'));
test('scores a low mismatch explainably', () => assert.equal(scorePlacement({ expectedTaxonomy: ['subject.golf'], surface: 'hero', assetId: 'a' }, { taxonomy: ['subject.coast-beach'], orientation: 'portrait' }).state, 'low_match_review'));
test('search excludes unapproved or unknown-rights assets', () => {
  const result = searchApprovedAssets([
    { metadataState: 'approved', rightsStatus: 'known', taxonomy: ['subject.golf'], altText: 'A green golf fairway', canonicalUri: '/ok.webp' },
    { metadataState: 'pending', rightsStatus: 'known', taxonomy: ['subject.golf'], altText: 'Golf', canonicalUri: '/pending.webp' },
  ], 'golf');
  assert.deepEqual(result.map((x) => x.canonicalUri), ['/ok.webp']);
});
