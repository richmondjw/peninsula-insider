#!/usr/bin/env node
// Peninsula Insider — Post-publish verification gate
//
// Checks an externally-resolved URL against the requirements in
// ops/post-publish-verification-checklist.md. Exits 0 on success, 1 on failure.
//
// Usage:
//   node ops/scripts/post-publish-verify.mjs <url> [<url>...]
//   node ops/scripts/post-publish-verify.mjs --report=ops/reports/verify/2026-05-10.md <url>
//   node ops/scripts/post-publish-verify.mjs --kind=event <url>
//   node ops/scripts/post-publish-verify.mjs --kind=article <url>
//   node ops/scripts/post-publish-verify.mjs --kind=dispatch <url>
//
// --kind selects which optional checks apply. Default is "page" (only required checks).

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const urls = [];
let reportPath = null;
let kind = 'page';
let verbose = false;

for (const a of args) {
  if (a.startsWith('--report=')) reportPath = a.slice('--report='.length);
  else if (a.startsWith('--kind=')) kind = a.slice('--kind='.length);
  else if (a === '--verbose' || a === '-v') verbose = true;
  else if (a.startsWith('http')) urls.push(a);
}

if (urls.length === 0) {
  console.error('usage: post-publish-verify.mjs [--report=PATH] [--kind=page|article|event|dispatch] <url>...');
  process.exit(2);
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

function check(name, ok, detail = '') {
  return { name, ok: !!ok, detail };
}

function attr(html, tag, attrName, attrValue) {
  // crude but sufficient — matches <tag ... attrName="..." ...>
  // case-insensitive on tag, attribute names. Not full HTML parsing.
  const re = new RegExp(
    `<${tag}\\b[^>]*\\b${attrName}\\s*=\\s*["']([^"']+)["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  if (!m) return null;
  if (attrValue && !m[0].toLowerCase().includes(attrValue.toLowerCase())) return null;
  return m[1];
}

function hasMeta(html, name, prop = false) {
  const re = new RegExp(
    `<meta\\s+${prop ? 'property' : 'name'}=["']${name}["']\\s+content=["']([^"']*)["']`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

async function verifyOne(url) {
  const checks = [];
  let html = '';
  let res;

  try {
    res = await fetchWithTimeout(url);
  } catch (e) {
    checks.push(check('http', false, `fetch failed: ${e.message}`));
    return { url, checks, ok: false };
  }

  checks.push(check('http', res.status === 200, `status ${res.status}, final ${res.url}`));
  if (res.status !== 200) return { url, checks, ok: false };

  html = await res.text();

  // 2. canonical
  const canonical = attr(html, 'link', 'href', '') && attr(html, 'link', 'rel') === 'canonical'
    ? attr(html, 'link', 'href')
    : (html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) || [])[1];
  checks.push(check('canonical', !!canonical, canonical || 'no <link rel="canonical">'));

  // 3. title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  checks.push(check('title', title.length > 0 && !/^Peninsula Insider\s*$/i.test(title), title || 'empty'));

  // 4. meta description
  const desc = hasMeta(html, 'description');
  checks.push(check('meta-description', !!desc && desc.length >= 50, desc ? `${desc.length} chars` : 'missing'));

  // 5. OG
  const ogTitle = hasMeta(html, 'og:title', true);
  const ogDesc = hasMeta(html, 'og:description', true);
  const ogImage = hasMeta(html, 'og:image', true);
  checks.push(check('og-title', !!ogTitle));
  checks.push(check('og-description', !!ogDesc));
  checks.push(check('og-image', !!ogImage));

  // 6. stylesheet
  const cssLinks = [...html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  let cssOk = false;
  let cssDetail = '';
  if (cssLinks.length === 0) {
    cssDetail = 'no stylesheet links';
  } else {
    for (const css of cssLinks) {
      const cssUrl = css.startsWith('http') ? css : new URL(css, res.url).toString();
      try {
        const r = await fetchWithTimeout(cssUrl);
        if (r.status === 200) {
          cssOk = true;
          cssDetail = cssUrl;
          break;
        }
        cssDetail = `${cssUrl} -> ${r.status}`;
      } catch (e) {
        cssDetail = `${cssUrl} -> error`;
      }
    }
  }
  checks.push(check('stylesheet', cssOk, cssDetail));

  // 9. raw-HTML fallback detection — pages that rendered without CSS frequently
  // have no <body class> set and no PI-specific style hooks. The PI build always
  // emits a <body data-page=...> hook on rendered pages.
  const bodyHook = /<body[^>]*\bdata-page=/i.test(html) || /<body[^>]*\bclass=["'][^"']*\bpi-/i.test(html);
  // Don't fail just on this — it is a soft signal. Report as soft warning.
  checks.push(check('body-hook', bodyHook, bodyHook ? 'present' : 'missing — possible raw-HTML fallback'));

  // 10. sitemap inclusion (best-effort)
  let inSitemap = null;
  try {
    const siteRoot = new URL('/sitemap.xml', res.url).toString();
    const r = await fetchWithTimeout(siteRoot);
    if (r.status === 200) {
      const sm = await r.text();
      inSitemap = sm.includes(canonical || res.url);
    }
  } catch {
    /* sitemap absent — skip */
  }
  if (inSitemap !== null) {
    checks.push(check('sitemap', inSitemap, inSitemap ? 'present' : 'not in sitemap.xml'));
  }

  // Per-kind checks
  if (kind === 'article' || kind === 'dispatch') {
    // 11. hero credit visible
    const creditVisible = /Photograph by jem|Photo · /i.test(html);
    checks.push(check('hero-credit-visible', creditVisible));

    // 12. lastVerified rendered
    const lastVerified = /Last verified|Verified \w+/i.test(html);
    checks.push(check('last-verified-visible', lastVerified));

    // 13. internal links count
    const internalLinks = [
      ...html.matchAll(/<a\s+[^>]*href=["'](?:\/[^"']+|https?:\/\/(?:www\.)?peninsulainsider\.com\.au[^"']*)["']/gi),
    ];
    checks.push(check('internal-links', internalLinks.length >= 3, `${internalLinks.length} found`));
  }

  if (kind === 'event') {
    // 14. & 15. event-specific
    const futureOrOngoing = /upcoming|today|tonight|this weekend|ongoing|next|every/i.test(html);
    checks.push(check('event-future-or-ongoing', futureOrOngoing));

    const bookingState = /Book now|Book direct|No booking|Walk in|Tickets/i.test(html);
    checks.push(check('event-booking-state', bookingState));
  }

  const ok = checks.every((c) => c.ok || c.name === 'body-hook');  // body-hook is soft
  return { url, checks, ok };
}

const results = [];
for (const url of urls) {
  if (verbose) console.error(`checking ${url}`);
  const r = await verifyOne(url);
  results.push(r);
  const status = r.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${url}`);
  for (const c of r.checks) {
    if (!c.ok) console.log(`  ✗ ${c.name}: ${c.detail}`);
    else if (verbose) console.log(`  ✓ ${c.name}${c.detail ? ': ' + c.detail : ''}`);
  }
}

const allOk = results.every((r) => r.ok);

if (reportPath) {
  await mkdir(dirname(reportPath), { recursive: true });
  const lines = [
    `# Post-publish verification — ${new Date().toISOString()}`,
    '',
    `Kind: \`${kind}\``,
    `URLs checked: ${results.length}`,
    `Result: **${allOk ? 'PASS' : 'FAIL'}**`,
    '',
  ];
  for (const r of results) {
    lines.push(`## ${r.ok ? '✅' : '❌'} ${r.url}`);
    lines.push('');
    for (const c of r.checks) {
      const mark = c.ok ? '✓' : '✗';
      lines.push(`- ${mark} \`${c.name}\`${c.detail ? ` — ${c.detail}` : ''}`);
    }
    lines.push('');
  }
  await writeFile(reportPath, lines.join('\n'));
  console.error(`report written to ${reportPath}`);
}

process.exit(allOk ? 0 : 1);
