import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('public media verifier waits for a delayed CMS response and still detects substitutions', async () => {
  let mutate = false;
  const server = createServer((req, res) => {
    if (req.url === '/rest/v1/cms_image_slots') {
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify([{ entity_type: 'event' }]));
      }, 1800);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<div data-pi-entity-type="event" data-pi-field-path="heroImage" data-pi-entity-slug="fixture"></div>
      <script>fetch('/rest/v1/cms_image_slots').then(r => r.json()).then(() => {
        ${mutate ? `document.querySelector('[data-pi-entity-type]').style.backgroundImage='url(/unreviewed.jpg)';` : ''}
      });</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const run = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./verify-public-event-media.mjs', import.meta.url)), `--base-url=http://127.0.0.1:${server.address().port}`]);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk);
    child.stderr.on('data', chunk => stderr += chunk);
    child.on('error', reject);
    child.on('close', code => {
      try { resolve({ code, report: JSON.parse(stdout), stderr }); } catch (error) { reject(new Error(`${error.message}: ${stdout} ${stderr}`)); }
    });
  });
  try {
    const safe = await run();
    assert.equal(safe.code, 0, JSON.stringify(safe));
    assert.equal(safe.report.checks.length, 4);
    assert.equal(safe.report.cmsReads.length, 4);
    mutate = true;
    const unsafe = await run();
    assert.equal(unsafe.code, 1);
    assert.match(unsafe.report.error, /changed reviewed event media or attribution/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
