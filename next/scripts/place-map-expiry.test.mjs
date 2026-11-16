import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {parse} from '@astrojs/compiler';
const source=readFileSync(new URL('../src/components/PlaceMap.astro',import.meta.url),'utf8');const script=source.match(/<script is:inline define:vars=\{\{ mapId \}\}>([^]*?)<\/script>/)[1];
async function run({lazy=true}={}) {
 let now=Date.parse('2026-10-10T00:00:00Z'),timer,cleared=0,observed=0,cdnAttempts=0;
 const rows=[{hidden:false,getAttribute:()=> '2026-10-10T01:00:00Z'},{hidden:false,getAttribute:()=> '2026-10-09T00:00:00Z'},{hidden:false,getAttribute:()=> 'bad'}];
 const count={textContent:'3'},toggle={hidden:false,querySelector:()=>count};
 const root={querySelectorAll:selector=>selector==='[data-event-expiry]'?rows:[],querySelector:()=>toggle};
 const pins=[{id:'place:mornington',category:'place',lat:-38.22,lng:145.04},{id:'event:fresh',category:'event',expiresAt:'2026-10-10T01:00:00Z'},{id:'event:old',category:'event',expiresAt:'2026-10-09T00:00:00Z'}];
 const canvas={isConnected:true,getAttribute:()=>JSON.stringify(pins),closest:()=>root,querySelector:()=>null};
 const document={getElementById:()=>canvas,addEventListener:()=>{},head:{querySelector:()=>null,appendChild:el=>{cdnAttempts++;queueMicrotask(()=>el.onerror());}},createElement:()=>({setAttribute:()=>{}})};
 class Clock extends Date {static now(){return now;}}
 const context={document,mapId:'fixture-map',window:lazy?{IntersectionObserver:true}:{},Date:Clock,console:{warn:()=>{}},setInterval:fn=>{timer=fn;return 1;},clearInterval:()=>{cleared++;},setTimeout:()=>{throw new Error('Leaflet should never start');},IntersectionObserver:class {observe(){observed++;}disconnect(){}}};
 vm.runInNewContext(script,context);await new Promise(resolve=>setImmediate(resolve));
 return {rows,toggle,count,canvas,tick:()=>timer(),advance:()=>{now=Date.parse('2026-10-10T02:00:00Z');},get cleared(){return cleared;},get observed(){return observed;},get cdnAttempts(){return cdnAttempts;}};
}
test('actual PlaceMap fallback list expires before lazy Leaflet viewport entry',async()=>{const state=await run();assert.equal(state.observed,1);assert.equal(state.cdnAttempts,0);assert.deepEqual(state.rows.map(r=>r.hidden),[false,true,true]);assert.equal(state.count.textContent,'1');state.advance();state.tick();assert.deepEqual(state.rows.map(r=>r.hidden),[true,true,true]);assert.equal(state.toggle.hidden,true);assert.equal(state.count.textContent,'0');});
test('actual PlaceMap fallback stays current when CDN loading fails and timer cleans up after removal',async()=>{const state=await run({lazy:false});assert(state.cdnAttempts>0);assert.equal(state.rows[1].hidden,true);state.advance();state.tick();assert.equal(state.rows[0].hidden,true);assert.equal(state.toggle.hidden,true);state.canvas.isConnected=false;state.tick();assert.equal(state.cleared,1);});
test('changed PlaceMap Astro document parses without errors',async()=>{const result=await parse(source);assert.equal(result.diagnostics.filter(d=>d.severity===1).length,0);});
