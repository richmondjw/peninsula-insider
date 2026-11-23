import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const load = async name => {
  const source = readFileSync(new URL(name, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
};
const { finderOptions, finderRows, listLabels } = await load('./plan-finder.ts');
const { matchesLength, matchPlans } = await load('./plan-match.ts');

const facets = {
  cat: [{ value: 'plan', label: 'Plans' }, { value: 'walk', label: 'Walks' }, { value: 'golf', label: 'Golf' }, { value: 'winery', label: 'Wineries' }],
  mood: [{ value: 'slow', label: 'Slow' }, { value: 'rainy-day', label: 'Rainy day' }, { value: 'wellness', label: 'Wellness' }],
  party: [{ value: 'couples', label: 'Couples' }, { value: 'family', label: 'Family' }, { value: 'solo', label: 'Solo' }],
};
const plans = [
  { id: 'itinerary:day', kind: 'itinerary', dayCount: 1, editorialPriority: 1, facets: { cat: ['plan', 'walk'], party: ['family'], mood: ['rainy-day'] } },
  { id: 'itinerary:weekend', kind: 'itinerary', dayCount: 3, editorialPriority: 5, facets: { cat: ['plan', 'winery'], party: ['couples'], mood: ['slow'] } },
  { id: 'article:guide', kind: 'guide', facets: { cat: ['golf'], party: ['solo'], mood: ['wellness'] } },
];

test('the finder offers only choices a published plan can answer', () => {
  const options = finderOptions(plans, facets);
  assert.deepEqual(options.who.map(o => o.value), ['couples', 'family', 'solo']);
  assert.deepEqual(options.interests.map(o => o.value), ['walk', 'golf', 'winery', 'slow', 'wellness']);
  assert.ok(!options.interests.some(o => o.value === 'plan' || o.value === 'rainy-day'), 'the collection tag and the weather option are not interests');
});

test('the table lists itineraries only, in editorial order, with the labels the form shows', () => {
  const rows = finderRows(plans, finderOptions(plans, facets), matchesLength);
  assert.deepEqual(rows.map(row => row.plan.id), ['itinerary:weekend', 'itinerary:day']);
  assert.deepEqual(rows[0], { plan: plans[1], lengths: ['A weekend', 'Two nights or more'], who: ['Couples'], interests: ['Wineries', 'Slow'] });
  assert.deepEqual(rows[1].lengths, ['One day']);
});

test('every label in a row is a choice that returns that itinerary as an exact match', () => {
  const options = finderOptions(plans, facets);
  const value = (list, label) => list.find(o => o.label === label).value;
  for (const row of finderRows(plans, options, matchesLength)) {
    for (const label of row.lengths) assert.ok(matchPlans(plans, { length: value(options.lengths, label) }, 9).fits.some(f => f.id === row.plan.id && f.exact));
    for (const label of row.who) assert.ok(matchPlans(plans, { who: value(options.who, label) }, 9).fits.some(f => f.id === row.plan.id && f.exact));
    for (const label of row.interests) assert.ok(matchPlans(plans, { into: [value(options.interests, label)] }, 9).fits.some(f => f.id === row.plan.id && f.exact));
  }
});

test('labels join as prose', () => {
  assert.equal(listLabels([]), '');
  assert.equal(listLabels(['Couples']), 'Couples');
  assert.equal(listLabels(['Couples', 'Family']), 'Couples and Family');
  assert.equal(listLabels(['Couples', 'Family', 'Group']), 'Couples, Family and Group');
});
