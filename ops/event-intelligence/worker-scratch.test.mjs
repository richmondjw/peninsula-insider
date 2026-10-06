import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,truncate,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {assertScratchCapacity,assertScratchMountInfo,boundedWorkerPerform} from './worker-scratch.mjs';

test('worker scratch requires a real bounded tmpfs with one complete capture available',()=>{
 const good={type:0x01021994,blocks:16384,bsize:4096,bavail:16384};
 assert.equal(assertScratchCapacity(good).total,64*1024*1024);
 assert.throws(()=>assertScratchCapacity({...good,type:0}),/tmpfs/);
 assert.throws(()=>assertScratchCapacity({...good,blocks:32768}),/tmpfs/);
 assert.throws(()=>assertScratchCapacity({...good,bavail:1000}),/tmpfs/);
});

test('worker scratch requires its own exact writable tmpfs mount identity',()=>{
 const mount='91 80 0:84 / /worker-scratch rw,nosuid,nodev,noexec - tmpfs tmpfs rw,size=65536k,mode=700\n';
 assert.doesNotThrow(()=>assertScratchMountInfo(mount));
 assert.throws(()=>assertScratchMountInfo(mount.replace('/worker-scratch','/tmp')),/identity missing/);
 assert.throws(()=>assertScratchMountInfo(mount.replace(' - tmpfs tmpfs ',' - overlay overlay ')),/not dedicated/);
 assert.throws(()=>assertScratchMountInfo(mount.replace(' rw,nosuid',' ro,nosuid')),/not dedicated/);
});

test('bounded scratch copies a complete child capture then releases only its owned temporary tree',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pi-worker-scratch-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const scratchRoot=path.join(root,'scratch'),durable=path.join(root,'durable'),nonce=randomUUID();
 await mkdir(scratchRoot);
 const handoff=await boundedWorkerPerform({nonce},durable,{scratchRoot,verify:async()=>({total:64*1024*1024}),perform:async(_,output)=>writeFile(path.join(output,'capture.txt'),'evidence')});
 assert.equal(await readFile(path.join(durable,'capture.txt'),'utf8'),'evidence');
 assert.equal((await stat(path.join(scratchRoot,nonce,'capture.txt'))).size,8);
 await handoff.releaseScratch();
 await assert.rejects(stat(path.join(scratchRoot,nonce)),/ENOENT/);
});

test('over-budget child output is held on scratch before any durable copy or complete receipt',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'pi-worker-scratch-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const scratchRoot=path.join(root,'scratch'),durable=path.join(root,'durable'),nonce=randomUUID();
 await mkdir(scratchRoot);
 await assert.rejects(boundedWorkerPerform({nonce},durable,{scratchRoot,verify:async()=>({total:64*1024*1024}),perform:async(_,output)=>{const file=path.join(output,'too-large.bin');await writeFile(file,'');await truncate(file,45_000_001);}}),/capture budget exceeded/);
 assert.equal((await stat(path.join(scratchRoot,nonce,'too-large.bin'))).size,45_000_001);
 await assert.rejects(stat(durable),/ENOENT/);
});
