import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/components/PiChat.astro', import.meta.url), 'utf8');
const click = source.split("document.addEventListener('click', (e) => {")[1].split('}, true);')[0].replaceAll(' as HTMLElement', '').replaceAll('<HTMLAnchorElement>', '').replaceAll('(window as any)', 'window');
function run({ inside = true, href = 'https://pi.test/eat/venue/', ...overrides } = {}) {
  const calls = [];
  const a = {href, dataset: {}, target: '', hasAttribute: () => false};
  const e = {button: 0, target: {closest: () => a}, preventDefault() {calls.push('prevent');}, ...overrides};
  vm.runInNewContext(`(function(e) {${click}})(e)`, {e, panel: {contains: () => inside}, minimise: (focus) => calls.push(['minimise', focus]), onAskPage: () => false, location: {origin: 'https://pi.test', href:'https://pi.test/'}, URL, window: {}, ask: () => calls.push('ask'), open: () => calls.push('open'), popUpFrom: () => calls.push('popup')});
  return calls;
}
for (const href of ['https://pi.test/eat/venue/', 'https://pi.test/ask/?q=lunch', 'https://other.test/', 'https://pi.test/#section']) {
  test(`chat link minimises without preventing navigation: ${href}`, () => assert.deepEqual(run({href}), [['minimise', false]]));
}
test('outside links do not minimise', () => assert.deepEqual(run({inside:false}), []));
test('outside Ask PI handoff still opens chat', () => assert.deepEqual(run({inside:false, href:'https://pi.test/ask/'}), ['prevent','open']));
for (const modifier of ['metaKey','ctrlKey','shiftKey','altKey','defaultPrevented']) test(`${modifier} preserves current interaction`, () => assert.deepEqual(run({[modifier]:true}), []));
test('middle click does not interrupt current chat', () => assert.deepEqual(run({button:1}), []));
test('minimise persists closed state and releases responsive chrome without deleting conversation', () => {
  const fn = source.split('function minimise(focus = true) {')[1].split('/* ---------- rendering')[0];
  assert.match(fn, /store.set\(sessionStorage, STATE, 'closed'\)/);
  assert.match(fn, /applyChrome\(\)/);
  assert.doesNotMatch(fn, /turns =|HISTORY|abort\(/);
  assert.match(fn, /if \(focus\) launch.focus/);
});
test('queued open animation cannot reopen a just-minimised chat', () => assert.match(source, /requestAnimationFrame\(\(\) => \{\s*if \(root!\.dataset\.state !== 'open'\) return;/));
