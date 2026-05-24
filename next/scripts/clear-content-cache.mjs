/**
 * clear-content-cache.mjs
 * Runs before every Astro build (prebuild hook) to clear Astro's content
 * layer cache. This prevents Vercel's build cache from serving stale
 * processed content when source JSON files have been updated.
 *
 * Targets both default (.astro/) and custom (.astro-build-cache/) cache dirs.
 */
import { rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const cacheDirs = [
  join(root, 'node_modules', '.astro'),
  join(root, '.astro-build-cache'),
  join(root, '.astro'),
];

for (const dir of cacheDirs) {
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log(`[prebuild] Cleared content cache: ${dir}`);
  } catch {
    // Directory doesn't exist — no action needed
  }
}

console.log('[prebuild] Content layer cache cleared. Astro will rebuild from source.');
