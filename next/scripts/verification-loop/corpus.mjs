/**
 * corpus.mjs - the read side of the PI-006 verification loop.
 *
 * Every function here reads. Nothing in this file, or in any module it
 * imports, opens a handle for writing. That is the whole point of the
 * report-only stage: a component that cannot write does not need a kill
 * switch, and the absence of a write path is a property a reviewer can check
 * by reading the imports rather than by trusting a flag.
 *
 * The loop joins three things that already exist and invents no fourth:
 *
 *   the claim registry      src/content/claims + src/content/evidence (PI-005)
 *   derived claim state     src/lib/claim-state.mjs, the ONLY place a claim's
 *                           state is computed. This file does not re-derive
 *                           supported/unsupported/disputed/retired; it asks.
 *   the content records     the things a reader actually sees, resolved from
 *                           each claim's subject so the loop can tell a stale
 *                           claim about a live page from a stale claim about a
 *                           page nobody can reach.
 *
 * That last distinction is load-bearing. 69% of the seeded evidence expired on
 * the day it was seeded, and a large part of that backlog hangs off events
 * that have already happened. Re-fetching an organiser page for a festival
 * that ran in May is work with no reader on the other end of it.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

import {
  deriveClaimState,
  expiryDaysFor,
  indexEvidenceByClaim,
  isExpired,
  toDate,
  toIsoDay,
} from '../../src/lib/claim-state.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Collections whose records a claim subject can name. */
const RECORD_SOURCES = [
  { type: 'events', dir: ['src', 'content', 'events'], ext: '.json' },
  { type: 'quick-notes', dir: ['src', 'content', 'quick-notes'], ext: '.md' },
  { type: 'signature-events', dir: ['src', 'content', 'signature-events'], ext: '.json' },
  { type: 'species', dir: ['src', 'content', 'species'], ext: '.md' },
  { type: 'venues', dir: ['src', 'content', 'venues'], ext: '.json' },
];

/** Recursively list files under a directory. A missing directory reads empty. */
export async function listFiles(dir, ext) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(ext))
    .map((entry) => path.join(entry.parentPath ?? entry.path ?? dir, entry.name))
    .sort();
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * Frontmatter of a markdown record. The body is kept because the fabrication
 * guard needs to read prose that a researcher might otherwise propose to
 * rewrite.
 */
function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text };
  let data = {};
  try {
    data = YAML.parse(match[1]) ?? {};
  } catch {
    data = {};
  }
  return { data, body: match[2] ?? '' };
}

/**
 * Load claims, evidence, the precedence table and the content records the
 * claims point at.
 *
 * Directory overrides exist so the test harness can run the whole loop over a
 * fixture corpus. Production callers pass none of them.
 */
export async function loadCorpus({
  nextDir,
  claimsDir,
  evidenceDir,
  contentDir,
  dataDir,
  precedenceFile,
} = {}) {
  const root = nextDir ?? process.cwd();
  const content = contentDir ?? path.join(root, 'src', 'content');
  const data = dataDir ?? path.join(root, 'src', 'data');
  const claimsRoot = claimsDir ?? path.join(content, 'claims');
  const evidenceRoot = evidenceDir ?? path.join(content, 'evidence');
  const precedencePath = precedenceFile ?? path.join(data, 'source-precedence.json');

  const precedence = await readJson(precedencePath);

  const claims = [];
  for (const file of await listFiles(claimsRoot, '.json')) {
    claims.push({ ...(await readJson(file)), _file: file });
  }
  const evidence = [];
  for (const file of await listFiles(evidenceRoot, '.json')) {
    evidence.push({ ...(await readJson(file)), _file: file });
  }

  const records = new Map();
  for (const source of RECORD_SOURCES) {
    const dir = path.join(root, ...source.dir);
    for (const file of await listFiles(dir, source.ext)) {
      const slug = path.relative(dir, file).replace(/\\/g, '/').slice(0, -source.ext.length);
      const raw = await readFile(file, 'utf8');
      let parsed;
      if (source.ext === '.json') {
        try {
          parsed = { data: JSON.parse(raw), body: '' };
        } catch {
          continue;
        }
      } else {
        parsed = splitFrontmatter(raw);
      }
      records.set(`${source.type}/${slug}`, {
        type: source.type,
        slug,
        file,
        data: parsed.data,
        body: parsed.body,
      });
    }
  }

  // The orphaned fact layer. Its claims name `<file>/<entity-key>`, so the
  // record is the whole fact file and the field path locates the entity.
  for (const file of await listFiles(path.join(data, 'facts'), '.json')) {
    const slug = path.basename(file, '.json');
    records.set(`data-facts/${slug}`, {
      type: 'data-facts',
      slug,
      file,
      data: await readJson(file),
      body: '',
    });
  }

  return {
    claims,
    evidence,
    evidenceByClaim: indexEvidenceByClaim(evidence),
    precedence,
    records,
    paths: { root, content, data, claimsRoot, evidenceRoot, precedencePath },
  };
}

/** The content record a claim is about, or null when the subject is orphaned. */
export function recordFor(claim, records) {
  const subject = claim?.subject ?? {};
  const direct = records.get(`${subject.type}/${subject.slug}`);
  if (direct) return direct;
  // data-facts slugs are `<file>/<entity-key>`; the record is the file.
  if (subject.type === 'data-facts' && typeof subject.slug === 'string') {
    const head = subject.slug.split('/')[0];
    return records.get(`data-facts/${head}`) ?? null;
  }
  return null;
}

/**
 * Does this claim still sit behind something a reader can reach?
 *
 * Not a judgement about the claim. A claim about a festival that ran in May is
 * as true or false as it ever was; it is simply not worth a fetch, because no
 * correction to it changes what anybody reads. Selection uses this to keep the
 * worklist pointed at live surfaces, and the report counts what it set aside
 * so the backlog never silently shrinks by definition.
 */
export function subjectLiveness(claim, record, now) {
  const at = toDate(now) ?? new Date();
  if (!record) return { live: false, reason: 'subject resolves to no record on disk' };
  const data = record.data ?? {};

  if (record.type === 'events') {
    if (String(data.status ?? 'published') === 'archived') {
      return { live: false, reason: 'event record archived' };
    }
    if (data.cancelled === true) {
      return { live: false, reason: 'event already recorded cancelled' };
    }
    const next = toDate(data.nextOccurrence ?? data.endDate ?? data.startDate);
    if (next && next.getTime() < at.getTime()) {
      return { live: false, reason: 'event date has passed' };
    }
    return { live: true, reason: 'event is published and still ahead' };
  }

  if (record.type === 'quick-notes') {
    if (String(data.status ?? 'published') !== 'published') {
      return { live: false, reason: `quick note status ${data.status}` };
    }
    const expires = toDate(data.expiresAt);
    if (expires && expires.getTime() < at.getTime()) {
      return { live: false, reason: 'quick note has lapsed' };
    }
    return { live: true, reason: 'quick note is published and unexpired' };
  }

  // Species pages, signature-event hubs, venues and the fact layer carry no
  // expiry of their own. They are live until somebody removes them.
  return { live: true, reason: 'evergreen record' };
}

/**
 * Everything the loop knows about one claim before it fetches anything.
 * `state` comes from claim-state.mjs and is never recomputed here.
 */
export function assess(claim, corpus, now) {
  const at = toDate(now) ?? new Date();
  const rows = corpus.evidenceByClaim.get(claim.claimId) ?? [];
  const state = deriveClaimState(claim, rows, { now: at, precedence: corpus.precedence });
  const record = recordFor(claim, corpus.records);
  const liveness = subjectLiveness(claim, record, at);

  let expiryDays = null;
  try {
    expiryDays = expiryDaysFor(claim.claimClass, corpus.precedence);
  } catch {
    expiryDays = null;
  }

  const expiredRows = rows.filter((row) => isExpired(row, at));
  const newestExpiry =
    rows
      .map((row) => toDate(row.expiresAt))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const overdueDays = newestExpiry
    ? Math.max(0, Math.round((at.getTime() - newestExpiry.getTime()) / DAY_MS))
    : null;

  return {
    claim,
    rows,
    record,
    state,
    liveness,
    expiryDays,
    expiredRows: expiredRows.length,
    totalRows: rows.length,
    overdueDays,
    overdueRatio: overdueDays != null && expiryDays ? overdueDays / expiryDays : null,
    newestExpiry: toIsoDay(newestExpiry),
  };
}

/**
 * Claim classes the precedence table defines but the corpus has no evidence
 * for. Opening hours, accessibility and rate changes all seeded empty: nothing
 * in this corpus attaches a source to any of them. A loop that reported
 * all-clear on those would be reporting on an absence it never looked at, so
 * the number is surfaced rather than swallowed.
 */
export function blindSpots(corpus) {
  const defined = Object.keys(corpus.precedence?.classes ?? {});
  const withClaims = new Map();
  for (const claim of corpus.claims) {
    withClaims.set(claim.claimClass, (withClaims.get(claim.claimClass) ?? 0) + 1);
  }
  const withEvidence = new Set();
  for (const claim of corpus.claims) {
    if ((corpus.evidenceByClaim.get(claim.claimId) ?? []).length > 0) {
      withEvidence.add(claim.claimClass);
    }
  }
  return defined
    .filter((cls) => !withEvidence.has(cls))
    .map((cls) => ({
      claimClass: cls,
      label: corpus.precedence.classes[cls]?.label ?? cls,
      claims: withClaims.get(cls) ?? 0,
      evidence: 0,
    }));
}
