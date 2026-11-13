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

async function verifyCmsReachability(page, route) {
  const result = await page.evaluate(async () => {
    const config = window.__PI_SB;
    if (!config?.url || !config?.key) return { error: 'public Supabase configuration is unavailable' };
    const url = new URL('/rest/v1/cms_image_slots', config.url);
    url.searchParams.set('select', 'entity_type,entity_slug,field_path,public_url,alt_text,credit');
    url.searchParams.set('status', 'eq.published');
    const attempts = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const startedAt = performance.now();
      try {
        const response = await fetch(url, {
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            'Accept-Profile': 'pi',
          },
          signal: AbortSignal.timeout(15000),
        });
        const rows = await response.json();
        attempts.push({ attempt, status: response.status, elapsedMs: Math.round(performance.now() - startedAt) });
        if (response.ok && Array.isArray(rows)) return { attempts, rows };
      } catch (error) {
        attempts.push({ attempt, error: error.message, elapsedMs: Math.round(performance.now() - startedAt) });
      }
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
    return { attempts, error: 'CMS media endpoint did not return a published-slot array' };
  });
  assert.ok(!result.error, `${route}: ${result.error || ''}`);
  report.cmsReads.push({
    route,
    publishedRows: result.rows.length,
    eventRows: result.rows.filter(row => row.entity_type === 'event').length,
    attempts: result.attempts,
  });
}

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
    await page.setViewport({ width: 390, height: 844 });
    await page.setJavaScriptEnabled(javascript);
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle2', timeout: 45000 });
    assert.equal(response.status(), 200, `${route} returns 200`);
    if (javascript) {
      // Event slots are intentionally static (`data-pi-no-hydrate`) so their
      // reviewed image and attribution cannot be changed by a CMS response.
      // Check the CMS transport independently: a page may correctly make no
      // automatic slot read when every visible event is non-hydratable.
      await verifyCmsReachability(page, route);
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
