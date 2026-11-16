import path from 'node:path';
import {STATE_DIR,readJson,writeJson} from '../lib/util.mjs';
import {importObservations,visibilitySummary} from '../lib/visibility.mjs';
if(!process.argv[2])throw Error('Provide a JSON array of actual AI-answer observations with collection receipts');
const file=path.join(STATE_DIR,'geo-benchmark.json');
const next=importObservations(readJson(file),readJson(process.argv[2]));
writeJson(file,next);
console.log(JSON.stringify(visibilitySummary(next)));
