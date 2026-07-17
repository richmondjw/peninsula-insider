// fix-content-schema.mjs
//
// Conservative, deterministic auto-fixer for the two quick-note schema
// breaks the content engine keeps shipping (they hard-fail the deploy's
// astro build):
//   - `tag` set to a section value (e.g. "explore", "cellar-door") instead
//     of a valid quickNotes tag -> defaulted to "editor-note" (a quick note
//     IS an editor's note, so this is always a safe, valid fallback).
//   - `verdict` longer than the 140-char schema cap -> trimmed to a sentence
//     or word boundary at/under 140.
//
// Invoked by the pre-commit hook on staged quick-notes so bad content is
// normalised before it can land on main and block every deploy. Keeps the
// site publishing rather than failing the autonomous run; logs every fix.
// The allowed set mirrors src/content.config quickNotes `tag` enum - keep in
// sync if that enum changes.
//
// Usage: node scripts/fix-content-schema.mjs [files...]   (defaults to all
//        quick-notes if no files are given)

import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_TAGS = new Set([
  'opening-window', 'menu-change', 'closure', 'event',
  'weather', 'editor-note', 'pricing', 'safety',
]);
const VERDICT_MAX = 140;

function trimVerdict(s) {
  if (s.length <= VERDICT_MAX) return s;
  const head = s.slice(0, VERDICT_MAX);
  // Prefer the last sentence end, else the last word boundary.
  const lastStop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (lastStop > 40) return head.slice(0, lastStop + 1);
  const lastSpace = head.lastIndexOf(' ');
  return (lastSpace > 40 ? head.slice(0, lastSpace) : head.trim());
}

let fixed = 0;

function fixFile(file) {
  if (!file.endsWith('.md') || !file.includes('quick-notes')) return;
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(/^tag:\s*["']?([^"'\n]+?)["']?\s*$/);
    if (m && !ALLOWED_TAGS.has(m[1].trim())) {
      lines[i] = 'tag: editor-note';
      console.log(`  schema fix: ${file}  tag "${m[1].trim()}" -> editor-note`);
      changed = true;
      continue;
    }
    m = line.match(/^verdict:\s*"(.*)"\s*$/);
    if (m && m[1].length > VERDICT_MAX) {
      const trimmed = trimVerdict(m[1]);
      lines[i] = `verdict: "${trimmed}"`;
      console.log(`  schema fix: ${file}  verdict ${m[1].length} -> ${trimmed.length} chars`);
      changed = true;
    }
  }

  if (changed) { fs.writeFileSync(file, lines.join('\n')); fixed++; }
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (args.length > 0) {
  args.forEach(fixFile);
} else {
  const dir = 'src/content/quick-notes';
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fixFile(path.join(dir, f));
  }
}
console.log(fixed ? `✓ Content schema: fixed ${fixed} quick-note(s).`
                  : '✓ Content schema: nothing to fix.');
process.exit(0);
