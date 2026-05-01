#!/usr/bin/env node
/**
 * screenshot-each.mjs — capture each .pi-page sheet as its own PNG.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const NEXT_DIR   = path.resolve(__dirname, '..');
const DIST_DIR   = path.join(NEXT_DIR, 'dist');
const OUT_DIR    = path.join(NEXT_DIR, 'tmp-preview');

const PORT = 4329;
const HOST = '127.0.0.1';

const TARGETS = [
  { route: '/partners/founders-prospectus/', name: 'prospectus' },
  { route: '/partners/advertising-kit/',     name: 'kit' },
];

const MIME = {
  '.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript',
  '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg',
  '.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon',
};

function serve(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let p = path.join(DIST_DIR, url);
  if (p.endsWith(path.sep) || p.endsWith('/')) p = path.join(p, 'index.html');
  if (!path.extname(p) && fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    p = path.join(p, 'index.html');
  }
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(p).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = http.createServer(serve);
  await new Promise((r, j) => server.listen(PORT, HOST, r).on('error', j));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const t of TARGETS) {
    const page = await browser.newPage();
    // 794 x 1123 = A4 in CSS pixels at 96dpi, but we want tighter dpi: scale by 2
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    const url = `http://${HOST}:${PORT}${t.route}`;
    console.log(`▸ ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 600));

    // Get the position of each .pi-page
    const boxes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.pi-page')).map((el, i) => {
        const r = el.getBoundingClientRect();
        return { i, x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
      });
    });

    for (const b of boxes) {
      const num = String(b.i + 1).padStart(2, '0');
      const file = path.join(OUT_DIR, `${t.name}-${num}.png`);
      await page.screenshot({
        path: file,
        clip: { x: b.x, y: b.y, width: b.w, height: b.h },
      });
      console.log(`  ✓ ${path.basename(file)}`);
    }
    await page.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));
}

main().catch((err) => { console.error(err); process.exit(1); });
