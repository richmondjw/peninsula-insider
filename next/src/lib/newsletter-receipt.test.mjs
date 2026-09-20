import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const sources = [
 ['SubscribeForm', readFileSync(new URL('../../public/assets/subscribe-form.js', import.meta.url), 'utf8')],
 ['NewsletterBlock', readFileSync(new URL('../components/NewsletterBlock.astro', import.meta.url), 'utf8').match(/<script is:inline>([\s\S]*?)<\/script>/)[1]],
];
for (const [name, script] of sources) test(`${name}: receipt-only success, no double submit and retry after failure`, async () => {
 const input = { value: 'private@example.invalid', disabled: false, focus() {} };
 const button = { disabled: false, textContent: 'Join' };
 const label = { textContent: 'Join' }; const status = {textContent: ''};
 let submit; let resolve; let requests = 0; const events = [];
 const form = {dataset: {endpoint: 'https://example.invalid/subscribe', source: 'test'}, parentNode: {querySelector: () => status}, querySelector: s => /input/.test(s) ? input : /label/.test(s) ? label : /status/.test(s) ? status : button, addEventListener: (_name, fn) => {submit = fn;} };
 const context = {document: {readyState:'complete', querySelectorAll: () => [form], addEventListener() {}}, window: {piTrack: (...args) => events.push(args)}, fetch: () => {requests++; return new Promise(r => {resolve=r;});} };
 vm.runInNewContext(script, context);
 const flush = () => new Promise(r => setImmediate(r));
 submit({preventDefault(){}}); submit({preventDefault(){}});
 assert.equal(requests, 1);
 resolve({ok:false,json:async()=>({ok:true})}); await flush();
 assert.equal(events.length, 0); assert.equal(button.disabled, false);
 assert.equal(name === 'SubscribeForm' ? label.textContent : button.textContent, 'Join');
 submit({preventDefault(){}}); resolve({ok:true,json:async()=>({ok:false})}); await flush();
 assert.equal(events.length, 0);
 submit({preventDefault(){}}); resolve({ok:true,json:async()=>({success:true})}); await flush();
 assert.equal(events.length, 1); assert.equal(events[0][0], 'newsletter_signup_succeeded');
 assert.equal(JSON.stringify(events).includes('private@example.invalid'), false);
 submit({preventDefault(){}}); assert.equal(requests, 3);
});
