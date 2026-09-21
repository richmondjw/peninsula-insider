import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./plan-match.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { matchPlans, assessPlan, matchesLength } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

const plans = [
  { id: 'family', kind: 'itinerary', dayCount: 1, editorialPriority: 85, facets: { party: ['family'], cat: ['beach'], date: ['this-season'] } },
  { id: 'weekend', kind: 'itinerary', dayCount: 3, editorialPriority: 100, facets: { party: ['couples'], cat: ['food-wine'], mood: ['slow'] } },
  { id: 'rain-guide', kind: 'guide', editorialPriority: 999, facets: { party: ['family'], mood: ['rainy-day'], cat: ['markets'] } },
];

test('editorial priority makes the unfiltered choice, regardless of publication date', () => {
  const result = matchPlans(plans.map(p => ({ ...p, publishedAt: p.id === 'family' ? 10000 : 1 })), {});
  assert.deepEqual(result.ids, ['weekend', 'family']);
});
test('advice articles never masquerade as usable itineraries', () => {
  assert.deepEqual(matchPlans(plans, { weather: 'rainy-day' }).ids, []);
  assert.equal(matchPlans(plans, { weather: 'rainy-day' }).exact, false);
});
test('independent family, one-day and markets choices remain visible in the fit', () => {
  const result = matchPlans(plans, { length: 'one-day', who: 'family', into: ['markets'] });
  assert.deepEqual(result.ids, ['family']);
  assert.equal(result.exact, false);
  assert.deepEqual(result.fits[0].matched, ['length:one-day','who:family']);
  assert.deepEqual(result.fits[0].missing, ['into:markets']);
});
test('season and capped interest scores cannot create a false exact match', () => {
  const partial = { id:'partial', kind:'itinerary', facets:{ cat:['food-wine','beach'], date:['this-season'] } };
  const result = matchPlans([partial], { into:['food-wine','beach','markets'] });
  assert.equal(result.exact, false);
  assert.deepEqual(result.fits[0].missing, ['into:markets']);
});
test('wet weather is retained alongside audience and time instead of replacing them', () => {
  const fit = assessPlan(plans[0], { length:'one-day', who:'family', weather:'rainy-day' });
  assert.deepEqual(fit.matched, ['length:one-day','who:family']);
  assert.deepEqual(fit.missing, ['weather:rainy-day']);
  assert.equal(fit.exact, false);
});
test('known itinerary duration overrides an imprecise date facet', () => {
  assert.equal(matchesLength({ id:'three', dayCount:3, facets:{date:['one-day']} },'one-day'), false);
  assert.equal(matchesLength(plans[1], 'weekend'), true);
});
test('exact results lead partial matches, ties are deterministic, and output is bounded', () => {
  const exact = { id:'exact', kind:'itinerary', dayCount:1, editorialPriority:0, facets:{party:['family'],cat:['beach']} };
  const noisy = { id:'partial', kind:'itinerary', dayCount:1, editorialPriority:1000, facets:{party:['family']} };
  assert.deepEqual(matchPlans([noisy,exact], {who:'family',into:['beach']},1).ids,['exact']);
  const ties=[{id:'b',facets:{},kind:'itinerary'},{id:'a',facets:{},kind:'itinerary'}];
  assert.deepEqual(matchPlans(ties,{}).ids,matchPlans([...ties].reverse(),{}).ids);
  assert.deepEqual(matchPlans(plans,{},0).ids,[]);
});
test('a zero-overlap plan is not padded into the answer', () => {
  assert.deepEqual(matchPlans(plans,{into:['golf']}).ids,[]);
  assert.deepEqual(matchPlans(plans,{length:'one-day'}).ids,['family']);
});
