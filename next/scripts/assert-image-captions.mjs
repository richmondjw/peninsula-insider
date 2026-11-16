#!/usr/bin/env node
/**
 * assert-image-captions.mjs - keep the retired caption dialect out
 * (caption rule: src/lib/image-caption.mjs, James 9 Nov 2026).
 *
 *   1. FAILS: a template, component or library that prints the old disclosure
 *      phrases ("Illustrative image", "does not depict", "Context photo"...).
 *   2. WARNS: a stored caption in src/content or src/data that is not yet in
 *      its short form. Readers never see it (every surface cleans captions at
 *      render time), and failing here would stall the automated event and
 *      journal publishes that write records. Tidy with
 *      `node scripts/normalise-image-captions.mjs --write`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cleanCaption } from '../src/lib/image-caption.mjs';

const failures = [];
const warnings = [];
const same = (a, b) => a.replace(/\.$/, '') === b;
const walk = (dir, test, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== '_archive') walk(p, test, out); }
    else if (test(entry.name)) out.push(p);
  }
  return out;
};

const visit = (node, file) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => visit(n, file)); return; }
  if (typeof node.caption === 'string' && typeof node.src === 'string' && !same(node.caption, cleanCaption(node.caption))) {
    warnings.push(`${file}: caption "${node.caption}" should be "${cleanCaption(node.caption)}"`);
  }
  for (const value of Object.values(node)) visit(value, file);
};

for (const file of walk('src/content', (n) => /\.(json|mdx?)$/.test(n)).concat(walk('src/data', (n) => n.endsWith('.json')))) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    try { visit(JSON.parse(text), file); } catch { /* malformed JSON is another gate's job */ }
    continue;
  }
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  for (const m of fm?.[1].matchAll(/^\s*caption:[ \t]*(.*)$/gm) ?? []) {
    const value = m[1].trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\"/g, '"');
    if (!same(value, cleanCaption(value))) warnings.push(`${file}: caption "${value}" should be "${cleanCaption(value)}"`);
  }
}

const RETIRED = /Illustrative image|Image subject unverified|does not depict|Context photo|This image shows|not a photograph of/;
for (const file of walk('src', (n) => /\.(astro|ts|tsx|mjs)$/.test(n) && !/\.test\./.test(n))) {
  if (file.endsWith(path.join('lib', 'image-caption.mjs'))) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(?:\*|\/\/)/.test(line)) return; // comments may describe the history
    if (RETIRED.test(line)) failures.push(`${file}:${i + 1}: retired caption phrase: ${line.trim().slice(0, 120)}`);
  });
}

if (warnings.length) {
  console.warn(`assert-image-captions: ${warnings.length} stored caption(s) not yet in short form (cleaned at render time)`);
  for (const w of warnings.slice(0, 20)) console.warn(`  ${w}`);
}
if (failures.length) {
  console.error(`assert-image-captions: ${failures.length} problem(s)`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('assert-image-captions: PASS');
