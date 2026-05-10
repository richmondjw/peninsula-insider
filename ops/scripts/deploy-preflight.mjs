#!/usr/bin/env node
// Peninsula Insider — Deploy preflight checks
//
// Runs before a deploy to catch failure modes that have hit PI in the past:
//   - missing required env vars (Supabase, concierge API)
//   - missing fallback stylesheet (the 2026-04-13 hashed-CSS fragility lesson)
//   - missing critical source files
//   - stale or missing build outputs (when run after build)
//   - presence of staging files at the deploy root
//
// Usage:
//   node ops/scripts/deploy-preflight.mjs                   # full preflight, exits 1 on failure
//   node ops/scripts/deploy-preflight.mjs --skip-env        # skip env-var checks (e.g. local dev)
//   node ops/scripts/deploy-preflight.mjs --skip-build      # skip build-output checks
//   node ops/scripts/deploy-preflight.mjs --json            # JSON output

import { stat, readFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants as fsConstants } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const opts = {
  skipEnv: false,
  skipBuild: false,
  json: false,
};
for (const a of args) {
  if (a === '--skip-env') opts.skipEnv = true;
  else if (a === '--skip-build') opts.skipBuild = true;
  else if (a === '--json') opts.json = true;
}

const findings = [];
const ok = (name, detail = '') => findings.push({ name, status: 'ok', detail });
const fail = (name, detail) => findings.push({ name, status: 'fail', detail });
const warn = (name, detail) => findings.push({ name, status: 'warn', detail });

async function exists(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function fileSize(path) {
  try {
    const s = await stat(path);
    return s.size;
  } catch {
    return -1;
  }
}

// --- Required env vars ---
// These mirror deploy.yml and the documented setup in next/src/lib/auth.ts.
const REQUIRED_ENV = [
  { name: 'PUBLIC_SUPABASE_URL', required: true, why: 'cross-device save / itinerary sync' },
  { name: 'PUBLIC_SUPABASE_ANON_KEY', required: false, why: 'optional — auth gracefully degrades to localStorage if missing' },
  { name: 'PUBLIC_CONCIERGE_API_URL', required: true, why: 'concierge / Insider Search retrieval API' },
];

if (!opts.skipEnv) {
  for (const e of REQUIRED_ENV) {
    const v = process.env[e.name];
    if (!v || v.trim() === '') {
      if (e.required) fail(`env.${e.name}`, `missing — ${e.why}`);
      else warn(`env.${e.name}`, `missing — ${e.why}`);
    } else {
      ok(`env.${e.name}`, `set (${v.length} chars)`);
    }
  }
}

// --- Critical source files ---
const REQUIRED_SOURCES = [
  'next/package.json',
  'next/src/content.config.ts',
  'next/astro.config.mjs',
  '.github/workflows/deploy.yml',
  'ops/editorial-jobs.json',
];

for (const f of REQUIRED_SOURCES) {
  const p = join(REPO_ROOT, f);
  if (!(await exists(p))) {
    fail(`source.${f}`, 'missing');
  } else {
    ok(`source.${f}`);
  }
}

// --- Fallback stylesheet (2026-04-13 lesson) ---
// PI ships a stable, non-hashed fallback CSS so a hashed-CSS bundle miss
// doesn't render the site as raw HTML.
const FALLBACK_CSS = join(REPO_ROOT, 'assets', 'styles.css');
if (!(await exists(FALLBACK_CSS))) {
  fail('fallback-stylesheet', `${FALLBACK_CSS} missing — required since 2026-04-13 hashed-CSS lesson`);
} else {
  const sz = await fileSize(FALLBACK_CSS);
  if (sz < 1000) {
    warn('fallback-stylesheet', `${FALLBACK_CSS} is only ${sz} bytes — suspiciously small`);
  } else {
    ok('fallback-stylesheet', `${(sz / 1024).toFixed(1)} kB`);
  }
}

// --- Content collection sanity ---
// Bare-minimum check that the content tree exists. Full validation runs in
// `astro check`, but that is slow — this catches the dumb-mistake case.
const CONTENT_DIRS = [
  'next/src/content/venues',
  'next/src/content/articles',
  'next/src/content/places',
  'next/src/content/events',
  'next/src/content/quick-notes',
];
for (const d of CONTENT_DIRS) {
  const p = join(REPO_ROOT, d);
  if (!(await exists(p))) {
    fail(`content.${d}`, 'missing');
  } else {
    ok(`content.${d}`);
  }
}

// --- Build output (if not skipped) ---
if (!opts.skipBuild) {
  const BUILD_OUTPUTS = [
    'index.html',
    'sitemap-index.xml',
    '_astro',
  ];
  for (const f of BUILD_OUTPUTS) {
    const p = join(REPO_ROOT, f);
    if (!(await exists(p))) {
      warn(`build.${f}`, 'missing — build may not have run yet');
    } else {
      ok(`build.${f}`);
    }
  }

  // Detect raw-HTML fallback risk: if there's an index.html with no <link rel="stylesheet">,
  // we'd ship the raw fallback. The fallback CSS check above covers the absent-fallback case;
  // this check is for the "build didn't emit a stylesheet link at all" case.
  const indexPath = join(REPO_ROOT, 'index.html');
  if (await exists(indexPath)) {
    try {
      const html = await readFile(indexPath, 'utf8');
      const hasStylesheet = /<link\s+[^>]*rel=["']stylesheet["']/i.test(html);
      if (!hasStylesheet) {
        fail('build.index-stylesheet', 'index.html does not link any stylesheet — would render as raw HTML');
      } else {
        ok('build.index-stylesheet');
      }
    } catch (e) {
      warn('build.index-stylesheet', `could not read index.html: ${e.message}`);
    }
  }
}

// --- Repo artifacts that should not be deployed ---
// These are listed in surface-map.md as "internal-only" but currently sit at the
// deploy root because PI deploys from `main`. Flag them for awareness.
const SHOULD_NOT_DEPLOY = [
  'HANDOVER-CLAUDE.md',
  'build-live.sh',
  'build-v2.sh',
];
for (const f of SHOULD_NOT_DEPLOY) {
  const p = join(REPO_ROOT, f);
  if (await exists(p)) {
    warn(`leak.${f}`, 'present at repo root — will deploy publicly. Excluded recommendation in surface-map.md.');
  }
}

// --- Output ---

if (opts.json) {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  for (const f of findings) {
    const symbol = f.status === 'ok' ? '✓' : f.status === 'warn' ? '!' : '✗';
    console.log(`${symbol} ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
  }
  const fails = findings.filter((f) => f.status === 'fail').length;
  const warns = findings.filter((f) => f.status === 'warn').length;
  const oks = findings.filter((f) => f.status === 'ok').length;
  console.log('');
  console.log(`preflight: ${oks} ok, ${warns} warn, ${fails} fail`);
}

const failed = findings.some((f) => f.status === 'fail');
process.exit(failed ? 1 : 0);
