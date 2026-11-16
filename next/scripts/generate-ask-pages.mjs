#!/usr/bin/env node
/**
 * Writes dist/ask/pages.json: every public path from the built sitemap.
 * /ask checks each recommendation against it, so an answer can only link
 * to a live page (a stale path is corrected by slug, otherwise dropped).
 *
 * Usage: node scripts/generate-ask-pages.mjs [--dist dist]
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const i = process.argv.indexOf('--dist');
const dist = i > -1 ? process.argv[i + 1] : 'dist';

const files = (await readdir(dist)).filter((f) => /^sitemap.*\.xml$/.test(f));
const paths = new Set();
for (const f of files) {
  const xml = await readFile(join(dist, f), 'utf8');
  for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (loc.endsWith('.xml')) continue;
    try {
      const p = new URL(loc).pathname;
      paths.add(p.endsWith('/') ? p : `${p}/`);
    } catch { /* not a URL */ }
  }
}
if (paths.size < 100) {
  console.error(`generate-ask-pages: only ${paths.size} paths found in ${files.join(', ') || 'no sitemap'}; refusing to write a near-empty list.`);
  process.exit(1);
}
await mkdir(join(dist, 'ask'), { recursive: true });
await writeFile(join(dist, 'ask', 'pages.json'), JSON.stringify([...paths].sort()));
console.log(`generate-ask-pages: ${paths.size} public paths -> ${dist}/ask/pages.json`);
