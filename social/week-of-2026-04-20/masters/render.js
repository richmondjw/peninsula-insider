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
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFilename(day, asset) {
  return `pi-social-${payload.weekStart}-${day.day}-${day.concept}-${asset.platform}-${asset.ratio}-${asset.assetKey}-${payload.version}.svg`;
}

function preserveAspectRatio(imagePosition = 'center') {
  if (imagePosition === 'top') return 'xMidYMin slice';
  if (imagePosition === 'bottom') return 'xMidYMax slice';
  return 'xMidYMid slice';
}

function imageHrefFor(outputPath, assetImage) {
  const absolute = path.join(repoRoot, assetImage);
  return path.relative(path.dirname(outputPath), absolute).split(path.sep).join('/');
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
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);

  const fullText = words.join(' ');
  const producedText = lines.join(' ');
  if (lines.length === maxLines && producedText.length < fullText.length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, '')}…`;
  }

  return lines;
}

function fitText(text, maxWidth, startSize, minSize, maxLines) {
  let size = startSize;
  let lines = wrapText(text, maxWidth, size, maxLines);

  while (size > minSize && lines.length === maxLines && lines[lines.length - 1]?.endsWith('…')) {
    size -= 2;
    lines = wrapText(text, maxWidth, size, maxLines);
  }

  return { fontSize: size, lines };
}

function renderTextBlock({
  x,
  y,
  width,
  text,
  fontFamily,
  fill,
  startSize,
  minSize,
  maxLines = 4,
  lineHeightFactor = 1.15,
  weight = 500,
  letterSpacing = 0,
  textAnchor = 'start'
}) {
  const fitted = fitText(text, width, startSize, minSize ?? Math.max(14, startSize - 20), maxLines);
  const lineHeight = Math.round(fitted.fontSize * lineHeightFactor * 100) / 100;
  const tspans = fitted.lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  return {
    markup: `<text x="${x}" y="${y}" font-family="${escapeXml(fontFamily)}" font-size="${fitted.fontSize}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}" text-anchor="${textAnchor}">${tspans}</text>`,
    fontSize: fitted.fontSize,
    lines: fitted.lines,
    height: fitted.lines.length > 0 ? (fitted.lines.length - 1) * lineHeight + fitted.fontSize : 0
  };
}

function createSharedDefs(id, width, height, extra = '') {
  return `
    <defs>
      <linearGradient id="${id}-paper-gradient" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${brand.colors.paper}" />
        <stop offset="100%" stop-color="${brand.colors.cream}" />
      </linearGradient>
      <linearGradient id="${id}-soft-vignette" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.02" />
        <stop offset="100%" stop-color="#151714" stop-opacity="0.12" />
      </linearGradient>
      <linearGradient id="${id}-image-bottom" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#0F120F" stop-opacity="0.02" />
        <stop offset="54%" stop-color="#0F120F" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#0F120F" stop-opacity="0.72" />
      </linearGradient>
      <linearGradient id="${id}-image-side" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#0F120F" stop-opacity="0.72" />
        <stop offset="48%" stop-color="#0F120F" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#0F120F" stop-opacity="0.04" />
      </linearGradient>
      <radialGradient id="${id}-pinot-glow" cx="18%" cy="12%" r="88%">
        <stop offset="0%" stop-color="${brand.colors.clay ?? '#C7B6A3'}" stop-opacity="0.38" />
        <stop offset="36%" stop-color="${brand.colors.pinot}" stop-opacity="0.14" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <filter id="${id}-paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#121411" flood-opacity="0.16" />
      </filter>
      <filter id="${id}-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#171916" flood-opacity="0.14" />
      </filter>
      <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.02" />
        </feComponentTransfer>
      </filter>
      <clipPath id="${id}-frame-clip">
        <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="32" />
      </clipPath>
      ${extra}
    </defs>`;
}

function renderPaperBackground(id, width, height, withGlow = true) {
  return `
    <rect width="${width}" height="${height}" fill="url(#${id}-paper-gradient)" />
    ${withGlow ? `<rect width="${width}" height="${height}" fill="url(#${id}-pinot-glow)" />` : ''}
    <rect width="${width}" height="${height}" fill="url(#${id}-soft-vignette)" />
    <rect width="${width}" height="${height}" filter="url(#${id}-grain)" opacity="0.9" />`;
}

function renderFrame(width, height, inverse = false) {
  const stroke = inverse ? 'rgba(255,255,255,0.22)' : 'rgba(31,32,28,0.11)';
  return `<rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="32" fill="none" stroke="${stroke}" />`;
}

function renderTopRail({ x, y, width, left, right, inverse = false }) {
  const fill = inverse ? 'rgba(255,255,255,0.88)' : brand.colors.ink;
  const muted = inverse ? 'rgba(255,255,255,0.58)' : 'rgba(31,32,28,0.58)';
  return `
    <g>
      <line x1="${x}" y1="${y + 24}" x2="${x + width}" y2="${y + 24}" stroke="${inverse ? 'rgba(255,255,255,0.18)' : 'rgba(31,32,28,0.12)'}" stroke-width="1" />
      <text x="${x}" y="${y + 14}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="14" font-weight="700" letter-spacing="2.2" fill="${fill}">${escapeXml(left.toUpperCase())}</text>
      <text x="${x + width}" y="${y + 14}" text-anchor="end" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="13" font-weight="600" letter-spacing="1.6" fill="${muted}">${escapeXml(right.toUpperCase())}</text>
    </g>`;
}

function renderFooter({ x, y, width, inverse = false, right }) {
  const fill = inverse ? 'rgba(255,255,255,0.78)' : brand.colors.stone;
  const line = inverse ? 'rgba(255,255,255,0.18)' : 'rgba(31,32,28,0.12)';
  return `
    <g>
      <line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${line}" stroke-width="1" />
      <text x="${x}" y="${y + 32}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="15" font-weight="700" letter-spacing="1.8" fill="${fill}">${escapeXml(brand.name.toUpperCase())}</text>
      <text x="${x + width}" y="${y + 32}" text-anchor="end" font-family="${escapeXml(brand.fonts.body)}" font-size="14" font-weight="500" letter-spacing="1.1" fill="${fill}">${escapeXml(right)}</text>
    </g>`;
}

function renderChip(x, y, label, options = {}) {
  const fontSize = options.fontSize ?? 15;
  const paddingX = options.paddingX ?? 18;
  const height = options.height ?? 38;
  const width = Math.max(116, label.length * (fontSize * 0.76) + paddingX * 2);
  const fill = options.fill ?? 'rgba(251,247,240,0.94)';
  const text = options.text ?? brand.colors.ink;
  const stroke = options.stroke ?? 'rgba(31,32,28,0.08)';
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="${brand.radii.chip}" fill="${fill}" stroke="${stroke}" />
      <text x="${width / 2}" y="${height / 2 + 5}" text-anchor="middle" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="${fontSize}" font-weight="700" letter-spacing="1.5" fill="${text}">${escapeXml(label.toUpperCase())}</text>
    </g>`;
}

function renderStepCoin(cx, cy, label, fill = brand.colors.pinot) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="38" fill="${fill}" />
      <circle cx="${cx}" cy="${cy}" r="37" fill="none" stroke="rgba(255,255,255,0.22)" />
      <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="22" font-weight="800" fill="${brand.colors.white}">${escapeXml(label)}</text>
    </g>`;
}

function renderImageBlock({ id, href, x, y, width, height, radius = 28, overlay = 'bottom', imagePosition = 'center', stroke = 'rgba(255,255,255,0.18)' }) {
  const clipId = `${id}-${slugify(`${x}-${y}-${width}-${height}`)}-clip`;
  const overlayFill = overlay === 'side' ? `url(#${id}-image-side)` : overlay === 'none' ? null : `url(#${id}-image-bottom)`;
  return {
    defs: `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" /></clipPath>`,
    markup: `
      <g>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#E6E0D5" filter="url(#${id}-card-shadow)" />
        <g clip-path="url(#${clipId})">
          <image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspectRatio(imagePosition)}" />
          ${overlayFill ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${overlayFill}" />` : ''}
          <rect x="${x}" y="${y}" width="${width}" height="${height}" filter="url(#${id}-grain)" opacity="0.65" />
        </g>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="none" stroke="${stroke}" />
      </g>`
  };
}

function editorialCover(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const wide = dims.width > dims.height;
  const href = imageHrefFor(context.outputPath, asset.image);

  if (wide) {
    const image = renderImageBlock({
      id,
      href,
      x: 558,
      y: 34,
      width: dims.width - 592,
      height: dims.height - 68,
      radius: 30,
      overlay: 'side',
      imagePosition: asset.imagePosition,
      stroke: 'rgba(255,255,255,0.24)'
    });

    const title = renderTextBlock({
      x: 84,
      y: 224,
      width: 428,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: 60,
      minSize: 34,
      maxLines: 4,
      lineHeightFactor: 1.05,
      weight: 700
    });

    const deck = renderTextBlock({
      x: 84,
      y: 224 + title.height + 38,
      width: 420,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: 20,
      minSize: 16,
      maxLines: 4,
      lineHeightFactor: 1.44,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="48" y="48" width="474" height="532" rx="30" fill="rgba(246,241,232,0.96)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  <rect x="48" y="48" width="12" height="532" rx="10" fill="${brand.colors.pinot}" opacity="0.92" />
  ${image.markup}
  ${renderFrame(dims.width, dims.height, false)}
  ${renderTopRail({ x: 84, y: 84, width: 420, left: brand.name, right: `${day.label} cover` })}
  ${renderChip(84, 138, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.22)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 84, y: 528, width: 420, right: payload.weekStart })}
</svg>`;
  }

  const image = renderImageBlock({
    id,
    href,
    x: 34,
    y: 34,
    width: dims.width - 68,
    height: dims.height - 68,
    radius: 34,
    overlay: 'bottom',
    imagePosition: asset.imagePosition,
    stroke: 'rgba(255,255,255,0.22)'
  });

  const panelY = dims.height - 474;
  const title = renderTextBlock({
    x: 108,
    y: panelY + 132,
    width: 650,
    text: asset.title,
    fontFamily: brand.fonts.display,
    fill: brand.colors.ink,
    startSize: 86,
    minSize: 56,
    maxLines: 3,
    lineHeightFactor: 1.04,
    weight: 700
  });
  const deck = renderTextBlock({
    x: 108,
    y: panelY + 156 + title.height,
    width: 620,
    text: asset.deck,
    fontFamily: brand.fonts.body,
    fill: brand.colors.stone,
    startSize: 26,
    minSize: 18,
    maxLines: 4,
    lineHeightFactor: 1.42,
    weight: 500
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.ink}" />
  ${image.markup}
  <rect x="72" y="${panelY}" width="772" height="390" rx="34" fill="rgba(251,247,240,0.96)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  <rect x="72" y="${panelY}" width="10" height="390" rx="10" fill="${brand.colors.pinot}" opacity="0.92" />
  ${renderTopRail({ x: 84, y: 76, width: dims.width - 168, left: brand.name, right: `${day.label} · ${titleCase(day.concept)}`, inverse: true })}
  ${renderChip(108, panelY + 46, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.22)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 108, y: panelY + 332, width: 620, right: payload.weekStart })}
  ${renderFrame(dims.width, dims.height, true)}
</svg>`;
}

function recommendationHero(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const wide = dims.width > dims.height;
  const href = imageHrefFor(context.outputPath, asset.image);

  if (wide) {
    const image = renderImageBlock({
      id,
      href,
      x: 74,
      y: 76,
      width: 486,
      height: 476,
      radius: 26,
      overlay: 'none',
      imagePosition: asset.imagePosition,
      stroke: 'rgba(255,255,255,0.22)'
    });

    const title = renderTextBlock({
      x: 648,
      y: 230,
      width: 458,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: 62,
      minSize: 34,
      maxLines: 4,
      lineHeightFactor: 1.05,
      weight: 700
    });

    const deck = renderTextBlock({
      x: 648,
      y: 246 + title.height,
      width: 430,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: 24,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.4,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="598" y="64" width="536" height="500" rx="30" fill="rgba(251,247,240,0.96)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  <rect x="610" y="76" width="6" height="476" rx="6" fill="${brand.colors.pinot}" opacity="0.88" />
  ${image.markup}
  ${renderTopRail({ x: 648, y: 100, width: 430, left: brand.name, right: platformMeta[asset.platform].label })}
  ${renderChip(648, 148, asset.kicker, { fill: brand.colors.cream })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 648, y: 520, width: 430, right: 'Recommendation hero' })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
  }

  const image = renderImageBlock({
    id,
    href,
    x: 72,
    y: 54,
    width: dims.width - 144,
    height: 754,
    radius: 30,
    overlay: 'none',
    imagePosition: asset.imagePosition,
    stroke: 'rgba(255,255,255,0.2)'
  });

  const panelY = 704;
  const title = renderTextBlock({
    x: 146,
    y: panelY + 182,
    width: 720,
    text: asset.title,
    fontFamily: brand.fonts.display,
    fill: brand.colors.ink,
    startSize: 76,
    minSize: 52,
    maxLines: 3,
    lineHeightFactor: 1.06,
    weight: 700
  });
  const deck = renderTextBlock({
    x: 146,
    y: panelY + 204 + title.height,
    width: 676,
    text: asset.deck,
    fontFamily: brand.fonts.body,
    fill: brand.colors.stone,
    startSize: 28,
    minSize: 19,
    maxLines: 4,
    lineHeightFactor: 1.42,
    weight: 500
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  ${image.markup}
  <rect x="118" y="${panelY}" width="844" height="514" rx="36" fill="rgba(251,247,240,0.97)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  <rect x="132" y="${panelY + 18}" width="8" height="478" rx="8" fill="${brand.colors.pinot}" opacity="0.9" />
  ${renderTopRail({ x: 146, y: panelY + 52, width: 676, left: brand.name, right: `${day.label} recommendation` })}
  ${renderChip(146, panelY + 94, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.22)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 146, y: panelY + 448, width: 676, right: 'Choose well' })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
}

function utilitySequence(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const wide = dims.width > dims.height;

  if ((asset.mode === 'cover' || asset.mode === 'summary') && !asset.image) {
    const steps = asset.steps ?? [];
    const defs = [];
    let stepMarkup = '';

    if (wide) {
      const cardWidth = 222;
      const startX = 452;
      const colors = [brand.colors.pinot, brand.colors.fog, brand.colors.olive];
      stepMarkup = steps.map((step, index) => {
        const x = startX + index * 236;
        const y = 236 + (index % 2) * 18;
        const block = renderTextBlock({
          x: x + 28,
          y: y + 110,
          width: cardWidth - 56,
          text: step,
          fontFamily: brand.fonts.display,
          fill: brand.colors.white,
          startSize: 28,
          minSize: 22,
          maxLines: 2,
          lineHeightFactor: 1.08,
          weight: 700
        });
        return `
          <g>
            <rect x="${x}" y="${y}" width="${cardWidth}" height="170" rx="28" fill="${colors[index % colors.length]}" filter="url(#${id}-card-shadow)" />
            ${renderStepCoin(x + 44, y + 46, String(index + 1).padStart(2, '0'), 'rgba(255,255,255,0.26)')}
            ${block.markup}
          </g>`;
      }).join('');
    } else {
      const colors = [brand.colors.pinot, brand.colors.fog, brand.colors.olive];
      stepMarkup = steps.map((step, index) => {
        const x = 84;
        const y = 500 + index * 138;
        const block = renderTextBlock({
          x: x + 110,
          y: y + 80,
          width: 760,
          text: step,
          fontFamily: brand.fonts.display,
          fill: brand.colors.white,
          startSize: 34,
          minSize: 24,
          maxLines: 2,
          lineHeightFactor: 1.08,
          weight: 700
        });
        return `
          <g>
            <rect x="${x}" y="${y}" width="912" height="112" rx="30" fill="${colors[index % colors.length]}" filter="url(#${id}-card-shadow)" />
            ${renderStepCoin(x + 58, y + 56, String(index + 1).padStart(2, '0'), 'rgba(255,255,255,0.24)')}
            ${block.markup}
          </g>`;
      }).join('');
    }

    const title = renderTextBlock({
      x: 84,
      y: wide ? 218 : 194,
      width: wide ? 320 : 800,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: wide ? 60 : 84,
      minSize: wide ? 42 : 56,
      maxLines: wide ? 4 : 3,
      lineHeightFactor: 1.04,
      weight: 700
    });
    const deck = renderTextBlock({
      x: 84,
      y: (wide ? 236 : 212) + title.height,
      width: wide ? 306 : 760,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: wide ? 22 : 28,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.42,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, defs.join(''))}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="48" y="48" width="${dims.width - 96}" height="${dims.height - 96}" rx="32" fill="rgba(246,241,232,0.94)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${renderFrame(dims.width, dims.height, false)}
  ${renderTopRail({ x: 84, y: 84, width: dims.width - 168, left: brand.name, right: 'Saveable route' })}
  ${renderChip(84, wide ? 142 : 128, asset.kicker, { fill: brand.colors.olive, text: brand.colors.white, stroke: 'rgba(101,113,99,0.24)' })}
  ${title.markup}
  ${deck.markup}
  ${stepMarkup}
  ${renderFooter({ x: 84, y: dims.height - 124, width: dims.width - 168, right: asset.mode === 'summary' ? 'Condensed version' : 'Utility sequence' })}
</svg>`;
  }

  const href = imageHrefFor(context.outputPath, asset.image);

  if (wide) {
    const image = renderImageBlock({
      id,
      href,
      x: 622,
      y: 54,
      width: 512,
      height: 520,
      radius: 28,
      overlay: 'none',
      imagePosition: asset.imagePosition,
      stroke: 'rgba(255,255,255,0.22)'
    });
    const title = renderTextBlock({
      x: 86,
      y: 264,
      width: 438,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: 60,
      minSize: 40,
      maxLines: 3,
      lineHeightFactor: 1.06,
      weight: 700
    });
    const deck = renderTextBlock({
      x: 86,
      y: 286 + title.height,
      width: 414,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: 23,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.42,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="54" y="54" width="526" height="520" rx="30" fill="rgba(251,247,240,0.96)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${image.markup}
  ${renderTopRail({ x: 86, y: 88, width: 414, left: brand.name, right: `Step ${asset.step}` })}
  ${renderStepCoin(118, 180, asset.step ?? '01')}
  ${renderChip(174, 160, asset.kicker, { fill: brand.colors.cream })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 86, y: 520, width: 414, right: day.label })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
  }

  const image = renderImageBlock({
    id,
    href,
    x: 72,
    y: 54,
    width: dims.width - 144,
    height: 706,
    radius: 30,
    overlay: 'none',
    imagePosition: asset.imagePosition,
    stroke: 'rgba(255,255,255,0.2)'
  });

  const panelY = 662;
  const title = renderTextBlock({
    x: 136,
    y: panelY + 202,
    width: 700,
    text: asset.title,
    fontFamily: brand.fonts.display,
    fill: brand.colors.ink,
    startSize: 72,
    minSize: 50,
    maxLines: 3,
    lineHeightFactor: 1.06,
    weight: 700
  });
  const deck = renderTextBlock({
    x: 136,
    y: panelY + 224 + title.height,
    width: 668,
    text: asset.deck,
    fontFamily: brand.fonts.body,
    fill: brand.colors.stone,
    startSize: 28,
    minSize: 19,
    maxLines: 4,
    lineHeightFactor: 1.42,
    weight: 500
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  ${image.markup}
  <rect x="108" y="${panelY}" width="864" height="540" rx="36" fill="rgba(251,247,240,0.97)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${renderStepCoin(164, panelY + 94, asset.step ?? '01')}
  ${renderChip(224, panelY + 70, asset.kicker, { fill: brand.colors.cream })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 136, y: panelY + 476, width: 668, right: 'Utility sequence' })}
  ${renderTopRail({ x: 136, y: panelY + 46, width: 668, left: brand.name, right: `${day.label} route` })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
}

function editorialComparison(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const wide = dims.width > dims.height;

  if ((asset.mode === 'cover' || asset.mode === 'summary') && !asset.image) {
    const lanes = asset.lanes ?? [];
    const colors = [brand.colors.fog, brand.colors.pinot, brand.colors.olive];
    const cards = lanes.map((lane, index) => {
      const laneLabel = typeof lane === 'string' ? lane : lane.label;
      const laneNote = typeof lane === 'string' ? '' : lane.note;
      if (wide) {
        const x = 468 + index * 228;
        const y = 200 + (index % 2) * 20;
        const title = renderTextBlock({
          x: x + 28,
          y: y + 86,
          width: 176,
          text: laneLabel,
          fontFamily: brand.fonts.display,
          fill: brand.colors.white,
          startSize: 30,
          minSize: 22,
          maxLines: 2,
          lineHeightFactor: 1.08,
          weight: 700
        });
        const note = laneNote ? renderTextBlock({
          x: x + 28,
          y: y + 142,
          width: 176,
          text: laneNote,
          fontFamily: brand.fonts.body,
          fill: 'rgba(255,255,255,0.86)',
          startSize: 18,
          minSize: 15,
          maxLines: 3,
          lineHeightFactor: 1.38,
          weight: 500
        }) : null;
        return `
          <g>
            <rect x="${x}" y="${y}" width="208" height="214" rx="30" fill="${colors[index % colors.length]}" filter="url(#${id}-card-shadow)" />
            <text x="${x + 28}" y="${y + 46}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="14" font-weight="700" letter-spacing="1.7" fill="rgba(255,255,255,0.72)">LANE ${index + 1}</text>
            ${title.markup}
            ${note ? note.markup : ''}
          </g>`;
      }

      const x = 84;
      const y = 528 + index * 190;
      const title = renderTextBlock({
        x: x + 36,
        y: y + 82,
        width: 740,
        text: laneLabel,
        fontFamily: brand.fonts.display,
        fill: brand.colors.white,
        startSize: 38,
        minSize: 28,
        maxLines: 2,
        lineHeightFactor: 1.06,
        weight: 700
      });
      const note = laneNote ? renderTextBlock({
        x: x + 36,
        y: y + 136,
        width: 740,
        text: laneNote,
        fontFamily: brand.fonts.body,
        fill: 'rgba(255,255,255,0.86)',
        startSize: 22,
        minSize: 16,
        maxLines: 3,
        lineHeightFactor: 1.36,
        weight: 500
      }) : null;
      return `
        <g>
          <rect x="${x}" y="${y}" width="912" height="156" rx="30" fill="${colors[index % colors.length]}" filter="url(#${id}-card-shadow)" />
          <text x="${x + 36}" y="${y + 46}" font-family="${escapeXml(brand.fonts.utility || brand.fonts.body)}" font-size="14" font-weight="700" letter-spacing="1.7" fill="rgba(255,255,255,0.72)">LANE ${index + 1}</text>
          ${title.markup}
          ${note ? note.markup : ''}
        </g>`;
    }).join('');

    const title = renderTextBlock({
      x: 84,
      y: wide ? 214 : 192,
      width: wide ? 318 : 820,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: wide ? 58 : 82,
      minSize: wide ? 42 : 56,
      maxLines: wide ? 4 : 3,
      lineHeightFactor: 1.05,
      weight: 700
    });
    const deck = renderTextBlock({
      x: 84,
      y: (wide ? 234 : 214) + title.height,
      width: wide ? 318 : 760,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: wide ? 22 : 28,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.42,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="48" y="48" width="${dims.width - 96}" height="${dims.height - 96}" rx="32" fill="rgba(246,241,232,0.94)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${renderTopRail({ x: 84, y: 84, width: dims.width - 168, left: brand.name, right: 'Choose your lane' })}
  ${renderChip(84, wide ? 138 : 124, asset.kicker, { fill: brand.colors.pinot, text: brand.colors.white, stroke: 'rgba(107,60,72,0.22)' })}
  ${title.markup}
  ${deck.markup}
  ${cards}
  ${renderFooter({ x: 84, y: dims.height - 124, width: dims.width - 168, right: 'Editorial comparison' })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
  }

  const href = imageHrefFor(context.outputPath, asset.image);

  if (wide) {
    const image = renderImageBlock({
      id,
      href,
      x: 620,
      y: 54,
      width: 514,
      height: 520,
      radius: 28,
      overlay: 'none',
      imagePosition: asset.imagePosition,
      stroke: 'rgba(255,255,255,0.22)'
    });
    const title = renderTextBlock({
      x: 86,
      y: 246,
      width: 440,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.ink,
      startSize: 58,
      minSize: 40,
      maxLines: 3,
      lineHeightFactor: 1.06,
      weight: 700
    });
    const deck = renderTextBlock({
      x: 86,
      y: 268 + title.height,
      width: 414,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: brand.colors.stone,
      startSize: 23,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.4,
      weight: 500
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  <rect x="54" y="54" width="526" height="520" rx="30" fill="rgba(251,247,240,0.96)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${image.markup}
  ${renderTopRail({ x: 86, y: 88, width: 414, left: brand.name, right: 'Weekend lane' })}
  ${renderChip(86, 144, asset.lane ?? asset.kicker ?? 'Lane', { fill: brand.colors.fog, text: brand.colors.ink, stroke: 'rgba(174,184,183,0.4)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 86, y: 520, width: 414, right: day.label })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
  }

  const image = renderImageBlock({
    id,
    href,
    x: 72,
    y: 54,
    width: dims.width - 144,
    height: 720,
    radius: 30,
    overlay: 'none',
    imagePosition: asset.imagePosition,
    stroke: 'rgba(255,255,255,0.2)'
  });
  const panelY = 682;
  const title = renderTextBlock({
    x: 136,
    y: panelY + 186,
    width: 700,
    text: asset.title,
    fontFamily: brand.fonts.display,
    fill: brand.colors.ink,
    startSize: 70,
    minSize: 50,
    maxLines: 3,
    lineHeightFactor: 1.06,
    weight: 700
  });
  const deck = renderTextBlock({
    x: 136,
    y: panelY + 208 + title.height,
    width: 666,
    text: asset.deck,
    fontFamily: brand.fonts.body,
    fill: brand.colors.stone,
    startSize: 27,
    minSize: 18,
    maxLines: 4,
    lineHeightFactor: 1.42,
    weight: 500
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  ${renderPaperBackground(id, dims.width, dims.height)}
  ${image.markup}
  <rect x="108" y="${panelY}" width="864" height="518" rx="36" fill="rgba(251,247,240,0.97)" stroke="rgba(31,32,28,0.08)" filter="url(#${id}-paper-shadow)" />
  ${renderTopRail({ x: 136, y: panelY + 48, width: 666, left: brand.name, right: 'Weekend lane' })}
  ${renderChip(136, panelY + 92, asset.lane ?? asset.kicker ?? 'Lane', { fill: brand.colors.fog, text: brand.colors.ink, stroke: 'rgba(174,184,183,0.4)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 136, y: panelY + 452, width: 666, right: 'Choose well' })}
  ${renderFrame(dims.width, dims.height, false)}
</svg>`;
}

function atmosphereSingle(day, asset, dims, context) {
  const id = slugify(context.filename.replace('.svg', ''));
  const wide = dims.width > dims.height;
  const href = imageHrefFor(context.outputPath, asset.image);

  if (wide) {
    const image = renderImageBlock({
      id,
      href,
      x: 34,
      y: 34,
      width: dims.width - 68,
      height: dims.height - 68,
      radius: 32,
      overlay: 'side',
      imagePosition: asset.imagePosition,
      stroke: 'rgba(255,255,255,0.22)'
    });
    const title = renderTextBlock({
      x: 84,
      y: 250,
      width: 430,
      text: asset.title,
      fontFamily: brand.fonts.display,
      fill: brand.colors.white,
      startSize: 62,
      minSize: 34,
      maxLines: 4,
      lineHeightFactor: 1.06,
      weight: 700
    });
    const deck = renderTextBlock({
      x: 84,
      y: 276 + title.height,
      width: 392,
      text: asset.deck,
      fontFamily: brand.fonts.body,
      fill: 'rgba(255,255,255,0.84)',
      startSize: 23,
      minSize: 18,
      maxLines: 4,
      lineHeightFactor: 1.4,
      weight: 500
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.ink}" />
  ${image.markup}
  ${renderTopRail({ x: 84, y: 82, width: dims.width - 168, left: brand.name, right: 'Weekend atmosphere', inverse: true })}
  ${renderChip(84, 130, asset.kicker, { fill: 'rgba(246,241,232,0.9)' })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 84, y: dims.height - 92, width: dims.width - 168, right: payload.weekStart, inverse: true })}
  ${renderFrame(dims.width, dims.height, true)}
</svg>`;
  }

  const image = renderImageBlock({
    id,
    href,
    x: 34,
    y: 34,
    width: dims.width - 68,
    height: dims.height - 68,
    radius: 34,
    overlay: 'bottom',
    imagePosition: asset.imagePosition,
    stroke: 'rgba(255,255,255,0.22)'
  });
  const title = renderTextBlock({
    x: 104,
    y: dims.height - 290,
    width: 720,
    text: asset.title,
    fontFamily: brand.fonts.display,
    fill: brand.colors.white,
    startSize: 80,
    minSize: 54,
    maxLines: 3,
    lineHeightFactor: 1.05,
    weight: 700
  });
  const deck = renderTextBlock({
    x: 104,
    y: dims.height - 258 + title.height,
    width: 640,
    text: asset.deck,
    fontFamily: brand.fonts.body,
    fill: 'rgba(255,255,255,0.86)',
    startSize: 26,
    minSize: 18,
    maxLines: 3,
    lineHeightFactor: 1.42,
    weight: 500
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}">
  ${createSharedDefs(id, dims.width, dims.height, image.defs)}
  <rect width="${dims.width}" height="${dims.height}" fill="${brand.colors.ink}" />
  ${image.markup}
  ${renderTopRail({ x: 84, y: 82, width: dims.width - 168, left: brand.name, right: `${day.label} close`, inverse: true })}
  ${renderChip(104, dims.height - 388, asset.kicker, { fill: 'rgba(246,241,232,0.88)', text: brand.colors.ink })}
  ${title.markup}
  ${deck.markup}
  ${renderFooter({ x: 104, y: dims.height - 114, width: 640, right: payload.weekStart, inverse: true })}
  ${renderFrame(dims.width, dims.height, true)}
</svg>`;
}

function renderAsset(day, asset, dims, context) {
  switch (asset.template) {
    case 'editorial-cover':
      return editorialCover(day, asset, dims, context);
    case 'recommendation-hero':
      return recommendationHero(day, asset, dims, context);
    case 'utility-sequence':
      return utilitySequence(day, asset, dims, context);
    case 'editorial-comparison':
      return editorialComparison(day, asset, dims, context);
    case 'atmosphere-single':
      return atmosphereSingle(day, asset, dims, context);
    default:
      throw new Error(`Unknown template: ${asset.template}`);
  }
}

function normalizePlatformHeading(value) {
  const lower = value.trim().toLowerCase();
  if (lower === 'facebook') return 'fb';
  if (lower === 'instagram') return 'ig';
  if (lower === 'linkedin') return 'li';
  return lower;
}

function parseBulletLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^[-–—]{2,}$/.test(line))
    .map((line) => line.replace(/^-\s*/, ''));
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

    const postAngleMatch = body.match(/###\s+Post angle\s+([\s\S]*?)(?=\n###\s|$)/);
    const positioningMatch = body.match(/###\s+Positioning notes\s+([\s\S]*?)(?=\n###\s|$)/);

    const entry = {
      label: heading,
      dayKey,
      postAngle: postAngleMatch ? postAngleMatch[1].trim() : '',
      positioningNotes: positioningMatch ? parseBulletLines(positioningMatch[1]) : [],
      platforms: {}
    };

    const platformRegex = /###\s+(Facebook|Instagram|LinkedIn)\s+\*\*Copy:\*\*\s*([\s\S]*?)(?=\n###\s+(?:Facebook|Instagram|LinkedIn|Positioning notes|Post angle)|$)/g;
    let platformMatch;
    while ((platformMatch = platformRegex.exec(body)) !== null) {
      const platform = normalizePlatformHeading(platformMatch[1]);
      entry.platforms[platform] = platformMatch[2].trim();
    }

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
        assets: assets.map((asset) => ({
          title: asset.title,
          filename: asset.filename,
          ratio: asset.ratio,
          template: asset.template,
          previewPath: asset.previewPath,
          filePath: asset.filePath
        }))
      };
    }

    return {
      day: day.day,
      label: day.label,
      concept: day.concept,
      templateFamily: day.templateFamily,
      postAngle: copy.postAngle,
      positioningNotes: copy.positioningNotes,
      platforms
    };
  });
}

function renderCaptionHtml(copy) {
  if (!copy) return '<span class="empty-copy">Copy not available</span>';
  return escapeHtml(copy);
}

function renderReviewBoard(manifest, publishingData) {
  const nav = publishingData
    .map((day) => `<a href="#day-${escapeHtml(day.day)}">${escapeHtml(day.label)}</a>`)
    .join('');

  const daySections = publishingData.map((day) => {
    const platformCards = platformOrder
      .filter((platform) => day.platforms[platform])
      .map((platform) => {
        const entry = day.platforms[platform];
        const copyId = `copy-${day.day}-${platform}`;
        const assetsId = `assets-${day.day}-${platform}`;
        const thumbs = entry.assets.length
          ? entry.assets.map((asset, index) => `
            <a class="thumb" href="${escapeHtml(asset.previewPath)}" target="_blank" rel="noreferrer">
              <span class="thumb-index">${index + 1}</span>
              <img src="${escapeHtml(asset.previewPath)}" alt="${escapeHtml(asset.filename)}" loading="lazy" />
              <span class="thumb-name">${escapeHtml(asset.title)}</span>
            </a>`).join('')
          : '<div class="thumb thumb-empty"><span>No artwork mapped</span></div>';

        const assetList = entry.assets.map((asset) => asset.filename).join('\n');
        return `
          <article class="platform-card">
            <div class="platform-card-head">
              <div>
                <div class="eyebrow">${escapeHtml(platformMeta[platform].label)} review</div>
                <h3>${escapeHtml(day.label)} · ${escapeHtml(titleCase(day.concept))}</h3>
              </div>
              <div class="platform-stats">${entry.assets.length} asset${entry.assets.length === 1 ? '' : 's'}</div>
            </div>
            <div class="platform-body">
              <div class="visual-column ${entry.assets.length <= 2 ? 'compact' : ''}">
                <div class="thumb-grid count-${Math.min(entry.assets.length || 1, 5)}">${thumbs}</div>
              </div>
              <aside class="copy-column">
                <section class="copy-card">
                  <div class="copy-card-head">
                    <div>
                      <div class="eyebrow">Caption</div>
                      <h4>${escapeHtml(platformMeta[platform].label)} copy</h4>
                    </div>
                    <button type="button" data-copy-target="${copyId}">Copy caption</button>
                  </div>
                  <pre id="${copyId}">${renderCaptionHtml(entry.copy)}</pre>
                </section>
                <section class="copy-card meta-card">
                  <div class="copy-card-head">
                    <div>
                      <div class="eyebrow">Publishing handoff</div>
                      <h4>Asset filenames</h4>
                    </div>
                    <button type="button" data-copy-target="${assetsId}">Copy list</button>
                  </div>
                  <pre id="${assetsId}">${escapeHtml(assetList || 'No assets')}</pre>
                </section>
              </aside>
            </div>
          </article>`;
      }).join('');

    const notes = day.positioningNotes.length
      ? `<ul class="notes-list">${day.positioningNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
      : '<p class="notes-empty">No positioning notes captured.</p>';

    return `
      <section class="day-section" id="day-${escapeHtml(day.day)}">
        <header class="day-header">
          <div>
            <div class="eyebrow">${escapeHtml(day.label)}</div>
            <h2>${escapeHtml(titleCase(day.concept))}</h2>
            <p class="post-angle">${escapeHtml(day.postAngle || 'No post angle supplied.')}</p>
          </div>
          <div class="day-meta-stack">
            <span class="tag">${escapeHtml(day.templateFamily)}</span>
            <span class="tag muted">${Object.keys(day.platforms).length} platform views</span>
          </div>
        </header>
        <div class="day-notes-shell">
          <div class="notes-card">
            <div class="eyebrow">Positioning notes</div>
            ${notes}
          </div>
        </div>
        <div class="platform-stack">${platformCards}</div>
      </section>`;
  }).join('');

  const blockerMarkup = blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.title)} · ${escapeHtml(payload.weekStart)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: ${brand.colors.paper};
      --cream: ${brand.colors.cream};
      --ink: ${brand.colors.ink};
      --stone: ${brand.colors.stone};
      --pinot: ${brand.colors.pinot};
      --olive: ${brand.colors.olive};
      --fog: ${brand.colors.fog};
      --mist: ${brand.colors.mist ?? '#D5DDD9'};
      --clay: ${brand.colors.clay ?? '#C7B6A3'};
      --shadow: rgba(18, 20, 17, 0.12);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: 'Manrope', ${brand.fonts.body};
      background:
        radial-gradient(circle at top left, rgba(199, 182, 163, 0.26), transparent 34%),
        linear-gradient(180deg, #f6f0e7 0%, #efe7dc 100%);
    }

    a { color: inherit; }
    main {
      max-width: 1560px;
      margin: 0 auto;
      padding: 32px 28px 72px;
    }

    .hero {
      position: sticky;
      top: 0;
      z-index: 8;
      margin-bottom: 28px;
      padding: 24px 28px 20px;
      border-radius: 28px;
      background: rgba(251, 247, 240, 0.84);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(31, 32, 28, 0.08);
      box-shadow: 0 18px 48px rgba(19, 21, 18, 0.08);
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }

    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--stone);
      font-weight: 800;
    }

    h1, h2, h3, h4, p { margin: 0; }
    h1, h2, h3, h4 {
      font-family: 'Cormorant Garamond', ${brand.fonts.display};
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    h1 {
      margin-top: 10px;
      font-size: clamp(2.6rem, 4.4vw, 4.8rem);
      line-height: 0.94;
      max-width: 10ch;
    }

    .hero-copy {
      max-width: 72ch;
      margin-top: 12px;
      color: var(--stone);
      line-height: 1.7;
      font-size: 0.98rem;
    }

    .hero-metrics {
      min-width: 260px;
      display: grid;
      gap: 12px;
    }

    .metric-card {
      padding: 16px 18px;
      border-radius: 18px;
      background: rgba(255,255,255,0.58);
      border: 1px solid rgba(31,32,28,0.06);
    }

    .metric-card strong {
      display: block;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.04em;
    }

    .nav-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .nav-row a, .tag {
      text-decoration: none;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.62);
      border: 1px solid rgba(31,32,28,0.08);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tag.muted {
      color: var(--stone);
      background: rgba(255,255,255,0.3);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 18px;
      margin-top: 18px;
    }

    .summary-card {
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(255,255,255,0.46);
      border: 1px solid rgba(31,32,28,0.06);
    }

    .summary-card ul {
      margin: 12px 0 0;
      padding-left: 18px;
      color: var(--stone);
      line-height: 1.6;
    }

    .day-section {
      margin-top: 28px;
      padding: 28px;
      border-radius: 30px;
      background: rgba(251,247,240,0.64);
      border: 1px solid rgba(31,32,28,0.06);
      box-shadow: 0 14px 40px rgba(18,20,17,0.05);
    }

    .day-header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .day-header h2 {
      margin-top: 8px;
      font-size: clamp(2.1rem, 3.4vw, 3.4rem);
      text-transform: capitalize;
      line-height: 0.96;
    }

    .post-angle {
      margin-top: 10px;
      max-width: 64ch;
      color: var(--stone);
      line-height: 1.7;
    }

    .day-meta-stack {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .notes-card {
      margin-bottom: 18px;
      padding: 18px 20px;
      border-radius: 22px;
      background: linear-gradient(145deg, rgba(255,255,255,0.72), rgba(246,241,232,0.82));
      border: 1px solid rgba(31,32,28,0.06);
    }

    .notes-list {
      margin: 10px 0 0;
      padding-left: 18px;
      line-height: 1.6;
      color: var(--stone);
    }

    .notes-empty { margin-top: 10px; color: var(--stone); }
    .platform-stack { display: grid; gap: 18px; }

    .platform-card {
      padding: 22px;
      border-radius: 26px;
      background: rgba(255,255,255,0.74);
      border: 1px solid rgba(31,32,28,0.08);
      box-shadow: 0 14px 32px rgba(18,20,17,0.05);
    }

    .platform-card-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .platform-card-head h3 {
      margin-top: 6px;
      font-size: 1.75rem;
      line-height: 0.98;
    }

    .platform-stats {
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(246,241,232,0.9);
      border: 1px solid rgba(31,32,28,0.08);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .platform-body {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: 18px;
      align-items: start;
    }

    .thumb-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .thumb-grid.count-1 { grid-template-columns: 1fr; }
    .thumb-grid.count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .thumb-grid.count-3,
    .thumb-grid.count-4,
    .thumb-grid.count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .thumb {
      position: relative;
      display: grid;
      gap: 10px;
      padding: 12px;
      text-decoration: none;
      border-radius: 22px;
      background: rgba(246,241,232,0.66);
      border: 1px solid rgba(31,32,28,0.07);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      box-shadow: 0 10px 22px rgba(18,20,17,0.05);
    }

    .thumb:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(18,20,17,0.08);
    }

    .thumb img {
      width: 100%;
      border-radius: 14px;
      display: block;
      background: var(--cream);
    }

    .thumb-index {
      position: absolute;
      top: 20px;
      left: 20px;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: rgba(31,32,28,0.72);
      color: white;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 800;
      z-index: 1;
    }

    .thumb-name {
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--stone);
      min-height: 2.7em;
    }

    .thumb-empty {
      place-items: center;
      min-height: 220px;
      color: var(--stone);
    }

    .copy-column {
      display: grid;
      gap: 14px;
    }

    .copy-card {
      padding: 18px;
      border-radius: 22px;
      background: linear-gradient(145deg, rgba(255,255,255,0.92), rgba(246,241,232,0.86));
      border: 1px solid rgba(31,32,28,0.07);
    }

    .copy-card-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .copy-card-head h4 {
      margin-top: 6px;
      font-size: 1.38rem;
      line-height: 0.98;
    }

    button {
      appearance: none;
      border: 0;
      border-radius: 999px;
      background: var(--ink);
      color: white;
      padding: 10px 14px;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      font-family: 'Manrope', ${brand.fonts.body};
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--ink);
    }

    .meta-card pre {
      font-size: 0.82rem;
      color: var(--stone);
      line-height: 1.6;
    }

    .empty-copy { color: var(--stone); }

    @media (max-width: 1100px) {
      .hero { position: static; }
      .hero-top, .summary-grid, .platform-body { grid-template-columns: 1fr; display: grid; }
      .day-header, .platform-card-head { flex-direction: column; }
      .day-meta-stack { justify-content: flex-start; }
    }

    @media (max-width: 760px) {
      main { padding: 18px 14px 48px; }
      .hero, .day-section, .platform-card { padding: 18px; border-radius: 22px; }
      .thumb-grid { grid-template-columns: 1fr; }
      .nav-row { gap: 8px; }
      .nav-row a, .tag { font-size: 0.7rem; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="hero-top">
        <div>
          <div class="eyebrow">Peninsula Insider · Weekly social review board</div>
          <h1>Week of ${escapeHtml(payload.weekStart)}</h1>
          <p class="hero-copy">Premium editorial social system across five template families, with artwork review and platform copy side by side so each post can be checked and published without hopping between documents.</p>
        </div>
        <div class="hero-metrics">
          <div class="metric-card"><span class="eyebrow">Assets</span><strong>${manifest.assetCount}</strong><span>SVG exports across IG, Facebook, and LinkedIn</span></div>
          <div class="metric-card"><span class="eyebrow">Publishing handoff</span><strong>Ready</strong><span>See <code>publishing/</code> for copy-and-paste platform sheets</span></div>
        </div>
      </div>
      <div class="nav-row">${nav}</div>
      <div class="summary-grid">
        <section class="summary-card">
          <div class="eyebrow">What improved</div>
          <ul>
            <li>Quieter, more editorial art direction with richer paper, framing, and image treatment.</li>
            <li>One review board that pairs every platform caption with its matching creative set.</li>
            <li>Publishing handoff files by platform, plus a structured captions JSON export.</li>
          </ul>
        </section>
        <section class="summary-card">
          <div class="eyebrow">Known upgrade slots</div>
          <ul>${blockerMarkup}</ul>
        </section>
      </div>
    </section>
    ${daySections}
  </main>
  <script>
    document.querySelectorAll('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.dataset.copyTarget);
        if (!target) return;
        const text = target.textContent || '';
        try {
          await navigator.clipboard.writeText(text.trim());
          const original = button.textContent;
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = original; }, 1200);
        } catch (error) {
          console.error(error);
        }
      });
    });
  </script>
</body>
</html>`;
}

function renderPublishingMarkdown(platform, publishingData) {
  const label = platformMeta[platform].label;
  const lines = [
    `# Peninsula Insider ${label} publishing sheet`,
    '',
    `**Week of:** ${payload.weekStart}`,
    `**Generated from:** tools/social-assets/render.js`,
    ''
  ];

  for (const day of publishingData) {
    const entry = day.platforms[platform];
    if (!entry) continue;

    lines.push(`## ${day.label} — ${day.concept}`);
    if (day.postAngle) {
      lines.push('', '**Post angle:**', day.postAngle, '');
    }
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
  return `# Publishing handoff\n\nThis folder contains copy-ready posting sheets exported from the weekly social system.\n\n## Files\n\n- \`captions.json\` structured platform/day caption data\n- \`instagram.md\` Instagram posting sheet\n- \`facebook.md\` Facebook posting sheet\n- \`linkedin.md\` LinkedIn posting sheet\n\nUse these alongside the review board in \`../index.html\` for final QA and publishing.\n`;
}

function renderReadme(manifest) {
  const dayLines = Object.values(manifest.days)
    .map((day) => `- **${day.label}** · ${day.assets.length} assets · ${day.templateFamily}`)
    .join('\n');

  return `# Peninsula Insider weekly social pack\n\n**Week of:** ${payload.weekStart}  \n**Status:** Premium editorial source system and SVG export set  \n**Source payload:** \`tools/social-assets/examples/${path.basename(payloadPath)}\`  \n**Renderer:** \`tools/social-assets/render.js\`\n\n## What is here\n\n- \`masters/\` pinned source inputs used for this run\n- \`exports/ig\` Instagram 4:5 feed assets\n- \`exports/fb\` Facebook adaptations\n- \`exports/li\` LinkedIn adaptations\n- \`publishing/\` copy-and-paste platform handoff sheets\n- \`manifest.json\` asset manifest with metadata\n- \`posting-manifest.json\` day/platform posting sheet\n- \`index.html\` premium review board with captions beside creative\n- \`source-images/manifest.json\` image usage map\n\n## Production system\n\nThis weekly pack is built as one coherent editorial system across five template families:\n\n1. Editorial cover\n2. Recommendation hero\n3. Utility sequence\n4. Editorial comparison\n5. Atmosphere single\n\n## Asset count\n\n- **Total assets:** ${manifest.assetCount}\n- **Instagram:** ${manifest.platformCounts.ig || 0}\n- **Facebook:** ${manifest.platformCounts.fb || 0}\n- **LinkedIn:** ${manifest.platformCounts.li || 0}\n\n## Day breakdown\n\n${dayLines}\n\n## Re-render\n\nRun from repo root:\n\n\`\`\`bash\nnode tools/social-assets/render.js\n\`\`\`\n\nThen open \`social/week-of-${payload.weekStart}/index.html\` for review, or use \`social/week-of-${payload.weekStart}/publishing/\` for copy handoff.\n\n## Known upgrade slots\n\n${blockers.map((item) => `- ${item}`).join('\n')}\n`;
}

ensureDir(outputRoot);
ensureDir(mastersRoot);
ensureDir(exportsRoot);
ensureDir(sourceImagesRoot);
ensureDir(publishingRoot);

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
  const copy = getCopyData(day);

  manifest.days[day.day] = {
    label: day.label,
    concept: day.concept,
    templateFamily: day.templateFamily,
    postAngle: copy.postAngle,
    positioningNotes: copy.positioningNotes,
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
    const assetManifestEntry = {
      filename,
      filePath: path.relative(repoRoot, outputPath).split(path.sep).join('/'),
      previewPath,
      title: asset.title,
      template: asset.template,
      platform: asset.platform,
      ratio: asset.ratio,
      captionRef: day.captionRef,
      image: asset.image || null
    };

    manifest.days[day.day].assets.push(assetManifestEntry);

    postingManifest.push({
      day: day.label,
      daySlug: day.day,
      concept: day.concept,
      platform: asset.platform,
      ratio: asset.ratio,
      filename,
      path: path.relative(repoRoot, outputPath).split(path.sep).join('/'),
      captionRef: day.captionRef,
      template: asset.template,
      copy: copy.platforms?.[asset.platform] ?? ''
    });

    if (asset.image) {
      const imageEntry = sourceImages.get(asset.image) || { image: asset.image, usedBy: [] };
      imageEntry.usedBy.push(filename);
      sourceImages.set(asset.image, imageEntry);
    }
  }
}

const publishingData = buildPublishingData(manifest);
const captionsJson = {
  weekStart: payload.weekStart,
  generatedAt: new Date().toISOString(),
  days: publishingData
};

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
