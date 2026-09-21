#!/usr/bin/env node
/**
 * audit-content-schema-drift.mjs - the silent-discard gate.
 *
 * Zod strips unknown keys. It does not warn, it does not fail, it simply
 * returns an object without them. Every collection schema in
 * src/content.config.ts is a bare `z.object(...)`, so anything an editor
 * writes into a content file that the schema does not declare is deleted
 * somewhere between the disk and the template, and nothing anywhere says so.
 *
 * That is not a theoretical hazard. venues/la-baracca-tgallant.json carried
 *
 *     "operatingStatus": "permanently-closed",
 *     "closureNote": "... Confirmed by Peninsula Insider editor May 2026."
 *
 * from May 2026 to September 2026. `operatingStatus` is not in the venue
 * schema, so both keys were discarded on load, `status` was absent and
 * defaulted to `active`, and the venue kept rendering as a live restaurant -
 * present tense, with a booking link - for four months. An editor did the work
 * of verifying a closure and the machine threw it away without a word.
 *
 * Other ghost fields lost the same way: `lastFactVerified` on 21 venues
 * (wine/[slug].astro computes `isVerified` from it, so that computation was
 * permanently false), `faq` on 21 venues (buildFaqSchema was never reachable
 * from the wine route), and `provenance` / `sourceUrl` / `discoveredAt`
 * written onto every record the event importer creates.
 *
 * This script reads the real schemas - it imports src/content.config.ts with
 * `astro:content` and `astro/loaders` shimmed, so there is no parallel copy of
 * the schema to drift - and reports every key present on disk that the schema
 * does not declare, at any depth.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/baselines/schema-drift-baseline.json and exits 1 on regression,
 * matching the contract audit-event-safeguards.mjs and audit-link-graph.mjs
 * use. The ratchet is per collection+key rather than per total: a key already
 * in the baseline may not grow, and a key NOT in the baseline fails on its
 * first appearance. That is the behaviour that matters here - the failure this
 * gate exists to prevent is an editor inventing a field name, and an invented
 * field name is exactly what produces a key with no baseline entry.
 *
 * Seeded from the real corpus, so it can never be satisfied by making the
 * corpus worse and never blocks a deploy over debt it inherited. Tighten the
 * baseline as fields are adopted into the schema or migrated out of the data.
 *
 * Usage:
 *   node scripts/audit-content-schema-drift.mjs [--json out.json] [--assert]
 *                                               [--baseline path]
 *                                               [--update-baseline]
 *                                               [--project-root path]
 *
 * --project-root points at the Astro project whose content.config.ts and
 * src/content/ are audited. Only the test harness passes it; production
 * callers audit the real corpus.
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { register } from 'node:module';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');
const DEFAULT_BASELINE = path.join(REPO, 'ops', 'baselines', 'schema-drift-baseline.json');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const JSON_OUT = getArg('--json', null);
const BASELINE = path.resolve(getArg('--baseline', DEFAULT_BASELINE));
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');
const PROJECT_ROOT = path.resolve(getArg('--project-root', NEXT));

// -- loading the real schemas ----------------------------------------------
// content.config.ts imports `astro:content` (a virtual module that only exists
// inside an Astro build) and `astro/loaders`. Both are shimmed by a resolver
// hook so the config can be imported by plain node: defineCollection becomes
// identity, reference() becomes a string, and glob()/file() return their own
// options - which is how each collection on-disk location is recovered. `z` is
// the zod bundled with Astro, so the schema objects are the real thing.
register('./content-schema-hooks.mjs', import.meta.url, {
  data: { zodUrl: import.meta.resolve('astro/zod') },
});

/**
 * Peel wrapper types until an inspectable schema is reached.
 * zod v4 tags every node with `_def.type` and hangs single-child wrappers
 * (optional, default, nullable, ...) off `_def.innerType`.
 */
const WRAPPERS = new Set([
  'optional',
  'default',
  'nullable',
  'nonoptional',
  'readonly',
  'catch',
  'prefault',
]);
function unwrap(schema) {
  let node = schema;
  for (let depth = 0; node && depth < 20; depth += 1) {
    const type = node?._def?.type;
    if (type === 'lazy') {
      try {
        node = node._def.getter();
        continue;
      } catch {
        return null;
      }
    }
    if (WRAPPERS.has(type) && node._def.innerType) {
      node = node._def.innerType;
      continue;
    }
    if (type === 'pipe' && node._def.out) {
      node = node._def.out;
      continue;
    }
    return node;
  }
  return null;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Walk a value against its schema and collect every key path the schema does
 * not declare.
 *
 * Deliberately conservative about descending. Only `object` and `array` are
 * walked into; a union, record, map, any or unknown node is left alone,
 * because there is no single shape to compare a value against and guessing
 * produces exactly the kind of false positive that teaches people to ignore a
 * gate. An object carrying a catchall keeps its unknown keys by design and is
 * skipped for the same reason.
 */
function collectGhostKeys(value, schema, trail, out) {
  const node = unwrap(schema);
  const type = node?._def?.type;

  if (type === 'object') {
    if (!isPlainObject(value)) return;
    if (node._def.catchall) return;
    const shape = node._def.shape ?? {};
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(shape, key)) {
        out.push([...trail, key].join('.'));
        continue;
      }
      collectGhostKeys(value[key], shape[key], [...trail, key], out);
    }
    return;
  }

  if (type === 'array') {
    if (!Array.isArray(value) || !node._def.element) return;
    // The index is dropped from the path: "gallery[].credit" is one defect to
    // fix, not one per element.
    for (const item of value) collectGhostKeys(item, node._def.element, [...trail, '[]'], out);
  }
}

// Leading ﻿: a byte-order mark ahead of the fence would otherwise hide the
// frontmatter block and make the file read as having no keys at all.
const FRONTMATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---/;

/** Frontmatter for md/mdx, the whole document for json/yaml. */
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
    // Fail closed. An unreadable config must never read as "no drift".
    console.error(`  FAIL: cannot load ${path.relative(REPO, configPath)}`);
    console.error(`        ${error.message}`);
    process.exit(1);
  }

  const unreadable = [];
  const found = new Map();
  const perCollection = new Map();
  const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
  let filesScanned = 0;

  for (const [name, collection] of Object.entries(collections ?? {})) {
    const loader = collection?.loader;
    const schema = collection?.schema;
    // A collection with a function schema (context-dependent) or a non-glob
    // loader is recorded as out of scope rather than silently reported clean.
    if (!schema || typeof schema === 'function' || loader?.loaderKind !== 'glob' || !loader.base) {
      perCollection.set(name, { files: 0, instances: 0, skipped: true });
      continue;
    }

    const base = path.resolve(PROJECT_ROOT, loader.base);
    const exts = extensionsFor(loader.pattern ?? '**/*');
    let entries;
    try {
      entries = await readdir(base, { recursive: true });
    } catch {
      perCollection.set(name, { files: 0, instances: 0, missing: true });
      continue;
    }

    let files = 0;
    let instances = 0;
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
      files += 1;
      filesScanned += 1;
      if (!isPlainObject(record)) continue;

      const ghosts = [];
      collectGhostKeys(record, schema, [], ghosts);
      for (const key of new Set(ghosts)) {
        instances += 1;
        if (!found.has(name)) found.set(name, new Map());
        const byKey = found.get(name);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(rel(abs));
      }
    }
    perCollection.set(name, { files, instances });
  }

  const ghostKeys = [];
  for (const [collection, byKey] of found) {
    for (const [key, files] of byKey) {
      ghostKeys.push({ collection, key, count: files.length, files: files.sort() });
    }
  }
  ghostKeys.sort(
    (a, b) =>
      b.count - a.count || a.collection.localeCompare(b.collection) || a.key.localeCompare(b.key)
  );

  const ceilings = Object.fromEntries(
    ghostKeys.map(({ collection, key, count }) => [`${collection}.${key}`, count])
  );

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: rel(PROJECT_ROOT) || '.',
    totals: {
      collectionsAudited: [...perCollection.values()].filter((c) => !c.skipped && !c.missing).length,
      filesScanned,
      unreadableFiles: unreadable.length,
      distinctGhostKeys: ghostKeys.length,
      ghostKeyInstances: ghostKeys.reduce((sum, g) => sum + g.count, 0),
    },
    byCollection: Object.fromEntries(perCollection),
    unreadableFiles: unreadable,
    ghostKeys,
  };

  const t = report.totals;
  console.log(
    `Content schema drift - ${t.filesScanned} files across ${t.collectionsAudited} collections`
  );
  console.log('');
  console.log('  keys present on disk that the collection schema does not declare');
  console.log(`    distinct key paths .......... ${t.distinctGhostKeys}   [gated, per key]`);
  console.log(`    records affected ............ ${t.ghostKeyInstances}`);
  console.log(`    unreadable files ............ ${t.unreadableFiles}   [gated]`);
  console.log('');
  for (const g of ghostKeys) {
    const sample = g.files.slice(0, 3).join(', ');
    const more = g.files.length > 3 ? `, +${g.files.length - 3} more` : '';
    console.log(`    DISCARDED  ${g.collection}.${g.key}  x${g.count}`);
    console.log(`               ${sample}${more}`);
  }
  for (const u of unreadable) console.log(`    UNREADABLE ${u.file}: ${u.error}`);
  console.log('');

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${rel(out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          note:
            'Ratchet baseline, seeded from the real corpus. A key listed here may not grow; a key NOT listed here fails on first appearance. Tighten as fields are adopted into next/src/content.config.ts or migrated out of the data.',
          totals: t,
          ceilings,
        },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    // Fail closed. A missing or corrupt baseline must not read as "no drift".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:schema-drift -- --update-baseline');
    process.exit(1);
  }

  const allowed = baseline.ceilings ?? {};
  const failures = [];
  for (const { collection, key, count, files } of ghostKeys) {
    const id = `${collection}.${key}`;
    const ceiling = allowed[id] ?? 0;
    if (count > ceiling) {
      failures.push(
        ceiling === 0
          ? `${id}: undeclared key, new to the baseline, on ${count} record(s) - ${files
              .slice(0, 3)
              .join(', ')}`
          : `${id}: ${count} > baseline ${ceiling}`
      );
    }
  }
  for (const u of unreadable) failures.push(`unreadable: ${u.file} - ${u.error}`);

  if (failures.length) {
    console.error('\n  FAIL: content carries keys the collection schema will silently discard');
    for (const f of failures) console.error(`    ${f}`);
    console.error('');
    console.error('  Either add the field to next/src/content.config.ts so the value survives,');
    console.error('  or move the value onto the field the schema already declares.');
    console.error('  Re-seed deliberately with: npm run audit:schema-drift -- --update-baseline');
    process.exit(1);
  }
  console.log('  PASS: no new undeclared keys against the ratchet baseline.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
