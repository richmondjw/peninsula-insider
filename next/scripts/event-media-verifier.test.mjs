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

test('public media verifier permits expired promotion removal but protects current media', async () => {
  const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const promotion = (slug, day) => {
    const entry = { id: slug, data: {
      slug, title: slug, status: 'published', venueName: 'Fixture venue',
      suburb: 'Mornington', place: 'mornington', startDate: day,
      endDate: day, startTime: '10:00', endTime: '17:00',
    } };
    return `<li data-event-promotion="${JSON.stringify(entry).replaceAll('"', '&quot;')}" data-event-promotion-day="${day}">
      <img data-pi-entity-type="event" data-pi-field-path="heroImage" data-pi-entity-slug="${slug}" src="/${slug}.webp" alt="Reviewed fixture">
    </li>`;
  };
  let removeCurrent = false;
  const server = createServer((req, res) => {
    if (req.url === '/rest/v1/cms_image_slots') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ entity_type: 'event' }]));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`${promotion('expired', '2026-10-10')}${promotion('current', future)}
      <script>fetch('/rest/v1/cms_image_slots').then(r => r.json()).then(() => {
        document.querySelector('[data-pi-entity-slug="expired"]').closest('li').remove();
        ${removeCurrent ? `document.querySelector('[data-pi-entity-slug="current"]').closest('li').remove();` : ''}
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
    assert.equal(safe.report.checks[0].eventMediaSlots, 1);
    assert.equal(safe.report.checks[0].expiredPromotionSlots, 1);
    removeCurrent = true;
    const unsafe = await run();
    assert.equal(unsafe.code, 1);
    assert.match(unsafe.report.error, /changed reviewed event media or attribution/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('public media verifier does not require a CMS read after the last promotion expires', async () => {
  const entry = { id: 'expired', data: {
    slug: 'expired', title: 'Expired fixture', status: 'published',
    venueName: 'Fixture venue', suburb: 'Mornington', place: 'mornington',
    startDate: '2026-10-10', endDate: '2026-10-10',
    startTime: '10:00', endTime: '13:00',
  } };
  const server = createServer((req, res) => {
    if (req.url === '/rest/v1/cms_image_slots') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ entity_type: 'event' }]));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    if (req.url === '/whats-on/') {
      res.end(`<li data-event-promotion="${JSON.stringify(entry).replaceAll('"', '&quot;')}" data-event-promotion-day="2026-10-10">
        <img data-pi-entity-type="event" data-pi-field-path="heroImage" data-pi-entity-slug="expired" src="/expired.webp" alt="Reviewed fixture">
      </li><script>document.querySelector('[data-event-promotion]').remove();</script>`);
    } else {
      res.end(`<div data-pi-entity-type="event" data-pi-field-path="heroImage" data-pi-entity-slug="current"></div>
        <script>fetch('/rest/v1/cms_image_slots').then(r => r.json());</script>`);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./verify-public-event-media.mjs', import.meta.url)), `--base-url=http://127.0.0.1:${server.address().port}`]);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk);
    child.stderr.on('data', chunk => stderr += chunk);
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    const report = JSON.parse(stdout);
    assert.equal(code, 0, JSON.stringify({ report, stderr }));
    assert.deepEqual(report.checks.find(check => check.route === '/whats-on/'), {
      route: '/whats-on/', eventMediaSlots: 0, expiredPromotionSlots: 1, unchangedAfterScripts: true,
    });
    assert.deepEqual(report.cmsReads.find(read => read.route === '/whats-on/'), {
      route: '/whats-on/', skipped: 'no-visible-event-media',
    });
    assert.equal(report.cmsReads.filter(read => read.publishedRows === 1).length, 3);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
