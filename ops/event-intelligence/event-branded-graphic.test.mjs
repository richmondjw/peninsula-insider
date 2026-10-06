import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEditorial} from './editorial-policy.mjs';
import {hash} from './data.mjs';
import {inspectImageBytes} from './image-byte-inspection.mjs';
import {renderEventBrandedGraphic} from './event-branded-graphic.mjs';

const now=new Date('2026-10-06T00:00:00Z');
function context(title='Official <Library> workshop',venueName='Mornington Library') {
  const url='https://official.example/event';
  const fields={title,venueName,officialEventUrl:url,startDate:'2026-10-08T10:00:00+11:00',endDate:'2026-10-08T11:00:00+11:00',status:'scheduled'};
  const body=JSON.stringify({...fields,kind:'event',shire:{shire:'MORNINGTON PENINSULA SHIRE',venueName:fields.venueName}});
  const source={id:'graphic-capture',sourceId:'fixture',authority:'official',url,body,hash:hash(body),retrievedAt:now.toISOString()};
  const listing={id:'graphic-fixture',kind:'event',timezone:'Australia/Melbourne',fields,geography:{shireConfirmed:true,evidenceId:source.id},proofs:Object.fromEntries(Object.entries(JSON.parse(body)).map(([key,value])=>[key,{evidenceId:source.id,pointer:'/'+key,value}]))};
  const evidence=[source],editorialOptions={registry:[{id:'fixture',authority:'official',url,hosts:['official.example']}],catalogue:[listing],catalogueComplete:true};
  const decision=evaluateEditorial(listing,evidence,{...editorialOptions,now});
  assert.equal(decision.decision,'publish-eligible');
  return {listing,decision,evidence,editorialOptions,now};
}

test('current verified facts produce an original bounded raster with no publication or reuse claim', async () => {
  const result=await renderEventBrandedGraphic(context());
  const decoded=await inspectImageBytes(result.bytes);
  assert.equal(decoded.assetHash,result.assetHash);
  assert.deepEqual([decoded.width,decoded.height],[1200,630]);
  assert.equal(result.publicationAuthorityGranted,false);
  assert.equal(result.reusePermission,'not-assessed');
  assert.equal(result.title,'Official <Library> workshop');
});

test('stale or mutated editorial context cannot generate event artwork', async () => {
  const value=context();
  await assert.rejects(renderEventBrandedGraphic({...value,decision:null}),/Current editorial/);
  await assert.rejects(renderEventBrandedGraphic({...value,now:new Date('2026-10-10T00:00:00Z')}),/Current editorial/);
  await assert.rejects(renderEventBrandedGraphic({...value,listing:{...value.listing,fields:{...value.listing.fields,title:'Changed'}}}),/Current editorial/);
});

test('verified but visually wide title and footer refuse a clipped graphic', async () => {
  await assert.rejects(renderEventBrandedGraphic(context('WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW')),/title cannot fit safely/);
  await assert.rejects(renderEventBrandedGraphic(context('Workshop','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW')),/venue cannot fit safely/);
});

test('review clock is snapshotted before asynchronous rendering and only events receive the event label', async () => {
  const value=context(), mutableNow=new Date(value.now);
  const validatedRevision=value.decision.revision;
  const pending=renderEventBrandedGraphic({...value,now:mutableNow});
  mutableNow.setUTCFullYear(2099);
  value.decision.revision='forged-after-validation';
  const result=await pending;
  assert.equal(result.checkedAt,value.now.toISOString());
  assert.equal(result.listingRevision,validatedRevision);
  await assert.rejects(renderEventBrandedGraphic({...value,listing:{...value.listing,kind:'experience'}}),/Event listing required/);
});
