/** Field-level regression receipts. Primary sources and scope: docs/EAT-FACT-CORRECTIONS-2026-10-09.md.
 * Contacts/marker are verified values, not current menu snapshots. A later verified change should update this receipt and evidence together. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const venue=slug=>JSON.parse(fs.readFileSync(new URL(`../src/content/venues/${slug}.json`,import.meta.url),'utf8'));
const publicCopy=v=>[v.signature,v.editorNote,v.whyWeGo,v.ifOnlyOneThing,...(v.knownFor??[])].join('\n');
test('corrected dining contacts retain primary operator evidence',()=>{
  assert.equal(venue('port-phillip-estate-restaurant').phone,'+61 3 5989 4444');
  const b=venue('barragunda-dining');
  assert.equal(b.phone,'+61 3 8644 4050');
  assert.match(b.address,/113 Cape Schanck Rd/);
  assert.ok(Math.abs(b.coordinates.lat-(-38.46803496820978))<0.00001&&Math.abs(b.coordinates.lng-144.89851034298496)<0.00001,'address correction must retain the operator venue marker');
});
test('Merricks does not inherit unrelated winery or past-event menu claims',()=>{
  const copy=publicCopy(venue('merricks-general-wine-store'));
  assert.doesNotMatch(copy,/Barragunda|wood[- ]fired pizza|Sunday lamb roast|order the Sunday/i);
  assert.match(copy,/Elgee Park/);assert.match(copy,/Baillieu/);
});
test('Barragunda does not promise all-farm sourcing or invented booking lead time',()=>{
  const copy=publicCopy(venue('barragunda-dining'));
  assert.doesNotMatch(copy,/built entirely|book at least four weeks|essential Peninsula dinners/i);
  assert.match(copy,/local producers/);assert.match(copy,/Wildlife Fisheries/);
});
test('Commonfolk avoids a stale guaranteed dish or unsupported award-like superlative',()=>{
  assert.doesNotMatch(publicCopy(venue('commonfolk-coffee')),/best egg sandwich|order the egg sandwich|come before ten/i);
});
test('corrected destinations cannot regain known-wrong contact points or old map pins',()=>{
  const expected={
    'barmah-park':{address:'945 Moorooduc Hwy, Moorooduc VIC 3933'},
    'flinders-general-store':{address:'48 Cook St, Flinders VIC 3929',phone:'+61 3 5989 0207'},
    'green-olive-red-hill':{address:'1180 Mornington-Flinders Rd, Main Ridge VIC 3928',phone:'+61 409 997 400'},
    'jetty-road-brewery':{phone:'+61 3 5987 2754'},
    'main-ridge-dairy':{phone:'+61 3 5989 6622'},
    'martha-s-table':{address:'5 Waterfront Place, Safety Beach VIC 3936',phone:'+61 3 9617 5377'},
    'mr-vincenzos':{address:'784 Esplanade, Mornington VIC 3931',phone:'+61 3 4327 9392'},
    'mornington-peninsula-chocolates':{address:'45 Cook St, Flinders VIC 3929',phone:'+61 3 5989 0040'},
    'stillwater-crittenden':{phone:'+61 3 5987 3800'},
  };
  for(const [slug,fields] of Object.entries(expected))for(const [field,value] of Object.entries(fields))assert.equal(venue(slug)[field],value,`${slug}.${field}: update the primary-source receipt if operator evidence changes`);
  for(const slug of ['barmah-park','flinders-general-store','green-olive-red-hill','martha-s-table','mr-vincenzos','mornington-peninsula-chocolates'])assert.equal(venue(slug).coordinates,undefined,`${slug}: changed address needs new exact-marker evidence before a point can be reinstated`);
});
test('physical brewery identity and retail pause remain distinct from brand closure',()=>{
  const b=venue('mornington-peninsula-brewery');assert.equal(b.name,'Tar Barrel Brewery & Distillery');assert.equal(b.slug,'mornington-peninsula-brewery');assert.equal(b.website,'https://tarbarrel.com.au/');assert.doesNotMatch(publicCopy(b),/live music Friday nights/i);
  const j=venue('johnny-ripe');assert.equal(j.status,'paused');assert.equal(j.slug,'johnny-ripe');assert.notEqual(j.operatingStatus,'permanently-closed');assert.match(j.closureNote,/brand continues/);
});
test('reconciled operator destinations avoid parked domains and invented map points',()=>{
  const d=venue('dromana-hotel');assert.equal(d.name,'Stella’s Hotel Dromana');assert.equal(d.website,'https://stellasdromanahotel.com.au/');assert.equal(d.phone,'+61 3 5987 1922');assert.match(d.address,/151 Point Nepean Rd/);assert.equal(d.coordinates,undefined);
  const a=venue('allis-wine-bar');assert.equal(a.slug,'allis-wine-bar');assert.equal(a.name,'Ten Minutes by Tractor Cellar Door Dining');assert.equal(a.website,'https://www.tenminutesbytractor.com.au/contact');
  const g=venue('georgie-bass');assert.equal(g.website,undefined);assert.equal(g.bookingUrl,undefined);
  const j=venue('johnny-ripe');assert.ok(j.address?.length);assert.equal(j.knownFor,undefined);assert.equal(j.coordinates,undefined);
});
