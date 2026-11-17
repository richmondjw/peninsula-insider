import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {visitorInformationSchema} from '../src/lib/visitor-information.mjs';
const {z}=await import(process.env.PI_TEST_ZOD_MODULE || 'astro/zod');
// Execute the actual checked-in schema. Only Astro's collection/loader/reference
// wiring is stubbed; no validation rules are copied into this test.
const source=await readFile(new URL('../src/content.config.ts',import.meta.url),'utf8');
const body=stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,'').replace('export const collections','const collections'));
const collections=new Function('defineCollection','reference','z','glob','visitorInformationSchema',body+';return collections;')(x=>x,()=>z.any(),z,()=>({}),visitorInformationSchema);
const schema=collections.events.schema;
const base=JSON.parse(await readFile(new URL('../src/content/events/garden-designfest-mornington-peninsula-2026.json',import.meta.url),'utf8'));
for(const status of ['draft','review','scheduled']) test(status+' needs no invented publication date',()=>{const parsed=schema.parse({...base,status});assert.equal(parsed.publishedAt,undefined);});
for(const status of ['published','past','expired','archived',undefined]) test(String(status)+' still requires publication date',()=>{const value={...base,status};const result=schema.safeParse(value);assert.equal(result.success,false);assert.ok(result.error.issues.some(i=>i.path.join('.')==='publishedAt'));assert.equal(schema.safeParse({...value,publishedAt:'2026-11-17'}).success,true);});
for(const status of ['draft','review','scheduled','published']) test(status+' rejects malformed supplied date',()=>{for(const publishedAt of ['not-a-date','',null,false,{},[]])assert.equal(schema.safeParse({...base,status,publishedAt}).success,false);});
test('both actual event drafts pass actual schema',async()=>{for(const slug of ['garden-designfest-mornington-peninsula-2026','peninsula-studio-trail-open-studios-2026']){const data=JSON.parse(await readFile(new URL('../src/content/events/'+slug+'.json',import.meta.url),'utf8'));assert.equal(schema.safeParse(data).success,true);}});
