import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { exploreSummary, effortLabel, durationLabel } from './explore-summaries.mjs';

test('every current experience has a complete concise authored summary', () => {
  const directory = new URL('../../../content/experiences/', import.meta.url);
  for (const file of readdirSync(directory).filter((file) => file.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
    const summary = exploreSummary(data.slug, data);
    assert.ok(summary.split(/\s+/).length <= 25, data.slug);
    assert.ok(summary.endsWith('.'), data.slug);
    assert.ok(!summary.includes('…'), data.slug);
    assert.notEqual(summary, 'Read the visit details, then check current opening and access information before travelling.', data.slug);
  }
});
test('missing details never imply access or truncate long content', () => {
  assert.equal(effortLabel({ type: 'walk', difficulty: 'moderate' }), 'Moderate');
  assert.equal(effortLabel({ type: 'gallery', difficulty: 'easy' }), undefined);
  assert.equal(effortLabel({ type: 'walk' }), undefined);
  assert.equal(exploreSummary('future', { signature: 'long '.repeat(40) }), 'Read the visit details, then check current opening and access information before travelling.');
});
test('durations read as human estimates, never computed decimals', () => {
  assert.equal(durationLabel(35), '30 min');
  assert.equal(durationLabel(45), '45 min');
  assert.equal(durationLabel(75), '75 min');
  assert.equal(durationLabel(80), '75 min');
  assert.equal(durationLabel(5), '15 min');
  assert.equal(durationLabel(90), 'About 1.5 hr');
  assert.equal(durationLabel(120), 'About 2 hr');
  assert.equal(durationLabel(150), 'About 2.5 hr');
  assert.equal(durationLabel(270), 'About 4.5 hr');
  assert.equal(durationLabel(0), undefined);
  assert.equal(durationLabel(undefined), undefined);
});
