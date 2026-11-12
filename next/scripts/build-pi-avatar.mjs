#!/usr/bin/env node
/**
 * build-pi-avatar.mjs - rasterise PI's hat illustration into small WebP files.
 *
 * The source (public/images/pi-concierge.svg) is a 660 KB traced vector with an
 * opaque square background. Pages only need small sizes, so this writes:
 *   public/images/pi/pi-avatar-{48,96,160}.webp  round crop on her cream disc (chat byline, pill)
 *   public/images/pi/pi-portrait-{320,640}.webp   full art, transparent background (greeting)
 *
 * Run by hand when the artwork changes: node scripts/build-pi-avatar.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public/images/pi-concierge.svg');
const outDir = join(root, 'public/images/pi');
mkdirSync(outDir, { recursive: true });

// Drop the first path: the full-canvas #FCFCFC background rectangle.
const svg = readFileSync(src, 'utf8').replace(/<path d="M0 0 C633\.6[^>]*\/>/, '');
const SIZE = 1920;
const base = await sharp(Buffer.from(svg), { density: 96 }).resize(SIZE, SIZE).png().toBuffer();

// Round crop, as a fraction of the 1920 canvas. Tuned by eye on the rendered art.
const CROP = { cx: 0.5, cy: 0.5, r: 0.445 };
const CREAM = '#F3E7D3';

async function avatar(px) {
  const r = Math.round(CROP.r * SIZE);
  const left = Math.round(CROP.cx * SIZE) - r;
  const top = Math.round(CROP.cy * SIZE) - r;
  const d = r * 2;
  const disc = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`);
  const cropped = await sharp(base).extract({ left, top, width: d, height: d }).toBuffer();
  const onCream = await sharp({ create: { width: d, height: d, channels: 4, background: CREAM } })
    .composite([{ input: cropped }]).png().toBuffer();
  const round = await sharp(onCream).composite([{ input: disc, blend: 'dest-in' }]).png().toBuffer();
  await sharp(round)
    .resize(px, px)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(outDir, `pi-avatar-${px}.webp`));
}

async function portrait(px) {
  await sharp(base).resize(px, px).webp({ quality: 88, alphaQuality: 100 })
    .toFile(join(outDir, `pi-portrait-${px}.webp`));
}

for (const px of [48, 96, 160]) await avatar(px);
for (const px of [320, 640]) await portrait(px);
console.log('wrote', outDir);
