/**
 * corpus.mjs - read the image records as they sit on disk.
 *
 * WHY ON DISK AND NOT THROUGH THE SCHEMA
 * --------------------------------------
 * `license` has a schema default and so does `depictionStatus` and so does
 * `rightsStatus`. Parsed, every record therefore has an answer for all three,
 * and the question this whole ticket asks is which records have no answer. So
 * the reader here is the same deliberately literal one
 * audit-media-provenance.mjs uses, and for the same reason its header gives:
 * on disk, absent means absent, which is the distinction the work turns on.
 *
 * The frontmatter reader is hand-rolled rather than a YAML dependency. All it
 * needs is a nested scalar block one level deep, which is the shape every
 * imageRef in this corpus takes, and matching the gate's own reader byte for
 * byte matters more here than generality: a reconciliation that counted a
 * different set of records from the gate would be a reconciliation of a
 * corpus nobody else can see.
 *
 * This module touches the filesystem. It is the only module under
 * media-rights/ that does, apart from the probe, and neither of them is
 * imported by the planner. See plan.mjs for why that separation is structural.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** Every file under a directory, skipping the two that are never content. */
export async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__' || entry.name === 'node_modules') continue;
      await walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/** Pull imageRef-shaped blocks out of a Markdown file's frontmatter. */
export function frontmatterBlocks(text) {
  if (!text.startsWith('---')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const lines = text.slice(3, end).split(/\r?\n/);

  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i].match(/^(\s*)([A-Za-z0-9_]+):\s*$/);
    if (!header) continue;
    const indent = header[1].length;
    const block = {};
    for (let j = i + 1; j < lines.length; j += 1) {
      const field = lines[j].match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
      if (!field || field[1].length <= indent) break;
      block[field[2]] = field[3].trim().replace(/^['"]|['"]$/g, '');
    }
    if (typeof block.src === 'string') blocks.push({ field: header[2], image: block });
  }
  return blocks;
}

/** Recursively collect imageRef-shaped objects out of a parsed JSON record. */
export function jsonBlocks(node, keyPath, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => jsonBlocks(item, `${keyPath}[${i}]`, out));
    return out;
  }
  if (!node || typeof node !== 'object') return out;

  const looksLikeImage =
    typeof node.src === 'string' && (typeof node.alt === 'string' || typeof node.credit === 'string');
  if (looksLikeImage) out.push({ field: keyPath || '(root)', image: node });

  for (const [key, value] of Object.entries(node)) {
    jsonBlocks(value, keyPath ? `${keyPath}.${key}` : key, out);
  }
  return out;
}

/**
 * Every image record under a content directory, sorted so two runs over the
 * same tree produce the same report.
 */
export async function readImageRecords(contentDir) {
  const records = [];
  for (const file of await walk(contentDir)) {
    const rel = path.relative(contentDir, file).split(path.sep).join('/');
    const collection = rel.split('/')[0];
    const ext = path.extname(file);
    let blocks = [];

    if (ext === '.json') {
      let parsed;
      try {
        parsed = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        continue; // validate-content.mjs owns malformed JSON
      }
      blocks = jsonBlocks(parsed, '', []);
    } else if (ext === '.md' || ext === '.mdx') {
      blocks = frontmatterBlocks(await readFile(file, 'utf8'));
    } else {
      continue;
    }

    for (const { field, image } of blocks) records.push({ file: rel, collection, field, image });
  }
  return records.sort((a, b) => a.file.localeCompare(b.file) || a.field.localeCompare(b.field));
}
