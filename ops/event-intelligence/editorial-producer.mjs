import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {hash,candidateRevision,fetchEvidence,safeUrl} from './data.mjs';
import {buildEditorialManifest} from './editorial-automation.mjs';
import {conflictsWithInventory,assertInventoryUnchanged} from '../../next/scripts/event-editorial-inventory.mjs';
export const PRODUCER_VERSION='pi-library-producer-1.0';
/** Disabled, bounded preparation only. No review packet, content, or production manifest writes. */
export async function runEditorialProducer({enabled=false,config,registry,packetPath,outputRoot,expectedOutputRoot,publicInventory,now=new Date(),previousReceipt=null,evidenceFetcher=fetchEvidence}={}){
 if(enabled!==true)return {version:PRODUCER_VERSION,state:'disabled',proposals:[],alerts:[]};
 if(config?.schemaVersion!==1||config.registryHash!==hash(registry)||!Array.isArray(config.items)||config.items.length<1||config.items.length>5||new Set(config.items.map(i=>i.candidateId)).size!==config.items.length)throw Error('Pinned finite trusted producer configuration required');
 if(config.cadenceHours!==12||!Number.isFinite(+now))throw Error('Bounded producer cadence/clock required');
 const root=await realpath(outputRoot);if(root!==await realpath(expectedOutputRoot)||(await lstat(outputRoot)).isSymbolicLink())throw Error('Private producer output root mismatch');
 if(!Array.isArray(publicInventory?.entries)||!publicInventory.fingerprint)throw Error('Actual complete public inventory required');
 if((await lstat(packetPath)).isSymbolicLink()||(await lstat(packetPath)).size>64*1024**2)throw Error('Unsafe review packet');
 const packetBytes=await readFile(packetPath),packetHash=hash(packetBytes.toString()),packet=JSON.parse(packetBytes);if(!Array.isArray(packet.candidates)||packet.candidates.length>5000)throw Error('Bounded review packet required');
 const configHash=hash(config),registryHash=hash(registry);const priorChecked=Date.parse(previousReceipt?.checkedAt),priorNext=Date.parse(previousReceipt?.nextRunAt);
 if(previousReceipt?.version===PRODUCER_VERSION&&previousReceipt.actor==='PI editorial policy'&&previousReceipt.state==='complete'&&previousReceipt.packetHash===packetHash&&previousReceipt.registryHash===registryHash&&previousReceipt.configHash===configHash&&previousReceipt.inventoryFingerprint===publicInventory.fingerprint&&Number.isFinite(priorChecked)&&priorChecked<=+now&&priorNext-priorChecked===12*3600000&&priorNext>+now)return {version:PRODUCER_VERSION,state:'not-due',proposals:[],alerts:[]};
 const runId=randomUUID(),directory=path.join(root,runId);await mkdir(directory);const captures=[],items=[],alerts=[],proposals=[];const identity={version:PRODUCER_VERSION,runId,actor:'PI editorial policy',checkedAt:now.toISOString(),packetHash,registryHash,configHash,inventoryFingerprint:publicInventory.fingerprint,productionInstalled:false};await writeFile(path.join(directory,'pending.json'),JSON.stringify({...identity,state:'incomplete'}),{flag:'wx'});
 try{
 for(const item of config.items){try{
 const matches=packet.candidates.filter(c=>c.id===item.candidateId);if(matches.length!==1)throw Error('Candidate identity missing/ambiguous');const candidate=matches[0];
 const library=registry.find(s=>s.id==='libraries'),boundarySource=registry.find(s=>s.url===item.boundaryUrl&&s.authority==='official');if(!library||!boundarySource||candidate.fields?.officialEventUrl!==item.primaryUrl)throw Error('Registry/candidate source mismatch');
 safeUrl(item.primaryUrl,library.hosts);safeUrl(item.registrationUrl,library.bookingHosts);safeUrl(item.boundaryUrl,boundarySource.hosts);if(item.boundaryUrl!==boundarySource.url)throw Error('Boundary exact URL mismatch');
 const evidence=[];for(const [role,source] of Object.entries({primary:{...library,url:item.primaryUrl},registration:{id:'library-linked-registration',authority:'organiser-linked-registration',url:item.registrationUrl,hosts:library.bookingHosts},boundary:{...boundarySource,url:item.boundaryUrl}})){
 const capture=await evidenceFetcher(source,{now,maxBytes:2_000_000});if(capture.sourceId!==source.id||capture.url!==safeUrl(source.url,source.hosts).href||capture.authority!==source.authority||typeof capture.body!=='string'||hash(capture.body)!==capture.hash||capture.retrievedAt!==now.toISOString())throw Error('Fresh transport capture admission mismatch');
 const file=item.candidateId+'-'+role+'.json';if(!/^[a-z0-9-]{8,80}$/.test(item.candidateId))throw Error('Unsafe candidate identifier');await writeFile(path.join(directory,file),JSON.stringify(capture),{flag:'wx'});captures.push({role,file,id:capture.id,hash:capture.hash,fileHash:hash(JSON.stringify(capture))});evidence.push(capture);}
 const bundle={schemaVersion:1,candidateId:candidate.id,revision:candidateRevision(candidate),optionalOmissions:['price','media']};for(const role of ['primary','registration','boundary']){const e=evidence[['primary','registration','boundary'].indexOf(role)];bundle[role]={id:e.id,hash:e.hash};}items.push({candidate,evidence,bundle});
 }catch(error){alerts.push({candidateId:item.candidateId,type:'editorial-producer-held',reason:error.message});proposals.push({candidateId:item.candidateId,action:'withdraw-or-retain-hold',reason:error.message});}}
 const manifest=buildEditorialManifest(items,{enabled:true,now,registry,catalogue:packet.candidates,catalogueComplete:true});for(const record of manifest.records){const conflicts=conflictsWithInventory(record,publicInventory);if(conflicts.length){alerts.push({candidateId:record.eventId,type:'editorial-producer-held',reason:'canonical-conflict'});proposals.push({candidateId:record.eventId,action:'withdraw-or-retain-hold',reasons:conflicts});}else proposals.push({candidateId:record.eventId,action:'review-content-patch',record,manifestEntry:manifest.entries.find(e=>e.eventId===record.eventId)});}
 for(const rejection of manifest.rejected){alerts.push({candidateId:rejection.eventId,type:'editorial-producer-held',reasons:rejection.reasons});proposals.push({candidateId:rejection.eventId,action:'withdraw-or-retain-hold',reasons:rejection.reasons});}
 if(hash((await readFile(packetPath)).toString())!==packetHash)throw Error('Human review packet changed; proposal admission refused');await assertInventoryUnchanged(publicInventory);
 const receipt={...identity,state:'complete',nextRunAt:new Date(+now+12*3600000).toISOString(),captures,proposals,alerts};await writeFile(path.join(directory,'receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});return receipt;
 }catch(error){const failed={...identity,state:'failed',captures,proposals:[],alerts:[{type:'editorial-producer-preparation-failed',reason:error.message}],admitted:false};await writeFile(path.join(directory,'receipt.json'),JSON.stringify(failed,null,2),{flag:'wx'});error.producerReceipt=failed;throw error;}
}
