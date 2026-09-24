import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NEXT = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(NEXT, path), 'utf8');

test('retired routes emit noindex redirects to their retained destinations', () => {
  assert.match(read('src/pages/pass.astro'), /<Redirect to="\/dispatch\/"[^>]*noindex/);
  assert.match(read('src/pages/how-we-check.astro'), /<Redirect to="\/about\/"[^>]*noindex/);
});

test('businesses link directly to the retained About editorial section', () => {
  const page = read('src/pages/partners/index.astro');
  assert.match(page, /href="\/about\/#independent-editorial"/);
  assert.doesNotMatch(page, /editorial-approach/);
});

test('seasonal navigation prioritises spring while retaining Winter winery query aliases', () => {
  const index = read('src/pages/site-index.astro');
  const search = read('src/pages/search.astro');
  const springWineIntent = search.match(/aliases:\s*\[([^\]]+)\],\s*title:\s*'Mornington Peninsula Wine & Wineries'/);

  assert.match(index, /href="\/journal\/the-spring-peninsula\/"[^>]*>Mornington Peninsula in Spring</);
  assert.doesNotMatch(index, /Mornington Peninsula in Autumn/);
  assert.ok(springWineIntent, 'the retained Spring Wine result must define aliases');
  assert.match(springWineIntent[1], /'winter wineries'/);
  assert.match(springWineIntent[1], /'winter winery'/);
  assert.match(springWineIntent[1], /'winter wine'/);
  assert.match(springWineIntent[1], /'winter wine weekend'/);
  assert.doesNotMatch(search, /"Winter wineries"/);
});

test('the Journal current edit is a September 2026 selection', () => {
  const front = JSON.parse(read('src/data/journal-front.json'));
  assert.equal(front.selectedOn, '2026-09-24');
  assert.equal(front.lead, 'spring-school-holidays-2026');
});
