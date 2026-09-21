// Shared primitives for the Peninsula Insider SEO/GEO engine.
// No third-party dependencies: this module runs on stock Node 22.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINE_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const REPO_ROOT = path.resolve(ENGINE_DIR, '..', '..');
export const STATE_DIR = path.join(ENGINE_DIR, 'state');
export const RUNS_DIR = path.join(ENGINE_DIR, '.runs');

export const ORIGIN = 'https://peninsulainsider.com.au';

/** Directories in the served tree that are not public content surfaces. */
// Internal trees that are not part of the served site at all. Robots-disallowed
// but real surfaces (/account/, /access/, /spa/) are walked so that links to
// them resolve; page typing marks them as utility rather than content.
export const NON_SURFACE_DIRS = new Set([
  'next', 'docs', 'reports', 'engine', 'ops', 'admin',
  'node_modules', '.git', '.github', '.claude', '.impeccable',
  'supabase', 'tools', 'seo', 'deliverables', '_astro', 'pagefind', 'assets',
  'images', 'downloads',
]);

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

/** Stable hash of an object, insensitive to key ordering. */
export function stableHash(value) {
  return sha256(stableStringify(value));
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Atomic write: never leave a half-written state file behind on a crash. */
export function writeJson(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
  return file;
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  return file;
}

export function clamp(n, lo = 0, hi = 1) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function round(n, places = 3) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Melbourne-local calendar parts, used for scheduling decisions and stamps. */
export function melbourneNow(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: parts.weekday, // Sun, Mon, ...
    iso: date.toISOString(),
  };
}

export function isoDaysAgo(days, from = new Date()) {
  return new Date(from.getTime() - days * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(aIso, bIso) {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function slugToTitle(slug) {
  return String(slug).split('-').filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Walk the served tree and yield every public page (directory index.html). */
export function* walkPages(root = REPO_ROOT) {
  const stack = [{ dir: root, rel: '' }];
  while (stack.length) {
    const { dir, rel } = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (rel === '' && NON_SURFACE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        stack.push({ dir: path.join(dir, entry.name), rel: rel ? `${rel}/${entry.name}` : entry.name });
      } else if (entry.name === 'index.html') {
        yield { file: path.join(dir, entry.name), urlPath: rel ? `/${rel}/` : '/' };
      }
    }
  }
}

export class Logger {
  constructor(sink = []) {
    this.lines = sink;
  }

  log(level, message, detail) {
    const line = { ts: new Date().toISOString(), level, message, ...(detail ? { detail } : {}) };
    this.lines.push(line);
    const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN ' : 'INFO ';
    process.stderr.write(`${prefix} ${message}${detail ? ` ${JSON.stringify(detail)}` : ''}\n`);
    return line;
  }

  info(m, d) { return this.log('info', m, d); }
  warn(m, d) { return this.log('warn', m, d); }
  error(m, d) { return this.log('error', m, d); }
}
