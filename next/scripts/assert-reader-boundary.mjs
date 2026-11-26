import { parse } from 'parse5';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Editor chrome is for a signed-in editor in edit mode. A stylesheet may
// generate the empty-slot prompt only under this attribute, which the inline
// editor sets after its allowlist check and no reader page ever carries.
const EDIT_MODE = /\[data-pi-edit-mode=(["']?)on\1\]/;
const PROMPT_TEXT = /\badd\s+(?:an?\s+)?(?:photo|image)s?\b/i;
// Path of the camera icon the empty photo slot draws beside its prompt.
const CAMERA_GLYPH = 'M23 19a2 2 0 0 1-2 2H3';
const CONTENT_VALUE = /(?:^|;)\s*content\s*:((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^;"'])*)/gi;

// The selectors of one rule, each reduced to what sits outside parentheses, so
// `body:not([data-pi-edit-mode="on"]) .slot` does not count as edit mode.
function selectorsOutsideParens(prelude) {
  const parts = [''];
  let parens = 0, brackets = 0;
  for (const c of prelude) {
    if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (parens > 0) continue;
    else if (c === ',' && brackets === 0) parts.push('');
    else {
      if (c === '[') brackets++;
      else if (c === ']') brackets--;
      parts[parts.length - 1] += c;
    }
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Every rule that generates the photo prompt, by generated text or by the
// camera icon, must be scoped to edit mode in each selector it lists. Takes the
// text of any stylesheet: a built .css file or an inline <style> block.
export function editorPromptLeaks(css) {
  const failures = new Set();
  const open = []; // { prelude, declarations } for each block not yet closed
  let buffer = '';
  const close = () => {
    const block = open.pop();
    const declarations = (block.declarations + buffer).replace(/%20/g, ' ');
    buffer = '';
    const text = [...declarations.matchAll(CONTENT_VALUE)].some(([, value]) => PROMPT_TEXT.test(value));
    const icon = declarations.includes(CAMERA_GLYPH);
    if (!text && !icon) return;
    const rules = [...open, block].map(({ prelude }) => prelude).filter((prelude) => prelude && !prelude.startsWith('@'));
    if (rules.some((prelude) => selectorsOutsideParens(prelude).every((part) => EDIT_MODE.test(part)))) return;
    failures.add(`Editor photo prompt outside edit mode: ${rules.at(-1) ?? '(no selector)'} generates ${text ? 'prompt text' : 'the camera icon'}`);
  };
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
    } else if (c === '"' || c === "'") {
      // A string is one token: braces and semicolons inside it are not structure.
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      buffer += css.slice(i, j + 1);
      i = j;
    } else if (c === '{') {
      open.push({ prelude: buffer.trim(), declarations: '' });
      buffer = '';
    } else if (c === '}') {
      if (open.length) close(); else buffer = '';
    } else if (c === ';') {
      if (open.length) open.at(-1).declarations += `${buffer};`;
      buffer = '';
    } else buffer += c;
  }
  while (open.length) close();
  return [...failures];
}

// Machine instructions belong in /agents/, Markdown, JSON or head metadata.
// Check the entire reader body, including accessibility text and hidden nodes.
export function readerLeaks(html) {
  const failures = new Set();
  const text = [];
  const hasPhoto = (node) => node.tagName === 'img' || (node.childNodes || []).some(hasPhoto);
  function walk(node, inBody = false) {
    inBody ||= node.tagName === 'body';
    // Inline stylesheets reach readers exactly as linked ones do.
    if (node.tagName === 'style') for (const leak of editorPromptLeaks((node.childNodes || []).map((child) => child.value ?? '').join(''))) failures.add(leak);
    if (['script', 'style', 'template'].includes(node.tagName)) return;
    if (inBody) {
      if (node.nodeName === '#text') text.push(node.value);
      for (const { name, value } of node.attrs || []) {
        if (['aria-label', 'title', 'alt'].includes(name)) text.push(value);
        if (['href', 'action'].includes(name) && /\/(?:agents(?:\/|$)|llms(?:-full)?\.txt(?:$|[?#]))|\/index\.md(?:$|[?#])/.test(value)) failures.add(`Machine resource in reader body: ${value}`);
      }
      // An empty photo slot is drawn as a plate. One that also holds a
      // photograph paints the plate's wording over it.
      const attr = (name) => (node.attrs || []).find((entry) => entry.name === name)?.value ?? '';
      if (attr('class').split(/\s+/).some((name) => /__hero--placeholder$/.test(name)) && (hasPhoto(node) || /background(?:-image)?\s*:[^;]*url\(/i.test(attr('style')))) {
        failures.add(`Placeholder photo slot also holds a photograph: ${attr('data-pi-entity-type')}/${attr('data-pi-entity-slug')}`);
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
  let stylesheets = 0;
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
      } else if (entry.name.endsWith('.css')) {
        stylesheets++;
        for (const leak of editorPromptLeaks(readFileSync(file, 'utf8'))) failures.push(`${path}: ${leak}`);
      }
    }
  }
  scan(dist);
  if (!checked) throw new Error('Reader boundary checked no HTML pages');
  if (!stylesheets) throw new Error('Reader boundary checked no stylesheets');
  if (failures.length) throw new Error(failures.join('\n'));
  return checked;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const dist = resolve(args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist');
  console.log(`Reader boundary passed: ${auditReaderBoundary(dist)} HTML pages`);
}
