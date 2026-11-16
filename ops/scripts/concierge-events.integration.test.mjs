import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const fixture={title:'Synthetic market',status:'published',startDate:'2026-05-09',endDate:'2026-05-09',nextOccurrence:'2026-12-12',recurrence:'monthly',recurrenceNote:'second Saturday every month',suburb:'Red Hill',verification:'verified',bookingStatus:'unknown'};

async function run(mode,source=fixture) {
 const dir=await mkdtemp(join(tmpdir(),'pi-corpus-test-')),content=join(dir,'content'),report=join(dir,'report');
 await mkdir(join(content,'events'),{recursive:true});
 if(mode!=='empty'){
  await writeFile(join(content,'events','market.json'),JSON.stringify(source));
  await mkdir(join(content,'events','archive'),{recursive:true});
  await writeFile(join(content,'events','archive','cancelled.json'),JSON.stringify({...fixture,cancelled:true}));
 }
 if(mode==='write-failure')for(const slug of ['extra-a','extra-b','extra-c'])await writeFile(join(content,'events',slug+'.json'),JSON.stringify(fixture));
 const preload=join(dir,'mock.mjs'),calls=join(dir,'calls.json');
 // Every fetch is replaced. An unrecognised URL throws; no fallback network.
 await writeFile(preload,`import {writeFileSync} from 'node:fs';
 const NativeDate=Date;globalThis.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:['2026-11-16T19:30:00Z']));}static now(){return +new NativeDate('2026-11-16T19:30:00Z');}};
 const calls=[];process.on('exit',()=>writeFileSync(${JSON.stringify(calls)},JSON.stringify(calls)));
 globalThis.fetch=async(input,options={})=>{
 const url=new URL(input),method=options.method??'GET';calls.push({url:String(url),method});
 if(url.hostname==='api.cohere.com')return Response.json({embeddings:{float:[Array(1024).fill(0)]}});
 if(url.hostname!=='mock.invalid')throw Error('Forbidden network');
 if(method==='POST')return new Response('synthetic write failure',{status:500});
 if(method==='DELETE')throw Error('Unexpected destructive call');
 if(url.searchParams.get('limit')==='1')return Response.json([]);
 const offset=Number(url.searchParams.get('offset'));
 const rows=${mode==='dry'?'Array.from({length:2001}':'Array.from({length:5}'},(_,i)=>({chunk_id:${mode==='dry'?"'old-'+String(i).padStart(4,'0')":"['market::summary::0','extra-a::summary::0','extra-b::summary::0','extra-c::summary::0','withdrawn::summary::0'][i]"},source_entity_type:'event',embedding_source_hash:'old',extracted_at:'2020-01-01'}));
 return Response.json(rows.slice(offset,offset+1000));
 };`);
 const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'ops/scripts/refresh-corpus.mjs',...(mode==='dry'?['--dry','--prune']:['--prune']),'--report'],{cwd:root,encoding:'utf8',env:{...process.env,CONTENT_DIR:content,REPORT_DIR:report,SUPABASE_URL:'https://mock.invalid',SUPABASE_SERVICE_KEY:'synthetic-only',COHERE_API_KEY:'synthetic-only'}});
 assert.equal(result.error,undefined,String(result.error));
 if(!result.stdout)throw new Error(result.stderr);
 const recorded=JSON.parse(await readFile(calls,'utf8'));
 if(mode==='malformed'||mode==='empty')return {result,calls:recorded};
 return {result,calls:recorded,report:JSON.parse(await readFile(join(report,'2026-11-16.json'),'utf8').catch(e=>{throw new Error(result.stderr+'\n'+result.stdout.slice(-1000));}))};
}
test('actual writer dry integration accounts for recurrence, locality, cancellation and >1000 rows without writes',async()=>{
 const {result,calls,report}=await run('dry');assert.equal(result.status,0,result.stderr);
 assert(calls.every(c=>c.method==='GET'));
 const pages=calls.filter(c=>c.url.includes('offset='));assert.equal(pages.length,3);
 assert(pages.every(c=>c.url.includes('order=chunk_id.asc')));
 assert.equal(report.event_inventory.length,2);
 assert.equal(report.event_inventory.find(r=>r.slug==='market').occurrence,'2026-12-12');
 assert.equal(report.event_inventory.find(r=>r.slug==='cancelled').status,'excluded');
});
test('actual writer reports failed synthetic write with nonzero exit',async()=>{
 const {result,calls,report}=await run('write-failure');assert.equal(result.status,1);
 assert(calls.some(c=>c.method==='POST'));assert(!calls.some(c=>c.method==='DELETE'));
 assert.equal(report.errors.length,4);assert.equal(report.prune_suppressed_after_write_failure,true);
});
test('malformed source aborts actual writer before any network, embedding or deletion',async()=>{
 for(const source of [null,[],{...fixture,title:''},{...fixture,startDate:'invalid'},{...fixture,nextOccurrence:'2026-02-30'},{...fixture,cancelled:'yes'}]){
  const {result,calls}=await run('malformed',source);
  assert.equal(result.status,1,result.stdout);assert.deepEqual(calls,[]);
  assert.match(result.stderr,/Event projection failed/);
 }
});
test('empty required event collection never reconciles away the previous index',async()=>{
 const {result,calls}=await run('empty');assert.equal(result.status,1);assert.deepEqual(calls,[]);assert.match(result.stderr,/required source inventory is empty/);
});
