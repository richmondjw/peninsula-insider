import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = fileURLToPath(new URL('..', import.meta.url));
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

// Explicit-date review stays deterministic and runs under the existing build suite.
import { stalePlanDates } from './review-stale-plan-dates.mjs';
test('evergreen date review flags expired claims without inventing dates or treating metadata as copy', () => {
  const plan={slug:'fixture',lastVerified:'2020-01-01',stops:[{note:'Oktoberfest 24 October 2026. Also 2026-10-24. Next 20 November 2026.'}]};
  assert.deepEqual(stalePlanDates(plan,'2026-11-17').map(f=>f.date),['2026-10-24']);
  assert.deepEqual(stalePlanDates({slug:'none',lastVerified:'2020-01-01',dek:'Every Saturday, 24 October; 31 February 2026.'},'2026-11-17'),[]);
  assert.deepEqual(stalePlanDates({slug:'same',dek:'17 November 2026'},'2026-11-17'),[]);
  assert.throws(()=>stalePlanDates(plan,'2026-02-30'));
});
test('family itinerary has no expired date claims and references the correct starting locality', () => {
  const plan=JSON.parse(read('src/content/itineraries/the-family-day-out.json'));
  const eagle=JSON.parse(read('src/content/experiences/arthurs-seat-lookout.json'));
  assert.deepEqual(stalePlanDates(plan,'2026-11-17'),[]);
  assert.equal(plan.anchorTown,'arthurs-seat'); assert.equal(eagle.place,'arthurs-seat');
  assert.deepEqual(plan.baseTowns,['arthurs-seat','red-hill','mount-martha','mornington']);
  assert.match(plan.stops[2].note,/does not confirm a patrol/);
  assert.doesNotMatch(JSON.stringify(plan.stops),/Oktoberfest|24 October 2026/);
});

test('reported events keep their sourced occurrence identity and complete summaries', () => {
  const event=(slug)=>JSON.parse(read(`src/content/events/${slug}.json`));
  const will=event('will-rounds-live-at-peppers-moonah-links-resort-2026-11-20');
  assert.equal(will.startDate,'2026-11-20'); assert.equal(new Date(`${will.startDate}T12:00:00Z`).getUTCDay(),5);
  assert.match(will.summary,/Friday 20 November/); assert.doesNotMatch(will.summary,/each|every|Saturday/);
  const garden=event('culinary-garden-experience-at-laura-pt-leo-estate-2026-11-22');
  assert.match(garden.summary,/Ella Swann/); assert.match(garden.summary,/vegetarian lunch/); assert.doesNotMatch(garden.summary,/Pt\.$/);
  const pottery=event('create-pottery-for-your-table');
  assert.equal(pottery.category,'arts'); assert.equal(pottery.subcategory,'workshop'); assert.match(pottery.summary,/workshop/);
  for(const e of [will,garden,pottery]) { assert.equal(e.lastCheckedDate,'2026-11-09'); assert.ok(e.eventId); }
});
