import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const payloadPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'examples', 'peninsula-insider-week-of-2026-04-20.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

const brandPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(__dirname, 'brands', `${payload.brand}.json`);
const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));

const captionSourcePath = payload.captionSource ? path.join(repoRoot, payload.captionSource) : null;
const copyPackage = captionSourcePath && fs.existsSync(captionSourcePath)
  ? parseCopyPackage(fs.readFileSync(captionSourcePath, 'utf8'))
  : {};

const outputRoot = path.join(repoRoot, 'social', `week-of-${payload.weekStart}`);
const mastersRoot = path.join(outputRoot, 'masters');
const exportsRoot = path.join(outputRoot, 'exports');
const sourceImagesRoot = path.join(outputRoot, 'source-images');
const publishingRoot = path.join(outputRoot, 'publishing');

const sizes = {
  '4x5': { width: 1080, height: 1350 },
  '1x1': { width: 1080, height: 1080 },
  '191x1': { width: 1200, height: 628 },
  '9x16': { width: 1080, height: 1920 }
};

const platformMeta = {
  ig: { label: 'Instagram', short: 'IG', accent: brand.colors.pinot },
  fb: { label: 'Facebook', short: 'FB', accent: brand.colors.olive },
  li: { label: 'LinkedIn', short: 'LI', accent: brand.colors.fog }
};
const platformOrder = ['ig', 'fb', 'li'];
const blockers = [
  'Tuesday and Friday would both improve with a stronger shoulder-season Sorrento streetscape or heritage facade image to replace the softer harbour hero if sourced later.',
  'Wednesday lunch frame currently uses a place-led image rather than a true table-side lunch still, so that slot is production-ready but still upgradeable.',
  'Saturday is intentionally atmosphere-led but would benefit from a fresher same-week observational still if the newsroom begins collecting live weekend imagery.'
];
const imageCache = new Map();

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return String(value).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function buildFilename(day, asset) {
  return `pi-social-${payload.weekStart}-${day.day}-${day.concept}-${asset.platform}-${asset.ratio}-${asset.assetKey}-${payload.version}.svg`;
}

function preserveAspectRatio(imagePosition = 'center') {
  if (imagePosition === 'top') return 'xMidYMin slice';
  if (imagePosition === 'bottom') return 'xMidYMax slice';
  return 'xMidYMid slice';
}

function imageHrefFor(assetImage) {
  const absolute = path.join(repoRoot, assetImage);
  if (imageCache.has(absolute)) return imageCache.get(absolute);
  const ext = path.extname(absolute).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/webp';
  const data = `data:${mime};base64,${fs.readFileSync(absolute).toString('base64')}`;
  imageCache.set(absolute, data);
  return data;
}

function estimateMaxCharacters(maxWidth, fontSize) {
  return Math.max(10, Math.floor(maxWidth / (fontSize * 0.56)));
}

function wrapText(text, maxWidth, fontSize, maxLines = 4) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = '';
  const maxChars = estimateMaxCharacters(maxWidth, fontSize);
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) current = candidate;
    else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const fullText = words.join(' ');
  const producedText = lines.join(' ');
  if (lines.length === maxLines && producedText.length < fullText.length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, '')}…`;
  return lines;
}

function fitText(text, maxWidth, startSize, minSize, maxLines) {
  let size = startSize;
  let lines = wrapText(text, maxWidth, size, maxLines);
  while (size > minSize && lines.length === maxLines && lines.at(-1)?.endsWith('…')) {
    size -= 2;
    lines = wrapText(text, maxWidth, size, maxLines);
  }
  return { fontSize: size, lines };
}

function measureText({ text, width, startSize, minSize, maxLines = 4, lineHeightFactor = 1.15 }) {
  const fitted = fitText(text, width, startSize, minSize ?? Math.max(14, startSize - 20), maxLines);
  const lineHeight = Math.round(fitted.fontSize * lineHeightFactor * 100) / 100;
  return {
    fontSize: fitted.fontSize,
    lines: fitted.lines,
    lineHeight,
    height: fitted.lines.length ? (fitted.lines.length - 1) * lineHeight + fitted.fontSize : 0
  };
}

function renderMeasuredText({ x, y, fontFamily, fill, weight = 500, letterSpacing = 0, measure }) {
  const tspans = measure.lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : measure.lineHeight}">${escapeXml(line)}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="${escapeXml(fontFamily)}" font-size="${measure.fontSize}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">${tspans}</text>`;
}

function accentFor(template) {
  if (template === 'recommendation-hero') return brand.colors.olive;
  if (template === 'utility-sequence') return brand.colors.gold ?? brand.colors.pinot;
  if (template === 'editorial-comparison') return brand.colors.fog;
  if (template === 'atmosphere-single') return brand.colors.pinotDeep ?? brand.colors.pinot;
  return brand.colors.pinot;
}

function defs(id, extra = '') {
  return `<defs>
    <linearGradient id="${id}-paper" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${brand.colors.paper}" />
      <stop offset="100%" stop-color="${brand.colors.cream}" />
    </linearGradient>
    <radialGradient id="${id}-wash" cx="18%" cy="5%" r="94%">
      <stop offset="0%" stop-color="${brand.colors.clay}" stop-opacity="0.16" />
      <stop offset="28%" stop-color="${brand.colors.pinot}" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="${id}-overlay-bottom" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.02" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.18" />
    </linearGradient>
    <linearGradient id="${id}-overlay-side" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.16" />
      <stop offset="42%" stop-color="#000000" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    ${extra}
  </defs>`;
}

function paperBg(id, width, height) {
  return `<rect width="${width}" height="${height}" fill="url(#${id}-paper)" /><rect width="${width}" height="${height}" fill="url(#${id}-wash)" />`;
}

function metaRow({ x, y, width, left, right }) {
  return `<g>
    <text x="${x}" y="${y}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="600" letter-spacing="2.8" fill="${brand.colors.stone}">${escapeXml(left.toUpperCase())}</text>
    <text x="${x + width}" y="${y}" text-anchor="end" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="500" letter-spacing="2.2" fill="${brand.colors.stone}">${escapeXml(right.toUpperCase())}</text>
    <line x1="${x}" y1="${y + 18}" x2="${x + width}" y2="${y + 18}" stroke="rgba(31,29,26,0.12)" stroke-width="1" />
  </g>`;
}

function kicker({ x, y, label, accent }) {
  const safe = String(label ?? '').trim();
  if (!safe) return '';
  return `<g>
    <rect x="${x}" y="${y - 11}" width="56" height="3" rx="1.5" fill="${accent}" />
    <text x="${x}" y="${y + 16}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="13" font-weight="600" letter-spacing="2.2" fill="${brand.colors.ink}">${escapeXml(safe.toUpperCase())}</text>
  </g>`;
}

function imageBlock({ id, href, x, y, width, height, radius, imagePosition = 'center', overlay = 'bottom' }) {
  const clipId = `${id}-${slugify(`${x}-${y}-${width}-${height}`)}-clip`;
  const overlayFill = overlay === 'side'
    ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${id}-overlay-side)" />`
    : overlay === 'none'
      ? ''
      : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${id}-overlay-bottom)" />`;
  return {
    defs: `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" /></clipPath>`,
    markup: `<g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${brand.colors.sand}" />
      <g clip-path="url(#${clipId})">
        <image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspectRatio(imagePosition)}" />
        ${overlayFill}
      </g>
    </g>`
  };
}

function photoCard(day, asset, dims, context, opts = {}) {
  const id = slugify(context.filename.replace('.svg', ''));
  const accent = opts.accent ?? accentFor(asset.template);
  const href = imageHrefFor(asset.image);
  const rightMeta = opts.metaRight ?? `${day.label} · ${titleCase(day.concept)}`;
  const titleStart = opts.titleStart ?? (dims.width > dims.height ? 52 : 80);
  const titleMin = opts.titleMin ?? (dims.width > dims.height ? 32 : 48);
  const titleLines = opts.titleLines ?? (dims.width > dims.height ? 4 : 3);
  const deckStart = opts.deckStart ?? (dims.width > dims.height ? 22 : 24);
  const deckMin = opts.deckMin ?? 18;
  const deckLines = opts.deckLines ?? 4;

  if (dims.width > dims.height) {
    const outer = 56;
    const gap = 44;
    const imageWidth = Math.round(dims.width * 0.46);
    const imageHeight = dims.height - outer * 2 - 26;
    const imageX = dims.width - outer - imageWidth;
    const imageY = outer + 26;
    const textX = outer;
    const textWidth = imageX - textX - gap;
    const title = measureText({ text: asset.title, width: textWidth, startSize: titleStart, minSize: titleMin, maxLines: titleLines, lineHeightFactor: 1.03 });
    const deck = measureText({ text: asset.deck, width: Math.round(textWidth * 0.92), startSize: deckStart, minSize: deckMin, maxLines: deckLines, lineHeightFactor: 1.44 });
    const total = 60 + title.height + 26 + deck.height;
    const kickY = Math.max(imageY + 48, outer + Math.round((dims.height - outer * 2 - total) / 2) + 12);
    const titleY = kickY + 78;
    const deckY = titleY + title.height + 26;
    const image = imageBlock({ id, href, x: imageX, y: imageY, width: imageWidth, height: imageHeight, radius: 28, imagePosition: asset.imagePosition, overlay: opts.overlay ?? 'none' });
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id, image.defs)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: dims.width - outer * 2, left: brand.name, right: rightMeta })}
  ${image.markup}
  ${kicker({ x: textX, y: kickY, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: textX, y: titleY, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: textX, y: deckY, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
</svg>`;
  }

  if (opts.portraitMode === 'immersive-cover') {
    const safe = 68;
    const title = measureText({ text: asset.title, width: 760, startSize: 104, minSize: 64, maxLines: 3, lineHeightFactor: 0.98 });
    const deck = measureText({ text: asset.deck, width: 620, startSize: 31, minSize: 22, maxLines: 4, lineHeightFactor: 1.34 });
    const image = imageBlock({ id, href, x: 0, y: 0, width: dims.width, height: dims.height, radius: 0, imagePosition: asset.imagePosition, overlay: opts.overlay ?? 'bottom' });
    const labelY = 118;
    const kickY = dims.height - 330 - title.height - deck.height;
    const titleY = kickY + 74;
    const deckY = titleY + title.height + 24;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id, image.defs)}
  ${image.markup}
  <rect width="${dims.width}" height="${dims.height}" fill="rgba(20,18,16,0.14)" />
  <line x1="${safe}" y1="82" x2="${dims.width - safe}" y2="82" stroke="rgba(255,251,248,0.36)" stroke-width="1" />
  <text x="${safe}" y="${labelY}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="600" letter-spacing="2.8" fill="rgba(253,251,248,0.82)">${escapeXml(brand.name.toUpperCase())}</text>
  <text x="${dims.width - safe}" y="${labelY}" text-anchor="end" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="500" letter-spacing="2.2" fill="rgba(253,251,248,0.74)">${escapeXml(rightMeta.toUpperCase())}</text>
  <rect x="${safe}" y="${kickY - 10}" width="58" height="3" rx="1.5" fill="${accent}" />
  <text x="${safe}" y="${kickY + 18}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="13" font-weight="600" letter-spacing="2.3" fill="rgba(253,251,248,0.90)">${escapeXml(String(asset.kicker ?? '').toUpperCase())}</text>
  ${renderMeasuredText({ x: safe, y: titleY, fontFamily: brand.fonts.display, fill: brand.colors.white, weight: 700, measure: title })}
  ${renderMeasuredText({ x: safe, y: deckY, fontFamily: brand.fonts.body, fill: 'rgba(253,251,248,0.86)', weight: 400, measure: deck })}
</svg>`;
  }

  const outer = 72;
  const contentWidth = dims.width - outer * 2;
  const imageY = outer + 34;
  const imageHeight = Math.round(dims.height * 0.56);
  const kickY = imageY + imageHeight + 52;
  const title = measureText({ text: asset.title, width: Math.round(contentWidth * 0.84), startSize: titleStart, minSize: titleMin, maxLines: titleLines, lineHeightFactor: 1.01 });
  const deck = measureText({ text: asset.deck, width: Math.round(contentWidth * 0.72), startSize: deckStart, minSize: deckMin, maxLines: deckLines, lineHeightFactor: 1.48 });
  const titleY = kickY + 82;
  const deckY = titleY + title.height + 24;
  const image = imageBlock({ id, href, x: outer, y: imageY, width: contentWidth, height: imageHeight, radius: 30, imagePosition: asset.imagePosition, overlay: opts.overlay ?? 'bottom' });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id, image.defs)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: contentWidth, left: brand.name, right: rightMeta })}
  ${image.markup}
  ${kicker({ x: outer, y: kickY, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: outer, y: titleY, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: outer, y: deckY, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
</svg>`;
}

function renderSummaryItems({ x, y, width, height, items, accent, columns = false }) {
  if (columns) {
    const gap = 20;
    const columnWidth = Math.floor((width - gap * (items.length - 1)) / items.length);
    return items.map((item, index) => {
      const itemX = x + index * (columnWidth + gap);
      const fill = index === 1 ? 'rgba(228,218,206,0.74)' : 'rgba(228,218,206,0.56)';
      const label = measureText({ text: item.label, width: columnWidth - 44, startSize: 28, minSize: 20, maxLines: 3, lineHeightFactor: 1.05 });
      const note = item.note ? measureText({ text: item.note, width: columnWidth - 44, startSize: 16, minSize: 14, maxLines: 4, lineHeightFactor: 1.44 }) : null;
      return `<g>
        <rect x="${itemX}" y="${y}" width="${columnWidth}" height="${height}" rx="18" fill="${fill}" />
        <rect x="${itemX + 24}" y="${y + 20}" width="42" height="3" rx="1.5" fill="${index === 1 ? brand.colors.pinot : accent}" />
        <text x="${itemX + 24}" y="${y + 54}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="600" letter-spacing="2" fill="${brand.colors.stone}">${escapeXml(String(item.marker).toUpperCase())}</text>
        ${renderMeasuredText({ x: itemX + 24, y: y + 92, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: label })}
        ${note ? renderMeasuredText({ x: itemX + 24, y: y + 112 + label.height, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: note }) : ''}
      </g>`;
    }).join('');
  }

  const gap = 18;
  const itemHeight = Math.floor((height - gap * (items.length - 1)) / items.length);
  return items.map((item, index) => {
    const itemY = y + index * (itemHeight + gap);
    const fill = index === 1 ? 'rgba(228,218,206,0.74)' : 'rgba(228,218,206,0.56)';
    const laneMarker = String(item.marker ?? '').toLowerCase().startsWith('lane ');
    const labelWidth = laneMarker ? width - 60 : item.note ? width - 170 : width - 132;
    const label = measureText({ text: item.label, width: labelWidth, startSize: item.note ? 34 : 38, minSize: 22, maxLines: item.note ? 2 : 3, lineHeightFactor: 1.05 });
    const note = item.note ? measureText({ text: item.note, width: labelWidth, startSize: 19, minSize: 15, maxLines: 3, lineHeightFactor: 1.42 }) : null;
    const textX = laneMarker ? x + 30 : x + 124;
    const titleY = laneMarker ? itemY + 92 : itemY + 70;
    const noteY = laneMarker ? itemY + 110 + label.height : itemY + 92 + label.height;
    const marker = laneMarker
      ? `<text x="${x + 30}" y="${itemY + 54}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="12" font-weight="600" letter-spacing="2" fill="${brand.colors.stone}">${escapeXml(String(item.marker).toUpperCase())}</text>`
      : `<text x="${x + 30}" y="${itemY + 76}" font-family="${escapeXml(brand.fonts.display)}" font-size="34" font-weight="700" fill="${accent}">${escapeXml(item.marker)}</text>`;
    return `<g>
      <rect x="${x}" y="${itemY}" width="${width}" height="${itemHeight}" rx="18" fill="${fill}" />
      <rect x="${x + 24}" y="${itemY + 26}" width="42" height="3" rx="1.5" fill="${index === 1 ? brand.colors.pinot : accent}" />
      ${marker}
      ${renderMeasuredText({ x: textX, y: titleY, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: label })}
      ${note ? renderMeasuredText({ x: textX, y: noteY, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: note }) : ''}
    </g>`;
  }).join('');
}

function sequenceSummary(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const accent = accentFor(asset.template);
  const items = (asset.steps ?? []).map((label, index) => ({ marker: String(index + 1).padStart(2, '0'), label, note: '' }));
  if (dims.width > dims.height) {
    const outer = 56;
    const title = measureText({ text: asset.title, width: 330, startSize: 50, minSize: 34, maxLines: 4, lineHeightFactor: 1.03 });
    const deck = measureText({ text: asset.deck, width: 320, startSize: 20, minSize: 16, maxLines: 4, lineHeightFactor: 1.42 });
    const cardsX = outer + 404;
    const cardsWidth = dims.width - cardsX - outer;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: dims.width - outer * 2, left: brand.name, right: `${day.label} · saveable route` })}
  ${kicker({ x: outer, y: 176, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: outer, y: 246, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: outer, y: 278 + title.height, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
  ${renderSummaryItems({ x: cardsX, y: 148, width: cardsWidth, height: 320, items, accent, columns: true })}
</svg>`;
  }
  const outer = 72;
  const title = measureText({ text: asset.title, width: 780, startSize: 72, minSize: 50, maxLines: 3, lineHeightFactor: 1.02 });
  const deck = measureText({ text: asset.deck, width: 720, startSize: 26, minSize: 18, maxLines: 4, lineHeightFactor: 1.46 });
  const stackY = 438 + title.height + deck.height;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: dims.width - outer * 2, left: brand.name, right: `${day.label} · saveable route` })}
  ${kicker({ x: outer, y: 162, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: outer, y: 240, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: outer, y: 272 + title.height, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
  ${renderSummaryItems({ x: outer, y: stackY, width: dims.width - outer * 2, height: dims.height - outer - stackY, items, accent })}
</svg>`;
}

function comparisonSummary(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const accent = accentFor(asset.template);
  const items = (asset.lanes ?? []).map((lane, index) => ({
    marker: `Lane ${index + 1}`,
    label: typeof lane === 'string' ? lane : lane.label,
    note: typeof lane === 'string' ? '' : lane.note ?? ''
  }));
  if (dims.width > dims.height) {
    const outer = 56;
    const title = measureText({ text: asset.title, width: 360, startSize: 48, minSize: 34, maxLines: 4, lineHeightFactor: 1.03 });
    const deck = measureText({ text: asset.deck, width: 332, startSize: 20, minSize: 16, maxLines: 4, lineHeightFactor: 1.42 });
    const cardsX = outer + 430;
    const cardsWidth = dims.width - cardsX - outer;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: dims.width - outer * 2, left: brand.name, right: `${day.label} · choose your lane` })}
  ${kicker({ x: outer, y: 174, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: outer, y: 244, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: outer, y: 276 + title.height, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
  ${renderSummaryItems({ x: cardsX, y: 148, width: cardsWidth, height: 334, items, accent, columns: true })}
</svg>`;
  }
  const outer = 72;
  const title = measureText({ text: asset.title, width: 796, startSize: 70, minSize: 50, maxLines: 3, lineHeightFactor: 1.02 });
  const deck = measureText({ text: asset.deck, width: 720, startSize: 26, minSize: 18, maxLines: 4, lineHeightFactor: 1.46 });
  const stackY = 438 + title.height + deck.height;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${defs(id)}
  ${paperBg(id, dims.width, dims.height)}
  ${metaRow({ x: outer, y: outer, width: dims.width - outer * 2, left: brand.name, right: `${day.label} · choose your lane` })}
  ${kicker({ x: outer, y: 162, label: asset.kicker, accent })}
  ${renderMeasuredText({ x: outer, y: 240, fontFamily: brand.fonts.display, fill: brand.colors.ink, weight: 700, measure: title })}
  ${renderMeasuredText({ x: outer, y: 272 + title.height, fontFamily: brand.fonts.body, fill: brand.colors.stone, weight: 400, measure: deck })}
  ${renderSummaryItems({ x: outer, y: stackY, width: dims.width - outer * 2, height: dims.height - outer - stackY, items, accent })}
</svg>`;
}

function renderAsset(day, asset, dims, context) {
  if (asset.template === 'utility-sequence' && (asset.mode === 'cover' || asset.mode === 'summary') && !asset.image) return sequenceSummary(day, asset, dims, context);
  if (asset.template === 'editorial-comparison' && (asset.mode === 'cover' || asset.mode === 'summary') && !asset.image) return comparisonSummary(day, asset, dims, context);

  const isInstagramPortrait = asset.platform === 'ig' && dims.height > dims.width;
  const photoOpts = {
    'editorial-cover': { metaRight: `${day.label} · editorial cover`, overlay: dims.width > dims.height ? 'bottom' : 'none', titleStart: dims.width > dims.height ? 88 : 56, titleMin: dims.width > dims.height ? 54 : 36, portraitMode: isInstagramPortrait ? 'immersive-cover' : undefined },
    'recommendation-hero': { metaRight: `${day.label} · recommendation`, overlay: dims.width > dims.height ? 'bottom' : 'none', titleStart: dims.width > dims.height ? 84 : 52, titleMin: dims.width > dims.height ? 52 : 34, accent: brand.colors.olive, portraitMode: isInstagramPortrait ? 'immersive-cover' : undefined },
    'utility-sequence': { metaRight: `${day.label} · step ${asset.step ?? 'feature'}`, overlay: dims.width > dims.height ? 'bottom' : 'none', titleStart: dims.width > dims.height ? 80 : 52, titleMin: dims.width > dims.height ? 48 : 32, portraitMode: isInstagramPortrait ? 'immersive-cover' : undefined },
    'editorial-comparison': { metaRight: `${day.label} · ${asset.lane ?? 'editorial lane'}`, overlay: dims.width > dims.height ? 'bottom' : 'none', titleStart: dims.width > dims.height ? 78 : 50, titleMin: dims.width > dims.height ? 48 : 32, deckStart: dims.width > dims.height ? 24 : 21, portraitMode: isInstagramPortrait ? 'immersive-cover' : undefined },
    'atmosphere-single': { metaRight: `${day.label} · atmosphere`, overlay: dims.width > dims.height ? 'bottom' : 'side', titleStart: dims.width > dims.height ? 84 : 52, titleMin: dims.width > dims.height ? 50 : 32, deckLines: 3, portraitMode: isInstagramPortrait ? 'immersive-cover' : undefined }
  }[asset.template];

  if (!photoOpts) throw new Error(`Unknown template: ${asset.template}`);
  return photoCard(day, asset, dims, context, photoOpts);
}

function normalizePlatformHeading(value) {
  const lower = value.trim().toLowerCase();
  if (lower === 'facebook') return 'fb';
  if (lower === 'instagram') return 'ig';
  if (lower === 'linkedin') return 'li';
  return lower;
}

function parseBulletLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^[-•]\s*/, ''));
}

function parseCopyPackage(markdown) {
  const result = {};
  const sections = markdown.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines.shift()?.trim();
    if (!heading) continue;
    const dayKey = slugify(heading);
    const body = lines.join('\n').trim();
    const postAngle = body.match(/###\s+Post angle\s+([\s\S]*?)(?=\n###\s|$)/)?.[1]?.trim() ?? '';
    const positioningNotes = parseBulletLines(body.match(/###\s+Positioning notes\s+([\s\S]*?)(?=\n###\s|$)/)?.[1] ?? '');
    const entry = { label: heading, dayKey, postAngle, positioningNotes, platforms: {} };
    const platformRegex = /###\s+(Facebook|Instagram|LinkedIn)\s+\*\*Copy:\*\*\s*([\s\S]*?)(?=\n###\s+(?:Facebook|Instagram|LinkedIn|Positioning notes|Post angle)|$)/g;
    let match;
    while ((match = platformRegex.exec(body)) !== null) entry.platforms[normalizePlatformHeading(match[1])] = match[2].trim();
    result[dayKey] = entry;
  }
  return result;
}

function getCopyData(day) {
  return copyPackage[slugify(day.label)] ?? { label: day.label, postAngle: '', positioningNotes: [], platforms: {} };
}

function buildPublishingData(manifest) {
  return payload.days.map((day) => {
    const copy = getCopyData(day);
    const manifestDay = manifest.days[day.day];
    const platforms = {};
    for (const platform of platformOrder) {
      const assets = manifestDay.assets.filter((asset) => asset.platform === platform);
      if (!assets.length && !copy.platforms[platform]) continue;
      platforms[platform] = {
        platform,
        label: platformMeta[platform].label,
        copy: copy.platforms[platform] ?? '',
        assets: assets.map((asset) => ({ title: asset.title, filename: asset.filename, ratio: asset.ratio, template: asset.template, previewPath: asset.previewPath, filePath: asset.filePath }))
      };
    }
    return { day: day.day, label: day.label, concept: day.concept, templateFamily: day.templateFamily, postAngle: copy.postAngle, positioningNotes: copy.positioningNotes, platforms };
  });
}

function renderCaptionHtml(copy) {
  return copy ? escapeHtml(copy) : '<span class="empty-copy">Copy not available</span>';
}

function renderReviewBoard(manifest, publishingData) {
  const nav = publishingData.map((day) => `<a class="rail-link" href="#day-${day.day}"><span>${escapeHtml(day.label)}</span><small>${escapeHtml(titleCase(day.concept))}</small></a>`).join('');
  const platformSummary = platformOrder.map((platform) => `<div class="stat"><span>${platformMeta[platform].label}</span><strong>${manifest.platformCounts[platform] || 0}</strong></div>`).join('');
  const days = publishingData.map((day) => {
    const notes = day.positioningNotes.length ? `<ul>${day.positioningNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : '<p class="muted">No positioning notes captured.</p>';
    const cards = platformOrder.filter((platform) => day.platforms[platform]).map((platform) => {
      const entry = day.platforms[platform];
      const copyId = `copy-${day.day}-${platform}`;
      const assetsId = `assets-${day.day}-${platform}`;
      const thumbs = entry.assets.length
        ? entry.assets.map((asset, index) => `<a class="thumb" href="${escapeHtml(asset.previewPath)}" target="_blank" rel="noreferrer"><div class="thumb-media"><span class="thumb-index">${index + 1}</span><img src="${escapeHtml(asset.previewPath)}" alt="${escapeHtml(asset.filename)}" loading="lazy" /></div><span class="thumb-meta">${escapeHtml(platformMeta[platform].label)} · ${escapeHtml(asset.ratio)} · ${escapeHtml(titleCase(asset.template))}</span><span class="thumb-name">${escapeHtml(asset.title)}</span></a>`).join('')
        : '<div class="thumb thumb-empty"><span>No artwork mapped</span></div>';
      const assetList = entry.assets.map((asset) => `${asset.filename} (${asset.ratio})`).join('\n') || 'No assets';
      return `<article class="platform-card"><header><div><div class="eyebrow">${escapeHtml(platformMeta[platform].label)} review</div><h3>${escapeHtml(day.label)} · ${escapeHtml(titleCase(day.concept))}</h3></div><div class="tag">${entry.assets.length} asset${entry.assets.length === 1 ? '' : 's'}</div></header><div class="platform-body"><div class="thumb-grid count-${Math.min(entry.assets.length || 1, 5)}">${thumbs}</div><aside class="copy-stack"><section class="copy-card"><div class="copy-head"><div><div class="eyebrow">Caption</div><h4>${escapeHtml(platformMeta[platform].label)} copy</h4></div><button type="button" data-copy-target="${copyId}">Copy caption</button></div><pre id="${copyId}">${renderCaptionHtml(entry.copy)}</pre></section><section class="copy-card"><div class="copy-head"><div><div class="eyebrow">Publishing handoff</div><h4>Asset filenames</h4></div><button type="button" data-copy-target="${assetsId}">Copy list</button></div><pre id="${assetsId}">${escapeHtml(assetList)}</pre></section></aside></div></article>`;
    }).join('');
    return `<section class="day" id="day-${day.day}"><header class="day-head"><div><div class="eyebrow">${escapeHtml(day.label)}</div><h2>${escapeHtml(titleCase(day.concept))}</h2><p class="muted lead">${escapeHtml(day.postAngle || 'No post angle supplied.')}</p></div><div class="day-tags"><span class="tag">${escapeHtml(day.templateFamily)}</span><span class="tag tag-muted">${Object.keys(day.platforms).length} platform views</span></div></header><div class="notes"><div class="eyebrow">Positioning notes</div>${notes}</div><div class="platform-stack">${cards}</div></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(payload.title)} · ${escapeHtml(payload.weekStart)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>
:root{--paper:${brand.colors.paper};--cream:${brand.colors.cream};--sand:${brand.colors.sand};--ink:${brand.colors.ink};--stone:${brand.colors.stone};--line:rgba(31,29,26,.10);--line-soft:rgba(31,29,26,.06);--panel:rgba(255,255,255,.62);--panel-strong:rgba(255,255,255,.76)}*{box-sizing:border-box}body{margin:0;color:var(--ink);font-family:'Outfit',${brand.fonts.body};background:linear-gradient(180deg,var(--paper),var(--cream))}a{text-decoration:none;color:inherit}h1,h2,h3,h4,p{margin:0}h1,h2,h3,h4{font-family:'Cormorant Garamond',${brand.fonts.display};font-weight:600;line-height:.96;letter-spacing:-.02em}.eyebrow{font-size:.68rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--stone)}.muted{color:var(--stone)}.shell{max-width:1680px;margin:0 auto;padding:28px;display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px}.rail{position:sticky;top:28px;align-self:start;display:grid;gap:16px}.panel,.cover,.day,.platform-card,.copy-card,.thumb{background:var(--panel);border:1px solid var(--line-soft)}.panel,.cover,.day,.platform-card,.copy-card{padding:20px}.brand{display:grid;gap:10px;background:var(--panel-strong)}.brand-mark{font-family:'Cormorant Garamond',${brand.fonts.display};font-size:2rem;line-height:.95}.rail-nav{display:grid;gap:8px}.rail-link{display:grid;gap:4px;padding:12px 14px;background:rgba(255,255,255,.44);border:1px solid var(--line-soft)}.rail-link span{font-size:.95rem;font-weight:600}.rail-link small{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:var(--stone)}.cover{display:grid;gap:18px;background:var(--panel-strong)}.cover-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:24px;align-items:end;padding-top:18px;border-top:1px solid var(--line)}.cover h1{margin-top:10px;font-size:clamp(3rem,5vw,5rem);max-width:8ch}.lead{margin-top:14px;line-height:1.72}.callouts{display:grid;gap:10px}.callout{padding:12px 0;border-top:1px solid var(--line-soft);line-height:1.6}.stats{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}.stat{padding:16px;background:rgba(255,255,255,.5);border:1px solid var(--line-soft)}.stat span{display:block;color:var(--stone);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}.stat strong{display:block;margin-top:8px;font-family:'Cormorant Garamond',${brand.fonts.display};font-size:2.2rem}.main{display:grid;gap:24px}.day{display:grid;gap:18px}.day-head{display:flex;justify-content:space-between;gap:18px;align-items:start;padding-bottom:16px;border-bottom:1px solid var(--line)}.day-head h2{margin-top:8px;font-size:clamp(2.4rem,4vw,4rem)}.day-tags{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.tag{display:inline-flex;align-items:center;padding:9px 12px;border:1px solid var(--line-soft);background:rgba(255,255,255,.46);font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}.tag-muted{color:var(--stone)}.notes{padding-top:14px;border-top:1px solid var(--line-soft)}.notes ul{margin:10px 0 0;padding-left:18px;line-height:1.72;color:var(--stone)}.platform-stack{display:grid;gap:16px}.platform-card{display:grid;gap:18px}.platform-card>header{display:flex;justify-content:space-between;gap:16px;align-items:start;padding-bottom:14px;border-bottom:1px solid var(--line-soft)}.platform-card h3{margin-top:8px;font-size:1.92rem}.platform-body{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:18px;align-items:start}.thumb-grid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}.count-1{grid-template-columns:1fr}.thumb{display:grid;gap:10px;padding:12px;background:rgba(255,255,255,.48)}.thumb-media{position:relative;background:var(--sand);overflow:hidden}.thumb img{width:100%;display:block;background:var(--cream)}.thumb-index{position:absolute;top:12px;left:12px;min-width:32px;height:32px;padding:0 8px;display:inline-flex;align-items:center;justify-content:center;background:rgba(31,29,26,.86);color:#fff;font-size:.74rem;font-weight:700;letter-spacing:.08em}.thumb-meta{font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--stone)}.thumb-name{font-size:.96rem;line-height:1.48}.thumb-empty{place-items:center;min-height:220px;color:var(--stone)}.copy-stack{display:grid;gap:14px}.copy-card{display:grid;gap:12px;background:rgba(255,255,255,.54)}.copy-head{display:flex;justify-content:space-between;gap:12px;align-items:start;padding-bottom:12px;border-bottom:1px solid var(--line-soft)}.copy-head h4{margin-top:8px;font-size:1.5rem}button{appearance:none;border:1px solid rgba(31,29,26,.12);background:var(--ink);color:#fff;padding:10px 14px;font:inherit;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}pre{margin:0;white-space:pre-wrap;font-family:'Outfit',${brand.fonts.body};font-size:.95rem;line-height:1.75;color:var(--ink)}@media(max-width:1260px){.shell{grid-template-columns:1fr}.rail{position:static}.rail-nav{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}}@media(max-width:960px){.cover-grid,.platform-body{grid-template-columns:1fr}.day-head,.platform-card>header,.copy-head{flex-direction:column}.day-tags{justify-content:flex-start}}@media(max-width:720px){.shell{padding:14px;gap:14px}.panel,.cover,.day,.platform-card,.copy-card{padding:16px}.thumb-grid,.stats,.rail-nav{grid-template-columns:1fr}}</style></head><body><div class="shell"><aside class="rail"><section class="panel brand"><div class="eyebrow">Peninsula Insider</div><div class="brand-mark">Weekly social review</div><p class="muted">A calmer editorial board for checking creative, copy, and publishing handoff in one place.</p></section><nav class="rail-nav">${nav}</nav><section class="panel"><div class="eyebrow">Known upgrade slots</div><ul>${blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section></aside><main class="main"><header class="cover"><div><div class="eyebrow">Peninsula Insider · Weekly social review board</div><h1>Week of ${escapeHtml(payload.weekStart)}</h1><p class="muted lead">The weekly pack now runs on a tighter editorial system: steadier spacing, fewer UI-style frames, cleaner alignment, and a simpler relationship between photography and copy.</p></div><div class="cover-grid"><div class="callouts"><div class="callout">The assets now read as one publication family instead of a stack of over-designed templates.</div><div class="callout">Photography carries more of the work, while text blocks sit on a consistent grid with repeatable safe areas.</div></div><div class="stats"><div class="stat"><span>Total assets</span><strong>${manifest.assetCount}</strong></div>${platformSummary}</div></div></header>${days}</main></div><script>document.querySelectorAll('[data-copy-target]').forEach((button)=>{button.addEventListener('click',async()=>{const target=document.getElementById(button.dataset.copyTarget);if(!target)return;try{await navigator.clipboard.writeText((target.textContent||'').trim());const original=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=original,1200);}catch(error){console.error(error);}});});</script></body></html>`;
}

function renderPublishingMarkdown(platform, publishingData) {
  const lines = [`# Peninsula Insider ${platformMeta[platform].label} publishing sheet`, '', `**Week of:** ${payload.weekStart}`, `**Generated from:** tools/social-assets/render.js`, ''];
  for (const day of publishingData) {
    const entry = day.platforms[platform];
    if (!entry) continue;
    lines.push(`## ${day.label} — ${day.concept}`);
    if (day.postAngle) lines.push('', '**Post angle:**', day.postAngle, '');
    if (day.positioningNotes.length) {
      lines.push('**Positioning notes:**');
      for (const note of day.positioningNotes) lines.push(`- ${note}`);
      lines.push('');
    }
    lines.push('**Assets:**');
    for (const asset of entry.assets) lines.push(`- ${asset.filename} (${asset.ratio})`);
    lines.push('', '**Caption:**', '', entry.copy || '_Copy not available_', '', '---', '');
  }
  return `${lines.join('\n').trim()}\n`;
}

function renderPublishingReadme() {
  return '# Publishing handoff\n\nThis folder contains copy-ready posting sheets exported from the weekly social system.\n';
}

function renderReadme(manifest) {
  const dayLines = Object.values(manifest.days).map((day) => `- **${day.label}** · ${day.assets.length} assets · ${day.templateFamily}`).join('\n');
  return `# Peninsula Insider weekly social pack\n\n**Week of:** ${payload.weekStart}  \n**Status:** Simplified editorial source system and SVG export set  \n**Source payload:** \`tools/social-assets/examples/${path.basename(payloadPath)}\`  \n**Renderer:** \`tools/social-assets/render.js\`\n\n## What is here\n\n- \`masters/\` pinned source inputs used for this run\n- \`exports/ig\` Instagram 4:5 feed assets\n- \`exports/fb\` Facebook adaptations\n- \`exports/li\` LinkedIn adaptations\n- \`publishing/\` copy-and-paste platform handoff sheets\n- \`manifest.json\` asset manifest with metadata\n- \`posting-manifest.json\` day/platform posting sheet\n- \`index.html\` editorial review board with captions beside creative\n- \`source-images/manifest.json\` image usage map\n\n## Day breakdown\n\n${dayLines}\n\n## Re-render\n\n\`\`\`bash\nnode tools/social-assets/render.js\n\`\`\`\n`;
}

ensureDir(outputRoot);
ensureDir(mastersRoot);
ensureDir(exportsRoot);
ensureDir(sourceImagesRoot);
ensureDir(publishingRoot);

const manifest = { weekStart: payload.weekStart, version: payload.version, title: payload.title, brand: brand.name, assetCount: 0, platformCounts: {}, days: {}, blockers };
const postingManifest = [];
const sourceImages = new Map();

for (const day of payload.days) {
  const copy = getCopyData(day);
  manifest.days[day.day] = { label: day.label, concept: day.concept, templateFamily: day.templateFamily, postAngle: copy.postAngle, positioningNotes: copy.positioningNotes, assets: [] };

  for (const asset of day.assets) {
    const dims = sizes[asset.ratio];
    if (!dims) throw new Error(`Unsupported ratio: ${asset.ratio}`);
    const filename = buildFilename(day, asset);
    const platformDir = path.join(exportsRoot, asset.platform);
    const outputPath = path.join(platformDir, filename);
    ensureDir(platformDir);
    const svg = renderAsset(day, asset, dims, { filename });
    fs.writeFileSync(outputPath, svg, 'utf8');
    manifest.assetCount += 1;
    manifest.platformCounts[asset.platform] = (manifest.platformCounts[asset.platform] || 0) + 1;
    const previewPath = path.relative(outputRoot, outputPath).split(path.sep).join('/');
    const entry = { filename, filePath: path.relative(repoRoot, outputPath).split(path.sep).join('/'), previewPath, title: asset.title, template: asset.template, platform: asset.platform, ratio: asset.ratio, captionRef: day.captionRef, image: asset.image || null };
    manifest.days[day.day].assets.push(entry);
    postingManifest.push({ day: day.label, daySlug: day.day, concept: day.concept, platform: asset.platform, ratio: asset.ratio, filename, path: path.relative(repoRoot, outputPath).split(path.sep).join('/'), captionRef: day.captionRef, template: asset.template, copy: copy.platforms?.[asset.platform] ?? '' });
    if (asset.image) {
      const imageEntry = sourceImages.get(asset.image) || { image: asset.image, usedBy: [] };
      imageEntry.usedBy.push(filename);
      sourceImages.set(asset.image, imageEntry);
    }
  }
}

const publishingData = buildPublishingData(manifest);
const captionsJson = { weekStart: payload.weekStart, generatedAt: new Date().toISOString(), days: publishingData };

fs.copyFileSync(payloadPath, path.join(mastersRoot, path.basename(payloadPath)));
fs.copyFileSync(brandPath, path.join(mastersRoot, path.basename(brandPath)));
fs.copyFileSync(__filename, path.join(mastersRoot, 'render.js'));
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(outputRoot, 'posting-manifest.json'), JSON.stringify(postingManifest, null, 2));
fs.writeFileSync(path.join(sourceImagesRoot, 'manifest.json'), JSON.stringify(Array.from(sourceImages.values()), null, 2));
fs.writeFileSync(path.join(outputRoot, 'README.md'), renderReadme(manifest));
fs.writeFileSync(path.join(outputRoot, 'index.html'), renderReviewBoard(manifest, publishingData));
fs.writeFileSync(path.join(publishingRoot, 'README.md'), renderPublishingReadme());
fs.writeFileSync(path.join(publishingRoot, 'captions.json'), JSON.stringify(captionsJson, null, 2));
fs.writeFileSync(path.join(publishingRoot, 'instagram.md'), renderPublishingMarkdown('ig', publishingData));
fs.writeFileSync(path.join(publishingRoot, 'facebook.md'), renderPublishingMarkdown('fb', publishingData));
fs.writeFileSync(path.join(publishingRoot, 'linkedin.md'), renderPublishingMarkdown('li', publishingData));

console.log(`Rendered ${manifest.assetCount} assets to ${path.relative(repoRoot, outputRoot)}`);
