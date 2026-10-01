import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createAuditTransport, retryAfterMs } from './agent-audit-transport.mjs';
function harness(responses) {
  let clock = Date.UTC(2026, 9, 1); const waits=[]; const calls=[];
  const client=createAuditTransport({now:()=>clock,wait:async(ms)=>{waits.push(ms);clock+=ms;},
    fetchImpl:async(url,options)=>{calls.push({url,options});const next=responses.shift();if(next instanceof Error)throw next;return next;}});
  return {client,waits,calls};
}
test('Retry-After accepts seconds/date and rejects missing/invalid',()=>{
 assert.equal(retryAfterMs('7'),7000);
 assert.equal(retryAfterMs('Thu, 01 Oct 2026 00:00:04 GMT',Date.UTC(2026,9,1)),4000);
 assert.equal(retryAfterMs('1.5'),null);assert.equal(retryAfterMs('-1'),null);
 assert.equal(retryAfterMs(null),null);assert.equal(retryAfterMs('invalid'),null);
});
test('429/503 recover with every attempt and instructed delays retained',async()=>{
 const {client,waits}=harness([new Response('busy',{status:429,headers:{'Retry-After':'2'}}),new Response('busy',{status:503}),new Response('ok')]);
 assert.equal((await client.request('https://example.test/')).status,200);
 assert.deepEqual(client.attempts.map(r=>r.status),[429,503,200]);
 assert.equal(client.attempts[0].retryDelayMs,2000);assert.equal(client.attempts[1].retryDelayMs,2000);
 assert.ok(waits.reduce((a,b)=>a+b,0)>=4000);assert.equal(client.attempts[2].bytes,2);
});
test('long Retry-After stops rather than retrying early',async()=>{
 const {client,calls}=harness([new Response('busy',{status:503,headers:{'Retry-After':'90'}})]);
 assert.equal((await client.request('https://example.test/')).status,503);assert.equal(calls.length,1);
 assert.equal(client.attempts[0].retryStopped,'wait-or-deadline-limit');
});
test('404 and conditional 200 never retry; same user agent and ETag retained',async()=>{
 const {client,calls}=harness([new Response('missing',{status:404}),new Response('changed',{status:200,headers:{etag:'new'}})]);
 await client.request('https://example.test/missing');
 const response=await client.request('https://example.test/record', {headers:{'If-None-Match':'old'}});
 assert.equal(response.status,200);assert.equal(calls.length,2);
 assert.equal(calls[0].options.headers['user-agent'],calls[1].options.headers['user-agent']);
 assert.equal(client.attempts[1].requestedEtag,'old');assert.equal(client.attempts[1].etag,'new');
});
test('transport failures are retained and bounded',async()=>{
 const {client}=harness([new Error('network'),new Error('network'),new Error('network')]);
 await assert.rejects(client.request('https://example.test/'),/network/);
 assert.equal(client.attempts.length,3);assert.equal(client.attempts[2].retryStopped,'attempt-limit');
});
test('concurrent callers are serialized and paced; genuine304 kept',async()=>{
 let active=0,maxActive=0;const starts=[];
 const client=createAuditTransport({spacingMs:10,fetchImpl:async()=>{starts.push(Date.now());active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,5));active--;return new Response(null,{status:304});}});
 const results=await Promise.all([client.request('https://example.test/a'),client.request('https://example.test/b')]);
 assert.equal(maxActive,1);assert.ok(starts[1]-starts[0]>=10);assert.ok(results.every(r=>r.status===304&&r.bytes===0));
});

test('early live failure still saves a failed partial receipt',async()=>{
 const {createServer}=await import('node:http');
 const {mkdtemp,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {spawn}=await import('node:child_process');
 const directory=await mkdtemp(join(tmpdir(),'pi-audit-negative-'));
 const server=createServer((request,response)=>{response.writeHead(503,{'Retry-After':'90'});response.end('fixture unavailable');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const reportPath=join(directory,'receipt.json');
  const child=spawn(process.execPath,[fileURLToPath(new URL('./audit-agent-welcome.mjs',import.meta.url)),'--base',`http://127.0.0.1:${server.address().port}`,'--report',reportPath],{stdio:'ignore'});
  const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
  assert.equal(exit,1);const report=JSON.parse(await readFile(reportPath,'utf8'));
  assert.equal(report.complete,false);assert.equal(report.fullRubricScore,null);
  assert.equal(report.transport.attempts.length,1);assert.equal(report.transport.attempts[0].status,503);
  assert.ok(report.failures.some(message=>message.includes('expected 200, got 503')));
 } finally {await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});

test('Retry-After is honoured even when the response body fails',async()=>{
 const {client,calls}=harness([{status:503,headers:new Headers({'Retry-After':'90'}),text:async()=>{throw new Error('body interrupted');}}]);
 await assert.rejects(client.request('https://example.test/'),/body interrupted/);
 assert.equal(calls.length,1);assert.equal(client.attempts[0].status,503);
 assert.equal(client.attempts[0].retryAfter,'90');assert.equal(client.attempts[0].retryStopped,'wait-or-deadline-limit');
});

test('conditional200 with body failure cannot retry into a304 pass',async()=>{
 const {client,calls}=harness([{status:200,headers:new Headers(),text:async()=>{throw new Error('body interrupted');}},new Response(null,{status:304})]);
 await assert.rejects(client.request('https://example.test/',{headers:{'If-None-Match':'old'}}),/body interrupted/);
 assert.equal(calls.length,1);assert.equal(client.attempts[0].status,200);
});
