const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'social/week-of-2026-04-20';
const repoRoot = '/home/node/.openclaw/workspace/peninsula-insider';
const absRoot = path.join(repoRoot, root);

const targets = [
  ['ig', path.join(absRoot, 'exports/ig'), path.join(absRoot, 'exports-png/ig')],
  ['fb', path.join(absRoot, 'exports/fb'), path.join(absRoot, 'exports-png/fb')],
  ['li', path.join(absRoot, 'exports/li'), path.join(absRoot, 'exports-png/li')],
];

function getDimensions(svg) {
  const widthMatch = svg.match(/width="(\d+(?:\.\d+)?)"/i);
  const heightMatch = svg.match(/height="(\d+(?:\.\d+)?)"/i);
  return {
    width: widthMatch ? Math.round(parseFloat(widthMatch[1])) : 1080,
    height: heightMatch ? Math.round(parseFloat(heightMatch[1])) : 1350,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [, inputDir, outputDir] of targets) {
    fs.mkdirSync(outputDir, { recursive: true });
    const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.svg')).sort();

    for (const file of files) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file.replace(/\.svg$/i, '.png'));
      const svg = fs.readFileSync(inputPath, 'utf8');
      const { width, height } = getDimensions(svg);
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${svg}</body></html>`, { waitUntil: 'load' });
      await page.screenshot({ path: outputPath, omitBackground: true });
    }
  }

  await browser.close();
  console.log(`Browser PNG export complete for ${root}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
