import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyDayMessage } from '../src/lib/whatson-empty-state.mjs';

test('ordinary empty days keep the existing editorial empty state', () => {
  assert.equal(emptyDayMessage(0), 'A quiet one. Nothing we would send you to.');
});

test('a continuing multi-day event is not contradicted', () => {
  const message = emptyDayMessage(1);
  assert.match(message, /No new event starts today/);
  assert.match(message, /still running/);
  assert.doesNotMatch(message, /Nothing we would send you to/);
});

test('multiple continuing multi-day events use plural copy', () => {
  const message = emptyDayMessage(2);
  assert.match(message, /2 events/);
  assert.match(message, /are still running/);
});
