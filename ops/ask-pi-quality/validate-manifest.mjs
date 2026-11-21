import { readFile } from 'node:fs/promises';
import { validateManifest } from './manifest.mjs';
const path=process.argv[2];
if(!path)throw new Error('Usage: node ops/ask-pi-quality/validate-manifest.mjs <manifest.json>');
let errors;
try {errors=validateManifest(JSON.parse(await readFile(path,'utf8')));}catch {errors=['unreadable-or-invalid-json'];}
console.log(JSON.stringify({schemaVersion:1,valid:errors.length===0,errors,productionChanges:false},null,2));
process.exitCode=errors.length?1:0;
