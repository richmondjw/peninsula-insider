import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateClaims, hash, resolveFixture, validateFixture } from './evaluator.mjs';
import { bundleKey, cacheKey, promote, rollback, validateManifest } from './manifest.mjs';
import { weekendWindow, isoDate } from '../../next/src/lib/event-schedule.ts';
const fixtures = JSON.parse(await readFile(new URL('./fixtures.v1.json', import.meta.url), 'utf8'));
const baseline = fixtures.cases[0];
const candidateFor = f => {const r = resolveFixture(f); return {disposition:r.disposition,season:r.season,claims:r.matches.map(({id,revision,occurrence,href,place})=>({id,revision,occurrence,href,place}))};};
const manifest = () => {
  const sourceRecords = [{id:'event-a',revision:'source-v1',effectiveRevision:'cms-v2',admission:'index'}, {id:'cancelled-b',revision:'v3',effectiveRevision:'v3',admission:'exclude',exclusionReason:'cancelled'}];
  return {schemaVersion:1,id:'snapshot-2',sourceRevision:'commit-2',sourceDigest:hash(sourceRecords),sourceRecords,
    sourceVerifiedAt:'2026-11-01T00:00:00Z',contentPublishedAt:'2026-11-16T00:00:00Z',ingestedAt:'2026-11-16T01:00:00Z',retrievedAt:'2026-11-16T02:00:00Z',
    bundle:{indexSchema:'events-v1',embeddingModel:'none-offline',promptRevision:'prompt-v1',appRevision:'app-v2'},
    state:'complete',failures:[],lockHeld:true,
    pages:[{cursor:null,nextCursor:null,snapshot:'commit-2',ids:sourceRecords.map(r=>r.id)}],
    outcomes:[{id:'event-a',status:'indexed',revision:'cms-v2'},{id:'cancelled-b',status:'excluded',reason:'cancelled'}],
    indexRows:[{id:'event-a',revision:'cms-v2'}],previousIndexedIds:['event-a','cancelled-b','deleted-c'],removedIds:['cancelled-b','deleted-c']};
};

test('development fixture schema rejects invalid clock, duplicate identity and impossible dates', () => {
  for (const f of fixtures.cases) assert.deepEqual(validateFixture(f),[]);
  for (const patch of [{now:'not-a-date'}, {context:{...baseline.context,start:'2026-02-30'}}, {records:[...baseline.records,...baseline.records]}]) assert(validateFixture({...baseline,...patch}).length);
});
test('valid grounded answer is accepted; blanket abstention on answerable task fails', () => {
  assert.equal(evaluateClaims(baseline,candidateFor(baseline)).pass,true);
  assert.equal(evaluateClaims(baseline,{disposition:'abstain',claims:[]}).pass,false);
});
test('screenshot error, wrong occurrence, locality and revision are rejected', () => {
  const good = candidateFor(baseline);
  assert(evaluateClaims(baseline,{...good,season:'winter'}).errors.includes('season'));
  for (const patch of [{occurrence:'2026-06-12'},{revision:'old-v1'},{place:'main-ridge'},{id:'invented-truffle'},{href:'/whats-on/unrelated/'}]) {
    assert.equal(evaluateClaims(baseline,{...good,claims:[{...good.claims[0],...patch}]}).pass,false);
  }
});
test('unknown opening hours and live availability cannot be invented', () => {
  const f=fixtures.cases.find(f=>f.id==='unknown-time-and-booking'),good=candidateFor(f);
  for(const patch of [{startTime:'09:00'},{endTime:'17:00'},{bookingAvailable:true},{price:'free'}]) assert.equal(evaluateClaims(f,{...good,claims:[{...good.claims[0],...patch}]}).pass,false);
});
test('cancelled, unavailable and unverified contexts reject recommendations', () => {
  for(const id of ['cancelled','postponed-no-date','unavailable-source','no-verified-events']) {
    const f=fixtures.cases.find(f=>f.id===id);
    assert.equal(evaluateClaims(f,candidateFor(baseline)).pass,false);
    assert.equal(evaluateClaims(f,candidateFor(f)).pass,true);
  }
});
test('retrieved instructions confer no action or private data permission', () => {
  const f=fixtures.cases.find(f=>f.id==='retrieved-instruction-is-data');
  assert.equal(evaluateClaims(f,{...candidateFor(f),actions:['book'],privateData:['synthetic-secret']}).pass,false);
});
test('Melbourne Sunday remains in its own weekend across DST', () => {
  const w=weekendWindow(new Date('2026-10-03T13:30:00Z'));
  assert.equal(isoDate(w.start),'2026-10-02'); assert.equal(isoDate(w.end),'2026-10-04');
});
test('valid source ledger accounts for CMS overrides, cancellations and deletion',()=>assert.deepEqual(validateManifest(manifest()),[]));
test('malformed manifests fail closed without throwing',()=>{
  for(const value of [null,{}, {schemaVersion:1}, {...manifest(),sourceRecords:[null]}, {...manifest(),pages:[null]}, {...manifest(),outcomes:[null]}]) assert(validateManifest(value).length);
});

const mutations = [
  ['missing source outcome',m=>m.outcomes.pop()],
  ['unjustified exclusion',m=>m.outcomes[0]={id:'event-a',status:'excluded',reason:'cap'}],
  ['old source instead of CMS override',m=>m.indexRows[0].revision='source-v1'],
  ['duplicate index identity',m=>m.indexRows.push(m.indexRows[0])],
  ['unexpected stale row',m=>m.indexRows.push({id:'deleted-c',revision:'old'})],
  ['missing delete receipt',m=>m.removedIds=[]],
  ['partial source traversal',m=>m.pages[0].nextCursor='page-2'],
  ['mixed snapshot pagination',m=>m.pages[0].snapshot='old-commit'],
  ['page cap drops source id',m=>m.pages[0].ids.pop()],
  ['failed record',m=>m.outcomes[0].status='failed'],
  ['partial ingestion',m=>m.state='staging'],
  ['source retrieval failure',m=>m.failures=['fetch-failed']],
  ['crash before lock acquisition',m=>m.lockHeld=false],
  ['changed bytes without digest',m=>m.sourceRecords[0].effectiveRevision='cms-v3'],
  ['missing rollback component',m=>delete m.bundle.promptRevision],
  ['retrieval predates ingestion',m=>m.retrievedAt='2026-10-01T00:00:00Z'],
];
for(const [label,mutate] of mutations) test(`manifest rejects ${label} and preserves last-known-good`,()=>{
  const previous=manifest(),before=hash(previous),candidate=manifest();mutate(candidate);
  const result=promote(previous,candidate);
  assert.equal(result.promoted,false);assert.equal(result.active,previous);assert.equal(hash(previous),before);
});
test('pagination exhausts more than 1000 records without losing any identities',()=>{
  const m=manifest();m.sourceRecords=Array.from({length:1007},(_,i)=>({id:`event-${i}`,revision:'v1',effectiveRevision:'v1',admission:'index'}));
  m.sourceDigest=hash(m.sourceRecords);m.outcomes=m.sourceRecords.map(r=>({id:r.id,revision:r.effectiveRevision,status:'indexed'}));m.indexRows=m.outcomes.map(({id,revision})=>({id,revision}));
  m.previousIndexedIds=[];m.removedIds=[];m.pages=[{cursor:null,nextCursor:'p2',snapshot:m.sourceRevision,ids:m.sourceRecords.slice(0,1000).map(r=>r.id)},{cursor:'p2',nextCursor:null,snapshot:m.sourceRevision,ids:m.sourceRecords.slice(1000).map(r=>r.id)}];
  assert.deepEqual(validateManifest(m),[]);
  m.pages[1].cursor='wrong';assert(validateManifest(m).includes('pagination-not-exhaustive'));
});
test('retry is idempotent; successful promotion never mutates previous snapshot',()=>{
  const previous=manifest(),before=hash(previous),candidate=manifest();candidate.id='snapshot-3';
  const a=promote(previous,candidate),b=promote(a.active,candidate);
  assert.equal(a.promoted,true);assert.deepEqual(a.active,b.active);assert.equal(hash(previous),before);
});
test('cache binding changes after correction and rollback needs compatible whole bundle receipt',()=>{
  const old=manifest(),current=manifest();current.id='snapshot-3';current.bundle.promptRevision='prompt-v2';
  assert.notEqual(cacheKey(old),cacheKey(current));
  assert.equal(rollback(current,old,{bundleKey:bundleKey(current.bundle),manifestDigest:hash(old),invalidateCacheKey:cacheKey(current)}).rolledBack,false);
  assert.equal(rollback(current,old,{bundleKey:bundleKey(old.bundle),manifestDigest:hash(old),invalidateCacheKey:cacheKey(old)}).rolledBack,false);
  assert.equal(rollback(current,old,{bundleKey:bundleKey(old.bundle),manifestDigest:hash(old),invalidateCacheKey:cacheKey(current)}).rolledBack,true);
});
