#!/usr/bin/env node
// Calibration sheet for the release gate.
//
//   node scripts/export-calibration.mjs [--runs DIR] [--limit 50] > sheet.csv
//   node scripts/export-calibration.mjs --score labelled.csv
//
// Collects the exact before/after lines Jev judged for each proposed source
// patch, with its verdict and what the gate then did, and leaves two columns
// blank for a person. Scoring a labelled sheet reports agreement; it never
// changes a threshold. Read-only over the run evidence.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HEADER = ['run', 'url', 'action', 'before', 'after', 'jev_contains_new_claim', 'jev_confidence',
  'gate_outcome', 'human_contains_new_claim', 'human_would_ship', 'notes'];

export function collectRows(runsDir) {
  const rows = [];
  const seen = new Set();
  let names = [];
  try { names = fs.readdirSync(runsDir).sort().reverse(); } catch { return rows; }
  for (const name of names) {
    let summary;
    try { summary = JSON.parse(fs.readFileSync(path.join(runsDir, name, 'summary.json'), 'utf8')); } catch { continue; }
    const changes = summary?.changes ?? {};
    const entries = [
      ...(changes.applied ?? []).map((c) => ({ ...c, gate: 'accepted' })),
      ...(changes.deferred ?? []).filter((c) => c.verdict).map((c) => ({ ...c, gate: 'rejected' })),
    ];
    for (const entry of entries) {
      // Runs recorded before the judged lines were retained cannot be labelled.
      if (!entry.assessed?.beforeEdit && !entry.assessed?.afterEdit) continue;
      const key = `${entry.urlPath}\u0000${entry.assessed.beforeEdit}\u0000${entry.assessed.afterEdit}`;
      if (seen.has(key)) continue; // the same patch re-proposed daily is one judgement
      seen.add(key);
      rows.push({
        run: summary.runId ?? name,
        url: entry.urlPath ?? '',
        action: entry.assessed.action ?? entry.action ?? '',
        before: entry.assessed.beforeEdit.trim(),
        after: entry.assessed.afterEdit.trim(),
        jev_contains_new_claim: String(entry.verdict?.value?.containsNewClaim ?? ''),
        jev_confidence: String(entry.verdict?.confidence ?? ''),
        gate_outcome: entry.gate,
        human_contains_new_claim: '',
        human_would_ship: '',
        notes: '',
      });
    }
  }
  return rows;
}

/** Take rejected and accepted verdicts alternately so neither side crowds out the other. */
export function sample(rows, limit) {
  const accepted = rows.filter((r) => r.gate_outcome === 'accepted');
  const rejected = rows.filter((r) => r.gate_outcome === 'rejected');
  const out = [];
  while (out.length < limit && (accepted.length || rejected.length)) {
    if (accepted.length) out.push(accepted.shift());
    if (out.length < limit && rejected.length) out.push(rejected.shift());
  }
  return out;
}

const cell = (value) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
export const toCsv = (rows) => [HEADER, ...rows.map((r) => HEADER.map((h) => r[h] ?? ''))]
  .map((line) => line.map(cell).join(',')).join('\n') + '\n';

export function parseCsv(text) {
  const records = [];
  let field = '', record = [], quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field); field = '';
      if (record.some((f) => f !== '')) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((f) => f !== '')) records.push(record);
  const [head, ...body] = records;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const truthy = (v) => (/^(true|yes|y|1)$/i.test(v.trim()) ? true : /^(false|no|n|0)$/i.test(v.trim()) ? false : null);

/**
 * Agreement between Jev and the labeller. The number that matters for safety
 * is `unsafeAccepts`: patches the gate shipped that the person says add a claim.
 */
export function score(rows) {
  const labelled = rows.map((r) => ({ ...r, human: truthy(r.human_contains_new_claim), jev: truthy(r.jev_contains_new_claim) }))
    .filter((r) => r.human !== null && r.jev !== null);
  const agree = labelled.filter((r) => r.human === r.jev).length;
  const accepted = labelled.filter((r) => r.gate_outcome === 'accepted');
  const rejected = labelled.filter((r) => r.gate_outcome === 'rejected');
  return {
    labelled: labelled.length,
    unlabelled: rows.length - labelled.length,
    agreementRate: labelled.length ? Math.round((agree / labelled.length) * 1000) / 1000 : null,
    accepted: accepted.length,
    unsafeAccepts: accepted.filter((r) => r.human === true).map((r) => r.url),
    rejected: rejected.length,
    needlessRejections: rejected.filter((r) => r.human === false && truthy(r.human_would_ship) === true).length,
    note: 'Descriptive only. A threshold change needs a separately reviewed release, not this number alone.',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const scoreFile = arg('--score');
  if (scoreFile) {
    process.stdout.write(`${JSON.stringify(score(parseCsv(fs.readFileSync(scoreFile, 'utf8'))), null, 2)}\n`);
  } else {
    const runsDir = arg('--runs', fileURLToPath(new URL('../.runs', import.meta.url)));
    const rows = sample(collectRows(runsDir), Number(arg('--limit', '50')));
    process.stdout.write(toCsv(rows));
    process.stderr.write(`${rows.length} judgement(s) exported from ${runsDir}\n`);
  }
}
