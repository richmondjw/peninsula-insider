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

const outputRoot = path.join(repoRoot, 'social', `week-of-${payload.weekStart}`);
const mastersRoot = path.join(outputRoot, 'masters');
const exportsRoot = path.join(outputRoot, 'exports');
const sourceImagesRoot = path.join(outputRoot, 'source-images');

const sizes = {
  '4x5': { width: 1080, height: 1350 },
  '1x1': { width: 1080, height: 1080 },
  '191x1': { width: 1200, height: 628 },
  '9x16': { width: 1080, height: 1920 }
};

const blockers = [
  'Tuesday and Friday would both improve with a stronger shoulder-season Sorrento streetscape or heritage facade image to replace the softer harbour hero if sourced later.',
  'Wednesday lunch frame currently uses a place-led image rather than a true table-side lunch still, so that slot is production-ready but still upgradeable.',
  'Saturday is intentionally atmosphere-led but would benefit from a fresher same-week observational still if the newsroom begins collecting live weekend imagery.'
];

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ratioLabel(asset) {
  return asset.ratio;
}

function buildFilename(day, asset) {
  return `pi-social-${payload.weekStart}-${day.day}-${day.concept}-${asset.platform}-${ratioLabel(asset)}-${asset.assetKey}-${payload.version}.svg`;
}

function wrapText(text, maxWidth, fontSize, maxLines = 4) {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  const maxChars = Math.max(10, Math.floor(maxWidth / (fontSize * 0.56)));

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, '')}…`;
  }
  return lines;
}

function renderTextBlock({ x, y, width, fontSize, lineHeight, fontFamily, fill, text, maxLines = 4, weight = 500, letterSpacing = 0 }) {
  const lines = wrapText(text, width, fontSize, maxLines);
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<text x="${x}" y="${y}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">${tspans}</text>`;
}

function chip(x, y, label, options = {}) {
  const paddingX = options.paddingX ?? 18;
  const height = options.height ?? 36;
  const fontSize = options.fontSize ?? 15;
  const width = Math.max(110, label.length * (fontSize * 0.72) + paddingX * 2);
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="${brand.radii.chip}" fill="${options.fill ?? 'rgba(246,241,232,0.92)'}" stroke="${options.stroke ?? 'rgba(255,255,255,0.28)'}" />
      <text x="${width / 2}" y="${height / 2 + 5}" text-anchor="middle" font-family="${escapeXml(brand.fonts.body)}" font-size="${fontSize}" font-weight="700" letter-spacing="1.4" fill="${options.text ?? brand.colors.ink}">${escapeXml(label.toUpperCase())}</text>
    </g>`;
}

function footer(width, height, inverse = false) {
  const fill = inverse ? 'rgba(255,255,255,0.78)' : brand.colors.stone;
  const line = inverse ? 'rgba(255,255,255,0.18)' : 'rgba(31,32,28,0.12)';
  return `
    <g>
      <line x1="60" y1="${height - 74}" x2="${width - 60}" y2="${height - 74}" stroke="${line}" stroke-width="1" />
      <text x="60" y="${height - 42}" font-family="${escapeXml(brand.fonts.body)}" font-size="16" font-weight="600" letter-spacing="1.6" fill="${fill}">${escapeXml(brand.name.toUpperCase())}</text>
      <text x="${width - 60}" y="${height - 42}" text-anchor="end" font-family="${escapeXml(brand.fonts.body)}" font-size="15" font-weight="500" letter-spacing="1.2" fill="${fill}">${escapeXml(payload.weekStart)}</text>
    </g>`;
}

function imageHrefFor(outputPath, assetImage) {
  const absolute = path.join(repoRoot, assetImage);
  return path.relative(path.dirname(outputPath), absolute).split(path.sep).join('/');
}

function imageCanvas({ id, href, width, height, overlay = 'dark-bottom', imagePosition = 'center' }) {
  const preserve = imagePosition === 'top' ? 'xMidYMin slice' : imagePosition === 'bottom' ? 'xMidYMax slice' : 'xMidYMid slice';
  let overlaySvg = '';
  if (overlay === 'dark-bottom') {
    overlaySvg = `<rect width="${width}" height="${height}" fill="url(#${id}-overlay-bottom)" />`;
  } else if (overlay === 'soft-full') {
    overlaySvg = `<rect width="${width}" height="${height}" fill="url(#${id}-overlay-soft)" />`;
  } else if (overlay === 'left-panel') {
    overlaySvg = `<rect width="${width}" height="${height}" fill="url(#${id}-overlay-left)" />`;
  }
  return `
    <defs>
      <linearGradient id="${id}-overlay-bottom" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.10" />
        <stop offset="56%" stop-color="#141614" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#141614" stop-opacity="0.76" />
      </linearGradient>
      <linearGradient id="${id}-overlay-soft" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#F6F1E8" stop-opacity="0.10" />
        <stop offset="100%" stop-color="#F6F1E8" stop-opacity="0.35" />
      </linearGradient>
      <linearGradient id="${id}-overlay-left" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#141614" stop-opacity="0.72" />
        <stop offset="48%" stop-color="#141614" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#141614" stop-opacity="0.04" />
      </linearGradient>
    </defs>
    <image href="${href}" width="${width}" height="${height}" preserveAspectRatio="${preserve}" />
    ${overlaySvg}`;
}

function editorialCover(asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const href = imageHrefFor(context.outputPath, asset.image);
  const wide = dims.width > dims.height;
  const titleSize = wide ? 72 : 88;
  const deckSize = wide ? 25 : 28;
  const bottomY = dims.height - (wide ? 152 : 240);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.ink}" />
  ${imageCanvas({ id, href, width: dims.width, height: dims.height, overlay: wide ? 'left-panel' : 'dark-bottom', imagePosition: asset.imagePosition })}
  <rect x="34" y="34" width="${dims.width - 68}" height="${dims.height - 68}" fill="none" stroke="rgba(255,255,255,0.22)" />
  ${chip(60, 60, asset.kicker, { fill: wide ? 'rgba(246,241,232,0.92)' : 'rgba(246,241,232,0.88)' })}
  ${renderTextBlock({ x: 60, y: bottomY, width: wide ? dims.width * 0.5 : dims.width - 120, fontSize: titleSize, lineHeight: titleSize * 1.08, fontFamily: brand.fonts.display, fill: brand.colors.white, text: asset.title, maxLines: wide ? 3 : 4, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 60, y: bottomY + (wide ? 168 : 218), width: wide ? dims.width * 0.48 : dims.width - 140, fontSize: deckSize, lineHeight: deckSize * 1.45, fontFamily: brand.fonts.body, fill: 'rgba(255,255,255,0.88)', text: asset.deck, maxLines: wide ? 3 : 4, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, true)}
</svg>`;
}

function recommendationHero(asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const href = imageHrefFor(context.outputPath, asset.image);
  const wide = dims.width > dims.height;
  if (wide) {
    const imageWidth = Math.round(dims.width * 0.58);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <image href="${href}" width="${imageWidth}" height="${dims.height}" preserveAspectRatio="xMidYMid slice" />
  <rect x="${imageWidth}" y="0" width="${dims.width - imageWidth}" height="${dims.height}" fill="${brand.colors.paper}" />
  <rect x="${imageWidth + 40}" y="44" width="${dims.width - imageWidth - 80}" height="${dims.height - 88}" rx="28" fill="${brand.colors.cream}" stroke="rgba(31,32,28,0.08)" />
  ${chip(imageWidth + 76, 76, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.2)' })}
  ${renderTextBlock({ x: imageWidth + 76, y: 196, width: dims.width - imageWidth - 152, fontSize: 58, lineHeight: 62, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: imageWidth + 76, y: 378, width: dims.width - imageWidth - 152, fontSize: 24, lineHeight: 34, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: 4 }) : ''}
  ${footer(dims.width, dims.height, false)}
</svg>`;
  }
  const panelY = Math.round(dims.height * 0.58);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <image href="${href}" width="${dims.width}" height="${panelY + 120}" preserveAspectRatio="xMidYMid slice" />
  <rect x="38" y="${panelY - 26}" width="${dims.width - 76}" height="${dims.height - panelY - 12}" rx="34" fill="${brand.colors.paper}" stroke="rgba(31,32,28,0.08)" />
  ${chip(68, panelY + 16, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.2)' })}
  ${renderTextBlock({ x: 68, y: panelY + 116, width: dims.width - 136, fontSize: 76, lineHeight: 82, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 68, y: panelY + 340, width: dims.width - 146, fontSize: 28, lineHeight: 42, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: 4, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, false)}
</svg>`;
}

function utilitySequence(asset, dims, context) {
  const wide = dims.width > dims.height;
  const hasImage = Boolean(asset.image);
  if ((asset.mode === 'cover' || asset.mode === 'summary') && !hasImage) {
    const steps = asset.steps ?? [];
    const stepMarkup = steps.map((step, index) => {
      const x = wide ? 410 + index * 246 : 84;
      const y = wide ? 236 : 492 + index * 126;
      const w = wide ? 214 : dims.width - 168;
      const h = wide ? 152 : 98;
      return `
        <g transform="translate(${x} ${y})">
          <rect width="${w}" height="${h}" rx="24" fill="${index === 0 ? brand.colors.pinot : index === 1 ? brand.colors.fog : brand.colors.olive}" opacity="0.96" />
          <text x="26" y="48" font-family="${escapeXml(brand.fonts.body)}" font-size="18" font-weight="700" letter-spacing="1.6" fill="${brand.colors.white}">${escapeXml(String(index + 1).padStart(2, '0'))}</text>
          ${renderTextBlock({ x: 26, y: 86, width: w - 52, fontSize: wide ? 26 : 32, lineHeight: wide ? 32 : 40, fontFamily: brand.fonts.display, fill: brand.colors.white, text: step, maxLines: 2, weight: 700 })}
        </g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <rect x="34" y="34" width="${dims.width - 68}" height="${dims.height - 68}" rx="30" fill="${brand.colors.cream}" stroke="rgba(31,32,28,0.08)" />
  ${chip(68, 68, asset.kicker, { fill: brand.colors.olive, text: brand.colors.white, stroke: 'rgba(101,113,99,0.2)' })}
  ${renderTextBlock({ x: 68, y: wide ? 206 : 198, width: wide ? 342 : dims.width - 136, fontSize: wide ? 56 : 88, lineHeight: wide ? 60 : 90, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: wide ? 4 : 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 68, y: wide ? 396 : 392, width: wide ? 320 : dims.width - 146, fontSize: wide ? 22 : 28, lineHeight: wide ? 30 : 40, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: wide ? 4 : 4, weight: 500 }) : ''}
  ${stepMarkup}
  ${footer(dims.width, dims.height, false)}
</svg>`;
  }

  const href = imageHrefFor(context.outputPath, asset.image);
  const imageHeight = wide ? dims.height : Math.round(dims.height * 0.54);
  const panelY = wide ? 0 : imageHeight - 12;
  const stepLabel = asset.step ?? '01';
  if (wide) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <image href="${href}" width="${Math.round(dims.width * 0.54)}" height="${dims.height}" preserveAspectRatio="xMidYMid slice" />
  <rect x="${Math.round(dims.width * 0.54)}" y="0" width="${Math.round(dims.width * 0.46)}" height="${dims.height}" fill="${brand.colors.paper}" />
  <circle cx="${Math.round(dims.width * 0.54) + 82}" cy="102" r="38" fill="${brand.colors.pinot}" />
  <text x="${Math.round(dims.width * 0.54) + 82}" y="112" text-anchor="middle" font-family="${escapeXml(brand.fonts.body)}" font-size="24" font-weight="800" fill="${brand.colors.white}">${escapeXml(stepLabel)}</text>
  ${chip(Math.round(dims.width * 0.54) + 138, 68, asset.kicker, { fill: brand.colors.cream })}
  ${renderTextBlock({ x: Math.round(dims.width * 0.54) + 68, y: 206, width: dims.width * 0.36, fontSize: 54, lineHeight: 60, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: Math.round(dims.width * 0.54) + 68, y: 384, width: dims.width * 0.34, fontSize: 23, lineHeight: 34, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: 4, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, false)}
</svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <image href="${href}" width="${dims.width}" height="${imageHeight + 80}" preserveAspectRatio="xMidYMid slice" />
  <rect x="38" y="${panelY}" width="${dims.width - 76}" height="${dims.height - panelY - 38}" rx="34" fill="${brand.colors.paper}" stroke="rgba(31,32,28,0.08)" />
  <circle cx="128" cy="${panelY + 94}" r="42" fill="${brand.colors.pinot}" />
  <text x="128" y="${panelY + 106}" text-anchor="middle" font-family="${escapeXml(brand.fonts.body)}" font-size="28" font-weight="800" fill="${brand.colors.white}">${escapeXml(stepLabel)}</text>
  ${chip(188, panelY + 56, asset.kicker, { fill: brand.colors.cream })}
  ${renderTextBlock({ x: 72, y: panelY + 190, width: dims.width - 144, fontSize: 72, lineHeight: 80, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 72, y: panelY + 398, width: dims.width - 152, fontSize: 28, lineHeight: 40, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: 4, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, false)}
</svg>`;
}

function editorialComparison(asset, dims, context) {
  const wide = dims.width > dims.height;
  if ((asset.mode === 'cover' || asset.mode === 'summary') && !asset.image) {
    const lanes = asset.lanes ?? [];
    const laneMarkup = lanes.map((lane, index) => {
      const label = typeof lane === 'string' ? lane : lane.label;
      const note = typeof lane === 'string' ? '' : lane.note;
      const cardWidth = wide ? 220 : dims.width - 136;
      const cardHeight = wide ? 222 : 164;
      const x = wide ? 440 + index * 230 : 68;
      const y = wide ? 208 : 502 + index * 182;
      return `
        <g transform="translate(${x} ${y})">
          <rect width="${cardWidth}" height="${cardHeight}" rx="28" fill="${index === 0 ? brand.colors.fog : index === 1 ? brand.colors.pinot : brand.colors.olive}" opacity="0.96" />
          ${renderTextBlock({ x: 26, y: 68, width: cardWidth - 52, fontSize: wide ? 28 : 40, lineHeight: wide ? 34 : 44, fontFamily: brand.fonts.display, fill: brand.colors.white, text: label, maxLines: 2, weight: 700 })}
          ${note ? renderTextBlock({ x: 26, y: wide ? 134 : 116, width: cardWidth - 52, fontSize: wide ? 19 : 24, lineHeight: wide ? 28 : 32, fontFamily: brand.fonts.body, fill: 'rgba(255,255,255,0.88)', text: note, maxLines: 3, weight: 500 }) : ''}
        </g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  <rect x="34" y="34" width="${dims.width - 68}" height="${dims.height - 68}" rx="30" fill="${brand.colors.cream}" stroke="rgba(31,32,28,0.08)" />
  ${chip(68, 68, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.2)' })}
  ${renderTextBlock({ x: 68, y: wide ? 204 : 198, width: wide ? 344 : dims.width - 136, fontSize: wide ? 54 : 86, lineHeight: wide ? 58 : 90, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: wide ? 4 : 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 68, y: wide ? 392 : 386, width: wide ? 320 : dims.width - 148, fontSize: wide ? 22 : 28, lineHeight: wide ? 30 : 40, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: wide ? 4 : 4, weight: 500 }) : ''}
  ${laneMarkup}
  ${footer(dims.width, dims.height, false)}
</svg>`;
  }

  const href = imageHrefFor(context.outputPath, asset.image);
  const imageHeight = wide ? dims.height : Math.round(dims.height * 0.56);
  const lane = asset.lane ?? asset.kicker ?? 'Lane';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.paper}" />
  ${wide ? `<image href="${href}" width="${Math.round(dims.width * 0.52)}" height="${dims.height}" preserveAspectRatio="xMidYMid slice" />` : `<image href="${href}" width="${dims.width}" height="${imageHeight + 80}" preserveAspectRatio="xMidYMid slice" />`}
  ${wide ? `<rect x="${Math.round(dims.width * 0.52)}" y="0" width="${Math.round(dims.width * 0.48)}" height="${dims.height}" fill="${brand.colors.paper}" />` : `<rect x="38" y="${imageHeight - 10}" width="${dims.width - 76}" height="${dims.height - imageHeight - 28}" rx="34" fill="${brand.colors.paper}" stroke="rgba(31,32,28,0.08)" />`}
  ${wide ? chip(Math.round(dims.width * 0.52) + 68, 68, lane, { fill: brand.colors.fog }) : chip(68, imageHeight + 24, lane, { fill: brand.colors.fog })}
  ${renderTextBlock({ x: wide ? Math.round(dims.width * 0.52) + 68 : 68, y: wide ? 190 : imageHeight + 136, width: wide ? dims.width * 0.36 : dims.width - 136, fontSize: wide ? 54 : 72, lineHeight: wide ? 60 : 78, fontFamily: brand.fonts.display, fill: brand.colors.ink, text: asset.title, maxLines: 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: wide ? Math.round(dims.width * 0.52) + 68 : 68, y: wide ? 360 : imageHeight + 352, width: wide ? dims.width * 0.34 : dims.width - 148, fontSize: wide ? 22 : 28, lineHeight: wide ? 32 : 40, fontFamily: brand.fonts.body, fill: brand.colors.stone, text: asset.deck, maxLines: 4, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, false)}
</svg>`;
}

function atmosphereSingle(asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const href = imageHrefFor(context.outputPath, asset.image);
  const wide = dims.width > dims.height;
  const titleSize = wide ? 60 : 82;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.ink}" />
  ${imageCanvas({ id, href, width: dims.width, height: dims.height, overlay: wide ? 'left-panel' : 'dark-bottom', imagePosition: asset.imagePosition })}
  ${chip(60, 60, asset.kicker, { fill: 'rgba(246,241,232,0.9)' })}
  ${renderTextBlock({ x: 60, y: wide ? 214 : dims.height - 256, width: wide ? dims.width * 0.42 : dims.width - 120, fontSize: titleSize, lineHeight: titleSize * 1.06, fontFamily: brand.fonts.display, fill: brand.colors.white, text: asset.title, maxLines: wide ? 3 : 3, weight: 700 })}
  ${asset.deck ? renderTextBlock({ x: 60, y: wide ? 366 : dims.height - 118, width: wide ? dims.width * 0.4 : dims.width - 132, fontSize: wide ? 22 : 27, lineHeight: wide ? 32 : 40, fontFamily: brand.fonts.body, fill: 'rgba(255,255,255,0.88)', text: asset.deck, maxLines: wide ? 4 : 3, weight: 500 }) : ''}
  ${footer(dims.width, dims.height, true)}
</svg>`;
}

function renderAsset(day, asset, dims, context) {
  switch (asset.template) {
    case 'editorial-cover':
      return editorialCover(asset, dims, context);
    case 'recommendation-hero':
      return recommendationHero(asset, dims, context);
    case 'utility-sequence':
      return utilitySequence(asset, dims, context);
    case 'editorial-comparison':
      return editorialComparison(asset, dims, context);
    case 'atmosphere-single':
      return atmosphereSingle(asset, dims, context);
    default:
      throw new Error(`Unknown template: ${asset.template}`);
  }
}

function renderPreview(manifest) {
  const groups = Object.values(manifest.days).map((day) => {
    const cards = day.assets.map((asset) => `
      <article class="card">
        <img src="${asset.previewPath}" alt="${escapeXml(asset.filename)}" loading="lazy" />
        <div class="meta">
          <div class="eyebrow">${escapeXml(day.label)} · ${escapeXml(asset.platform.toUpperCase())} · ${escapeXml(asset.ratio)}</div>
          <h3>${escapeXml(asset.title)}</h3>
          <p>${escapeXml(asset.filename)}</p>
        </div>
      </article>`).join('');
    return `
      <section class="day-group">
        <div class="day-header">
          <div>
            <div class="eyebrow">${escapeXml(day.label)}</div>
            <h2>${escapeXml(day.concept)}</h2>
          </div>
          <p>${escapeXml(day.templateFamily)}</p>
        </div>
        <div class="grid">${cards}</div>
      </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(payload.title)} · ${escapeXml(payload.weekStart)}</title>
  <style>
    :root {
      --paper: ${brand.colors.paper};
      --cream: ${brand.colors.cream};
      --ink: ${brand.colors.ink};
      --stone: ${brand.colors.stone};
      --pinot: ${brand.colors.pinot};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Helvetica Neue, Arial, sans-serif;
      color: var(--ink);
      background: linear-gradient(180deg, #f7f2ea 0%, #efe7dc 100%);
      padding: 32px;
    }
    main {
      max-width: 1500px;
      margin: 0 auto;
    }
    .hero {
      background: rgba(255,255,255,0.56);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(31,32,28,0.08);
      border-radius: 24px;
      padding: 28px;
      margin-bottom: 28px;
      box-shadow: 0 20px 60px rgba(31,32,28,0.08);
    }
    .eyebrow {
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--stone);
      font-weight: 700;
    }
    h1, h2, h3 { margin: 0; }
    h1 {
      font-family: Iowan Old Style, Georgia, serif;
      font-size: clamp(2.4rem, 4vw, 4rem);
      margin-top: 10px;
      margin-bottom: 10px;
    }
    .hero p {
      max-width: 74ch;
      line-height: 1.6;
      color: var(--stone);
      margin: 0;
    }
    .day-group {
      margin-top: 28px;
      background: rgba(255,255,255,0.48);
      border: 1px solid rgba(31,32,28,0.06);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(31,32,28,0.05);
    }
    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 20px;
      margin-bottom: 18px;
    }
    .day-header h2 {
      font-family: Iowan Old Style, Georgia, serif;
      font-size: 2rem;
      text-transform: capitalize;
    }
    .day-header p {
      color: var(--stone);
      margin: 0;
      text-transform: capitalize;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .card {
      background: rgba(255,255,255,0.86);
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(31,32,28,0.08);
    }
    .card img {
      width: 100%;
      display: block;
      background: var(--cream);
    }
    .meta {
      padding: 14px 14px 16px;
    }
    .meta h3 {
      font-family: Iowan Old Style, Georgia, serif;
      font-size: 1.15rem;
      margin-top: 8px;
      margin-bottom: 6px;
    }
    .meta p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--stone);
      line-height: 1.4;
      word-break: break-word;
    }
    ul { margin: 14px 0 0; padding-left: 18px; color: var(--stone); }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Peninsula Insider · Weekly social pack</div>
      <h1>Week of ${escapeXml(payload.weekStart)}</h1>
      <p>Code-native editorial social system using five reusable template families. Output below includes ${manifest.assetCount} SVG design exports with production-ready filenames, a posting manifest, and pinned source data in <code>masters/</code>.</p>
      <ul>${blockers.map((item) => `<li>${escapeXml(item)}</li>`).join('')}</ul>
    </section>
    ${groups}
  </main>
</body>
</html>`;
}

function renderReadme(manifest) {
  const dayLines = Object.values(manifest.days)
    .map((day) => `- **${day.label}** · ${day.assets.length} assets · ${day.templateFamily}`)
    .join('\n');

  return `# Peninsula Insider weekly social pack\n\n**Week of:** ${payload.weekStart}  \n**Status:** Production-ready source system and SVG export set  \n**Source payload:** \`tools/social-assets/examples/${path.basename(payloadPath)}\`  \n**Renderer:** \`tools/social-assets/render.js\`\n\n## What is here\n\n- \`masters/\` pinned source inputs used for this run\n- \`exports/ig\` Instagram 4:5 feed assets\n- \`exports/fb\` Facebook adaptations\n- \`exports/li\` LinkedIn adaptations\n- \`manifest.json\` asset manifest with paths and metadata\n- \`posting-manifest.json\` platform/day posting sheet\n- \`index.html\` visual QA board\n- \`source-images/manifest.json\` image usage map\n\n## Production system\n\nThis weekly pack is built as one coherent editorial system across five template families:\n\n1. Editorial cover\n2. Recommendation hero\n3. Utility sequence\n4. Editorial comparison\n5. Atmosphere single\n\n## Asset count\n\n- **Total assets:** ${manifest.assetCount}\n- **Instagram:** ${manifest.platformCounts.ig || 0}\n- **Facebook:** ${manifest.platformCounts.fb || 0}\n- **LinkedIn:** ${manifest.platformCounts.li || 0}\n\n## Day breakdown\n\n${dayLines}\n\n## Re-render\n\nRun from repo root:\n\n\`\`\`bash\nnode tools/social-assets/render.js\n\`\`\`\n\nThen open \`social/week-of-${payload.weekStart}/index.html\` for visual review.\n\n## Known upgrade slots\n\n${blockers.map((item) => `- ${item}`).join('\n')}\n`;
}

ensureDir(outputRoot);
ensureDir(mastersRoot);
ensureDir(exportsRoot);
ensureDir(sourceImagesRoot);

const manifest = {
  weekStart: payload.weekStart,
  version: payload.version,
  title: payload.title,
  brand: brand.name,
  assetCount: 0,
  platformCounts: {},
  days: {},
  blockers
};

const postingManifest = [];
const sourceImages = new Map();

for (const day of payload.days) {
  manifest.days[day.day] = {
    label: day.label,
    concept: day.concept,
    templateFamily: day.templateFamily,
    assets: []
  };

  for (const asset of day.assets) {
    const dims = sizes[asset.ratio];
    if (!dims) throw new Error(`Unsupported ratio: ${asset.ratio}`);
    const filename = buildFilename(day, asset);
    const platformDir = path.join(exportsRoot, asset.platform);
    const outputPath = path.join(platformDir, filename);
    ensureDir(platformDir);

    const svg = renderAsset(day, asset, dims, { filename, outputPath });
    fs.writeFileSync(outputPath, svg, 'utf8');

    manifest.assetCount += 1;
    manifest.platformCounts[asset.platform] = (manifest.platformCounts[asset.platform] || 0) + 1;

    const previewPath = path.relative(outputRoot, outputPath).split(path.sep).join('/');
    manifest.days[day.day].assets.push({
      filename,
      filePath: path.relative(repoRoot, outputPath).split(path.sep).join('/'),
      previewPath,
      title: asset.title,
      template: asset.template,
      platform: asset.platform,
      ratio: asset.ratio,
      captionRef: day.captionRef,
      image: asset.image || null
    });

    postingManifest.push({
      day: day.label,
      daySlug: day.day,
      concept: day.concept,
      platform: asset.platform,
      ratio: asset.ratio,
      filename,
      path: path.relative(repoRoot, outputPath).split(path.sep).join('/'),
      captionRef: day.captionRef,
      template: asset.template
    });

    if (asset.image) {
      const imageEntry = sourceImages.get(asset.image) || { image: asset.image, usedBy: [] };
      imageEntry.usedBy.push(filename);
      sourceImages.set(asset.image, imageEntry);
    }
  }
}

fs.copyFileSync(payloadPath, path.join(mastersRoot, path.basename(payloadPath)));
fs.copyFileSync(brandPath, path.join(mastersRoot, path.basename(brandPath)));
fs.copyFileSync(__filename, path.join(mastersRoot, 'render.js'));

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(outputRoot, 'posting-manifest.json'), JSON.stringify(postingManifest, null, 2));
fs.writeFileSync(path.join(sourceImagesRoot, 'manifest.json'), JSON.stringify(Array.from(sourceImages.values()), null, 2));
fs.writeFileSync(path.join(outputRoot, 'README.md'), renderReadme(manifest));
fs.writeFileSync(path.join(outputRoot, 'index.html'), renderPreview(manifest));

console.log(`Rendered ${manifest.assetCount} assets to ${path.relative(repoRoot, outputRoot)}`);
