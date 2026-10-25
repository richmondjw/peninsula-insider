#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import puppeteer from 'puppeteer';
import { selectEventPromotions } from '../src/lib/event-discovery.mjs';

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
    // networkidle2 permits two in-flight requests, including a slow CMS read.
    // Wait for the actual data response before evaluating its page effects.
    const firstSlotResponse = javascript ? page.waitForResponse(response =>
      response.url().includes('/rest/v1/cms_image_slots') && response.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(error => ({ error: error.message })) : null;
    if (javascript) page.on('response', response => {
      if (!response.url().includes('/rest/v1/cms_image_slots') || response.request().method() !== 'GET') return;
      slotReads.push(response.json().then(rows => ({ status: response.status(), rows })).catch(error => ({ status: response.status(), error: error.message })));
    });
    await page.setViewport({ width: 390, height: 844 });
    await page.setJavaScriptEnabled(javascript);
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle2', timeout: 45000 });
    assert.equal(response.status(), 200, `${route} returns 200`);
    if (javascript) {
      const remaining = await page.$$eval('[data-pi-entity-type="event"][data-pi-field-path]', elements => elements.length);
      if (remaining) {
        const slotResponse = await firstSlotResponse;
        assert.ok(!slotResponse.error, `${route}: CMS media response did not arrive: ${slotResponse.error || ''}`);
        const reads = await Promise.all(slotReads);
        assert.ok(reads.length > 0, `${route}: CMS media request was observed`);
        assert.ok(reads.every(read => read.status === 200 && Array.isArray(read.rows)), `${route}: CMS media request must succeed for live acceptance`);
        report.cmsReads.push({ route, publishedRows: reads[0].rows.length, eventRows: reads[0].rows.filter(row => row.entity_type === 'event').length });
      } else {
        // A dated promotion may expire after the static build. With no event
        // media left to hydrate, the page correctly makes no CMS slot read.
        report.cmsReads.push({ route, skipped: 'no-visible-event-media' });
      }
    }
    return await page.evaluate(() => [...document.querySelectorAll('[data-pi-entity-type="event"][data-pi-field-path]')].map(el => {
      const promotion = el.closest('[data-event-promotion]');
      return {
        slug: el.dataset.piEntitySlug,
        field: el.dataset.piFieldPath,
        src: el.getAttribute('src'),
        background: el.style.backgroundImage,
        alt: el.getAttribute('alt'),
        note: el.closest('.pi-card, .event-card, figure')?.querySelector('.pi-card__image-note, figcaption, .event-image-credit')?.textContent ?? '',
        promotion: promotion ? {
          entry: promotion.getAttribute('data-event-promotion'),
          day: promotion.getAttribute('data-event-promotion-day'),
        } : null,
      };
    }));
  } finally { await page.close(); }
}

function currentReviewedMedia(slots, now) {
  return slots.filter(slot => {
    if (!slot.promotion) return true;
    try {
      const { entry, day } = slot.promotion;
      return selectEventPromotions([JSON.parse(entry)], {
        now, windowStart: new Date(day + 'T00:00:00Z'), windowDays: 1,
      }).some(item => item.day === day);
    } catch { return false; }
  }).map(({ promotion, ...media }) => media);
}

try {
  await verifyRevision();
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let observed = 0;
  for (const route of routes) {
    const reviewed = await snapshot(route, false);
    const hydrated = await snapshot(route, true);
    // The browser legitimately removes a dated promotion when it finishes
    // between the static build and this audit. Apply the same pure eligibility
    // rule to the reviewed baseline; still reject changed images, credits,
    // missing current cards, and unreviewed additions.
    const current = currentReviewedMedia(reviewed, new Date());
    const hydratedMedia = hydrated.map(({ promotion, ...media }) => media);
    observed += current.length;
    assert.deepEqual(hydratedMedia, current, `${route}: public scripts changed reviewed event media or attribution`);
    report.checks.push({ route, eventMediaSlots: current.length, expiredPromotionSlots: reviewed.length - current.length, unchangedAfterScripts: true });
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
