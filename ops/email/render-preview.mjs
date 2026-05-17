#!/usr/bin/env node
/**
 * render-preview.mjs
 *
 * Renders ops/email/dispatch-weekly.html (Handlebars-style template) with
 * the latest Peninsula This Weekend dispatch frontmatter and writes a
 * fully-populated preview to ops/email/dispatch-weekly.preview.html.
 *
 * Usage:
 *   node ops/email/render-preview.mjs
 *
 * Picks the most recent peninsula-this-weekend-*.md article that has a
 * `dispatch` block in its frontmatter. Mirrors the page selection logic
 * in next/src/lib/peninsula-this-weekend.ts so the preview matches what
 * /whats-on/this-weekend/ shows.
 *
 * Substitution covers `{{ var }}`, `{{ obj.field }}`, and `{{#if x}} ... {{/if}}`.
 * Deliberately minimal — no full Handlebars dependency. Add one when the
 * dispatch structure outgrows simple field access.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'ops', 'email', 'dispatch-weekly.html');
const OUT = path.join(ROOT, 'ops', 'email', 'dispatch-weekly.preview.html');
const ARTICLES = path.join(ROOT, 'next', 'src', 'content', 'articles');

// ── Pick latest dispatch ────────────────────────────────────────────────
const candidates = fs.readdirSync(ARTICLES)
  .filter((f) => f.startsWith('peninsula-this-weekend-') && f.endsWith('.md'))
  .map((f) => path.join(ARTICLES, f))
  .sort();

if (candidates.length === 0) {
  console.error('No peninsula-this-weekend-*.md articles found.');
  process.exit(1);
}

// Read frontmatter blocks until we find one with a `dispatch:` field.
function parseFrontmatter(src) {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1];
}

// Trivial YAML reader for the subset we use: top-level scalars, nested
// `dispatch:` object, single-line scalar values, and quoted strings.
// Avoids pulling in a yaml dependency for a one-off preview script.
function readYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let i = 0;
  const stripQuotes = (s) => {
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#')) { i++; continue; }
    // top-level key: value or key:
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) { i++; continue; }
    const [, key, rest] = m;
    if (rest.trim() === '') {
      // nested block; collect indented lines
      const block = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        block.push(lines[i].slice(2));
        i++;
      }
      out[key] = readYaml(block.join('\n'));
    } else {
      out[key] = stripQuotes(rest);
      i++;
    }
  }
  return out;
}

let chosen = null;
let chosenData = null;
for (const file of [...candidates].reverse()) {
  const src = fs.readFileSync(file, 'utf-8');
  const fm = parseFrontmatter(src);
  if (!fm) continue;
  const data = readYaml(fm);
  if (data.dispatch) {
    chosen = file;
    chosenData = data;
    break;
  }
}

if (!chosen) {
  console.error('No PTW article with a `dispatch:` frontmatter block found.');
  process.exit(1);
}

console.log('Rendering preview from:', path.basename(chosen));

// ── Build the substitution context ──────────────────────────────────────
function weekendLabel(publishedAt) {
  // Mirrors next/src/lib/peninsula-this-weekend.ts ptwWeekendLabel.
  const d = new Date(publishedAt + 'T00:00:00Z');
  // Advance to next Friday
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  const sat = new Date(d); sat.setUTCDate(d.getUTCDate() + 1);
  const sun = new Date(d); sun.setUTCDate(d.getUTCDate() + 2);
  const month = (x) => new Intl.DateTimeFormat('en-AU', { month: 'long', timeZone: 'UTC' }).format(x);
  if (month(sat) === month(sun)) return `${sat.getUTCDate()} to ${sun.getUTCDate()} ${month(sun)}`;
  return `${sat.getUTCDate()} ${month(sat)} to ${sun.getUTCDate()} ${month(sun)}`;
}

const dispatch = chosenData.dispatch;
const hero = chosenData.heroImage ?? {};
const heroSrc = (hero.src ?? '/images/sourced/home-cover.webp').startsWith('http')
  ? hero.src
  : `https://peninsulainsider.com.au${hero.src}`;

const context = {
  preheader: chosenData.dek ?? '',
  weekend_label: weekendLabel(chosenData.publishedAt),
  dispatch_title: chosenData.title ?? '',
  hero_image_url: heroSrc,
  hero_image_alt: hero.alt ?? '',
  editor_line: dispatch.editorLine ?? '',
  weather: dispatch.weather ?? '',
  lead: {
    title: dispatch.lead?.title ?? '',
    when: dispatch.lead?.when ?? '',
    where: dispatch.lead?.where ?? '',
    price: dispatch.lead?.price ?? 'See organiser',
    who: dispatch.lead?.who ?? 'See organiser',
    summary: dispatch.lead?.summary ?? '',
    booking_label: dispatch.lead?.bookingLabel ?? 'Book this',
    booking_url: dispatch.lead?.bookingUrl ?? 'https://peninsulainsider.com.au/whats-on/this-weekend/',
  },
  saturday: dispatch.saturday ? {
    title: dispatch.saturday.title ?? '',
    when: dispatch.saturday.when ?? '',
    where: dispatch.saturday.where ?? '',
    price: dispatch.saturday.price ?? '',
    summary: dispatch.saturday.summary ?? '',
    booking_label: dispatch.saturday.bookingLabel ?? '',
    booking_url: dispatch.saturday.bookingUrl ?? '',
  } : null,
  sunday: dispatch.sunday ? {
    title: dispatch.sunday.title ?? '',
    when: dispatch.sunday.when ?? '',
    where: dispatch.sunday.where ?? '',
    price: dispatch.sunday.price ?? '',
    summary: dispatch.sunday.summary ?? '',
    booking_label: dispatch.sunday.bookingLabel ?? '',
    booking_url: dispatch.sunday.bookingUrl ?? '',
  } : null,
  rainy_day: dispatch.rainyDay ? {
    title: dispatch.rainyDay.title ?? '',
    when: dispatch.rainyDay.when ?? '',
    where: dispatch.rainyDay.where ?? '',
    price: dispatch.rainyDay.price ?? '',
    summary: dispatch.rainyDay.summary ?? '',
  } : null,
  weekend_shape: dispatch.weekendShape ?? '',
  canonical_url: 'https://peninsulainsider.com.au/whats-on/this-weekend/',
  unsubscribe_url: 'https://peninsulainsider.com.au/unsubscribe/?preview=1',
};

// ── Render ──────────────────────────────────────────────────────────────
let tpl = fs.readFileSync(TEMPLATE, 'utf-8');

// Process `{{#if x.y}} ... {{/if}}` blocks. Resolve innermost first so
// nested blocks unwind correctly. The regex's body excludes `{{#if`,
// guaranteeing we only ever match a leaf-level block.
for (let i = 0; i < 20; i++) {
  const next = tpl.replace(
    /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g,
    (_, expr, body) => {
      const val = resolve(expr, context);
      return val ? body : '';
    },
  );
  if (next === tpl) break;
  tpl = next;
}

// Process `{{ var }}` and `{{ obj.field }}`
tpl = tpl.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, expr) => {
  const val = resolve(expr, context);
  return val == null ? '' : String(val);
});

function resolve(expr, ctx) {
  const parts = expr.split('.');
  let v = ctx;
  for (const p of parts) {
    if (v == null) return null;
    v = v[p];
  }
  return v;
}

fs.writeFileSync(OUT, tpl, 'utf-8');
console.log('Wrote:', OUT);
