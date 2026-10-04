import path from 'node:path';
import {readJson,atomicJson} from './collect.mjs';
import {hash} from './data.mjs';
import {fileURLToPath} from 'node:url';
export async function loadOutbox(directory){try{return await readJson(path.join(directory,'alert-outbox.json'));}catch(e){if(e.code!=='ENOENT')throw e;return {version:1,items:[]};}}
export function reconcileAlerts(outbox,alerts,{now=new Date()}={}){
 const at=now.toISOString(),active=new Set();
 for(const alert of alerts){const key=hash([alert.id??alert.sourceId??'system',alert.reason]);active.add(key);let item=outbox.items.find(x=>x.key===key&&x.state!=='resolved');
  if(!item){item={key,episode:outbox.items.filter(x=>x.key===key).length+1,alert,state:'pending',attempts:0,firstSeenAt:at,nextAttemptAt:at};outbox.items.push(item);}item.lastSeenAt=at;item.alert=alert;
 }
 for(const item of outbox.items)if(item.state!=='resolved'&&!active.has(item.key)){item.state='resolved';item.resolvedAt=at;}
 return outbox;
}
export function acknowledgeAlert(outbox,key,{now=new Date(),actor}={}){if(!actor?.trim())throw new Error('Acknowledgement requires an actor');const item=outbox.items.find(x=>x.key===key&&x.state!=='resolved');if(!item)throw new Error('Active alert not found');item.state='acknowledged';item.acknowledgedBy=actor;item.acknowledgedAt=now.toISOString();return outbox;}
export async function deliverAlerts(directory,outbox,{now=new Date(),sink}={}){
 // Local dashboard is the default durable destination. Remote messaging requires an explicitly injected authorised sink.
 for(const item of outbox.items){if(item.state!=='pending'||new Date(item.nextAttemptAt)>now)continue;item.attempts++;try{
  let receipt;if(sink)receipt=await sink({key:item.key,episode:item.episode,alert:item.alert});else{const receiptFile=path.join(directory,'alert-receipts',`${item.key}-${item.episode}.json`);await atomicJson(receiptFile,{key:item.key,episode:item.episode,alert:item.alert,persistedAt:now.toISOString(),humanAcknowledged:false});receipt={destination:'private-dashboard',artifact:receiptFile,acknowledged:true,humanAcknowledged:false};}
  if(receipt?.acknowledged!==true)throw new Error('Destination did not acknowledge delivery');
  item.state='delivered';item.deliveredAt=now.toISOString();item.deliveryReceipt=receipt;
 }catch(e){item.lastError=String(e.message).slice(0,500);item.nextAttemptAt=new Date(now.getTime()+Math.min(24*3600,60*2**Math.min(item.attempts-1,10))*1000).toISOString();}
 // Checkpoint every destination acknowledgement; a retry uses the same key and episode.
 await atomicJson(path.join(directory,'alert-outbox.json'),outbox);
 }
 await atomicJson(path.join(directory,'alert-outbox.json'),outbox);return outbox;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,directory,key,...flags]=process.argv.slice(2);if(command!=='ack')throw new Error('Usage: outbox.mjs ack PRIVATE_DIRECTORY ALERT_KEY --actor OPERATOR');const actorIndex=flags.indexOf('--actor'),actor=actorIndex>=0?flags[actorIndex+1]:null;if(!actor?.trim())throw new Error('Explicit operator identity required');
 const {assertRuntimePath,acquireRunLock}=await import('./runner.mjs');const target=assertRuntimePath(directory),lock=await acquireRunLock(target);try{const outbox=acknowledgeAlert(await loadOutbox(target),key,{actor});await atomicJson(path.join(target,'alert-outbox.json'),outbox);console.log(JSON.stringify({key,state:'acknowledged',actor}));}finally{await lock.release();}
}
