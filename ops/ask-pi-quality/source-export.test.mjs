import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {baseline,bundle} from './staging-fixtures.mjs';
import {prepareSnapshot} from '../lib/concierge-snapshot.mjs';
import {groundEventRecords} from '../lib/concierge-event-grounding.mjs';
import {readPinnedEventSources,validateCmsEventSnapshot,readCmsEventSnapshot,exportEventManifest} from '../lib/concierge-source-export.mjs';
const now=new Date(baseline.now),sha=text=>createHash('sha256').update(text).digest('hex');
const source=()=>({slug:baseline.records[0].id,data:{...structuredClone(baseline.records[0].data),lastVerifiedAt:baseline.records[0].verifiedAt}});
const pinned=sources=>({revision:'a'.repeat(40),sources:sources??[source()]});
const cms=(rows=[])=>{const rows_payload=JSON.stringify(rows);return {version:1,revision:sha(rows_payload),rows_payload,row_count:rows.length,observed_at:now.toISOString()};};
const row=(overrides={})=>({id:'001',entity_type:'event',entity_slug:source().slug,field_path:'title',field_kind:'text',locale:null,value:'Published CMS title',status:'published',updated_at:now.toISOString(),...overrides});
const build=(overrides={})=>exportEventManifest({pinned:pinned(),cms:cms(),bundle,id:'export-1',now,...overrides});
test('pinned reader enumerates committed recursive sources without worktree or network dependence',()=>{
 const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const result=readPinnedEventSources(process.cwd(),revision);assert.equal(result.revision,revision);assert(result.sources.length>100);assert(result.sources.every(r=>r.blob.length===40&&r.path.startsWith('next/src/content/events/')));
 assert.throws(()=>readPinnedEventSources(process.cwd(),'HEAD'),/full commit/);
});
test('published CMS title wins with distinct raw/effective revision and complete accounting',()=>{
 const raw=build(),edited=build({cms:cms([row()])});
 assert.equal(edited.records[0].data.title,'Published CMS title');assert.equal(edited.manifest.sourceRecords[0].revision,raw.manifest.sourceRecords[0].revision);assert.notEqual(edited.records[0].revision,raw.records[0].revision);
 assert.equal(edited.manifest.cmsOutcomes[0].status,'applied');assert.equal(edited.records[0].verifiedAt,new Date(baseline.records[0].verifiedAt).toISOString());
 assert.equal(edited.manifest.contentPublishedAt,null);assert.equal(edited.manifest.ingestedAt,now.toISOString());
});
test('unknown source verification stays unknown rather than becoming ingestion time',()=>{
 const s=source();delete s.data.lastVerifiedAt;const result=build({pinned:pinned([s])});assert.equal(result.records[0].verifiedAt,null);assert.equal(result.manifest.sourceVerifiedAt,null);
});
test('date-only verification preserves Melbourne day precision without fabricating UTC midnight',async()=>{
 const s=source();delete s.data.lastVerifiedAt;s.data.lastCheckedDate='2026-11-17';
 const result=build({pinned:pinned([s])});assert.equal(result.records[0].verifiedAt,null);assert.equal(result.records[0].sourceVerificationDate,'2026-11-17');
 assert.equal(result.manifest.sourceVerifiedAt,null);assert.equal(groundEventRecords(result.records,baseline.context,now).disposition,'answer');
 await prepareSnapshot(null,result.manifest,result.records,{dimensions:2,embed:async()=>[1,0]});
 s.data.lastCheckedDate='2026-11-18';assert.throws(()=>build({pinned:pinned([s])}),/verification clock/);
});
test('CMS title or summary cannot change source-derived monthly cadence',()=>{
 const s=source();s.data.recurrence='monthly';s.data.title='Second Saturday market';s.data.startDate='2026-01-10';s.data.endDate='2027-12-31';
 assert.throws(()=>build({pinned:pinned([s]),cms:cms([row({value:'Third Sunday market'})])}),/changes source occurrence rule/);
 const summarized=structuredClone(s);summarized.data.title='Monthly market';summarized.data.summary='Second Saturday market';
 assert.throws(()=>build({pinned:pinned([summarized]),cms:cms([row({field_path:'summary',value:'Third Sunday market'})])}),/changes source occurrence rule/);
 const corrected=build({pinned:pinned([s]),cms:cms([row({value:'Second Saturday local market'})])});assert.equal(corrected.records[0].data.title,'Second Saturday local market');
});
test('CMS ambiguity, unsupported structured edits, stale receipt and truncation fail closed',async()=>{
 for(const receipt of [cms([row({field_path:'cancelled',value:'false'})]),cms([row({field_kind:'richtext'})]),cms([row({locale:'en'})]),cms([row(),row({id:'002'})]),{...cms(),row_count:1},{...cms(),revision:'f'.repeat(64)},{...cms(),observed_at:'2026-01-01T00:00:00Z'}])assert.throws(()=>build({cms:receipt}));
 await assert.rejects(readCmsEventSnapshot(async()=>[]),/envelope/);
});
test('orphaned and empty CMS rows have explicit reasons and never mutate source/CMS',()=>{
 const receipt=cms([row({value:''}),row({id:'002',entity_slug:'removed-source'})]),before=structuredClone(receipt);
 const result=build({cms:receipt});assert.deepEqual(result.manifest.cmsOutcomes.map(r=>r.reason),['empty-display-override','source-deleted']);assert.deepEqual(receipt,before);
});
test('cancelled records remain accounted for and remove previously indexed identity atomically',async()=>{
 const initial=build(),previous=await prepareSnapshot(null,initial.manifest,initial.records,{dimensions:2,embed:async()=>[1,0]});
 const cancelled=source();cancelled.data.cancelled=true;
 const next=build({pinned:pinned([cancelled]),previous,id:'export-2'});
 assert.equal(next.manifest.indexRows.length,0);assert.equal(next.manifest.outcomes[0].status,'excluded');assert.deepEqual(next.manifest.removedIds,[cancelled.slug]);
});
test('1007 sources and CMS rows are exhaustive, including deletions of a published override',()=>{
 const sources=Array.from({length:1007},(_,i)=>{const s=source();s.slug=`synthetic-${i}`;s.data.slug=s.slug;return s;});
 const rows=sources.map((s,i)=>row({id:String(i).padStart(5,'0'),entity_slug:s.slug}));
 const result=build({pinned:pinned(sources),cms:cms(rows)});assert.equal(result.manifest.sourceRecords.length,1007);assert.equal(result.manifest.cmsOutcomes.length,1007);assert.equal(result.manifest.pages[0].ids.length,1007);
 const edited=build({cms:cms([row()])}),reverted=build();assert.equal(edited.records[0].id,reverted.records[0].id);assert.notEqual(edited.records[0].revision,reverted.records[0].revision);assert.equal(reverted.records[0].data.title,source().data.title);
});
