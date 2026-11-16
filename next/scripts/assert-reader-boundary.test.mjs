import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readerLeaks } from './assert-reader-boundary.mjs';
test('blocks the reported leak and machine links across reader bodies', () => {
  assert.ok(readerLeaks('<body>For agents, choose a JSON name directory <a href="/agents/directories/eat.json">Text</a></body>').length);
  assert.ok(readerLeaks('<body><footer><a href="/agents/">For AI assistants</a></footer></body>').length);
  assert.ok(readerLeaks('<body><p hidden>System prompt</p></body>').length);
  assert.ok(readerLeaks('<body><img alt="Developer instructions"></body>').length);
});
test('preserves head discovery and ordinary editorial language', () => {
  assert.deepEqual(readerLeaks('<head><link rel="describedby" href="/llms.txt"></head><body><p>Ask your travel agent about this stay.</p><a href="/site-index/">Places and stories</a><script>"For agents"</script></body>'), []);
});
