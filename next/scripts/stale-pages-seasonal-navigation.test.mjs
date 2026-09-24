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

test('seasonal navigation selects the current priority guide and keeps other seasons lower down', () => {
  const index = read('src/pages/site-index.astro');
  const search = read('src/pages/search.astro');
  const springWineIntent = search.match(/aliases:\s*\[([^\]]+)\],\s*title:\s*'Mornington Peninsula Wine & Wineries'/);

  assert.match(index, /getAustralianSeason/);
  assert.match(index, /seasonalPriority/);
  assert.match(index, /Mornington Peninsula in Autumn/);
  assert.match(index, /href: '\/journal\/the-spring-peninsula\/'/);
  assert.match(index, /href: '\/journal\/autumn-weekend-edit\/'/);
  assert.ok(springWineIntent, 'the retained Spring Wine result must define aliases');
  assert.match(springWineIntent[1], /'winter wineries'/);
  assert.match(springWineIntent[1], /'winter winery'/);
  assert.match(springWineIntent[1], /'winter wine'/);
  assert.match(springWineIntent[1], /'winter wine weekend'/);
  assert.doesNotMatch(search, /"Winter wineries"/);
});

test('retired editorial references and inaccurate alert cadence are absent from public sources', () => {
  assert.match(read('src/layouts/BaseLayout.astro'), /publishingPrinciples: `\$\{SITE_URL\}\/about\//);
  assert.doesNotMatch(read('public/llms.txt'), /editorial-approach/);
  assert.match(read('public/llms.txt'), /https:\/\/peninsulainsider\.com\.au\/about\//);
  assert.doesNotMatch(read('src/pages/alerts.astro'), /weekly digest/i);
  assert.doesNotMatch(read('src/pages/alerts.astro'), /Email digest \(weekly Sunday\)/);
});

test('Journal keeps the September lead as its fallback and otherwise selects the newest article', () => {
  const front = JSON.parse(read('src/data/journal-front.json'));
  const journal = read('src/pages/journal/index.astro');

  assert.equal(front.leadFallback, front.lead);
  assert.match(journal, /fresh\?\[curation\.lead,curation\.leadFallback\]:\[\]/);
  assert.doesNotMatch(journal, /selectedOn\s*===\s*['"]2026-/);
});

test('seasonal maintenance regression is part of the CI build contract', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['test:stale-pages-seasonal-navigation'], 'node --test scripts/stale-pages-seasonal-navigation.test.mjs');
  assert.match(pkg.scripts.build, /npm run test:stale-pages-seasonal-navigation/);
});
