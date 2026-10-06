import {mkdir,open,rename,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {admissionJsonWrite,serializeAdmittedJson} from './runtime-json-admission.mjs';

export async function syncWorkerDirectory(directory){
 if(process.platform==='win32')return;
 const handle=await open(directory,'r');
 try{await handle.sync();}finally{await handle.close();}
}

export async function durableWorkerJson(file,value,{syncDirectory=syncWorkerDirectory}={}){
 const reservation=await admissionJsonWrite(file,value);
 const parent=path.dirname(file),temp=file+'.owned-'+randomUUID()+'.tmp';
 try{
  await mkdir(parent,{recursive:true});
  const text=serializeAdmittedJson(value,reservation);
  const handle=await open(temp,'wx');
  try{await handle.writeFile(text);await handle.sync();}finally{await handle.close();}
  for(let attempt=0;;attempt++)try{await rename(temp,file);break;}catch(error){
   if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=7)throw error;
   await new Promise(resolve=>setTimeout(resolve,Math.min(10*2**attempt,80)));
  }
  await syncDirectory(parent);
  await reservation?.finish(Buffer.byteLength(text));
 }catch(error){reservation?.failed(error);throw error;}
}

/** Complete child files and all path names must survive before scratch is released. */
export async function syncWorkerCaptureTree(root,inventory,{syncDirectory=syncWorkerDirectory}={}){
 for(const row of inventory.records){
  const file=path.join(root,row.relative),info=await lstat(file);
  if(info.isSymbolicLink()||!info.isFile()||info.size!==row.stat.size||await realpath(file)!==path.resolve(file))throw Error('Worker durable capture changed');
  if(process.platform==='win32')continue;
  const handle=await open(file,'r');
  try{await handle.sync();}finally{await handle.close();}
 }
 const dirs=inventory.directories.map(relative=>path.join(root,relative)).sort((a,b)=>b.length-a.length);
 for(const dir of dirs)await syncDirectory(dir);
 await syncDirectory(path.dirname(root));
}
