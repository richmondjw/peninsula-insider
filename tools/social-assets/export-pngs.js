import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'social/week-of-2026-04-20';
const repoRoot = '/home/node/.openclaw/workspace/peninsula-insider';
const converter = '/home/node/.openclaw/skills/svg-to-webp/scripts/convert.js';
const targets = [
  ['ig', 'exports/ig', 'exports-png/ig'],
  ['fb', 'exports/fb', 'exports-png/fb'],
  ['li', 'exports/li', 'exports-png/li'],
];

for (const [, inputRel, outputRel] of targets) {
  const inputDir = path.join(repoRoot, root, inputRel);
  const outputDir = path.join(repoRoot, root, outputRel);
  fs.mkdirSync(outputDir, { recursive: true });
  execFileSync('node', [converter, '--input-dir', inputDir, '--output-dir', outputDir, '--format', 'png', '--background', 'transparent'], {
    stdio: 'inherit',
    cwd: repoRoot,
  });
}

console.log(`PNG export complete for ${root}`);
