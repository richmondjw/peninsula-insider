import { copyFile, mkdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const files = [
  'sora-400.woff2',
  'sora-600.woff2',
  'sora-700.woff2',
  'sora-800.woff2',
  'figtree-400.woff2',
  'figtree-600.woff2',
  'figtree-700.woff2',
];

const sourceRoot = resolve(process.env.PI_FONT_SOURCE ?? '../next/public/fonts');
const destinationRoot = resolve('.public-build/fonts');
await mkdir(destinationRoot, { recursive: true });

for (const file of files) {
  if (basename(file) !== file) throw new Error(`Invalid font allowlist entry: ${file}`);
  await copyFile(resolve(sourceRoot, file), resolve(destinationRoot, file));
}
