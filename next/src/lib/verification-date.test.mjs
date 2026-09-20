import test from 'node:test';
import assert from 'node:assert/strict';
import { informationCheckedOn } from './verification-date.mjs';
test('a documented factual check can be shown, a legacy bulk date cannot', () => {
  const now = Date.parse('2026-09-20');
  assert.equal(informationCheckedOn({ lastVerified: '2026-09-19', lastFactVerified: '2026-09-19' }, now), undefined);
  assert.equal(informationCheckedOn({ editorialProvenance: { checkedOn: '2026-09-19' } }, now), undefined);
  const record = { editorialProvenance: { source: 'Official venue site', checkedOn: '2026-09-19' } };
  assert.equal(informationCheckedOn(record, now).toISOString().slice(0, 10), '2026-09-19');
  for (const checkedOn of ['invalid', '2026-09-21']) assert.equal(informationCheckedOn({ editorialProvenance: { source: 'Official site', checkedOn } }, now), undefined);
});
