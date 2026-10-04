import {readFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {astroRecord} from './publication.mjs';
import {hash} from './data.mjs';
import {atomicJson,readJson} from './collect.mjs';
export async function promoteCandidate(candidate,evidence,{contentDirectory,historyDirectory,expectedHash=null,now=new Date()}={}){
 if(!contentDirectory||!historyDirectory)throw new Error('Explicit content and private history directories required');
 const record=astroRecord(candidate,evidence,{now});record.status='published';
 const target=path.join(path.resolve(contentDirectory),record.slug+'.json');await mkdir(contentDirectory,{recursive:true});await mkdir(historyDirectory,{recursive:true});
 const lockPath=path.join(path.resolve(historyDirectory),record.slug+'.lock'),lock=await open(lockPath,'wx');
 try{let previous=null;try{previous=await readFile(target,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  const previousRecord=previous?JSON.parse(previous):null;
  if(previousRecord?.intelligence?.revision===record.intelligence.revision){const volatile=new Set(['publishedAt','lastCheckedDate','lastVerifiedAt','intelligence']);if(Object.entries(record).some(([key,value])=>!volatile.has(key)&&JSON.stringify(previousRecord[key])!==JSON.stringify(value)))throw new Error('Approved record fields changed; editorial edits require review');return {status:'unchanged',target};}
  if(previous&&(!expectedHash||hash(previous)!==expectedHash))throw new Error('Existing record requires exact reviewed hash; editorial changes protected');
  const merged={...previousRecord,...record};const bytes=JSON.stringify(merged,null,2)+'\n';const receiptId=hash(record.slug+hash(bytes)+now.toISOString());
  const receipt={id:receiptId,slug:record.slug,target,previous,previousHash:previous?hash(previous):null,nextHash:hash(bytes),approval:candidate.approval,promotedAt:now.toISOString(),deploymentStatus:'not-deployed'};
  await atomicJson(path.join(historyDirectory,receiptId+'.json'),receipt);
  await atomicJson(target,merged);
  return {status:'promoted-locally',target,receiptId,deploymentStatus:'not-deployed'};
 }finally{await lock.close();await unlink(lockPath);}
}
export async function rollbackPromotion(receiptFile,{contentDirectory,historyDirectory}={}){
 const receipt=await readJson(receiptFile);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(receipt.slug))throw new Error('Invalid receipt slug');
 const target=path.join(path.resolve(contentDirectory),receipt.slug+'.json');if(target!==receipt.target)throw new Error('Receipt target mismatch');
 const lockPath=path.join(path.resolve(historyDirectory),receipt.slug+'.lock'),lock=await open(lockPath,'wx');
 try{const current=await readFile(target,'utf8');if(hash(current)!==receipt.nextHash)throw new Error('Record changed after promotion; rollback refused');
  if(receipt.previous===null)await unlink(target);else{if(hash(receipt.previous)!==receipt.previousHash)throw new Error('Corrupt rollback evidence');const temp=target+'.rollback-'+process.pid;const {writeFile}=await import('node:fs/promises');await writeFile(temp,receipt.previous,{flag:'wx'});await rename(temp,target);}
  await atomicJson(path.join(historyDirectory,receipt.id+'-rollback.json'),{receiptId:receipt.id,rolledBackAt:new Date().toISOString(),deploymentStatus:'not-deployed'});return {status:'rolled-back-locally',target};
 }finally{await lock.close();await unlink(lockPath);}
}
