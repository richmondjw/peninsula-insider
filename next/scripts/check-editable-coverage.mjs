#!/usr/bin/env node
/**
 * CMS / card integrity smoke-check.
 *
 * Kept intentionally lightweight: this runs in deploy.yml before the site
 * build, so it should catch obvious convention drift without becoming a
 * brittle parser for Astro templates.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'next', 'src');
const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if (/\.(astro|tsx?|jsx?)$/.test(entry)) out.push(path);
  }
  return out;
}

function rel(path) {
  return relative(root, path);
}

function lineFor(text, index) {
  return text.slice(0, index).split('\n').length;
}

for (const file of walk(srcRoot)) {
  const text = readFileSync(file, 'utf8');

  // Literal inline-editor elements should be entity-scoped. Most production
  // uses flow through editableText()/editableImage(), which generate these
  // attrs dynamically; this only catches hand-written static attrs.
  for (const match of text.matchAll(/<[^>]+\bdata-pi-edit\b[\s=>][^>]*>/g)) {
    const block = match[0];
    for (const required of ['data-pi-entity-type', 'data-pi-entity-slug', 'data-pi-field-path']) {
      if (!block.includes(required)) {
        errors.push(`${rel(file)}:${lineFor(text, match.index ?? 0)} data-pi-edit missing ${required}`);
      }
    }
  }

  // Card-level Save/Share affordances need stable identity fields. This is
  // deliberately structural rather than semantic: Astro expressions are often
  // dynamic, but the props themselves must be present.
  if (file.endsWith('Card.astro') && text.includes('<PiSaveActions')) {
    const blocks = [...text.matchAll(/<PiSaveActions[\s\S]*?(?:\/>|>)/g)];
    blocks.forEach((match, i) => {
      const block = match[0];
      for (const prop of ['kind', 'slug', 'title', 'href']) {
        if (!new RegExp(`\\b${prop}=`).test(block)) {
          errors.push(`${rel(file)}:${lineFor(text, match.index ?? 0)} PiSaveActions #${i + 1} missing ${prop}`);
        }
      }
    });
  }

  // Guard against malformed saved/share links such as //journal/foo.
  let hrefIdx = 0;
  while ((hrefIdx = text.indexOf('data-pi-href="//', hrefIdx)) !== -1) {
    errors.push(`${rel(file)}:${lineFor(text, hrefIdx)} malformed data-pi-href starts with //`);
    hrefIdx += 'data-pi-href'.length;
  }
}

if (errors.length) {
  console.error('Editable/card coverage check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Editable/card coverage check passed.');
