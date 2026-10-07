import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../dist/whats-on/this-weekend/index.html', import.meta.url), 'utf8');

test('current weekend details remain readable without JavaScript', () => {
  const tags = [...html.matchAll(/<[^>]*\bdata-weekend-(current|dated|expired)\b[^>]*>/g)];
  const current = tags.filter((match) => match[1] !== 'expired');
  const expired = tags.filter((match) => match[1] === 'expired');
  assert.ok(current.length >= 4, 'expected a current heading and dated content');
  assert.ok(expired.length >= 3, 'expected an expired-state heading and notice');
  for (const [tag] of current) {
    assert.doesNotMatch(tag, /\bhidden(?:\s|=|>)/, 'current content must be present before JavaScript runs');
  }
  for (const [tag] of expired) {
    assert.match(tag, /\bhidden(?:\s|=|>)/, 'expired messaging must wait until the edition ends');
  }
});
