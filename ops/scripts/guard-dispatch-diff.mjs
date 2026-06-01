#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  args.set(arg.slice(2), process.argv[i + 1]);
  i += 1;
}

const base = args.get('base');
const head = args.get('head') || 'HEAD';
if (!base) {
  console.error('Usage: node ops/scripts/guard-dispatch-diff.mjs --base <sha> [--head <sha>]');
  process.exit(2);
}

const diff = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const dispatchSignals = [
  /^next\/src\/content\/articles\/peninsula-this-weekend-[^/]+\.md$/,
  /^reports\/peninsula-this-weekend-[^/]+\.md$/,
  /^next\/src\/content\/events\/[^/]+\.json$/,
];

const allowed = [
  /^next\/src\/content\/articles\/peninsula-this-weekend-[^/]+\.md$/,
  /^next\/src\/content\/events\/[^/]+\.json$/,
  /^reports\/peninsula-this-weekend-[^/]+\.md$/,
];

const dispatchTouched = diff.some((file) => dispatchSignals.some((pattern) => pattern.test(file)));
if (!dispatchTouched) {
  console.log('No Peninsula This Weekend dispatch files changed; guard is not active.');
  process.exit(0);
}

const blocked = diff.filter((file) => !allowed.some((pattern) => pattern.test(file)));
if (blocked.length > 0) {
  console.error('Dispatch/content update contains non-dispatch files:');
  for (const file of blocked) console.error(`  - ${file}`);
  console.error('');
  console.error('A dispatch update must not touch generated HTML, global CSS, templates, components, image wiring, or deploy output.');
  process.exit(1);
}

console.log(`Dispatch diff guard passed for ${diff.length} file(s).`);
