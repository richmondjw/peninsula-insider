import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editorPromptLeaks, readerLeaks } from './assert-reader-boundary.mjs';
test('blocks the reported leak and machine links across reader bodies', () => {
  assert.ok(readerLeaks('<body>For agents, choose a JSON name directory <a href="/agents/directories/eat.json">Text</a></body>').length);
  assert.ok(readerLeaks('<body><footer><a href="/agents/">For AI assistants</a></footer></body>').length);
  assert.ok(readerLeaks('<body><p hidden>System prompt</p></body>').length);
  assert.ok(readerLeaks('<body><img alt="Developer instructions"></body>').length);
});
test('preserves head discovery and ordinary editorial language', () => {
  assert.deepEqual(readerLeaks('<head><link rel="describedby" href="/llms.txt"></head><body><p>Ask your travel agent about this stay.</p><a href="/site-index/">Places and stories</a><script>"For agents"</script></body>'), []);
});

const camera = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8z'/%3E%3C/svg%3E")`;
test('blocks the photo prompt in any stylesheet a reader loads', () => {
  // The rules that shipped: the prompt text and the camera icon, unscoped.
  assert.equal(editorPromptLeaks(`.venue-card__hero--placeholder:before{content:"";background:${camera} center/contain no-repeat}.venue-card__hero--placeholder:after{content:"Add photo";color:var(--soft)}`).length, 2);
  assert.match(editorPromptLeaks('.event-card__hero--placeholder::after { content: \'Add photo\'; }')[0], /event-card__hero--placeholder::after generates prompt text/);
  // Nested in a media query, or percent-encoded by a minifier, it still leaks.
  assert.equal(editorPromptLeaks('@media (min-width:40em){.slot:after{content:"Add a photo"}}').length, 1);
  assert.equal(editorPromptLeaks(`.slot:before{background:${camera.replaceAll(' ', '%20')}}`).length, 1);
  // One unscoped selector in a list is enough for readers to see it.
  assert.equal(editorPromptLeaks('body[data-pi-edit-mode=on] .a:after,.b:after{content:"Add photo"}').length, 1);
  // A negated edit-mode selector targets readers, not editors.
  assert.equal(editorPromptLeaks('body:not([data-pi-edit-mode="on"]) .slot::after{content:"Add image"}').length, 1);
});
test('allows the prompt in edit mode and leaves reader plates alone', () => {
  assert.deepEqual(editorPromptLeaks(`body[data-pi-edit-mode="on"]:not([data-page="stay"]) .venue-card__hero--placeholder::after{content:'Add photo';background:${camera} center top / 36px no-repeat}`), []);
  assert.deepEqual(editorPromptLeaks('body[data-pi-edit-mode=on] .a:after,body[data-pi-edit-mode=on] .b:after{content:"Add photo"}'), []);
  assert.deepEqual(editorPromptLeaks('@media print{body[data-pi-edit-mode=on]{.slot:after{content:"Add photo"}}}'), []);
  assert.deepEqual(editorPromptLeaks('.venue-card__hero--placeholder::before{content:"PI"}.venue-card__hero--placeholder::after{content:"Peninsula Insider"}.x-result[data-pick]::before{content:"Our pick"}'), []);
  // Braces and semicolons inside strings and comments are not structure.
  assert.deepEqual(editorPromptLeaks('/* .a:after{content:"Add photo"} */.b:after{content:"} ; {";align-content:center}'), []);
});
test('checks inline stylesheets and contradictory photo slots in reader pages', () => {
  assert.match(readerLeaks('<head><style>.venue-card__hero--placeholder:after{content:"Add photo"}</style></head><body></body>')[0], /Editor photo prompt outside edit mode/);
  assert.match(readerLeaks('<body><a class="venue-card__hero venue-card__hero--placeholder" data-pi-entity-type="venue" data-pi-entity-slug="bistro-elba" style="background-image: url(/a.jpg)"></a></body>')[0], /Placeholder photo slot also holds a photograph: venue\/bistro-elba/);
  assert.equal(readerLeaks('<body><a class="venue-card__hero venue-card__hero--placeholder"><img src="/a.jpg" alt=""></a></body>').length, 1);
  assert.deepEqual(readerLeaks('<body><a class="venue-card__hero venue-card__hero--placeholder"></a><a class="venue-card__hero"><img src="/a.jpg" alt=""></a><ul aria-label="Choose a photograph"></ul><label>Upload photos<input type="file"></label></body>'), []);
});
test('the source stylesheets keep the prompt in the editor sheet, in edit mode', () => {
  const sheet = (name) => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8');
  assert.deepEqual(editorPromptLeaks(sheet('global.css')), []);
  assert.deepEqual(editorPromptLeaks(sheet('inline-edit.css')), []);
  assert.doesNotMatch(sheet('global.css'), /Add photo/i);
  assert.match(sheet('inline-edit.css'), /content: 'Add photo'/);
});
