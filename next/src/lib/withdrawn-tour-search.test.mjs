import assert from 'node:assert/strict';
import test from 'node:test';
import { isWithdrawnTourSearchHit } from './withdrawn-tour-search.mjs';

test('suppress the three verified stale RPC identities', () => {
  for (const slug of ['bunyip-hot-springs-day-tour', 'bunyip-mornington-peninsula-wine-tour', 'global-ballooning-peninsula-sunrise']) {
    assert.equal(isWithdrawnTourSearchHit({ entity_type:'tour', entity_slug:slug }), true);
    assert.equal(isWithdrawnTourSearchHit({ entity_type:'article', entity_slug:slug }), false);
    assert.equal(isWithdrawnTourSearchHit({ entity_type:'tour', entity_slug:slug+'-other' }), false);
  }
});

test('retain Local Way and unrelated results without changing rows or order', () => {
  const retained = [
    {entity_type:'tour',entity_slug:'local-way-wine-cheese-tour',title:'Local Way'},
    {entity_type:'tour',entity_slug:'plunge-hot-springs-wine-tour'},
    {entity_type:'tour-operator',entity_slug:'local-way-tours'},
    {entity_type:'article',entity_slug:'history',title:'Bunyip and ballooning history'},
  ];
  const stale = {entity_type:'tour',entity_slug:'bunyip-hot-springs-day-tour'};
  const input = [retained[0],stale,...retained.slice(1)];
  assert.deepEqual(input.filter(hit=>!isWithdrawnTourSearchHit(hit)),retained);
  assert.equal(input.length,5);
  for (const hit of [null,{},...retained]) assert.equal(isWithdrawnTourSearchHit(hit),false);
});
