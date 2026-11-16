import assert from 'node:assert/strict';
import test from 'node:test';

import { eventAccessLabel, eventIsUnqualifiedFree } from '../src/lib/event-access.mjs';
const verifiedPrice = label => ({label,sourceUrl:'https://example.com/synthetic-price',checkedAt:new Date(Date.now()-3600000).toISOString(),validUntil:new Date(Date.now()+3600000).toISOString()});

test('unqualified free events keep the Free label', () => {
  const data = { priceTier: 'free', freePaid: 'Free', verifiedPrice: verifiedPrice('Free') };
  assert.equal(eventAccessLabel(data), 'Free');
  assert.equal(eventIsUnqualifiedFree(data), true);
});

test('included-with-admission activities do not collapse to Free', () => {
  const data = { priceTier: 'free', freePaid: 'Free (included with bathing)', verifiedPrice: verifiedPrice('Free (included with bathing)') };
  assert.equal(eventAccessLabel(data), 'Included with bathing');
  assert.equal(eventIsUnqualifiedFree(data), false);
});

test('mixed paid and free records do not collapse to Free', () => {
  const data = { priceTier: 'under-50', freePaid: 'Paid (hunt) / Free entry (farmgate)', verifiedPrice: verifiedPrice('Paid (hunt) / Free entry (farmgate)') };
  assert.equal(eventAccessLabel(data), 'Paid and free options');
  assert.equal(eventIsUnqualifiedFree(data), false);
});

test('free-entry records keep entry context', () => {
  const data = { priceTier: 'free', freePaid: 'Free (entry)', verifiedPrice: verifiedPrice('Free (entry)') };
  assert.equal(eventAccessLabel(data), 'Free entry');
  assert.equal(eventIsUnqualifiedFree(data), false);
});

test('raw free flags and expired verified prices never produce an access price claim',()=>{for(const data of [{priceTier:'free',freePaid:'Free',lens:['free']},{verifiedPrice:{...verifiedPrice('Free'),validUntil:new Date(Date.now()-1000).toISOString()}}]){assert.equal(eventAccessLabel(data),null);assert.equal(eventIsUnqualifiedFree(data),false);}});

test('qualified verified free offers preserve the qualifier and supplied-clock expiry',()=>{const data={verifiedPrice:verifiedPrice('Free for children')};assert.equal(eventAccessLabel(data),'Free for children');assert.equal(eventIsUnqualifiedFree(data),false);const free={verifiedPrice:verifiedPrice('Free')};assert.equal(eventIsUnqualifiedFree(free,new Date(free.verifiedPrice.validUntil)),false);});
