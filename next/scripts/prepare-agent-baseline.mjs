import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog } from './generate-agent-formats.mjs';
// A public, previous deployment is the comparison basis. Never substitute the
// candidate build: that would erase the changes the build should report.
export async function fetchPublicBaseline({ fetchImpl = fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)) } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetchImpl('https://peninsulainsider.com.au/agents/catalog.json', {redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'PI-release-baseline/1.0'}});
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Public catalogue fetch failed on attempt ${attempt}; retrying.`);
      await sleep(attempt * 2000);
      continue;
    }
    if (!response.ok) {
      if (attempt === 3 || ![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`Public catalogue baseline unavailable: ${response.status}`);
      }
      console.warn(`Public catalogue returned ${response.status} on attempt ${attempt}; retrying.`);
      await sleep(attempt * 2000);
      continue;
    }
    const body = await response.text();
    if (Buffer.byteLength(body)>10_000_000) throw new Error('Catalogue exceeds bounded baseline size');
    validateCatalog(JSON.parse(body));
    return body;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outArg = process.argv.indexOf('--out');
  const output = resolve(outArg >= 0 ? process.argv[outArg + 1] || '.cache/agent-previous.json' : '.cache/agent-previous.json');
  const body = await fetchPublicBaseline();
  mkdirSync(dirname(output),{recursive:true}); writeFileSync(output,body);
  console.log('Retained previous public catalogue for release comparison.');
}
