import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {gatewaySearch} from '../lib/gateway-search.mjs';

test('search uses authenticated fixed loopback RPC and preserves provider results',async t=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');
  assert.equal(req.url,'/tools/invoke'); assert.equal(req.method,'POST');
  assert.equal(req.headers.authorization,'Bearer fixture-only');
  let body='';req.on('data',c=>body+=c);req.on('end',()=>{
   assert.deepEqual(JSON.parse(body),{tool:'web_search',agentId:'main',args:{query:'fixture'}});
   res.end(JSON.stringify({ok:true,result:{kind:'results',query:'fixture',results:[]}}));
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 assert.deepEqual(await gatewaySearch({port:server.address().port,credential:'fixture-only',query:'fixture'}),{kind:'results',query:'fixture',results:[]});
});
test('gateway denials are errors, never empty successful observations',async t=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.writeHead(403);res.end('{"ok":false}');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 await assert.rejects(gatewaySearch({port:server.address().port,credential:'fixture-only',query:'fixture'}),/HTTP 403/);
});
