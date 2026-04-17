#!/usr/bin/env node
/**
 * Extract the final large assistant-message text from a Claude sub-agent JSONL
 * transcript and write it verbatim to a target file.
 *
 * Usage: node extract-agent-output.mjs <jsonl-path> <target-path>
 *
 * Strategy:
 *   1. Stream the JSONL line-by-line (don't load into memory if huge).
 *   2. For each line, JSON.parse it. Look at any assistant message content.
 *   3. Keep a running record of the LARGEST assistant-text payload seen.
 *   4. Once done, clean up: strip preamble/epilogue so only the markdown body
 *      (from the first `---` frontmatter fence through the final italicised
 *      signature line) is written.
 *   5. Report only size/line-count stats to stdout — never the content.
 */
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const [, , src, dst] = process.argv;
if (!src || !dst) {
  console.error('usage: node extract-agent-output.mjs <jsonl> <target>');
  process.exit(2);
}

const rl = createInterface({ input: createReadStream(src, 'utf8'), crlfDelay: Infinity });

/**
 * Pull any human-readable text out of a parsed JSONL entry. Iterative walk,
 * collects every string found in a `text` field anywhere in the tree.
 */
function textsFrom(obj) {
  const out = [];
  const seen = new Set();
  const stack = [obj];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== 'object' || seen.has(n)) continue;
    seen.add(n);
    if (typeof n.text === 'string') out.push(n.text);
    if (Array.isArray(n)) { stack.push(...n); continue; }
    for (const v of Object.values(n)) if (v && typeof v === 'object') stack.push(v);
  }
  return out;
}

let best = '';
let bestLine = 0;
let parsedLines = 0;
let totalLines = 0;
let skipped = 0;

for await (const line of rl) {
  totalLines++;
  if (!line.trim()) continue;
  let obj;
  try { obj = JSON.parse(line); } catch { skipped++; continue; }
  parsedLines++;
  for (const t of textsFrom(obj)) {
    if (typeof t === 'string' && t.length > best.length) {
      best = t;
      bestLine = totalLines;
    }
  }
}

if (!best) {
  console.error('no text payloads found in transcript');
  process.exit(1);
}

// Trim to the actual deliverable: start at the first `---` frontmatter fence,
// end at the final signature line (italicised and starts with "Document prepared").
const firstFrontmatter = best.indexOf('---');
if (firstFrontmatter > 0) best = best.slice(firstFrontmatter);

// Find the last "Document prepared" line and keep through its closing `*`.
const sigIdx = best.lastIndexOf('Document prepared');
if (sigIdx > -1) {
  // Find closing `*` after the signature
  const closingStar = best.indexOf('*', sigIdx + 'Document prepared'.length);
  if (closingStar > -1) best = best.slice(0, closingStar + 1);
}

writeFileSync(dst, best, 'utf8');

const lineCount = best.split('\n').length;
const bytes = Buffer.byteLength(best, 'utf8');
console.log(`jsonl lines read: ${totalLines} (parsed: ${parsedLines}, skipped: ${skipped})`);
console.log(`largest text payload at line: ${bestLine}`);
console.log(`target written: ${dst}`);
console.log(`  bytes: ${bytes} (${(bytes / 1024).toFixed(1)} KB)`);
console.log(`  lines: ${lineCount}`);
console.log(`  first line: ${best.split('\n')[0]}`);
const lastNonEmpty = best.split('\n').filter(l => l.trim()).slice(-1)[0] ?? '';
console.log(`  last line:  ${lastNonEmpty.slice(0, 140)}${lastNonEmpty.length > 140 ? '…' : ''}`);
