#!/usr/bin/env node
/**
 * Content admission gate.
 *
 * A content collection can be syntactically valid Markdown yet still be an
 * unpublished agent shell. Catch that explicit failure mode before invoking
 * Astro, then let `astro sync` validate every collection entry against the
 * source-of-truth schema in src/content.config.ts.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const nextRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(nextRoot, 'src', 'content');
const contentExtensions = new Set(['.md', '.mdx', '.json']);
const placeholderPattern = /\[(?:content\s+to\s+be\s+generated|generated\s+by\s+[^\]]+\s+for\s+task)\b[^\]]*\]/i;

async function contentFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return contentFiles(path);
    return contentExtensions.has(extname(entry.name).toLowerCase()) ? [path] : [];
  }));
  return nested.flat();
}

const files = await contentFiles(contentRoot);
const placeholders = [];
for (const file of files) {
  const body = await readFile(file, 'utf8');
  if (placeholderPattern.test(body)) placeholders.push(file);
}

if (placeholders.length) {
  console.error('Content admission failed: placeholder content is never publishable.');
  for (const file of placeholders) console.error(`  - ${file}`);
  process.exit(1);
}

const astro = join(nextRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');
if (!existsSync(astro)) {
  console.error('Content admission failed: local Astro binary is unavailable; run npm ci.');
  process.exit(1);
}

// `sync` loads and validates content collections without failing on unrelated
// page-level TypeScript diagnostics (which belong to the full build gate).
const result = spawnSync(astro, ['sync'], { cwd: nextRoot, stdio: 'inherit' });
process.exit(result.status ?? 1);
