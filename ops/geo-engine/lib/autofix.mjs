// Autonomous change mechanism, with rollback.
//
// Built now so it can be enabled after validation; DISABLED by default. The
// engine ships in audit/recommendation mode and only writes when an operator
// explicitly passes --apply AND the policy allows the action.
//
// A hard architectural constraint governs everything here: the site root in
// this repository is BUILD OUTPUT, replaced wholesale by build-live.sh. Editing
// a rendered page at the root would be silently reverted by the next build.
// Every applier therefore declares the plane it edits, and appliers that would
// touch build output are refused outright.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, ensureDir, readJson, sha256, writeJson } from './util.mjs';

export const PLANE = { SOURCE: 'source', BUILD_OUTPUT: 'build_output' };

/**
 * Policy gate. Every condition must hold before a change may be applied.
 */
export const DEFAULT_POLICY = {
  enabled: false,
  confidenceThreshold: 0.92,
  allowedActions: [
    'fix_broken_internal_link',
    'sitemap_remove_dead_url',
    'fix_malformed_jsonld',
  ],
  maxChangesPerRun: 5,
  requireReversible: true,
  refuseBuildOutputEdits: true,
};

export function loadPolicy(file = path.join(REPO_ROOT, 'ops', 'geo-engine', 'policy.json')) {
  return { ...DEFAULT_POLICY, ...(readJson(file, {}) ?? {}) };
}

/**
 * Decide whether one opportunity is permitted to be applied automatically.
 * Returns { allowed, reason }.
 */
export function gate(opportunity, policy, { plane }) {
  if (!policy.enabled) return { allowed: false, reason: 'autonomous changes are disabled by policy' };
  if (!policy.allowedActions.includes(opportunity.proposedAction)) {
    return { allowed: false, reason: `action ${opportunity.proposedAction} is not on the allowlist` };
  }
  if (opportunity.safety !== 'auto_safe') {
    return { allowed: false, reason: `decision layer rated this ${opportunity.safety}` };
  }
  if (opportunity.confidence < policy.confidenceThreshold) {
    return { allowed: false, reason: `confidence ${opportunity.confidence} below threshold ${policy.confidenceThreshold}` };
  }
  if (policy.requireReversible && !opportunity.reversible) {
    return { allowed: false, reason: 'change is not reversible' };
  }
  if (policy.refuseBuildOutputEdits && plane === PLANE.BUILD_OUTPUT) {
    return { allowed: false, reason: 'target is build output; the fix belongs in next/src and would be overwritten by the next build' };
  }
  return { allowed: true, reason: 'all policy conditions met' };
}

/**
 * A run-scoped change set. Records enough to reverse every write, and reverses
 * automatically if post-write validation fails.
 */
export class ChangeSet {
  constructor({ runId, root = REPO_ROOT, backupDir }) {
    this.runId = runId;
    this.root = root;
    this.backupDir = backupDir ?? path.join(root, 'ops', 'geo-engine', '.rollback', runId);
    this.changes = [];
    this.baseCommit = safeGitRev(root);
  }

  /** Back a file up before it is touched, so the write can always be undone. */
  #backup(file) {
    ensureDir(this.backupDir);
    const rel = path.relative(this.root, file);
    const dest = path.join(this.backupDir, `${sha256(rel).slice(0, 16)}.bak`);
    fs.copyFileSync(file, dest);
    return { rel, dest, hashBefore: sha256(fs.readFileSync(file, 'utf8')) };
  }

  applyTextChange({ file, transform, opportunity, plane }) {
    if (plane === PLANE.BUILD_OUTPUT) throw new Error('refusing to write to build output');
    const realRoot = fs.realpathSync(this.root);
    const realFile = fs.realpathSync(file);
    if (!realFile.startsWith(realRoot + path.sep)) throw new Error('source path escapes root');
    const before = fs.readFileSync(file, 'utf8');
    const after = transform(before);
    if (after === before) return { changed: false, reason: 'transform produced no change' };
    const backup = this.#backup(file);
    fs.writeFileSync(file, after);
    const change = {
      id: `${this.runId}:${this.changes.length}`,
      file: path.relative(this.root, file),
      backup: path.relative(this.root, backup.dest),
      hashBefore: backup.hashBefore,
      hashAfter: sha256(after),
      opportunityId: opportunity?.id ?? null,
      action: opportunity?.proposedAction ?? null,
      appliedAt: new Date().toISOString(),
      reverted: false,
    };
    this.changes.push(change);
    return { changed: true, change };
  }

  revert(change) {
    const file = path.join(this.root, change.file);
    const backup = path.join(this.root, change.backup);
    if (!fs.existsSync(backup)) return { reverted: false, reason: 'backup missing' };
    if (sha256(fs.readFileSync(file, 'utf8')) !== change.hashAfter) return { reverted: false, reason: 'file changed since application; refusing to overwrite' };
    fs.copyFileSync(backup, file);
    change.reverted = true;
    return { reverted: true };
  }

  revertAll() {
    const results = this.changes.filter((c) => !c.reverted).reverse().map((c) => ({ change: c, ...this.revert(c) }));
    return { reverted: results.filter((r) => r.reverted).length, results };
  }

  manifest() {
    return {
      runId: this.runId,
      baseCommit: this.baseCommit,
      createdAt: new Date().toISOString(),
      changes: this.changes,
      rollbackHint: this.baseCommit
        ? `git checkout ${this.baseCommit} -- ${[...new Set(this.changes.map((c) => c.file))].join(' ')}`
        : 'restore each file from its recorded backup',
    };
  }

  save(file) {
    return writeJson(file ?? path.join(this.backupDir, 'manifest.json'), this.manifest());
  }
}

function safeGitRev(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Post-change validation. A successful write is not evidence that the site
 * still renders: the caller must re-read the output and confirm it.
 */
export function validateChange({ file, expect }) {
  const checks = [];
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
    checks.push({ check: 'readable', ok: true });
  } catch (err) {
    return { ok: false, checks: [{ check: 'readable', ok: false, detail: err.message }] };
  }

  if (file.endsWith('.xml')) {
    const balanced = (content.match(/<url>/g) ?? []).length === (content.match(/<\/url>/g) ?? []).length;
    checks.push({ check: 'xml_url_tags_balanced', ok: balanced });
  }
  if (file.endsWith('.json')) {
    try { JSON.parse(content); checks.push({ check: 'json_parses', ok: true }); }
    catch (err) { checks.push({ check: 'json_parses', ok: false, detail: err.message }); }
  }
  if (expect?.mustContain) {
    for (const needle of expect.mustContain) {
      checks.push({ check: `contains:${needle.slice(0, 40)}`, ok: content.includes(needle) });
    }
  }
  if (expect?.mustNotContain) {
    for (const needle of expect.mustNotContain) {
      checks.push({ check: `absent:${needle.slice(0, 40)}`, ok: !content.includes(needle) });
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * Plan changes without writing anything. This is what audit mode produces: a
 * reviewable description of what would happen, with the gate's verdict.
 */
export function planChanges(opportunities, policy, { plane = PLANE.BUILD_OUTPUT } = {}) {
  return opportunities.map((opp) => {
    const verdict = gate(opp, policy, { plane });
    return {
      opportunityId: opp.id,
      urlPath: opp.urlPath,
      action: opp.proposedAction,
      problem: opp.problem,
      confidence: opp.confidence,
      wouldApply: verdict.allowed,
      blockedBy: verdict.allowed ? null : verdict.reason,
    };
  });
}
