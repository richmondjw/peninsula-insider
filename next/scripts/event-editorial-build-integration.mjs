import {fileURLToPath} from 'node:url';
import {generateEditorialManifest} from './generate-event-editorial-manifest.mjs';

const defaultTarget=fileURLToPath(new URL('../src/lib/event-editorial-manifest.mjs',import.meta.url));

/** Run the same factual admission for npm builds and direct Astro builds. */
export function eventEditorialBuildIntegration({generate=generateEditorialManifest,target=defaultTarget,env=process.env}={}){
 return {name:'pi-event-editorial-build-admission',hooks:{
  'astro:config:setup':async({command})=>{
   if(command!=='build')return;
   await generate({target,configPath:env.PI_EDITORIAL_BUILD_CONFIG,configHash:env.PI_EDITORIAL_BUILD_CONFIG_SHA256,expectedStoreRoot:env.PI_EDITORIAL_BUILD_STORE_ROOT});
  },
 }};
}
