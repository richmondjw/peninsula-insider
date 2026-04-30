#!/usr/bin/env node
/**
 * render-pdfs.mjs
 *
 * Renders the two printable Astro pages to PDF files in next/public/downloads/.
 *
 * Pages rendered:
 *   /partners/founders-prospectus/  ->  peninsula-insider-founders-prospectus.pdf
 *   /partners/advertising-kit/      ->  peninsula-insider-advertising-kit.pdf
 *
 * Process:
 *   1. Boot a tiny static file server on dist/.
 *   2. Launch headless Chromium via puppeteer.
 *   3. Navigate to each page, wait for fonts and images, render to PDF.
 *   4. Tear down.
 *
 * Run:    node scripts/render-pdfs.mjs
 * Or:     npm run pdfs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const NEXT_DIR   = path.resolve(__dirname, '..');
const DIST_DIR   = path.join(NEXT_DIR, 'dist');
const OUT_DIR    = path.join(NEXT_DIR, 'public', 'downloads');

const PORT = 4329;
const HOST = '127.0.0.1';

const TARGETS = [
  {
    label: 'Founders\' Prospectus',
    route: '/partners/founders-prospectus/',
    out:   'peninsula-insider-founders-prospectus.pdf',
  },
  {
    label: 'Partnership Kit',
    route: '/partners/advertising-kit/',
    out:   'peninsula-insider-advertising-kit.pdf',
  },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveFile(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let target = path.join(DIST_DIR, url);

  // Trailing-slash directories  ->  index.html
  if (target.endsWith(path.sep) || target.endsWith('/')) {
    target = path.join(target, 'index.html');
  }

  // No extension  ->  try directory, then .html
  if (!path.extname(target)) {
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    } else if (fs.existsSync(target + '.html')) {
      target = target + '.html';
    } else if (fs.existsSync(path.join(target, 'index.html'))) {
      target = path.join(target, 'index.html');
    }
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return send(res, 404, `Not found: ${url}`);
  }

  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(target).pipe(res);
}

async function ensureDistExists() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`\n✗ dist/ not found at ${DIST_DIR}`);
    console.error(`  Run \`npm run build\` first.\n`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(serveFile);
    server.on('error', reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function renderTarget(browser, target) {
  const page = await browser.newPage();
  await page.emulateMediaType('print');

  const url = `http://${HOST}:${PORT}${target.route}`;
  console.log(`\n  → Loading ${url}`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });

  // Allow the document fonts to settle. Cormorant Garamond + Outfit are
  // streamed from Google Fonts; we want them painted before PDF capture.
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));

  const outPath = path.join(OUT_DIR, target.out);
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    displayHeaderFooter: false,
  });

  await page.close();

  const bytes = fs.statSync(outPath).size;
  const kb = (bytes / 1024).toFixed(1);
  console.log(`  ✓ ${target.label} → public/downloads/${target.out}  (${kb} KB)`);
}

async function main() {
  await ensureDistExists();

  console.log(`\n▸ Booting static server  http://${HOST}:${PORT}/  (root: dist/)`);
  const server = await startServer();

  console.log(`▸ Launching headless Chromium`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const target of TARGETS) {
      await renderTarget(browser, target);
    }
    console.log(`\n✓ Both PDFs rendered to: ${path.relative(NEXT_DIR, OUT_DIR)}\n`);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

main().catch((err) => {
  console.error('\n✗ render-pdfs.mjs failed:', err);
  process.exit(1);
});
