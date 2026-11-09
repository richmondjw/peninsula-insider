#!/usr/bin/env node
/**
 * normalise-image-captions.mjs - rewrite stored image captions to the
 * caption rule in src/lib/image-caption.mjs (James, 9 November 2026).
 *
 * Edits caption strings in place: JSON content and data files by exact
 * string replacement (formatting untouched), Markdown frontmatter by line.
 * A caption that reduces to nothing is removed. Dry run by default; --write
 * applies. Idempotent: a second run changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cleanCaption } from '../src/lib/image-caption.mjs';

const write = process.argv.includes('--write');
const roots = ['src/content', 'src/data'];
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(json|mdx?)$/.test(entry.name)) files.push(p);
  }
};
roots.filter((r) => fs.existsSync(r)).forEach(walk);

let changed = 0;
let removed = 0;
let filesTouched = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  if (file.endsWith('.json')) {
    // "caption": "<json string>" plus an optional trailing comma
    after = before.replace(/(\n?[ \t]*)"caption":\s*("(?:[^"\\]|\\.)*")(\s*,)?/g, (m, lead, quoted, comma) => {
      const value = JSON.parse(quoted);
      const next = cleanCaption(value);
      if (next === value) return m;
      if (next) { changed++; return `${lead}"caption": ${JSON.stringify(next)}${comma ?? ''}`; }
      removed++;
      return `${lead}"caption": ""${comma ?? ''}`;
    });
  } else {
    const fm = before.match(/^---\r?\n[\s\S]*?\r?\n---/);
    if (fm) {
      const block = fm[0].replace(/^([ \t]*)caption:[ \t]*(.*)$/gm, (m, indent, rest) => {
        const value = rest.trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\"/g, '"');
        const next = cleanCaption(value);
        if (next === value) return m;
        if (next) { changed++; return `${indent}caption: ${JSON.stringify(next)}`; }
        removed++;
        return `${indent}caption: ""`;
      });
      after = before.replace(fm[0], block);
    }
  }
  if (after !== before) {
    filesTouched++;
    if (write) fs.writeFileSync(file, after);
  }
}
console.log(`${write ? 'wrote' : 'dry run'}: ${changed} captions shortened, ${removed} cleared, ${filesTouched} files`);
