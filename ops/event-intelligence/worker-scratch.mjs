import {lstat,realpath,statfs,mkdir,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {assertTree,copyCapture} from './worker-queue.mjs';

const TMPFS_MAGIC=0x01021994;
const MAX_SCRATCH_BYTES=64*1024*1024;
const MIN_FREE_BYTES=45_000_000+1024*1024;
const noncePattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function assertScratchCapacity(info){
 const total=Number(info.blocks)*Number(info.bsize);
 const free=Number(info.bavail)*Number(info.bsize);
 if(info.type!==TMPFS_MAGIC||!Number.isSafeInteger(total)||total<MIN_FREE_BYTES||total>MAX_SCRATCH_BYTES||!Number.isSafeInteger(free)||free<MIN_FREE_BYTES)throw Error('Dedicated bounded worker tmpfs unavailable');
 return {total,free};
}

export function assertScratchMountInfo(mountinfo){
 const matches=mountinfo.split('\n').filter(line=>line.split(' ')[4]==='/worker-scratch');
 if(matches.length!==1)throw Error('Dedicated worker scratch mount identity missing');
 const [before,after]=matches[0].split(' - ');
 const fields=before?.split(' '),kind=after?.split(' ');
 if(fields?.[3]!=='/'||kind?.[0]!=='tmpfs'||kind?.[1]!=='tmpfs'||!fields?.[5]?.split(',').includes('rw'))throw Error('Worker scratch mount is not dedicated writable tmpfs');
}

export async function assertWorkerScratch(root,{filesystem=statfs,mountInfo=()=>readFile('/proc/self/mountinfo','utf8')}={}){
 if(root!=='/worker-scratch'||path.resolve(root)!==root)throw Error('Exact worker scratch mount required');
 const info=await lstat(root);
 if(!info.isDirectory()||info.isSymbolicLink()||await realpath(root)!==root)throw Error('Worker scratch mount escaped');
 assertScratchMountInfo(await mountInfo());
 return assertScratchCapacity(await filesystem(root));
}

/** The child can allocate only on the dedicated kernel-limited tmpfs. */
export async function boundedWorkerPerform(job,durableOutput,{perform,scratchRoot='/worker-scratch',verify=assertWorkerScratch}={}){
 if(typeof perform!=='function'||!noncePattern.test(job?.nonce))throw Error('Bounded worker identity/perform required');
 await verify(scratchRoot);
 const scratch=path.join(scratchRoot,job.nonce);
 await mkdir(scratch,{mode:0o700});
 try{
  await perform(job,scratch);
  const inventory=await assertTree(scratch);
  await copyCapture(scratch,durableOutput,inventory);
  // The queue releases scratch only after durable binding and terminal receipt sync.
  return {releaseScratch:()=>rm(scratch,{recursive:true})};
 }catch(error){
  // A failed capture remains held; no durable complete receipt is issued.
  throw error;
 }
}
