import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, sep } from 'node:path';

// Astro moves server modules into dist/.prerender/chunks. Find the project's
// public directory from either the source or bundled module, without cwd assumptions.
let directory = fileURLToPath(new URL('.', import.meta.url));
let publicRoot;
while (true) {
  const candidate = resolve(directory, 'public');
  if (existsSync(resolve(candidate, 'images'))) { publicRoot = candidate; break; }
  const parent = dirname(directory);
  if (parent === directory) throw new Error('Journal image policy: public image directory not found');
  directory = parent;
}
export function imageAvailable(src, root = publicRoot) {
  if (typeof src !== 'string' || !src.trim()) return false;
  if (/^https:\/\//i.test(src)) return true; // Browser recovery handles remote failures.
  if (!src.startsWith('/') || src.startsWith('//')) return false;
  let pathname;
  try { pathname = decodeURIComponent(src.split(/[?#]/)[0]); } catch { return false; }
  const absolute = resolve(root, '.' + pathname);
  return absolute.startsWith(resolve(root) + sep) && existsSync(absolute);
}
