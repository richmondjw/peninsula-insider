/** Offline grounding adapter; snapshot coordinator is shared with the writer integration. */
import {hash,resolveFixture,validateFixture} from './evaluator.mjs';
import {bundleKey} from './manifest.mjs';
import {readPrepared} from '../lib/concierge-snapshot.mjs';
export {readPrepared,prepareSnapshot,prepareRollback,commitPrepared} from '../lib/concierge-snapshot.mjs';
/** Pre-resolved date/locality context only; no NLP, model or broadened fallback.
 * Read one active snapshot once, then bind every result and cache key to it.
 */
export function retrieveGrounded(prepared,request,runtimeBundle) {
  try {
    const {manifest,records}=readPrepared(prepared);
    if(bundleKey(runtimeBundle)!==bundleKey(manifest.bundle))throw Error('runtime-bundle-mismatch');
    const indexed=new Set(manifest.indexRows.map(r=>r.id));
    const fixture={...request,schemaVersion:1,id:'staging-request',tags:['staging'],records:records.filter(r=>indexed.has(r.id)),expected:{}};
    const invalid=validateFixture(fixture);if(invalid.length)throw Error(invalid.join(','));
    const result=resolveFixture(fixture);
    return {...result,snapshot:prepared.token,cacheKey:hash([prepared.token,runtimeBundle,request.now,request.context]),
      claims:result.matches.map(({id,revision,occurrence,href,place,bookingAvailable})=>({id,revision,occurrence,href,place,bookingAvailable}))};
  }catch(error){return {disposition:'unavailable',matches:[],claims:[],error:error.message};}
}
