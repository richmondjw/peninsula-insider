import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {atomicJson,readJson} from './collect.mjs';
import {buildPacket} from './packet.mjs';
test('packet refresh preserves human edits and old evidence, flags changed and missing extractions',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'pi-packet-'));try{const file=path.join(dir,'details','one.json');const c={id:'one',fields:{title:'Original'},proofs:{},kind:'event'};await atomicJson(file,{evidence:{id:'e1'},candidates:[c]});let p=await buildPacket(dir);p.candidates[0].summary='Human original writing';p.candidates[0].approval={by:'James',revision:'reviewed'};await atomicJson(path.join(dir,'review-packet.json'),p);await atomicJson(file,{evidence:{id:'e2'},candidates:[{...c,fields:{title:'Changed'}}]});p=await buildPacket(dir);assert.equal(p.candidates[0].summary,'Human original writing');assert.equal(p.candidates[0].approval.revision,'reviewed');assert.equal(p.sourceChanges[0].incoming.fields.title,'Changed');assert.equal(p.evidence.length,2);await atomicJson(file,{evidence:{id:'e2'},candidates:[]});p=await buildPacket(dir);assert.match(p.sourceChanges[0].reason,/absent/);assert.equal(p.candidates.length,1);assert.deepEqual(p.publicationChanges,[]);}finally{await rm(dir,{recursive:true,force:true});}});
