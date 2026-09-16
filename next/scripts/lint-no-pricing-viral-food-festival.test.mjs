import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const nextRoot = fileURLToPath(new URL('..', import.meta.url));
const eventPath = path.join(nextRoot, 'src/content/events/viral-food-festival-mornington-2026.json');
const unrelatedPricePath = path.join(nextRoot, 'src/content/events/pricing-lint-fixture.json');
const prefixedPricePath = path.join(nextRoot, 'src/content/events/viral-food-festival-mornington-2026.json-copy.json');

function runLint() {
  try {
    execFileSync('node', ['scripts/lint-no-pricing.mjs'], { cwd: nextRoot, encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, output: '' };
  } catch (error) {
    return {
      status: error.status,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

test('allows only the approved Viral Food Festival entry price copy', () => {
  const eventSource = readFileSync(eventPath, 'utf8');
  assert.match(eventSource, /AUD \$5 early bird through 17 September/);
  assert.match(eventSource, /AUD \$7 during the event/);

  const approved = runLint();
  assert.equal(approved.status, 0, approved.output);

  writeFileSync(unrelatedPricePath, '{"summary":"Unapproved $8 entry"}\n');
  try {
    const unrelated = runLint();
    assert.equal(unrelated.status, 1);
    assert.match(unrelated.output, /pricing-lint-fixture\.json/);
  } finally {
    if (existsSync(unrelatedPricePath)) rmSync(unrelatedPricePath);
  }
});

test('rejects a filename that only shares the approved filename prefix', () => {
  writeFileSync(prefixedPricePath, '{"summary":"Unapproved $9 entry"}\n');
  try {
    const prefixed = runLint();
    assert.equal(prefixed.status, 1);
    assert.match(prefixed.output, /viral-food-festival-mornington-2026\.json-copy\.json/);
  } finally {
    if (existsSync(prefixedPricePath)) rmSync(prefixedPricePath);
  }
});
