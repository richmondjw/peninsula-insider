#!/usr/bin/env node
/**
 * Peninsula Insider — Run-log appender
 *
 * Validate + append run-log entries against ops/run-log/run-log.schema.json.
 * Mirrors the publication-ledger.py pattern.
 *
 * Stage B item 4 from docs/peninsula-insider-developer-handover-tranches-1-4-2026-05-10.md
 *
 * Usage:
 *   node ops/scripts/run-log.mjs validate --entry-file <path>
 *   node ops/scripts/run-log.mjs append   --entry-file <path>
 *   node ops/scripts/run-log.mjs append   --json '<inline-json>'
 *   node ops/scripts/run-log.mjs new      --job-name pi-foo --job-source github-actions \
 *                                         --status success --mutation scan-only [--out file]
 *
 * Storage:
 *   ops/run-log/entries/YYYY-MM.jsonl  (one entry per line, append-only)
 *   ops/run-log/index.csv               (flat index, derived)
 *
 * Exit codes:
 *   0  success
 *   2  validation error
 *   3  schema or filesystem error
 *   4  bad cli usage
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = path.resolve(process.cwd());
const SCHEMA_PATH = path.join(REPO_ROOT, 'ops/run-log/run-log.schema.json');
const ENTRIES_DIR = path.join(REPO_ROOT, 'ops/run-log/entries');
const INDEX_CSV = path.join(REPO_ROOT, 'ops/run-log/index.csv');

const INDEX_HEADERS = [
  'runId',
  'parentRunId',
  'jobName',
  'jobSource',
  'startedAt',
  'endedAt',
  'durationMs',
  'status',
  'mutation',
  'surfaceCount',
  'changed',
  'errors',
  'warnings',
  'alertSent',
  'alertChannel',
  'artifactCount',
  'ledgerEntryCount',
];

// --- arg parsing ---------------------------------------------------------

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
          out[a.slice(2)] = true;
        } else {
          out[a.slice(2)] = next;
          i++;
        }
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    [
      'usage:',
      '  node ops/scripts/run-log.mjs validate --entry-file <path>',
      '  node ops/scripts/run-log.mjs validate --json <inline-json>',
      '  node ops/scripts/run-log.mjs append   --entry-file <path>',
      '  node ops/scripts/run-log.mjs append   --json <inline-json>',
      '  node ops/scripts/run-log.mjs new      --job-name <name> --job-source <src>',
      '                                       --status <s> --mutation <m> [flags]',
      '',
      'new flags:',
      '  --run-id <uuid>            (default: random uuid v4)',
      '  --parent-run-id <uuid>     (default: null)',
      '  --started-at <iso8601>     (default: now)',
      '  --ended-at <iso8601>       (default: now)',
      '  --duration-ms <int>',
      '  --surfaces <csv>           comma-separated paths',
      '  --counts-scanned <int>',
      '  --counts-changed <int>',
      '  --counts-errors <int>',
      '  --counts-warnings <int>',
      '  --alert-sent               flag',
      '  --alert-channel <ch>       telegram|email|mission-control|github-issue|slack',
      '  --artifacts <csv>',
      '  --ledger-entries <csv>',
      '  --error-summary <text>',
      '  --notes <text>',
      '  --out <path>               write to file instead of stdout',
      '  --append                   also append to run-log',
    ].join('\n'),
  );
  process.exit(4);
}

// --- schema validator (minimal, covers the run-log shape) ----------------

function loadSchema() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`error: schema not found at ${SCHEMA_PATH}`);
    process.exit(3);
  }
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function checkType(value, allowed) {
  const types = Array.isArray(allowed) ? allowed : [allowed];
  const t = typeOf(value);
  // JSON Schema treats integer as a number too
  if (types.includes('number') && (t === 'integer' || t === 'number')) return true;
  return types.includes(t);
}

function isIso8601(s) {
  if (typeof s !== 'string') return false;
  // strict-ish: YYYY-MM-DDTHH:MM:SS(.sss)?(Z|+/-HH:MM)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s);
}

function validateField(name, value, spec, errors) {
  // type
  if (spec.type) {
    if (!checkType(value, spec.type)) {
      errors.push(
        `${name}: expected type ${JSON.stringify(spec.type)}, got ${typeOf(value)}`,
      );
      return;
    }
  }

  // const
  if (spec.const !== undefined && value !== spec.const) {
    errors.push(`${name}: must equal ${JSON.stringify(spec.const)}, got ${JSON.stringify(value)}`);
  }

  // enum
  if (spec.enum && !spec.enum.includes(value)) {
    errors.push(
      `${name}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(spec.enum)}`,
    );
  }

  // format
  if (spec.format === 'date-time' && value !== null && !isIso8601(value)) {
    errors.push(`${name}: not a valid ISO 8601 datetime: ${JSON.stringify(value)}`);
  }

  // minimum
  if (typeof spec.minimum === 'number' && typeof value === 'number' && value < spec.minimum) {
    errors.push(`${name}: ${value} below minimum ${spec.minimum}`);
  }

  // arrays
  if (spec.type === 'array' && Array.isArray(value) && spec.items) {
    value.forEach((v, i) => validateField(`${name}[${i}]`, v, spec.items, errors));
  }

  // objects
  if (spec.type === 'object' && typeof value === 'object' && value !== null) {
    if (spec.properties) {
      for (const [k, sub] of Object.entries(spec.properties)) {
        if (k in value) validateField(`${name}.${k}`, value[k], sub, errors);
      }
    }
    if (spec.additionalProperties === false) {
      const allowed = new Set(Object.keys(spec.properties || {}));
      for (const k of Object.keys(value)) {
        if (!allowed.has(k)) errors.push(`${name}.${k}: unexpected property`);
      }
    }
  }
}

function validateEntry(entry, schema) {
  const errors = [];

  // top-level type
  if (typeOf(entry) !== 'object') {
    return [`root: expected object, got ${typeOf(entry)}`];
  }

  // required
  for (const r of schema.required || []) {
    if (!(r in entry)) errors.push(`root: missing required field "${r}"`);
  }

  // properties
  if (schema.properties) {
    for (const [k, spec] of Object.entries(schema.properties)) {
      if (k in entry) validateField(k, entry[k], spec, errors);
    }
  }

  // additionalProperties at root
  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties || {}));
    for (const k of Object.keys(entry)) {
      if (!allowed.has(k)) errors.push(`root.${k}: unexpected property`);
    }
  }

  // semantic cross-checks
  if (entry.alertSent === true && !entry.alertChannel) {
    errors.push('alertChannel: required when alertSent is true');
  }
  if (entry.status && entry.status !== 'success' && !entry.errorSummary) {
    // not strictly required by schema but recommended; warn-only
    // emit as a soft warning by writing to stderr
    process.stderr.write(
      `warning: status="${entry.status}" without errorSummary — recommended\n`,
    );
  }

  return errors;
}

// --- entry IO ------------------------------------------------------------

function loadEntry(args) {
  if (args['entry-file']) {
    const p = path.resolve(args['entry-file']);
    if (!fs.existsSync(p)) {
      console.error(`error: entry file not found: ${p}`);
      process.exit(3);
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  if (args.json) {
    return JSON.parse(args.json);
  }
  usage('append/validate require --entry-file or --json');
}

// --- new entry constructor (Stage B helper for inline workflow use) ------

function uuidV4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // fallback (Node >=14.17 has randomUUID, but defensive)
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function csvList(s) {
  if (!s || typeof s !== 'string') return [];
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildEntryFromArgs(args) {
  const startedAt = args['started-at'] || nowIso();
  const endedAt = args['ended-at'] === '' ? null : args['ended-at'] || nowIso();
  let durationMs = null;
  if (args['duration-ms']) {
    durationMs = parseInt(args['duration-ms'], 10);
  } else if (startedAt && endedAt) {
    durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));
  }

  const counts = {
    scanned: parseInt(args['counts-scanned'] || '0', 10),
    changed: parseInt(args['counts-changed'] || '0', 10),
    errors: parseInt(args['counts-errors'] || '0', 10),
    warnings: parseInt(args['counts-warnings'] || '0', 10),
  };

  const entry = {
    schemaVersion: 1,
    runId: args['run-id'] || uuidV4(),
    parentRunId: args['parent-run-id'] || null,
    jobName: args['job-name'],
    jobSource: args['job-source'],
    startedAt,
    endedAt,
    durationMs,
    status: args['status'],
    mutation: args['mutation'],
    surfaces: csvList(args['surfaces']),
    counts,
    alertSent: !!args['alert-sent'],
    alertChannel: args['alert-channel'] || null,
    artifacts: csvList(args['artifacts']),
    ledgerEntries: csvList(args['ledger-entries']),
    errorSummary: args['error-summary'] || null,
    notes: args['notes'] || null,
  };

  return entry;
}

// --- append / index ------------------------------------------------------

function ensureEntriesDir() {
  if (!fs.existsSync(ENTRIES_DIR)) {
    fs.mkdirSync(ENTRIES_DIR, { recursive: true });
  }
}

function entryFileForDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return path.join(ENTRIES_DIR, `${yyyy}-${mm}.jsonl`);
}

function appendEntry(entry) {
  ensureEntriesDir();
  const file = entryFileForDate(entry.startedAt);
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(file, line, 'utf8');
  appendIndexRow(entry);
  return file;
}

function appendIndexRow(entry) {
  const isNew = !fs.existsSync(INDEX_CSV);
  const row = INDEX_HEADERS.map((h) => indexValue(h, entry)).join(',');
  let payload = '';
  if (isNew) payload += INDEX_HEADERS.join(',') + '\n';
  payload += row + '\n';
  fs.appendFileSync(INDEX_CSV, payload, 'utf8');
}

function indexValue(header, entry) {
  const v = entry[header];
  if (header === 'surfaceCount') return String((entry.surfaces || []).length);
  if (header === 'artifactCount') return String((entry.artifacts || []).length);
  if (header === 'ledgerEntryCount') return String((entry.ledgerEntries || []).length);
  if (header === 'changed') return String(entry.counts?.changed ?? '');
  if (header === 'errors') return String(entry.counts?.errors ?? '');
  if (header === 'warnings') return String(entry.counts?.warnings ?? '');
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return csvEscape(v);
  return String(v);
}

function csvEscape(s) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// --- commands ------------------------------------------------------------

function cmdValidate(args) {
  const schema = loadSchema();
  const entry = loadEntry(args);
  const errors = validateEntry(entry, schema);
  if (errors.length) {
    console.error('Validation FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  console.log('Validation passed');
}

function cmdAppend(args) {
  const schema = loadSchema();
  const entry = loadEntry(args);
  const errors = validateEntry(entry, schema);
  if (errors.length) {
    console.error('Validation FAILED — not appending:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  const file = appendEntry(entry);
  console.log(`appended ${entry.runId} → ${path.relative(REPO_ROOT, file)}`);
}

function cmdNew(args) {
  if (!args['job-name'] || !args['job-source'] || !args['status'] || !args['mutation']) {
    usage('new requires --job-name --job-source --status --mutation');
  }
  const entry = buildEntryFromArgs(args);
  const schema = loadSchema();
  const errors = validateEntry(entry, schema);
  if (errors.length) {
    console.error('Built entry failed validation:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  const json = JSON.stringify(entry, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, json + '\n', 'utf8');
    console.log(`wrote ${args.out}`);
  } else {
    console.log(json);
  }
  if (args.append) {
    const file = appendEntry(entry);
    console.error(`appended ${entry.runId} → ${path.relative(REPO_ROOT, file)}`);
  }
}

// --- main ---------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
if (!cmd) usage();

switch (cmd) {
  case 'validate':
    cmdValidate(args);
    break;
  case 'append':
    cmdAppend(args);
    break;
  case 'new':
    cmdNew(args);
    break;
  case 'help':
  case '--help':
  case '-h':
    usage();
    break;
  default:
    usage(`unknown command: ${cmd}`);
}
