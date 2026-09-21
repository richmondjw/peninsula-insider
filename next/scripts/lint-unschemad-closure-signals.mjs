#!/usr/bin/env node
/**
 * lint-unschemad-closure-signals.mjs - the invisible-closure gate.
 *
 * A closure is the single most consequential thing a content record can say.
 * `isPermanentlyClosed` in src/lib/editorial.ts removes the venue from every
 * listing surface on the site and turns its detail page into a closure notice
 * with the booking action suppressed. There is no confirmation step and no
 * second opinion: one field, one word, and a business is gone from the site.
 *
 * A statement that consequential must at minimum be somewhere the build can
 * see it. Twice now it has not been.
 *
 *   venues/la-baracca-tgallant.json carried `operatingStatus:
 *   permanently-closed` with a dated editor's note from May 2026. The venue
 *   schema did not declare `operatingStatus`, Zod stripped both keys on load,
 *   `status` was absent and defaulted to `active`, and a restaurant an editor
 *   believed to be shut kept rendering as live with a booking link for four
 *   months.
 *
 * That is the defect audit-content-schema-drift.mjs was built for, and it
 * catches this case. This gate exists because it catches it for the wrong
 * reason, and only once.
 *
 * The drift gate counts KEY NAMES. Its ratchet then licenses the nineteen
 * ghost keys already in the corpus at their current counts - `venues.faq`,
 * `venues.openingHours`, `venues.sameAs` and the rest. A closure written into
 * the VALUE of an already-baselined ghost key changes no count and passes
 * clean. `"openingHours": "Permanently closed"` on a record that already
 * carries `openingHours` is invisible to the drift gate by construction, and
 * it is exactly the shape an editor reaches for.
 *
 * So this gate asks the narrower question drift cannot: not "is this key
 * declared?" but "does this discarded value assert that the business is
 * SHUT?". Same walk, same schemas, different predicate.
 *
 * The vocabulary is deliberately narrow (see CLOSURE_SIGNALS). It matches
 * permanent closure only. A venue closed on Mondays, closed for winter, in a
 * closed fishing season, or with a closed-loop anything is not closed, and a
 * gate that cries about those is a gate people learn to skip.
 *
 * WHAT THIS GATE DOES NOT DO. It cannot tell whether a business is actually
 * open - see ops/reports/content/2026-09-14-la-baracca-false-closure.md, where
 * the marker this gate is named after turned out to be wrong about a
 * restaurant that trades daily. A closure in a declared field is the build's
 * problem, not this script's; all this does is refuse to let one hide.
 *
 * Report-only by default. `--assert` compares against the ratchet baseline in
 * ops/baselines/unschemad-closure-baseline.json and exits 1 on
 * regression, matching the contract audit-content-schema-drift.mjs and
 * audit-closed-venue-leaks.mjs use. The ratchet is per collection+key path
 * rather than per total: a key path already in the baseline may not carry the
 * signal on more records than it already does, and a key path NOT in the
 * baseline fails on its first appearance.
 *
 * Seeded from the real corpus, so it can never be satisfied by making the
 * corpus worse and never blocks a deploy over debt it inherited. Tighten the
 * baseline as each case is moved onto a declared field.
 *
 * Nothing here is time-driven. The schemas come from src/content.config.ts and
 * the values come from the content files; run it on any date and on any
 * machine and the same tree yields the same numbers.
 *
 * Usage:
 *   node scripts/lint-unschemad-closure-signals.mjs [--json out.json]
 *                                                   [--assert]
 *                                                   [--baseline path]
 *                                                   [--update-baseline]
 *                                                   [--project-root path]
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
const DEFAULT_BASELINE = path.join(
  REPO,
  'ops',
  'baselines',
  'unschemad-closure-baseline.json'
);

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

/**
 * What counts as "this business is shut, for good".
 *
 * Every entry has to survive one question: could a trading business honestly
 * write this about itself? "Closed Mondays" can. "Permanently closed" cannot.
 * Only the second kind belongs here.
 *
 * Anchored on word boundaries and matched case-insensitively against the
 * whole string value, so `permanently-closed`, `permanently_closed` and
 * "Permanently Closed" are one rule rather than three.
 */
const CLOSURE_SIGNALS = [
  // The enum values themselves, in all three separator spellings.
  /\bpermanently[\s_-]?closed\b/i,
  /\bclosed[\s_-]?permanently\b/i,
  // Prose an editor writes when recording a closure.
  /\bceased\s+(?:trading|trade|operations?|business)\b/i,
  /\bno\s+longer\s+(?:trading|trades|operating|operates|in\s+business|open)\b/i,
  /\bout\s+of\s+business\b/i,
  /\bwent\s+out\s+of\s+business\b/i,
  /\bclosed\s+(?:down|its\s+doors|for\s+good|permanently)\b/i,
  /\bshut\s+(?:down|its\s+doors|for\s+good)\b/i,
  /\bhas\s+since\s+closed\b/i,
  /\b(?:now|since)\s+permanently\s+closed\b/i,
];

/**
 * Phrases that contain a closure word and are not closures. Checked first: a
 * value matching any of these is never reported, whatever else it says.
 *
 * These are the false positives that would otherwise train people to ignore
 * this gate - a seasonal cellar door, a day the kitchen is dark, a closed
 * fishing season, a road closure.
 */
const NOT_A_CLOSURE = [
  /\bclosed\s+(?:on\s+)?(?:mon|tue|wed|thu|fri|sat|sun)/i,
  /\bclosed\s+(?:for\s+)?(?:winter|summer|spring|autumn|the\s+season|the\s+day|lunch|dinner|renovations?|refurbishment|maintenance|the\s+holidays?|public\s+holidays?)\b/i,
  /\bclosed\s+season\b/i,
  /\bseasonal(?:ly)?\s+clos/i,
  /\btemporarily\s+closed\b/i,
  /\bclosed[\s-]?loop\b/i,
  /\broad\s+closure\b/i,
  /\bclosed\s+toe\b/i,
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Does this string assert a permanent closure? */
export function isClosureSignal(value) {
  if (typeof value !== 'string') return null;
  if (NOT_A_CLOSURE.some((re) => re.test(value))) return null;
  const hit = CLOSURE_SIGNALS.find((re) => re.test(value));
  return hit ? value.match(hit)[0] : null;
}

/**
 * Every string reachable from a value, so a closure buried in an array or a
 * nested object is not missed. Booleans and numbers cannot assert a closure
 * in words and are skipped.
 */
function* strings(value) {
  if (typeof value === 'string') {
    yield value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) yield* strings(item);
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) yield* strings(item);
  }
}

// -- loading the real schemas ----------------------------------------------
// Identical to audit-content-schema-drift.mjs, and deliberately so: both gates
// have to agree on what "the schema declares" means, or one of them is lying.
register('./content-schema-hooks.mjs', import.meta.url, {
  data: { zodUrl: import.meta.resolve('astro/zod') },
});

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

/**
 * Walk a value against its schema and collect every undeclared key path whose
 * value asserts a closure.
 *
 * Same conservative descent as the drift gate: only `object` and `array` are
 * walked into, and an object carrying a catchall keeps its unknown keys by
 * design and is skipped. A key the schema does not declare is not descended
 * into either - it is reported whole, with every string beneath it searched,
 * because the whole subtree is what Zod discards.
 */
function collectClosureGhosts(value, schema, trail, out) {
  const node = unwrap(schema);
  const type = node?._def?.type;

  if (type === 'object') {
    if (!isPlainObject(value)) return;
    if (node._def.catchall) return;
    const shape = node._def.shape ?? {};
    for (const key of Object.keys(value)) {
      const keyPath = [...trail, key].join('.');
      if (!Object.hasOwn(shape, key)) {
        for (const text of strings(value[key])) {
          const signal = isClosureSignal(text);
          if (signal) {
            out.push({ key: keyPath, signal, excerpt: excerptAround(text, signal) });
            break;
          }
        }
        continue;
      }
      collectClosureGhosts(value[key], shape[key], [...trail, key], out);
    }
    return;
  }

  if (type === 'array') {
    if (!Array.isArray(value) || !node._def.element) return;
    // The index is dropped from the path, matching the drift gate: one defect
    // to fix, not one per element.
    for (const item of value) collectClosureGhosts(item, node._def.element, [...trail, '[]'], out);
  }
}

/** A readable slice of the offending string, centred on the match. */
function excerptAround(text, signal, span = 70) {
  const at = text.toLowerCase().indexOf(signal.toLowerCase());
  if (at === -1) return text.slice(0, span * 2);
  const start = Math.max(0, at - span);
  const end = Math.min(text.length, at + signal.length + span);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
}

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

function extensionsFor(pattern) {
  const braced = /\{([^}]*)\}/.exec(pattern);
  if (braced) return braced[1].split(',').map((e) => `.${e.trim().replace(/^\./, '')}`);
  const dot = pattern.lastIndexOf('.');
  return dot === -1 ? [] : [pattern.slice(dot)];
}

export async function audit({ projectRoot = PROJECT_ROOT } = {}) {
  const configPath = path.join(projectRoot, 'src', 'content.config.ts');
  const config = await import(pathToFileURL(configPath).href);
  const collections = config.collections;

  const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
  const unreadable = [];
  const hits = [];
  let filesScanned = 0;
  let collectionsAudited = 0;

  for (const [name, collection] of Object.entries(collections ?? {})) {
    const loader = collection?.loader;
    const schema = collection?.schema;
    if (!schema || typeof schema === 'function' || loader?.loaderKind !== 'glob' || !loader.base) {
      continue;
    }

    const base = path.resolve(projectRoot, loader.base);
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
      filesScanned += 1;
      if (!isPlainObject(record)) continue;

      const found = [];
      collectClosureGhosts(record, schema, [], found);
      const seen = new Set();
      for (const f of found) {
        if (seen.has(f.key)) continue;
        seen.add(f.key);
        hits.push({ collection: name, key: f.key, file: rel(abs), signal: f.signal, excerpt: f.excerpt });
      }
    }
  }

  hits.sort(
    (a, b) =>
      a.collection.localeCompare(b.collection) ||
      a.key.localeCompare(b.key) ||
      a.file.localeCompare(b.file)
  );

  const byKey = new Map();
  for (const hit of hits) {
    const id = `${hit.collection}.${hit.key}`;
    if (!byKey.has(id)) byKey.set(id, []);
    byKey.get(id).push(hit);
  }
  const keyPaths = [...byKey.entries()]
    .map(([id, group]) => ({ id, count: group.length, files: group.map((g) => g.file).sort() }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  return {
    totals: {
      collectionsAudited,
      filesScanned,
      unreadableFiles: unreadable.length,
      distinctKeyPaths: keyPaths.length,
      records: hits.length,
    },
    keyPaths,
    hits,
    unreadableFiles: unreadable,
  };
}

async function main() {
  const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

  let result;
  try {
    result = await audit({ projectRoot: PROJECT_ROOT });
  } catch (error) {
    // Fail closed. An unreadable config must never read as "no hidden closures".
    console.error(`  FAIL: cannot audit ${rel(PROJECT_ROOT)}`);
    console.error(`        ${error.message}`);
    process.exit(1);
  }

  const report = { generatedAt: new Date().toISOString(), projectRoot: rel(PROJECT_ROOT) || '.', ...result };
  const t = report.totals;

  console.log(
    `Unschema'd closure signals - ${t.filesScanned} files across ${t.collectionsAudited} collections`
  );
  console.log('');
  console.log('  closures written where the schema will discard them');
  console.log(`    distinct key paths .......... ${t.distinctKeyPaths}   [gated, per key path]`);
  console.log(`    records affected ............ ${t.records}`);
  console.log(`    unreadable files ............ ${t.unreadableFiles}   [gated]`);
  console.log('');
  for (const hit of report.hits) {
    console.log(`    HIDDEN  ${hit.collection}.${hit.key}  "${hit.signal}"`);
    console.log(`            ${hit.file}`);
    console.log(`            ${hit.excerpt}`);
  }
  for (const u of report.unreadableFiles) console.log(`    UNREADABLE ${u.file}: ${u.error}`);
  console.log('');

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  report -> ${rel(out)}`);
  }

  const ceilings = Object.fromEntries(report.keyPaths.map(({ id, count }) => [id, count]));

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          updatedAt: report.generatedAt,
          note:
            "Ratchet baseline, seeded from the real corpus. A key path listed here may not carry a closure signal on more records than the ceiling; a key path NOT listed here fails on first appearance. Tighten as each case is moved onto a field next/src/content.config.ts declares.",
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
    // Fail closed. A missing or corrupt baseline must not read as "nothing hidden".
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:unschemad-closures -- --update-baseline');
    process.exit(1);
  }

  const allowed = baseline.ceilings ?? {};
  const failures = [];
  for (const { id, count, files } of report.keyPaths) {
    const ceiling = allowed[id] ?? 0;
    if (count > ceiling) {
      failures.push(
        ceiling === 0
          ? `${id}: closure signal on an undeclared field, new to the baseline, on ${count} record(s) - ${files
              .slice(0, 3)
              .join(', ')}`
          : `${id}: ${count} > baseline ${ceiling}`
      );
    }
  }
  for (const u of report.unreadableFiles) failures.push(`unreadable: ${u.file} - ${u.error}`);

  if (failures.length) {
    console.error("\n  FAIL: a closure is recorded where the build cannot see it");
    for (const f of failures) console.error(`    ${f}`);
    console.error('');
    console.error('  A closure delists the venue everywhere and rewrites its page. Writing one');
    console.error('  into a field the schema does not declare means Zod discards it and the');
    console.error('  site keeps recommending the business - which is what happened to');
    console.error('  venues/la-baracca-tgallant.json for four months.');
    console.error('');
    console.error("  Put the closure on `status` (or `operatingStatus`), which the schema");
    console.error('  declares and isPermanentlyClosed() reads. Verify it first: the marker');
    console.error('  that named this gate turned out to be wrong about a trading restaurant.');
    console.error('  Re-seed deliberately with: npm run audit:unschemad-closures -- --update-baseline');
    process.exit(1);
  }
  console.log("  PASS: no new closures hidden on undeclared fields.");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
