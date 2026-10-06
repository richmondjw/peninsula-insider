import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,rename,stat,writeFile} from 'node:fs/promises';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const emptyDigest=()=>createHash('sha256').digest('hex');
// Hash raw bytes in fixed-size chunks. Generic object hashes intentionally remain unchanged.
export async function fileDigest(file,{missingEmpty=true}={}){
 const digest=createHash('sha256');let byteLength=0;
 try{for await(const chunk of createReadStream(file,{highWaterMark:65536})){digest.update(chunk);byteLength+=chunk.length;}}
 catch(error){if(error.code==='ENOENT'&&missingEmpty)return {hash:emptyDigest(),byteLength:0,exists:false};throw error;}
 return {hash:digest.digest('hex'),byteLength,exists:true};
}
export async function snapshotPacket(file,backup){
 await mkdir(path.dirname(backup),{recursive:true});const temp=backup+'.'+randomUUID()+'.tmp';let before;
 try{before=await stat(file);}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(temp,'',{flag:'wx'});await rename(temp,backup);return {hash:emptyDigest(),byteLength:0,exists:false,algorithm:'sha256-raw-bytes'};}
 const digest=createHash('sha256');let byteLength=0;
 const hashing=new Transform({transform(chunk,encoding,callback){digest.update(chunk);byteLength+=chunk.length;callback(null,chunk);}});
 await pipeline(createReadStream(file,{highWaterMark:65536}),hashing,createWriteStream(temp,{flags:'wx'}));
 const after=await stat(file);if(before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('Human review packet changed during snapshot; backup held');
 await rename(temp,backup);return {hash:digest.digest('hex'),byteLength,exists:true,algorithm:'sha256-raw-bytes'};
}
