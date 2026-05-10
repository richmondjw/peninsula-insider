#!/usr/bin/env node
// Peninsula Insider — Governance lint (CI gate)
//
// Same rules as ops/scripts/governance-audit.mjs, but:
//   - exits 1 on ERROR (default) so CI / pre-commit can fail
//   - can be scoped to changed files with --changed (uses git diff)
//   - terse output: one line per finding, machine-parseable
//
// This is the *gate* version. It is intended to run in CI on every PR and
// (optionally) as a pre-commit hook. The audit version is for periodic
// full-corpus reviews.
//
// Usage:
//   node ops/scripts/governance-lint.mjs                 # full corpus
//   node ops/scripts/governance-lint.mjs --changed       # only files changed vs main
//   node ops/scripts/governance-lint.mjs --changed=HEAD~ # only files changed vs HEAD~
//   node ops/scripts/governance-lint.mjs --warn-as-error # treat WARN as failing
//   node ops/scripts/governance-lint.mjs --json          # JSON to stdout

import { execSync } from 'node:child_process';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const opts = {
  changed: null,        // null = full, true = vs main, string = vs that ref
  warnAsError: false,
  json: false,
};
for (const a of args) {
  if (a === '--changed') opts.changed = 'main';
  else if (a.startsWith('--changed=')) opts.changed = a.slice('--changed='.length);
  else if (a === '--warn-as-error') opts.warnAsError = true;
  else if (a === '--json') opts.json = true;
}

// Run the audit in JSON mode and parse its output. Reusing the audit means
// the rule set is shared — there is one canonical definition.
const auditPath = resolve(__dirname, 'governance-audit.mjs');
let auditJson;
try {
  // We always run the full audit and filter after — this is a few hundred ms,
  // not worth wiring per-file invocation through.
  const out = execSync(`node "${auditPath}" --json`, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  auditJson = JSON.parse(out);
} catch (e) {
  // The audit exits 1 when there are ERRORs, but stdout still has the JSON.
  if (e.stdout) {
    try {
      auditJson = JSON.parse(e.stdout);
    } catch (e2) {
      console.error('lint: could not parse audit output');
      console.error(e.stdout?.slice(0, 500));
      process.exit(2);
    }
  } else {
    console.error('lint: audit failed to run');
    console.error(e.message);
    process.exit(2);
  }
}

let findings = auditJson.findings;

// Optionally filter to changed files
if (opts.changed) {
  let changedFiles = [];
  try {
    const out = execSync(`git diff --name-only ${opts.changed}...HEAD`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    changedFiles = out.split('\n').map((l) => l.trim()).filter(Boolean);
    // Also include unstaged changes
    const unstaged = execSync('git diff --name-only', { cwd: REPO_ROOT, encoding: 'utf8' });
    changedFiles.push(...unstaged.split('\n').map((l) => l.trim()).filter(Boolean));
    const staged = execSync('git diff --name-only --cached', { cwd: REPO_ROOT, encoding: 'utf8' });
    changedFiles.push(...staged.split('\n').map((l) => l.trim()).filter(Boolean));
  } catch (e) {
    console.error(`lint: cannot resolve --changed=${opts.changed}: ${e.message}`);
    process.exit(2);
  }
  const changedSet = new Set(changedFiles.map((f) => f.replaceAll('\\', '/')));
  findings = findings.filter((f) => changedSet.has(f.file));
}

// Decide pass/fail
const failingSeverities = opts.warnAsError ? ['ERROR', 'WARN'] : ['ERROR'];
const failing = findings.filter((f) => failingSeverities.includes(f.severity));

if (opts.json) {
  console.log(JSON.stringify({
    passed: failing.length === 0,
    failingCount: failing.length,
    findings,
  }, null, 2));
  process.exit(failing.length === 0 ? 0 : 1);
}

// Compact output
if (findings.length === 0) {
  console.log('governance-lint: clean');
  process.exit(0);
}

for (const f of findings) {
  const tag = `[${f.severity}]`;
  console.log(`${tag} ${f.file}: ${f.rule} — ${f.message}`);
}

console.log('');
const sevCounts = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});
const summary = Object.entries(sevCounts).map(([k, v]) => `${v} ${k}`).join(', ');
console.log(`governance-lint: ${summary}${opts.changed ? ` (scope: changed vs ${opts.changed})` : ''}`);

if (failing.length > 0) {
  console.log(`governance-lint: ${failing.length} ${opts.warnAsError ? 'finding(s)' : 'ERROR(s)'} — failing`);
  process.exit(1);
}
console.log('governance-lint: warnings only — passing (use --warn-as-error to treat as failing)');
process.exit(0);
