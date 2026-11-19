import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLABORATION_INTERESTS, WORDING_VERSION, collaborationValues, prepareCollaboration, collaborationAnalytics, submitCollaboration } from './collaboration-enquiry.ts';
import { ENQUIRY_INTERESTS, outcomeMessage, isConfirmation } from './partner-enquiry.ts';
const input = { business_name:'Synthetic business', business_category:'other', contact_name:'Synthetic contact',email:'test@example.invalid',notes:'An exploratory idea.',acknowledgement:'yes', collaboration_interests:Object.keys(COLLABORATION_INTERESTS) };
const meta = {id:'d7ad16f6-66b0-4e6f-86c4-80f46a0ab321',enquiryRef:'PI-P-261117-ABCDEF',composeMs:5000};
function client(responses) {const calls=[];return {calls,from(table){return {async insert(row){calls.push({table,row});const r=responses.shift();if(r instanceof Error) throw r;return r;}};}};}
const ok={error:null,status:201};
const missing={error:{code:'PGRST205'},status:404};
const rejected={error:{code:'23514'},status:400};
test('FormData preserves every repeated interest and off/on preferences exactly',()=>{
 for(const enabled of [false,true]) {const data=new FormData();for(const [k,v] of Object.entries(input))if(k!=='collaboration_interests')data.set(k,v);for(const k of input.collaboration_interests)data.append('collaboration_interests',k);if(enabled)data.set('opportunity_updates','yes');const p=prepareCollaboration(collaborationValues(data));assert.equal(p.error,undefined);for(const label of Object.values(COLLABORATION_INTERESTS))assert.ok(p.values.notes.includes(label));assert.ok(ENQUIRY_INTERESTS.includes(p.values.interest));assert.ok(p.values.notes.includes(WORDING_VERSION));assert.ok(p.values.notes.includes(enabled?'Opportunity updates: opted in;':'Opportunity updates: not opted in;'));}
});
test('acknowledgement, description and vocabulary validation fail closed',()=>{
 for(const patch of [{acknowledgement:undefined},{notes:'  '},{collaboration_interests:['unknown']}])assert.ok(prepareCollaboration({...input,...patch}).error);
});
test('entire serialization has an exact 2000 boundary without truncation',()=>{
 const base=prepareCollaboration({...input,notes:'x'}).values.notes.length;
 const at=prepareCollaboration({...input,notes:'x'.repeat(2001-base)});assert.equal(at.values.notes.length,2000);assert.equal(at.error,undefined);
 const over=prepareCollaboration({...input,notes:'x'.repeat(2002-base)});assert.match(over.error,/at least 1 characters/);assert.equal(over.values.notes.length,2002-base);
});
test('hidden optional fields are excluded, selected details retained, enhanced legacy interest wins',()=>{
 const hidden=prepareCollaboration({...input,collaboration_interests:[],estimated_value:'SECRET'});assert.ok(!hidden.values.notes.includes('SECRET'));
 const selected=prepareCollaboration({...input,interest:'featured-profile',estimated_value:'AUD 100',quantity:'2',restrictions:'Weekdays',timing:'Discuss later'});assert.equal(selected.values.interest,'featured-profile');for(const v of ['AUD 100','Weekdays','Discuss later'])assert.ok(selected.values.notes.includes(v));
});
test('analytics drops free text, identifiers and preferences; invalid categories never emitted',()=>{
 assert.deepEqual(collaborationAnalytics({...input,business_category:'private@example.invalid',interest:'personal text'}),[['business_category',''],['interest','']]);
});
test('dedicated and missing-table fallback preserve notes identically and separate contacts',async()=>{
 const values=prepareCollaboration(input).values;
 for(const fallback of [false,true]){const c=client(fallback?[missing,ok]:[ok,ok]);assert.equal(await submitCollaboration(c,values,meta),'success');assert.equal(c.calls.length,2);if(fallback){assert.match(c.calls[1].row.title,/^PARTNER ENQUIRY:/);assert.match(c.calls[1].row.body,/^Intake type: partner-enquiry/);assert.ok(c.calls[1].row.body.endsWith(values.notes));assert.ok(!c.calls[1].row.body.includes(input.email));}else{assert.equal(c.calls[0].row.notes,values.notes);assert.equal(c.calls[1].row.contact_email,input.email);assert.equal(c.calls[0].row.contact_email,undefined);}}
});
test('definite rejection, server failure and partial contact never cause fallback or success',async()=>{
 for(const [responses,outcome,count] of [[[rejected],'failed',1],[[{error:{code:'XX000'},status:500}],'uncertain',1],[[ok,rejected],'unanswerable',2],[[missing,rejected],'failed',2],[[ok,{error:{code:''},status:0}],'uncertain',2]]){const c=client(responses);assert.equal(await submitCollaboration(c,input,meta),outcome);assert.equal(c.calls.length,count);assert.equal(isConfirmation(outcome),false);}
});
test('commit then response loss on primary, fallback or contact preserves identity without retry',async()=>{
 for(const responses of [[new Error('response lost')],[missing,new Error('response lost')],[ok,new Error('response lost')]]){const c=client(responses);const outcome=await submitCollaboration(c,input,meta);assert.equal(outcome,'uncertain');assert.equal(c.calls.filter(x=>x.table==='partner_enquiries').length,1);for(const {row}of c.calls)assert.equal(row.id||row.enquiry_id,meta.id);assert.match(outcomeMessage(outcome,meta.enquiryRef),/may have been recorded/);assert.doesNotMatch(outcomeMessage(outcome,meta.enquiryRef),/nothing was recorded/);}
});
