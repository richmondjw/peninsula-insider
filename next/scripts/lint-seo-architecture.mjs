import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const loserPaths = new Set([
  '/eat/dog-friendly/',
  '/stay/dog-friendly/',
  '/wine/dog-friendly/',
  '/explore/dog-friendly/',
  '/stay/couples/',
  '/explore/free/',
  '/explore/plans/',
  '/places/',
]);

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'dev') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

async function routeExists(pathname) {
  const clean = pathname.replace(/^\//, '');
  if (!clean) return true;
  const direct = join(dist.pathname, clean);
  try {
    if ((await stat(direct)).isFile()) return true;
  } catch {}
  try {
    return (await stat(join(direct.replace(/\/$/, ''), 'index.html'))).isFile();
  } catch {
    return false;
  }
}

const failures = [];
for (const file of await htmlFiles(dist.pathname)) {
  const html = await readFile(file, 'utf8');
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
  for (const raw of hrefs) {
    const pathname = raw.split(/[?#]/, 1)[0];
    if (/^\/(?:_astro|assets|images|fonts)\//.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) continue;
    if (pathname !== '/' && !pathname.endsWith('/')) failures.push(`${file}: non-trailing-slash ${raw}`);
    if ([...loserPaths].some((loser) => pathname === loser || (loser === '/places/' && pathname.startsWith(loser)))) {
      failures.push(`${file}: consolidation loser ${raw}`);
    }
    if (!(await routeExists(pathname))) failures.push(`${file}: broken internal link ${raw}`);
  }
}

if (failures.length) {
  console.error(`SEO architecture lint failed (${failures.length} finding(s)):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('SEO architecture lint passed: no broken, non-canonical, or non-trailing-slash public links.');
