#!/usr/bin/env node
/**
 * assert-declared-fields-survive.mjs - the other half of the silent-discard gate.
 *
 * audit-content-schema-drift.mjs asks whether the schema DECLARES a key. That
 * is necessary and it is not sufficient. A key declared on the wrong
 * collection, or declared with a type the value does not satisfy, or declared
 * under an optional parent the record never populates, is still thrown away -
 * and the drift gate reports the corpus clean, because the key name is now
 * somewhere in the config.
 *
 * So this gate asks the question that actually matters: take the record as it
 * sits on disk, run it through the real collection schema, and check that
 * every key still has a value on the other side. Same shimmed import of
 * src/content.config.ts the drift gate uses, so neither can drift from the
 * schema the build compiles.
 *
 * Keys are compared by PATH, never by value. Zod legitimately rewrites values
 * on the way through - z.coerce.date() turns "2026-04-01" into a Date, a
 * reference() becomes a lookup - and a rewritten value is a survival, not a
 * loss. A key that disappears is a loss, and that is the only thing reported.
 * Defaults that ADD keys are ignored for the same reason.
 *
 * A record that fails validation is reported too. Under Astro that is a loud
 * build error rather than a silent discard, so it is a different defect, but a
 * schema change that invalidates the corpus must not read as a pass here.
 *
 * Nothing here is time-driven. The schemas come from src/content.config.ts and
 * the values from the content files; run it on any date, on any machine, and
 * the same tree yields the same result. No date is compared against now and no
 * check expires.
 *
 * Usage:
 *   node scripts/assert-declared-fields-survive.mjs [--json out.json]
 *                                                   [--project-root path]
 *                                                   [--quiet]
 *
 * Exits 1 if any key present on disk is absent after parsing, or if any record
 * fails validation. There is no ratchet and no baseline: the correct ceiling
 * for this defect is zero, and a key that survives today must survive tomorrow.
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { register } from 'node:module';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const QUIET = args.includes('--quiet');
const PROJECT_ROOT = path.resolve(getArg('--project-root', NEXT));

register('./content-schema-hooks.mjs', import.meta.url, {
  data: { zodUrl: import.meta.resolve('astro/zod') },
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every key path reachable from a value. Array indices collapse to `[]`, so a
 * field lost from one element of a gallery reads as one defect rather than one
 * per photograph - the same convention the drift gate uses.
 *
 * An explicit null on disk is not a value to preserve and optional() drops it,
 * so nothing was discarded and nothing is reported.
 */
function keyPaths(value, trail, out) {
  if (Array.isArray(value)) {
    for (const item of value) keyPaths(item, [...trail, '[]'], out);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined || child === null) continue;
    const next = [...trail, key];
    out.add(next.join('.'));
    keyPaths(child, next, out);
  }
}

// Leading BOM: a byte-order mark ahead of the fence would otherwise hide the
// frontmatter and make the file read as having no keys at all.
const FRONTMATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---/;

async function readRecord(abs) {
  const raw = await readFile(abs, 'utf8');
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.json') return JSON.parse(raw);
  if (ext === '.yaml' || ext === '.yml') return parseYaml(raw);
  const match = FRONTMATTER.exec(raw);
  if (!match) return {};
  return parseYaml(match[1]) ?? {};
}

/** Expand a loader glob pattern to the list of extensions it admits. */
function extensionsFor(pattern) {
  const braced = /\{([^}]*)\}/.exec(pattern);
  if (braced) return braced[1].split(',').map((e) => `.${e.trim().replace(/^\./, '')}`);
  const dot = pattern.lastIndexOf('.');
  return dot === -1 ? [] : [pattern.slice(dot)];
}

async function main() {
  let collections;
  const configPath = path.join(PROJECT_ROOT, 'src', 'content.config.ts');
  try {
    const config = await import(pathToFileURL(configPath).href);
    collections = config.collections;
  } catch (error) {
    // Fail closed. An unreadable config must never read as "nothing lost".
    console.error(`  FAIL: cannot load ${path.relative(REPO, configPath)}`);
    console.error(`        ${error.message}`);
    process.exit(1);
  }

  const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
  const lost = new Map();
  const invalid = [];
  const unreadable = [];
  let filesScanned = 0;
  let collectionsAudited = 0;

  for (const [name, collection] of Object.entries(collections ?? {})) {
    const loader = collection?.loader;
    const schema = collection?.schema;
    // A function schema is context-dependent and a non-glob loader has no
    // directory to walk; both are out of scope rather than silently clean.
    if (!schema || typeof schema === 'function' || loader?.loaderKind !== 'glob' || !loader.base) {
      continue;
    }
    const base = path.resolve(PROJECT_ROOT, loader.base);
    const exts = extensionsFor(loader.pattern ?? '**/*');
    let entries;
    try {
      entries = await readdir(base, { recursive: true });
    } catch {
      continue;
    }
    collectionsAudited += 1;

    for (const entry of entries) {
      if (exts.length && !exts.some((e) => entry.toLowerCase().endsWith(e))) continue;
      const abs = path.join(base, entry);
      let record;
      try {
        record = await readRecord(abs);
      } catch (error) {
        unreadable.push({ file: rel(abs), error: error.message });
        continue;
      }
      if (!isPlainObject(record)) continue;
      filesScanned += 1;

      const result = schema.safeParse(record);
      if (!result.success) {
        invalid.push({
          collection: name,
          file: rel(abs),
          issues: result.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`),
        });
        continue;
      }

      const before = new Set();
      keyPaths(record, [], before);
      const after = new Set();
      keyPaths(result.data, [], after);

      for (const key of before) {
        if (after.has(key)) continue;
        const id = `${name}.${key}`;
        if (!lost.has(id)) lost.set(id, []);
        lost.get(id).push(rel(abs));
      }
    }
  }

  const losses = [...lost.entries()]
    .map(([id, files]) => ({ id, count: files.length, files: files.sort() }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  const report = {
    projectRoot: rel(PROJECT_ROOT) || '.',
    totals: {
      collectionsAudited,
      filesScanned,
      lostKeyPaths: losses.length,
      lostKeyInstances: losses.reduce((sum, l) => sum + l.count, 0),
      invalidRecords: invalid.length,
      unreadableFiles: unreadable.length,
    },
    losses,
    invalid,
    unreadableFiles: unreadable,
  };

  if (!QUIET) {
    const t = report.totals;
    console.log(
      `Declared-field survival - ${t.filesScanned} files across ${t.collectionsAudited} collections`
    );
    console.log('');
    console.log('  keys present on disk that do not survive the collection schema');
    console.log(`    lost key paths .............. ${t.lostKeyPaths}   [gated, must be 0]`);
    console.log(`    records affected ............ ${t.lostKeyInstances}`);
    console.log(`    records failing validation .. ${t.invalidRecords}   [gated]`);
    console.log(`    unreadable files ............ ${t.unreadableFiles}   [gated]`);
    console.log('');
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${rel(out)}`);
  }

  const failures = [];
  for (const l of losses) {
    failures.push(`${l.id}: discarded on ${l.count} record(s) - ${l.files.slice(0, 3).join(', ')}`);
  }
  for (const i of invalid) failures.push(`invalid: ${i.file} - ${i.issues.join(' | ')}`);
  for (const u of unreadable) failures.push(`unreadable: ${u.file} - ${u.error}`);

  if (failures.length) {
    console.error('  FAIL: content carries values the schema does not carry through');
    for (const f of failures) console.error(`    ${f}`);
    console.error('');
    console.error('  A key can be declared and still be lost: wrong collection, wrong type, or');
    console.error('  nested under a parent the record does not populate. Fix the declaration in');
    console.error('  next/src/content.config.ts, not this gate.');
    process.exit(1);
  }
  console.log('  PASS: every key on disk survives its collection schema.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
