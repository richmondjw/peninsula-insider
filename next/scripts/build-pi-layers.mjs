#!/usr/bin/env node
/**
 * build-pi-layers.mjs - split PI's hat illustration into the parts that move.
 *
 * No new drawing: every pixel comes from the approved mark
 * (public/images/pi-concierge.svg). The art is flat colour, so it separates
 * cleanly by colour and position into:
 *   pi-layer-body  her shoulder
 *   pi-layer-hat   the hat, the underside of its brim, the chin strap, the strand at her cheek
 *   pi-layer-hair  the hair blowing out from under the brim
 * The cream disc behind her is drawn by CSS. Stacked in that order they
 * reproduce the mark; the chat moves them a little (wind in her hair, the hat
 * lifting, the figure leaving the disc while she looks something up).
 *
 * One patch is painted that the mark does not show: where the hair sits on the
 * underside of the brim, the hat layer continues the brim's own colour behind
 * it, so no gap opens when the hair moves.
 *
 * Run by hand when the artwork changes: node scripts/build-pi-layers.mjs
 * PI_LAYER_DEBUG=<dir> also writes a recomposed check image and false-colour map.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/images/pi');
mkdirSync(outDir, { recursive: true });
const SIZE = 1920;
const svg = readFileSync(join(root, 'public/images/pi-concierge.svg'), 'utf8').replace(/<path d="M0 0 C633\.6[^>]*\/>/, '');
const { data } = await sharp(Buffer.from(svg), { density: 96 }).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const CREAM = [244, 234, 211];
const HAT = [232, 165, 98];
const UNDER = [189, 99, 70];
const far = (i, c) => Math.hypot(data[i] - c[0], data[i + 1] - c[1], data[i + 2] - c[2]);
const inside = (poly, x, y) => {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
    const [xa, ya] = poly[a];
    const [xb, yb] = poly[b];
    if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
};
// Read off the rendered art on a 1920 grid.
const HAIR = [[455, 1125], [900, 985], [925, 1000], [870, 1150], [845, 1200], [900, 1300], [900, 1480], [830, 1700], [560, 1700], [370, 1570], [375, 1420], [440, 1385], [497, 1335], [455, 1300]];
const UNDER_BRIM = [[455, 1125], [900, 985], [925, 1000], [870, 1150], [845, 1200], [700, 1290], [490, 1345], [455, 1345]];
// Her shoulder: the sweep across the bottom right. The strap above it is a different colour.
const BODY = [[560, 1760], [840, 1700], [1080, 1545], [1260, 1400], [1350, 1335], [1380, 1310], [1440, 1280], [1570, 1300], [1700, 1420], [1920, 1700], [1920, 1920], [560, 1920]];

const layers = { body: Buffer.alloc(data.length), hat: Buffer.alloc(data.length), hair: Buffer.alloc(data.length) };
const put = (layer, i, rgb, alpha) => { layer[i] = rgb[0]; layer[i + 1] = rgb[1]; layer[i + 2] = rgb[2]; layer[i + 3] = alpha; };
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const i = (y * SIZE + x) * 4;
    const alpha = data[i + 3];
    if (!alpha || far(i, CREAM) < 16) continue;
    const own = [data[i], data[i + 1], data[i + 2]];
    // Up under the brim the hair meets the hat and its underside; lower down everything in the outline is hair.
    if (inside(HAIR, x, y) && !(y < 1215 && far(i, HAT) < 30) && !(y < 1345 && far(i, UNDER) < 12)) {
      put(layers.hair, i, own, alpha);
      if (inside(UNDER_BRIM, x, y)) put(layers.hat, i, UNDER, 255);
    } else if (inside(BODY, x, y) && far(i, HAT) > 34) put(layers.body, i, own, alpha);
    else put(layers.hat, i, own, alpha);
  }
}

const png = (buffer) => sharp(buffer, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
for (const [name, buffer] of Object.entries(layers)) {
  const image = await png(buffer);
  for (const px of [160, 320, 640]) await sharp(image).resize(px, px).webp({ quality: 88, alphaQuality: 100 }).toFile(join(outDir, `pi-layer-${name}-${px}.webp`));
}

const debug = process.env.PI_LAYER_DEBUG;
if (debug) {
  const disc = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="960" cy="960" r="854" fill="#F4EAD3"/></svg>`);
  const stack = async (list) => sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: '#ffffff' } }).composite(list).png().toBuffer();
  const [body, hat, hair] = await Promise.all([png(layers.body), png(layers.hat), png(layers.hair)]);
  await sharp(await stack([{ input: disc }, { input: body }, { input: hat }, { input: hair }])).resize(800).toFile(join(debug, 'recomposed.png'));
  await sharp(await stack([{ input: disc }, { input: body }, { input: hat }])).resize(800).toFile(join(debug, 'no-hair.png'));
  await sharp(await stack([{ input: hair }, { input: body }])).resize(800).toFile(join(debug, 'hair-body.png'));
}
console.log('wrote layers to', outDir);
