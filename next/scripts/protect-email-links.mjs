import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Cloudflare's documented per-address exemption keeps native mailto links intact
// without changing zone settings or relying on its deferred email decoder.
export function protectEmailLinks(html) {
  const clean = html.replace(/<!--\/?email_off-->/g, '');
  return clean.replace(/<a\b[^>]*\bhref\s*=\s*(["'])mailto:[\s\S]*?\1[^>]*>[\s\S]*?<\/a>/gi,
    (link) => `<!--email_off-->${link}<!--/email_off-->`);
}

async function protectDirectory(dir) {
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) count += await protectDirectory(file);
    else if (entry.name.endsWith('.html')) {
      const original = await readFile(file, 'utf8');
      const protectedHtml = protectEmailLinks(original);
      if (original !== protectedHtml) { await writeFile(file, protectedHtml); count++; }
    }
  }
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Native email links protected on ${await protectDirectory(resolve('dist'))} pages.`);
}
