import test from 'node:test';
import assert from 'node:assert/strict';
import {eventEditorialBuildIntegration} from './event-editorial-build-integration.mjs';

test('direct Astro build invokes the editorial admission with the operator pins',async()=>{
 const calls=[];
 const integration=eventEditorialBuildIntegration({target:'/fixed/manifest.mjs',env:{PI_EDITORIAL_BUILD_CONFIG:'/private/build.json',PI_EDITORIAL_BUILD_CONFIG_SHA256:'a'.repeat(64),PI_EDITORIAL_BUILD_STORE_ROOT:'/private'},generate:async args=>{calls.push(args);}});
 const setup=integration.hooks['astro:config:setup'];
 for(const command of ['dev','preview','sync'])await setup({command});
 assert.equal(calls.length,0);
 await setup({command:'build'});
 assert.deepEqual(calls,[{target:'/fixed/manifest.mjs',configPath:'/private/build.json',configHash:'a'.repeat(64),expectedStoreRoot:'/private'}]);
});

test('direct Astro build cannot proceed when factual admission fails',async()=>{
 const setup=eventEditorialBuildIntegration({generate:async()=>{throw Error('stale proof');}}).hooks['astro:config:setup'];
 await assert.rejects(setup({command:'build'}),/stale proof/);
});
