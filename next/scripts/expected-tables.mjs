#!/usr/bin/env node
/**
 * expected-tables.mjs - what the application actually asks the database for.
 *
 * WHY THIS IS DERIVED AND NOT WRITTEN DOWN
 *
 * The failure this repository is fixing is a hand-maintained expectation that
 * drifted. `/partners/claim/` shipped on 2026-05-10 writing into pi.venue_claims,
 * a table that has never existed in production. Nobody noticed for 127 days,
 * partly because nothing anywhere held the sentence "the claim form needs this
 * table". A hand-written list of expected tables would have had exactly the same
 * problem one level up: someone adds a form, forgets the list, and the new table
 * is unwatched from the day it ships.
 *
 * So the list is read out of the code every time. A developer who writes
 * `c.from('new_thing')` has, by that act alone, declared that pi.new_thing must
 * exist. There is nothing else to remember.
 *
 * HOW IT READS THE CODE
 *
 * Every Supabase client in next/src is created with `db: { schema: 'pi' }`, so a
 * `.from('x')` call names pi.x unless the chain was re-scoped with `.schema('y')`.
 * One file does that today (admin/image-intelligence.astro -> pi_image). The rule
 * applied here is per-file: if a file re-scopes, the tables it names belong to
 * that schema. If a single file ever re-scopes to two different schemas the
 * derivation refuses to guess and fails loudly, because at that point a per-file
 * rule is no longer sound and a human needs to teach this script the chain.
 *
 * WHAT IS DELIBERATELY EXCLUDED
 *
 *   storage.from(...)   A storage bucket is not a table. `submissions` is both a
 *                       bucket and a table on this site, so the exclusion has to
 *                       look at the receiver, not the string.
 *   Array.from(...)     and the other built-ins that share the method name.
 *   non-literal args    `.from(table)` cannot be resolved statically. Reported
 *                       separately as `dynamic` so it is visible rather than
 *                       silently dropped - a dynamic table name is a blind spot
 *                       in every consumer of this module.
 *   *.test.* files      Fixtures are not the application.
 *
 * Usage:
 *   node scripts/expected-tables.mjs [--src next/src] [--json]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

/** The schema every Supabase client in this app is created with. */
export const DEFAULT_SCHEMA = 'pi';

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.astro']);

/**
 * Receivers that own a `.from()` which has nothing to do with a database table.
 * `storage` is the one that matters on this site; the built-ins are here so a
 * stray `Array.from('abc')` can never invent a table called `abc`.
 */
const NON_TABLE_RECEIVERS = new Set([
  'storage',
  'Array',
  'Object',
  'Buffer',
  'Date',
  'Set',
  'Map',
  'String',
  'Number',
  'Promise',
  'BigInt',
  'Int8Array',
  'Uint8Array',
  'Float32Array',
  'Float64Array',
]);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git']);

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...(await walk(abs)));
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name)) && !/\.test\./.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

/** `.from(` with a string-literal first argument. Tolerates the formatter's line breaks. */
const FROM_LITERAL = /\.\s*from\s*\(\s*(['"`])([A-Za-z0-9_]+)\1/g;
/** `.from(` with anything else - an identifier, a template with a hole, an expression. */
const FROM_ANY = /\.\s*from\s*\(/g;
const SCHEMA_CALL = /\.\s*schema\s*\(\s*(['"`])([A-Za-z0-9_]+)\1\s*\)/g;

/** The identifier immediately before a `.from(` match, or '' if there isn't one. */
function receiverBefore(text, index) {
  const before = text.slice(Math.max(0, index - 80), index);
  return (/([A-Za-z0-9_$]+)\s*\.?\s*$/.exec(before) || [, ''])[1];
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/**
 * Read one file's table references.
 * Returns { tables: [{schema, table, line}], dynamic: [{line, receiver}], schemas: Set }.
 */
export function extractFromSource(text, { defaultSchema = DEFAULT_SCHEMA } = {}) {
  const schemas = new Set();
  for (const m of text.matchAll(SCHEMA_CALL)) schemas.add(m[2]);

  if (schemas.size > 1) {
    throw new Error(
      `file re-scopes to more than one schema (${[...schemas].sort().join(', ')}); ` +
        'the per-file schema rule in expected-tables.mjs is no longer sound for it. ' +
        'Teach the derivation the chain rather than letting it guess.'
    );
  }
  const schema = schemas.size === 1 ? [...schemas][0] : defaultSchema;

  const tables = [];
  const literalAt = new Set();
  for (const m of text.matchAll(FROM_LITERAL)) {
    literalAt.add(m.index);
    if (NON_TABLE_RECEIVERS.has(receiverBefore(text, m.index))) continue;
    tables.push({ schema, table: m[2], line: lineOf(text, m.index) });
  }

  const dynamic = [];
  for (const m of text.matchAll(FROM_ANY)) {
    if (literalAt.has(m.index)) continue;
    const receiver = receiverBefore(text, m.index);
    if (NON_TABLE_RECEIVERS.has(receiver)) continue;
    dynamic.push({ line: lineOf(text, m.index), receiver });
  }

  return { tables, dynamic, schema };
}

/**
 * Derive the expected-table set from a source tree.
 *
 * @param {object} options
 * @param {string[]} options.srcDirs  absolute directories to read
 * @returns {Promise<{tables: Array<{schema,table,references:string[]}>, dynamic: Array<{file,line,receiver}>, filesRead: number}>}
 */
export async function deriveExpectedTables({ srcDirs = [path.join(NEXT, 'src')] } = {}) {
  /** @type {Map<string, {schema:string, table:string, references:string[]}>} */
  const byKey = new Map();
  const dynamic = [];
  let filesRead = 0;

  for (const dir of srcDirs) {
    for (const abs of await walk(dir)) {
      let text;
      try {
        text = await readFile(abs, 'utf8');
      } catch {
        continue;
      }
      filesRead += 1;
      let extracted;
      try {
        extracted = extractFromSource(text);
      } catch (error) {
        throw new Error(`${rel(abs)}: ${error.message}`);
      }
      for (const hit of extracted.tables) {
        const key = `${hit.schema}.${hit.table}`;
        if (!byKey.has(key)) byKey.set(key, { schema: hit.schema, table: hit.table, references: [] });
        byKey.get(key).references.push(`${rel(abs)}:${hit.line}`);
      }
      for (const hit of extracted.dynamic) {
        dynamic.push({ file: rel(abs), line: hit.line, receiver: hit.receiver });
      }
    }
  }

  const tables = [...byKey.values()].sort((a, b) =>
    `${a.schema}.${a.table}`.localeCompare(`${b.schema}.${b.table}`)
  );
  for (const t of tables) t.references.sort();
  return { tables, dynamic, filesRead };
}

/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
  };
  const srcDirs = [path.resolve(getArg('--src', path.join(NEXT, 'src')))];
  const { tables, dynamic, filesRead } = await deriveExpectedTables({ srcDirs });

  if (args.includes('--json')) {
    console.log(JSON.stringify({ tables, dynamic, filesRead }, null, 2));
    return;
  }

  console.log(`Tables the application names, derived from ${filesRead} source file(s)\n`);
  for (const t of tables) {
    console.log(`  ${t.schema}.${t.table}`.padEnd(42) + `${t.references.length} reference(s)`);
  }
  if (dynamic.length) {
    console.log('\n  Dynamic .from() calls - not statically resolvable, not probeable:');
    for (const d of dynamic) console.log(`    ${d.file}:${d.line}  .from(${d.receiver ? '' : ''}…)`);
  }
  console.log(`\n  ${tables.length} distinct table(s).`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('expected-tables.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
