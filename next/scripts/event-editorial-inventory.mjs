import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readdir,lstat,readFile,realpath,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const actualRoot=fileURLToPath(new URL('../src/content/events',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
/** Same recursive JSON source tree as Astro's events loader. No candidate-supplied inventory. */
export async function captureEventInventory({root=actualRoot,checkpoint=async()=>{}}={}){
 const resolved=await realpath(root),entries=[],bindings=[];let bytes=0,visited=0;
 async function walk(dir,depth=0){if(depth>16)throw Error('Event inventory depth budget');for(const child of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(++visited>10000)throw Error('Event inventory traversal budget');const file=path.join(dir,child.name),info=await lstat(file);if(info.isSymbolicLink())throw Error('Event inventory symlink refused');if(info.isDirectory()){await walk(file,depth+1);continue;}if(!child.name.endsWith('.json'))continue;if(!info.isFile()||info.size>2*1024**2)throw Error('Event inventory file budget');bytes+=info.size;if(bytes>32*1024**2||entries.length>=5000)throw Error('Event inventory aggregate budget');const handle=await open(file,'r');let raw;try{const opened=await handle.stat();if(opened.dev!==info.dev||opened.ino!==info.ino||opened.size!==info.size)throw Error('Event inventory identity changed');await checkpoint(file);const chunks=[];let total=0;while(true){const chunk=Buffer.alloc(Math.min(65536,info.size+1-total));const {bytesRead}=await handle.read(chunk,0,chunk.length,null);if(!bytesRead)break;total+=bytesRead;if(total>info.size)throw Error('Event inventory grew during read');chunks.push(chunk.subarray(0,bytesRead));}const after=await handle.stat(),named=await lstat(file);if(named.isSymbolicLink()||after.dev!==info.dev||after.ino!==info.ino||named.dev!==info.dev||named.ino!==info.ino||after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ctimeMs!==info.ctimeMs)throw Error('Event inventory changed during read');raw=Buffer.concat(chunks,total);}finally{await handle.close();}if(raw.length!==info.size)throw Error('Event inventory changed while reading');const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Malformed event inventory');const relative=path.relative(resolved,file).replaceAll('\\','/');entries.push({file:relative,data});bindings.push([relative,sha(raw)]);}}
 await walk(resolved);return {root:resolved,entries,fingerprint:sha(JSON.stringify(bindings))};
}
export async function assertInventoryUnchanged(snapshot){const current=await captureEventInventory({root:snapshot.root});if(current.fingerprint!==snapshot.fingerprint)throw Error('Canonical event inventory changed during validation');return true;}
const norm=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const day=value=>{const s=String(value??'');return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):null;};
function urls(data){return ['officialEventUrl','primarySourceUrl','bookingUrl','ticketingUrl','secondarySourceUrl'].flatMap(key=>{try{const u=new URL(data[key]);return [u.hostname.toLowerCase()+u.pathname.replace(/\/$/,'').toLowerCase()];}catch{return [];}});}
/** Conservative duplicate hold: known matching identity and potentially overlapping occurrence. */
export function conflictsWithInventory(record,snapshot){
 if(!snapshot?.fingerprint||!Array.isArray(snapshot.entries))throw Error('Canonical public event inventory required');
 const targetUrls=urls(record),start=day(record.startDate),end=day(record.endDate)||start;
 return snapshot.entries.flatMap(({file,data})=>{
  const sameId=record.eventId&&data.eventId===record.eventId;
  const sameSource=urls(data).some(url=>targetUrls.includes(url));
  const sameTitle=norm(data.title)===norm(record.title)&&norm(data.venueName)&&norm(data.venueName)===norm(record.venueName);
  if(!sameId&&!sameSource&&!sameTitle)return [];
  // Existing human-held identities require reconciliation, never silent replacement.
  if(sameId){if(data.cancelled||data.postponed||data.sourceReview?.required||data.reviewHold||data.factualReviewHold||['rejected','held','hold','archived','withdrawn'].includes(data.reviewStatus))return [file+':existing-human-hold-or-withdrawal'];if(data.intelligence?.approvalMode==='automated'&&data.intelligence?.approvedBy==='PI editorial policy'&&data.status==='published')return [];return [file+':existing-identity-requires-review'];}
  const otherStart=day(data.startDate),otherEnd=day(data.endDate)||otherStart;
  const series=!!data.recurrence&&data.recurrence!=='one-off';
  if(series||!start||!end||!otherStart||!otherEnd||(start<=otherEnd&&otherStart<=end))return [file+':duplicate-occurrence'];
  return [];
 });
}
