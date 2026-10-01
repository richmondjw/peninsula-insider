import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createAuditTransport, forEachAuditItem } from './agent-audit-transport.mjs';
import { agentRoutes, agentResources, SITE } from '../src/lib/agent-guide.mjs';
const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base')+1].replace(/\/$/,'') : null;
const dist = resolve(args.includes('--dist') ? args[args.indexOf('--dist')+1] : 'dist');
const transport=createAuditTransport();
const failures=[]; let checks=0; const cache=new Map(); const http=[];
const check=(ok,message)=>{checks++;if(!ok)failures.push(message);};
async function read(path) {
 const pathname=new URL(path,SITE).pathname;
 if(!cache.has(path)) cache.set(path,(async()=>{
  if(!base)return readFileSync(join(dist,pathname,pathname.endsWith('/')?'index.html':''),'utf8');
  const at=performance.now();
  const response=await transport.request(`${base}${path}`);
  if(response.status!==200)throw new Error(`${path}: expected 200, got ${response.status}`);
  const body=response.body; http.push({path,status:response.status,bytes:Buffer.byteLength(body),elapsedMs:Math.round(performance.now()-at),contentType:response.headers.get('content-type'),etag:response.headers.get('etag'),cacheControl:response.headers.get('cache-control'),bodySha256:response.bodySha256});
  return body;
 })());
 return cache.get(path);
}
const pool=(items,fn)=>forEachAuditItem(items,fn,error=>check(false,error.message));
async function audit() {
const deploymentBefore=base?JSON.parse(await read('/deployment.json')):null;
const llms=await read('/llms.txt');
check(Buffer.byteLength(llms)<6500,'Agent entry point exceeds the 6.5KB budget');
check(!/Peninsula Radar|reviewed on a daily\/weekly|—/.test(llms),'Outdated branding, unearned cadence claim or house-style violation');
for(const route of [...agentRoutes,...agentResources]) {
 check(llms.includes(`${SITE}${route.href}`),`Missing route in index: ${route.href}`);
 const content=await read(route.href);
 if(new URL(route.href,SITE).pathname.endsWith('/')) {
  check(/<main\b/i.test(content)&&/<h1\b/i.test(content),`Route lacks real page content: ${route.href}`);
  check(!/<meta[^>]+http-equiv=["']refresh/i.test(content),`Advertised redirect stub: ${route.href}`);
 }
}
const catalog=JSON.parse(await read('/agents/catalog.json'));
const manifest=JSON.parse(await read('/agents/manifest.json'));
const changes=JSON.parse(await read('/agents/changes.json'));
const sitemap=[...new Set([... (await read('/sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]))].sort();
check(catalog.schemaVersion==='2.0'&&catalog.count===catalog.records.length&&catalog.count>=20,'Catalogue count/schema incorrect');
check(new Set(catalog.records.map(r=>r.id)).size===catalog.count,'Duplicate public identities');
check(JSON.stringify(catalog.records.map(r=>r.canonicalUrl).sort())===JSON.stringify(sitemap),'Catalogue does not exactly cover the canonical sitemap');
const snapshot=createHash('sha256').update(JSON.stringify(catalog.records.map(r=>[r.id,r.contentSha256]))).digest('hex');
check(snapshot===catalog.snapshotId&&snapshot===manifest.snapshotId&&snapshot===changes.toSnapshot,'Snapshot identities disagree');
check(changes.count===changes.changes.length&&Boolean(changes.fromSnapshot)===changes.baselineAvailable,'Change-feed baseline contract inconsistent');
check(changes.changes.every(r=>['representation-added','representation-changed','representation-removed'].includes(r.kind)),'Unrecognised change kind');
const savings=[];
await pool(catalog.records,async record=>{
 const canonical=new URL(record.canonicalUrl);const path=canonical.pathname;
 check(canonical.origin===SITE&&!canonical.search&&!canonical.hash&&record.id===record.canonicalUrl&&record.markdownUrl===record.canonicalUrl+'index.md',`Unstable or foreign identity: ${path}`);
 check(!/^\/(admin|access|account|api|ops|next|docs|reports|engine|preview|dev|me|saved|trips|auth|studio|pagefind)(\/|$)/.test(path),`Private export route: ${path}`);
 const html=await read(path);const md=await read(path+'index.md');
 check(html.includes(`href="${record.markdownUrl}"`),`Missing alternate link: ${path}`);
 check(html.includes('rel="describedby"'),`Missing agent discovery: ${path}`);
 check(!/<meta[^>]+(?:name=["']robots["'][^>]+content=["'][^"']*noindex|http-equiv=["']refresh)/i.test(html),`Nonindexable export: ${path}`);
 check(md.includes(`Canonical: ${record.canonicalUrl}`),`Missing canonical citation: ${path}`);
 check(createHash('sha256').update(md).digest('hex')===record.contentSha256,`Incorrect content hash: ${path}`);
 check(Buffer.byteLength(md)===record.markdownBytes,`Incorrect Markdown byte count: ${path}`);
 check(record.citation?.url===record.canonicalUrl&&record.citation?.title===record.title&&Object.hasOwn(record.citation,'publishedAt')&&Object.hasOwn(record.citation,'modifiedAt'),`Missing citation/unknown date contract: ${path}`);
 check(!/<script\b|<form\b/.test(md),`Executable/form content in export: ${path}`);
 check(record.markdownBytes<record.htmlBytes,`Compact output is larger: ${path}`);
 savings.push(1-record.markdownBytes/record.htmlBytes);
});
await pool(manifest.sections,async section=>{
 const shard=JSON.parse(await read(new URL(section.url).pathname));
 check(shard.snapshotId===snapshot&&shard.count===section.count&&JSON.stringify(shard.records)===JSON.stringify(catalog.records.filter(r=>r.section===section.section)),`Section catalogue mismatch: ${section.section}`);
});
const feed=JSON.parse(await read('/whats-on/upcoming.json'));
check(feed.timezone==='Australia/Sydney'&&feed.schemaVersion==='1.1','Event timezone/schema missing');
check(feed.window?.start&&feed.window?.end&&feed.generatedAt,'Event date contract missing');
check(feed.events.every(e=>Object.hasOwn(e,'factCheckedOn')&&Object.hasOwn(e,'sourceUrl')),'Event source/unknown check fields missing');
const conditional=[];
if(base) {
 for(const path of ['/agents/manifest.json','/agents/catalog.json','/llms.txt','/agents/index.md']) {
  await read(path);const headers=http.find(r=>r.path===path);
  check(Boolean(headers?.etag)&&Boolean(headers?.cacheControl),`Missing cache validators: ${path}`);
  const paired=await transport.request(base+path);
  check(paired.status===200&&paired.bodySha256===headers.bodySha256,`Representation changed during audit: ${path}`);
  const pairedEtag=paired.headers.get('etag');
  check(Boolean(pairedEtag),`Missing paired cache validator: ${path}`);
  if(!pairedEtag)continue;
  const response=await transport.request(base+path,{headers:{'If-None-Match':pairedEtag}});
  conditional.push({path,status:response.status,initialEtag:headers.etag,requestedEtag:pairedEtag,responseEtag:response.headers.get('etag'),originalBodySha256:headers.bodySha256,pairedBodySha256:paired.bodySha256,responseBodySha256:response.bodySha256,bytes:response.bytes});check(response.status===304&&response.bytes===0,`Unchanged representation did not return bodyless 304: ${path}`);
  check(headers.contentType?.includes(path.endsWith('.json')?'application/json':path.endsWith('.md')?'text/markdown':'text/plain'),`Unexpected content type: ${path}`);
 }
 for(const path of ['/admin/index.md','/account/index.md','/agents/not-a-real-record.json']) {
  const response=await transport.request(base+path);check(response.status===404,`Private/unknown compact route must be 404: ${path}`);
 }
} else for(const path of ['admin/index.md','account/index.md'])check(!existsSync(join(dist,path)),`Private compact file exists: ${path}`);
let deploymentAfter=null;
if(base) {
 const response=await transport.request(base+'/deployment.json');
 check(response.status===200,'Deployment provenance unavailable after audit');
 deploymentAfter=JSON.parse(response.body);
 check(Boolean(deploymentBefore?.sourceSha)&&['sourceSha','runId','generatedAt'].every(key=>deploymentBefore[key]===deploymentAfter[key]),'Deployment changed during audit; no single-release acceptance');
}
savings.sort((a,b)=>a-b);const mid=Math.floor(savings.length/2);const median=savings.length%2?savings[mid]:(savings[mid-1]+savings[mid])/2;
const report={complete:true,schemaVersion:'2.1',observedAt:new Date().toISOString(),target:base||dist,scope:'All canonical sitemap pages, compact/citation parity, section catalogues, snapshot changes, event date contract and live cache probes',checks,passed:checks-failures.length,failures,metrics:{indexBytes:Buffer.byteLength(llms),compactPages:catalog.count,coveredPages:savings.length,sitemapPages:sitemap.length,medianByteReduction:median},snapshotId:snapshot,deploymentBefore,deploymentAfter,conditional,transport:base?{policy:transport.policy,attempts:transport.attempts,firstAttemptFailures:transport.attempts.filter(r=>r.attempt===1&&(r.error||[429,503].includes(r.status))).length,retries:transport.attempts.filter(r=>r.attempt>1).length}:null,fullRubricScore:null,unmeasured:['Independent factual accuracy of the corpus','30-task evaluation across three agent stacks and unseen questions','Actual throttling response under load','Search visibility and repeat retrieval outcomes']};
return report;
}
let report;
try { report=await audit(); }
catch(error) {
 check(false,error.message);
 report={schemaVersion:'2.1',complete:false,observedAt:new Date().toISOString(),target:base||dist,
  scope:'Incomplete structural audit; no acceptance established',checks,passed:checks-failures.length,failures,
  transport:{policy:transport.policy,attempts:transport.attempts},fullRubricScore:null};
}
if(args.includes('--report')){const output=resolve(args[args.indexOf('--report')+1]);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Agent acceptance passed: ${checks} checks, ${report.metrics.compactPages} compact pages, full sitemap coverage. This structural gate alone is not a 99/100 site score.`);
