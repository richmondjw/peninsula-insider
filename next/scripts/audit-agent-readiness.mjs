#!/usr/bin/env node

/**
 * Post-build truth gate for the machine-readable and time-sensitive surfaces.
 *
 * Usage:
 *   node scripts/audit-agent-readiness.mjs [--site dist] [--now YYYY-MM-DD]
 *   node scripts/audit-agent-readiness.mjs [--site dist] [--instant ISO-8601]
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const valueFor = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const sydneyDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const siteDir = resolve(valueFor('--site', 'dist'));
const instantArg = valueFor('--instant', null);
const instant = instantArg ? new Date(instantArg) : new Date();
if (!Number.isFinite(instant.getTime())) {
  console.error(`Agent-readiness audit: invalid --instant value: ${instantArg}`);
  process.exit(1);
}
const nowArg = valueFor('--now', sydneyDate(instant));
const today = new Date(`${nowArg}T00:00:00Z`);
const failures = [];

const fail = (message) => failures.push(message);
const read = (path) => readFileSync(path, 'utf8');
const dateOnly = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00Z`);

if (!existsSync(siteDir)) {
  console.error(`Agent-readiness audit: site directory not found: ${siteDir}`);
  process.exit(1);
}

// The consolidated agent feed must describe only current/future occurrences.
const upcomingPath = join(siteDir, 'whats-on', 'upcoming.json');
if (!existsSync(upcomingPath)) {
  fail('Missing /whats-on/upcoming.json');
} else {
  const feed = JSON.parse(read(upcomingPath));
  if (feed.generated !== nowArg) {
    fail(`/whats-on/upcoming.json generated=${feed.generated}; expected ${nowArg}`);
  }
  if (feed.count !== feed.events?.length) {
    fail(`/whats-on/upcoming.json count=${feed.count}; events=${feed.events?.length ?? 'missing'}`);
  }
  if (feed.numberOfItems !== feed.events?.length || feed.itemListElement?.length !== feed.events?.length) {
    fail(
      `/whats-on/upcoming.json ItemList counts do not match events=${feed.events?.length ?? 'missing'}`,
    );
  }
  for (const [index, event] of (feed.events ?? []).entries()) {
    const listItem = feed.itemListElement?.[index];
    if (
      listItem?.['@type'] !== 'ListItem' ||
      listItem?.position !== index + 1 ||
      listItem?.item?.['@type'] !== 'Event' ||
      listItem?.item?.url !== event.url ||
      listItem?.item?.startDate !== event.startDate ||
      listItem?.item?.endDate !== event.endDate
    ) {
      fail(`/whats-on/upcoming.json ItemList entry ${index + 1} disagrees with events payload`);
    }
  }
  const weekendCount = (feed.events ?? []).filter((event) => event.thisWeekend).length;
  if (feed.thisWeekend?.count !== weekendCount) {
    fail(`/whats-on/upcoming.json thisWeekend.count=${feed.thisWeekend?.count}; actual=${weekendCount}`);
  }
  for (const event of feed.events ?? []) {
    const start = dateOnly(event.startDate);
    const end = dateOnly(event.endDate ?? event.startDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      fail(`Invalid feed dates for ${event.url}`);
      continue;
    }
    if (end < start) fail(`Feed endDate precedes startDate for ${event.url}`);
    if (end < today) fail(`Expired occurrence in upcoming feed: ${event.url} (${event.endDate})`);
  }
}

// The rolling weekend page declares the actual current window and whether it
// is an edited dispatch or the registry fallback. Either mode must be current.
const weekendPath = join(siteDir, 'whats-on', 'this-weekend', 'index.html');
if (!existsSync(weekendPath)) {
  fail('Missing /whats-on/this-weekend/');
} else {
  const html = read(weekendPath);
  const marker = html.match(/<article[^>]+data-weekend-end="([^"]+)"[^>]+data-source-mode="([^"]+)"/);
  if (!marker) {
    fail('/whats-on/this-weekend/ is missing its freshness marker');
  } else if (new Date(marker[1]) < today) {
    fail(`/whats-on/this-weekend/ is stale (${marker[1]}, mode=${marker[2]})`);
  }
}

const htmlFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (name.endsWith('.html')) htmlFiles.push(path);
  }
};
walk(siteDir);

// Event JSON-LD must be temporally coherent on every generated page.
for (const path of htmlFiles) {
  const html = read(path);
  const scripts = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  let breadcrumbLists = 0;
  for (const match of scripts) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'BreadcrumbList') breadcrumbLists += 1;
      if (node['@type'] === 'Event' && node.startDate && node.endDate) {
        const start = new Date(node.startDate);
        const end = new Date(node.endDate);
        if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
          fail(`Event schema endDate precedes startDate in ${relative(siteDir, path)}`);
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(data);
  }
  if (breadcrumbLists > 1) {
    fail(`Duplicate BreadcrumbList schemas in ${relative(siteDir, path)} (${breadcrumbLists})`);
  }
}

// Sitemap URLs may not point at generated noindex/meta-refresh/canonical-loss
// stubs. This keeps sitemap.xml and the derived llms indexes honest.
const sitemapPath = join(siteDir, 'sitemap.xml');
if (!existsSync(sitemapPath)) {
  fail('Missing /sitemap.xml');
} else {
  const xml = read(sitemapPath);
  const locs = [...xml.matchAll(/<loc>https:\/\/peninsulainsider\.com\.au([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  if (new Set(locs).size !== locs.length) fail('Duplicate <loc> values in sitemap.xml');
  for (const pathname of locs) {
    const clean = decodeURIComponent(pathname.split(/[?#]/)[0]);
    const local = clean === '/'
      ? join(siteDir, 'index.html')
      : join(siteDir, ...clean.split('/').filter(Boolean), 'index.html');
    if (!existsSync(local)) {
      fail(`Sitemap URL has no generated page: ${pathname}`);
      continue;
    }
    const html = read(local);
    if (/http-equiv=["']refresh["']/i.test(html) || /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) {
      fail(`Sitemap includes redirect/noindex page: ${pathname}`);
    }
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
    if (canonical) {
      const expected = `https://peninsulainsider.com.au${clean.endsWith('/') ? clean : `${clean}/`}`;
      const normalized = canonical.endsWith('/') ? canonical : `${canonical}/`;
      if (normalized !== expected) fail(`Sitemap canonical mismatch: ${pathname} -> ${canonical}`);
    }
  }
}

if (failures.length) {
  console.error(`Agent-readiness audit failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Agent-readiness audit passed for ${nowArg} (${htmlFiles.length} HTML pages).`);
