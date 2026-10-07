// Gateway RPC is local control traffic, not provider egress. Node's global
// proxy-aware fetch routes loopback into the credential egress proxy and fails.
// Keep only this fixed loopback request direct; provider requests stay proxied.
import http from 'node:http';

export function gatewaySearch({port=18789,credential,query,timeoutMs=120000}) {
  if (!Number.isInteger(port) || port<1 || port>65535) throw Error('Invalid gateway port');
  if (typeof credential!=='string' || !credential) throw Error('Existing gateway authentication unavailable');
  const body=JSON.stringify({tool:'web_search',agentId:'main',args:{query}});
  return new Promise((resolve,reject)=>{
    let timer;
    const localAgent=new http.Agent({proxyEnv:{}});
    const request=http.request({agent:localAgent,hostname:'127.0.0.1',port,path:'/tools/invoke',method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${credential}`,'Content-Length':Buffer.byteLength(body)}},response=>{
      let data='',bytes=0;
      response.setEncoding('utf8');
      response.on('data',chunk=>{
        bytes+=Buffer.byteLength(chunk);
        if(bytes>2*1024*1024) request.destroy(Error('Gateway response exceeds bound'));
        else data+=chunk;
      });
      response.on('error',reject);
      response.on('end',()=>{
        try {
          if (!String(response.headers['content-type']??'').includes('application/json'))
            throw Error(`Configured search unavailable (HTTP ${response.statusCode}, non-JSON response)`);
          const envelope=JSON.parse(data);
          if(response.statusCode!==200 || envelope.ok!==true) throw Error(`Configured search unavailable (HTTP ${response.statusCode})`);
          resolve(envelope.result);
        }catch(error){reject(error);}
      });
    });
    timer=setTimeout(()=>request.destroy(Error('Gateway search timeout')),timeoutMs);
    request.on('close',()=>{clearTimeout(timer);localAgent.destroy();});
    request.on('error',reject);
    request.end(body);
  });
}
