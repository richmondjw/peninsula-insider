import { parse } from 'parse5';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Machine instructions belong in /agents/, Markdown, JSON or head metadata.
// Check the entire reader body, including accessibility text and hidden nodes.
export function readerLeaks(html) {
  const failures = new Set();
  const text = [];
  function walk(node, inBody = false) {
    inBody ||= node.tagName === 'body';
    if (['script', 'style', 'template'].includes(node.tagName)) return;
    if (inBody) {
      if (node.nodeName === '#text') text.push(node.value);
      for (const { name, value } of node.attrs || []) {
        if (['aria-label', 'title', 'alt'].includes(name)) text.push(value);
        if (['href', 'action'].includes(name) && /\/(?:agents(?:\/|$)|llms(?:-full)?\.txt(?:$|[?#]))|\/index\.md(?:$|[?#])/.test(value)) failures.add(`Machine resource in reader body: ${value}`);
      }
    }
    for (const child of node.childNodes || []) walk(child, inBody);
  }
  walk(parse(html));
  const copy = text.join(' ').replace(/\s+/g, ' ');
  for (const pattern of [/\bfor\s+(?:ai\s+)?(?:agents|assistants)\b/i, /\b(?:agent|machine)[ -](?:guide|instructions|readable|directory)\b/i, /\bJSON\s+name\s+directory\b/i, /\b(?:system prompt|developer instructions|ignore previous instructions)\b/i]) {
    if (pattern.test(copy)) failures.add(`Agent instructions in reader copy: ${pattern}`);
  }
  return [...failures];
}

export function auditReaderBoundary(dist) {
  let checked = 0;
  const failures = [];
  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      const path = relative(dist, file).replaceAll('\\', '/');
      if (/^(?:agents|admin|dev)\//.test(path)) continue;
      if (entry.isDirectory()) scan(file);
      else if (entry.name.endsWith('.html')) {
        checked++;
        for (const leak of readerLeaks(readFileSync(file, 'utf8'))) failures.push(`${path}: ${leak}`);
      }
    }
  }
  scan(dist);
  if (!checked) throw new Error('Reader boundary checked no HTML pages');
  if (failures.length) throw new Error(failures.join('\n'));
  return checked;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const dist = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist');
  console.log(`Reader boundary passed: ${auditReaderBoundary(dist)} HTML pages`);
}
