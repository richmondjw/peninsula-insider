#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import puppeteer from 'puppeteer';

const options = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...parts] = arg.replace(/^--/, '').split('=');
  return [key, parts.join('=')];
}));
const base = options['base-url'] || 'https://peninsulainsider.com.au';
const expected = options['expect-sha'];
const routes = ['/', '/whats-on/', '/whats-on/mornington-racecourse-market/', '/whats-on/by-mood/this-weekend/'];
const report = { observedAt: new Date().toISOString(), base, expectedSourceSha: expected || null, checks: [], cmsReads: [], ok: false };
let browser;

async function verifyRevision() {
  if (!expected) return;
  const response = await fetch(new URL('/deployment.json', base), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, 'public deployment manifest is available');
  const manifest = await response.json();
  assert.equal(manifest.sourceSha, expected, 'public page must belong to the expected release');
  report.sourceSha = manifest.sourceSha;
  report.runId = manifest.runId;
}

async function snapshot(route, javascript) {
  const page = await browser.newPage();
  try {
    const slotReads = [];
    if (javascript) page.on('response', response => {
      if (!response.url().includes('/rest/v1/cms_image_slots') || response.request().method() !== 'GET') return;
      slotReads.push(response.json().then(rows => ({ status: response.status(), rows })).catch(error => ({ status: response.status(), error: error.message })));
    });
    await page.setViewport({ width: 390, height: 844 });
    await page.setJavaScriptEnabled(javascript);
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle2', timeout: 45000 });
    assert.equal(response.status(), 200, `${route} returns 200`);
    if (javascript) {
      const reads = await Promise.all(slotReads);
      assert.ok(reads.length > 0, `${route}: CMS media request was observed`);
      assert.ok(reads.every(read => read.status === 200 && Array.isArray(read.rows)), `${route}: CMS media request must succeed for live acceptance`);
      report.cmsReads.push({ route, publishedRows: reads[0].rows.length, eventRows: reads[0].rows.filter(row => row.entity_type === 'event').length });
    }
    return await page.evaluate(() => [...document.querySelectorAll('[data-pi-entity-type="event"][data-pi-field-path]')].map(el => ({
      slug: el.dataset.piEntitySlug,
      field: el.dataset.piFieldPath,
      src: el.getAttribute('src'),
      background: el.style.backgroundImage,
      alt: el.getAttribute('alt'),
      note: el.closest('.pi-card, .event-card, figure')?.querySelector('.pi-card__image-note, figcaption, .event-image-credit')?.textContent ?? '',
    })));
  } finally { await page.close(); }
}

try {
  await verifyRevision();
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let observed = 0;
  for (const route of routes) {
    const reviewed = await snapshot(route, false);
    const hydrated = await snapshot(route, true);
    observed += reviewed.length;
    assert.deepEqual(hydrated, reviewed, `${route}: public scripts changed reviewed event media or attribution`);
    report.checks.push({ route, eventMediaSlots: reviewed.length, unchangedAfterScripts: true });
  }
  assert.ok(observed > 0, 'the public audit exercised event media slots');
  await verifyRevision();
  report.ok = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (options.report) {
    await mkdir(dirname(options.report), { recursive: true });
    await writeFile(options.report, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
}
