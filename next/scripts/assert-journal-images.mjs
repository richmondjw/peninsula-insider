#!/usr/bin/env node
/** Publication gate: a Journal image slot may never silently disappear. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { parse } from 'parse5';
import { isJournalEditorial } from '../src/lib/journal-curation.mjs';
import { imageAvailable } from '../src/lib/journal-image-availability.mjs';
import { journalIllustration } from '../src/lib/journal-image-policy.mjs';

const next = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const directory = path.join(next, 'src/content/articles');
let records = 0;
for (const file of fs.readdirSync(directory).filter(f => /\.mdx?$/.test(f))) {
  const text = fs.readFileSync(path.join(directory, file), 'utf8');
  const data = YAML.parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
  if (!isJournalEditorial(data)) continue;
  records++;
  if (!imageAvailable(data.heroImage?.src)) problems.push(`${file}: missing article image ${data.heroImage?.src ?? '(none)'}`);
}
const registry = JSON.parse(fs.readFileSync(path.join(next, 'src/data/visit-victoria-page-images.json'))).images;
for (const theme of ['art', 'wine', 'food', 'stay', 'boating', 'coast']) {
  const image = registry[`journal-fallback-${theme}`];
  if (!imageAvailable(image?.src) || !image?.alt?.trim() || !image?.credit?.trim() || !image?.caption?.trim()) problems.push(`unusable Journal fallback: ${theme}`);
}
if (!imageAvailable(journalIllustration.src)) problems.push('original Journal illustration is missing');

let slots = 0;
if (!process.argv.includes('--source-only')) {
  const dist = path.join(next, 'dist');
  function inspect(file) {
    const root = parse(fs.readFileSync(file, 'utf8'));
    function walk(node) {
      const attrs = Object.fromEntries((node.attrs ?? []).map(a => [a.name, a.value]));
      const children = node.childNodes ?? [];
      function images(n) { return n.tagName === 'img' ? [n] : (n.childNodes ?? []).flatMap(images); }
      if ((attrs.class ?? '').split(/\s+/).some(c => ['story', 'article-hero__figure'].includes(c)) && images(node).length === 0) problems.push(`${path.relative(dist, file)}: blank Journal story image`);
      if (node.tagName === 'img' && Object.hasOwn(attrs, 'data-journal-image')) {
        slots++;
        if (!imageAvailable(attrs.src, dist)) problems.push(`${path.relative(dist, file)}: missing built image ${attrs.src}`);
        if (!attrs.alt?.trim() && attrs.role !== 'presentation') problems.push(`${path.relative(dist, file)}: image has no alt text`);
        let recovery;
        try { recovery = JSON.parse(attrs['data-journal-recovery']); } catch {}
        if (!recovery?.some(r => r.src.split(/[?#]/)[0] === journalIllustration.src)) problems.push(`${path.relative(dist, file)}: image has no illustration recovery`);
      }
      children.forEach(walk);
    }
    walk(root);
  }
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) inspect(file);
    }
  }
  walk(path.join(dist, 'journal'));
  if (slots === 0) problems.push('no rendered Journal image slots');
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Journal image gate passed: ${records} editorial records${slots ? `, ${slots} rendered image slots` : ''}, 6 licensed fallbacks and original illustration.`);
