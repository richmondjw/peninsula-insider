import test from 'node:test';
import assert from 'node:assert/strict';
import { routePreview } from './plan-preview.ts';

test('route preview preserves a return trip and separates days without inventing travel time', () => {
  const stops = [
    {day:1,title:'Stay',placeLabel:'Sorrento'}, {day:1,title:'Beach',placeLabel:'Sorrento'},
    {day:1,title:'Dinner',placeLabel:'Merricks'}, {day:1,title:'Stay',placeLabel:'Sorrento'},
    {day:2,title:'Unmapped stop'},
  ];
  assert.equal(routePreview({stops}), 'Day 1: Sorrento → Merricks → Sorrento · Day 2: Unmapped stop');
  assert.doesNotMatch(routePreview({stops}), /minutes|km/);
});
