/** Reproducible canonical runtime for the separate API repository; no network. */
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(new URL('../../next/package.json',import.meta.url));
const esbuild=require('esbuild');
const result=await esbuild.build({absWorkingDir:root,entryPoints:['ops/lib/concierge-event-grounding.mjs'],bundle:true,format:'esm',platform:'neutral',target:'es2022',write:false,metafile:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourceHashes={};
for(const file of Object.keys(result.metafile.inputs).sort())sourceHashes[file]=hash((await readFile(resolve(root,file),'utf8')).replaceAll('\r\n','\n'));
const output=result.outputFiles[0].contents;
const provenance=JSON.stringify({schemaVersion:1,sourceHashNormalization:'LF',esbuildVersion:esbuild.version,artifactSha256:hash(output),sourceHashes},null,2)+'\n';
const path=resolve(root,'ops/lib/generated/concierge-event-grounding.mjs'),receipt=path.replace(/\.mjs$/,'.sources.json');
if(process.argv.includes('--check')){
 if(hash(await readFile(path))!==hash(output)||await readFile(receipt,'utf8')!==provenance)throw Error('canonical event runtime artifact drift');
 console.log('Canonical event runtime and source hashes match');
}else{
 await mkdir(dirname(path),{recursive:true});await writeFile(path,output);await writeFile(receipt,provenance);
}
