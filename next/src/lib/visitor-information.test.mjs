import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { visitorInformationSchema, approvedVisitorInformation } from './visitor-information.mjs';
const schema = visitorInformationSchema(z);
const facts = { status: 'approved', sourceUrl: 'https://example.com/access', submittedBy: 'Venue operator', reviewedBy: 'PI editor', checkedOn: '2026-09-19', accessibility: 'Step-free entrance from the north car park.' };
test('only reviewed factual additions reach the visitor view', () => {
  const parsed = schema.parse(facts);
  const publicFacts = approvedVisitorInformation(parsed, Date.parse('2026-09-20'));
  assert.equal(publicFacts.accessibility, facts.accessibility);
  assert.equal(publicFacts.submittedBy, undefined);
  for (const status of ['pending', 'rejected']) assert.equal(approvedVisitorInformation({ ...parsed, status }), null);
  assert.equal(approvedVisitorInformation({ ...parsed, checkedOn: 'invalid' }), null);
  assert.equal(approvedVisitorInformation(parsed, Date.parse('2026-09-18')), null);
});
test('operator facts cannot carry editorial or commercial ranking changes', () => {
  for (const key of ['editorPick', 'editorVerdict', 'venueTier', 'rank', 'featuredPartner']) {
    assert.equal(schema.safeParse({ ...facts, [key]: true }).success, false, key);
    assert.equal(approvedVisitorInformation({ ...facts, [key]: true }, Date.parse('2026-09-20'))[key], undefined);
  }
});
test('external assets require safe destinations and explicit video rights', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com']) {
    assert.equal(schema.safeParse({ ...facts, menuUrl: url }).success, false);
  }
  assert.equal(schema.safeParse({ ...facts, video: { url: 'https://example.com/video', credit: 'Operator', rightsConfirmed: false } }).success, false);
  assert.equal(schema.safeParse({ ...facts, video: { url: 'https://example.com/video', credit: 'Operator', rightsConfirmed: true } }).success, true);
});
