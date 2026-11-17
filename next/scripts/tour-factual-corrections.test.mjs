import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(type,slug)=>JSON.parse(readFileSync(new URL(`../src/content/${type}/${slug}.json`,import.meta.url),'utf8'));
test('Rick does not advertise unsupported free cancellation or comparison',()=>{
 const t=read('tours','ricks-mornington-peninsula-wine-tour');
 assert.doesNotMatch(t.intro,/20 to 40|undercuts/);
 assert.doesNotMatch(t.bookingIntelligence,/Free cancellation/);
 assert.match(t.cancellationPolicy,/overlapping refund provisions/);
 assert.equal(t.priceLow,undefined);
});
test('Amour lunch, Saturday capacity and private format remain qualified',()=>{
 const t=read('tours','amour-of-the-grape-boutique-wine-tour');
 assert.equal(t.maxGroupSize,11);
 assert.match(t.intro,/eleven.*Saturdays/);
 assert.match(t.intro,/private departure must be specifically requested/);
 assert.match(t.faq.find(f=>f.question==='Is lunch included?').answer,/includes a multi-course tapas lunch/);
 assert.equal(t.bookingUrl,'https://www.amourofthegrape.com.au/tours/wine-tours-mornington-peninsula/');
});
