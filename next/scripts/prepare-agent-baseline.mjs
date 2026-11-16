import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { validateCatalog } from './generate-agent-formats.mjs';
// A public, previous deployment is the comparison basis. Never substitute the
// candidate build: that would erase the changes the build should report.
const output = resolve(process.argv[process.argv.indexOf('--out')+1] || '.cache/agent-previous.json');
const response = await fetch('https://peninsulainsider.com.au/agents/catalog.json', {redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'PI-release-baseline/1.0'}});
if (!response.ok) throw new Error(`Public catalogue baseline unavailable: ${response.status}`);
const body = await response.text();
if (Buffer.byteLength(body)>10_000_000) throw new Error('Catalogue exceeds bounded baseline size');
validateCatalog(JSON.parse(body));
mkdirSync(dirname(output),{recursive:true}); writeFileSync(output,body);
console.log('Retained previous public catalogue for release comparison.');
