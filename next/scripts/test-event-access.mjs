import assert from 'node:assert/strict';
import test from 'node:test';

import { eventAccessLabel, eventIsUnqualifiedFree } from '../src/lib/event-access.mjs';

test('unqualified free events keep the Free label', () => {
  const data = { priceTier: 'free', freePaid: 'Free' };
  assert.equal(eventAccessLabel(data), 'Free');
  assert.equal(eventIsUnqualifiedFree(data), true);
});

test('included-with-admission activities do not collapse to Free', () => {
  const data = { priceTier: 'free', freePaid: 'Free (included with bathing)' };
  assert.equal(eventAccessLabel(data), 'Included with bathing');
  assert.equal(eventIsUnqualifiedFree(data), false);
});

test('mixed paid and free records do not collapse to Free', () => {
  const data = { priceTier: 'under-50', freePaid: 'Paid (hunt) / Free entry (farmgate)' };
  assert.equal(eventAccessLabel(data), 'Paid and free options');
  assert.equal(eventIsUnqualifiedFree(data), false);
});

test('free-entry records keep entry context', () => {
  const data = { priceTier: 'free', freePaid: 'Free (entry)' };
  assert.equal(eventAccessLabel(data), 'Free entry');
  assert.equal(eventIsUnqualifiedFree(data), false);
});
